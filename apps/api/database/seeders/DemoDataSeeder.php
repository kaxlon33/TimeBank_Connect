<?php

namespace Database\Seeders;

use App\Enums\RequestStatus;
use App\Enums\ReviewStatus;
use App\Enums\SkillStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\AppSetting;
use App\Models\Area;
use App\Models\AuditLog;
use App\Models\AvailabilitySlot;
use App\Models\Badge;
use App\Models\Country;
use App\Models\CreditTransaction;
use App\Models\HelpRequest;
use App\Models\Review;
use App\Models\Skill;
use App\Models\SkillCategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Demo data for local development and the coursework demo.
 *
 * - 1 admin + 8 active members + 1 suspended member across 6 areas in 3 countries.
 * - Every member gets a starter_grant ledger row; every completed session writes two
 *   balanced ledger rows. Events are written in time order, so balance_after is correct
 *   and users.credit_balance = SUM(credit_transactions.amount) for every user.
 * - Help requests in every status, reviews (one removed), badges, audit logs.
 *
 * Run on an empty database: `php artisan migrate:fresh --seed`.
 * All demo accounts use the password "password" (local development only).
 *
 * Note: ledger rows here are written directly to build history with past dates.
 * In the application, credits change only through CreditService (ADR-0003).
 */
class DemoDataSeeder extends Seeder
{
    private const DEMO_PASSWORD = 'password';

    /** @var array<int, float> user id => running balance */
    private array $balances = [];

    private float $starterCredit = 3.0;

    private string $passwordHash;

    public function run(): void
    {
        if (User::query()->exists()) {
            $this->command?->warn('Users already exist: skipping DemoDataSeeder (use migrate:fresh --seed).');

            return;
        }

        $this->passwordHash = Hash::make(self::DEMO_PASSWORD);
        $this->starterCredit = (float) AppSetting::getValue('starter_credit', 3);

        DB::transaction(function () {
            $admin = $this->makeUser('Admin User', 'admin@timebank.test', null, 'TimeBank Connect administrator.', 60, UserRole::Admin);

            $areas = $this->seedAreas($admin);
            $users = $this->seedMembers($areas);
            $users['admin'] = $admin;
            $admin->forceFill(['area_id' => $areas['camden']->id])->save();

            $skills = $this->seedSkills($users, $admin);
            $this->seedAvailability($users);
            $completed = $this->seedHelpRequests($users, $skills);
            $this->seedReviews($users, $completed, $admin);
            $this->seedAuditLogs($admin, $users, $skills);
            $this->recalculateTrustAndBadges($users);
            $this->assertLedgerConsistent();
        });
    }

    // ---- Areas and users -------------------------------------------------

    /** @return array<string, Area> */
    private function seedAreas(User $admin): array
    {
        $countries = Country::query()->whereIn('code', ['GB', 'SG', 'MM'])->pluck('id', 'code');
        if ($countries->count() !== 3) {
            throw new RuntimeException('Run CountrySeeder first (GB, SG and MM are required).');
        }

        $data = [
            'camden' => ['GB', 'Camden', 51.5390, -0.1426],
            'hackney' => ['GB', 'Hackney', 51.5450, -0.0553],
            'tampines' => ['SG', 'Tampines', 1.3496, 103.9568],
            'bedok' => ['SG', 'Bedok', 1.3236, 103.9273],
            'bahan' => ['MM', 'Bahan', 16.8137, 96.1561],
            'sanchaung' => ['MM', 'Sanchaung', 16.8040, 96.1310],
        ];

        $areas = [];
        foreach ($data as $key => [$code, $name, $lat, $lng]) {
            $area = new Area;
            $area->forceFill([
                'country_id' => $countries[$code],
                'name' => $name,
                'name_normalized' => Area::normalizeName($name), // model events are off while seeding
                'latitude' => $lat,
                'longitude' => $lng,
                'created_by' => $admin->id,
            ])->save();
            $areas[$key] = $area;
        }

        return $areas;
    }

    /** @return array<string, User> */
    private function seedMembers(array $areas): array
    {
        $members = [
            'aye' => ['Aye Chan', 'bahan', 50, 'Home cook and English teacher. Happy to share Burmese recipes.'],
            'daniel' => ['Daniel Okafor', 'camden', 48, 'Cyclist and weekend fixer. If it has bolts, I can probably help.'],
            'priya' => ['Priya Raman', 'tampines', 46, 'Maths tutor and yoga lover.'],
            'tom' => ['Tom Fletcher', 'hackney', 45, 'Software developer who enjoys teaching beginners.'],
            'mei' => ['Mei Lin Tan', 'bedok', 44, 'Patient with technology and with dough.'],
            'kyaw' => ['Kyaw Zin Htet', 'sanchaung', 42, 'Guitar player; I visit older neighbours on weekends.'],
            'sophie' => ['Sophie Martin', 'camden', 40, 'Gardener and French speaker.'],
            'hassan' => ['Hassan Ali', 'hackney', 38, 'I have a van and free Saturday mornings.'],
            'ryan' => ['Ryan Cole', 'hackney', 35, 'Demo account that was suspended by an admin.'],
        ];

        $users = [];
        foreach ($members as $key => [$name, $areaKey, $daysAgo, $bio]) {
            $user = $this->makeUser($name, $key.'@timebank.test', $areas[$areaKey], $bio, $daysAgo);
            $this->grantStarter($user, $user->created_at->copy()->addMinute());
            $users[$key] = $user;
        }

        $users['ryan']->forceFill([
            'status' => UserStatus::Suspended,
            'suspended_reason' => 'Posted spam and repeatedly ignored requests (demo data).',
            'suspended_at' => now()->subDays(5),
        ])->save();

        return $users;
    }

    private function makeUser(string $name, string $email, ?Area $area, string $bio, int $daysAgo, UserRole $role = UserRole::Member): User
    {
        $created = now()->subDays($daysAgo)->setTime(10, 0);

        $user = new User;
        $user->forceFill([
            'name' => $name,
            'email' => $email,
            'email_verified_at' => $created,
            'password' => $this->passwordHash,
            'role' => $role,
            'status' => UserStatus::Active,
            'bio' => $bio,
            'area_id' => $area?->id,
            'credit_balance' => 0,
            'created_at' => $created,
            'updated_at' => $created,
        ])->save();

        $this->balances[$user->id] = 0.0;

        return $user;
    }

    // ---- Skills and availability -----------------------------------------

    /** @return array<string, Skill> */
    private function seedSkills(array $u, User $admin): array
    {
        $cat = SkillCategory::query()->pluck('id', 'slug');

        $data = [
            'daniel_bike' => ['daniel', 'repairs-and-diy', 'Bicycle repair and tune-ups', 'Gears, brakes, punctures. I can also show you how to do basic maintenance yourself.'],
            'daniel_flatpack' => ['daniel', 'repairs-and-diy', 'Flat-pack furniture assembly', 'I bring my own tools. Wardrobes, desks, bed frames.'],
            'tom_python' => ['tom', 'tutoring-and-languages', 'Python and spreadsheet tutoring', 'Beginner-friendly lessons in Python, Excel formulas and Google Sheets.'],
            'tom_laptop' => ['tom', 'tech-help', 'Laptop clean-up and setup', 'Remove junk software, set up backups and updates.', SkillStatus::Hidden],
            'sophie_garden' => ['sophie', 'home-and-garden', 'Garden weeding and planting', 'Help with weeding, planting bulbs and planning a small vegetable patch.'],
            'sophie_french' => ['sophie', 'tutoring-and-languages', 'Conversational French practice', 'Relaxed conversation practice for all levels.'],
            'hassan_moving' => ['hassan', 'transport-and-errands', 'Help moving boxes (I have a van)', 'Small moves and tip runs within the borough.'],
            'hassan_shop' => ['hassan', 'transport-and-errands', 'Grocery runs for neighbours', 'Weekly shopping for anyone who cannot get out easily.'],
            'priya_maths' => ['priya', 'tutoring-and-languages', 'Secondary school maths tutoring', 'O-level and IGCSE maths, exam practice and homework help.'],
            'priya_yoga' => ['priya', 'health-and-fitness', 'Beginner yoga sessions', 'Gentle yoga in the park or at your home. Mats provided.'],
            'mei_phone' => ['mei', 'tech-help', 'Smartphone setup and video calls', 'Help setting up phones, WhatsApp and video calls, especially for seniors.'],
            'mei_bake' => ['mei', 'cooking-and-baking', 'Kueh and cake baking lessons', 'Learn to make kueh lapis, pandan chiffon and simple cakes.'],
            'aye_cook' => ['aye', 'cooking-and-baking', 'Burmese home cooking', 'Mohinga, tea leaf salad and curries, cooked together in your kitchen or mine.'],
            'aye_english' => ['aye', 'tutoring-and-languages', 'English conversation practice', 'Friendly conversation practice for beginners and intermediate learners.'],
            'kyaw_guitar' => ['kyaw', 'arts-crafts-and-music', 'Beginner guitar lessons', 'Chords, strumming and your first songs. I can lend a guitar.'],
            'kyaw_visits' => ['kyaw', 'care-and-companionship', 'Companionship visits', 'A chat, a walk or a game of chess with older neighbours.'],
            'ryan_spam' => ['ryan', 'tech-help', 'Cheap followers fast!!!', 'Message me for social media followers.', SkillStatus::Removed],
        ];

        $skills = [];
        $i = 0;
        foreach ($data as $key => $row) {
            [$owner, $slug, $title, $description] = $row;
            $status = $row[4] ?? SkillStatus::Active;
            $created = $u[$owner]->created_at->copy()->addDays(1)->addHours($i++);

            $skill = new Skill;
            $skill->forceFill([
                'user_id' => $u[$owner]->id,
                'category_id' => $cat[$slug] ?? throw new RuntimeException("Missing category {$slug}"),
                'title' => $title,
                'description' => $description,
                'status' => $status,
                'removed_by' => $status === SkillStatus::Removed ? $admin->id : null,
                'removed_reason' => $status === SkillStatus::Removed ? 'Spam: not a skill exchange.' : null,
                'removed_at' => $status === SkillStatus::Removed ? now()->subDays(5) : null,
                'created_at' => $created,
                'updated_at' => $created,
            ])->save();
            $skills[$key] = $skill;
        }

        return $skills;
    }

    private function seedAvailability(array $u): void
    {
        // weekday: 0 = Sunday ... 6 = Saturday
        $slots = [
            'daniel' => [[6, '09:00', '13:00'], [0, '10:00', '16:00']],
            'tom' => [[2, '18:00', '21:00'], [4, '18:00', '21:00']],
            'sophie' => [[6, '10:00', '14:00'], [3, '17:00', '19:00']],
            'hassan' => [[6, '08:00', '12:00']],
            'priya' => [[1, '17:00', '20:00'], [6, '07:00', '09:00']],
            'mei' => [[0, '14:00', '17:00'], [5, '18:00', '20:00']],
            'aye' => [[6, '15:00', '18:00'], [0, '09:00', '12:00']],
            'kyaw' => [[0, '09:00', '12:00'], [3, '18:00', '20:00']],
        ];

        foreach ($slots as $key => $rows) {
            foreach ($rows as [$weekday, $start, $end]) {
                $slot = new AvailabilitySlot;
                $slot->forceFill([
                    'user_id' => $u[$key]->id,
                    'weekday' => $weekday,
                    'start_time' => $start,
                    'end_time' => $end,
                ])->save();
            }
        }
    }

    // ---- Help requests and ledger ----------------------------------------

    /** @return array<string, HelpRequest> completed requests by key */
    private function seedHelpRequests(array $u, array $s): array
    {
        // Completed sessions, in time order: [key, requester, skill, hours, createdDaysAgo, completedDaysAgo, message]
        $completedData = [
            ['c1', 'sophie', 'daniel_bike', 2.0, 33, 30, 'My gears keep slipping, could you take a look?'],
            ['c2', 'daniel', 'tom_python', 1.5, 28, 25, 'I want to automate my club membership spreadsheet.'],
            ['c3', 'mei', 'priya_maths', 1.0, 24, 21, 'My nephew needs help with algebra before his exam.'],
            ['c4', 'kyaw', 'aye_cook', 2.0, 21, 18, 'I would love to learn to make mohinga properly.'],
            ['c5', 'hassan', 'sophie_garden', 1.0, 17, 14, 'Front garden is overgrown, could use a hand.'],
            ['c6', 'tom', 'hassan_moving', 2.5, 13, 10, 'Moving to a new flat two streets away.'],
            ['c7', 'priya', 'mei_phone', 0.5, 9, 7, 'Please help my mother set up video calls.'],
            ['c8', 'sophie', 'daniel_flatpack', 1.0, 6, 3, 'New bookshelf, too many screws!'],
            ['c9', 'aye', 'kyaw_guitar', 1.0, 5, 2, 'Complete beginner, I have my own guitar.'],
        ];

        $completed = [];
        foreach ($completedData as [$key, $requester, $skillKey, $hours, $createdAgo, $doneAgo, $message]) {
            $created = now()->subDays($createdAgo)->setTime(9, 30);
            $doneAt = now()->subDays($doneAgo)->setTime(18, 0);

            $hr = $this->makeRequest($u[$requester], $s[$skillKey], $hours, $message, $created, $created->copy()->addDays(2)->setTime(10, 0), [
                'status' => RequestStatus::Completed,
                'responded_at' => $created->copy()->addHours(3),
                'provider_done_at' => $doneAt->copy()->subHours(2),
                'completed_at' => $doneAt,
            ]);
            $this->recordSessionTransfer($hr, $doneAt);
            $completed[$key] = $hr;
        }

        // Open and closed-without-transfer requests (no ledger rows).
        $this->makeRequest($u['mei'], $s['priya_yoga'], 1.0, 'Could we try a morning session?', now()->subDay(), now()->addDays(3)->setTime(7, 30), [
            'status' => RequestStatus::Pending,
        ]);
        $this->makeRequest($u['hassan'], $s['daniel_bike'], 1.0, 'Squeaky brakes on my cargo bike.', now()->subHours(5), now()->addDays(5)->setTime(10, 0), [
            'status' => RequestStatus::Pending,
        ]);
        $this->makeRequest($u['daniel'], $s['sophie_french'], 1.5, 'Preparing for a trip to Lyon.', now()->subDays(4), now()->addDays(2)->setTime(18, 0), [
            'status' => RequestStatus::Accepted,
            'responded_at' => now()->subDays(3),
        ]);
        $this->makeRequest($u['tom'], $s['daniel_flatpack'], 1.0, 'IKEA desk for my home office.', now()->subDays(6), now()->subDay()->setTime(11, 0), [
            'status' => RequestStatus::AwaitingConfirmation,
            'responded_at' => now()->subDays(5),
            'provider_done_at' => now()->subDay()->setTime(13, 0),
        ]);
        $this->makeRequest($u['priya'], $s['mei_bake'], 2.0, 'Pandan chiffon for my daughter\'s birthday?', now()->subDays(12), now()->subDays(9)->setTime(14, 0), [
            'status' => RequestStatus::Declined,
            'responded_at' => now()->subDays(11),
        ]);
        $this->makeRequest($u['aye'], $s['kyaw_guitar'], 1.0, 'Could we start this weekend?', now()->subDays(15), now()->subDays(13)->setTime(9, 0), [
            'status' => RequestStatus::Cancelled,
            'cancelled_at' => now()->subDays(14),
            'cancelled_by' => $u['aye']->id,
            'cancel_reason' => 'Schedule clash, I will re-book later.',
        ]);
        $this->makeRequest($u['kyaw'], $s['aye_english'], 1.0, 'Practice for a job interview.', now()->subDays(10), now()->subDays(8)->setTime(17, 0), [
            'status' => RequestStatus::Cancelled,
            'responded_at' => now()->subDays(9),
            'cancelled_at' => now()->subDays(8)->setTime(9, 0),
            'cancelled_by' => $u['aye']->id, // cancelled by the provider after accepting: lowers reliability
            'cancel_reason' => 'Sorry, I am unwell that day.',
        ]);

        return $completed;
    }

    private function makeRequest(User $requester, Skill $skill, float $hours, string $message, Carbon $created, ?Carbon $proposedAt, array $state): HelpRequest
    {
        $hr = new HelpRequest;
        $hr->forceFill(array_merge([
            'requester_id' => $requester->id,
            'provider_id' => $skill->user_id,
            'skill_id' => $skill->id,
            'message' => $message,
            'hours' => $hours,
            'credits' => $hours * 1, // credits_per_hour is fixed at 1 (D8)
            'proposed_at' => $proposedAt,
            'created_at' => $created,
            'updated_at' => $created,
        ], $state))->save();

        return $hr;
    }

    private function grantStarter(User $user, Carbon $at): void
    {
        $this->writeLedgerRow($user, null, null, TransactionType::StarterGrant, $this->starterCredit,
            'starter:'.$user->id, (string) Str::uuid(), 'Welcome starter credit', $at);
    }

    private function recordSessionTransfer(HelpRequest $hr, Carbon $at): void
    {
        $amount = (float) $hr->credits;
        if ($this->balances[$hr->requester_id] < $amount) {
            throw new RuntimeException("Demo data error: requester of request {$hr->id} cannot afford {$amount} credits.");
        }

        $uuid = (string) Str::uuid();
        $payer = User::findOrFail($hr->requester_id);
        $payee = User::findOrFail($hr->provider_id);

        $this->writeLedgerRow($payer, $payee, $hr, TransactionType::SessionDebit, -$amount, "hr:{$hr->id}:debit", $uuid, null, $at);
        $this->writeLedgerRow($payee, $payer, $hr, TransactionType::SessionCredit, $amount, "hr:{$hr->id}:credit", $uuid, null, $at);
    }

    private function writeLedgerRow(User $user, ?User $counterparty, ?HelpRequest $hr, TransactionType $type, float $amount, string $key, string $uuid, ?string $note, Carbon $at): void
    {
        $newBalance = round($this->balances[$user->id] + $amount, 2);
        $this->balances[$user->id] = $newBalance;

        $row = new CreditTransaction;
        $row->forceFill([
            'transfer_uuid' => $uuid,
            'user_id' => $user->id,
            'counterparty_id' => $counterparty?->id,
            'help_request_id' => $hr?->id,
            'type' => $type,
            'amount' => $amount,
            'balance_after' => $newBalance,
            'idempotency_key' => $key,
            'note' => $note,
            'created_at' => $at,
        ])->save();

        // Cached balance (query builder: avoids touching updated_at and model state).
        DB::table('users')->where('id', $user->id)->update(['credit_balance' => $newBalance]);
    }

    // ---- Reviews, audit logs, trust, badges ------------------------------

    private function seedReviews(array $u, array $c, User $admin): void
    {
        // [completed key, reviewer, reviewee, rating, comment]
        $reviews = [
            ['c1', 'sophie', 'daniel', 5, 'Fixed my gears and showed me how to adjust them myself.'],
            ['c1', 'daniel', 'sophie', 5, 'Friendly and on time. Lovely to meet a neighbour.'],
            ['c2', 'daniel', 'tom', 4, 'Clear explanations, a little rushed at the end.'],
            ['c2', 'tom', 'daniel', 5, 'Quick learner, great questions.'],
            ['c3', 'mei', 'priya', 5, 'My nephew finally understands equations.'],
            ['c3', 'priya', 'mei', 5, 'Very welcoming, thank you!'],
            ['c4', 'kyaw', 'aye', 5, 'Best mohinga lesson ever.'],
            ['c5', 'hassan', 'sophie', 4, 'Garden looks tidy again. Thanks Sophie.'],
            ['c6', 'tom', 'hassan', 5, 'Moved everything in one trip. Brilliant.'],
            ['c6', 'hassan', 'tom', 4, 'Well organised, boxes were all labelled.'],
            ['c7', 'priya', 'mei', 5, 'So patient with my mother.'],
            ['c8', 'sophie', 'daniel', 5, 'Bookshelf is solid. Daniel is a star.'],
        ];

        foreach ($reviews as [$key, $reviewer, $reviewee, $rating, $comment]) {
            $this->makeReview($c[$key], $u[$reviewer], $u[$reviewee], $rating, $comment);
        }

        // A review removed by an admin (moderation demo).
        $this->makeReview($c['c4'], $u['aye'], $u['kyaw'], 1, 'Rude personal remark (demo of a removed review).', [
            'status' => ReviewStatus::Removed,
            'removed_by' => $admin->id,
            'removed_reason' => 'Personal attack: breaks community guidelines.',
            'removed_at' => now()->subDays(15),
        ]);
    }

    private function makeReview(HelpRequest $hr, User $reviewer, User $reviewee, int $rating, string $comment, array $extra = []): void
    {
        $at = $hr->completed_at->copy()->addHours(20);

        $review = new Review;
        $review->forceFill(array_merge([
            'help_request_id' => $hr->id,
            'reviewer_id' => $reviewer->id,
            'reviewee_id' => $reviewee->id,
            'rating' => $rating,
            'comment' => $comment,
            'status' => ReviewStatus::Visible,
            'created_at' => $at,
            'updated_at' => $at,
        ], $extra))->save();
    }

    private function seedAuditLogs(User $admin, array $u, array $s): void
    {
        $logs = [
            ['review.remove', 'review', Review::query()->where('status', ReviewStatus::Removed->value)->value('id'), ['reason' => 'Personal attack: breaks community guidelines.'], now()->subDays(15)],
            ['skill.remove', 'skill', $s['ryan_spam']->id, ['reason' => 'Spam: not a skill exchange.'], now()->subDays(5)],
            ['member.suspend', 'user', $u['ryan']->id, ['reason' => 'Posted spam and repeatedly ignored requests (demo data).'], now()->subDays(5)],
        ];

        foreach ($logs as [$action, $type, $id, $meta, $at]) {
            $log = new AuditLog;
            $log->forceFill([
                'actor_id' => $admin->id,
                'action' => $action,
                'target_type' => $type,
                'target_id' => $id,
                'meta' => $meta,
                'created_at' => $at,
            ])->save();
        }
    }

    /**
     * Seed-time copy of the design 10.2 trust formula and the "first_exchange" badge rule,
     * so cached values look realistic. TrustScoreService / BadgeService own this logic at run time.
     */
    private function recalculateTrustAndBadges(array $u): void
    {
        $firstExchange = Badge::query()->where('code', 'first_exchange')->firstOrFail();
        $completed = RequestStatus::Completed->value;

        foreach ($u as $user) {
            if ($user->role === UserRole::Admin) {
                continue;
            }

            $ratings = Review::query()->where('reviewee_id', $user->id)->where('status', ReviewStatus::Visible->value);
            $count = (clone $ratings)->count();
            $sum = (int) (clone $ratings)->sum('rating');

            $completedAsProvider = HelpRequest::query()->where('provider_id', $user->id)->where('status', $completed)->count();
            $cancelledByProviderAfterAccept = HelpRequest::query()
                ->where('provider_id', $user->id)
                ->where('status', RequestStatus::Cancelled->value)
                ->where('cancelled_by', $user->id)
                ->whereNotNull('responded_at')
                ->count();
            $completedTotal = HelpRequest::query()->involving($user->id)->where('status', $completed)->count();

            $rating = (($sum + 3 * 3.5) / ($count + 3) - 1) / 4 * 100;
            $reliability = ($completedAsProvider + 2) / ($completedAsProvider + $cancelledByProviderAfterAccept + 2) * 100;
            $experience = min($completedTotal, 20) / 20 * 100;
            $trust = round(0.5 * $rating + 0.3 * $reliability + 0.2 * $experience, 2);

            DB::table('users')->where('id', $user->id)->update(['trust_score' => $trust]);

            if ($completedTotal >= 1) {
                $firstSession = HelpRequest::query()->involving($user->id)->where('status', $completed)->min('completed_at');
                $user->badges()->syncWithoutDetaching([$firstExchange->id => ['awarded_at' => $firstSession]]);
            }
        }
    }

    /** Fails the seed if any cached balance differs from its ledger sum. */
    private function assertLedgerConsistent(): void
    {
        $mismatches = DB::table('users')
            ->leftJoin('credit_transactions', 'credit_transactions.user_id', '=', 'users.id')
            ->groupBy('users.id', 'users.credit_balance')
            ->havingRaw('users.credit_balance <> COALESCE(SUM(credit_transactions.amount), 0)')
            ->pluck('users.id');

        if ($mismatches->isNotEmpty()) {
            throw new RuntimeException('Ledger mismatch for users: '.$mismatches->implode(', '));
        }
    }
}

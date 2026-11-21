<?php

namespace Tests\Feature;

use App\Models\Review;
use App\Models\User;
use App\Services\TrustScoreService;
use Tests\HelpRequestTestCase;

class ReviewTest extends HelpRequestTestCase
{
    private function completed(float $hours = 1): int
    {
        $id = $this->readyToConfirm($hours);
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();

        return $id;
    }

    public function test_both_people_can_review_a_completed_session_once(): void
    {
        $id = $this->completed();

        $this->as($this->alice)->postJson("/api/help-requests/{$id}/reviews", ['rating' => 5, 'comment' => 'Fixed my bike'])
            ->assertCreated()->assertJsonPath('data.rating', 5)->assertJsonPath('data.reviewee.name', 'Bob Helper');
        $this->as($this->bob)->postJson("/api/help-requests/{$id}/reviews", ['rating' => 4])
            ->assertCreated()->assertJsonPath('data.reviewee.name', 'Alice Requester');

        $this->as($this->alice)->postJson("/api/help-requests/{$id}/reviews", ['rating' => 1])->assertStatus(409);
        $this->assertSame(2, Review::query()->count());
    }

    public function test_the_reviewed_flag_is_true_only_for_the_reviewer(): void
    {
        $id = $this->completed();
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/reviews", ['rating' => 5])->assertCreated();

        $this->as($this->alice)->getJson("/api/help-requests/{$id}")->assertJsonPath('data.reviewed_by_me', true);
        $this->as($this->bob)->getJson("/api/help-requests/{$id}")->assertJsonPath('data.reviewed_by_me', false);
    }

    public function test_a_session_must_be_completed_before_it_can_be_reviewed(): void
    {
        $id = $this->readyToConfirm();
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/reviews", ['rating' => 5])->assertStatus(409);
    }

    public function test_strangers_cannot_review_and_ratings_are_validated(): void
    {
        $id = $this->completed();

        $this->as($this->member('Stranger', 0))->postJson("/api/help-requests/{$id}/reviews", ['rating' => 5])->assertNotFound();
        foreach ([0, 6, 'abc', null] as $bad) {
            $this->as($this->alice)->postJson("/api/help-requests/{$id}/reviews", ['rating' => $bad])->assertStatus(422)->assertJsonValidationErrors('rating');
        }
    }

    public function test_the_reviewee_is_notified_and_sees_the_review_on_their_profile(): void
    {
        $id = $this->completed();
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/reviews", ['rating' => 5, 'comment' => 'Brilliant'])->assertCreated();

        $note = $this->bob->notifications()->get()->first(fn ($n) => $n->data['type'] === 'review_received');
        $this->assertSame('Alice left you a 5 star review', $note->data['title']);

        $this->as($this->bob)->getJson('/api/profile')->assertOk()
            ->assertJsonPath('data.reviews.0.comment', 'Brilliant')
            ->assertJsonPath('data.user.rating_count', 1);
    }

    public function test_a_new_member_scores_61_25_and_reviews_move_the_score(): void
    {
        $trust = app(TrustScoreService::class);
        $fresh = User::factory()->create();
        $this->assertSame(61.25, $trust->score($trust->stats($fresh)));

        $id = $this->completed();
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/reviews", ['rating' => 5])->assertCreated();

        // One completed session as helper and one 5-star review lift Bob above a brand-new member.
        $this->assertGreaterThan(61.25, (float) $this->bob->fresh()->trust_score);
        $this->assertLessThanOrEqual(100, (float) $this->bob->fresh()->trust_score);
    }

    public function test_a_helper_who_cancels_after_saying_yes_loses_reliability(): void
    {
        $before = (float) $this->bob->fresh()->trust_score;
        $id = $this->ask();
        $this->as($this->bob)->postJson("/api/help-requests/{$id}/accept")->assertOk();
        $this->as($this->bob)->postJson("/api/help-requests/{$id}/cancel")->assertOk();

        $this->assertLessThan($before, (float) $this->bob->fresh()->trust_score);
    }

    public function test_badges_are_awarded_once(): void
    {
        $id = $this->completed();
        $this->assertSame(1, $this->bob->badges()->where('code', 'first_exchange')->count());

        // Confirming again (a repeat click) must not award or notify a second time.
        $this->as($this->alice)->postJson("/api/help-requests/{$id}/complete")->assertOk();
        $this->assertSame(1, $this->bob->badges()->where('code', 'first_exchange')->count());
        $this->assertSame(1, $this->bob->notifications()->get()->filter(fn ($n) => $n->data['type'] === 'badge_awarded')->count());
    }
}

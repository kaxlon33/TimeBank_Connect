<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreHelpRequestRequest;
use App\Http\Resources\HelpRequestResource;
use App\Models\HelpRequest;
use App\Services\HelpRequestService;
use App\Services\UserStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HelpRequestController extends Controller
{
    public function __construct(
        private readonly HelpRequestService $service,
        private readonly UserStatsService $stats,
    ) {}

    /** Requests the member received (as helper) or sent (as requester), newest first. */
    public function index(Request $request)
    {
        $data = $request->validate(['box' => ['nullable', 'in:received,sent']]);
        $column = ($data['box'] ?? 'received') === 'sent' ? 'requester_id' : 'provider_id';

        $requests = HelpRequest::query()
            ->where($column, $request->user()->id)
            ->latest('created_at')->latest('id')
            ->limit(100)
            ->get();

        return $this->present($requests);
    }

    public function store(StoreHelpRequestRequest $request): JsonResponse
    {
        $created = $this->service->create($request->user(), $request->validated());

        return $this->one($created->id, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        // Someone else's request looks the same as one that does not exist.
        HelpRequest::query()->involving($request->user()->id)->findOrFail($id);

        return $this->one($id);
    }

    public function accept(Request $request, int $id): JsonResponse
    {
        $this->service->accept($id, $request->user());

        return $this->one($id);
    }

    public function decline(Request $request, int $id): JsonResponse
    {
        $this->service->decline($id, $request->user());

        return $this->one($id);
    }

    public function markDone(Request $request, int $id): JsonResponse
    {
        $this->service->markDone($id, $request->user());

        return $this->one($id);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);
        $this->service->cancel($id, $request->user(), $data['reason'] ?? null);

        return $this->one($id);
    }

    /** The requester confirms the session: this is the call that moves credits. */
    public function complete(Request $request, int $id): JsonResponse
    {
        $this->service->complete($id, $request->user());

        return $this->one($id);
    }

    // ---- helpers ----------------------------------------------------------

    private function one(int $id, int $status = 200): JsonResponse
    {
        $request = HelpRequest::query()->findOrFail($id);
        $request->load(['skill:id,title', 'requester.area.country', 'provider.area.country', 'reviews']);
        $this->stats->attach([$request->requester, $request->provider]);

        return (new HelpRequestResource($request))->response()->setStatusCode($status);
    }

    /** Load what the resource needs in a few queries and hand back resources. */
    private function present($requests)
    {
        $requests->load(['skill:id,title', 'requester.area.country', 'provider.area.country', 'reviews']);
        $this->stats->attach($requests->flatMap(fn ($r) => [$r->requester, $r->provider]));

        return HelpRequestResource::collection($requests);
    }
}

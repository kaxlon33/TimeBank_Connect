<?php

namespace App\Http\Requests;

use App\Models\SkillCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Create and edit a skill post. Owner, status and moderation fields can never come from here. */
class SkillRequest extends FormRequest
{
    /**
     * Ownership is checked before the fields are validated, so someone editing another
     * member's skill gets "not allowed" rather than a list of form errors.
     */
    public function authorize(): bool
    {
        $id = $this->route('id');
        if ($id === null) {
            return true; // creating a skill: any signed-in member may offer one
        }

        $skill = \App\Models\Skill::query()->find((int) $id);

        // A missing skill is answered by the controller (404), not here.
        return $skill === null || $skill->user_id === $this->user()?->id;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:3', 'max:120'],
            'description' => ['required', 'string', 'min:10', 'max:1000'],
            'category_id' => ['required', 'integer', Rule::exists(SkillCategory::class, 'id')->where('is_active', true)],
            // Absent = keep the picture, null = remove it, a data URL = replace it.
            'image_url' => ['sometimes', 'nullable', 'string', 'max:3000000'],
            // The owner can hide a post and show it again. "removed" is for moderators only.
            'status' => ['sometimes', Rule::in(['active', 'hidden'])],
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.exists' => 'Choose a category.',
            'title.min' => 'Give your skill a clear title.',
            'description.min' => 'Say a little more so neighbours know what to expect.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'title' => trim((string) $this->input('title')),
            'description' => trim((string) $this->input('description')),
        ]);
    }
}

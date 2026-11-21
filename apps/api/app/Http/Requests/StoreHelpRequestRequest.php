<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHelpRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** Only these fields reach the service. The amount of credits is always worked out on the server. */
    public function rules(): array
    {
        $r = config('timebank.request');

        return [
            'skill_id' => ['required', 'integer', 'exists:skills,id'],
            'hours' => ['required', 'numeric', "min:{$r['min_hours']}", "max:{$r['max_hours']}", "multiple_of:{$r['hours_step']}"],
            'message' => ['nullable', 'string', 'max:1000'],
            'proposed_at' => ['nullable', 'date', 'after:now'],
        ];
    }

    public function messages(): array
    {
        return [
            'hours.multiple_of' => 'Choose a time in half-hour steps.',
            'hours.min' => 'The shortest session is half an hour.',
            'hours.max' => 'The longest session is four hours.',
            'proposed_at.after' => 'Pick a time in the future.',
        ];
    }
}

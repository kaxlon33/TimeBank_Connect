<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Only the member's own name, bio, area and picture. Role, status and balances are never accepted here. */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'bio' => ['nullable', 'string', 'max:500'],
            'country_code' => ['required', 'string', 'size:2', 'exists:countries,code'],
            'area_name' => ['required', 'string', 'min:2', 'max:120'],
            // Absent = keep the picture, null = remove it, a data URL = replace it.
            'avatar_url' => ['sometimes', 'nullable', 'string', 'max:3000000'],
        ];
    }

    public function messages(): array
    {
        return ['country_code.exists' => 'Choose a country from the list.'];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'bio' => trim((string) $this->input('bio')),
            'country_code' => strtoupper(trim((string) $this->input('country_code'))),
            'area_name' => trim((string) $this->input('area_name')),
        ]);
    }
}

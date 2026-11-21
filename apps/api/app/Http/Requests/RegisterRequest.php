<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8)],
            'country_code' => ['required', 'string', 'size:2', 'exists:countries,code'],
            'area_name' => ['required', 'string', 'min:2', 'max:120'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email is already registered.',
            'country_code.exists' => 'Choose a country from the list.',
            'password.min' => 'Use at least 8 characters.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower(trim((string) $this->input('email'))),
            'country_code' => strtoupper(trim((string) $this->input('country_code'))),
            'name' => trim((string) $this->input('name')),
            'area_name' => trim((string) $this->input('area_name')),
        ]);
    }
}

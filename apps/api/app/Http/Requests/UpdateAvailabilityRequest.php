<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/** The member's weekly free times: a list of day + start + end, replaced as a whole. */
class UpdateAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'slots' => ['present', 'array', 'max:28'],
            'slots.*.weekday' => ['required', 'integer', 'between:0,6'],
            'slots.*.start_time' => ['required', 'date_format:H:i'],
            'slots.*.end_time' => ['required', 'date_format:H:i'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            $byDay = [];
            foreach ((array) $this->input('slots', []) as $i => $slot) {
                if (! isset($slot['start_time'], $slot['end_time'], $slot['weekday'])) {
                    continue;
                }
                if ($slot['end_time'] <= $slot['start_time']) {
                    $validator->errors()->add("slots.{$i}.end_time", 'The end time must be after the start time.');
                    continue;
                }
                $byDay[$slot['weekday']][] = [$slot['start_time'], $slot['end_time'], $i];
            }

            // Two windows on the same day may not overlap.
            foreach ($byDay as $windows) {
                usort($windows, fn ($a, $b) => strcmp($a[0], $b[0]));
                for ($k = 1; $k < count($windows); $k++) {
                    if ($windows[$k][0] < $windows[$k - 1][1]) {
                        $validator->errors()->add("slots.{$windows[$k][2]}.start_time", 'Times on the same day cannot overlap.');
                    }
                }
            }
        }];
    }
}

<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;

class CreateSchoolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:200'],
            'short_name' => ['required', 'string', 'max:60'],
            'board' => ['required', 'string', 'max:40'],
            'school_type' => ['required', 'in:government,aided,private,international,other'],
            'medium' => ['required', 'string', 'max:100'],
            'registration_no' => ['nullable', 'string', 'max:60'],
            'classes_from' => ['required', 'string', 'max:10'],
            'classes_to' => ['required', 'string', 'max:10'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'district' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'pincode' => ['required', 'string', 'regex:/^[0-9]{6}$/'],
            'official_email' => ['required', 'email', 'max:150'],
            'phone' => ['required', 'string', 'max:25'],
            'website' => ['nullable', 'url', 'max:200'],
            'principal_name' => ['nullable', 'string', 'max:150'],
            'principal_phone' => ['nullable', 'string', 'max:25'],
            'campuses' => ['nullable', 'integer', 'min:1'],
            'timezone' => ['nullable', 'string', 'timezone'],
            'admin_full_name' => ['required', 'string', 'max:150'],
            'admin_email' => ['required', 'email', 'unique:users,email'],
            'admin_mobile' => ['required', 'string', 'max:25'],
            'admin_designation' => ['nullable', 'string', 'max:100'],
        ];
    }
}

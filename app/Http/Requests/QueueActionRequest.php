<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class QueueActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canOperateQueue() ?? false;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return ['counter' => ['sometimes', 'nullable', 'string', 'max:40']];
    }
}

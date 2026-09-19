<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\QueueSettingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string|null $default_prefix
 * @property int $number_digits
 */
#[Fillable(['default_prefix', 'number_digits'])]
class QueueSetting extends Model
{
    /** @use HasFactory<QueueSettingFactory> */
    use HasFactory;

    public static function current(): self
    {
        return static::query()->firstOrCreate(
            ['id' => 1],
            ['default_prefix' => null, 'number_digits' => 3],
        );
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchoolSubscription extends Model
{
    use HasFactory;

    protected $table = 'school_subscriptions';

    protected $fillable = [
        'school_id',
        'plan_code',
        'valid_from',
        'valid_to',
        'student_limit',
        'user_limit',
        'status',
    ];

    protected $casts = [
        'valid_from' => 'date',
        'valid_to' => 'date',
        'student_limit' => 'integer',
        'user_limit' => 'integer',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoginSession extends Model
{
    use HasFactory;

    protected $table = 'login_sessions';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'school_id',
        'token_hash',
        'ip',
        'user_agent',
        'created_at',
        'last_seen_at',
        'expires_at',
        'revoked_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id');
    }
}

<?php

namespace App\Support\Tenancy;

use App\Models\School;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToSchool
{
    public static function bootBelongsToSchool(): void
    {
        static::addGlobalScope('school_scope', function (Builder $builder) {
            if (CurrentSchool::check()) {
                $builder->where($builder->getModel()->getTable() . '.school_id', CurrentSchool::id());
            }
        });

        static::creating(function (Model $model) {
            if (CurrentSchool::check() && empty($model->school_id)) {
                $model->school_id = CurrentSchool::id();
            }
        });
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id');
    }
}

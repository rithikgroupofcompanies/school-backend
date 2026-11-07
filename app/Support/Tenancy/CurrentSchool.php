<?php

namespace App\Support\Tenancy;

use App\Models\School;

class CurrentSchool
{
    protected static ?School $currentSchool = null;

    public static function set(?School $school): void
    {
        static::$currentSchool = $school;
    }

    public static function get(): ?School
    {
        return static::$currentSchool;
    }

    public static function id(): ?int
    {
        return static::$currentSchool?->id;
    }

    public static function check(): bool
    {
        return static::$currentSchool !== null;
    }

    public static function forget(): void
    {
        static::$currentSchool = null;
    }
}

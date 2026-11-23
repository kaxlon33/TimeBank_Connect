<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // No test may call a real third-party API. Tests that need one fake it explicitly.
        \Illuminate\Support\Facades\Http::preventStrayRequests();

        // RefreshDatabase wipes the database it runs on. Never let that be the real one.
        $name = (string) config('database.connections.'.config('database.default').'.database');
        if (! str_ends_with($name, '_test') && $name !== ':memory:') {
            throw new \RuntimeException("Refusing to run tests against '{$name}'. Use a database ending in _test.");
        }
    }
}

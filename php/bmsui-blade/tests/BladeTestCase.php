<?php

namespace BMSuisse\BMSUi\Tests;

use BMSuisse\BMSUi\BMSUiServiceProvider;
use Illuminate\Support\Facades\Blade;
use Orchestra\Testbench\TestCase;

/** Shared setup for the component test classes: the provider plus a Blade::render helper. */
abstract class BladeTestCase extends TestCase
{
    protected function getPackageProviders($app)
    {
        return [BMSUiServiceProvider::class];
    }

    protected function html(string $blade, array $data = []): string
    {
        return Blade::render($blade, $data);
    }
}

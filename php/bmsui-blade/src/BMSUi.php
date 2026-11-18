<?php

namespace BMSuisse\BMSUi;

/**
 * Paths to the shipped assets, for hosts with their own asset pipeline
 * (e.g. FreeScout/OneDesk modules registering stylesheets/javascripts via hooks).
 */
final class BMSUi
{
    public static function cssPath(): string
    {
        return dirname(__DIR__).'/resources/css/bmsui.css';
    }

    public static function jsPath(): string
    {
        return dirname(__DIR__).'/resources/js/bmsui.js';
    }

    public static function viewsPath(): string
    {
        return dirname(__DIR__).'/resources/views';
    }
}

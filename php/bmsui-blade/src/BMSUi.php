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

    /** JSON translations (de, fr, it, nl, es); hosts with their own loader register this directory. */
    public static function langPath(): string
    {
        return dirname(__DIR__).'/resources/lang';
    }

    public static function viewsPath(): string
    {
        return dirname(__DIR__).'/resources/views';
    }

    /** "1.2 MB" style size; decimal comma for de-DE/fr/it locales, point for de-CH/en. */
    public static function formatFileSize(int|float $bytes, string $locale = 'de-CH'): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        $n = max(0, (float) $bytes);
        while ($n >= 1024 && $i < count($units) - 1) {
            $n /= 1024;
            $i++;
        }
        $text = $i === 0 ? (string) (int) $n : rtrim(rtrim(number_format($n, $n < 10 ? 1 : 0, '.', ''), '0'), '.');
        if (preg_match('/^(de[-_](?!CH)|fr|it)/i', $locale)) {
            $text = str_replace('.', ',', $text);
        }

        return $text.' '.$units[$i];
    }

    public static function isValidEmail(string $text): bool
    {
        return (bool) preg_match('/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/', trim($text));
    }

    /**
     * Splits text on `[,;\s]+` (also `Name <a@b.ch>`), dedupes case-insensitively.
     *
     * @return array{valid: string[], invalid: string[]}
     */
    public static function parseEmailAddresses(string $text): array
    {
        $text = preg_replace('/[^,;<>]*<([^<>]*)>/', ' $1 ', $text) ?? $text;
        $out = ['valid' => [], 'invalid' => []];
        $seen = [];
        foreach (preg_split('/[,;\s]+/', $text, -1, PREG_SPLIT_NO_EMPTY) as $part) {
            $part = trim($part, "\"'");
            $key = strtolower($part);
            if ($part === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[self::isValidEmail($part) ? 'valid' : 'invalid'][] = $part;
        }

        return $out;
    }
}

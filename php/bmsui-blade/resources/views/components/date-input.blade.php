@props([
    // date | datetime (date + time) | time
    'type' => 'date',
    // DateTimeInterface, timestamp or parseable string; '' / null = empty.
    'value' => null,
    'min' => null,
    'max' => null,
    'invalid' => false,
    'size' => 'md',
])
{{-- Native date/time field (the browser shows its own picker and the user's date format; the value
     posts as ISO: 2026-11-18 / 2026-11-18T09:30). Inside a form-field it picks up id, help and error. --}}
@aware(['for' => null, 'help' => null, 'error' => null])
@php
    $native = ['date' => 'date', 'datetime' => 'datetime-local', 'time' => 'time'][$type] ?? 'date';
    $fmt = ['date' => 'Y-m-d', 'datetime-local' => 'Y-m-d\TH:i', 'time' => 'H:i'][$native];
    $iso = function ($v) use ($fmt) {
        if ($v === null || $v === '') { return null; }
        try {
            return \Illuminate\Support\Carbon::parse($v instanceof \DateTimeInterface ? $v : (is_numeric($v) ? '@'.$v : $v))->format($fmt);
        } catch (\Throwable) {
            return (string) $v;
        }
    };
    $id = $attributes->get('id') ?? $for;
    $mine = $for !== null && $id === $for;
    $bad = $invalid || ($mine && $error);
    $desc = $mine ? trim(($help ? $for.'-help ' : '').($error ? $for.'-error' : '')) : '';
@endphp
<input type="{{ $native }}" {{ $attributes->class(['bmsui-input', 'bmsui-date', 'bmsui-input--sm' => $size === 'sm'])->merge(array_filter([
    'id' => $id, 'value' => $iso($value), 'min' => $iso($min), 'max' => $iso($max),
    'step' => $native === 'date' ? null : ($attributes->get('step') ?? 60),
    'aria-describedby' => $desc ?: null, 'aria-invalid' => $bad ? 'true' : null,
], fn ($v) => $v !== null)) }}>

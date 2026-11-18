@props([
    'type' => 'text',
    'invalid' => false,
    // sm | md
    'size' => 'md',
])
{{-- Native <input>; every attribute passes through (name, value, placeholder, data-*). Inside a
     form-field it picks up the field's id, help and error (aria-describedby, aria-invalid). --}}
@aware(['for' => null, 'help' => null, 'error' => null])
@php
    $id = $attributes->get('id') ?? $for;
    $mine = $for !== null && $id === $for;
    $bad = $invalid || ($mine && $error);
    $desc = $mine ? trim(($help ? $for.'-help ' : '').($error ? $for.'-error' : '')) : '';
@endphp
<input type="{{ $type }}" {{ $attributes->class(['bmsui-input', 'bmsui-input--sm' => $size === 'sm'])->merge(array_filter(['id' => $id, 'aria-describedby' => $desc ?: null, 'aria-invalid' => $bad ? 'true' : null])) }}>

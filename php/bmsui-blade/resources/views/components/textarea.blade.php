@props([
    'invalid' => false,
    // Grows with its content (up to maxRows) instead of scrolling.
    'autoResize' => false,
    'maxRows' => null,
    'rows' => 3,
])
{{-- Native <textarea>; the default slot is its value (escaped). Inside a form-field it picks up
     the field's id, help and error. --}}
@aware(['for' => null, 'help' => null, 'error' => null])
@php
    $id = $attributes->get('id') ?? $for;
    $mine = $for !== null && $id === $for;
    $bad = $invalid || ($mine && $error);
    $desc = $mine ? trim(($help ? $for.'-help ' : '').($error ? $for.'-error' : '')) : '';
@endphp
<textarea rows="{{ $rows }}" {{ $attributes->class(['bmsui-input', 'bmsui-textarea'])->merge(array_filter(['id' => $id, 'aria-describedby' => $desc ?: null, 'aria-invalid' => $bad ? 'true' : null, 'data-bmsui-autoresize' => $autoResize ? ($maxRows ?: 'true') : null])) }}>{{ $slot }}</textarea>

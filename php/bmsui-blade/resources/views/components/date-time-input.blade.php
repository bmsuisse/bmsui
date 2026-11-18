@props([
    'value' => null,
    'min' => null,
    'max' => null,
    'invalid' => false,
    'size' => 'md',
])
{{-- Date + time in one native field; same as the date input with type="datetime". --}}
<x-bmsui::date-input type="datetime" :value="$value" :min="$min" :max="$max" :invalid="$invalid" :size="$size" {{ $attributes }} />

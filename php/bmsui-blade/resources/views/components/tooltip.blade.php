@props([
    'text',
    // top | bottom | left | right (flips when there is no room)
    'side' => 'top',
])
{{-- Wraps its slot; any element with data-bmsui-tooltip="..." gets the same tooltip, so plain markup
     (e.g. replacing Bootstrap's title/data-toggle="tooltip") works too. Shown on hover and focus,
     Escape hides it; the text is also set as aria-describedby target. --}}
<span {{ $attributes->class('bmsui-tip-anchor') }} data-bmsui-tooltip="{{ $text }}" data-side="{{ $side }}">{{ $slot }}</span>

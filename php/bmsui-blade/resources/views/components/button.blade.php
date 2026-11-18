@props([
    // primary | secondary | outline | ghost | link | danger
    'variant' => 'primary',
    // xs | sm | md | lg
    'size' => 'md',
    // Square icon-only button: set aria-label.
    'icon' => false,
    // Renders an <a> when set (disabled links get aria-disabled and no href).
    'href' => null,
    'type' => 'button',
    // Spinner + disabled while something is in flight.
    'loading' => false,
    'disabled' => false,
])
{{-- Slots: default (text), `start` / `end` (icons before/after the text; any svg is sized 16px). --}}
@php
    $cls = ['bmsui-btn', 'bmsui-btn--'.$variant => $variant !== 'outline', 'bmsui-btn--'.$size => $size !== 'sm', 'bmsui-btn--icon' => $icon, 'bmsui-btn--square' => $icon];
    $off = $disabled || $loading;
@endphp
@if($href)
<a {{ $attributes->class($cls)->merge($off ? ['aria-disabled' => 'true', 'tabindex' => '-1'] : ['href' => $href]) }} @if($loading) aria-busy="true" @endif>
@else
<button type="{{ $type }}" {{ $attributes->class($cls) }} @disabled($off) @if($loading) aria-busy="true" @endif>
@endif
    @if($loading)<svg class="bmsui-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 109 9" /></svg>@elseif(isset($start)){{ $start }}@endif
    {{ $slot }}
    @isset($end){{ $end }}@endisset
@if($href)
</a>
@else
</button>
@endif

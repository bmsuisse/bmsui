@props([
    'label',
    'value',
    'sub' => null,
    // up | down | null: colours the sub line (green / red)
    'trend' => null,
])
<div {{ $attributes->class('bmsui-stat') }}>
    <span class="bmsui-stat__label">{{ $label }}</span>
    <span class="bmsui-stat__value">{{ $value }}</span>
    @if($sub !== null)<span class="bmsui-stat__sub {{ $trend ? 'bmsui-stat__sub--'.$trend : '' }}">{{ $sub }}</span>@endif
</div>

@props([
    'label',
    // Already formatted ("1 h 24 min", "CHF 1'234").
    'value',
    // Change text, e.g. "+12 %"; `trend` colours it.
    'delta' => null,
    // up | down | flat
    'trend' => null,
    // Whether up is good (green) or bad (red), e.g. false for "open tickets".
    'upIsGood' => true,
    'sub' => null,
    // Numbers for a sparkline at the bottom.
    'spark' => [],
    'sparkLabel' => null,
    'href' => null,
])
@php
    $good = $trend === 'flat' || $trend === null ? null : (($trend === 'up') === (bool) $upIsGood);
    $tone = $good === null ? 'muted' : ($good ? 'success' : 'danger');
    $tag = $href ? 'a' : 'div';
@endphp
<{{ $tag }} {{ $attributes->class('bmsui-kpi')->merge($href ? ['href' => $href] : []) }}>
    <span class="bmsui-kpi__label">{{ $label }}</span>
    <span class="bmsui-kpi__value">{{ $value }}</span>
    @if($delta !== null || $sub !== null)
        <span class="bmsui-kpi__foot">
            @if($delta !== null)<span class="bmsui-kpi__delta bmsui-kpi__delta--{{ $tone }}">@if($trend === 'up')&#9650;@elseif($trend === 'down')&#9660;@endif {{ $delta }}</span>@endif
            @if($sub !== null)<span class="bmsui-kpi__sub">{{ $sub }}</span>@endif
        </span>
    @endif
    @if($spark)<x-bmsui::sparkline class="bmsui-kpi__spark" :values="$spark" :width="200" :height="32" :tone="$tone === 'muted' ? 'accent' : $tone" :label="$sparkLabel" />@endif
    {{ $slot }}
</{{ $tag }}>

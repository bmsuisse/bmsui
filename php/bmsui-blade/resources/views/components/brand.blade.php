@props([
    // Product suffix: "Desk" renders "OneDesk".
    'product' => 'Desk',
    // full | one | mark
    'mode' => 'full',
    // Font size in px; the ring scales with the wordmark.
    'size' => 32,
    // Accent dot colour (any CSS colour).
    'dot' => '#e60028',
    // Plays a short, reduced-motion-aware pulse of the dot once.
    'animate' => false,
])
@php($label = $mode === 'full' ? 'One'.$product : ($mode === 'one' ? 'One' : 'O'))
@php($tail = $mode === 'full' ? 'ne'.$product : ($mode === 'one' ? 'ne' : ''))
<span {{ $attributes->class(['bmsui-brand', 'bmsui-brand--animate' => $animate])->merge(['style' => '--bmsui-brand-dot:'.$dot.';font-size:'.(int) $size.'px']) }} role="img" aria-label="{{ $label }}">
    <span class="bmsui-brand__mark" aria-hidden="true"><span class="bmsui-brand__dot"></span></span><span aria-hidden="true">{{ $tail }}</span>
</span>

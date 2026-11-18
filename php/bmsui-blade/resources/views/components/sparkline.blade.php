@props([
    // Numbers in order (nulls are skipped).
    'values' => [],
    'width' => 96,
    'height' => 28,
    // accent | success | danger | muted
    'tone' => 'accent',
    // Filled area under the line.
    'area' => true,
    // Accessible description, e.g. "Last 7 days: 12 to 30". Without it the chart is decorative.
    'label' => null,
])
@php
    $pts = array_values(array_filter(array_map(fn ($v) => is_numeric($v) ? (float) $v : null, (array) $values), fn ($v) => $v !== null));
    $n = count($pts);
    $min = $n ? min($pts) : 0;
    $max = $n ? max($pts) : 0;
    $span = $max - $min ?: 1;
    $pad = 2;
    $xy = [];
    foreach ($pts as $i => $v) {
        $x = $n > 1 ? $pad + $i * ($width - 2 * $pad) / ($n - 1) : $width / 2;
        $y = $height - $pad - ($v - $min) / $span * ($height - 2 * $pad);
        $xy[] = round($x, 1).','.round($y, 1);
    }
    $line = implode(' ', $xy);
@endphp
<svg {{ $attributes->class(['bmsui-spark', 'bmsui-spark--'.$tone]) }} width="{{ $width }}" height="{{ $height }}" viewBox="0 0 {{ $width }} {{ $height }}" @if($label) role="img" aria-label="{{ $label }}" @else aria-hidden="true" @endif preserveAspectRatio="none">
    @if($n > 1)
        @if($area)<polygon class="bmsui-spark__area" points="{{ $pad }},{{ $height }} {{ $line }} {{ $width - $pad }},{{ $height }}" />@endif
        <polyline class="bmsui-spark__line" points="{{ $line }}" fill="none" vector-effect="non-scaling-stroke" />
        @php([$lx, $ly] = explode(',', end($xy)))
        <circle class="bmsui-spark__dot" cx="{{ $lx }}" cy="{{ $ly }}" r="2" />
    @endif
</svg>

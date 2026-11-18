@props([
    // DateTimeInterface, timestamp or parseable string.
    'value',
    // relative ("vor 5 Minuten", refreshed in the browser) | date | datetime | time
    'format' => 'relative',
    // Locale for the text; defaults to the app locale.
    'locale' => null,
    // Shows the full date as a tooltip.
    'tooltip' => true,
])
@php
    $loc = $locale ?? app()->getLocale();
    $dt = \Illuminate\Support\Carbon::parse($value instanceof \DateTimeInterface ? $value : (is_numeric($value) ? '@'.$value : $value))->locale($loc);
    $full = $dt->isoFormat('LLLL');
    $text = match ($format) {
        'date' => $dt->isoFormat('L'),
        'datetime' => $dt->isoFormat('L LT'),
        'time' => $dt->isoFormat('LT'),
        default => $dt->diffForHumans(),
    };
@endphp
<time {{ $attributes->class('bmsui-time') }} datetime="{{ $dt->toIso8601String() }}" @if($format === 'relative') data-bmsui-relative @endif @if($tooltip) data-bmsui-tooltip="{{ $full }}" @else title="{{ $full }}" @endif>{{ $text }}</time>

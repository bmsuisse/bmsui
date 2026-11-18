@props([
    // CSS lengths or px numbers.
    'width' => null,
    'height' => null,
    'circle' => false,
    // More than 1 = a paragraph of text lines (the last one shorter).
    'lines' => 1,
])
@php($len = fn ($v) => $v === null ? null : (is_numeric($v) ? $v.'px' : $v))
@if($lines > 1)
    <span {{ $attributes->class('bmsui-skeleton-lines') }} aria-hidden="true">
        @for($i = 0; $i < $lines; $i++)<span class="bmsui-skeleton bmsui-skeleton--text" @if($i === $lines - 1) style="width: 60%" @endif></span>@endfor
    </span>
@else
    <span {{ $attributes->class(['bmsui-skeleton', 'bmsui-skeleton--circle' => $circle]) }} aria-hidden="true" @if($width || $height) style="{{ $width ? 'width: '.$len($width).';' : '' }}{{ $height ? 'height: '.$len($height).';' : '' }}" @endif></span>
@endif

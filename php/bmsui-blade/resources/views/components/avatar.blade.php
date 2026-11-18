@props(['name' => '', 'src' => null, 'size' => 32])
@php
    $parts = preg_split('/\s+/', trim((string) $name), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $initials = mb_strtoupper(mb_substr($parts[0] ?? '?', 0, 1).(count($parts) > 1 ? mb_substr(end($parts), 0, 1) : ''));
    $hue = crc32((string) $name) % 360;
@endphp
<span {{ $attributes->class('bmsui-avatar')->merge(['title' => $name]) }} style="--bmsui-av: {{ (int) $size }}px; --bmsui-av-hue: {{ $hue }}">
    <span aria-hidden="true">{{ $initials }}</span>
    @if($src)<img src="{{ $src }}" alt="{{ $name }}" loading="lazy">@endif
</span>

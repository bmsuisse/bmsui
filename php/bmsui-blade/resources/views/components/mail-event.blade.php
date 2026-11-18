@props([
    // neutral | success | warning | danger
    'tone' => 'neutral',
    // Already formatted.
    'time' => null,
    'datetime' => null,
])
<div {{ $attributes->class(['bmsui-event', 'bmsui-event--'.$tone => $tone !== 'neutral']) }}>
    <span class="bmsui-event__line" aria-hidden="true"></span>
    <span class="bmsui-event__text">
        @isset($icon){{ $icon }}@endisset
        <span>{{ $slot }}</span>
        @if($time)<time class="bmsui-event__time" @if($datetime) datetime="{{ $datetime }}" @endif>{{ $time }}</time>@endif
    </span>
    <span class="bmsui-event__line" aria-hidden="true"></span>
</div>

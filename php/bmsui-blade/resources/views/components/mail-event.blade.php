@props([
    // neutral | success | warning | danger
    'tone' => 'neutral',
    // Already formatted.
    'time' => null,
    'datetime' => null,
    // FreeScout thread id of the line item, rendered as data-thread-id.
    'threadId' => null,
])
{{-- FreeScout "line items" (assigned, status changed, merged ...) render as a mail-event. --}}
<div {{ $attributes->class(['bmsui-event', 'bmsui-event--'.$tone => $tone !== 'neutral'])->merge($threadId !== null ? ['data-thread-id' => $threadId] : []) }}>
    <span class="bmsui-event__line" aria-hidden="true"></span>
    <span class="bmsui-event__text">
        @isset($icon){{ $icon }}@endisset
        <span>{{ $slot }}</span>
        @if($time)<time class="bmsui-event__time" @if($datetime) datetime="{{ $datetime }}" @endif>{{ $time }}</time>@endif
    </span>
    <span class="bmsui-event__line" aria-hidden="true"></span>
</div>

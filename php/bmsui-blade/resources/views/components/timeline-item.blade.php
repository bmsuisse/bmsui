@props([
    'title',
    // Already formatted (e.g. "vor 5 Min." or "14.11.2026 09:12").
    'time' => null,
    // neutral | accent | success | warning | danger
    'tone' => 'neutral',
])
<li {{ $attributes->class('bmsui-timeline__item') }}>
    <span class="bmsui-timeline__dot {{ $tone !== 'neutral' ? 'bmsui-timeline__dot--'.$tone : '' }}" aria-hidden="true"></span>
    <span class="bmsui-timeline__title">{{ $title }}</span>
    @if($time)<span class="bmsui-timeline__time">{{ $time }}</span>@endif
    @if(!$slot->isEmpty())<div class="bmsui-timeline__body">{{ $slot }}</div>@endif
</li>

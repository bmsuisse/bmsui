@props([
    'title' => null,
    // start | end: which edge of the trigger it aligns to.
    'align' => 'start',
    'top' => false,
    // Accessible name when the trigger has no text.
    'label' => null,
    'triggerClass' => 'bmsui-btn',
    'width' => null,
])
{{-- Click-to-open panel next to a trigger (Bootstrap popover replacement). Slots: `trigger` (button
     content), default (panel content). Closes on outside click and Escape; fires bmsui:open/bmsui:close. --}}
<span {{ $attributes->class(['bmsui-popover', 'bmsui-popover--top' => $top]) }} data-bmsui-popover>
    <button type="button" class="{{ $triggerClass }}" data-bmsui-popover-toggle aria-expanded="false" aria-haspopup="dialog" @if($label) aria-label="{{ $label }}" @endif>{{ $trigger ?? '' }}</button>
    <div class="bmsui-popover__panel {{ $align === 'end' ? 'bmsui-popover__panel--end' : '' }}" role="dialog" @if($title || $label) aria-label="{{ $title ?? $label }}" @endif @if($width) style="width: {{ is_numeric($width) ? $width.'px' : $width }}" @endif hidden>
        @if($title)<strong class="bmsui-popover__title">{{ $title }}</strong>@endif
        {{ $slot }}
    </div>
</span>

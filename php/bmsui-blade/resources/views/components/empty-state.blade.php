@props([
    'title',
    'description' => null,
    // sm | md
    'size' => 'md',
    // Default icon (an empty tray) when no `icon` slot is given; false = no icon.
    'showIcon' => true,
])
{{-- Empty folder/list. Slots: `icon`, `action` (buttons/links), default (extra content). Use it when
     there is nothing to show, not when loading failed (use the alert box there). --}}
<div {{ $attributes->class(['bmsui-empty', 'bmsui-empty--sm' => $size === 'sm']) }}>
    @if(isset($icon) || $showIcon)
        <span class="bmsui-empty__icon" aria-hidden="true">
            @isset($icon){{ $icon }}@else<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.25 13.5h3.86a2.25 2.25 0 012.01 1.24l.27.54a2.25 2.25 0 002.01 1.24h3.2a2.25 2.25 0 002.01-1.24l.27-.54a2.25 2.25 0 012.01-1.24h3.86M2.25 13.5V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.5M2.25 13.5l2.6-7.8A2.25 2.25 0 017 4.5h10a2.25 2.25 0 012.14 1.2l2.6 7.8"/></svg>@endisset
        </span>
    @endif
    <p class="bmsui-empty__title">{{ $title }}</p>
    @if($description)<p class="bmsui-empty__desc">{{ $description }}</p>@endif
    {{ $slot }}
    @isset($action)<div class="bmsui-empty__action">{{ $action }}</div>@endisset
</div>

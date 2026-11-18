@props([
    'label',
    'href' => null,
    'active' => false,
    // Count/badge text (unread conversations).
    'count' => null,
    // Drag-and-drop targets etc. can use data-* attributes; they go on the link.
])
{{-- One entry: put it inside a nav-group or directly in the sidebar. Slot `icon` (24px outline icon).
     In the collapsed rail only the icon shows, with the label as tooltip. --}}
<li class="bmsui-navitem">
    <{{ $href ? 'a' : 'button' }} {{ $attributes->class(['bmsui-navitem__link', 'is-active' => $active])->merge($href ? ['href' => $href] : ['type' => 'button']) }} @if($active) aria-current="page" @endif data-bmsui-tooltip="{{ $label }}" data-side="right" data-tip-when="collapsed">
        @isset($icon)<span class="bmsui-navitem__icon" aria-hidden="true">{{ $icon }}</span>@endisset
        <span class="bmsui-navitem__label">{{ $label }}</span>
        @if($count !== null && $count !== '' && $count !== 0)<span class="bmsui-navitem__count">{{ $count }}</span>@endif
    </{{ $href ? 'a' : 'button' }}>
</li>

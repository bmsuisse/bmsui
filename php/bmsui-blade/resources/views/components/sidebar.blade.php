@props([
    // Rail-collapsed (icons only). null = read the cookie below, so the page renders in the saved state
    // without a flash (no localStorage). Pass a bool when the host reads its own setting.
    'collapsed' => null,
    // Cookie the toggle writes (bmsui.js): "1" = collapsed. The JS sets it unencrypted, so a Laravel app
    // lists it in EncryptCookies::$except; the component reads $_COOKIE directly.
    'cookie' => 'bmsui_sidebar',
    // Shows the collapse toggle in the footer.
    'collapsible' => true,
    'label' => __('Main navigation'),
    'collapseLabel' => __('Collapse sidebar'),
    'expandLabel' => __('Expand sidebar'),
])
{{-- App navigation. Slots: `header` (brand), `mark` (small brand for the collapsed rail), default (nav-group / nav-item tree), `footer` (user menu).
     Below 768px it is an off-canvas drawer: a button with data-bmsui-sidebar-open="#id" opens it. --}}
@php
    $isCollapsed = $collapsed ?? (($_COOKIE[$cookie] ?? '') === '1');
@endphp
<aside {{ $attributes->class(['bmsui-sidebar', 'is-collapsed' => $isCollapsed]) }} data-bmsui-sidebar data-cookie="{{ $cookie }}" data-l-collapse="{{ $collapseLabel }}" data-l-expand="{{ $expandLabel }}">
    @if(isset($header) || isset($mark))
        <div class="bmsui-sidebar__head">
            @isset($header)<span class="bmsui-sidebar__full">{{ $header }}</span>@endisset
            @isset($mark)<span class="bmsui-sidebar__mark">{{ $mark }}</span>@endisset
        </div>
    @endif
    <nav class="bmsui-sidebar__nav" aria-label="{{ $label }}">{{ $slot }}</nav>
    @if(isset($footer) || $collapsible)
        <div class="bmsui-sidebar__foot">
            @isset($footer){{ $footer }}@endisset
            @if($collapsible)
                <button type="button" class="bmsui-sidebar__toggle" data-bmsui-sidebar-toggle aria-expanded="{{ $isCollapsed ? 'false' : 'true' }}" aria-label="{{ $isCollapsed ? $expandLabel : $collapseLabel }}" data-bmsui-tooltip="{{ $isCollapsed ? $expandLabel : $collapseLabel }}" data-side="right" data-tip-when="collapsed">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"/></svg>
                </button>
            @endif
        </div>
    @endif
</aside>
<div class="bmsui-sidebar-scrim" data-bmsui-sidebar-close hidden></div>

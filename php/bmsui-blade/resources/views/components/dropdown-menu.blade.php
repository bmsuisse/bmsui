@props([
    // [['id' => 'forward', 'label' => 'Forward', 'href' => null, 'shortcut' => 'F', 'danger' => false, 'disabled' => false],
    //  ['separator' => true], ['heading' => 'More'], ['label' => 'Move to', 'items' => [...]] (submenu)]
    // Items without href fire `bmsui:select` ({detail: {id}}) on the root; links navigate.
    'items' => [],
    // Accessible name of the trigger and the menu. With no `trigger` slot the trigger is an icon-only "…" button.
    'label' => __('More actions'),
    // start | end: which edge of the trigger the menu aligns to.
    'align' => 'start',
    // Opens above the trigger.
    'top' => false,
    // Trigger button look (same variants as the button component): ghost | outline | secondary | primary
    'variant' => 'ghost',
    'triggerAttributes' => [],
])
{{-- Slots: `trigger` (button content instead of the "…" icon), default slot (own rows: use
     role="menuitem" class="bmsui-menu__item" tabindex="-1", they get the same keyboard handling). --}}
@php($bag = new \Illuminate\View\ComponentAttributeBag((array) $triggerAttributes))
<span {{ $attributes->class(['bmsui-dropdown', 'bmsui-dropdown--top' => $top]) }} data-bmsui-dropdown>
    <button type="button" {{ $bag->class(['bmsui-btn', 'bmsui-btn--'.$variant, 'bmsui-btn--icon' => !isset($trigger)])->merge(['aria-label' => isset($trigger) ? null : $label]) }} aria-haspopup="menu" aria-expanded="false" data-bmsui-menu-toggle>
        @isset($trigger){{ $trigger }}@else<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/></svg>@endisset
    </button>
    <div class="bmsui-menu {{ $align === 'end' ? 'bmsui-menu--end' : '' }}" role="menu" aria-label="{{ $label }}" hidden>
        @include('bmsui::partials.menu-items', ['items' => $items])
        {{ $slot }}
    </div>
</span>

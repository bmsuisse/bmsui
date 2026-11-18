@props([
    // sm | md | lg
    'size' => 'md',
    // Visible text next to the spinner; without it the spinner still has an accessible name.
    'label' => null,
    'srLabel' => __('Loading…'),
])
<span {{ $attributes->class(['bmsui-loading', 'bmsui-loading--'.$size]) }} role="status">
    <span class="bmsui-spinner" aria-hidden="true"></span>
    @if($label)<span class="bmsui-loading__label">{{ $label }}</span>@else<span class="bmsui-sr">{{ $srLabel }}</span>@endif
</span>

@props([
    // neutral | info | success | warning | danger
    'tone' => 'neutral',
    // Renders an <a> when set.
    'href' => null,
    // Adds a dismiss button (removes the chip client-side, fires `bmsui:dismiss`).
    'removable' => false,
    'removeLabel' => __('Remove'),
])
@php($tag = $href ? 'a' : 'span')
<{{ $tag }} {{ $attributes->class(['bmsui-chip', 'bmsui-chip--'.$tone => $tone !== 'neutral'])->merge($href ? ['href' => $href] : []) }}>
    <span class="bmsui-chip__text">{{ $slot }}</span>
    @if($removable)
        <button type="button" class="bmsui-chip__x" data-bmsui-dismiss aria-label="{{ $removeLabel }}">&times;</button>
    @endif
</{{ $tag }}>

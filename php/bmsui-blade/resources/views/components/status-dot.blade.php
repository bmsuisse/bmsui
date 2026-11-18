@props([
    // neutral | info | success | warning | error | accent
    'tone' => 'neutral',
    // Visible text next to the dot; without it set `label` so screen readers get a name.
    'label' => null,
    // Ripple for "live" states (not shown with reduced motion).
    'pulse' => false,
])
<span {{ $attributes->class(['bmsui-dot', 'bmsui-dot--'.$tone, 'is-pulse' => $pulse]) }}>
    <span class="bmsui-dot__mark" @if($label && $slot->isEmpty()) role="img" aria-label="{{ $label }}" @else aria-hidden="true" @endif></span>
    @unless($slot->isEmpty())<span class="bmsui-dot__text">{{ $slot }}</span>@endunless
</span>

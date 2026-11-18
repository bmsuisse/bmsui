@props([
    // default | secondary | outline | danger | warning | success | info
    'variant' => 'default',
])
{{-- Small count/label pill (unread counts, "Neu"). For a status word use the status badge. --}}
<span {{ $attributes->class(['bmsui-badge', 'bmsui-badge--'.$variant => $variant !== 'default']) }}>{{ $slot }}</span>

@props([
    // solid | subtle | ghost
    'variant' => 'subtle',
    // Shows a spinner and disables the button while an AI call is in flight.
    'loading' => false,
    'type' => 'button',
])
<button type="{{ $type }}"
    {{ $attributes->class(['bmsui-btn', 'bmsui-ai', 'bmsui-ai--'.$variant => $variant !== 'solid']) }}
    @if($loading) disabled aria-busy="true" @endif>
    @if($loading)
        <svg class="bmsui-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 109 9" /></svg>
    @else
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.81 15.9L9 18.75l-.81-2.85a4.5 4.5 0 00-3.09-3.09L2.25 12l2.85-.81a4.5 4.5 0 003.09-3.09L9 5.25l.81 2.85a4.5 4.5 0 003.09 3.09L15.75 12l-2.85.81a4.5 4.5 0 00-3.09 3.09zM18.26 8.72L18 9.75l-.26-1.03a3.38 3.38 0 00-2.46-2.46L14.25 6l1.04-.26a3.38 3.38 0 002.46-2.46L18 2.25l.26 1.03a3.38 3.38 0 002.46 2.46l1.03.26-1.03.26a3.38 3.38 0 00-2.46 2.46zM16.9 20.25L16.5 21.75l-.4-1.5a2.25 2.25 0 00-1.5-1.5l-1.5-.4 1.5-.4a2.25 2.25 0 001.5-1.5l.4-1.5.4 1.5a2.25 2.25 0 001.5 1.5l1.5.4-1.5.4a2.25 2.25 0 00-1.5 1.5z"/></svg>
    @endif
    {{ $slot }}
</button>

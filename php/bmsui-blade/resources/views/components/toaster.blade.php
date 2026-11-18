@props([
    // Toasts to show on load, e.g. from the session flash:
    // [['tone' => 'success', 'title' => 'Saved', 'description' => null, 'duration' => 4000]]
    'toasts' => [],
    // top-right | bottom-right | bottom-center | top-center
    'position' => 'bottom-right',
    'dismissLabel' => __('Dismiss'),
    'regionLabel' => __('Notifications'),
])
{{-- Render once per page (layout). JS: BMSUi.toast({title, description, tone, duration, id, action: {label, onClick}})
     and BMSUi.toast.success/.error/.warning/.info(title, options); `id` replaces a visible toast with the same id;
     duration Infinity = sticky; errors stay 8s, others 4s; max 3; hover/focus pauses. --}}
<section {{ $attributes->class(['bmsui-toaster', 'bmsui-toaster--'.$position]) }} aria-label="{{ $regionLabel }}" data-bmsui-toaster data-l-dismiss="{{ $dismissLabel }}"
    @if($toasts) data-initial="{{ json_encode(array_values(array_map(fn ($t) => (array) $t, $toasts))) }}" @endif>
    <ol class="bmsui-toaster__list" role="status" aria-live="polite"></ol>
</section>

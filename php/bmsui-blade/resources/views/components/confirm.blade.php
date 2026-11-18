@props([
    'message' => __('Are you sure?'),
    'confirmLabel' => __('Delete'),
    'cancelLabel' => __('Cancel'),
    // Opens above the trigger instead of below.
    'top' => false,
    // With `action` the confirm button submits a POST form (method spoofing via `method`, CSRF added).
    // Without it, the root fires a `bmsui:confirm` event for your own JS.
    'action' => null,
    'method' => 'POST',
    // Trigger button classes.
    'triggerClass' => '',
    'tone' => 'danger',
])
<span {{ $attributes->class(['bmsui-confirm', 'bmsui-confirm--top' => $top]) }}>
    <button type="button" class="bmsui-btn {{ $triggerClass }}" data-bmsui-confirm-trigger aria-expanded="false" aria-haspopup="dialog">{{ $slot }}</button>
    <div class="bmsui-confirm__pop" role="dialog" aria-label="{{ $message }}" hidden>
        <p class="bmsui-confirm__msg">{{ $message }}</p>
        <div class="bmsui-confirm__actions">
            <button type="button" class="bmsui-btn" data-bmsui-confirm-cancel>{{ $cancelLabel }}</button>
            @if($action)
                <form method="POST" action="{{ $action }}">
                    @csrf
                    @if(strtoupper($method) !== 'POST')@method($method)@endif
                    <button type="submit" class="bmsui-btn {{ $tone === 'danger' ? 'bmsui-btn--danger' : '' }}" data-bmsui-confirm-yes>{{ $confirmLabel }}</button>
                </form>
            @else
                <button type="button" class="bmsui-btn {{ $tone === 'danger' ? 'bmsui-btn--danger' : '' }}" data-bmsui-confirm-yes>{{ $confirmLabel }}</button>
            @endif
        </div>
    </div>
</span>

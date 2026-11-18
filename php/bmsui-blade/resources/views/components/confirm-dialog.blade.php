@props([
    'id',
    'title' => __('Are you sure?'),
    'message' => null,
    'confirmLabel' => __('Delete'),
    'cancelLabel' => __('Cancel'),
    // danger | primary
    'tone' => 'danger',
    // With `action` the confirm button submits a POST form (method spoofing via `method`, CSRF added);
    // without it the dialog fires `bmsui:confirm` and closes with returnValue "confirm".
    'action' => null,
    'method' => 'POST',
])
{{-- Modal confirmation; for a one-off from JS use BMSUi.confirm(message, options) (returns a Promise). --}}
<x-bmsui::dialog :id="$id" :title="$title" size="sm" {{ $attributes->class('bmsui-dialog--confirm') }}>
    @if($message)<p class="bmsui-dialog__msg">{{ $message }}</p>@endif
    {{ $slot }}
    <x-slot:footer>
        <button type="button" class="bmsui-btn bmsui-btn--md" data-bmsui-dialog-close value="cancel">{{ $cancelLabel }}</button>
        @if($action)
            <form method="POST" action="{{ $action }}" class="bmsui-dialog__form">
                @csrf
                @if(strtoupper($method) !== 'POST')@method($method)@endif
                <button type="submit" class="bmsui-btn bmsui-btn--md bmsui-btn--{{ $tone }}">{{ $confirmLabel }}</button>
            </form>
        @else
            <button type="button" class="bmsui-btn bmsui-btn--md bmsui-btn--{{ $tone }}" data-bmsui-dialog-confirm>{{ $confirmLabel }}</button>
        @endif
    </x-slot:footer>
</x-bmsui::dialog>

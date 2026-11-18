@props([
    // Needed to open it: <button data-bmsui-dialog-open="#id"> or BMSUi.dialog.open('id').
    'id',
    'title' => null,
    'description' => null,
    // sm | md | lg | xl
    'size' => 'md',
    // Rendered open (showModal on load).
    'open' => false,
    // Loads the body from this URL (GET, HTML) each time it opens; the default slot is shown until then.
    'url' => null,
    // Backdrop clicks do not close it (Escape and the close button still do).
    'static' => false,
    'closeLabel' => __('Close'),
    'failedLabel' => __('Could not load the content.'),
])
{{-- Native <dialog> opened with showModal(): the page behind is inert, focus stays inside and goes back
     to the opener on close. Slots: default (body), `footer`. Buttons with data-bmsui-dialog-close close it
     (their value becomes the dialog's returnValue). Fires bmsui:open, bmsui:close ({detail: {returnValue}}),
     bmsui:loaded on the dialog. --}}
<dialog {{ $attributes->class(['bmsui-dialog', 'bmsui-dialog--'.$size]) }} id="{{ $id }}" data-bmsui-dialog
    @if($title) aria-labelledby="{{ $id }}-title" @endif @if($description) aria-describedby="{{ $id }}-desc" @endif
    @if($url) data-url="{{ $url }}" @endif @if($static) data-static @endif @if($open) data-open @endif data-l-failed="{{ $failedLabel }}">
    <div class="bmsui-dialog__box">
        @if($title || $description)
            <header class="bmsui-dialog__head">
                @if($title)<h2 class="bmsui-dialog__title" id="{{ $id }}-title">{{ $title }}</h2>@endif
                @if($description)<p class="bmsui-dialog__desc" id="{{ $id }}-desc">{{ $description }}</p>@endif
            </header>
        @endif
        <button type="button" class="bmsui-dialog__x" data-bmsui-dialog-close aria-label="{{ $closeLabel }}">&times;</button>
        <div class="bmsui-dialog__body" data-bmsui-dialog-body>{{ $slot }}</div>
        @isset($footer)<footer class="bmsui-dialog__foot">{{ $footer }}</footer>@endisset
    </div>
</dialog>

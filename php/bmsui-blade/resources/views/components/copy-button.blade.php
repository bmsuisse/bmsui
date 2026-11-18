@props([
    // The text put on the clipboard.
    'value',
    // Visible text; leave empty for an icon-only button.
    'label' => '',
    'ariaLabel' => __('Copy'),
    'copiedLabel' => __('Copied'),
    'failedLabel' => __('Copy failed'),
])
<button type="button"
    {{ $attributes->class(['bmsui-btn', 'bmsui-copy', 'bmsui-btn--icon' => $label === ''])->merge(['aria-label' => $label !== '' ? $label : $ariaLabel]) }}
    data-bmsui-copy="{{ $value }}" data-label="{{ $label }}" data-aria="{{ $ariaLabel }}"
    data-copied-label="{{ $copiedLabel }}" data-failed-label="{{ $failedLabel }}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.75 17.25v3.38c0 .62-.5 1.12-1.13 1.12H4.88a1.13 1.13 0 01-1.13-1.12V7.88c0-.62.5-1.13 1.13-1.13h2.37m8.5 10.5h3.37c.62 0 1.13-.5 1.13-1.13V4.88c0-.62-.5-1.13-1.13-1.13H9.38c-.62 0-1.13.5-1.13 1.13v1.87m7.5 10.5h-6.5c-.62 0-1.12-.5-1.12-1.13V6.75"/></svg>
    @if($label !== '')<span class="bmsui-copy__label">{{ $label }}</span>@endif
</button>

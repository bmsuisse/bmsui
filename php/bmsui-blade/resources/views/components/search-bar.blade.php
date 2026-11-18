@props([
    'name' => 'q',
    'value' => null,
    'placeholder' => __('Search'),
    // With `action` the bar is a GET <form>; without, just the field (handle input/submit yourself).
    'action' => null,
    'method' => 'GET',
    // Spinner instead of the magnifier while results load.
    'loading' => false,
    'clearLabel' => __('Clear search'),
    'label' => __('Search'),
])
{{-- Pill-shaped search field with clear button; slot `actions` for buttons inside the bar (filters).
     Clearing fires `bmsui:clear`; extra attributes go on the <input>. --}}
@php($tag = $action ? 'form' : 'div')
<{{ $tag }} class="bmsui-search {{ $loading ? 'is-loading' : '' }}" @if($action) action="{{ $action }}" method="{{ strtoupper($method) === 'POST' ? 'POST' : 'GET' }}" role="search" @endif data-bmsui-search>
    @if($action && strtoupper($method) === 'POST')@csrf @endif
    <span class="bmsui-search__icon" aria-hidden="true">
        @if($loading)<span class="bmsui-spinner"></span>@else<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z"/></svg>@endif
    </span>
    <input type="search" {{ $attributes->class('bmsui-search__input')->merge(['name' => $name, 'value' => $value, 'placeholder' => $placeholder, 'aria-label' => $label, 'autocomplete' => 'off']) }}>
    <button type="button" class="bmsui-search__clear" data-bmsui-search-clear aria-label="{{ $clearLabel }}" @if($value === null || $value === '') hidden @endif>&times;</button>
    @isset($actions)<span class="bmsui-search__actions">{{ $actions }}</span>@endisset
</{{ $tag }}>

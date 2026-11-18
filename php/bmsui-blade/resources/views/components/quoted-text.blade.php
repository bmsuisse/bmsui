@props([
    'open' => false,
    'showLabel' => __('Show quoted text'),
    'hideLabel' => __('Hide quoted text'),
])
@php($id = $attributes->get('id', 'bmsui-q-'.substr(md5(uniqid('', true)), 0, 8)))
<div {{ $attributes->except('id')->class(['bmsui-quote', 'is-open' => $open]) }}>
    <button type="button" class="bmsui-quote__toggle" data-bmsui-quote data-show="{{ $showLabel }}" data-hide="{{ $hideLabel }}"
        aria-expanded="{{ $open ? 'true' : 'false' }}" aria-controls="{{ $id }}" aria-label="{{ $open ? $hideLabel : $showLabel }}" title="{{ $open ? $hideLabel : $showLabel }}">&hellip;</button>
    <div class="bmsui-quote__body" id="{{ $id }}" @unless($open) hidden @endunless>{{ $slot }}</div>
</div>

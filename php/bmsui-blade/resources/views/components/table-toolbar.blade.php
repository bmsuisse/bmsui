@props([
    // Result count text, e.g. "128 entries" (already formatted/translated by the caller), or an int.
    'count' => null,
])
{{-- Bar above a table: default slot = search/filters (left), `actions` slot (right). --}}
<div {{ $attributes->class('bmsui-ttoolbar') }}>
    <div class="bmsui-ttoolbar__main">{{ $slot }}</div>
    @if($count !== null)<span class="bmsui-ttoolbar__count" aria-live="polite">{{ is_int($count) ? trans_choice(__('{0} No entries|{1} :count entry|[2,*] :count entries'), $count, ['count' => $count]) : $count }}</span>@endif
    @isset($actions)<div class="bmsui-ttoolbar__actions">{{ $actions }}</div>@endisset
</div>

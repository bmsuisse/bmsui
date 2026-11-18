@props([
    // Stable key; collapsed groups are remembered in the cookie `bmsui_nav_groups` (comma list).
    'id',
    'label',
    // null = read the cookie; bool = host decides.
    'collapsed' => null,
    'cookie' => 'bmsui_nav_groups',
])
@php
    $closed = $collapsed ?? in_array($id, explode(',', (string) ($_COOKIE[$cookie] ?? '')), true);
    $listId = 'bmsui-ng-'.preg_replace('/[^a-z0-9_-]/i', '-', $id);
@endphp
<div {{ $attributes->class(['bmsui-navgroup', 'is-closed' => $closed]) }} data-bmsui-navgroup="{{ $id }}" data-cookie="{{ $cookie }}">
    <button type="button" class="bmsui-navgroup__head" aria-expanded="{{ $closed ? 'false' : 'true' }}" aria-controls="{{ $listId }}" data-bmsui-navgroup-toggle>
        <span class="bmsui-navgroup__label">{{ $label }}</span>
        <svg class="bmsui-navgroup__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
    </button>
    <ul class="bmsui-navgroup__list" id="{{ $listId }}" @if($closed) hidden @endif>{{ $slot }}</ul>
</div>

@props(['id'])
{{-- One panel inside the tabs component; shown when its id is the active tab. --}}
@aware(['active' => null, 'tabs' => []])
@php($first = ((array) ($tabs[0] ?? []))['id'] ?? null)
@php($on = $id === ($active ?? $first))
<div {{ $attributes->class('bmsui-tabs__panel') }} role="tabpanel" data-tab-panel="{{ $id }}" tabindex="0" @unless($on) hidden @endunless>{{ $slot }}</div>

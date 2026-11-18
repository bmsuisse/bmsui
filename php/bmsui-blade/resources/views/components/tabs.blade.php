@props([
    // [['id' => 'general', 'label' => 'General', 'count' => 3, 'href' => null, 'disabled' => false]]
    // With href the tabs are links (server-rendered pages, aria-current); without, they switch the
    // tab-panel children in place and fire `bmsui:tab` ({detail: {id}}).
    'tabs' => [],
    'active' => null,
    'label' => null,
])
@php
    $tabs = array_map(fn ($t) => (array) $t, $tabs);
    $active = $active ?? ($tabs[0]['id'] ?? null);
    $links = collect($tabs)->contains(fn ($t) => !empty($t['href']));
    $base = 'bmsui-tabs-'.substr(md5(json_encode($tabs).uniqid('', true)), 0, 6);
@endphp
<div {{ $attributes->class('bmsui-tabs') }} data-bmsui-tabs data-base="{{ $base }}">
    @if($links)
        <nav class="bmsui-tabs__list" @if($label) aria-label="{{ $label }}" @endif>
            @foreach($tabs as $t)
                <a class="bmsui-tabs__tab {{ ($t['id'] ?? null) === $active ? 'is-active' : '' }}" @if(empty($t['disabled'])) href="{{ $t['href'] ?? '#' }}" @else aria-disabled="true" @endif @if(($t['id'] ?? null) === $active) aria-current="page" @endif>{{ $t['label'] }}@if(isset($t['count']))<span class="bmsui-tabs__count">{{ $t['count'] }}</span>@endif</a>
            @endforeach
        </nav>
    @else
        <div class="bmsui-tabs__list" role="tablist" @if($label) aria-label="{{ $label }}" @endif>
            @foreach($tabs as $t)
                @php($on = ($t['id'] ?? null) === $active)
                <button type="button" role="tab" class="bmsui-tabs__tab {{ $on ? 'is-active' : '' }}" id="{{ $base }}-{{ $t['id'] }}-tab" aria-controls="{{ $base }}-{{ $t['id'] }}" aria-selected="{{ $on ? 'true' : 'false' }}" tabindex="{{ $on ? '0' : '-1' }}" data-tab="{{ $t['id'] }}" @disabled(!empty($t['disabled']))>{{ $t['label'] }}@if(isset($t['count']))<span class="bmsui-tabs__count">{{ $t['count'] }}</span>@endif</button>
            @endforeach
        </div>
    @endif
    {{ $slot }}
</div>

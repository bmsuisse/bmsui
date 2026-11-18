@props([
    // [['id' => 'close', 'label' => 'Send & close', 'href' => null, 'disabled' => false, 'danger' => false], ...]
    // Without href an item is a button: choosing it fires `bmsui:select` ({detail: {id}}) on the root.
    'items' => [],
    // default | outline | secondary
    'variant' => 'default',
    'type' => 'button',
    'name' => null,
    'value' => null,
    'loading' => false,
    'disabled' => false,
    'menuLabel' => __('More actions'),
    // Opens above the button.
    'top' => false,
    // Menu aligned to the right edge.
    'end' => true,
])
<span {{ $attributes->class(['bmsui-split', 'bmsui-split--'.$variant, 'bmsui-split--top' => $top]) }}>
    <button type="{{ $type }}" class="bmsui-btn bmsui-split__main" @if($name) name="{{ $name }}" value="{{ $value }}" @endif @disabled($disabled || $loading) @if($loading) aria-busy="true" @endif>{{ $slot }}</button>
    <button type="button" class="bmsui-btn bmsui-split__toggle" data-bmsui-split-toggle aria-haspopup="menu" aria-expanded="false" aria-label="{{ $menuLabel }}" @disabled($disabled || $loading)>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
    </button>
    <div class="bmsui-split__menu {{ $end ? 'bmsui-split__menu--end' : '' }}" role="menu" aria-label="{{ $menuLabel }}" hidden>
        @foreach($items as $item)
            @php($item = (array) $item)
            @php($cls = 'bmsui-split__item'.(!empty($item['danger']) ? ' bmsui-split__item--danger' : ''))
            @if(!empty($item['href']))
                <a role="menuitem" class="{{ $cls }}" href="{{ $item['href'] }}" tabindex="-1">{{ $item['label'] }}</a>
            @else
                <button type="button" role="menuitem" class="{{ $cls }}" tabindex="-1" data-bmsui-split-item="{{ $item['id'] ?? '' }}" @disabled(!empty($item['disabled']))>{{ $item['label'] }}</button>
            @endif
        @endforeach
    </div>
</span>

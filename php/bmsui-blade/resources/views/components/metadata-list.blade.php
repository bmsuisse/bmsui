@props([
    // [['label' => 'Customer no.', 'value' => '10412', 'copy' => true, 'href' => null]]; empty values show "—".
    // A value may also be an HtmlString (e.g. a chip rendered by the caller).
    'items' => [],
    // vertical (label above value) | horizontal (label column)
    'layout' => 'horizontal',
    // 1-3 columns on wide screens.
    'columns' => 1,
    'copyLabel' => __('Copy'),
    'emptyLabel' => __('Not set'),
])
<dl {{ $attributes->class(['bmsui-meta', 'bmsui-meta--'.$layout, 'bmsui-meta--cols-'.(int) $columns]) }}>
    @foreach($items as $item)
        @php($item = (array) $item)
        @php($v = $item['value'] ?? null)
        @php($empty = $v === null || $v === '' || $v === [])
        <div class="bmsui-meta__row">
            <dt class="bmsui-meta__label">{{ $item['label'] ?? '' }}</dt>
            <dd class="bmsui-meta__value">
                @if($empty)<span class="bmsui-meta__empty" title="{{ $emptyLabel }}">&mdash;<span class="bmsui-sr"> {{ $emptyLabel }}</span></span>
                @elseif(!empty($item['href']))<a href="{{ $item['href'] }}">{{ $v }}</a>
                @else{{ $v }}@endif
                @if(!$empty && !empty($item['copy']))
                    <x-bmsui::copy-button :value="(string) $v" :aria-label="$copyLabel.': '.($item['label'] ?? '')" class="bmsui-meta__copy" />
                @endif
            </dd>
        </div>
    @endforeach
    {{ $slot }}
</dl>

@props([
    // [['label' => 'Mailboxes', 'href' => '/mailboxes'], ['label' => 'Sales']]; the last item is the current page.
    'items' => [],
    // Longer trails fold the middle items into a "…" menu.
    'maxItems' => 4,
    'label' => __('Breadcrumbs'),
    'moreLabel' => __('Show more'),
])
@php
    $items = array_values(array_map(fn ($i) => (array) $i, $items));
    $n = count($items);
    $fold = $maxItems >= 3 && $n > $maxItems;
    $hidden = $fold ? array_slice($items, 1, $n - ($maxItems - 1)) : [];
    $shown = $fold ? array_merge([$items[0], ['__more' => true]], array_slice($items, $n - ($maxItems - 2))) : $items;
@endphp
<nav {{ $attributes->class('bmsui-crumbs') }} aria-label="{{ $label }}">
    <ol class="bmsui-crumbs__list">
        @foreach($shown as $i => $item)
            <li class="bmsui-crumbs__item">
                @if($i > 0)<svg class="bmsui-crumbs__sep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>@endif
                @if(!empty($item['__more']))
                    <x-bmsui::dropdown-menu :label="$moreLabel" variant="ghost" class="bmsui-crumbs__more" :items="array_map(fn ($h) => ['label' => $h['label'] ?? '', 'href' => $h['href'] ?? null, 'id' => $h['label'] ?? ''], $hidden)" />
                @elseif($loop->last)
                    <span class="bmsui-crumbs__current" aria-current="page">{{ $item['label'] ?? '' }}</span>
                @elseif(!empty($item['href']))
                    <a class="bmsui-crumbs__link" href="{{ $item['href'] }}">{{ $item['label'] ?? '' }}</a>
                @else
                    <span class="bmsui-crumbs__text">{{ $item['label'] ?? '' }}</span>
                @endif
            </li>
        @endforeach
    </ol>
</nav>

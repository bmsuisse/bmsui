@props([
    // list (<ul>/<li>) | table (<table>/<tr>/<td>, same look; keeps `tr`/`td` selectors and hooks working).
    // Rows pick it up from the list (Blade "aware"), so a row needs no prop of its own.
    'as' => 'list',
    // Shows a "select all" checkbox in the header (true/false = checked). It toggles every
    // .bmsui-conv__check of this list and fires `bmsui:select-all` ({detail: {checked}}).
    'selectAll' => null,
    // Extra attributes for the select-all checkbox, e.g. ['class' => 'toggle-all'].
    'selectAllAttributes' => [],
    // Sort columns: [['key' => 'date', 'label' => 'Date', 'dir' => 'desc'|'asc'|null, 'href' => '?sort=date']].
    // Without href a column is a button that fires `bmsui:sort` ({detail: {key, dir}}, dir = the next direction).
    'sorts' => [],
    // Total for the footer ("128 conversations"); null = no count.
    'count' => null,
    // Table mode: how many columns the header/footer cell spans.
    'columns' => 7,
    'labels' => [],
])
@php
    $l = array_merge(['selectAll' => __('Select all conversations'), 'sortBy' => __('Sort by')], $labels);
    $isTable = $as === 'table';
    $bag = fn ($a) => new \Illuminate\View\ComponentAttributeBag((array) $a);
    $hasHead = $selectAll !== null || $sorts || isset($header);
    $hasFoot = $count !== null || isset($footer) || isset($pager);
@endphp
@if($isTable)
<table {{ $attributes->class(['bmsui-convs', 'bmsui-convs--table']) }}>
    @if($hasHead)<thead><tr class="bmsui-convs__head"><th colspan="{{ $columns }}"><div class="bmsui-convs__bar">@endif
@elseif($hasHead || $hasFoot)
<div class="bmsui-convs-wrap">
    @if($hasHead)<div class="bmsui-convs__head bmsui-convs__bar">@endif
@endif
@if($hasHead)
    @if($selectAll !== null)
        <input type="checkbox" {{ $bag($selectAllAttributes)->class('bmsui-convs__all')->merge(['aria-label' => $l['selectAll']]) }} data-bmsui-select-all @checked($selectAll)>
    @endif
    @if($sorts)
        <span class="bmsui-convs__sorts" role="group" aria-label="{{ $l['sortBy'] }}">
            @foreach($sorts as $s)
                @php($s = (array) $s)
                @php($dir = $s['dir'] ?? null)
                @php($cls = 'bmsui-convs__sort'.($dir ? ' is-active is-'.$dir : ''))
                @if(!empty($s['href']))
                    <a class="{{ $cls }}" href="{{ $s['href'] }}" @if($dir) aria-current="true" @endif>{{ $s['label'] }}<span class="bmsui-convs__arrow" aria-hidden="true"></span></a>
                @else
                    <button type="button" class="{{ $cls }}" data-bmsui-sort="{{ $s['key'] ?? '' }}" data-dir="{{ $dir }}" aria-pressed="{{ $dir ? 'true' : 'false' }}">{{ $s['label'] }}<span class="bmsui-convs__arrow" aria-hidden="true"></span></button>
                @endif
            @endforeach
        </span>
    @endif
    @isset($header)<span class="bmsui-convs__extra">{{ $header }}</span>@endisset
    @if($isTable)</div></th></tr></thead>@else</div>@endif
@endif
@if($isTable)
    <tbody>{{ $slot }}</tbody>
@else
    <ul {{ $attributes->class('bmsui-convs') }}>{{ $slot }}</ul>
@endif
@if($hasFoot)
    @if($isTable)<tfoot><tr class="bmsui-convs__foot"><td colspan="{{ $columns }}"><div class="bmsui-convs__bar">@else<div class="bmsui-convs__foot bmsui-convs__bar">@endif
    @if($count !== null)<span class="bmsui-convs__count">{{ trans_choice('{0} No conversations|{1} :count conversation|[2,*] :count conversations', (int) $count, ['count' => $count]) }}</span>@endif
    @isset($footer)<span class="bmsui-convs__extra">{{ $footer }}</span>@endisset
    @isset($pager)<span class="bmsui-convs__pager">{{ $pager }}</span>@endisset
    @if($isTable)</div></td></tr></tfoot>@else</div>@endif
@endif
@if($isTable)
</table>
@elseif($hasHead || $hasFoot)
</div>
@endif

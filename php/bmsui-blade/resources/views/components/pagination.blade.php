@props([
    'page' => 1,
    'pages' => 1,
    // Link pattern with {page}, e.g. "?page={page}" or route('x', ['page' => '{page}']).
    // Without it the pages are buttons that fire `bmsui:page` ({detail: {page}}) for ajax loading.
    'url' => null,
    // Page numbers around the current one (constant width: first, last, ellipses).
    'siblings' => 1,
    'labels' => [],
])
@php
    $l = array_merge(['nav' => __('Page navigation'), 'prev' => __('Previous page'), 'next' => __('Next page'), 'page' => __('Page :page'), 'of' => __(':page of :pages')], $labels);
    $page = max(1, min((int) $page, max(1, (int) $pages)));
    $pages = max(1, (int) $pages);
    $s = max(0, (int) $siblings);
    // Same rules as @bmsuisse/ui getPageRange: always 2*s+5 slots (or fewer pages).
    $total = 2 * $s + 5;
    if ($pages <= $total) {
        $range = range(1, $pages);
    } else {
        $left = max(2, $page - $s);
        $right = min($pages - 1, $page + $s);
        $showL = $left > 3;
        $showR = $right < $pages - 2;
        if (!$showL && $showR) { $range = array_merge(range(1, 3 + 2 * $s), ['…r', $pages]); }
        elseif ($showL && !$showR) { $range = array_merge([1, '…l'], range($pages - (2 + 2 * $s), $pages)); }
        else { $range = array_merge([1, '…l'], range($left, $right), ['…r', $pages]); }
    }
    $href = fn ($p) => $url ? str_replace(['{page}', '%7Bpage%7D'], $p, $url) : null;
@endphp
@if($pages > 1)
<nav {{ $attributes->class('bmsui-pager') }} aria-label="{{ $l['nav'] }}" data-bmsui-pager>
    @php($prev = $page > 1 ? $page - 1 : null)
    @php($next = $page < $pages ? $page + 1 : null)
    @if($url && $prev)<a class="bmsui-pager__btn" href="{{ $href($prev) }}" rel="prev" aria-label="{{ $l['prev'] }}">@else<button type="button" class="bmsui-pager__btn" @if($prev) data-page="{{ $prev }}" @else disabled @endif aria-label="{{ $l['prev'] }}">@endif<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>@if($url && $prev)</a>@else</button>@endif
    <span class="bmsui-pager__compact" aria-hidden="true">{{ strtr($l['of'], [':pages' => $pages, ':page' => $page]) }}</span>
    <ul class="bmsui-pager__list">
        @foreach($range as $p)
            @if(is_string($p))
                <li class="bmsui-pager__gap" aria-hidden="true">&hellip;</li>
            @else
                <li>
                    @if($p === $page)
                        <span class="bmsui-pager__btn is-current" aria-current="page" aria-label="{{ str_replace(':page', $p, $l['page']) }}">{{ $p }}</span>
                    @elseif($url)
                        <a class="bmsui-pager__btn" href="{{ $href($p) }}" aria-label="{{ str_replace(':page', $p, $l['page']) }}">{{ $p }}</a>
                    @else
                        <button type="button" class="bmsui-pager__btn" data-page="{{ $p }}" aria-label="{{ str_replace(':page', $p, $l['page']) }}">{{ $p }}</button>
                    @endif
                </li>
            @endif
        @endforeach
    </ul>
    @if($url && $next)<a class="bmsui-pager__btn" href="{{ $href($next) }}" rel="next" aria-label="{{ $l['next'] }}">@else<button type="button" class="bmsui-pager__btn" @if($next) data-page="{{ $next }}" @else disabled @endif aria-label="{{ $l['next'] }}">@endif<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>@if($url && $next)</a>@else</button>@endif
</nav>
@endif

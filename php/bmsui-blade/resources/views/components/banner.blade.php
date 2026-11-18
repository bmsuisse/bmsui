@props([
    // info | success | warning | danger
    'tone' => 'info',
    'title' => null,
    'dismissible' => false,
    'dismissLabel' => __('Close'),
])
@php
    $paths = [
        'info' => 'M11.25 11.25l.04-.02a.75.75 0 011.06.85l-.7 2.8a.75.75 0 001.06.85l.04-.02M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.01v.01H12V8.25z',
        'success' => 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        'warning' => 'M12 9v3.75m-9.3 3.37c-.87 1.5.2 3.38 1.93 3.38h14.74c1.73 0 2.8-1.88 1.93-3.38L13.93 3.75c-.87-1.5-3-1.5-3.86 0L2.7 16.12zM12 15.75h.01v.01H12v-.01z',
        'danger' => 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.01v.01H12v-.01z',
    ];
@endphp
<div {{ $attributes->class(['bmsui-banner', 'bmsui-banner--'.$tone]) }} role="{{ in_array($tone, ['warning', 'danger']) ? 'alert' : 'status' }}">
    <svg class="bmsui-banner__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{{ $paths[$tone] ?? $paths['info'] }}"/></svg>
    <div class="bmsui-banner__body">
        @if($title)<strong class="bmsui-banner__title">{{ $title }}</strong>@endif
        {{ $slot }}
    </div>
    @if($dismissible)
        <button type="button" class="bmsui-banner__x" data-bmsui-dismiss aria-label="{{ $dismissLabel }}">&times;</button>
    @endif
</div>

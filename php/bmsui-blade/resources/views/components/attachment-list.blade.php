@props([
    // [['id' => 1, 'name' => 'Offerte.pdf', 'size' => 12345, 'mimeType' => 'application/pdf', 'href' => '/x', 'thumbnailUrl' => '/t.png'], ...]
    'attachments' => [],
    // list | chips
    'layout' => 'list',
    // Compose mode: an x per item (button[data-bmsui-attachment-remove], the host handles the click).
    'removable' => false,
    'locale' => 'de-CH',
    'headingLabel' => null,
    'downloadLabel' => __('Download'),
    'removeLabel' => __('Remove'),
])
@php
    $items = collect($attachments)->map(fn ($a) => (array) $a)->values();
    $n = $items->count();
    $heading = $headingLabel ?? trans_choice('{1} :count attachment|[2,*] :count attachments', $n, ['count' => $n]);
    $kindOf = function (?string $mime, string $name): string {
        $m = strtolower((string) $mime);
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        return match (true) {
            str_starts_with($m, 'image/') => 'image',
            $m === 'application/pdf' || $ext === 'pdf' => 'pdf',
            str_contains($m, 'spreadsheet') || str_contains($m, 'excel') || in_array($ext, ['xls', 'xlsx', 'csv', 'ods'], true) => 'sheet',
            str_contains($m, 'word') || str_contains($m, 'document') || in_array($ext, ['doc', 'docx', 'odt', 'rtf', 'txt'], true) => 'doc',
            str_contains($m, 'zip') || str_contains($m, 'compressed') || in_array($ext, ['zip', 'rar', '7z', 'gz', 'tar'], true) => 'archive',
            default => 'file',
        };
    };
    $file = 'M19.5 14.25v-2.63a3.38 3.38 0 00-3.38-3.37h-1.5a1.13 1.13 0 01-1.12-1.13v-1.5a3.38 3.38 0 00-3.38-3.37H8.25m2.25 0H5.63c-.62 0-1.13.5-1.13 1.13v17.25c0 .62.5 1.12 1.13 1.12h12.75c.62 0 1.12-.5 1.12-1.12V11.25a9 9 0 00-9-9z';
    $paths = [
        'image' => 'M2.25 15.75l5.16-5.16a2.25 2.25 0 013.18 0l5.16 5.16m-1.5-1.5l1.41-1.41a2.25 2.25 0 013.18 0l2.9 2.91M3.75 21h16.5a1.5 1.5 0 001.5-1.5V4.5a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v15a1.5 1.5 0 001.5 1.5zM13.5 8.25h.01v.01h-.01V8.25z',
        'pdf' => $file.'M9 15h6M9 18h4',
        'sheet' => 'M3.38 4.5h17.25M3.38 9.75h17.25M3.38 15h17.25M8.25 4.5v15m7.5-15v15M4.5 19.5h15a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5h-15A1.5 1.5 0 003 6v12a1.5 1.5 0 001.5 1.5z',
        'doc' => $file.'M8.25 15h7.5M8.25 18H12',
        'archive' => 'M20.25 7.5l-.63 10.88a2.25 2.25 0 01-2.24 2.12H6.62a2.25 2.25 0 01-2.24-2.12L3.75 7.5m6 4.13h4.5M3.38 7.5h17.25c.62 0 1.12-.5 1.12-1.13V4.88c0-.62-.5-1.13-1.12-1.13H3.38c-.62 0-1.13.5-1.13 1.13v1.5c0 .62.5 1.12 1.13 1.12z',
        'file' => $file,
    ];
@endphp
@if($n)
<div {{ $attributes->class(['bmsui-att', 'bmsui-att--chips' => $layout === 'chips']) }}>
    <p class="bmsui-att__head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18.38 8.69l-7.7 7.7a2.62 2.62 0 01-3.71-3.71l7.7-7.7a1.75 1.75 0 112.47 2.47l-7.7 7.7a.88.88 0 01-1.24-1.24l7.1-7.1"/></svg>
        {{ $heading }}
    </p>
    <ul class="bmsui-att__list">
        @foreach($items as $a)
            @php($name = (string) ($a['name'] ?? ''))
            @php($kind = $kindOf($a['mimeType'] ?? null, $name))
            <li class="bmsui-att__item" data-id="{{ $a['id'] ?? '' }}">
                @if(!empty($a['thumbnailUrl']))
                    <img class="bmsui-att__thumb" src="{{ $a['thumbnailUrl'] }}" alt="" loading="lazy">
                @else
                    <svg class="bmsui-att__icon bmsui-att__icon--{{ $kind }}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{{ $paths[$kind] }}"/></svg>
                @endif
                @if(!empty($a['href']))
                    <a class="bmsui-att__name" href="{{ $a['href'] }}" download title="{{ $downloadLabel }}: {{ $name }}">{{ $name }}</a>
                @else
                    <span class="bmsui-att__name">{{ $name }}</span>
                @endif
                @if(isset($a['size']))<span class="bmsui-att__size">{{ \BMSuisse\BMSUi\BMSUi::formatFileSize($a['size'], $locale) }}</span>@endif
                @if($removable)
                    <button type="button" class="bmsui-att__x" data-bmsui-attachment-remove aria-label="{{ $removeLabel }}: {{ $name }}">&times;</button>
                @endif
            </li>
        @endforeach
    </ul>
</div>
@endif

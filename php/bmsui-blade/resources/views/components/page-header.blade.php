@props([
    'title',
    'description' => null,
    // Back link (arrow before the title).
    'backHref' => null,
    'backLabel' => __('Back'),
    // Breadcrumb items (see the breadcrumbs component).
    'breadcrumbs' => [],
    // Line under the header.
    'divider' => false,
    // h1 | h2
    'level' => 'h1',
])
{{-- Slots: `badge` (next to the title), `after-title` (under the title, e.g. FreeScout's
     conversation.after_subject_block), `actions` (right; e.g. conversation.action_buttons),
     `tabs` (under the header), default (extra content under the description). --}}
<header {{ $attributes->class(['bmsui-phead', 'bmsui-phead--divider' => $divider]) }}>
    @if($breadcrumbs)<x-bmsui::breadcrumbs :items="$breadcrumbs" class="bmsui-phead__crumbs" />@endif
    <div class="bmsui-phead__row">
        @if($backHref)
            <a class="bmsui-btn bmsui-btn--ghost bmsui-btn--square bmsui-phead__back" href="{{ $backHref }}" aria-label="{{ $backLabel }}" data-testid="page-header-back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg></a>
        @endif
        <div class="bmsui-phead__heading">
            <div class="bmsui-phead__titleline">
                <{{ $level === 'h2' ? 'h2' : 'h1' }} class="bmsui-phead__title">{{ $title }}</{{ $level === 'h2' ? 'h2' : 'h1' }}>
                @isset($badge)<span class="bmsui-phead__badge">{{ $badge }}</span>@endisset
            </div>
            @if($description)<p class="bmsui-phead__desc">{{ $description }}</p>@endif
            @isset($afterTitle)<div class="bmsui-phead__after">{{ $afterTitle }}</div>@endisset
            {{ $slot }}
        </div>
        @isset($actions)<div class="bmsui-phead__actions">{{ $actions }}</div>@endisset
    </div>
    @isset($tabs)<div class="bmsui-phead__tabs">{{ $tabs }}</div>@endisset
</header>

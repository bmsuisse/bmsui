@props([
    'title' => null,
    'description' => null,
    // Link for the whole title.
    'href' => null,
    // No inner padding (for a table or list that runs edge to edge).
    'flush' => false,
])
{{-- Slots: default (body), `actions` (top right), `footer`, `media` (above the header). --}}
<section {{ $attributes->class(['bmsui-card', 'bmsui-card--flush' => $flush]) }}>
    @isset($media)<div class="bmsui-card__media">{{ $media }}</div>@endisset
    @if($title || $description || isset($actions))
        <header class="bmsui-card__head">
            <div class="bmsui-card__heading">
                @if($title)<h3 class="bmsui-card__title">@if($href)<a href="{{ $href }}">{{ $title }}</a>@else{{ $title }}@endif</h3>@endif
                @if($description)<p class="bmsui-card__desc">{{ $description }}</p>@endif
            </div>
            @isset($actions)<div class="bmsui-card__actions">{{ $actions }}</div>@endisset
        </header>
    @endif
    @unless($slot->isEmpty())<div class="bmsui-card__body">{{ $slot }}</div>@endunless
    @isset($footer)<footer class="bmsui-card__foot">{{ $footer }}</footer>@endisset
</section>

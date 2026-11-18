@props([
    'title' => null,
])
{{-- Frame around a list: slots `toolbar` (a table-toolbar), default (the table), `footer` (count, pagination). --}}
<section {{ $attributes->class('bmsui-tshell') }} data-table-shell>
    @if($title)<h3 class="bmsui-tshell__title">{{ $title }}</h3>@endif
    @isset($toolbar){{ $toolbar }}@endisset
    <div class="bmsui-tshell__body">{{ $slot }}</div>
    @isset($footer)<div class="bmsui-tshell__foot">{{ $footer }}</div>@endisset
</section>

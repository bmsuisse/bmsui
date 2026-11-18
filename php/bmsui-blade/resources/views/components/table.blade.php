@props([
    'striped' => false,
    // Row hover tint (for clickable rows).
    'hover' => true,
    // Tighter cells for admin lists and logs.
    'dense' => false,
    // Accessible caption (visually hidden unless captionVisible).
    'caption' => null,
    'captionVisible' => false,
])
{{-- Plain <table> styled like the grid; put your own <thead>/<tbody>/<tfoot> in the slot.
     Scrolls sideways inside its own box on narrow screens instead of widening the page. --}}
<div class="bmsui-table-wrap">
    <table {{ $attributes->class(['bmsui-table', 'bmsui-table--striped' => $striped, 'bmsui-table--hover' => $hover, 'bmsui-table--dense' => $dense]) }}>
        @if($caption)<caption class="{{ $captionVisible ? 'bmsui-table__caption' : 'bmsui-sr' }}">{{ $caption }}</caption>@endif
        {{ $slot }}
    </table>
</div>

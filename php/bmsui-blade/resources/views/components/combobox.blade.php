@props([
    // Field name; single mode posts one value, multiple mode posts name[] per chip.
    'name',
    // [['value' => '1', 'label' => 'Keller AG', 'description' => 'Zürich']] or ['1' => 'Keller AG'].
    // Without `searchUrl` these are filtered in the browser; with it they are just the initial list.
    'options' => [],
    // Selected value(s). Labels come from `options`, or pass `selected` for values that are not in the list.
    'value' => null,
    // [['value' => '7', 'label' => 'Muster AG']]: labels for selected values (e.g. from an ajax source).
    'selected' => [],
    'multiple' => false,
    // GET endpoint for server search; the term is appended as `q` (or replaces `{q}` in the URL).
    // Answers: [{value, label, description?}] or select2's {results: [{id, text}]}.
    'searchUrl' => null,
    'minChars' => 1,
    // Multiple mode: Enter on a term that is not in the list adds it as a new chip (tags).
    'creatable' => false,
    'placeholder' => null,
    'id' => null,
    'disabled' => false,
    'invalid' => false,
    'maxItems' => null,
    'labels' => [],
])
{{-- Fires `bmsui:change` ({detail: {value}}) on the root after a pick or removal. --}}
@aware(['for' => null, 'help' => null, 'error' => null])
@php
    $l = array_merge([
        'noResults' => __('No results'), 'loading' => __('Loading…'), 'failed' => __('Search failed'),
        'remove' => __('Remove'), 'typeToSearch' => __('Type to search'), 'clear' => __('Clear selection'),
    ], $labels);
    $norm = function ($opts) {
        $out = [];
        foreach ((array) $opts as $k => $o) {
            $o = is_array($o) ? $o : ['value' => $k, 'label' => $o];
            $o['value'] = (string) ($o['value'] ?? $o['id'] ?? $k);
            $o['label'] = (string) ($o['label'] ?? $o['text'] ?? $o['value']);
            $out[$o['value']] = $o;
        }
        return $out;
    };
    $opts = $norm($options);
    $known = $opts + $norm($selected);
    $values = array_values(array_filter(array_map('strval', (array) $value), fn ($v) => $v !== ''));
    $id = $id ?? $for ?? 'bmsui-cb-'.substr(md5($name.uniqid('', true)), 0, 8);
    $mine = $for !== null && $id === $for;
    $bad = $invalid || ($mine && $error);
    $desc = $mine ? trim(($help ? $for.'-help ' : '').($error ? $for.'-error' : '')) : '';
    $first = $values[0] ?? null;
@endphp
<div {{ $attributes->class(['bmsui-combo', 'bmsui-combo--multiple' => $multiple, 'is-invalid' => $bad, 'is-disabled' => $disabled]) }}
    data-bmsui-combo data-name="{{ $name }}" @if($multiple) data-multiple @endif @if($creatable) data-creatable @endif
    @if($searchUrl) data-url="{{ $searchUrl }}" @endif data-min="{{ (int) $minChars }}" data-max="{{ $maxItems }}"
    data-l-empty="{{ $l['noResults'] }}" data-l-loading="{{ $l['loading'] }}" data-l-failed="{{ $l['failed'] }}" data-l-remove="{{ $l['remove'] }}" data-l-type="{{ $l['typeToSearch'] }}">
    <div class="bmsui-combo__field">
        @if($multiple)
            @foreach($values as $v)
                <span class="bmsui-chip" data-value="{{ $v }}">
                    <span class="bmsui-chip__text">{{ $known[$v]['label'] ?? $v }}</span>
                    <input type="hidden" name="{{ $name }}[]" value="{{ $v }}">
                    @unless($disabled)<button type="button" class="bmsui-chip__x" data-bmsui-combo-remove aria-label="{{ $l['remove'] }}: {{ $known[$v]['label'] ?? $v }}">&times;</button>@endunless
                </span>
            @endforeach
        @else
            <input type="hidden" name="{{ $name }}" value="{{ $first }}" data-bmsui-combo-value @disabled($disabled)>
        @endif
        <input type="text" class="bmsui-combo__input" id="{{ $id }}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="{{ $id }}-list"
            autocomplete="off" spellcheck="false" placeholder="{{ $placeholder }}" @disabled($disabled)
            @unless($multiple) value="{{ $first !== null ? ($known[$first]['label'] ?? $first) : '' }}" data-label="{{ $first !== null ? ($known[$first]['label'] ?? $first) : '' }}" @endunless
            @if($bad) aria-invalid="true" @endif @if($desc) aria-describedby="{{ $desc }}" @endif>
        @if(!$multiple && !$disabled)
            <button type="button" class="bmsui-combo__clear" data-bmsui-combo-clear aria-label="{{ $l['clear'] }}" @if($first === null) hidden @endif>&times;</button>
        @endif
        <svg class="bmsui-combo__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
    </div>
    <ul class="bmsui-combo__list" id="{{ $id }}-list" role="listbox" @if($multiple) aria-multiselectable="true" @endif hidden>
        @foreach($opts as $o)
            <li class="bmsui-combo__opt" role="option" id="{{ $id }}-o{{ $loop->index }}" data-value="{{ $o['value'] }}" data-label="{{ $o['label'] }}" aria-selected="{{ in_array($o['value'], $values, true) ? 'true' : 'false' }}" @if(!empty($o['disabled'])) aria-disabled="true" @endif>
                <span class="bmsui-combo__label">{{ $o['label'] }}</span>
                @if(!empty($o['description']))<span class="bmsui-combo__desc">{{ $o['description'] }}</span>@endif
            </li>
        @endforeach
    </ul>
    <span class="bmsui-sr" aria-live="polite" data-bmsui-combo-status></span>
</div>

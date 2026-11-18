@props([
    // ['ch' => 'Schweiz', 'de' => 'Deutschland'] or [['value' => 'ch', 'label' => 'Schweiz', 'disabled' => false]];
    // a nested array under a string key becomes an <optgroup>: ['Europa' => ['ch' => 'Schweiz']].
    'options' => [],
    // Selected value (or values with `multiple`).
    'value' => null,
    // Empty first option.
    'placeholder' => null,
    'invalid' => false,
    'size' => 'md',
])
{{-- Native <select> styled like the inputs; extra <option>s can go in the default slot. --}}
@aware(['for' => null, 'help' => null, 'error' => null])
@php
    $id = $attributes->get('id') ?? $for;
    $mine = $for !== null && $id === $for;
    $bad = $invalid || ($mine && $error);
    $desc = $mine ? trim(($help ? $for.'-help ' : '').($error ? $for.'-error' : '')) : '';
    $selected = array_map('strval', (array) $value);
    $norm = function ($opts) {
        $out = [];
        foreach ($opts as $k => $o) {
            $out[] = is_array($o) && array_key_exists('value', $o) ? $o + ['label' => $o['value']] : ['value' => $k, 'label' => $o];
        }
        return $out;
    };
@endphp
<span class="bmsui-select {{ $size === 'sm' ? 'bmsui-select--sm' : '' }}">
    <select {{ $attributes->class('bmsui-input')->merge(array_filter(['id' => $id, 'aria-describedby' => $desc ?: null, 'aria-invalid' => $bad ? 'true' : null])) }}>
        @if($placeholder !== null)<option value="">{{ $placeholder }}</option>@endif
        @foreach($options as $key => $opt)
            @if(is_array($opt) && !array_key_exists('value', $opt))
                <optgroup label="{{ $key }}">
                    @foreach($norm($opt) as $o)<option value="{{ $o['value'] }}" @selected(in_array((string) $o['value'], $selected, true)) @disabled(!empty($o['disabled']))>{{ $o['label'] }}</option>@endforeach
                </optgroup>
            @else
                @foreach($norm([$key => $opt]) as $o)<option value="{{ $o['value'] }}" @selected(in_array((string) $o['value'], $selected, true)) @disabled(!empty($o['disabled']))>{{ $o['label'] }}</option>@endforeach
            @endif
        @endforeach
        {{ $slot }}
    </select>
    @unless($attributes->has('multiple'))<svg class="bmsui-select__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>@endunless
</span>

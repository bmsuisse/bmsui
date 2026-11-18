@props([
    'name',
    // ['open' => 'Offen'] or [['value' => 'open', 'label' => 'Offen', 'description' => '...', 'disabled' => false]]
    'options' => [],
    'value' => null,
    // Group label (legend).
    'label' => null,
    // vertical | horizontal
    'orientation' => 'vertical',
    'disabled' => false,
    'required' => false,
])
<fieldset {{ $attributes->class(['bmsui-radios', 'bmsui-radios--horizontal' => $orientation === 'horizontal']) }} @disabled($disabled)>
    @if($label)<legend class="bmsui-label">{{ $label }}</legend>@endif
    <div class="bmsui-radios__list">
        @foreach($options as $k => $o)
            @php($o = is_array($o) ? $o + ['value' => $k] : ['value' => $k, 'label' => $o])
            <label class="bmsui-check {{ !empty($o['disabled']) ? 'is-disabled' : '' }}">
                <input type="radio" class="bmsui-radio__input" name="{{ $name }}" value="{{ $o['value'] }}" @checked((string) $value === (string) $o['value']) @disabled(!empty($o['disabled'])) @required($required)>
                <span class="bmsui-check__text">
                    <span class="bmsui-check__label">{{ $o['label'] ?? $o['value'] }}</span>
                    @if(!empty($o['description']))<span class="bmsui-check__desc">{{ $o['description'] }}</span>@endif
                </span>
            </label>
        @endforeach
    </div>
</fieldset>

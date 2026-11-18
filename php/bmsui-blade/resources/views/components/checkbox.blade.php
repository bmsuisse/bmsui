@props([
    'label' => null,
    'description' => null,
    'checked' => false,
    // Shows the dash state (set via JS as the native indeterminate property).
    'indeterminate' => false,
    'value' => '1',
])
{{-- Native checkbox (same name/value/form behaviour); attributes go on the <input>. Default slot = rich label. --}}
<label class="bmsui-check {{ $attributes->get('disabled') ? 'is-disabled' : '' }}">
    <input type="checkbox" value="{{ $value }}" {{ $attributes->class('bmsui-check__input') }} @checked($checked) @if($indeterminate) data-bmsui-indeterminate @endif>
    @if($label || !$slot->isEmpty() || $description)
        <span class="bmsui-check__text">
            <span class="bmsui-check__label">{{ $label }}{{ $slot }}</span>
            @if($description)<span class="bmsui-check__desc">{{ $description }}</span>@endif
        </span>
    @endif
</label>

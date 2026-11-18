@props([
    'label' => null,
    'description' => null,
    'checked' => false,
    'value' => '1',
])
{{-- Native checkbox with role="switch"; posts like a checkbox. Attributes go on the <input>. --}}
<label class="bmsui-check bmsui-switch {{ $attributes->get('disabled') ? 'is-disabled' : '' }}">
    <input type="checkbox" role="switch" value="{{ $value }}" {{ $attributes->class('bmsui-switch__input') }} @checked($checked)>
    <span class="bmsui-switch__track" aria-hidden="true"><span class="bmsui-switch__thumb"></span></span>
    @if($label || !$slot->isEmpty() || $description)
        <span class="bmsui-check__text">
            <span class="bmsui-check__label">{{ $label }}{{ $slot }}</span>
            @if($description)<span class="bmsui-check__desc">{{ $description }}</span>@endif
        </span>
    @endif
</label>

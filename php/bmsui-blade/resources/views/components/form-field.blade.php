@props([
    'label' => null,
    // id of the control. An input/textarea/select inside without its own id takes this one and
    // gets aria-describedby/aria-invalid wired to the help and error texts.
    'for' => null,
    'help' => null,
    'error' => null,
    'required' => false,
    // vertical (label above, default) | horizontal (label column on wide screens)
    'layout' => 'vertical',
])
{{-- Default slot: the control. --}}
<div {{ $attributes->class(['bmsui-field', 'bmsui-field--horizontal' => $layout === 'horizontal', 'is-invalid' => (bool) $error]) }}>
    @if($label)
        <x-bmsui::label :for="$for" :required="$required">{{ $label }}</x-bmsui::label>
    @endif
    <div class="bmsui-field__control">
        {{ $slot }}
        @if($help)<p class="bmsui-field__help" @if($for) id="{{ $for }}-help" @endif>{{ $help }}</p>@endif
        @if($error)<p class="bmsui-field__error" @if($for) id="{{ $for }}-error" @endif role="alert">{{ $error }}</p>@endif
    </div>
</div>

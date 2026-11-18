@props([
    // Name of the hidden field; it carries the addresses comma-joined ("a@b.ch,c@d.ch").
    'name',
    'value' => [],
    'id' => null,
    'placeholder' => '',
    'disabled' => false,
    'invalid' => false,
    'error' => null,
    'maxItems' => null,
    // [['email' => 'a@b.ch', 'name' => 'Anna']]: native autocomplete (datalist) under the input.
    'suggestions' => [],
    'removeLabel' => __('Remove'),
    'invalidLabel' => __('Invalid email address'),
    'maxLabel' => __('Maximum number of addresses reached'),
])
@php
    $id = $id ?: 'bmsui-em-'.substr(md5($name.uniqid('', true)), 0, 8);
    $list = is_array($value) ? array_values($value) : array_values(array_filter(array_map('trim', explode(',', (string) $value))));
    $hasInvalid = collect($list)->contains(fn ($e) => ! \BMSuisse\BMSUi\BMSUi::isValidEmail($e));
    $bad = $invalid || $hasInvalid || $error;
@endphp
<div {{ $attributes->class(['bmsui-emails', 'is-invalid' => $bad, 'is-disabled' => $disabled]) }}
    role="group" aria-labelledby="{{ $id }}-label" data-bmsui-emails
    data-max="{{ $maxItems }}" data-remove="{{ $removeLabel }}" data-invalid-msg="{{ $invalidLabel }}" data-max-msg="{{ $maxLabel }}">
    @isset($label)<label class="bmsui-emails__label" id="{{ $id }}-label" for="{{ $id }}">{{ $label }}</label>@endisset
    <div class="bmsui-emails__field">
        @foreach($list as $email)
            @php($isBad = ! \BMSuisse\BMSUi\BMSUi::isValidEmail($email))
            <span class="bmsui-chip {{ $isBad ? 'bmsui-chip--danger' : '' }}" data-email="{{ $email }}" @if($isBad) aria-invalid="true" @endif>
                <span class="bmsui-chip__text">{{ $email }}</span>
                @unless($disabled)<button type="button" class="bmsui-chip__x" data-bmsui-email-remove aria-label="{{ $removeLabel }}: {{ $email }}">&times;</button>@endunless
            </span>
        @endforeach
        <input type="text" class="bmsui-emails__input" id="{{ $id }}" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false"
            placeholder="{{ $placeholder }}" @disabled($disabled) @if($bad) aria-invalid="true" @endif aria-describedby="{{ $id }}-msg"
            @if($suggestions) list="{{ $id }}-list" @endif>
        <input type="hidden" name="{{ $name }}" value="{{ implode(',', $list) }}" data-bmsui-emails-value @disabled($disabled)>
    </div>
    @if($suggestions)
        <datalist id="{{ $id }}-list">
            @foreach($suggestions as $s)@php($s = (array) $s)<option value="{{ $s['email'] }}" label="{{ $s['name'] ?? '' }}"></option>@endforeach
        </datalist>
    @endif
    <p class="bmsui-emails__msg" id="{{ $id }}-msg" role="status">@if($error){{ $error }}@elseif($hasInvalid){{ $invalidLabel }}@endif</p>
</div>

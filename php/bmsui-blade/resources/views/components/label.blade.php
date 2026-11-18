@props([
    'for' => null,
    // Adds a "*" (with an accessible "required" text).
    'required' => false,
    'requiredLabel' => __('required'),
])
<label {{ $attributes->class('bmsui-label')->merge(['for' => $for]) }}>{{ $slot }}@if($required)<span class="bmsui-label__req" aria-hidden="true"> *</span><span class="bmsui-sr"> ({{ $requiredLabel }})</span>@endif</label>

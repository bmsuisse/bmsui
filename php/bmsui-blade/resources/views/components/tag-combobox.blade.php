@props([
    'name',
    'options' => [],
    'value' => [],
    'selected' => [],
    'searchUrl' => null,
    'minChars' => 1,
    // New tags from free text (Enter); false = only picks from the list.
    'creatable' => true,
    'placeholder' => null,
    'id' => null,
    'disabled' => false,
    'invalid' => false,
    'maxItems' => null,
    'labels' => [],
])
{{-- Tags-and-search multi-select: the combobox in multiple mode, creatable by default. Same props. --}}
<x-bmsui::combobox :multiple="true" :name="$name" :options="$options" :value="$value" :selected="$selected" :search-url="$searchUrl"
    :min-chars="$minChars" :creatable="$creatable" :placeholder="$placeholder" :id="$id" :disabled="$disabled" :invalid="$invalid"
    :max-items="$maxItems" :labels="$labels" {{ $attributes }} />

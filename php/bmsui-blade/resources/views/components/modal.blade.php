@props([
    'id',
    'title' => null,
    'description' => null,
    'size' => 'md',
    'open' => false,
    'url' => null,
    'static' => false,
    'closeLabel' => __('Close'),
])
{{-- Same as the dialog component (React's Modal naming). --}}
<x-bmsui::dialog :id="$id" :title="$title" :description="$description" :size="$size" :open="$open" :url="$url" :static="$static" :close-label="$closeLabel" {{ $attributes }}>
    {{ $slot }}
    @isset($footer)
        <x-slot:footer>{{ $footer }}</x-slot:footer>
    @endisset
</x-bmsui::dialog>

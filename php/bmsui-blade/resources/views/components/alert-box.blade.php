@props([
    // error | warning | info | success (danger works as an alias of error)
    'tone' => 'info',
    'title' => null,
    'dismissible' => false,
    'dismissLabel' => __('Close'),
])
{{-- Inline alert inside content (form errors, flash messages); the banner is the page-wide variant. --}}
<x-bmsui::banner :tone="$tone === 'error' ? 'danger' : $tone" :title="$title" :dismissible="$dismissible" :dismiss-label="$dismissLabel" {{ $attributes->class('bmsui-alert') }}>
    {{ $slot }}
</x-bmsui::banner>

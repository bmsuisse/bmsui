@props([
    // Raw status, e.g. "pending", "APPROVED", "in_review".
    'status',
    // Shown text; defaults to the translated built-in word or a title-cased status.
    'label' => null,
    // neutral | info | success | warning | error: overrides everything below.
    'tone' => null,
    // ['waiting' => 'warning']: checked (case-insensitively) before the built-in vocabulary.
    'toneMap' => [],
    // Shows a dot before the text.
    'dot' => false,
])
@php
    $key = strtolower((string) $status);
    $builtin = [
        'active' => ['success', __('Active')], 'approved' => ['success', __('Approved')], 'completed' => ['success', __('Completed')],
        'paid' => ['success', __('Paid')], 'done' => ['success', __('Done')], 'pending' => ['warning', __('Pending')],
        'draft' => ['warning', __('Draft')], 'in_review' => ['warning', __('In review')], 'inreview' => ['warning', __('In review')],
        'rejected' => ['error', __('Rejected')], 'failed' => ['error', __('Failed')], 'cancelled' => ['error', __('Cancelled')],
        'canceled' => ['error', __('Cancelled')], 'overdue' => ['error', __('Overdue')], 'inactive' => ['neutral', __('Inactive')],
        'archived' => ['neutral', __('Archived')], 'new' => ['info', __('New')], 'closed' => ['neutral', __('Closed')], 'spam' => ['error', __('Spam')],
    ];
    $map = array_change_key_case((array) $toneMap, CASE_LOWER);
    $t = $tone ?? $map[$key] ?? ($builtin[$key][0] ?? 'neutral');
    $text = $label ?? ($builtin[$key][1] ?? ucwords(str_replace(['_', '-'], ' ', $key)));
    $chip = ['error' => 'danger', 'neutral' => 'neutral'][$t] ?? $t;
@endphp
<x-bmsui::chip :tone="$chip" {{ $attributes->class(['bmsui-status', 'bmsui-status--dot' => $dot])->merge(['data-status' => $key]) }}>@if($dot)<span class="bmsui-status__dot" aria-hidden="true"></span>@endif{{ $text }}</x-bmsui::chip>

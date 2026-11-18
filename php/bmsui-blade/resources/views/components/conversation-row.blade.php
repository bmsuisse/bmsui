@props([
    'subject',
    'preview' => null,
    // ['name' => 'Keller Haustechnik AG', 'avatarSrc' => null]
    'customer' => [],
    'assignee' => null,
    // active | pending | closed | spam
    'status' => null,
    'unread' => false,
    'starred' => false,
    'threadCount' => null,
    'hasAttachments' => false,
    // Already formatted (e.g. "vor 5 Min." / "14.11.2026").
    'time' => null,
    'datetime' => null,
    'href' => null,
    // Shows a checkbox when set (true/false = checked); `selectName`/`selectValue` make it a form field.
    'selected' => null,
    'selectName' => null,
    'selectValue' => null,
    'labels' => [],
])
@php
    $l = array_merge([
        'active' => __('Active'), 'pending' => __('Pending'), 'closed' => __('Closed'), 'spam' => __('Spam'),
        'unread' => __('Unread'), 'starred' => __('Starred'), 'attachments' => __('Has attachments'),
        'select' => __('Select conversation'), 'assignedTo' => __('Assigned to'),
    ], $labels);
    $tones = ['active' => 'success', 'pending' => 'warning', 'closed' => 'neutral', 'spam' => 'danger'];
    $c = (array) $customer;
    $a = (array) ($assignee ?? []);
@endphp
<li {{ $attributes->class(['bmsui-conv', 'is-unread' => $unread, 'is-selected' => $selected === true]) }}>
    @if($selected !== null)
        <input type="checkbox" class="bmsui-conv__check" aria-label="{{ $l['select'] }}" @checked($selected) @if($selectName) name="{{ $selectName }}" value="{{ $selectValue }}" @endif>
    @endif
    @if($unread)<span class="bmsui-conv__dot" role="img" aria-label="{{ $l['unread'] }}"></span>@endif
    <span class="bmsui-conv__customer">
        <x-bmsui::avatar :name="$c['name'] ?? ''" :src="$c['avatarSrc'] ?? null" :size="24" />
        <span class="bmsui-conv__cname">{{ $c['name'] ?? '' }}</span>
    </span>
    <span class="bmsui-conv__main">
        @if($href)<a class="bmsui-conv__link" href="{{ $href }}">@else<span class="bmsui-conv__link">@endif
            <span class="bmsui-conv__subject">{{ $subject }}</span>@if($preview)<span class="bmsui-conv__preview"> &ndash; {{ $preview }}</span>@endif
        @if($href)</a>@else</span>@endif
        @if(!$slot->isEmpty())<span class="bmsui-conv__tags">{{ $slot }}</span>@endif
    </span>
    <span class="bmsui-conv__meta">
        @if($starred)<svg class="bmsui-conv__star" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="{{ $l['starred'] }}"><path d="M11.48 3.5a.56.56 0 011.04 0l2.13 5.11c.09.21.29.36.52.38l5.52.44c.5.04.7.67.32.99l-4.2 3.6a.56.56 0 00-.18.56l1.28 5.38a.56.56 0 01-.84.61l-4.73-2.89a.56.56 0 00-.59 0l-4.73 2.89a.56.56 0 01-.84-.61l1.28-5.38a.56.56 0 00-.18-.56l-4.2-3.6a.56.56 0 01.32-.99l5.52-.44a.56.56 0 00.52-.38l2.13-5.11z"/></svg>@endif
        @if($hasAttachments)<svg class="bmsui-conv__clip" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="{{ $l['attachments'] }}"><path d="M18.38 8.69l-7.7 7.7a2.62 2.62 0 01-3.71-3.71l7.7-7.7a1.75 1.75 0 112.47 2.47l-7.7 7.7a.88.88 0 01-1.24-1.24l7.1-7.1"/></svg>@endif
        @if($threadCount)<span class="bmsui-conv__count">{{ $threadCount }}</span>@endif
        @if($status && isset($tones[$status]))<x-bmsui::chip :tone="$tones[$status]">{{ $l[$status] }}</x-bmsui::chip>@endif
        @if($a)<x-bmsui::avatar :name="$a['name'] ?? ''" :src="$a['avatarSrc'] ?? null" :size="22" :title="$l['assignedTo'].' '.($a['name'] ?? '')" />@endif
        @if($time)<time class="bmsui-conv__time" @if($datetime) datetime="{{ $datetime }}" @endif>{{ $time }}</time>@endif
    </span>
</li>

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
    // Star as a toggle button (always shown, aria-pressed). A click flips it and fires `bmsui:star`
    // ({detail: {starred}}) on the button; preventDefault() on that event reverts the flip.
    'starrable' => false,
    'threadCount' => null,
    'hasAttachments' => false,
    // Conversation number, shown as "#1234" before the time (own cell in table mode).
    'number' => null,
    // Already formatted (e.g. "vor 5 Min." / "14.11.2026").
    'time' => null,
    'datetime' => null,
    'href' => null,
    // Shows a checkbox when set (true/false = checked); `selectName`/`selectValue` make it a form field.
    'selected' => null,
    'selectName' => null,
    'selectValue' => null,
    // Extra attributes for inner elements (class, name, value, data-*), merged with ours:
    // e.g. ['class' => 'conv-checkbox', 'data-conversation_id' => 5]. Attributes on the component itself go on the row.
    'checkboxAttributes' => [],
    'starAttributes' => [],
    'linkAttributes' => [],
    'labels' => [],
])
{{-- Named slots (all optional), at the places of FreeScout's conversations_table hooks:
     beforeSubject, afterSubject, beforePreview (inside the link: text/icons only), beforeNumber,
     afterRow (list: a full-width block inside the row; table: raw markup after the </tr>, e.g. a <tr>).
     In table mode beforeNumber is raw markup inside the <tr>, so <td> hooks keep working. --}}
@aware(['as' => 'list'])
@php
    $l = array_merge([
        'active' => __('Active'), 'pending' => __('Pending'), 'closed' => __('Closed'), 'spam' => __('Spam'),
        'unread' => __('Unread'), 'starred' => __('Starred'), 'attachments' => __('Has attachments'),
        'select' => __('Select conversation'), 'assignedTo' => __('Assigned to'), 'star' => __('Star'),
        'number' => __('Conversation number'),
    ], $labels);
    $tones = ['active' => 'success', 'pending' => 'warning', 'closed' => 'neutral', 'spam' => 'danger'];
    $c = (array) $customer;
    $a = (array) ($assignee ?? []);
    $bag = fn ($x) => new \Illuminate\View\ComponentAttributeBag((array) $x);
    $table = $as === 'table';
    $tag = $table ? 'tr' : 'li';
    $cell = $table ? 'td' : 'span';
    $starPath = 'M11.48 3.5a.56.56 0 011.04 0l2.13 5.11c.09.21.29.36.52.38l5.52.44c.5.04.7.67.32.99l-4.2 3.6a.56.56 0 00-.18.56l1.28 5.38a.56.56 0 01-.84.61l-4.73-2.89a.56.56 0 00-.59 0l-4.73 2.89a.56.56 0 01-.84-.61l1.28-5.38a.56.56 0 00-.18-.56l-4.2-3.6a.56.56 0 01.32-.99l5.52-.44a.56.56 0 00.52-.38l2.13-5.11z';
@endphp
<{{ $tag }} {{ $attributes->class(['bmsui-conv', 'is-unread' => $unread, 'is-selected' => $selected === true, 'is-starred' => $starred]) }}>
    @if($selected !== null)
        @if($table)<td class="bmsui-conv__cell bmsui-conv__cell--check">@endif
        @php($cb = $bag($checkboxAttributes))
        <input type="checkbox" class="{{ trim('bmsui-conv__check '.$cb->get('class')) }}" aria-label="{{ $l['select'] }}" @checked($selected) @if($selectName) name="{{ $selectName }}" value="{{ $selectValue }}" @endif {{ $cb->except('class') }}>
        @if($table)</td>@endif
    @endif
    @if($unread && !$table)<span class="bmsui-conv__dot" role="img" aria-label="{{ $l['unread'] }}"></span>@endif
    @if($table)<td class="bmsui-conv__cell bmsui-conv__cell--customer">@endif
    <span class="bmsui-conv__customer">
        @if($unread && $table)<span class="bmsui-conv__dot" role="img" aria-label="{{ $l['unread'] }}"></span>@endif
        <x-bmsui::avatar :name="$c['name'] ?? ''" :src="$c['avatarSrc'] ?? null" :size="24" />
        <span class="bmsui-conv__cname">{{ $c['name'] ?? '' }}</span>
    </span>
    @if($table)</td>@endif
    <{{ $cell }} class="bmsui-conv__main">
        @isset($beforeSubject)<span class="bmsui-conv__slot">{{ $beforeSubject }}</span>@endisset
        @php($lb = $bag($linkAttributes))
        @if($href)<a class="{{ trim('bmsui-conv__link '.$lb->get('class')) }}" href="{{ $href }}"{!! $lb->except('class')->isEmpty() ? '' : ' '.$lb->except('class') !!}>@else<span class="{{ trim('bmsui-conv__link '.$lb->get('class')) }}" {{ $lb->except('class') }}>@endif
            <span class="bmsui-conv__subject">{{ $subject }}</span>@if($preview || isset($beforePreview))<span class="bmsui-conv__preview"> &ndash; @isset($beforePreview){{ $beforePreview }} @endisset{{ $preview }}</span>@endif
        @if($href)</a>@else</span>@endif
        @isset($afterSubject)<span class="bmsui-conv__slot">{{ $afterSubject }}</span>@endisset
        @if(!$slot->isEmpty())<span class="bmsui-conv__tags">{{ $slot }}</span>@endif
    </{{ $cell }}>
    @if($table)
        @isset($beforeNumber){{ $beforeNumber }}@endisset
        @if($number !== null)<td class="bmsui-conv__cell bmsui-conv__num" title="{{ $l['number'] }}">#{{ $number }}</td>@endif
    @endif
    <{{ $cell }} class="bmsui-conv__meta">
        @if($starrable)
            <button type="button" {{ $bag($starAttributes)->class(['bmsui-conv__star-btn', 'is-on' => $starred])->merge(['aria-label' => $l['star']]) }} aria-pressed="{{ $starred ? 'true' : 'false' }}" data-bmsui-star>
                <svg class="bmsui-conv__star" viewBox="0 0 24 24" aria-hidden="true"><path d="{{ $starPath }}"/></svg>
            </button>
        @elseif($starred)
            <svg {{ $bag($starAttributes)->class('bmsui-conv__star') }} viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="{{ $l['starred'] }}"><path d="{{ $starPath }}"/></svg>
        @endif
        @if($hasAttachments)<svg class="bmsui-conv__clip" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="{{ $l['attachments'] }}"><path d="M18.38 8.69l-7.7 7.7a2.62 2.62 0 01-3.71-3.71l7.7-7.7a1.75 1.75 0 112.47 2.47l-7.7 7.7a.88.88 0 01-1.24-1.24l7.1-7.1"/></svg>@endif
        @if($threadCount)<span class="bmsui-conv__count">{{ $threadCount }}</span>@endif
        @if($status && isset($tones[$status]))<x-bmsui::chip :tone="$tones[$status]">{{ $l[$status] }}</x-bmsui::chip>@endif
        @if($a)<x-bmsui::avatar :name="$a['name'] ?? ''" :src="$a['avatarSrc'] ?? null" :size="22" :title="$l['assignedTo'].' '.($a['name'] ?? '')" />@endif
        @unless($table)
            @isset($beforeNumber)<span class="bmsui-conv__slot">{{ $beforeNumber }}</span>@endisset
            @if($number !== null)<span class="bmsui-conv__num" title="{{ $l['number'] }}">#{{ $number }}</span>@endif
        @endunless
        @if($time)<time class="bmsui-conv__time" @if($datetime) datetime="{{ $datetime }}" @endif>{{ $time }}</time>@endif
    </{{ $cell }}>
    @if(!$table && isset($afterRow))<div class="bmsui-conv__after">{{ $afterRow }}</div>@endif
</{{ $tag }}>
@if($table && isset($afterRow)){{ $afterRow }}@endif

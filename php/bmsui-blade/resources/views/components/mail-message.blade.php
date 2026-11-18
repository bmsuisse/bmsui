@props([
    // inbound | outbound | note
    'direction' => 'inbound',
    // ['name' => 'Anna Meier', 'email' => 'anna@muster-ag.ch', 'avatarSrc' => null]
    'sender' => [],
    // ['to' => [...], 'cc' => [...], 'bcc' => [...]]
    'recipients' => [],
    // Already formatted.
    'time' => null,
    'datetime' => null,
    'subject' => null,
    // sent | sending | failed | bounced | draft
    'status' => null,
    'error' => null,
    // Link for the retry action (or handle clicks on [data-bmsui-retry] yourself).
    'retryHref' => null,
    'attachments' => [],
    'locale' => 'de-CH',
    'labels' => [],
])
@php
    $l = array_merge([
        'to' => __('to'), 'cc' => __('cc'), 'bcc' => __('bcc'), 'note' => __('Note'), 'draft' => __('Draft'),
        'sending' => __('Sending'), 'failed' => __('Delivery failed'), 'bounced' => __('Bounced'),
        'retry' => __('Retry'), 'more' => __('Show all recipients'),
    ], $labels);
    $s = (array) $sender;
    $r = array_filter(['to' => $recipients['to'] ?? [], 'cc' => $recipients['cc'] ?? [], 'bcc' => $recipients['bcc'] ?? []]);
    $total = collect($r)->flatten()->count();
    $firstKind = array_key_first($r);
    $shown = $firstKind ? array_slice($r[$firstKind], 0, 2) : [];
    $failed = in_array($status, ['failed', 'bounced'], true);
@endphp
<article {{ $attributes->class(['bmsui-msg', 'bmsui-msg--'.$direction, 'is-failed' => $failed, 'is-draft' => $status === 'draft']) }}>
    <x-bmsui::avatar :name="$s['name'] ?? ''" :src="$s['avatarSrc'] ?? null" :size="36" class="bmsui-msg__avatar" />
    <div class="bmsui-msg__main">
        <header class="bmsui-msg__head">
            <span class="bmsui-msg__sender">
                <strong>{{ $s['name'] ?? '' }}</strong>
                @if(!empty($s['email']))<span class="bmsui-msg__email">&lt;{{ $s['email'] }}&gt;</span>@endif
            </span>
            @if($direction === 'note')<x-bmsui::chip tone="warning">{{ $l['note'] }}</x-bmsui::chip>@endif
            @if($status === 'draft')<span class="bmsui-msg__draft">[{{ $l['draft'] }}]</span>@endif
            @if($status === 'sending')<span class="bmsui-msg__status">{{ $l['sending'] }}&hellip;</span>@endif
            @isset($badges){{ $badges }}@endisset
            @if($time)<time class="bmsui-msg__time" @if($datetime) datetime="{{ $datetime }}" @endif>{{ $time }}</time>@endif
        </header>
        @if($total > 3)
            <details class="bmsui-msg__rcpt">
                <summary title="{{ $l['more'] }}">{{ $l[$firstKind] }}: {{ implode(', ', $shown) }} <span class="bmsui-msg__more">+{{ $total - count($shown) }}</span></summary>
                @foreach($r as $kind => $addrs)<span class="bmsui-msg__rline"><b>{{ $l[$kind] }}:</b> {{ implode(', ', $addrs) }}</span>@endforeach
            </details>
        @elseif($total)
            <p class="bmsui-msg__rcpt">
                @foreach($r as $kind => $addrs)<span class="bmsui-msg__rline"><b>{{ $l[$kind] }}:</b> {{ implode(', ', $addrs) }}</span> @endforeach
            </p>
        @endif
        @if($subject)<p class="bmsui-msg__subject">{{ $subject }}</p>@endif
        @if($failed)
            <p class="bmsui-msg__fail" role="alert">
                <span><strong>{{ $status === 'bounced' ? $l['bounced'] : $l['failed'] }}</strong>@if($error): {{ $error }}@endif</span>
                @if($retryHref)<a class="bmsui-btn" href="{{ $retryHref }}" data-bmsui-retry>{{ $l['retry'] }}</a>@else<button type="button" class="bmsui-btn" data-bmsui-retry>{{ $l['retry'] }}</button>@endif
            </p>
        @endif
        <div class="bmsui-msg__body">{{ $slot }}</div>
        @isset($quoted)<x-bmsui::quoted-text>{{ $quoted }}</x-bmsui::quoted-text>@endisset
        <x-bmsui::attachment-list :attachments="$attachments" :locale="$locale" />
        @isset($actions)<div class="bmsui-msg__actions">{{ $actions }}</div>@endisset
    </div>
</article>

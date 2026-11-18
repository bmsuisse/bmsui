@props([
    // "mod+k", "shift+enter", "g i" (space = chord: press one after the other).
    // "mod" shows Ctrl and becomes ⌘ on Apple devices (bmsui.js).
    'keys',
])
@php
    $names = ['mod' => 'Ctrl', 'ctrl' => 'Ctrl', 'alt' => 'Alt', 'shift' => 'Shift', 'meta' => 'Meta', 'enter' => 'Enter', 'esc' => 'Esc', 'escape' => 'Esc', 'space' => 'Space', 'tab' => 'Tab', 'up' => '↑', 'down' => '↓', 'left' => '←', 'right' => '→', 'backspace' => '⌫'];
    $chords = preg_split('/\s+/', trim((string) $keys), -1, PREG_SPLIT_NO_EMPTY);
@endphp
<span {{ $attributes->class('bmsui-keys') }}>
    @foreach($chords as $ci => $chord)
        @if($ci > 0)<span class="bmsui-keys__then" aria-hidden="true">›</span>@endif
        @foreach(explode('+', $chord) as $ki => $k)
            @php($lk = strtolower($k))
            <kbd class="bmsui-kbd" @if($lk === 'mod') data-bmsui-mod @endif @if($lk === 'alt') data-bmsui-alt @endif>{{ $names[$lk] ?? (mb_strlen($k) === 1 ? mb_strtoupper($k) : ucfirst($k)) }}</kbd>
        @endforeach
    @endforeach
</span>

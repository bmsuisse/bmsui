@props([
    'id' => 'bmsui-commands',
    // [['id' => 'new', 'label' => 'New conversation', 'group' => 'Actions', 'href' => '/new', 'keywords' => 'create mail',
    //   'shortcut' => 'mod+n', 'description' => null]]; items without href fire `bmsui:command` ({detail: {id}}).
    'commands' => [],
    // Global shortcut that opens it ("mod+k" = Ctrl/⌘+K); false = no shortcut.
    'hotkey' => 'mod+k',
    'placeholder' => __('Type a command or search…'),
    'label' => __('Command palette'),
    'emptyLabel' => __('No results'),
])
{{-- ⌘K palette: commands are rendered on the server, bmsui.js filters and ranks them (label prefix,
     word start, then contains; keywords count too). Open with the hotkey, a button with
     data-bmsui-command-open="#id", or BMSUi.commands.open(). --}}
<dialog {{ $attributes->class(['bmsui-dialog', 'bmsui-cmdk']) }} id="{{ $id }}" data-bmsui-dialog data-bmsui-cmdk @if($hotkey) data-hotkey="{{ $hotkey }}" @endif aria-label="{{ $label }}">
    <div class="bmsui-dialog__box">
        <div class="bmsui-cmdk__search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z"/></svg>
            <input type="text" class="bmsui-cmdk__input" role="combobox" aria-expanded="true" aria-controls="{{ $id }}-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="{{ $placeholder }}" aria-label="{{ $label }}">
            <x-bmsui::kbd>Esc</x-bmsui::kbd>
        </div>
        <div class="bmsui-cmdk__list" id="{{ $id }}-list" role="listbox" aria-label="{{ $label }}">
            @foreach(collect($commands)->map(fn ($c) => (array) $c)->groupBy(fn ($c) => $c['group'] ?? '') as $group => $items)
                <div class="bmsui-cmdk__group" role="group" @if($group !== '') aria-label="{{ $group }}" @endif>
                    @if($group !== '')<div class="bmsui-cmdk__heading" aria-hidden="true">{{ $group }}</div>@endif
                    @foreach($items as $c)
                        <div class="bmsui-cmdk__item" role="option" id="{{ $id }}-{{ $loop->parent->index }}-{{ $loop->index }}" aria-selected="false"
                            data-id="{{ $c['id'] ?? '' }}" data-label="{{ $c['label'] ?? '' }}" data-keywords="{{ $c['keywords'] ?? '' }}" @if(!empty($c['href'])) data-href="{{ $c['href'] }}" @endif>
                            <span class="bmsui-cmdk__label">{{ $c['label'] ?? '' }}@if(!empty($c['description']))<span class="bmsui-cmdk__desc">{{ $c['description'] }}</span>@endif</span>
                            @if(!empty($c['shortcut']))<x-bmsui::key-combo :keys="$c['shortcut']" />@endif
                        </div>
                    @endforeach
                </div>
            @endforeach
            <p class="bmsui-cmdk__empty" hidden>{{ $emptyLabel }}</p>
        </div>
    </div>
</dialog>

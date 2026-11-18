{{-- Menu rows for the dropdown-menu component; recursive for submenus. --}}
@foreach($items as $item)
    @php($item = (array) $item)
    @if(!empty($item['separator']))
        <div class="bmsui-menu__sep" role="separator"></div>
    @elseif(!empty($item['heading']))
        <div class="bmsui-menu__heading" role="presentation">{{ $item['heading'] }}</div>
    @else
        @php($cls = 'bmsui-menu__item'.(!empty($item['danger']) ? ' bmsui-menu__item--danger' : ''))
        @if(!empty($item['items']))
            <div class="bmsui-menu__sub">
                <button type="button" role="menuitem" class="{{ $cls }}" tabindex="-1" aria-haspopup="menu" aria-expanded="false" data-bmsui-submenu @disabled(!empty($item['disabled']))>
                    <span class="bmsui-menu__label">{{ $item['label'] ?? '' }}</span>
                    <svg class="bmsui-menu__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
                </button>
                <div class="bmsui-menu bmsui-menu--sub" role="menu" aria-label="{{ $item['label'] ?? '' }}" hidden>
                    @include('bmsui::partials.menu-items', ['items' => $item['items']])
                </div>
            </div>
        @elseif(!empty($item['href']) && empty($item['disabled']))
            <a role="menuitem" class="{{ $cls }}" href="{{ $item['href'] }}" tabindex="-1" @if(!empty($item['id'])) data-bmsui-menu-item="{{ $item['id'] }}" @endif @if(!empty($item['target'])) target="{{ $item['target'] }}" @endif>
                <span class="bmsui-menu__label">{{ $item['label'] ?? '' }}</span>
                @if(!empty($item['shortcut']))<kbd class="bmsui-menu__kbd">{{ $item['shortcut'] }}</kbd>@endif
            </a>
        @else
            <button type="button" role="menuitem" class="{{ $cls }}" tabindex="-1" data-bmsui-menu-item="{{ $item['id'] ?? '' }}" @disabled(!empty($item['disabled']))>
                <span class="bmsui-menu__label">{{ $item['label'] ?? '' }}</span>
                @if(!empty($item['shortcut']))<kbd class="bmsui-menu__kbd">{{ $item['shortcut'] }}</kbd>@endif
            </button>
        @endif
    @endif
@endforeach

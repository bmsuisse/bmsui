<?php

namespace BMSuisse\BMSUi\Tests;

/** Pagination, table set, breadcrumbs, page header, search bar, sidebar, KPI card, sparkline. */
class LayoutComponentsTest extends BladeTestCase
{
    public function testPaginationKeepsAConstantNumberOfSlots()
    {
        $html = $this->html('<x-bmsui::pagination :page="7" :pages="13" url="?page={page}" />');
        $this->assertStringContainsString('aria-current="page"', $html);
        $this->assertStringContainsString('href="?page=6" rel="prev"', $html);
        $this->assertStringContainsString('href="?page=8" rel="next"', $html);
        $this->assertSame(2, substr_count($html, 'bmsui-pager__gap'));
        $this->assertSame(5, preg_match_all('/aria-label="Page \d/', $html));
        $this->assertStringContainsString('7 of 13', $html);
        $start = $this->html('<x-bmsui::pagination :page="1" :pages="13" />');
        $this->assertSame(1, substr_count($start, 'bmsui-pager__gap'));
        $this->assertStringContainsString('data-page="2"', $start);
        $this->assertMatchesRegularExpression('/<button type="button" class="bmsui-pager__btn"\s+disabled\s+aria-label="Previous page"/', $start);
        $this->assertSame('', trim($this->html('<x-bmsui::pagination :page="1" :pages="1" />')));
        $this->assertSame(5, preg_match_all('/aria-label="Page \d/', $this->html('<x-bmsui::pagination :page="2" :pages="5" />')));
    }

    public function testTableShellToolbarAndTable()
    {
        $html = $this->html('<x-bmsui::table-shell title="Users"><x-slot:toolbar><x-bmsui::table-toolbar :count="12">S<x-slot:actions><button>Add</button></x-slot:actions></x-bmsui::table-toolbar></x-slot:toolbar><x-bmsui::table :striped="true" :dense="true" caption="Users"><tbody><tr><td>A</td></tr></tbody></x-bmsui::table><x-slot:footer>F</x-slot:footer></x-bmsui::table-shell>');
        $this->assertStringContainsString('data-table-shell', $html);
        $this->assertStringContainsString('12 entries', $html);
        $this->assertStringContainsString('bmsui-table--striped', $html);
        $this->assertStringContainsString('bmsui-table--dense', $html);
        $this->assertStringContainsString('<caption class="bmsui-sr">Users</caption>', $html);
        $this->assertStringContainsString('bmsui-tshell__foot', $html);
        $this->assertStringContainsString('bmsui-ttoolbar__actions', $html);
    }

    public function testBreadcrumbsFoldAndPageHeaderSlots()
    {
        $items = [['label' => 'Home', 'href' => '/'], ['label' => 'A', 'href' => '/a'], ['label' => 'B', 'href' => '/b'], ['label' => 'C', 'href' => '/c'], ['label' => 'Here']];
        $html = $this->html('<x-bmsui::breadcrumbs :items="$i" :max-items="4" />', ['i' => $items]);
        $this->assertStringContainsString('<ol', $html);
        $this->assertStringContainsString('aria-current="page">Here', $html);
        $this->assertStringContainsString('aria-label="Show more"', $html);
        $this->assertStringContainsString('href="/b"', $html, 'folded items are in the menu');
        $this->assertDoesNotMatchRegularExpression('/bmsui-crumbs__link" href="\/a"/', $html);
        $this->assertMatchesRegularExpression('/bmsui-crumbs__link" href="\/c"/', $html);
        $head = $this->html('<x-bmsui::page-header title="Offerte" description="#10412" back-href="/inbox" :breadcrumbs="[[\'label\' => \'Inbox\', \'href\' => \'/i\'], [\'label\' => \'Offerte\']]" :divider="true">x<x-slot:badge><span>B</span></x-slot:badge><x-slot:after-title>AFTER</x-slot:after-title><x-slot:actions><button>Reply</button></x-slot:actions><x-slot:tabs>TABS</x-slot:tabs></x-bmsui::page-header>');
        $this->assertStringContainsString('<h1 class="bmsui-phead__title">Offerte</h1>', $head);
        $this->assertStringContainsString('href="/inbox" aria-label="Back"', $head);
        $this->assertStringContainsString('bmsui-phead__after', $head);
        $this->assertStringContainsString('bmsui-phead__actions', $head);
        $this->assertStringContainsString('bmsui-phead__tabs', $head);
        $this->assertStringContainsString('bmsui-phead--divider', $head);
        $this->assertStringContainsString('<h2 class="bmsui-phead__title">', $this->html('<x-bmsui::page-header title="T" level="h2" />'));
    }

    public function testSearchBar()
    {
        $form = $this->html('<x-bmsui::search-bar action="/search" value="offerte" data-x="1" />');
        $this->assertStringContainsString('<form class="bmsui-search ', $form);
        $this->assertStringContainsString('role="search"', $form);
        $this->assertMatchesRegularExpression('/type="search"[^>]*name="q" value="offerte"[^>]*class="bmsui-search__input"/', $form);
        $this->assertStringContainsString('data-x="1"', $form);
        $this->assertDoesNotMatchRegularExpression('/data-bmsui-search-clear[^>]*hidden/', $form);
        $plain = $this->html('<x-bmsui::search-bar :loading="true" />');
        $this->assertStringContainsString('<div class="bmsui-search is-loading"', $plain);
        $this->assertStringContainsString('bmsui-spinner', $plain);
        $this->assertMatchesRegularExpression('/data-bmsui-search-clear[^>]*hidden/', $plain);
    }

    public function testSidebarReadsCollapseStateFromCookie()
    {
        $tree = '<x-bmsui::sidebar><x-slot:header>Brand</x-slot:header><x-bmsui::nav-group id="mail" label="Mailboxes"><x-bmsui::nav-item label="Sales" href="/m/1" :active="true" :count="4" /><x-bmsui::nav-item label="Support" href="/m/2" :count="0" /></x-bmsui::nav-group></x-bmsui::sidebar>';
        $open = $this->html($tree);
        $this->assertStringNotContainsString('is-collapsed', $open);
        $this->assertStringContainsString('aria-current="page"', $open);
        $this->assertSame(1, substr_count($open, 'bmsui-navitem__count'));
        $this->assertStringContainsString('aria-expanded="true" aria-controls="bmsui-ng-mail"', $open);
        $_COOKIE['bmsui_sidebar'] = '1';
        $_COOKIE['bmsui_nav_groups'] = 'other,mail';
        try {
            $closed = $this->html($tree);
            $this->assertStringContainsString('bmsui-sidebar is-collapsed', $closed);
            $this->assertStringContainsString('aria-label="Expand sidebar"', $closed);
            $this->assertStringContainsString('bmsui-navgroup is-closed', $closed);
            $this->assertMatchesRegularExpression('/id="bmsui-ng-mail"\s+hidden/', $closed);
            $this->assertStringNotContainsString('is-collapsed', $this->html('<x-bmsui::sidebar :collapsed="false">x</x-bmsui::sidebar>'));
        } finally {
            unset($_COOKIE['bmsui_sidebar'], $_COOKIE['bmsui_nav_groups']);
        }
    }

    public function testKpiCardAndSparkline()
    {
        $kpi = $this->html('<x-bmsui::kpi-card label="Open" value="128" delta="+12" trend="up" :up-is-good="false" sub="vs. last week" :spark="[3, 5, 4, 8]" spark-label="Last 4 weeks" href="/r" />');
        $this->assertStringContainsString('<a href="/r" class="bmsui-kpi">', $kpi);
        $this->assertStringContainsString('bmsui-kpi__delta--danger', $kpi);
        $this->assertStringContainsString('<polyline', $kpi);
        $this->assertStringContainsString('aria-label="Last 4 weeks"', $kpi);
        $this->assertStringContainsString('bmsui-kpi__delta--success', $this->html('<x-bmsui::kpi-card label="A" value="1" delta="+1" trend="up" />'));
        $flat = $this->html('<x-bmsui::sparkline :values="[1, 1, 1]" />');
        $this->assertStringContainsString('aria-hidden="true"', $flat);
        $this->assertStringNotContainsString('NaN', $flat);
        $this->assertStringNotContainsString('<polyline', $this->html('<x-bmsui::sparkline :values="[5]" />'));
    }
}

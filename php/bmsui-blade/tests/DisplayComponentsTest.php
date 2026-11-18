<?php

namespace BMSuisse\BMSUi\Tests;

/** Alert box, badges, status dot, empty state, skeleton, spinner, kbd, card, metadata list, timestamp. */
class DisplayComponentsTest extends BladeTestCase
{
    public function testAlertBoxMapsErrorToDangerBanner()
    {
        $html = $this->html('<x-bmsui::alert-box tone="error" title="Not saved" :dismissible="true">Fix the fields</x-bmsui::alert-box>');
        $this->assertStringContainsString('bmsui-banner--danger', $html);
        $this->assertStringContainsString('bmsui-alert', $html);
        $this->assertStringContainsString('role="alert"', $html);
        $this->assertStringContainsString('data-bmsui-dismiss', $html);
    }

    public function testBadgeStatusBadgeAndDot()
    {
        $this->assertStringContainsString('class="bmsui-badge"', $this->html('<x-bmsui::badge>3</x-bmsui::badge>'));
        $this->assertStringContainsString('bmsui-badge--warning', $this->html('<x-bmsui::badge variant="warning">!</x-bmsui::badge>'));
        $s = $this->html('<x-bmsui::status-badge status="IN_REVIEW" />');
        $this->assertStringContainsString('bmsui-chip--warning', $s);
        $this->assertStringContainsString('In review', $s);
        $this->assertStringContainsString('data-status="in_review"', $s);
        $this->assertStringContainsString('bmsui-chip--danger', $this->html('<x-bmsui::status-badge status="failed" />'));
        $this->assertStringContainsString('bmsui-chip--info', $this->html('<x-bmsui::status-badge status="waiting" :tone-map="[\'Waiting\' => \'info\']" />'));
        $custom = $this->html('<x-bmsui::status-badge status="on_hold" :dot="true" />');
        $this->assertStringContainsString('On Hold', $custom);
        $this->assertStringContainsString('bmsui-status__dot', $custom);
        $this->assertStringNotContainsString('bmsui-chip--', $custom);
        $this->app->setLocale('de');
        $this->assertStringContainsString('Genehmigt', $this->html('<x-bmsui::status-badge status="approved" />'));
        $dot = $this->html('<x-bmsui::status-dot tone="success" label="Online" :pulse="true" />');
        $this->assertStringContainsString('role="img" aria-label="Online"', $dot);
        $this->assertStringContainsString('is-pulse', $dot);
        $this->assertStringContainsString('bmsui-dot__text', $this->html('<x-bmsui::status-dot tone="error">Offline</x-bmsui::status-dot>'));
    }

    public function testEmptyStateSkeletonAndSpinner()
    {
        $html = $this->html('<x-bmsui::empty-state title="No conversations" description="All done." size="sm">x<x-slot:action><a href="/new">New</a></x-slot:action></x-bmsui::empty-state>');
        $this->assertStringContainsString('bmsui-empty--sm', $html);
        $this->assertStringContainsString('bmsui-empty__icon', $html);
        $this->assertStringContainsString('href="/new"', $html);
        $this->assertStringNotContainsString('bmsui-empty__icon', $this->html('<x-bmsui::empty-state title="T" :show-icon="false" />'));
        $this->assertSame(3, substr_count($this->html('<x-bmsui::skeleton :lines="3" />'), 'bmsui-skeleton--text'));
        $this->assertStringContainsString('width: 120px;height: 2rem;', $this->html('<x-bmsui::skeleton :width="120" height="2rem" />'));
        $spin = $this->html('<x-bmsui::loading-spinner size="lg" />');
        $this->assertStringContainsString('role="status"', $spin);
        $this->assertStringContainsString('Loading…', $spin);
        $this->app->setLocale('de');
        $this->assertStringContainsString('Wird geladen', $this->html('<x-bmsui::loading-spinner />'));
    }

    public function testKbdAndKeyCombo()
    {
        $this->assertStringContainsString('<kbd class="bmsui-kbd">K</kbd>', $this->html('<x-bmsui::kbd>K</x-bmsui::kbd>'));
        $combo = $this->html('<x-bmsui::key-combo keys="mod+shift+k g i" />');
        $this->assertMatchesRegularExpression('/data-bmsui-mod\s*>Ctrl<\/kbd>/', $combo);
        $this->assertMatchesRegularExpression('/>Shift<\/kbd>/', $combo);
        $this->assertStringContainsString('>K</kbd>', $combo);
        $this->assertSame(2, substr_count($combo, 'bmsui-keys__then'));
    }

    public function testCardAndMetadataList()
    {
        $card = $this->html('<x-bmsui::card title="Keller AG" description="Customer" href="/c/1">Body<x-slot:actions><button>Edit</button></x-slot:actions><x-slot:footer>F</x-slot:footer></x-bmsui::card>');
        $this->assertStringContainsString('<h3 class="bmsui-card__title"><a href="/c/1">Keller AG</a></h3>', $card);
        $this->assertStringContainsString('bmsui-card__actions', $card);
        $this->assertStringContainsString('bmsui-card__foot', $card);
        $meta = $this->html('<x-bmsui::metadata-list :columns="2" :items="[[\'label\' => \'No.\', \'value\' => \'10412\', \'copy\' => true], [\'label\' => \'Phone\', \'value\' => null], [\'label\' => \'Web\', \'value\' => \'<b>x</b>\', \'href\' => \'https://x.ch\']]" />');
        $this->assertStringContainsString('<dl class="bmsui-meta bmsui-meta--horizontal bmsui-meta--cols-2">', $meta);
        $this->assertStringContainsString('data-bmsui-copy="10412"', $meta);
        $this->assertStringContainsString('&mdash;', $meta);
        $this->assertStringContainsString('Not set', $meta);
        $this->assertStringContainsString('href="https://x.ch"', $meta);
        $this->assertStringNotContainsString('<b>x</b>', $meta);
    }

    public function testTimestampFormatsAndLocale()
    {
        $now = \Illuminate\Support\Carbon::now();
        \Illuminate\Support\Carbon::setTestNow($now);
        $rel = $this->html('<x-bmsui::timestamp :value="$v" />', ['v' => $now->copy()->subMinutes(5)]);
        $this->assertStringContainsString('5 minutes ago', $rel);
        $this->assertStringContainsString('data-bmsui-relative', $rel);
        $this->assertStringContainsString('data-bmsui-tooltip=', $rel);
        $this->assertMatchesRegularExpression('/datetime="\d{4}-\d\d-\d\dT/', $rel);
        $this->app->setLocale('de');
        $this->assertStringContainsString('vor 5 Minuten', $this->html('<x-bmsui::timestamp :value="$v" />', ['v' => $now->copy()->subMinutes(5)]));
        $date = $this->html('<x-bmsui::timestamp value="2026-11-14 09:12:00" format="datetime" locale="de" :tooltip="false" />');
        $this->assertStringContainsString('14.11.2026 09:12', $date);
        $this->assertStringNotContainsString('data-bmsui-relative', $date);
        $this->assertStringContainsString('title=', $date);
        \Illuminate\Support\Carbon::setTestNow();
    }
}

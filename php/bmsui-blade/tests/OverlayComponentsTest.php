<?php

namespace BMSuisse\BMSUi\Tests;

/** Dialog, modal, confirm dialog, tabs, tooltip, popover. */
class OverlayComponentsTest extends BladeTestCase
{
    public function testDialogIsANativeDialogWithLabelledHeaderAndFooter()
    {
        $html = $this->html('<x-bmsui::dialog id="d1" title="Snooze" description="Pick a time" size="lg" url="/snooze/5" :static="true" :open="true">Body<x-slot:footer><button>OK</button></x-slot:footer></x-bmsui::dialog>');
        $this->assertStringContainsString('<dialog class="bmsui-dialog bmsui-dialog--lg" id="d1" data-bmsui-dialog', $html);
        $this->assertStringContainsString('aria-labelledby="d1-title"', $html);
        $this->assertStringContainsString('aria-describedby="d1-desc"', $html);
        $this->assertStringContainsString('data-url="/snooze/5"', $html);
        $this->assertStringContainsString('data-static', $html);
        $this->assertStringContainsString('data-open', $html);
        $this->assertStringContainsString('bmsui-dialog__foot', $html);
        $this->assertStringContainsString('data-bmsui-dialog-close aria-label="Close"', $html);
        $this->assertStringContainsString('bmsui-dialog--md', $this->html('<x-bmsui::modal id="m" title="T">x</x-bmsui::modal>'));
        $this->assertStringNotContainsString('bmsui-dialog__foot', $this->html('<x-bmsui::modal id="m">x</x-bmsui::modal>'));
    }

    public function testConfirmDialogFormAndEventModes()
    {
        $form = $this->html('<x-bmsui::confirm-dialog id="c" message="Delete it?" action="/x" method="DELETE" />');
        $this->assertStringContainsString('bmsui-dialog--confirm', $form);
        $this->assertStringContainsString('Delete it?', $form);
        $this->assertStringContainsString('name="_method" value="DELETE"', $form);
        $this->assertStringContainsString('bmsui-btn--danger', $form);
        $event = $this->html('<x-bmsui::confirm-dialog id="bmsui-confirm" tone="primary" confirm-label="Merge" />');
        $this->assertStringContainsString('data-bmsui-dialog-confirm', $event);
        $this->assertStringContainsString('bmsui-btn--primary', $event);
        $this->assertStringNotContainsString('<form', $event);
        $this->assertStringContainsString('value="cancel"', $event);
    }

    public function testTabsButtonsPanelsAndLinkMode()
    {
        $html = $this->html('<x-bmsui::tabs label="Settings" active="b" :tabs="[[\'id\' => \'a\', \'label\' => \'A\'], [\'id\' => \'b\', \'label\' => \'B\', \'count\' => 3], [\'id\' => \'c\', \'label\' => \'C\', \'disabled\' => true]]"><x-bmsui::tab-panel id="a">PA</x-bmsui::tab-panel><x-bmsui::tab-panel id="b">PB</x-bmsui::tab-panel></x-bmsui::tabs>');
        $this->assertMatchesRegularExpression('/role="tablist"\s+aria-label="Settings"/', $html);
        $this->assertMatchesRegularExpression('/aria-selected="true" tabindex="0" data-tab="b"/', $html);
        $this->assertMatchesRegularExpression('/data-tab-panel="a" tabindex="0"\s+hidden/', $html);
        $this->assertMatchesRegularExpression('/data-tab-panel="b" tabindex="0"\s*>PB/', $html);
        $this->assertStringContainsString('bmsui-tabs__count">3', $html);
        $links = $this->html('<x-bmsui::tabs active="x" :tabs="[[\'id\' => \'x\', \'label\' => \'X\', \'href\' => \'/x\'], [\'id\' => \'y\', \'label\' => \'Y\', \'href\' => \'/y\']]" />');
        $this->assertStringContainsString('<nav', $links);
        $this->assertStringContainsString('aria-current="page"', $links);
        $this->assertStringNotContainsString('role="tab"', $links);
    }

    public function testTooltipAndPopover()
    {
        $tip = $this->html('<x-bmsui::tooltip text="A &amp; B" side="bottom"><button>i</button></x-bmsui::tooltip>');
        $this->assertStringContainsString('data-bmsui-tooltip="A &amp;amp; B"', $tip);
        $this->assertStringContainsString('data-side="bottom"', $tip);
        $pop = $this->html('<x-bmsui::popover title="Customer" align="end" :width="320">Details<x-slot:trigger>Info</x-slot:trigger></x-bmsui::popover>');
        $this->assertStringContainsString('aria-expanded="false" aria-haspopup="dialog"', $pop);
        $this->assertStringContainsString('>Info</button>', $pop);
        $this->assertStringContainsString('bmsui-popover__panel--end', $pop);
        $this->assertStringContainsString('width: 320px', $pop);
        $this->assertMatchesRegularExpression('/role="dialog"\s+aria-label="Customer"[^>]*hidden/', $pop);
    }
}

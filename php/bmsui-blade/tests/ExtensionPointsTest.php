<?php

namespace BMSuisse\BMSUi\Tests;

/**
 * OneDesk/FreeScout extension points: attribute passthrough, hook slots, table mode,
 * list header/footer, star toggle, mail-message slots and the dropdown menu.
 */
class ExtensionPointsTest extends BladeTestCase
{
    public function testRowPassesAttributesToInnerElements()
    {
        $html = $this->html('<x-bmsui::conversation-row subject="S" href="/c/5" data-conversation_id="5" class="conv-row" :selected="false" select-name="conv[]" select-value="5" :checkbox-attributes="[\'class\' => \'conv-checkbox\', \'data-x\' => \'1\']" :link-attributes="[\'data-pjax\' => \'0\']" :starrable="true" :star-attributes="[\'class\' => \'conv-star\', \'data-conversation_id\' => 5]" />');
        $this->assertStringContainsString('data-conversation_id="5"', $html);
        $this->assertMatchesRegularExpression('/<li class="[^"]*bmsui-conv[^"]*conv-row/', $html);
        $this->assertMatchesRegularExpression('/<input type="checkbox" class="bmsui-conv__check conv-checkbox"[^>]*name="conv\[\]" value="5"[^>]*data-x="1"/', $html);
        $this->assertMatchesRegularExpression('/<a class="bmsui-conv__link" href="\/c\/5" data-pjax="0">/', $html);
        $this->assertMatchesRegularExpression('/<button type="button"[^>]*class="bmsui-conv__star-btn conv-star"[^>]*aria-pressed="false" data-bmsui-star/', $html);
        $on = $this->html('<x-bmsui::conversation-row subject="S" :starrable="true" :starred="true" />');
        $this->assertStringContainsString('aria-pressed="true"', $on);
        $this->assertStringContainsString('is-on', $on);
    }

    public function testRowHookSlots()
    {
        $html = $this->html('<x-bmsui::conversation-row subject="Subj" preview="Prev" :number="42"><x-slot:before-subject>BS</x-slot:before-subject><x-slot:after-subject>AS</x-slot:after-subject><x-slot:before-preview>BP</x-slot:before-preview><x-slot:before-number>BN</x-slot:before-number><x-slot:after-row>AR</x-slot:after-row></x-bmsui::conversation-row>');
        $order = array_map(fn ($n) => strpos($html, $n), ['BS', 'Subj', 'BP', 'Prev', 'AS', 'BN', '#42', 'AR']);
        $sorted = $order;
        sort($sorted);
        $this->assertSame($sorted, $order, 'slots render in hook order');
        $this->assertStringContainsString('bmsui-conv__after', $html);
    }

    public function testTableModeRendersRowsAsTableCells()
    {
        $html = $this->html('<x-bmsui::conversation-list as="table" :select-all="false" :select-all-attributes="[\'class\' => \'toggle-all\']" :count="2" :sorts="[[\'key\' => \'date\', \'label\' => \'Date\', \'dir\' => \'desc\'], [\'key\' => \'num\', \'label\' => \'#\', \'href\' => \'?s=n\']]" class="table-conversations"><x-bmsui::conversation-row subject="S" :selected="false" :number="7"><x-slot:before-number><td class="hook">H</td></x-slot:before-number><x-slot:after-row><tr class="extra"><td>X</td></tr></x-slot:after-row></x-bmsui::conversation-row><x-slot:pager><span class="pager-nav">1</span></x-slot:pager></x-bmsui::conversation-list>');
        $this->assertMatchesRegularExpression('/<table class="bmsui-convs bmsui-convs--table table-conversations">/', $html);
        $this->assertStringContainsString('<thead>', $html);
        $this->assertStringContainsString('<tbody>', $html);
        $this->assertStringContainsString('<tfoot>', $html);
        $this->assertMatchesRegularExpression('/<tr class="bmsui-conv">/', $html);
        $this->assertStringContainsString('<td class="hook">H</td>', $html);
        $this->assertMatchesRegularExpression('/<\/tr>\s*<tr class="extra">/', $html);
        $this->assertStringContainsString('<td class="bmsui-conv__cell bmsui-conv__num"', $html);
        $this->assertStringNotContainsString('<li', $html);
        $this->assertStringContainsString('class="bmsui-convs__all toggle-all"', $html);
        $this->assertStringContainsString('data-bmsui-sort="date" data-dir="desc" aria-pressed="true"', $html);
        $this->assertStringContainsString('href="?s=n"', $html);
        $this->assertStringContainsString('2 conversations', $html);
        $this->assertStringContainsString('pager-nav', $html);
    }

    public function testListModeStaysAPlainUlWithoutHeaderOrFooter()
    {
        $this->assertMatchesRegularExpression('/^<ul class="bmsui-convs x">/', trim($this->html('<x-bmsui::conversation-list class="x"></x-bmsui::conversation-list>')));
        $wrapped = $this->html('<x-bmsui::conversation-list class="x" :count="1"><x-slot:header>H</x-slot:header></x-bmsui::conversation-list>');
        $this->assertStringContainsString('bmsui-convs-wrap', $wrapped);
        $this->assertStringContainsString('<ul class="bmsui-convs x">', $wrapped);
        $this->assertStringContainsString('1 conversation<', $wrapped);
    }

    public function testMailMessageSlotsThreadIdAndMenu()
    {
        $html = $this->html('<x-bmsui::mail-message :sender="[\'name\' => \'A\']" :thread-id="99" :menu-items="[[\'id\' => \'fwd\', \'label\' => \'Forward\'], [\'separator\' => true], [\'id\' => \'orig\', \'label\' => \'Show original\', \'href\' => \'/o\']]">b<x-slot:meta>META</x-slot:meta><x-slot:action-text>ACT</x-slot:action-text></x-bmsui::mail-message>');
        $this->assertStringContainsString('data-thread-id="99"', $html);
        $this->assertStringContainsString('bmsui-msg__meta', $html);
        $this->assertStringContainsString('bmsui-msg__action', $html);
        $this->assertStringContainsString('data-bmsui-menu-item="fwd"', $html);
        $this->assertStringContainsString('aria-label="Message actions"', $html);
        $this->assertStringContainsString('role="separator"', $html);
        $own = $this->html('<x-bmsui::mail-message :sender="[]" :menu-items="[[\'id\' => \'x\', \'label\' => \'X\']]">b<x-slot:menu>OWN</x-slot:menu></x-bmsui::mail-message>');
        $this->assertStringContainsString('OWN', $own);
        $this->assertStringNotContainsString('data-bmsui-menu-item', $own);
        $this->assertStringContainsString('data-thread-id="3"', $this->html('<x-bmsui::mail-event :thread-id="3">x</x-bmsui::mail-event>'));
    }

    public function testDropdownMenuItemsSubmenuAndEscaping()
    {
        $html = $this->html('<x-bmsui::dropdown-menu label="Acts" align="end" :items="$i" />', ['i' => [
            ['heading' => 'Group'], ['id' => 'a', 'label' => '<b>A</b>', 'shortcut' => 'A'], ['id' => 'd', 'label' => 'Del', 'danger' => true, 'disabled' => true],
            ['label' => 'Move', 'items' => [['id' => 'm1', 'label' => 'Inbox']]], ['label' => 'Off', 'href' => '/x', 'disabled' => true],
        ]]);
        $this->assertStringContainsString('aria-label="Acts"', $html);
        $this->assertStringContainsString('bmsui-menu--end', $html);
        $this->assertStringContainsString('aria-haspopup="menu"', $html);
        $this->assertStringContainsString('data-bmsui-submenu', $html);
        $this->assertStringContainsString('data-bmsui-menu-item="m1"', $html);
        $this->assertStringContainsString('bmsui-menu__item--danger', $html);
        $this->assertStringContainsString('<kbd class="bmsui-menu__kbd">A</kbd>', $html);
        $this->assertStringNotContainsString('<b>A</b>', $html);
        $this->assertStringNotContainsString('href="/x"', $html, 'disabled links render as disabled buttons');
        $custom = $this->html('<x-bmsui::dropdown-menu><x-slot:trigger>Mehr</x-slot:trigger></x-bmsui::dropdown-menu>');
        $this->assertStringContainsString('Mehr', $custom);
        $this->assertStringNotContainsString('bmsui-btn--icon', $custom);
    }
}

<?php

namespace BMSuisse\BMSUi\Tests;

/** Combobox (single, multiple, ajax) and the tag combobox preset. */
class ComboboxTest extends BladeTestCase
{
    public function testSingleSelectShowsLabelAndHiddenValue()
    {
        $html = $this->html('<x-bmsui::combobox name="customer" id="c" value="2" :options="[\'1\' => \'Keller AG\', [\'value\' => \'2\', \'label\' => \'<b>Muster</b>\', \'description\' => \'Bern\']]" placeholder="Search" />');
        $this->assertStringContainsString('<input type="hidden" name="customer" value="2" data-bmsui-combo-value', $html);
        $this->assertStringContainsString('role="combobox"', $html);
        $this->assertStringContainsString('aria-controls="c-list"', $html);
        $this->assertStringContainsString('value="&lt;b&gt;Muster&lt;/b&gt;"', $html);
        $this->assertStringContainsString('role="listbox"', $html);
        $this->assertSame(2, substr_count($html, 'role="option"'));
        $this->assertMatchesRegularExpression('/data-value="2"[^>]*aria-selected="true"/', $html);
        $this->assertStringContainsString('Bern', $html);
        $this->assertStringNotContainsString('<b>Muster</b>', $html);
        $this->assertStringContainsString('data-bmsui-combo-clear', $html);
    }

    public function testMultipleRendersChipsWithArrayFieldsAndAjaxSource()
    {
        $html = $this->html('<x-bmsui::combobox name="tags" :multiple="true" :value="[\'7\', \'9\']" :selected="[[\'id\' => 7, \'text\' => \'VIP\']]" search-url="/tags/search?q={q}" :min-chars="2" :max-items="5" />');
        $this->assertStringContainsString('<input type="hidden" name="tags[]" value="7">', $html);
        $this->assertStringContainsString('<input type="hidden" name="tags[]" value="9">', $html);
        $this->assertStringContainsString('>VIP<', $html);
        $this->assertStringContainsString('data-url="/tags/search?q={q}"', $html);
        $this->assertStringContainsString('data-min="2"', $html);
        $this->assertStringContainsString('data-max="5"', $html);
        $this->assertStringContainsString('aria-multiselectable="true"', $html);
        $this->assertSame(2, substr_count($html, 'data-bmsui-combo-remove'));
        $this->assertStringNotContainsString('data-bmsui-combo-value', $html);
    }

    public function testTagComboboxPresetAndFormFieldWiring()
    {
        $tags = $this->html('<x-bmsui::tag-combobox name="t" :value="[\'neu\']" class="extra" />');
        $this->assertStringContainsString('data-multiple', $tags);
        $this->assertStringContainsString('data-creatable', $tags);
        $this->assertStringContainsString('extra', $tags);
        $field = $this->html('<x-bmsui::form-field label="Kunde" for="k" error="Pflicht"><x-bmsui::combobox name="k" /></x-bmsui::form-field>');
        $this->assertStringContainsString('id="k"', $field);
        $this->assertStringContainsString('aria-describedby="k-error"', $field);
        $this->assertStringContainsString('is-invalid', $field);
    }
}

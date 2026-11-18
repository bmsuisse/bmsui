<?php

namespace BMSuisse\BMSUi\Tests;

/** Button, label, form field, input, textarea, select, checkbox, switch, radio group. */
class FormComponentsTest extends BladeTestCase
{
    public function testButtonVariantsSizesLinksAndLoading()
    {
        $html = $this->html('<x-bmsui::button>Save</x-bmsui::button>');
        $this->assertStringContainsString('class="bmsui-btn bmsui-btn--primary bmsui-btn--md"', $html);
        $this->assertStringContainsString('type="button"', $html);
        $this->assertStringContainsString('bmsui-btn--ghost', $this->html('<x-bmsui::button variant="ghost" size="sm">x</x-bmsui::button>'));
        $this->assertStringNotContainsString('bmsui-btn--sm', $this->html('<x-bmsui::button size="sm">x</x-bmsui::button>'));
        $this->assertStringContainsString('bmsui-btn--square', $this->html('<x-bmsui::button :icon="true" aria-label="Edit">x</x-bmsui::button>'));
        $link = $this->html('<x-bmsui::button href="/x" variant="link">Go</x-bmsui::button>');
        $this->assertStringContainsString('<a ', $link);
        $this->assertStringContainsString('href="/x"', $link);
        $off = $this->html('<x-bmsui::button href="/x" :disabled="true">Go</x-bmsui::button>');
        $this->assertStringNotContainsString('href=', $off);
        $this->assertStringContainsString('aria-disabled="true"', $off);
        $busy = $this->html('<x-bmsui::button type="submit" :loading="true">Save</x-bmsui::button>');
        $this->assertStringContainsString('type="submit"', $busy);
        $this->assertStringContainsString('aria-busy="true"', $busy);
        $this->assertStringContainsString('disabled', $busy);
        $this->assertStringContainsString('bmsui-spin', $busy);
        $this->assertStringContainsString('<svg id="i"', $this->html('<x-bmsui::button>Save<x-slot:start><svg id="i"></svg></x-slot:start></x-bmsui::button>'));
    }

    public function testFormFieldWiresIdHelpAndErrorIntoTheControl()
    {
        $html = $this->html('<x-bmsui::form-field label="Name" for="n" help="Your name" error="Required" :required="true"><x-bmsui::input name="name" value="&lt;x&gt;" /></x-bmsui::form-field>');
        $this->assertMatchesRegularExpression('/<label for="n" class="bmsui-label">Name/', $html);
        $this->assertStringContainsString('bmsui-label__req', $html);
        $this->assertStringContainsString('id="n"', $html);
        $this->assertStringContainsString('aria-describedby="n-help n-error"', $html);
        $this->assertStringContainsString('aria-invalid="true"', $html);
        $this->assertMatchesRegularExpression('/id="n-error"\s+role="alert"/', $html);
        $this->assertStringContainsString('is-invalid', $html);
        $other = $this->html('<x-bmsui::form-field for="a" error="E"><x-bmsui::input id="b" /></x-bmsui::form-field>');
        $this->assertStringNotContainsString('aria-invalid', $other, 'a control with another id is not wired');
        $plain = $this->html('<x-bmsui::input name="q" type="search" placeholder="Find" />');
        $this->assertStringContainsString('type="search"', $plain);
        $this->assertStringNotContainsString('aria-describedby', $plain);
    }

    public function testTextareaAndSelect()
    {
        $ta = $this->html('<x-bmsui::textarea name="b" :auto-resize="true" :max-rows="8">{{ $v }}</x-bmsui::textarea>', ['v' => '<b>']);
        $this->assertStringContainsString('data-bmsui-autoresize="8"', $ta);
        $this->assertStringContainsString('&lt;b&gt;</textarea>', $ta);
        $sel = $this->html('<x-bmsui::select name="c" value="de" placeholder="Choose" :options="$o"><option value="x">X</option></x-bmsui::select>', ['o' => ['ch' => 'Schweiz', 'Nachbarn' => ['de' => 'Deutschland', 'at' => 'Österreich'], ['value' => 'it', 'label' => 'Italien', 'disabled' => true]]]);
        $this->assertStringContainsString('<option value="">Choose</option>', $sel);
        $this->assertStringContainsString('<optgroup label="Nachbarn">', $sel);
        $this->assertMatchesRegularExpression('/value="de"\s+selected/', $sel);
        $this->assertMatchesRegularExpression('/value="it"\s+disabled/', $sel);
        $this->assertStringContainsString('<option value="x">X</option>', $sel);
        $this->assertStringContainsString('bmsui-select__chev', $sel);
        $multi = $this->html('<x-bmsui::select name="m[]" multiple :value="[\'a\', \'b\']" :options="[\'a\' => \'A\', \'b\' => \'B\', \'c\' => \'C\']" />');
        $this->assertSame(2, substr_count($multi, 'selected'));
        $this->assertStringNotContainsString('bmsui-select__chev', $multi);
    }

    public function testCheckboxSwitchAndRadioGroupAreNativeInputs()
    {
        $cb = $this->html('<x-bmsui::checkbox name="n" label="Notify" description="By mail" :checked="true" :indeterminate="true" />');
        $this->assertStringContainsString('type="checkbox" value="1" class="bmsui-check__input" name="n"', $cb);
        $this->assertStringContainsString('checked', $cb);
        $this->assertStringContainsString('data-bmsui-indeterminate', $cb);
        $this->assertStringContainsString('By mail', $cb);
        $sw = $this->html('<x-bmsui::switch name="s" label="Active" disabled />');
        $this->assertStringContainsString('role="switch"', $sw);
        $this->assertStringContainsString('is-disabled', $sw);
        $rg = $this->html('<x-bmsui::radio-group name="st" label="Status" value="b" orientation="horizontal" :options="[\'a\' => \'A\', [\'value\' => \'b\', \'label\' => \'B\', \'description\' => \'Bee\'], [\'value\' => \'c\', \'label\' => \'C\', \'disabled\' => true]]" />');
        $this->assertSame(3, substr_count($rg, 'name="st"'));
        $this->assertStringContainsString('<legend', $rg);
        $this->assertMatchesRegularExpression('/value="b"\s+checked/', $rg);
        $this->assertStringContainsString('bmsui-radios--horizontal', $rg);
        $this->assertStringContainsString('Bee', $rg);
    }
}

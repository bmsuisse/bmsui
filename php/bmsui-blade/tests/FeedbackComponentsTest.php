<?php

namespace BMSuisse\BMSUi\Tests;

/** Toaster, command palette, date and date-time input. */
class FeedbackComponentsTest extends BladeTestCase
{
    public function testToasterCarriesInitialToastsAsJson()
    {
        $html = $this->html('<x-bmsui::toaster position="top-right" :toasts="[[\'tone\' => \'success\', \'title\' => \'<b>Saved</b>\']]" />');
        $this->assertStringContainsString('bmsui-toaster--top-right', $html);
        $this->assertStringContainsString('aria-live="polite"', $html);
        $this->assertStringContainsString('data-l-dismiss="Dismiss"', $html);
        $this->assertMatchesRegularExpression('/data-initial="\[\{&quot;tone&quot;:&quot;success&quot;/', $html);
        $this->assertStringNotContainsString('<b>Saved</b>', $html);
        $this->assertStringNotContainsString('data-initial', $this->html('<x-bmsui::toaster />'));
    }

    public function testCommandPaletteGroupsCommands()
    {
        $html = $this->html('<x-bmsui::command-palette :commands="[[\'id\' => \'new\', \'label\' => \'New conversation\', \'group\' => \'Actions\', \'href\' => \'/new\', \'shortcut\' => \'mod+n\', \'keywords\' => \'create\'], [\'id\' => \'dark\', \'label\' => \'Night mode\', \'group\' => \'Settings\']]" />');
        $this->assertStringContainsString('<dialog class="bmsui-dialog bmsui-cmdk" id="bmsui-commands"', $html);
        $this->assertStringContainsString('data-hotkey="mod+k"', $html);
        $this->assertSame(2, substr_count($html, 'role="option"'));
        $this->assertStringContainsString('data-href="/new"', $html);
        $this->assertStringContainsString('data-keywords="create"', $html);
        $this->assertStringContainsString('aria-label="Actions"', $html);
        $this->assertStringContainsString('data-bmsui-mod', $html);
        $this->assertStringNotContainsString('data-hotkey', $this->html('<x-bmsui::command-palette :hotkey="false" />'));
    }

    public function testDateInputsUseNativeTypesAndIsoValues()
    {
        $d = $this->html('<x-bmsui::date-input name="due" value="14.11.2026" min="2026-01-01" />');
        $this->assertStringContainsString('type="date"', $d);
        $this->assertStringContainsString('value="2026-11-14"', $d);
        $this->assertStringContainsString('min="2026-01-01"', $d);
        $this->assertStringNotContainsString('step=', $d);
        $dt = $this->html('<x-bmsui::date-time-input name="snooze" :value="$v" />', ['v' => new \DateTimeImmutable('2026-11-18 09:30:00')]);
        $this->assertStringContainsString('type="datetime-local"', $dt);
        $this->assertStringContainsString('value="2026-11-18T09:30"', $dt);
        $this->assertStringContainsString('step="60"', $dt);
        $this->assertStringNotContainsString('value=', $this->html('<x-bmsui::date-input name="x" value="" />'));
        $field = $this->html('<x-bmsui::form-field label="Snooze" for="s" error="Required"><x-bmsui::date-time-input name="s" /></x-bmsui::form-field>');
        $this->assertStringContainsString('id="s"', $field);
        $this->assertStringContainsString('aria-invalid="true"', $field);
    }
}

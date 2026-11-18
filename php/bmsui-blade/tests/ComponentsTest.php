<?php

namespace BMSuisse\BMSUi\Tests;

use Illuminate\Support\Facades\Blade;
use Orchestra\Testbench\TestCase;
use BMSuisse\BMSUi\BMSUiServiceProvider;

/**
 * The components render and escape their input; the service provider wires views and assets.
 */
class ComponentsTest extends TestCase
{
    protected function getPackageProviders($app)
    {
        return [BMSUiServiceProvider::class];
    }

    private function html(string $blade, array $data = []): string
    {
        return Blade::render($blade, $data);
    }

    public function testChipToneLinkAndEscaping()
    {
        $html = $this->html('<x-bmsui::chip tone="success" href="/x" removable>{{ $t }}</x-bmsui::chip>', ['t' => '<b>x</b>']);
        $this->assertStringContainsString('bmsui-chip--success', $html);
        $this->assertStringContainsString('<a ', $html);
        $this->assertStringContainsString('data-bmsui-dismiss', $html);
        $this->assertStringNotContainsString('<b>x</b>', $html);
    }

    public function testBannerRolesAndTitle()
    {
        $this->assertStringContainsString('role="alert"', $this->html('<x-bmsui::banner tone="danger">x</x-bmsui::banner>'));
        $this->assertStringContainsString('role="status"', $this->html('<x-bmsui::banner tone="info">x</x-bmsui::banner>'));
        $this->assertStringContainsString('bmsui-banner__title', $this->html('<x-bmsui::banner title="T">x</x-bmsui::banner>'));
    }

    public function testStatTrendClass()
    {
        $html = $this->html('<x-bmsui::stat-strip><x-bmsui::stat label="A" value="1" sub="s" trend="up"/></x-bmsui::stat-strip>');
        $this->assertStringContainsString('bmsui-stat__sub--up', $html);
        $this->assertStringContainsString('bmsui-stats', $html);
    }

    public function testTimelineItemBodyOptional()
    {
        $html = $this->html('<x-bmsui::timeline><x-bmsui::timeline-item title="A" time="now"/><x-bmsui::timeline-item title="B">body</x-bmsui::timeline-item></x-bmsui::timeline>');
        $this->assertSame(1, substr_count($html, 'class="bmsui-timeline__body"'));
        $this->assertStringContainsString('<ol', $html);
    }

    public function testCopyButtonCarriesValueAndLabel()
    {
        $html = $this->html('<x-bmsui::copy-button value="a&b" label="Copy it"/>');
        $this->assertStringContainsString('data-bmsui-copy="a&amp;b"', $html);
        $this->assertStringContainsString('Copy it', $html);
        $this->assertStringNotContainsString('bmsui-btn--icon', $html);
        $this->assertStringContainsString('bmsui-btn--icon', $this->html('<x-bmsui::copy-button value="x"/>'));
    }

    public function testConfirmFormAndEventModes()
    {
        $form = $this->html('<x-bmsui::confirm action="/del" method="DELETE">Delete</x-bmsui::confirm>');
        $this->assertStringContainsString('action="/del"', $form);
        $this->assertStringContainsString('name="_method" value="DELETE"', $form);
        $this->assertStringContainsString('name="_token"', $form);
        $this->assertStringNotContainsString('<form', $this->html('<x-bmsui::confirm>Delete</x-bmsui::confirm>'));
    }

    public function testAiButtonVariantsAndLoading()
    {
        $this->assertStringNotContainsString('bmsui-ai--solid', $this->html('<x-bmsui::ai-button variant="solid">x</x-bmsui::ai-button>'));
        $this->assertStringContainsString('bmsui-ai--ghost', $this->html('<x-bmsui::ai-button variant="ghost">x</x-bmsui::ai-button>'));
        $busy = $this->html('<x-bmsui::ai-button :loading="true">x</x-bmsui::ai-button>');
        $this->assertStringContainsString('aria-busy="true"', $busy);
        $this->assertStringContainsString('disabled', $busy);
    }

    public function testBrandLabels()
    {
        $this->assertStringContainsString('aria-label="OneDesk"', $this->html('<x-bmsui::brand/>'));
        $this->assertStringContainsString('aria-label="One"', $this->html('<x-bmsui::brand mode="one"/>'));
        $this->assertStringContainsString('aria-label="O"', $this->html('<x-bmsui::brand mode="mark"/>'));
        $this->assertStringContainsString('bmsui-brand--animate', $this->html('<x-bmsui::brand :animate="true"/>'));
    }

    public function testAssetsDirectiveEmitsTags()
    {
        $this->assertStringContainsString('vendor/bmsui/bmsui.css', $this->html('@bmsuiAssets("css")'));
        $this->assertStringNotContainsString('<script', $this->html('@bmsuiAssets("css")'));
        $this->assertStringContainsString('vendor/bmsui/bmsui.js', $this->html('@bmsuiAssets("js")'));
        $both = $this->html('@bmsuiAssets');
        $this->assertStringContainsString('<link', $both);
        $this->assertStringContainsString('<script', $both);
    }

    public function testAssetFilesExistForHostPipelines()
    {
        $this->assertFileExists(\BMSuisse\BMSUi\BMSUi::cssPath());
        $this->assertFileExists(\BMSuisse\BMSUi\BMSUi::jsPath());
    }

    public function testPreviewRendersEveryComponent()
    {
        $html = view('bmsui::preview', ['dark' => true])->render();
        foreach (['bmsui-chip', 'bmsui-banner', 'bmsui-stats', 'bmsui-timeline', 'bmsui-copy', 'bmsui-confirm', 'bmsui-ai', 'bmsui-brand', 'bmsui-emails', 'bmsui-split', 'bmsui-convs', 'bmsui-att', 'bmsui-quote', 'bmsui-msg', 'bmsui-event'] as $c) {
            $this->assertStringContainsString($c, $html);
        }
        $this->assertStringContainsString('class="dm"', $html);
    }

    public function testEmailAddressInputChipsAndHiddenValue()
    {
        $html = $this->html('<x-bmsui::email-address-input name="to" :value="$v" :max-items="3"><x-slot:label>An</x-slot:label></x-bmsui::email-address-input>', ['v' => ['a@b.ch', 'nope']]);
        $this->assertStringContainsString('name="to" value="a@b.ch,nope"', $html);
        $this->assertSame(1, substr_count($html, 'bmsui-chip--danger'));
        $this->assertStringContainsString('aria-invalid="true"', $html);
        $this->assertStringContainsString('data-max="3"', $html);
        $this->assertStringContainsString('role="group"', $html);
        $this->assertStringContainsString('>An</label>', $html);
        $this->assertStringContainsString('Invalid email address', $html);
        $this->assertStringContainsString('<datalist', $this->html('<x-bmsui::email-address-input name="x" :suggestions="[[\'email\' => \'a@b.ch\']]"/>'));
    }

    public function testEmailHelpers()
    {
        $r = \BMSuisse\BMSUi\BMSUi::parseEmailAddresses('Anna <a@b.ch>; A@B.ch, oops c@d.ch');
        $this->assertSame(['a@b.ch', 'c@d.ch'], $r['valid']);
        $this->assertSame(['oops'], $r['invalid']);
        $this->assertTrue(\BMSuisse\BMSUi\BMSUi::isValidEmail('x@y.ch'));
        $this->assertFalse(\BMSuisse\BMSUi\BMSUi::isValidEmail('x@y'));
    }

    public function testSplitButtonMenuAndEscaping()
    {
        $html = $this->html('<x-bmsui::split-button :items="$i" variant="outline" menu-label="Mehr">Senden</x-bmsui::split-button>', ['i' => [
            ['id' => 'close', 'label' => '<b>Close</b>'], ['id' => 'x', 'label' => 'Link', 'href' => '/l'], ['id' => 'd', 'label' => 'Del', 'danger' => true, 'disabled' => true],
        ]]);
        $this->assertStringContainsString('bmsui-split--outline', $html);
        $this->assertStringContainsString('aria-label="Mehr"', $html);
        $this->assertStringContainsString('aria-haspopup="menu"', $html);
        $this->assertStringContainsString('data-bmsui-split-item="close"', $html);
        $this->assertStringContainsString('href="/l"', $html);
        $this->assertStringContainsString('bmsui-split__item--danger', $html);
        $this->assertStringNotContainsString('<b>Close</b>', $html);
        $this->assertStringContainsString('aria-busy="true"', $this->html('<x-bmsui::split-button :loading="true">x</x-bmsui::split-button>'));
    }

    public function testConversationRowStatesAndLink()
    {
        $html = $this->html('<x-bmsui::conversation-list><x-bmsui::conversation-row subject="S" preview="P" href="/c/1" :customer="[\'name\' => \'Keller AG\']" status="pending" :unread="true" :starred="true" :has-attachments="true" :thread-count="3" time="09:12" :selected="false"><span>tag</span></x-bmsui::conversation-row></x-bmsui::conversation-list>');
        $this->assertStringContainsString('<ul', $html);
        $this->assertStringContainsString('is-unread', $html);
        $this->assertStringContainsString('<a class="bmsui-conv__link" href="/c/1">', $html);
        $this->assertStringContainsString('bmsui-chip--warning', $html);
        $this->assertStringContainsString('type="checkbox"', $html);
        $this->assertStringContainsString('bmsui-conv__tags', $html);
        $this->assertStringContainsString('Has attachments', $html);
        $plain = $this->html('<x-bmsui::conversation-row subject="<i>S</i>" />');
        $this->assertStringNotContainsString('type="checkbox"', $plain);
        $this->assertStringNotContainsString('<a ', $plain);
        $this->assertStringNotContainsString('<i>S</i>', $plain);
    }

    public function testAttachmentListSizesIconsAndRemove()
    {
        $items = [['id' => 1, 'name' => 'a.pdf', 'size' => 1258291, 'href' => '/d'], ['id' => 2, 'name' => 'b.png', 'mimeType' => 'image/png', 'thumbnailUrl' => '/t.png']];
        $html = $this->html('<x-bmsui::attachment-list :attachments="$a" :removable="true"/>', ['a' => $items]);
        $this->assertStringContainsString('1.2 MB', $html);
        $this->assertStringContainsString('bmsui-att__icon--pdf', $html);
        $this->assertStringContainsString('bmsui-att__thumb', $html);
        $this->assertSame(2, substr_count($html, 'data-bmsui-attachment-remove'));
        $this->assertStringContainsString('2 attachments', $html);
        $this->assertSame('', trim($this->html('<x-bmsui::attachment-list :attachments="[]"/>')));
        $this->assertSame('1,2 MB', \BMSuisse\BMSUi\BMSUi::formatFileSize(1258291, 'de-DE'));
        $this->assertSame('512 B', \BMSuisse\BMSUi\BMSUi::formatFileSize(512));
    }

    public function testQuotedTextAriaWiring()
    {
        $html = $this->html('<x-bmsui::quoted-text id="q1">hist</x-bmsui::quoted-text>');
        $this->assertStringContainsString('aria-expanded="false"', $html);
        $this->assertStringContainsString('aria-controls="q1"', $html);
        $this->assertMatchesRegularExpression('/id="q1"\s+hidden/', $html);
        $open = $this->html('<x-bmsui::quoted-text :open="true">hist</x-bmsui::quoted-text>');
        $this->assertStringContainsString('aria-expanded="true"', $open);
        $this->assertStringNotContainsString('hidden>', $open);
    }

    public function testMailMessageDirectionsStatusAndSlots()
    {
        $base = ':sender="[\'name\' => \'Anna <x>\', \'email\' => \'a@b.ch\']" time="now"';
        $in = $this->html('<x-bmsui::mail-message '.$base.' subject="Offerte" :recipients="[\'to\' => [\'p@q.ch\']]"><p>Body</p><x-slot:quoted>old</x-slot:quoted><x-slot:actions>ACT</x-slot:actions></x-bmsui::mail-message>');
        $this->assertStringContainsString('bmsui-msg--inbound', $in);
        $this->assertStringContainsString('Anna &lt;x&gt;', $in);
        $this->assertStringContainsString('<p>Body</p>', $in);
        $this->assertStringContainsString('bmsui-quote', $in);
        $this->assertStringContainsString('bmsui-msg__actions', $in);
        $this->assertStringContainsString('to:</b> p@q.ch', $in);
        $failed = $this->html('<x-bmsui::mail-message direction="outbound" '.$base.' status="failed" error="SMTP" retry-href="/r">b</x-bmsui::mail-message>');
        $this->assertStringContainsString('is-failed', $failed);
        $this->assertStringContainsString('href="/r"', $failed);
        $this->assertStringContainsString('SMTP', $failed);
        $this->assertStringContainsString('[Draft]', $this->html('<x-bmsui::mail-message '.$base.' status="draft">b</x-bmsui::mail-message>'));
        $note = $this->html('<x-bmsui::mail-message direction="note" '.$base.'>b</x-bmsui::mail-message>');
        $this->assertStringContainsString('bmsui-msg--note', $note);
        $many = $this->html('<x-bmsui::mail-message '.$base.' :recipients="[\'to\' => [\'a@a.ch\',\'b@a.ch\',\'c@a.ch\'], \'cc\' => [\'d@a.ch\']]">b</x-bmsui::mail-message>');
        $this->assertStringContainsString('<details', $many);
        $this->assertStringContainsString('+2', $many);
    }

    public function testMailEventToneAndTime()
    {
        $html = $this->html('<x-bmsui::mail-event tone="danger" time="14:00">A &lt;b&gt;</x-bmsui::mail-event>');
        $this->assertStringContainsString('bmsui-event--danger', $html);
        $this->assertStringContainsString('<time', $html);
        $this->assertStringNotContainsString('<time', $this->html('<x-bmsui::mail-event>x</x-bmsui::mail-event>'));
    }
}

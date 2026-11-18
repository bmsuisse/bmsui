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
        foreach (['bmsui-chip', 'bmsui-banner', 'bmsui-stats', 'bmsui-timeline', 'bmsui-copy', 'bmsui-confirm', 'bmsui-ai', 'bmsui-brand'] as $c) {
            $this->assertStringContainsString($c, $html);
        }
        $this->assertStringContainsString('class="dm"', $html);
    }
}

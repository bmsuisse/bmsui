<?php

namespace BMSuisse\BMSUi;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

/**
 * Registers `<x-bmsui::chip>`, `<x-bmsui::banner>` ... and the `@bmsuiAssets` directive.
 * Publish the CSS/JS with `php artisan vendor:publish --tag=bmsui-assets`
 * (to public/vendor/bmsui), or point your own asset pipeline at BMSUi::cssPath()/jsPath().
 */
class BMSUiServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $views = BMSUi::viewsPath();

        $this->loadViewsFrom($views, 'bmsui');
        Blade::anonymousComponentPath($views.'/components', 'bmsui');

        // de/fr/it/nl/es for every default text (English keys are the source strings).
        $this->loadJsonTranslationsFrom(BMSUi::langPath());

        $this->publishes([
            BMSUi::cssPath() => public_path('vendor/bmsui/bmsui.css'),
            BMSUi::jsPath() => public_path('vendor/bmsui/bmsui.js'),
        ], 'bmsui-assets');

        // <head>: @bmsuiAssets("css"), before </body>: @bmsuiAssets("js"); no argument = both.
        Blade::directive('bmsuiAssets', function ($expression) {
            return "<?php echo \\BMSuisse\\BMSUi\\BMSUiServiceProvider::tags({$expression}); ?>";
        });
    }

    public static function tags(?string $which = null): string
    {
        $css = '<link rel="stylesheet" href="'.e(asset('vendor/bmsui/bmsui.css')).'">';
        $js = '<script src="'.e(asset('vendor/bmsui/bmsui.js')).'" defer></script>';

        return match ($which) {
            'css' => $css,
            'js' => $js,
            default => $css.$js,
        };
    }
}

@php
    $assets = $assets ?? asset('vendor/bmsui');
    $bootstrap = $bootstrap ?? null;
    $dark = $dark ?? (bool) request('dm');
    $width = $width ?? null;
@endphp
<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BMS UI preview</title>
    @if($bootstrap)<link rel="stylesheet" href="{{ $bootstrap }}">@endif
    <link rel="stylesheet" href="{{ $assets }}/bmsui.css">
    <style>
        body { margin: 0; padding: 24px; background: #f2f3f5; font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; }
        body.dm { background: #14171b; color: #e6e9ee; }
        .pv { max-width: {{ $width ?: '880px' }}; margin: 0 auto; }
        .pv h2 { margin: 28px 0 10px; font-size: 13px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: #6b7685; }
        .dm .pv h2 { color: #a3adba; }
        .pv .row-flex { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .pv .card { padding: 16px; background: #fff; border-radius: 6px; border: 1px solid rgba(31,41,51,.12); }
        .dm .pv .card { background: #1d2127; border-color: #343b45; }
        .pv .pad { min-height: 96px; }
    </style>
</head>
<body class="{{ $dark ? 'dm' : '' }}">
<div class="pv">
    <div class="card row-flex" style="margin-bottom:8px"><x-bmsui::brand product="Desk" :size="40" :animate="true" /><x-bmsui::brand product="Desk" mode="one" :size="28" /><x-bmsui::brand mode="mark" :size="28" /></div>

    <h2>Chip</h2>
    <div class="card row-flex">
        <x-bmsui::chip>Neutral</x-bmsui::chip>
        <x-bmsui::chip tone="info">Info</x-bmsui::chip>
        <x-bmsui::chip tone="success">Erledigt</x-bmsui::chip>
        <x-bmsui::chip tone="warning">Wartet auf Kunde</x-bmsui::chip>
        <x-bmsui::chip tone="danger">Eskaliert</x-bmsui::chip>
        <x-bmsui::chip href="#" removable>Keller Haustechnik AG</x-bmsui::chip>
        <x-bmsui::chip removable tone="info">verkauf@muster-ag.ch</x-bmsui::chip>
    </div>

    <h2>Banner</h2>
    <div class="card">
        <x-bmsui::banner tone="info" title="Neue Version verfuegbar">Bitte laden Sie die Seite neu, um die Aenderungen zu sehen.</x-bmsui::banner>
        <x-bmsui::banner tone="success" dismissible>Konversation wurde erfolgreich zugewiesen.</x-bmsui::banner>
        <x-bmsui::banner tone="warning" title="Postfach nicht erreichbar">Der letzte Abruf ist fehlgeschlagen. Neue E-Mails erscheinen verzoegert.</x-bmsui::banner>
        <x-bmsui::banner tone="danger" dismissible style="margin-bottom:0">Versand fehlgeschlagen: SMTP-Verbindung wurde abgelehnt.</x-bmsui::banner>
    </div>

    <h2>Stat strip</h2>
    <x-bmsui::stat-strip>
        <x-bmsui::stat label="Offen" value="128" sub="+12 seit gestern" trend="down" />
        <x-bmsui::stat label="Erste Antwort" value="1 h 24 min" sub="-8 min" trend="up" />
        <x-bmsui::stat label="Umsatz Anfragen" value="CHF 1'234'567.89" sub="Monat bis heute" />
        <x-bmsui::stat label="Zufriedenheit" value="94 %" />
    </x-bmsui::stat-strip>

    <h2>Timeline</h2>
    <div class="card">
        <x-bmsui::timeline>
            <x-bmsui::timeline-item title="Konversation geschlossen" time="14.11.2026 16:40" tone="success">Loesung bestaetigt vom Kunden.</x-bmsui::timeline-item>
            <x-bmsui::timeline-item title="Antwort gesendet" time="14.11.2026 09:12" tone="accent">Offerte 2026-0412 wurde per E-Mail verschickt.</x-bmsui::timeline-item>
            <x-bmsui::timeline-item title="Zugewiesen an Anna Meier" time="13.11.2026 17:05" />
            <x-bmsui::timeline-item title="Erstellt aus E-Mail" time="13.11.2026 16:58" tone="warning" />
        </x-bmsui::timeline>
    </div>

    <h2>Copy button, AI button, Confirm</h2>
    <div class="card row-flex pad">
        <x-bmsui::copy-button value="OFF-2026-0412" aria-label="Referenz kopieren" />
        <x-bmsui::copy-button value="verkauf@muster-ag.ch" label="E-Mail kopieren" />
        <x-bmsui::ai-button variant="solid">Antwort entwerfen</x-bmsui::ai-button>
        <x-bmsui::ai-button>Umschreiben</x-bmsui::ai-button>
        <x-bmsui::ai-button variant="ghost">Tags vorschlagen</x-bmsui::ai-button>
        <x-bmsui::ai-button :loading="true">Wird erstellt</x-bmsui::ai-button>
        <x-bmsui::confirm message="Konversation endgueltig loeschen?" confirm-label="Loeschen" cancel-label="Abbrechen">Loeschen</x-bmsui::confirm>
    </div>
</div>
<script src="{{ $assets }}/bmsui.js"></script>
</body>
</html>

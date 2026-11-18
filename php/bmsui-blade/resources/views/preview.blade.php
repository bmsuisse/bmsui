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

    <h2>Email address input, split button</h2>
    <div class="card">
        <x-bmsui::email-address-input name="to" :value="['anna.meier@muster-ag.ch', 'verkauf@muster-ag.ch', 'kein-gueltige-adresse']" placeholder="Adresse eingeben" :suggestions="[['email' => 'info@keller-haustechnik.ch', 'name' => 'Keller Haustechnik AG']]">
            <x-slot:label>An</x-slot:label>
        </x-bmsui::email-address-input>
        <div class="row-flex" style="min-height:120px;align-items:flex-start">
            <x-bmsui::split-button :items="[['id' => 'close', 'label' => 'Senden und schliessen'], ['id' => 'later', 'label' => 'Spaeter senden'], ['id' => 'draft', 'label' => 'Entwurf verwerfen', 'danger' => true]]" menu-label="Weitere Aktionen">Senden</x-bmsui::split-button>
            <x-bmsui::split-button variant="outline" :items="[['id' => 'a', 'label' => 'Als Notiz speichern']]">Antworten</x-bmsui::split-button>
            <x-bmsui::split-button variant="secondary" :loading="true" :items="[]">Wird gesendet</x-bmsui::split-button>
        </div>
    </div>

    <h2>Conversation list</h2>
    <x-bmsui::conversation-list :select-all="false" :sorts="[['key' => 'date', 'label' => 'Datum', 'dir' => 'desc'], ['key' => 'customer', 'label' => 'Kunde']]" :count="4">
        <x-bmsui::conversation-row subject="Offerte 2026-0412" preview="Guten Tag, anbei die Offerte fuer die Heizungsanlage" href="#" :customer="['name' => 'Keller Haustechnik AG']" :assignee="['name' => 'Anna Meier']" status="active" :unread="true" :starred="true" :starrable="true" :number="10412" :thread-count="4" :has-attachments="true" time="09:12" :selected="false">
            <x-bmsui::chip tone="info">Offerte</x-bmsui::chip>
        </x-bmsui::conversation-row>
        <x-bmsui::conversation-row subject="Lieferverzug Bestellung 88213, bitte um dringende Rueckmeldung zum Liefertermin" preview="Wir warten seit zwei Wochen auf die Ware" href="#" :customer="['name' => 'Muster AG']" status="pending" time="Gestern" :selected="true" />
        <x-bmsui::conversation-row subject="Reklamation Rechnung" href="#" :customer="['name' => 'Beat Huber']" :assignee="['name' => 'Peter Frei']" status="closed" time="14.11.2026" />
        <x-bmsui::conversation-row subject="Gewinnspiel jetzt teilnehmen" :customer="['name' => 'noreply@promo.example']" status="spam" time="12.11.2026" />
    </x-bmsui::conversation-list>

    <h2>Conversation list as table (FreeScout markup)</h2>
    <x-bmsui::conversation-list as="table" class="table-conversations" :select-all="false" :select-all-attributes="['class' => 'toggle-all']" :count="2">
        <x-bmsui::conversation-row class="conv-row" data-conversation_id="1" subject="Offerte 2026-0412" preview="Anbei die Offerte" href="#" :customer="['name' => 'Keller Haustechnik AG']" status="active" :unread="true" :starrable="true" :star-attributes="['class' => 'conv-star']" :number="10412" time="09:12" :selected="false" :checkbox-attributes="['class' => 'conv-checkbox']">
            <x-slot:before-subject><x-bmsui::chip tone="danger">Hoch</x-bmsui::chip></x-slot:before-subject>
        </x-bmsui::conversation-row>
        <x-bmsui::conversation-row class="conv-row" data-conversation_id="2" subject="Reklamation Rechnung" href="#" :customer="['name' => 'Beat Huber']" status="closed" :starrable="true" :starred="true" :number="10388" time="Gestern" :selected="true" />
        <x-slot:pager><span class="table-pager">1&ndash;2 von 2</span></x-slot:pager>
    </x-bmsui::conversation-list>

    <h2>Mail message, quoted text, attachments, events</h2>
    <x-bmsui::mail-message direction="inbound" :thread-id="501" :menu-items="[['id' => 'forward', 'label' => 'Weiterleiten'], ['id' => 'original', 'label' => 'Original anzeigen', 'href' => '#'], ['id' => 'print', 'label' => 'Drucken'], ['separator' => true], ['id' => 'outgoing', 'label' => 'Ausgehende E-Mails']]" :sender="['name' => 'Anna Meier', 'email' => 'anna.meier@keller-haustechnik.ch']" :recipients="['to' => ['verkauf@muster-ag.ch'], 'cc' => ['buchhaltung@keller-haustechnik.ch']]" time="14.11.2026 09:12" subject="Offerte 2026-0412" :attachments="[['id' => 1, 'name' => 'Offerte_2026-0412_Heizungsanlage_final_v3.pdf', 'size' => 1258291, 'mimeType' => 'application/pdf', 'href' => '#'], ['id' => 2, 'name' => 'Preise.xlsx', 'size' => 48211], ['id' => 3, 'name' => 'Fotos.zip', 'size' => 9876543]]">
        <p style="margin:0">Guten Tag, vielen Dank fuer die Offerte. Wir haben noch zwei Fragen zu den Lieferzeiten: https://muster-ag.example/produkte/heizung/sehr/lange/url/die/nicht/umbricht</p>
        <x-slot:quoted>Am 13.11.2026 schrieb Muster AG: Guten Tag Frau Meier, anbei die gewuenschte Offerte.</x-slot:quoted>
        <x-slot:actions><button type="button" class="bmsui-btn">Antworten</button><button type="button" class="bmsui-btn">Weiterleiten</button></x-slot:actions>
    </x-bmsui::mail-message>
    <x-bmsui::mail-event time="13.11.2026 17:05">Anna Meier hat die Konversation Peter Frei zugewiesen</x-bmsui::mail-event>
    <x-bmsui::mail-event tone="success" time="13.11.2026 17:20">Status geaendert: Geschlossen</x-bmsui::mail-event>
    <x-bmsui::mail-message direction="outbound" :sender="['name' => 'Peter Frei']" :recipients="['to' => ['anna.meier@keller-haustechnik.ch', 'a@b.ch', 'c@d.ch'], 'cc' => ['e@f.ch', 'g@h.ch']]" time="14.11.2026 10:40" status="failed" error="SMTP-Verbindung abgelehnt">
        <p style="margin:0">Gerne passen wir die Lieferzeit an.</p>
    </x-bmsui::mail-message>
    <x-bmsui::mail-message direction="note" :sender="['name' => 'Peter Frei']" time="14.11.2026 11:02">
        <p style="margin:0">Kunde hat telefonisch bestaetigt.</p>
    </x-bmsui::mail-message>
    <x-bmsui::mail-message direction="outbound" :sender="['name' => 'Peter Frei']" time="gerade" status="draft"><p style="margin:0">Entwurf der Antwort</p></x-bmsui::mail-message>
    <x-bmsui::mail-event tone="warning" time="14.11.2026 11:05">Erinnerung faellig</x-bmsui::mail-event>
    <div class="card"><x-bmsui::attachment-list layout="chips" :removable="true" :attachments="[['id' => 1, 'name' => 'Skizze.png', 'size' => 20480, 'mimeType' => 'image/png'], ['id' => 2, 'name' => 'Vertrag.docx', 'size' => 33000]]" /></div>
    <div class="card" style="margin-top:8px"><x-bmsui::quoted-text :open="true">Am 13.11.2026 schrieb Muster AG: ...</x-bmsui::quoted-text></div>
</div>
<script src="{{ $assets }}/bmsui.js"></script>
</body>
</html>

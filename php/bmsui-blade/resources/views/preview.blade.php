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

    <h2>Button</h2>
    <div class="card">
        <div class="row-flex">
            <x-bmsui::button>Speichern</x-bmsui::button>
            <x-bmsui::button variant="secondary">Entwurf</x-bmsui::button>
            <x-bmsui::button variant="outline">Abbrechen</x-bmsui::button>
            <x-bmsui::button variant="ghost">Mehr</x-bmsui::button>
            <x-bmsui::button variant="link" href="#">Details</x-bmsui::button>
            <x-bmsui::button variant="danger">Loeschen</x-bmsui::button>
            <x-bmsui::button :loading="true">Wird gespeichert</x-bmsui::button>
            <x-bmsui::button variant="outline" :disabled="true">Gesperrt</x-bmsui::button>
        </div>
        <div class="row-flex" style="margin-top:10px">
            <x-bmsui::button size="xs" variant="outline">XS</x-bmsui::button>
            <x-bmsui::button size="sm" variant="outline">SM</x-bmsui::button>
            <x-bmsui::button size="md" variant="outline">MD</x-bmsui::button>
            <x-bmsui::button size="lg" variant="outline">LG</x-bmsui::button>
            <x-bmsui::button variant="outline" :icon="true" aria-label="Bearbeiten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.86 4.49l1.69-1.69a1.88 1.88 0 112.65 2.65L10.58 16.07a4.5 4.5 0 01-1.9 1.13L6 18l.8-2.68a4.5 4.5 0 011.13-1.9l8.93-8.93z"/></svg></x-bmsui::button>
            <x-bmsui::dropdown-menu label="Aktionen" :items="[['id' => 'fwd', 'label' => 'Weiterleiten', 'shortcut' => 'F'], ['id' => 'print', 'label' => 'Drucken'], ['separator' => true], ['label' => 'Verschieben nach', 'items' => [['id' => 'in', 'label' => 'Posteingang'], ['id' => 'arch', 'label' => 'Archiv']]], ['id' => 'del', 'label' => 'Loeschen', 'danger' => true]]" />
        </div>
    </div>

    <h2>Form fields</h2>
    <div class="card">
        <x-bmsui::form-field label="Betreff" for="pv-subject" help="Erscheint in der Konversationsliste." :required="true"><x-bmsui::input name="subject" value="Offerte 2026-0412" /></x-bmsui::form-field>
        <x-bmsui::form-field label="E-Mail" for="pv-mail" error="Bitte eine gueltige Adresse eingeben."><x-bmsui::input type="email" name="mail" value="anna@" /></x-bmsui::form-field>
        <x-bmsui::form-field label="Postfach" for="pv-mailbox"><x-bmsui::select name="mailbox" value="verkauf" :options="['verkauf' => 'Verkauf', 'support' => 'Support', 'Archiv' => ['alt' => 'Altes Postfach']]" /></x-bmsui::form-field>
        <x-bmsui::form-field label="Notiz" for="pv-note" layout="horizontal"><x-bmsui::textarea name="note" :auto-resize="true" :max-rows="6" placeholder="Interne Notiz"></x-bmsui::textarea></x-bmsui::form-field>
        <div class="row-flex" style="gap:24px;align-items:flex-start">
            <div style="display:flex;flex-direction:column;gap:8px">
                <x-bmsui::checkbox name="n1" label="Benachrichtigen" :checked="true" />
                <x-bmsui::checkbox name="n2" label="Alle auswaehlen" :indeterminate="true" />
                <x-bmsui::checkbox name="n3" label="Signatur anhaengen" description="Unter jeder Antwort" />
                <x-bmsui::checkbox name="n4" label="Gesperrt" disabled />
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
                <x-bmsui::switch name="s1" label="Automatische Antwort" :checked="true" />
                <x-bmsui::switch name="s2" label="Abwesenheit" description="Ab 20.11.2026" />
            </div>
            <x-bmsui::radio-group name="prio" label="Prioritaet" value="normal" :options="['low' => 'Tief', 'normal' => 'Normal', ['value' => 'high', 'label' => 'Hoch', 'description' => 'Erscheint oben']]" />
        </div>
    </div>

    <h2>Combobox, tag combobox</h2>
    <div class="card" style="min-height:300px">
        <div class="row-flex" style="align-items:flex-start">
            <div style="flex:1 1 260px"><x-bmsui::form-field label="Kunde" for="pv-customer"><x-bmsui::combobox name="customer" value="2" placeholder="Kunde suchen" :options="[['value' => '1', 'label' => 'Keller Haustechnik AG', 'description' => 'Zuerich'], ['value' => '2', 'label' => 'Muster AG', 'description' => 'Bern'], ['value' => '3', 'label' => 'Beat Huber'], ['value' => '4', 'label' => 'Gesperrter Kunde', 'disabled' => true]]" /></x-bmsui::form-field></div>
            <div style="flex:1 1 260px"><x-bmsui::form-field label="Tags" for="pv-tags"><x-bmsui::tag-combobox name="tags" :value="['offerte', 'vip']" :selected="[['value' => 'offerte', 'label' => 'Offerte'], ['value' => 'vip', 'label' => 'VIP']]" search-url="/bmsui-demo/tags" placeholder="Tag hinzufuegen" /></x-bmsui::form-field></div>
        </div>
    </div>

    <h2>Dialog, confirm dialog, tabs, tooltip, popover</h2>
    <div class="card pad">
        <div class="row-flex">
            <x-bmsui::button variant="outline" data-bmsui-dialog-open="#pv-dialog">Dialog oeffnen</x-bmsui::button>
            <x-bmsui::button variant="outline" data-bmsui-dialog-open="#pv-confirm">Loeschen bestaetigen</x-bmsui::button>
            <x-bmsui::tooltip text="Konversation an eine andere Person zuweisen"><x-bmsui::button variant="ghost">Zuweisen</x-bmsui::button></x-bmsui::tooltip>
            <x-bmsui::popover title="Keller Haustechnik AG" :width="260">
                <x-slot:trigger>Kundeninfo</x-slot:trigger>
                Kunde seit 2019, 42 Konversationen, letzte am 14.11.2026.</x-bmsui::popover>
        </div>
        <x-bmsui::tabs label="Einstellungen" active="general" :tabs="[['id' => 'general', 'label' => 'Allgemein'], ['id' => 'mailbox', 'label' => 'Postfaecher', 'count' => 4], ['id' => 'notify', 'label' => 'Benachrichtigungen'], ['id' => 'off', 'label' => 'Gesperrt', 'disabled' => true]]" style="margin-top:16px">
            <x-bmsui::tab-panel id="general">Allgemeine Einstellungen fuer dieses Postfach.</x-bmsui::tab-panel>
            <x-bmsui::tab-panel id="mailbox">Vier verbundene Postfaecher.</x-bmsui::tab-panel>
            <x-bmsui::tab-panel id="notify">E-Mail und Push.</x-bmsui::tab-panel>
        </x-bmsui::tabs>
    </div>
    <x-bmsui::dialog id="pv-dialog" title="Konversation verschieben" description="Waehlen Sie das Zielpostfach.">
        <x-bmsui::form-field label="Postfach" for="pv-move"><x-bmsui::select name="move" :options="['verkauf' => 'Verkauf', 'support' => 'Support']" /></x-bmsui::form-field>
        <x-slot:footer><x-bmsui::button variant="outline" data-bmsui-dialog-close value="cancel">Abbrechen</x-bmsui::button><x-bmsui::button data-bmsui-dialog-close value="move">Verschieben</x-bmsui::button></x-slot:footer>
    </x-bmsui::dialog>
    <x-bmsui::confirm-dialog id="pv-confirm" title="Konversation loeschen?" message="Die Konversation und alle Nachrichten werden endgueltig geloescht." confirm-label="Loeschen" cancel-label="Abbrechen" />

    <h2>App shell: sidebar, page header, table shell, pagination, search</h2>
    <div class="card" style="padding:0;display:flex;height:440px;overflow:hidden" data-pv-shell>
        <x-bmsui::sidebar :collapsed="false">
            <x-slot:header><x-bmsui::brand product="Desk" :size="22" /></x-slot:header>
            <x-slot:mark><x-bmsui::brand mode="mark" :size="22" /></x-slot:mark>
            <x-bmsui::nav-group id="mailboxes" label="Postfaecher" :collapsed="false">
                <x-bmsui::nav-item label="Verkauf" href="#" :active="true" :count="12"><x-slot:icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.25 13.5h3.86a2.25 2.25 0 012.01 1.24l.27.54a2.25 2.25 0 002.01 1.24h3.2a2.25 2.25 0 002.01-1.24l.27-.54a2.25 2.25 0 012.01-1.24h3.86M2.25 13.5V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.5M2.25 13.5l2.6-7.8A2.25 2.25 0 017 4.5h10a2.25 2.25 0 012.14 1.2l2.6 7.8"/></svg></x-slot:icon></x-bmsui::nav-item>
                <x-bmsui::nav-item label="Support" href="#" :count="3"><x-slot:icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.25 13.5h3.86a2.25 2.25 0 012.01 1.24l.27.54a2.25 2.25 0 002.01 1.24h3.2a2.25 2.25 0 002.01-1.24l.27-.54a2.25 2.25 0 012.01-1.24h3.86M2.25 13.5V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.5M2.25 13.5l2.6-7.8A2.25 2.25 0 017 4.5h10a2.25 2.25 0 012.14 1.2l2.6 7.8"/></svg></x-slot:icon></x-bmsui::nav-item>
            </x-bmsui::nav-group>
            <x-bmsui::nav-group id="admin" label="Verwaltung" :collapsed="false">
                <x-bmsui::nav-item label="Benutzer" href="#"><x-slot:icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.12a7.5 7.5 0 0115 0A17.93 17.93 0 0112 21.75c-2.68 0-5.22-.58-7.5-1.63z"/></svg></x-slot:icon></x-bmsui::nav-item>
                <x-bmsui::nav-item label="Berichte" href="#"><x-slot:icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13.13C3 12.5 3.5 12 4.13 12h2.25c.62 0 1.12.5 1.12 1.13v6.75c0 .62-.5 1.12-1.12 1.12H4.13C3.5 21 3 20.5 3 19.88v-6.75zM9.75 8.63c0-.63.5-1.13 1.13-1.13h2.25c.62 0 1.12.5 1.12 1.13v11.25c0 .62-.5 1.12-1.12 1.12h-2.25c-.63 0-1.13-.5-1.13-1.12V8.63zM16.5 4.13c0-.63.5-1.13 1.13-1.13h2.25C20.5 3 21 3.5 21 4.13v15.75c0 .62-.5 1.12-1.12 1.12h-2.25c-.63 0-1.13-.5-1.13-1.12V4.13z"/></svg></x-slot:icon></x-bmsui::nav-item>
            </x-bmsui::nav-group>
        </x-bmsui::sidebar>
        <div style="flex:1;min-width:0;padding:16px;overflow:auto">
            <x-bmsui::page-header title="Benutzer" description="Wer auf welche Postfaecher zugreifen darf." :breadcrumbs="[['label' => 'Verwaltung', 'href' => '#'], ['label' => 'Benutzer']]">
                <x-slot:badge><x-bmsui::badge variant="secondary">24</x-bmsui::badge></x-slot:badge>
                <x-slot:actions><x-bmsui::button size="sm">Benutzer einladen</x-bmsui::button></x-slot:actions>
            </x-bmsui::page-header>
            <x-bmsui::table-shell>
                <x-slot:toolbar><x-bmsui::table-toolbar :count="24"><x-bmsui::search-bar placeholder="Benutzer suchen" value="an" /></x-bmsui::table-toolbar></x-slot:toolbar>
                <x-bmsui::table caption="Benutzer">
                    <thead><tr><th>Name</th><th>Rolle</th><th>Status</th><th class="is-num">Konversationen</th></tr></thead>
                    <tbody>
                        <tr><td>Anna Meier</td><td>Admin</td><td><x-bmsui::status-badge status="active" /></td><td class="is-num">1'204</td></tr>
                        <tr><td>Peter Frei</td><td>Benutzer</td><td><x-bmsui::status-badge status="inactive" /></td><td class="is-num">87</td></tr>
                    </tbody>
                </x-bmsui::table>
                <x-slot:footer><span>1&ndash;2 von 24</span><x-bmsui::pagination :page="1" :pages="12" url="?page={page}" /></x-slot:footer>
            </x-bmsui::table-shell>
        </div>
    </div>

    <h2>KPI card, sparkline</h2>
    <div class="row-flex" style="align-items:stretch">
        <x-bmsui::kpi-card style="flex:1 1 200px" label="Offene Konversationen" value="128" delta="+12" trend="up" :up-is-good="false" sub="seit gestern" :spark="[96, 104, 99, 110, 118, 116, 128]" spark-label="Letzte 7 Tage: 96 bis 128" />
        <x-bmsui::kpi-card style="flex:1 1 200px" label="Erste Antwort" value="1 h 24 min" delta="-8 min" trend="down" :up-is-good="false" sub="Median" :spark="[110, 102, 95, 97, 90, 88, 84]" />
        <x-bmsui::kpi-card style="flex:1 1 200px" label="Zufriedenheit" value="94 %" delta="0" trend="flat" />
    </div>

    <h2>Toast, command palette, date inputs</h2>
    <div class="card">
        <div class="row-flex">
            <x-bmsui::button variant="outline" onclick="BMSUi.toast.success('Konversation zugewiesen', {description: 'An Anna Meier', action: {label: 'Rueckgaengig'}})">Toast</x-bmsui::button>
            <x-bmsui::button variant="outline" onclick="BMSUi.toast.error('Senden fehlgeschlagen', {description: 'SMTP-Verbindung abgelehnt'})">Fehler-Toast</x-bmsui::button>
            <x-bmsui::button variant="outline" data-bmsui-command-open>Befehle <x-bmsui::key-combo keys="mod+k" /></x-bmsui::button>
        </div>
        <div class="row-flex" style="margin-top:12px;align-items:flex-start">
            <x-bmsui::form-field label="Schlummern bis" for="pv-snooze" style="flex:1 1 220px"><x-bmsui::date-time-input name="snooze" value="2026-11-20 08:00" /></x-bmsui::form-field>
            <x-bmsui::form-field label="Faellig am" for="pv-due" style="flex:1 1 220px"><x-bmsui::date-input name="due" value="2026-11-30" /></x-bmsui::form-field>
        </div>
    </div>
    <x-bmsui::toaster />
    <x-bmsui::command-palette :commands="[['id' => 'new', 'label' => 'Neue Konversation', 'group' => 'Aktionen', 'shortcut' => 'mod+n', 'keywords' => 'erstellen mail'], ['id' => 'assign', 'label' => 'Mir zuweisen', 'group' => 'Aktionen'], ['id' => 'inbox', 'label' => 'Posteingang Verkauf', 'group' => 'Gehe zu', 'href' => '#inbox'], ['id' => 'dark', 'label' => 'Nachtmodus umschalten', 'group' => 'Einstellungen', 'description' => 'Fuer dieses Geraet']]" />

    <h2>Conversation list</h2>
    <x-bmsui::conversation-list>
        <x-bmsui::conversation-row subject="Offerte 2026-0412" preview="Guten Tag, anbei die Offerte fuer die Heizungsanlage" href="#" :customer="['name' => 'Keller Haustechnik AG']" :assignee="['name' => 'Anna Meier']" status="active" :unread="true" :starred="true" :thread-count="4" :has-attachments="true" time="09:12" :selected="false">
            <x-bmsui::chip tone="info">Offerte</x-bmsui::chip>
        </x-bmsui::conversation-row>
        <x-bmsui::conversation-row subject="Lieferverzug Bestellung 88213, bitte um dringende Rueckmeldung zum Liefertermin" preview="Wir warten seit zwei Wochen auf die Ware" href="#" :customer="['name' => 'Muster AG']" status="pending" time="Gestern" :selected="true" />
        <x-bmsui::conversation-row subject="Reklamation Rechnung" href="#" :customer="['name' => 'Beat Huber']" :assignee="['name' => 'Peter Frei']" status="closed" time="14.11.2026" />
        <x-bmsui::conversation-row subject="Gewinnspiel jetzt teilnehmen" :customer="['name' => 'noreply@promo.example']" status="spam" time="12.11.2026" />
    </x-bmsui::conversation-list>

    <h2>Conversation list: header, footer, star toggle, number</h2>
    <x-bmsui::conversation-list :select-all="false" :sorts="[['key' => 'date', 'label' => 'Datum', 'dir' => 'desc'], ['key' => 'customer', 'label' => 'Kunde']]" :count="2">
        <x-bmsui::conversation-row subject="Offerte 2026-0412" preview="Anbei die Offerte" href="#" :customer="['name' => 'Keller Haustechnik AG']" status="active" :unread="true" :starrable="true" :starred="true" :number="10412" time="09:12" :selected="false" />
        <x-bmsui::conversation-row subject="Reklamation Rechnung" href="#" :customer="['name' => 'Beat Huber']" status="closed" :starrable="true" :number="10388" time="Gestern" :selected="false" />
    </x-bmsui::conversation-list>

    <h2>Conversation list as table (FreeScout markup)</h2>
    <x-bmsui::conversation-list as="table" class="table-conversations" :select-all="false" :select-all-attributes="['class' => 'toggle-all']" :count="2">
        <x-bmsui::conversation-row class="conv-row" data-conversation_id="1" subject="Offerte 2026-0412" preview="Anbei die Offerte" href="#" :customer="['name' => 'Keller Haustechnik AG']" status="active" :unread="true" :starrable="true" :star-attributes="['class' => 'conv-star']" :number="10412" time="09:12" :selected="false" :checkbox-attributes="['class' => 'conv-checkbox']">
            <x-slot:before-subject><x-bmsui::chip tone="danger">Hoch</x-bmsui::chip></x-slot:before-subject>
        </x-bmsui::conversation-row>
        <x-bmsui::conversation-row class="conv-row" data-conversation_id="2" subject="Reklamation Rechnung" href="#" :customer="['name' => 'Beat Huber']" status="closed" :starrable="true" :starred="true" :number="10388" time="Gestern" :selected="true" />
        <x-slot:pager><span class="table-pager">1&ndash;2 von 2</span></x-slot:pager>
    </x-bmsui::conversation-list>


    <h2>Mail message: thread id, menu, meta, action text</h2>
    <x-bmsui::mail-message direction="outbound" :thread-id="501" :menu-items="[['id' => 'forward', 'label' => 'Weiterleiten'], ['id' => 'original', 'label' => 'Original anzeigen', 'href' => '#'], ['id' => 'print', 'label' => 'Drucken'], ['separator' => true], ['id' => 'outgoing', 'label' => 'Ausgehende E-Mails']]" :sender="['name' => 'Peter Frei']" :recipients="['to' => ['anna.meier@keller-haustechnik.ch']]" time="14.11.2026 10:40">
        <p style="margin:0">Gerne passen wir die Lieferzeit an.</p>
        <x-slot:action-text>Peter Frei hat weitergeleitet an Anna Meier</x-slot:action-text>
        <x-slot:meta>Gesendet ueber Postfach Verkauf</x-slot:meta>
    </x-bmsui::mail-message>

    <h2>Mail message, quoted text, attachments, events</h2>
    <x-bmsui::mail-message direction="inbound" :sender="['name' => 'Anna Meier', 'email' => 'anna.meier@keller-haustechnik.ch']" :recipients="['to' => ['verkauf@muster-ag.ch'], 'cc' => ['buchhaltung@keller-haustechnik.ch']]" time="14.11.2026 09:12" subject="Offerte 2026-0412" :attachments="[['id' => 1, 'name' => 'Offerte_2026-0412_Heizungsanlage_final_v3.pdf', 'size' => 1258291, 'mimeType' => 'application/pdf', 'href' => '#'], ['id' => 2, 'name' => 'Preise.xlsx', 'size' => 48211], ['id' => 3, 'name' => 'Fotos.zip', 'size' => 9876543]]">
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

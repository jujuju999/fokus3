# Fokus3

Minimalistischer Aufgaben-Manager als PWA für Menschen mit ADHS-typischen Fokusproblemen. Kernidee: **maximal 3 Aufgaben pro Tag** — die App erzwingt das, statt es nur zu empfehlen.

## Scope V1 — bewusst minimal

V1 hat **genau drei Features**, sonst nichts:

1. **Blitz-Erfassung** — ein Eingabefeld, Enter → Aufgabe landet in der Inbox.
2. **Harte Deckelung** — max. 3 Aufgaben von Inbox auf „Heute"; UI verhindert die vierte, ein DB-Trigger sichert es zusätzlich ab.
3. **Web-Push** — 07:00 „Wähle deine 3" und 21:30 „Was ist offen?" (Europe/Berlin, fest), funktionsfähig als installierte PWA auf iOS 16.4+.

**Keine weiteren Features vorschlagen oder einbauen** — keine Tags, Prioritäten, Unteraufgaben, Fälligkeitsdaten, Statistiken, Themes o. Ä. Wenn eine Änderung nicht direkt einem der Features (oder Stabilität/Barrierefreiheit) dient, gehört sie nicht rein. Weniger ist hier das Produkt.

## Scope V2 — „Woche" (Kapazitäts-Anzeiger)

Vierter Baustein: Tab **„Woche"** — 7 Spalten Mo–So, Zeitbalken 6:00–24:00, Termine als Blöcke, darunter „X h frei". Zweck: beim Wählen der 3 Heute-Aufgaben sehen, wieviel Zeit realistisch frei ist. **Kein Kalender-Ersatz.**

Regeln: Termine haben nur Titel, Wochentag/Datum, Von/Bis und „wöchentlich wiederholen" (unbegrenzt, kein Enddatum). Einmalige hängen an konkretem Datum. Nur aktuelle Woche, kein Blättern. Keine Kategorien, Farben, Erinnerungen, Notizen, Vorschläge, Templates oder Auto-Einträge — das leere Raster ist Absicht.

Getroffene Produktentscheidungen:
- Multi-User mit Supabase Auth (E-Mail + Passwort; Magic Link/OTP scheiterte an iOS-PWA-Speichertrennung bzw. SMTP-Pflicht für Template-Anpassung), RLS pro Nutzer.
- Zeitzone fest `Europe/Berlin` (DST-sicher via 30-Min-Cron + Wanduhrzeit-Check in der Edge Function).
- Tageswechsel: unerledigte „Heute"-Tasks wandern zurück in die Inbox (frischer Start).

## Stack

- **Frontend:** React 18 + Vite + TypeScript (strict) + Tailwind CSS
- **PWA:** `vite-plugin-pwa` mit `injectManifest` — eigener Service Worker in `src/sw.ts` (`push`, `notificationclick`)
- **Backend:** Supabase — Postgres (Migrations + RLS + Trigger), Auth (Magic Link), Edge Function `send-reminders` (Deno), Cron via pg_cron + pg_net
- **Push:** Web Push mit VAPID (`web-push` in der Edge Function)
- **Hosting:** GitHub Pages → `base: '/fokus3/'` in `vite.config.ts`, SPA-Fallback über `404.html`

## Ordnerstruktur

```
fokus3/
├─ .github/workflows/deploy.yml        # Build + Deploy nach GitHub Pages
├─ index.html                          # iOS-Meta-Tags (apple-mobile-web-app-*)
├─ vite.config.ts                      # base-Pfad + vite-plugin-pwa (injectManifest)
├─ public/icons/                       # 192, 512, maskable, apple-touch-icon
├─ src/
│  ├─ main.tsx · App.tsx (Tab-State) · index.css
│  ├─ sw.ts                            # Service Worker (Push-Empfang)
│  ├─ lib/                             # supabaseClient.ts · push.ts · tasks.ts · appointments.ts
│  ├─ hooks/                           # useTasks.ts · useAppointments.ts
│  ├─ pages/                           # Home.tsx (Heute+Inbox) · Week.tsx
│  └─ components/                      # QuickCapture · Inbox · TodayList · TaskItem · NotificationSetup
│                                      # TabBar · WeekDayColumn · AppointmentModal · Toast · PushTest
└─ supabase/
   ├─ migrations/                      # 0001_schema · 0002_push · 0003_appointments (append-only)
   └─ functions/send-reminders/        # Reset + Push-Versand, DST-aware
```

Neue Dateien folgen dieser Struktur; keine zusätzlichen Top-Level-Ordner ohne guten Grund.

## Code-Stil

- TypeScript strict; keine `any`, keine `@ts-ignore`. Typen für DB-Rows zentral in `src/lib/` definieren.
- Funktionale React-Komponenten mit Hooks; eine Komponente pro Datei, benannt wie die Datei.
- Datenzugriff nur über `src/lib/tasks.ts` bzw. Hooks — keine Supabase-Queries direkt in Komponenten.
- Tailwind-Utilities direkt im JSX; keine separaten CSS-Dateien außer `index.css`. Mobile-first (Hauptzielgerät ist ein iPhone).
- UI-Texte auf Deutsch, Code/Kommentare/Commits auf Englisch.
- Kommentare sparsam — nur wo das *Warum* nicht offensichtlich ist (z. B. iOS-Push-Eigenheiten, DST-Logik).
- SQL-Migrations sind append-only: neue nummerierte Datei statt alte editieren.
- Git: Feature-Branches von `main` abzweigen (nie direkt auf `main` committen), damit PRs möglich sind.

## Testbarkeit — jede Änderung muss im Browser prüfbar sein

Jede Änderung wird vor dem Commit im laufenden Dev-Server (`npm run dev`) verifiziert — nicht nur Typecheck/Build:

- **UI-Änderungen:** betroffenen Flow im Browser durchklicken (Aufgabe erfassen, Inbox→Heute ziehen, 4. Aufgabe wird blockiert, Erledigen).
- **DB-Änderungen:** über die App auslösen und Effekt im UI prüfen; Trigger/RLS zusätzlich gezielt gegen die DB testen.
- **Push/SW-Änderungen:** Service-Worker-Registrierung und Subscription in den DevTools (Application-Tab) prüfen; Versand testweise über die Edge Function auslösen.
- Keine Änderung gilt als fertig, wenn sie nur „kompiliert" — sie muss beobachtbar funktionieren.

## Umgebungsvariablen

`.env.example` aktuell halten: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`. Secrets (VAPID-Private-Key, Service-Role-Key) niemals ins Repo oder ins Client-Bundle — nur als Supabase-Function-Secrets.

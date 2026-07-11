# Ideen-Sammlung

Beim Bauen entstandene Ideen — bewusst NICHT umgesetzt, hier geparkt statt
den Scope aufzuweichen.

## Beim V2/Design-Update entstanden (2026-07-12)

- ~~**Wachzeiten über Mitternacht**~~ → in V2.5 umgesetzt (Ende < Beginn
  = über Mitternacht; Termine bleiben auf den Kalendertag begrenzt).
- **Dauer nachträglich ändern**: Chips gibt es nur beim Erfassen. Tap auf
  den Dauer-Chip einer bestehenden Aufgabe könnte ihn editierbar machen.
- **„Geplant: 2h von 1,5h frei" auf dem Heute-Tab**: die Kapazitäts-Info
  nicht nur als Warnung beim Ziehen, sondern als stille Mini-Metrik unter
  dem Progress-Ring.
- **Morgen-Push mit freier Zeit anreichern**: „Wähle deine 3 – heute 4h
  frei." Die Edge Function könnte wake_times + appointments lesen.
- **Wachzeiten-Ausnahme pro Datum** (Urlaub, Feiertag): analoges Muster zu
  appointment_exceptions.
- **Termin-Dauer per Drag am Blockrand** statt Modal — nur wenn es die
  Ruhe des UI nicht stört.
- **Vorschau nächste Woche**: bewusst gegen entschieden (Fokus auf jetzt);
  falls doch, maximal eine Woche voraus, kein freies Blättern.

## Beim V2.5-Bau entstanden (2026-07-11)

- **V2.6 „schlaue" Planung**: Peak-Hours, Energie-Level, Aufgaben-Typen —
  explizit vertagt, bis V2.5 solide läuft.
- **Benachrichtigung zum Slot-Start**: eigenes Feature, nicht Teil von V2.5.
- **Slot per Drag verschieben** statt Sheet mit Zeit-Picker.
- **Geteilte Daten-Hooks via Context**: aktuell hat jede Seite (+ Scheduler)
  eigene Hook-Instanzen, die per Realtime konvergieren. Ein DataProvider
  würde Requests sparen und Zwischenzustände eliminieren.

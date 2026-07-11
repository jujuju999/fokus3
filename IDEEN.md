# Ideen-Sammlung

Beim Bauen entstandene Ideen — bewusst NICHT umgesetzt, hier geparkt statt
den Scope aufzuweichen.

## Beim V2/Design-Update entstanden (2026-07-12)

- **Wachzeiten über Mitternacht** („Sa 9:00–1:00"): bewusst ausgelassen.
  Braucht Tageswechsel-Logik in Balken, Terminen und Frei-Berechnung
  (ein Termin 23:30–0:30 gehört zu zwei Tagen). Aktuell gilt: Fenster
  innerhalb eines Kalendertags, Ende > Beginn.
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

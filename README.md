# Cro Swipe 🇭🇷

Kroatisch-Lern-App für Kinder (8–12 Jahre) — als installierbare Web-App (PWA).

**App öffnen:** https://olidragic.github.io/cro-swipe/

## Aufs iPad bringen

1. Safari → obige URL öffnen
2. Teilen-Symbol → „Zum Home-Bildschirm"
3. Fertig — die App läuft im Vollbild und nach dem ersten Start auch offline

## Was drin ist

- 350 Vokabeln in 22 Kategorien mit kroatischer und deutscher Vertonung
- 11 Spielmodi: Swipe-Karten, Tippen, Paare, Hören, Sätze, Satz-Puzzle,
  Biti-Quiz, Fälle-Quiz (Akkusativ/Lokativ), Sprint, Aussprache, Zeichen-Picker
- Spaced Repetition, Tagesziele, Streaks, Abzeichen, Phasen-Freischaltung
- Ohren-Modus für Leseanfänger (Bild-Antworten statt Text)
- Profile und Lernstände bleiben lokal auf dem Gerät (localStorage) —
  es werden keine Daten an einen Server gesendet

## Deployment

Jeder Push auf `main` deployt automatisch via GitHub Actions auf GitHub Pages
(`.github/workflows/deploy-pages.yml`). Bei Änderungen an gecachten Dateien
die Cache-Version in `src/sw.js` (`cro-swipe-vX`) hochzählen.

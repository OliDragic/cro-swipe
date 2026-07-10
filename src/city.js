/* Cro Swipe — city.js: „Moj Grad" v2 — Panorama-Küstenstädtchen.
   Blick vom Meer auf ein dalmatinisches Dorf: Berg im Hintergrund,
   Häuser am Hang, Riva am Wasser. Gebäude haben feste Plätze in der
   Szene und erscheinen dort, wenn sie gebaut werden (Geist-Silhouette
   vorher). Übungen verdienen Novčići (= XP − Verbautes); Premium-
   Gebäude verlangen zusätzlich gemeisterte Wörter. */

'use strict';

/* ─── Gebäude-Katalog ─── */
const CITY_BUILDINGS = [
  { id: 'kuca',       hr: 'kuća',          de: 'Haus',         emoji: '🏠', cost: 400 },
  { id: 'stablo',     hr: 'stablo',        de: 'Baum',         emoji: '🌳', cost: 200  },
  { id: 'cvijece',    hr: 'cvijeće',       de: 'Blumen',       emoji: '🌷', cost: 240  },
  { id: 'fontana',    hr: 'fontana',       de: 'Brunnen',      emoji: '⛲', cost: 700 },
  { id: 'igraliste',  hr: 'igralište',     de: 'Spielplatz',   emoji: '🛝', cost: 550, req: { cat: 'Freizeit',  n: 5 } },
  { id: 'plaza',      hr: 'plaža',         de: 'Strand',       emoji: '🏖️', cost: 600, req: { cat: 'Natur',     n: 8 } },
  { id: 'brod',       hr: 'brod',          de: 'Boot',         emoji: '⛵', cost: 700, req: { cat: 'Fahrzeuge', n: 5 } },
  { id: 'trznica',    hr: 'tržnica',       de: 'Markt',        emoji: '🍎', cost: 800, req: { cat: 'Essen',     n: 10 } },
  { id: 'skola',      hr: 'škola',         de: 'Schule',       emoji: '🏫', cost: 900, req: { cat: 'Schule',    n: 10 } },
  { id: 'konoba',     hr: 'konoba',        de: 'Wirtshaus',    emoji: '🍽️', cost: 950, req: { cat: 'Essen',     n: 15 } },
  { id: 'crkva',      hr: 'crkva',         de: 'Kirche',       emoji: '⛪', cost: 1000, req: { cat: 'Hallo Kroatien', n: 10 } },
  { id: 'luka',       hr: 'luka',          de: 'Hafen',        emoji: '⚓', cost: 1050, req: { cat: 'Fahrzeuge', n: 8 } },
  { id: 'zoo',        hr: 'zoološki vrt',  de: 'Zoo',          emoji: '🦁', cost: 1200, req: { cat: 'Tiere',     n: 15 } },
  { id: 'svjetionik', hr: 'svjetionik',    de: 'Leuchtturm',   emoji: '🗼', cost: 1300, reqTotal: 40 },
  { id: 'zidine',     hr: 'zidine',        de: 'Stadtmauern',  emoji: '🧱', cost: 1400, reqTotal: 60 },
  { id: 'dvorac',     hr: 'dvorac',        de: 'Burg',         emoji: '🏰', cost: 1600, reqTotal: 80 },
  { id: 'kamp',       hr: 'kamp',          de: 'Campingplatz', emoji: '⛺', cost: 700,  req: { cat: 'Kroatien',  n: 8 } },
  { id: 'park',       hr: 'park',          de: 'Park',         emoji: '🌲', cost: 750,  req: { cat: 'Natur',     n: 12 } },
  { id: 'most',       hr: 'most',          de: 'Brücke',       emoji: '🌉', cost: 800,  req: { cat: 'Fahrzeuge', n: 12 } },
  { id: 'pekara',     hr: 'pekara',        de: 'Bäckerei',     emoji: '🥖', cost: 850,  req: { cat: 'Essen',     n: 20 } },
  { id: 'kino',       hr: 'kino',          de: 'Kino',         emoji: '🎬', cost: 900,  req: { cat: 'Freizeit',  n: 10 } },
  { id: 'muzej',      hr: 'muzej',         de: 'Museum',       emoji: '🏛️', cost: 1100, req: { cat: 'Schule',    n: 15 } },
];

/* ─── Feste Bauplätze in der Szene (SVG-Koordinaten, viewBox 800×560) ───
   scale skaliert die Gebäude-Zeichnung am jeweiligen Platz. */
const CITY_SPOTS = [
  { spot: 'dvorac',     type: 'dvorac',     x: 236, y: 208, scale: 1.15 },
  { spot: 'zidine',     type: 'zidine',     x: 355, y: 235, scale: 1.0  },
  { spot: 'zoo',        type: 'zoo',        x: 85,  y: 325, scale: 0.95 },
  { spot: 'kamp',       type: 'kamp',       x: 742, y: 302, scale: 1.0  },
  { spot: 'park',       type: 'park',       x: 745, y: 390, scale: 1.0  },
  { spot: 'most',       type: 'most',       x: 141, y: 408, scale: 1.0  },
  { spot: 'pekara',     type: 'pekara',     x: 215, y: 348, scale: 0.95 },
  { spot: 'kino',       type: 'kino',       x: 585, y: 358, scale: 0.95 },
  { spot: 'muzej',      type: 'muzej',      x: 368, y: 338, scale: 1.0  },
  { spot: 'crkva',      type: 'crkva',      x: 300, y: 300, scale: 1.1  },
  { spot: 'kuca2',      type: 'kuca',       x: 420, y: 302, scale: 0.95 },
  { spot: 'skola',      type: 'skola',      x: 520, y: 308, scale: 1.05 },
  { spot: 'kuca3',      type: 'kuca',       x: 625, y: 315, scale: 0.9  },
  { spot: 'stablo1',    type: 'stablo',     x: 180, y: 388, scale: 1.0  },
  { spot: 'igraliste',  type: 'igraliste',  x: 680, y: 372, scale: 1.0  },
  { spot: 'fontana',    type: 'fontana',    x: 452, y: 370, scale: 0.95 },
  { spot: 'cvijece1',   type: 'cvijece',    x: 380, y: 385, scale: 0.9  },
  { spot: 'konoba',     type: 'konoba',     x: 280, y: 392, scale: 1.0  },
  { spot: 'trznica',    type: 'trznica',    x: 530, y: 392, scale: 1.0  },
  { spot: 'kuca1',      type: 'kuca',       x: 605, y: 398, scale: 1.0  },
  { spot: 'stablo2',    type: 'stablo',     x: 660, y: 340, scale: 0.8  },
  { spot: 'cvijece2',   type: 'cvijece',    x: 345, y: 415, scale: 0.85 },
  { spot: 'svjetionik', type: 'svjetionik', x: 52,  y: 400, scale: 1.1  },
  { spot: 'luka',       type: 'luka',       x: 175, y: 452, scale: 1.0  },
  { spot: 'brod',       type: 'brod',       x: 340, y: 505, scale: 1.0  },
  { spot: 'plaza',      type: 'plaza',      x: 715, y: 448, scale: 1.0  },
];

/* ─── Gebäude als kleine SVG-Illustrationen (dalmatinischer Stil) ───
   Jede Zeichnung ist um (0,0) zentriert, Fußpunkt bei y=0. */
const CITY_ART = {
  kuca: `
    <rect x="-26" y="-38" width="52" height="38" rx="2" fill="#f6ecd8" stroke="#c9b99a" stroke-width="1.5"/>
    <path d="M-31 -38 L0 -60 L31 -38 Z" fill="#c9553d" stroke="#a8432f" stroke-width="1.5"/>
    <rect x="-8" y="-20" width="16" height="20" rx="1.5" fill="#7a5b3a"/>
    <rect x="-21" y="-32" width="11" height="11" rx="1" fill="#9fd1ef" stroke="#6f8ba1"/>
    <rect x="10" y="-32" width="11" height="11" rx="1" fill="#9fd1ef" stroke="#6f8ba1"/>
    <g stroke="#5d8a56" stroke-width="2"><line x1="-23" y1="-32" x2="-23" y2="-21"/><line x1="-8" y1="-32" x2="-8" y2="-21"/><line x1="8" y1="-32" x2="8" y2="-21"/><line x1="23" y1="-32" x2="23" y2="-21"/></g>
    <rect x="-21" y="-21" width="11" height="2.5" fill="#c9553d"/>
    <rect x="10" y="-21" width="11" height="2.5" fill="#c9553d"/>
    <g fill="#e5568c"><circle cx="-18" cy="-22" r="1.6"/><circle cx="-13" cy="-22.5" r="1.6"/><circle cx="13" cy="-22" r="1.6"/><circle cx="18" cy="-22.5" r="1.6"/></g>`,
  stablo: `
    <rect x="-4" y="-22" width="8" height="22" rx="2" fill="#8a6240"/>
    <circle cx="0" cy="-34" r="20" fill="#4e8a4a"/>
    <circle cx="-14" cy="-26" r="13" fill="#5d9c56"/>
    <circle cx="14" cy="-27" r="13" fill="#447b41"/>`,
  cvijece: `
    <rect x="-24" y="-10" width="48" height="10" rx="4" fill="#8a6240"/>
    <g fill="#e5568c"><circle cx="-14" cy="-16" r="6"/><circle cx="0" cy="-19" r="6"/><circle cx="14" cy="-15" r="6"/></g>
    <g fill="#f2c94c"><circle cx="-14" cy="-16" r="2.4"/><circle cx="0" cy="-19" r="2.4"/><circle cx="14" cy="-15" r="2.4"/></g>
    <g stroke="#4e8a4a" stroke-width="2"><line x1="-14" y1="-12" x2="-14" y2="-6"/><line x1="0" y1="-14" x2="0" y2="-6"/><line x1="14" y1="-11" x2="14" y2="-6"/></g>`,
  fontana: `
    <ellipse cx="0" cy="-4" rx="26" ry="8" fill="#d8cfc0" stroke="#b0a48f" stroke-width="1.5"/>
    <ellipse cx="0" cy="-6" rx="19" ry="5" fill="#7ec8ff"/>
    <rect x="-3" y="-26" width="6" height="20" fill="#d8cfc0" stroke="#b0a48f"/>
    <ellipse cx="0" cy="-28" rx="9" ry="3" fill="#7ec8ff"/>
    <g class="fountain-jet">
      <path d="M-7 -28 Q0 -40 7 -28" fill="none" stroke="#9fd1ef" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M-4 -28 Q0 -36 4 -28" fill="none" stroke="#cfeafc" stroke-width="2" stroke-linecap="round"/>
    </g>`,
  igraliste: `
    <path d="M-24 0 L-10 -30 L4 0 Z" fill="#f2a24b" stroke="#d18432" stroke-width="1.5"/>
    <rect x="-12" y="-30" width="6" height="30" rx="3" fill="#e05e5e"/>
    <line x1="10" y1="-32" x2="10" y2="0" stroke="#7a8aa0" stroke-width="3"/>
    <line x1="24" y1="-32" x2="24" y2="0" stroke="#7a8aa0" stroke-width="3"/>
    <line x1="10" y1="-32" x2="24" y2="-32" stroke="#7a8aa0" stroke-width="3"/>
    <line x1="17" y1="-32" x2="17" y2="-12" stroke="#c4c9d4" stroke-width="2"/>
    <rect x="13" y="-12" width="8" height="3" rx="1.5" fill="#e05e5e"/>`,
  plaza: `
    <ellipse cx="0" cy="-2" rx="34" ry="9" fill="#f2dfae"/>
    <line x1="6" y1="-34" x2="6" y2="-6" stroke="#b0764a" stroke-width="2.5"/>
    <path d="M6 -34 Q-16 -30 -14 -18 Q-4 -26 6 -22 Q16 -26 26 -18 Q28 -30 6 -34Z" fill="#e05e5e"/>
    <path d="M6 -34 Q-10 -28 -8 -20" fill="none" stroke="#f6ecd8" stroke-width="2"/>
    <circle cx="-18" cy="-8" r="4" fill="#f2c94c"/>`,
  brod: `
    <path d="M-28 -8 Q0 2 28 -8 L20 4 Q0 10 -20 4 Z" fill="#a8552f" stroke="#7d3d20" stroke-width="1.5"/>
    <line x1="0" y1="-8" x2="0" y2="-44" stroke="#6b4a2e" stroke-width="3"/>
    <path d="M2 -42 L26 -12 L2 -12 Z" fill="#f6f0e0" stroke="#d8cfc0"/>
    <path d="M-2 -38 L-20 -12 L-2 -12 Z" fill="#e8dfc8" stroke="#d8cfc0"/>
    <circle cx="0" cy="-46" r="2.5" fill="#e05e5e"/>`,
  trznica: `
    <rect x="-28" y="-24" width="56" height="24" rx="2" fill="#f6ecd8" stroke="#c9b99a"/>
    <path d="M-32 -24 L-32 -30 Q0 -44 32 -30 L32 -24 Z" fill="#e05e5e"/>
    <path d="M-32 -24 Q-24 -18 -16 -24 Q-8 -18 0 -24 Q8 -18 16 -24 Q24 -18 32 -24" fill="#f6f0e0" stroke="#d89090"/>
    <g><circle cx="-14" cy="-8" r="4" fill="#e05e5e"/><circle cx="-4" cy="-8" r="4" fill="#f2c94c"/><circle cx="6" cy="-8" r="4" fill="#7bb661"/><circle cx="16" cy="-8" r="4" fill="#f2a24b"/></g>`,
  skola: `
    <rect x="-34" y="-34" width="68" height="34" rx="2" fill="#f2e3c4" stroke="#cbb890" stroke-width="1.5"/>
    <path d="M-38 -34 L0 -52 L38 -34 Z" fill="#b0764a" stroke="#8f5c36" stroke-width="1.5"/>
    <rect x="-7" y="-18" width="14" height="18" rx="1.5" fill="#7a5b3a"/>
    <rect x="-28" y="-28" width="10" height="10" fill="#9fd1ef" stroke="#6f8ba1"/>
    <rect x="18" y="-28" width="10" height="10" fill="#9fd1ef" stroke="#6f8ba1"/>
    <circle cx="0" cy="-42" r="5" fill="#f6f0e0" stroke="#8f5c36"/>
    <line x1="0" y1="-42" x2="0" y2="-39" stroke="#8f5c36" stroke-width="1.5"/>`,
  konoba: `
    <rect x="-26" y="-30" width="52" height="30" rx="2" fill="#e8d9b8" stroke="#c2ab84"/>
    <path d="M-30 -30 L0 -46 L30 -30 Z" fill="#c9553d" stroke="#a8432f"/>
    <rect x="-20" y="-24" width="40" height="7" rx="3" fill="#7a5b3a"/>
    <text x="0" y="-17.5" font-size="7" text-anchor="middle" fill="#f6ecd8" font-family="sans-serif" font-weight="bold">KONOBA</text>
    <rect x="-7" y="-14" width="14" height="14" rx="1.5" fill="#5f4630"/>
    <circle cx="16" cy="-10" r="4" fill="#f2c94c" opacity=".85"/>
    <rect x="14" y="-54" width="7" height="12" fill="#8a7a5c"/>
    <g class="smoke" fill="#f2f2f2">
      <circle cx="18" cy="-58" r="3"/>
      <circle cx="20" cy="-66" r="4"/>
      <circle cx="16" cy="-75" r="5"/>
    </g>`,
  crkva: `
    <rect x="-20" y="-36" width="40" height="36" rx="2" fill="#f6ecd8" stroke="#c9b99a" stroke-width="1.5"/>
    <path d="M-24 -36 L0 -50 L24 -36 Z" fill="#c9553d"/>
    <rect x="10" y="-74" width="18" height="38" fill="#f2e3c4" stroke="#c9b99a" stroke-width="1.5"/>
    <path d="M8 -74 L19 -88 L30 -74 Z" fill="#c9553d"/>
    <line x1="19" y1="-88" x2="19" y2="-96" stroke="#8f5c36" stroke-width="2"/>
    <line x1="15" y1="-93" x2="23" y2="-93" stroke="#8f5c36" stroke-width="2"/>
    <circle cx="19" cy="-62" r="4.5" fill="#3d3d3d"/>
    <path d="M-8 -18 a8 8 0 0 1 16 0 V0 H-8 Z" fill="#7a5b3a"/>`,
  luka: `
    <rect x="-42" y="-8" width="84" height="8" rx="2" fill="#c8bda6" stroke="#a89a7e"/>
    <g fill="#8a7a5c"><rect x="-34" y="-14" width="5" height="7" rx="1"/><rect x="-4" y="-14" width="5" height="7" rx="1"/><rect x="28" y="-14" width="5" height="7" rx="1"/></g>
    <line x1="14" y1="-40" x2="14" y2="-8" stroke="#6b6b6b" stroke-width="3"/>
    <line x1="14" y1="-36" x2="36" y2="-24" stroke="#6b6b6b" stroke-width="2.5"/>
    <line x1="36" y1="-24" x2="36" y2="-16" stroke="#444" stroke-width="1.5"/>
    <rect x="31" y="-16" width="10" height="8" fill="#e05e5e" stroke="#a8432f"/>
    <path d="M-22 -26 a7 7 0 1 0 -2 5 M-23 -33 v14 M-29 -22 h12" stroke="#4a5a6a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  zoo: `
    <rect x="-30" y="-26" width="60" height="26" rx="3" fill="none" stroke="#8a6240" stroke-width="2.5"/>
    <g stroke="#8a6240" stroke-width="2"><line x1="-20" y1="-26" x2="-20" y2="0"/><line x1="-10" y1="-26" x2="-10" y2="0"/><line x1="10" y1="-26" x2="10" y2="0"/><line x1="20" y1="-26" x2="20" y2="0"/></g>
    <path d="M-32 -26 Q0 -40 32 -26" fill="none" stroke="#8a6240" stroke-width="3"/>
    <circle cx="0" cy="-12" r="7" fill="#f2a24b"/>
    <circle cx="0" cy="-12" r="4.5" fill="#e8912f"/>
    <g fill="#f2a24b"><circle cx="-5" cy="-18" r="2.4"/><circle cx="5" cy="-18" r="2.4"/></g>`,
  svjetionik: `
    <path d="M-13 0 L-8 -52 H8 L13 0 Z" fill="#f6f0e0" stroke="#c9b99a" stroke-width="1.5"/>
    <path d="M-11.5 -14 L11.5 -14 L12.5 -2 L-12.5 -2 Z" fill="#e05e5e"/>
    <path d="M-9.5 -40 L9.5 -40 L10 -30 L-10 -30 Z" fill="#e05e5e"/>
    <rect x="-9" y="-62" width="18" height="10" rx="2" fill="#3d4a5a"/>
    <rect x="-6" y="-60" width="12" height="6" fill="#ffe9a8"/>
    <path d="M6 -57 L30 -64 L30 -50 Z" fill="#ffe9a8" opacity=".55"/>
    <path d="M-6 -57 L-30 -64 L-30 -50 Z" fill="#ffe9a8" opacity=".55"/>
    <path d="M-13 -62 L0 -72 L13 -62 Z" fill="#c9553d"/>`,
  zidine: `
    <path d="M-46 0 V-22 h8 v6 h8 v-6 h8 v6 h8 v-6 h8 v6 h8 v-6 h8 v6 h8 v-6 h8 V0 Z" fill="#d8cfc0" stroke="#a89a7e" stroke-width="1.5"/>
    <rect x="-46" y="-38" width="16" height="38" fill="#cfc4b0" stroke="#a89a7e" stroke-width="1.5"/>
    <path d="M-46 -38 h4 v-5 h4 v5 h4 v-5 h4 v5" fill="#cfc4b0" stroke="#a89a7e" stroke-width="1.5"/>
    <rect x="-41" y="-30" width="6" height="9" rx="3" fill="#5f5545"/>`,
  dvorac: `
    <rect x="-30" y="-34" width="60" height="34" fill="#d8cfc0" stroke="#a89a7e" stroke-width="1.5"/>
    <rect x="-40" y="-52" width="18" height="52" fill="#cfc4b0" stroke="#a89a7e" stroke-width="1.5"/>
    <rect x="22" y="-52" width="18" height="52" fill="#cfc4b0" stroke="#a89a7e" stroke-width="1.5"/>
    <path d="M-40 -52 h4.5 v-6 h4.5 v6 h4.5 v-6 h4.5 v6" fill="none" stroke="#a89a7e" stroke-width="1.5"/>
    <path d="M22 -52 h4.5 v-6 h4.5 v6 h4.5 v-6 h4.5 v6" fill="none" stroke="#a89a7e" stroke-width="1.5"/>
    <path d="M-30 -34 h6 v-5 h6 v5 h6 v-5 h6 v5 h6 v-5 h6 v5 h6" fill="none" stroke="#a89a7e" stroke-width="1.5"/>
    <path d="M-6 -16 a6 6 0 0 1 12 0 V0 H-6 Z" fill="#5f5545"/>
    <line x1="-31" y1="-52" x2="-31" y2="-64" stroke="#8f5c36" stroke-width="2"/>
    <g class="castle-flag"><path d="M-31 -64 L-19 -60 L-31 -56 Z" fill="#e05e5e"/></g>`,
  kamp: `
    <path d="M-22 0 L0 -32 L22 0 Z" fill="#f2a24b" stroke="#d18432" stroke-width="1.5"/>
    <path d="M-8 0 L0 -32 L8 0 Z" fill="#c77f2e"/>
    <path d="M-4 0 L0 -14 L4 0 Z" fill="#5f4630"/>
    <g transform="translate(30 0)">
      <line x1="-6" y1="-2" x2="6" y2="-8" stroke="#6b4a2e" stroke-width="2"/>
      <line x1="-6" y1="-8" x2="6" y2="-2" stroke="#6b4a2e" stroke-width="2"/>
      <path class="fire-flame" d="M0 -8 Q-5 -14 0 -20 Q5 -14 0 -8" fill="#f2994b"/>
      <path class="fire-flame" d="M0 -9 Q-2.5 -13 0 -17 Q2.5 -13 0 -9" fill="#ffd76e"/>
    </g>`,
  park: `
    <rect x="-4" y="-16" width="8" height="16" rx="2" fill="#8a6240" transform="translate(-18 0)"/>
    <circle cx="-18" cy="-26" r="14" fill="#4e8a4a"/>
    <rect x="-4" y="-13" width="8" height="13" rx="2" fill="#8a6240" transform="translate(20 0)"/>
    <circle cx="20" cy="-21" r="11" fill="#5d9c56"/>
    <rect x="-9" y="-9" width="20" height="3" rx="1.5" fill="#b0764a"/>
    <line x1="-7" y1="-6" x2="-7" y2="0" stroke="#8f5c36" stroke-width="2"/>
    <line x1="9" y1="-6" x2="9" y2="0" stroke="#8f5c36" stroke-width="2"/>
    <rect x="-9" y="-14" width="20" height="3" rx="1.5" fill="#c9915c"/>`,
  most: `
    <path d="M-30 0 L-30 -14 Q0 -30 30 -14 L30 0 L22 0 L22 -10 Q0 -22 -22 -10 L-22 0 Z"
          fill="#d8cfc0" stroke="#a89a7e" stroke-width="1.5"/>
    <g stroke="#a89a7e" stroke-width="1">
      <line x1="-15" y1="-13" x2="-15" y2="-19"/><line x1="0" y1="-16" x2="0" y2="-23"/><line x1="15" y1="-13" x2="15" y2="-19"/>
    </g>
    <line x1="-28" y1="-16" x2="28" y2="-16" stroke="#b8ac94" stroke-width="2.5"/>`,
  pekara: `
    <rect x="-24" y="-28" width="48" height="28" rx="2" fill="#f2e3c4" stroke="#cbb890" stroke-width="1.5"/>
    <path d="M-28 -28 L0 -42 L28 -28 Z" fill="#b0764a"/>
    <path d="M-24 -22 Q-18 -16 -12 -22 Q-6 -16 0 -22 Q6 -16 12 -22 Q18 -16 24 -22" fill="#e05e5e" stroke="#c14a4a"/>
    <rect x="-6" y="-13" width="12" height="13" rx="1.5" fill="#7a5b3a"/>
    <ellipse cx="15" cy="-17" rx="6" ry="3.5" fill="#d9a45c" stroke="#b07f38" transform="rotate(-20 15 -17)"/>
    <rect x="-19" y="-18" width="9" height="8" fill="#9fd1ef" stroke="#6f8ba1"/>`,
  kino: `
    <rect x="-28" y="-32" width="56" height="32" rx="2" fill="#5a6b8a" stroke="#43506b" stroke-width="1.5"/>
    <rect x="-30" y="-38" width="60" height="9" rx="2" fill="#f6f0e0" stroke="#d8cfc0"/>
    <text x="0" y="-30.5" font-size="8" text-anchor="middle" fill="#c9553d" font-family="sans-serif" font-weight="bold">KINO</text>
    <rect x="-8" y="-14" width="16" height="14" rx="1.5" fill="#2e3547"/>
    <path d="M-19 -24 L-17 -19 L-12 -19 L-16 -16 L-14 -11 L-19 -14 L-24 -11 L-22 -16 L-26 -19 L-21 -19 Z" fill="#ffd76e"/>
    <circle cx="18" cy="-20" r="4.5" fill="#ffd76e" opacity=".85"/>`,
  muzej: `
    <rect x="-30" y="-6" width="60" height="6" fill="#c8bda6" stroke="#a89a7e"/>
    <rect x="-26" y="-30" width="52" height="24" fill="#f2ead8" stroke="#cbb890" stroke-width="1.5"/>
    <g fill="#e4d9c0" stroke="#b8ac94">
      <rect x="-22" y="-28" width="6" height="22"/><rect x="-8" y="-28" width="6" height="22"/>
      <rect x="6" y="-28" width="6" height="22"/><rect x="18" y="-28" width="6" height="22"/>
    </g>
    <path d="M-32 -30 L0 -46 L32 -30 Z" fill="#e4d9c0" stroke="#b8ac94" stroke-width="1.5"/>
    <circle cx="0" cy="-36" r="3.5" fill="#c9553d"/>`,
};

/* ─── Bewohner: erscheinen mit wachsender Einwohnerzahl.
   Antippen → kroatischer Gruß + Kurz-Übung (nur freigeschaltete Wörter,
   da selectSessionWords über wordsForProfile ausschließlich freigeschaltete
   Kategorien liefert). ─── */
const CITY_VILLAGERS = [
  { id: 'ana',   name: 'Ana',   minPop: 30,  x: 415, y: 448, greetHr: 'Dobar dan!',  greetDe: 'Guten Tag!',
    shirt: '#e05e5e', skirt: true },
  { id: 'marko', name: 'Marko', minPop: 90,  x: 490, y: 450, greetHr: 'Bok!',        greetDe: 'Hallo!',
    shirt: '#4a7fb5', skirt: false },
  { id: 'ivana', name: 'Ivana', minPop: 180, x: 250, y: 445, greetHr: 'Dobro jutro!', greetDe: 'Guten Morgen!',
    shirt: '#7bb661', skirt: true },
];

function _villagerArt(v) {
  return `
    <circle cx="0" cy="-30" r="7.5" fill="#f2c9a0"/>
    <path d="M-7 -33 Q0 -42 7 -33 Q4 -37 0 -37 Q-4 -37 -7 -33 Z" fill="#6b4a2e"/>
    ${v.skirt
      ? `<path d="M-6 -23 L6 -23 L10 -4 L-10 -4 Z" fill="${v.shirt}"/>`
      : `<rect x="-6.5" y="-23" width="13" height="14" rx="3" fill="${v.shirt}"/>
         <rect x="-6" y="-9" width="5" height="9" fill="#3d4a5a"/>
         <rect x="1" y="-9" width="5" height="9" fill="#3d4a5a"/>`}
    <line x1="-6" y1="-20" x2="-11" y2="-11" stroke="#f2c9a0" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="6" y1="-20" x2="11" y2="-11" stroke="#f2c9a0" stroke-width="2.5" stroke-linecap="round"/>`;
}

/* ─── Stadt-Zustand ─── */
function _cityState() {
  const p = state.profile;
  if (!p) return null;
  if (!p.city || typeof p.city !== 'object') p.city = { buildings: [], spent: 0 };
  if (!Array.isArray(p.city.buildings)) p.city.buildings = [];
  if (typeof p.city.spent !== 'number') p.city.spent = 0;
  // Migration v1 → v2: alte Einträge {type, slot} bekommen einen festen Platz
  p.city.buildings.forEach(b => {
    if (!b.spot || !CITY_SPOTS.find(s => s.spot === b.spot)) {
      const free = CITY_SPOTS.find(s =>
        s.type === b.type && !p.city.buildings.some(o => o !== b && o.spot === s.spot));
      b.spot = free ? free.spot : null;
      delete b.slot;
    }
  });
  p.city.buildings = p.city.buildings.filter(b => b.spot);
  return p.city;
}

function cityCoins() {
  const p = state.profile;
  if (!p) return 0;
  return Math.max(0, (p.xp || 0) - (_cityState().spent || 0));
}

function cityPopulation() {
  const mastered = masteredCountAll(state.profile || {});
  return mastered * 3 + _cityState().buildings.length * 2;
}

function _buildingDef(typeId) {
  return CITY_BUILDINGS.find(b => b.id === typeId);
}

function _cityLockReason(def) {
  if (def.req) {
    const have = masteredCount(def.req.cat);
    if (have < def.req.n) return `Meistere noch ${def.req.n - have} Wörter in „${def.req.cat}"`;
  }
  if (def.reqTotal) {
    const have = masteredCountAll(state.profile || {});
    if (have < def.reqTotal) return `Meistere noch ${def.reqTotal - have} Wörter insgesamt`;
  }
  return null;
}

/* ─── Szene ─── */
function _citySceneSVG() {
  return `
  <svg id="city-svg" viewBox="0 0 800 780" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Moj Grad — Küstenstadt">
    <defs>
      <linearGradient id="cg-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8ecdf0"/><stop offset=".45" stop-color="#bfe3f7"/><stop offset=".82" stop-color="#ffedc9"/><stop offset="1" stop-color="#ffe9c4"/>
      </linearGradient>
      <linearGradient id="cg-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4aa3d8"/><stop offset="1" stop-color="#2a6f9e"/>
      </linearGradient>
      <linearGradient id="cg-hill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a9c97a"/><stop offset="1" stop-color="#7fae57"/>
      </linearGradient>
    </defs>

    <!-- Himmel (volle Höhe, Land ist nach unten versetzt) -->
    <rect x="0" y="0" width="800" height="720" fill="url(#cg-sky)"/>
    <circle cx="690" cy="95" r="38" fill="#ffd76e"/>
    <circle cx="690" cy="95" r="52" fill="#ffd76e" opacity=".25"/>
    <g class="cloud cloud-a"><ellipse cx="0" cy="0" rx="42" ry="14" fill="#fff" opacity=".9"/><ellipse cx="28" cy="-8" rx="26" ry="11" fill="#fff" opacity=".9"/></g>
    <g class="cloud cloud-b"><ellipse cx="0" cy="0" rx="34" ry="12" fill="#fff" opacity=".8"/><ellipse cx="-24" cy="-6" rx="20" ry="9" fill="#fff" opacity=".8"/></g>
    <g class="gull gull-a"><path d="M-9 0 Q-4.5 -6 0 -1 Q4.5 -6 9 0" fill="none" stroke="#4a5a6a" stroke-width="2" stroke-linecap="round"/></g>
    <g class="gull gull-b"><path d="M-7 0 Q-3.5 -5 0 -1 Q3.5 -5 7 0" fill="none" stroke="#4a5a6a" stroke-width="1.6" stroke-linecap="round"/></g>

    <g transform="translate(0 190)">
    <!-- Berg (Biokovo) -->
    <path d="M-20 300 L150 120 L260 220 L360 90 L520 260 L640 170 L820 300 Z" fill="#8b93a7"/>
    <path d="M340 115 L360 90 L390 122 L372 118 L358 132 Z" fill="#f2f5f8"/>
    <path d="M-20 300 L120 190 L300 300 Z" fill="#7d8699" opacity=".6"/>

    <!-- Hügel + Dorf-Hang -->
    <path d="M-10 320 Q200 240 420 290 Q620 330 810 280 L810 470 L-10 470 Z" fill="url(#cg-hill)"/>
    <path d="M-10 380 Q250 330 500 372 Q680 400 810 370 L810 480 L-10 480 Z" fill="#8fbb63"/>
    <!-- Zypressen als Deko -->
    <g fill="#3f6d3f">
      <path d="M95 268 Q84 250 88 232 Q92 214 95 208 Q98 214 102 232 Q106 250 95 268 Z"/>
      <rect x="93" y="266" width="4" height="8" fill="#6b4a2e"/>
      <path d="M470 262 Q460 246 464 230 Q467 216 470 210 Q473 216 476 230 Q480 246 470 262 Z"/>
      <rect x="468" y="260" width="4" height="7" fill="#6b4a2e"/>
      <path d="M737 330 Q728 314 731 298 Q734 286 737 280 Q740 286 743 298 Q746 314 737 330 Z"/>
      <rect x="735" y="328" width="4" height="7" fill="#6b4a2e"/>
    </g>
    <!-- Bach: entspringt einem Bergsee, mäandert zum Meer (Brücke „most" führt darüber) -->
    <ellipse cx="186" cy="252" rx="16" ry="6" fill="#4aa3d8"/>
    <path d="M186 252 C 158 290, 176 330, 150 365 S 122 430, 130 470"
          stroke="#4aa3d8" stroke-width="13" fill="none" opacity=".95" stroke-linecap="round"/>
    <path d="M186 252 C 158 290, 176 330, 150 365 S 122 430, 130 470"
          stroke="#8fd0f2" stroke-width="5" fill="none" opacity=".85" stroke-linecap="round"/>
    <!-- Kleine Inseln am Horizont -->
    <ellipse cx="655" cy="452" rx="40" ry="7" fill="#7d8699" opacity=".55"/>
    <path d="M630 452 Q655 436 682 452 Z" fill="#8b93a7" opacity=".65"/>
    <ellipse cx="540" cy="455" rx="22" ry="4" fill="#7d8699" opacity=".4"/>
    <path d="M528 455 Q540 447 553 455 Z" fill="#8b93a7" opacity=".5"/>
    <path d="M540 447 L540 438 L546 445 Z" fill="#f6f0e0" opacity=".7"/>
    <!-- Weg zum Dorf -->
    <path d="M400 470 Q420 400 380 350 Q350 310 300 300" fill="none" stroke="#e8dcbf" stroke-width="10" stroke-linecap="round" opacity=".7"/>

    <!-- Riva (Uferpromenade) -->
    <path d="M-10 452 L810 452 L810 470 L-10 470 Z" fill="#d8cfc0"/>
    <path d="M-10 468 L810 468 L810 474 L-10 474 Z" fill="#b8ac94"/>

    <!-- Meer im Vordergrund (Blick vom Wasser) -->
    <rect x="0" y="472" width="800" height="130" fill="url(#cg-sea)"/>
    <g class="waves" stroke="#bfe6ff" stroke-width="2.5" fill="none" opacity=".65" stroke-linecap="round">
      <path d="M-40 494 Q-25 488 -10 494 T20 494 T50 494 T80 494 T110 494 T140 494 T170 494 T200 494 T230 494 T260 494 T290 494 T320 494 T350 494 T380 494 T410 494 T440 494 T470 494 T500 494 T530 494 T560 494 T590 494 T620 494 T650 494 T680 494 T710 494 T740 494 T770 494 T800 494 T830 494 T860 494"/>
    </g>
    <g class="waves waves-slow" stroke="#a5d8f2" stroke-width="2" fill="none" opacity=".45" stroke-linecap="round">
      <path d="M-40 526 Q-25 520 -10 526 T20 526 T50 526 T80 526 T110 526 T140 526 T170 526 T200 526 T230 526 T260 526 T290 526 T320 526 T350 526 T380 526 T410 526 T440 526 T470 526 T500 526 T530 526 T560 526 T590 526 T620 526 T650 526 T680 526 T710 526 T740 526 T770 526 T800 526 T830 526 T860 526"/>
    </g>

    <g class="waves" stroke="#8fc5e8" stroke-width="2" fill="none" opacity=".35" stroke-linecap="round">
      <path d="M-40 566 Q-25 560 -10 566 T20 566 T50 566 T80 566 T110 566 T140 566 T170 566 T200 566 T230 566 T260 566 T290 566 T320 566 T350 566 T380 566 T410 566 T440 566 T470 566 T500 566 T530 566 T560 566 T590 566 T620 566 T650 566 T680 566 T710 566 T740 566 T770 566 T800 566 T830 566 T860 566"/>
    </g>
    <!-- Springender Fisch -->
    <g class="fish" transform="translate(580 520)">
      <path d="M-8 0 Q0 -9 8 0 Q3 3 0 2 Q-3 3 -8 0 Z" fill="#7ea8c4"/>
      <path d="M8 0 L14 -5 L14 5 Z" fill="#6b94b0"/>
      <circle cx="-4" cy="-2" r="1.2" fill="#2e3547"/>
    </g>

    <!-- Bauplätze -->
    <g id="city-spots"></g>
    </g>
  </svg>`;
}

function renderCity() {
  const city = _cityState();
  if (!city) return;

  document.getElementById('city-coins').textContent = cityCoins();
  document.getElementById('city-population').textContent = cityPopulation();

  const holder = document.getElementById('city-scene-holder');
  if (!holder.querySelector('#city-svg')) holder.innerHTML = _citySceneSVG();

  const layer = holder.querySelector('#city-spots');
  layer.innerHTML = '';
  const coins = cityCoins();

  CITY_SPOTS.forEach(s => {
    const def = _buildingDef(s.type);
    const built = city.buildings.find(b => b.spot === s.spot);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${s.x} ${s.y}) scale(${s.scale})`);
    g.classList.add('city-spot');

    if (built) {
      g.classList.add('built');
      // Boot schaukelt auf dem Wasser
      if (s.type === 'brod') g.classList.add('bob');
      g.innerHTML = CITY_ART[s.type] || '';
      g.addEventListener('click', () => _showBuildingInfo(def, s.spot));
    } else {
      const lock = _cityLockReason(def);
      const affordable = coins >= def.cost;
      g.classList.add('ghost');
      if (lock) g.classList.add('locked');
      g.innerHTML = `
        <circle cx="0" cy="-18" r="24" class="ghost-ring"/>
        <text x="0" y="-24" text-anchor="middle" class="ghost-icon">${lock ? '🔒' : '＋'}</text>
        <text x="0" y="-4" text-anchor="middle" class="ghost-cost">${lock ? '' : (affordable ? '🪙' + def.cost : '🪙' + def.cost)}</text>`;
      g.addEventListener('click', () => _openBuildConfirm(def, s.spot));
    }
    layer.appendChild(g);
  });

  // Auto-Dekor: die Stadt wird von selbst lebendiger, je mehr gebaut ist
  const builtCount = city.buildings.length;
  if (builtCount >= 6) {
    [250, 450, 650].forEach(x => {
      const lamp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      lamp.setAttribute('transform', `translate(${x} 452)`);
      lamp.innerHTML = `
        <line x1="0" y1="0" x2="0" y2="-26" stroke="#43506b" stroke-width="2.5"/>
        <circle cx="0" cy="-28" r="4" fill="#ffe9a8" stroke="#43506b" stroke-width="1.5"/>`;
      layer.appendChild(lamp);
    });
  }
  if (builtCount >= 12) {
    const bunting = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    let tris = '';
    for (let x = 320; x <= 500; x += 20) {
      const y = 402 + Math.sin((x - 320) / 180 * Math.PI) * 8;
      const col = ['#e05e5e', '#f2c94c', '#4a7fb5', '#7bb661'][(x / 20) % 4 | 0];
      tris += `<path d="M${x} ${y} l4.5 8 l4.5 -8 Z" fill="${col}"/>`;
    }
    bunting.innerHTML = `
      <path d="M320 402 Q410 418 500 402" fill="none" stroke="#8a7a5c" stroke-width="1.5"/>${tris}`;
    layer.appendChild(bunting);
  }

  // Bewohner erscheinen, wenn die Stadt genug Einwohner hat
  const pop = cityPopulation();
  CITY_VILLAGERS.forEach(v => {
    if (pop < v.minPop) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${v.x} ${v.y})`);
    g.classList.add('city-spot', 'villager');
    g.innerHTML = _villagerArt(v);
    g.addEventListener('click', () => _openVillagerSheet(v));
    layer.appendChild(g);
  });
}

/* Bewohner-Dialog: Gruß hören + Kurz-Übung mit passenden Wörtern */
function _openVillagerSheet(v) {
  AudioManager.unlock();
  AudioManager.speakText(v.greetHr, 'hr');

  const sheet = document.getElementById('city-villager-sheet');
  document.getElementById('cv-name').textContent = v.name;
  document.getElementById('cv-hr').textContent = v.greetHr;
  document.getElementById('cv-de').textContent = v.greetDe;

  document.getElementById('cv-speak').onclick = () => {
    AudioManager.unlock();
    AudioManager.speakText(v.greetHr, 'hr');
  };
  document.getElementById('cv-quiz').onclick = () => {
    sheet.classList.add('hidden');
    state.currentCategory = null;         // gemischte Übung aus freigeschalteten Kategorien
    AudioManager.unlock();
    startTapGame(null);
  };
  sheet.classList.remove('hidden');
}

/* Bau-Dialog für einen konkreten Platz */
function _openBuildConfirm(def, spot) {
  AudioManager.unlock();
  AudioManager.speakText(def.hr, 'hr');

  const sheet = document.getElementById('city-build-sheet');
  document.getElementById('cb-emoji').textContent = def.emoji;
  document.getElementById('cb-hr').textContent = def.hr;
  document.getElementById('cb-de').textContent = def.de;

  const lock = _cityLockReason(def);
  const coins = cityCoins();
  const info = document.getElementById('cb-status');
  const buildBtn = document.getElementById('cb-build');

  if (lock) {
    info.textContent = `🔒 ${lock}`;
    buildBtn.style.display = 'none';
  } else if (coins < def.cost) {
    info.textContent = `Kostet 🪙 ${def.cost} — dir fehlen noch ${def.cost - coins} Novčići. Weiter üben! 💪`;
    buildBtn.style.display = 'none';
  } else {
    info.textContent = `Kostet 🪙 ${def.cost} · Du hast 🪙 ${coins}`;
    buildBtn.style.display = '';
    buildBtn.onclick = () => _buildBuilding(def, spot);
  }
  sheet.classList.remove('hidden');
}

async function _buildBuilding(def, spot) {
  const city = _cityState();
  if (cityCoins() < def.cost || _cityLockReason(def)) return;
  if (city.buildings.find(b => b.spot === spot)) return;

  city.spent += def.cost;
  city.buildings.push({ type: def.id, spot, paid: def.cost });
  document.getElementById('city-build-sheet').classList.add('hidden');
  renderCity();
  showConfetti(20);
  SoundManager.correct();
  AudioManager.unlock();
  AudioManager.speakText(def.hr, 'hr');
  _cityToast(`${def.emoji} ${def.hr} gebaut! (${def.de})`);
  await saveProfile();
  renderCity();
}

function _showBuildingInfo(def, spot) {
  if (!def) return;
  AudioManager.unlock();
  AudioManager.speakText(def.hr, 'hr');

  const info = document.getElementById('city-info-sheet');
  document.getElementById('ci-emoji').textContent = def.emoji;
  document.getElementById('ci-hr').textContent = def.hr;
  document.getElementById('ci-de').textContent = def.de;

  document.getElementById('ci-speak').onclick = () => {
    AudioManager.unlock();
    AudioManager.speakText(def.hr, 'hr');
  };
  document.getElementById('ci-demolish').onclick = async () => {
    const city = _cityState();
    const entry = city.buildings.find(b => b.spot === spot);
    // Erstattung = Hälfte des BEZAHLTEN Preises. Alt-Gebäude (vor der
    // Preiserhöhung, ohne paid-Feld) zahlten ~1/4 der heutigen Kosten.
    const paid = entry?.paid ?? Math.round(def.cost / 4);
    const refund = Math.floor(paid / 2);
    if (!confirm(`${def.emoji} ${def.hr} abreißen? Du bekommst ${refund} Novčići zurück.`)) return;
    city.buildings = city.buildings.filter(b => b.spot !== spot);
    city.spent = Math.max(0, city.spent - refund);
    info.classList.add('hidden');
    renderCity();
    await saveProfile();
    renderCity();
  };
  info.classList.remove('hidden');
}

function _cityToast(msg) {
  const t = document.getElementById('city-toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('visible'), 2600);
}

/* ─── Wiring ─── */
function wireCityEvents() {
  document.getElementById('btn-city-banner').addEventListener('click', () => {
    AudioManager.unlock();
    renderCity();
    navigate('city');
  });
  document.getElementById('city-back').addEventListener('click', () => {
    renderHome();
    navigate('home');
  });
  document.getElementById('city-build-close').addEventListener('click', () =>
    document.getElementById('city-build-sheet').classList.add('hidden'));
  document.getElementById('city-build-sheet').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });
  document.getElementById('city-info-close').addEventListener('click', () => {
    document.getElementById('city-info-sheet').classList.add('hidden');
  });
  document.getElementById('city-info-sheet').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });
  document.getElementById('cv-close').addEventListener('click', () => {
    document.getElementById('city-villager-sheet').classList.add('hidden');
  });
  document.getElementById('city-villager-sheet').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });
}

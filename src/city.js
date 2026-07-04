/* Cro Swipe — city.js: „Moj Grad" v2 — Panorama-Küstenstädtchen.
   Blick vom Meer auf ein dalmatinisches Dorf: Berg im Hintergrund,
   Häuser am Hang, Riva am Wasser. Gebäude haben feste Plätze in der
   Szene und erscheinen dort, wenn sie gebaut werden (Geist-Silhouette
   vorher). Übungen verdienen Novčići (= XP − Verbautes); Premium-
   Gebäude verlangen zusätzlich gemeisterte Wörter. */

'use strict';

/* ─── Gebäude-Katalog ─── */
const CITY_BUILDINGS = [
  { id: 'kuca',       hr: 'kuća',          de: 'Haus',         emoji: '🏠', cost: 100 },
  { id: 'stablo',     hr: 'stablo',        de: 'Baum',         emoji: '🌳', cost: 50  },
  { id: 'cvijece',    hr: 'cvijeće',       de: 'Blumen',       emoji: '🌷', cost: 60  },
  { id: 'fontana',    hr: 'fontana',       de: 'Brunnen',      emoji: '⛲', cost: 180 },
  { id: 'igraliste',  hr: 'igralište',     de: 'Spielplatz',   emoji: '🛝', cost: 140, req: { cat: 'Freizeit',  n: 5 } },
  { id: 'plaza',      hr: 'plaža',         de: 'Strand',       emoji: '🏖️', cost: 150, req: { cat: 'Natur',     n: 8 } },
  { id: 'brod',       hr: 'brod',          de: 'Boot',         emoji: '⛵', cost: 180, req: { cat: 'Fahrzeuge', n: 5 } },
  { id: 'trznica',    hr: 'tržnica',       de: 'Markt',        emoji: '🍎', cost: 200, req: { cat: 'Essen',     n: 10 } },
  { id: 'skola',      hr: 'škola',         de: 'Schule',       emoji: '🏫', cost: 220, req: { cat: 'Schule',    n: 10 } },
  { id: 'konoba',     hr: 'konoba',        de: 'Wirtshaus',    emoji: '🍽️', cost: 240, req: { cat: 'Essen',     n: 15 } },
  { id: 'crkva',      hr: 'crkva',         de: 'Kirche',       emoji: '⛪', cost: 250, req: { cat: 'Hallo Kroatien', n: 10 } },
  { id: 'luka',       hr: 'luka',          de: 'Hafen',        emoji: '⚓', cost: 260, req: { cat: 'Fahrzeuge', n: 8 } },
  { id: 'zoo',        hr: 'zoološki vrt',  de: 'Zoo',          emoji: '🦁', cost: 300, req: { cat: 'Tiere',     n: 15 } },
  { id: 'svjetionik', hr: 'svjetionik',    de: 'Leuchtturm',   emoji: '🗼', cost: 320, reqTotal: 40 },
  { id: 'zidine',     hr: 'zidine',        de: 'Stadtmauern',  emoji: '🧱', cost: 350, reqTotal: 60 },
  { id: 'dvorac',     hr: 'dvorac',        de: 'Burg',         emoji: '🏰', cost: 400, reqTotal: 80 },
];

/* ─── Feste Bauplätze in der Szene (SVG-Koordinaten, viewBox 800×560) ───
   scale skaliert die Gebäude-Zeichnung am jeweiligen Platz. */
const CITY_SPOTS = [
  { spot: 'dvorac',     type: 'dvorac',     x: 236, y: 208, scale: 1.15 },
  { spot: 'zidine',     type: 'zidine',     x: 355, y: 235, scale: 1.0  },
  { spot: 'zoo',        type: 'zoo',        x: 108, y: 330, scale: 1.0  },
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
    <rect x="10" y="-32" width="11" height="11" rx="1" fill="#9fd1ef" stroke="#6f8ba1"/>`,
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
    <path d="M-7 -28 Q0 -40 7 -28" fill="none" stroke="#9fd1ef" stroke-width="2.5" stroke-linecap="round"/>`,
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
    <circle cx="16" cy="-10" r="4" fill="#f2c94c" opacity=".85"/>`,
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
    <path d="M-31 -64 L-19 -60 L-31 -56 Z" fill="#e05e5e"/>`,
};

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
    <!-- Kleine Inseln am Horizont rechts -->
    <ellipse cx="655" cy="452" rx="40" ry="7" fill="#7d8699" opacity=".55"/>
    <path d="M630 452 Q655 436 682 452 Z" fill="#8b93a7" opacity=".65"/>
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
  city.buildings.push({ type: def.id, spot });
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
    if (!confirm(`${def.emoji} ${def.hr} abreißen? Du bekommst ${Math.floor(def.cost / 2)} Novčići zurück.`)) return;
    const city = _cityState();
    city.buildings = city.buildings.filter(b => b.spot !== spot);
    city.spent = Math.max(0, city.spent - Math.floor(def.cost / 2));
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
}

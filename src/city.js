/* Cro Swipe — city.js: „Moj Grad" — niedliches kroatisches Küstendorf.
   Belohnungsmodus: Übungen verdienen Novčići (= XP), damit werden Gebäude
   gebaut. Premium-Gebäude sind zusätzlich an Lernziele gekoppelt, damit
   Meisterschaft (nicht XP-Farming) die Stadt wachsen lässt.
   Anschauen ist immer gratis — nur Bauen kostet. */

'use strict';

/* ─── Gebäude-Katalog ───
   cost: Novčići · req: { cat, n } = n gemeisterte Wörter der Kategorie
   reqTotal: n gemeisterte Wörter insgesamt */
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

const CITY_SLOTS = 16;

/* ─── Stadt-Zustand am Profil ─── */
function _cityState() {
  const p = state.profile;
  if (!p) return null;
  if (!p.city || typeof p.city !== 'object') p.city = { buildings: [], spent: 0 };
  if (!Array.isArray(p.city.buildings)) p.city.buildings = [];
  if (typeof p.city.spent !== 'number') p.city.spent = 0;
  return p.city;
}

/* Novčići = verdiente XP minus bereits verbaute */
function cityCoins() {
  const p = state.profile;
  if (!p) return 0;
  return Math.max(0, (p.xp || 0) - (_cityState().spent || 0));
}

/* Einwohner wachsen mit Gelerntem und Gebautem */
function cityPopulation() {
  const mastered = masteredCountAll(state.profile || {});
  return mastered * 3 + _cityState().buildings.length * 2;
}

function _buildingDef(typeId) {
  return CITY_BUILDINGS.find(b => b.id === typeId);
}

/* Bau-Bedingung prüfen → null (frei) oder Begründungstext */
function _cityLockReason(def) {
  if (def.req) {
    const have = masteredCount(def.req.cat);
    if (have < def.req.n) {
      return `Meistere noch ${def.req.n - have} Wörter in „${def.req.cat}"`;
    }
  }
  if (def.reqTotal) {
    const have = masteredCountAll(state.profile || {});
    if (have < def.reqTotal) {
      return `Meistere noch ${def.reqTotal - have} Wörter insgesamt`;
    }
  }
  return null;
}

/* ─── Rendering ─── */
function renderCity() {
  const city = _cityState();
  if (!city) return;

  document.getElementById('city-coins').textContent = cityCoins();
  document.getElementById('city-population').textContent = cityPopulation();

  const grid = document.getElementById('city-grid');
  grid.innerHTML = '';
  for (let slot = 0; slot < CITY_SLOTS; slot++) {
    const placed = city.buildings.find(b => b.slot === slot);
    const tile = document.createElement('button');
    tile.className = 'city-tile' + (placed ? ' built' : '');
    if (placed) {
      const def = _buildingDef(placed.type);
      tile.innerHTML = `
        <span class="city-tile-emoji">${def?.emoji || '❓'}</span>
        <span class="city-tile-name">${def?.hr || ''}</span>`;
      tile.addEventListener('click', () => _showBuildingInfo(placed, slot));
    } else {
      tile.innerHTML = '<span class="city-tile-plus">＋</span>';
      tile.addEventListener('click', () => _openBuildMenu(slot));
    }
    grid.appendChild(tile);
  }
}

/* Bau-Menü für einen leeren Slot */
function _openBuildMenu(slot) {
  const sheet = document.getElementById('city-build-sheet');
  const list = document.getElementById('city-build-list');
  list.innerHTML = '';
  const coins = cityCoins();

  CITY_BUILDINGS.forEach(def => {
    const lock = _cityLockReason(def);
    const affordable = coins >= def.cost;
    const btn = document.createElement('button');
    btn.className = 'city-build-item' + (lock || !affordable ? ' locked' : '');
    btn.innerHTML = `
      <span class="cb-emoji">${def.emoji}</span>
      <span class="cb-names"><strong>${def.hr}</strong><small>${def.de}</small></span>
      <span class="cb-cost">${lock ? '🔒' : `🪙 ${def.cost}`}</span>`;
    if (lock) {
      btn.addEventListener('click', () => {
        _cityToast(`${def.emoji} ${lock}`);
      });
    } else if (!affordable) {
      btn.addEventListener('click', () => {
        _cityToast(`Noch ${def.cost - coins} Novčići — weiter üben! 💪`);
      });
    } else {
      btn.addEventListener('click', () => _buildBuilding(def, slot));
    }
    list.appendChild(btn);
  });

  sheet.classList.remove('hidden');
  sheet.dataset.slot = slot;
}

function _closeBuildMenu() {
  document.getElementById('city-build-sheet').classList.add('hidden');
}

async function _buildBuilding(def, slot) {
  const city = _cityState();
  if (cityCoins() < def.cost || _cityLockReason(def)) return;
  if (city.buildings.find(b => b.slot === slot)) return;

  city.spent += def.cost;
  city.buildings.push({ type: def.id, slot });
  _closeBuildMenu();
  renderCity();
  showConfetti(20);
  SoundManager.correct();
  AudioManager.unlock();
  AudioManager.speakText(def.hr, 'hr');
  _cityToast(`${def.emoji} ${def.hr} gebaut! (${def.de})`);
  await saveProfile();
  renderCity();   // Coins-Anzeige nach Server-Merge auffrischen
}

/* Info-Popup für gebautes Gebäude: Name hören + Abreißen (50 % zurück) */
function _showBuildingInfo(placed, slot) {
  const def = _buildingDef(placed.type);
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
    city.buildings = city.buildings.filter(b => b.slot !== slot);
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
  document.getElementById('city-build-close').addEventListener('click', _closeBuildMenu);
  document.getElementById('city-build-sheet').addEventListener('click', e => {
    if (e.target === e.currentTarget) _closeBuildMenu();
  });
  document.getElementById('city-info-close').addEventListener('click', () => {
    document.getElementById('city-info-sheet').classList.add('hidden');
  });
  document.getElementById('city-info-sheet').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });
}

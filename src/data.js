/* Cro Swipe — data.js: Reine Daten, Konfiguration und Logik ohne DOM-Zugriff */

'use strict';

/* ─── Age-based configuration ─── */
const AGE_CONFIG = {
  default: {
    sessionWords: 10,
    matchPairs: 6,
    tapChoices: 4,
    streakGoal: 7,
    difficultyTier: 1,
    xpCorrect: 15,
    xpWrong: 4,
    showHintAfterMs: 4000,
  },
  8: {
    sessionWords: 8,
    matchPairs: 4,
    tapChoices: 4,
    streakGoal: 5,
    difficultyTier: 1,
    xpCorrect: 15,
    xpWrong: 5,        // more XP for trying (8-year-olds need encouragement)
    showHintAfterMs: 3000,
  },
  11: {
    sessionWords: 12,
    matchPairs: 6,
    tapChoices: 4,
    streakGoal: 14,
    difficultyTier: 2,
    xpCorrect: 12,
    xpWrong: 3,
    showHintAfterMs: 6000,
  },
  12: {
    sessionWords: 12,
    matchPairs: 6,
    tapChoices: 4,
    streakGoal: 14,
    difficultyTier: 2,
    xpCorrect: 12,
    xpWrong: 3,
    showHintAfterMs: 8000,
  },
};

/* Junge Profile (≤8) können noch kaum lesen — Spiele zeigen dann
   Bild-Antworten und setzen stärker auf Audio ("Ohren-Modus"). */
function isYoungReader() {
  return (state.profile?.age || 10) <= 8;
}

function ageConfig(age) {
  const cfg = AGE_CONFIG[age] || AGE_CONFIG.default;
  return { ...AGE_CONFIG.default, ...cfg };
}

/* ─── Zahlen: Croatian number word → digit ─── */
const ZAHLEN_NUMERAL = {
  'Nula': '0', 'Jedan': '1', 'Dva': '2', 'Tri': '3', 'Četiri': '4',
  'Pet': '5', 'Šest': '6', 'Sedam': '7', 'Osam': '8', 'Devet': '9',
  'Deset': '10', 'Jedanaest': '11', 'Dvanaest': '12', 'Trinaest': '13',
  'Četrnaest': '14', 'Petnaest': '15', 'Šesnaest': '16', 'Sedamnaest': '17',
  'Osamnaest': '18', 'Devetnaest': '19', 'Dvadeset': '20', 'Trideset': '30',
  'Pedeset': '50', 'Sto': '100', 'Tisuća': '1.000',
};
function getWordNumeral(word) {
  if (word.category !== 'Zahlen') return null;
  return ZAHLEN_NUMERAL[word.croatian] || null;
}

/* ─── Category / World definitions ─── */
const WORLDS = [
  { id: 'Hallo Kroatien', name: 'Hallo Kroatien!', emoji: '🇭🇷', color: 'var(--cat-hallo)'       },
  { id: 'Zahlen',         name: 'Zahlen',           emoji: '🔢', color: 'var(--cat-zahlen)'      },
  { id: 'Farben',         name: 'Farben',           emoji: '🎨', color: 'var(--cat-farben)'      },
  { id: 'Tiere',          name: 'Tiere',            emoji: '🦁', color: 'var(--cat-zoo)'         },
  { id: 'Zu Hause',       name: 'Zu Hause',         emoji: '🏠', color: 'var(--cat-zuhause)'     },
  { id: 'Essen',          name: 'Essen & Trinken',  emoji: '🍎', color: 'var(--cat-essen)'       },
  { id: 'Schule',         name: 'In der Schule',    emoji: '📚', color: 'var(--cat-schule)'      },
  { id: 'Körper',         name: 'Mein Körper',      emoji: '🧍', color: 'var(--cat-koerper)'     },
  { id: 'Kleidung',       name: 'Kleidung',         emoji: '👕', color: 'var(--cat-kleidung)'    },
  { id: 'Natur',          name: 'Natur',            emoji: '🌳', color: 'var(--cat-natur)'       },
  { id: 'Fahrzeuge',      name: 'Fahrzeuge',        emoji: '🚗', color: 'var(--cat-fahrzeuge)'   },
  { id: 'Freizeit',       name: 'Freizeit & Hobby', emoji: '🎮', color: 'var(--cat-sport)'       },
  { id: 'Wochentage',     name: 'Wochentage',       emoji: '📆', color: 'var(--cat-wochentage)'  },
  { id: 'Verben',         name: 'Was ich tue',      emoji: '🏃', color: 'var(--cat-verben)'      },
  { id: 'Gefühle',        name: 'Gefühle',          emoji: '😊', color: 'var(--cat-gefuehle)'    },
  { id: 'Kroatien',       name: 'Im Urlaub',        emoji: '🏖️', color: 'var(--cat-kroatien)'    },
  { id: 'Zeit',           name: 'Zeit & Jahreszeit',emoji: '🌸', color: 'var(--cat-zeit)'        },
  { id: 'Eigenschaften',  name: 'Wie ist es?',      emoji: '💪', color: 'var(--cat-eigenschaften)'},
  { id: 'Biti',           name: 'Ich bin… (Biti)',  emoji: '💭', color: 'var(--cat-biti)'         },
  { id: 'Familie',        name: 'Meine Familie',    emoji: '👨‍👩‍👧‍👦', color: 'var(--cat-familie)'      },
  { id: 'Sport',          name: 'Sport & Musik',    emoji: '⚽', color: 'var(--cat-sport2)'       },
  { id: 'Wetter',         name: 'Das Wetter',       emoji: '☀️', color: 'var(--cat-wetter)'       },
];

/* ─── Vocabulary loader ─── */
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // BUG-02 FIX: Guard against empty file (lines is empty → shift() returns undefined)
  if (!lines.length) return [];
  const header = lines.shift().split(',').map(h => h.trim());
  // Only the header line present, no data rows
  if (!lines.length) return [];
  return lines.map(line => {
    const cols = splitCSVLine(line);
    const item = {};
    header.forEach((h, i) => { item[h] = (cols[i] || '').trim(); });
    return {
      id: item.id || String(Math.random()),
      german: item.word_de || item.german || '',
      croatian: item.word_hr || item.croatian || '',
      category: item.world || item.category || '',
      emoji: item.emoji || '🔸',
      level: parseInt(item.level || '1', 10),
    };
  }).filter(w => w.german && w.croatian);
}

function splitCSVLine(line) {
  // Handle commas inside quotes
  const result = [];
  let cur = '';
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { result.push(cur); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}

async function loadVocabulary() {
  try {
    const res = await fetch('content/words.csv');
    if (!res.ok) throw new Error('no csv');
    const txt = await res.text();
    state.vocabulary = parseCSV(txt);
    console.log('Loaded', state.vocabulary.length, 'words');
  } catch (e) {
    console.warn('CSV load failed, using fallback');
    state.vocabulary = [
      { id:'1', german:'Hund',   croatian:'Pas',    category:'Zoo',          emoji:'🐕', level:1 },
      { id:'2', german:'Katze',  croatian:'Mačka',  category:'Zoo',          emoji:'🐱', level:1 },
      { id:'3', german:'Vogel',  croatian:'Ptica',  category:'Zoo',          emoji:'🐦', level:1 },
      { id:'4', german:'Rot',    croatian:'Crvena', category:'Hallo Kroatien', emoji:'🔴', level:1 },
      { id:'5', german:'Blau',   croatian:'Plava',  category:'Hallo Kroatien', emoji:'🔵', level:1 },
      { id:'6', german:'Danke',  croatian:'Hvala',  category:'Hallo Kroatien', emoji:'🙏', level:1 },
    ];
  }
}

/* ─── Profile helpers ─── */
function wordsForProfile() {
  if (!state.profile) return state.vocabulary;
  const tier = ageConfig(state.profile.age).difficultyTier;
  // Return words at or below current difficulty tier
  return state.vocabulary.filter(w => w.level <= tier + 1);
}

function wordAccuracy(wordId) {
  const wp = (state.profile?.word_progress || {})[wordId];
  if (!wp || !wp.encounters) return -1;
  return wp.correct / wp.encounters;
}

function getWordStatus(wordId) {
  const acc = wordAccuracy(wordId);
  if (acc < 0) return 'new';
  if (acc >= 0.85) return 'mastered';
  if (acc >= 0.60) return 'learning';
  return 'struggling';
}

function wordsForCategory(catId) {
  return state.vocabulary.filter(w => w.category === catId);
}

function masteredCount(catId) {
  return wordsForCategory(catId).filter(w => getWordStatus(w.id) === 'mastered').length;
}

/* ─── XP / Level helpers ─── */
function getLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

function getLevelProgress(xp) {
  return (xp % 100) / 100;
}

const LEVEL_NAMES = ['Einsteiger','Lernfuchs','Wortkönig','Kroatien-Pro','Sprachgenie'];
function getLevelName(xp) {
  const lvl = Math.min(getLevel(xp) - 1, LEVEL_NAMES.length - 1);
  return `Level ${getLevel(xp)} · ${LEVEL_NAMES[lvl]}`;
}

/* ─── Badge definitions ─── */
const BADGES = [
  {
    id: 'erster_schritt',
    name: 'Erster Schritt',
    emoji: '🌱',
    desc: 'Erstes Wort korrekt beantwortet',
    check: (p) => {
      const wp = p.word_progress || {};
      return Object.values(wp).some(w => w.correct >= 1);
    },
  },
  {
    id: 'wortschatz_starter',
    name: 'Wortschatz-Starter',
    emoji: '📖',
    desc: '10 Wörter gelernt (beherrscht)',
    check: (p) => masteredCountAll(p) >= 10,
  },
  {
    id: 'wortschatz_held',
    name: 'Wortschatz-Held',
    emoji: '🏆',
    desc: '50 Wörter gelernt (beherrscht)',
    check: (p) => masteredCountAll(p) >= 50,
  },
  {
    id: 'streak_starter',
    name: 'Streak-Starter',
    emoji: '🔥',
    desc: '3 Tage Streak',
    check: (p) => (p.streak || 0) >= 3,
  },
  {
    id: 'streak_meister',
    name: 'Streak-Meister',
    emoji: '✨',
    desc: '7 Tage Streak',
    check: (p) => (p.streak || 0) >= 7,
  },
  {
    id: 'schneller_flitzer',
    name: 'Schneller Flitzer',
    emoji: '⚡',
    desc: '10 Wörter in einer Session perfekt (0 Fehler)',
    check: () => false, // checked separately in showSwipeResult
  },
  {
    id: 'kroatien_fan',
    name: 'Kroatien-Fan',
    emoji: '🇭🇷',
    desc: 'Alle Wörter einer Kategorie gelernt',
    check: (p) => {
      return WORLDS.some(world => {
        const words = wordsForCategory(world.id);
        if (!words.length) return false;
        return words.every(w => {
          const wp = (p.word_progress || {})[w.id];
          return wp && wp.encounters > 0 && wp.correct / wp.encounters >= 0.85;
        });
      });
    },
  },
  {
    id: 'hundert_woerter',
    name: '100-Wörter-Club',
    emoji: '💯',
    desc: '100 Wörter beherrscht',
    check: (p) => masteredCountAll(p) >= 100,
  },
  {
    id: 'streak_profi',
    name: 'Streak-Profi',
    emoji: '🔥🔥',
    desc: '14 Tage Streak',
    check: (p) => (p.streak || 0) >= 14,
  },
  {
    id: 'hoer_profi',
    name: 'Zuhörer',
    emoji: '👂',
    desc: 'Ersten Hör-Quiz abgeschlossen',
    check: () => false,   // set via extraChecks when listen game ends
  },
  {
    id: 'sprecher',
    name: 'Sprecher',
    emoji: '🎤',
    desc: 'Erstes Sprachtraining abgeschlossen',
    check: () => false,   // set via extraChecks when speak game ends
  },
  {
    id: 'allrounder',
    name: 'Allrounder',
    emoji: '🌈',
    desc: 'Alle 4 Hauptspiel-Modi ausprobiert',
    check: () => {
      try {
        const g = JSON.parse(localStorage.getItem('cs_games_played') || '{}');
        return !!(g.swipe && g.tap && g.match && (g.listen || g.speak));
      } catch { return false; }
    },
  },
  {
    id: 'alleskoenner',
    name: 'Alleskönner',
    emoji: '🎓',
    desc: 'Mindestens 1 Wort in jeder freigeschalteten Kategorie gelernt',
    check: (p) => {
      const { unlocked } = getUnlockedCategories(p);
      return unlocked.length > 0 && unlocked.every(catId => {
        const words = wordsForCategory(catId);
        return words.some(w => {
          const wp = (p.word_progress || {})[w.id];
          return wp && wp.encounters > 0;
        });
      });
    },
  },
  {
    id: 'tagesziel_profi',
    name: 'Tagesziel-Profi',
    emoji: '🎯',
    desc: 'Tagesziel 5 Mal erreicht',
    check: () => {
      try {
        return parseInt(localStorage.getItem('cs_daily_goals_hit') || '0', 10) >= 5;
      } catch { return false; }
    },
  },
  {
    id: 'begeistert',
    name: 'Begeistert',
    emoji: '⭐⭐',
    desc: '500 XP gesammelt',
    check: (p) => (p.xp || 0) >= 500,
  },
];

/* Helper: count all mastered words across a profile object */
function masteredCountAll(p) {
  const wp = p.word_progress || {};
  return Object.values(wp).filter(w => w.encounters > 0 && w.correct / w.encounters >= 0.85).length;
}

/* ─── Phase-based progression ─── */
const PHASES = [
  { phase: 1, unlocksAt: 0,  categories: ['Hallo Kroatien','Zahlen','Farben','Tiere'] },
  { phase: 2, unlocksAt: 20, categories: ['Zu Hause','Essen','Schule','Körper','Kleidung'] },
  { phase: 3, unlocksAt: 50, categories: ['Natur','Fahrzeuge','Freizeit','Wochentage','Gefühle','Zeit'] },
  { phase: 4, unlocksAt: 80, categories: ['Verben','Eigenschaften','Kroatien','Biti','Familie','Sport','Wetter'] },
];

/* Ältere Kinder (11+) bringen Vorwissen mit — Kategorien (v.a. Grammatik in
   Phase 4) schalten doppelt so schnell frei. */
function phaseUnlockFactor(profile) {
  return (profile?.age || 10) >= 11 ? 0.5 : 1;
}

function getUnlockedCategories(profile) {
  const count = masteredCountAll(profile);
  const factor = phaseUnlockFactor(profile);
  const unlocked = [], locked = [];
  PHASES.forEach(ph => {
    const threshold = Math.round(ph.unlocksAt * factor);
    ph.categories.forEach(catId => {
      if (threshold <= count) unlocked.push(catId);
      else locked.push({ catId, unlocksAt: threshold, phase: ph.phase });
    });
  });
  return { unlocked, locked };
}

/* Schwelle, ab der die Grammatik-Kategorie (Phase 4: Biti, Fälle …) offen ist —
   Grundlage für den Motivations-Banner auf dem Homescreen. */
function grammarUnlockThreshold(profile) {
  return Math.round(PHASES[PHASES.length - 1].unlocksAt * phaseUnlockFactor(profile));
}

let _lastUnlockedPhase = null;

/* ─── Daily Goal ─── */
function getDailyGoalTarget(age) {
  // Age-based: 8 years = 5 words/day, 11 years = 8 words/day
  if (age <= 8) return 5;
  if (age >= 11) return 8;
  // Interpolate for ages 9-10
  return 6 + Math.floor((age - 9) * 1);
}

function dailyGoalProgress() {
  const p = state.profile;
  if (!p) return { count: 0, target: 5, done: false };
  const today = todayStr();
  const dg = p.daily_goal || { date: null, count: 0 };
  const count = dg.date === today ? (dg.count || 0) : 0;
  const target = getDailyGoalTarget(p.age || 10);
  return { count, target, done: count >= target };
}

function incrementDailyGoal() {
  const p = state.profile;
  if (!p) return;
  const today = todayStr();
  const dg = p.daily_goal || { date: null, count: 0 };
  const count = dg.date === today ? (dg.count || 0) : 0;
  p.daily_goal = { date: today, count: count + 1 };
}

/* ─── Due-word review (cross-category SRS) ─── */
function getDueReviewWords(maxCount = 20) {
  const now = Date.now();
  const wp = (state.profile?.word_progress) || {};
  const due = wordsForProfile().filter(w => {
    const p = wp[w.id];
    return p && p.encounters > 0 && (p.next_review || 0) <= now;
  }).sort((a, b) => {
    const priority = { struggling: 0, learning: 1, mastered: 2 };
    return (priority[getWordStatus(a.id)] || 1) - (priority[getWordStatus(b.id)] || 1);
  }).slice(0, maxCount);
  return shuffle(due);
}

/* ─── Streak helpers ─── */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function updateStreak(profile) {
  const today = todayStr();
  if (profile.last_played === today) return profile;

  const yesterday   = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const twoDaysAgo  = new Date(Date.now() - 172800000).toISOString().slice(0, 10);

  let streak = profile.streak || 0;

  if (profile.last_played === yesterday) {
    // Played yesterday → extend streak
    streak = streak + 1;
  } else if (profile.last_played === twoDaysAgo) {
    // Missed exactly one day → use streak freeze if available this week
    const freezeKey  = 'cs_streak_freeze_' + profile.id;
    const freezeWeek = localStorage.getItem(freezeKey);
    const thisWeek   = getWeekString();
    if (freezeWeek !== thisWeek) {
      // Grant freeze — keep streak
      localStorage.setItem(freezeKey, thisWeek);
      streak = streak + 1; // frozen day counts
    } else {
      streak = 1; // freeze already used this week
    }
  } else {
    streak = 1;
  }

  return {
    ...profile,
    streak,
    best_streak: Math.max(streak, profile.best_streak || 0),
    last_played: today,
  };
}

function getWeekString() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

/* ─── Word progress tracking ─── */
function recordWord(wordId, correct) {
  const p = state.profile;
  if (!p) return;
  const wp = p.word_progress || {};
  const w = wp[wordId] || { correct: 0, encounters: 0 };
  const newCorrect = w.correct + (correct ? 1 : 0);
  const newEncounters = w.encounters + 1;
  wp[wordId] = {
    correct: newCorrect,
    encounters: newEncounters,
    last_seen: todayStr(),
    next_review: Date.now() + getSRSInterval(newCorrect, newEncounters),
  };
  p.word_progress = wp;
  // Track recent words (last 10)
  p.recent_words = [wordId, ...(p.recent_words || []).filter(id => id !== wordId)].slice(0, 10);
  // Increment daily goal (every encountered word counts)
  incrementDailyGoal();
}

/* ─── Adaptive word selection ─── */
function selectSessionWords(catId, count) {
  const pool = catId ? wordsForCategory(catId) : wordsForProfile();

  // SRS-aware sort: overdue struggling > new > overdue learning > not-due
  const now = Date.now();
  const wp = (state.profile && state.profile.word_progress) || {};
  const sorted = [...pool].sort((a, b) => {
    const sa = getWordStatus(a.id), sb = getWordStatus(b.id);
    const dueA = !wp[a.id] || (wp[a.id].next_review || 0) <= now;
    const dueB = !wp[b.id] || (wp[b.id].next_review || 0) <= now;
    const rankA = dueA ? (sa === 'struggling' ? 0 : sa === 'new' ? 1 : 2) : 3;
    const rankB = dueB ? (sb === 'struggling' ? 0 : sb === 'new' ? 1 : 2) : 3;
    return rankA - rankB;
  });

  // Take requested count; if not enough, pad with mastered words
  const result = sorted.slice(0, count);
  if (result.length < count && sorted.length > count) {
    result.push(...sorted.slice(count, count + (count - result.length)));
  }
  return shuffle(result.length >= 2 ? result : pool.slice(0, Math.max(2, count)));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── Save profile to server ─── */
async function saveProfile() {
  if (!state.profile) return;
  try {
    const data = await api(`/api/profiles/${state.profile.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        xp: state.profile.xp,
        streak: state.profile.streak,
        best_streak: state.profile.best_streak,
        last_played: state.profile.last_played,
        word_progress: state.profile.word_progress,
        recent_words: state.profile.recent_words,
        badges: state.profile.badges || [],
        daily_goal: state.profile.daily_goal || { date: null, count: 0 },
        settings: state.profile.settings,
      }),
    });
    state.profile = data.profile;
  } catch (e) {
    console.warn('Save failed:', e.message);
    // Store locally so progress isn't lost
    try { localStorage.setItem('cs_profile_' + state.profile.id, JSON.stringify(state.profile)); }
    catch (_) {}
  }
}

function _trackGamePlayed(mode) {
  state.lastGameMode = mode;   // für "Nächste Übung" auf dem Ergebnis-Screen
  try {
    const g = JSON.parse(localStorage.getItem('cs_games_played') || '{}');
    g[mode] = (g[mode] || 0) + 1;
    localStorage.setItem('cs_games_played', JSON.stringify(g));
  } catch (_) {}
}

/* ════════════════════════════════════════
   SPACED REPETITION
════════════════════════════════════════ */
function getSRSInterval(correct, encounters) {
  if (encounters === 0) return 0;
  const acc = correct / encounters;
  if (acc >= 0.85 && encounters >= 5) return 14 * 24 * 3600 * 1000;
  if (acc >= 0.70 && encounters >= 3) return  7 * 24 * 3600 * 1000;
  if (acc >= 0.60 && encounters >= 2) return  3 * 24 * 3600 * 1000;
  if (acc >= 0.50 && encounters >= 1) return  1 * 24 * 3600 * 1000;
  return 4 * 3600 * 1000; // 4h
}

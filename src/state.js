/* Cro Swipe — state.js: Globales App-State-Objekt */

/* ─── App state ─── */
const state = {
  profiles: [],
  profile: null,       // active child profile
  vocabulary: [],      // all loaded words

  currentScreen: 'profiles',
  currentCategory: null,

  // Swipe game state
  swipe: {
    words: [],
    index: 0,
    correct: 0,
    xpGained: 0,
    card: null,
    startX: 0,
    startY: 0,
    dragging: false,
    revealed: false,
  },

  // Tap game state
  tap: {
    words: [],
    index: 0,
    correct: 0,
  },

  // Match game state
  match: {
    cards: [],
    selected: [],
    matched: 0,
    total: 0,
  },

  // Listen game state
  listen: { words: [], index: 0, correct: 0 },

  // Speak / Hör & Erkenn game state
  speak: { words: [], index: 0, correct: 0, xpGained: 0 },

  // Biti-Quiz state
  biti: { questions: [], index: 0, correct: 0, xpGained: 0 },

  // Puzzle game state
  puzzle: { sentences: [], index: 0, correct: 0, xpGained: 0 },

  // Satz game state
  satz: { questions: [], index: 0, correct: 0 },

  // PIN input state
  pin: {
    entered: '',
    setting: false,  // true = setting new PIN
  },

  // Pronounce game state
  pronounce: {
    catId: null,
    words: [],
    index: 0,
    correct: 0,
    xpGained: 0,
  },

  // Sprint game state
  sprint: {
    catId: null,
    words: [],
    index: 0,
    score: 0,
    timeLeft: 60,
    active: false,
  },
};

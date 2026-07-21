/* Cro Swipe — local-api.js: localStorage-Backend für statisches Hosting (GitHub Pages)
   Bildet die Flask-API (/api/profiles, /api/feedback) 1:1 in localStorage ab.
   Aktiv, wenn kein Server-Backend erreichbar ist — z.B. auf *.github.io.
   Jedes Gerät (iPad) hat damit seine eigenen Profile. */

'use strict';

const LocalAPI = {

  // Auf github.io (oder file://) gibt es nie ein Backend → sofort lokal arbeiten,
  // ohne einen fehlschlagenden Netzwerk-Request abzuwarten.
  active: location.hostname.endsWith('.github.io')
       || location.protocol === 'file:'
       || localStorage.getItem('cs_local_api') === '1',

  activate() {
    this.active = true;
    try { localStorage.setItem('cs_local_api', '1'); } catch (_) {}
    console.info('LocalAPI aktiviert — Profile werden auf diesem Gerät gespeichert.');
  },

  PROFILES_KEY: 'cs_local_profiles',
  FEEDBACK_KEY: 'cs_local_feedback',

  DEFAULT_SETTINGS: { difficulty: 'auto', showHint: true },

  _load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (_) { return []; }
  },

  _save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  _uid() {
    return Math.random().toString(16).slice(2, 6) + Math.random().toString(16).slice(2, 6);
  },

  _summary(p) {
    return {
      id:            p.id,
      name:          p.name,
      avatar:        p.avatar,
      age:           p.age ?? 10,
      xp:            p.xp ?? 0,
      streak:        p.streak ?? 0,
      best_streak:   p.best_streak ?? 0,
      last_played:   p.last_played ?? null,
      word_progress: p.word_progress || {},
      recent_words:  p.recent_words || [],
      badges:        p.badges || [],
      daily_goal:    p.daily_goal || { date: null, count: 0 },
      settings:      { ...this.DEFAULT_SETTINGS, ...(p.settings || {}) },
      pin:           p.pin || null,
      city:          p.city || { buildings: [], spent: 0 },
      mastered_high: p.mastered_high ?? 0,
    };
  },

  /* Zentrale Dispatch-Funktion — gleiche Signatur wie api(path, options) */
  async handle(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};

    // /api/profiles
    if (path === '/api/profiles' && method === 'GET') {
      return { profiles: this._load(this.PROFILES_KEY).map(p => this._summary(p)) };
    }
    if (path === '/api/profiles' && method === 'POST') {
      return this._createProfile(body);
    }

    // /api/profiles/<id>
    const m = path.match(/^\/api\/profiles\/([^/]+)$/);
    if (m) {
      const id = m[1];
      if (method === 'GET')    return this._getProfile(id);
      if (method === 'PUT')    return this._updateProfile(id, body);
      if (method === 'DELETE') return this._deleteProfile(id);
    }

    // /api/feedback
    if (path === '/api/feedback' && method === 'POST') {
      return this._submitFeedback(body);
    }
    if (path === '/api/feedback' && method === 'GET') {
      return { feedback: this._load(this.FEEDBACK_KEY) };
    }

    throw new Error('Unbekannter API-Pfad: ' + path);
  },

  _createProfile(payload) {
    const name = String(payload.name || '').trim();
    const avatar = String(payload.avatar || '🦊').trim() || '🦊';
    const age = parseInt(payload.age ?? 10, 10) || 10;

    if (!name) throw new Error('Bitte gib einen Namen ein.');

    const profiles = this._load(this.PROFILES_KEY);
    if (profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Dieser Name ist schon vergeben.');
    }

    const profile = {
      id: this._uid(),
      name, avatar, age,
      pin: /^\d{4}$/.test(String(payload.pin || '')) ? String(payload.pin) : null,
      xp: 0,
      streak: 0,
      best_streak: 0,
      last_played: null,
      word_progress: {},
      recent_words: [],
      badges: [],
      daily_goal: { date: null, count: 0 },
      settings: { ...this.DEFAULT_SETTINGS },
    };
    profiles.push(profile);
    this._save(this.PROFILES_KEY, profiles);
    return { profile: this._summary(profile) };
  },

  _getProfile(id) {
    const profile = this._load(this.PROFILES_KEY).find(p => p.id === id);
    if (!profile) throw new Error('Profil nicht gefunden.');
    return { profile: this._summary(profile) };
  },

  _deleteProfile(id) {
    const profiles = this._load(this.PROFILES_KEY);
    const remaining = profiles.filter(p => p.id !== id);
    if (remaining.length === profiles.length) throw new Error('Profil nicht gefunden.');
    this._save(this.PROFILES_KEY, remaining);
    return { ok: true };
  },

  _updateProfile(id, payload) {
    const profiles = this._load(this.PROFILES_KEY);
    const idx = profiles.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Profil nicht gefunden.');
    const profile = profiles[idx];

    for (const field of ['xp', 'streak', 'best_streak', 'last_played', 'name', 'avatar']) {
      if (field in payload) profile[field] = payload[field];
    }

    if ('mastered_high' in payload) {
      // High-Water darf nie sinken
      profile.mastered_high = Math.max(profile.mastered_high || 0,
        parseInt(payload.mastered_high, 10) || 0);
    }

    if ('pin' in payload && /^\d{4}$/.test(String(payload.pin || ''))) {
      profile.pin = String(payload.pin);
    }

    if ('city' in payload && payload.city && typeof payload.city === 'object') {
      profile.city = {
        buildings: Array.isArray(payload.city.buildings) ? payload.city.buildings : [],
        spent: Math.max(0, parseInt(payload.city.spent ?? 0, 10) || 0),
      };
    }

    if (payload.word_progress) {
      const existing = profile.word_progress || {};
      // Merge wie im Flask-Backend: höherer encounter-Stand gewinnt
      for (const [wid, data] of Object.entries(payload.word_progress)) {
        const old = existing[wid] || { correct: 0, encounters: 0 };
        if ((data.encounters || 0) >= (old.encounters || 0)) existing[wid] = data;
      }
      profile.word_progress = existing;
    }

    if (payload.recent_words) {
      profile.recent_words = payload.recent_words.slice(0, 10);
    }

    if (Array.isArray(payload.badges)) {
      profile.badges = [...new Set([...(profile.badges || []), ...payload.badges.map(String)])];
    }

    if (payload.daily_goal && typeof payload.daily_goal === 'object') {
      profile.daily_goal = {
        date: payload.daily_goal.date ?? null,
        count: parseInt(payload.daily_goal.count ?? 0, 10) || 0,
      };
    }

    if (payload.settings && typeof payload.settings === 'object') {
      profile.settings = { ...this.DEFAULT_SETTINGS, ...(profile.settings || {}), ...payload.settings };
    }

    profiles[idx] = profile;
    this._save(this.PROFILES_KEY, profiles);
    return { profile: this._summary(profile) };
  },

  _submitFeedback(payload) {
    const entry = {
      id: this._uid(),
      timestamp: new Date().toISOString(),
      type: String(payload.type || 'bug'),
      category: String(payload.category || ''),
      message: String(payload.message || '').trim().slice(0, 1000),
      context: {
        word_id:   payload.context?.word_id ?? null,
        word_de:   payload.context?.word_de || '',
        word_hr:   payload.context?.word_hr || '',
        game_mode: payload.context?.game_mode || '',
        category:  payload.context?.category || '',
      },
      profile_id: String(payload.profile_id || ''),
    };
    if (!entry.message && !entry.category) throw new Error('Bitte gib eine Nachricht ein.');

    const feedback = this._load(this.FEEDBACK_KEY);
    feedback.push(entry);
    this._save(this.FEEDBACK_KEY, feedback);
    return { ok: true, id: entry.id };
  },
};

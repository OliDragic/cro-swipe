/* Cro Swipe — audio.js: SoundManager (Web Audio API) und AudioManager (TTS + MP3) */

/* ════════════════════════════════════════
   SOUND MANAGER — Web Audio API sound effects (no files needed)
════════════════════════════════════════ */
const SoundManager = {
  enabled: true,
  _ctx: null,

  init() {
    const s = localStorage.getItem('cs_sound_enabled');
    if (s !== null) this.enabled = s === 'true';
  },

  save() { localStorage.setItem('cs_sound_enabled', this.enabled); },

  _ctx_get() {
    if (!this._ctx)
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  },

  _tone(freq, gain, start, dur, type = 'sine') {
    try {
      const ctx = this._ctx_get();
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    } catch (_) {}
  },

  correct()  {
    if (!this.enabled) return;
    this._tone(523.25, 0.09, 0,    0.14);
    this._tone(659.25, 0.11, 0.12, 0.18);
  },

  wrong() {
    if (!this.enabled) return;
    this._tone(260, 0.10, 0,    0.18, 'sawtooth');
    this._tone(200, 0.07, 0.16, 0.15, 'sawtooth');
  },

  match() {
    if (!this.enabled) return;
    [523.25, 659.25, 783.99].forEach((f, i) => this._tone(f, 0.09, i * 0.1, 0.14));
  },

  levelUp() {
    if (!this.enabled) return;
    [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) => this._tone(f, 0.11, i * 0.09, 0.18));
  },

  tap() {
    if (!this.enabled) return;
    this._tone(880, 0.05, 0, 0.06);
  },
};

/* ════════════════════════════════════════
   AUDIO MANAGER
   Primary: pre-generated MP3 files (/audio/hr|de/<id>.mp3)
   Fallback: Web Speech API (built-in on iPad iOS — excellent hr-HR voice)
════════════════════════════════════════ */
const AudioManager = {
  enabled:  true,
  autoPlay: true,   // auto-play Croatian when a new word appears
  slowMode: false,  // 75% speed for difficult words
  playBoth: false,  // also play German translation after Croatian

  _synth:     window.speechSynthesis || null,
  _hrVoice:   null,
  _deVoice:   null,
  _cache:     {},     // url → Audio | false (404 known)
  _current:   null,   // currently playing Audio element
  _unlocked:  false,
  _activeBtn: null,   // speak button currently animating

  init() {
    if (this._synth) {
      this._loadVoices();
      this._synth.onvoiceschanged = () => this._loadVoices();
    }
    // Restore persisted settings
    try {
      const cfg = JSON.parse(localStorage.getItem('cs_audio_cfg') || '{}');
      if (cfg.enabled  !== undefined) this.enabled  = cfg.enabled;
      if (cfg.autoPlay !== undefined) this.autoPlay = cfg.autoPlay;
      if (cfg.slowMode !== undefined) this.slowMode = cfg.slowMode;
      if (cfg.playBoth !== undefined) this.playBoth = cfg.playBoth;
    } catch (_) {}
  },

  save() {
    localStorage.setItem('cs_audio_cfg', JSON.stringify({
      enabled:  this.enabled,
      autoPlay: this.autoPlay,
      slowMode: this.slowMode,
      playBoth: this.playBoth,
    }));
  },

  _loadVoices() {
    const voices = this._synth.getVoices();
    this._hrVoice = voices.find(v => v.lang === 'hr-HR') ||
                    voices.find(v => v.lang.startsWith('hr')) || null;
    this._deVoice = voices.find(v => v.lang === 'de-DE') ||
                    voices.find(v => v.lang.startsWith('de')) || null;
  },

  // iOS requires a user gesture before audio plays. Call on first tap.
  unlock() {
    if (this._unlocked || !this._synth) return;
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    this._synth.speak(u);
    this._synth.cancel();
    this._unlocked = true;
  },

  _setPlaying(btn) {
    this._activeBtn = btn || null;
    if (btn) btn.classList.add('playing');
  },

  _clearPlaying() {
    if (this._activeBtn) { this._activeBtn.classList.remove('playing'); this._activeBtn = null; }
  },

  stop() {
    this._synth?.cancel();
    if (this._current) { this._current.pause(); this._current = null; }
    this._clearPlaying();
  },

  // Main entry point: speak a vocabulary word in hr or de
  async speakWord(word, lang = 'hr', btn = null) {
    if (!this.enabled) return;
    this.stop();
    this._setPlaying(btn);
    const played = await this._tryFile(word.id, lang);
    if (!played) this._speakSynth(lang === 'hr' ? word.croatian : word.german, lang);

    if (lang === 'hr' && this.playBoth) {
      const delay = this.slowMode ? 2800 : 1800;
      setTimeout(async () => {
        if (!this.enabled) return;
        // Auch die deutsche Übersetzung als MP3 (neuronale Stimme) — Synthese nur als Fallback
        const ok = await this._tryFile(word.id, 'de');
        if (!ok) this._speakSynth(word.german, 'de');
      }, delay);
    }
  },

  // Speak any text (e.g. sentences, character guide examples).
  // Für feste kroatische Sätze existieren vorgenerierte MP3s unter
  // audio/sent/<hash>.mp3 — Synthese ist nur noch der Fallback.
  async speakText(text, lang = 'hr') {
    if (!this.enabled) return;
    this.stop();
    if (lang === 'hr') {
      const ok = await this._tryUrl(`audio/sent/${this._sentHash(text)}.mp3`);
      if (ok) return;
    }
    this._speakSynth(text, lang);
  },

  // djb2-Hash über UTF-8-Bytes — identisch im Generator-Workflow (Python)
  _sentHash(text) {
    let h = 5381;
    for (const b of new TextEncoder().encode(text)) h = ((h * 33) ^ b) >>> 0;
    return h.toString(16);
  },

  _tryFile(wordId, lang) {
    return this._tryUrl(`audio/${lang}/${wordId}.mp3`);
  },

  async _tryUrl(url) {
    if (this._cache[url] === false) return false;       // known 404

    return new Promise(resolve => {
      let audio = this._cache[url];
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        if (ok) {
          this._cache[url] = audio;
          this._current = audio;
          audio.onended = () => this._clearPlaying();
        } else {
          // Abort the audio so it doesn't play after TTS fallback has started
          if (audio instanceof Audio) { audio.pause(); audio.src = ''; }
        }
        resolve(ok);
      };

      if (!(audio instanceof Audio)) {
        audio = new Audio(url);
        audio.onerror = () => { this._cache[url] = false; done(false); };
      } else {
        audio.currentTime = 0;
      }
      // Slow mode: clamp playbackRate (MP3 still intelligible at 0.8×)
      audio.playbackRate = this.slowMode ? 0.8 : 1.0;

      audio.play()
        .then(() => done(true))
        .catch(() => done(false));

      // Safety timeout — increased to 2.5s to accommodate slow first-load on iOS
      setTimeout(() => done(false), 2500);
    });
  },

  _speakSynth(text, lang) {
    if (!this._synth) return;
    const utter    = new SpeechSynthesisUtterance(text);
    utter.lang     = lang === 'hr' ? 'hr-HR' : 'de-DE';
    utter.rate     = this.slowMode ? 0.72 : 0.88;
    utter.pitch    = 1.05;
    const voice    = lang === 'hr' ? this._hrVoice : this._deVoice;
    if (voice) utter.voice = voice;
    utter.onend    = () => this._clearPlaying();
    this._synth.speak(utter);
  },
};

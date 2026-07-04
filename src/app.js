/* Cro Swipe — app.js: API-Helper, Event-Verdrahtung und App-Initialisierung */

'use strict';

/* ─── API helper ───
   Läuft ein Flask-Backend (zuhause im WLAN), gehen die Aufrufe dorthin.
   Ohne Backend (GitHub Pages) übernimmt LocalAPI und speichert in localStorage. */
async function api(path, options = {}) {
  if (LocalAPI.active) return LocalAPI.handle(path, options);
  let res;
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (e) {
    // Netzwerkfehler → kein Backend erreichbar → dauerhaft auf lokal umschalten
    LocalAPI.activate();
    return LocalAPI.handle(path, options);
  }
  if (!res.ok) {
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      // Statischer Host antwortet mit HTML-404 statt JSON → kein Backend vorhanden
      LocalAPI.activate();
      return LocalAPI.handle(path, options);
    }
    const err = await res.json().catch(() => ({ error: 'Serverfehler' }));
    throw new Error(err.error || 'Serverfehler');
  }
  return res.json();
}

/* ════════════════════════════════════════
   EVENT WIRING
════════════════════════════════════════ */
function wireEvents() {
  // ── Profile screen ──
  document.getElementById('btn-parent-gate').addEventListener('click', openPinGate);

  // ── Edit profile modal ──
  document.getElementById('btn-edit-profile').addEventListener('click', showEditProfile);
  document.getElementById('btn-cancel-edit').addEventListener('click', hideEditProfile);
  document.getElementById('btn-save-edit').addEventListener('click', saveEditProfile);
  document.getElementById('btn-delete-profile').addEventListener('click', deleteProfile);
  document.getElementById('modal-edit-profile').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideEditProfile();
  });
  document.getElementById('edit-avatar-picker').addEventListener('click', e => {
    const btn = e.target.closest('.avatar-opt');
    if (!btn) return;
    document.querySelectorAll('#edit-avatar-picker .avatar-opt').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });

  // ── Create profile modal ──
  document.getElementById('btn-cancel-profile').addEventListener('click', hideCreateProfile);
  document.getElementById('btn-save-profile').addEventListener('click', saveNewProfile);
  document.getElementById('profile-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveNewProfile();
  });
  document.getElementById('modal-create-profile').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideCreateProfile();
  });
  document.getElementById('avatar-picker').addEventListener('click', e => {
    const btn = e.target.closest('.avatar-opt');
    if (!btn) return;
    document.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
  document.querySelector('.age-btns').addEventListener('click', e => {
    const btn = e.target.closest('.age-btn');
    if (!btn) return;
    document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });

  // ── Daily review ──
  document.getElementById('btn-review-start').addEventListener('click', () => {
    AudioManager.unlock();
    startReviewSession();
  });

  // ── Category back ──
  document.getElementById('cat-back').addEventListener('click', () => {
    navigate('home');
  });

  // ── Game buttons in category screen ──
  document.getElementById('game-buttons').addEventListener('click', e => {
    const btn = e.target.closest('.game-btn');
    if (!btn) return;
    AudioManager.unlock();   // iOS audio gate: unlock on first user gesture
    const game = btn.dataset.game;
    const catId = state.currentCategory?.id;
    if (game === 'swipe') startSwipeGame(catId);
    else if (game === 'tap') startTapGame(catId);
    else if (game === 'rtap') startTapGame(catId, true);
    else if (game === 'match') startMatchGame(catId);
    else if (game === 'satz') startSatzGame(catId);
    else if (game === 'listen') startListenGame(catId);
    else if (game === 'speak') startSpeakGame(catId);
    else if (game === 'puzzle') startPuzzleGame(catId);
    else if (game === 'biti') startBitiGame();
    else if (game === 'padezi') startPadeziGame();
    else if (game === 'sprint') startSprintGame(catId);
    else if (game === 'pronounce') startPronounceGame(catId);
  });

  // ── Swipe game back ──
  document.getElementById('swipe-back').addEventListener('click', () => {
    clearTimeout(state.swipe._hintTimer);
    // BUG-01 FIX: Clean up window mouse listeners if card is still active
    if (state.swipe.card?._cleanupMouseListeners) state.swipe.card._cleanupMouseListeners();
    renderHome();
    navigate('home');
  });

  // ── Swipe result buttons ──
  document.getElementById('result-next').addEventListener('click', () => {
    startNextGame();
  });
  document.getElementById('result-continue').addEventListener('click', () => {
    startSwipeGame(state.currentCategory?.id);
  });
  document.getElementById('result-home').addEventListener('click', () => {
    renderHome();
    navigate('home');
  });

  // ── Pronounce back ──
  document.getElementById('pronounce-back').addEventListener('click', () => {
    if (_pronounceRec) { try { _pronounceRec.stop(); } catch (_) {} _pronounceRec = null; }
    navigate('category');
  });
  document.getElementById('pronounce-skip').addEventListener('click', () => {
    state.pronounce.index++;
    renderPronounceQuestion();
  });

  // ── Sprint back ──
  document.getElementById('sprint-back').addEventListener('click', () => {
    clearInterval(_sprintTimer);
    if (state.sprint) state.sprint.active = false;
    navigate('category');
  });

  // ── Satz game back ──
  document.getElementById('satz-back').addEventListener('click', () => {
    AudioManager.stop();
    renderHome();
    navigate('home');
  });

  // ── Listen game back ──
  document.getElementById('listen-back').addEventListener('click', () => {
    AudioManager.stop();
    renderHome();
    navigate('home');
  });

  // ── Speak / Hör & Erkenn back ──
  document.getElementById('speak-back').addEventListener('click', () => {
    AudioManager.stop();
    renderHome();
    navigate('home');
  });

  // ── Biti-Quiz back ──
  document.getElementById('biti-back').addEventListener('click', () => {
    renderHome();
    navigate('home');
  });

  // ── Biti-Quiz next (after wrong answer) ──
  document.getElementById('biti-next').addEventListener('click', () => {
    state.biti.index++;
    renderBitiQuestion();
  });

  // ── Puzzle back ──
  document.getElementById('puzzle-back').addEventListener('click', () => {
    renderHome();
    navigate('home');
  });

  // ── Puzzle next (after check) ──
  document.getElementById('puzzle-next').addEventListener('click', () => {
    state.puzzle.index++;
    renderPuzzleQuestion();
  });

  // ── Tap game back ──
  document.getElementById('tap-back').addEventListener('click', () => {
    renderHome();
    navigate('home');
  });

  // ── Match game back ──
  document.getElementById('match-back').addEventListener('click', () => {
    renderHome();
    navigate('home');
  });
  document.getElementById('match-again').addEventListener('click', () => {
    startMatchGame(state.currentCategory?.id);
  });
  document.getElementById('match-home').addEventListener('click', () => {
    renderHome();
    navigate('home');
  });

  // ── Kroatische Laute (home banner → dedicated section) ──
  document.getElementById('btn-laute-banner').addEventListener('click', () => {
    renderCharsGuide();
    navigate('chars-guide');
  });

  // ── Zeichen-Picker ──
  document.getElementById('chars-back').addEventListener('click', () => navigate('chars-guide'));
  document.getElementById('chars-guide-back').addEventListener('click', () => navigate('home'));
  document.getElementById('chars-guide-play').addEventListener('click', () => startCharsGame(null));
  document.getElementById('chars-help-btn').addEventListener('click', () => {
    renderCharsGuide();
    navigate('chars-guide');
  });

  // ── Vocabulary browser toggle ──
  document.getElementById('vocab-toggle-btn').addEventListener('click', () => {
    const browser = document.getElementById('vocab-browser');
    const btn = document.getElementById('vocab-toggle-btn');
    if (browser.classList.contains('hidden')) {
      if (!browser.innerHTML.trim()) renderVocabBrowser();
      browser.classList.remove('hidden');
      btn.textContent = 'Ausblenden ▴';
    } else {
      browser.classList.add('hidden');
      btn.textContent = 'Anzeigen ▾';
    }
  });

  // ── Bottom navigation (all navbars) ──
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      if (target === 'home') {
        renderHome();
        navigate('home');
      } else if (target === 'progress') {
        renderProgress();
        navigate('progress');
      } else if (target === 'settings') {
        renderSettings();
        navigate('settings');
      }
    });
  });

  // ── Settings back ──
  document.getElementById('settings-back').addEventListener('click', () => {
    saveSettings();
    renderHome();
    navigate('home');
  });

  // ── Audio toggle: dim sub-options when disabled ──
  document.getElementById('settings-audio-toggle').addEventListener('change', e => {
    _toggleAudioSubrows(e.target.checked);
  });

  // ── Settings switch profile ──
  document.getElementById('btn-switch-profile').addEventListener('click', () => {
    state.profile = null;
    loadProfilesAndRender();
    navigate('profiles');
  });

  // ── PIN pad ──
  document.getElementById('numpad').addEventListener('click', e => {
    const btn = e.target.closest('.num-btn');
    if (!btn) return;
    if (btn.id === 'pin-del') {
      _pinEntered = _pinEntered.slice(0, -1);
      updatePinDots();
      document.getElementById('pin-error').classList.add('hidden');
    } else if (btn.id === 'pin-clear') {
      _pinEntered = '';
      updatePinDots();
      document.getElementById('pin-error').classList.add('hidden');
    } else if (btn.dataset.num !== undefined) {
      handlePinInput(btn.dataset.num);
    }
  });

  // ── Onboarding ──
  document.getElementById('onboarding-next').addEventListener('click', _onboardingNext);
  document.getElementById('onboarding-skip').addEventListener('click', _finishOnboarding);
  let _obTouchX = 0;
  document.getElementById('screen-onboarding').addEventListener('touchstart', e => {
    _obTouchX = e.touches[0].clientX;
  }, { passive: true });
  document.getElementById('screen-onboarding').addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - _obTouchX;
    if (dx < -60) _onboardingNext();
    else if (dx > 60 && _onboardingSlide > 0) { _onboardingSlide--; _updateOnboardingSlide(); }
  }, { passive: true });

  // ── PIN gate back ──
  document.getElementById('pin-back').addEventListener('click', () => navigate('profiles'));

  // ── Parent dashboard back ──
  document.getElementById('parent-back').addEventListener('click', () => navigate('profiles'));

  // ── Parent PIN save ──
  document.getElementById('btn-save-pin').addEventListener('click', () => {
    const val = document.getElementById('new-pin-input').value.trim();
    const fb = document.getElementById('pin-save-feedback');
    if (!/^\d{4}$/.test(val)) {
      fb.className = 'feedback-text err';
      fb.textContent = 'Bitte genau 4 Ziffern eingeben.';
      return;
    }
    _parentPin = val;
    localStorage.setItem('cs_parent_pin', val);
    fb.className = 'feedback-text ok';
    fb.textContent = '✓ PIN gespeichert!';
    document.getElementById('new-pin-input').value = '';
  });

  wireFeedbackEvents();
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
async function init() {
  initDarkMode();
  AudioManager.init();
  SoundManager.init();
  initOfflineIndicator();
  initA2HSBanner();
  wireEvents();
  // PERF-02: Load vocabulary and profiles in parallel
  await Promise.all([loadVocabulary(), loadProfilesAndRender()]);
  if (localStorage.getItem(ONBOARDING_KEY) !== '1') {
    startOnboarding();
  } else {
    navigate('profiles');
  }
}

init();

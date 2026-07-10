/* Cro Swipe — ui.js: UI-Rendering, Overlays, Navigation und Screen-Logik */

/* ─── Floating XP animation ─── */
function showFloatingXP(amount, anchorEl = null) {
  const el = document.createElement('div');
  el.className = 'floating-xp';
  el.textContent = `+${amount} XP ⭐`;
  if (anchorEl) {
    const r = anchorEl.getBoundingClientRect();
    el.style.left = (r.left + r.width / 2) + 'px';
    el.style.top  = r.top + 'px';
  } else {
    el.style.left = '50%';
    el.style.top  = '42%';
    el.style.transform = 'translateX(-50%)';
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

/* ─── Dark mode ─── */
function setDarkMode(on) {
  document.documentElement.classList.toggle('dark', on);
  localStorage.setItem('cs_dark_mode', on ? '1' : '0');
}

function initDarkMode() {
  if (localStorage.getItem('cs_dark_mode') === '1')
    document.documentElement.classList.add('dark');
}

/* ─── Offline indicator ─── */
function initA2HSBanner() {
  // Only show on iOS Safari, not in standalone (already installed), not if dismissed before
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true;
  const dismissed = localStorage.getItem('cs_a2hs_dismissed');
  if (!isIOS || isStandalone || dismissed) return;

  // Show after a short delay so it doesn't interrupt the load
  setTimeout(() => {
    document.getElementById('a2hs-banner').classList.remove('hidden');
  }, 3000);

  document.getElementById('a2hs-close').addEventListener('click', () => {
    document.getElementById('a2hs-banner').classList.add('hidden');
    localStorage.setItem('cs_a2hs_dismissed', '1');
  });
}

function initOfflineIndicator() {
  const update = () => {
    let bar = document.getElementById('offline-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'offline-bar';
      bar.textContent = '📵 Offline — Fortschritt wird lokal gespeichert';
      document.body.appendChild(bar);
    }
    bar.classList.toggle('visible', !navigator.onLine);
  };
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

/* ════════════════════════════════════════
   UNIVERSAL GAME RESULT
════════════════════════════════════════ */
function showGameResult({ correct, total, xpGained, onContinue, wrongWords = [] }) {
  logUsage({ ev: 'end', mode: state.lastGameMode, cat: state.currentCategory?.id || null,
             ok: correct, total, xp: xpGained });
  const pct    = total ? correct / total : 0;
  const emoji  = pct >= 0.9 ? '🏆' : pct >= 0.7 ? '🎉' : pct >= 0.5 ? '🙌' : '🤔';
  const title  = pct >= 0.8 ? 'Super gemacht!' : pct >= 0.5 ? 'Gut gemacht!' : 'Weiter üben!';

  document.getElementById('gr-emoji').textContent   = emoji;
  document.getElementById('gr-title').textContent   = title;
  document.getElementById('gr-correct').textContent = `${correct}/${total}`;
  document.getElementById('gr-xp').textContent      = `+${xpGained}`;
  document.getElementById('gr-streak').textContent  = state.profile?.streak || 0;

  const overlay = document.getElementById('game-result-overlay');
  overlay.classList.remove('hidden');

  if (pct >= 0.7) showConfetti(pct >= 0.9 ? 40 : 20);

  // Show "Falsche Wörter üben" button only when there are wrong words
  const reviewBtn = document.getElementById('gr-review');
  if (reviewBtn) {
    const unique = wrongWords.filter((w, i, a) => a.findIndex(x => x.id === w.id) === i);
    if (unique.length > 0) {
      reviewBtn.style.display = '';
      reviewBtn.textContent = `🔁 ${unique.length} falsche Wörter nochmal üben`;
      reviewBtn.onclick = () => {
        overlay.classList.add('hidden');
        startWrongWordReview(unique);
      };
    } else {
      reviewBtn.style.display = 'none';
    }
  }

  document.getElementById('gr-next').onclick = () => {
    overlay.classList.add('hidden');
    startNextGame();
  };
  document.getElementById('gr-continue').onclick = () => {
    overlay.classList.add('hidden');
    if (onContinue) onContinue();
    else { renderHome(); navigate('home'); }
  };
  document.getElementById('gr-home').onclick = () => {
    overlay.classList.add('hidden');
    renderHome();
    navigate('home');
  };
}

/* ─── "Nächste Übung": rotiert durch die Kern-Spielmodi derselben Kategorie,
   damit Kinder ohne Umweg über Home/Kategorie weiterüben können ─── */
const NEXT_GAME_CYCLE = ['swipe', 'tap', 'listen', 'match', 'puzzle'];

function startNextGame() {
  const catId = state.currentCategory?.id;
  const cur = NEXT_GAME_CYCLE.indexOf(state.lastGameMode);
  const next = NEXT_GAME_CYCLE[(cur + 1) % NEXT_GAME_CYCLE.length];
  AudioManager.unlock();
  if (next === 'swipe') startSwipeGame(catId);
  else if (next === 'tap') startTapGame(catId);
  else if (next === 'listen') startListenGame(catId);
  else if (next === 'match') startMatchGame(catId);
  else startPuzzleGame(catId);
}

/* ─── Screen router ─── */
function navigate(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const next = document.getElementById('screen-' + screenId);
  if (next) {
    next.classList.add('active');
    state.currentScreen = screenId;
  }
  if (typeof updateFeedbackBtn === 'function') updateFeedbackBtn();
}

function checkCategoryCompletion(catId) {
  const words = wordsForCategory(catId);
  if (!words.length) return;
  const allMastered = words.every(w => getWordStatus(w.id) === 'mastered');
  if (!allMastered) return;

  // Check if we already celebrated this category
  const doneKey = 'cs_cat_celebrated_' + (state.profile?.id || '') + '_' + catId;
  if (localStorage.getItem(doneKey)) return;
  localStorage.setItem(doneKey, '1');

  // Find the world definition
  const world = WORLDS.find(w => w.id === catId);
  showCategoryComplete(world || { name: catId, emoji: '🎉' });
}

function showCategoryComplete(world) {
  const overlay = document.getElementById('cat-complete-overlay');
  if (!overlay) return;
  document.getElementById('cat-complete-emoji').textContent = world.emoji;
  document.getElementById('cat-complete-name').textContent = world.name;
  overlay.classList.remove('hidden');
  showConfetti(50);
  SoundManager.levelUp();
}

function checkPhaseUnlock(profile) {
  const count = masteredCountAll(profile);
  const reached = PHASES.filter(ph => ph.unlocksAt > 0 && ph.unlocksAt <= count);
  const highest = reached.length ? reached[reached.length - 1].phase : 1;
  if (_lastUnlockedPhase !== null && highest > _lastUnlockedPhase) {
    const newPhases = PHASES.filter(ph => ph.phase > _lastUnlockedPhase && ph.phase <= highest);
    const newCats = newPhases.flatMap(ph => ph.categories);
    // Mark each newly unlocked category as "new" for the badge in renderHome
    newCats.forEach(catId => {
      localStorage.setItem('cs_cat_new_' + (profile.id || '') + '_' + catId, '1');
    });
    showUnlockToast(newCats);
  }
  _lastUnlockedPhase = highest;
}

function showUnlockToast(newCats = []) {
  const catLabels = newCats.map(id => {
    const w = WORLDS.find(x => x.id === id);
    return w ? `${w.emoji} ${w.name}` : id;
  });
  const el = document.createElement('div');
  el.className = 'unlock-toast';
  el.innerHTML = catLabels.length
    ? `🎉 Neu freigeschaltet!<br><span class="unlock-toast-cats">${catLabels.join(' · ')}</span>`
    : '🎉 Neue Kategorien freigeschaltet!';
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('unlock-toast-in'), 10);
  setTimeout(() => {
    el.classList.add('unlock-toast-out');
    setTimeout(() => el.remove(), 400);
  }, 4000);
}

/* Check all badge conditions, return array of newly earned badge ids */
function checkAndAwardBadges(profile, extraChecks = {}) {
  const earned = profile.badges || [];
  const newBadges = [];

  BADGES.forEach(badge => {
    if (earned.includes(badge.id)) return; // already have it

    let unlocked = false;
    if (extraChecks[badge.id] !== undefined) {
      unlocked = extraChecks[badge.id];
    } else {
      unlocked = badge.check(profile);
    }

    if (unlocked) {
      newBadges.push(badge.id);
    }
  });

  if (newBadges.length) {
    profile.badges = [...earned, ...newBadges];
  }
  return newBadges;
}

/* ─── Level-Up Overlay ─── */
function checkXPMilestone(oldXp, newXp) {
  const milestones = [100, 250, 500, 1000, 2000, 5000];
  for (const m of milestones) {
    if (oldXp < m && newXp >= m) {
      setTimeout(() => {
        showConfetti(60);
        SoundManager.levelUp();
        const el = document.createElement('div');
        el.className = 'xp-milestone-toast';
        el.innerHTML = `⭐ ${m} XP erreicht! ⭐`;
        document.body.appendChild(el);
        setTimeout(() => el.classList.add('visible'), 50);
        setTimeout(() => { el.classList.remove('visible'); setTimeout(() => el.remove(), 500); }, 3000);
      }, 600);
      break;
    }
  }
}

function showLevelUpOverlay(_oldLevel, newLevel) {
  const overlay = document.getElementById('levelup-overlay');
  const titleEl = document.getElementById('levelup-title');
  const nameEl = document.getElementById('levelup-name');

  titleEl.textContent = `Level ${newLevel} erreicht!`;
  const levelLabel = LEVEL_NAMES[Math.min(newLevel - 1, LEVEL_NAMES.length - 1)];
  nameEl.textContent = levelLabel;

  overlay.classList.remove('hidden');
  showConfetti(50);

  document.getElementById('levelup-continue').onclick = () => {
    overlay.classList.add('hidden');
  };
  // Wire category complete dismiss (may be called before wireEvents)
  const catCompleteBtn = document.getElementById('cat-complete-continue');
  if (catCompleteBtn) catCompleteBtn.addEventListener('click', () => {
    document.getElementById('cat-complete-overlay').classList.add('hidden');
  });
}

/* ─── Badge Toast notification ─── */
let _badgeToastTimer = null;
function showBadgeToast(badgeId) {
  const badge = BADGES.find(b => b.id === badgeId);
  if (!badge) return;

  const toast = document.getElementById('badge-toast');
  document.getElementById('badge-toast-emoji').textContent = badge.emoji;
  document.getElementById('badge-toast-name').textContent = badge.name;

  toast.classList.remove('hidden');
  toast.classList.add('badge-toast-in');

  clearTimeout(_badgeToastTimer);
  _badgeToastTimer = setTimeout(() => {
    toast.classList.remove('badge-toast-in');
    toast.classList.add('badge-toast-out');
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.classList.remove('badge-toast-out');
    }, 400);
  }, 3000);
}

async function showNewBadgesSequentially(newBadges) {
  for (let i = 0; i < newBadges.length; i++) {
    await new Promise(resolve => {
      setTimeout(() => {
        showBadgeToast(newBadges[i]);
        resolve();
      }, i * 3600);
    });
  }
}

function renderReviewCard() {
  const due = getDueReviewWords(20);
  const card = document.getElementById('review-card');
  if (!card) return;
  if (!due.length) { card.style.display = 'none'; return; }
  card.style.display = '';
  document.getElementById('review-count').textContent = due.length;
  document.getElementById('review-label').textContent =
    due.length === 1 ? 'Wort zum Wiederholen' : 'Wörter zum Wiederholen';
}

function startReviewSession() {
  _trackGamePlayed('tap');
  const words = getDueReviewWords(20);
  if (!words.length) return;
  state.tap = { words: shuffle(words), index: 0, correct: 0 };
  renderTapQuestion();
  navigate('tap');
}

/* ─── Focus Card (one rotating card on home screen) ─── */
function renderFocusCard() {
  const card = document.getElementById('focus-card');
  if (!card) return;

  // Priority 1: SRS review words due
  const due = getDueReviewWords(20);
  if (due.length) {
    card.innerHTML = `
      <div class="fc-review">
        <div class="fc-review-count">${due.length}</div>
        <div class="fc-review-info">
          <strong>${due.length === 1 ? 'Wort' : 'Wörter'} zum Wiederholen</strong>
          <span>Nicht vergessen — üb die heute!</span>
        </div>
        <button class="fc-action-btn" id="fc-review-btn">Jetzt üben →</button>
      </div>`;
    document.getElementById('fc-review-btn').onclick = () => { AudioManager.unlock(); startReviewSession(); };
    return;
  }

  // Priority 2: Daily goal not yet done
  const { count, target, done } = dailyGoalProgress();
  if (!done) {
    const pct = Math.round(count / target * 100);
    card.innerHTML = `
      <div class="fc-goal">
        <div class="fc-goal-top">
          <span class="fc-goal-label">🎯 Tagesziel</span>
          <span class="fc-goal-count">${count} / ${target} Wörter</span>
        </div>
        <div class="fc-goal-bar-outer">
          <div class="fc-goal-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="fc-goal-sub">${target - count} Wörter noch heute!</span>
      </div>`;
    return;
  }

  // Priority 3: Tagesziel erreicht oder WOTD
  const { unlocked } = getUnlockedCategories(state.profile);
  const pool = state.vocabulary.filter(v => unlocked.includes(v.category));
  if (!pool.length) { card.innerHTML = ''; return; }
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const word = pool[dayOfYear % pool.length];
  const numeral = getWordNumeral(word);
  const worldDef = WORLDS.find(w => w.id === word.category);

  card.innerHTML = `
    <div class="fc-wotd">
      <span class="fc-wotd-label">⭐ Wort des Tages</span>
      <div class="fc-wotd-main">
        <span class="fc-wotd-emoji">${numeral || word.emoji}</span>
        <div class="fc-wotd-words">
          <strong class="fc-wotd-hr">${word.croatian}</strong>
          <span class="fc-wotd-de">${word.german}</span>
        </div>
        <button class="speak-btn fc-wotd-speak" id="fc-wotd-speak" style="width:44px;height:44px;font-size:1.1rem">🔊</button>
      </div>
      ${worldDef ? `<button class="fc-wotd-practice" id="fc-wotd-practice">${worldDef.emoji} ${worldDef.name} üben →</button>` : ''}
    </div>`;

  const speakBtn = document.getElementById('fc-wotd-speak');
  if (speakBtn) speakBtn.onclick = e => { e.stopPropagation(); AudioManager.unlock(); AudioManager.speakWord(word, 'hr', speakBtn); };
  const practiceBtn = document.getElementById('fc-wotd-practice');
  if (practiceBtn && worldDef) practiceBtn.onclick = () => { AudioManager.unlock(); openCategory(worldDef); };
}

function renderWordOfTheDay() {
  if (!state.vocabulary.length || !state.profile) return;
  // Pick a deterministic word per calendar day, from unlocked categories only
  const { unlocked } = getUnlockedCategories(state.profile);
  const pool = state.vocabulary.filter(v => unlocked.includes(v.category));
  if (!pool.length) return;
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const word = pool[dayOfYear % pool.length];

  document.getElementById('wotd-emoji').textContent = word.emoji;
  document.getElementById('wotd-hr').textContent = word.croatian;
  document.getElementById('wotd-de').textContent = word.german;

  const banner = document.getElementById('wotd-banner');
  const speakBtn = document.getElementById('wotd-speak');
  const practiceBtn = document.getElementById('wotd-practice-btn');
  const wordWorld = WORLDS.find(w => w.id === word.category);

  // Tap banner body → play word
  banner.onclick = e => {
    if (e.target.closest('#wotd-speak') || e.target.closest('#wotd-practice-btn')) return;
    AudioManager.unlock();
    AudioManager.speakWord(word, 'hr');
  };
  speakBtn.onclick = e => {
    e.stopPropagation();
    AudioManager.unlock();
    AudioManager.speakWord(word, 'hr', speakBtn);
  };
  if (practiceBtn) {
    practiceBtn.style.display = wordWorld ? '' : 'none';
    practiceBtn.onclick = e => {
      e.stopPropagation();
      AudioManager.unlock();
      if (wordWorld) openCategory(wordWorld);
    };
  }
  banner.style.display = '';
}

function renderDailyGoal() {
  const banner = document.getElementById('daily-goal-banner');
  if (!banner) return;

  const { count, target, done } = dailyGoalProgress();
  const pct = Math.min(count / target * 100, 100);

  document.getElementById('daily-goal-label').textContent =
    done ? `Tagesziel erreicht! ${count}/${target} Wörter` : `Tagesziel: ${count}/${target} Wörter`;

  const checkEl = document.getElementById('daily-goal-check');
  if (done) {
    checkEl.classList.remove('hidden');
    banner.classList.add('daily-goal-done');
    // Track daily goal completions for badge (once per day)
    const dgKey = 'cs_dg_celebrated_' + todayStr();
    if (!localStorage.getItem(dgKey)) {
      localStorage.setItem(dgKey, '1');
      const prev = parseInt(localStorage.getItem('cs_daily_goals_hit') || '0', 10);
      localStorage.setItem('cs_daily_goals_hit', String(prev + 1));
    }
  } else {
    checkEl.classList.add('hidden');
    banner.classList.remove('daily-goal-done');
  }

  document.getElementById('daily-goal-bar-fill').style.width = pct + '%';
}

/* ─── Badge Grid for Progress screen ─── */
function renderBadges() {
  const grid = document.getElementById('badge-grid');
  if (!grid) return;
  const earned = (state.profile?.badges) || [];
  grid.innerHTML = '';

  BADGES.forEach(badge => {
    const isEarned = earned.includes(badge.id);
    const item = document.createElement('div');
    item.className = 'badge-item' + (isEarned ? '' : ' locked');
    item.title = badge.desc;

    const emojiEl = document.createElement('div');
    emojiEl.className = 'badge-item-emoji';
    emojiEl.textContent = badge.emoji;

    const nameEl = document.createElement('div');
    nameEl.className = 'badge-item-name';
    nameEl.textContent = badge.name;

    item.append(emojiEl, nameEl);
    grid.appendChild(item);
  });
}

/* ─── Confetti ─── */
function showConfetti(count = 20) {
  const container = document.getElementById('global-confetti');
  const colors = ['#FF6B35','#FFB300','#00C853','#2196F3','#9C27B0','#EC407A'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `
      left:${Math.random() * 100}vw;
      top:${20 + Math.random() * 30}vh;
      /* PERF-04: animation fallback timeout ensures cleanup even if animationend doesn't fire */
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay:${Math.random() * .4}s;
      animation-duration:${.8 + Math.random() * .6}s;
      width:${8 + Math.random() * 8}px;
      height:${8 + Math.random() * 8}px;
    `;
    container.appendChild(p);
    // PERF-04: Fallback timeout removes confetti if animationend doesn't fire
    // (e.g. prefers-reduced-motion, old Safari, rapid screen switch)
    p.addEventListener('animationend', () => p.remove(), { once: true });
    setTimeout(() => p.isConnected && p.remove(), 2000);
  }
}

/* ════════════════════════════════════════
   SCREEN: Profile Selection
════════════════════════════════════════ */
function renderProfiles() {
  const grid = document.getElementById('profiles-grid');
  grid.innerHTML = '';

  state.profiles.forEach(p => {
    const card = document.createElement('button');
    card.className = 'profile-card';
    const mastered = Object.values(p.word_progress || {})
      .filter(w => w.encounters > 0 && w.correct / w.encounters >= 0.85).length;

    // SEC-01 FIX: Build DOM nodes instead of innerHTML to avoid XSS via profile name
    const avatarEl = document.createElement('span');
    avatarEl.className = 'profile-card-avatar';
    avatarEl.textContent = p.avatar;

    const nameEl = document.createElement('div');
    nameEl.className = 'profile-card-name';
    nameEl.textContent = p.name;

    const subEl = document.createElement('div');
    subEl.className = 'profile-card-sub';
    subEl.textContent = `${mastered} Wörter · Level ${getLevel(p.xp || 0)} · 🔥 ${p.streak || 0}`;

    const infoEl = document.createElement('div');
    infoEl.className = 'profile-card-info';
    infoEl.append(nameEl, subEl);

    const arrowEl = document.createElement('span');
    arrowEl.className = 'profile-card-arrow';
    arrowEl.textContent = '›';

    card.append(avatarEl, infoEl, arrowEl);
    card.addEventListener('click', () => unlockProfile(p));
    grid.appendChild(card);
  });

  // Add profile button (if < 4 profiles) — nur Eltern dürfen Profile anlegen
  if (state.profiles.length < 4) {
    const add = document.createElement('button');
    add.className = 'profile-card profile-card-add';
    add.innerHTML = '➕ Profil erstellen';
    add.addEventListener('click', () => openPinGate({
      subtitle: _parentPin
        ? 'Eltern-PIN eingeben, um ein Profil anzulegen'
        : 'Zuerst Eltern-PIN erstellen (4 Ziffern)',
      onSuccess: () => { navigate('profiles'); showCreateProfile(); },
    }));
    grid.appendChild(add);
  }
}

/* Profil antippen → Geheimcode des Kindes abfragen.
   Ältere Profile ohne Code: Eltern-PIN, dann einmalig Code festlegen. */
function unlockProfile(p) {
  if (p.pin) {
    openPinGate({
      mode: 'child',
      expected: p.pin,
      title: `${p.avatar} ${p.name}`,
      subtitle: 'Dein Geheimcode',
      onSuccess: () => activateProfile(p.id),
    });
    return;
  }
  openPinGate({
    subtitle: _parentPin
      ? 'Eltern-PIN — danach Geheimcode für dieses Profil festlegen'
      : 'Zuerst Eltern-PIN erstellen (4 Ziffern)',
    onSuccess: () => openPinGate({
      mode: 'set',
      title: `${p.avatar} ${p.name}`,
      subtitle: 'Neuen Geheimcode festlegen (4 Ziffern)',
      onSet: async (code) => {
        try {
          await api(`/api/profiles/${p.id}`, {
            method: 'PUT',
            body: JSON.stringify({ pin: code }),
          });
          p.pin = code;
        } catch (e) {
          console.warn('Code speichern fehlgeschlagen:', e.message);
        }
        activateProfile(p.id);
      },
    }),
  });
}

async function activateProfile(profileId) {
  try {
    const data = await api(`/api/profiles/${profileId}`);
    state.profile = data.profile;
    // Try to merge any locally cached progress
    const cached = localStorage.getItem('cs_profile_' + profileId);
    if (cached) {
      try {
        const local = JSON.parse(cached);
        // Merge word_progress (take higher correct counts)
        if (local.word_progress && state.profile.word_progress) {
          for (const [id, lw] of Object.entries(local.word_progress)) {
            const sw = state.profile.word_progress[id];
            if (!sw || lw.encounters > sw.encounters) {
              state.profile.word_progress[id] = lw;
            }
          }
        }
      } catch (_) {}
      localStorage.removeItem('cs_profile_' + profileId);
    }
    // Update streak for today
    state.profile = updateStreak(state.profile);
    renderHome();
    navigate('home');
  } catch (e) {
    alert('Profil laden fehlgeschlagen: ' + e.message);
  }
}

function showEditProfile() {
  const p = state.profile;
  if (!p) return;
  const modal = document.getElementById('modal-edit-profile');
  document.getElementById('edit-name-input').value = p.name;
  document.getElementById('edit-profile-error').classList.add('hidden');
  document.querySelectorAll('#edit-avatar-picker .avatar-opt').forEach(b => {
    b.classList.toggle('selected', b.dataset.avatar === p.avatar);
  });
  modal.classList.remove('hidden');
}

function hideEditProfile() {
  document.getElementById('modal-edit-profile').classList.add('hidden');
}

async function deleteProfile() {
  const p = state.profile;
  if (!p) return;
  if (!confirm(`Profil von ${p.name} wirklich löschen? Alle Fortschritte gehen verloren.`)) return;
  try {
    await api(`/api/profiles/${p.id}`, { method: 'DELETE' });
    state.profile = null;
    await loadProfilesAndRender();
    navigate('profiles');
    hideEditProfile();
  } catch (e) {
    alert('Löschen fehlgeschlagen: ' + e.message);
  }
}

async function saveEditProfile() {
  const p = state.profile;
  if (!p) return;
  const name = document.getElementById('edit-name-input').value.trim();
  const errorEl = document.getElementById('edit-profile-error');
  if (!name) {
    errorEl.textContent = 'Bitte gib deinen Namen ein.';
    errorEl.classList.remove('hidden');
    return;
  }
  const avatar = document.querySelector('#edit-avatar-picker .avatar-opt.selected')?.dataset.avatar || p.avatar;
  const btn = document.getElementById('btn-save-edit');
  btn.disabled = true;
  try {
    await api(`/api/profiles/${p.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, avatar }),
    });
    // Update the name/avatar fields in the backend profile model if supported
    // For now update local state directly
    state.profile.name = name;
    state.profile.avatar = avatar;
    // Also update in profiles list
    const idx = state.profiles.findIndex(x => x.id === p.id);
    if (idx >= 0) { state.profiles[idx].name = name; state.profiles[idx].avatar = avatar; }
    hideEditProfile();
    renderHome();
  } catch (e) {
    errorEl.textContent = e.message || 'Fehler beim Speichern.';
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
}

function showCreateProfile() {
  const modal = document.getElementById('modal-create-profile');
  const nameInput = document.getElementById('profile-name-input');
  const errorEl = document.getElementById('profile-error');

  // Reset modal state
  nameInput.value = '';
  document.getElementById('profile-pin-input').value = '';
  errorEl.classList.add('hidden');
  errorEl.textContent = '';
  document.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('selected'));
  document.querySelector('.avatar-opt[data-avatar="🦊"]').classList.add('selected');
  document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector('.age-btn[data-age="8"]').classList.add('selected');

  modal.classList.remove('hidden');
  setTimeout(() => nameInput.focus(), 100);
}

function hideCreateProfile() {
  document.getElementById('modal-create-profile').classList.add('hidden');
}

function saveNewProfile() {
  const nameInput = document.getElementById('profile-name-input');
  const errorEl = document.getElementById('profile-error');
  const name = nameInput.value.trim();

  if (!name) {
    errorEl.textContent = 'Bitte gib deinen Namen ein.';
    errorEl.classList.remove('hidden');
    nameInput.focus();
    return;
  }

  const avatar = document.querySelector('.avatar-opt.selected')?.dataset.avatar || '🦊';
  const age = parseInt(document.querySelector('.age-btn.selected')?.dataset.age || '8', 10);

  const pin = document.getElementById('profile-pin-input').value.trim();
  if (!/^\d{4}$/.test(pin)) {
    errorEl.textContent = 'Bitte einen Geheimcode aus genau 4 Ziffern vergeben.';
    errorEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('btn-save-profile');
  btn.disabled = true;

  api('/api/profiles', {
    method: 'POST',
    body: JSON.stringify({ name, avatar, age, pin }),
  }).then(data => {
    state.profiles.push(data.profile);
    renderProfiles();
    hideCreateProfile();
  }).catch(e => {
    errorEl.textContent = e.message || 'Fehler beim Speichern.';
    errorEl.classList.remove('hidden');
  }).finally(() => {
    btn.disabled = false;
  });
}

/* ════════════════════════════════════════
   SCREEN: Home — Category Grid
════════════════════════════════════════ */
function renderHome() {
  const p = state.profile;
  if (!p) return;

  document.getElementById('header-avatar').textContent = p.avatar;
  document.getElementById('header-name').textContent = p.name;
  document.getElementById('header-level').textContent = getLevelName(p.xp || 0);
  const freezeKey = 'cs_streak_freeze_' + p.id;
  const freezeAvailable = localStorage.getItem(freezeKey) !== getWeekString();
  document.getElementById('header-streak').textContent =
    `🔥 ${p.streak || 0}${freezeAvailable ? ' 🛡️' : ''}`;
  document.getElementById('header-xp').textContent = `⭐ ${p.xp || 0}`;
  document.getElementById('home-xp-bar').style.width =
    (getLevelProgress(p.xp || 0) * 100) + '%';

  renderFocusCard();

  // Quick-play recommendation: pick unlocked category with most "learning" words
  const { unlocked: unlockedCats, locked: lockedList } = getUnlockedCategories(p);
  let bestWorld = null, bestScore = -1;
  WORLDS.forEach(world => {
    if (!unlockedCats.includes(world.id)) return;
    const words = wordsForCategory(world.id);
    if (!words.length) return;
    // Score: learning words × 2 + struggling words × 3 (needs attention most)
    const score = words.reduce((s, w) => {
      const st = getWordStatus(w.id);
      return s + (st === 'learning' ? 2 : st === 'struggling' ? 3 : 0);
    }, 0);
    // Prefer categories with some progress but not complete
    if (score > bestScore) { bestScore = score; bestWorld = world; }
  });
  // Fallback: first unlocked category
  if (!bestWorld && unlockedCats.length) {
    bestWorld = WORLDS.find(w => w.id === unlockedCats[0]);
  }
  const qpBar = document.getElementById('quick-play-bar');
  const qpBtn = document.getElementById('quick-play-btn');
  if (bestWorld && qpBar && qpBtn) {
    qpBar.style.display = '';
    qpBtn.textContent = `▶ ${bestWorld.emoji} ${bestWorld.name}`;
    qpBtn.onclick = () => { AudioManager.unlock(); openCategory(bestWorld); };
  } else if (qpBar) {
    qpBar.style.display = 'none';
  }

  const grid = document.getElementById('categories-grid');
  grid.innerHTML = '';

  const lockedMap = {};
  lockedList.forEach(l => { lockedMap[l.catId] = l; });

  const masteredTotal = masteredCountAll(p);

  WORLDS.forEach(world => {
    const words = wordsForCategory(world.id);
    if (!words.length) return;
    const isLocked = !!lockedMap[world.id];
    const mastered   = words.filter(w => getWordStatus(w.id) === 'mastered').length;
    const learning   = words.filter(w => getWordStatus(w.id) === 'learning').length;
    const struggling = words.filter(w => getWordStatus(w.id) === 'struggling').length;
    const total      = words.length;
    const pct        = total ? Math.round(mastered / total * 100) : 0;
    const remaining  = isLocked ? lockedMap[world.id].unlocksAt - masteredTotal : 0;

    const newKey = 'cs_cat_new_' + (p.id || '') + '_' + world.id;
    const isNew = !isLocked && !!localStorage.getItem(newKey);

    const isComplete = !isLocked && pct === 100;
    const card = document.createElement('button');
    card.className = 'category-card' + (isLocked ? ' locked' : '') + (isComplete ? ' complete' : '');
    card.style.setProperty('--cat-color', world.color);

    // Tri-color bar segments (percentages relative to total)
    const pctMastered   = total ? (mastered / total * 100).toFixed(1) : 0;
    const pctLearning   = total ? (learning / total * 100).toFixed(1) : 0;
    const pctStruggling = total ? (struggling / total * 100).toFixed(1) : 0;

    card.innerHTML = `
      ${isComplete ? '<div class="cat-complete-badge">✓</div>' : ''}
      ${isNew ? '<div class="cat-new-badge">NEU!</div>' : ''}
      <div class="category-card-emoji">${world.emoji}</div>
      <div class="category-card-name">${world.name}</div>
      <div class="category-card-progress">${isLocked
        ? `<span class="unlock-progress">🔒 Noch ${remaining} Wörter</span>`
        : isComplete ? '<span style="color:var(--success);font-weight:700">Gemeistert! 🏆</span>'
        : `${mastered}/${total} Wörter`}</div>
      <div class="category-card-bar ${isLocked ? '' : 'tricolor'}">
        ${isLocked ? '<div class="category-card-bar-fill" style="width:0%"></div>' : `
          <div class="cat-bar-struggling" style="width:${pctStruggling}%"></div>
          <div class="cat-bar-learning"   style="width:${pctLearning}%"></div>
          <div class="cat-bar-mastered"   style="width:${pctMastered}%"></div>
        `}
      </div>
    `;
    if (isLocked) {
      card.addEventListener('click', () =>
        alert(`Lerne noch ${remaining} Wörter um diese Kategorie freizuschalten! 🔒`));
    } else {
      card.addEventListener('click', () => {
        AudioManager.unlock();
        // Clear "NEU!" badge when category is opened
        if (isNew) localStorage.removeItem(newKey);
        openCategory(world);
      });
    }
    grid.appendChild(card);
  });

  // Kroatische Laute als eigene Karte im Grid (statt separatem Banner)
  const lauteCard = document.createElement('button');
  lauteCard.className = 'category-card laute-card';
  lauteCard.innerHTML = `
    <div class="category-card-emoji laute-card-chars">č ć š ž</div>
    <div class="category-card-name">Kroatische Laute</div>
    <div class="category-card-progress">Hören &amp; erkennen</div>`;
  lauteCard.addEventListener('click', () => {
    AudioManager.unlock();
    renderCharsGuide();
    navigate('chars-guide');
  });
  grid.appendChild(lauteCard);

  // Moj-Grad-Kachel: Novčići + Einwohner aktualisieren
  if (typeof cityCoins === 'function') {
    const c = document.getElementById('cth-coins');
    const pop = document.getElementById('cth-pop');
    if (c) c.textContent = cityCoins();
    if (pop) pop.textContent = cityPopulation();
  }

  // Grammar unlock progress bar — Schwelle = echte Phase-4-Freischaltung
  const GRAMMAR_THRESHOLD = grammarUnlockThreshold(p);
  const unlockBar = document.getElementById('grammar-unlock-bar');
  if (unlockBar) {
    if (masteredTotal >= GRAMMAR_THRESHOLD) {
      unlockBar.style.display = 'none';
    } else {
      unlockBar.style.display = '';
      const pct = Math.round(masteredTotal / GRAMMAR_THRESHOLD * 100);
      document.getElementById('grammar-unlock-fill').style.width = pct + '%';
      document.getElementById('grammar-unlock-progress').textContent =
        `Noch ${GRAMMAR_THRESHOLD - masteredTotal} Wörter bis zum Freischalten`;
    }
  }

  checkPhaseUnlock(p);
}

/* ════════════════════════════════════════
   SCREEN: Category Detail
════════════════════════════════════════ */
function openCategory(world) {
  // Sperre durchsetzen — egal von wo geöffnet wird (Wort des Tages, Stadt, …)
  const { locked } = getUnlockedCategories(state.profile || {});
  const lockEntry = locked.find(l => l.catId === world.id);
  if (lockEntry) {
    const remaining = lockEntry.unlocksAt - masteredCountAll(state.profile || {});
    alert(`Lerne noch ${Math.max(1, remaining)} Wörter um diese Kategorie freizuschalten! 🔒`);
    return;
  }
  state.currentCategory = world;
  const words = wordsForCategory(world.id);
  const mastered = words.filter(w => getWordStatus(w.id) === 'mastered').length;

  document.getElementById('cat-title').textContent = world.name;
  document.getElementById('cat-emoji').textContent = world.emoji;
  document.getElementById('cat-mastered').textContent = mastered;
  document.getElementById('cat-total').textContent = words.length;
  const pct = words.length ? mastered / words.length * 100 : 0;
  document.getElementById('cat-mini-bar').style.width = pct + '%';

  const hero = document.getElementById('cat-hero');
  hero.style.background = `linear-gradient(135deg, ${world.color}22, ${world.color}44)`;

  // Zeichen-Picker moved to dedicated Laute section on home screen
  document.getElementById('btn-chars-game').style.display = 'none';

  // Speak game no longer needs mic — always visible
  document.getElementById('btn-speak-game').style.display = '';

  // Biti-Quiz + Fälle-Quiz only for the Biti category
  document.getElementById('btn-biti-game').style.display = world.id === 'Biti' ? '' : 'none';
  document.getElementById('btn-padezi-game').style.display = world.id === 'Biti' ? '' : 'none';

  // Sprint highscore badge
  const hsBadge = document.getElementById('sprint-cat-hs');
  if (hsBadge && typeof getSprintHighscore === 'function') {
    const hs = getSprintHighscore(world.id);
    hsBadge.textContent = hs > 0 ? `🏆 ${hs}` : '';
  }

  navigate('category');
}

/* ════════════════════════════════════════
   SCREEN: Progress
════════════════════════════════════════ */
function renderProgress() {
  const p = state.profile;
  if (!p) return;

  const wp = p.word_progress || {};
  const allWords = Object.values(wp);
  const mastered = allWords.filter(w => w.encounters > 0 && w.correct / w.encounters >= 0.85);

  document.getElementById('prog-avatar').textContent = p.avatar;
  document.getElementById('prog-name').textContent = p.name;
  document.getElementById('prog-level').textContent = getLevelName(p.xp || 0);
  document.getElementById('prog-total-words').textContent = mastered.length;
  document.getElementById('prog-streak').textContent = `${p.streak || 0} 🔥`;
  document.getElementById('prog-best-streak').textContent = `${p.best_streak || 0} 🏆`;
  document.getElementById('prog-xp').textContent = `${p.xp || 0} ⭐`;

  // Category breakdown
  const catList = document.getElementById('cat-progress-list');
  catList.innerHTML = '';
  WORLDS.forEach(world => {
    const words = wordsForCategory(world.id);
    if (!words.length) return;
    const masteredCat = words.filter(w => getWordStatus(w.id) === 'mastered').length;
    const pct = Math.round(masteredCat / words.length * 100);
    const row = document.createElement('div');
    row.className = 'cat-progress-row';
    row.innerHTML = `
      <div class="cat-progress-top">
        <span class="cat-progress-name">${world.emoji} ${world.name}</span>
        <span class="cat-progress-count">${masteredCat}/${words.length}</span>
      </div>
      <div class="cat-bar-outer">
        <div class="cat-bar-fill" style="width:${pct}%;background:${world.color}"></div>
      </div>
    `;
    catList.appendChild(row);
  });

  // Recent words
  const recentEl = document.getElementById('recent-words');
  recentEl.innerHTML = '';
  (p.recent_words || []).forEach(wid => {
    const word = state.vocabulary.find(v => v.id === wid);
    if (!word) return;
    const chip = document.createElement('div');
    chip.className = 'word-chip';
    chip.setAttribute('title', 'Tippe zum Hören');
    chip.innerHTML = `${word.emoji} ${word.croatian}<span class="chip-sub"> ${word.german}</span>`;
    chip.addEventListener('click', () => {
      AudioManager.unlock();
      AudioManager.speakWord(word, 'hr');
    });
    recentEl.appendChild(chip);
  });

  // Next unlock goal
  const masteredAll = masteredCountAll(p);
  const nextPhase = PHASES.filter(ph => ph.unlocksAt > masteredAll).sort((a,b) => a.unlocksAt - b.unlocksAt)[0];
  const goalBanner = document.getElementById('next-goal-banner');
  if (nextPhase && goalBanner) {
    goalBanner.style.display = '';
    const prevPhase = PHASES.filter(ph => ph.unlocksAt <= masteredAll).slice(-1)[0];
    const prevAt = prevPhase ? prevPhase.unlocksAt : 0;
    const neededTotal = nextPhase.unlocksAt - prevAt;
    const doneInRange = masteredAll - prevAt;
    const pctGoal = Math.min(100, Math.round(doneInRange / neededTotal * 100));
    const remaining = nextPhase.unlocksAt - masteredAll;
    const catNames = nextPhase.categories.slice(0,2).map(id => {
      const w = WORLDS.find(x => x.id === id);
      return w ? `${w.emoji} ${w.name}` : id;
    }).join(', ');
    document.getElementById('next-goal-title').textContent = `Bald freigeschaltet: ${catNames}`;
    document.getElementById('next-goal-desc').textContent = `Noch ${remaining} Wörter meistern`;
    document.getElementById('next-goal-bar-fill').style.width = pctGoal + '%';
  } else if (goalBanner) {
    goalBanner.style.display = 'none';
  }

  renderBadges();
  // Reset vocab browser on each progress render
  document.getElementById('vocab-browser').classList.add('hidden');
  document.getElementById('vocab-browser').innerHTML = '';
  document.getElementById('vocab-toggle-btn').textContent = 'Anzeigen ▾';
}

function renderVocabBrowser() {
  const browser = document.getElementById('vocab-browser');
  const p = state.profile;

  browser.innerHTML = '';
  WORLDS.forEach(world => {
    const words = wordsForCategory(world.id);
    if (!words.length) return;
    const section = document.createElement('div');
    section.className = 'vocab-section';
    section.innerHTML = `<div class="vocab-section-title" style="color:${world.color}">${world.emoji} ${world.name}</div>`;
    words.forEach(word => {
      const status = getWordStatus(word.id);
      const row = document.createElement('div');
      row.className = `vocab-row vocab-row-${status}`;
      row.innerHTML = `
        <span class="vocab-emoji">${word.emoji}</span>
        <span class="vocab-de">${word.german}</span>
        <span class="vocab-arrow">→</span>
        <span class="vocab-hr">${word.croatian}</span>
        <span class="vocab-status-dot" title="${status}"></span>
      `;
      row.addEventListener('click', () => { AudioManager.unlock(); AudioManager.speakWord(word, 'hr'); });
      section.appendChild(row);
    });
    browser.appendChild(section);
  });
}

/* ════════════════════════════════════════
   SCREEN: Settings
════════════════════════════════════════ */
function renderSettings() {
  const p = state.profile;
  if (!p) return;
  document.getElementById('settings-name').textContent = p.name;
  document.getElementById('settings-age').textContent = `${p.age} Jahre`;
  const diff = (p.settings?.difficulty || 'auto');
  document.getElementById('settings-difficulty').value = diff;
  document.getElementById('settings-hint-toggle').checked =
    p.settings?.showHint !== false;

  // Audio settings
  document.getElementById('settings-dark-toggle').checked  = document.documentElement.classList.contains('dark');
  document.getElementById('settings-sound-toggle').checked = SoundManager.enabled;
  document.getElementById('settings-audio-toggle').checked   = AudioManager.enabled;
  document.getElementById('settings-autoplay-toggle').checked = AudioManager.autoPlay;
  document.getElementById('settings-slow-toggle').checked    = AudioManager.slowMode;
  document.getElementById('settings-both-toggle').checked    = AudioManager.playBoth;
  _toggleAudioSubrows(AudioManager.enabled);
}

function _toggleAudioSubrows(enabled) {
  ['settings-audio-sub', 'settings-slow-row', 'settings-both-row'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = enabled ? '1' : '0.35';
  });
}

async function saveSettings() {
  if (!state.profile) return;
  state.profile.settings = {
    difficulty: document.getElementById('settings-difficulty').value,
    showHint: document.getElementById('settings-hint-toggle').checked,
  };
  // Save audio preferences
  setDarkMode(document.getElementById('settings-dark-toggle').checked);
  SoundManager.enabled = document.getElementById('settings-sound-toggle').checked;
  SoundManager.save();
  AudioManager.enabled  = document.getElementById('settings-audio-toggle').checked;
  AudioManager.autoPlay = document.getElementById('settings-autoplay-toggle').checked;
  AudioManager.slowMode = document.getElementById('settings-slow-toggle').checked;
  AudioManager.playBoth = document.getElementById('settings-both-toggle').checked;
  AudioManager.save();
  if (!AudioManager.enabled) AudioManager.stop();

  await saveProfile();
}

/* In die Zwischenablage kopieren, mit Fallback-Anzeige zum manuellen Kopieren */
function _copyToClipboard(text, btn) {
  const done = () => {
    const old = btn.textContent;
    btn.textContent = '✓ Kopiert!';
    setTimeout(() => { btn.textContent = old; }, 1800);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => prompt('Zum Kopieren markieren:', text));
  } else {
    prompt('Zum Kopieren markieren:', text);
  }
}

/* ════════════════════════════════════════
   PARENT PIN GATE
════════════════════════════════════════ */
let _parentPin = localStorage.getItem('cs_parent_pin') || null;
let _pinEntered = '';

/* Das Numpad dient drei Zwecken:
   - mode 'parent': Eltern-PIN prüfen (bzw. beim allerersten Mal anlegen)
   - mode 'child':  Geheimcode eines Kinderprofils prüfen (expected)
   - mode 'set':    einen neuen 4-stelligen Code einsammeln (onSet) */
let _pinGate = { mode: 'parent', expected: null, onSuccess: null, onSet: null };

function openPinGate(opts = {}) {
  _pinGate = {
    mode: opts.mode || 'parent',
    expected: opts.expected ?? null,
    onSuccess: opts.onSuccess || (() => { renderParentDashboard(); navigate('parent'); }),
    onSet: opts.onSet || null,
  };
  _pinEntered = '';
  updatePinDots();
  document.getElementById('pin-error').classList.add('hidden');
  document.getElementById('pin-gate-title').textContent = opts.title || 'Eltern-Bereich';
  document.getElementById('pin-subtitle').textContent = opts.subtitle
    || (_pinGate.mode === 'parent' && !_parentPin
        ? 'Eltern-PIN erstellen (4 Ziffern)'
        : 'PIN eingeben');
  navigate('parent-gate');
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('dot-' + i);
    dot.classList.toggle('filled', i < _pinEntered.length);
  }
}

function handlePinInput(num) {
  if (_pinEntered.length >= 4) return;
  _pinEntered += num;
  updatePinDots();
  if (_pinEntered.length !== 4) return;

  setTimeout(() => {
    const entered = _pinEntered;
    _pinEntered = '';
    updatePinDots();

    // Neuen Code einsammeln (Kind-Geheimcode festlegen)
    if (_pinGate.mode === 'set') {
      _pinGate.onSet?.(entered);
      return;
    }

    // Allererste Nutzung: Eltern-PIN wird angelegt statt geprüft
    if (_pinGate.mode === 'parent' && !_parentPin) {
      _parentPin = entered;
      localStorage.setItem('cs_parent_pin', entered);
      _pinGate.onSuccess();
      return;
    }

    const expected = _pinGate.mode === 'parent' ? _parentPin : _pinGate.expected;
    if (entered === expected) {
      _pinGate.onSuccess();
    } else {
      document.getElementById('pin-error').classList.remove('hidden');
      // Shake animation on dots
      document.getElementById('pin-dots').animate(
        [{ transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],
        { duration: 300 }
      );
    }
  }, 200);
}

/* ════════════════════════════════════════
   SCREEN: Parent Dashboard
════════════════════════════════════════ */
function _wpStatusForProfile(wordId, profile) {
  const e = (profile.word_progress || {})[wordId];
  if (!e || e.encounters === 0) return 'new';
  const acc = e.correct / e.encounters;
  if (acc >= 0.85 && e.encounters >= 5) return 'mastered';
  if (acc >= 0.65) return 'learning';
  return 'struggling';
}

function renderParentDashboard() {
  if (!state.profiles.length) return;
  const scroll = document.querySelector('.parent-scroll');

  // Remove old tab bar if re-rendering
  const oldTabs = scroll.querySelector('.pd-tab-bar');
  if (oldTabs) oldTabs.remove();

  // Build tab bar
  const tabBar = document.createElement('div');
  tabBar.className = 'pd-tab-bar';
  state.profiles.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'pd-tab' + (i === 0 ? ' active' : '');
    btn.textContent = `${p.avatar} ${p.name}`;
    btn.addEventListener('click', () => {
      tabBar.querySelectorAll('.pd-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      _renderParentProfile(p);
    });
    tabBar.appendChild(btn);
  });
  scroll.insertBefore(tabBar, scroll.firstChild);

  _renderParentProfile(state.profiles[0]);
}

function _renderParentProfile(p) {
  const container = document.getElementById('parent-children');
  container.innerHTML = '';

  const wp = p.word_progress || {};
  const totalVocab = state.vocabulary.length;
  const entries = Object.entries(wp).filter(([,e]) => e.encounters > 0);
  const learnedCount  = entries.filter(([,e]) => e.correct/e.encounters >= 0.65).length;
  const totalCorrect  = entries.reduce((s,[,e]) => s + e.correct, 0);
  const totalEnc      = entries.reduce((s,[,e]) => s + e.encounters, 0);
  const accuracy      = totalEnc > 0 ? Math.round(totalCorrect / totalEnc * 100) : 0;

  // ── Stats grid ──
  const statsGrid = document.createElement('div');
  statsGrid.className = 'pd-stats-grid';
  [
    { val: p.xp || 0,              label: '⭐ XP gesamt' },
    { val: `${p.streak || 0} 🔥`,  label: 'Aktueller Streak' },
    { val: `${learnedCount}/${totalVocab}`, label: '📚 Wörter gelernt' },
    { val: `${accuracy}%`,         label: '🎯 Genauigkeit' },
  ].forEach(({ val, label }) => {
    statsGrid.innerHTML += `
      <div class="pd-stat-card">
        <div class="pd-stat-value">${val}</div>
        <div class="pd-stat-label">${label}</div>
      </div>`;
  });
  container.appendChild(statsGrid);

  // ── Weak words ──
  const weakSection = document.createElement('div');
  weakSection.className = 'pd-section';
  weakSection.innerHTML = '<h3>😰 Schwache Wörter</h3>';
  const weak = entries
    .filter(([,e]) => e.encounters >= 2)
    .map(([id, e]) => ({ word: state.vocabulary.find(v => v.id === id), acc: e.correct/e.encounters }))
    .filter(x => x.word)
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 5);
  if (weak.length === 0) {
    weakSection.innerHTML += '<p class="pd-empty">Noch keine Daten — weiter üben! 💪</p>';
  } else {
    weak.forEach(({ word, acc }) => {
      weakSection.innerHTML += `
        <div class="pd-weak-item">
          <span class="pd-weak-emoji">${word.emoji}</span>
          <span class="pd-weak-name">${word.german} → ${word.croatian}</span>
          <span class="pd-weak-accuracy">${Math.round(acc*100)}%</span>
        </div>`;
    });
  }
  container.appendChild(weakSection);

  // ── Category progress ──
  const catSection = document.createElement('div');
  catSection.className = 'pd-section';
  catSection.innerHTML = '<h3>📊 Kategorien</h3>';
  WORLDS.forEach(world => {
    const words = wordsForCategory(world.id);
    if (!words.length) return;
    const done = words.filter(w => _wpStatusForProfile(w.id, p) === 'mastered' || _wpStatusForProfile(w.id, p) === 'learning').length;
    const pct  = Math.round(done / words.length * 100);
    catSection.innerHTML += `
      <div class="pd-cat-item ${done === words.length ? 'complete' : ''}">
        <div class="pd-cat-header">
          <span>${world.emoji} ${world.name}</span>
          <span>${done}/${words.length}</span>
        </div>
        <div class="pd-cat-bar">
          <div class="pd-cat-fill" style="width:${pct}%;background:${world.color}"></div>
        </div>
      </div>`;
  });
  container.appendChild(catSection);

  // ── Badges ──
  const badgeSection = document.createElement('div');
  badgeSection.className = 'pd-section';
  badgeSection.innerHTML = '<h3>🏅 Abzeichen</h3>';
  const earned = (p.badges || []);
  if (earned.length === 0) {
    badgeSection.innerHTML += '<p class="pd-empty">Noch keine Abzeichen</p>';
  } else {
    const row = document.createElement('div');
    row.className = 'pd-badge-row';
    earned.forEach(id => {
      const b = BADGES.find(x => x.id === id);
      if (!b) return;
      row.innerHTML += `<div class="pd-badge-chip">${b.emoji} ${b.name}</div>`;
    });
    badgeSection.appendChild(row);
  }
  container.appendChild(badgeSection);

  // ── Nutzungs-Auswertung ──
  const usage = getUsageLog(p.id).filter(e => e.ev === 'end');
  const usageSection = document.createElement('div');
  usageSection.className = 'pd-section';
  usageSection.innerHTML = '<h3>📈 Nutzung</h3>';
  if (!usage.length) {
    usageSection.innerHTML += '<p class="pd-empty">Noch keine Daten — die App zeichnet ab jetzt lokal auf.</p>';
  } else {
    const byMode = {};
    usage.forEach(e => {
      const m = byMode[e.mode || '?'] || (byMode[e.mode || '?'] = { n: 0, ok: 0, total: 0 });
      m.n++; m.ok += e.ok || 0; m.total += e.total || 0;
    });
    const last7 = usage.filter(e => (Date.now() - new Date(e.t)) < 7 * 86400000).length;
    usageSection.innerHTML += `<p class="pd-usage-summary">${usage.length} Übungen insgesamt · ${last7} in den letzten 7 Tagen</p>`;
    Object.entries(byMode).sort((a, b) => b[1].n - a[1].n).forEach(([mode, m]) => {
      const acc = m.total ? Math.round(m.ok / m.total * 100) : 0;
      usageSection.innerHTML += `
        <div class="pd-usage-row">
          <span class="pd-usage-mode">${mode}</span>
          <span class="pd-usage-n">${m.n}×</span>
          <span class="pd-usage-acc" style="color:${acc >= 75 ? 'var(--success, #2e9e4f)' : acc >= 50 ? '#d18432' : '#c9553d'}">${acc}% richtig</span>
        </div>`;
    });
    const exportBtn = document.createElement('button');
    exportBtn.className = 'secondary-btn pd-export-btn';
    exportBtn.textContent = '📋 Nutzungsdaten kopieren (JSON)';
    exportBtn.addEventListener('click', () => _copyToClipboard(JSON.stringify(getUsageLog(p.id)), exportBtn));
    usageSection.appendChild(exportBtn);
  }
  container.appendChild(usageSection);

  // ── Feedback der Kinder (geräteweit, aus dem Melden-Dialog) ──
  let fb = [];
  try { fb = JSON.parse(localStorage.getItem('cs_local_feedback') || '[]'); } catch (_) {}
  const fbSection = document.createElement('div');
  fbSection.className = 'pd-section';
  fbSection.innerHTML = '<h3>💬 Gemeldete Ideen & Fehler</h3>';
  if (!fb.length) {
    fbSection.innerHTML += '<p class="pd-empty">Nichts gemeldet. Kinder können in jeder Übung unten rechts auf 💬 tippen.</p>';
  } else {
    fb.slice(-8).reverse().forEach(e => {
      const item = document.createElement('div');
      item.className = 'pd-feedback-item';
      item.textContent = `${e.type === 'idea' ? '💡' : '🐛'} ${e.message || e.category}` +
        (e.context?.word_hr ? ` (${e.context.word_hr})` : '');
      fbSection.appendChild(item);
    });
    const copyBtn = document.createElement('button');
    copyBtn.className = 'secondary-btn pd-export-btn';
    copyBtn.textContent = '📋 Alles kopieren — für IDEAS.md';
    copyBtn.addEventListener('click', () => _copyToClipboard(JSON.stringify(fb, null, 2), copyBtn));
    fbSection.appendChild(copyBtn);
  }
  container.appendChild(fbSection);

  // ── Profil verwalten (Eltern-Bereich ist bereits PIN-geschützt) ──
  const manageSection = document.createElement('div');
  manageSection.className = 'pd-section';
  manageSection.innerHTML = '<h3>⚙️ Profil verwalten</h3>';
  const delBtn = document.createElement('button');
  delBtn.className = 'danger-btn pd-delete-btn';
  delBtn.textContent = `🗑️ Profil von ${p.name} löschen`;
  delBtn.addEventListener('click', async () => {
    if (!confirm(`Profil von ${p.name} wirklich löschen? Alle Fortschritte gehen verloren.`)) return;
    try {
      await api(`/api/profiles/${p.id}`, { method: 'DELETE' });
      if (state.profile?.id === p.id) state.profile = null;
      await loadProfilesAndRender();
      if (state.profiles.length) {
        renderParentDashboard();
      } else {
        navigate('profiles');
      }
    } catch (e) {
      alert('Löschen fehlgeschlagen: ' + e.message);
    }
  });
  manageSection.appendChild(delBtn);
  container.appendChild(manageSection);

  // ── Learning tips ──
  const tips = _generateLearningTips(p, weak, entries);
  if (tips.length) {
    const tipSection = document.createElement('div');
    tipSection.className = 'pd-section';
    tipSection.innerHTML = '<h3>💡 Tipps für Sie</h3>';
    tips.forEach(tip => {
      tipSection.innerHTML += `<div class="pd-tip">${tip}</div>`;
    });
    container.appendChild(tipSection);
  }
}

function _generateLearningTips(p, weak, _entries) {
  const tips = [];
  const mastered = masteredCountAll(p);
  const streak = p.streak || 0;

  if (streak === 0)
    tips.push('📅 Täglich 10 Minuten üben ist effektiver als 1 Stunde pro Woche. Erinnere dein Kind daran!');
  if (streak >= 7)
    tips.push(`🔥 ${p.name} hat einen ${streak}-Tage-Streak! Super Motivation — weiter so!`);
  if (weak.length >= 3)
    tips.push(`😰 ${p.name} hat Schwierigkeiten mit: ${weak.slice(0,3).map(w=>w.word.croatian).join(', ')}. Übt diese Wörter gemeinsam im Alltag.`);
  if (mastered < 10)
    tips.push('🌱 Am Anfang: Konzentriert euch auf die ersten 2 Kategorien. Kleine Schritte führen weit!');
  if (mastered >= 50)
    tips.push('🎓 Toll! Versucht jetzt kurze kroatische Sätze im Alltag zu benutzen — z.B. beim Abendessen.');
  if (!AudioManager.enabled)
    tips.push('🔊 Tipp: Schalte die Aussprache ein! Das Hören der Wörter verdoppelt den Lerneffekt.');
  return tips.slice(0, 3);
}

/* ════════════════════════════════════════
   ONBOARDING
════════════════════════════════════════ */
const ONBOARDING_KEY = 'cro_swipe_onboarded_v1';
let _onboardingSlide = 0;

function startOnboarding() {
  _onboardingSlide = 0;
  _updateOnboardingSlide();
  navigate('onboarding');
}

function _updateOnboardingSlide() {
  document.querySelectorAll('.onboarding-slide').forEach((s, i) =>
    s.classList.toggle('active', i === _onboardingSlide));
  document.querySelectorAll('.onboarding-dot').forEach((d, i) =>
    d.classList.toggle('active', i === _onboardingSlide));
  const slides = document.querySelectorAll('.onboarding-slide').length;
  document.getElementById('onboarding-next').textContent =
    _onboardingSlide === slides - 1 ? "Los geht's! 🚀" : 'Weiter →';
}

function _onboardingNext() {
  const slides = document.querySelectorAll('.onboarding-slide').length;
  if (_onboardingSlide < slides - 1) {
    _onboardingSlide++;
    _updateOnboardingSlide();
  } else {
    _finishOnboarding();
  }
}

function _finishOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, '1');
  navigate('profiles');
}

/* ════════════════════════════════════════
   INIT HELPER
════════════════════════════════════════ */
async function loadProfilesAndRender() {
  try {
    const data = await api('/api/profiles');
    state.profiles = data.profiles;
  } catch (e) {
    state.profiles = [];
    console.warn('Could not load profiles:', e.message);
  }
  renderProfiles();
}

/* Cro Swipe — engine.js: Alle Spielmodi (Swipe, Tap, Match, Chars, Satz, Listen, Speak, Biti, Puzzle) */

/* ════════════════════════════════════════
   SWIPE GAME
════════════════════════════════════════ */
function startSwipeGame(catId) {
  _trackGamePlayed('swipe');
  const cfg = ageConfig(state.profile?.age);
  const words = selectSessionWords(catId, cfg.sessionWords);

  // BUG-03 FIX: Don't start the game with an empty word list
  if (!words.length) {
    alert('Diese Kategorie hat noch keine Wörter. Bitte eine andere auswählen.');
    return;
  }

  state.swipe = {
    words,
    index: 0,
    correct: 0,
    xpGained: 0,
    wrongWords: [],
    knownWords: [],
    card: null,
    startX: 0, startY: 0,
    dragging: false,
    revealed: false,
  };

  document.getElementById('session-result').classList.add('hidden');
  document.getElementById('swipe-hints').style.display = '';

  // Show first-time tutorial overlay
  const tut = document.getElementById('swipe-tutorial');
  if (tut) {
    if (!localStorage.getItem('cs_swipe_tutorial')) {
      tut.classList.add('visible');
    } else {
      tut.classList.remove('visible');
    }
  }

  renderSwipeCard();
  updateSwipeProgress();
  navigate('swipe');
}

function renderSwipeCard() {
  const stack = document.getElementById('card-stack');
  stack.innerHTML = '';

  const sw = state.swipe;
  if (sw.index >= sw.words.length) {
    showSwipeResult();
    return;
  }

  // Render current + next card (stack effect)
  const current = sw.words[sw.index];
  const next = sw.words[sw.index + 1];

  if (next) {
    const below = makeSwipeCard(next, false);
    below.classList.add('is-below');
    stack.appendChild(below);
  }

  const card = makeSwipeCard(current, true);
  card.classList.add('is-current');
  stack.appendChild(card);
  sw.card = card;
  sw.revealed = false;

  attachSwipeHandlers(card, current);

  // Auto-play pronunciation when card appears.
  // Guard: spielt nur, wenn diese Karte beim Feuern noch aktuell ist —
  // sonst redet bei schnellem Wischen die alte Karte dazwischen.
  if (AudioManager.enabled && AudioManager.autoPlay) {
    const myIndex = sw.index;
    setTimeout(() => {
      if (state.swipe === sw && sw.index === myIndex && sw.index < sw.words.length)
        AudioManager.speakWord(current, 'hr');
    }, 250);
  }

  // Auto-show hint after delay
  const cfg = ageConfig(state.profile?.age);
  const hintEl = card.querySelector('.swipe-card-hint');
  sw._hintTimer = setTimeout(() => {
    hintEl?.classList.add('visible');
  }, cfg.showHintAfterMs);
}

function makeSwipeCard(word, isCurrent) {
  const worldDef = WORLDS.find(w => w.id === word.category);
  const catColor = worldDef?.color || 'var(--primary)';
  const numeral = getWordNumeral(word);
  const card = document.createElement('div');
  card.className = 'swipe-card';
  card.style.setProperty('--card-cat-color', catColor);
  // Bild/Zahl NICHT vorn zeigen — es verrät die Bedeutung und verfälscht die
  // Selbsteinschätzung (die Kinder haben es zu Recht selbst verdeckt, T-15).
  // Erscheint erst beim Aufdecken zusammen mit der Übersetzung.
  card.innerHTML = `
    <div class="swipe-card-mystery">🃏</div>
    ${numeral
      ? `<div class="swipe-card-numeral swipe-card-visual">${numeral}</div>`
      : `<div class="swipe-card-emoji swipe-card-visual">${word.emoji}</div>`}
    <div class="swipe-card-croatian">${word.croatian}</div>
    <div class="swipe-card-category" style="color:${catColor}">${worldDef?.emoji || ''} ${word.category}</div>
    <div class="swipe-card-hint">Tippe für Übersetzung</div>
    <div class="swipe-card-german">${word.german}</div>
    ${isCurrent ? '<button class="speak-btn speak-btn-card" title="Aussprache hören" aria-label="Hören">🔊</button>' : ''}
  `;
  if (isCurrent) {
    const speakBtn = card.querySelector('.speak-btn');
    speakBtn?.addEventListener('click', e => {
      e.stopPropagation();
      AudioManager.unlock();
      AudioManager.speakWord(word, 'hr', speakBtn);
    });
    // Reveal translation on card tap (not on speak button)
    card.addEventListener('click', e => {
      if (e.target.closest('.speak-btn')) return;
      toggleReveal(card);
    });
  }
  return card;
}

function toggleReveal(card) {
  const sw = state.swipe;
  sw.revealed = !sw.revealed;
  const hintEl  = card.querySelector('.swipe-card-hint');
  const germanEl = card.querySelector('.swipe-card-german');
  card.classList.toggle('revealed', sw.revealed);
  if (sw.revealed) {
    hintEl?.classList.remove('visible');
    germanEl?.classList.add('visible');
    // Play German when translation revealed (if playBoth or autoPlay)
    const word = sw.words[sw.index];
    if (word && AudioManager.enabled && AudioManager.playBoth)
      setTimeout(() => AudioManager.speakWord(word, 'de'), 150);
  } else {
    germanEl?.classList.remove('visible');
  }
}

function attachSwipeHandlers(card, word) {
  const sw = state.swipe;
  const olLeft = document.getElementById('swipe-ol');
  const olRight = document.getElementById('swipe-or');

  function onStart(e) {
    sw.dragging = true;
    const pt = e.touches ? e.touches[0] : e;
    sw.startX = pt.clientX;
    sw.startY = pt.clientY;
    card.style.transition = 'none';
    clearTimeout(sw._hintTimer);
  }

  function onMove(e) {
    if (!sw.dragging) return;
    if (e.cancelable) e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - sw.startX;
    const rotate = dx * 0.05;
    card.style.transform = `translateX(${dx}px) rotate(${rotate}deg)`;
    // Show overlays
    const intensity = Math.min(Math.abs(dx) / 100, 1);
    if (dx < 0) {
      olLeft.style.opacity = intensity;
      olRight.style.opacity = 0;
    } else {
      olRight.style.opacity = intensity;
      olLeft.style.opacity = 0;
    }
  }

  function onEnd(e) {
    if (!sw.dragging) return;
    sw.dragging = false;
    const pt = e.changedTouches ? e.changedTouches[0] : e;
    const dx = pt.clientX - sw.startX;
    olLeft.style.opacity = 0;
    olRight.style.opacity = 0;
    card.style.transition = 'transform .35s cubic-bezier(.25,.46,.45,.94)';

    const threshold = Math.min(80, window.innerWidth * 0.22);
    if (dx > threshold) {
      commitSwipe(card, word, 'right');
    } else if (dx < -threshold) {
      commitSwipe(card, word, 'left');
    } else {
      card.style.transform = ''; // snap back
    }
  }

  card.addEventListener('touchstart', onStart, { passive: true });
  card.addEventListener('touchmove', onMove, { passive: false });
  card.addEventListener('touchend', onEnd);
  // Fallback for non-touch (dev testing)
  card.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  // BUG-01 FIX: Store cleanup function so window-level listeners are removed
  // when this card is discarded (commitSwipe or back-navigation).
  card._cleanupMouseListeners = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onEnd);
  };
}

function commitSwipe(card, word, direction) {
  const sw = state.swipe;
  clearTimeout(sw._hintTimer);
  // BUG-01 FIX: Remove window-level mouse listeners attached to this card
  if (card._cleanupMouseListeners) card._cleanupMouseListeners();

  const knew = direction === 'right';
  if (knew) {
    card.style.transform = 'translateX(160%) rotate(20deg)';
    sw.correct++;
    sw.xpGained += ageConfig(state.profile?.age).xpCorrect;
    sw.knownWords.push(word);
  } else {
    card.style.transform = 'translateX(-160%) rotate(-20deg)';
    sw.xpGained += ageConfig(state.profile?.age).xpWrong;
    sw.wrongWords.push(word);
  }

  // Dismiss swipe tutorial on first swipe
  const tut = document.getElementById('swipe-tutorial');
  if (tut?.classList.contains('visible')) {
    tut.classList.remove('visible');
    localStorage.setItem('cs_swipe_tutorial', '1');
  }

  recordWord(word.id, knew);
  sw.index++;
  updateSwipeProgress();

  setTimeout(() => {
    renderSwipeCard();
  }, 350);
}

function updateSwipeProgress() {
  const sw = state.swipe;
  const total = sw.words.length;
  const pct = total ? (sw.index / total * 100) : 0;
  document.getElementById('swipe-progress-fill').style.width = pct + '%';
  document.getElementById('swipe-counter').textContent = `${sw.index}/${total}`;
}

function showSwipeResult() {
  const sw = state.swipe;
  const total = sw.words.length;
  logUsage({ ev: 'end', mode: 'swipe', cat: state.currentCategory?.id || null,
             ok: sw.known || sw.correct || 0, total, xp: sw.xpGained });

  // Award XP + level-up check
  if (state.profile) {
    const oldXp = state.profile.xp || 0;
    const oldLevel = getLevel(oldXp);
    state.profile.xp = oldXp + sw.xpGained;
    const newLevel = getLevel(state.profile.xp);
    checkXPMilestone(oldXp, state.profile.xp);

    // Badge: Schneller Flitzer — 10 words perfect in one session (0 wrong)
    const perfectSession = total >= 10 && sw.correct === total;
    const extraChecks = { schneller_flitzer: perfectSession };
    const newBadges = checkAndAwardBadges(state.profile, extraChecks);

    saveProfile();

    // Check category completion
    if (state.currentCategory) checkCategoryCompletion(state.currentCategory.id);

    // Show level-up overlay if level changed
    if (newLevel > oldLevel) {
      SoundManager.levelUp();
      setTimeout(() => showLevelUpOverlay(oldLevel, newLevel), 800);
    }

    // Show badge toasts (after possible level-up delay)
    if (newBadges.length) {
      const baseDelay = newLevel > oldLevel ? 4000 : 800;
      setTimeout(() => showNewBadgesSequentially(newBadges), baseDelay);
    }

    // Daily goal celebration
    const { done, count, target } = dailyGoalProgress();
    if (done && count - sw.words.length < target) {
      // Just crossed the threshold this session
      setTimeout(() => {
        renderDailyGoal();
        showConfetti(30);
      }, 600);
    }
  }

  // Pick emoji based on accuracy
  const pct = total ? sw.correct / total : 0;
  const emoji = pct >= 0.9 ? '🏆' : pct >= 0.7 ? '🎉' : pct >= 0.5 ? '🙌' : '🤔';

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent =
    pct >= 0.8 ? 'Super gemacht!' : pct >= 0.5 ? 'Gut gemacht!' : 'Weiter üben!';
  document.getElementById('result-correct').textContent = `${sw.correct}/${total}`;
  document.getElementById('result-xp').textContent = `+${sw.xpGained}`;
  document.getElementById('result-streak').textContent = state.profile?.streak || 0;

  // Wrong words section
  const wrongContainer = document.getElementById('result-wrong-words');
  const wrongList = document.getElementById('result-wrong-list');
  const wrong = sw.wrongWords.slice(0, 6); // max 6 to avoid overflow
  if (wrong.length && wrongContainer && wrongList) {
    wrongList.innerHTML = wrong.map(w =>
      `<div class="result-wrong-chip">${w.emoji} <strong>${w.croatian}</strong> = ${w.german}</div>`
    ).join('');
    wrongContainer.classList.remove('hidden');
  } else if (wrongContainer) {
    wrongContainer.classList.add('hidden');
  }

  // Review button for swipe wrong words
  const reviewBtn = document.getElementById('result-review');
  if (reviewBtn) {
    if (sw.wrongWords.length > 0) {
      reviewBtn.style.display = '';
      reviewBtn.textContent = `🔁 ${sw.wrongWords.length} falsche Wörter nochmal üben`;
      reviewBtn.onclick = () => {
        document.getElementById('session-result').classList.add('hidden');
        startWrongWordReview(sw.wrongWords);
      };
    } else {
      reviewBtn.style.display = 'none';
    }
  }

  // T-16: objektiver Kurz-Check der „ich kenn's"-Wörter — erdet die
  // Selbsteinschätzung (Kinder überschätzen sich beim bloßen Wiedererkennen)
  const checkBtn = document.getElementById('result-check');
  if (checkBtn) {
    if ((sw.knownWords || []).length >= 3) {
      checkBtn.style.display = '';
      checkBtn.onclick = () => {
        document.getElementById('session-result').classList.add('hidden');
        startWrongWordReview(shuffle([...sw.knownWords]).slice(0, 5));
      };
    } else {
      checkBtn.style.display = 'none';
    }
  }

  document.getElementById('session-result').classList.remove('hidden');
  document.getElementById('swipe-hints').style.display = 'none';

  if (pct >= 0.7) showConfetti(pct >= 0.9 ? 40 : 20);
}

/* ─── Wrong-word review: mini tap session with only wrong words ─── */
function startWrongWordReview(wrongWords) {
  if (!wrongWords || !wrongWords.length) return;
  state.tap = {
    words: shuffle([...wrongWords]),
    index: 0,
    correct: 0,
    reversed: false,
    initialCount: wrongWords.length,
    wrongCounts: {},
    wrongWords: [],
    isReview: true,
  };
  renderTapQuestion();
  navigate('tap');
}

/* ════════════════════════════════════════
   TAP / 4-CHOICES GAME
════════════════════════════════════════ */
function startTapGame(catId, reversed = false) {
  _trackGamePlayed(reversed ? 'rtap' : 'tap');
  const cfg = ageConfig(state.profile?.age);
  const words = selectSessionWords(catId, cfg.sessionWords);

  // BUG-03 FIX: Don't start with empty word list
  if (!words.length) {
    alert('Diese Kategorie hat noch keine Wörter. Bitte eine andere auswählen.');
    return;
  }

  state.tap = { words, index: 0, correct: 0, reversed, initialCount: words.length, wrongCounts: {}, wrongWords: [] };
  renderTapQuestion();
  navigate('tap');
}

function renderTapQuestion() {
  const { words, index } = state.tap;
  if (index >= words.length) {
    // Session done — award XP and return to category
    const xp = state.tap.correct * ageConfig(state.profile?.age).xpCorrect;
    if (state.profile) {
      const oldXp = state.profile.xp || 0;
      const oldLevel = getLevel(oldXp);
      state.profile.xp = oldXp + xp;
      checkXPMilestone(oldXp, state.profile.xp);
      const newLevel = getLevel(state.profile.xp);
      const newBadges = checkAndAwardBadges(state.profile);
      saveProfile();
      if (state.currentCategory) setTimeout(() => checkCategoryCompletion(state.currentCategory.id), 400);
      if (newLevel > oldLevel) {
        setTimeout(() => showLevelUpOverlay(oldLevel, newLevel), 600);
      }
      if (newBadges.length) {
        const baseDelay = newLevel > oldLevel ? 4000 : 600;
        setTimeout(() => showNewBadgesSequentially(newBadges), baseDelay);
      }
    }
    const catId = state.currentCategory?.id;
    const reversed = state.tap.reversed;
    setTimeout(() => showGameResult({
      correct: state.tap.correct,
      total: state.tap.initialCount,
      xpGained: xp,
      wrongWords: state.tap.wrongWords,
      onContinue: () => startTapGame(catId, reversed),
    }), 400);
    return;
  }

  const word = words[index];
  const total = words.length;
  document.getElementById('tap-progress-fill').style.width = (index / total * 100) + '%';
  document.getElementById('tap-counter').textContent = `${index}/${total}`;
  const { reversed } = state.tap;
  const tapNumeral = getWordNumeral(word);
  const tapEmojiEl = document.getElementById('tap-emoji');
  tapEmojiEl.textContent = tapNumeral || word.emoji;
  tapEmojiEl.className = tapNumeral ? 'tap-emoji tap-numeral' : 'tap-emoji';
  document.getElementById('tap-croatian').textContent = reversed ? word.german : word.croatian;
  const qEl = document.getElementById('tap-question');
  if (qEl) qEl.textContent = reversed ? 'Wie sagt man das auf Kroatisch?' : 'Was bedeutet das auf Deutsch?';

  // Wire speak button for this word
  const tapSpeak = document.getElementById('tap-speak');
  if (tapSpeak) {
    tapSpeak.onclick = e => {
      e.stopPropagation();
      AudioManager.unlock();
      AudioManager.speakWord(word, 'hr', tapSpeak);
    };
    tapSpeak.style.display = AudioManager.enabled ? '' : 'none';
  }
  // Auto-play Croatian pronunciation
  if (AudioManager.enabled && AudioManager.autoPlay) {
    setTimeout(() => AudioManager.speakWord(word, 'hr'), 250);
  }

  const feedbackEl = document.getElementById('tap-feedback');
  feedbackEl.className = 'tap-feedback hidden';
  feedbackEl.textContent = '';

  // Build 4 choices: 1 correct + 3 random distractors
  const cfg = ageConfig(state.profile?.age);
  // Pool: same category first, then all words as fallback
  let pool = wordsForCategory(word.category);
  if (pool.length < cfg.tapChoices) pool = [...state.vocabulary];
  // Exclude: same word AND any word whose German = current Croatian (avoids visual duplicates)
  const others = shuffle(
    pool.filter(w => w.id !== word.id && w.german.toLowerCase() !== word.croatian.toLowerCase())
  ).slice(0, cfg.tapChoices - 1);
  // If still not enough distractors, pad with anything different
  if (others.length < cfg.tapChoices - 1) {
    const extra = shuffle(state.vocabulary.filter(
      w => w.id !== word.id && !others.find(o => o.id === w.id)
    )).slice(0, cfg.tapChoices - 1 - others.length);
    others.push(...extra);
  }
  const choices = shuffle([word, ...others]);

  // Ohren-Modus für junge Profile (≤8, Leseanfänger): Antworten als Bilder.
  // Das Frage-Emoji wird dann versteckt, sonst wäre die Antwort ablesbar.
  const useEmojiChoices = isYoungReader() && !reversed && !tapNumeral && _distinctEmojis(choices);
  if (useEmojiChoices) {
    tapEmojiEl.textContent = '🔊';
    tapEmojiEl.className = 'tap-emoji';
  }

  const choicesEl = document.getElementById('tap-choices');
  choicesEl.innerHTML = '';
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.dataset.wid = choice.id;
    if (useEmojiChoices) {
      btn.className = 'choice-btn choice-btn-emoji';
      btn.innerHTML = `<span class="choice-emoji">${choice.emoji}</span><span class="choice-label">${choice.german}</span>`;
    } else {
      btn.className = 'choice-btn';
      btn.textContent = reversed ? choice.croatian : choice.german;
    }
    btn.addEventListener('click', () => handleTapChoice(btn, choice, word, choices));
    choicesEl.appendChild(btn);
  });
}

/* Bild-Antworten funktionieren nur, wenn jedes Wort ein eigenes,
   aussagekräftiges Emoji hat (kein Platzhalter, keine Dubletten). */
function _distinctEmojis(choices) {
  const seen = new Set();
  for (const c of choices) {
    if (!c.emoji || c.emoji === '🔸' || seen.has(c.emoji)) return false;
    seen.add(c.emoji);
  }
  return true;
}

function handleTapChoice(btn, chosen, correct, _allChoices) {
  const isCorrect = chosen.id === correct.id;
  recordWord(correct.id, isCorrect);

  if (isCorrect) {
    btn.classList.add('correct');
    state.tap.correct++;
    showConfetti(8);
    SoundManager.correct();
    showFloatingXP(ageConfig(state.profile?.age).xpCorrect, btn);
    if (AudioManager.enabled) setTimeout(() => AudioManager.speakWord(correct, 'hr'), 200);
  } else {
    btn.classList.add('wrong');
    SoundManager.wrong();
    document.querySelectorAll('.choice-btn').forEach(b => {
      if (b.dataset.wid === correct.id) b.classList.add('correct');
    });
    if (AudioManager.enabled) setTimeout(() => AudioManager.speakWord(correct, 'hr'), 500);
  }

  // Disable all buttons
  document.querySelectorAll('.choice-btn').forEach(b => b.classList.add('disabled'));

  const feedbackEl = document.getElementById('tap-feedback');
  feedbackEl.className = `tap-feedback ${isCorrect ? 'correct' : 'wrong'}`;
  feedbackEl.textContent = isCorrect
    ? `✓ Richtig! ${correct.croatian} = ${correct.german}`
    : `${correct.croatian} bedeutet "${correct.german}"`;

  // Wrong answer: re-queue max 3× per word, track for end-review
  if (!isCorrect) {
    const wc = state.tap.wrongCounts;
    wc[correct.id] = (wc[correct.id] || 0) + 1;
    if (wc[correct.id] <= 3) state.tap.words.push(correct);
    if (wc[correct.id] === 1) state.tap.wrongWords.push(correct);
  }
  state.tap.index++;
  setTimeout(renderTapQuestion, isCorrect ? 1200 : 2200);
}

/* ════════════════════════════════════════
   MATCH-PAIRS GAME
════════════════════════════════════════ */
function startMatchGame(catId) {
  _trackGamePlayed('match');
  const cfg = ageConfig(state.profile?.age);
  const wordPool = selectSessionWords(catId, cfg.matchPairs);

  // BUG-03 FIX: Don't start with empty word list
  if (!wordPool.length) {
    alert('Diese Kategorie hat noch keine Wörter. Bitte eine andere auswählen.');
    return;
  }

  // Each word becomes 2 cards: emoji card + croatian word card
  const cards = [];
  wordPool.forEach(word => {
    cards.push({ id: word.id, type: 'emoji', display: word.emoji, word });
    cards.push({ id: word.id, type: 'text', display: word.croatian, word });
  });

  state.match = {
    cards: shuffle(cards),
    selected: [],
    matched: 0,
    total: wordPool.length,
  };

  renderMatchGrid();
  document.getElementById('match-result').classList.add('hidden');
  document.getElementById('match-counter').textContent = `0/${wordPool.length} ✓`;
  navigate('match');
}

function renderMatchGrid() {
  const grid = document.getElementById('match-grid');
  grid.innerHTML = '';

  state.match.cards.forEach((card, i) => {
    const el = document.createElement('button');
    el.className = 'match-card';
    el.dataset.index = i;
    el.textContent = card.display;
    el.addEventListener('click', () => handleMatchClick(i, el));
    grid.appendChild(el);
  });
}

function handleMatchClick(idx, el) {
  const m = state.match;
  if (m.selected.length === 2) return;
  if (el.classList.contains('matched') || el.classList.contains('selected')) return;

  el.classList.add('selected');
  m.selected.push({ idx, el });

  if (m.selected.length < 2) return;

  const [a, b] = m.selected;
  const cardA = m.cards[a.idx];
  const cardB = m.cards[b.idx];

  if (cardA.id === cardB.id && cardA.type !== cardB.type) {
    // Match!
    setTimeout(() => {
      a.el.classList.remove('selected');
      b.el.classList.remove('selected');
      a.el.classList.add('matched');
      b.el.classList.add('matched');
      m.selected = [];
      m.matched++;
      recordWord(cardA.id, true);
      SoundManager.match();
      showFloatingXP(ageConfig(state.profile?.age).xpCorrect, a.el);
      if (AudioManager.enabled) {
        const matchedWord = cardA.word;
        setTimeout(() => AudioManager.speakWord(matchedWord, 'hr'), 150);
      }

      document.getElementById('match-counter').textContent = `${m.matched}/${m.total} ✓`;
      showConfetti(6);

      if (m.matched === m.total) {
        // All matched!
        const xp = m.total * ageConfig(state.profile?.age).xpCorrect;
        if (state.profile) {
          const oldXp = state.profile.xp || 0;
          const oldLevel = getLevel(oldXp);
          state.profile.xp = oldXp + xp;
          checkXPMilestone(oldXp, state.profile.xp);
          const newLevel = getLevel(state.profile.xp);
          const newBadges = checkAndAwardBadges(state.profile);
          saveProfile();
          if (newLevel > oldLevel) {
            setTimeout(() => showLevelUpOverlay(oldLevel, newLevel), 1000);
          }
          if (newBadges.length) {
            const baseDelay = newLevel > oldLevel ? 4500 : 1000;
            setTimeout(() => showNewBadgesSequentially(newBadges), baseDelay);
          }
        }
        showConfetti(35);
        if (state.currentCategory) setTimeout(() => checkCategoryCompletion(state.currentCategory.id), 1500);
        document.getElementById('match-result-text').textContent =
          `Alle ${m.total} Paare gefunden! +${xp} XP`;
        document.getElementById('match-result').classList.remove('hidden');
      }
    }, 200);
  } else {
    // No match
    setTimeout(() => {
      a.el.classList.remove('selected');
      a.el.classList.add('wrong-flash');
      b.el.classList.remove('selected');
      b.el.classList.add('wrong-flash');
      setTimeout(() => {
        a.el.classList.remove('wrong-flash');
        b.el.classList.remove('wrong-flash');
      }, 350);
      m.selected = [];
    }, 600);
  }
}

/* ════════════════════════════════════════
   SCREEN: Zeichen-Picker
════════════════════════════════════════ */
const SPECIAL_CHARS = ['č','ć','š','ž','đ','Č','Ć','Š','Ž','Đ'];

const CHAR_GUIDE = [
  {
    char: 'č', upper: 'Č', color: '#FF6B35',
    sound: 'TSCH',
    tip: 'wie „Tschüss" oder „Tschibo"',
    rule: 'Č klingt immer wie hartes „Tsch". Jedes Mal, wenn du č siehst, sagst du „Tsch" — wie beim Verabschieden auf Deutsch.',
    vsNote: null,
  },
  {
    char: 'ć', upper: 'Ć', color: '#E91E8C',
    sound: 'tsch (weich)',
    tip: 'weiches Tsch — wie englisch „cheese"',
    rule: 'Ć klingt wie ein weiches „Tsch". Es ist fast wie č, aber kürzer und weicher — wie das „ch" im englischen Wort „cheese".',
    vsNote: '💡 č vs ć: Beide klingen wie „Tsch" — aber č ist härter (Tschüss), ć ist weicher (cheese). Beim Lernen: hör genau hin!',
  },
  {
    char: 'š', upper: 'Š', color: '#4CAF50',
    sound: 'SCH',
    tip: 'wie „Schule" oder „Schiff"',
    rule: 'Š klingt immer wie „Sch". Stell dir das Häkchen oben wie ein kleines Dach vor — darunter schläft ein „Sch"-Laut.',
    vsNote: null,
  },
  {
    char: 'ž', upper: 'Ž', color: '#2196F3',
    sound: 'sch (summend)',
    tip: 'wie das „g" in „Garage" (franz.)',
    rule: 'Ž klingt wie ein summendes „Sch" — wie das „g" im französischen Wort „Garage" oder das „s" in „Télévision". Es brummt ein bisschen.',
    vsNote: '💡 š vs ž: š ist still (Schule), ž summt (Garage). Beide haben ein Häkchen, aber ž brummt!',
  },
  {
    char: 'đ', upper: 'Đ', color: '#9C27B0',
    sound: 'DSch',
    tip: 'wie „Dschungel" oder „Dschinn"',
    rule: 'Đ klingt wie „Dsch" — wie in „Dschungel". Das ist der seltenste der 5 Laute, aber einmal gehört, vergisst man ihn nicht!',
    vsNote: null,
  },
];

function wordsWithSpecialChars(catId) {
  const pool = catId ? wordsForCategory(catId) : state.vocabulary;
  return pool.filter(w => SPECIAL_CHARS.some(c => w.croatian.includes(c)));
}

function buildCharQuestion(word, preferChar = null) {
  const cr = word.croatian;
  const groups = {
    'č': ['č','c','ć','š'], 'ć': ['ć','c','č','đ'],
    'š': ['š','s','ž','č'], 'ž': ['ž','z','š','s'],
    'đ': ['đ','d','dž','ć'],
  };
  // If focusing on a specific character, try to pick that one first
  const positions = [];
  for (let i = 0; i < cr.length; i++) {
    const c = cr[i].toLowerCase();
    if (groups[c]) positions.push({ i, c });
  }
  if (!positions.length) return null;
  // Prefer the focused character if present
  const pick = preferChar
    ? (positions.find(p => p.c === preferChar) || positions[0])
    : positions[0];
  const { i, c } = pick;
  const opts = shuffle([...new Set(groups[c])]).slice(0, 4);
  if (!opts.includes(c)) opts[3] = c;
  return { before: cr.slice(0, i), charLower: c, after: cr.slice(i + 1), options: shuffle(opts) };
}

function renderCharsGuide() {
  const el = document.getElementById('chars-guide-cards');
  if (!el) return;
  el.innerHTML = '';

  CHAR_GUIDE.forEach(g => {
    // Find up to 3 vocab words containing this character
    const examples = (state.vocabulary || [])
      .filter(w => w.croatian.toLowerCase().includes(g.char) || w.croatian.includes(g.upper))
      .slice(0, 3);

    const card = document.createElement('div');
    card.className = 'guide-card';
    card.style.borderLeft = `5px solid ${g.color}`;

    // Header row: big char + sound + tip
    const header = document.createElement('div');
    header.className = 'guide-card-header';
    header.innerHTML = `
      <span class="guide-char" style="color:${g.color}">${g.char.toUpperCase()} ${g.char}</span>
      <div class="guide-sound-block">
        <span class="guide-sound-label">klingt wie</span>
        <span class="guide-sound" style="color:${g.color}">${g.sound}</span>
        <span class="guide-tip-small">${g.tip}</span>
      </div>
    `;
    card.appendChild(header);

    // Rule
    const rule = document.createElement('p');
    rule.className = 'guide-rule';
    rule.textContent = g.rule;
    card.appendChild(rule);

    // vs-note (for č/ć and š/ž)
    if (g.vsNote) {
      const note = document.createElement('div');
      note.className = 'guide-vs-note';
      note.textContent = g.vsNote;
      card.appendChild(note);
    }

    // Example words from vocabulary
    if (examples.length) {
      const exSection = document.createElement('div');
      exSection.className = 'guide-examples';
      exSection.innerHTML = '<div class="guide-examples-label">Beispiele aus dem Vokabular:</div>';
      examples.forEach(w => {
        // Highlight the special character in the word
        const highlighted = w.croatian.replace(
          new RegExp(`[${g.char}${g.upper}]`, 'g'),
          `<mark style="background:${g.color}22;color:${g.color};border-radius:3px;padding:0 2px">$&</mark>`
        );
        const chip = document.createElement('button');
        chip.className = 'guide-example-chip';
        chip.innerHTML = `${w.emoji} <span class="chip-hr">${highlighted}</span> <span class="chip-de">= ${w.german}</span>`;
        chip.addEventListener('click', () => { AudioManager.unlock(); AudioManager.speakWord(w, 'hr'); });
        exSection.appendChild(chip);
      });
      card.appendChild(exSection);
    }

    // Practice button for this specific character
    const practiceBtn = document.createElement('button');
    practiceBtn.className = 'secondary-btn guide-practice-btn';
    practiceBtn.textContent = `Nur ${g.char.toUpperCase()}/${g.char} üben`;
    practiceBtn.addEventListener('click', () => startCharsGame(null, g.char));
    card.appendChild(practiceBtn);

    el.appendChild(card);
  });
}

function startCharsGame(catId, focusChar = null) {
  let pool = wordsWithSpecialChars(catId);
  // If focusing on a specific character, filter to words that contain it
  if (focusChar) {
    const upper = focusChar.toUpperCase();
    pool = pool.filter(w => w.croatian.includes(focusChar) || w.croatian.includes(upper));
  }
  if (pool.length < 2) {
    alert('Nicht genug Wörter für diese Übung.');
    return;
  }
  const count = Math.min(ageConfig(state.profile?.age).sessionWords, pool.length);
  state.chars = {
    focusChar,
    questions: shuffle(pool).slice(0, count)
      .map(w => ({ word: w, q: buildCharQuestion(w, focusChar) }))
      .filter(x => x.q),
    idx: 0, correct: 0,
  };
  if (!state.chars.questions.length) {
    alert('Nicht genug Wörter für diese Übung.');
    return;
  }
  renderCharQuestion();
  navigate('chars');
}

function renderCharQuestion() {
  const { questions, idx } = state.chars;
  const { word, q } = questions[idx];
  document.getElementById('chars-progress').textContent = `${idx + 1}/${questions.length}`;
  document.getElementById('chars-word-display').innerHTML =
    `${q.before}<span class="chars-blank" id="chars-blank">_</span>${q.after}`;
  document.getElementById('chars-translation').textContent = `${word.emoji}  ${word.german}`;
  // Auto-play the word so kids hear the special character
  if (AudioManager.enabled && AudioManager.autoPlay) {
    setTimeout(() => AudioManager.speakWord(word, 'hr'), 300);
  }
  const optEl = document.getElementById('chars-options');
  optEl.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'chars-option-btn';
    const guide = CHAR_GUIDE.find(g => g.char === opt);
    btn.innerHTML = `<span class="chars-opt-char">${opt}</span>${guide ? `<span class="chars-opt-sound">= ${guide.sound}</span>` : ''}`;
    btn.addEventListener('click', () => handleCharAnswer(opt, q.charLower, btn));
    optEl.appendChild(btn);
  });
}

function handleCharAnswer(chosen, correct, btn) {
  const optEl = document.getElementById('chars-options');
  optEl.querySelectorAll('.chars-option-btn').forEach(b => b.disabled = true);
  const ok = chosen === correct;
  btn.classList.add(ok ? 'correct' : 'wrong');
  const blank = document.getElementById('chars-blank');
  blank.textContent = correct;
  blank.className = 'chars-blank chars-filled ' + (ok ? 'correct' : 'wrong');
  if (!ok) optEl.querySelectorAll('.chars-option-btn').forEach(b => {
    if (b.textContent === correct) b.classList.add('correct');
  });
  if (ok) state.chars.correct++;
  recordWord(state.chars.questions[state.chars.idx].word.id, ok);
  setTimeout(() => {
    state.chars.idx++;
    if (state.chars.idx >= state.chars.questions.length) {
      const s = state.chars;
      const total = s.questions.length;
      saveProfile();
      document.getElementById('result-score').textContent = `${s.correct}/${total}`;
      document.getElementById('result-msg').textContent =
        s.correct === total ? '🎉 Alle Sonderzeichen perfekt!' :
        s.correct >= total * 0.7 ? '👍 Gut gemacht!' : '💪 Weiter üben!';
      document.getElementById('result-xp').textContent = `+${s.correct * 10} XP`;
      navigate('result');
    } else {
      renderCharQuestion();
    }
  }, ok ? 700 : 1500);
}

/* ════════════════════════════════════════
   SÄTZE BAUEN — Sentence fill-in-blank game
   Shows German sentence; child picks the Croatian word that fills the blank.
   Uses safe nominative frames to avoid Croatian case issues.
════════════════════════════════════════ */
const SENTENCE_FRAMES = [
  // ── Hallo Kroatien ──
  { de: 'Ich sage: „{de}".',               hr: 'Kažem: „{hr}".',                    cats: ['Hallo Kroatien'] },
  { de: 'Auf Kroatisch heißt das: {de}.',  hr: 'Na hrvatskom se kaže: {hr}.',       cats: ['Hallo Kroatien'] },
  { de: 'Das Wort lautet: {de}.',          hr: 'Riječ je: {hr}.',                   cats: ['Hallo Kroatien'] },

  // ── Zahlen ──
  { de: 'Die Zahl ist {de}.',              hr: 'Broj je {hr}.',                     cats: ['Zahlen'] },
  { de: 'Ich zähle bis {de}.',             hr: 'Brojim do {hr}.',                   cats: ['Zahlen'] },
  { de: 'Das sind {de} Sterne!',           hr: 'To je {hr} zvijezda!',              cats: ['Zahlen'] },

  // ── Farben ──
  { de: 'Die Farbe ist {de}.',             hr: 'Boja je {hr}.',                     cats: ['Farben'] },
  { de: 'Meine Lieblingsfarbe ist {de}.',  hr: 'Moja omiljena boja je {hr}.',       cats: ['Farben'] },
  { de: 'Der Himmel ist {de}.',            hr: 'Nebo je {hr}.',                     cats: ['Farben'] },

  // ── Tiere ──
  { de: 'Das Tier heißt {de}.',            hr: 'Životinja se zove {hr}.',           cats: ['Tiere'] },
  { de: 'Schau, das ist {de}!',            hr: 'Gledaj, to je {hr}!',               cats: ['Tiere'] },
  { de: 'Mein Lieblingstier ist {de}!',    hr: 'Moja omiljena životinja je {hr}!',  cats: ['Tiere'] },

  // ── Zu Hause ──
  { de: 'Das ist {de}.',                   hr: 'To je {hr}.',                       cats: ['Zu Hause','Schule','Kleidung','Fahrzeuge'] },
  { de: 'Das haben wir zu Hause: {de}.',   hr: 'Kod nas je {hr}.',                  cats: ['Zu Hause'] },
  { de: 'Das kenne ich: {de}.',            hr: 'Poznajem to: {hr}.',                cats: ['Zu Hause'] },

  // ── Essen ──
  { de: 'Ich esse gerne {de}.',            hr: 'Volim jesti {hr}.',                 cats: ['Essen'] },
  { de: 'Mein Lieblingsessen ist {de}.',   hr: 'Moje omiljeno jelo je {hr}.',       cats: ['Essen'] },
  { de: 'Heute gibt es {de}!',             hr: 'Danas ima {hr}!',                   cats: ['Essen'] },

  // ── Schule ──
  { de: 'Das brauche ich in der Schule: {de}.', hr: 'To trebam u školi: {hr}.',     cats: ['Schule'] },
  { de: 'Das benutze ich in der Schule: {de}.', hr: 'To koristim u školi: {hr}.',   cats: ['Schule'] },
  { de: 'Das liegt auf dem Tisch: {de}.',  hr: 'Na stolu je {hr}.',                 cats: ['Schule'] },

  // ── Körper ──
  { de: 'Das heißt auf Kroatisch: {de}.',  hr: 'Na hrvatskom je to: {hr}.',         cats: ['Körper'] },
  { de: '{de} ist wichtig!',               hr: '{hr} je važno!',                    cats: ['Körper'] },
  { de: 'Mein {de} tut weh!',             hr: 'Boli me {hr}!',                     cats: ['Körper'] },

  // ── Kleidung ──
  { de: 'Ich trage {de}.',                 hr: 'Nosim {hr}.',                       cats: ['Kleidung'] },
  { de: 'Das ziehe ich an: {de}!',         hr: 'To oblačim: {hr}!',                 cats: ['Kleidung'] },
  { de: 'Im Winter ist {de} toll!',        hr: 'Zimi je {hr} super!',               cats: ['Kleidung'] },

  // ── Natur ──
  { de: '{de} ist wunderschön!',           hr: '{hr} je predivno!',                 cats: ['Natur','Kroatien'] },
  { de: 'Das hier heißt {de}.',            hr: 'Ovo se zove {hr}.',                 cats: ['Natur'] },
  { de: 'Das sehe ich in der Natur: {de}!', hr: 'To vidim u prirodi: {hr}!',        cats: ['Natur'] },

  // ── Fahrzeuge ──
  { de: 'Das Fahrzeug heißt {de}.',        hr: 'Vozilo se zove {hr}.',              cats: ['Fahrzeuge'] },
  { de: 'Das hier ist {de}!',              hr: 'Ovo je {hr}!',                      cats: ['Fahrzeuge'] },
  { de: '{de} ist klasse!',               hr: '{hr} je super!',                    cats: ['Fahrzeuge'] },

  // ── Freizeit ──
  { de: 'Mein Hobby ist {de}.',            hr: 'Moj hobi je {hr}.',                 cats: ['Freizeit'] },
  { de: 'Ich mag {de}.',                   hr: 'Sviđa mi se {hr}.',                 cats: ['Freizeit','Tiere','Sport'] },
  { de: 'In meiner Freizeit liebe ich {de}.', hr: 'U slobodno vrijeme volim {hr}.', cats: ['Freizeit'] },

  // ── Wochentage ──
  { de: 'Heute ist {de}.',                 hr: 'Danas je {hr}.',                    cats: ['Wochentage'] },
  { de: 'Am {de} gehe ich in die Schule.', hr: 'U {hr} idem u školu.',              cats: ['Wochentage'] },
  { de: 'Mein Lieblingstag ist {de}!',     hr: 'Moj omiljeni dan je {hr}!',         cats: ['Wochentage'] },

  // ── Verben ──
  { de: 'Ich kann {de}.',                  hr: 'Mogu {hr}.',                        cats: ['Verben'] },
  { de: 'Ich möchte {de}.',               hr: 'Hoću {hr}.',                        cats: ['Verben'] },
  { de: 'Ich liebe es zu {de}.',           hr: 'Volim {hr}.',                       cats: ['Verben'] },

  // ── Gefühle ──
  { de: 'Ich bin {de}.',                   hr: 'Ja sam {hr}.',                      cats: ['Gefühle'] },
  { de: 'Heute fühle ich mich {de}.',      hr: 'Danas se osjećam {hr}.',            cats: ['Gefühle'] },
  { de: 'Nach dem Spiel bin ich {de}.',    hr: 'Nakon igre sam {hr}.',              cats: ['Gefühle'] },

  // ── Kroatien ──
  { de: '{de} ist in Kroatien.',           hr: '{hr} je u Hrvatskoj.',               cats: ['Kroatien'] },
  { de: 'In Kroatien heißt das: {de}.',    hr: 'U Hrvatskoj se to zove: {hr}.',     cats: ['Kroatien'] },
  { de: 'Im Urlaub entdecke ich: {de}!',   hr: 'Na odmoru otkrivam: {hr}!',         cats: ['Kroatien'] },

  // ── Zeit ──
  { de: 'Meine Lieblingsjahreszeit ist {de}.', hr: 'Moje omiljeno godišnje doba je {hr}.', cats: ['Zeit'] },
  { de: 'Im {de} ist es warm.',            hr: 'U {hr} je toplo.',                  cats: ['Zeit'] },
  { de: '{de} kommt nach dem Winter.',     hr: '{hr} dolazi nakon zime.',            cats: ['Zeit'] },

  // ── Eigenschaften ──
  { de: 'Das ist {de}!',                   hr: 'To je {hr}!',                       cats: ['Eigenschaften'] },
  { de: 'Der Elefant ist {de}.',           hr: 'Slon je {hr}.',                     cats: ['Eigenschaften'] },
  { de: 'Das Feuer ist {de}.',             hr: 'Vatra je {hr}.',                    cats: ['Eigenschaften'] },

  // ── Biti ──
  { de: 'Das kenne ich: {de}!',            hr: 'To znam: {hr}!',                    cats: ['Biti'] },
  { de: 'Auf Kroatisch: {de}.',            hr: 'Na hrvatskom: {hr}.',               cats: ['Biti'] },

  // ── Familie ──
  { de: 'Das ist {de}.',                   hr: 'To je {hr}.',                       cats: ['Familie'] },
  { de: '{de} ist super!',                 hr: '{hr} je super!',                    cats: ['Familie'] },
  { de: 'In meiner Familie gibt es {de}.', hr: 'U mojoj obitelji ima {hr}.',        cats: ['Familie'] },

  // ── Sport ──
  { de: 'Mein Lieblingssport ist {de}.',   hr: 'Moj omiljeni sport je {hr}.',       cats: ['Sport'] },
  { de: 'Ich trainiere {de}.',             hr: 'Treniram {hr}.',                    cats: ['Sport'] },
  { de: '{de} macht Spaß!',               hr: '{hr} je zabavno!',                  cats: ['Sport'] },

  // ── Wetter ──
  { de: 'Das Wetter heute: {de}.',         hr: 'Danas je vrijeme {hr}.',            cats: ['Wetter'] },
  { de: 'Das Wetter ist {de}.',            hr: 'Vrijeme je {hr}.',                  cats: ['Wetter'] },
  { de: 'Es gibt {de} draußen.',           hr: 'Vani je {hr}.',                     cats: ['Wetter'] },
];

function buildSentenceQuestions(catId, count) {
  const pool = catId ? wordsForCategory(catId) : wordsForProfile();
  const questions = [];

  // Try each word against matching frames
  const shuffled = shuffle([...pool]);
  for (const word of shuffled) {
    if (questions.length >= count) break;
    const matching = SENTENCE_FRAMES.filter(f => f.cats.includes(word.category));
    if (!matching.length) continue;
    const frame = matching[Math.floor(Math.random() * matching.length)];
    const de = frame.de.replace('{de}', word.german);
    const hr = frame.hr.replace('{hr}', '___');
    // Distractors from same category
    let distPool = pool.filter(w => w.id !== word.id && w.category === word.category);
    if (distPool.length < 3) distPool = pool.filter(w => w.id !== word.id);
    const distractors = shuffle(distPool).slice(0, 3);
    if (distractors.length < 3) continue; // can't make 4 choices
    questions.push({
      word,
      de_sentence: de,
      hr_template: hr,
      choices: shuffle([word, ...distractors]),
    });
  }
  return questions;
}

function startSatzGame(catId) {
  _trackGamePlayed('satz');
  const cfg = ageConfig(state.profile?.age);
  const questions = buildSentenceQuestions(catId, cfg.sessionWords);
  if (questions.length < 2) {
    alert('Diese Kategorie hat noch zu wenig Wörter für Sätze. Bitte mehr Wörter lernen!');
    return;
  }
  state.satz = { questions, index: 0, correct: 0, wrongWords: [] };
  renderSatzQuestion();
  navigate('satz');
}

function renderSatzQuestion() {
  const { questions, index } = state.satz;
  if (index >= questions.length) {
    const xp = state.satz.correct * ageConfig(state.profile?.age).xpCorrect;
    if (state.profile) {
      const oldXp = state.profile.xp || 0;
      const oldLevel = getLevel(oldXp);
      state.profile.xp = oldXp + xp;
      checkXPMilestone(oldXp, state.profile.xp);
      const newBadges = checkAndAwardBadges(state.profile);
      saveProfile();
      if (getLevel(state.profile.xp) > oldLevel) { SoundManager.levelUp(); setTimeout(() => showLevelUpOverlay(oldLevel, getLevel(state.profile.xp)), 600); }
      if (newBadges.length) setTimeout(() => showNewBadgesSequentially(newBadges), 600);
    }
    const catId = state.currentCategory?.id;
    setTimeout(() => showGameResult({
      correct: state.satz.correct,
      total: state.satz.questions.length,
      xpGained: xp,
      wrongWords: state.satz.wrongWords,
      onContinue: () => startSatzGame(catId),
    }), 400);
    return;
  }

  const q = questions[index];
  const total = questions.length;
  document.getElementById('satz-progress-fill').style.width = (index / total * 100) + '%';
  document.getElementById('satz-counter').textContent = `${index}/${total}`;
  document.getElementById('satz-de-sentence').textContent = q.de_sentence;
  document.getElementById('satz-hr-sentence').textContent = q.hr_template;
  document.getElementById('satz-feedback').className = 'tap-feedback hidden';

  const choicesEl = document.getElementById('satz-choices');
  choicesEl.innerHTML = '';
  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice.croatian;
    btn.addEventListener('click', () => handleSatzChoice(btn, choice, q));
    choicesEl.appendChild(btn);
  });

  if (AudioManager.enabled && AudioManager.autoPlay) {
    setTimeout(() => AudioManager.speakWord(q.word, 'hr'), 400);
  }
}

function handleSatzChoice(btn, chosen, q) {
  const correct = q.word;
  const isCorrect = chosen.id === correct.id;
  recordWord(correct.id, isCorrect);

  document.querySelectorAll('#satz-choices .choice-btn').forEach(b => {
    b.classList.add('disabled');
    if (b.textContent === correct.croatian) b.classList.add('correct');
  });
  btn.classList.add(isCorrect ? 'correct' : 'wrong');

  if (isCorrect) {
    state.satz.correct++;
    SoundManager.correct();
    showConfetti(8);
    showFloatingXP(ageConfig(state.profile?.age).xpCorrect, btn);
    // Show completed sentence
    document.getElementById('satz-hr-sentence').textContent =
      q.hr_template.replace('___', correct.croatian);
    if (AudioManager.enabled) setTimeout(() => AudioManager.speakWord(correct, 'hr'), 250);
  } else {
    SoundManager.wrong();
    document.getElementById('satz-hr-sentence').textContent =
      q.hr_template.replace('___', correct.croatian);
    if (AudioManager.enabled) setTimeout(() => AudioManager.speakWord(correct, 'hr'), 500);
  }

  const fb = document.getElementById('satz-feedback');
  fb.className = `tap-feedback ${isCorrect ? 'correct' : 'wrong'}`;
  fb.textContent = isCorrect
    ? `✓ ${correct.croatian} — richtig!`
    : `"${correct.croatian}" war die Antwort`;

  if (!isCorrect) {
    state.satz.questions.push(q);
    const already = state.satz.wrongWords.find(w => w.id === correct.id);
    if (!already) state.satz.wrongWords.push(correct);
  }
  state.satz.index++;
  setTimeout(renderSatzQuestion, isCorrect ? 1300 : 2300);
}

/* ════════════════════════════════════════
   HÖR-QUIZ — Audio-only multiple choice
   Kids hear the Croatian word (no text) and pick the German meaning.
════════════════════════════════════════ */
function startListenGame(catId) {
  _trackGamePlayed('listen');
  if (!AudioManager.enabled) {
    alert('Bitte zuerst die Aussprache in den Einstellungen einschalten! 🔊');
    return;
  }
  const cfg = ageConfig(state.profile?.age);
  const words = selectSessionWords(catId, cfg.sessionWords);
  if (!words.length) { alert('Diese Kategorie hat noch keine Wörter.'); return; }
  state.listen = { words, index: 0, correct: 0, initialCount: words.length, wrongCounts: {}, wrongWords: [] };
  renderListenQuestion();
  navigate('listen');
}

function renderListenQuestion() {
  const { words, index } = state.listen;
  if (index >= words.length) {
    const xp = state.listen.correct * ageConfig(state.profile?.age).xpCorrect;
    if (state.profile) {
      const oldXp = state.profile.xp || 0;
      const oldLevel = getLevel(oldXp);
      state.profile.xp = oldXp + xp;
      checkXPMilestone(oldXp, state.profile.xp);
      const newBadges = checkAndAwardBadges(state.profile, { hoer_profi: true });
      saveProfile();
      if (getLevel(state.profile.xp) > oldLevel) setTimeout(() => showLevelUpOverlay(oldLevel, getLevel(state.profile.xp)), 600);
      if (newBadges.length) setTimeout(() => showNewBadgesSequentially(newBadges), 600);
    }
    const catId = state.currentCategory?.id;
    setTimeout(() => showGameResult({
      correct: state.listen.correct,
      total: state.listen.initialCount,
      xpGained: xp,
      wrongWords: state.listen.wrongWords,
      onContinue: () => startListenGame(catId),
    }), 400);
    return;
  }

  const word = words[index];
  const total = words.length;
  document.getElementById('listen-progress-fill').style.width = (index / total * 100) + '%';
  document.getElementById('listen-counter').textContent = `${index}/${total}`;
  document.getElementById('listen-emoji').textContent = '👂';  // no visual hint
  document.getElementById('listen-feedback').className = 'tap-feedback hidden';

  // Build choices
  let pool = wordsForCategory(word.category);
  if (pool.length < 4) pool = [...state.vocabulary];
  const others = shuffle(pool.filter(w => w.id !== word.id)).slice(0, 3);
  const choices = shuffle([word, ...others]);

  const choicesEl = document.getElementById('listen-choices');
  choicesEl.innerHTML = '';
  // Ohren-Modus (≤8): Hören → Bild antippen statt Text lesen
  const useEmojiChoices = isYoungReader() && _distinctEmojis(choices);
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.dataset.wid = choice.id;
    if (useEmojiChoices) {
      btn.className = 'choice-btn choice-btn-emoji';
      btn.innerHTML = `<span class="choice-emoji">${choice.emoji}</span><span class="choice-label">${choice.german}</span>`;
    } else {
      btn.className = 'choice-btn';
      btn.textContent = choice.german;
    }
    btn.addEventListener('click', () => handleListenChoice(btn, choice, word));
    choicesEl.appendChild(btn);
  });

  // Wire replay button
  const playBtn = document.getElementById('listen-play-btn');
  playBtn.onclick = e => { e.stopPropagation(); AudioManager.unlock(); AudioManager.speakWord(word, 'hr', playBtn); };

  // Auto-play the word (this IS the question)
  AudioManager.unlock();
  setTimeout(() => AudioManager.speakWord(word, 'hr'), 300);
}

function handleListenChoice(btn, chosen, correct) {
  const isCorrect = chosen.id === correct.id;
  recordWord(correct.id, isCorrect);

  document.querySelectorAll('#listen-choices .choice-btn').forEach(b => {
    b.classList.add('disabled');
    if (b.dataset.wid === correct.id) b.classList.add('correct');
  });
  btn.classList.add(isCorrect ? 'correct' : 'wrong');

  if (isCorrect) {
    state.listen.correct++;
    showConfetti(8);
    SoundManager.correct();
    showFloatingXP(ageConfig(state.profile?.age).xpCorrect, btn);
  } else {
    SoundManager.wrong();
  }

  const fb = document.getElementById('listen-feedback');
  fb.className = `tap-feedback ${isCorrect ? 'correct' : 'wrong'}`;
  fb.textContent = isCorrect
    ? `✓ ${correct.croatian} = ${correct.german}`
    : `${correct.croatian} bedeutet "${correct.german}"`;

  if (!isCorrect) {
    const wc = state.listen.wrongCounts;
    wc[correct.id] = (wc[correct.id] || 0) + 1;
    if (wc[correct.id] <= 3) state.listen.words.push(correct);
    if (wc[correct.id] === 1) state.listen.wrongWords.push(correct);
  }
  state.listen.index++;

  // Replay word so kids reinforce the correct sound-meaning link
  setTimeout(() => AudioManager.speakWord(correct, 'hr'), isCorrect ? 300 : 600);
  setTimeout(renderListenQuestion, isCorrect ? 1400 : 2400);
}

/* ════════════════════════════════════════
   SCREEN: Hör & Erkenn! — hear Croatian, pick correct spelling
════════════════════════════════════════ */

function startSpeakGame(catId) {
  _trackGamePlayed('speak');
  const cfg = ageConfig(state.profile?.age);
  const words = selectSessionWords(catId, cfg.sessionWords);
  if (!words.length) { alert('Diese Kategorie hat noch keine Wörter.'); return; }
  state.speak = { words, index: 0, correct: 0, xpGained: 0, initialCount: words.length, wrongCounts: {}, wrongWords: [] };
  renderHoerQuestion();
  navigate('speak');
}

function renderHoerQuestion() {
  const { words, index } = state.speak;
  if (index >= words.length) {
    _finishHoerGame();
    return;
  }

  const word = words[index];
  const total = words.length;
  document.getElementById('speak-progress-fill').style.width = (index / total * 100) + '%';
  document.getElementById('speak-counter').textContent = `${index}/${total}`;
  const speakNumeral = getWordNumeral(word);
  const speakEmojiEl = document.getElementById('speak-emoji');
  speakEmojiEl.textContent = speakNumeral || word.emoji;
  speakEmojiEl.className = speakNumeral ? 'speak-emoji speak-numeral' : 'speak-emoji';
  document.getElementById('speak-german').textContent = word.german;
  document.getElementById('speak-feedback').className = 'tap-feedback hidden';

  // Build 4 Croatian spelling choices: 1 correct + 3 distractors from same category
  let pool = wordsForCategory(word.category);
  if (pool.length < 4) pool = [...state.vocabulary];
  const others = shuffle(pool.filter(w => w.id !== word.id)).slice(0, 3);
  if (others.length < 3) {
    const extra = shuffle(state.vocabulary.filter(
      w => w.id !== word.id && !others.find(o => o.id === w.id)
    )).slice(0, 3 - others.length);
    others.push(...extra);
  }
  const choices = shuffle([word, ...others]);

  const choicesEl = document.getElementById('speak-choices');
  choicesEl.innerHTML = '';
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice.croatian;
    btn.addEventListener('click', () => handleHoerChoice(btn, choice, word));
    choicesEl.appendChild(btn);
  });

  // Auto-play Croatian pronunciation
  if (AudioManager.enabled) {
    setTimeout(() => AudioManager.speakWord(word, 'hr'), 300);
  }

  // Wire replay button
  const hoerPlayBtn = document.getElementById('hoer-play-btn');
  hoerPlayBtn.onclick = () => {
    AudioManager.unlock();
    AudioManager.speakWord(word, 'hr', hoerPlayBtn);
  };
}

function handleHoerChoice(btn, chosen, correct) {
  const isCorrect = chosen.id === correct.id;
  const cfg = ageConfig(state.profile?.age);
  const xp = isCorrect ? cfg.xpCorrect : cfg.xpWrong;
  state.speak.xpGained += xp;
  if (isCorrect) state.speak.correct++;
  recordWord(correct.id, isCorrect);

  if (isCorrect) {
    btn.classList.add('correct');
    showConfetti(8);
    SoundManager.correct();
    showFloatingXP(xp, btn);
    if (AudioManager.enabled) setTimeout(() => AudioManager.speakWord(correct, 'hr'), 300);
  } else {
    btn.classList.add('wrong');
    SoundManager.wrong();
    document.querySelectorAll('#speak-choices .choice-btn').forEach(b => {
      if (b.textContent === correct.croatian) b.classList.add('correct');
    });
    if (AudioManager.enabled) setTimeout(() => AudioManager.speakWord(correct, 'hr'), 600);
    // Re-queue wrong word
    const wc = state.speak.wrongCounts;
    wc[correct.id] = (wc[correct.id] || 0) + 1;
    if (wc[correct.id] <= 3) state.speak.words.push(correct);
    if (wc[correct.id] === 1) state.speak.wrongWords.push(correct);
  }

  document.querySelectorAll('#speak-choices .choice-btn').forEach(b => b.classList.add('disabled'));

  const feedbackEl = document.getElementById('speak-feedback');
  feedbackEl.className = `tap-feedback ${isCorrect ? 'correct' : 'wrong'}`;
  feedbackEl.textContent = isCorrect
    ? `✓ Richtig! ${correct.croatian} = ${correct.german}`
    : `„${correct.croatian}" war die Antwort`;

  state.speak.index++;
  setTimeout(renderHoerQuestion, isCorrect ? 1400 : 2400);
}

function _finishHoerGame() {
  const sp = state.speak;
  if (state.profile) {
    const oldXp = state.profile.xp || 0;
    const oldLevel = getLevel(oldXp);
    state.profile.xp = oldXp + sp.xpGained;
    checkXPMilestone(oldXp, state.profile.xp);
    const newLevel = getLevel(state.profile.xp);
    const newBadges = checkAndAwardBadges(state.profile);
    saveProfile();
    if (newLevel > oldLevel) setTimeout(() => showLevelUpOverlay(oldLevel, newLevel), 600);
    if (newBadges.length) setTimeout(() => showNewBadgesSequentially(newBadges), newLevel > oldLevel ? 4000 : 600);
  }
  const pct = sp.initialCount ? sp.correct / sp.initialCount : 0;
  if (pct >= 0.7) showConfetti(pct >= 0.9 ? 40 : 20);
  const catId = state.currentCategory?.id;
  setTimeout(() => showGameResult({
    correct: sp.correct,
    total: sp.initialCount || sp.words.length,
    xpGained: sp.xpGained,
    wrongWords: sp.wrongWords,
    onContinue: () => startSpeakGame(catId),
  }), 400);
}

/* ════════════════════════════════════════
   BITI QUIZ — Croatian "to be" conjugation
════════════════════════════════════════ */

const BITI_PAIRS = [
  { hr: 'sam', de: 'ich bin',    pronoun_hr: 'Ja',       pronoun_de: '= Ich'   },
  { hr: 'si',  de: 'du bist',   pronoun_hr: 'Ti',       pronoun_de: '= Du'    },
  { hr: 'je',  de: 'er/sie ist',pronoun_hr: 'On / Ona', pronoun_de: '= Er/Sie'},
  { hr: 'smo', de: 'wir sind',  pronoun_hr: 'Mi',       pronoun_de: '= Wir'   },
  { hr: 'ste', de: 'ihr seid',  pronoun_hr: 'Vi',       pronoun_de: '= Ihr'   },
  { hr: 'su',  de: 'sie sind',  pronoun_hr: 'Oni / One',pronoun_de: '= Sie'   },
];

/* ─── Fälle-Quiz (Padeži): Akkusativ & Lokativ mit Lückensätzen ───
   Gleiche Screen-Mechanik wie das Biti-Quiz, aber mit Satz-Lücke,
   deutscher Übersetzung und Endungs-Distraktoren desselben Worts. */
const PADEZI_QUESTIONS = [
  // Akkusativ (wen/was? — nach vidjeti, imati, piti, jesti, čitati)
  { hr: 'psa',    gap: 'Vidim ___.',          de: 'Ich sehe den Hund.',          hint: 'der Hund = pas',         full: 'Vidim psa.',          distractors: ['pas', 'psu'] },
  { hr: 'mačku',  gap: 'Vidim ___.',          de: 'Ich sehe die Katze.',         hint: 'die Katze = mačka',      full: 'Vidim mačku.',        distractors: ['mačka', 'mački'] },
  { hr: 'brata',  gap: 'Imam ___.',           de: 'Ich habe einen Bruder.',      hint: 'der Bruder = brat',      full: 'Imam brata.',         distractors: ['brat', 'bratu'] },
  { hr: 'sestru', gap: 'Imam ___.',           de: 'Ich habe eine Schwester.',    hint: 'die Schwester = sestra', full: 'Imam sestru.',        distractors: ['sestra', 'sestri'] },
  { hr: 'vodu',   gap: 'Pijem ___.',          de: 'Ich trinke Wasser.',          hint: 'das Wasser = voda',      full: 'Pijem vodu.',         distractors: ['voda', 'vodi'] },
  { hr: 'jabuku', gap: 'Jedem ___.',          de: 'Ich esse einen Apfel.',       hint: 'der Apfel = jabuka',     full: 'Jedem jabuku.',       distractors: ['jabuka', 'jabuci'] },
  { hr: 'knjigu', gap: 'Čitam ___.',          de: 'Ich lese ein Buch.',          hint: 'das Buch = knjiga',      full: 'Čitam knjigu.',       distractors: ['knjiga', 'knjizi'] },
  { hr: 'loptu',  gap: 'Imam ___.',           de: 'Ich habe einen Ball.',        hint: 'der Ball = lopta',       full: 'Imam loptu.',         distractors: ['lopta', 'lopti'] },
  // Lokativ (wo? — nach u/na)
  { hr: 'školi',  gap: 'Mi smo u ___.',       de: 'Wir sind in der Schule.',     hint: 'die Schule = škola',     full: 'Mi smo u školi.',     distractors: ['škola', 'školu'] },
  { hr: 'kući',   gap: 'Ja sam u ___.',       de: 'Ich bin im Haus.',            hint: 'das Haus = kuća',        full: 'Ja sam u kući.',      distractors: ['kuća', 'kuću'] },
  { hr: 'stolu',  gap: 'Knjiga je na ___.',   de: 'Das Buch ist auf dem Tisch.', hint: 'der Tisch = stol',       full: 'Knjiga je na stolu.', distractors: ['stol', 'stola'] },
  { hr: 'moru',   gap: 'Mi smo na ___.',      de: 'Wir sind am Meer.',           hint: 'das Meer = more',        full: 'Mi smo na moru.',     distractors: ['more', 'mora'] },
];

function startBitiGame() {
  _trackGamePlayed('biti');
  const questions = shuffle([...BITI_PAIRS]);
  state.biti = { questions, index: 0, correct: 0, xpGained: 0, mode: 'biti' };
  _setBitiScreenMode('biti');
  renderBitiQuestion();
  navigate('biti');
}

function startPadeziGame() {
  _trackGamePlayed('padezi');
  const questions = shuffle([...PADEZI_QUESTIONS]).slice(0, 8);
  state.biti = { questions, index: 0, correct: 0, xpGained: 0, mode: 'padezi' };
  _setBitiScreenMode('padezi');
  renderBitiQuestion();
  navigate('biti');
}

function _setBitiScreenMode(mode) {
  const screen = document.getElementById('screen-biti');
  screen.classList.toggle('padezi-mode', mode === 'padezi');
  document.getElementById('biti-label').innerHTML = mode === 'padezi'
    ? 'Welche Endung passt in den Satz?'
    : 'Welche Form von <em>biti</em> (sein) passt?';
}

function renderBitiQuestion() {
  const { questions, index } = state.biti;
  if (index >= questions.length) {
    _finishBitiGame();
    return;
  }

  const q = questions[index];
  const total = questions.length;
  document.getElementById('biti-progress-fill').style.width = (index / total * 100) + '%';
  document.getElementById('biti-counter').textContent = `${index}/${total}`;
  // Padeži-Fragen zeigen Lückensatz + Übersetzung, Biti-Fragen das Pronomen
  document.getElementById('biti-pronoun-hr').textContent = q.gap || q.pronoun_hr;
  document.getElementById('biti-pronoun-de').textContent = q.de && q.gap ? q.de : q.pronoun_de;
  document.getElementById('biti-pronoun-hr-sm').textContent = q.hint || q.pronoun_hr;
  document.getElementById('biti-feedback').className = 'biti-feedback hidden';

  // Distraktoren: bei Padeži die falschen Endungen desselben Worts,
  // beim Biti-Quiz die übrigen Konjugationsformen
  const others = q.distractors
    ? q.distractors.map(d => ({ hr: d }))
    : shuffle(BITI_PAIRS.filter(p => p.hr !== q.hr)).slice(0, 3);
  const choices = shuffle([q, ...others]);

  const choicesEl = document.getElementById('biti-choices');
  choicesEl.innerHTML = '';
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn biti-choice-btn';
    btn.textContent = choice.hr;
    btn.addEventListener('click', () => handleBitiChoice(btn, choice, q));
    choicesEl.appendChild(btn);
  });
}

function handleBitiChoice(btn, chosen, correct) {
  const isCorrect = chosen.hr === correct.hr;
  const cfg = ageConfig(state.profile?.age);
  const xp = isCorrect ? cfg.xpCorrect : cfg.xpWrong;
  state.biti.xpGained += xp;
  if (isCorrect) state.biti.correct++;

  if (isCorrect) {
    btn.classList.add('correct');
    showConfetti(8);
    SoundManager.correct();
    showFloatingXP(xp, btn);
  } else {
    btn.classList.add('wrong');
    SoundManager.wrong();
    document.querySelectorAll('#biti-choices .biti-choice-btn').forEach(b => {
      if (b.textContent === correct.hr) b.classList.add('correct');
    });
    state.biti.questions.push(correct);
  }

  document.querySelectorAll('#biti-choices .biti-choice-btn').forEach(b => b.classList.add('disabled'));

  const fullForm = correct.full || `${correct.pronoun_hr} ${correct.hr}`;
  // Fälle-Quiz: den vollständigen Satz vorlesen (vorgenerierte Satz-MP3)
  if (correct.full && AudioManager.enabled) {
    setTimeout(() => AudioManager.speakText(correct.full, 'hr'), 300);
  }
  const feedbackEl = document.getElementById('biti-feedback');
  feedbackEl.className = `biti-feedback ${isCorrect ? 'correct' : 'wrong'}`;
  document.getElementById('biti-feedback-text').textContent = isCorrect
    ? `✓ ${fullForm} — richtig!`
    : `Nicht ganz — es heißt „${fullForm}"`;
  document.getElementById('biti-full-form').textContent = `${fullForm} = ${correct.de}`;

  if (isCorrect) {
    state.biti.index++;
    setTimeout(renderBitiQuestion, 1500);
  }
  // Wrong answer: 'Weiter' button visible via biti-next click handler
}

function _finishBitiGame() {
  const bt = state.biti;
  if (state.profile) {
    const oldXp = state.profile.xp || 0;
    const oldLevel = getLevel(oldXp);
    state.profile.xp = oldXp + bt.xpGained;
    checkXPMilestone(oldXp, state.profile.xp);
    const newLevel = getLevel(state.profile.xp);
    const newBadges = checkAndAwardBadges(state.profile);
    saveProfile();
    if (newLevel > oldLevel) setTimeout(() => showLevelUpOverlay(oldLevel, newLevel), 600);
    if (newBadges.length) setTimeout(() => showNewBadgesSequentially(newBadges), newLevel > oldLevel ? 4000 : 600);
  }
  const pct = bt.questions.length ? bt.correct / bt.questions.length : 0;
  if (pct >= 0.7) showConfetti(pct >= 0.9 ? 40 : 20);
  const mode = bt.mode;
  setTimeout(() => showGameResult({
    correct: bt.correct,
    total: bt.questions.length,
    xpGained: bt.xpGained,
    onContinue: () => mode === 'padezi' ? startPadeziGame() : startBitiGame(),
  }), 400);
}

/* ════════════════════════════════════════
   SENTENCE PUZZLE — tap tiles to build Croatian sentence
════════════════════════════════════════ */

const PUZZLE_SENTENCES = [
  { de: 'Ich bin ein Kind.',           hr: ['Ja', 'sam', 'dijete.'],              cats: ['Hallo Kroatien', 'Biti'] },
  { de: 'Das ist ein Hund.',           hr: ['To', 'je', 'pas.'],                  cats: ['Tiere'] },
  { de: 'Die Katze ist klein.',        hr: ['Mačka', 'je', 'mala.'],              cats: ['Tiere'] },
  { de: 'Ich habe einen Bruder.',      hr: ['Imam', 'brata.'],                    cats: ['Familie'] },
  { de: 'Wir sind zu Hause.',          hr: ['Mi', 'smo', 'kod', 'kuće.'],         cats: ['Zu Hause', 'Biti'] },
  { de: 'Das ist ein roter Ball.',     hr: ['To', 'je', 'crvena', 'lopta.'],      cats: ['Farben', 'Freizeit'] },
  { de: 'Ich trinke Wasser.',          hr: ['Ja', 'pijem', 'vodu.'],              cats: ['Essen'] },
  { de: 'Das Buch liegt auf dem Tisch.', hr: ['Knjiga', 'je', 'na', 'stolu.'],   cats: ['Schule'] },
  { de: 'Ich liebe dich.',             hr: ['Volim', 'te.'],                      cats: ['Gefühle', 'Familie'] },
  { de: 'Er ist mein Freund.',         hr: ['On', 'je', 'moj', 'prijatelj.'],     cats: ['Hallo Kroatien', 'Familie'] },
  { de: 'Wir gehen in die Schule.',    hr: ['Idemo', 'u', 'školu.'],              cats: ['Schule'] },
  { de: 'Die Sonne scheint.',          hr: ['Sunce', 'sija.'],                    cats: ['Natur', 'Wetter'] },
  { de: 'Ich esse einen Apfel.',       hr: ['Ja', 'jedem', 'jabuku.'],            cats: ['Essen'] },
  { de: 'Das Wasser ist kalt.',        hr: ['Voda', 'je', 'hladna.'],             cats: ['Essen', 'Natur'] },
  { de: 'Sie ist meine Mutter.',       hr: ['Ona', 'je', 'moja', 'mama.'],        cats: ['Familie'] },
  { de: 'Ich sehe einen Vogel.',       hr: ['Vidim', 'pticu.'],                   cats: ['Tiere', 'Natur'] },
  { de: 'Der Himmel ist blau.',        hr: ['Nebo', 'je', 'plavo.'],              cats: ['Natur', 'Farben'] },
  { de: 'Er hat eine Schwester.',      hr: ['On', 'ima', 'sestru.'],              cats: ['Familie'] },
  { de: 'Das Kind spielt.',            hr: ['Dijete', 'se', 'igra.'],             cats: ['Freizeit'] },
  { de: 'Ich bin müde.',               hr: ['Ja', 'sam', 'umoran.'],              cats: ['Gefühle', 'Biti'] },
  { de: 'Ich bin glücklich.',          hr: ['Ja', 'sam', 'sretan.'],              cats: ['Gefühle', 'Biti'] },
  // Tiere
  { de: 'Das Pferd ist groß.',         hr: ['Konj', 'je', 'velik.'],              cats: ['Tiere'] },
  { de: 'Der Fisch schwimmt.',         hr: ['Riba', 'pliva.'],                    cats: ['Tiere', 'Natur'] },
  { de: 'Die Ente ist gelb.',          hr: ['Patka', 'je', 'žuta.'],              cats: ['Tiere', 'Farben'] },
  { de: 'Der Hund schläft.',           hr: ['Pas', 'spava.'],                     cats: ['Tiere'] },
  { de: 'Die Katze trinkt Milch.',     hr: ['Mačka', 'pije', 'mlijeko.'],        cats: ['Tiere', 'Essen'] },
  // Essen & Trinken
  { de: 'Das Brot ist lecker.',        hr: ['Kruh', 'je', 'ukusan.'],             cats: ['Essen'] },
  { de: 'Ich esse einen Kuchen.',      hr: ['Ja', 'jedem', 'kolač.'],             cats: ['Essen'] },
  { de: 'Das Eis ist kalt.',           hr: ['Sladoled', 'je', 'hladan.'],         cats: ['Essen'] },
  { de: 'Wir essen Pizza.',            hr: ['Mi', 'jedemo', 'pizzu.'],            cats: ['Essen'] },
  // Farben
  { de: 'Das Gras ist grün.',          hr: ['Trava', 'je', 'zelena.'],            cats: ['Farben', 'Natur'] },
  { de: 'Das Hemd ist blau.',          hr: ['Majica', 'je', 'plava.'],            cats: ['Farben'] },
  { de: 'Die Rose ist rot.',           hr: ['Ruža', 'je', 'crvena.'],             cats: ['Farben', 'Natur'] },
  // Schule
  { de: 'Ich lerne Kroatisch.',        hr: ['Ja', 'učim', 'hrvatski.'],           cats: ['Schule'] },
  { de: 'Das Heft ist auf dem Tisch.', hr: ['Bilježnica', 'je', 'na', 'stolu.'], cats: ['Schule'] },
  { de: 'Der Lehrer ist nett.',        hr: ['Učitelj', 'je', 'ljubazan.'],        cats: ['Schule'] },
  // Familie
  { de: 'Mein Vater ist groß.',        hr: ['Moj', 'tata', 'je', 'visok.'],       cats: ['Familie'] },
  { de: 'Wir haben einen Hund.',       hr: ['Imamo', 'psa.'],                     cats: ['Familie', 'Tiere'] },
  { de: 'Meine Oma kocht.',            hr: ['Moja', 'baka', 'kuha.'],             cats: ['Familie'] },
  // Zu Hause
  { de: 'Das Zimmer ist groß.',        hr: ['Soba', 'je', 'velika.'],             cats: ['Zu Hause'] },
  { de: 'Ich schlafe im Bett.',        hr: ['Ja', 'spavam', 'u', 'krevetu.'],     cats: ['Zu Hause'] },
  { de: 'Die Tür ist offen.',          hr: ['Vrata', 'su', 'otvorena.'],          cats: ['Zu Hause'] },
  // Natur & Wetter
  { de: 'Es regnet heute.',            hr: ['Danas', 'pada', 'kiša.'],            cats: ['Natur', 'Wetter'] },
  { de: 'Der Wind ist stark.',         hr: ['Vjetar', 'je', 'jak.'],              cats: ['Natur', 'Wetter'] },
  { de: 'Der Baum ist hoch.',          hr: ['Drvo', 'je', 'visoko.'],             cats: ['Natur'] },
  // Freizeit
  { de: 'Ich spiele Fußball.',         hr: ['Ja', 'igram', 'nogomet.'],           cats: ['Freizeit'] },
  { de: 'Wir schwimmen im Meer.',      hr: ['Mi', 'plivamo', 'u', 'moru.'],       cats: ['Freizeit', 'Natur'] },
  { de: 'Das Spiel macht Spaß.',       hr: ['Igra', 'je', 'zabavna.'],            cats: ['Freizeit'] },
  // Gefühle & Hallo Kroatien
  { de: 'Ich bin traurig.',            hr: ['Ja', 'sam', 'tužan.'],               cats: ['Gefühle', 'Biti'] },
  { de: 'Wie heißt du?',              hr: ['Kako', 'se', 'zoveš?'],              cats: ['Hallo Kroatien'] },
  { de: 'Ich heiße Mia.',             hr: ['Ja', 'se', 'zovem', 'Mia.'],        cats: ['Hallo Kroatien'] },
];

function startPuzzleGame(catId) {
  _trackGamePlayed('puzzle');
  let pool = catId
    ? PUZZLE_SENTENCES.filter(s => s.cats.includes(catId))
    : PUZZLE_SENTENCES;
  if (pool.length < 4) pool = PUZZLE_SENTENCES;
  const sentences = shuffle([...pool]).slice(0, 8);
  state.puzzle = { sentences, index: 0, correct: 0, xpGained: 0 };
  renderPuzzleQuestion();
  navigate('puzzle');
}

function renderPuzzleQuestion() {
  const { sentences, index } = state.puzzle;
  if (index >= sentences.length) {
    _finishPuzzleGame();
    return;
  }

  const q = sentences[index];
  const total = sentences.length;
  document.getElementById('puzzle-progress-fill').style.width = (index / total * 100) + '%';
  document.getElementById('puzzle-counter').textContent = `${index}/${total}`;
  document.getElementById('puzzle-de-sentence').textContent = q.de;
  document.getElementById('puzzle-feedback').className = 'puzzle-feedback hidden';
  document.getElementById('puzzle-answer-area').innerHTML = '';

  const tilesEl = document.getElementById('puzzle-tiles');
  tilesEl.innerHTML = '';
  shuffle([...q.hr]).forEach(word => {
    tilesEl.appendChild(_makePuzzleTile(word));
  });
}

function _makePuzzleTile(word) {
  const tile = document.createElement('button');
  tile.className = 'puzzle-tile';
  tile.textContent = word;
  tile.onclick = () => _puzzleMoveToAnswer(tile);
  return tile;
}

function _puzzleMoveToAnswer(tile) {
  if (tile.classList.contains('disabled')) return;
  document.getElementById('puzzle-answer-area').appendChild(tile);
  tile.onclick = () => _puzzleMoveToPool(tile);
  _puzzleCheckComplete();
}

function _puzzleMoveToPool(tile) {
  if (tile.classList.contains('disabled')) return;
  document.getElementById('puzzle-tiles').appendChild(tile);
  tile.onclick = () => _puzzleMoveToAnswer(tile);
}

function _puzzleCheckComplete() {
  if (document.getElementById('puzzle-tiles').children.length > 0) return;
  _puzzleCheck();
}

function _puzzleCheck() {
  const q = state.puzzle.sentences[state.puzzle.index];
  const placed = Array.from(
    document.getElementById('puzzle-answer-area').querySelectorAll('.puzzle-tile')
  ).map(t => t.textContent);
  const isCorrect = JSON.stringify(placed) === JSON.stringify(q.hr);

  const cfg = ageConfig(state.profile?.age);
  const xp = isCorrect ? cfg.xpCorrect * 2 : cfg.xpWrong;
  state.puzzle.xpGained += xp;
  if (isCorrect) state.puzzle.correct++;

  // Lock all tiles
  document.querySelectorAll('#puzzle-answer-area .puzzle-tile, #puzzle-tiles .puzzle-tile').forEach(t => {
    t.classList.add(isCorrect ? 'correct' : 'wrong');
    t.classList.add('disabled');
    t.onclick = null;
  });

  const feedbackEl = document.getElementById('puzzle-feedback');
  feedbackEl.className = `puzzle-feedback ${isCorrect ? 'correct' : 'wrong'}`;
  document.getElementById('puzzle-feedback-icon').textContent = isCorrect ? '✓' : '❌';
  document.getElementById('puzzle-feedback-text').textContent = isCorrect
    ? `Super! ${q.hr.join(' ')} 🎉`
    : `Richtig wäre: ${q.hr.join(' ')}`;

  if (isCorrect) {
    showConfetti(12);
    SoundManager.correct();
    showFloatingXP(xp, document.getElementById('puzzle-answer-area'));
    if (AudioManager.enabled) setTimeout(() => AudioManager.speakText(q.hr.join(' '), 'hr'), 400);
    state.puzzle.index++;
    setTimeout(renderPuzzleQuestion, 1900);
  } else {
    SoundManager.wrong();
    // Play the correct sentence so the child hears it
    if (AudioManager.enabled) setTimeout(() => AudioManager.speakText(q.hr.join(' '), 'hr'), 500);
    // Wrong: 'Weiter' button visible via puzzle-next handler
  }
}

function _finishPuzzleGame() {
  const pz = state.puzzle;
  if (state.profile) {
    const oldXp = state.profile.xp || 0;
    const oldLevel = getLevel(oldXp);
    state.profile.xp = oldXp + pz.xpGained;
    checkXPMilestone(oldXp, state.profile.xp);
    const newLevel = getLevel(state.profile.xp);
    const newBadges = checkAndAwardBadges(state.profile);
    saveProfile();
    if (newLevel > oldLevel) setTimeout(() => showLevelUpOverlay(oldLevel, newLevel), 600);
    if (newBadges.length) setTimeout(() => showNewBadgesSequentially(newBadges), newLevel > oldLevel ? 4000 : 600);
  }
  const pct = pz.sentences.length ? pz.correct / pz.sentences.length : 0;
  if (pct >= 0.7) showConfetti(pct >= 0.9 ? 40 : 20);
  const catId = state.currentCategory?.id;
  setTimeout(() => showGameResult({
    correct: pz.correct,
    total: pz.sentences.length,
    xpGained: pz.xpGained,
    onContinue: () => startPuzzleGame(catId),
  }), 400);
}

/* ════════════════════════════════════════
   SPRINT-MODUS — 60 Sekunden, so viele Wörter wie möglich
════════════════════════════════════════ */

const SPRINT_DURATION = 60; // seconds
let _sprintTimer = null;

function startSprintGame(catId) {
  _trackGamePlayed('sprint');
  // Build a large shuffled pool (category words repeated if needed)
  let pool = catId ? wordsForCategory(catId) : wordsForProfile();
  if (!pool.length) { alert('Diese Kategorie hat noch keine Wörter.'); return; }
  // Shuffle and cycle: if pool < 30 words, repeat it
  const target = Math.max(pool.length, 30);
  let extended = [];
  while (extended.length < target) extended = extended.concat(shuffle([...pool]));

  state.sprint = {
    catId,
    words: extended,
    index: 0,
    score: 0,
    timeLeft: SPRINT_DURATION,
    active: false,
  };

  navigate('sprint');
  renderSprintQuestion();
  _startSprintTimer();
}

function _startSprintTimer() {
  clearInterval(_sprintTimer);
  state.sprint.active = true;
  _sprintTimer = setInterval(() => {
    state.sprint.timeLeft--;
    _updateSprintTimer();
    if (state.sprint.timeLeft <= 0) {
      clearInterval(_sprintTimer);
      state.sprint.active = false;
      _endSprint();
    }
  }, 1000);
}

function _updateSprintTimer() {
  const t = state.sprint.timeLeft;
  const fill = document.getElementById('sprint-timer-fill');
  const label = document.getElementById('sprint-timer-label');
  if (fill) fill.style.width = (t / SPRINT_DURATION * 100) + '%';
  if (label) label.textContent = t;
  // Turn red in last 10 seconds
  if (fill) fill.classList.toggle('sprint-timer-danger', t <= 10);
}

function renderSprintQuestion() {
  if (!state.sprint?.active && state.sprint?.timeLeft < SPRINT_DURATION) return;
  const { words, index } = state.sprint;
  const word = words[index % words.length];

  const numeral = getWordNumeral(word);
  document.getElementById('sprint-emoji').textContent = numeral || word.emoji;
  document.getElementById('sprint-word-hr').textContent = word.croatian;
  document.getElementById('sprint-score').textContent = state.sprint.score;

  const feedbackEl = document.getElementById('sprint-feedback');
  feedbackEl.className = 'tap-feedback hidden';

  // 4 choices
  const cfg = ageConfig(state.profile?.age);
  let pool = wordsForCategory(word.category);
  if (pool.length < cfg.tapChoices) pool = [...state.vocabulary];
  const others = shuffle(pool.filter(w => w.id !== word.id)).slice(0, cfg.tapChoices - 1);
  const choices = shuffle([word, ...others]);

  const choicesEl = document.getElementById('sprint-choices');
  choicesEl.innerHTML = '';
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn sprint-choice';
    btn.textContent = choice.german;
    btn.addEventListener('click', () => handleSprintChoice(btn, choice, word));
    choicesEl.appendChild(btn);
  });

  if (AudioManager.enabled && AudioManager.autoPlay) {
    setTimeout(() => AudioManager.speakWord(word, 'hr'), 100);
  }
}

function handleSprintChoice(btn, chosen, correct) {
  if (!state.sprint?.active) return;
  const isCorrect = chosen.id === correct.id;

  document.querySelectorAll('.sprint-choice').forEach(b => b.classList.add('disabled'));

  if (isCorrect) {
    btn.classList.add('correct');
    state.sprint.score++;
    recordWord(correct.id, true);
    SoundManager.correct();
    showFloatingXP(ageConfig(state.profile?.age).xpCorrect, btn);
    document.getElementById('sprint-score').textContent = state.sprint.score;
  } else {
    btn.classList.add('wrong');
    document.querySelectorAll('.sprint-choice').forEach(b => {
      if (b.textContent === correct.german) b.classList.add('correct');
    });
    recordWord(correct.id, false);
    SoundManager.wrong();
  }

  const feedbackEl = document.getElementById('sprint-feedback');
  feedbackEl.className = `tap-feedback ${isCorrect ? 'correct' : 'wrong'}`;
  feedbackEl.textContent = isCorrect
    ? `✓ ${correct.croatian} = ${correct.german}`
    : `${correct.croatian} bedeutet „${correct.german}"`;

  state.sprint.index++;
  setTimeout(renderSprintQuestion, isCorrect ? 800 : 1500);
}

function _endSprint() {
  clearInterval(_sprintTimer);
  const { score, catId } = state.sprint;
  const hsKey = 'cs_sprint_hs_' + (catId || 'all') + '_' + (state.profile?.id || '');
  const prev = parseInt(localStorage.getItem(hsKey) || '0', 10);
  const isNew = score > prev;
  if (isNew) localStorage.setItem(hsKey, String(score));

  // Award XP
  const xpGained = score * ageConfig(state.profile?.age).xpCorrect;
  if (state.profile) {
    const oldXp = state.profile.xp || 0;
    state.profile.xp = oldXp + xpGained;
    checkXPMilestone(oldXp, state.profile.xp);
    const newBadges = checkAndAwardBadges(state.profile);
    saveProfile();
    if (newBadges.length) setTimeout(() => showNewBadgesSequentially(newBadges), 600);
  }

  // Show result overlay
  const overlay = document.getElementById('sprint-result-overlay');
  document.getElementById('sr-emoji').textContent = score >= 15 ? '🏆' : score >= 8 ? '🎉' : '💪';
  document.getElementById('sr-title').textContent = score >= 15 ? 'Fantastisch!' : score >= 8 ? 'Super Sprint!' : 'Gut gemacht!';
  document.getElementById('sr-score').textContent = score;
  document.getElementById('sr-best').textContent = Math.max(score, prev);
  document.getElementById('sr-xp').textContent = `+${xpGained}`;
  const newRecordEl = document.getElementById('sr-new-record');
  if (newRecordEl) newRecordEl.style.display = isNew && score > 0 ? '' : 'none';

  if (score >= 8) showConfetti(score >= 15 ? 50 : 25);
  overlay.classList.remove('hidden');

  document.getElementById('sr-again').onclick = () => {
    overlay.classList.add('hidden');
    startSprintGame(catId);
  };
  document.getElementById('sr-home').onclick = () => {
    overlay.classList.add('hidden');
    renderHome();
    navigate('home');
  };
}

function getSprintHighscore(catId) {
  const hsKey = 'cs_sprint_hs_' + (catId || 'all') + '_' + (state.profile?.id || '');
  return parseInt(localStorage.getItem(hsKey) || '0', 10);
}

/* ════════════════════════════════════════
   AUSSPRACHE-TRAINING — SpeechRecognition
════════════════════════════════════════ */

const _SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let _pronounceRec = null;

/* Normalize string for fuzzy comparison:
   strip diacritics, lowercase, trim whitespace */
function _normalizePronounce(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining accents
    .replace(/[^a-z\s]/g, '')
    .trim();
}

/* Return similarity 0–1 between two normalized strings */
function _pronounceSimilarity(a, b) {
  if (a === b) return 1;
  // Check if one contains the other (handles partial matches)
  if (a.includes(b) || b.includes(a)) return 0.85;
  // Character-level overlap (simple)
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = [...setA].filter(c => setB.has(c)).length;
  return intersection / Math.max(setA.size, setB.size);
}

function startPronounceGame(catId) {
  _trackGamePlayed('pronounce');
  const cfg = ageConfig(state.profile?.age);
  const words = selectSessionWords(catId, cfg.sessionWords);
  if (!words.length) { alert('Diese Kategorie hat noch keine Wörter.'); return; }

  state.pronounce = { catId, words, index: 0, correct: 0, xpGained: 0 };
  navigate('pronounce');
  renderPronounceQuestion();
}

function renderPronounceQuestion() {
  const { words, index } = state.pronounce;
  const total = words.length;

  document.getElementById('pronounce-progress-fill').style.width = (index / total * 100) + '%';
  document.getElementById('pronounce-counter').textContent = `${index}/${total}`;

  if (index >= total) {
    _endPronounceGame();
    return;
  }

  const word = words[index];
  const numeral = getWordNumeral(word);
  document.getElementById('pronounce-emoji').textContent = numeral || word.emoji;
  document.getElementById('pronounce-word-de').textContent = word.german;
  document.getElementById('pronounce-word-hr').textContent = word.croatian;
  document.getElementById('pronounce-result').classList.add('hidden');
  document.getElementById('pronounce-no-speech').classList.add('hidden');

  // Check browser support
  if (!_SpeechRecognition) {
    document.getElementById('pronounce-no-speech').classList.remove('hidden');
    document.getElementById('pronounce-mic-btn').style.display = 'none';
  } else {
    document.getElementById('pronounce-mic-btn').style.display = '';
    document.getElementById('pronounce-mic-btn').classList.remove('listening');
  }

  // Listen button
  const listenBtn = document.getElementById('pronounce-listen-btn');
  listenBtn.onclick = () => {
    AudioManager.unlock();
    AudioManager.speakWord(word, 'hr', listenBtn);
  };

  // Mic button
  const micBtn = document.getElementById('pronounce-mic-btn');
  micBtn.onclick = () => _startListening(word);
}

function _startListening(word) {
  if (!_SpeechRecognition) return;

  // Stop any ongoing recognition
  if (_pronounceRec) { try { _pronounceRec.stop(); } catch (_) {} }

  _pronounceRec = new _SpeechRecognition();
  _pronounceRec.lang = 'hr-HR';
  _pronounceRec.interimResults = false;
  _pronounceRec.maxAlternatives = 5;

  const micBtn = document.getElementById('pronounce-mic-btn');
  micBtn.classList.add('listening');
  document.getElementById('pronounce-mic-label').textContent = 'Spreche jetzt…';

  _pronounceRec.onresult = (event) => {
    micBtn.classList.remove('listening');
    document.getElementById('pronounce-mic-label').textContent = 'Tippen & sprechen';

    // Collect all alternatives
    const alts = [];
    for (let i = 0; i < event.results[0].length; i++) {
      alts.push(event.results[0][i].transcript);
    }

    const target = _normalizePronounce(word.croatian);
    let bestSim = 0;
    let bestAlt = alts[0] || '';
    alts.forEach(alt => {
      const sim = _pronounceSimilarity(_normalizePronounce(alt), target);
      if (sim > bestSim) { bestSim = sim; bestAlt = alt; }
    });

    _showPronounceResult(word, bestAlt, bestSim);
  };

  _pronounceRec.onerror = (e) => {
    micBtn.classList.remove('listening');
    document.getElementById('pronounce-mic-label').textContent = 'Tippen & sprechen';
    if (e.error === 'no-speech') {
      _showPronounceResult(word, '', 0);
    } else if (e.error === 'not-allowed') {
      document.getElementById('pronounce-no-speech').classList.remove('hidden');
      micBtn.style.display = 'none';
    }
  };

  _pronounceRec.onend = () => {
    micBtn.classList.remove('listening');
    document.getElementById('pronounce-mic-label').textContent = 'Tippen & sprechen';
  };

  _pronounceRec.start();
}

function _showPronounceResult(word, heard, similarity) {
  const isCorrect = similarity >= 0.70;
  const isClose   = similarity >= 0.45 && !isCorrect;

  recordWord(word.id, isCorrect);
  if (isCorrect) {
    state.pronounce.correct++;
    const xp = ageConfig(state.profile?.age).xpCorrect;
    state.pronounce.xpGained += xp;
    SoundManager.correct();
    showConfetti(10);
    showFloatingXP(xp);
  } else {
    SoundManager.wrong();
  }

  const resultEl  = document.getElementById('pronounce-result');
  const iconEl    = document.getElementById('pronounce-result-icon');
  const textEl    = document.getElementById('pronounce-result-text');
  const heardEl   = document.getElementById('pronounce-result-heard');

  iconEl.textContent = isCorrect ? '✓' : isClose ? '~' : '✗';
  iconEl.className = 'pronounce-result-icon ' + (isCorrect ? 'correct' : isClose ? 'close' : 'wrong');

  if (isCorrect) {
    textEl.textContent = 'Super! Richtig ausgesprochen!';
  } else if (isClose) {
    textEl.textContent = `Fast! Richtig ist: „${word.croatian}"`;
  } else if (!heard) {
    textEl.textContent = `Nicht verstanden. Richtig: „${word.croatian}"`;
  } else {
    textEl.textContent = `Richtig wäre: „${word.croatian}"`;
  }

  heardEl.textContent = heard ? `Gehört: „${heard}"` : '';

  resultEl.classList.remove('hidden');

  document.getElementById('pronounce-next-btn').onclick = () => {
    state.pronounce.index++;
    renderPronounceQuestion();
  };

  // Auto-play correct pronunciation after result
  setTimeout(() => AudioManager.speakWord(word, 'hr'), 600);
}

function _endPronounceGame() {
  const pr = state.pronounce;
  if (state.profile) {
    const oldXp = state.profile.xp || 0;
    const oldLevel = getLevel(oldXp);
    state.profile.xp = oldXp + pr.xpGained;
    checkXPMilestone(oldXp, state.profile.xp);
    const newBadges = checkAndAwardBadges(state.profile);
    saveProfile();
    if (getLevel(state.profile.xp) > oldLevel) setTimeout(() => showLevelUpOverlay(oldLevel, getLevel(state.profile.xp)), 600);
    if (newBadges.length) setTimeout(() => showNewBadgesSequentially(newBadges), 600);
  }
  const catId = pr.catId;
  setTimeout(() => showGameResult({
    correct: pr.correct,
    total: pr.words.length,
    xpGained: pr.xpGained,
    onContinue: () => startPronounceGame(catId),
  }), 300);
}

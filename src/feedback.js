/* Cro Swipe — feedback.js: Feedback-Button + Fehler/Idee-Modal */

/* ─── Screens where the feedback button is visible ─── */
const FEEDBACK_SCREENS = new Set([
  'swipe', 'tap', 'match', 'chars', 'chars-guide',
  'satz', 'listen', 'speak', 'biti', 'puzzle', 'sprint', 'pronounce', 'category',
]);

let _feedbackTab    = 'bug';
let _feedbackChipCat = null;

/* ─── Show/hide FAB based on current screen ─── */
function updateFeedbackBtn() {
  const btn = document.getElementById('feedback-btn');
  if (!btn) return;
  btn.classList.toggle('hidden', !FEEDBACK_SCREENS.has(state.currentScreen));
}

/* ─── Build context string from current game state ─── */
function _feedbackContext() {
  const ctx = {
    game_mode: state.currentScreen || '',
    category:  state.currentCategory?.id || '',
    word_id:   null,
    word_de:   '',
    word_hr:   '',
  };

  // Grab current word depending on active game mode
  try {
    if (state.currentScreen === 'swipe' && state.swipe?.words?.length) {
      const w = state.swipe.words[state.swipe.index];
      if (w) { ctx.word_id = w.id; ctx.word_de = w.german; ctx.word_hr = w.croatian; }
    } else if (state.currentScreen === 'tap' && state.tap?.words?.length) {
      const w = state.tap.words[state.tap.index];
      if (w) { ctx.word_id = w.id; ctx.word_de = w.german; ctx.word_hr = w.croatian; }
    } else if (state.currentScreen === 'listen' && state.listen?.words?.length) {
      const w = state.listen.words[state.listen.index];
      if (w) { ctx.word_id = w.id; ctx.word_de = w.german; ctx.word_hr = w.croatian; }
    } else if (state.currentScreen === 'speak' && state.speak?.words?.length) {
      const w = state.speak.words[state.speak.index];
      if (w) { ctx.word_id = w.id; ctx.word_de = w.german; ctx.word_hr = w.croatian; }
    }
  } catch (_) {}

  return ctx;
}

/* ─── Open modal ─── */
function openFeedbackModal() {
  _feedbackTab = 'bug';
  _feedbackChipCat = null;

  // Reset UI
  document.getElementById('feedback-panel-bug').classList.remove('hidden');
  document.getElementById('feedback-panel-idea').classList.add('hidden');
  document.getElementById('tab-bug').classList.add('active');
  document.getElementById('tab-idea').classList.remove('active');
  document.getElementById('feedback-bug-text').value = '';
  document.getElementById('feedback-idea-text').value = '';
  document.getElementById('feedback-error').classList.add('hidden');
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));

  // Show current word as context
  const ctx = _feedbackContext();
  const infoEl = document.getElementById('feedback-context-info');
  if (ctx.word_de && ctx.word_hr) {
    infoEl.textContent = `Aktuelles Wort: ${ctx.word_hr} = ${ctx.word_de}`;
    infoEl.classList.remove('hidden');
  } else if (ctx.category) {
    infoEl.textContent = `Kategorie: ${ctx.category}`;
    infoEl.classList.remove('hidden');
  } else {
    infoEl.classList.add('hidden');
  }

  document.getElementById('modal-feedback').classList.remove('hidden');
}

function closeFeedbackModal() {
  document.getElementById('modal-feedback').classList.add('hidden');
}

/* ─── Submit ─── */
async function submitFeedback() {
  const errorEl = document.getElementById('feedback-error');
  errorEl.classList.add('hidden');

  const isBug = _feedbackTab === 'bug';
  const message = isBug
    ? document.getElementById('feedback-bug-text').value.trim()
    : document.getElementById('feedback-idea-text').value.trim();

  if (isBug && !_feedbackChipCat && !message) {
    errorEl.textContent = 'Bitte wähle eine Fehler-Kategorie oder gib eine Beschreibung ein.';
    errorEl.classList.remove('hidden');
    return;
  }
  if (!isBug && !message) {
    errorEl.textContent = 'Bitte beschreibe deine Idee.';
    errorEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('btn-feedback-send');
  btn.disabled = true;

  try {
    await api('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        type:       isBug ? 'bug' : 'idea',
        category:   _feedbackChipCat || '',
        message,
        context:    _feedbackContext(),
        profile_id: state.profile?.id || '',
      }),
    });
    closeFeedbackModal();
    // Brief success toast
    const toast = document.createElement('div');
    toast.className = 'unlock-toast';
    toast.textContent = '✓ Danke für dein Feedback!';
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('unlock-toast-in'), 10);
    setTimeout(() => {
      toast.classList.add('unlock-toast-out');
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  } catch (e) {
    errorEl.textContent = e.message || 'Fehler beim Senden.';
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
}

/* ─── Wire feedback events (called from wireEvents in app.js) ─── */
function wireFeedbackEvents() {
  // FAB button
  document.getElementById('feedback-btn').addEventListener('click', openFeedbackModal);

  // Tab switching
  document.querySelectorAll('.feedback-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _feedbackTab = tab.dataset.tab;
      document.querySelectorAll('.feedback-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('feedback-panel-bug').classList.toggle('hidden', _feedbackTab !== 'bug');
      document.getElementById('feedback-panel-idea').classList.toggle('hidden', _feedbackTab !== 'idea');
    });
  });

  // Chip selection (single select)
  document.getElementById('feedback-chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    if (_feedbackChipCat === chip.dataset.cat) {
      _feedbackChipCat = null; // deselect
    } else {
      chip.classList.add('selected');
      _feedbackChipCat = chip.dataset.cat;
    }
  });

  // Cancel + send
  document.getElementById('btn-feedback-cancel').addEventListener('click', closeFeedbackModal);
  document.getElementById('btn-feedback-send').addEventListener('click', submitFeedback);

  // Close on backdrop click
  document.getElementById('modal-feedback').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeFeedbackModal();
  });
}

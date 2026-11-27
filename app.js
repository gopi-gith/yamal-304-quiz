/* ============================================================
   YAMAL 304 — The Lamine Yamal Quiz
   A normal, phone-friendly trivia game. No build step.
   Facts checked 2027.
   ============================================================ */
(() => {
  'use strict';

  /* ---------------- questions ----------------
     level 1 = easy, 2 = medium, 3 = hard.
     Every game draws 4 easy + 4 medium + 2 tough.
     Explanations are shown after each answer.
  */
  const QUESTIONS = Array.isArray(window.YAMAL_QUESTIONS) ? window.YAMAL_QUESTIONS : [];

  /* ---------------- state ---------------- */
  const QUIZ_SIZE = 10;
  const TIME_PER_QUESTION = 60;
  const BEST_KEY = 'yamal304-best-v2';
  const SOUND_KEY = 'yamal304-sound';
  const SAFE_KEY = 'yamal304-safe-zone';

  /* Safe-zone presets. `auto` leaves env(safe-area-inset-*) in charge.
     Manual presets use CSS pixels and switch with the orientation. */
  const SAFE_PRESETS = {
    auto: { label: 'AUTO', portrait: null, landscape: null },
    computer: {
      label: 'COMPUTER',
      portrait: { t: 0, b: 0, l: 0, r: 0 },
      landscape: { t: 0, b: 0, l: 0, r: 0 }
    },
    island: {
      label: 'IPHONE ISLAND',
      portrait: { t: 59, b: 34, l: 0, r: 0 },
      landscape: { t: 0, b: 21, l: 59, r: 59 }
    },
    notch: {
      label: 'IPHONE NOTCH',
      portrait: { t: 47, b: 34, l: 0, r: 0 },
      landscape: { t: 0, b: 21, l: 47, r: 47 }
    },
    android: {
      label: 'ANDROID',
      portrait: { t: 24, b: 16, l: 0, r: 0 },
      landscape: { t: 0, b: 8, l: 0, r: 0 }
    },
    none: {
      label: 'NONE',
      portrait: { t: 0, b: 0, l: 0, r: 0 },
      landscape: { t: 0, b: 0, l: 0, r: 0 }
    }
  };

  const state = {
    deck: [],
    index: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    answers: [],
    answered: false,
    selected: null,
    timerEnd: 0,
    timerId: null,
    timerPausedMs: 0,
    pausedByModal: false,
    safePreset: 'auto',
    safePaused: false,
    phase: 'start',
    soundOn: true,
    best: 0
  };

  /* ---------------- dom ---------------- */
  const $ = (id) => document.getElementById(id);
  const screens = {
    start: $('start'),
    quiz: $('quiz'),
    results: $('results')
  };
  const el = {
    bestStart: $('bestStart'),
    startBtn: $('startBtn'),
    howBtn: $('howBtn'),
    soundBtn: $('soundBtn'),
    shareBtn: $('shareBtn'),
    support: null,
    how: $('how'),
    howCloseBtn: $('howCloseBtn'),
    confirm: $('confirm'),
    confirmLeaveBtn: $('confirmLeaveBtn'),
    confirmStayBtn: $('confirmStayBtn'),
    share: $('share'),
    shareCloseBtn: $('shareCloseBtn'),
    qrBox: $('qrBox'),
    qrUrl: $('qrUrl'),
    copyLinkBtn: $('copyLinkBtn'),
    shareNote: $('shareNote'),
    safe: {
      modal: $('safe'),
      btn: $('safeBtn'),
      btn2: $('safeBtn2'),
      closeBtn: $('safeCloseBtn'),
      grid: $('safeGrid'),
      orientation: $('safeOrientation'),
      top: $('safeTop'),
      bottom: $('safeBottom'),
      left: $('safeLeft'),
      right: $('safeRight'),
      note: $('safeNote')
    },
    toast: $('toast'),
    confetti: $('confetti'),
    quiz: {
      soundBtn: $('soundBtn2'),
      quitBtn: $('quitBtn'),
      category: $('qCategory'),
      number: $('qNumber'),
      score: $('qScore'),
      streak: $('qStreak'),
      progress: $('progress'),
      question: $('questionText'),
      timer: $('timer'),
      timerFill: $('timerFill'),
      timerLabel: $('timerLabel'),
      options: $('options'),
      feedback: $('feedback'),
      fbTitle: $('fbTitle'),
      fbPoints: $('fbPoints'),
      fbText: $('fbText'),
      nextBtn: $('nextBtn'),
      streakPill: $('streakPill')
    },
    results: {
      ring: $('scoreRing'),
      score: $('finalScore'),
      rankTitle: $('rankTitle'),
      rankLine: $('rankLine'),
      accuracy: $('finalShots'),
      streak: $('finalStreak'),
      best: $('finalBest'),
      bestLine: $('bestLine'),
      playAgainBtn: $('playAgainBtn'),
      shareScoreBtn: $('shareScoreBtn'),
      shareBtn: $('resultShareBtn'),
      menuBtn: $('menuBtn'),
      reviewToggle: $('reviewToggle'),
      reviewList: $('reviewList')
    }
  };

  /* ---------------- helpers ---------------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, node]) => {
      if (key === name) node.classList.remove('hidden');
      else node.classList.add('hidden');
    });
    if (name === 'quiz') {
      // keep the user at the top of a new question
      window.scrollTo(0, 0);
    }
  }

  function setSoundUI() {
    const on = state.soundOn;
    if (el.soundBtn) el.soundBtn.textContent = on ? 'SOUND ON' : 'SOUND OFF';
    if (el.quiz.soundBtn) {
      el.quiz.soundBtn.textContent = on ? '♪' : '×';
      el.quiz.soundBtn.setAttribute('aria-label', on ? 'Mute sound' : 'Enable sound');
    }
  }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.toast.classList.remove('show'), 1600);
  }

  function isModalOpen() {
    return !el.how.classList.contains('hidden') ||
      !el.confirm.classList.contains('hidden') ||
      !el.share.classList.contains('hidden') ||
      !el.safe.modal.classList.contains('hidden');
  }

  function anyOverlay() {
    return isModalOpen();
  }

  /* ---------------- sound ---------------- */
  const Sound = (() => {
    let ctx = null;
    let master = null;
    let on = true;

    function init() {
      if (!on) return;
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.2;
      master.connect(ctx.destination);
    }

    function tone(freq, dur, type = 'sine', vol = 0.12, slide = null, when = 0) {
      if (!on) return;
      init();
      if (!ctx) return;
      const t = ctx.currentTime + when;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    function click() { tone(620, 0.04, 'square', 0.03); }
    function start() {
      tone(392, 0.12, 'triangle', 0.1);
      tone(523.25, 0.16, 'triangle', 0.1, null, 0.1);
    }
    function correct() {
      tone(523.25, 0.1, 'triangle', 0.12);
      tone(659.25, 0.1, 'triangle', 0.12, null, 0.08);
      tone(783.99, 0.16, 'triangle', 0.12, null, 0.16);
    }
    function wrong() {
      tone(180, 0.16, 'sawtooth', 0.09, 90);
    }
    function timeout() {
      tone(240, 0.2, 'sine', 0.08, 100);
    }
    function finish() {
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(f, 0.22, 'triangle', 0.09, null, i * 0.09);
      });
    }
    function setOn(v) {
      on = !!v;
      if (master) master.gain.value = on ? 0.2 : 0;
      if (on) init();
    }
    function isOn() { return on; }
    return { click, start, correct, wrong, timeout, finish, setOn, isOn, init };
  })();

  /* ---------------- storage ---------------- */
  function loadStored() {
    const best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    state.best = Number.isFinite(best) ? clamp(best, 0, QUIZ_SIZE) : 0;
    const s = localStorage.getItem(SOUND_KEY);
    state.soundOn = s === null ? true : s !== 'off';
    Sound.setOn(state.soundOn);
    setSoundUI();
    updateBestUI();
    loadSafeZone();
  }

  function updateBestUI() {
    el.bestStart.textContent = state.best > 0 ? `${state.best}/${QUIZ_SIZE}` : '—';
  }

  /* ---------------- safe zone ---------------- */
  let autoPick = 'env';

  function isLandscape() {
    return window.matchMedia('(orientation: landscape)').matches;
  }

  function readInset(key) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(`--safe-${key}`);
    const n = parseFloat(raw);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

  function clearSafeOverrides(root) {
    ['t', 'b', 'l', 'r'].forEach((key) => root.style.removeProperty(`--safe-${key}`));
  }

  // True when the browser reports a real notch / home-bar inset.
  function hasRealInsets() {
    return ['t', 'b', 'l', 'r'].some((key) => readInset(key) > 0);
  }

  // Auto mode: if the browser exposes no safe area, guess from the device.
  function detectAutoPreset() {
    const ua = navigator.userAgent || '';
    const touch = navigator.maxTouchPoints || 0;
    const isIPhone = /iPhone|iPod/i.test(ua);
    const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && touch > 1);
    const isAndroid = /Android/i.test(ua);
    const shortSide = Math.min(window.screen.width, window.screen.height);
    const longSide = Math.max(window.screen.width, window.screen.height);
    const tall = shortSide > 0 ? longSide / shortSide : 1;

    if (isIPhone) {
      // Modern Face ID iPhones are noticeably taller than the home-button SE.
      return tall >= 1.95 ? 'island' : 'none';
    }
    if (isIPad) return 'computer';
    if (isAndroid) return tall >= 1.5 ? 'android' : 'computer';
    return 'computer';
  }

  function syncSafeUI() {
    const landscape = isLandscape();
    document.querySelectorAll('.safe-opt').forEach((btn) => {
      btn.setAttribute('aria-checked', String(btn.dataset.preset === state.safePreset));
    });
    el.safe.orientation.textContent = landscape ? 'LANDSCAPE' : 'PORTRAIT';
    el.safe.top.textContent = readInset('t');
    el.safe.bottom.textContent = readInset('b');
    el.safe.left.textContent = readInset('l');
    el.safe.right.textContent = readInset('r');
    if (state.safePreset === 'auto') {
      el.safe.note.innerHTML = autoPick === 'env'
        ? 'Auto is using this screen\'s real safe area. Values in pixels, updated live.'
        : `Auto picked <b>${SAFE_PRESETS[autoPick].label}</b> for this screen. Tap any preset to override it.`;
    } else {
      el.safe.note.innerHTML = 'Applied instantly and saved on this device. Values in pixels, updated live.';
    }
  }

  function applySafeZone(preset, persist) {
    const id = SAFE_PRESETS[preset] ? preset : 'auto';
    state.safePreset = id;
    const root = document.documentElement;

    // Drop any old overrides first so env(safe-area-inset-*) can be measured.
    clearSafeOverrides(root);

    let applied = id;
    if (id === 'auto') {
      if (hasRealInsets()) {
        applied = 'env';
        autoPick = 'env';
      } else {
        autoPick = detectAutoPreset();
        applied = autoPick;
      }
    } else {
      autoPick = id;
    }

    const cfg = SAFE_PRESETS[applied];
    const values = cfg ? (isLandscape() ? cfg.landscape : cfg.portrait) : null;
    if (values) {
      root.style.setProperty('--safe-t', `${values.t}px`);
      root.style.setProperty('--safe-b', `${values.b}px`);
      root.style.setProperty('--safe-l', `${values.l}px`);
      root.style.setProperty('--safe-r', `${values.r}px`);
    }

    if (persist) {
      try { localStorage.setItem(SAFE_KEY, id); } catch (e) {}
    }
    syncSafeUI();
  }

  function loadSafeZone() {
    let id = 'auto';
    try {
      const saved = localStorage.getItem(SAFE_KEY);
      if (saved && SAFE_PRESETS[saved]) id = saved;
    } catch (e) {}
    applySafeZone(id, false);
  }

  function handleOrientation() {
    applySafeZone(state.safePreset, false);
  }

  /* ---------------- deck ---------------- */
  function buildDeck() {
    const byLevel = { 1: [], 2: [], 3: [] };
    QUESTIONS.forEach((q) => byLevel[q.level].push(q));
    const chosen = [];
    const counts = { 1: 4, 2: 4, 3: 2 };
    [1, 2, 3].forEach((level) => {
      chosen.push(...shuffle(byLevel[level]).slice(0, counts[level]));
    });
    return shuffle(chosen).map((q) => {
      const correctText = q.options[q.answer];
      const options = shuffle(q.options);
      return {
        ...q,
        options,
        correct: options.indexOf(correctText)
      };
    });
  }

  /* ---------------- start ---------------- */
  function showStart() {
    stopTimer();
    state.phase = 'start';
    showScreen('start');
    updateBestUI();
    closeAllModals();
  }

  function startGame() {
    Sound.init();
    Sound.start();
    state.deck = buildDeck();
    state.index = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.answers = [];
    state.answered = false;
    state.selected = null;
    state.phase = 'quiz';
    closeAllModals();
    buildProgressSegments();
    showScreen('quiz');
    renderQuestion();
  }

  function buildProgressSegments() {
    el.quiz.progress.innerHTML = '';
    for (let i = 0; i < QUIZ_SIZE; i++) {
      const s = document.createElement('i');
      el.quiz.progress.appendChild(s);
    }
  }

  function updateProgress() {
    const segs = el.quiz.progress.children;
    for (let i = 0; i < QUIZ_SIZE; i++) {
      const seg = segs[i];
      if (!seg) continue;
      seg.className = '';
      if (i < state.answers.length) {
        seg.classList.add(state.answers[i].correct ? 'done' : 'bad');
      } else if (i === state.index && !state.answered) {
        seg.classList.add('current');
      }
    }
  }

  /* ---------------- timer ---------------- */
  function startTimer() {
    stopTimer();
    state.timerEnd = performance.now() + TIME_PER_QUESTION * 1000;
    state.timerPausedMs = 0;
    state.timerId = setInterval(tickTimer, 100);
    tickTimer();
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function pauseTimer() {
    if (state.answered || state.phase !== 'quiz' || !state.timerId) return;
    state.timerPausedMs = Math.max(0, state.timerEnd - performance.now());
    stopTimer();
  }

  function resumeTimer() {
    if (state.answered || state.phase !== 'quiz' || state.timerPausedMs <= 0) return;
    state.timerEnd = performance.now() + state.timerPausedMs;
    state.timerPausedMs = 0;
    state.timerId = setInterval(tickTimer, 100);
    tickTimer();
  }

  function tickTimer() {
    if (state.answered || state.phase !== 'quiz') return;
    const remaining = Math.max(0, state.timerEnd - performance.now());
    const pct = (remaining / (TIME_PER_QUESTION * 1000)) * 100;
    el.quiz.timerFill.style.width = `${pct}%`;
    el.quiz.timerLabel.textContent = `${Math.ceil(remaining / 1000)}s`;
    el.quiz.timer.classList.toggle('urgent', remaining <= 5000);
    if (remaining <= 0) {
      answer(-1);
    }
  }

  /* ---------------- render ---------------- */
  function renderQuestion() {
    const q = state.deck[state.index];
    if (!q) { finishGame(); return; }
    state.answered = false;
    state.selected = null;

    el.quiz.category.textContent = q.cat;
    el.quiz.number.textContent = String(state.index + 1).padStart(2, '0');
    el.quiz.score.textContent = state.score;
    el.quiz.streak.textContent = state.streak;
    el.quiz.streakPill.textContent = `STREAK ${state.streak}`;
    el.quiz.question.textContent = q.q;
    el.quiz.question.setAttribute('tabindex', '-1');
    el.quiz.options.innerHTML = '';
    el.quiz.feedback.classList.add('hidden');
    el.quiz.timer.classList.remove('urgent');
    el.quiz.timerFill.style.width = '100%';
    el.quiz.timerLabel.textContent = `${TIME_PER_QUESTION}s`;

    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.dataset.index = i;
      btn.innerHTML = `<span class="opt-key">${letters[i]}</span><span>${escapeHtml(text)}</span>`;
      btn.addEventListener('click', () => answer(i));
      el.quiz.options.appendChild(btn);
    });

    updateProgress();
    startTimer();
    requestAnimationFrame(() => el.quiz.question.focus({ preventScroll: true }));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ---------------- answer ---------------- */
  function answer(index) {
    if (state.answered || state.phase !== 'quiz') return;
    state.answered = true;
    state.selected = index;
    stopTimer();
    const q = state.deck[state.index];
    const timedOut = index < 0;
    const correct = !timedOut && index === q.correct;
    const correctText = q.options[q.correct];
    const selectedText = timedOut ? null : q.options[index];

    if (correct) {
      state.score++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      Sound.correct();
      if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
    } else {
      state.streak = 0;
      if (timedOut) Sound.timeout();
      else Sound.wrong();
      if (navigator.vibrate) { try { navigator.vibrate([20, 40, 20]); } catch (e) {} }
    }

    state.answers.push({
      question: q.q,
      selected: selectedText,
      correctText,
      correct,
      timedOut,
      explain: q.explain,
      cat: q.cat
    });

    el.quiz.score.textContent = state.score;
    el.quiz.streak.textContent = state.streak;
    el.quiz.streakPill.textContent = `STREAK ${state.streak}`;
    el.quiz.timerFill.style.width = timedOut ? '0%' : el.quiz.timerFill.style.width;
    if (timedOut) el.quiz.timerLabel.textContent = '0s';
    el.quiz.timer.classList.remove('urgent');

    const buttons = [...el.quiz.options.querySelectorAll('.option')];
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.correct) btn.classList.add('correct');
      else if (!timedOut && i === index) btn.classList.add('wrong');
      else btn.classList.add('dim');
    });

    el.quiz.feedback.classList.remove('hidden');
    el.quiz.feedback.setAttribute('aria-live', 'polite');
    el.quiz.fbTitle.className = 'fb-title ' + (correct ? 'good' : 'bad');
    el.quiz.fbTitle.textContent = correct ? 'CORRECT' : (timedOut ? 'TIME’S UP' : 'NOT QUITE');
    el.quiz.fbPoints.textContent = correct ? '+1 POINT' : '0 POINTS';
    el.quiz.fbText.innerHTML = correct
      ? `${escapeHtml(q.explain)}`
      : `The answer is <b>${escapeHtml(correctText)}</b>. ${escapeHtml(q.explain)}`;
    el.quiz.nextBtn.textContent = state.index + 1 >= QUIZ_SIZE ? 'SEE RESULTS →' : 'NEXT QUESTION →';

    updateProgress();
    requestAnimationFrame(() => el.quiz.nextBtn.focus({ preventScroll: true }));
  }

  function nextQuestion() {
    if (!state.answered || state.phase !== 'quiz') return;
    Sound.click();
    if (state.index + 1 >= QUIZ_SIZE) {
      finishGame();
      return;
    }
    state.index++;
    renderQuestion();
  }

  /* ---------------- results ---------------- */
  function rankFor(score) {
    if (score === 10) return { title: 'LA MASIA LEGEND', line: 'Perfect score. You know the kid from Rocafonda inside out.', gold: true };
    if (score >= 8) return { title: 'FIRST TEAM STAR', line: 'Elite knowledge. A couple of gaps, but the scouting report is strong.', gold: true };
    if (score >= 6) return { title: 'SQUAD PLAYER', line: 'Solid. You know the story — now brush up on the records.', gold: false };
    if (score >= 3) return { title: 'ACADEMY PROSPECT', line: 'Promising. Watch more left-foot highlights and come back stronger.', gold: false };
    return { title: 'ROOKIE', line: 'Everyone starts somewhere. The 304 story is waiting for you.', gold: false };
  }

  function finishGame() {
    stopTimer();
    state.phase = 'results';
    const score = state.score;
    const pct = Math.round((score / QUIZ_SIZE) * 100);
    const bestBefore = state.best;
    const isBest = score > bestBefore;
    if (score > state.best) {
      state.best = score;
      localStorage.setItem(BEST_KEY, String(state.best));
    }
    const rank = rankFor(score);
    el.results.ring.style.setProperty('--p', pct);
    el.results.score.textContent = score;
    el.results.rankTitle.textContent = rank.title;
    el.results.rankTitle.classList.toggle('gold', rank.gold);
    el.results.rankLine.textContent = `${rank.line} You scored ${score} out of ${QUIZ_SIZE} (${pct}%).`;
    el.results.accuracy.textContent = `${pct}%`;
    el.results.streak.textContent = state.bestStreak;
    el.results.best.textContent = state.best;
    el.results.bestLine.innerHTML = isBest
      ? '<b>NEW PERSONAL BEST!</b>'
      : `Personal best: <b>${state.best}/${QUIZ_SIZE}</b>`;
    buildReview();
    el.results.reviewList.classList.add('hidden');
    el.results.reviewToggle.classList.remove('open');
    el.results.reviewToggle.innerHTML = 'REVIEW ANSWERS <span>⌄</span>';
    showScreen('results');
    updateBestUI();
    Sound.finish();
    if (score >= 8) launchConfetti(score === 10 ? 90 : 55);
  }

  function buildReview() {
    el.results.reviewList.innerHTML = '';
    state.answers.forEach((a, i) => {
      const item = document.createElement('div');
      item.className = 'review-item ' + (a.correct ? 'good' : 'bad');
      const yours = a.timedOut ? 'No answer' : a.selected;
      item.innerHTML = `
        <div class="review-q">${i + 1}. ${escapeHtml(a.question)}</div>
        <div class="review-a">${a.correct
          ? `You: <b>${escapeHtml(yours)}</b>`
          : `You: <i>${escapeHtml(yours)}</i> · Correct: <b>${escapeHtml(a.correctText)}</b>`}
        </div>
        <div class="review-explain">${escapeHtml(a.explain)}</div>
      `;
      el.results.reviewList.appendChild(item);
    });
  }

  function toggleReview() {
    const list = el.results.reviewList;
    const open = list.classList.toggle('hidden');
    el.results.reviewToggle.classList.toggle('open', !open);
    el.results.reviewToggle.innerHTML = open ? 'REVIEW ANSWERS <span>⌄</span>' : 'HIDE ANSWERS <span>⌄</span>';
    Sound.click();
  }

  /* ---------------- confetti ---------------- */
  function launchConfetti(count) {
    const colors = ['#ffcf4a', '#223e9c', '#b3153f', '#f4efe2', '#43d17a'];
    el.confetti.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'confetti-piece';
      p.style.left = `${Math.random() * 100}%`;
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.width = `${5 + Math.random() * 6}px`;
      p.style.height = `${8 + Math.random() * 8}px`;
      p.style.animationDelay = `${Math.random() * 0.6}s`;
      p.style.animationDuration = `${2.2 + Math.random() * 2}s`;
      p.style.setProperty('--drift', `${-120 + Math.random() * 240}px`);
      el.confetti.appendChild(p);
    }
    setTimeout(() => { el.confetti.innerHTML = ''; }, 5000);
  }

  /* ---------------- share / QR ---------------- */
  function shareUrl() {
    let url = location.href.split('#')[0].split('?')[0];
    url = url.replace(/index\.html$/, '');
    return url;
  }

  function renderQR(url) {
    if (!url) return;
    if (typeof qrcode !== 'function') {
      el.qrBox.innerHTML = '<span class="qr-note">QR library failed to load. Use the link below.</span>';
      return;
    }
    try {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      el.qrBox.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 3, scalable: true });
    } catch (e) {
      el.qrBox.innerHTML = '<span class="qr-note">Could not build a QR code for this URL.</span>';
    }
  }

  function openShare() {
    const url = shareUrl();
    el.qrUrl.value = url;
    renderQR(url);
    el.shareNote.innerHTML = location.protocol === 'file:'
      ? 'This page is running from a local file. Host it on <b>GitHub Pages</b>, then share the live QR.'
      : 'Point a phone camera at the code, or copy the link. The QR opens this exact quiz.';
    el.share.classList.remove('hidden');
    Sound.click();
  }

  function closeShare() {
    el.share.classList.add('hidden');
  }

  async function copyLink() {
    const text = el.qrUrl.value;
    try {
      await navigator.clipboard.writeText(text);
      toast('LINK COPIED');
    } catch (e) {
      el.qrUrl.select();
      try {
        document.execCommand('copy');
        toast('LINK COPIED');
      } catch (err) {
        toast('COPY FAILED — SELECT THE LINK');
      }
    }
  }

  async function shareScore() {
    const pct = Math.round((state.score / QUIZ_SIZE) * 100);
    const text = `I scored ${state.score}/${QUIZ_SIZE} (${pct}%) on YAMAL 304 — The Lamine Yamal Quiz. Can you beat me?`;
    const url = shareUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'YAMAL 304 — The Lamine Yamal Quiz', text, url });
        return;
      } catch (e) {
        // fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast('SCORE COPIED — SEND IT TO A FRIEND');
    } catch (e) {
      toast('COULD NOT COPY THE SCORE');
    }
  }

  /* ---------------- modals ---------------- */
  function openHow() {
    el.how.classList.remove('hidden');
    Sound.click();
  }
  function closeHow() {
    el.how.classList.add('hidden');
  }
  function openConfirm() {
    if (state.phase !== 'quiz') return;
    state.pausedByModal = true;
    pauseTimer();
    el.confirm.classList.remove('hidden');
    Sound.click();
  }
  function closeConfirm(resume) {
    el.confirm.classList.add('hidden');
    if (resume) {
      state.pausedByModal = false;
      resumeTimer();
    }
  }
  function openSafe() {
    if (state.phase === 'quiz' && !state.answered && state.timerId) {
      state.safePaused = true;
      pauseTimer();
    }
    applySafeZone(state.safePreset, false);
    el.safe.modal.classList.remove('hidden');
    Sound.click();
  }
  function closeSafe() {
    el.safe.modal.classList.add('hidden');
    if (state.safePaused) {
      state.safePaused = false;
      resumeTimer();
    }
    Sound.click();
  }
  function closeAllModals() {
    el.how.classList.add('hidden');
    el.confirm.classList.add('hidden');
    el.share.classList.add('hidden');
    el.safe.modal.classList.add('hidden');
    state.safePaused = false;
  }

  /* ---------------- events ---------------- */
  el.startBtn.addEventListener('click', () => { Sound.init(); Sound.click(); startGame(); });
  el.howBtn.addEventListener('click', openHow);
  el.howCloseBtn.addEventListener('click', () => { Sound.click(); closeHow(); });
  el.soundBtn.addEventListener('click', () => {
    Sound.init();
    state.soundOn = !state.soundOn;
    Sound.setOn(state.soundOn);
    localStorage.setItem(SOUND_KEY, state.soundOn ? 'on' : 'off');
    setSoundUI();
    if (state.soundOn) Sound.click();
  });
  el.quiz.soundBtn.addEventListener('click', () => {
    Sound.init();
    state.soundOn = !state.soundOn;
    Sound.setOn(state.soundOn);
    localStorage.setItem(SOUND_KEY, state.soundOn ? 'on' : 'off');
    setSoundUI();
    if (state.soundOn) Sound.click();
  });
  el.shareBtn.addEventListener('click', openShare);
  el.results.shareBtn.addEventListener('click', openShare);
  el.shareCloseBtn.addEventListener('click', () => { Sound.click(); closeShare(); });
  el.copyLinkBtn.addEventListener('click', copyLink);
  el.safe.btn.addEventListener('click', openSafe);
  el.safe.btn2.addEventListener('click', openSafe);
  el.safe.closeBtn.addEventListener('click', closeSafe);
  el.safe.grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.safe-opt');
    if (!btn) return;
    applySafeZone(btn.dataset.preset, true);
    Sound.click();
    toast(`SAFE ZONE · ${SAFE_PRESETS[state.safePreset].label}`);
  });
  el.quiz.quitBtn.addEventListener('click', openConfirm);
  el.confirmLeaveBtn.addEventListener('click', () => {
    Sound.click();
    state.pausedByModal = false;
    el.confirm.classList.add('hidden');
    stopTimer();
    showStart();
  });
  el.confirmStayBtn.addEventListener('click', () => { Sound.click(); closeConfirm(true); });
  el.quiz.nextBtn.addEventListener('click', nextQuestion);
  el.results.playAgainBtn.addEventListener('click', () => { Sound.click(); startGame(); });
  el.results.shareScoreBtn.addEventListener('click', shareScore);
  el.results.menuBtn.addEventListener('click', () => { Sound.click(); showStart(); });
  el.results.reviewToggle.addEventListener('click', toggleReview);

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target !== modal) return;
      if (modal === el.confirm) closeConfirm(true);
      else if (modal === el.share) closeShare();
      else if (modal === el.how) closeHow();
      else if (modal === el.safe.modal) closeSafe();
    });
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (anyOverlay()) {
      if (key === 'Escape') {
        if (!el.confirm.classList.contains('hidden')) closeConfirm(true);
        else if (!el.share.classList.contains('hidden')) closeShare();
        else if (!el.safe.modal.classList.contains('hidden')) closeSafe();
        else if (!el.how.classList.contains('hidden')) closeHow();
        e.preventDefault();
      }
      return;
    }
    if (state.phase === 'start') {
      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        startGame();
      }
      return;
    }
    if (state.phase === 'quiz') {
      if (key === 'Escape') { e.preventDefault(); openConfirm(); return; }
      if (state.answered) {
        if (key === 'Enter' || key === ' ') { e.preventDefault(); nextQuestion(); }
        return;
      }
      const num = parseInt(key, 10);
      if (num >= 1 && num <= 4) {
        e.preventDefault();
        answer(num - 1);
        return;
      }
      const letter = key.toLowerCase();
      if (['a', 'b', 'c', 'd'].includes(letter)) {
        e.preventDefault();
        answer(['a', 'b', 'c', 'd'].indexOf(letter));
      }
      return;
    }
    if (state.phase === 'results') {
      if (key === 'Enter') { e.preventDefault(); startGame(); }
      if (key === 'Escape') { e.preventDefault(); showStart(); }
    }
  });

  // Pause the timer when the tab is hidden, resume on return.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (state.phase === 'quiz' && !state.answered && !isModalOpen()) pauseTimer();
    } else {
      if (state.phase === 'quiz' && !state.answered && !isModalOpen()) resumeTimer();
    }
  });

  // Try to be a good citizen when the window loses focus mid-quiz.
  window.addEventListener('blur', () => {
    if (state.phase === 'quiz' && !state.answered && !isModalOpen()) pauseTimer();
  });
  window.addEventListener('focus', () => {
    if (state.phase === 'quiz' && !state.answered && !isModalOpen()) resumeTimer();
  });

  // Re-apply the safe-zone preset when the phone rotates.
  const orientQuery = window.matchMedia('(orientation: landscape)');
  if (orientQuery.addEventListener) orientQuery.addEventListener('change', handleOrientation);
  else if (orientQuery.addListener) orientQuery.addListener(handleOrientation);

  /* ---------------- boot ---------------- */
  loadStored();
  showStart();
  window.__quizStarted = true;
})();

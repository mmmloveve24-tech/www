// popup.js — Вся логика интерфейса и таймера
const $ = id => document.getElementById(id);
const NOTIFY_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y0X58QAAAAASUVORK5CYII=';
const state = {
  running: false, work: true, timeLeft: 25 * 60, total: 25 * 60,
  workDur: 25, restDur: 5,
  xp: 0, level: 1, nextLvl: 100, streak: 0, doneTasks: 0,
  tasks: [], interval: null
};

// Инициализация
async function init() {
  const saved = await chrome.storage.local.get(['state']);
  if (saved.state) Object.assign(state, saved.state);

  state.running = false;
  state.interval = null;
  state.timeLeft = state.work ? state.workDur * 60 : state.restDur * 60;
  state.total = state.timeLeft;

  $('wVal').textContent = state.workDur;
  $('rVal').textContent = state.restDur;

  bindControls();
  renderTasks();
  updateXP();
  applyTheme();
  updateDisplay();
}

function bindControls() {
  $('btnStart').onclick = () => {
    if (state.running) {
      state.running = false;
      clearInterval(state.interval);
      $('btnStart').textContent = '▶ Старт';
      sendBG('allow');
    } else {
      state.running = true;
      $('btnStart').textContent = '⏸ Пауза';
      state.interval = setInterval(tick, 1000);
      if (state.work) sendBG('clear');
    }
  };

  $('btnReset').onclick = () => {
    state.running = false;
    clearInterval(state.interval);
    state.work = true;
    state.timeLeft = state.workDur * 60;
    state.total = state.timeLeft;
    $('btnStart').textContent = '▶ Старт';
    applyTheme();
    updateDisplay();
    saveState();
    sendBG('allow');
  };

  $('btnAdd').onclick = addTask;
  $('taskIn').onkeydown = e => {
    if (e.key === 'Enter') addTask();
  };

  $('workMinus').onclick = () => adjTime('w', -1);
  $('workPlus').onclick = () => adjTime('w', 1);
  $('restMinus').onclick = () => adjTime('r', -1);
  $('restPlus').onclick = () => adjTime('r', 1);
}

function applyTheme() {
  const root = document.documentElement;
  if (state.work) {
    root.style.setProperty('--cur', 'var(--neon-work)');
    root.style.setProperty('--cur-glow', 'var(--neon-work-glow)');
    $('jelly').classList.remove('rest');
    $('phaseTxt').textContent = 'ФОКУС';
  } else {
    root.style.setProperty('--cur', 'var(--neon-rest)');
    root.style.setProperty('--cur-glow', 'var(--neon-rest-glow)');
    $('jelly').classList.add('rest');
    $('phaseTxt').textContent = 'ОТДЫХ';
  }
}

function updateDisplay() {
  const m = String(Math.floor(state.timeLeft / 60)).padStart(2, '0');
  const s = String(state.timeLeft % 60).padStart(2, '0');
  const t = `${m}:${s}`;
  $('timeDisp').textContent = t;
  const width = state.total > 0 ? (state.timeLeft / state.total) * 100 : 0;
  $('progBar').style.width = `${Math.max(0, width)}%`;
  document.title = `${t} | ${state.work ? '💜 Фокус' : '💚 Отдых'}`;
}

function tick() {
  state.timeLeft--;
  updateDisplay();
  if (state.timeLeft <= 0) switchPhase();
}

function switchPhase() {
  clearInterval(state.interval);
  state.running = false;
  $('btnStart').textContent = '▶ Старт';

  playSound(state.work ? 'complete' : 'restEnd');
  if (state.work) {
    state.streak++;
    state.xp += 50;
    showToast('🎉 Помодор завершён! +50 XP');
  } else {
    showToast('☕ Отдых окончен!');
  }

  state.work = !state.work;
  state.timeLeft = state.work ? state.workDur * 60 : state.restDur * 60;
  state.total = state.timeLeft;

  applyTheme();
  updateDisplay();
  checkLevelUp();
  saveState();

  if (state.work) sendBG('clear');
  else sendBG('allow');
}

function adjTime(type, d) {
  if (type === 'w') {
    state.workDur = Math.max(5, Math.min(60, state.workDur + d));
    $('wVal').textContent = state.workDur;
  } else {
    state.restDur = Math.max(1, Math.min(30, state.restDur + d));
    $('rVal').textContent = state.restDur;
  }

  if (!state.running && ((type === 'w' && state.work) || (type === 'r' && !state.work))) {
    state.timeLeft = (type === 'w' ? state.workDur : state.restDur) * 60;
    state.total = state.timeLeft;
    updateDisplay();
  }

  saveState();
}

// Задачи
function renderTasks() {
  const list = $('taskList');
  const done = state.tasks.filter(t => t.done).length;
  $('taskCount').textContent = `${done} / ${state.tasks.length}`;
  $('doneTasks').textContent = state.doneTasks;

  if (!state.tasks.length) {
    list.innerHTML = '<div class="empty">Нет задач. Добавьте первую! 🎯</div>';
    return;
  }

  list.innerHTML = state.tasks.map(t => `
    <div class="task ${t.done ? 'done' : ''}" data-id="${t.id}">
      <button class="check ${t.done ? 'ok' : ''}" data-action="toggle" data-id="${t.id}" aria-label="Переключить задачу"></button>
      <span style="flex:1;overflow:hidden;white-space:nowrap">${esc(t.text)}</span>
      <button class="del" data-action="delete" data-id="${t.id}" aria-label="Удалить задачу">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-action="toggle"]').forEach(btn => {
    btn.addEventListener('click', () => toggleTask(Number(btn.dataset.id)));
  });
  list.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => delTask(Number(btn.dataset.id)));
  });
}

function addTask() {
  const v = $('taskIn').value.trim();
  if (!v) return;

  state.tasks.push({ id: Date.now(), text: v, done: false });
  $('taskIn').value = '';
  renderTasks();
  saveState();
}

function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;

  t.done = !t.done;
  state.doneTasks += t.done ? 1 : -1;
  if (t.done) {
    state.xp += 15;
    checkLevelUp();
  }

  renderTasks();
  updateXP();
  saveState();
}

function delTask(id) {
  state.tasks = state.tasks.filter(x => x.id !== id);
  renderTasks();
  saveState();
}

// Геймификация
function checkLevelUp() {
  while (state.xp >= state.nextLvl) {
    state.xp -= state.nextLvl;
    state.level++;
    state.nextLvl = Math.floor(state.nextLvl * 1.3);
    $('lvlAnim').classList.add('show');
    playSound('levelup');
    setTimeout(() => $('lvlAnim').classList.remove('show'), 1200);
  }
  updateXP();
}

function updateXP() {
  $('lvlDisp').textContent = `Ур. ${state.level}`;
  $('xpDisp').textContent = `${state.xp} / ${state.nextLvl} XP`;
  $('xpFill').style.width = `${(state.xp / state.nextLvl) * 100}%`;
  $('streak').textContent = state.streak;
}

// Звук (Web Audio API)
const actx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
  const now = actx.currentTime;
  const g = actx.createGain();
  g.connect(actx.destination);

  if (type === 'complete') {
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = actx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      o.start(now + i * 0.15);
      g.gain.setValueAtTime(0.1, now + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
      o.stop(now + i * 0.15 + 0.5);
    });
  } else if (type === 'restEnd') {
    const o = actx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(440, now);
    o.frequency.linearRampToValueAtTime(880, now + 0.3);
    o.connect(g);
    o.start(now);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    o.stop(now + 0.5);
  } else if (type === 'levelup') {
    [600, 800, 1000, 1200].forEach((f, i) => {
      const o = actx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      o.start(now + i * 0.1);
      g.gain.setValueAtTime(0.15, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
      o.stop(now + i * 0.1 + 0.4);
    });
  }
}

// Уведомления и фон
function sendBG(action) {
  chrome.runtime.sendMessage({ action });
}

function showToast(msg) {
  chrome.notifications?.create({
    type: 'basic',
    title: 'Jelly Focus',
    message: msg,
    iconUrl: NOTIFY_ICON
  });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

async function saveState() {
  chrome.storage.local.set({ state });
}

init();

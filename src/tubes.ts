import './tubes.css';

type Difficulty = 'easy' | 'medium' | 'hard';

interface DiffConfig {
  colors: number;
  empty: number;
}

interface HistoryEntry {
  state: number[][];
  moves: number;
}

interface LastPour {
  tube: number;
  count: number;
}

interface SavedData {
  diff: Difficulty;
  solvedCount: number;
}

const CAP = 4;
const COLORS: readonly string[] = [
  '#e8453c',
  '#f5a524',
  '#2f9be0',
  '#46c46f',
  '#8b5cf6',
  '#14b8a6',
  '#ec4899',
  '#a3621f',
  '#64748b'
];

const DIFF: Record<Difficulty, DiffConfig> = {
  easy: { colors: 4, empty: 2 },
  medium: { colors: 6, empty: 2 },
  hard: { colors: 9, empty: 2 }
};

let diff: Difficulty = 'easy';
let tubes: number[][] = [];
let start: number[][] = [];
let history: HistoryEntry[] = [];
let selected: number | null = null;
let moves: number = 0;
let solvedCount: number = 0;
let lastPour: LastPour | null = null;
let won: boolean = false;

/* ---------- правила ---------- */
const topOf = (t: number[]): number | undefined => t[t.length - 1];

const runLength = (t: number[]): number => {
  if (!t.length) return 0;
  const top = topOf(t);
  let n = 1;
  for (let i = t.length - 2; i >= 0 && t[i] === top; i--) n++;
  return n;
};

function canPour(a: number, b: number): boolean {
  if (a === b) return false;
  const from = tubes[a];
  const to = tubes[b];
  if (!from.length || to.length >= CAP) return false;
  return to.length === 0 || topOf(to) === topOf(from);
}

function pour(a: number, b: number): number {
  const from = tubes[a];
  const to = tubes[b];
  const n = Math.min(runLength(from), CAP - to.length);
  for (let i = 0; i < n; i++) {
    const val = from.pop();
    if (val !== undefined) to.push(val);
  }
  return n;
}

const isSolved = (st: number[][]): boolean =>
  st.every(t => t.length === 0 || (t.length === CAP && t.every(c => c === t[0])));

/* ---------- генератор: тасуем, пока не выйдет решаемая раскладка ---------- */
function shuffle<T>(a: T[]): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const temp = a[i];
    a[i] = a[j];
    a[j] = temp;
  }
}

function solvable(state: number[][]): boolean {
  const key = (s: number[][]): string => s.map(t => t.join(',')).sort().join('|');
  const seen = new Set<string>([key(state)]);
  const stack: number[][][] = [state.map(t => t.slice())];
  let nodes = 0;

  while (stack.length) {
    if (++nodes > 120000) return false;
    const st = stack.pop()!;
    if (isSolved(st)) return true;
    const next: [number, number[][]][] = [];

    for (let i = 0; i < st.length; i++) {
      if (!st[i].length) continue;
      const c = st[i][st[i].length - 1];
      let run = 1;
      for (let k = st[i].length - 2; k >= 0 && st[i][k] === c; k--) run++;
      if (run === st[i].length && (st[i].length === CAP || st[i].length === 0)) continue; // уже готова

      for (let j = 0; j < st.length; j++) {
        if (i === j || st[j].length >= CAP) continue;
        if (st[j].length && st[j][st[j].length - 1] !== c) continue;
        if (!st[j].length && run === st[i].length) continue; // бессмысленный перенос

        const cp = st.map(t => t.slice());
        const n = Math.min(run, CAP - cp[j].length);
        for (let x = 0; x < n; x++) {
          const item = cp[i].pop();
          if (item !== undefined) cp[j].push(item);
        }
        const k2 = key(cp);
        if (seen.has(k2)) continue;
        seen.add(k2);
        // ход, который достраивает колбу до конца — самый перспективный
        next.push([cp[j].length === CAP ? 2 : (st[j].length ? 1 : 0), cp]);
      }
    }
    next.sort((x, y) => x[0] - y[0]);
    for (const [, s] of next) stack.push(s);
  }
  return false;
}

function generate(): number[][] | null {
  const { colors, empty } = DIFF[diff];
  for (let attempt = 0; attempt < 300; attempt++) {
    const pool: number[] = [];
    for (let c = 0; c < colors; c++) {
      for (let i = 0; i < CAP; i++) pool.push(c);
    }
    shuffle(pool);
    const st: number[][] = [];
    for (let i = 0; i < colors; i++) {
      st.push(pool.slice(i * CAP, (i + 1) * CAP));
    }
    if (st.some(t => t.every(c => c === t[0]))) continue; // без готовых колб на старте
    for (let i = 0; i < empty; i++) st.push([]);
    if (solvable(st)) return st;
  }
  return null;
}

/* ---------- DOM элементы ---------- */
const board = document.getElementById('board') as HTMLDivElement;
const movesEl = document.getElementById('moves') as HTMLElement;
const solvedEl = document.getElementById('solved') as HTMLElement;
const undoBtn = document.getElementById('undo') as HTMLButtonElement;
const restartBtn = document.getElementById('restart') as HTMLButtonElement;
const newBtn = document.getElementById('new') as HTMLButtonElement;
const diffBtns = document.querySelectorAll<HTMLButtonElement>('[data-diff]');

/* ---------- отрисовка ---------- */
function render(): void {
  board.innerHTML = '';
  tubes.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'tube';
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Пробирка ${i + 1}, заполнена на ${t.length} из ${CAP}`);
    if (selected === i) el.classList.add('selected');
    if (t.length === CAP && t.every(c => c === t[0])) el.classList.add('done');

    for (let s = 0; s < CAP; s++) {
      const d = document.createElement('div');
      if (s < t.length) {
        d.className = 'seg' + (s === t.length - 1 ? ' top' : '');
        d.style.setProperty('--c', COLORS[t[s]]);
        if (lastPour && lastPour.tube === i && s >= t.length - lastPour.count) {
          d.classList.add('pour');
        }
      } else {
        d.className = 'slot';
      }
      el.appendChild(d);
    }

    el.onclick = () => tap(i, el);
    el.onkeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        tap(i, el);
      }
    };
    board.appendChild(el);
  });

  lastPour = null;
  movesEl.textContent = String(moves);
  solvedEl.textContent = String(solvedCount);
  undoBtn.disabled = !history.length || won;
  if (won) showWin();
}

function tap(i: number, el: HTMLElement): void {
  if (won) return;
  if (selected === null) {
    if (tubes[i].length) {
      selected = i;
      render();
    }
    return;
  }
  if (selected === i) {
    selected = null;
    render();
    return;
  }
  if (canPour(selected, i)) {
    history.push({ state: tubes.map(t => t.slice()), moves });
    if (history.length > 300) history.shift();
    const n = pour(selected, i);
    lastPour = { tube: i, count: n };
    moves++;
    selected = null;
    won = isSolved(tubes);
    if (won) {
      solvedCount++;
      save();
    }
    render();
  } else {
    el.classList.remove('nope');
    void el.offsetWidth;
    el.classList.add('nope');
    selected = tubes[i].length ? i : null;
    setTimeout(render, 320);
  }
}

function showWin(): void {
  const w = document.createElement('div');
  w.className = 'win';
  w.innerHTML = `<p>Уровень пройден</p><span>Ходов: ${moves}</span>`;
  const b = document.createElement('button');
  b.className = 'primary';
  b.textContent = 'Следующий уровень';
  b.onclick = newLevel;
  w.appendChild(b);
  board.appendChild(w);
  b.focus();
}

/* ---------- управление ---------- */
function newLevel(): void {
  const st = generate();
  if (!st) {
    alert('Не удалось собрать уровень, попробуй ещё раз');
    return;
  }
  start = st.map(t => t.slice());
  tubes = st;
  history = [];
  moves = 0;
  selected = null;
  won = false;
  lastPour = null;
  render();
}

function restart(): void {
  tubes = start.map(t => t.slice());
  history = [];
  moves = 0;
  selected = null;
  won = false;
  lastPour = null;
  render();
}

newBtn.onclick = newLevel;
restartBtn.onclick = restart;
undoBtn.onclick = () => {
  const h = history.pop();
  if (!h) return;
  tubes = h.state;
  moves = h.moves;
  selected = null;
  won = false;
  render();
};

diffBtns.forEach(b => {
  b.onclick = () => {
    const newDiff = b.dataset.diff as Difficulty;
    if (newDiff && DIFF[newDiff]) {
      diff = newDiff;
      save();
      syncDiff();
      newLevel();
    }
  };
});

function syncDiff(): void {
  diffBtns.forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.diff === diff));
  });
}

/* ---------- память браузера ---------- */
function save(): void {
  try {
    const data: SavedData = { diff, solvedCount };
    localStorage.setItem('tubes', JSON.stringify(data));
  } catch {}
}

try {
  const raw = localStorage.getItem('tubes');
  if (raw) {
    const d = JSON.parse(raw) as Partial<SavedData>;
    if (d.diff && DIFF[d.diff]) diff = d.diff;
    if (typeof d.solvedCount === 'number') solvedCount = d.solvedCount | 0;
  }
} catch {}

syncDiff();
newLevel();

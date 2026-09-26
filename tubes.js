const CAP = 4;
const COLORS = ["#e8453c","#f5a524","#2f9be0","#46c46f","#8b5cf6","#14b8a6","#ec4899","#a3621f","#64748b"];
const DIFF = { easy:{colors:4,empty:2}, medium:{colors:6,empty:2}, hard:{colors:9,empty:2} };

let diff = "easy";
let tubes = [];
let start = [];
let history = [];
let selected = null;
let moves = 0;
let solvedCount = 0;
let lastPour = null;   // {tube, count} — для анимации
let won = false;

/* ---------- правила ---------- */
const topOf = t => t[t.length-1];
const runLength = t => { let n=1; for(let i=t.length-2;i>=0 && t[i]===topOf(t);i--) n++; return t.length?n:0; };

function canPour(a,b){
  if(a===b) return false;
  const from=tubes[a], to=tubes[b];
  if(!from.length || to.length>=CAP) return false;
  return to.length===0 || topOf(to)===topOf(from);
}
function pour(a,b){
  const from=tubes[a], to=tubes[b];
  const n=Math.min(runLength(from), CAP-to.length);
  for(let i=0;i<n;i++) to.push(from.pop());
  return n;
}
const isSolved = st => st.every(t => t.length===0 || (t.length===CAP && t.every(c=>c===t[0])));

/* ---------- генератор: тасуем, пока не выйдет решаемая раскладка ---------- */
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];} }

function solvable(state){
  const key = s => s.map(t=>t.join(",")).sort().join("|");
  const seen = new Set([key(state)]);
  const stack = [state.map(t=>t.slice())];
  let nodes = 0;
  while(stack.length){
    if(++nodes > 120000) return false;
    const st = stack.pop();
    if(isSolved(st)) return true;
    const next = [];
    for(let i=0;i<st.length;i++){
      if(!st[i].length) continue;
      const c = st[i][st[i].length-1];
      let run=1; for(let k=st[i].length-2;k>=0 && st[i][k]===c;k--) run++;
      if(run===st[i].length && (st[i].length===CAP || st[i].length===0)) continue; // уже готова
      for(let j=0;j<st.length;j++){
        if(i===j || st[j].length>=CAP) continue;
        if(st[j].length && st[j][st[j].length-1]!==c) continue;
        if(!st[j].length && run===st[i].length) continue; // бессмысленный перенос
        const cp = st.map(t=>t.slice());
        const n = Math.min(run, CAP-cp[j].length);
        for(let x=0;x<n;x++) cp[j].push(cp[i].pop());
        const k2 = key(cp);
        if(seen.has(k2)) continue;
        seen.add(k2);
        // ход, который достраивает колбу до конца — самый перспективный
        next.push([cp[j].length===CAP?2:(st[j].length?1:0), cp]);
      }
    }
    next.sort((x,y)=>x[0]-y[0]);
    for(const [,s] of next) stack.push(s);
  }
  return false;
}

function generate(){
  const {colors, empty} = DIFF[diff];
  for(let attempt=0; attempt<300; attempt++){
    const pool=[];
    for(let c=0;c<colors;c++) for(let i=0;i<CAP;i++) pool.push(c);
    shuffle(pool);
    const st=[];
    for(let i=0;i<colors;i++) st.push(pool.slice(i*CAP,(i+1)*CAP));
    if(st.some(t=>t.every(c=>c===t[0]))) continue;   // без готовых колб на старте
    for(let i=0;i<empty;i++) st.push([]);
    if(solvable(st)) return st;
  }
  return null;
}

/* ---------- отрисовка ---------- */
const board = document.getElementById("board");

function render(){
  board.innerHTML = "";
  tubes.forEach((t,i)=>{
    const el = document.createElement("div");
    el.className = "tube";
    el.tabIndex = 0;
    el.setAttribute("role","button");
    el.setAttribute("aria-label", `Пробирка ${i+1}, заполнена на ${t.length} из ${CAP}`);
    if(selected===i) el.classList.add("selected");
    if(t.length===CAP && t.every(c=>c===t[0])) el.classList.add("done");
    for(let s=0;s<CAP;s++){
      const d = document.createElement("div");
      if(s < t.length){
        d.className = "seg" + (s===t.length-1 ? " top" : "");
        d.style.setProperty("--c", COLORS[t[s]]);
        if(lastPour && lastPour.tube===i && s >= t.length-lastPour.count) d.classList.add("pour");
      } else d.className = "slot";
      el.appendChild(d);
    }
    el.onclick = () => tap(i, el);
    el.onkeydown = e => { if(e.key==="Enter"||e.key===" "){ e.preventDefault(); tap(i, el); } };
    board.appendChild(el);
  });
  lastPour = null;
  document.getElementById("moves").textContent = moves;
  document.getElementById("solved").textContent = solvedCount;
  document.getElementById("undo").disabled = !history.length || won;
  if(won) showWin();
}

function tap(i, el){
  if(won) return;
  if(selected === null){
    if(tubes[i].length) { selected = i; render(); }
    return;
  }
  if(selected === i){ selected = null; render(); return; }
  if(canPour(selected, i)){
    history.push({state: tubes.map(t=>t.slice()), moves});
    if(history.length > 300) history.shift();
    const n = pour(selected, i);
    lastPour = {tube:i, count:n};
    moves++;
    selected = null;
    won = isSolved(tubes);
    if(won){ solvedCount++; save(); }
    render();
  } else {
    el.classList.remove("nope"); void el.offsetWidth; el.classList.add("nope");
    selected = tubes[i].length ? i : null;
    setTimeout(render, 320);
  }
}

function showWin(){
  const w = document.createElement("div");
  w.className = "win";
  w.innerHTML = `<p>Уровень пройден</p><span>Ходов: ${moves}</span>`;
  const b = document.createElement("button");
  b.className = "primary"; b.textContent = "Следующий уровень";
  b.onclick = newLevel;
  w.appendChild(b);
  board.appendChild(w);
  b.focus();
}

/* ---------- управление ---------- */
function newLevel(){
  const st = generate();
  if(!st){ alert("Не удалось собрать уровень, попробуй ещё раз"); return; }
  start = st.map(t=>t.slice());
  tubes = st;
  history = []; moves = 0; selected = null; won = false; lastPour = null;
  render();
}
function restart(){
  tubes = start.map(t=>t.slice());
  history = []; moves = 0; selected = null; won = false; lastPour = null;
  render();
}
document.getElementById("new").onclick = newLevel;
document.getElementById("restart").onclick = restart;
document.getElementById("undo").onclick = () => {
  const h = history.pop(); if(!h) return;
  tubes = h.state; moves = h.moves; selected = null; won = false;
  render();
};
document.querySelectorAll("[data-diff]").forEach(b=>{
  b.onclick = () => { diff = b.dataset.diff; save(); syncDiff(); newLevel(); };
});
function syncDiff(){
  document.querySelectorAll("[data-diff]").forEach(b=>
    b.setAttribute("aria-pressed", String(b.dataset.diff===diff)));
}

/* ---------- память браузера (у каждого своя, может быть пустой) ---------- */
function save(){
  try{ localStorage.setItem("tubes", JSON.stringify({diff, solvedCount})); }catch(e){}
}
try{
  const raw = localStorage.getItem("tubes");
  if(raw){ const d = JSON.parse(raw); if(DIFF[d.diff]) diff = d.diff; solvedCount = d.solvedCount|0; }
}catch(e){}

syncDiff();
newLevel();

/*
==============================================
  GeDebug Padel App - PRODUCTION
  Version : v2.0.0
  File    : js/register.js
  Module  : Register - player management & session generation
==============================================
*/

function renderPills(){
  const sel = State.players.filter(p => p.active).length;
  const bar = document.getElementById('selected-bar');
  if(bar) bar.style.display = sel > 0 ? 'flex' : 'none';
  const lbl = document.getElementById('sel-count-label');
  if(lbl) lbl.textContent = `${sel} player${sel !== 1 ? 's' : ''} selected`;
  const btn = document.getElementById('select-all-btn');
  if(btn) btn.textContent = (sel === State.players.length && State.players.length > 0) ? 'Deselect All' : 'Select All';

  // Show warning if session is running
  const err = document.getElementById('reg-err');
  if(err){
    if(State.rounds.length > 0){
      const hasUnfinished = State.rounds.some(r => r.courts.some(c => !c.locked && c.status !== 'done'));
      err.textContent = hasUnfinished ? '⚠️ A session is currently running. Save results before generating a new one.' : '';
    } else {
      err.textContent = '';
    }
  }

  const list = document.getElementById('pill-list');
  if(!list) return;
  list.innerHTML = State.players.map(p => {
    const c = PALETTES[p.color % PALETTES.length];
    return `<div class="pill ${p.active ? 'on' : ''}" onclick="${State.currentUser ? `togglePlayer('${p.name}')` : 'void(0)'}" style="${State.currentUser ? '' : 'cursor:default'}">
      <div class="pill-av" style="background:${c.bg};color:${c.txt}">${ini(p.name)}</div>
      ${p.name}
      ${State.currentUser ? `<span class="pill-x" onclick="${State.isAdmin ? `removePlayer(event,'${p.name}')` : 'void(0)'}">&#x2715;</span>` : ''}
    </div>`;
  }).join('');
}

function togglePlayer(name){
  if(!State.currentUser) return;
  const p = State.players.find(x => x.name === name);
  if(!p) return;
  db.ref(`players/${name}/active`).set(!p.active);
}

function selectAll(){
  if(!State.currentUser) return;
  const allSelected = State.players.every(p => p.active);
  const updates = {};
  State.players.forEach(p => updates[`players/${p.name}/active`] = !allSelected);
  db.ref().update(updates);
}

function removePlayer(e, name){
  if(!State.isAdmin) return;
  e.stopPropagation();
  if(!confirm(`Remove ${name}?`)) return;
  db.ref(`players/${name}`).remove();
}

function addPlayer(){
  if(!State.currentUser) return;
  const inp = document.getElementById('new-name');
  const name = inp.value.trim();
  if(!name) return;
  if(State.players.find(p => p.name === name)){ showToast(`${name} already exists`); return; }
  db.ref(`players/${name}`).set({
    name, color: State.players.length % PALETTES.length,
    order: State.players.length, played:0, won:0, lost:0, draw:0, score:0, totalPts:0, active:true
  });
  inp.value = '';
}

function generateSession(){
  if(!State.currentUser){ showToast('Please sign in to generate a session'); return; }

  // Check if a session is already running
  if(State.rounds.length > 0){
    const hasUnfinished = State.rounds.some(r =>
      r.courts.some(c => !c.locked && c.status !== 'done')
    );
    if(hasUnfinished){
      const err = document.getElementById('reg-err');
      err.textContent = 'A session is still running. Save results first before generating a new one.';
      return;
    }
  }

  const active = State.players.filter(p => p.active);
  const err = document.getElementById('reg-err');
  if(active.length < 4){ err.textContent = 'Need at least 4 players selected.'; return; }
  err.textContent = '';
  const sitOutPerRound = Math.max(0, active.length - 8);
  const newRounds = [];
  const sitCount = {};
  const partnerCount = {}, opponentCount = {};
  active.forEach(p => sitCount[p.name] = 0);
  for(let r = 0; r < 10; r++){
    let sitters = [];
    if(sitOutPerRound > 0){
      const sorted = active.slice().sort((a,b) => sitCount[a.name] - sitCount[b.name]);
      sitters = sorted.slice(0, sitOutPerRound);
      sitters.forEach(p => sitCount[p.name]++);
    }
    const pool = active.filter(p => !sitters.some(s => s.name === p.name));
    newRounds.push(buildSmartRound(pool, sitters, false, partnerCount, opponentCount));
  }
  db.ref('session/rounds').set(newRounds);
  db.ref('session/date').set(dateStr);
  showToast('Session generated!');
  showScreen('matches');
}

function shuffle(arr){
  const a = arr.slice();
  for(let i = a.length-1; i > 0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function buildSmartRound(pool, sitters, isExtra, partnerCount, opponentCount){
  let best = null, bestScore = Infinity;
  for(let t = 0; t < 60; t++){
    const sh = shuffle(pool);
    let score = 0;
    const courts = [];
    for(let c = 0; c < 2 && sh.length >= 4; c++){
      const [a,b,x,y] = [sh.shift(), sh.shift(), sh.shift(), sh.shift()];
      score += (partnerCount[pairKey(a.name,b.name)]||0)*10;
      score += (partnerCount[pairKey(x.name,y.name)]||0)*10;
      [[a,x],[a,y],[b,x],[b,y]].forEach(([p,q]) => score += (opponentCount[pairKey(p.name,q.name)]||0)*3);
      courts.push({
        teamA:[{name:a.name,color:a.color},{name:b.name,color:b.color}],
        teamB:[{name:x.name,color:x.color},{name:y.name,color:y.color}],
        scoreA:0, scoreB:0, status:'waiting', locked:false
      });
    }
    if(score < bestScore){ bestScore = score; best = courts; }
    if(bestScore === 0) break;
  }
  if(best){
    best.forEach(court => {
      const a=court.teamA[0].name, b=court.teamA[1].name, x=court.teamB[0].name, y=court.teamB[1].name;
      partnerCount[pairKey(a,b)] = (partnerCount[pairKey(a,b)]||0)+1;
      partnerCount[pairKey(x,y)] = (partnerCount[pairKey(x,y)]||0)+1;
      [a,b].forEach(p => [x,y].forEach(q => opponentCount[pairKey(p,q)] = (opponentCount[pairKey(p,q)]||0)+1));
    });
  }
  return { courts: best||[], sitting: sitters.map(s => s.name), isExtra: isExtra||false };
}

function addRound(){
  if(!State.currentUser){ showToast('Please sign in first'); return; }
  const active = State.players.filter(p => p.active);
  if(active.length < 4) return;
  const sitOutPerRound = Math.max(0, active.length - 8);
  let sitters = [];
  if(sitOutPerRound > 0){
    const sitCount = {};
    active.forEach(p => sitCount[p.name] = 0);
    State.rounds.forEach(round => { if(round.sitting) round.sitting.forEach(s => { if(sitCount[s]!==undefined) sitCount[s]++; }); });
    const sorted = active.slice().sort((a,b) => sitCount[a.name] - sitCount[b.name]);
    sitters = sorted.slice(0, sitOutPerRound);
  }
  const partnerCount = {}, opponentCount = {};
  State.rounds.forEach(round => {
    round.courts.forEach(court => {
      const a=court.teamA[0].name, b=court.teamA[1].name, x=court.teamB[0].name, y=court.teamB[1].name;
      partnerCount[pairKey(a,b)] = (partnerCount[pairKey(a,b)]||0)+1;
      partnerCount[pairKey(x,y)] = (partnerCount[pairKey(x,y)]||0)+1;
      [a,b].forEach(p => [x,y].forEach(q => opponentCount[pairKey(p,q)] = (opponentCount[pairKey(p,q)]||0)+1));
    });
  });
  const pool = active.filter(p => !sitters.some(s => s.name === p.name));
  const updated = [...State.rounds, buildSmartRound(pool, sitters, true, partnerCount, opponentCount)];
  db.ref('session/rounds').set(updated);
  showToast('Extra round added!');
  setTimeout(() => { const s = document.getElementById('session-scroll'); if(s) s.scrollTop = s.scrollHeight; }, 400);
}

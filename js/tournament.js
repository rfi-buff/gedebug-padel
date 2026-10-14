/*
==============================================
  GeDebug Padel App - PRODUCTION
  Version : v2.2.0
  File    : js/tournament.js
  Module  : Tournament - isolated from regular session data
==============================================
  Firebase node: tournaments/  (NEVER touches players/, session/, history/)
*/

// ── Tournament state (local only, not mixed with State) ──
const TState = {
  activeTournament: null,   // current tournament object from Firebase
  activeTournamentKey: null,
  allTournaments: [],
  listener: null
};

// ── Helpers ──
function tIni(name){ return name.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2); }

const T_COLORS = [
  {bg:'#1a4030',txt:'#00C98D'},{bg:'#1a2a40',txt:'#85B7EB'},{bg:'#3a1a40',txt:'#C98DEB'},
  {bg:'#401a1a',txt:'#FF6B6B'},{bg:'#3a3a1a',txt:'#FFD166'},{bg:'#1a3a3a',txt:'#06D6A0'},
  {bg:'#2a1a3a',txt:'#B185DB'},{bg:'#3a2a1a',txt:'#F4A261'},{bg:'#1a3a2a',txt:'#52B788'},
  {bg:'#2a3a1a',txt:'#B5E48C'},{bg:'#1a2a3a',txt:'#90E0EF'},{bg:'#3a1a2a',txt:'#F9A8D4'},
];
function tColor(i){ return T_COLORS[i % T_COLORS.length]; }

function tGenKey(){ return 'T' + Date.now().toString(36).toUpperCase(); }

// ── Main render entry ──
function renderTournament(){
  const body = document.getElementById('tournament-body');
  if(!body) return;

  if(TState.activeTournament){
    renderTournamentActive(body);
  } else {
    renderTournamentList(body);
  }
}

// ════════════════════════════════════════════
//  TOURNAMENT LIST VIEW
// ════════════════════════════════════════════
function renderTournamentList(body){
  const canCreate = State.isAdmin && !State.isGuest;
  let h = '';

  if(canCreate){
    h += `<div style="margin-top:16px">
      <button class="btn-green" onclick="showTournamentSetup()">+ Create Tournament</button>
    </div>`;
  } else if(!State.isGuest && !State.isAdmin){
    h += `<div style="margin-top:16px;padding:12px 14px;background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px;color:var(--text3);text-align:center">Only admins can create tournaments</div>`;
  }

  if(TState.allTournaments.length === 0){
    h += `<div class="empty" style="margin-top:24px">
      <div class="empty-icon">🏆</div>
      <div class="empty-title">No tournaments yet</div>
      <div class="empty-sub">${canCreate ? 'Tap "+ Create Tournament" to get started' : 'Admins can create a tournament from here'}</div>
    </div>`;
  } else {
    h += `<div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin:20px 0 10px">Tournaments</div>`;
    TState.allTournaments.forEach(t => {
      const statusColor = t.status==='active' ? 'var(--green)' : t.status==='completed' ? 'var(--text3)' : 'var(--amber)';
      const statusLabel = t.status==='active' ? 'Active' : t.status==='completed' ? 'Completed' : 'Setup';
      h += `<div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:10px;cursor:pointer" onclick="openTournament('${t.key}')">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:var(--text)">${t.name||'Tournament'}</div>
          <span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(0,0,0,0.08);color:${statusColor};border:0.5px solid ${statusColor}">${statusLabel}</span>
        </div>
        <div style="font-size:12px;color:var(--text3)">${t.numPairs} pairs · ${t.numCourts} courts · Race to ${t.raceTo} · ${t.format==='roundrobin'?'Round Robin':'Knock-out'}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px">${new Date(t.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
      </div>`;
    });
  }

  body.innerHTML = h;
}

// ════════════════════════════════════════════
//  SETUP FORM
// ════════════════════════════════════════════
function showTournamentSetup(){
  const body = document.getElementById('tournament-body');
  if(!body) return;

  let h = `
  <div style="margin:16px 0 8px;display:flex;align-items:center;gap:8px">
    <button onclick="renderTournament()" style="width:32px;height:32px;border-radius:50%;border:0.5px solid var(--border2);background:var(--bg3);color:var(--text);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">‹</button>
    <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:var(--text)">New Tournament</div>
  </div>

  <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px">

    <!-- Name -->
    <div style="font-size:10px;font-family:'Syne',sans-serif;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Tournament Name</div>
    <input id="t-name" placeholder="e.g. GeDebug Cup 2026" maxlength="40"
      style="width:100%;background:var(--bg3);border:0.5px solid var(--border2);border-radius:var(--radius-sm);padding:12px 14px;color:var(--text);font-size:14px;font-family:'DM Sans',sans-serif;outline:none;margin-bottom:16px"
      onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border2)'">

    <!-- Number of pairs -->
    <div style="font-size:10px;font-family:'Syne',sans-serif;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Number of Pairs</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <button onclick="tAdjPairs(-1)" style="width:36px;height:36px;border-radius:10px;border:0.5px solid var(--border2);background:var(--bg3);color:var(--text);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center">−</button>
      <div id="t-pairs-val" style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:var(--text);min-width:40px;text-align:center">4</div>
      <button onclick="tAdjPairs(1)" style="width:36px;height:36px;border-radius:10px;border:0.5px solid var(--border2);background:var(--bg3);color:var(--text);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>
      <div style="font-size:12px;color:var(--text3)">(2–16 pairs)</div>
    </div>

    <!-- Courts -->
    <div style="font-size:10px;font-family:'Syne',sans-serif;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Number of Courts</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <button onclick="tAdjCourts(-1)" style="width:36px;height:36px;border-radius:10px;border:0.5px solid var(--border2);background:var(--bg3);color:var(--text);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center">−</button>
      <div id="t-courts-val" style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:var(--text);min-width:40px;text-align:center">2</div>
      <button onclick="tAdjCourts(1)" style="width:36px;height:36px;border-radius:10px;border:0.5px solid var(--border2);background:var(--bg3);color:var(--text);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>
      <div style="font-size:12px;color:var(--text3)">(2–10 courts)</div>
    </div>

    <!-- Race To -->
    <div style="font-size:10px;font-family:'Syne',sans-serif;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Format — Race To</div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      ${[3,4,5].map(n=>`
      <div id="t-race-${n}" onclick="tSelectRace(${n})" style="flex:1;padding:12px;border-radius:var(--radius-sm);border:0.5px solid ${n===3?'var(--green)':'var(--border2)'};background:${n===3?'var(--green-dim)':'var(--bg3)'};cursor:pointer;text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:${n===3?'var(--green)':'var(--text2)'}">Race to ${n}</div>
        <div style="font-size:10px;color:${n===3?'var(--green)':'var(--text3)'};margin-top:3px">${n} games</div>
      </div>`).join('')}
    </div>

    <!-- Tournament Format -->
    <div style="font-size:10px;font-family:'Syne',sans-serif;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Tournament Format</div>
    <div style="display:flex;gap:8px;margin-bottom:0">
      <div id="t-fmt-roundrobin" onclick="tSelectFormat('roundrobin')" style="flex:1;padding:12px;border-radius:var(--radius-sm);border:0.5px solid var(--green);background:var(--green-dim);cursor:pointer">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--green)">Round Robin</div>
        <div style="font-size:10px;color:var(--green);margin-top:3px">Every pair plays each other</div>
      </div>
      <div id="t-fmt-knockout" onclick="tSelectFormat('knockout')" style="flex:1;padding:12px;border-radius:var(--radius-sm);border:0.5px solid var(--border2);background:var(--bg3);cursor:pointer">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--text2)">Knock-out</div>
        <div style="font-size:10px;color:var(--text3);margin-top:3px">Win to advance</div>
      </div>
    </div>
  </div>

  <!-- Pair Names -->
  <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px">Pair Names</div>
  <div id="t-pairs-list" style="margin-bottom:16px"></div>

  <div id="t-setup-err" style="font-size:12px;color:var(--red);text-align:center;margin-bottom:8px;min-height:18px"></div>
  <button class="btn-green" onclick="createTournament()">Generate Matches</button>
  <div style="height:16px"></div>`;

  body.innerHTML = h;
  tSetupState = { pairs: 4, courts: 2, raceTo: 3, format: 'roundrobin' };
  renderPairInputs();
}

let tSetupState = { pairs: 4, courts: 2, raceTo: 3, format: 'roundrobin' };

function tAdjPairs(d){
  tSetupState.pairs = Math.max(2, Math.min(16, tSetupState.pairs + d));
  const el = document.getElementById('t-pairs-val');
  if(el) el.textContent = tSetupState.pairs;
  renderPairInputs();
}
function tAdjCourts(d){
  tSetupState.courts = Math.max(2, Math.min(10, tSetupState.courts + d));
  const el = document.getElementById('t-courts-val');
  if(el) el.textContent = tSetupState.courts;
}
function tSelectRace(n){
  tSetupState.raceTo = n;
  [3,4,5].forEach(x => {
    const el = document.getElementById(`t-race-${x}`);
    if(!el) return;
    const on = x===n;
    el.style.border = on ? '0.5px solid var(--green)' : '0.5px solid var(--border2)';
    el.style.background = on ? 'var(--green-dim)' : 'var(--bg3)';
    el.querySelector('div').style.color = on ? 'var(--green)' : 'var(--text2)';
    el.querySelectorAll('div')[1].style.color = on ? 'var(--green)' : 'var(--text3)';
  });
}
function tSelectFormat(fmt){
  tSetupState.format = fmt;
  ['roundrobin','knockout'].forEach(f => {
    const el = document.getElementById(`t-fmt-${f}`);
    if(!el) return;
    const on = f===fmt;
    el.style.border = on ? '0.5px solid var(--green)' : '0.5px solid var(--border2)';
    el.style.background = on ? 'var(--green-dim)' : 'var(--bg3)';
    el.querySelectorAll('div')[0].style.color = on ? 'var(--green)' : 'var(--text2)';
    el.querySelectorAll('div')[1].style.color = on ? 'var(--green)' : 'var(--text3)';
  });
}

function renderPairInputs(){
  const wrap = document.getElementById('t-pairs-list');
  if(!wrap) return;
  let h = '';
  for(let i = 0; i < tSetupState.pairs; i++){
    const c = tColor(i);
    h += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:30px;height:30px;border-radius:50%;background:${c.bg};color:${c.txt};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;font-family:'Syne',sans-serif">${i+1}</div>
      <input id="t-pair-${i}" placeholder="Pair ${i+1} name" maxlength="24"
        style="flex:1;background:var(--bg3);border:0.5px solid var(--border2);border-radius:var(--radius-sm);padding:10px 12px;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none"
        onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border2)'">
    </div>`;
  }
  wrap.innerHTML = h;
}

// ════════════════════════════════════════════
//  CREATE TOURNAMENT & GENERATE MATCHES
// ════════════════════════════════════════════
function createTournament(){
  if(!State.isAdmin){ showToast('Admin access required'); return; }
  const nameEl = document.getElementById('t-name');
  const name = nameEl ? nameEl.value.trim() : '';
  if(!name){ setTErr('Please enter a tournament name'); return; }

  const pairs = [];
  for(let i = 0; i < tSetupState.pairs; i++){
    const el = document.getElementById(`t-pair-${i}`);
    const val = el ? el.value.trim() : '';
    if(!val){ setTErr(`Please enter name for Pair ${i+1}`); return; }
    if(pairs.includes(val)){ setTErr(`Duplicate pair name: ${val}`); return; }
    pairs.push(val);
  }

  const { courts, raceTo, format } = tSetupState;
  const matches = format === 'roundrobin'
    ? generateRoundRobinMatches(pairs, courts)
    : generateKnockoutMatches(pairs, courts);

  const tournament = {
    name,
    numPairs: pairs.length,
    numCourts: courts,
    raceTo,
    format,
    pairs,
    matches,
    status: 'active',
    createdAt: Date.now(),
    createdBy: State.currentUser ? State.currentUser.email : 'admin'
  };

  const key = tGenKey();
  db.ref(`tournaments/${key}`).set(tournament, err => {
    if(err){ setTErr('Failed to save. Try again.'); return; }
    showToast('Tournament created!');
    TState.activeTournamentKey = key;
    TState.activeTournament = { ...tournament, key };
    renderTournament();
  });
}

function setTErr(msg){
  const el = document.getElementById('t-setup-err');
  if(el) el.textContent = msg;
}

// ── Assign court numbers to a round, avoiding prev round assignments ──
function assignCourtNumbers(courts, numCourts, prevCourts){
  const prevAssigned = prevCourts ? prevCourts.map(c => c.courtNo) : [];
  // Build shuffled pool of court numbers [1..numCourts], preferring ones not used last round
  const allNums = Array.from({length: numCourts}, (_,i) => i+1);
  const preferred = allNums.filter(n => !prevAssigned.includes(n));
  const rest = allNums.filter(n => prevAssigned.includes(n));
  // Shuffle each group
  const shuffle = arr => { for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; };
  const pool = [...shuffle(preferred), ...shuffle(rest)];
  // Assign cycling through pool
  courts.forEach((c, i) => { c.courtNo = pool[i % pool.length]; });
}

// ── Round Robin: every pair plays every other pair ──
// Uses the Circle/Berger algorithm to guarantee no two consecutive rounds
// have the same matchups. For odd number of pairs, adds a bye slot.
function generateRoundRobinMatches(pairs, numCourts){
  const rounds = [];
  const n = pairs.length;

  // Circle algorithm needs even number of participants
  // If odd, add a dummy 'BYE' — any pair matched vs BYE sits out that round
  const roster = n % 2 === 0 ? [...pairs] : [...pairs, '__BYE__'];
  const size = roster.length; // always even

  // Fix first entry, rotate the rest — produces (size-1) rounds
  // Each round has (size/2) matchups, all unique across rounds
  const fixed = roster[0];
  const rotating = roster.slice(1);

  for(let r = 0; r < size - 1; r++){
    // Build this round's pairings using the circle layout
    const circle = [fixed, ...rotating];
    const roundPairings = [];
    for(let i = 0; i < size / 2; i++){
      const a = circle[i];
      const b = circle[size - 1 - i];
      // Skip bye matchups
      if(a === '__BYE__' || b === '__BYE__') continue;
      roundPairings.push([a, b]);
    }

    // Rotate: move last element to front of rotating array
    rotating.unshift(rotating.pop());

    if(roundPairings.length === 0) continue;

    // Split into chunks of numCourts (one "game slot" per chunk)
    // Each chunk becomes its own round card
    for(let start = 0; start < roundPairings.length; start += numCourts){
      const chunk = roundPairings.slice(start, start + numCourts);
      const courts = chunk.map(([a, b]) => ({
        pairA: a, pairB: b, scoreA: 0, scoreB: 0, status: 'pending'
      }));
      const prev = rounds.length ? rounds[rounds.length - 1].courts : null;
      assignCourtNumbers(courts, numCourts, prev);
      rounds.push({ courts, status: 'pending' });
    }
  }

  return rounds;
}

// ── Knock-out: bracket style ──
function generateKnockoutMatches(pairs, numCourts){
  // Seed bracket: next power of 2 >= pairs.length
  const n = pairs.length;
  let bracketSize = 2;
  while(bracketSize < n) bracketSize *= 2;
  const seeded = [...pairs];
  while(seeded.length < bracketSize) seeded.push(null); // byes

  const rounds = [];
  // Round 1: consecutive pairs
  const r1 = { courts: [], roundName: 'Round 1', status: 'pending' };
  for(let i = 0; i < bracketSize; i += 2){
    if(seeded[i] && seeded[i+1]){
      r1.courts.push({ pairA: seeded[i], pairB: seeded[i+1], scoreA: 0, scoreB: 0, status: 'pending' });
    } else if(seeded[i]){
      r1.courts.push({ pairA: seeded[i], pairB: null, scoreA: 1, scoreB: 0, status: 'bye', winner: seeded[i] });
    }
  }
  assignCourtNumbers(r1.courts, numCourts, null);
  rounds.push(r1);

  // Subsequent rounds: TBD (winners advance, placeholders)
  let remaining = bracketSize / 2;
  let rNum = 2;
  while(remaining > 1){
    const roundName = remaining === 2 ? 'Final' : remaining === 4 ? 'Semi-finals' : remaining === 8 ? 'Quarter-finals' : `Round ${rNum}`;
    const r = { courts: [], roundName, status: 'pending', tbd: true };
    for(let i = 0; i < remaining / 2; i++){
      r.courts.push({ pairA: null, pairB: null, scoreA: 0, scoreB: 0, status: 'pending', tbd: true });
    }
    rounds.push(r);
    remaining = remaining / 2;
    rNum++;
  }
  return rounds;
}

// ════════════════════════════════════════════
//  OPEN EXISTING TOURNAMENT
// ════════════════════════════════════════════
function openTournament(key){
  const t = TState.allTournaments.find(x => x.key === key);
  if(!t) return;
  TState.activeTournament = t;
  TState.activeTournamentKey = key;
  renderTournament();
}

// ════════════════════════════════════════════
//  ACTIVE TOURNAMENT VIEW
// ════════════════════════════════════════════
function renderTournamentActive(body){
  const t = TState.activeTournament;
  if(!t) return;

  const standings = computeTStandings(t);
  const isAdmin = State.isAdmin && !State.isGuest;
  const isCompleted = t.status === 'completed';

  let h = `
  <div style="margin:16px 0 12px;display:flex;align-items:center;gap:8px">
    <button onclick="closeTournamentView()" style="width:32px;height:32px;border-radius:50%;border:0.5px solid var(--border2);background:var(--bg3);color:var(--text);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">‹</button>
    <div>
      <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:var(--text)">${t.name}</div>
      <div style="font-size:11px;color:var(--text3)">${t.numPairs} pairs · ${t.numCourts} courts · Race to ${t.raceTo} · ${t.format==='roundrobin'?'Round Robin':'Knock-out'}</div>
    </div>
  </div>`;

  // Podium (completed tournaments)
  if(isCompleted && standings.length >= 2){
    const podiumEntries = standings.slice(0, Math.min(4, standings.length));
    const podiumMedals = ['🥇','🥈','🥉','4️⃣'];
    const podiumLabels = ['Champion','Runner-up','3rd Place','4th Place'];
    const podiumColors = ['#FFD700','#C0C0C0','#CD7F32','var(--text3)'];

    h += `<div style="background:linear-gradient(135deg,rgba(0,201,141,0.06),rgba(0,201,141,0.02));border:0.5px solid rgba(0,201,141,0.25);border-radius:var(--radius);padding:16px;margin-bottom:16px">
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:28px;margin-bottom:4px">🏆</div>
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--text)">${t.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">Final Results</div>
      </div>`;

    // Top 3 podium visual (side by side: 2nd | 1st | 3rd)
    if(podiumEntries.length >= 2){
      const order = podiumEntries.length >= 3
        ? [podiumEntries[1], podiumEntries[0], podiumEntries[2]]
        : [null, podiumEntries[0], podiumEntries[1]];
      const heights = ['56px','76px','44px'];
      const podFontSizes = ['20px','28px','18px'];
      h += `<div style="display:flex;align-items:flex-end;justify-content:center;gap:8px;margin-bottom:14px">`;
      order.forEach((entry, oi) => {
        if(!entry){ h += `<div style="flex:1"></div>`; return; }
        const realIdx = standings.indexOf(entry);
        const c = tColor(t.pairs.indexOf(entry.name));
        h += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
          <div style="font-size:${podFontSizes[oi]}">${podiumMedals[realIdx]||''}</div>
          <div style="width:38px;height:38px;border-radius:50%;background:${c.bg};color:${c.txt};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'Syne',sans-serif">${tIni(entry.name)}</div>
          <div style="font-size:11px;font-weight:600;color:var(--text);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px">${entry.name}</div>
          <div style="background:${c.bg};border-radius:8px;height:${heights[oi]};width:100%;display:flex;align-items:center;justify-content:center">
            <span style="font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:${c.txt}">${entry.pts}pts</span>
          </div>
        </div>`;
      });
      h += `</div>`;
    }

    // 4th place (if exists)
    if(podiumEntries.length >= 4){
      const p4 = podiumEntries[3];
      const c4 = tColor(t.pairs.indexOf(p4.name));
      h += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg3);border-radius:var(--radius-sm)">
        <span style="font-size:16px">4️⃣</span>
        <div style="width:28px;height:28px;border-radius:50%;background:${c4.bg};color:${c4.txt};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;font-family:'Syne',sans-serif">${tIni(p4.name)}</div>
        <div style="flex:1;font-size:13px;font-weight:500;color:var(--text)">${p4.name}</div>
        <div style="font-size:11px;color:var(--text3)">4th Place</div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--green)">${p4.pts}pts</div>
      </div>`;
    }

    h += `</div>`;
  } else if(isCompleted){
    h += `<div style="padding:8px 14px;background:rgba(0,201,141,0.08);border:0.5px solid rgba(0,201,141,0.25);border-radius:var(--radius-sm);font-size:12px;color:var(--green);margin-bottom:12px;text-align:center;font-weight:600">🏆 Tournament Completed</div>`;
  }

  // Standings
  h += `<div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px">Standings</div>`;
  h += renderTStandings(standings, t);

  // Matches by round
  h += `<div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin:18px 0 10px">Matches</div>`;

  if(t.matches && t.matches.length){
    t.matches.forEach((round, ri) => {
      const roundLabel = round.roundName || `Round ${ri+1}`;
      const allScored = round.courts.every(c => c.status==='bye' || c.status==='done');
      h += `<div style="display:flex;align-items:center;justify-content:space-between;margin:10px 0 6px">
        <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em">${roundLabel}</div>
        ${allScored?`<span style="font-size:10px;padding:2px 7px;border-radius:8px;background:rgba(0,201,141,0.1);color:var(--green)">Done</span>`:''}
      </div>`;

      round.courts.forEach((court, ci) => {
        if(court.tbd){
          h += `<div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:8px">
            <div style="text-align:center;font-size:12px;color:var(--text3);padding:8px">Waiting for round ${ri} results…</div>
          </div>`;
          return;
        }
        if(court.status === 'bye'){
          h += `<div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
            ${tAvatar(court.pairA,0)}
            <div style="font-size:13px;font-weight:500;color:var(--text);flex:1">${court.pairA}</div>
            <span style="font-size:10px;padding:2px 8px;border-radius:8px;background:var(--bg3);color:var(--text3)">BYE — auto advance</span>
          </div>`;
          return;
        }

        const scored = court.scoreA + court.scoreB > 0;
        const aWin = court.scoreA > court.scoreB;
        const bWin = court.scoreB > court.scoreA;
        const pairAIdx = t.pairs.indexOf(court.pairA);
        const pairBIdx = t.pairs.indexOf(court.pairB);

        const tKey = t.key || TState.activeTournamentKey;
        const matchDone = court.status === 'done';
        const borderColor = matchDone ? 'rgba(0,201,141,0.3)' : 'var(--border)';

        h += `<div style="background:var(--bg2);border:0.5px solid ${borderColor};border-radius:var(--radius);padding:14px;margin-bottom:8px">`;

        // Header: court label + done badge
        const courtLabel = court.courtNo ? `Court ${court.courtNo}` : `Match ${ci+1}`;
        h += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:10px;color:var(--text3);font-weight:500;text-transform:uppercase;letter-spacing:0.06em">${courtLabel}</span>
          </div>
          ${matchDone ? `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(0,201,141,0.1);color:var(--green);font-weight:600">✓ Completed</span>` : `<span style="font-size:10px;color:var(--text3)">Race to ${t.raceTo}</span>`}
        </div>`;

        // Pair A row
        h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          ${tAvatar(court.pairA, pairAIdx)}
          <span style="flex:1;font-size:13px;font-weight:${aWin?'700':'500'};color:${aWin?'var(--green)':'var(--text)'}">${court.pairA}</span>`;
        if(isAdmin && !isCompleted && !matchDone){
          h += `<button onclick="tAdjScore('${tKey}',${ri},${ci},'A',-1)" class="sc-btn" style="width:30px;height:30px;font-size:18px">−</button>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:${aWin?'var(--green)':bWin?'var(--red)':'var(--text)'};min-width:28px;text-align:center">${court.scoreA}</div>
          <button onclick="tAdjScore('${tKey}',${ri},${ci},'A',1)" class="sc-btn" style="width:30px;height:30px;font-size:18px">+</button>`;
        } else {
          h += `<div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:${aWin?'var(--green)':bWin?'var(--red)':'var(--text)'};min-width:28px;text-align:center">${court.scoreA}</div>`;
        }
        h += `</div>`;

        // VS divider
        h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="flex:1;height:0.5px;background:var(--border)"></div>
          <span style="font-size:10px;color:var(--text3)">VS</span>
          <div style="flex:1;height:0.5px;background:var(--border)"></div>
        </div>`;

        // Pair B row
        h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:${isAdmin && !isCompleted ? '12' : '0'}px">
          ${tAvatar(court.pairB, pairBIdx)}
          <span style="flex:1;font-size:13px;font-weight:${bWin?'700':'500'};color:${bWin?'var(--green)':'var(--text)'}">${court.pairB}</span>`;
        if(isAdmin && !isCompleted && !matchDone){
          h += `<button onclick="tAdjScore('${tKey}',${ri},${ci},'B',-1)" class="sc-btn" style="width:30px;height:30px;font-size:18px">−</button>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:${bWin?'var(--green)':aWin?'var(--red)':'var(--text)'};min-width:28px;text-align:center">${court.scoreB}</div>
          <button onclick="tAdjScore('${tKey}',${ri},${ci},'B',1)" class="sc-btn" style="width:30px;height:30px;font-size:18px">+</button>`;
        } else {
          h += `<div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:${bWin?'var(--green)':aWin?'var(--red)':'var(--text)'};min-width:28px;text-align:center">${court.scoreB}</div>`;
        }
        h += `</div>`;

        // Match Completed button
        if(isAdmin && !isCompleted){
          if(!matchDone){
            h += `<button onclick="tMarkMatchDone('${tKey}',${ri},${ci},true)"
              style="width:100%;padding:9px;border-radius:var(--radius-sm);border:0.5px solid var(--border2);background:var(--bg3);color:var(--text2);font-size:12px;cursor:pointer;margin-top:4px">
              Mark Match Completed
            </button>`;
          } else {
            h += `<button onclick="tMarkMatchDone('${tKey}',${ri},${ci},false)"
              style="width:100%;padding:9px;border-radius:var(--radius-sm);border:0.5px solid rgba(0,201,141,0.3);background:rgba(0,201,141,0.06);color:var(--green);font-size:12px;cursor:pointer;margin-top:4px">
              ✓ Completed — tap to reopen
            </button>`;
          }
        }

        h += `</div>`;
      });
    });
  }

  // After last round — More Rounds (round robin) or Advance (knockout)
  if(isAdmin && !isCompleted && t.matches && t.matches.length){
    const lastRound = t.matches[t.matches.length - 1];
    const lastRoundDone = lastRound.courts.every(c => c.status==='bye' || c.status==='done');
    h += `<div style="margin-top:4px;margin-bottom:16px;display:flex;flex-direction:column;gap:8px">`;
    if(t.format === 'roundrobin' && lastRoundDone){
      h += `<button class="btn-outline" onclick="tAddRound('${TState.activeTournamentKey}')" style="width:100%">+ More Rounds</button>`;
    }
    if(t.format === 'knockout'){
      h += `<button class="btn-outline" onclick="advanceKnockout('${TState.activeTournamentKey}')" style="width:100%">Advance Winners to Next Round</button>`;
    }
    h += `</div>`;
  }

  // Admin actions
  if(isAdmin && !isCompleted){
    h += `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px">
      <button class="btn-green" onclick="completeTournament('${TState.activeTournamentKey}')">Mark Tournament Complete</button>
      <button class="btn-red" onclick="deleteTournament('${TState.activeTournamentKey}')">Delete Tournament</button>
    </div>`;
  }

  if(isAdmin && isCompleted){
    h += `<div style="margin-top:8px;margin-bottom:8px">
      <button class="btn-red" onclick="deleteTournament('${TState.activeTournamentKey}')">Delete Tournament</button>
    </div>`;
  }

  h += `<div style="height:16px"></div>`;
  body.innerHTML = h;
}

function tAvatar(name, idx){
  const c = tColor(idx >= 0 ? idx : 0);
  return `<div style="width:26px;height:26px;border-radius:50%;background:${c.bg};color:${c.txt};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;font-family:'Syne',sans-serif">${tIni(name||'?')}</div>`;
}

function closeTournamentView(){
  TState.activeTournament = null;
  TState.activeTournamentKey = null;
  renderTournament();
}

// ════════════════════════════════════════════
//  STANDINGS
// ════════════════════════════════════════════
function computeTStandings(t){
  if(!t || !t.pairs) return [];
  const stats = {};
  t.pairs.forEach(p => stats[p] = { name:p, mp:0, w:0, l:0, d:0, gf:0, ga:0, pts:0 });

  if(t.matches){
    t.matches.forEach(round => {
      round.courts.forEach(court => {
        if(court.tbd || court.status==='pending' || court.status==='bye') return;
        if(!court.scoreA && !court.scoreB) return;
        const a = stats[court.pairA], b = stats[court.pairB];
        if(!a || !b) return;
        a.mp++; b.mp++;
        a.gf += court.scoreA; a.ga += court.scoreB;
        b.gf += court.scoreB; b.ga += court.scoreA;
        if(court.scoreA > court.scoreB){ a.w++; a.pts+=3; b.l++; }
        else if(court.scoreB > court.scoreA){ b.w++; b.pts+=3; a.l++; }
        else { a.l++; b.l++; } // tie = loss for both (race-to format)
      });
    });
  }

  return Object.values(stats).sort((a,b) => b.pts-a.pts||b.w-a.w||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf);
}

function renderTStandings(standings, t){
  const medals = ['🥇','🥈','🥉'];
  if(!standings.length) return `<div style="font-size:12px;color:var(--text3);text-align:center;padding:12px">No data yet</div>`;

  let h = `<div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:4px">
    <div style="padding:7px 12px;border-bottom:0.5px solid var(--border)">
      <span style="font-size:10px;color:var(--text2)">Win=3pts · Loss=0pts · SD=Score Won−Conceded</span>
    </div>
    <div style="display:grid;grid-template-columns:24px 1fr 26px 26px 26px 36px 36px;gap:2px;padding:6px 12px;border-bottom:0.5px solid var(--border)">
      <span></span>
      <span style="font-size:9px;color:var(--text3)">Pair</span>
      <span style="font-size:9px;color:var(--text3);text-align:center">MP</span>
      <span style="font-size:9px;color:var(--green);text-align:center">W</span>
      <span style="font-size:9px;color:var(--red);text-align:center">L</span>
      <span style="font-size:9px;color:var(--text2);text-align:center">SD</span>
      <span style="font-size:9px;color:var(--green);text-align:center;font-weight:700">Pts</span>
    </div>`;

  standings.forEach((p, i) => {
    const c = tColor(t.pairs.indexOf(p.name));
    const gd = p.gf - p.ga;
    const gdColor = gd > 0 ? 'var(--green)' : gd < 0 ? 'var(--red)' : 'var(--text3)';
    const gdLabel = gd > 0 ? `+${gd}` : `${gd}`;
    h += `<div style="display:grid;grid-template-columns:24px 1fr 26px 26px 26px 36px 36px;gap:2px;padding:9px 12px;border-bottom:0.5px solid var(--border);align-items:center">
      <span style="font-size:12px">${medals[i]||`<span style="font-size:11px;color:var(--text3)">${i+1}</span>`}</span>
      <div style="display:flex;align-items:center;gap:5px">
        <div style="width:20px;height:20px;border-radius:50%;background:${c.bg};color:${c.txt};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0">${tIni(p.name)}</div>
        <span style="font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:68px">${p.name}</span>
      </div>
      <span style="font-size:12px;color:var(--text2);text-align:center">${p.mp}</span>
      <span style="font-size:12px;color:var(--green);font-weight:500;text-align:center">${p.w}</span>
      <span style="font-size:12px;color:var(--red);font-weight:500;text-align:center">${p.l}</span>
      <span style="font-size:12px;font-weight:600;color:${gdColor};text-align:center">${gdLabel}</span>
      <span style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--green);text-align:center">${p.pts}</span>
    </div>`;
  });
  h += `</div>`;
  return h;
}

// ════════════════════════════════════════════
//  SCORE ADJUSTMENT
// ════════════════════════════════════════════
function tAdjScore(key, roundIdx, courtIdx, side, delta){
  if(!State.isAdmin){ showToast('Admin only'); return; }
  const t = TState.activeTournament;
  if(!t || !t.matches) return;
  const court = t.matches[roundIdx]?.courts[courtIdx];
  if(!court || court.tbd || court.status==='bye') return;

  const raceTo = t.raceTo || 3;
  if(side === 'A'){
    court.scoreA = Math.max(0, Math.min(raceTo, court.scoreA + delta));
  } else {
    court.scoreB = Math.max(0, Math.min(raceTo, court.scoreB + delta));
  }

  db.ref(`tournaments/${key}/matches/${roundIdx}/courts/${courtIdx}/scoreA`).set(court.scoreA);
  db.ref(`tournaments/${key}/matches/${roundIdx}/courts/${courtIdx}/scoreB`).set(court.scoreB);

  // Update local state and re-render
  TState.activeTournament = t;
  renderTournamentActive(document.getElementById('tournament-body'));
}

// ════════════════════════════════════════════
//  MARK MATCH DONE / REOPEN
// ════════════════════════════════════════════
function tMarkMatchDone(key, roundIdx, courtIdx, done){
  if(!State.isAdmin){ showToast('Admin only'); return; }
  const t = TState.activeTournament;
  if(!t || !t.matches) return;
  const court = t.matches[roundIdx]?.courts[courtIdx];
  if(!court) return;

  court.status = done ? 'done' : 'pending';
  db.ref(`tournaments/${key}/matches/${roundIdx}/courts/${courtIdx}/status`).set(court.status, err => {
    if(!err){
      showToast(done ? 'Match completed!' : 'Match reopened');
      TState.activeTournament = t;
      renderTournamentActive(document.getElementById('tournament-body'));
    }
  });
}

// ════════════════════════════════════════════
//  ADVANCE KNOCK-OUT ROUND
// ════════════════════════════════════════════
function advanceKnockout(key){
  if(!State.isAdmin){ showToast('Admin only'); return; }
  const t = TState.activeTournament;
  if(!t || t.format !== 'knockout') return;

  // Find first round with unresolved TBD courts that has a previous completed round
  for(let ri = 1; ri < t.matches.length; ri++){
    const prevRound = t.matches[ri-1];
    const thisRound = t.matches[ri];
    if(!thisRound.tbd) continue; // already resolved

    // Check if all courts in previous round are scored
    const prevDone = prevRound.courts.every(c => c.status==='bye' || c.status==='done');
    if(!prevDone){ showToast('Complete all matches in previous round first'); return; }

    // Collect winners
    const winners = prevRound.courts.map(c => {
      if(c.status==='bye') return c.pairA;
      return c.scoreA >= c.scoreB ? c.pairA : c.pairB;
    });

    // Fill this round's courts
    for(let ci = 0; ci < thisRound.courts.length; ci++){
      const a = winners[ci*2] || null;
      const b = winners[ci*2+1] || null;
      thisRound.courts[ci] = { pairA: a, pairB: b, scoreA: 0, scoreB: 0, status: 'pending', tbd: false };
    }
    assignCourtNumbers(thisRound.courts, t.numCourts, prevRound.courts);
    thisRound.tbd = false;
    thisRound.status = 'pending';

    db.ref(`tournaments/${key}/matches`).set(t.matches, err => {
      if(!err){
        showToast('Next round ready!');
        TState.activeTournament = t;
        renderTournamentActive(document.getElementById('tournament-body'));
      }
    });
    return;
  }
  showToast('No pending rounds to advance');
}

// ════════════════════════════════════════════
//  ADD MORE ROUNDS (Round Robin)
// ════════════════════════════════════════════
function tAddRound(key){
  if(!State.isAdmin){ showToast('Admin only'); return; }
  const t = TState.activeTournament;
  if(!t || !t.pairs) return;

  // Generate a full fresh round-robin schedule
  const allRounds = generateRoundRobinMatches(t.pairs, t.numCourts);

  // Figure out which pairings have already been scheduled (existing matches)
  const playedKeys = new Set();
  (t.matches || []).forEach(round => {
    round.courts.forEach(c => {
      if(c.pairA && c.pairB) playedKeys.add(pairKey(c.pairA, c.pairB));
    });
  });

  // Filter allRounds to only rounds containing at least one NEW pairing
  // (pairings not yet in the existing schedule)
  // If all pairings already played, allow a full repeat (second cycle)
  let newRounds = allRounds.filter(r =>
    r.courts.some(c => !playedKeys.has(pairKey(c.pairA, c.pairB)))
  );
  if(newRounds.length === 0) newRounds = allRounds; // second cycle — full repeat

  // Reset scores and re-assign court numbers
  const lastExisting = t.matches && t.matches.length ? t.matches[t.matches.length-1].courts : null;
  const readyRounds = newRounds.map((r, ri) => {
    const courts = r.courts.map(c => ({ ...c, scoreA: 0, scoreB: 0, status: 'pending' }));
    const prevCourts = ri === 0 ? lastExisting : newRounds[ri-1].courts;
    assignCourtNumbers(courts, t.numCourts, prevCourts);
    return { ...r, courts };
  });

  const updated = [...(t.matches || []), ...readyRounds];
  db.ref(`tournaments/${key}/matches`).set(updated, err => {
    if(!err){
      showToast('New rounds added!');
      TState.activeTournament = { ...t, matches: updated };
      renderTournamentActive(document.getElementById('tournament-body'));
    }
  });
}

// ════════════════════════════════════════════
//  COMPLETE / DELETE TOURNAMENT
// ════════════════════════════════════════════
function completeTournament(key){
  if(!State.isAdmin){ showToast('Admin only'); return; }
  if(!confirm('Mark this tournament as completed?')) return;
  db.ref(`tournaments/${key}/status`).set('completed', () => {
    showToast('Tournament completed!');
  });
}

function deleteTournament(key){
  if(!State.isAdmin){ showToast('Admin only'); return; }
  if(!confirm('Delete this tournament? This cannot be undone.')) return;
  db.ref(`tournaments/${key}`).remove(() => {
    showToast('Tournament deleted');
    TState.activeTournament = null;
    TState.activeTournamentKey = null;
    renderTournament();
  });
}

// ════════════════════════════════════════════
//  FIREBASE LISTENER (called from app.js)
// ════════════════════════════════════════════
function initTournamentListener(){
  db.ref('tournaments').on('value', snap => {
    const data = snap.val() || {};
    TState.allTournaments = Object.keys(data).map(k => ({ ...data[k], key: k }))
      .sort((a,b) => b.createdAt - a.createdAt);

    // Keep active tournament in sync
    if(TState.activeTournamentKey){
      const updated = TState.allTournaments.find(t => t.key === TState.activeTournamentKey);
      if(updated){
        TState.activeTournament = updated;
      }
    }

    const body = document.getElementById('tournament-body');
    if(body) renderTournament();
  });
}

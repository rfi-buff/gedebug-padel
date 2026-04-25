/*
==============================================
  GeDebug Padel App - PRODUCTION
  Version : v2.0.0
  File    : js/matches.js
  Module  : Matches - court scoring & finalization
==============================================
*/

function getActiveCount(){
  let count = 0;
  State.rounds.forEach(r => r.courts.forEach(c => { if((c.status||'waiting')==='playing') count++; }));
  return count;
}

function toggleCourtPlay(ri, ci){
  if(!State.currentUser) return;
  const court = State.rounds[ri].courts[ci];
  if(court.locked) return;
  const status = court.status || 'waiting';
  if(status === 'playing'){
    db.ref(`session/rounds/${ri}/courts/${ci}/status`).set('waiting');
  } else {
    if(getActiveCount() >= 2){ showToast('Only 2 matches can play at the same time'); return; }
    db.ref(`session/rounds/${ri}/courts/${ci}/status`).set('playing');
  }
}

function changeScore(ri, ci, team, delta){
  if(!State.currentUser) return;
  const court = State.rounds[ri].courts[ci];
  if(court.locked){ showToast('Match is finalized 🔒'); return; }
  if((court.status||'waiting') !== 'playing'){ showToast('Start the match first ▶️'); return; }
  let nA = court.scoreA, nB = court.scoreB;
  if(team==='A'){ nA = Math.max(0,Math.min(4,court.scoreA+delta)); if(nA===court.scoreA) return; nB = 4-nA; }
  else { nB = Math.max(0,Math.min(4,court.scoreB+delta)); if(nB===court.scoreB) return; nA = 4-nB; }
  db.ref(`session/rounds/${ri}/courts/${ci}`).update({scoreA:nA, scoreB:nB});
}

function finalizeCourt(ri, ci){
  if(!State.currentUser) return;
  const court = State.rounds[ri].courts[ci];
  if((court.status||'waiting') !== 'playing'){ showToast('Match is not active'); return; }
  if(court.scoreA + court.scoreB === 0){ showToast('Please enter the score first'); return; }
  if(!confirm(`Finalize Court ${ci+1} Round ${ri+1}? Score will be locked.`)) return;
  db.ref(`session/rounds/${ri}/courts/${ci}`).update({locked:true, status:'done'});
  showToast(`Court ${ci+1} finalized 🔒`);
}

function unlockCourt(ri, ci){
  if(!State.isAdmin) return;
  db.ref(`session/rounds/${ri}/courts/${ci}`).update({locked:false, status:'waiting'});
  showToast(`Court ${ci+1} unlocked ✅`);
}

function courtHTML(ri, ci, court){
  const isDone = !!court.locked || court.status === 'done';
  const isPlaying = (court.status||'waiting') === 'playing';
  const isWaiting = !isDone && !isPlaying;

  const sA = court.scoreA||0, sB = court.scoreB||0;
  const hasScore = sA+sB > 0;
  const aWins = hasScore&&sA>sB, bWins = hasScore&&sB>sA, draw = hasScore&&sA===sB;
  const tAc = aWins?'var(--green)':draw?'var(--amber)':'var(--text)';
  const tBc = bWins?'var(--green)':draw?'var(--amber)':'var(--text)';
  const sAc = aWins?'var(--green)':draw?'var(--amber)':bWins?'var(--red)':'var(--text)';
  const sBc = bWins?'var(--green)':draw?'var(--amber)':aWins?'var(--red)':'var(--text)';

  const statusLabel = isDone
    ? '<span style="font-size:10px;color:var(--text3)">🔒 Done</span>'
    : isPlaying
      ? '<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--green)"><span style="width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 1.4s infinite;display:inline-block"></span>Playing</span>'
      : '<span style="font-size:10px;color:var(--text3)">⏳ Waiting</span>';

  const canScore = State.currentUser && isPlaying && !isDone;
  const scoreBlock = canScore
    ? `<div class="score-block">
        <div class="score-row"><button class="sc-btn" onclick="changeScore(${ri},${ci},'A',-1)">&#8722;</button><div class="sc-val" id="sv-${ri}-${ci}-A" style="color:${sAc}">${sA}</div><button class="sc-btn" onclick="changeScore(${ri},${ci},'A',1)">+</button></div>
        <div class="score-row"><button class="sc-btn" onclick="changeScore(${ri},${ci},'B',-1)">&#8722;</button><div class="sc-val" id="sv-${ri}-${ci}-B" style="color:${sBc}">${sB}</div><button class="sc-btn" onclick="changeScore(${ri},${ci},'B',1)">+</button></div>
      </div>`
    : `<div style="text-align:center;flex-shrink:0;padding:0 8px">
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:${sAc}">${sA}</div>
        <div style="font-size:11px;color:var(--text3)">${isDone?'🔒':'⏳'}</div>
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:${sBc}">${sB}</div>
      </div>`;

  const activeCount = getActiveCount();
  const canStart = activeCount < 2;
  const opacity = isWaiting ? 'opacity:0.5;' : '';
  const border = isPlaying&&(aWins||bWins) ? 'border-color:rgba(0,201,141,0.3)' : isDone ? 'border-color:rgba(255,255,255,0.04)' : '';

  let actionBtn = '';
  if(State.currentUser){
    if(isDone){
      actionBtn = State.isAdmin
        ? `<button onclick="unlockCourt(${ri},${ci})" style="width:100%;padding:7px;border-radius:8px;border:0.5px solid var(--border2);background:transparent;color:var(--text3);font-size:11px;cursor:pointer;margin-top:10px">🔓 Unlock (Admin)</button>`
        : '';
    } else if(isPlaying){
      actionBtn = `<div style="display:flex;gap:6px;margin-top:10px">
        <button onclick="toggleCourtPlay(${ri},${ci})" style="flex:1;padding:8px;border-radius:8px;border:0.5px solid var(--border2);background:var(--bg3);color:var(--text2);font-size:11px;cursor:pointer">⏹ Stop</button>
        <button onclick="finalizeCourt(${ri},${ci})" style="flex:2;padding:8px;border-radius:8px;border:0.5px solid rgba(0,201,141,0.3);background:rgba(0,201,141,0.08);color:var(--green);font-size:11px;font-weight:600;cursor:pointer">✅ Finalize</button>
      </div>`;
    } else {
      actionBtn = `<button onclick="toggleCourtPlay(${ri},${ci})" ${canStart?'':'disabled'} style="width:100%;padding:8px;border-radius:8px;border:0.5px solid ${canStart?'rgba(0,201,141,0.3)':'var(--border2)'};background:${canStart?'rgba(0,201,141,0.08)':'transparent'};color:${canStart?'var(--green)':'var(--text3)'};font-size:11px;font-weight:600;cursor:${canStart?'pointer':'not-allowed'};margin-top:10px">▶️ Start${canStart?'':' (2 already playing)'}</button>`;
    }
  }

  return `<div class="court-card" style="${opacity}${border}">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div class="court-label" style="margin-bottom:0">Court ${ci+1}</div>${statusLabel}
    </div>
    <div class="match-row">
      <div class="team-block">
        <div class="team-p" style="color:${tAc};font-weight:${aWins?'700':'500'}">${court.teamA[0].name}${aWins?' 🏆':''}</div>
        <div class="team-p" style="color:${tAc};font-weight:${aWins?'700':'500'}">${court.teamA[1].name}</div>
      </div>
      ${scoreBlock}
      <div class="team-block r">
        <div class="team-p" style="color:${tBc};font-weight:${bWins?'700':'500'}">${bWins?'🏆 ':''}${court.teamB[0].name}</div>
        <div class="team-p" style="color:${tBc};font-weight:${bWins?'700':'500'}">${court.teamB[1].name}</div>
      </div>
    </div>
    ${actionBtn}
  </div>`;
}

function renderSession(){
  const active = State.players.filter(p => p.active);
  const meta = document.getElementById('session-meta');
  if(meta) meta.textContent = State.rounds.length ? `${active.length} players · ${State.rounds.length} rounds · 2 courts` : 'No session generated yet';
  const empty = document.getElementById('session-empty');
  if(empty) empty.style.display = State.rounds.length ? 'none' : 'block';
  const sa = document.getElementById('session-actions');
  if(sa) sa.style.display = (State.isAdmin && State.rounds.length) ? 'flex' : 'none';

  let html = '';
  State.rounds.forEach((round, ri) => {
    let badges = '';
    if(round.sitting?.length) badges += `<span class="badge-sit">${round.sitting.join(', ')} sitting out</span>`;
    if(round.isExtra) badges += '<span class="badge-extra" style="margin-left:4px">Extra</span>';
    html += `<div class="round-hd"><span class="round-hd-label">Round ${ri+1}</span><div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">${badges}</div></div>`;
    round.courts.forEach((court, ci) => { html += courtHTML(ri, ci, court); });
  });

  const sr = document.getElementById('session-rounds');
  if(sr) sr.innerHTML = html;
}

function finishSession(){
  if(!State.currentUser){ showToast('Please sign in first'); return; }
  if(!State.rounds.length){ showToast('No rounds to save'); return; }
  if(!confirm('Save results and update rankings?')) return;

  const active = State.players.filter(p => p.active);
  const now = new Date();
  const snapDate = now.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const snapTime = now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});

  const sessionStats = {};
  active.forEach(p => sessionStats[p.name] = {name:p.name,color:p.color,played:0,won:0,lost:0,draw:0,score:0,rankPts:0});

  State.rounds.forEach(round => {
    round.courts.forEach(court => {
      const sA=court.scoreA||0, sB=court.scoreB||0;
      if(sA+sB===0) return;
      const isDraw = sA===sB;
      const teamA = normalizeArray(court.teamA).map(x => x?.name||x);
      const teamB = normalizeArray(court.teamB).map(x => x?.name||x);
      teamA.forEach(name => {
        const s = sessionStats[name]; if(!s) return;
        s.played++;
        if(isDraw){s.draw++;s.score+=1;} else if(sA>sB){s.won++;s.score+=3;} else s.lost++;
      });
      teamB.forEach(name => {
        const s = sessionStats[name]; if(!s) return;
        s.played++;
        if(isDraw){s.draw++;s.score+=1;} else if(sB>sA){s.won++;s.score+=3;} else s.lost++;
      });
    });
  });

  const ranked = Object.values(sessionStats).sort((a,b) => b.score-a.score||b.won-a.won);
  ranked.forEach((s,i) => s.rankPts = getRankPts(i));
  const sessionRanking = ranked.map((s,i) => ({...s, weeklyRank:i+1}));

  const histKey = `session_${now.getTime()}`;
  db.ref(`history/${histKey}`).set({
    date:snapDate, time:snapTime, timestamp:now.getTime(),
    players: active.map(p => p.name),
    ranking: sessionRanking,
    rounds: State.rounds.map(round => ({
      sitting: round.sitting||[], isExtra: round.isExtra||false,
      courts: round.courts.map(c => ({
        teamA: c.teamA.map(p => p.name||p),
        teamB: c.teamB.map(p => p.name||p),
        scoreA: c.scoreA||0, scoreB: c.scoreB||0
      }))
    }))
  });

  // Reset player stats, write only this session
  const updates = {};
  State.players.forEach(p => {
    updates[`players/${p.name}/played`] = 0;
    updates[`players/${p.name}/won`] = 0;
    updates[`players/${p.name}/lost`] = 0;
    updates[`players/${p.name}/draw`] = 0;
    updates[`players/${p.name}/score`] = 0;
    updates[`players/${p.name}/active`] = false;
  });
  ranked.forEach(s => {
    const pl = State.players.find(x => x.name===s.name);
    updates[`players/${s.name}/played`] = s.played;
    updates[`players/${s.name}/won`] = s.won;
    updates[`players/${s.name}/lost`] = s.lost;
    updates[`players/${s.name}/draw`] = s.draw;
    updates[`players/${s.name}/score`] = s.score;
    updates[`players/${s.name}/totalPts`] = (pl?.totalPts||0) + s.rankPts;
  });
  State.players.forEach(p => { if(!sessionStats[p.name]) updates[`players/${p.name}/active`] = false; });

  db.ref().update(updates);
  db.ref('session/rounds').set([]);
  db.ref('session/date').set('');
  showToast('Results saved!');
  showScreen('rankings');
}

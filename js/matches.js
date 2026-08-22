/*
==============================================
  GeDebug Padel App - PRODUCTION
  Version : v2.1.0
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
    if(getActiveCount() >= State.numCourts){ showToast(`Only ${State.numCourts} matches can play at the same time`); return; }
    db.ref(`session/rounds/${ri}/courts/${ci}/status`).set('playing');
  }
}

function changeScore(ri, ci, team, val){
  if(!State.currentUser) return;
  const court = State.rounds[ri].courts[ci];
  if(court.locked){ showToast('Match is finalized 🔒'); return; }
  if((court.status||'waiting') !== 'playing'){ showToast('Start the match first ▶️'); return; }
  const score = parseInt(val);
  if(isNaN(score)) return;
  // Both formats: independent score entry
  const update = team === 'A' ? {scoreA: score} : {scoreB: score};
  db.ref(`session/rounds/${ri}/courts/${ci}`).update(update);
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

  const formatLabel = State.matchFormat === 2
    ? '<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:rgba(255,181,71,0.12);color:var(--amber);margin-left:6px">Americano</span>'
    : '<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:rgba(0,180,100,0.1);color:var(--green);margin-left:6px">Tennis Format</span>';

  const statusLabel = isDone
    ? '<span style="font-size:10px;color:var(--text3)">🔒 Done</span>'
    : isPlaying
      ? '<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--green)"><span style="width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 1.4s infinite;display:inline-block"></span>Playing</span>'
      : '<span style="font-size:10px;color:var(--text3)">⏳ Waiting</span>';

  const canScore = State.currentUser && isPlaying && !isDone;
  let scoreBlock = '';
  if(canScore){
    // Both formats use dropdown — Tennis Format 0-7, Americano 0-30, independent entry
    const maxScore = State.matchFormat === 1 ? 7 : 30;
    const optsA = Array.from({length:maxScore+1},(_,i)=>`<option value="${i}" ${sA===i?'selected':''}>${i}</option>`).join('');
    const optsB = Array.from({length:maxScore+1},(_,i)=>`<option value="${i}" ${sB===i?'selected':''}>${i}</option>`).join('');
    scoreBlock = `<div style="display:flex;flex-direction:column;gap:8px;align-items:center;flex-shrink:0">
      <select onchange="changeScore(${ri},${ci},'A',this.value)" style="width:64px;padding:6px;border-radius:8px;background:var(--bg3);border:0.5px solid var(--border2);color:${sAc};font-family:'Syne',sans-serif;font-size:18px;font-weight:700;text-align:center;cursor:pointer;outline:none">${optsA}</select>
      <div style="font-size:10px;color:var(--text3)">vs</div>
      <select onchange="changeScore(${ri},${ci},'B',this.value)" style="width:64px;padding:6px;border-radius:8px;background:var(--bg3);border:0.5px solid var(--border2);color:${sBc};font-family:'Syne',sans-serif;font-size:18px;font-weight:700;text-align:center;cursor:pointer;outline:none">${optsB}</select>
    </div>`;
  } else {
    scoreBlock = `<div style="text-align:center;flex-shrink:0;padding:0 8px">
      <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:${sAc}">${sA}</div>
      <div style="font-size:11px;color:var(--text3)">${isDone?'🔒':'⏳'}</div>
      <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:${sBc}">${sB}</div>
    </div>`;
  }

  const activeCount = getActiveCount();
  const canStart = activeCount < State.numCourts;
  const opacity = isWaiting ? 'opacity:0.5;' : '';
  const border = isPlaying&&(aWins||bWins) ? 'border-color:rgba(0,180,100,0.3)' : isDone ? 'border-color:rgba(0,0,0,0.04)' : '';

  let actionBtn = '';
  if(State.currentUser){
    if(isDone){
      actionBtn = State.isAdmin
        ? `<button onclick="unlockCourt(${ri},${ci})" style="width:100%;padding:7px;border-radius:8px;border:0.5px solid var(--border2);background:transparent;color:var(--text3);font-size:11px;cursor:pointer;margin-top:10px">🔓 Unlock (Admin)</button>`
        : '';
    } else if(isPlaying){
      actionBtn = `<div style="display:flex;gap:6px;margin-top:10px">
        <button onclick="toggleCourtPlay(${ri},${ci})" style="flex:1;padding:8px;border-radius:8px;border:0.5px solid var(--border2);background:var(--bg3);color:var(--text2);font-size:11px;cursor:pointer">⏹ Stop</button>
        <button onclick="finalizeCourt(${ri},${ci})" style="flex:2;padding:8px;border-radius:8px;border:0.5px solid rgba(0,180,100,0.3);background:rgba(0,180,100,0.08);color:var(--green);font-size:11px;font-weight:600;cursor:pointer">✅ Finalize</button>
      </div>`;
    } else {
      actionBtn = `<button onclick="toggleCourtPlay(${ri},${ci})" ${canStart?'':'disabled'} style="width:100%;padding:8px;border-radius:8px;border:0.5px solid ${canStart?'rgba(0,180,100,0.3)':'var(--border2)'};background:${canStart?'rgba(0,180,100,0.08)':'transparent'};color:${canStart?'var(--green)':'var(--text3)'};font-size:11px;font-weight:600;cursor:${canStart?'pointer':'not-allowed'};margin-top:10px">▶️ Start${canStart?'':' (all courts playing)'}</button>`;
    }
  }

  return `<div class="court-card" style="${opacity}${border}">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="display:flex;align-items:center">
        <div class="court-label" style="margin-bottom:0">Court ${ci+1}</div>${formatLabel}
      </div>${statusLabel}
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
  if(meta) meta.textContent = State.rounds.length ? `${active.length} players · ${State.rounds.length} rounds · ${State.numCourts} courts` : 'No session generated yet';
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

  // Only admin or the user who generated the session can save
  if(!canSaveSession()){
    showToast('Only the session generator or admin can save results');
    return;
  }

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
  db.ref('session/generatedBy').remove();
  db.ref('session/matchFormat').remove();
  db.ref('session/numCourts').remove();
  db.ref('session/weeklyRanking').set(sessionRanking);
  showToast('Results saved!');
  showPodium(sessionRanking);
  showScreen('rankings');
}

function closePodium(){
  const modal = document.getElementById('podium-modal');
  if(modal){ modal.style.display = 'none'; document.body.style.overflow = ''; }
}

function showPodium(ranking){
  if(!ranking||ranking.length<1) return;
  const top3 = ranking.slice(0,3);
  const r1 = top3[0]||null;
  const r2 = top3[1]||null;
  const r3 = top3[2]||null;

  const goldTrophy = `<svg viewBox="0 0 70 80" width="64" height="74">
    <rect x="20" y="70" width="30" height="6" rx="2" fill="#EF9F27"/>
    <rect x="28" y="60" width="14" height="12" rx="2" fill="#BA7517"/>
    <path d="M 8 8 Q 4 26 8 44 L 62 44 Q 66 26 62 8 Z" fill="#FAC775"/>
    <path d="M 8 14 Q -2 22 2 34 Q 6 32 8 26" fill="none" stroke="#EF9F27" stroke-width="4" stroke-linecap="round"/>
    <path d="M 62 14 Q 72 22 68 34 Q 64 32 62 26" fill="none" stroke="#EF9F27" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="35" cy="8" rx="26" ry="7" fill="#FAC775"/>
    <ellipse cx="24" cy="24" rx="4" ry="10" fill="white" opacity="0.25"/>
    <text x="35" y="36" font-size="12" fill="#854F0B" font-weight="700" text-anchor="middle" font-family="sans-serif">1</text>
    <text x="35" y="6" font-size="10" fill="#EF9F27" text-anchor="middle">★</text>
  </svg>`;

  const silverTrophy = `<svg viewBox="0 0 60 70" width="52" height="62">
    <rect x="18" y="60" width="24" height="5" rx="2" fill="#B4B2A9"/>
    <rect x="24" y="52" width="12" height="10" rx="2" fill="#888780"/>
    <path d="M 10 8 Q 6 22 10 36 L 50 36 Q 54 22 50 8 Z" fill="#D3D1C7"/>
    <path d="M 10 12 Q 2 18 4 28 Q 8 26 10 22" fill="none" stroke="#B4B2A9" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 50 12 Q 58 18 56 28 Q 52 26 50 22" fill="none" stroke="#B4B2A9" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="30" cy="8" rx="20" ry="6" fill="#D3D1C7"/>
    <ellipse cx="22" cy="20" rx="3" ry="8" fill="white" opacity="0.25"/>
    <text x="30" y="30" font-size="10" fill="#888780" font-weight="700" text-anchor="middle" font-family="sans-serif">2</text>
  </svg>`;

  const bronzeTrophy = `<svg viewBox="0 0 60 65" width="48" height="56">
    <rect x="18" y="56" width="24" height="5" rx="2" fill="#854F0B"/>
    <rect x="24" y="48" width="12" height="10" rx="2" fill="#633806"/>
    <path d="M 10 8 Q 6 20 10 32 L 50 32 Q 54 20 50 8 Z" fill="#F0997B"/>
    <path d="M 10 12 Q 2 18 4 26 Q 8 24 10 20" fill="none" stroke="#D85A30" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 50 12 Q 58 18 56 26 Q 52 24 50 20" fill="none" stroke="#D85A30" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="30" cy="8" rx="20" ry="6" fill="#F0997B"/>
    <ellipse cx="22" cy="18" rx="3" ry="7" fill="white" opacity="0.25"/>
    <text x="30" y="26" font-size="10" fill="#712B13" font-weight="700" text-anchor="middle" font-family="sans-serif">3</text>
  </svg>`;

  const html = `
    <div style="background:#064E3B;border-radius:16px;padding:20px 16px 0;overflow:hidden">
      <div style="text-align:center;margin-bottom:20px;padding:0 8px">
        <div style="font-size:12px;color:#9FE1CB;line-height:1.8">Kami dari Yayasan GDBUG PADEL,</div>
        <div style="font-size:12px;color:#9FE1CB;line-height:1.8">mengucapkan.....</div>
        <div style="font-size:17px;font-weight:700;color:#FAC775;margin-top:6px;line-height:1.4">SELAMAT untuk pemain tergebug minggu ini</div>
      </div>
      <div style="display:flex;align-items:flex-end;justify-content:center;gap:4px">
        <div style="display:flex;flex-direction:column;align-items:center;flex:1">
          <div style="font-size:12px;font-weight:600;color:#FFFFFF;text-align:center;margin-bottom:6px">${r2?r2.name:'-'}</div>
          ${silverTrophy}
          <div style="background:#5DCAA5;border-radius:6px 6px 0 0;width:100%;height:60px;display:flex;align-items:center;justify-content:center">
            <span style="font-size:26px;color:#04342C;font-weight:700">2</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;flex:1">
          <div style="font-size:14px;font-weight:700;color:#FAC775;text-align:center;margin-bottom:6px">${r1?r1.name:'-'}</div>
          ${goldTrophy}
          <div style="background:#0F6E56;border-radius:6px 6px 0 0;width:100%;height:90px;display:flex;align-items:center;justify-content:center">
            <span style="font-size:32px;color:#6EE7B7;font-weight:700">1</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;flex:1">
          <div style="font-size:12px;font-weight:600;color:#FFFFFF;text-align:center;margin-bottom:6px">${r3?r3.name:'-'}</div>
          ${bronzeTrophy}
          <div style="background:#5DCAA5;border-radius:6px 6px 0 0;width:100%;height:44px;display:flex;align-items:center;justify-content:center">
            <span style="font-size:20px;color:#04342C;font-weight:700">3</span>
          </div>
        </div>
      </div>
    </div>`;

  const content = document.getElementById('podium-content');
  if(content) content.innerHTML = html;
  const modal = document.getElementById('podium-modal');
  if(modal){ modal.style.display = 'block'; document.body.style.overflow = 'hidden'; }
}

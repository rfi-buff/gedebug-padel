/*
==============================================
  GeDebug Padel App - PRODUCTION
  Version : v2.0.0
  File    : js/history.js
  Module  : History - session history & edit scores
==============================================
*/

function deleteSession(histKey){
  if(!State.isAdmin){ showToast('Admin access required'); return; }
  if(!confirm('Delete this session? This cannot be undone.')) return;
  db.ref(`history/${histKey}`).remove();
  showToast('Session deleted');
}

function toggleSession(si){
  const b = document.getElementById(`sess-body-${si}`);
  const c = document.getElementById(`chev-${si}`);
  if(!b||!c) return;
  const open = b.classList.contains('open');
  b.classList.toggle('open',!open);
  c.classList.toggle('open',!open);
}

function renderHistory(){
  const body = document.getElementById('history-body');
  if(!body) return;
  const hm = document.getElementById('history-meta');
  if(hm) hm.textContent = `${State.sessionHistory.length} session${State.sessionHistory.length!==1?'s':''} completed`;
  if(!State.sessionHistory.length){
    body.innerHTML = '<div class="empty"><div class="empty-icon">📅</div><div class="empty-title">No history yet</div><div class="empty-sub">Completed sessions will appear here</div></div>';
    return;
  }
  const medals = ['🥇','🥈','🥉'];
  let html = '';
  State.sessionHistory.forEach((sess,si) => {
    const tm = sess.rounds ? sess.rounds.reduce((a,r) => a+r.courts.length, 0) : 0;
    html += `<div class="session-card">
      <div class="session-card-hd" onclick="toggleSession(${si})">
        <div style="flex:1">
          <div class="session-card-date">GeDebug Padel · ${sess.date}</div>
          <div class="session-card-meta">${sess.time} · ${sess.players?.length||0} players · ${sess.rounds?.length||0} rounds · ${tm} matches</div>
          <div class="session-card-meta" style="margin-top:2px">${sess.players?.join(', ')||''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${State.isAdmin?`<button onclick="event.stopPropagation();openEditModal(${si})" style="width:28px;height:28px;border-radius:8px;border:0.5px solid rgba(0,201,141,0.4);background:rgba(0,201,141,0.08);color:var(--green);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✏️</button>`:''}
          ${State.isAdmin?`<button onclick="event.stopPropagation();deleteSession('${sess.key}')" style="width:28px;height:28px;border-radius:8px;border:0.5px solid rgba(255,91,91,0.4);background:rgba(255,91,91,0.08);color:var(--red);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">🗑</button>`:''}
          <div class="chevron" id="chev-${si}">&#9662;</div>
        </div>
      </div>
      <div class="sess-body" id="sess-body-${si}">`;

    if(sess.ranking?.length){
      html += `<div style="padding:12px 16px 0">
        <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);margin-bottom:8px">Session Rankings</div>
        <div style="background:var(--bg3);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:4px">
          <div style="display:grid;grid-template-columns:24px 1fr 28px 28px 28px 28px 36px 32px;gap:2px;padding:6px 10px;border-bottom:0.5px solid var(--border)">
            <span style="font-size:9px;color:var(--text3)"></span><span style="font-size:9px;color:var(--text3)">Player</span>
            <span style="font-size:9px;color:var(--text3);text-align:center">GP</span><span style="font-size:9px;color:var(--text3);text-align:center">W</span>
            <span style="font-size:9px;color:var(--text3);text-align:center">L</span><span style="font-size:9px;color:var(--text3);text-align:center">D</span>
            <span style="font-size:9px;color:var(--text3);text-align:center">Score</span><span style="font-size:9px;color:var(--text3);text-align:center">Pts</span>
          </div>`;
      sess.ranking.forEach((p,i) => {
        const c = PALETTES[p.color%PALETTES.length];
        html += `<div style="display:grid;grid-template-columns:24px 1fr 28px 28px 28px 28px 36px 32px;gap:2px;padding:8px 10px;border-bottom:0.5px solid var(--border);align-items:center">
          <div style="font-size:12px;text-align:center">${medals[i]||`<span style="font-size:10px;color:var(--text3)">${i+1}</span>`}</div>
          <div style="display:flex;align-items:center;gap:5px"><div style="width:20px;height:20px;border-radius:50%;background:${c.bg};color:${c.txt};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0">${ini(p.name)}</div><span style="font-size:11px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60px">${p.name}</span></div>
          <div style="font-size:11px;color:var(--text2);text-align:center">${p.played}</div>
          <div style="font-size:11px;color:var(--green);font-weight:500;text-align:center">${p.won}</div>
          <div style="font-size:11px;color:var(--red);font-weight:500;text-align:center">${p.lost}</div>
          <div style="font-size:11px;color:var(--amber);font-weight:500;text-align:center">${p.draw}</div>
          <div style="font-size:11px;color:var(--text2);text-align:center">${p.score}</div>
          <div style="font-size:12px;font-weight:700;color:var(--text);text-align:center;font-family:'Syne',sans-serif">${p.rankPts||0}</div>
        </div>`;
      });
      html += '</div></div>';
    }

    if(sess.rounds?.length){
      html += '<div style="padding:0 16px 4px"><div style="font-family:\'Syne\',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);margin:12px 0 8px">Match Results</div></div>';
      sess.rounds.forEach((round,ri) => {
        const lbl = `Round ${ri+1}${round.isExtra?' (Extra)':''}`;
        const sit = round.sitting?.length ? ` — ${round.sitting.join(', ')} sitting out` : '';
        html += `<div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);padding:10px 16px 6px">${lbl}${sit}</div>`;
        round.courts.forEach((court,ci) => {
          const sA=court.scoreA, sB=court.scoreB;
          const isDraw=sA===sB, aWin=sA>sB, bWin=sB>sA;
          html += `<div class="hist-match">
            <div class="hist-team"><div class="hist-name">${court.teamA[0]}</div><div class="hist-name">${court.teamA[1]}</div></div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0">
              <div style="font-size:9px;color:var(--text3);margin-bottom:2px">Court ${ci+1}</div>
              <div style="display:flex;align-items:center;gap:6px">
                <div class="hist-score ${aWin?'win':isDraw?'draw':'lose'}">${sA}</div>
                <div style="font-size:12px;color:var(--text3)">–</div>
                <div class="hist-score ${bWin?'win':isDraw?'draw':'lose'}">${sB}</div>
              </div>
            </div>
            <div class="hist-team r"><div class="hist-name">${court.teamB[0]}</div><div class="hist-name">${court.teamB[1]}</div></div>
          </div>`;
        });
      });
    }
    html += '</div></div>';
  });
  body.innerHTML = html;
}

// ── Edit Scores ──
let editingSess = null;

function openEditModal(si){
  if(!State.isAdmin) return;
  editingSess = JSON.parse(JSON.stringify(State.sessionHistory[si]));
  document.getElementById('edit-modal-date').textContent = `${editingSess.date} · ${editingSess.time}`;
  renderEditModal();
  document.getElementById('edit-modal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeEditModal(){
  document.getElementById('edit-modal').style.display = 'none';
  document.body.style.overflow = '';
  editingSess = null;
}

function renderEditModal(){
  const body = document.getElementById('edit-modal-body');
  if(!body||!editingSess) return;
  let html = '';
  editingSess.rounds.forEach((round,ri) => {
    const lbl = `Round ${ri+1}${round.isExtra?' (Extra)':''}`;
    const sit = round.sitting?.length ? ` — ${round.sitting.join(', ')} sitting out` : '';
    html += `<div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#8B90A0;margin:16px 0 8px">${lbl}${sit}</div>`;
    const courts = normalizeArray(round.courts);
    courts.forEach((court,ci) => {
      const sA=court.scoreA||0, sB=court.scoreB||0;
      const teamA = normalizeArray(court.teamA).map(x => x?.name||x);
      const teamB = normalizeArray(court.teamB).map(x => x?.name||x);
      html += `<div style="background:#181C26;border:0.5px solid rgba(255,255,255,0.07);border-radius:14px;padding:14px;margin-bottom:10px">
        <div style="font-size:10px;color:#555A6B;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em">Court ${ci+1}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1">
            ${teamA[0]?`<div style="font-size:12px;font-weight:500;color:#F0F2F7;margin-bottom:3px">${teamA[0]}</div>`:''}
            ${teamA[1]?`<div style="font-size:12px;font-weight:500;color:#F0F2F7">${teamA[1]}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:center;flex-shrink:0">
            <div style="display:flex;align-items:center;gap:10px">
              <button onclick="changeHistScore(${ri},${ci},'A',-1)" style="width:32px;height:32px;border-radius:8px;background:#1F2435;border:0.5px solid rgba(255,255,255,0.13);color:#F0F2F7;font-size:20px;cursor:pointer;line-height:1">−</button>
              <div id="esc-${ri}-${ci}-A" style="font-family:'Syne',sans-serif;font-size:24px;font-weight:700;color:#00C98D;min-width:28px;text-align:center">${sA}</div>
              <button onclick="changeHistScore(${ri},${ci},'A',1)" style="width:32px;height:32px;border-radius:8px;background:#1F2435;border:0.5px solid rgba(255,255,255,0.13);color:#F0F2F7;font-size:20px;cursor:pointer;line-height:1">+</button>
            </div>
            <div style="font-size:10px;color:#555A6B">vs</div>
            <div style="display:flex;align-items:center;gap:10px">
              <button onclick="changeHistScore(${ri},${ci},'B',-1)" style="width:32px;height:32px;border-radius:8px;background:#1F2435;border:0.5px solid rgba(255,255,255,0.13);color:#F0F2F7;font-size:20px;cursor:pointer;line-height:1">−</button>
              <div id="esc-${ri}-${ci}-B" style="font-family:'Syne',sans-serif;font-size:24px;font-weight:700;color:#00C98D;min-width:28px;text-align:center">${sB}</div>
              <button onclick="changeHistScore(${ri},${ci},'B',1)" style="width:32px;height:32px;border-radius:8px;background:#1F2435;border:0.5px solid rgba(255,255,255,0.13);color:#F0F2F7;font-size:20px;cursor:pointer;line-height:1">+</button>
            </div>
          </div>
          <div style="flex:1;text-align:right">
            ${teamB[0]?`<div style="font-size:12px;font-weight:500;color:#F0F2F7;margin-bottom:3px">${teamB[0]}</div>`:''}
            ${teamB[1]?`<div style="font-size:12px;font-weight:500;color:#F0F2F7">${teamB[1]}</div>`:''}
          </div>
        </div>
      </div>`;
    });
  });
  body.innerHTML = html;
}

function changeHistScore(ri, ci, team, delta){
  if(!editingSess) return;
  const courts = normalizeArray(editingSess.rounds[ri].courts);
  const court = courts[ci];
  if(team==='A') court.scoreA = Math.max(0,(court.scoreA||0)+delta);
  else court.scoreB = Math.max(0,(court.scoreB||0)+delta);
  if(Array.isArray(editingSess.rounds[ri].courts)) editingSess.rounds[ri].courts[ci] = court;
  const el = document.getElementById(`esc-${ri}-${ci}-${team}`);
  if(el) el.textContent = team==='A' ? court.scoreA : court.scoreB;
}

function saveEditedScores(){
  if(!State.isAdmin||!editingSess) return;
  if(!confirm('Save edited scores and recalculate rankings?')) return;
  const sessionStats = {};
  (editingSess.players||[]).forEach(name => {
    const pl = State.players.find(x => x.name===name);
    sessionStats[name] = {name, color:pl?.color||0, played:0, won:0, lost:0, draw:0, score:0, rankPts:0};
  });
  editingSess.rounds.forEach(round => {
    normalizeArray(round.courts).forEach(court => {
      const sA=court.scoreA||0, sB=court.scoreB||0;
      if(sA+sB===0) return;
      const isDraw = sA===sB;
      const tA = normalizeArray(court.teamA).map(x => x?.name||x);
      const tB = normalizeArray(court.teamB).map(x => x?.name||x);
      tA.forEach(name => { const s=sessionStats[name]; if(!s) return; s.played++; if(isDraw){s.draw++;s.score+=1;} else if(sA>sB){s.won++;s.score+=3;} else s.lost++; });
      tB.forEach(name => { const s=sessionStats[name]; if(!s) return; s.played++; if(isDraw){s.draw++;s.score+=1;} else if(sB>sA){s.won++;s.score+=3;} else s.lost++; });
    });
  });
  const ranked = Object.values(sessionStats).sort((a,b) => b.score-a.score||b.won-a.won);
  ranked.forEach((s,i) => s.rankPts = getRankPts(i));
  const newRanking = ranked.map((s,i) => ({...s, weeklyRank:i+1}));
  const oldRanking = editingSess.ranking||[];
  const updates = {};
  oldRanking.forEach(r => {
    const pl = State.players.find(x => x.name===r.name); if(!pl) return;
    const cur = updates[`players/${r.name}/totalPts`]!==undefined ? updates[`players/${r.name}/totalPts`] : (pl.totalPts||0);
    updates[`players/${r.name}/totalPts`] = Math.max(0, cur-(r.rankPts||0));
  });
  newRanking.forEach(r => {
    const pl = State.players.find(x => x.name===r.name); if(!pl) return;
    const cur = updates[`players/${r.name}/totalPts`]!==undefined ? updates[`players/${r.name}/totalPts`] : (pl.totalPts||0);
    updates[`players/${r.name}/totalPts`] = cur + r.rankPts;
  });
  db.ref(`history/${editingSess.key}`).update({rounds:editingSess.rounds, ranking:newRanking});
  db.ref().update(updates);
  showToast('Scores updated & rankings recalculated!');
  closeEditModal();
}

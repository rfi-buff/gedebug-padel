/*
==============================================
  GeDebug Padel App - PRODUCTION
  Version : v2.0.0
  File    : js/rankings.js
  Module  : Rankings - live stats & season totals
==============================================
*/

function computeLiveStats(){
  const active = State.players.filter(p => p.active);
  if(!active.length) return null;
  const stats = {};
  active.forEach(p => stats[p.name] = {name:p.name,color:p.color,played:0,won:0,lost:0,draw:0,score:0,totalPts:0});
  State.rounds.forEach(round => {
    round.courts.forEach(court => {
      const sA=court.scoreA||0, sB=court.scoreB||0;
      if(sA+sB===0) return;
      const isDraw = sA===sB;
      const tA = normalizeArray(court.teamA).map(x => x?.name||x);
      const tB = normalizeArray(court.teamB).map(x => x?.name||x);
      tA.forEach(name => { const s=stats[name]; if(!s) return; s.played++; if(isDraw){s.draw++;s.score+=1;} else if(sA>sB){s.won++;s.score+=3;} else s.lost++; });
      tB.forEach(name => { const s=stats[name]; if(!s) return; s.played++; if(isDraw){s.draw++;s.score+=1;} else if(sB>sA){s.won++;s.score+=3;} else s.lost++; });
    });
  });
  const ranked = Object.values(stats).sort((a,b) => b.score-a.score||b.won-a.won);
  ranked.forEach((s,i) => s.totalPts = getRankPts(i));
  return ranked;
}

function renderRankings(){
  const medals = ['🥇','🥈','🥉'];
  const body = document.getElementById('rankings-body');
  if(!body) return;
  const sessionLabel = State.lastSessionDate ? `Session · ${State.lastSessionDate}` : 'Session';
  let h = `<div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--text);margin-bottom:14px">${sessionLabel}</div>`;

  if(State.rounds.length > 0){
    const live = computeLiveStats();
    const cm = State.rounds.reduce((a,r) => a + r.courts.filter(c => c.scoreA+c.scoreB>0).length, 0);
    const tm = State.rounds.reduce((a,r) => a + r.courts.length, 0);
    h += `<div style="background:rgba(0,201,141,0.08);border:0.5px solid rgba(0,201,141,0.3);border-radius:var(--radius);padding:12px 14px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:7px"><div style="width:7px;height:7px;border-radius:50%;background:var(--green);animation:pulse 1.4s infinite"></div><span style="font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:0.08em">Live session</span></div>
        <span style="font-size:11px;color:var(--text3)">${cm}/${tm} scored</span>
      </div>`;
    if(live?.length){
      h += `<div style="background:var(--bg2);border-radius:var(--radius-sm);overflow:hidden">
        <div style="display:grid;grid-template-columns:24px 1fr 28px 28px 28px 28px 36px;gap:2px;padding:6px 10px;border-bottom:0.5px solid var(--border)">
          <span style="font-size:9px;color:var(--text3)"></span><span style="font-size:9px;color:var(--text3)">Player</span>
          <span style="font-size:9px;color:var(--text3);text-align:center">GP</span><span style="font-size:9px;color:var(--text3);text-align:center">W</span>
          <span style="font-size:9px;color:var(--text3);text-align:center">L</span><span style="font-size:9px;color:var(--text3);text-align:center">D</span>
          <span style="font-size:9px;color:var(--text3);text-align:center">Sc</span>
        </div>`;
      live.forEach((p,i) => {
        const c = PALETTES[p.color%PALETTES.length];
        h += `<div style="display:grid;grid-template-columns:24px 1fr 28px 28px 28px 28px 36px;gap:2px;padding:8px 10px;border-bottom:0.5px solid var(--border);align-items:center">
          <div style="font-size:12px;text-align:center">${medals[i]||`<span style="font-size:10px;color:var(--text3)">${i+1}</span>`}</div>
          <div style="display:flex;align-items:center;gap:5px"><div style="width:20px;height:20px;border-radius:50%;background:${c.bg};color:${c.txt};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0">${ini(p.name)}</div><span style="font-size:11px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:65px">${p.name}</span></div>
          <div style="font-size:11px;color:var(--text2);text-align:center">${p.played}</div>
          <div style="font-size:11px;color:var(--green);font-weight:500;text-align:center">${p.won}</div>
          <div style="font-size:11px;color:var(--red);font-weight:500;text-align:center">${p.lost}</div>
          <div style="font-size:11px;color:var(--amber);font-weight:500;text-align:center">${p.draw}</div>
          <div style="font-size:11px;color:var(--text2);text-align:center">${p.score}</div>
        </div>`;
      });
      h += '</div>';
    } else {
      h += '<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px 0">Score matches to see live rankings</div>';
    }
    h += '</div>';
  }

  const sorted = State.players.filter(p => p.played>0).sort((a,b) => b.totalPts-a.totalPts||b.score-a.score);
  if(sorted.length){
    h += `<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Season total</div>
      <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:12px">
      <div class="rank-hd"><span></span><span style="text-align:left">Player</span><span>GP</span><span>W</span><span>L</span><span>D</span><span>Score</span></div>`;
    sorted.forEach((p,i) => {
      h += `<div class="rank-row-item">
        <div class="rank-cell" style="font-size:14px">${medals[i]||`<span style="font-size:11px;color:var(--text3)">${i+1}</span>`}</div>
        <div class="rank-cell player">${avEl(p,22)}<span class="rank-name">${p.name}</span></div>
        <div class="rank-cell">${p.played}</div><div class="rank-cell won">${p.won}</div>
        <div class="rank-cell lost">${p.lost}</div><div class="rank-cell draw">${p.draw}</div>
        <div class="rank-cell">${p.score}</div>
      </div>`;
    });
    h += `</div><div style="font-size:10px;color:var(--text3);text-align:center;padding-bottom:8px">GP · W · L · D · Score</div>`;
  } else if(!State.rounds.length){
    h += '<div class="empty"><div class="empty-icon">🏆</div><div class="empty-title">No data yet</div><div class="empty-sub">Complete a session to see rankings</div></div>';
  }

  body.innerHTML = h;
  const rb = document.getElementById('admin-reset-btn');
  if(rb) rb.style.display = State.isAdmin ? 'block' : 'none';
}

function resetAll(){
  if(!State.isAdmin){ showToast('Admin access required'); return; }
  if(!confirm('Reset ALL stats and history?\n\nThis will clear:\n• All player stats\n• All session history\n• Current active session\n\nThis cannot be undone!')) return;
  if(!confirm('Final confirmation — are you sure?')) return;
  const updates = {};
  State.players.forEach(p => {
    ['played','won','lost','draw','score','totalPts'].forEach(f => updates[`players/${p.name}/${f}`]=0);
    updates[`players/${p.name}/active`] = false;
  });
  db.ref().update(updates);
  db.ref('history').remove();
  db.ref('session').remove();
  State.lastSessionDate = '';
  showToast('All stats and history reset!');
}

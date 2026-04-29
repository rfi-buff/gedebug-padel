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

  let h = '';

  // ── THIS WEEK'S RANKING ──
  h += `<div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;display:flex;align-items:center;gap:7px">
    <div style="width:7px;height:7px;border-radius:50%;background:var(--green);animation:pulse 1.4s infinite"></div>
    This Week's Ranking
  </div>`;

  if(State.rounds.length > 0){
    const live = computeLiveStats();
    const cm = State.rounds.reduce((a,r) => a + r.courts.filter(c => c.scoreA+c.scoreB>0).length, 0);
    const tm = State.rounds.reduce((a,r) => a + r.courts.length, 0);

    h += `<div style="background:var(--bg2);border:0.5px solid rgba(0,201,141,0.25);border-radius:var(--radius);overflow:hidden;margin-bottom:20px">
      <div style="padding:10px 14px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:11px;color:var(--text2)">Win=3pts · Draw=1pt · Loss=0</span>
        <span style="font-size:11px;color:var(--text3)">${cm}/${tm} scored</span>
      </div>`;

    if(live?.length){
      h += `<div style="display:grid;grid-template-columns:24px 1fr 30px 30px 30px 30px;gap:2px;padding:6px 12px;border-bottom:0.5px solid var(--border)">
        <span></span>
        <span style="font-size:9px;color:var(--text3)">Player</span>
        <span style="font-size:9px;color:var(--text3);text-align:center">Sc</span>
        <span style="font-size:9px;color:var(--green);text-align:center">W</span>
        <span style="font-size:9px;color:var(--red);text-align:center">L</span>
        <span style="font-size:9px;color:var(--amber);text-align:center">D</span>
      </div>`;
      live.forEach((p,i) => {
        const c = PALETTES[p.color%PALETTES.length];
        h += `<div style="display:grid;grid-template-columns:24px 1fr 30px 30px 30px 30px;gap:2px;padding:9px 12px;border-bottom:0.5px solid var(--border);align-items:center">
          <span style="font-size:13px">${medals[i]||`<span style="font-size:11px;color:var(--text3)">${i+1}</span>`}</span>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:22px;height:22px;border-radius:50%;background:${c.bg};color:${c.txt};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">${ini(p.name)}</div>
            <span style="font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px">${p.name}</span>
          </div>
          <span style="font-size:12px;color:var(--text2);text-align:center">${p.score}</span>
          <span style="font-size:12px;color:var(--green);font-weight:500;text-align:center">${p.won}</span>
          <span style="font-size:12px;color:var(--red);font-weight:500;text-align:center">${p.lost}</span>
          <span style="font-size:12px;color:var(--amber);font-weight:500;text-align:center">${p.draw}</span>
        </div>`;
      });
    } else {
      h += `<div style="padding:16px;text-align:center;font-size:12px;color:var(--text3)">Start matches to see live rankings</div>`;
    }
    h += `</div>`;
  } else {
    h += `<div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--radius);padding:24px;text-align:center;margin-bottom:20px">
      <div style="font-size:28px;margin-bottom:8px">📋</div>
      <div style="font-size:13px;color:var(--text3)">No active session this week</div>
    </div>`;
  }

  // ── ALL SESSIONS RANKING ──
  h += `<div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;display:flex;align-items:center;gap:7px">
    <div style="width:7px;height:7px;border-radius:50%;background:var(--text3)"></div>
    All Sessions Ranking
  </div>`;

  // Calculate all-session totals from history
  const allStats = {};
  State.sessionHistory.forEach(sess => {
    if(!sess.ranking) return;
    sess.ranking.forEach(r => {
      if(!allStats[r.name]) allStats[r.name] = {name:r.name, color:r.color||0, totalPts:0, sessions:0};
      allStats[r.name].totalPts += (r.rankPts||0);
      allStats[r.name].sessions += 1;
    });
  });

  const allRanked = Object.values(allStats).sort((a,b) => b.totalPts-a.totalPts);

  if(allRanked.length){
    h += `<div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:12px">
      <div style="padding:10px 14px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:11px;color:var(--text2)">1st=10pts · 2nd=8pts · 3rd=6pts · 4th-10th=5pts</span>
      </div>
      <div style="display:grid;grid-template-columns:24px 1fr 50px 46px;gap:2px;padding:6px 12px;border-bottom:0.5px solid var(--border)">
        <span></span>
        <span style="font-size:9px;color:var(--text3)">Player</span>
        <span style="font-size:9px;color:var(--text3);text-align:center">Sessions</span>
        <span style="font-size:9px;color:var(--green);text-align:center">Total Pts</span>
      </div>`;
    allRanked.forEach((p,i) => {
      const c = PALETTES[p.color%PALETTES.length];
      h += `<div style="display:grid;grid-template-columns:24px 1fr 50px 46px;gap:2px;padding:9px 12px;border-bottom:0.5px solid var(--border);align-items:center">
        <span style="font-size:13px">${medals[i]||`<span style="font-size:11px;color:var(--text3)">${i+1}</span>`}</span>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:22px;height:22px;border-radius:50%;background:${c.bg};color:${c.txt};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">${ini(p.name)}</div>
          <span style="font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px">${p.name}</span>
        </div>
        <span style="font-size:11px;color:var(--text3);text-align:center">${p.sessions} sess</span>
        <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--green);text-align:center">${p.totalPts}</span>
      </div>`;
    });
    h += `</div>`;
  } else {
    h += `<div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--radius);padding:24px;text-align:center;margin-bottom:12px">
      <div style="font-size:28px;margin-bottom:8px">🏆</div>
      <div style="font-size:13px;color:var(--text3)">No sessions completed yet</div>
    </div>`;
  }

  // Admin reset button
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

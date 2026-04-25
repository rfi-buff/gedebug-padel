/*
==============================================
  GeDebug Padel App - PRODUCTION
  Version : v2.0.0
  File    : js/players.js
  Module  : Players - swipe cards, stats, photo upload
==============================================
*/

let prPlayers = [];
let prIndex = 0;

function renderPlayerRanks(){
  const wrap = document.getElementById('pr-swipe-wrap');
  if(!wrap) return;
  const allPlayers = State.players.slice().sort((a,b) => (b.totalPts||0)-(a.totalPts||0));
  prPlayers = allPlayers;
  if(!prPlayers.length){
    wrap.innerHTML = '<div class="empty" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><div class="empty-icon">🏅</div><div class="empty-title">No players yet</div><div class="empty-sub">Add players to see their cards</div></div>';
    document.getElementById('pr-dots').innerHTML = '';
    document.getElementById('pr-counter').textContent = '';
    return;
  }
  prIndex = 0;
  renderPrCard();
  renderPrDots();
  initPrSwipe();
}

function renderPrCard(){
  const wrap = document.getElementById('pr-swipe-wrap');
  if(!wrap||!prPlayers.length) return;
  const p = prPlayers[prIndex];
  const c = PALETTES[p.color%PALETTES.length];
  const extra = State.playerExtras[p.name]||{};
  const rank = prIndex;
  const rankLabel = rank >= 0 ? `#${rank+1}` : '-';
  const rankMedal = rank===0?'🥇':rank===1?'🥈':rank===2?'🥉':'';

  // Cumulative stats from history
  let histGP=0, histWon=0, histLost=0, histDraw=0;
  State.sessionHistory.forEach(sess => {
    if(!sess.ranking) return;
    sess.ranking.forEach(r => {
      if(r.name===p.name){ histGP+=(r.played||0); histWon+=(r.won||0); histLost+=(r.lost||0); histDraw+=(r.draw||0); }
    });
  });

  // Titles from history
  const weeklyTitles = State.sessionHistory.reduce((count,sess) => {
    if(!sess.ranking?.length) return count;
    return count + (sess.ranking[0]?.name===p.name ? 1 : 0);
  }, 0);

  // Best partner
  const pairStats = {};
  State.sessionHistory.forEach(sess => {
    if(!sess.rounds) return;
    sess.rounds.forEach(round => {
      if(!round.courts) return;
      normalizeArray(round.courts).forEach(court => {
        const sA=court.scoreA||0, sB=court.scoreB||0;
        if(sA+sB===0) return;
        const tA = normalizeArray(court.teamA).map(x => x?.name||x).filter(x => x && typeof x==='string');
        const tB = normalizeArray(court.teamB).map(x => x?.name||x).filter(x => x && typeof x==='string');
        const recordPair = (team, won) => {
          if(team.length<2) return;
          const k = pairKey(team[0],team[1]);
          if(!pairStats[k]) pairStats[k]={games:0,wins:0};
          pairStats[k].games++;
          if(won) pairStats[k].wins++;
        };
        recordPair(tA, sA>sB);
        recordPair(tB, sB>sA);
      });
    });
  });
  let bestPct=0, bestPartners=[];
  Object.keys(pairStats).forEach(key => {
    const names = key.split('|');
    if(!names.includes(p.name)) return;
    const s = pairStats[key];
    if(s.games<2) return;
    const partnerName = names[0]===p.name ? names[1] : names[0];
    if(!partnerName||partnerName==='undefined') return;
    const pct = Math.round(s.wins/s.games*100);
    if(pct>bestPct){ bestPct=pct; bestPartners=[{name:partnerName,wins:s.wins,games:s.games,pct}]; }
    else if(pct===bestPct){ bestPartners.push({name:partnerName,wins:s.wins,games:s.games,pct}); }
  });

  const photoHTML = extra.photoURL
    ? `<img src="${extra.photoURL}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2.5px solid var(--green);flex-shrink:0">`
    : `<div style="width:56px;height:56px;border-radius:50%;background:${c.bg};color:${c.txt};display:flex;align-items:center;justify-content:center;font-family:Syne,sans-serif;font-size:18px;font-weight:800;border:2.5px solid var(--green);flex-shrink:0">${ini(p.name)}</div>`;

  const html = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 4px;overflow:hidden">
    <div style="width:100%;background:var(--bg2);border:0.5px solid var(--border);border-radius:24px;padding:20px;box-shadow:0 0 40px rgba(0,0,0,0.3)">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div style="position:relative;flex-shrink:0">
          ${photoHTML}
          ${State.currentUser?`<label for="photo-upload-${prIndex}" style="position:absolute;bottom:0;right:0;width:20px;height:20px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px">📷</label>
          <input type="file" id="photo-upload-${prIndex}" accept="image/*" style="display:none" onchange="uploadPlayerPhoto('${p.name}',this)">`:'' }
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rankMedal?rankMedal+' ':''}${p.name}</div>
          ${p.totalPts>0?`<div style="font-size:12px;font-weight:600;color:var(--green);margin-top:2px">Rank ${rankLabel}</div>`:`<div style="font-size:12px;color:var(--text3);margin-top:2px">Not yet ranked</div>`}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div style="background:var(--bg3);border-radius:12px;padding:12px 8px;text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--green)">${p.totalPts||0}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:3px;text-transform:uppercase;letter-spacing:0.05em">Total Pts</div>
        </div>
        <div style="background:var(--bg3);border-radius:12px;padding:12px 8px;text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--amber)">${weeklyTitles}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:3px;text-transform:uppercase;letter-spacing:0.05em">Titles</div>
        </div>
      </div>
      <div style="display:flex;border:0.5px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:12px">
        <div style="flex:1;padding:10px;border-right:0.5px solid var(--border);text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:var(--green)">${histWon}</div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Won</div>
        </div>
        <div style="flex:1;padding:10px;border-right:0.5px solid var(--border);text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:var(--red)">${histLost}</div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Lost</div>
        </div>
        <div style="flex:1;padding:10px;text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:var(--amber)">${histDraw}</div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Draw</div>
        </div>
      </div>
      <div style="display:flex;justify-content:center;gap:32px;margin-bottom:12px">
        <div style="text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--text)">${histGP}</div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.04em">Games Played</div>
        </div>
        <div style="text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--green)">${histGP?Math.round(histWon/histGP*100):0}%</div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.04em">Win %</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg3);border-radius:12px;padding:10px 14px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:14px">🎾</span><span style="font-size:12px;font-weight:500;color:var(--text2)">Side Preference</span></div>
        ${State.isAdmin
          ? `<select onchange="saveSidePref('${p.name}',this.value)" style="background:var(--bg2);border:0.5px solid var(--border2);border-radius:8px;padding:5px 10px;color:var(--text);font-size:13px;cursor:pointer;outline:none">
              <option value="" ${!extra.sidePref?'selected':''}>Not set</option>
              <option value="Right" ${extra.sidePref==='Right'?'selected':''}>Right</option>
              <option value="Left" ${extra.sidePref==='Left'?'selected':''}>Left</option>
              <option value="Mix" ${extra.sidePref==='Mix'?'selected':''}>Mix</option>
            </select>`
          : `<span style="font-size:13px;font-weight:600;color:var(--text)">${extra.sidePref||'Not set'}</span>`}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg3);border-radius:12px;padding:10px 14px">
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0"><span style="font-size:14px">🤝</span><span style="font-size:12px;font-weight:500;color:var(--text2)">Best Partner</span></div>
        ${bestPartners.length>0
          ? `<span style="font-size:13px;font-weight:600;color:var(--green);text-align:right">${bestPartners.map(b=>b.name).join(' | ')} <span style="font-size:11px;color:var(--text3);font-weight:400">${bestPct}%</span></span>`
          : '<span style="font-size:12px;color:var(--text3)">No data yet</span>'}
      </div>
    </div>
  </div>`;

  wrap.innerHTML = html;
  document.getElementById('pr-counter').textContent = `${prIndex+1} / ${prPlayers.length}`;
  document.getElementById('playerranks-sub').textContent = `Player Ranks · ${prIndex+1} of ${prPlayers.length}`;
  renderPrDots();
}

function renderPrDots(){
  const dotsEl = document.getElementById('pr-dots');
  if(!dotsEl) return;
  dotsEl.innerHTML = prPlayers.map((_,i) =>
    `<div style="width:${i===prIndex?'20':'7'}px;height:7px;border-radius:4px;background:${i===prIndex?'var(--green)':'var(--border2)'};transition:all 0.2s"></div>`
  ).join('');
}

function prGoTo(i){
  prIndex = (i+prPlayers.length)%prPlayers.length;
  renderPrCard();
}

function prSwipe(dir){ prGoTo(prIndex+dir); }

function initPrSwipe(){
  const wrap = document.getElementById('pr-swipe-wrap');
  if(!wrap) return;
  let startX=0; let isDragging=false;
  wrap.addEventListener('touchstart', e => { startX=e.touches[0].clientX; isDragging=true; },{passive:true});
  wrap.addEventListener('touchend', e => {
    if(!isDragging) return;
    const dx = e.changedTouches[0].clientX-startX;
    if(Math.abs(dx)>40) prSwipe(dx<0?1:-1);
    isDragging=false;
  },{passive:true});
  wrap.addEventListener('mousedown', e => { startX=e.clientX; isDragging=true; });
  wrap.addEventListener('mouseup', e => {
    if(!isDragging) return;
    const dx = e.clientX-startX;
    if(Math.abs(dx)>40) prSwipe(dx<0?1:-1);
    isDragging=false;
  });
}

function saveSidePref(name, val){
  if(!State.isAdmin) return;
  db.ref(`playerExtras/${name}/sidePref`).set(val);
  showToast(`${name} side preference saved!`);
}

function uploadPlayerPhoto(name, input){
  if(!State.currentUser){ showToast('Please sign in first'); return; }
  const file = input.files[0];
  if(!file) return;
  if(file.size>2*1024*1024){ showToast('Photo too large — max 2MB'); return; }
  showToast('Uploading...');
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max=300; let w=img.width, h=img.height;
      if(w>h){if(w>max){h=Math.round(h*max/w);w=max;}}else{if(h>max){w=Math.round(w*max/h);h=max;}}
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      const compressed = canvas.toDataURL('image/jpeg',0.7);
      db.ref(`playerExtras/${name}/photoURL`).set(compressed, err => {
        if(err) showToast('Upload failed');
        else { showToast('Photo saved!'); renderPrCard(); }
      });
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

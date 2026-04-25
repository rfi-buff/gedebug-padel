/*
==============================================
  GeDebug Padel App - PRODUCTION
  Version : v2.0.0
  File    : js/app.js
  Module  : App - Firebase listeners & navigation
==============================================
*/

// ── Navigation ──
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const screen = document.getElementById(`sc-${id}`);
  const nav = document.getElementById(`nav-${id}`);
  if(screen) screen.classList.add('active');
  if(nav) nav.classList.add('active');
  if(id==='rankings') renderRankings();
  if(id==='history') renderHistory();
  if(id==='admin') renderAdminList();
  if(id==='playerranks') renderPlayerRanks();
}

// ── Seed default players ──
function seedDefaultPlayers(){
  db.ref('players').once('value', snap => {
    if(!snap.val()){
      const u = {};
      DEFAULT_PLAYERS.forEach((name,i) => {
        u[`players/${name}`] = {name,color:i,order:i,played:0,won:0,lost:0,draw:0,score:0,totalPts:0,active:false};
      });
      u['admins/rf_ismet39@gmail_com'] = {email:'rf.ismet39@gmail.com',name:'Admin',addedAt:Date.now()};
      db.ref().update(u, () => showToast('Welcome to GeDebug Padel!'));
    } else {
      db.ref('admins/rf_ismet39@gmail_com').once('value', s => {
        if(!s.val()) db.ref('admins/rf_ismet39@gmail_com').set({email:'rf.ismet39@gmail.com',name:'Admin',addedAt:Date.now()});
      });
    }
  });
}

// ── Firebase Listeners ──
function initFirebaseListeners(){
  if(State.isFirebaseInited) return;
  State.isFirebaseInited = true;

  db.ref('.info/connected').on('value', snap => {
    const c = snap.val()===true;
    const d = document.getElementById('sync-dot');
    if(d){ c ? d.classList.remove('off') : d.classList.add('off'); }
  });

  db.ref('players').on('value', snap => {
    const data = snap.val();
    State.players = data ? Object.values(data).sort((a,b) => a.order-b.order) : [];
    renderPills();
    renderRankings();
    renderPlayerRanks();
  });

  db.ref('session/rounds').on('value', snap => {
    const data = snap.val();
    State.rounds = normalizeArray(data).map(round => {
      if(!round) return round;
      const courts = normalizeArray(round.courts).map(c => {
        if(!c) return c;
        return {
          teamA:normalizeArray(c.teamA), teamB:normalizeArray(c.teamB),
          scoreA:c.scoreA||0, scoreB:c.scoreB||0,
          status:c.status||'waiting', locked:c.locked||false
        };
      });
      return {courts, sitting:normalizeArray(round.sitting), isExtra:round.isExtra||false, locked:round.locked||false, status:round.status||'waiting'};
    });
    renderSession();
    renderRankings();
    const lb = document.getElementById('live-badge');
    if(lb) lb.style.display = State.rounds.length ? 'inline-block' : 'none';
    // Show session actions for all logged-in users
    const sa = document.getElementById('session-actions');
    if(sa) sa.style.display = (State.currentUser && State.rounds.length) ? 'flex' : 'none';
    applyRoleUI();
  });

  db.ref('history').on('value', snap => {
    const data = snap.val();
    if(data){
      State.sessionHistory = Object.keys(data).map(k => { const s=data[k]; s.key=k; return s; })
        .sort((a,b) => b.timestamp-a.timestamp)
        .map(normalizeSession);
      if(State.sessionHistory.length) State.lastSessionDate = State.sessionHistory[0].date;
    } else { State.sessionHistory = []; }
    renderHistory();
    renderRankings();
    renderPlayerRanks();
  });

  db.ref('admins').on('value', snap => {
    State.authorizedAdmins = snap.val()||{};
    renderAdminList();
    if(State.currentUser){
      const key = State.currentUser.email.replace(/\./g,'_');
      const wasAdmin = State.isAdmin;
      State.isAdmin = !!State.authorizedAdmins[key];
      if(wasAdmin!==State.isAdmin) applyRoleUI();
    }
  });

  db.ref('playerExtras').on('value', snap => {
    State.playerExtras = snap.val()||{};
    renderPlayerRanks();
  });

  const topDate = document.getElementById('top-date');
  if(topDate) topDate.textContent = dateStr;

  seedDefaultPlayers();
}

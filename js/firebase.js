/*
==============================================
  GeDebug Padel App - PRODUCTION
  Version : v2.0.0
  File    : js/firebase.js
  Module  : Firebase config, init & shared state
==============================================
*/

// ── Firebase Config (DEV) ──
const firebaseConfig = {
  apiKey: "AIzaSyBaH0pdJ2T7VQHkec0d0YlGbCDzAtb-Sbc",
  authDomain: "gedebug-padel.firebaseapp.com",
  databaseURL: "https://gedebug-padel-default-rtdb.firebaseio.com",
  projectId: "gedebug-padel",
  storageBucket: "gedebug-padel.firebasestorage.app",
  messagingSenderId: "505481870409",
  appId: "1:505481870409:web:00345cd3c1a1082c8f4d5d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
auth.useDeviceLanguage();

// ── Shared State ──
const State = {
  players: [],
  rounds: [],
  sessionHistory: [],
  playerExtras: {},
  authorizedAdmins: {},
  lastSessionDate: '',
  isAdmin: false,
  isGuest: false,
  currentUser: null,
  isLight: false,
  isFirebaseInited: false,
  sessionGeneratedBy: null
};

// ── Palettes ──
const PALETTES = [
  {bg:'#1a3a5c',txt:'#7EC8F0'},{bg:'#1a3d2b',txt:'#5ECC8A'},
  {bg:'#3d2a1a',txt:'#F0A05E'},{bg:'#3a1a2e',txt:'#D87EBF'},
  {bg:'#2a1a3d',txt:'#A07EF0'},{bg:'#3d1a1a',txt:'#F07E7E'},
  {bg:'#1a3a35',txt:'#5EC8BE'},{bg:'#3a2e1a',txt:'#D4B05E'},
  {bg:'#1a2a3d',txt:'#5E8AF0'},{bg:'#2d3a1a',txt:'#9AC85E'}
];

const DEFAULT_PLAYERS = ['Rizky','Made','Hendro','Firdaus','Nazar','Farid','Aris','Hari','Uray','LBP'];
const dateStr = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

// ── Utility functions ──
function ini(n){ return n.slice(0,2).toUpperCase(); }

function avEl(p, size){
  const c = PALETTES[p.color % PALETTES.length];
  return `<div class="mini-av" style="width:${size}px;height:${size}px;background:${c.bg};color:${c.txt}">${ini(p.name)}</div>`;
}

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function normalizeArray(data){
  if(!data) return [];
  if(Array.isArray(data)) return data;
  return Object.keys(data).sort((a,b) => Number(a)-Number(b)).map(k => data[k]);
}

function normalizeSession(sess){
  if(sess.rounds && !Array.isArray(sess.rounds)){
    sess.rounds = normalizeArray(sess.rounds).map(r => {
      if(!r) return r;
      return { courts: normalizeArray(r.courts), sitting: normalizeArray(r.sitting), isExtra: r.isExtra||false };
    });
  }
  if(sess.players && !Array.isArray(sess.players)) sess.players = Object.values(sess.players);
  if(sess.ranking && !Array.isArray(sess.ranking)) sess.ranking = Object.values(sess.ranking);
  return sess;
}

function getRankPts(rank){
  if(rank===0) return 10;
  if(rank===1) return 8;
  if(rank===2) return 6;
  return 5;
}

function pairKey(a, b){ return [a,b].sort().join('|'); }

function canSaveSession(){
  if(!State.currentUser) return false;
  if(State.isAdmin) return true;
  if(!State.sessionGeneratedBy) return false;
  return State.sessionGeneratedBy === State.currentUser.email;
}

function toggleTheme(){
  State.isLight = !State.isLight;
  document.body.classList.toggle('light', State.isLight);
  const icon = State.isLight ? '☀️' : '🌙';
  document.querySelectorAll('.theme-btn').forEach(b => b.textContent = icon);
}

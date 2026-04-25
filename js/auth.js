/*
==============================================
  GeDebug Padel App - PRODUCTION
  Version : v2.0.0
  File    : js/auth.js
  Module  : Authentication - login/logout
==============================================
*/

let authMode = 'signin';

function showAuth(){
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('main-app').style.display = 'none';
}

function hideAuth(){
  document.getElementById('auth-screen').style.display = 'none';
  const app = document.getElementById('main-app');
  app.style.display = 'flex';
  app.style.height = '100%';
}

function toggleAuthMode(){
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  document.getElementById('auth-submit-btn').textContent = authMode === 'signin' ? 'Sign in' : 'Create account';
  document.getElementById('auth-toggle-text').innerHTML = authMode === 'signin'
    ? 'Don\'t have an account? <span onclick="toggleAuthMode()">Sign up</span>'
    : 'Already have an account? <span onclick="toggleAuthMode()">Sign in</span>';
  document.getElementById('auth-err').textContent = '';
}

function signInGoogle(){
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(e => {
    if(e.code==='auth/popup-blocked'||e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request'){
      auth.signInWithRedirect(provider);
    } else {
      document.getElementById('auth-err').textContent = e.message;
    }
  });
}

function signInEmail(){
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-password').value;
  if(!email || !pass){ document.getElementById('auth-err').textContent = 'Please enter email and password.'; return; }
  const fn = authMode === 'signin'
    ? auth.signInWithEmailAndPassword.bind(auth)
    : auth.createUserWithEmailAndPassword.bind(auth);
  fn(email, pass).catch(e => {
    document.getElementById('auth-err').textContent = e.message;
  });
}

function signOut(){
  auth.signOut();
  State.isGuest = false;
  showAuth();
}

function continueAsGuest(){
  State.isGuest = true;
  State.isAdmin = false;
  State.currentUser = null;
  hideAuth();
  applyRoleUI();
  initFirebaseListeners();
}

// ── Auth state listener ──
auth.onAuthStateChanged(user => {
  if(user){
    State.currentUser = user;
    State.isGuest = false;
    const emailKey = user.email.replace(/\./g,'_');
    db.ref('admins').once('value', snap => {
      const admins = snap.val() || {};
      State.isAdmin = !!admins[emailKey];
      hideAuth();
      applyRoleUI();
      if(!State.isFirebaseInited) initFirebaseListeners();
    });
  } else if(!State.isGuest){
    showAuth();
  }
});

// Handle redirect result
auth.getRedirectResult().catch(e => {
  if(e && e.message) document.getElementById('auth-err').textContent = e.message;
});

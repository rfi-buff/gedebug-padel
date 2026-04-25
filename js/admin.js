/*
==============================================
  GeDebug Padel App - PRODUCTION
  Version : v2.0.0
  File    : js/admin.js
  Module  : Admin - panel & user management
==============================================
*/

function renderAdminList(){
  const list = document.getElementById('admin-list');
  if(!list) return;
  const keys = Object.keys(State.authorizedAdmins);
  if(!keys.length){ list.innerHTML = '<div style="font-size:13px;color:var(--text3)">No admins yet</div>'; return; }
  list.innerHTML = keys.map(k => {
    const a = State.authorizedAdmins[k];
    const isSelf = State.currentUser && a.email === State.currentUser.email;
    return `<div class="admin-row">
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--text)">${a.email}</div>
        ${a.name?`<div style="font-size:11px;color:var(--text3)">${a.name}</div>`:''}
      </div>
      ${isSelf?'<span style="font-size:11px;color:var(--text3)">You</span>':
        `<button onclick="removeAdmin('${k}')" style="font-size:12px;color:var(--red);background:none;border:none;cursor:pointer">Remove</button>`}
    </div>`;
  }).join('');
}

function addAdmin(){
  const email = document.getElementById('new-admin-email').value.trim().toLowerCase();
  if(!email||!email.includes('@')){ showToast('Enter a valid email'); return; }
  const key = email.replace(/\./g,'_');
  db.ref(`admins/${key}`).set({email, addedAt:Date.now()});
  document.getElementById('new-admin-email').value = '';
  showToast(`${email} added as admin!`);
}

function removeAdmin(key){
  const a = State.authorizedAdmins[key];
  if(a?.email==='rf.ismet39@gmail.com'){ showToast('Cannot remove super admin'); return; }
  if(!confirm('Remove this admin?')) return;
  db.ref(`admins/${key}`).remove();
}

function applyRoleUI(){
  // Register actions — logged-in users only
  const registerActions = document.getElementById('admin-register-actions');
  if(registerActions) registerActions.style.display = State.currentUser ? 'block' : 'none';

  // Session action buttons
  ['btn-add-round','btn-save'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = 'block';
  });

  // Reset button — admin only
  const rb = document.getElementById('admin-reset-btn');
  if(rb) rb.style.display = State.isAdmin ? 'block' : 'none';

  // View only bar — guests only
  const vob = document.getElementById('view-only-bar');
  if(vob) vob.style.display = State.isGuest ? 'flex' : 'none';

  // Admin nav tab
  const adminNav = document.getElementById('nav-admin');
  if(adminNav) adminNav.style.display = State.isAdmin ? 'flex' : 'none';

  // Session actions — all logged-in users
  const sa = document.getElementById('session-actions');
  if(sa) sa.style.display = (State.currentUser && State.rounds.length) ? 'flex' : 'none';

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if(logoutBtn) logoutBtn.style.display = State.currentUser ? 'flex' : 'none';

  // User badge
  const badge = document.getElementById('user-badge');
  if(badge){
    if(State.isAdmin) badge.innerHTML = '<span class="admin-badge">Admin</span>';
    else if(State.isGuest) badge.innerHTML = '<span style="font-size:10px;color:var(--text3)">Guest</span>';
    else badge.innerHTML = '';
  }

  // Admin panel user info
  if(State.currentUser){
    const info = document.getElementById('admin-user-info');
    if(info) info.textContent = `${State.currentUser.displayName||State.currentUser.email} (${State.currentUser.email})`;
  }
}

import { supabase } from './supabaseClient.js';

const loginCard = document.getElementById('loginCard');
const dashboardView = document.getElementById('dashboardView');
const navAuthed = document.getElementById('navAuthed');
const staffMeta = document.getElementById('staffMeta');
const loginForm = document.getElementById('loginForm');
const loginSubmit = document.getElementById('loginSubmit');
const toggleSignup = document.getElementById('toggleSignup');
const hospitalField = document.getElementById('hospitalField');
const hospitalName = document.getElementById('hospitalName');
const logoutBtn = document.getElementById('logoutBtn');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');
const flaggedList = document.getElementById('flaggedList');
const allList = document.getElementById('allList');

let signupMode = false;

function showError(msg) {
  errorMessage.textContent = msg;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
}

function patientRow(p) {
  const a = document.createElement('a');
  a.className = 'patient-row' + (p.status === 'flagged' ? ' flagged' : '');
  a.href = `./patient-timeline.html?id=${encodeURIComponent(p.id)}`;
  a.innerHTML = `
    <div>
      <strong>${escapeHtml(p.name)}</strong>
      <span>${escapeHtml(p.diagnosis || '')}${p.whatsapp_number ? ' · ' + escapeHtml(p.whatsapp_number) : ''}</span>
    </div>
    ${p.status === 'flagged' ? '<span class="badge-flag">FLAGGED</span>' : ''}
  `;
  return a;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

async function loadPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('id, name, whatsapp_number, diagnosis, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    flaggedList.innerHTML = `<p class="empty-note">${escapeHtml(error.message)}</p>`;
    allList.innerHTML = '';
    return;
  }

  const patients = data || [];
  const flagged = patients.filter((p) => p.status === 'flagged');

  flaggedList.innerHTML = '';
  allList.innerHTML = '';

  if (!flagged.length) {
    flaggedList.innerHTML = '<p class="empty-note">No flagged patients.</p>';
  } else {
    flagged.forEach((p) => flaggedList.appendChild(patientRow(p)));
  }

  if (!patients.length) {
    allList.innerHTML = '<p class="empty-note">No patients yet. Add one at discharge.</p>';
  } else {
    patients.forEach((p) => allList.appendChild(patientRow(p)));
  }
}

async function ensureStaff(session) {
  const { data } = await supabase
    .from('staff')
    .select('id')
    .eq('id', session.user.id)
    .maybeSingle();
  if (data) return;
  await supabase.from('staff').insert({
    id: session.user.id,
    email: session.user.email,
    hospital_name: session.user.user_metadata?.hospital_name || 'My Hospital',
    hospital_id: session.user.id
  });
}

async function showDashboard(session) {
  loginCard.hidden = true;
  dashboardView.hidden = false;
  navAuthed.hidden = false;
  staffMeta.textContent = session.user.email || '';
  await ensureStaff(session);
  await loadPatients();
}

function showLogin() {
  loginCard.hidden = false;
  dashboardView.hidden = true;
  navAuthed.hidden = true;
}

toggleSignup.addEventListener('click', () => {
  signupMode = !signupMode;
  hospitalField.hidden = !signupMode;
  loginSubmit.textContent = signupMode ? 'Create staff account' : 'Log in';
  toggleSignup.textContent = signupMode ? 'Already have an account? Log in' : 'Need an account? Sign up';
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    if (signupMode) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { hospital_name: hospitalName.value.trim() || 'My Hospital' } }
      });
      if (error) throw error;
      if (!data.session) {
        errorMessage.textContent = 'Account created. Confirm your email if required, then log in.';
        errorBox.classList.remove('hidden');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    showError(err.message || 'Login failed.');
  }
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session) showDashboard(session);
  else showLogin();
});

async function init() {
  const { data: initial } = await supabase.auth.getSession();
  if (initial?.session) showDashboard(initial.session);
  else showLogin();
}

init();

import { supabase, isSupabaseConfigured, getSession, apiPost } from './supabaseClient.js';

/* =========================================================================
   1. SAMPLE MOCK DATA & PERSISTENCE
   ========================================================================= */
const DEFAULT_PATIENTS = [
  {
    id: 'patient-sanah',
    name: 'Sanah',
    email: 'sanahmerlinb.s2029@cs.ajce.in',
    whatsapp_number: 'sanahmerlinb.s2029@cs.ajce.in',
    diagnosis: 'gastric issues (Gastritis & Reflux Monitoring)',
    risk_factors: 'Gastric issues, Assigned to Nurse 1',
    assigned_nurse: 'Nurse 1',
    status: 'active',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    medicines: [
      { drug_name: 'Pantoprazole', strength: '40 mg', frequency: 'Once daily before breakfast', instructions: 'Take 30 mins before food' },
      { drug_name: 'Sucralfate', strength: '1 g', frequency: 'Three times daily before meals', instructions: 'Gastric mucosa protection' }
    ],
    responses: [
      {
        id: 'resp-sanah-1',
        question: 'CareAfter Clinical Recovery Check-in from Nurse 1 regarding your gastric issues: How are your stomach symptoms, acid reflux, and pain level today?',
        answer: 'Reflux feels milder today. Took Pantoprazole on empty stomach, no nausea or vomiting. Tolerating rice porridge well.',
        urgency_level: 'normal',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        advice: 'Continue routine post-discharge monitoring and advise patient to maintain current diet and medication regimen.'
      }
    ]
  },
  {
    id: 'patient-jerry',
    name: 'Jerry',
    email: 'jerryjamesedavazhickal@gmail.com',
    whatsapp_number: 'jerryjamesedavazhickal@gmail.com',
    diagnosis: 'dental issues (Post-Op Surgical Tooth Extraction)',
    risk_factors: 'Dental issues, Assigned to Nurse 2',
    assigned_nurse: 'Nurse 2',
    status: 'active',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    medicines: [
      { drug_name: 'Amoxicillin', strength: '500 mg', frequency: 'Three times daily', instructions: 'Finish full 5-day course' },
      { drug_name: 'Ibuprofen', strength: '400 mg', frequency: 'Every 8 hours with food as needed', instructions: 'Pain and swelling management' }
    ],
    responses: [
      {
        id: 'resp-jerry-1',
        question: 'CareAfter Clinical Recovery Check-in from Nurse 2 regarding your dental recovery: How are your gum swelling and pain today?',
        answer: 'Gum swelling is reduced, slight jaw soreness. Finishing Amoxicillin, no bleeding. Doing salt water rinses as directed.',
        urgency_level: 'normal',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        advice: 'Continue routine post-discharge monitoring.'
      }
    ]
  },
  {
    id: 'patient-niya-jimmy',
    name: 'niya jimmy',
    email: 'niyajimmy2029@cs.ajce.in',
    whatsapp_number: 'niyajimmy2029@cs.ajce.in',
    diagnosis: 'serious heart issues (Post-Cardiac Event Recovery)',
    risk_factors: 'Serious heart issues, Cardiac High Risk, Assigned to Nurse 3',
    assigned_nurse: 'Nurse 3',
    status: 'flagged',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    medicines: [
      { drug_name: 'Clopidogrel', strength: '75 mg', frequency: 'Once daily with breakfast', instructions: 'Dual antiplatelet therapy' },
      { drug_name: 'Atorvastatin', strength: '40 mg', frequency: 'Once daily at bedtime', instructions: 'Lipid stabilization' },
      { drug_name: 'Metoprolol Succinate', strength: '50 mg', frequency: 'Once daily', instructions: 'Blood pressure and heart rate regulation' }
    ],
    responses: [
      {
        id: 'resp-niya-1',
        question: 'CareAfter Clinical Recovery Check-in from Nurse 3 regarding your heart condition: Are you experiencing any chest heaviness or shortness of breath today?',
        answer: 'Experienced slight chest heaviness and shortness of breath when walking up stairs this morning. Breathlessness eased after sitting.',
        urgency_level: 'concern',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        advice: 'Call the patient to evaluate symptom progression and arrange a prompt cardiology consultation.'
      }
    ]
  }
];

let appState = {
  isAuthenticated: false,
  nurseUser: null,
  currentView: 'dashboard',
  patients: [],
  selectedPatientId: null,
  searchFilter: '',
  activeTabFilter: 'all',
  isSignupMode: false
};

function loadStoredPatients() {
  try {
    const raw = localStorage.getItem('careafter_nurse_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasOldDemo = parsed.some(p => p.name === 'Eleanor Vance' || p.name === 'Marcus Thorne' || p.name === 'Rajesh Kumar' || (p.whatsapp_number && p.whatsapp_number.startsWith('+91')));
        if (!hasOldDemo) return parsed;
      }
    }
  } catch (e) {
    console.warn('Local patient parse error:', e);
  }
  saveStoredPatients(DEFAULT_PATIENTS);
  return DEFAULT_PATIENTS;
}

function saveStoredPatients(patients) {
  try {
    localStorage.setItem('careafter_nurse_data', JSON.stringify(patients));
  } catch (e) {
    console.warn('Local patient save error:', e);
  }
}

/* =========================================================================
   2. DOM ELEMENT REFERENCES
   ========================================================================= */
// Auth Screen
const authGateScreen = document.getElementById('authGateScreen');
const authTabLogin = document.getElementById('authTabLogin');
const authTabSignup = document.getElementById('authTabSignup');
const authErrorBox = document.getElementById('authErrorBox');
const nurseAuthForm = document.getElementById('nurseAuthForm');
const nurseEmail = document.getElementById('nurseEmail');
const nursePassword = document.getElementById('nursePassword');
const hospitalFieldGroup = document.getElementById('hospitalFieldGroup');
const nurseHospitalName = document.getElementById('nurseHospitalName');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const quickDemoAccessBtn = document.getElementById('quickDemoAccessBtn');

// Workspace Screen
const nurseAppWorkspace = document.getElementById('nurseAppWorkspace');
const workspaceUnitTag = document.getElementById('workspaceUnitTag');
const nurseProfileDisplay = document.getElementById('nurseProfileDisplay');
const nurseLogoutBtn = document.getElementById('nurseLogoutBtn');

// Navigation Tabs
const navDashboard = document.getElementById('navDashboard');
const navAddPatient = document.getElementById('navAddPatient');
const navTimeline = document.getElementById('navTimeline');
const navLasa = document.getElementById('navLasa');
const flaggedBadge = document.getElementById('flaggedBadge');

// View Containers
const viewDashboard = document.getElementById('viewDashboard');
const viewAddPatient = document.getElementById('viewAddPatient');
const viewTimeline = document.getElementById('viewTimeline');
const viewLasaChecker = document.getElementById('viewLasaChecker');

// Dashboard Elements
const kpiTotalCount = document.getElementById('kpiTotalCount');
const kpiFlaggedCount = document.getElementById('kpiFlaggedCount');
const kpiCheckinsCount = document.getElementById('kpiCheckinsCount');
const urgentAttentionStrip = document.getElementById('urgentAttentionStrip');
const urgentCountNum = document.getElementById('urgentCountNum');
const urgentCardsList = document.getElementById('urgentCardsList');
const nurseSearchInput = document.getElementById('nurseSearchInput');
const pillFilterBtns = document.querySelectorAll('.pill-filter-btn');
const queueNewIntakeBtn = document.getElementById('queueNewIntakeBtn');
const patientRowsContainer = document.getElementById('patientRowsContainer');

// Intake Elements
const nurseIntakeForm = document.getElementById('nurseIntakeForm');
const intakeName = document.getElementById('intakeName');
const intakePhone = document.getElementById('intakePhone');
const intakeDiagnosisText = document.getElementById('intakeDiagnosisText');
const intakeErrorBox = document.getElementById('intakeErrorBox');
const intakeSuccessBox = document.getElementById('intakeSuccessBox');
const intakeSubmitActionBtn = document.getElementById('intakeSubmitActionBtn');

const nursePrescriptionDropzone = document.getElementById('nursePrescriptionDropzone');
const nursePrescriptionInput = document.getElementById('nursePrescriptionInput');
const browsePrescriptionBtn = document.getElementById('browsePrescriptionBtn');
const dropzoneEmptyState = document.getElementById('dropzoneEmptyState');
const dropzoneActiveState = document.getElementById('dropzoneActiveState');
const prescriptionPreviewImg = document.getElementById('prescriptionPreviewImg');
const removePrescriptionBtn = document.getElementById('removePrescriptionBtn');

let intakePhotoBase64 = null;
let intakePhotoMime = 'image/jpeg';

// Timeline Elements
const tlPatientName = document.getElementById('tlPatientName');
const tlPatientStatusBadge = document.getElementById('tlPatientStatusBadge');
const tlPatientMeta = document.getElementById('tlPatientMeta');
const tlPatientRiskChips = document.getElementById('tlPatientRiskChips');
const tlPatientSelect = document.getElementById('tlPatientSelect');
const tlResolveFlagBtn = document.getElementById('tlResolveFlagBtn');
const tlInteractionCount = document.getElementById('tlInteractionCount');
const tlChatThread = document.getElementById('tlChatThread');
const tlMedsList = document.getElementById('tlMedsList');

// Simulator Elements
const sandboxForm = document.getElementById('sandboxForm');
const sbQuestion = document.getElementById('sbQuestion');
const sbAnswer = document.getElementById('sbAnswer');
const sbSubmitBtn = document.getElementById('sbSubmitBtn');
const presetNormalBtn = document.getElementById('presetNormalBtn');
const presetConcernBtn = document.getElementById('presetConcernBtn');
const presetUrgentBtn = document.getElementById('presetUrgentBtn');

// LASA Tool Elements
const lasaToolDropzone = document.getElementById('lasaToolDropzone');
const lasaToolInput = document.getElementById('lasaToolInput');
const browseLasaToolBtn = document.getElementById('browseLasaToolBtn');
const lasaDropEmpty = document.getElementById('lasaDropEmpty');
const lasaDropActive = document.getElementById('lasaDropActive');
const lasaPreviewImg = document.getElementById('lasaPreviewImg');
const removeLasaImgBtn = document.getElementById('removeLasaImgBtn');
const runLasaCheckBtn = document.getElementById('runLasaCheckBtn');
const lasaToolError = document.getElementById('lasaToolError');
const lasaToolResultBox = document.getElementById('lasaToolResultBox');
const lasaAlertBanner = document.getElementById('lasaAlertBanner');
const lasaSafeBanner = document.getElementById('lasaSafeBanner');
const lasaFoundDrug = document.getElementById('lasaFoundDrug');
const lasaFoundDosage = document.getElementById('lasaFoundDosage');

let lasaPhotoBase64 = null;
let lasaPhotoMime = 'image/jpeg';

/* =========================================================================
   3. AUTHENTICATION & GATE CONTROLLER
   ========================================================================= */
async function checkAuthOnStartup() {
  appState.patients = loadStoredPatients();

  if (isSupabaseConfigured) {
    try {
      const session = await getSession();
      if (session) {
        authenticateNurse({
          email: session.user.email,
          hospital: session.user.user_metadata?.hospital_name || 'City Memorial Hospital',
          session
        });
        await fetchSupabasePatients();
        return;
      }
    } catch (err) {
      console.warn('Initial session check notice:', err);
    }
  }

  // Check local demo nurse persistence
  const savedNurse = sessionStorage.getItem('careafter_nurse_auth');
  if (savedNurse) {
    try {
      const parsed = JSON.parse(savedNurse);
      authenticateNurse(parsed);
      return;
    } catch (e) {}
  }

  // Show Auth Screen
  showAuthGate();
}

function showAuthGate() {
  appState.isAuthenticated = false;
  authGateScreen.classList.remove('hidden');
  nurseAppWorkspace.classList.add('hidden');
}

function authenticateNurse(nurseInfo) {
  appState.isAuthenticated = true;
  appState.nurseUser = nurseInfo;

  nurseProfileDisplay.textContent = nurseInfo.email.includes('nurse.sarah')
    ? 'Nurse Sarah, RN'
    : (nurseInfo.email.split('@')[0] || 'Nurse Staff');
  workspaceUnitTag.textContent = nurseInfo.hospital || 'Ward 4B Recovery Unit';

  sessionStorage.setItem('careafter_nurse_auth', JSON.stringify(nurseInfo));

  authGateScreen.classList.add('hidden');
  nurseAppWorkspace.classList.remove('hidden');

  switchWorkspaceView('dashboard');
}

// Auth Tabs Switcher
authTabLogin.addEventListener('click', () => {
  appState.isSignupMode = false;
  authTabLogin.classList.add('active');
  authTabSignup.classList.remove('active');
  hospitalFieldGroup.classList.add('hidden');
  authSubmitBtn.textContent = 'Sign In with Clinical Credentials';
  authErrorBox.classList.add('hidden');
});

authTabSignup.addEventListener('click', () => {
  appState.isSignupMode = true;
  authTabSignup.classList.add('active');
  authTabLogin.classList.remove('active');
  hospitalFieldGroup.classList.remove('hidden');
  authSubmitBtn.textContent = 'Create Staff Account';
  authErrorBox.classList.add('hidden');
});

// 1-Click Quick Demo Nurse Access
quickDemoAccessBtn.addEventListener('click', () => {
  authenticateNurse({
    email: 'nurse.sarah@citymemorial.org',
    hospital: 'City Memorial Hospital · Ward 4B',
    isDemo: true
  });
});

// Credentials Form Submit
nurseAuthForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authErrorBox.classList.add('hidden');

  const email = nurseEmail.value.trim();
  const password = nursePassword.value;

  if (!isSupabaseConfigured) {
    // If Supabase keys are default/placeholder, automatically authenticate via demo mode
    authenticateNurse({
      email: email || 'nurse.sarah@citymemorial.org',
      hospital: nurseHospitalName.value.trim() || 'City Memorial Hospital · Ward 4B',
      isDemo: true
    });
    return;
  }

  try {
    if (appState.isSignupMode) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { hospital_name: nurseHospitalName.value.trim() || 'City Memorial Hospital' } }
      });
      if (error) throw error;
      authErrorBox.textContent = 'Account created! Confirm your email if required, then sign in.';
      authErrorBox.classList.remove('hidden');
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      authenticateNurse({
        email: data.user?.email || email,
        hospital: data.user?.user_metadata?.hospital_name || 'City Memorial Hospital',
        session: data.session
      });
      await fetchSupabasePatients();
    }
  } catch (err) {
    authErrorBox.textContent = err.message || 'Authentication failed. Please verify credentials.';
    authErrorBox.classList.remove('hidden');
  }
});

// Nurse Logout
nurseLogoutBtn.addEventListener('click', async () => {
  sessionStorage.removeItem('careafter_nurse_auth');
  if (isSupabaseConfigured) {
    try { await supabase.auth.signOut(); } catch (e) {}
  }
  showAuthGate();
});

/* =========================================================================
   4. WORKSPACE NAVIGATION
   ========================================================================= */
function switchWorkspaceView(viewKey, targetPatientId = null) {
  appState.currentView = viewKey;

  [navDashboard, navAddPatient, navTimeline, navLasa].forEach(tab => tab.classList.remove('active'));
  [viewDashboard, viewAddPatient, viewTimeline, viewLasaChecker].forEach(view => view.style.display = 'none');

  if (viewKey === 'dashboard') {
    navDashboard.classList.add('active');
    viewDashboard.style.display = 'flex';
    renderDashboardQueue();
  } else if (viewKey === 'addPatient') {
    navAddPatient.classList.add('active');
    viewAddPatient.style.display = 'block';
  } else if (viewKey === 'timeline') {
    navTimeline.classList.add('active');
    viewTimeline.style.display = 'flex';
    if (targetPatientId) {
      appState.selectedPatientId = targetPatientId;
    } else if (!appState.selectedPatientId && appState.patients.length > 0) {
      appState.selectedPatientId = appState.patients[0].id;
    }
    renderTimelineView();
  } else if (viewKey === 'lasaChecker') {
    navLasa.classList.add('active');
    viewLasaChecker.style.display = 'block';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

[navDashboard, navAddPatient, navTimeline, navLasa].forEach(btn => {
  btn.addEventListener('click', () => {
    switchWorkspaceView(btn.dataset.view);
  });
});

queueNewIntakeBtn.addEventListener('click', () => {
  switchWorkspaceView('addPatient');
});

/* =========================================================================
   5. PATIENT QUEUE & DASHBOARD (CLEAN & SPACIOUS)
   ========================================================================= */
function renderDashboardQueue() {
  const all = appState.patients;
  const flagged = all.filter(p => p.status === 'flagged');

  let totalInteractions = 0;
  all.forEach(p => {
    totalInteractions += (p.responses || []).length;
  });

  kpiTotalCount.textContent = all.length;
  kpiFlaggedCount.textContent = flagged.length;
  kpiCheckinsCount.textContent = totalInteractions;

  if (flagged.length > 0) {
    flaggedBadge.textContent = flagged.length;
    flaggedBadge.style.display = 'inline-block';
    urgentAttentionStrip.style.display = 'flex';
    urgentCountNum.textContent = flagged.length;
    renderUrgentAlerts(flagged);
  } else {
    flaggedBadge.style.display = 'none';
    urgentAttentionStrip.style.display = 'none';
  }

  // Filter & Search
  const query = appState.searchFilter.toLowerCase().trim();
  const filtered = all.filter(p => {
    const matchesTab =
      appState.activeTabFilter === 'all' ||
      (appState.activeTabFilter === 'flagged' && p.status === 'flagged') ||
      (appState.activeTabFilter === 'active' && p.status === 'active');

    const matchesSearch =
      !query ||
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(query)) ||
      (p.email && p.email.toLowerCase().includes(query)) ||
      (p.whatsapp_number && p.whatsapp_number.toLowerCase().includes(query));

    return matchesTab && matchesSearch;
  });

  renderPatientRows(filtered);
}

function renderUrgentAlerts(flaggedList) {
  urgentCardsList.innerHTML = '';
  flaggedList.forEach(p => {
    const lastResp = (p.responses && p.responses.length > 0)
      ? p.responses[p.responses.length - 1]
      : null;

    const row = document.createElement('div');
    row.className = 'urgent-row-item';
    row.innerHTML = `
      <div class="urgent-row-text">
        <strong>${escapeHtml(p.name)} <span style="font-weight:500; color:var(--text-secondary)">· ${escapeHtml(p.diagnosis || '')}</span></strong>
        <span>Alert: "${escapeHtml(lastResp?.answer || 'Elevated recovery risk detected')}"</span>
      </div>
      <div style="display:flex; gap:0.5rem">
        <button type="button" class="btn btn-primary btn-inline open-tl-btn" style="padding:0.4rem 0.9rem; font-size:0.8rem">
          Review Timeline
        </button>
      </div>
    `;

    row.querySelector('.open-tl-btn').addEventListener('click', () => {
      switchWorkspaceView('timeline', p.id);
    });

    urgentCardsList.appendChild(row);
  });
}

function renderPatientRows(list) {
  patientRowsContainer.innerHTML = '';

  if (list.length === 0) {
    patientRowsContainer.innerHTML = `
      <div class="empty-state-card">
        <p style="font-size:1rem; font-weight:700; color:#fff; margin-bottom:0.3rem">No patient records found.</p>
        <p style="font-size:0.85rem">Try adjusting your search criteria or filter tabs.</p>
      </div>
    `;
    return;
  }

  list.forEach(p => {
    const row = document.createElement('div');
    const isFlagged = p.status === 'flagged';
    row.className = `patient-list-row ${isFlagged ? 'flagged' : ''}`;

    const risks = typeof p.risk_factors === 'string'
      ? p.risk_factors.split(',').map(r => r.trim()).filter(Boolean)
      : (Array.isArray(p.risk_factors) ? p.risk_factors : []);

    const riskBadges = risks.slice(0, 3).map(r => `
      <span class="patient-risk-chip" style="font-size:0.72rem; background:rgba(245,158,11,0.12); color:#fcd34d; border:1px solid rgba(245,158,11,0.28); padding:0.2rem 0.55rem; border-radius:6px; font-weight:600; letter-spacing:0.02em">
        ${escapeHtml(r)}
      </span>
    `).join(' ');

    row.innerHTML = `
      <div class="col-patient-info">
        <strong>${escapeHtml(p.name)}</strong>
        <span>Email: ${escapeHtml(p.email || p.whatsapp_number || 'N/A')}</span>
        <div style="margin-top:0.45rem; display:flex; gap:0.35rem; flex-wrap:wrap">
          ${riskBadges || '<span style="font-size:0.75rem; color:var(--text-muted)">Standard recovery</span>'}
        </div>
      </div>

      <div class="col-diagnosis">
        <div style="font-weight:600; color:#fff">${escapeHtml(p.diagnosis || 'Post-discharge monitoring')}</div>
        <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:0.3rem">
          💊 ${Array.isArray(p.medicines) ? p.medicines.length : 0} meds · 💬 ${(p.responses || []).length} check-in(s)
        </div>
      </div>

      <div class="col-status-pill">
        <span class="status-badge ${isFlagged ? 'urgent' : 'normal'}">
          ${isFlagged ? '🚨 ATTENTION' : '🟢 NORMAL'}
        </span>
      </div>

      <div class="col-row-actions">
        <button type="button" class="btn btn-secondary btn-inline open-tl-btn" style="padding:0.5rem 1rem; font-size:0.82rem">
          Care Timeline
        </button>
      </div>
    `;

    row.querySelector('.open-tl-btn').addEventListener('click', () => {
      switchWorkspaceView('timeline', p.id);
    });

    patientRowsContainer.appendChild(row);
  });
}

// Search & Filter Events
nurseSearchInput.addEventListener('input', (e) => {
  appState.searchFilter = e.target.value;
  renderDashboardQueue();
});

pillFilterBtns.forEach(pill => {
  pill.addEventListener('click', () => {
    pillFilterBtns.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    appState.activeTabFilter = pill.dataset.filter;
    renderDashboardQueue();
  });
});

/* =========================================================================
   6. DISCHARGE INTAKE
   ========================================================================= */
browsePrescriptionBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  nursePrescriptionInput.click();
});

nursePrescriptionDropzone.addEventListener('click', () => {
  if (!intakePhotoBase64) nursePrescriptionInput.click();
});

nursePrescriptionInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    intakePhotoMime = file.type;
    const reader = new FileReader();
    reader.onload = (ev) => {
      intakePhotoBase64 = ev.target.result;
      prescriptionPreviewImg.src = intakePhotoBase64;
      dropzoneEmptyState.classList.add('hidden');
      dropzoneActiveState.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
});

removePrescriptionBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  intakePhotoBase64 = null;
  nursePrescriptionInput.value = '';
  prescriptionPreviewImg.src = '';
  dropzoneEmptyState.classList.remove('hidden');
  dropzoneActiveState.classList.add('hidden');
});

nurseIntakeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  intakeErrorBox.classList.add('hidden');
  intakeSuccessBox.classList.add('hidden');
  intakeSubmitActionBtn.disabled = true;

  const name = intakeName.value.trim();
  const contact = intakePhone.value.trim();
  const diag = intakeDiagnosisText.value.trim();

  const checkedRisks = [...document.querySelectorAll('input[name="riskChip"]:checked')].map(c => c.value);
  const risk_factors = checkedRisks.join(', ');

  try {
    let newPatient = null;

    if (appState.nurseUser?.session?.access_token) {
      const res = await apiPost('/api/add-patient', {
        name,
        email: contact,
        whatsapp_number: contact,
        diagnosis: diag,
        risk_factors,
        image: intakePhotoBase64,
        mimeType: intakePhotoMime
      }, appState.nurseUser.session.access_token);
      newPatient = res.patient;
    } else {
      let medicines = [];
      if (intakePhotoBase64) {
        try {
          const scan = await apiPost('/api/analyze', {
            image: intakePhotoBase64,
            mimeType: intakePhotoMime
          });
          medicines = scan?.medications || [];
        } catch (e) {}
      }

      newPatient = {
        id: 'patient-' + Date.now(),
        name,
        email: contact,
        whatsapp_number: contact,
        diagnosis: diag,
        risk_factors,
        medicines,
        status: 'active',
        created_at: new Date().toISOString(),
        responses: [
          {
            id: 'resp-welcome-' + Date.now(),
            question: `CareAfter recovery monitoring initialized: How is your recovery comfort today?`,
            answer: 'Discharged safely, resting comfortably at home.',
            urgency_level: 'normal',
            timestamp: new Date().toISOString(),
            advice: 'Patient enrolled and recovery protocol initialized.'
          }
        ]
      };
    }

    if (newPatient) {
      appState.patients.unshift(newPatient);
      saveStoredPatients(appState.patients);
    }

    intakeSuccessBox.textContent = `✅ Patient ${name} enrolled successfully! Recovery check-ins scheduled.`;
    intakeSuccessBox.classList.remove('hidden');
    nurseIntakeForm.reset();
    intakePhotoBase64 = null;
    dropzoneEmptyState.classList.remove('hidden');
    dropzoneActiveState.classList.add('hidden');

    setTimeout(() => {
      switchWorkspaceView('dashboard');
    }, 1200);

  } catch (err) {
    intakeErrorBox.textContent = err.message || 'Failed to enroll patient.';
    intakeErrorBox.classList.remove('hidden');
  } finally {
    intakeSubmitActionBtn.disabled = false;
  }
});

/* =========================================================================
   7. CARE TIMELINE & TRIAGE MONITOR
   ========================================================================= */
function renderTimelineView() {
  populateTimelineDropdown();

  const patient = appState.patients.find(p => p.id === appState.selectedPatientId);
  if (!patient) return;

  tlPatientName.textContent = patient.name;
  tlPatientMeta.textContent = `${patient.diagnosis || 'Post-discharge monitoring'} · Email: ${patient.email || patient.whatsapp_number || 'N/A'}`;

  const isFlagged = patient.status === 'flagged';
  tlPatientStatusBadge.className = `status-badge ${isFlagged ? 'urgent' : 'normal'}`;
  tlPatientStatusBadge.textContent = isFlagged ? '🚨 ATTENTION NEEDED' : '🟢 NORMAL RECOVERY';

  tlResolveFlagBtn.style.display = isFlagged ? 'inline-block' : 'none';

  // Risk chips
  const risks = typeof patient.risk_factors === 'string'
    ? patient.risk_factors.split(',').map(r => r.trim()).filter(Boolean)
    : (Array.isArray(patient.risk_factors) ? patient.risk_factors : []);

  tlPatientRiskChips.innerHTML = risks
    .map(r => `<span style="font-size:0.72rem; background:rgba(245,158,11,0.12); color:#fcd34d; border:1px solid rgba(245,158,11,0.25); padding:0.15rem 0.45rem; border-radius:4px; font-weight:600">${escapeHtml(r)}</span>`)
    .join('');

  // Meds list
  const meds = Array.isArray(patient.medicines) ? patient.medicines : [];
  if (meds.length > 0) {
    tlMedsList.innerHTML = meds.map(m => `
      <div style="background:rgba(8,12,20,0.6); border:1px solid var(--surface-border); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); font-size:0.82rem">
        <strong style="color:#38bdf8">${escapeHtml(m.drug_name || 'Medication')}</strong> <span style="color:var(--text-secondary)">${escapeHtml(m.strength || '')}</span>
        <div style="color:var(--text-secondary); font-size:0.78rem; margin-top:0.15rem">${escapeHtml(m.dosage_frequency || m.instructions || '')}</div>
      </div>
    `).join('');
  } else {
    tlMedsList.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted)">No medications recorded.</span>';
  }

  // Conversation feed
  const responses = Array.isArray(patient.responses) ? patient.responses : [];
  tlInteractionCount.textContent = `${responses.length} interaction(s)`;

  if (responses.length === 0) {
    tlChatThread.innerHTML = `
      <div class="empty-state-card">
        No check-in responses recorded yet. Use the Clinical AI Triage Sandbox on the right to simulate an incoming message.
      </div>
    `;
    return;
  }

  tlChatThread.innerHTML = responses.map(r => {
    const level = (r.urgency_level || 'normal').toLowerCase();
    const isUrgent = level === 'urgent';
    const isConcern = level === 'concern';

    return `
      <div class="chat-interaction-block ${isUrgent ? 'urgent' : (isConcern ? 'concern' : '')}">
        <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:var(--text-secondary)">
          <span>🕒 ${formatWhen(r.timestamp)}</span>
          <span class="status-badge ${level}">
            ${isUrgent ? '🚨 URGENT' : (isConcern ? '🟡 CONCERN' : '🟢 NORMAL')}
          </span>
        </div>

        <div class="bubble-prompt">
          <strong>CareAfter Check-in Sent:</strong><br/>
          ${escapeHtml(r.question)}
        </div>

        <div class="bubble-reply">
          <strong>Patient Reply:</strong><br/>
          ${escapeHtml(r.answer)}
        </div>

        ${r.advice ? `
          <div class="ai-verdict-tag">
            <strong style="color:${isUrgent ? '#f87171' : (isConcern ? '#fcd34d' : '#34d399')}">🤖 Gemini AI Clinical Triage:</strong>
            <div style="color:#fff; margin-top:0.2rem">${escapeHtml(r.advice)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function populateTimelineDropdown() {
  tlPatientSelect.innerHTML = appState.patients.map(p => `
    <option value="${p.id}" ${p.id === appState.selectedPatientId ? 'selected' : ''}>
      ${p.status === 'flagged' ? '🚨 ' : '🟢 '} ${escapeHtml(p.name)} (${escapeHtml(p.diagnosis?.slice(0, 18) || 'Patient')}...)
    </option>
  `).join('');
}

tlPatientSelect.addEventListener('change', (e) => {
  appState.selectedPatientId = e.target.value;
  renderTimelineView();
});

tlResolveFlagBtn.addEventListener('click', async () => {
  const patient = appState.patients.find(p => p.id === appState.selectedPatientId);
  if (!patient) return;

  patient.status = 'active';
  saveStoredPatients(appState.patients);

  if (appState.nurseUser?.session && isSupabaseConfigured) {
    try {
      await supabase.from('patients').update({ status: 'active' }).eq('id', patient.id);
    } catch (e) {}
  }

  renderTimelineView();
  renderDashboardQueue();
});

// Presets
presetNormalBtn.addEventListener('click', () => {
  sbQuestion.value = 'How are your surgical incision and pain level today?';
  sbAnswer.value = 'Pain is mild and manageable with Tylenol. Incision looks clean with no redness.';
});

presetConcernBtn.addEventListener('click', () => {
  sbQuestion.value = 'Are you experiencing any unexpected dizziness or shortness of breath?';
  sbAnswer.value = 'I felt quite lightheaded and dizzy when getting out of bed this morning.';
});

presetUrgentBtn.addEventListener('click', () => {
  sbQuestion.value = 'How is your incision healing and do you have any fever?';
  sbAnswer.value = 'I have a high fever of 102.4°F, chills, and yellow pus leaking from the incision.';
});

sandboxForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const patient = appState.patients.find(p => p.id === appState.selectedPatientId);
  if (!patient) return;

  const question = sbQuestion.value.trim();
  const answer = sbAnswer.value.trim();
  if (!question || !answer) return;

  sbSubmitBtn.disabled = true;

  try {
    let urgency = 'normal';
    let advice = '';

    try {
      const res = await apiPost('/api/assess-response', {
        patient_id: patient.id,
        question,
        answer
      }, appState.nurseUser?.session?.access_token);
      urgency = (res?.urgency || 'normal').toLowerCase();
      advice = res?.advice || '';
    } catch (err) {
      // Offline / heuristic fallback
      const lower = answer.toLowerCase();
      if (lower.includes('fever') || lower.includes('102') || lower.includes('pus') || lower.includes('bleeding')) {
        urgency = 'urgent';
        advice = 'Emergency recovery symptom detected. Alerting attending care team.';
      } else if (lower.includes('dizzy') || lower.includes('nausea') || lower.includes('pain')) {
        urgency = 'concern';
        advice = 'Symptoms warrant nurse check-in. Monitor vital signs.';
      } else {
        urgency = 'normal';
        advice = 'Recovery progressing within standard parameters.';
      }
    }

    const newResp = {
      id: 'resp-' + Date.now(),
      question,
      answer,
      urgency_level: urgency,
      timestamp: new Date().toISOString(),
      advice
    };

    if (!Array.isArray(patient.responses)) patient.responses = [];
    patient.responses.unshift(newResp);

    if (urgency === 'urgent' || urgency === 'concern') {
      patient.status = 'flagged';
    }

    saveStoredPatients(appState.patients);
    renderTimelineView();
    renderDashboardQueue();
    sbAnswer.value = '';

  } finally {
    sbSubmitBtn.disabled = false;
  }
});

/* =========================================================================
   8. LASA DRUG SAFETY GUARD
   ========================================================================= */
browseLasaToolBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  lasaToolInput.click();
});

lasaToolDropzone.addEventListener('click', () => {
  if (!lasaPhotoBase64) lasaToolInput.click();
});

lasaToolInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    lasaPhotoMime = file.type;
    const reader = new FileReader();
    reader.onload = (ev) => {
      lasaPhotoBase64 = ev.target.result;
      lasaPreviewImg.src = lasaPhotoBase64;
      lasaDropEmpty.classList.add('hidden');
      lasaDropActive.classList.remove('hidden');
      runLasaCheckBtn.disabled = false;
      lasaToolResultBox.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }
});

removeLasaImgBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  lasaPhotoBase64 = null;
  lasaToolInput.value = '';
  lasaPreviewImg.src = '';
  lasaDropEmpty.classList.remove('hidden');
  lasaDropActive.classList.add('hidden');
  runLasaCheckBtn.disabled = true;
  lasaToolResultBox.classList.add('hidden');
});

runLasaCheckBtn.addEventListener('click', async () => {
  if (!lasaPhotoBase64) return;
  runLasaCheckBtn.disabled = true;
  lasaToolError.classList.add('hidden');
  lasaToolResultBox.classList.add('hidden');

  try {
    const data = await apiPost('/api/analyze', {
      image: lasaPhotoBase64,
      mimeType: lasaPhotoMime
    });

    lasaFoundDrug.textContent = data.drug_name || '—';
    lasaFoundDosage.textContent = `${data.strength || ''} ${data.dosage_frequency || ''} (${data.patient_instructions || ''})`;

    if (data.lasa_alert && data.lasa_details) {
      lasaAlertBanner.innerHTML = `
        <strong>⚠️ Look-Alike Sound-Alike Alert:</strong> ${escapeHtml(data.lasa_details.pair || '')}<br/>
        <span>${escapeHtml(data.lasa_details.danger_reason || '')}</span>
      `;
      lasaAlertBanner.classList.remove('hidden');
      lasaSafeBanner.classList.add('hidden');
    } else {
      lasaAlertBanner.classList.add('hidden');
      lasaSafeBanner.classList.remove('hidden');
    }

    lasaToolResultBox.classList.remove('hidden');
  } catch (err) {
    lasaToolError.textContent = err.message || 'Analysis failed.';
    lasaToolError.classList.remove('hidden');
  } finally {
    runLasaCheckBtn.disabled = false;
  }
});

/* =========================================================================
   9. SUPABASE BACKGROUND SYNC & UTILITIES
   ========================================================================= */
async function fetchSupabasePatients() {
  if (!isSupabaseConfigured) return;
  try {
    const { data: patients, error } = await supabase
      .from('patients')
      .select('id, name, whatsapp_number, diagnosis, risk_factors, medicines, status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (patients && patients.length > 0) {
      const { data: responses } = await supabase
        .from('checkin_responses')
        .select('id, patient_id, question, answer, urgency_level, timestamp')
        .order('timestamp', { ascending: true });

      const responsesByPatient = {};
      (responses || []).forEach(r => {
        if (!responsesByPatient[r.patient_id]) responsesByPatient[r.patient_id] = [];
        responsesByPatient[r.patient_id].push(r);
      });

      appState.patients = patients.map(p => ({
        ...p,
        responses: responsesByPatient[p.id] || []
      }));
      saveStoredPatients(appState.patients);
      renderDashboardQueue();
    }
  } catch (e) {
    console.warn('Supabase fetch notice:', e);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function formatWhen(value) {
  if (!value) return 'Just now';
  try {
    const d = new Date(value);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return String(value);
  }
}

// Initialize Application
checkAuthOnStartup();

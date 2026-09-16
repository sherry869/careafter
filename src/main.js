import { supabase, isSupabaseConfigured, getSession, apiPost } from './supabaseClient.js';

/* =========================================================================
   1. SAMPLE MOCK DATA & CLINICAL MCQ SEQUENCES
   ========================================================================= */
const DEFAULT_PATIENTS = [
  {
    id: 'patient-sanah',
    name: 'Sanah',
    email: 'sanahmerlinb.s2029@cs.ajce.in',
    whatsapp_number: 'sanahmerlinb.s2029@cs.ajce.in',
    diagnosis: 'gastric issues (Gastritis & Acid Reflux Monitoring)',
    risk_factors: 'Gastric issues, Assigned to Nurse 1',
    assigned_nurse: 'Nurse 1 (Gastroenterology)',
    status: 'active',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    medicines: [
      {
        drug_name: 'Pantoprazole',
        strength: '40 mg',
        dosage: '40 mg',
        frequency: 'Once daily (1-0-0)',
        timing: '30 mins before breakfast on empty stomach',
        duration: '14 days',
        plain_instructions: 'Take 1 tablet every morning on empty stomach with a full glass of water.',
        similar_drugs: ['Pan-40', 'Pantocid', 'Pantodac']
      },
      {
        drug_name: 'Sucralfate',
        strength: '1 g',
        dosage: '1 g',
        frequency: 'Three times daily (1-1-1)',
        timing: '1 hour before meals and at bedtime',
        duration: '14 days',
        plain_instructions: 'Take 1 hour before meals to protect gastric lining.',
        similar_drugs: ['Sucrafil', 'Sucrace', 'Pepsigard']
      }
    ],
    checkin_questions: [
      {
        id: 'q1',
        text: 'How are your stomach symptoms, heartburn, or acid reflux today?',
        options: [
          'A) Normal — No heartburn, stomach comfortable',
          'B) Mild acidity — Easily managed with water and light food',
          'C) Moderate burning / indigestion after meals',
          'D) Severe burning, persistent vomiting, or dark stools'
        ]
      },
      {
        id: 'q2',
        text: 'Have you been taking your Pantoprazole (40 mg) and Sucralfate (1 g) as prescribed?',
        options: [
          'A) Yes, taking both medications on time before meals',
          'B) Missed one dose today but back on schedule',
          'C) Experiencing mild stomach cramps after taking them',
          'D) Stopped taking medications due to side effects'
        ]
      },
      {
        id: 'q3',
        text: 'Are you experiencing any severe abdominal pain or nausea?',
        options: [
          'A) No abdominal pain or nausea',
          'B) Mild occasional cramp that settles after resting',
          'C) Moderate upper abdominal discomfort',
          'D) Severe sharp pain or persistent nausea / vomiting'
        ]
      },
      {
        id: 'q4',
        text: 'Are you able to tolerate light meals and liquids comfortably?',
        options: [
          'A) Eating light meals and drinking fluids easily',
          'B) Mild bloating after eating but able to finish food',
          'C) Difficulty eating solids, only taking liquids',
          'D) Unable to keep any liquids or food down'
        ]
      }
    ],
    responses: [
      {
        id: 'resp-sanah-1',
        question: 'How are your stomach symptoms, heartburn, or acid reflux today?',
        answer: 'Option A: Normal — No heartburn, stomach comfortable. Tolerating rice porridge well.',
        urgency_level: 'normal',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        advice: 'Patient reports steady gastric recovery. Continue prescribed Pantoprazole and Sucralfate regimen.'
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
    assigned_nurse: 'Nurse 2 (Oral Surgery)',
    status: 'active',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    medicines: [
      {
        drug_name: 'Amoxicillin',
        strength: '500 mg',
        dosage: '500 mg',
        frequency: 'Three times daily (1-1-1)',
        timing: 'After meals',
        duration: '5 days',
        plain_instructions: 'Complete full 5-day course to prevent oral socket infection.',
        similar_drugs: ['Novamox 500', 'Mox 500', 'Almox']
      },
      {
        drug_name: 'Ibuprofen',
        strength: '400 mg',
        dosage: '400 mg',
        frequency: 'Every 8 hours as needed (1-0-1)',
        timing: 'With food or milk',
        duration: '3 days',
        plain_instructions: 'Take with food for pain and gum swelling control.',
        similar_drugs: ['Brufen 400', 'Ibugesic', 'Combiflam']
      }
    ],
    checkin_questions: [
      {
        id: 'q1',
        text: 'How are your gum swelling and pain levels today?',
        options: [
          'A) Minimal to no pain, swelling noticeably reduced',
          'B) Mild soreness, well controlled with prescribed pain reliever',
          'C) Moderate throbbing pain radiating to jaw or ear',
          'D) Severe unbearable pain, fever, or difficulty swallowing'
        ]
      },
      {
        id: 'q2',
        text: 'Have you been taking your Amoxicillin (500 mg) and Ibuprofen (400 mg) as prescribed?',
        options: [
          'A) Yes, taking full course of antibiotic and pain reliever as directed',
          'B) Taking pain reliever only when needed, finished antibiotics',
          'C) Missed doses due to mild stomach upset',
          'D) Stopped antibiotics completely before finishing the course'
        ]
      },
      {
        id: 'q3',
        text: 'Have you noticed any persistent bleeding or unusual discharge from the extraction site?',
        options: [
          'A) No bleeding, clean blood clot in place',
          'B) Slight pink tinged saliva when rinsing gently',
          'C) Steady light oozing requiring fresh gauze',
          'D) Active continuous bleeding or foul-tasting pus'
        ]
      },
      {
        id: 'q4',
        text: 'Are you performing warm salt-water rinses and able to consume soft foods?',
        options: [
          'A) Doing gentle salt-water rinses and eating soft foods comfortably',
          'B) Mild stiffness when chewing soft foods',
          'C) Unable to chew soft foods, drinking fluids only',
          'D) Cannot open mouth at all (trismus) or severe jaw stiffness'
        ]
      }
    ],
    responses: [
      {
        id: 'resp-jerry-1',
        question: 'How are your gum swelling and pain levels today?',
        answer: 'Option B: Mild soreness, well controlled with prescribed pain reliever. Finished Amoxicillin, no bleeding.',
        urgency_level: 'normal',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        advice: 'Continue gentle warm salt-water rinses and maintain soft diet.'
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
    assigned_nurse: 'Nurse 3 (Cardiology)',
    status: 'flagged',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    medicines: [
      {
        drug_name: 'Clopidogrel',
        strength: '75 mg',
        dosage: '75 mg',
        frequency: 'Once daily (1-0-0)',
        timing: 'With morning breakfast',
        duration: 'Continue maintenance',
        plain_instructions: 'Dual antiplatelet therapy for coronary stent patency. Do not skip doses.',
        similar_drugs: ['Plavix', 'Deplatt', 'Clopilet']
      },
      {
        drug_name: 'Atorvastatin',
        strength: '40 mg',
        dosage: '40 mg',
        frequency: 'Once daily (0-0-1)',
        timing: 'At bedtime',
        duration: 'Continue maintenance',
        plain_instructions: 'Lipid stabilization and cardiovascular plaque protection.',
        similar_drugs: ['Lipitor', 'Atorva', 'Storvas']
      },
      {
        drug_name: 'Metoprolol Succinate',
        strength: '50 mg',
        dosage: '50 mg',
        frequency: 'Once daily (1-0-0)',
        timing: 'With morning meal',
        duration: 'Continue maintenance',
        plain_instructions: 'Cardioprotective beta blocker for blood pressure and heart rate stabilization.',
        similar_drugs: ['Betaloc', 'Metolar-XR', 'Seloken']
      }
    ],
    checkin_questions: [
      {
        id: 'q1',
        text: 'Are you experiencing any chest heaviness, tightness, or chest pain today?',
        options: [
          'A) No chest heaviness, tightness, or pain at all',
          'B) Mild muscle soreness around chest with movement',
          'C) Moderate chest heaviness that eases after resting',
          'D) Severe chest pain radiating to left arm/jaw, sweating, or nausea'
        ]
      },
      {
        id: 'q2',
        text: 'Have you had any shortness of breath, especially when resting or walking short distances?',
        options: [
          'A) Breathing comfortably at rest and with gentle walking',
          'B) Mild breathlessness after stairs or walking uphill',
          'C) Shortness of breath during normal flat walking / household tasks',
          'D) Severe breathlessness while resting or lying flat in bed'
        ]
      },
      {
        id: 'q3',
        text: 'Have you taken your Clopidogrel (75 mg), Atorvastatin (40 mg), and Metoprolol (50 mg) today?',
        options: [
          'A) Yes, all prescribed doses taken on schedule',
          'B) Delayed by a few hours but taken',
          'C) Missed a dose due to lightheadedness or fatigue',
          'D) Stopped heart medications due to confusion or side effects'
        ]
      },
      {
        id: 'q4',
        text: 'Have you noticed any dizziness, ankle swelling, or irregular rapid heartbeats?',
        options: [
          'A) Steady heart rhythm, no dizziness, no swelling',
          'B) Brief lightheadedness when standing up quickly',
          'C) Mild new puffiness around ankles or occasional flutter',
          'D) Racing heart, fainting episode, or rapid weight/fluid gain'
        ]
      }
    ],
    responses: [
      {
        id: 'resp-niya-1',
        question: 'Are you experiencing any chest heaviness, tightness, or chest pain today?',
        answer: 'Option C: Moderate chest heaviness that eases after resting. Also felt breathless walking upstairs.',
        urgency_level: 'concern',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        advice: 'Call the patient for symptom triage and schedule a prompt cardiology consultation.'
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
  isSignupMode: false,
  extractedMedicines: [],
  generatedMcqQuestions: [],
  selectedSimulatorOption: null
};

function loadStoredPatients() {
  try {
    const raw = localStorage.getItem('careafter_nurse_data_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
    localStorage.setItem('careafter_nurse_data_v2', JSON.stringify(patients));
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
const scanPrescriptionNowBtn = document.getElementById('scanPrescriptionNowBtn');

const intakeExtractedMedsBox = document.getElementById('intakeExtractedMedsBox');
const intakeExtractedMedsTitle = document.getElementById('intakeExtractedMedsTitle');
const intakeExtractedMedsList = document.getElementById('intakeExtractedMedsList');
const aiQuestionsPreviewList = document.getElementById('aiQuestionsPreviewList');

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
const sbQuestionSelect = document.getElementById('sbQuestionSelect');
const sbMcqOptionsContainer = document.getElementById('sbMcqOptionsContainer');
const sbCustomNote = document.getElementById('sbCustomNote');
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

  const savedNurse = sessionStorage.getItem('careafter_nurse_auth');
  if (savedNurse) {
    try {
      const parsed = JSON.parse(savedNurse);
      authenticateNurse(parsed);
      return;
    } catch (e) {}
  }

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

quickDemoAccessBtn.addEventListener('click', () => {
  authenticateNurse({
    email: 'nurse.sarah@citymemorial.org',
    hospital: 'City Memorial Hospital · Ward 4B',
    isDemo: true
  });
});

nurseAuthForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authErrorBox.classList.add('hidden');

  const email = nurseEmail.value.trim();
  const password = nursePassword.value;

  if (!isSupabaseConfigured) {
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
    renderDefaultIntakeMcqs();
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
   5. PATIENT QUEUE & DASHBOARD
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
      ? p.responses[0]
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

    const medCount = Array.isArray(p.medicines) ? p.medicines.length : 0;
    const respCount = Array.isArray(p.responses) ? p.responses.length : 0;

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
          💊 ${medCount} medicine(s) with dosages · 💬 ${respCount} check-in(s)
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
   6. DISCHARGE INTAKE & REAL-TIME PRESCRIPTION READER
   ========================================================================= */
browsePrescriptionBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  nursePrescriptionInput.click();
});

nursePrescriptionDropzone.addEventListener('click', () => {
  if (!intakePhotoBase64) nursePrescriptionInput.click();
});

nursePrescriptionInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    intakePhotoMime = file.type;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      intakePhotoBase64 = ev.target.result;
      prescriptionPreviewImg.src = intakePhotoBase64;
      dropzoneEmptyState.classList.add('hidden');
      dropzoneActiveState.classList.remove('hidden');
      await scanAndDisplayPrescription(intakePhotoBase64, intakePhotoMime);
    };
    reader.readAsDataURL(file);
  }
});

if (scanPrescriptionNowBtn) {
  scanPrescriptionNowBtn.addEventListener('click', async () => {
    if (intakePhotoBase64) {
      await scanAndDisplayPrescription(intakePhotoBase64, intakePhotoMime);
    }
  });
}

removePrescriptionBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  intakePhotoBase64 = null;
  nursePrescriptionInput.value = '';
  prescriptionPreviewImg.src = '';
  dropzoneEmptyState.classList.remove('hidden');
  dropzoneActiveState.classList.add('hidden');
  intakeExtractedMedsBox.classList.add('hidden');
  intakeExtractedMedsList.innerHTML = '';
  appState.extractedMedicines = [];
  renderDefaultIntakeMcqs();
});

async function scanAndDisplayPrescription(base64Data, mimeType) {
  intakeExtractedMedsBox.classList.remove('hidden');
  intakeExtractedMedsTitle.textContent = 'Scanning prescription for all medicines & dosages...';
  intakeExtractedMedsList.innerHTML = `
    <div style="padding: 1rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem">
      ⏳ Analyzing doctor handwriting, abbreviations, dosages, and strength...
    </div>
  `;

  try {
    const scanData = await apiPost('/api/analyze', {
      image: base64Data,
      mimeType: mimeType || 'image/jpeg'
    });

    const medicines = Array.isArray(scanData?.medicines) ? scanData.medicines : [];
    appState.extractedMedicines = medicines;
    renderExtractedMedsList(medicines);

    // Refresh MCQs with extracted medicines context
    const diag = intakeDiagnosisText.value.trim() || 'Post-discharge recovery';
    const checkedRisks = [...document.querySelectorAll('input[name="riskChip"]:checked')].map(c => c.value);
    const risk_factors = checkedRisks.join(', ');

    const qRes = await apiPost('/api/generate-questions', {
      diagnosis: diag,
      risk_factors,
      medicines
    });

    if (Array.isArray(qRes?.questions)) {
      appState.generatedMcqQuestions = qRes.questions;
      renderMcqPreviewList(qRes.questions);
    }
  } catch (err) {
    console.warn('Prescription OCR scan error:', err);
    intakeExtractedMedsTitle.textContent = 'Prescription Reader Notice';
    intakeExtractedMedsList.innerHTML = `
      <div style="padding: 0.8rem; background: rgba(245,158,11,0.12); border-radius: 6px; color: #fcd34d; font-size: 0.82rem">
        Prescription saved. Medication details will be confirmed by the attending pharmacist.
      </div>
    `;
  }
}

function renderExtractedMedsList(medicines) {
  if (!medicines || medicines.length === 0) {
    intakeExtractedMedsTitle.textContent = 'No medications detected';
    intakeExtractedMedsList.innerHTML = `
      <div style="padding: 0.75rem; color: var(--text-muted); font-size: 0.82rem">
        Unable to clearly detect distinct medicines on image. You may enroll the patient directly.
      </div>
    `;
    return;
  }

  intakeExtractedMedsTitle.textContent = `Extracted Medicines & Dosages (${medicines.length} found)`;
  intakeExtractedMedsList.innerHTML = medicines.map((m, idx) => {
    const similarChips = (m.similar_drugs || []).map(s => `<span class="med-similar-chip">${escapeHtml(s)}</span>`).join(' ');
    return `
      <div class="extracted-med-card">
        <div class="extracted-med-top">
          <div class="med-name-badge">
            <span>💊</span> ${escapeHtml(m.drug_name || 'Prescribed Medicine')}
          </div>
          <span class="med-dosage-pill">${escapeHtml(m.strength || m.dosage || 'Dosage as prescribed')}</span>
        </div>

        <div class="med-meta-row">
          <span class="med-freq-tag">⏱️ ${escapeHtml(m.frequency || 'Schedule as directed')}</span>
          ${m.timing ? `<span class="med-timing-tag">🍽️ ${escapeHtml(m.timing)}</span>` : ''}
          ${m.duration ? `<span class="med-freq-tag" style="color:#7dd3fc; background:rgba(14,165,233,0.12); border-color:rgba(14,165,233,0.25)">📅 ${escapeHtml(m.duration)}</span>` : ''}
        </div>

        ${m.plain_instructions ? `
          <div class="med-instructions-text">
            <strong>Directions:</strong> ${escapeHtml(m.plain_instructions)}
          </div>
        ` : ''}

        ${m.lasa_warning ? `
          <div class="med-lasa-alert">
            <span>⚠️</span> <span>${escapeHtml(m.lasa_warning)}</span>
          </div>
        ` : ''}

        ${similarChips ? `
          <div class="med-similars-row">
            <span>Generic / Same Salt Alternatives:</span>
            ${similarChips}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderMcqPreviewList(questions) {
  if (!questions || questions.length === 0) return;
  aiQuestionsPreviewList.innerHTML = questions.map((q, idx) => {
    const optionsHtml = (q.options || []).map((opt, oIdx) => {
      const letterClass = ['opt-letter-a', 'opt-letter-b', 'opt-letter-c', 'opt-letter-d'][oIdx] || 'opt-letter-a';
      const letter = ['A', 'B', 'C', 'D'][oIdx] || 'A';
      return `
        <div class="mcq-option-row">
          <span class="mcq-opt-letter ${letterClass}">${letter}</span>
          <span style="font-size:0.78rem">${escapeHtml(opt)}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="mcq-preview-card">
        <div class="mcq-q-header">
          <span class="mcq-q-badge">MCQ ${idx + 1}</span>
          <span>${escapeHtml(q.text || q)}</span>
        </div>
        <div class="mcq-options-grid">
          ${optionsHtml}
        </div>
      </div>
    `;
  }).join('');
}

function renderDefaultIntakeMcqs() {
  const defaultQuestions = [
    {
      text: 'How is your recovery and pain level today?',
      options: [
        'A) Completely comfortable — no pain',
        'B) Mild soreness — well managed with medication',
        'C) Moderate discomfort interfering with daily rest',
        'D) Severe unmanageable pain or sudden worsening'
      ]
    },
    {
      text: 'Have you been taking all your discharge medications as prescribed?',
      options: [
        'A) Yes — taking all doses on time',
        'B) Missed one dose but back on schedule',
        'C) Experiencing mild side effects / nausea',
        'D) Stopped taking medications completely'
      ]
    },
    {
      text: 'Have you noticed any high fever, bleeding, or dizziness today?',
      options: [
        'A) None — temperature normal (< 99°F), feeling stable',
        'B) Mild warmth / slight tiredness',
        'C) Temperature between 100°F and 100.8°F',
        'D) High fever > 101°F with chills or dizziness'
      ]
    }
  ];
  renderMcqPreviewList(defaultQuestions);
}

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
    const medicines = appState.extractedMedicines.length > 0 ? appState.extractedMedicines : [];

    if (appState.nurseUser?.session?.access_token) {
      const res = await apiPost('/api/add-patient', {
        name,
        email: contact,
        whatsapp_number: contact,
        diagnosis: diag,
        risk_factors,
        medicines,
        image: intakePhotoBase64,
        mimeType: intakePhotoMime
      }, appState.nurseUser.session.access_token);
      newPatient = res.patient;
    } else {
      newPatient = {
        id: 'patient-' + Date.now(),
        name,
        email: contact,
        whatsapp_number: contact,
        diagnosis: diag,
        risk_factors,
        medicines,
        checkin_questions: appState.generatedMcqQuestions.length > 0 ? appState.generatedMcqQuestions : [],
        status: 'active',
        created_at: new Date().toISOString(),
        responses: [
          {
            id: 'resp-welcome-' + Date.now(),
            question: `How is your recovery comfort today?`,
            answer: 'Option A: Discharged safely, resting comfortably at home with all medications.',
            urgency_level: 'normal',
            timestamp: new Date().toISOString(),
            advice: 'Patient enrolled and recovery MCQ protocol initialized.'
          }
        ]
      };
    }

    if (newPatient) {
      appState.patients.unshift(newPatient);
      saveStoredPatients(appState.patients);
    }

    intakeSuccessBox.textContent = `✅ Patient ${name} enrolled successfully with ${medicines.length} medication(s)! Automated MCQ check-ins scheduled.`;
    intakeSuccessBox.classList.remove('hidden');
    nurseIntakeForm.reset();
    intakePhotoBase64 = null;
    dropzoneEmptyState.classList.remove('hidden');
    dropzoneActiveState.classList.add('hidden');
    intakeExtractedMedsBox.classList.add('hidden');
    appState.extractedMedicines = [];

    setTimeout(() => {
      switchWorkspaceView('dashboard');
    }, 1400);

  } catch (err) {
    intakeErrorBox.textContent = err.message || 'Failed to enroll patient.';
    intakeErrorBox.classList.remove('hidden');
  } finally {
    intakeSubmitActionBtn.disabled = false;
  }
});

/* =========================================================================
   7. CARE TIMELINE & INTERACTIVE MCQ TRIAGE SIMULATOR
   ========================================================================= */
function renderTimelineView() {
  populateTimelineDropdown();

  const patient = appState.patients.find(p => p.id === appState.selectedPatientId);
  if (!patient) return;

  tlPatientName.textContent = patient.name;
  tlPatientMeta.textContent = `${patient.diagnosis || 'Post-discharge monitoring'} · Contact: ${patient.email || patient.whatsapp_number || 'N/A'}`;

  const isFlagged = patient.status === 'flagged';
  tlPatientStatusBadge.className = `status-badge ${isFlagged ? 'urgent' : 'normal'}`;
  tlPatientStatusBadge.textContent = isFlagged ? '🚨 ATTENTION NEEDED' : '🟢 NORMAL RECOVERY';

  tlResolveFlagBtn.style.display = isFlagged ? 'inline-block' : 'none';

  const risks = typeof patient.risk_factors === 'string'
    ? patient.risk_factors.split(',').map(r => r.trim()).filter(Boolean)
    : (Array.isArray(patient.risk_factors) ? patient.risk_factors : []);

  tlPatientRiskChips.innerHTML = risks
    .map(r => `<span style="font-size:0.72rem; background:rgba(245,158,11,0.12); color:#fcd34d; border:1px solid rgba(245,158,11,0.25); padding:0.15rem 0.45rem; border-radius:4px; font-weight:600">${escapeHtml(r)}</span>`)
    .join('');

  // Prescribed Meds with full dosage details
  const meds = Array.isArray(patient.medicines) ? patient.medicines : [];
  if (meds.length > 0) {
    tlMedsList.innerHTML = meds.map(m => `
      <div style="background:rgba(8,12,20,0.6); border:1px solid var(--surface-border); padding:0.6rem 0.85rem; border-radius:var(--radius-md); font-size:0.82rem">
        <div style="display:flex; justify-content:space-between; align-items:baseline">
          <strong style="color:#38bdf8">${escapeHtml(m.drug_name || 'Medication')}</strong>
          <span style="color:#fcd34d; font-weight:700">${escapeHtml(m.strength || m.dosage || '')}</span>
        </div>
        <div style="color:var(--text-secondary); font-size:0.78rem; margin-top:0.2rem">
          ⏱️ ${escapeHtml(m.frequency || m.dosage_frequency || m.timing || 'As directed')}
        </div>
        ${m.plain_instructions ? `<div style="color:var(--text-muted); font-size:0.76rem; margin-top:0.2rem">${escapeHtml(m.plain_instructions)}</div>` : ''}
      </div>
    `).join('');
  } else {
    tlMedsList.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted)">No medications recorded.</span>';
  }

  // Populate Simulator MCQ Questions
  populateSimulatorQuestions(patient);

  // Conversation feed
  const responses = Array.isArray(patient.responses) ? patient.responses : [];
  tlInteractionCount.textContent = `${responses.length} interaction(s)`;

  if (responses.length === 0) {
    tlChatThread.innerHTML = `
      <div class="empty-state-card">
        No check-in responses recorded yet. Use the Clinical AI MCQ Triage Sandbox on the right to simulate an incoming choice.
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
          <strong>CareAfter MCQ Check-in Sent:</strong><br/>
          ${escapeHtml(r.question)}
        </div>

        <div class="bubble-reply">
          <strong>Patient MCQ Reply:</strong><br/>
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

function populateSimulatorQuestions(patient) {
  const questions = Array.isArray(patient.checkin_questions) && patient.checkin_questions.length > 0
    ? patient.checkin_questions
    : [
        {
          id: 'q1',
          text: 'How are your surgical incision and pain levels today?',
          options: [
            'A) Normal — Minimal or no pain, incision clean & dry',
            'B) Mild soreness — Relieved with prescribed medications',
            'C) Moderate throbbing pain or slight swelling around wound',
            'D) Severe unmanageable pain, high fever > 100.4°F, or active bleeding'
          ]
        },
        {
          id: 'q2',
          text: 'Have you taken all your discharge medications as prescribed?',
          options: [
            'A) Yes — Taking all medications on schedule',
            'B) Missed one dose today but back on schedule',
            'C) Experiencing nausea or stomach cramps after taking pills',
            'D) Stopped taking prescribed medications completely'
          ]
        }
      ];

  sbQuestionSelect.innerHTML = questions.map((q, idx) => `
    <option value="${idx}">${idx + 1}. ${escapeHtml(q.text || q)}</option>
  `).join('');

  renderSimulatorMcqOptions(questions[0]);

  sbQuestionSelect.onchange = () => {
    const selectedIdx = parseInt(sbQuestionSelect.value, 10) || 0;
    renderSimulatorMcqOptions(questions[selectedIdx] || questions[0]);
  };
}

function renderSimulatorMcqOptions(questionObj) {
  if (!questionObj) return;
  const options = questionObj.options || [
    'A) Normal / Healing well',
    'B) Mild symptoms / manageable',
    'C) Moderate discomfort / concern',
    'D) Severe red-flag symptoms'
  ];

  sbMcqOptionsContainer.innerHTML = options.map((opt, oIdx) => {
    const letter = ['A', 'B', 'C', 'D'][oIdx] || 'A';
    const letterClass = ['opt-letter-a', 'opt-letter-b', 'opt-letter-c', 'opt-letter-d'][oIdx] || 'opt-letter-a';
    return `
      <button type="button" class="mcq-choice-btn ${oIdx === 0 ? 'selected selected-normal' : ''}" data-idx="${oIdx}" data-letter="${letter}" data-text="${escapeHtml(opt)}">
        <span class="mcq-opt-letter ${letterClass}">${letter}</span>
        <span style="flex:1">${escapeHtml(opt)}</span>
      </button>
    `;
  }).join('');

  appState.selectedSimulatorOption = options[0];

  const btns = sbMcqOptionsContainer.querySelectorAll('.mcq-choice-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.className = 'mcq-choice-btn');
      const letter = btn.dataset.letter;
      const highlightClass = letter === 'D' ? 'selected-urgent' : (letter === 'C' ? 'selected-concern' : 'selected-normal');
      btn.classList.add('selected', highlightClass);
      appState.selectedSimulatorOption = btn.dataset.text;
    });
  });
}

// Urgency Presets for simulator
presetNormalBtn.addEventListener('click', () => {
  const btns = sbMcqOptionsContainer.querySelectorAll('.mcq-choice-btn');
  if (btns[0]) btns[0].click();
  sbCustomNote.value = 'Feeling well, taking medicines with food.';
});

presetConcernBtn.addEventListener('click', () => {
  const btns = sbMcqOptionsContainer.querySelectorAll('.mcq-choice-btn');
  if (btns[2]) btns[2].click();
  sbCustomNote.value = 'Mildly dizzy when standing up this morning.';
});

presetUrgentBtn.addEventListener('click', () => {
  const btns = sbMcqOptionsContainer.querySelectorAll('.mcq-choice-btn');
  if (btns[3]) btns[3].click();
  sbCustomNote.value = 'High fever 102.4°F with chills and heavy nausea.';
});

sandboxForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const patient = appState.patients.find(p => p.id === appState.selectedPatientId);
  if (!patient) return;

  const qText = sbQuestionSelect.options[sbQuestionSelect.selectedIndex]?.text || 'Recovery Check-in Question';
  const choiceText = appState.selectedSimulatorOption || 'Option A: Normal';
  const customNote = sbCustomNote.value.trim();
  const fullAnswer = customNote ? `${choiceText} (${customNote})` : choiceText;

  sbSubmitBtn.disabled = true;

  try {
    let urgency = 'normal';
    let advice = '';

    try {
      const res = await apiPost('/api/assess-response', {
        patient_id: patient.id,
        question: qText,
        answer: fullAnswer
      }, appState.nurseUser?.session?.access_token);
      urgency = (res?.urgency || 'normal').toLowerCase();
      advice = res?.advice || '';
    } catch (err) {
      if (fullAnswer.includes('Option D') || fullAnswer.includes('D)') || fullAnswer.toLowerCase().includes('fever') || fullAnswer.toLowerCase().includes('bleeding')) {
        urgency = 'urgent';
        advice = 'Emergency recovery complication reported. Attending nurse and physician alerted.';
      } else if (fullAnswer.includes('Option C') || fullAnswer.includes('C)') || fullAnswer.toLowerCase().includes('dizzy') || fullAnswer.toLowerCase().includes('nausea')) {
        urgency = 'concern';
        advice = 'Moderate symptoms reported. Follow-up nurse phone check advised.';
      } else {
        urgency = 'normal';
        advice = 'Patient reports recovery within expected parameters.';
      }
    }

    const newResp = {
      id: 'resp-' + Date.now(),
      question: qText,
      answer: fullAnswer,
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
    sbCustomNote.value = '';

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

    const medicines = Array.isArray(data?.medicines) ? data.medicines : [];
    const firstMed = medicines[0] || {};

    lasaFoundDrug.textContent = medicines.map(m => m.drug_name).filter(Boolean).join(', ') || firstMed.drug_name || '—';
    lasaFoundDosage.textContent = medicines.map(m => `${m.drug_name}: ${m.strength || m.dosage || ''} (${m.frequency || ''})`).join(' | ') || `${firstMed.strength || ''} ${firstMed.frequency || ''}`;

    const hasLasa = medicines.some(m => m.lasa_warning);
    if (hasLasa) {
      const warnings = medicines.filter(m => m.lasa_warning).map(m => m.lasa_warning).join('<br/>');
      lasaAlertBanner.innerHTML = `<strong>⚠️ Look-Alike Sound-Alike Alert:</strong><br/>${warnings}`;
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
        .order('timestamp', { ascending: false });

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


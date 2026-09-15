import { requireSession, supabase } from './supabaseClient.js';

const params = new URLSearchParams(window.location.search);
const patientId = params.get('id');
const timeline = document.getElementById('timeline');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');
const patientTitle = document.getElementById('patientTitle');
const patientSub = document.getElementById('patientSub');

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatWhen(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

async function init() {
  const session = await requireSession();
  if (!session) return;

  if (!patientId) {
    errorMessage.textContent = 'Missing patient id.';
    errorBox.classList.remove('hidden');
    return;
  }

  const { data: patient, error: pErr } = await supabase
    .from('patients')
    .select('id, name, diagnosis, status, whatsapp_number')
    .eq('id', patientId)
    .maybeSingle();

  if (pErr || !patient) {
    errorMessage.textContent = pErr?.message || 'Patient not found.';
    errorBox.classList.remove('hidden');
    return;
  }

  patientTitle.textContent = patient.name;
  patientSub.textContent = `${patient.diagnosis || ''} · ${patient.status}${patient.whatsapp_number ? ' · ' + patient.whatsapp_number : ''}`;

  const { data: rows, error: rErr } = await supabase
    .from('checkin_responses')
    .select('id, question, answer, urgency_level, timestamp')
    .eq('patient_id', patientId)
    .order('timestamp', { ascending: true });

  if (rErr) {
    errorMessage.textContent = rErr.message;
    errorBox.classList.remove('hidden');
  } else if (!rows || !rows.length) {
    timeline.innerHTML = '<p class="empty-note">No check-in responses yet.</p>';
  } else {
    timeline.innerHTML = rows
      .map((row) => {
        const level = (row.urgency_level || 'normal').toLowerCase();
        return `<article class="timeline-item">
          <div class="meta">${escapeHtml(formatWhen(row.timestamp))} · <span class="urgency-${escapeHtml(level)}">${escapeHtml(level)}</span></div>
          <p><strong>Q:</strong> ${escapeHtml(row.question)}</p>
          <p><strong>A:</strong> ${escapeHtml(row.answer)}</p>
        </article>`;
      })
      .join('');
  }
}

init();

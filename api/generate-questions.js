import { applyCors, geminiJson, json, parseBody, requireStaff } from './_shared.js';

const FALLBACK_MCQ_SETS = {
  gastric: [
    {
      id: 'q1',
      text: 'How are your stomach symptoms, heartburn, or acid reflux today?',
      options: [
        'A) Completely normal — no heartburn or reflux',
        'B) Mild acidity or gas — well managed with water / light food',
        'C) Moderate burning sensation or indigestion after eating',
        'D) Severe burning, vomiting, or black / tarry stools'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q2',
      text: 'Have you been taking your prescribed gastric medications (e.g. Pantoprazole, Sucralfate)?',
      options: [
        'A) Yes, taking all doses on time before meals',
        'B) Missed one dose but took the rest as prescribed',
        'C) Experiencing nausea or stomach cramps after taking them',
        'D) Stopped taking medications completely'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q3',
      text: 'Are you able to eat and drink liquids comfortably?',
      options: [
        'A) Eating light meals and drinking fluids without issue',
        'B) Slight fullness or mild bloating after meals',
        'C) Struggling to keep solid foods down',
        'D) Unable to tolerate even water, persistent nausea or vomiting'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q4',
      text: 'Are you having any abdominal pain or cramping?',
      options: [
        'A) No abdominal pain',
        'B) Mild occasional cramp, eases after resting',
        'C) Moderate constant pain in upper stomach',
        'D) Severe sharp pain, rigid abdomen, or dizziness'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    }
  ],
  dental: [
    {
      id: 'q1',
      text: 'How is your mouth/jaw pain and swelling around the extraction or surgical site today?',
      options: [
        'A) Minimal to no pain, swelling visibly reduced',
        'B) Mild soreness, well controlled with prescribed pain relief',
        'C) Moderate throbbing pain radiating to ear or cheek',
        'D) Severe unbearable pain, fever, or difficulty opening mouth / swallowing'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q2',
      text: 'Have you noticed any bleeding or discharge from the mouth?',
      options: [
        'A) No bleeding, clean blood clot formed',
        'B) Slight pink saliva when rinsing gently',
        'C) Steady light oozing requiring frequent gauze changes',
        'D) Continuous active bleeding, heavy blood clots, or foul-smelling pus'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q3',
      text: 'Are you taking your prescribed antibiotics and pain relievers on schedule?',
      options: [
        'A) Yes, taking full prescribed doses on schedule',
        'B) Taking pain relief only when needed, finished antibiotics',
        'C) Missed multiple doses due to upset stomach',
        'D) Unable to swallow pills due to throat swelling'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q4',
      text: 'How is your oral hygiene routine and soft diet intake?',
      options: [
        'A) Doing warm salt-water rinses and eating soft foods easily',
        'B) Mild discomfort while chewing soft foods',
        'C) Unable to chew soft foods, relying solely on fluids',
        'D) Cannot open mouth at all (trismus) or high fever > 101°F'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    }
  ],
  cardiac: [
    {
      id: 'q1',
      text: 'Are you experiencing any chest discomfort, tightness, or pressure today?',
      options: [
        'A) No chest pain or tightness at all',
        'B) Mild fleeting muscular soreness when moving',
        'C) Moderate heaviness or tightness that eases with rest',
        'D) Severe crushing chest pain, radiating to arm/jaw, sweating, or nausea'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q2',
      text: 'How is your breathing today compared to discharge?',
      options: [
        'A) Breathing comfortably at rest and with gentle walking',
        'B) Mild breathlessness after climbing a full flight of stairs',
        'C) Noticeable shortness of breath during routine household tasks',
        'D) Severe breathlessness while lying flat in bed or sitting still'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q3',
      text: 'Have you taken all your prescribed cardiac medications (blood thinners, BP, statins) today?',
      options: [
        'A) Yes, all morning and evening doses taken on time',
        'B) Delayed by a few hours but taken',
        'C) Missed a dose due to dizziness or low heart rate',
        'D) Stopped cardiac medicines due to severe side effects or confusion'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q4',
      text: 'Have you noticed any irregular heartbeat, dizziness, or leg swelling?',
      options: [
        'A) Heart rhythm steady, no dizziness, no swelling',
        'B) Very brief lightheadedness when standing quickly',
        'C) Mild new puffiness around ankles or occasional heart flutter',
        'D) Rapid racing heart, fainting episode, or severe leg swelling'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    }
  ],
  general: [
    {
      id: 'q1',
      text: 'How is your overall recovery and pain level today?',
      options: [
        'A) Feeling good, minimal pain, resting comfortably',
        'B) Mild pain, well managed with prescribed medications',
        'C) Moderate discomfort interfering with sleep or mobility',
        'D) Severe unmanaged pain or sudden worsening'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q2',
      text: 'Have you had any fever, chills, or sweating?',
      options: [
        'A) No fever or chills, temperature normal (< 99°F)',
        'B) Mild warmth feeling, temperature below 100°F',
        'C) Low-grade fever between 100°F and 100.8°F',
        'D) High fever above 101°F with intense chills / shivering'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q3',
      text: 'Have you been taking your discharge medications as prescribed?',
      options: [
        'A) Yes, taking all doses exactly as directed',
        'B) Missed one dose but back on schedule',
        'C) Having mild side effects (nausea/drowsiness)',
        'D) Stopped taking medications or having allergic rash'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    },
    {
      id: 'q4',
      text: 'How are your appetite, fluid intake, and daily movement?',
      options: [
        'A) Eating well, staying hydrated, moving around gently',
        'B) Reduced appetite but drinking plenty of water',
        'C) Feeling weak, struggling to eat solid meals',
        'D) Unable to keep fluids down, extreme dizziness, or unable to get out of bed'
      ],
      urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
    }
  ]
};

function getFallbackQuestions(diagnosis, riskFactors) {
  const combined = `${diagnosis || ''} ${riskFactors || ''}`.toLowerCase();
  if (combined.includes('gastric') || combined.includes('acid') || combined.includes('reflux') || combined.includes('stomach') || combined.includes('ulcer') || combined.includes('gerd')) {
    return FALLBACK_MCQ_SETS.gastric;
  }
  if (combined.includes('dent') || combined.includes('tooth') || combined.includes('extract') || combined.includes('gum') || combined.includes('oral')) {
    return FALLBACK_MCQ_SETS.dental;
  }
  if (combined.includes('heart') || combined.includes('cardiac') || combined.includes('angina') || combined.includes('infarct') || combined.includes('stent') || combined.includes('bp') || combined.includes('hypertens')) {
    return FALLBACK_MCQ_SETS.cardiac;
  }
  return FALLBACK_MCQ_SETS.general;
}

/**
 * Given diagnosis + risk factors, returns 4 condition-specific Multiple Choice Questions (MCQ).
 * Each question has 4 distinct options (A: Normal, B: Mild, C: Moderate Concern, D: Severe/Urgent)
 */
export async function generateCheckinQuestions(diagnosis, riskFactors, medicines = []) {
  const dx = (diagnosis || '').trim() || 'unspecified recovery after hospital discharge';
  const risks = (riskFactors || '').trim() || 'none specified';
  const medNames = Array.isArray(medicines)
    ? medicines.map((m) => m.drug_name || m.name || m).filter(Boolean).join(', ')
    : '';

  const prompt = `You are an expert clinical triage physician designing an automated post-discharge recovery monitoring check-in sequence for a patient.
Patient Discharge Diagnosis: [${dx}]
Clinical Risk Factors: [${risks}]
Prescribed Medications: [${medNames || 'Standard post-discharge regimen'}]

Generate EXACTLY 4 condition-specific Multiple Choice Questions (MCQs) for the patient.
DO NOT create long open-ended questions. Each question must be an MCQ with exactly 4 clear options (A, B, C, D):
- Option A must represent: Completely Normal / Healthy recovery (No adverse symptoms)
- Option B must represent: Mild / Manageable symptom (Controlled with medication / rest)
- Option C must represent: Moderate concern (Needs monitoring / nurse phone check)
- Option D must represent: Severe / Urgent red flag (Emergency complication, high fever, severe pain, bleeding, etc.)

Return ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "id": "q1",
      "text": "Short, clear patient-friendly question (e.g. How is your surgical incision / pain level today?)",
      "options": [
        "A) Option A text",
        "B) Option B text",
        "C) Option C text",
        "D) Option D text"
      ]
    }
  ]
}`;

  try {
    const parsed = await geminiJson(prompt);
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const cleaned = questions
      .filter((q) => q && typeof q === 'object' && q.text && Array.isArray(q.options) && q.options.length >= 3)
      .map((q, idx) => ({
        id: q.id || `q${idx + 1}`,
        text: String(q.text).trim(),
        options: q.options.map((opt, oIdx) => {
          const raw = String(opt).trim();
          const letter = ['A', 'B', 'C', 'D'][oIdx] || 'A';
          if (/^[A-D]\)/i.test(raw)) return raw;
          return `${letter}) ${raw}`;
        }),
        urgency_map: { A: 'normal', B: 'normal', C: 'concern', D: 'urgent' }
      }))
      .slice(0, 4);

    if (cleaned.length >= 3) return { questions: cleaned };
  } catch (err) {
    console.warn('generateCheckinQuestions Gemini fallback:', err.message);
  }

  return { questions: getFallbackQuestions(diagnosis, riskFactors) };
}

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return json(res, 405, { error: 'Method Not Allowed. Only POST is accepted.' });
  }

  try {
    await requireStaff(req);
    const body = parseBody(req);
    if (!body) return json(res, 400, { error: 'Invalid JSON body.' });

    const result = await generateCheckinQuestions(body.diagnosis, body.risk_factors, body.medicines);
    return json(res, 200, result);
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Failed to generate questions.' });
  }
}

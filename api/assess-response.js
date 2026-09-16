import { applyCors, geminiJson, json, parseBody, requireStaff } from './_shared.js';

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return json(res, 405, { error: 'Method Not Allowed. Only POST is accepted.' });
  }

  try {
    const { supabase, staff } = await requireStaff(req);
    const body = parseBody(req);
    if (!body) return json(res, 400, { error: 'Invalid JSON body.' });

    const { patient_id, question, answer } = body;
    if (!patient_id || !question || answer === undefined || answer === '') {
      return json(res, 400, { error: 'patient_id, question, and answer are required.' });
    }

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, hospital_id, diagnosis, risk_factors, status')
      .eq('id', patient_id)
      .eq('hospital_id', staff.hospital_id)
      .maybeSingle();

    if (patientError) return json(res, 500, { error: patientError.message });
    if (!patient) return json(res, 404, { error: 'Patient not found.' });

    const condition = `${patient.diagnosis || 'unspecified'}${patient.risk_factors ? `; risk factors: ${patient.risk_factors}` : ''}`;
    const ansStr = String(answer).trim();

    // Fast deterministic heuristic for direct MCQ option letters
    let heuristicUrgency = null;
    let heuristicAdvice = '';
    const upper = ansStr.toUpperCase();

    if (/^(D\b|OPTION\s*D|4\s*:\s*D)/i.test(ansStr) || ansStr.includes('Option D') || upper.startsWith('D)') || ansStr.includes('D)')) {
      heuristicUrgency = 'urgent';
      heuristicAdvice = 'Patient reported severe red-flag complication symptoms (Option D). Immediate nurse clinical triage & attending physician notification required.';
    } else if (/^(C\b|OPTION\s*C|3\s*:\s*C)/i.test(ansStr) || ansStr.includes('Option C') || upper.startsWith('C)') || ansStr.includes('C)')) {
      heuristicUrgency = 'concern';
      heuristicAdvice = 'Patient reported moderate recovery discomfort (Option C). Attending nurse phone check-in advised within 2-4 hours.';
    } else if (/^(A\b|B\b|OPTION\s*[AB]|1\s*:\s*[AB]|2\s*:\s*[AB])/i.test(ansStr) || ansStr.includes('Option A') || ansStr.includes('Option B')) {
      heuristicUrgency = 'normal';
      heuristicAdvice = 'Patient reported healthy recovery progression (Option A/B). Continue prescribed medication and routine monitoring.';
    }

    const prompt = `You are a clinical nurse specialist reviewing a post-discharge patient's MCQ check-in response.
Patient Condition & Risk Factors: [${condition}]
Check-in Question: [${question}]
Patient MCQ Selection / Response: "${ansStr}"

Instructions:
- If the patient chose Option D or reported red-flag symptoms (severe chest pain, high fever > 100.4F, bleeding, unable to breathe/swallow/eat, persistent vomiting), urgency MUST be "urgent".
- If the patient chose Option C or reported moderate worsening symptoms (increasing pain, missed doses, nausea), urgency is "concern".
- If the patient chose Option A or B (normal recovery, mild manageable discomfort, taking meds), urgency is "normal".

Assess the response and return ONLY valid JSON:
{
  "urgency": "normal" | "concern" | "urgent",
  "advice": "1 concise sentence with clinical action for nurse or reassurance for patient"
}`;

    let urgency = heuristicUrgency || 'normal';
    let advice = heuristicAdvice || '';
    try {
      const parsed = await geminiJson(prompt);
      const raw = String(parsed?.urgency || '').toLowerCase();
      if (raw === 'urgent' || raw === 'concern' || raw === 'normal') {
        urgency = raw;
      }
      if (typeof parsed?.advice === 'string' && parsed.advice.trim()) {
        advice = parsed.advice.trim();
      }
    } catch (err) {
      console.warn('assess-response Gemini fallback:', err.message);
      if (!heuristicUrgency) {
        const lower = ansStr.toLowerCase();
        if (lower.includes('chest') || lower.includes('fever') || lower.includes('bleeding') || lower.includes('breath') || lower.includes('vomit') || lower.includes('severe') || lower.includes('pus')) {
          urgency = 'urgent';
          advice = 'Urgent post-op or cardiac symptoms detected. Contact patient immediately.';
        } else if (lower.includes('dizzy') || lower.includes('pain') || lower.includes('nausea') || lower.includes('missed') || lower.includes('swelling')) {
          urgency = 'concern';
          advice = 'Moderate symptoms reported. Follow-up phone check advised.';
        } else {
          urgency = 'normal';
          advice = 'Patient reports recovery within expected parameters.';
        }
      }
    }

    const { data: saved, error: saveError } = await supabase
      .from('checkin_responses')
      .insert({
        patient_id: patient.id,
        question,
        answer: String(answer),
        urgency_level: urgency
      })
      .select('id, patient_id, question, answer, urgency_level, timestamp')
      .single();

    if (saveError) return json(res, 500, { error: saveError.message });

    if (urgency === 'concern' || urgency === 'urgent') {
      const { error: flagError } = await supabase
        .from('patients')
        .update({ status: 'flagged' })
        .eq('id', patient.id)
        .eq('hospital_id', staff.hospital_id);
      if (flagError) console.warn('Failed to flag patient:', flagError.message);
    }

    return json(res, 200, {
      urgency,
      advice,
      response: saved,
      patient_status: urgency === 'concern' || urgency === 'urgent' ? 'flagged' : patient.status
    });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Failed to assess response.' });
  }
}

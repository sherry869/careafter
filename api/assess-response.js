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
    const prompt = `Given this patient's condition: [${condition}] and their check-in answer: [question: ${question}; answer: ${answer}], assess urgency as one of: normal, concern, urgent. If concern or urgent, provide one sentence of advice for the patient. Return ONLY valid JSON: {"urgency": "", "advice": ""}`;

    let urgency = 'normal';
    let advice = '';
    try {
      const parsed = await geminiJson(prompt);
      const raw = String(parsed?.urgency || 'normal').toLowerCase();
      urgency = raw === 'urgent' || raw === 'concern' ? raw : 'normal';
      advice = typeof parsed?.advice === 'string' ? parsed.advice.trim() : '';
      if (urgency === 'normal') advice = advice || '';
    } catch (err) {
      console.warn('assess-response Gemini fallback:', err.message);
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

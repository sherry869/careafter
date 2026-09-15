import { applyCors, geminiJson, json, parseBody, requireStaff } from './_shared.js';

const FALLBACK_QUESTIONS = [
  { text: 'Have you been taking your medicines as prescribed?', answer_type: 'yes_no' },
  { text: 'Are you having any new or worsening pain?', answer_type: 'severity' },
  { text: 'Do you feel more short of breath than yesterday?', answer_type: 'severity' },
  { text: 'Have you had fever, dizziness, or vomiting today?', answer_type: 'yes_no' },
  { text: 'Are you able to eat, drink, and rest reasonably well?', answer_type: 'yes_no' }
];

/**
 * Given diagnosis + risk factors, returns 4-5 condition-specific check-in questions.
 */
export async function generateCheckinQuestions(diagnosis, riskFactors) {
  const dx = (diagnosis || '').trim() || 'unspecified recovery after hospital discharge';
  const risks = (riskFactors || '').trim() || 'none specified';

  const prompt = `Given a patient discharged with diagnosis: [${dx}] and risk factors: [${risks}], generate 4-5 simple check-in questions to monitor recovery, each answerable with Yes/No/Moderate/Severe. Return ONLY valid JSON: {"questions": [{"text": "", "answer_type": "yes_no" or "severity"}]}`;

  try {
    const parsed = await geminiJson(prompt);
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const cleaned = questions
      .filter((q) => q && typeof q === 'object' && q.text)
      .map((q) => ({
        text: String(q.text).trim(),
        answer_type: q.answer_type === 'severity' ? 'severity' : 'yes_no'
      }))
      .slice(0, 5);

    if (cleaned.length >= 4) return { questions: cleaned };
  } catch (err) {
    console.warn('generateCheckinQuestions Gemini fallback:', err.message);
  }

  return { questions: FALLBACK_QUESTIONS };
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

    const result = await generateCheckinQuestions(body.diagnosis, body.risk_factors);
    return json(res, 200, result);
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Failed to generate questions.' });
  }
}

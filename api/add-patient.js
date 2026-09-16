import analyzeHandler from './analyze.js';
import { generateCheckinQuestions } from './generate-questions.js';
import { applyCors, json, parseBody, requireStaff } from './_shared.js';

function invokeAnalyze(image, mimeType) {
  return new Promise((resolve, reject) => {
    const req = {
      method: 'POST',
      body: { image, mimeType: mimeType || 'image/jpeg' }
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader() {
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, data });
        return this;
      },
      end(body) {
        try {
          const data = typeof body === 'string' ? JSON.parse(body) : body;
          resolve({ status: this.statusCode, data });
        } catch {
          resolve({ status: this.statusCode, data: { error: String(body || 'Analyze failed') } });
        }
      }
    };

    Promise.resolve(analyzeHandler(req, res)).catch(reject);
  });
}

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

    const name = (body.name || '').trim();
    const contactEmail = (body.email || body.whatsapp_number || '').trim();
    const diagnosis = (body.diagnosis || '').trim();
    const risk_factors = Array.isArray(body.risk_factors)
      ? body.risk_factors.filter(Boolean).join(', ')
      : (body.risk_factors || '').trim();

    if (!name || !contactEmail || !diagnosis) {
      return json(res, 400, { error: 'Patient name, email contact, and diagnosis are required.' });
    }

    let medicines = Array.isArray(body.medicines) ? body.medicines : [];
    if (body.image && medicines.length === 0) {
      const analyzed = await invokeAnalyze(body.image, body.mimeType);
      if (analyzed.status >= 400) {
        return json(res, analyzed.status, {
          error: analyzed.data?.error || 'Prescription scan failed.'
        });
      }
      medicines = Array.isArray(analyzed.data?.medicines) ? analyzed.data.medicines : [];
    }

    const { questions } = await generateCheckinQuestions(diagnosis, risk_factors, medicines);

    const { data: patient, error: insertError } = await supabase
      .from('patients')
      .insert({
        hospital_id: staff.hospital_id,
        name,
        whatsapp_number: contactEmail,
        diagnosis,
        risk_factors,
        medicines,
        status: 'active'
      })
      .select('id, hospital_id, name, whatsapp_number, diagnosis, risk_factors, medicines, created_at, status')
      .single();

    if (insertError) return json(res, 500, { error: insertError.message });

    const { error: qError } = await supabase.from('checkin_questions').insert({
      patient_id: patient.id,
      questions
    });

    if (qError) return json(res, 500, { error: qError.message });

    return json(res, 200, {
      message: 'Patient enrolled successfully. Recovery check-in emails scheduled.',
      patient: { ...patient, email: contactEmail },
      questions
    });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Failed to add patient.' });
  }
}

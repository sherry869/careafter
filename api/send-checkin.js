import nodemailer from 'nodemailer';
import { applyCors, json, parseBody, requireStaff } from './_shared.js';

/**
 * Sends a CareAfter Email check-in message for one patient.
 *
 * Trigger this endpoint from a scheduled job or manual staff check-in.
 * POST /api/send-checkin { "patient_id": "<id>" } or { "to": "patient@email.com", "message": "..." }
 * with a staff bearer token.
 */
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

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailFrom = process.env.EMAIL_FROM || emailUser;

    if (!emailUser || !emailPass) {
      return json(res, 500, {
        error: 'Email credentials are not configured. Set EMAIL_USER and EMAIL_PASS.'
      });
    }

    const { patient_id, to, message } = body;
    let destination = to;
    let text = message;
    let patientName = 'Patient';
    let condition = 'Post-Discharge Recovery';

    if (patient_id) {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, name, email, whatsapp_number, diagnosis, hospital_id')
        .eq('id', patient_id)
        .eq('hospital_id', staff.hospital_id)
        .maybeSingle();

      if (patientError) return json(res, 500, { error: patientError.message });
      if (!patient) return json(res, 404, { error: 'Patient not found.' });

      patientName = patient.name;
      condition = patient.diagnosis || condition;
      destination = destination || patient.email || patient.whatsapp_number;

      if (!text) {
        const { data: qRow } = await supabase
          .from('checkin_questions')
          .select('questions')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const questions = Array.isArray(qRow?.questions) ? qRow.questions : [];
        const lines = questions.map((q, i) => `${i + 1}. ${q.text || q}`).join('\n');
        text =
          `Hello ${patient.name}, this is your CareAfter recovery check-in.\n\n` +
          (lines || 'How are you feeling today compared to yesterday?') +
          '\n\nPlease reply directly to this email with Yes/No or Mild/Moderate/Severe as appropriate.';
      }
    }

    if (!destination || !text) {
      return json(res, 400, { error: 'Provide patient_id (or to + message).' });
    }

    const recipientEmail = String(destination).trim();
    if (!recipientEmail.includes('@')) {
      return json(res, 400, { error: 'Invalid destination email address.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #0f172a; padding: 20px 24px; color: #fff;">
          <h2 style="margin: 0; font-size: 18px;">🏥 CareAfter Recovery Check-in</h2>
          <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Patient: ${patientName} · ${condition}</div>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6; font-size: 14px;">
          <pre style="font-family: inherit; white-space: pre-wrap; margin: 0;">${text}</pre>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 24px; font-size: 12px; color: #64748b; text-align: center;">
          CareAfter Clinical Monitoring Portal · Reply directly to this email
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"CareAfter Clinical Monitoring" <${emailFrom}>`,
      to: recipientEmail,
      subject: `CareAfter Recovery Check-in · ${patientName}`,
      text: text,
      html: htmlContent
    });

    return json(res, 200, {
      ok: true,
      message_id: info.messageId,
      status: 'sent',
      to: recipientEmail
    });
  } catch (error) {
    return json(res, error.status || 500, {
      error: error.message || 'Failed to send check-in via email.',
      code: error.code
    });
  }
}

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

    let questionsList = [];
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

        questionsList = Array.isArray(qRow?.questions) ? qRow.questions : [];
        if (questionsList.length === 0) {
          questionsList = [
            {
              text: 'How are your pain and recovery symptoms today?',
              options: ['A) Normal / Minimal pain', 'B) Mild manageable soreness', 'C) Moderate pain', 'D) Severe unmanageable pain']
            },
            {
              text: 'Have you taken all your discharge medications as prescribed?',
              options: ['A) Yes, all doses taken on time', 'B) Missed one dose', 'C) Mild nausea/side effects', 'D) Stopped medications']
            }
          ];
        }

        const lines = questionsList.map((q, i) => {
          const qText = q.text || q;
          const opts = Array.isArray(q.options) && q.options.length > 0
            ? '\n' + q.options.map(o => `   ${o}`).join('\n')
            : '';
          return `${i + 1}. ${qText}${opts}`;
        }).join('\n\n');

        text =
          `Hello ${patient.name}, this is your CareAfter recovery check-in.\n\n` +
          `Please review today's quick check-in questions:\n\n` +
          lines +
          `\n\n📝 HOW TO REPLY:\n` +
          `No need to write long paragraphs! Simply reply with your option letters, e.g.:\n` +
          `1: A\n2: A\n3: B\n4: A\n(or describe how you are feeling in your own words)`;
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

    const mcqHtmlCards = questionsList.length > 0
      ? questionsList.map((q, idx) => {
          const qText = q.text || q;
          const optionsHtml = Array.isArray(q.options)
            ? q.options.map(opt => `
                <div style="margin: 4px 0; padding: 6px 10px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #1e293b;">
                  ${opt}
                </div>
              `).join('')
            : '';
          return `
            <div style="margin-bottom: 16px; padding: 14px; background: #f8fafc; border-left: 4px solid #0284c7; border-radius: 6px;">
              <strong style="color: #0f172a; font-size: 14px;">Question ${idx + 1}: ${qText}</strong>
              <div style="margin-top: 8px;">
                ${optionsHtml}
              </div>
            </div>
          `;
        }).join('')
      : `<pre style="font-family: inherit; white-space: pre-wrap; margin: 0;">${text}</pre>`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 20px 24px; color: #fff;">
          <h2 style="margin: 0; font-size: 18px; display:flex; align-items:center; gap:8px;">🏥 CareAfter Clinical Recovery Check-in</h2>
          <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Patient: ${patientName} · ${condition}</div>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6; font-size: 14px;">
          <p style="margin-top:0; font-size:15px; color:#1e293b;">Hello <strong>${patientName}</strong>,</p>
          <p style="color:#475569;">Please review today's quick recovery check-in questions:</p>
          
          <div style="margin: 16px 0;">
            ${mcqHtmlCards}
          </div>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin: 18px 0;">
            <strong style="color: #1e40af; font-size: 13px;">📝 Quick Reply (No long paragraphs needed):</strong>
            <p style="margin: 4px 0 0 0; color: #1e3a8a; font-size: 13px; line-height: 1.4;">
              Simply hit <strong>Reply</strong> and type your answers like: <strong>1: A, 2: A, 3: B, 4: A</strong>
            </p>
          </div>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #991b1b; line-height: 1.4;">
            ⚠️ <strong>Urgent Note:</strong> If you experience severe chest pain, severe breathlessness, heavy bleeding, or high fever, call emergency services (112 / 911) immediately.
          </div>
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

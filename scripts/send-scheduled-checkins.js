import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const emailFrom = process.env.EMAIL_FROM || emailUser;

if (!emailUser || !emailPass) {
  console.error('Email credentials (EMAIL_USER, EMAIL_PASS) not configured in .env');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

export const patientsToSend = [
  {
    name: 'Sanah',
    email: 'sanahmerlinb.s2029@cs.ajce.in',
    condition: 'Gastric issues (Gastritis & Acid Reflux Monitoring)',
    nurse: 'Nurse 1 (Gastroenterology Unit)',
    subject: 'CareAfter Clinical Recovery Check-in · Sanah [Action Required]',
    questions: [
      'How are your stomach symptoms, heartburn, or acid reflux today? (Mild / Moderate / Severe / Normal)',
      'Have you been taking your Pantoprazole (40 mg) and Sucralfate (1 g) as prescribed? (Yes / No)',
      'Are you experiencing any severe abdominal pain, persistent nausea, or vomiting? (Yes / No)',
      'Are you able to tolerate light meals and liquids comfortably? (Yes / No)'
    ],
    greeting: 'Hello Sanah, this is your CareAfter recovery check-in from Nurse 1 regarding your gastric issues.'
  },
  {
    name: 'Jerry',
    email: 'jerryjamesedavazhickal@gmail.com',
    condition: 'Dental issues (Post-Op Surgical Tooth Extraction)',
    nurse: 'Nurse 2 (Oral Surgery Unit)',
    subject: 'CareAfter Clinical Recovery Check-in · Jerry [Action Required]',
    questions: [
      'How are your gum swelling and pain levels today? (Mild / Moderate / Severe / Normal)',
      'Have you been taking your Amoxicillin (500 mg) and Ibuprofen (400 mg) as prescribed? (Yes / No)',
      'Have you noticed any persistent bleeding or unusual discharge from the extraction site? (Yes / No)',
      'Are you performing warm salt-water rinses and able to consume soft foods? (Yes / No)'
    ],
    greeting: 'Hello Jerry, this is your CareAfter recovery check-in from Nurse 2 regarding your dental recovery.'
  },
  {
    name: 'niya jimmy',
    email: 'niyajimmy2029@cs.ajce.in',
    condition: 'Serious heart issues (Post-Cardiac Event Recovery & Monitoring)',
    nurse: 'Nurse 3 (Cardiology Care Unit)',
    subject: 'CareAfter Clinical Recovery Check-in · Niya Jimmy [Action Required]',
    questions: [
      'Are you experiencing any chest heaviness, tightness, or chest pain today? (Yes / No — if yes: Mild / Moderate / Severe)',
      'Have you had any shortness of breath, especially when resting or walking short distances? (Yes / No)',
      'Have you taken your Clopidogrel (75 mg), Atorvastatin (40 mg), and Metoprolol (50 mg) today? (Yes / No)',
      'Have you noticed any dizziness, ankle swelling, or irregular rapid heartbeats? (Yes / No)'
    ],
    greeting: 'Hello Niya Jimmy, this is your CareAfter recovery check-in from Nurse 3 regarding your heart condition.'
  }
];

function buildHtmlEmail(p) {
  const questionItems = p.questions
    .map(
      (q, idx) => `
      <div style="margin-bottom: 12px; padding: 10px 14px; background: #f8fafc; border-left: 3px solid #0284c7; border-radius: 4px;">
        <strong style="color: #0f172a; font-size: 14px;">Question ${idx + 1}:</strong>
        <p style="margin: 4px 0 0 0; color: #334155; font-size: 14px; line-height: 1.4;">${q}</p>
      </div>`
    )
    .join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 28px; color: #ffffff;">
        <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px;">
          🏥 CareAfter Post-Discharge Monitoring
        </div>
        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">
          Assigned Unit: ${p.nurse} · ${p.condition}
        </div>
      </div>

      <div style="padding: 24px 28px;">
        <p style="font-size: 15px; color: #1e293b; margin-top: 0; line-height: 1.5;">
          ${p.greeting}
        </p>

        <p style="font-size: 14px; color: #475569; line-height: 1.5;">
          Please review the following check-in questions and <strong>reply directly to this email</strong> with your responses. Our clinical care team will immediately process your answers and prepare your daily recovery report.
        </p>

        <div style="margin: 20px 0;">
          ${questionItems}
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
          <strong style="color: #1e40af; font-size: 14px;">📝 How to Reply:</strong>
          <p style="margin: 6px 0 0 0; color: #1e3a8a; font-size: 13px; line-height: 1.4;">
            Simply hit <strong>Reply</strong> in your email app and write your answers numbered 1 to 4, or describe how you feel in your own words.
          </p>
        </div>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #991b1b; line-height: 1.4;">
          ⚠️ <strong>Urgent Note:</strong> If you experience severe chest pain, severe shortness of breath, heavy bleeding, or high fever, please seek immediate emergency medical care or call 112 / 911 immediately.
        </div>
      </div>

      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; font-size: 12px; color: #64748b; text-align: center;">
        CareAfter Clinical Monitoring · Sent on behalf of your attending healthcare team
      </div>
    </div>
  `;
}

export async function sendScheduledCheckins() {
  console.log(`[${new Date().toISOString()}] Starting scheduled Email check-in dispatch for 3 patients...`);
  console.log(`Sending from: ${emailFrom}`);

  const results = [];

  for (const p of patientsToSend) {
    const plainTextQuestions = p.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    const plainTextBody = `${p.greeting}\n\n` +
      `Please reply directly to this email with your answers to today's recovery questions:\n\n` +
      `${plainTextQuestions}\n\n` +
      `How to reply: Simply reply with your answers (e.g., 1. Normal, 2. Yes, 3. No, 4. Yes) or describe your symptoms.\n\n` +
      `If you have severe symptoms, please contact emergency medical care immediately.\n\n` +
      `— CareAfter Clinical Team (${p.nurse})`;

    const mailOptions = {
      from: `"CareAfter Clinical Monitoring" <${emailFrom}>`,
      to: p.email,
      subject: p.subject,
      text: plainTextBody,
      html: buildHtmlEmail(p)
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Sent email to ${p.name} (${p.email}) via ${p.nurse} | MessageID: ${info.messageId}`);
      results.push({ name: p.name, email: p.email, success: true, messageId: info.messageId });
    } catch (err) {
      console.error(`❌ Failed to send email to ${p.name} (${p.email}):`, err.message || err);
      results.push({ name: p.name, email: p.email, success: false, error: err.message });
    }
  }

  console.log('Scheduled email check-in dispatch complete.');
  return results;
}

// Auto-run if executed directly via node
if (process.argv[1] && process.argv[1].endsWith('send-scheduled-checkins.js')) {
  sendScheduledCheckins();
}

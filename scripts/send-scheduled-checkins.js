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
    subject: 'CareAfter Clinical Recovery Check-in · Sanah [Quick MCQ Check-in]',
    questions: [
      {
        text: 'How are your stomach symptoms, heartburn, or acid reflux today?',
        options: [
          'A) Normal — No heartburn, stomach comfortable',
          'B) Mild acidity — Easily managed with water and light food',
          'C) Moderate burning / indigestion after meals',
          'D) Severe burning, persistent vomiting, or dark stools'
        ]
      },
      {
        text: 'Have you been taking your Pantoprazole (40 mg) and Sucralfate (1 g) as prescribed?',
        options: [
          'A) Yes, taking both medications on time before meals',
          'B) Missed one dose today but back on schedule',
          'C) Experiencing mild stomach cramps after taking them',
          'D) Stopped taking medications due to side effects'
        ]
      },
      {
        text: 'Are you experiencing any severe abdominal pain or nausea?',
        options: [
          'A) No abdominal pain or nausea',
          'B) Mild occasional cramp that settles after resting',
          'C) Moderate upper abdominal discomfort',
          'D) Severe sharp pain or persistent nausea / vomiting'
        ]
      },
      {
        text: 'Are you able to tolerate light meals and liquids comfortably?',
        options: [
          'A) Eating light meals and drinking fluids easily',
          'B) Mild bloating after eating but able to finish food',
          'C) Difficulty eating solids, only taking liquids',
          'D) Unable to keep any liquids or food down'
        ]
      }
    ],
    greeting: 'Hello Sanah, this is your CareAfter recovery check-in from Nurse 1 regarding your gastric issues.'
  },
  {
    name: 'Jerry',
    email: 'jerryjamesedavazhickal@gmail.com',
    condition: 'Dental issues (Post-Op Surgical Tooth Extraction)',
    nurse: 'Nurse 2 (Oral Surgery Unit)',
    subject: 'CareAfter Clinical Recovery Check-in · Jerry [Quick MCQ Check-in]',
    questions: [
      {
        text: 'How are your gum swelling and pain levels today?',
        options: [
          'A) Minimal to no pain, swelling noticeably reduced',
          'B) Mild soreness, well controlled with prescribed pain reliever',
          'C) Moderate throbbing pain radiating to jaw or ear',
          'D) Severe unbearable pain, fever, or difficulty swallowing'
        ]
      },
      {
        text: 'Have you been taking your Amoxicillin (500 mg) and Ibuprofen (400 mg) as prescribed?',
        options: [
          'A) Yes, taking full course of antibiotic and pain reliever as directed',
          'B) Taking pain reliever only when needed, finished antibiotics',
          'C) Missed doses due to mild stomach upset',
          'D) Stopped antibiotics completely before finishing the course'
        ]
      },
      {
        text: 'Have you noticed any persistent bleeding or unusual discharge from the extraction site?',
        options: [
          'A) No bleeding, clean blood clot in place',
          'B) Slight pink tinged saliva when rinsing gently',
          'C) Steady light oozing requiring fresh gauze',
          'D) Active continuous bleeding or foul-tasting pus'
        ]
      },
      {
        text: 'Are you performing warm salt-water rinses and able to consume soft foods?',
        options: [
          'A) Doing gentle salt-water rinses and eating soft foods comfortably',
          'B) Mild stiffness when chewing soft foods',
          'C) Unable to chew soft foods, drinking fluids only',
          'D) Cannot open mouth at all (trismus) or severe jaw stiffness'
        ]
      }
    ],
    greeting: 'Hello Jerry, this is your CareAfter recovery check-in from Nurse 2 regarding your dental recovery.'
  },
  {
    name: 'niya jimmy',
    email: 'niyajimmy2029@cs.ajce.in',
    condition: 'Serious heart issues (Post-Cardiac Event Recovery & Monitoring)',
    nurse: 'Nurse 3 (Cardiology Care Unit)',
    subject: 'CareAfter Clinical Recovery Check-in · Niya Jimmy [Quick MCQ Check-in]',
    questions: [
      {
        text: 'Are you experiencing any chest heaviness, tightness, or chest pain today?',
        options: [
          'A) No chest heaviness, tightness, or pain at all',
          'B) Mild muscle soreness around chest with movement',
          'C) Moderate chest heaviness that eases after resting',
          'D) Severe chest pain radiating to left arm/jaw, sweating, or nausea'
        ]
      },
      {
        text: 'Have you had any shortness of breath, especially when resting or walking short distances?',
        options: [
          'A) Breathing comfortably at rest and with gentle walking',
          'B) Mild breathlessness after stairs or walking uphill',
          'C) Shortness of breath during normal flat walking / household tasks',
          'D) Severe breathlessness while resting or lying flat in bed'
        ]
      },
      {
        text: 'Have you taken your Clopidogrel (75 mg), Atorvastatin (40 mg), and Metoprolol (50 mg) today?',
        options: [
          'A) Yes, all prescribed doses taken on schedule',
          'B) Delayed by a few hours but taken',
          'C) Missed a dose due to lightheadedness or fatigue',
          'D) Stopped heart medications due to confusion or side effects'
        ]
      },
      {
        text: 'Have you noticed any dizziness, ankle swelling, or irregular rapid heartbeats?',
        options: [
          'A) Steady heart rhythm, no dizziness, no swelling',
          'B) Brief lightheadedness when standing up quickly',
          'C) Mild new puffiness around ankles or occasional flutter',
          'D) Racing heart, fainting episode, or rapid weight/fluid gain'
        ]
      }
    ],
    greeting: 'Hello Niya Jimmy, this is your CareAfter recovery check-in from Nurse 3 regarding your heart condition.'
  }
];

function buildHtmlEmail(p) {
  const questionItems = p.questions
    .map(
      (q, idx) => {
        const optionsHtml = (q.options || []).map(opt => `
          <div style="margin: 4px 0; padding: 6px 10px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #1e293b;">
            ${opt}
          </div>
        `).join('');

        return `
          <div style="margin-bottom: 14px; padding: 12px 14px; background: #f8fafc; border-left: 4px solid #0284c7; border-radius: 6px;">
            <strong style="color: #0f172a; font-size: 14px;">Question ${idx + 1}: ${q.text}</strong>
            <div style="margin-top: 8px;">
              ${optionsHtml}
            </div>
          </div>
        `;
      }
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
          Please review the following quick check-in questions and <strong>reply directly to this email</strong> with your choices.
        </p>

        <div style="margin: 20px 0;">
          ${questionItems}
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
          <strong style="color: #1e40af; font-size: 14px;">📝 Quick Reply (No long paragraphs needed):</strong>
          <p style="margin: 6px 0 0 0; color: #1e3a8a; font-size: 13px; line-height: 1.4;">
            Simply hit <strong>Reply</strong> and send your chosen letters, e.g.: <strong>1: A, 2: A, 3: B, 4: A</strong>
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
    const plainTextQuestions = p.questions.map((q, i) => {
      const qText = q.text || q;
      const opts = (q.options || []).map(o => `   ${o}`).join('\n');
      return `${i + 1}. ${qText}${opts ? '\n' + opts : ''}`;
    }).join('\n\n');

    const plainTextBody = `${p.greeting}\n\n` +
      `Please review today's quick recovery check-in questions:\n\n` +
      `${plainTextQuestions}\n\n` +
      `How to reply: Simply reply with your chosen option letters (e.g., 1: A, 2: A, 3: B, 4: A) or describe how you feel.\n\n` +
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

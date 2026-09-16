import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const GEMINI_MODEL = 'gemini-3.6-flash';

async function generateAIClinicalAssessment(patient, responseText) {
  const apiKey = process.env.GEMINI_API_KEY;
  const upper = String(responseText || '').toUpperCase();

  // Deterministic triage check for clear MCQ choices
  let initialUrgency = 'normal';
  if (upper.includes('4: D') || upper.includes('3: D') || upper.includes('2: D') || upper.includes('1: D') || upper.includes('OPTION D') || upper.includes('D)')) {
    initialUrgency = 'urgent';
  } else if (upper.includes('4: C') || upper.includes('3: C') || upper.includes('2: C') || upper.includes('1: C') || upper.includes('OPTION C') || upper.includes('C)')) {
    initialUrgency = 'concern';
  }

  if (!apiKey || apiKey === 'your_key_here') {
    return {
      urgency: initialUrgency,
      clinical_summary: initialUrgency === 'urgent' ? 'High risk recovery symptoms reported on MCQ check-in.' : 'MCQ check-in report generated within clinical parameters.',
      recommended_action: initialUrgency === 'urgent' ? 'Urgent nurse phone triage & attending physician review.' : 'Routine monitoring & medication adherence.',
      vitals_status: initialUrgency === 'urgent' ? 'elevated_risk' : 'stable'
    };
  }

  const prompt = `You are a clinical nurse specialist reviewing a post-discharge patient's MCQ check-in email response.
Patient Name: ${patient.name}
Condition / Diagnosis: ${patient.condition || patient.diagnosis}
Assigned Unit: ${patient.nurse || 'General Post-Op'}
Prescribed Meds: ${JSON.stringify(patient.medicines || [])}
Patient Check-in MCQ Response: "${responseText}"

Assessment Guidelines:
- If the patient chose Option D or reported red-flag symptoms (severe chest pain, high fever > 100.4°F, heavy bleeding, severe breathlessness), classify urgency as "urgent" and vitals_status as "critical" or "elevated_risk".
- If the patient chose Option C or reported moderate worsening symptoms / missed doses, classify urgency as "concern" and vitals_status as "elevated_risk".
- If the patient chose Option A or B (normal recovery, mild manageable discomfort, full medication compliance), classify urgency as "normal" and vitals_status as "stable".

Return ONLY valid JSON:
{
  "urgency": "normal" | "concern" | "urgent",
  "clinical_summary": "1-2 sentences summarizing clinical findings from MCQ answers",
  "recommended_action": "1 concrete action item for attending nurse (e.g. continue monitoring, nurse phone check-in, urgent physician consult)",
  "vitals_status": "stable" | "elevated_risk" | "critical"
}`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!res.ok) throw new Error(`Gemini API Error: ${res.status}`);
    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    let cleaned = candidateText.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn(`AI Assessment fallback for ${patient.name}:`, err.message);
    const lower = String(responseText || '').toLowerCase();
    if (initialUrgency === 'urgent' || lower.includes('chest') || lower.includes('fever') || lower.includes('shortness of breath') || lower.includes('bleeding')) {
      return {
        urgency: 'urgent',
        clinical_summary: 'Elevated complication or red-flag recovery symptoms reported on MCQ check-in.',
        recommended_action: 'Immediate nurse phone triage & attending physician notification.',
        vitals_status: 'elevated_risk'
      };
    }
    if (initialUrgency === 'concern' || lower.includes('dizzy') || lower.includes('cramp') || lower.includes('missed') || lower.includes('pain')) {
      return {
        urgency: 'concern',
        clinical_summary: 'Moderate recovery discomfort or symptom variation reported on MCQ check-in.',
        recommended_action: 'Attending nurse phone check-in within 2-4 hours.',
        vitals_status: 'elevated_risk'
      };
    }
    return {
      urgency: 'normal',
      clinical_summary: 'Patient reports steady recovery progression on MCQ check-in.',
      recommended_action: 'Continue prescribed medications and routine 24h follow-up.',
      vitals_status: 'stable'
    };
  }
}

export async function prepareClinicalReport(patientResponses) {
  const generatedAt = new Date().toISOString();
  console.log(`\n========================================================================`);
  console.log(`🏥 CAREAFTER CLINICAL RECOVERY REPORT · GENERATED AT ${generatedAt}`);
  console.log(`========================================================================\n`);

  const reportItems = [];

  for (const item of patientResponses) {
    const assessment = await generateAIClinicalAssessment(item.patient, item.response);
    const reportItem = {
      patient_name: item.patient.name,
      email: item.patient.email,
      diagnosis: item.patient.condition || item.patient.diagnosis,
      nurse: item.patient.nurse,
      submitted_response: item.response,
      urgency: assessment.urgency,
      vitals_status: assessment.vitals_status,
      clinical_summary: assessment.clinical_summary,
      recommended_action: assessment.recommended_action,
      timestamp: item.timestamp || generatedAt
    };
    reportItems.push(reportItem);

    const badge = assessment.urgency === 'urgent' ? '🚨 URGENT' : (assessment.urgency === 'concern' ? '🟡 CONCERN' : '🟢 NORMAL');
    console.log(`[PATIENT] ${item.patient.name} (${item.patient.email})`);
    console.log(`  Diagnosis: ${item.patient.condition || item.patient.diagnosis}`);
    console.log(`  Triage Level: ${badge}`);
    console.log(`  Patient MCQ Reply: "${item.response}"`);
    console.log(`  Clinical Summary: ${assessment.clinical_summary}`);
    console.log(`  Nurse Action: ${assessment.recommended_action}`);
    console.log(`------------------------------------------------------------------------`);
  }

  const flaggedCount = reportItems.filter(r => r.urgency !== 'normal').length;
  console.log(`\n📊 Report Summary: ${reportItems.length} Total Patients Evaluated | ${flaggedCount} Requires Immediate Follow-up\n`);

  return {
    generated_at: generatedAt,
    total_patients: reportItems.length,
    flagged_patients: flaggedCount,
    items: reportItems
  };
}

// Sample execution with current check-in data if run directly
if (process.argv[1] && process.argv[1].endsWith('prepare-report.js')) {
  const sampleResponses = [
    {
      patient: {
        name: 'Sanah',
        email: 'sanahmerlinb.s2029@cs.ajce.in',
        condition: 'Gastric issues (Gastritis & Acid Reflux Monitoring)',
        nurse: 'Nurse 1'
      },
      response: '1: A (Normal, no heartburn), 2: A (Taking Pantoprazole and Sucralfate on time), 3: A (No pain or vomiting), 4: A (Eating porridge comfortably)'
    },
    {
      patient: {
        name: 'Jerry',
        email: 'jerryjamesedavazhickal@gmail.com',
        condition: 'Dental issues (Post-Op Surgical Tooth Extraction)',
        nurse: 'Nurse 2'
      },
      response: '1: B (Mild soreness, well controlled), 2: A (Finished Amoxicillin), 3: A (No bleeding), 4: A (Warm salt-water rinses going well)'
    },
    {
      patient: {
        name: 'niya jimmy',
        email: 'niyajimmy2029@cs.ajce.in',
        condition: 'Serious heart issues (Post-Cardiac Event Recovery)',
        nurse: 'Nurse 3'
      },
      response: '1: C (Moderate chest heaviness after stairs), 2: C (Shortness of breath walking around house), 3: A (Took morning cardiac meds), 4: B (Mild ankle puffiness)'
    }
  ];

  prepareClinicalReport(sampleResponses);
}

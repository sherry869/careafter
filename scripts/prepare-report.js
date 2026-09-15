import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const GEMINI_MODEL = 'gemini-3.6-flash';

async function generateAIClinicalAssessment(patient, responseText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return {
      urgency: 'normal',
      clinical_summary: 'Report generated without AI assistance.',
      recommended_action: 'Standard clinical recovery follow-up.'
    };
  }

  const prompt = `You are a clinical nurse specialist reviewing a post-discharge patient's email check-in response.
Patient Name: ${patient.name}
Condition / Diagnosis: ${patient.condition || patient.diagnosis}
Assigned Unit: ${patient.nurse || 'General Post-Op'}
Prescribed Meds: ${JSON.stringify(patient.medicines || [])}
Patient Email Response: "${responseText}"

Assess the response and return ONLY valid JSON with:
{
  "urgency": "normal" | "concern" | "urgent",
  "clinical_summary": "1-2 sentences summarizing clinical findings",
  "recommended_action": "1 action item for attending nurse (e.g. continue monitoring, call patient, schedule cardiology consult)",
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
    const lower = responseText.toLowerCase();
    if (lower.includes('chest') || lower.includes('fever') || lower.includes('shortness of breath') || lower.includes('bleeding')) {
      return {
        urgency: 'urgent',
        clinical_summary: 'Elevated cardiac or post-op complication symptoms reported.',
        recommended_action: 'Immediate nurse phone triage & attending physician notification.',
        vitals_status: 'elevated_risk'
      };
    }
    return {
      urgency: 'normal',
      clinical_summary: 'Patient reports manageable recovery progression.',
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
    console.log(`  Patient Reply: "${item.response}"`);
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
      response: '1. Reflux feels milder today. 2. Yes, took Pantoprazole on empty stomach. 3. No vomiting. 4. Tolerating rice porridge well.'
    },
    {
      patient: {
        name: 'Jerry',
        email: 'jerryjamesedavazhickal@gmail.com',
        condition: 'Dental issues (Post-Op Surgical Tooth Extraction)',
        nurse: 'Nurse 2'
      },
      response: '1. Gum swelling is reduced, slight jaw soreness. 2. Yes, finishing Amoxicillin. 3. No bleeding. 4. Doing salt water rinses as directed.'
    },
    {
      patient: {
        name: 'niya jimmy',
        email: 'niyajimmy2029@cs.ajce.in',
        condition: 'Serious heart issues (Post-Cardiac Event Recovery)',
        nurse: 'Nurse 3'
      },
      response: '1. Experienced slight chest heaviness and shortness of breath when walking up stairs this morning. 2. Breathlessness eased after sitting. 3. Took morning medicines on time. 4. No dizziness.'
    }
  ];

  prepareClinicalReport(sampleResponses);
}

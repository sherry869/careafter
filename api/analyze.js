import fs from 'fs';
import path from 'path';

/**
 * Loads the LASA (Look-Alike Sound-Alike) drugs list from public/lasa_drugs.json
 */
function loadLasaDrugs() {
  try {
    const filePath = path.resolve(process.cwd(), 'public', 'lasa_drugs.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('Failed to load lasa_drugs.json from filesystem, falling back to minimal defaults:', err.message);
  }
  return [
    { drug: "Amlopres", confused_with: "Amlodac" },
    { drug: "Cetirizine", confused_with: "Citalopram" },
    { drug: "Metformin", confused_with: "Metronidazole" },
    { drug: "Hydroxyzine", confused_with: "Hydralazine" },
    { drug: "Losartan", confused_with: "Alprazolam" }
  ];
}

const IGNORED_DRUG_WORDS = new Set([
  'none', 'n/a', 'na', 'unknown', 'not detected', 'unspecified', 
  'not clearly legible', 'prescription medication', 'medication', 
  'drug', 'medicine', 'tablet', 'capsule', 'syrup', 'null', 'undefined', 'as prescribed'
]);

/**
 * Checks if a drug name matches any LASA pair (case-insensitive word boundary match)
 */
function checkLasaMatch(extractedDrugName, lasaList) {
  if (!extractedDrugName || typeof extractedDrugName !== 'string') return null;

  const normalizedInput = extractedDrugName.trim().toLowerCase();
  if (!normalizedInput || IGNORED_DRUG_WORDS.has(normalizedInput) || normalizedInput.length < 3) return null;

  for (const item of lasaList) {
    const d1 = (item.drug || '').trim().toLowerCase();
    const d2 = (item.confused_with || '').trim().toLowerCase();

    if (!d1 && !d2) continue;

    // Check whole word matches
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex1 = d1 ? new RegExp(`\\b${escapeRegex(d1)}\\b`, 'i') : null;
    const regex2 = d2 ? new RegExp(`\\b${escapeRegex(d2)}\\b`, 'i') : null;

    if (d1 && (d1 === normalizedInput || (regex1 && regex1.test(normalizedInput)))) {
      return item.confused_with;
    }
    if (d2 && (d2 === normalizedInput || (regex2 && regex2.test(normalizedInput)))) {
      return item.drug;
    }
  }

  return null;
}

/**
 * Normalizes similar/generic-alternative brand names from Gemini into a short string array
 */
function normalizeSimilarDrugs(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
      .filter(Boolean)
      .slice(0, 3);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  return [];
}

/**
 * Builds a medicines array from diverse Gemini responses.
 * Always returns at least one item so the frontend can use a single code path.
 */
function normalizePrescriptionData(parsed) {
  const emptyMedicine = {
    drug_name: 'Not detected',
    strength: 'N/A',
    dosage: 'N/A',
    frequency: 'N/A',
    timing: 'N/A',
    duration: 'N/A',
    plain_instructions: 'Unable to parse medication instructions from the image.',
    similar_drugs: []
  };

  if (!parsed || typeof parsed !== 'object') {
    return { medicines: [emptyMedicine], raw_text: '' };
  }

  const rawText = parsed.raw_text || parsed.extracted_text || parsed.rawText || '';
  let list = [];

  if (Array.isArray(parsed.medicines)) {
    list = parsed.medicines;
  } else if (Array.isArray(parsed.medications)) {
    list = parsed.medications;
  } else if (Array.isArray(parsed.drugs)) {
    list = parsed.drugs;
  } else if (Array.isArray(parsed.prescriptions)) {
    list = parsed.prescriptions;
  } else if (parsed.prescription_interpretation && typeof parsed.prescription_interpretation === 'object') {
    list = Object.values(parsed.prescription_interpretation);
  } else if (
    parsed.drug_name ||
    parsed.brand_name ||
    parsed.name ||
    parsed.plain_instructions
  ) {
    // Gemini returned a single-drug object — wrap it as a one-item array
    list = [parsed];
  }

  const medicines = list
    .filter((med) => med && typeof med === 'object')
    .map((med) => {
      const name = med.drug_name || med.brand_name || med.name || med.medicine_name || med.drug || '';
      const str = med.strength || med.dose || med.dosage || med.potency || '';

      let freq = med.frequency || med.dosage_frequency || '';
      if (med.dosing_instructions && typeof med.dosing_instructions === 'object') {
        const parts = [];
        if (med.dosing_instructions.dose) parts.push(med.dosing_instructions.dose);
        if (med.dosing_instructions.frequency) parts.push(med.dosing_instructions.frequency);
        if (med.dosing_instructions.timing) parts.push(med.dosing_instructions.timing);
        if (med.dosing_instructions.duration) parts.push(med.dosing_instructions.duration);
        if (med.dosing_instructions.condition) parts.push(med.dosing_instructions.condition);
        if (parts.length > 0) freq = parts.join(' | ');
      }

      const timing = med.timing || med.when_to_take || med.meal_relation || '';
      const duration = med.duration || med.course || '';
      const instructions =
        med.plain_instructions ||
        med.plain_english_summary ||
        med.instructions ||
        med.patient_instructions ||
        med.summary ||
        '';

      let combinedInstructions = instructions;
      if (!combinedInstructions && (timing || duration)) {
        combinedInstructions = [timing, duration].filter(Boolean).join('. ');
      }

      return {
        drug_name: name,
        strength: str || 'As prescribed',
        dosage: str || 'As prescribed',
        frequency: freq || 'As prescribed',
        timing: timing || 'As directed',
        duration: duration || 'As prescribed',
        plain_instructions:
          combinedInstructions ||
          'Please verify dosage instructions with your physician or pharmacist.',
        similar_drugs: normalizeSimilarDrugs(
          med.similar_drugs || med.generic_alternatives || med.therapeutic_equivalents
        )
      };
    })
    .filter((m) => m.drug_name || m.plain_instructions);

  if (medicines.length === 0) {
    medicines.push({
      ...emptyMedicine,
      drug_name: parsed.drug_name || 'Unspecified / Not clearly legible',
      strength: parsed.strength || 'As prescribed',
      dosage: parsed.strength || 'As prescribed',
      frequency: parsed.frequency || 'As prescribed',
      timing: parsed.timing || 'As directed',
      duration: parsed.duration || 'As prescribed',
      plain_instructions:
        parsed.plain_instructions ||
        parsed.instructions ||
        'Please verify dosage instructions with your physician or pharmacist.',
      similar_drugs: normalizeSimilarDrugs(parsed.similar_drugs)
    });
  }

  return {
    medicines,
    raw_text: rawText
  };
}

/**
 * Serverless API Handler for Vercel and local Vite dev server
 */
export default async function handler(req, res) {
  // CORS & method validation
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed. Only POST is accepted.' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
      return res.status(500).json({
        error: 'Missing GEMINI_API_KEY. Please set a valid Gemini API key in your .env file or deployment settings.'
      });
    }

    // Parse body if needed
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body.' });
      }
    }

    const { image, mimeType = 'image/jpeg' } = body || {};

    if (!image) {
      return res.status(400).json({ error: 'No image data provided. Please upload or capture an image.' });
    }

    // Clean base64 string if data URL prefix exists
    let base64Data = image;
    let resolvedMimeType = mimeType;
    if (image.includes(',')) {
      const parts = image.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) {
        resolvedMimeType = match[1];
      }
      base64Data = parts[1];
    }

    const systemInstructionText = `You are an expert clinical pharmacist, physician, and medical OCR specialist. Your PRIMARY goal is to identify EVERY medicine and its EXACT DOSAGE written on the prescription image — however many there are (often 2 to 6 on one slip). Do not stop after the first drug. Extract all distinct medicines visible (handwritten doctor notes, printed clinic Rx slips, hospital discharge summaries, blister packs, strips, boxes, bottles).

Prescriptions often feature fast cursive doctor handwriting, faint pen strokes, Latin abbreviations, and shorthand. Use your clinical domain knowledge of medicine brand names, generic formulations, standard medical dosages, and prescription shorthand to decipher each line item.

Key Medical Shorthand Guide:
- Dosage Forms: Tab (Tablet), Cap (Capsule), Syp/Susp (Syrup/Suspension), Inj (Injection), Oint/Gel (Ointment), Drops, Inhaler.
- Strength / Dosage: Extract exact numerical strengths (e.g. 500 mg, 625 mg, 1 g, 40 mg, 10 ml, 2 puffs, 5 mcg).
- Frequency & Notation:
  - 1-0-0 / 0-1-0 / 0-0-1 / 1 OD / OD: Once daily (specify morning, afternoon, or night).
  - 1-0-1 / 0-1-1 / 1-1-0 / BD / BID: Twice daily (e.g., morning and night).
  - 1-1-1 / TDS / TID: Three times daily (morning, afternoon, night).
  - 1-1-1-1 / QID: Four times daily.
  - HS / Bedtime: At night before sleep.
  - SOS / PRN: As needed / when required (e.g., for pain, fever, acidity).
  - Stat: Immediately.
- Meal / Timing Instructions:
  - AC / BBF: Before meals / before breakfast / empty stomach.
  - PC / AF: After meals / after food.
  - CC: With meals.
- Duration:
  - x 3d, x 5d, 5/7 (5 days), 2/52 (2 weeks), 1/12 (1 month), 30 days.

similar_drugs (IMPORTANT — generic alternatives sharing the exact same composition):
For EACH extracted medicine, list 2–3 other commercially available brand names that contain the SAME active ingredient / same generic salt / same composition (therapeutic equivalents / generic alternatives), different brand name only. Example: if the Rx says Crocin, similar_drugs might be ["Dolo 650", "Calpol 650", "Paracip"] because they share paracetamol — NOT names that merely look or sound similar.

Output Format:
You MUST respond with a JSON object. Even if only ONE medicine is visible, still return a medicines array:
{
  "medicines": [
    {
      "drug_name": "Brand name or generic name as written (e.g., Augmentin, Dolo 650, Pan-D, Pantoprazole)",
      "strength": "Exact dosage/strength (e.g., 625 mg, 40 mg, 1 g)",
      "frequency": "Frequency schedule (e.g., Twice daily 1-0-1, Once daily OD)",
      "timing": "Meal relation (e.g., After food, 30 mins before breakfast on empty stomach)",
      "duration": "Duration of course (e.g., 5 days, 14 days, Continue as maintenance)",
      "plain_instructions": "Clear, patient-friendly directions for this specific medicine including dosage, timing, with/without food, and precautions.",
      "similar_drugs": ["Brand with same salt 1", "Brand with same salt 2"]
    }
  ],
  "raw_text": "Verbatim transcript of all handwritten notes and printed text found in the image."
}

If any handwriting is difficult to read, use surrounding clinical context to deduce the most probable medication, and explain any uncertainties in that medicine's plain_instructions rather than omitting the medicine from the array. Extract all lines.`;

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const payload = {
      systemInstruction: {
        parts: [
          { text: systemInstructionText }
        ]
      },
      contents: [
        {
          parts: [
            { text: "Analyze this prescription or medicine image. Extract EVERY distinct medicine listed (not just the first). Decipher all handwriting, abbreviations, dosages, and instructions. For each medicine, also list 2–3 other brand names with the SAME active ingredient/composition (generic alternatives), not look-alike names. Return the complete structured JSON." },
            {
              inline_data: {
                mime_type: resolvedMimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.error?.message || errText;
      } catch (_) {}
      return res.status(response.status).json({
        error: `Gemini API Error (${response.status}): ${parsedErr}`
      });
    }

    const geminiData = await response.json();
    const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return res.status(502).json({
        error: 'Unable to extract information from the image. Gemini returned an empty response.'
      });
    }

    // Clean markdown code fence formatting if present
    let cleanedJsonText = candidateText.trim();
    if (cleanedJsonText.startsWith('```json')) {
      cleanedJsonText = cleanedJsonText.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    } else if (cleanedJsonText.startsWith('```')) {
      cleanedJsonText = cleanedJsonText.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedJsonText);
    } catch (parseErr) {
      console.warn('Direct JSON parse failed, using raw text fallback:', parseErr.message);
      parsedResult = {
        medicines: [
          {
            drug_name: 'Prescription Medication',
            strength: 'As prescribed',
            frequency: 'As prescribed',
            plain_instructions: candidateText,
            similar_drugs: []
          }
        ],
        raw_text: candidateText
      };
    }

    const normalized = normalizePrescriptionData(parsedResult);

    // LASA check: same matching logic, applied independently to each extracted drug_name
    const lasaList = loadLasaDrugs();
    const medicines = normalized.medicines.map((med) => {
      const lasaMatch = checkLasaMatch(med.drug_name, lasaList);
      return {
        ...med,
        lasa_warning: lasaMatch
          ? `${med.drug_name} can be easily confused with ${lasaMatch}`
          : null
      };
    });

    return res.status(200).json({
      medicines,
      raw_text: normalized.raw_text
    });

  } catch (error) {
    console.error('Server error analyzing image:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error while processing the image.'
    });
  }
}

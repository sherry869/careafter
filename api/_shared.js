import { createClient } from '@supabase/supabase-js';

export const GEMINI_MODEL = 'gemini-3.6-flash';

export function json(res, status, data) {
  res.status(status).json(data);
}

export function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

export function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body || {};
}

export function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export function getServiceSupabase() {
  const rawUrl = process.env.SUPABASE_URL || '';
  const url = rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key || key.includes('your_')) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function requireStaff(req) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error('Missing Authorization bearer token.');
    err.status = 401;
    throw err;
  }

  const supabase = getServiceSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    const err = new Error('Invalid or expired session. Please log in again.');
    err.status = 401;
    throw err;
  }

  const user = authData.user;
  let { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('id, email, hospital_name, hospital_id')
    .eq('id', user.id)
    .maybeSingle();

  if (staffError) {
    const err = new Error(staffError.message);
    err.status = 500;
    throw err;
  }

  if (!staff) {
    const hospitalName = user.user_metadata?.hospital_name || 'My Hospital';
    const { data: created, error: insertError } = await supabase
      .from('staff')
      .insert({
        id: user.id,
        email: user.email,
        hospital_name: hospitalName,
        hospital_id: user.id
      })
      .select('id, email, hospital_name, hospital_id')
      .single();

    if (insertError) {
      const err = new Error(insertError.message);
      err.status = 500;
      throw err;
    }
    staff = created;
  }

  return { supabase, user, staff };
}

export function parseGeminiJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty Gemini response.');
  }
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

export async function geminiJson(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('Missing GEMINI_API_KEY.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const geminiData = await response.json();
  const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseGeminiJson(candidateText);
}

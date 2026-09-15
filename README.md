# CareAfter – Clinical Post-Discharge Patient Monitoring Platform

CareAfter is an AI-driven post-discharge recovery monitoring platform designed for hospital care teams. It automates personalized daily recovery check-in emails, monitors patient progress, and performs clinical urgency triage using Google Gemini AI.

---

## 🛠️ Tech Stack

- **Frontend**: Vite + Vanilla JavaScript + CareAfter Design System
- **Backend / Serverless**: Vercel Serverless Functions (`/api/*`)
- **Email System**: Nodemailer with Gmail SMTP
- **AI Triage**: Google Gemini API (`gemini-3.6-flash`)
- **Database / Auth**: Supabase

---

## ⏱️ Vercel Cron Configuration

A Vercel Cron scheduled trigger is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron-checkin",
      "schedule": "30 0 16 9 *"
    }
  ]
}
```

- **Endpoint**: `/api/cron-checkin`
- **Schedule**: `30 0 16 9 *` (6:00:00 AM IST on September 16, 2026 / 00:30 UTC)
- **Action**: Dispatches clinical check-in questions to enrolled post-discharge patients via email.

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file with the following variables:
```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=your_gmail_address
```

### 3. Start Dev Server
```bash
npm run dev
```

---

## 📦 Deployment to Vercel

1. Push this repository to **GitHub**.
2. Import the project into **Vercel**.
3. Under **Project Settings > Environment Variables**, add:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EMAIL_USER`
   - `EMAIL_PASS`
   - `EMAIL_FROM`
4. Deploy! Vercel will automatically build the static assets and configure the `/api/cron-checkin` cron trigger.

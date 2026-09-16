import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const now = new Date();
const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 10, 0, 0);
const msToWait = Math.max(0, target.getTime() - Date.now());

console.log(`[Scheduler Active] Target: 12:10:00 PM IST today (${target.toLocaleDateString()}).`);
console.log(`[Scheduler Active] Sleeping for ${Math.round(msToWait / 1000)} seconds (${(msToWait / (1000 * 60)).toFixed(2)} minutes) until 12:10:00 PM...`);

setTimeout(async () => {
  console.log(`\n[Scheduler Triggered] 12:10:00 PM reached at ${new Date().toLocaleTimeString()}!`);
  console.log(`Dispatching MCQ recovery check-in emails to all 3 patients...`);
  
  try {
    const { sendScheduledCheckins } = await import('./send-scheduled-checkins.js');
    const results = await sendScheduledCheckins();
    console.log('\n================ Check-in Dispatch Summary ================');
    results.forEach((r, idx) => {
      if (r.success) {
        console.log(`[${idx + 1}] ✅ ${r.name} (${r.email}) -> Sent! Message ID: ${r.messageId}`);
      } else {
        console.log(`[${idx + 1}] ❌ ${r.name} (${r.email}) -> Failed: ${r.error}`);
      }
    });
    console.log('===========================================================');
  } catch (err) {
    console.error('[Scheduler Error] Failed to execute email dispatch:', err);
  }
}, msToWait);

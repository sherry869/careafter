import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const target = new Date('2026-09-16T06:00:00+05:30');
const msToWait = Math.max(0, target.getTime() - Date.now());

console.log(`[Scheduler Active] Target: 6:00:00 AM IST on September 16, 2026.`);
console.log(`[Scheduler Active] Sleeping for ${Math.round(msToWait / 1000)} seconds until 6:00:00 AM IST...`);

setTimeout(async () => {
  console.log(`[Scheduler Triggered] 6:00:00 AM IST reached. Executing CareAfter Email check-in dispatch...`);
  const { sendScheduledCheckins } = await import('./send-scheduled-checkins.js');
  await sendScheduledCheckins();
}, msToWait);

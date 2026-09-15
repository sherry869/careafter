import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import analyzeHandler from './api/analyze.js';
import addPatientHandler from './api/add-patient.js';
import generateQuestionsHandler from './api/generate-questions.js';
import sendCheckinHandler from './api/send-checkin.js';
import assessResponseHandler from './api/assess-response.js';
import cronCheckinHandler from './api/cron-checkin.js';

dotenv.config();
if (!process.env.GEMINI_API_KEY && fs.existsSync(path.resolve(process.cwd(), 'src', '.env'))) {
  dotenv.config({ path: path.resolve(process.cwd(), 'src', '.env') });
}

const apiHandlers = {
  '/api/analyze': analyzeHandler,
  '/api/add-patient': addPatientHandler,
  '/api/generate-questions': generateQuestionsHandler,
  '/api/send-checkin': sendCheckinHandler,
  '/api/assess-response': assessResponseHandler,
  '/api/cron-checkin': cronCheckinHandler
};

export default defineConfig({
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || '')
  },
  server: {
    port: 5173,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), 'index.html'),
        dashboard: path.resolve(process.cwd(), 'src/dashboard.html'),
        addPatient: path.resolve(process.cwd(), 'src/add-patient.html'),
        timeline: path.resolve(process.cwd(), 'src/patient-timeline.html')
      }
    }
  },
  plugins: [
    {
      name: 'api-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const pathname = (req.url || '').split('?')[0].replace(/\/$/, '');
          const handler = apiHandlers[pathname];
          if (!handler) {
            next();
            return;
          }

          let bodyData = '';
          req.on('data', (chunk) => {
            bodyData += chunk;
          });

          req.on('end', async () => {
            try {
              if (bodyData) {
                req.body = JSON.parse(bodyData);
              } else {
                req.body = {};
              }
            } catch (e) {
              req.body = bodyData;
            }

            res.status = function (code) {
              this.statusCode = code;
              return this;
            };
            res.json = function (data) {
              this.setHeader('Content-Type', 'application/json');
              this.end(JSON.stringify(data));
              return this;
            };

            try {
              await handler(req, res);
            } catch (err) {
              console.error('Local API Handler Error:', err);
              if (!res.writableEnded) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
              }
            }
          });
        });
      }
    }
  ]
});

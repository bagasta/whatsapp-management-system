import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { logger, log } from './logger.js';
import { SessionManager } from './sessionManager.js';
import { buildApiRouter } from './routes/api.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(bodyParser.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const manager = new SessionManager({ defaultWebhook: process.env.WEBHOOK_URL });

app.get('/health', (req, res) => res.json({ ok: true, up: true, time: new Date().toISOString() }));

app.use('/api', buildApiRouter({ manager }));

const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  log({ level:'info', msg:`server:listen`, host, port });
});

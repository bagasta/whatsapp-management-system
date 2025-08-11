import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireApiKey } from '../utils/guard.js';

export function buildApiRouter({ manager }) {
  const router = express.Router();

  const limiter = rateLimit({ windowMs: 15*60*1000, max: 200 });
  router.use(limiter);
  router.use(requireApiKey);

  // sessions
  router.get('/sessions', (req, res) => {
    res.json({ sessions: manager.list() });
  });

  router.post('/sessions', async (req, res) => {
    const { sessionId, webhookUrl } = req.body || {};
    const result = await manager.create({ sessionId, webhookUrl });
    res.json(result);
  });

  router.get('/sessions/:id/status', (req, res) => {
    const st = manager.status(req.params.id);
    if (!st) return res.status(404).json({ error: 'Not found' });
    res.json(st);
  });

  router.get('/sessions/:id/qr', async (req, res) => {
    const dataUrl = await manager.qrPng(req.params.id);
    if (!dataUrl) return res.status(404).json({ error: 'No active QR' });
    res.json({ dataUrl });
  });

  router.delete('/sessions/:id', async (req, res) => {
    const ok = await manager.destroy(req.params.id);
    res.json({ ok });
  });

  // send text
  router.post('/sessions/:id/send-message', async (req, res) => {
    const s = manager.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Unknown session' });
    const { to, message } = req.body || {};
    if (!to || !message) return res.status(400).json({ error: 'to & message required' });
    await s.client.sendMessage(to, message);
    res.json({ ok: true });
  });

  // send media (base64 or url)
  router.post('/sessions/:id/send-media', async (req, res) => {
    const s = manager.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Unknown session' });
    const { to, base64, mediaUrl, mimetype, filename, caption } = req.body || {};
    if (!to || (!base64 && !mediaUrl)) return res.status(400).json({ error: 'to & (base64 | mediaUrl) required' });

    const { MessageMedia } = await import('whatsapp-web.js');
    let mm = null;
    if (base64) {
      mm = new MessageMedia(mimetype || 'application/octet-stream', base64, filename || 'file');
    } else {
      const axios = (await import('axios')).default;
      const r = await axios.get(mediaUrl, { responseType:'arraybuffer' });
      const b64 = Buffer.from(r.data).toString('base64');
      mm = new MessageMedia(mimetype || r.headers['content-type'] || 'application/octet-stream', b64, filename || 'file');
    }
    await s.client.sendMessage(to, mm, { caption: caption || '' });
    res.json({ ok: true });
  });

  // chats & contacts
  router.get('/sessions/:id/chats', async (req, res) => {
    const s = manager.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Unknown session' });
    const chats = await s.client.getChats();
    res.json(chats.map(c => ({ id: c.id._serialized, name: c.name, isGroup: c.isGroup, unreadCount: c.unreadCount })));
  });

  router.get('/sessions/:id/contacts', async (req, res) => {
    const s = manager.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Unknown session' });
    const contacts = await s.client.getContacts();
    res.json(contacts.map(ct => ({ id: ct.id._serialized, number: ct.number, name: ct.name, pushname: ct.pushname })));
  });

  // logs SSE
  router.get('/logs/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const { onLog } = await import('../logger.js');
    const unsub = onLog(evt => {
      res.write(`data: ${JSON.stringify(evt)}\n\n`);
    });
    req.on('close', () => unsub && unsub());
  });

  // session events SSE (placeholder: reuse logs)
  router.get('/sessions/:id/events', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const { onLog } = await import('../logger.js');
    const id = req.params.id;
    const unsub = onLog(evt => {
      if (evt.sessionId === id) res.write(`data: ${JSON.stringify(evt)}\n\n`);
    });
    req.on('close', () => unsub && unsub());
  });

  return router;
}

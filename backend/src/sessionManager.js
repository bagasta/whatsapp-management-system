import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, Buttons, List } = pkg;
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { log } from './logger.js';
import { sendToWebhook } from './webhook.js';
import { buildFullPayload } from './payload.js';
import { maybeCompressImage } from './utils/media.js';

const PUP_ARGS = (process.env.PUPPETEER_ARGS || '').split(',').filter(Boolean);

export class SessionManager {
  constructor({ defaultWebhook }) {
    this.sessions = new Map(); // sessionId -> { client, webhookUrl, qr, state }
    this.defaultWebhook = defaultWebhook;
  }

  list() {
    return Array.from(this.sessions.keys());
  }

  get(sessionId) {
    return this.sessions.get(sessionId);
  }

  async create({ sessionId, webhookUrl }) {
    if (!sessionId) sessionId = uuidv4();
    if (this.sessions.has(sessionId)) {
      return { sessionId, already: true };
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: sessionId }),
      puppeteer: {
        headless: true,
        args: PUP_ARGS.length ? PUP_ARGS : [
          '--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage',
          '--no-first-run','--no-zygote','--disable-gpu'
        ]
      },
      webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2413.51-beta.html' }
    });

    const state = { status: 'initializing', qr: null, me: null };
    this.sessions.set(sessionId, { client, webhookUrl: webhookUrl || this.defaultWebhook, state });

    client.on('qr', async (qr) => {
      state.qr = qr;
      state.status = 'qr';
      log({ level:'info', msg:'qr', sessionId });
    });

    client.on('ready', () => {
      state.status = 'ready';
      state.qr = null;
      state.me = client.info;
      log({ level:'info', msg:'session:ready', sessionId, me: client.info });
    });

    client.on('authenticated', () => {
      state.status = 'authenticated';
      log({ level:'info', msg:'session:authenticated', sessionId });
    });

    client.on('auth_failure', (m) => {
      state.status = 'auth_failure';
      log({ level:'error', msg:'session:auth_failure', sessionId, error: m });
    });

    client.on('disconnected', (r) => {
      state.status = 'disconnected';
      log({ level:'warn', msg:'session:disconnected', sessionId, reason: r });
      client.initialize();
    });

    client.on('message', async (msg) => {
      try {
        const chat = await msg.getChat();
        const isGroup = chat?.isGroup;
        const myId = client.info?.wid?._serialized;

        // Group filter: only forward when mentioned
        if (isGroup) {
          const mentioned = (msg.mentionedIds || []).includes(myId);
          if (!mentioned) return;
        }

        let payload = await buildFullPayload({ client, msg });

        // compress images if any
        if (payload.media && payload.media.mimetype && payload.media.mimetype.startsWith('image/')) {
          const compressed = await maybeCompressImage(payload.media);
          payload.media = compressed;
          payload.message.compressed = true;
        }

        // send to webhook
        const session = this.get(sessionId);
        const hook = session?.webhookUrl;
        log({ level:'info', msg:'forward:message', sessionId, toWebhook: !!hook });
        const response = await sendToWebhook(hook, payload);

        // handle webhook response
        await this.handleWebhookResponse({ client, msg, response });

      } catch (e) {
        log({ level:'error', msg:'message:handler:error', error: e.message });
      }
    });

    // other useful events to forward (revokes, updates)
    client.on('message_revoke_everyone', async (after, before) => {
      const payload = {
        event: 'message_revoke_everyone',
        sessionId,
        messageId: after?.id?._serialized || before?.id?._serialized
      };
      await sendToWebhook(this.get(sessionId)?.webhookUrl, payload);
    });

    client.on('message_ack', async (msg, ack) => {
      const payload = { event:'message_ack', sessionId, messageId: msg.id?._serialized, ack };
      await sendToWebhook(this.get(sessionId)?.webhookUrl, payload);
    });

    client.initialize();
    return { sessionId };
  }

  async qrPng(sessionId) {
    const s = this.get(sessionId);
    if (!s?.state.qr) return null;
    return await QRCode.toDataURL(s.state.qr);
  }

  status(sessionId) {
    const s = this.get(sessionId);
    if (!s) return null;
    return { sessionId, ...s.state, webhookUrl: s.webhookUrl };
  }

  async destroy(sessionId) {
    const s = this.get(sessionId);
    if (!s) return false;
    await s.client.destroy();
    this.sessions.delete(sessionId);
    return true;
  }

  async handleWebhookResponse({ client, msg, response }) {
    try {
      if (!response) return;
      const chat = await msg.getChat();

      // simple string reply
      if (typeof response === 'string' && response.trim().length) {
        await chat.sendMessage(response);
        return;
      }

      if (typeof response !== 'object') return;
      if (response.delayMs) await new Promise(r => setTimeout(r, Number(response.delayMs)||0));

      const queue = Array.isArray(response.send) ? response.send : [];
      if (response.reply) {
        await chat.sendMessage(String(response.reply));
      }
      for (const item of queue) {
        const to = (item.to === 'auto' || !item.to) ? chat.id._serialized : item.to;

        if (item.type === 'text' && item.message) {
          await client.sendMessage(to, String(item.message));
        }
        else if (item.type === 'media' && (item.mediaUrl || item.base64)) {
          const pkg = await import('whatsapp-web.js');
          const { MessageMedia } = pkg.default;
          let mm = null;
          if (item.base64) {
            mm = new MessageMedia(item.mimetype || 'application/octet-stream', item.base64, item.filename || 'file');
          } else {
            // fetch as base64
            const res = await (await import('axios')).default.get(item.mediaUrl, { responseType:'arraybuffer' });
            const b64 = Buffer.from(res.data).toString('base64');
            mm = new MessageMedia(item.mimetype || res.headers['content-type'] || 'application/octet-stream', b64, item.filename || 'file');
          }
          await client.sendMessage(to, mm, { caption: item.caption || '' });
        }
        else if (item.type === 'buttons' && item.body && Array.isArray(item.buttons)) {
          const btns = item.buttons.map(b => ({ id: b.id, body: b.text || b.body || b.id }));
          const mkButtons = new Buttons(item.body, btns, item.title || '', item.footer || '');
          await client.sendMessage(to, mkButtons);
        }
        else if (item.type === 'list' && item.body && Array.isArray(item.sections)) {
          const mkList = new List(item.body, item.buttonText || 'Open', item.sections, item.title || '', item.footer || '');
          await client.sendMessage(to, mkList);
        }
      }
    } catch (e) {
      log({ level:'error', msg:'webhook:apply:error', error: e.message });
    }
  }
}

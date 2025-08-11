# WhatsApp Web JS – Fullstack Kit (Backend API + Laravel Breeze Frontend)

This package contains:
- **backend/** — Node.js Express API wrapping **whatsapp-web.js** (multi-session), webhook forwarder (with reply handling), image compression via **sharp**, clean structured logs, SSE log & event streams, and a comprehensive REST surface.
- **frontend-overrides/** — Drop-in overrides to apply on top of a fresh Laravel app with **Breeze** (Blade). It provides a management UI similar to the attached mockup: Sessions, QR login, message sender, chat & contacts, webhook config.

> References:  
> - whatsapp-web.js: https://github.com/pedroslopez/whatsapp-web.js  
> - Docs: https://docs.wwebjs.dev/  
> - Laravel Breeze: https://santrikoding.com/tutorial-laravel-breeze

---

## Quick Start

### 1) Backend (Node.js)
Requirements: Node 18+ (recommended 20), `git`, `npm`.

```bash
cd backend
cp .env.example .env
# Edit .env, set WEBHOOK_URL, and API_KEY if desired
npm install
npm run dev   # or: npm start for production
```

The server listens on `PORT` from `.env` (default **3001**).  
Open healthcheck: `GET http://localhost:3001/health`

**Create a session**
```bash
curl -X POST http://localhost:3001/api/sessions   -H 'Content-Type: application/json'   -H 'X-API-Key: CHANGE_ME'   -d '{"sessionId":"my-bot","webhookUrl":"https://your-n8n/webhook/wa"}'
```
Fetch QR (ASCII):
```bash
curl -H 'X-API-Key: CHANGE_ME' http://localhost:3001/api/sessions/my-bot/qr
```

**Event stream (SSE)**
- Logs: `GET /api/logs/stream`
- Session events: `GET /api/sessions/:id/events`

**Send messages**
```bash
curl -X POST http://localhost:3001/api/sessions/my-bot/send-message   -H 'Content-Type: application/json' -H 'X-API-Key: CHANGE_ME'   -d '{"to":"6281234567890@c.us", "message":"Hello from API"}'
```

**Group filter**  
Incoming **group** messages are forwarded to the webhook **only if the bot is mentioned** (e.g., `@YourBot`).

**Image compression**  
Incoming image media is downsized via **sharp** to max width 1280 and JPEG quality 70 (configurable).

---

### 2) Frontend (Laravel + Breeze overrides)

> We ship **overrides**, not a full Laravel core. Apply them to a clean Laravel app.

```bash
# Make a fresh Laravel app
composer create-project laravel/laravel frontend
cd frontend

# Install Breeze (Blade)
composer require laravel/breeze --dev
php artisan breeze:install blade

# Node deps & build
npm install
npm run dev   # or npm run build

# Apply overrides from this zip (in another terminal):
# From the zip root:
bash frontend-overrides/scripts/apply-overrides.sh /full/path/to/frontend
# or (inside frontend-overrides/):
bash scripts/apply-overrides.sh /full/path/to/frontend

# Run the app
php artisan migrate
php artisan serve
```

Set `.env` in your Laravel app:
```
BACKEND_BASE_URL=http://localhost:3001
BACKEND_API_KEY=CHANGE_ME
```

Then visit your Laravel app, log in (Breeze), and manage sessions/messages from the dashboard UI.

---

## Webhook Response Contract

Your webhook may respond with **either a string** (treated as a simple reply) or **an object**:
```json
{
  "reply": "text reply",               // optional
  "send": [                            // queue of actions (executed in order)
    { "type":"text", "to":"auto", "message":"Hello" },
    { "type":"media", "to":"auto", "mediaUrl":"https://...", "caption":"Here" },
    { "type":"buttons", "to":"auto", "body":"Pick", "buttons":[{"id":"ok","text":"OK"}] },
    { "type":"list", "to":"auto", "body":"Menu", "sections":[{"title":"A","rows":[{"id":"1","title":"One"}]}] }
  ],
  "delayMs": 0                         // optional global delay before executing 'send'
}
```
- `to: "auto"` will reply back to the incoming chat automatically. You can also pass e.g. `"62812...@c.us"`.
- Any unsupported fields are ignored safely.

---

## Security
- **API key** via `X-API-Key` header (set `API_KEY` in `.env`).
- Basic rate limiting on key endpoints.
- CORS allowed by default (configure as needed).

---

## Docker (optional)

```bash
cd backend
docker build -t wa-wwebjs-api .
docker run --name wa-api --env-file .env -p 3001:3001 -v $(pwd)/data:/app/data -v $(pwd)/logs:/app/logs wa-wwebjs-api
```

---

## Notes
- Multi-session via `LocalAuth({ clientId: <sessionId> })`. Sessions auto-reload after restart.
- Full payloads include `message`, `chat`, `contact`, `groupMetadata`, and `media` (base64, compressed for images).
- Clear, structured logs are written to `logs/` as ndjson and also streamed over SSE.

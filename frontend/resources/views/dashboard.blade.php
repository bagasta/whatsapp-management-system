@php
  $apiBase = env('BACKEND_BASE_URL', 'http://localhost:3001');
  $apiKey = env('BACKEND_API_KEY', 'CHANGE_ME');
@endphp
@extends('layouts.app')

@section('content')
<div class="max-w-7xl mx-auto px-4 py-8">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-semibold">WhatsApp Management</h1>
    <button id="btn-new-session" class="px-4 py-2 bg-blue-600 text-white rounded-lg">New Session</button>
  </div>

  <div id="sessions" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>

  <div class="mt-10">
    <h2 class="text-xl font-semibold mb-3">Quick Sender</h2>
    <div class="p-4 border rounded-lg grid gap-3 md:grid-cols-3">
      <input id="send-session-id" class="border rounded p-2" placeholder="sessionId e.g. my-bot">
      <input id="send-to" class="border rounded p-2" placeholder="Recipient e.g. 62812...@c.us">
      <input id="send-text" class="border rounded p-2" placeholder="Message">
      <button id="btn-send" class="px-4 py-2 bg-green-600 text-white rounded-lg md:col-span-3">Send</button>
    </div>
  </div>

  <div class="mt-10">
    <h2 class="text-xl font-semibold mb-3">Live Logs</h2>
    <pre id="logs" class="h-64 overflow-auto bg-black text-green-300 p-3 rounded"></pre>
  </div>
</div>

<script>
const API_KEY = '{{ $apiKey }}';
const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };
const apiBase = '{{ $apiBase }}';

async function fetchJSON(url, opts={}) {
  const res = await fetch(url, { ...opts, headers: { ...headers, ...(opts.headers||{}) } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}

async function loadSessions() {
  const data = await fetchJSON(`${apiBase}/api/sessions`);
  const wrap = document.getElementById('sessions');
  wrap.innerHTML='';
  for (const id of data.sessions) {
    const st = await fetchJSON(`${apiBase}/api/sessions/${id}/status`);
    const el = document.createElement('div');
    el.className = 'border rounded-lg p-4 bg-white';
    el.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-500">Session</div>
          <div class="font-semibold">${st.sessionId}</div>
          <div class="text-sm mt-1">Status: <span class="font-medium">${st.status}</span></div>
        </div>
        <button data-id="${st.sessionId}" class="btn-destroy px-2 py-1 bg-red-600 text-white rounded">Logout</button>
      </div>
      <div class="mt-3 space-y-2" id="qr-${st.sessionId}"></div>
    `;
    wrap.appendChild(el);

    if (st.status === 'qr') {
      const qr = await fetchJSON(`${apiBase}/api/sessions/${st.sessionId}/qr`);
      const qrel = document.getElementById(`qr-${st.sessionId}`);
      qrel.innerHTML = \`<img class="w-48 h-48" src="\${qr.dataUrl}" />\`;
    }
  }
  document.querySelectorAll('.btn-destroy').forEach(b => b.addEventListener('click', async (e) => {
    const id = e.target.getAttribute('data-id');
    await fetchJSON(`${apiBase}/api/sessions/${id}`, { method:'DELETE' });
    loadSessions();
  }));
}

document.getElementById('btn-new-session').addEventListener('click', async () => {
  const sessionId = prompt('sessionId (leave blank to auto):') || undefined;
  const webhookUrl = prompt('webhook URL (leave blank to use backend default):') || undefined;
  await fetchJSON(`${apiBase}/api/sessions`, {
    method:'POST',
    body: JSON.stringify({ sessionId, webhookUrl })
  });
  loadSessions();
});

document.getElementById('btn-send').addEventListener('click', async () => {
  const id = document.getElementById('send-session-id').value.trim();
  const to = document.getElementById('send-to').value.trim();
  const message = document.getElementById('send-text').value.trim();
  if (!id || !to || !message) return alert('Fill all fields');
  await fetchJSON(`${apiBase}/api/sessions/${id}/send-message`, {
    method:'POST',
    body: JSON.stringify({ to, message })
  });
  alert('Sent');
});

// SSE Logs
const logs = document.getElementById('logs');
const evt = new EventSource(`${apiBase}/api/logs/stream`, { withCredentials:false });
evt.onmessage = (e) => {
  try {
    const obj = JSON.parse(e.data);
    const line = `[${obj.level||'info'}] ${obj.msg||''} ${obj.sessionId ? '(session:'+obj.sessionId+')' : ''}`;
    logs.textContent += line + "\n";
    logs.scrollTop = logs.scrollHeight;
  } catch {}
};

loadSessions();
</script>
@endsection

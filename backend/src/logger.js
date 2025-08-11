import pino from 'pino';

const transport = pino.transport({
  targets: [
    { target: 'pino/file', options: { destination: 'logs/app.ndjson' } },
    { target: 'pino/file', options: { destination: 1 } } // stdout
  ]
});

export const logger = pino(
  {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

// very small pubsub for SSE
const listeners = new Set();
export function onLog(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function emitLog(evt) { for (const l of listeners) try { l(evt); } catch {} }

export function log(evt) {
  logger[evt.level || 'info'](evt);
  emitLog(evt);
}

import axios from 'axios';
import { log } from './logger.js';

export async function sendToWebhook(url, payload) {
  if (!url) return null;
  try {
    const res = await axios.post(url, payload, { timeout: 30000 });
    log({ level:'debug', msg:'webhook:response', status: res.status });
    return res.data;
  } catch (err) {
    log({ level:'error', msg:'webhook:error', error: err.message });
    return null;
  }
}

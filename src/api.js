import { API_URL } from './config.js';

/** GET toàn bộ submissions */
export async function fetchSubmissions() {
  if (!API_URL || API_URL.startsWith('PASTE_')) {
    throw new Error('Chưa cấu hình API_URL trong src/config.js');
  }
  const res = await fetch(API_URL, { method: 'GET' });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Fetch failed');
  return json.submissions || [];
}

/**
 * Submit qua GET với action=submit&data=<encoded JSON>
 * (workaround CORS cho Apps Script)
 */
export async function submitSurvey(payload) {
  if (!API_URL || API_URL.startsWith('PASTE_')) {
    throw new Error('Chưa cấu hình API_URL trong src/config.js');
  }
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const url = `${API_URL}?action=submit&data=${encoded}`;
  const res = await fetch(url, { method: 'GET' });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Submit failed');
  return json;
}

/**
 * LumoTutor AI - Background Service Worker
 * Proxies API requests to avoid Mixed Content (HTTPS -> HTTP) and CORS blocks.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ASK_TUTOR') {
    handleAskTutor(request.payload)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Async response
  }
  if (request.type === 'SAVE_TO_MEMRY') {
    handleSaveToMemry(request.payload)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  if (request.type === 'CHECK_HEALTH') {
    checkHealth(request.url)
      .then(ok => sendResponse({ success: ok }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }
});

async function getPreferredServerUrl() {
  return new Promise(resolve => {
    chrome.storage.local.get(['lumotutor_server_url'], (res) => {
      if (res && res.lumotutor_server_url) {
        resolve(res.lumotutor_server_url.replace(/\/+$/, ''));
      } else {
        // Default to VPS Tailscale IP first for Chromebook
        resolve('http://100.86.244.6:3456');
      }
    });
  });
}

async function checkHealth(url) {
  try {
    const resp = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}

async function getActiveEndpoint() {
  const preferredUrl = await getPreferredServerUrl();
  const candidates = Array.from(new Set([
    preferredUrl,
    'http://localhost:3456',
    'http://100.86.244.6:3456',
    'http://127.0.0.1:3456'
  ]));

  // Race all candidates in parallel with 1500ms timeout
  try {
    const active = await Promise.any(candidates.map(async (url) => {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return url;
      throw new Error(`Endpoint ${url} failed health check`);
    }));
    return active;
  } catch {
    return preferredUrl;
  }
}

async function handleAskTutor(payload) {
  const ep = await getActiveEndpoint();

  try {
    const resp = await fetch(`${ep}/api/tutor/vision-ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(35000)
    });

    if (resp.ok) {
      const data = await resp.json();
      chrome.storage.local.set({ lumotutor_server_url: ep });
      return data;
    } else {
      const errText = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 100)}`);
    }
  } catch (primaryErr) {
    // Resilient fallback: try the alternative endpoint (VPS or localhost)
    const altEp = ep.includes('localhost') ? 'http://100.86.244.6:3456' : 'http://localhost:3456';
    try {
      const resp2 = await fetch(`${altEp}/api/tutor/vision-ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000)
      });
      if (resp2.ok) {
        const data2 = await resp2.json();
        chrome.storage.local.set({ lumotutor_server_url: altEp });
        return data2;
      }
    } catch (_) {}

    throw new Error(`Could not reach backend (${ep}): ${primaryErr.message}`);
  }
}

async function handleSaveToMemry(payload) {
  const ep = await getActiveEndpoint();

  try {
    const resp = await fetch(`${ep}/api/memry/save-inbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    });

    if (resp.ok) {
      return await resp.json();
    } else {
      const errText = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 100)}`);
    }
  } catch (err) {
    const altEp = ep.includes('localhost') ? 'http://100.86.244.6:3456' : 'http://localhost:3456';
    try {
      const resp2 = await fetch(`${altEp}/api/memry/save-inbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });
      if (resp2.ok) {
        return await resp2.json();
      }
    } catch (_) {}
    throw new Error(`Could not reach backend (${ep}) to save note: ${err.message}`);
  }
}

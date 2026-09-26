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

async function handleAskTutor(payload) {
  const preferredUrl = await getPreferredServerUrl();

  const endpoints = [
    preferredUrl,
    'http://100.86.244.6:3456',
    'http://localhost:3456',
    'http://127.0.0.1:3456'
  ];

  const uniqueEndpoints = Array.from(new Set(endpoints));
  let lastError = null;

  for (const ep of uniqueEndpoints) {
    try {
      const resp = await fetch(`${ep}/api/tutor/vision-ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(35000)
      });

      if (resp.ok) {
        const data = await resp.json();
        // Save working endpoint
        chrome.storage.local.set({ lumotutor_server_url: ep });
        return data;
      } else {
        lastError = new Error(`Server returned HTTP ${resp.status}`);
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(lastError ? lastError.message : 'All backend endpoints unreachable');
}

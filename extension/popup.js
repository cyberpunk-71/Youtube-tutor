document.addEventListener('DOMContentLoaded', async () => {
  const serverInput = document.getElementById('server-url');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const saveBtn = document.getElementById('save-btn');

  // Load saved backend URL
  const stored = await chrome.storage.local.get(['lumotutor_server_url']);
  const serverUrl = stored.lumotutor_server_url || 'http://100.86.244.6:3456';
  serverInput.value = serverUrl;

  async function checkServer(url) {
    statusDot.className = 'status-dot';
    statusText.innerText = 'Connecting...';
    try {
      const resp = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (resp.ok) {
        statusDot.className = 'status-dot online';
        statusText.innerText = 'Backend Connected (Ready)';
        return true;
      }
    } catch (e) {
      // Fallback check to VPS tailscale IP if localhost fails
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        try {
          const fallbackResp = await fetch('http://100.86.244.6:3456/api/health', { signal: AbortSignal.timeout(3000) });
          if (fallbackResp.ok) {
            serverInput.value = 'http://100.86.244.6:3456';
            await chrome.storage.local.set({ lumotutor_server_url: 'http://100.86.244.6:3456' });
            statusDot.className = 'status-dot online';
            statusText.innerText = 'Connected via VPS Mesh (100.86.244.6)';
            return true;
          }
        } catch (_) {}
      }
    }
    statusDot.className = 'status-dot offline';
    statusText.innerText = 'Backend Offline (Check server)';
    return false;
  }

  await checkServer(serverUrl);

  saveBtn.addEventListener('click', async () => {
    let url = serverInput.value.trim().replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
      serverInput.value = url;
    }
    await chrome.storage.local.set({ lumotutor_server_url: url });
    await checkServer(url);
  });
});

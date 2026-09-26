/**
 * LumoTutor AI - YouTube Floating Screen Assistant
 * Content Script injected directly into youtube.com/watch
 */

(function () {
  if (window.__LUMOTUTOR_INJECTED__) return;
  window.__LUMOTUTOR_INJECTED__ = true;

  console.log('🎓 LumoTutor AI YouTube Assistant Initializing...');

  let serverUrl = 'http://localhost:3456';
  let chatHistory = [];
  let isListening = false;
  let recognition = null;
  let activeSpeechTimeout = null;

  // Retrieve stored backend URL
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['lumotutor_server_url'], (res) => {
      if (res && res.lumotutor_server_url) {
        serverUrl = res.lumotutor_server_url.replace(/\/+$/, '');
      }
    });
  }

  // 1. YouTube Helper Functions
  function getVideo() {
    return document.querySelector('video.html5-main-video') || document.querySelector('video');
  }

  function getVideoTimestamp() {
    const v = getVideo();
    return v ? Math.floor(v.currentTime) : 0;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${m}:${s}`;
  }

  function getVideoTitle() {
    const el = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
               document.querySelector('h1.title yt-formatted-string') ||
               document.querySelector('h1');
    return el ? el.innerText.trim() : document.title.replace(' - YouTube', '').trim();
  }

  function getChannelName() {
    const el = document.querySelector('#channel-name yt-formatted-string a') ||
               document.querySelector('#channel-name');
    return el ? el.innerText.trim() : 'Instructor';
  }

  // 2. Direct Video Screenshot Capture
  function captureVideoScreenshot() {
    const v = getVideo();
    if (!v) {
      console.warn('LumoTutor: No video element found on page');
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const w = v.videoWidth || 1280;
      const h = v.videoHeight || 720;
      // Cap max dimension to 1280 for fast uploads & optimal vision tokens
      const scale = Math.min(1, 1280 / w);
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);

      const ctx = canvas.getContext('2d');
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (err) {
      console.warn('LumoTutor: Failed to capture video canvas:', err);
      return null;
    }
  }

  // 3. Construct Floating UI DOM
  function createUI() {
    if (document.getElementById('lumotutor-root')) return;

    const root = document.createElement('div');
    root.id = 'lumotutor-root';

    // Minimized Pill
    const pill = document.createElement('div');
    pill.id = 'lumotutor-pill';
    pill.innerHTML = `
      <div class="lumotutor-pill-icon">🎓</div>
      <span class="lumotutor-pill-label">LumoTutor</span>
      <button class="lumotutor-pill-btn" id="lumo-pill-screen">📸 Screen</button>
      <button class="lumotutor-pill-btn" id="lumo-pill-mic">🎙️</button>
    `;

    // Expanded Window
    const win = document.createElement('div');
    win.id = 'lumotutor-window';
    win.className = 'hidden';
    win.innerHTML = `
      <div class="lumotutor-header" id="lumotutor-drag-handle">
        <div class="lumotutor-title-group">
          <span style="font-size: 16px;">🎓</span>
          <h3>LumoTutor AI</h3>
          <span class="lumotutor-time-badge" id="lumo-time-badge">0:00</span>
        </div>
        <div class="lumotutor-header-actions">
          <button class="lumotutor-icon-btn" id="lumo-clear-btn" title="Clear Chat">🗑️</button>
          <button class="lumotutor-icon-btn" id="lumo-min-btn" title="Minimize">—</button>
          <button class="lumotutor-icon-btn" id="lumo-close-btn" title="Hide">✕</button>
        </div>
      </div>

      <div class="lumotutor-chips-bar">
        <button class="lumotutor-chip" data-prompt="Explain what is on the screen right now">📸 Explain Screen</button>
        <button class="lumotutor-chip" data-prompt="Solve this problem step by step with full calculations">✍️ Step-by-Step</button>
        <button class="lumotutor-chip" data-prompt="What formula or theorem is being applied here?">🔍 What Formula?</button>
        <button class="lumotutor-chip" data-prompt="Quiz me on what was covered up to this point">🎯 Quiz Me</button>
      </div>

      <div class="lumotutor-messages" id="lumotutor-messages">
        <div class="lumotutor-msg assistant">
          <p>👋 <strong>Welcome to LumoTutor!</strong></p>
          <p>Pause any lecture, tap <strong>📸 Ask Screen</strong> or <strong>🎙️ Mic</strong>, and I will read the formulas, diagrams, and notes straight off the screen to answer you!</p>
        </div>
      </div>

      <div class="lumotutor-footer">
        <div class="lumotutor-input-box">
          <button class="lumotutor-mic-btn" id="lumo-mic-btn" title="Voice Input (Speech-to-Text)">🎙️</button>
          <textarea class="lumotutor-textarea" id="lumo-input" placeholder="Ask about this video frame... (or use 🎙️ / 📸)" rows="1"></textarea>
          <button class="lumotutor-send-btn" id="lumo-send-btn" title="Send (Enter)">➤</button>
        </div>
        <button class="lumotutor-screen-btn" id="lumo-ask-screen-btn">📸 Ask Current Video Screen</button>
      </div>
    `;

    root.appendChild(pill);
    root.appendChild(win);
    document.body.appendChild(root);

    initEventHandlers(pill, win);
    initDraggables(pill, win);
    initVoiceRecognition();
  }

  // 4. Draggable Logic
  function initDraggables(pill, win) {
    makeDraggable(pill, pill);
    const dragHandle = document.getElementById('lumotutor-drag-handle');
    makeDraggable(win, dragHandle);

    // Restore saved positions
    const savedPillPos = localStorage.getItem('lumotutor_pill_pos');
    if (savedPillPos) {
      try {
        const { x, y } = JSON.parse(savedPillPos);
        pill.style.right = 'auto';
        pill.style.bottom = 'auto';
        pill.style.left = `${Math.max(10, Math.min(window.innerWidth - 180, x))}px`;
        pill.style.top = `${Math.max(10, Math.min(window.innerHeight - 50, y))}px`;
      } catch (_) {}
    }
  }

  function makeDraggable(element, handle) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;
    let hasMoved = false;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }

      const newLeft = Math.max(10, Math.min(window.innerWidth - element.offsetWidth - 10, initialX + dx));
      const newTop = Math.max(10, Math.min(window.innerHeight - element.offsetHeight - 10, initialY + dy));

      element.style.right = 'auto';
      element.style.bottom = 'auto';
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        if (element.id === 'lumotutor-pill') {
          const rect = element.getBoundingClientRect();
          localStorage.setItem('lumotutor_pill_pos', JSON.stringify({ x: rect.left, y: rect.top }));
        }
      }
    });

    // Handle clicks vs drags
    handle.addEventListener('click', (e) => {
      if (hasMoved) {
        e.stopPropagation();
      }
    });
  }

  // 5. Speech Recognition Setup (Web Speech API)
  function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('LumoTutor: Web Speech API not supported in this browser.');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    const input = document.getElementById('lumo-input');
    const micBtn = document.getElementById('lumo-mic-btn');
    const pillMicBtn = document.getElementById('lumo-pill-mic');

    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add('listening');
      if (pillMicBtn) pillMicBtn.style.color = '#ef4444';
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (input) {
        input.value = final || interim;
      }
    };

    recognition.onerror = (event) => {
      console.warn('LumoTutor Speech error:', event.error);
      stopListening();
    };

    recognition.onend = () => {
      stopListening();
      if (input && input.value.trim().length > 3) {
        // Auto-send voice queries after pause!
        submitQuestion(input.value.trim(), true);
      }
    };
  }

  function toggleListening() {
    if (!recognition) {
      alert('Voice speech recognition is not supported or microphone access was blocked in this browser.');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      const v = getVideo();
      if (v && !v.paused) {
        v.pause(); // Auto-pause video when speaking
      }
      try {
        recognition.start();
      } catch (e) {
        console.warn('Speech recognition start failed:', e);
      }
    }
  }

  function stopListening() {
    isListening = false;
    const micBtn = document.getElementById('lumo-mic-btn');
    const pillMicBtn = document.getElementById('lumo-pill-mic');
    if (micBtn) micBtn.classList.remove('listening');
    if (pillMicBtn) pillMicBtn.style.color = '';
  }

  // 6. UI Interactions & Event Handlers
  function initEventHandlers(pill, win) {
    const input = document.getElementById('lumo-input');
    const sendBtn = document.getElementById('lumo-send-btn');
    const micBtn = document.getElementById('lumo-mic-btn');
    const pillMicBtn = document.getElementById('lumo-pill-mic');
    const pillScreenBtn = document.getElementById('lumo-pill-screen');
    const askScreenBtn = document.getElementById('lumo-ask-screen-btn');
    const minBtn = document.getElementById('lumo-min-btn');
    const closeBtn = document.getElementById('lumo-close-btn');
    const clearBtn = document.getElementById('lumo-clear-btn');
    const timeBadge = document.getElementById('lumo-time-badge');

    // Update timestamp badge periodically
    setInterval(() => {
      const t = getVideoTimestamp();
      if (timeBadge) timeBadge.innerText = formatTime(t);
    }, 1000);

    // Pill click opens window
    pill.addEventListener('click', (e) => {
      if (e.target === pillMicBtn || e.target === pillScreenBtn) return;
      pill.classList.add('hidden');
      win.classList.remove('hidden');
      input?.focus();
    });

    // Pill quick buttons
    pillScreenBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      pill.classList.add('hidden');
      win.classList.remove('hidden');
      submitQuestion('Explain what is on the screen right now', true);
    });

    pillMicBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      pill.classList.add('hidden');
      win.classList.remove('hidden');
      toggleListening();
    });

    // Window controls
    minBtn?.addEventListener('click', () => {
      win.classList.add('hidden');
      pill.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => {
      win.classList.add('hidden');
      pill.classList.remove('hidden');
    });

    clearBtn?.addEventListener('click', () => {
      const messagesContainer = document.getElementById('lumotutor-messages');
      if (messagesContainer) {
        messagesContainer.innerHTML = `
          <div class="lumotutor-msg assistant">
            <p>Chat cleared! Ready for your next question.</p>
          </div>
        `;
      }
      chatHistory = [];
    });

    // Mic click
    micBtn?.addEventListener('click', toggleListening);

    // Send button
    sendBtn?.addEventListener('click', () => {
      const text = input.value.trim();
      if (text) {
        submitQuestion(text, true);
      }
    });

    // Ask screen direct button
    askScreenBtn?.addEventListener('click', () => {
      submitQuestion('Explain what is on the screen right now and solve the visible problem', true);
    });

    // Textarea enter to send
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
          submitQuestion(text, true);
        }
      }
    });

    // Quick prompt chips
    document.querySelectorAll('.lumotutor-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) {
          submitQuestion(prompt, true);
        }
      });
    });
  }

  // 7. Core Ask & Vision Submission
  async function submitQuestion(questionText, attachScreenshot = true) {
    const input = document.getElementById('lumo-input');
    const messages = document.getElementById('lumotutor-messages');
    if (input) input.value = '';

    const timestamp = getVideoTimestamp();
    const videoTitle = getVideoTitle();
    const channel = getChannelName();

    let screenshotBase64 = null;
    if (attachScreenshot) {
      screenshotBase64 = captureVideoScreenshot();
    }

    // Append User Message to UI
    let userMsgHtml = `<p>${escapeHtml(questionText)}</p>`;
    if (screenshotBase64) {
      userMsgHtml += `
        <div class="lumotutor-shot-preview" title="Video frame at ${formatTime(timestamp)}">
          <img src="${screenshotBase64}" alt="Screen at ${formatTime(timestamp)}" />
        </div>
        <small style="color: #94a3b8; font-size: 10px;">📸 Frame at ${formatTime(timestamp)}</small>
      `;
    }

    const userDiv = document.createElement('div');
    userDiv.className = 'lumotutor-msg user';
    userDiv.innerHTML = userMsgHtml;
    messages.appendChild(userDiv);

    // Append Loading Indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'lumotutor-loading';
    loadingDiv.innerHTML = `
      <div class="lumotutor-spinner"></div>
      <span>Analyzing video screen & calculating solution...</span>
    `;
    messages.appendChild(loadingDiv);
    messages.scrollTop = messages.scrollHeight;

    // Track in history
    chatHistory.push({ role: 'user', content: questionText });

    try {
      const payload = {
        question: questionText,
        screenshotBase64,
        timestamp,
        videoTitle,
        channel,
        chatHistory: chatHistory.slice(-6)
      };

      let resp = null;
      let lastErr = null;

      // Try active serverUrl first, then fallback to VPS mesh IP if needed
      const endpoints = [
        serverUrl,
        'http://localhost:3456',
        'http://127.0.0.1:3456',
        'http://100.86.244.6:3456'
      ];

      for (const ep of Array.from(new Set(endpoints))) {
        try {
          resp = await fetch(`${ep}/api/tutor/vision-ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(20000)
          });
          if (resp && resp.ok) {
            serverUrl = ep; // Store winning endpoint
            break;
          }
        } catch (e) {
          lastErr = e;
        }
      }

      loadingDiv.remove();

      if (!resp || !resp.ok) {
        throw new Error(lastErr?.message || `Server responded with ${resp?.status || 'Offline'}`);
      }

      const data = await resp.json();
      const content = data.content || 'Here is the analysis of this video frame.';

      chatHistory.push({ role: 'assistant', content });

      const assistantDiv = document.createElement('div');
      assistantDiv.className = 'lumotutor-msg assistant';
      assistantDiv.innerHTML = renderMarkdownAndMath(content);

      // If quiz included, render interactive quiz card
      if (data.quiz && data.quiz.question) {
        const quizCard = document.createElement('div');
        quizCard.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(15,23,42,0.8); border: 1px solid #6366f1; border-radius: 8px;';
        quizCard.innerHTML = `
          <div style="font-weight: 600; color: #a5b4fc; margin-bottom: 6px;">🧠 Check Your Understanding:</div>
          <div style="margin-bottom: 8px;">${escapeHtml(data.quiz.question)}</div>
          <div class="lumotutor-quiz-opts" style="display: flex; flex-direction: column; gap: 4px;">
            ${(data.quiz.options || []).map((opt, idx) => `
              <button class="lumotutor-quiz-opt-btn" data-idx="${idx}" style="text-align: left; padding: 6px 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-size: 12px; cursor: pointer;">
                ${escapeHtml(opt)}
              </button>
            `).join('')}
          </div>
          <div class="lumotutor-quiz-feedback" style="margin-top: 8px; font-size: 11px; display: none;"></div>
        `;

        const optBtns = quizCard.querySelectorAll('.lumotutor-quiz-opt-btn');
        const feedback = quizCard.querySelector('.lumotutor-quiz-feedback');
        optBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const chosen = Number(btn.getAttribute('data-idx'));
            const isCorrect = chosen === data.quiz.correctAnswerIndex;
            optBtns.forEach((b, i) => {
              b.disabled = true;
              if (i === data.quiz.correctAnswerIndex) {
                b.style.borderColor = '#22c55e';
                b.style.background = 'rgba(34,197,94,0.2)';
              } else if (i === chosen) {
                b.style.borderColor = '#ef4444';
                b.style.background = 'rgba(239,68,68,0.2)';
              }
            });
            feedback.style.display = 'block';
            feedback.style.color = isCorrect ? '#4ade80' : '#f87171';
            feedback.innerHTML = `<strong>${isCorrect ? '✅ Correct!' : '❌ Not quite.'}</strong> ${escapeHtml(data.quiz.explanation || '')}`;
          });
        });

        assistantDiv.appendChild(quizCard);
      }

      messages.appendChild(assistantDiv);
      messages.scrollTop = messages.scrollHeight;

    } catch (err) {
      if (loadingDiv.parentNode) loadingDiv.remove();

      const errDiv = document.createElement('div');
      errDiv.className = 'lumotutor-msg assistant';
      errDiv.style.border = '1px solid #ef4444';
      errDiv.innerHTML = `
        <p style="color: #f87171;">⚠️ <strong>Could not connect to AI Tutor backend:</strong> ${escapeHtml(err.message)}</p>
        <p style="font-size: 11px; color: #94a3b8;">Ensure LumoTutor server is running (<code>systemctl status lumotutor</code> on port 3456) or check extension settings.</p>
      `;
      messages.appendChild(errDiv);
      messages.scrollTop = messages.scrollHeight;
    }
  }

  // 8. Markdown & LaTeX Math Formatter
  function renderMarkdownAndMath(text) {
    if (!text) return '';

    let formatted = escapeHtml(text);

    // Display Math $$ ... $$
    formatted = formatted.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => {
      return `<div class="lumotutor-math-block">${eq.trim()}</div>`;
    });

    // Inline Math $ ... $
    formatted = formatted.replace(/\$([^\$\n]+?)\$/g, (_, eq) => {
      return `<span class="lumotutor-math-inline">${eq.trim()}</span>`;
    });

    // Headers
    formatted = formatted.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    formatted = formatted.replace(/^# (.*$)/gim, '<h3>$1</h3>');

    // Bold & Italics
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code Blocks
    formatted = formatted.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bullet points
    formatted = formatted.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

    // Line breaks
    formatted = formatted.replace(/\n\n+/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br/>');

    return `<p>${formatted}</p>`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 9. YouTube Navigation Lifecycle
  function checkAndInit() {
    if (window.location.pathname === '/watch' || window.location.pathname.startsWith('/live')) {
      createUI();
    }
  }

  checkAndInit();

  // YouTube is an SPA; listen to internal navigation events
  window.addEventListener('yt-navigate-finish', checkAndInit);
  window.addEventListener('spfdone', checkAndInit);
  window.addEventListener('popstate', checkAndInit);

  // Watch for DOM alterations if video element mounts late
  const observer = new MutationObserver(() => {
    if ((window.location.pathname === '/watch' || window.location.pathname.startsWith('/live')) &&
        !document.getElementById('lumotutor-root')) {
      createUI();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

})();

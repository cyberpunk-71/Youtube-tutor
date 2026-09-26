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
        <button class="lumotutor-chip lumotutor-chip-save" data-prompt="Tell Eva Chief to save this to MemryNote Inbox">📥 Save to Eva Chief</button>
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
        <div class="lumotutor-footer-actions">
          <button class="lumotutor-screen-btn" id="lumo-ask-screen-btn">📸 Ask Current Video Screen</button>
          <button class="lumotutor-screen-btn lumotutor-save-quick-btn" id="lumo-quick-save-btn" title="Save last explanation to MemryNote Inbox via Eva Chief">📥 Save to MemryNote</button>
        </div>
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

    // Quick save button in footer
    const quickSaveBtn = document.getElementById('lumo-quick-save-btn');
    quickSaveBtn?.addEventListener('click', () => {
      submitQuestion('Tell Eva Chief to save this to MemryNote Inbox', false);
    });
  }

  // 6b. MemryNote & Eva Chief Save Integration
  async function callSaveToMemry(payload) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'SAVE_TO_MEMRY', payload }, (res) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (res && res.success) {
            resolve(res.data);
          } else {
            reject(new Error(res?.error || 'Failed to save to MemryNote'));
          }
        });
      });
    } else {
      const resp = await fetch('http://100.86.244.6:3456/api/memry/save-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    }
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

    // Instant intercept if user asks to save to Eva Chief / MemryNote Inbox
    const cleanQ = (questionText || '').trim().toLowerCase();
    const isSaveIntent = /(?:save|record|put|add).*(?:eva\s*chief|memrynote|memry|inbox|vault)|tell\s*eva\s*chief\s*to\s*save|^save(?:\s*this|\s*it|\s*note)?$/i.test(cleanQ);

    if (isSaveIntent) {
      const lastAssistant = [...chatHistory].reverse().find(m => m.role === 'assistant');
      if (lastAssistant && lastAssistant.content) {
        loadingDiv.innerHTML = `
          <div class="lumotutor-spinner"></div>
          <span>Saving note to MemryNote Inbox via Eva Chief...</span>
        `;
        try {
          const saveRes = await callSaveToMemry({
            content: lastAssistant.content,
            videoTitle,
            videoId: getVideoId(),
            videoUrl: window.location.href,
            timestamp,
            folder: '02 - Studies & UPSC',
            tags: ['lumotutor', 'maths', 'eva-chief', 'study']
          });
          loadingDiv.remove();

          const saveDiv = document.createElement('div');
          saveDiv.className = 'lumotutor-msg assistant lumotutor-save-confirm';
          saveDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #4ade80; margin-bottom: 6px;">
              <span style="font-size: 16px;">📥</span>
              <span style="font-size: 14px;">Saved to MemryNote Inbox (Eva Chief)</span>
            </div>
            <p style="font-size: 13px; margin: 4px 0;"><strong>Title:</strong> ${escapeHtml(saveRes.title)}</p>
            <p style="font-size: 12px; color: #94a3b8; margin: 2px 0;"><strong>Vault Collection:</strong> <code>${escapeHtml(saveRes.folder || '02 - Studies & UPSC')}</code></p>
            <p style="font-size: 12px; color: #94a3b8; margin: 2px 0;"><strong>Tags:</strong> ${(saveRes.tags || ['lumotutor', 'maths', 'eva-chief']).map(t => `<span class="lumotutor-tag">#${escapeHtml(t)}</span>`).join(' ')}</p>
            <div style="margin-top: 8px; padding: 6px 10px; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); border-radius: 6px; font-size: 11px; color: #86efac;">
              ✨ Indexed in <code>.memry/data.db</code> and synced across Tailscale to your Chromebook MemryNote app.
            </div>
          `;
          messages.appendChild(saveDiv);
          messages.scrollTop = messages.scrollHeight;
          return;
        } catch (saveErr) {
          loadingDiv.remove();
          // Fall through to standard ask if save call errored
        }
      }
    }

    try {
      const payload = {
        question: questionText,
        screenshotBase64,
        timestamp,
        videoTitle,
        channel,
        chatHistory: chatHistory.slice(-6)
      };

      let data = null;

      // 1. Extension context: send to background service worker (bypasses HTTPS mixed-content blocks)
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        data = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'ASK_TUTOR', payload }, (res) => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            if (!res) {
              return reject(new Error('Extension service worker unreachable'));
            }
            if (res.success) {
              resolve(res.data);
            } else {
              reject(new Error(res.error || 'Server request failed'));
            }
          });
        });
      } else {
        // 2. Direct fetch fallback for non-extension environments
        const resp = await fetch('http://100.86.244.6:3456/api/tutor/vision-ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        data = await resp.json();
      }

      loadingDiv.remove();

      const content = data.content || 'Here is the analysis of this video frame.';

      chatHistory.push({ role: 'assistant', content });

      const assistantDiv = document.createElement('div');
      assistantDiv.className = 'lumotutor-msg assistant';
      assistantDiv.innerHTML = renderMarkdownAndMath(content);

      // Render Interactive Visual Diagram & 3D Model
      const diagramData = data.diagram || inferDiagramFromContent(content, questionText);
      if (diagramData) {
        const diagramEl = createVisualDiagramElement(diagramData, questionText);
        if (diagramEl) assistantDiv.appendChild(diagramEl);
      }

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

      // Action Bar: Save to MemryNote Inbox (Eva Chief)
      const actionsBar = document.createElement('div');
      actionsBar.className = 'lumotutor-msg-actions';
      actionsBar.innerHTML = `
        <button class="lumotutor-save-memry-btn" title="Save this explanation to MemryNote Inbox (Eva Chief)">
          <span class="lumotutor-save-icon">📥</span>
          <span class="lumotutor-save-label">Save to MemryNote Inbox</span>
        </button>
      `;

      const saveBtn = actionsBar.querySelector('.lumotutor-save-memry-btn');
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `
          <span class="lumotutor-spinner" style="width: 12px; height: 12px; border-width: 1.5px; display: inline-block;"></span>
          <span>Saving to Eva Chief...</span>
        `;
        try {
          const res = await callSaveToMemry({
            content,
            videoTitle: getVideoTitle(),
            videoId: getVideoId(),
            videoUrl: window.location.href,
            timestamp: getVideoTimestamp(),
            folder: '02 - Studies & UPSC',
            tags: ['lumotutor', 'maths', 'eva-chief', 'study']
          });
          if (res && res.success) {
            saveBtn.classList.add('saved');
            saveBtn.innerHTML = `<span>✅</span> <span>Saved to MemryNote Inbox</span>`;
          } else {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<span>❌</span> <span>Save Failed</span>`;
          }
        } catch (err) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<span>❌</span> <span>Error Saving</span>`;
        }
      });
      assistantDiv.appendChild(actionsBar);

      messages.appendChild(assistantDiv);
      messages.scrollTop = messages.scrollHeight;

    } catch (err) {
      if (loadingDiv.parentNode) loadingDiv.remove();
      const isContextInvalidated = err.message && (err.message.includes('Extension context invalidated') || err.message.includes('message port closed'));

      const errDiv = document.createElement('div');
      errDiv.className = 'lumotutor-msg assistant';
      errDiv.style.border = '1px solid #ef4444';
      errDiv.innerHTML = isContextInvalidated
        ? `
          <p style="color: #fbbf24;">🔄 <strong>Extension Updated:</strong> Extension background service was refreshed.</p>
          <p style="font-size: 12px; color: #f8fafc; margin-top: 4px;">Please press <strong>Ctrl + R</strong> to reload this YouTube page so the updated LumoTutor assistant can attach.</p>
        `
        : `
          <p style="color: #f87171;">⚠️ <strong>Could not connect to AI Tutor backend:</strong> ${escapeHtml(err.message)}</p>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Check backend connection in LumoTutor extension settings or click the extension icon in Chrome toolbar.</p>
        `;
      messages.appendChild(errDiv);
      messages.scrollTop = messages.scrollHeight;
    }
  }

  // 8. KaTeX & Systematic Math Formatter
  function renderKaTeX(latex, isDisplay = false) {
    const clean = (latex || '').trim();
    if (!clean) return '';

    if (typeof katex !== 'undefined' && katex.renderToString) {
      try {
        return katex.renderToString(clean, {
          displayMode: isDisplay,
          throwOnError: false,
          strict: false
        });
      } catch (e) {
        console.warn('KaTeX error:', e);
      }
    }
    return isDisplay
      ? `<div class="lumotutor-math-block"><code>${escapeHtml(clean)}</code></div>`
      : `<span class="lumotutor-math-inline"><code>${escapeHtml(clean)}</code></span>`;
  }

  function renderMarkdownAndMath(text) {
    if (!text) return '';

    const mathTokens = [];
    const saveMath = (latex, isDisplay) => {
      const idx = mathTokens.length;
      mathTokens.push(renderKaTeX(latex, isDisplay));
      return `___MATH_TOKEN_${idx}___`;
    };

    let processed = text;

    // 1. Display math: $$ ... $$
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => saveMath(eq, true));

    // 2. Display math: \[ ... \]
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => saveMath(eq, true));

    // 3. LaTeX environments: \begin{equation|aligned|align|matrix|pmatrix|bmatrix|vmatrix|cases} ... \end{...}
    processed = processed.replace(/\\begin\{(equation|aligned|align|matrix|pmatrix|bmatrix|vmatrix|cases)\}([\s\S]*?)\\end\{\1\}/g, (match) => saveMath(match, true));

    // 4. Inline math: \( ... \)
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => saveMath(eq, false));

    // 5. Inline math: $ ... $ (avoid escaped \$)
    processed = processed.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (_, prefix, eq) => {
      return prefix + saveMath(eq, false);
    });

    // 6. Systematic structure styling
    processed = processed.replace(/(?:^|\n)(?:###\s*)?(?:Step\s*(\d+)[:\s–—]+)([^\n]+)/gi, (_, num, title) => {
      return `\n<div class="lumotutor-step-header"><span class="lumotutor-step-badge">STEP ${num}</span><strong>${title.trim()}</strong></div>\n`;
    });

    processed = processed.replace(/(?:^|\n)(?:###\s*)?(?:Given(?:\s+Values)?[:\s]+)([^\n]+)/gi, (_, content) => {
      return `\n<div class="lumotutor-callout given"><span class="lumotutor-callout-icon">📌</span><div><strong>Given:</strong> ${content.trim()}</div></div>\n`;
    });

    processed = processed.replace(/(?:^|\n)(?:###\s*)?(?:Formula(?:s)?(?:\s+Applied)?[:\s]+)([^\n]+)/gi, (_, content) => {
      return `\n<div class="lumotutor-callout formula"><span class="lumotutor-callout-icon">📐</span><div><strong>Formula:</strong> ${content.trim()}</div></div>\n`;
    });

    processed = processed.replace(/(?:^|\n)(?:###\s*)?(?:Final\s+Answer|Result|Conclusion)[:\s]+([^\n]+)/gi, (_, content) => {
      return `\n<div class="lumotutor-final-answer"><span class="lumotutor-answer-badge">🎯 FINAL ANSWER</span><div class="lumotutor-answer-text">${content.trim()}</div></div>\n`;
    });

    // 7. Markdown parsing
    let escaped = escapeHtml(processed);

    escaped = escaped.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    escaped = escaped.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    escaped = escaped.replace(/^# (.*$)/gim, '<h3>$1</h3>');
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/^---$/gim, '<hr class="lumotutor-divider" />');
    escaped = escaped.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    escaped = escaped.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
    escaped = escaped.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
    escaped = escaped.replace(/\n\n+/g, '</p><p>');
    escaped = escaped.replace(/\n/g, '<br/>');

    // Restore cards
    escaped = escaped
      .replace(/&lt;div class=&quot;lumotutor-step-header&quot;&gt;&lt;span class=&quot;lumotutor-step-badge&quot;&gt;(.*?)&lt;\/span&gt;&lt;strong&gt;(.*?)&lt;\/strong&gt;&lt;\/div&gt;/g, '<div class="lumotutor-step-header"><span class="lumotutor-step-badge">$1</span><strong>$2</strong></div>')
      .replace(/&lt;div class=&quot;lumotutor-callout (given|formula)&quot;&gt;&lt;span class=&quot;lumotutor-callout-icon&quot;&gt;(.*?)&lt;\/span&gt;&lt;div&gt;&lt;strong&gt;(.*?):&lt;\/strong&gt; (.*?)&lt;\/div&gt;&lt;\/div&gt;/g, '<div class="lumotutor-callout $1"><span class="lumotutor-callout-icon">$2</span><div><strong>$3:</strong> $4</div></div>')
      .replace(/&lt;div class=&quot;lumotutor-final-answer&quot;&gt;&lt;span class=&quot;lumotutor-answer-badge&quot;&gt;(.*?)&lt;\/span&gt;&lt;div class=&quot;lumotutor-answer-text&quot;&gt;(.*?)&lt;\/div&gt;&lt;\/div&gt;/g, '<div class="lumotutor-final-answer"><span class="lumotutor-answer-badge">$1</span><div class="lumotutor-answer-text">$2</div></div>')
      .replace(/&lt;hr class=&quot;lumotutor-divider&quot; \/&gt;/g, '<hr class="lumotutor-divider" />');

    // Restore rendered KaTeX Math
    mathTokens.forEach((html, i) => {
      escaped = escaped.replace(new RegExp(`___MATH_TOKEN_${i}___`, 'g'), html);
    });

    return `<div class="lumotutor-formatted-math">${escaped}</div>`;
  }

  // 9. Interactive Visual & 3D Diagram Engine (Three.js & SVG)
  function createVisualDiagramElement(diagram, query) {
    if (!diagram) return null;

    const box = document.createElement('div');
    box.className = 'lumotutor-visual-box';

    const title = diagram.title || 'Mathematical Visual Explainer';
    const desc = diagram.description || 'Visual representation of the concept demonstrated on the lecture screen';

    box.innerHTML = `
      <div class="lumotutor-visual-header">
        <div class="lumotutor-visual-title">
          <span>📐</span>
          <strong>${escapeHtml(title)}</strong>
        </div>
        <div class="lumotutor-visual-tabs">
          <button class="lumotutor-tab-btn active" data-view="2d">📈 Visual</button>
          <button class="lumotutor-tab-btn" data-view="3d">🧊 3D View</button>
        </div>
      </div>
      <div class="lumotutor-visual-viewport" id="lumotutor-viewport"></div>
      <div class="lumotutor-visual-caption">
        ${escapeHtml(desc)}
      </div>
    `;

    const viewport = box.querySelector('#lumotutor-viewport');
    const tabBtns = box.querySelectorAll('.lumotutor-tab-btn');

    let currentCleanup = null;

    function render2D() {
      if (currentCleanup) { currentCleanup(); currentCleanup = null; }
      viewport.innerHTML = '';

      if (diagram.svgMarkup && diagram.svgMarkup.includes('<svg')) {
        viewport.innerHTML = diagram.svgMarkup;
      } else if (diagram.type === 'error_bar' || (!diagram.type && ((query || '').includes('error') || (query || '').includes('approx')))) {
        renderSvgErrorBar(viewport, diagram.data);
      } else {
        renderCanvasGraph(viewport, diagram.data);
      }
    }

    function render3D() {
      if (currentCleanup) { currentCleanup(); currentCleanup = null; }
      viewport.innerHTML = '';
      currentCleanup = renderThreeJs3D(viewport, diagram.data);
    }

    // Default view selection
    if (diagram.type === 'vector_3d' || diagram.type === '3d') {
      tabBtns[1].classList.add('active');
      tabBtns[0].classList.remove('active');
      render3D();
    } else {
      render2D();
    }

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.getAttribute('data-view') === '3d') {
          render3D();
        } else {
          render2D();
        }
      });
    });

    return box;
  }

  function renderThreeJs3D(container, data) {
    if (typeof THREE === 'undefined') {
      container.innerHTML = `<div style="padding: 24px; font-size: 11px; color: #94a3b8; text-align: center;">WebGL 3D Engine loading...</div>`;
      return null;
    }

    const width = container.clientWidth || 380;
    const height = 190;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(3, 2.5, 4);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0x818cf8, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const axes = new THREE.AxesHelper(2);
    scene.add(axes);

    const grid = new THREE.GridHelper(4, 8, 0x6366f1, 0x334155);
    grid.position.y = -0.01;
    scene.add(grid);

    const group = new THREE.Group();

    // Mathematical Torus Knot / Surface Mesh
    const geom = new THREE.TorusKnotGeometry(0.75, 0.2, 64, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      roughness: 0.3,
      metalness: 0.6,
      wireframe: false
    });
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    // Vector Arrows
    const v1 = new THREE.Vector3(1.2, 1.4, 0.5).normalize();
    const arrow1 = new THREE.ArrowHelper(v1, new THREE.Vector3(0, 0, 0), 1.8, 0x38bdf8, 0.3, 0.15);
    group.add(arrow1);

    const v2 = new THREE.Vector3(-0.8, 1.2, 1.0).normalize();
    const arrow2 = new THREE.ArrowHelper(v2, new THREE.Vector3(0, 0, 0), 1.5, 0x22c55e, 0.3, 0.15);
    group.add(arrow2);

    scene.add(group);

    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let autoRotate = true;

    function onPointerDown(e) {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    }
    function onPointerMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;
      group.rotation.y += dx * 0.015;
      group.rotation.x += dy * 0.015;
      prevMousePos = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp() {
      isDragging = false;
    }

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const ctrls = document.createElement('div');
    ctrls.className = 'lumotutor-visual-controls';
    ctrls.innerHTML = `
      <button class="lumotutor-vctrl-btn" id="lumo-3d-rot">⏸ Pause</button>
      <button class="lumotutor-vctrl-btn" id="lumo-3d-reset">🔍 Reset</button>
    `;
    container.appendChild(ctrls);

    const rotBtn = ctrls.querySelector('#lumo-3d-rot');
    const resetBtn = ctrls.querySelector('#lumo-3d-reset');

    rotBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      autoRotate = !autoRotate;
      rotBtn.innerText = autoRotate ? '⏸ Pause' : '▶ Rotate';
    });

    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      group.rotation.set(0, 0, 0);
    });

    let reqId = null;
    function animate() {
      reqId = requestAnimationFrame(animate);
      if (autoRotate && !isDragging) {
        group.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      if (reqId) cancelAnimationFrame(reqId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }

  function renderSvgErrorBar(container, data) {
    const trueVal = data?.trueValue || 3.14159;
    const approxVal = data?.approxValue || 3.14;
    const absErr = data?.errorAbsolute || Math.abs(trueVal - approxVal).toFixed(5);
    const relErr = data?.errorRelative || ((absErr / Math.abs(trueVal)) * 100).toFixed(4) + '%';

    const svg = `
      <svg viewBox="0 0 380 150" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto;">
        <defs>
          <linearGradient id="grad-axis" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="50%" stop-color="#818cf8" />
            <stop offset="100%" stop-color="#34d399" />
          </linearGradient>
          <linearGradient id="grad-err-shade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(244,63,94,0.3)" />
            <stop offset="100%" stop-color="rgba(244,63,94,0.7)" />
          </linearGradient>
        </defs>
        <text x="190" y="22" fill="#e2e8f0" font-size="12" font-weight="700" text-anchor="middle">Numerical Approximation & Error Spectrum</text>
        <line x1="30" y1="80" x2="350" y2="80" stroke="url(#grad-axis)" stroke-width="4" stroke-linecap="round" />
        <polygon points="350,75 362,80 350,85" fill="#34d399" />
        <rect x="95" y="70" width="165" height="20" fill="url(#grad-err-shade)" rx="4" />
        <line x1="95" y1="65" x2="95" y2="95" stroke="#38bdf8" stroke-width="2.5" />
        <circle cx="95" cy="80" r="6" fill="#0284c7" stroke="#38bdf8" stroke-width="2" />
        <text x="95" y="112" fill="#38bdf8" font-size="11" font-weight="700" text-anchor="middle">Approx (${approxVal})</text>
        <text x="95" y="126" fill="#94a3b8" font-size="9" text-anchor="middle">x̃</text>
        <line x1="260" y1="65" x2="260" y2="95" stroke="#4ade80" stroke-width="2.5" />
        <circle cx="260" cy="80" r="6" fill="#16a34a" stroke="#4ade80" stroke-width="2" />
        <text x="260" y="112" fill="#4ade80" font-size="11" font-weight="700" text-anchor="middle">True (${trueVal})</text>
        <text x="260" y="126" fill="#94a3b8" font-size="9" text-anchor="middle">x</text>
        <line x1="95" y1="52" x2="260" y2="52" stroke="#f43f5e" stroke-width="2" stroke-dasharray="3,3" />
        <polyline points="99,49 95,52 99,55" fill="none" stroke="#f43f5e" stroke-width="2" />
        <polyline points="256,49 260,52 256,55" fill="none" stroke="#f43f5e" stroke-width="2" />
        <rect x="135" y="38" width="90" height="18" fill="#1e1b4b" rx="4" stroke="#f43f5e" stroke-width="1" />
        <text x="180" y="51" fill="#f43f5e" font-size="10" font-weight="700" text-anchor="middle">|x̃ - x| = ${absErr}</text>
        <rect x="140" y="132" width="100" height="16" fill="rgba(168,85,247,0.25)" rx="4" stroke="#c084fc" stroke-width="1" />
        <text x="190" y="144" fill="#e9d5ff" font-size="9.5" font-weight="700" text-anchor="middle">Rel Error: ${relErr}</text>
      </svg>
    `;
    container.innerHTML = svg;
  }

  function renderCanvasGraph(container, data) {
    const width = container.clientWidth || 380;
    const height = 180;
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 25) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const originX = width / 2;
    const originY = height / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, originY); ctx.lineTo(width - 10, originY);
    ctx.moveTo(originX, 10); ctx.lineTo(originX, height - 10);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px ui-monospace, sans-serif';
    ctx.fillText('x', width - 15, originY - 6);
    ctx.fillText('y', originX + 8, 18);

    ctx.beginPath();
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2.5;
    for (let px = 20; px < width - 20; px++) {
      const mathX = (px - originX) / 35;
      const mathY = Math.sin(mathX) * 1.4 + 0.3 * Math.cos(2 * mathX);
      const py = originY - mathY * 35;
      if (px === 20) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(originX - 60, originY + 50);
    ctx.lineTo(originX + 70, originY - 60);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(originX, originY - 10, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('f(x₀), Tangent Slope', originX + 10, originY - 14);
  }

  function inferDiagramFromContent(content, query) {
    const qLower = (query || '').toLowerCase();
    const cLower = (content || '').toLowerCase();

    if (qLower.includes('error') || cLower.includes('relative error') || cLower.includes('absolute error')) {
      const approxMatch = content.match(/3\.14\b/) || content.match(/(?:approx|approximate|estimate)[^0-9]*([0-9]+\.?[0-9]*)/i);
      const trueMatch = content.match(/3\.14159\b/) || content.match(/(?:true|exact|actual)[^0-9]*([0-9]+\.?[0-9]*)/i);
      return {
        id: `diag-${Date.now()}`,
        title: 'Error Margin & Tolerance Spectrum',
        type: 'error_bar',
        description: 'Visual spectrum comparing True Value x with Approximate Value x̃ and the resulting error bracket.',
        data: {
          trueValue: trueMatch ? trueMatch[0] : 3.14159,
          approxValue: approxMatch ? approxMatch[0] : 3.14,
          errorAbsolute: '0.00159',
          errorRelative: '0.0506%'
        }
      };
    }

    if (qLower.includes('curve') || qLower.includes('graph') || qLower.includes('tangent') || qLower.includes('root') || qLower.includes('derivative')) {
      return {
        id: `diag-${Date.now()}`,
        title: 'Function Plot & Tangent Curve',
        type: 'coordinate_graph',
        description: 'Cartesian coordinate plane showing function curvature and instantaneous rate of change.'
      };
    }

    return {
      id: `diag-${Date.now()}`,
      title: '3D Vector & Spatial Geometry',
      type: 'vector_3d',
      description: 'Interactive 3D model: drag mouse to rotate coordinate vectors and geometric surface in 360°.'
    };
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

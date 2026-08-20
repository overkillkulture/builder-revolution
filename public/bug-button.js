/**
 * SMART BUG REPORTER — CR Universal Bug Button
 * ═══════════════════════════════════════════
 * Floating 🐛 button with AI-powered suggestions, screenshot capture, file attachments
 *
 * Features:
 * - Category-based bug reporting (8 categories)
 * - AI suggestions while typing (powered by Claude)
 * - Screenshot capture (html2canvas)
 * - File/screenshot attachment (Supabase Storage)
 * - Auto-captures device context
 * - Posts to GitHub issues + commander inbox + #bugs chat
 *
 * Usage:
 *   <script src="/components/bug-button.js"></script>
 *
 * Built: 2026-06-08 · C2 Architect · Smart Bug Reporter v1.0
 */

(function() {
  'use strict';

  if (window.__BUG_BUTTON_LOADED__) return;
  window.__BUG_BUTTON_LOADED__ = true;

  const API_BASE = '/api';
  let currentAttachment = null;
  let suggestionDebounce = null;
  let html2canvasLoaded = false;

  // ─────────────────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────────────────
  const css = `
    .bug-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
      border: 2px solid rgba(255,255,255,0.15);
      color: #fff;
      font-size: 26px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(46,204,113,0.35);
      transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    }
    .bug-btn:hover {
      transform: scale(1.1) rotate(5deg);
      box-shadow: 0 6px 28px rgba(46,204,113,0.55);
    }
    .bug-btn:active {
      transform: scale(0.95);
    }

    .bug-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(5,3,10,0.92);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: bugFadeIn 0.2s ease;
    }
    .bug-modal-overlay.active {
      display: flex;
    }
    @keyframes bugFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .bug-modal {
      background: #12121a;
      border: 1px solid rgba(46,204,113,0.3);
      border-radius: 12px;
      padding: 1.5rem;
      max-width: 540px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      color: #e8e8f0;
      box-shadow: 0 0 40px rgba(46,204,113,0.2);
      animation: bugSlideUp 0.3s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes bugSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .bug-modal h2 {
      margin: 0 0 0.5rem;
      color: #2ecc71;
      font-size: 1.2rem;
      letter-spacing: 0.08em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .bug-modal p {
      margin: 0 0 1.2rem;
      color: #888;
      font-size: 0.8rem;
      line-height: 1.5;
    }

    .bug-form-group {
      margin-bottom: 1rem;
    }
    .bug-form-group label {
      display: block;
      margin-bottom: 0.4rem;
      color: #aaa;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .bug-form-group select,
    .bug-form-group textarea,
    .bug-form-group input[type="email"] {
      width: 100%;
      background: #0a0a0f;
      border: 1px solid rgba(46,204,113,0.2);
      border-radius: 6px;
      color: #e8e8f0;
      padding: 0.7rem;
      font-family: inherit;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .bug-form-group select:focus,
    .bug-form-group textarea:focus,
    .bug-form-group input:focus {
      outline: none;
      border-color: #2ecc71;
      box-shadow: 0 0 0 2px rgba(46,204,113,0.1);
    }
    .bug-form-group textarea {
      min-height: 100px;
      resize: vertical;
    }

    .bug-attachment-zone {
      border: 2px dashed rgba(46,204,113,0.2);
      border-radius: 6px;
      padding: 1rem;
      margin-top: 0.5rem;
      text-align: center;
      transition: all 0.2s;
    }
    .bug-attachment-zone:hover {
      border-color: rgba(46,204,113,0.4);
      background: rgba(46,204,113,0.02);
    }
    .bug-attachment-zone.has-file {
      background: rgba(46,204,113,0.05);
      border-color: #2ecc71;
    }

    .bug-attach-btns {
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .bug-attach-btn {
      background: rgba(46,204,113,0.1);
      border: 1px solid rgba(46,204,113,0.3);
      color: #2ecc71;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.72rem;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .bug-attach-btn:hover {
      background: rgba(46,204,113,0.2);
      transform: scale(1.02);
    }
    .bug-attach-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .bug-file-preview {
      margin-top: 0.6rem;
      padding: 0.6rem;
      background: #0a0a0f;
      border-radius: 4px;
      font-size: 0.7rem;
      color: #aaa;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: space-between;
    }
    .bug-file-preview button {
      background: transparent;
      border: none;
      color: #2ecc71;
      cursor: pointer;
      font-size: 1rem;
      padding: 0;
      line-height: 1;
    }

    .bug-ai-suggestions {
      margin-top: 0.8rem;
      padding: 0.8rem;
      background: rgba(15,245,224,0.03);
      border: 1px solid rgba(15,245,224,0.1);
      border-radius: 6px;
      display: none;
    }
    .bug-ai-suggestions.active {
      display: block;
      animation: bugFadeIn 0.3s ease;
    }
    .bug-ai-suggestions-title {
      font-size: 0.7rem;
      color: #0ff5e0;
      margin-bottom: 0.5rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .bug-ai-chip {
      display: inline-block;
      background: rgba(15,245,224,0.1);
      border: 1px solid rgba(15,245,224,0.2);
      color: #0ff5e0;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.7rem;
      margin: 3px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .bug-ai-chip:hover {
      background: rgba(15,245,224,0.2);
      transform: translateY(-1px);
    }
    .bug-ai-loading {
      font-size: 0.7rem;
      color: #666;
      font-style: italic;
    }

    .bug-actions {
      display: flex;
      gap: 10px;
      margin-top: 1.5rem;
    }
    .bug-btn-submit {
      flex: 1;
      background: #2ecc71;
      color: #0a0a0f;
      border: none;
      padding: 0.8rem 1.2rem;
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
    }
    .bug-btn-submit:hover {
      background: #27ae60;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(46,204,113,0.3);
    }
    .bug-btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .bug-btn-cancel {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.15);
      color: #888;
      padding: 0.8rem 1.2rem;
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .bug-btn-cancel:hover {
      border-color: #2ecc71;
      color: #2ecc71;
    }

    @media (max-width: 600px) {
      .bug-modal {
        padding: 1rem;
        max-height: 95vh;
      }
      .bug-btn {
        bottom: 88px;
        right: 16px;
        left: auto;
        width: 48px;
        height: 48px;
        font-size: 22px;
      }
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ─────────────────────────────────────────────────────
  // DEVICE INFO CAPTURE
  // ─────────────────────────────────────────────────────
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Desktop';
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) device = 'Mobile';
    if (/Tablet|iPad/i.test(ua)) device = 'Tablet';

    let browser = 'Unknown';
    if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/Chrome/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua)) browser = 'Safari';

    return {
      device,
      browser,
      userAgent: ua,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      page: location.href,
      pathname: location.pathname,
      timestamp: new Date().toISOString()
    };
  }

  // ─────────────────────────────────────────────────────
  // AI SUGGESTIONS
  // ─────────────────────────────────────────────────────
  async function fetchAISuggestions(description, category, page) {
    if (description.trim().length < 20) return [];

    try {
      const res = await fetch(`${API_BASE}/bug-ai-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, category, page })
      });

      if (!res.ok) return [];
      const data = await res.json();
      return data.suggestions || [];
    } catch (e) {
      console.warn('AI suggestions unavailable:', e);
      return [];
    }
  }

  function setupAISuggestions(textarea, categorySelect, suggestionsEl) {
    textarea.addEventListener('input', () => {
      clearTimeout(suggestionDebounce);
      suggestionDebounce = setTimeout(async () => {
        const description = textarea.value;
        const category = categorySelect.value;
        const page = location.pathname;

        if (description.trim().length < 20) {
          suggestionsEl.classList.remove('active');
          return;
        }

        suggestionsEl.innerHTML = '<div class="bug-ai-loading">AI thinking...</div>';
        suggestionsEl.classList.add('active');

        const suggestions = await fetchAISuggestions(description, category, page);

        if (!suggestions.length) {
          suggestionsEl.classList.remove('active');
          return;
        }

        suggestionsEl.innerHTML = `
          <div class="bug-ai-suggestions-title">💡 AI Suggestions</div>
          ${suggestions.map(s => `
            <span class="bug-ai-chip" data-suggestion="${escapeHtml(s)}">${escapeHtml(s)}</span>
          `).join('')}
        `;

        // Click to append suggestion
        suggestionsEl.querySelectorAll('.bug-ai-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            const current = textarea.value;
            const suggestion = chip.dataset.suggestion;
            textarea.value = current + (current.endsWith('.') ? ' ' : '. ') + suggestion;
            textarea.focus();
            suggestionsEl.classList.remove('active');
          });
        });
      }, 2000);
    });
  }

  // ─────────────────────────────────────────────────────
  // SCREENSHOT CAPTURE
  // ─────────────────────────────────────────────────────
  function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (html2canvasLoaded || window.html2canvas) {
        resolve(window.html2canvas);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.onload = () => {
        html2canvasLoaded = true;
        resolve(window.html2canvas);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function captureScreenshot() {
    try {
      const html2canvas = await loadHtml2Canvas();
      const modal = document.querySelector('.bug-modal-overlay');
      if (modal) modal.style.display = 'none';

      const canvas = await html2canvas(document.body, {
        backgroundColor: '#0a0a0f',
        logging: false,
        width: window.innerWidth,
        height: window.innerHeight
      });

      if (modal) modal.style.display = 'flex';

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      });
    } catch (e) {
      console.error('Screenshot capture failed:', e);
      alert('Could not capture screenshot. Try attaching a file manually.');
      return null;
    }
  }

  // ─────────────────────────────────────────────────────
  // FILE UPLOAD
  // ─────────────────────────────────────────────────────
  async function uploadAttachment(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/upload-bug-attachment`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return data.url;
    } catch (e) {
      console.error('Upload failed:', e);
      alert('Could not upload attachment. Bug will be submitted without it.');
      return null;
    }
  }

  // ─────────────────────────────────────────────────────
  // SUBMIT BUG
  // ─────────────────────────────────────────────────────
  async function submitBugReport(formData) {
    try {
      const res = await fetch(`${API_BASE}/bugs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.category || 'Bug Report',
          description: [formData.description, formData.steps ? `Steps: ${formData.steps}` : ''].filter(Boolean).join('\n\n'),
          page: formData.page || window.location.pathname,
          priority: 'MEDIUM',
          attachmentUrl: formData.attachmentUrl || null,
        })
      });

      if (!res.ok) throw new Error('Submit failed');
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('Submit failed:', e);
      throw e;
    }
  }

  // ─────────────────────────────────────────────────────
  // BUILD MODAL
  // ─────────────────────────────────────────────────────
  function buildModal() {
    const overlay = document.createElement('div');
    overlay.className = 'bug-modal-overlay';
    overlay.innerHTML = `
      <div class="bug-modal">
        <h2>🐛 Report a Bug</h2>
        <p>Help us fix it — describe what went wrong and we'll investigate.</p>

        <form id="bug-form">
          <div class="bug-form-group">
            <label for="bug-category">What's broken?</label>
            <select id="bug-category" required>
              <option value="cant-load">Page Won't Load</option>
              <option value="cant-sign-in">Can't Sign In</option>
              <option value="button-broken">Button/Link Broken</option>
              <option value="looks-wrong">Layout/Display Issue</option>
              <option value="mobile-issue">Mobile Issue</option>
              <option value="error-message">Error Message</option>
              <option value="feature-request">Feature Request</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="bug-form-group">
            <label for="bug-description">Description</label>
            <textarea id="bug-description" required placeholder="What happened? Be specific..."></textarea>
            <div id="bug-ai-suggestions" class="bug-ai-suggestions"></div>
          </div>

          <div class="bug-form-group">
            <label for="bug-steps">Steps to reproduce (optional)</label>
            <textarea id="bug-steps" placeholder="1. Go to...&#10;2. Click...&#10;3. See error..."></textarea>
          </div>

          <div class="bug-form-group">
            <label>Attachment (optional)</label>
            <div class="bug-attachment-zone" id="bug-attachment-zone">
              <div class="bug-attach-btns">
                <button type="button" class="bug-attach-btn" id="bug-capture-btn">
                  📸 Capture Screen
                </button>
                <button type="button" class="bug-attach-btn" id="bug-upload-btn">
                  📎 Attach File
                </button>
              </div>
              <input type="file" id="bug-file-input" accept="image/*,.txt" style="display:none">
              <div id="bug-file-preview"></div>
            </div>
          </div>

          <div class="bug-form-group">
            <label for="bug-email">Your email (optional, for follow-up)</label>
            <input type="email" id="bug-email" placeholder="you@example.com">
          </div>

          <div class="bug-actions">
            <button type="button" class="bug-btn-cancel">Cancel</button>
            <button type="submit" class="bug-btn-submit">Submit Bug Report</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    // Wire up events
    const form = overlay.querySelector('#bug-form');
    const cancelBtn = overlay.querySelector('.bug-btn-cancel');
    const descriptionTextarea = overlay.querySelector('#bug-description');
    const categorySelect = overlay.querySelector('#bug-category');
    const suggestionsEl = overlay.querySelector('#bug-ai-suggestions');
    const captureBtn = overlay.querySelector('#bug-capture-btn');
    const uploadBtn = overlay.querySelector('#bug-upload-btn');
    const fileInput = overlay.querySelector('#bug-file-input');
    const filePreview = overlay.querySelector('#bug-file-preview');
    const attachmentZone = overlay.querySelector('#bug-attachment-zone');

    // AI suggestions
    setupAISuggestions(descriptionTextarea, categorySelect, suggestionsEl);

    // File upload
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Max 5MB.');
        fileInput.value = '';
        return;
      }

      currentAttachment = file;
      attachmentZone.classList.add('has-file');
      filePreview.innerHTML = `
        <span>${escapeHtml(file.name)} (${(file.size / 1024).toFixed(1)}KB)</span>
        <button type="button" id="bug-remove-file">✕</button>
      `;

      filePreview.querySelector('#bug-remove-file').addEventListener('click', () => {
        currentAttachment = null;
        fileInput.value = '';
        filePreview.innerHTML = '';
        attachmentZone.classList.remove('has-file');
      });
    });

    // Screenshot capture
    captureBtn.addEventListener('click', async () => {
      captureBtn.disabled = true;
      captureBtn.textContent = '📸 Capturing...';

      const blob = await captureScreenshot();

      if (blob) {
        const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
        currentAttachment = file;
        attachmentZone.classList.add('has-file');
        filePreview.innerHTML = `
          <span>screenshot-${Date.now()}.png (${(blob.size / 1024).toFixed(1)}KB)</span>
          <button type="button" id="bug-remove-file">✕</button>
        `;

        filePreview.querySelector('#bug-remove-file').addEventListener('click', () => {
          currentAttachment = null;
          filePreview.innerHTML = '';
          attachmentZone.classList.remove('has-file');
        });
      }

      captureBtn.disabled = false;
      captureBtn.textContent = '📸 Capture Screen';
    });

    // Cancel
    cancelBtn.addEventListener('click', () => {
      overlay.classList.remove('active');
      currentAttachment = null;
      form.reset();
      filePreview.innerHTML = '';
      attachmentZone.classList.remove('has-file');
      suggestionsEl.classList.remove('active');
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cancelBtn.click();
      }
    });

    // Submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('.bug-btn-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        // Upload attachment first if present
        let attachmentUrl = null;
        if (currentAttachment) {
          submitBtn.textContent = 'Uploading file...';
          attachmentUrl = await uploadAttachment(currentAttachment);
        }

        // Gather form data
        const deviceInfo = getDeviceInfo();
        const bugData = {
          category: categorySelect.value,
          description: descriptionTextarea.value,
          steps: form.querySelector('#bug-steps').value,
          email: form.querySelector('#bug-email').value,
          attachmentUrl,
          ...deviceInfo
        };

        submitBtn.textContent = 'Sending to team...';
        await submitBugReport(bugData);

        alert('Bug report submitted! Thank you for helping us improve.');
        overlay.classList.remove('active');
        currentAttachment = null;
        form.reset();
        filePreview.innerHTML = '';
        attachmentZone.classList.remove('has-file');
        suggestionsEl.classList.remove('active');
      } catch (e) {
        alert('Could not submit bug report. Please try again or contact support.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Bug Report';
      }
    });

    return overlay;
  }

  // ─────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ─────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────
  function init() {
    // Create floating button
    const btn = document.createElement('button');
    btn.className = 'bug-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Report a bug');
    btn.title = 'Report a bug';
    btn.textContent = '🐛';

    // Create modal
    const modal = buildModal();

    // Show modal on click
    btn.addEventListener('click', () => {
      modal.classList.add('active');
      setTimeout(() => {
        modal.querySelector('#bug-description').focus();
      }, 100);
    });

    document.body.appendChild(btn);

    console.log('[BUG-BUTTON] Smart bug reporter loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

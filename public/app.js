const $ = (sel) => document.querySelector(sel);

const chatEl = $('#chat');
const form = $('#composer');
const input = $('#input');
const sendBtn = $('#sendBtn');
const statusEl = $('#status');
const settingsModal = $('#settingsModal');

const WELCOME_HTML = `
  <div class="msg bot">
    <div class="bubble welcome">
      <strong>স্বাগতম! 👋</strong><br>
      এটি আপনার AI চ্যাট অ্যাসিস্ট্যান্ট। নিচে মেসেজ লিখে Enter চাপুন।<br>
      <span class="dim">প্রথমবার ব্যবহার করলে ⚙️ সেটিংসে গিয়ে Gemini API Key দিন।</span>
    </div>
  </div>`;

const SETTINGS_KEY = 'aiChatServer.settings';

/* ---------- সেটিংস ---------- */
function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function openSettings() {
  const s = loadSettings();
  $('#apiKey').value = s.apiKey || '';
  $('#systemPrompt').value = s.systemPrompt || '';
  $('#knowledge').value = s.knowledge || '';
  settingsModal.classList.remove('hidden');
  $('#apiKey').focus();
}

$('#settingsBtn').addEventListener('click', openSettings);
$('#closeSettings').addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) settingsModal.classList.add('hidden');
});

$('#saveSettings').addEventListener('click', () => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    apiKey: $('#apiKey').value.trim(),
    systemPrompt: $('#systemPrompt').value,
    knowledge: $('#knowledge').value
  }));
  settingsModal.classList.add('hidden');
  addMsg('bot', '✅ সেটিংস সেভ হয়েছে।');
});

/* ---------- মার্কডাউন (সহজ রেন্ডারার) ---------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return html;
}

/* ---------- চ্যাট ---------- */
function addMsg(role, content, isHtml = false) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (isHtml) bubble.innerHTML = content;
  else bubble.textContent = content;
  div.appendChild(bubble);
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return bubble;
}

function setTyping(on) {
  const existing = $('#typing');
  if (on) {
    if (existing) return;
    const div = document.createElement('div');
    div.className = 'msg bot';
    div.id = 'typing';
    div.innerHTML = '<div class="bubble typing"><span></span><span></span><span></span></div>';
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
  } else if (existing) {
    existing.remove();
  }
}

async function send(text) {
  const s = loadSettings();
  addMsg('user', text);
  input.value = '';
  autosize();
  setTyping(true);
  sendBtn.disabled = true;
  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        apiKey: s.apiKey || '',
        context: {
          systemPrompt: s.systemPrompt || '',
          knowledge: s.knowledge || ''
        }
      })
    });
    const data = await res.json().catch(() => ({}));
    setTyping(false);
    if (!res.ok) {
      addMsg('bot error', data.error || 'সার্ভারে সমস্যা হয়েছে।');
      if (res.status === 400) openSettings(); // API Key নেই → সেটিংস খুলে দিন
    } else {
      addMsg('bot', renderMarkdown(data.reply || ''), true);
    }
  } catch (err) {
    setTyping(false);
    addMsg('bot error', 'সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  send(text);
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

function autosize() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 140) + 'px';
}
input.addEventListener('input', autosize);

/* ---------- চ্যাট পরিষ্কার ---------- */
$('#clearBtn').addEventListener('click', () => {
  chatEl.innerHTML = WELCOME_HTML;
  input.focus();
});

/* ---------- সার্ভার স্ট্যাটাস ---------- */
(async () => {
  try {
    const res = await fetch('/');
    statusEl.textContent = res.ok ? '● সার্ভার চলছে' : '● সার্ভারে সমস্যা';
    statusEl.className = 'status ' + (res.ok ? 'ok' : 'bad');
  } catch {
    statusEl.textContent = '● সার্ভার বন্ধ';
    statusEl.className = 'status bad';
  }
})();

input.focus();

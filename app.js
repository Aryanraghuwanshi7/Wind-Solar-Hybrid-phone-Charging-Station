const STORAGE_KEYS = {
  health: 'batterylife_health',
  charges: 'batterylife_charges',
  reminders: 'batterylife_reminders',
  stress: 'batterylife_stress',
};

// --- Data Helpers ---
function getHealth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.health) || '[]');
  } catch {
    return [];
  }
}

function saveHealth(data) {
  localStorage.setItem(STORAGE_KEYS.health, JSON.stringify(data));
}

function getCharges() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.charges) || '[]');
  } catch {
    return [];
  }
}

function saveCharges(data) {
  localStorage.setItem(STORAGE_KEYS.charges, JSON.stringify(data));
}

function getReminders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.reminders) || '[]');
  } catch {
    return [];
  }
}

function saveReminders(data) {
  localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(data));
}

// --- Navigation ---
document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sectionId = link.dataset.section;
    document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
    document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(sectionId).classList.add('active');
  });
});

// --- Live Battery (Battery Status API - works when site is open ON the device) ---
let liveBatteryLevel = null;
let liveBatteryCharging = false;

function updateLiveBatteryUI(level, charging) {
  liveBatteryLevel = level;
  liveBatteryCharging = charging;
  const pct = Math.round(level * 100);
  const pctEl = document.getElementById('live-battery-pct');
  const statusEl = document.getElementById('live-battery-status');
  const displayEl = document.getElementById('live-battery-display');
  const unsupportedEl = document.getElementById('live-battery-unsupported');
  const loadingEl = document.getElementById('live-battery-loading');
  const trackerQuickEl = document.getElementById('tracker-live-battery');
  const trackerPctEl = document.getElementById('tracker-live-pct');
  const trackerStatusEl = document.getElementById('tracker-live-status');

  if (pctEl) pctEl.textContent = pct;
  if (statusEl) statusEl.textContent = charging ? '⚡ Charging' : '🔋 Discharging';
  if (displayEl) displayEl.style.display = 'block';
  if (unsupportedEl) unsupportedEl.style.display = 'none';
  if (loadingEl) loadingEl.style.display = 'none';
  if (trackerQuickEl) {
    trackerQuickEl.style.display = 'block';
    if (trackerPctEl) trackerPctEl.textContent = pct;
    if (trackerStatusEl) trackerStatusEl.textContent = charging ? '(charging)' : '';
  }

  // Update real-time stress warning
  updateStressWarning(pct, charging);
}

function showBatteryUnsupported() {
  document.getElementById('live-battery-display').style.display = 'none';
  document.getElementById('live-battery-unsupported').style.display = 'block';
  document.getElementById('live-battery-loading').style.display = 'none';
}

function logLiveBattery() {
  if (liveBatteryLevel == null) return;
  const pct = Math.round(liveBatteryLevel * 100);
  const health = getHealth();
  health.push({
    id: crypto.randomUUID?.() || Date.now().toString(),
    pct,
    date: new Date().toISOString().slice(0, 10),
  });
  saveHealth(health);
  renderHealthChart();
  renderHealthList();
  updateDashboard();
}

function initLiveBattery() {
  if (!navigator.getBattery) {
    showBatteryUnsupported();
    return;
  }
  navigator.getBattery().then((battery) => {
    liveBatteryLevel = battery.level;
    liveBatteryCharging = battery.charging;
    updateLiveBatteryUI(battery.level, battery.charging);

    battery.addEventListener('levelchange', () => {
      liveBatteryLevel = battery.level;
      updateLiveBatteryUI(battery.level, battery.charging);
    });
    battery.addEventListener('chargingchange', () => {
      liveBatteryCharging = battery.charging;
      updateLiveBatteryUI(battery.level, battery.charging);
    });
  }).catch(() => showBatteryUnsupported());

}


// --- Dashboard ---
function updateDashboard() {
  const health = getHealth();
  const charges = getCharges();
  const reminders = getReminders().filter((r) => !r.done);

  const latestHealth = health.length ? health[health.length - 1] : null;
  document.getElementById('dashboard-health').textContent = latestHealth ? `${latestHealth.pct}%` : '--';
  document.getElementById('dashboard-charges').textContent = charges.length;
  document.getElementById('dashboard-reminders').textContent = reminders.length;

  const remindersList = document.getElementById('dashboard-reminders-list');
  if (reminders.length === 0) {
    remindersList.innerHTML = '<p class="empty">No active reminders. Add some in the Reminders section.</p>';
  } else {
    remindersList.innerHTML = `
      <h4>Upcoming</h4>
      <ul>
        ${reminders
        .slice(0, 5)
        .map(
          (r) =>
            `<li>${r.text} — ${r.time || '—'} (${r.repeat})</li>`
        )
        .join('')}
      </ul>
    `;
  }
}

// --- Battery Health Tracker ---
function renderHealthChart() {
  const health = getHealth().slice(-14);
  const container = document.getElementById('health-chart');
  if (health.length === 0) {
    container.innerHTML = '<p class="empty" style="color: var(--text-muted); font-size: 0.9rem;">Log health data to see the chart.</p>';
    return;
  }
  container.innerHTML = health
    .map(
      (h, i) => `
    <div class="health-bar" style="height: ${Math.max(20, h.pct)}%">
      <div class="health-bar-fill" style="height: 100%"></div>
    </div>
  `
    )
    .join('');
}

function renderHealthList() {
  const health = getHealth().slice().reverse();
  const list = document.getElementById('health-list');
  if (health.length === 0) {
    list.innerHTML = '<li style="color: var(--text-muted);">No health logs yet.</li>';
    return;
  }
  list.innerHTML = health
    .map(
      (h) => `
    <li>
      <span class="health-pct">${h.pct}%</span>
      <span class="health-date">${formatDate(h.date)}</span>
      <button class="btn btn-danger" data-id="${h.id}">Delete</button>
    </li>
  `
    )
    .join('');
  list.querySelectorAll('.btn-danger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const data = getHealth().filter((h) => h.id !== id);
      saveHealth(data);
      renderHealthChart();
      renderHealthList();
      updateDashboard();
    });
  });
}

document.getElementById('log-health').addEventListener('click', () => {
  const pct = parseInt(document.getElementById('health-input').value, 10);
  const dateInput = document.getElementById('health-date').value;
  if (!pct || pct < 1 || pct > 100) {
    alert('Please enter a valid health percentage (1–100).');
    return;
  }
  const date = dateInput || new Date().toISOString().slice(0, 10);
  const health = getHealth();
  health.push({
    id: crypto.randomUUID?.() || Date.now().toString(),
    pct,
    date,
  });
  saveHealth(health);
  document.getElementById('health-input').value = '';
  document.getElementById('health-date').value = '';
  renderHealthChart();
  renderHealthList();
  updateDashboard();
});

// --- Charge History ---
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr, timeStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T' + (timeStr || '12:00:00'));
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderChargeList() {
  const charges = getCharges().slice().reverse();
  const list = document.getElementById('charge-list');
  if (charges.length === 0) {
    list.innerHTML = '<li style="color: var(--text-muted);">No charges logged yet.</li>';
    return;
  }
  list.innerHTML = charges
    .map(
      (c) => `
    <li>
      <div>
        <span class="charge-range">${c.start}% → ${c.end}%</span>
        <span class="charge-type-badge">${c.type}</span>
      </div>
      <span class="charge-meta">${c.duration} min · ${formatDate(c.date)}</span>
      <button class="btn btn-danger" data-id="${c.id}">Delete</button>
    </li>
  `
    )
    .join('');
  list.querySelectorAll('.btn-danger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const data = getCharges().filter((c) => c.id !== id);
      saveCharges(data);
      renderChargeList();
      updateDashboard();
    });
  });
}

document.getElementById('log-charge').addEventListener('click', () => {
  const start = parseInt(document.getElementById('charge-start').value, 10);
  const end = parseInt(document.getElementById('charge-end').value, 10);
  const duration = parseInt(document.getElementById('charge-duration').value, 10);
  const type = document.getElementById('charge-type').value;
  if (isNaN(start) || isNaN(end) || start < 0 || start > 100 || end < 0 || end > 100 || end <= start) {
    alert('Please enter valid start and end percentages.');
    return;
  }
  if (isNaN(duration) || duration < 1) {
    alert('Please enter a valid duration.');
    return;
  }
  const charges = getCharges();
  charges.push({
    id: crypto.randomUUID?.() || Date.now().toString(),
    start,
    end,
    duration,
    type,
    date: new Date().toISOString().slice(0, 10),
  });
  saveCharges(charges);
  document.getElementById('charge-start').value = '';
  document.getElementById('charge-end').value = '';
  document.getElementById('charge-duration').value = '';
  renderChargeList();
  renderStressIndex();
  renderChargeStressSummary();
  updateDashboard();
});

// --- Reminders ---
const REMINDER_TEXTS = {
  'limit-charge': "Don't charge past 80%",
  'avoid-discharge': 'Avoid deep discharge (below 20%)',
  calibration: 'Monthly calibration (full cycle)',
  unplug: 'Unplug when fully charged',
  'cool-down': 'Let phone cool before charging',
  custom: null,
};

document.getElementById('reminder-type').addEventListener('change', () => {
  const type = document.getElementById('reminder-type').value;
  document.getElementById('custom-reminder-row').style.display = type === 'custom' ? 'block' : 'none';
});

function renderReminderList() {
  const reminders = getReminders();
  const list = document.getElementById('reminder-list');
  if (reminders.length === 0) {
    list.innerHTML = '<li style="color: var(--text-muted);">No reminders yet.</li>';
    return;
  }
  list.innerHTML = reminders
    .map(
      (r) => `
    <li>
      <div class="reminder-info">
        <div>${r.text}</div>
        <div class="reminder-time">${r.time || '—'}</div>
        <div class="reminder-repeat">${r.repeat}</div>
      </div>
      <button class="btn btn-danger" data-id="${r.id}">Delete</button>
    </li>
  `
    )
    .join('');
  list.querySelectorAll('.btn-danger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const data = getReminders().filter((r) => r.id !== id);
      saveReminders(data);
      renderReminderList();
      updateDashboard();
    });
  });
}

document.getElementById('add-reminder').addEventListener('click', () => {
  const type = document.getElementById('reminder-type').value;
  const customText = document.getElementById('custom-reminder').value.trim();
  const time = document.getElementById('reminder-time').value;
  const repeat = document.getElementById('reminder-repeat').value;
  const text = type === 'custom' ? customText : REMINDER_TEXTS[type];
  if (!text) {
    alert('Please enter a reminder.');
    return;
  }
  const reminders = getReminders();
  reminders.push({
    id: crypto.randomUUID?.() || Date.now().toString(),
    text,
    time,
    repeat,
    done: false,
  });
  saveReminders(reminders);
  document.getElementById('custom-reminder').value = '';
  document.getElementById('reminder-time').value = '';
  renderReminderList();
  updateDashboard();
});

// --- Theme Toggle ---
const THEME_KEY = 'batterylife_theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const isLight = saved === 'light' || (!saved && prefersLight);
  document.body.classList.toggle('light', isLight);
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
});

// --- Interactive Tool ---
document.getElementById('calc-life').addEventListener('click', () => {
  const current = parseInt(document.getElementById('calc-current').value, 10);
  const usage = document.getElementById('calc-usage').value;
  if (isNaN(current) || current < 1 || current > 100) {
    document.getElementById('life-result').textContent = 'Enter a valid battery %.';
    document.getElementById('life-result').classList.add('empty');
    return;
  }
  // Hours of use at 100%: light ~10h, medium ~5h, heavy ~2.5h
  const hoursAtFull = { light: 10, medium: 5, heavy: 2.5 };
  const totalHours = (current / 100) * (hoursAtFull[usage] || 5);
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);
  document.getElementById('life-result').textContent = `Approx. ${h}h ${m}m remaining (estimate)`;
  document.getElementById('life-result').classList.remove('empty');
});

document.getElementById('calc-time').addEventListener('click', () => {
  const start = parseInt(document.getElementById('calc-charge-start').value, 10);
  const end = parseInt(document.getElementById('calc-charge-end').value, 10);
  const chargerW = parseInt(document.getElementById('calc-charger').value, 10);
  if (isNaN(start) || isNaN(end) || start >= end || end > 100) {
    document.getElementById('time-result').textContent = 'Enter valid start and target %.';
    document.getElementById('time-result').classList.add('empty');
    return;
  }
  const pctToCharge = end - start;
  // Realistic mins for 0–100%: 5W=180min, 15W=90min, 25W=60min, 45W=45min (accounts for efficiency & curve)
  const minsForFull = { 5: 180, 15: 90, 25: 60, 45: 45 };
  const totalMins = Math.round((pctToCharge / 100) * (minsForFull[chargerW] || 90));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  document.getElementById('time-result').textContent = `~${h > 0 ? h + 'h ' : ''}${m}min to reach ${end}%`;
  document.getElementById('time-result').classList.remove('empty');
});

// --- Remote/Multi-Device Battery (phone ↔ laptop via WebRTC) ---
function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

let remotePeer = null;
let remoteConnections = {}; // Map of conn.peer -> connection object
let remoteBatteryInterval = null;

// Track last battery states for notifications
const lastBatteryStates = {};

// Format bytes
function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Render the grid of connected devices
function renderRemoteDevices() {
  const grid = document.getElementById('remote-devices-grid');
  const container = document.getElementById('remote-display-container');
  const ids = Object.keys(remoteConnections);

  if (ids.length === 0) {
    if (container) container.style.display = 'none';
    return;
  }

  if (container) container.style.display = 'block';
  if (grid) {
    grid.innerHTML = ids.map(id => {
      const conn = remoteConnections[id];
      const stats = conn.latestStats || {};
      const pct = stats.battery != null ? Math.round(stats.battery * 100) : '--';
      const status = stats.charging ? '⚡ Charging' : '🔋 Discharging';

      return `
        <div class="card" style="position: relative; border-left: 4px solid var(--accent);">
          <h4 style="margin-bottom: 0.5rem;">📱 Device (${id.slice(0, 4)})</h4>
          <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.25rem;">${pct}%</div>
          <div style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">${status}</div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem; margin-bottom: 1rem; background: var(--bg-body); padding: 0.5rem; border-radius: var(--radius-sm);">
            <div><strong>Network:</strong> ${stats.network || 'Unknown'}</div>
            <div><strong>RAM:</strong> ${stats.ram ? stats.ram + ' GB' : 'Unknown'}</div>
            <div style="grid-column: span 2;"><strong>Storage Used:</strong> ${stats.storageUsed || '--'} / ${stats.storageTotal || '--'}</div>
          </div>
          
          <button class="btn" onclick="ringPhone('${id}')" style="width: 100%; background: #ff4444; color: white;">🔔 Ring Phone (Alarm)</button>
        </div>
      `;
    }).join('');
  }
}

// Trigger finding alarm on a specific device
window.ringPhone = (id) => {
  if (remoteConnections[id]) {
    remoteConnections[id].send({ type: 'alarm' });
  }
};

// Handle System Notifications
function checkAlerts(id, newPct, charging) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const oldPct = lastBatteryStates[id]?.pct;

  if (oldPct != null) {
    if (newPct >= 80 && oldPct < 80 && charging) {
      new Notification("BatteryLife Alert", { body: `Device ${id.slice(0, 4)} has reached ${newPct}%. You should unplug it!` });
    }
    if (newPct <= 20 && oldPct > 20 && !charging) {
      new Notification("BatteryLife Alert", { body: `Device ${id.slice(0, 4)} is critically low (${newPct}%). Please plug it in!` });
    }
  }

  lastBatteryStates[id] = { pct: newPct, charging };
}

// Add message to Shared Clipboard UI
function appendClipboardMessage(text, isMe) {
  const history = document.getElementById('clipboard-history');
  if (!history) return;
  const empty = history.querySelector('.empty');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.style.marginBottom = '0.5rem';
  div.style.padding = '0.5rem';
  div.style.borderRadius = 'var(--radius-sm)';
  div.style.background = isMe ? 'var(--accent)' : 'var(--bg-elevated)';
  div.style.color = isMe ? '#000' : 'var(--text-main)';
  div.style.marginLeft = isMe ? 'auto' : '0';
  div.style.maxWidth = '80%';
  div.style.wordBreak = 'break-word';
  // Attempt to linkify
  if (text.startsWith('http://') || text.startsWith('https://')) {
    div.innerHTML = `<a href="${text}" target="_blank" style="color: inherit; text-decoration: underline;">${text}</a>`;
  } else {
    div.textContent = text;
  }

  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

// Send Clipboard Msg
document.getElementById('clipboard-send')?.addEventListener('click', () => {
  const input = document.getElementById('clipboard-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  // Send to all connected peers
  Object.values(remoteConnections).forEach(conn => {
    conn.send({ type: 'clipboard', text });
  });

  appendClipboardMessage(text, true);
  input.value = '';
});

// Laptop Side - Start Hosting
document.getElementById('remote-start')?.addEventListener('click', () => {
  if (typeof Peer === 'undefined') {
    document.getElementById('remote-laptop-status').textContent = 'PeerJS failed to load. Check your connection.';
    return;
  }

  // Request notifications
  if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }

  const code = randomCode(6);
  document.getElementById('remote-code').textContent = code;
  document.getElementById('remote-code-area').style.display = 'block';
  document.getElementById('remote-laptop-status').textContent = 'Waiting for devices…';

  if (remotePeer) {
    remotePeer.destroy();
  }
  remoteConnections = {};
  renderRemoteDevices();

  remotePeer = new Peer(code, { debug: 0 });
  remotePeer.on('open', () => {
    document.getElementById('remote-laptop-status').textContent = 'Ready. Enter this code on your device(s).';
  });

  remotePeer.on('connection', (conn) => {
    remoteConnections[conn.peer] = conn;

    conn.on('data', (data) => {
      if (data.type === 'stats') {
        conn.latestStats = data;
        renderRemoteDevices();
        if (data.battery != null) {
          checkAlerts(conn.peer, Math.round(data.battery * 100), data.charging);
        }
      } else if (data.type === 'clipboard') {
        appendClipboardMessage(data.text, false);
      } else if (data.type === 'control') {
        // Handle incoming remote controls
        if (data.action === 'left') {
          window.scrollBy({ left: -300, behavior: 'smooth' });
        } else if (data.action === 'right') {
          window.scrollBy({ left: 300, behavior: 'smooth' });
        } else if (data.action === 'up') {
          window.scrollBy({ top: -300, behavior: 'smooth' });
        } else if (data.action === 'down') {
          window.scrollBy({ top: 300, behavior: 'smooth' });
        }
      } else if (data.type === 'file') {
        // Handle incoming files
        try {
          const blob = new Blob([data.file], { type: data.fileType });
          const url = URL.createObjectURL(blob);
          const linkStr = `<a href="${url}" download="${data.name}" style="color: var(--accent); text-decoration: underline;">📎 Download ${data.name}</a>`;
          appendClipboardMessage(linkStr, false);
        } catch (e) { console.error("File receive error", e); }
      } else if (window._handleAdvancedPayload) {
        // Fallthrough: advanced phone→laptop sensor/voice payloads
        window._handleAdvancedPayload(data);
      }
    });

    conn.on('close', () => {
      delete remoteConnections[conn.peer];
      renderRemoteDevices();

      // Auto-Lock if no devices left
      if (Object.keys(remoteConnections).length === 0) {
        const overlay = document.getElementById('auto-lock-overlay');
        if (overlay) overlay.style.display = 'flex';
      }
    });
  });

  // Handle incoming Camera Stream calls
  remotePeer.on('call', (call) => {
    call.answer(); // Automatically answer
    call.on('stream', (remoteStream) => {
      const container = document.getElementById('remote-camera-container');
      const video = document.getElementById('remote-video');
      if (container && video) {
        container.style.display = 'block';
        video.srcObject = remoteStream;
      }
    });
  });

  remotePeer.on('error', (err) => {
    document.getElementById('remote-laptop-status').textContent = 'Error: ' + (err.message || 'Connection failed. Try again.');
  });
});

// Phone Side - Connect to Laptop
document.getElementById('remote-connect')?.addEventListener('click', () => {
  if (typeof Peer === 'undefined') {
    document.getElementById('remote-phone-status').textContent = 'PeerJS failed to load. Check your connection.';
    return;
  }
  const code = document.getElementById('remote-enter-code').value.trim().toUpperCase();
  if (code.length !== 6) {
    document.getElementById('remote-phone-status').textContent = 'Enter the 6-character code.';
    return;
  }
  document.getElementById('remote-phone-status').textContent = 'Connecting…';

  if (remotePeer) remotePeer.destroy();
  if (remoteBatteryInterval) clearInterval(remoteBatteryInterval);

  remotePeer = new Peer({ debug: 0 });
  remotePeer.on('open', () => {
    const conn = remotePeer.connect(code);

    // Assign to connections map so clipboard can send back
    remoteConnections[conn.peer] = conn;
    const container = document.getElementById('remote-display-container');
    if (container) container.style.display = 'block';

    // Hide Auto-Lock if it was active
    const overlay = document.getElementById('auto-lock-overlay');
    if (overlay) overlay.style.display = 'none';

    // Show remote controls on phone
    const controlsUI = document.getElementById('remote-controls');
    if (controlsUI) controlsUI.style.display = 'block';

    // Wire up presentation buttons
    document.getElementById('rc-left')?.addEventListener('click', () => conn.send({ type: 'control', action: 'left' }));
    document.getElementById('rc-right')?.addEventListener('click', () => conn.send({ type: 'control', action: 'right' }));
    document.getElementById('rc-up')?.addEventListener('click', () => conn.send({ type: 'control', action: 'up' }));
    document.getElementById('rc-down')?.addEventListener('click', () => conn.send({ type: 'control', action: 'down' }));

    conn.on('open', () => {
      document.getElementById('remote-phone-status').textContent = 'Connected! Sharing live stats…';

      async function sendStats() {
        const stats = { type: 'stats' };

        // Battery
        if (navigator.getBattery) {
          const b = await navigator.getBattery();
          stats.battery = b.level;
          stats.charging = b.charging;
        }

        // Network
        if (navigator.connection) {
          stats.network = navigator.connection.effectiveType || navigator.connection.type || 'Unknown';
        }

        // RAM
        if (navigator.deviceMemory) {
          stats.ram = navigator.deviceMemory;
        }

        // Storage
        if (navigator.storage && navigator.storage.estimate) {
          try {
            const est = await navigator.storage.estimate();
            stats.storageUsed = formatBytes(est.usage);
            stats.storageTotal = formatBytes(est.quota);
          } catch (e) { }
        }

        conn.send(stats);
      }
      sendStats();
      remoteBatteryInterval = setInterval(sendStats, 2000);
    });

    conn.on('data', (data) => {
      if (data.type === 'clipboard') {
        appendClipboardMessage(data.text, false);
      } else if (data.type === 'alarm') {
        // Find My Phone trigger
        const audio = document.getElementById('alarm-sound');
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(e => console.log('Audio autoplay blocked'));
        }
        if (navigator.vibrate) {
          navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
        }
        // Flash screen
        let flashes = 0;
        const ogBg = document.body.style.backgroundColor;
        const flashInterval = setInterval(() => {
          document.body.style.backgroundColor = flashes % 2 === 0 ? '#ff4444' : ogBg;
          flashes++;
          if (flashes > 10) {
            clearInterval(flashInterval);
            document.body.style.backgroundColor = ogBg;
          }
        }, 300);
      } else if (data.type === 'file') {
        // Handle incoming files on phone
        try {
          const blob = new Blob([data.file], { type: data.fileType });
          const url = URL.createObjectURL(blob);
          const linkStr = `<a href="${url}" download="${data.name}" style="color: var(--accent); text-decoration: underline;">📎 Download ${data.name}</a>`;
          appendClipboardMessage(linkStr, false);
        } catch (e) { console.error("File receive error", e); }
      } else if (window._handleAdvancedPayload) {
        // Fallthrough: laptop→phone commands (slide, open-url, push-notif)
        window._handleAdvancedPayload(data);
      }
    });

    conn.on('error', () => {
      document.getElementById('remote-phone-status').textContent = 'Connection failed. Check the code and WiFi.';
    });
  });
  remotePeer.on('error', (err) => {
    document.getElementById('remote-phone-status').textContent = 'Error: ' + (err.message || 'Failed.');
  });
});

// File Transfer Logic
document.getElementById('file-transfer-input')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const arrayBuffer = event.target.result;
    Object.values(remoteConnections).forEach(conn => {
      conn.send({
        type: 'file',
        file: arrayBuffer,
        name: file.name,
        fileType: file.type
      });
    });
    appendClipboardMessage(`Sent File: ${file.name}`, true);
  };
  reader.readAsArrayBuffer(file);
  // Reset input
  e.target.value = '';
});

// Start Camera Stream Logic (Phone)
let localCameraStream = null;
document.getElementById('rc-camera')?.addEventListener('click', async () => {
  const btn = document.getElementById('rc-camera');
  if (localCameraStream) {
    // Stop stream
    localCameraStream.getTracks().forEach(track => track.stop());
    localCameraStream = null;
    btn.textContent = '📷 Start Camera Stream';
    btn.style.background = '#8a2be2';
    return;
  }

  try {
    localCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    btn.textContent = '⏹️ Stop Camera Stream';
    btn.style.background = '#ff4444';

    // Call the laptop 
    const laptopId = Object.keys(remoteConnections)[0]; // Since phone normally connects to 1 laptop
    if (laptopId && remotePeer) {
      remotePeer.call(laptopId, localCameraStream);
    }
  } catch (err) {
    alert("Camera permission denied or unavailable.");
  }
});

// Auto-Lock Bypass
document.getElementById('btn-unlock-bypass')?.addEventListener('click', () => {
  document.getElementById('auto-lock-overlay').style.display = 'none';
});

// Setup Health Insight Logic
setInterval(() => {
  const insightBox = document.getElementById('setup-insight-box');
  const insightText = document.getElementById('setup-insight-text');
  if (!insightBox || !insightText) return;

  const connectedIds = Object.keys(remoteConnections);
  if (connectedIds.length === 0 || liveBatteryLevel == null) {
    insightBox.style.display = 'none';
    return;
  }

  insightBox.style.display = 'block';
  const laptopPct = Math.round(liveBatteryLevel * 100);
  const laptopCharging = liveBatteryCharging;

  let lowestPhonePct = 100;
  let chargingPhonesCount = 0;

  connectedIds.forEach(id => {
    const stats = remoteConnections[id].latestStats;
    if (stats && stats.battery != null) {
      const pPct = Math.round(stats.battery * 100);
      if (pPct < lowestPhonePct) lowestPhonePct = pPct;
      if (stats.charging) chargingPhonesCount++;
    }
  });

  if (lowestPhonePct < 20 && laptopPct > 80 && laptopCharging) {
    insightText.innerHTML = `💡 <strong>Suggestion:</strong> Your laptop is fully powered, but a connected device is dying (${lowestPhonePct}%). Plug it into your laptop's USB port!`;
  } else if (lowestPhonePct == 100 && chargingPhonesCount > 0) {
    insightText.innerHTML = `✅ <strong>Suggestion:</strong> Your connected device is fully charged. You can unplug it to preserve battery health.`;
  } else {
    insightText.innerHTML = `Everything looks good! Laptop: ${laptopPct}%, Lowest Device: ${lowestPhonePct}%.`;
  }
}, 5000);

// ============================================================
// ADVANCED PHONE ↔ LAPTOP FEATURES
// ============================================================

// --- 1. Gyroscope Controller (Phone → Laptop) ---
let gyroActive = false;
let gyroLastBeta = null;

document.getElementById('rc-gyro')?.addEventListener('click', () => {
  const btn = document.getElementById('rc-gyro');
  gyroActive = !gyroActive;

  if (gyroActive) {
    btn.textContent = '⏹️ Stop Gyro Scroll';
    btn.style.background = '#ff4444';
    document.getElementById('remote-phone-status').textContent = 'Gyro active — tilt phone to scroll laptop!';

    const sendGyro = (e) => {
      if (!gyroActive) return;
      const payload = { type: 'gyro', beta: e.beta, gamma: e.gamma, alpha: e.alpha };
      Object.values(remoteConnections).forEach(conn => conn.send(payload));

      // Shake detection on phone side too
      if (Math.abs(e.beta) > 70) {
        Object.values(remoteConnections).forEach(conn => conn.send({ type: 'alarm' }));
      }
    };

    // iOS 13+ requires permission
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === 'granted') window.addEventListener('deviceorientation', sendGyro);
        else alert('Permission denied for device orientation.');
      });
    } else {
      window.addEventListener('deviceorientation', sendGyro);
    }
    window._gyroHandler = sendGyro;
  } else {
    btn.textContent = '🌀 Gyro Scroll (Tilt to Scroll)';
    btn.style.background = '#2b6cb0';
    window.removeEventListener('deviceorientation', window._gyroHandler);
    document.getElementById('remote-phone-status').textContent = 'Gyro stopped.';
  }
});

// Laptop side: handle gyro data
function handleGyroData(data) {
  if (data.beta == null) return;
  const beta = data.beta;
  // Map beta (-90 to 90 forward/back tilt) to scroll
  if (gyroLastBeta !== null) {
    const diff = beta - gyroLastBeta;
    if (Math.abs(diff) > 2) {
      window.scrollBy({ top: diff * 8, behavior: 'smooth' });
    }
  }
  gyroLastBeta = beta;
}

// --- 2. QR / Barcode Scanner (Phone → Laptop) ---
let qrScanning = false;
let qrCodeReader = null;

document.getElementById('rc-qr')?.addEventListener('click', async () => {
  const btn = document.getElementById('rc-qr');
  const qrVideo = document.getElementById('qr-video');

  if (qrScanning) {
    qrScanning = false;
    if (qrCodeReader) { try { qrCodeReader.reset(); } catch (e) { } }
    if (qrVideo) qrVideo.style.display = 'none';
    btn.textContent = '📷 Scan QR Code';
    btn.style.background = '#744210';
    return;
  }

  if (typeof ZXing === 'undefined') {
    alert('QR library not loaded. Ensure you are on a live server.');
    return;
  }

  qrScanning = true;
  btn.textContent = '⏹️ Stop Scanning';
  btn.style.background = '#ff4444';
  if (qrVideo) qrVideo.style.display = 'block';

  try {
    qrCodeReader = new ZXing.BrowserMultiFormatReader();
    const devices = await qrCodeReader.listVideoInputDevices();
    const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
    const deviceId = backCamera ? backCamera.deviceId : (devices[0]?.deviceId);

    qrCodeReader.decodeFromVideoDevice(deviceId, 'qr-video', (result, err) => {
      if (result) {
        const value = result.getText();
        // Send to laptop
        Object.values(remoteConnections).forEach(conn => conn.send({ type: 'qr', value }));
        // Also show locally
        document.getElementById('remote-phone-status').textContent = 'Scanned: ' + value;
        // Stop after successful scan
        qrScanning = false;
        try { qrCodeReader.reset(); } catch (e) { }
        if (qrVideo) qrVideo.style.display = 'none';
        btn.textContent = '📷 Scan QR Code';
        btn.style.background = '#744210';
      }
    });
  } catch (e) {
    alert('Camera error: ' + e.message);
    qrScanning = false;
  }
});

// Laptop side handler for QR data
function handleQRData(value) {
  // Show QR result as popup
  const existing = document.getElementById('qr-result-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'qr-result-toast';
  toast.style.cssText = 'position:fixed;bottom:2rem;right:2rem;z-index:9998;background:#22c55e;color:#000;padding:1rem 1.5rem;border-radius:12px;max-width:320px;box-shadow:0 4px 20px rgba(0,0,0,0.4);';
  if (value.startsWith('http')) {
    toast.innerHTML = `<strong>📷 QR Code Scanned!</strong><br><a href="${value}" target="_blank" style="color:#000;font-weight:bold;">${value}</a>`;
  } else {
    toast.innerHTML = `<strong>📷 QR Code Scanned!</strong><br>${value}`;
  }
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 8000);
}

// --- 3. Ambient Light Sensor → Auto Dark/Light Mode ---
function startAmbientLight() {
  if ('AmbientLightSensor' in window) {
    const sensor = new AmbientLightSensor();
    sensor.addEventListener('reading', () => {
      const lux = sensor.illuminance;
      Object.values(remoteConnections).forEach(conn => conn.send({ type: 'light', lux }));
    });
    try { sensor.start(); } catch (e) { }
  } else if ('ondevicelight' in window) {
    window.addEventListener('devicelight', (e) => {
      Object.values(remoteConnections).forEach(conn => conn.send({ type: 'light', lux: e.value }));
    });
  }
}

// Call once on phone
startAmbientLight();

function handleLightData(lux) {
  const body = document.body;
  if (lux < 50) {
    body.setAttribute('data-theme', 'dark');
  } else if (lux > 200) {
    body.setAttribute('data-theme', 'light');
  }
}

// --- 4. GPS Location Sync (Phone → Laptop) ---
let gpsMap = null;
let gpsMarker = null;
let gpsWatchId = null;

document.getElementById('rc-gps')?.addEventListener('click', () => {
  const btn = document.getElementById('rc-gps');

  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
    btn.textContent = '📍 Share GPS Location';
    btn.style.background = '#553c9a';
    document.getElementById('remote-phone-status').textContent = 'GPS stopped.';
    return;
  }

  if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }

  btn.textContent = '⏹️ Stop GPS';
  btn.style.background = '#ff4444';
  document.getElementById('remote-phone-status').textContent = 'Sharing live location…';

  gpsWatchId = navigator.geolocation.watchPosition((pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    Object.values(remoteConnections).forEach(conn => conn.send({ type: 'gps', lat, lon }));
  }, (err) => {
    alert('GPS Error: ' + err.message);
  }, { enableHighAccuracy: true });
});

// Laptop side: render GPS map
function handleGPSData(lat, lon) {
  const box = document.getElementById('gps-map-box');
  if (box) box.style.display = 'block';

  if (typeof L === 'undefined') return; // Leaflet not loaded

  if (!gpsMap) {
    gpsMap = L.map('gps-map').setView([lat, lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(gpsMap);
    gpsMarker = L.marker([lat, lon]).addTo(gpsMap).bindPopup('📱 Phone Location').openPopup();
  } else {
    gpsMarker.setLatLng([lat, lon]);
    gpsMap.setView([lat, lon], gpsMap.getZoom());
  }
}

// --- 5. Remote URL Opener (Laptop → Phone) ---
document.getElementById('remote-url-send')?.addEventListener('click', () => {
  const url = document.getElementById('remote-url-input')?.value.trim();
  if (!url) return;
  Object.values(remoteConnections).forEach(conn => conn.send({ type: 'open-url', url }));
  document.getElementById('remote-url-input').value = '';
});

// --- 6. Slide Push — Secondary Display (Laptop → Phone) ---
document.getElementById('slide-push-send')?.addEventListener('click', () => {
  const title = document.getElementById('slide-title-input')?.value.trim() || 'BatteryLife';
  const body = document.getElementById('slide-body-input')?.value.trim() || '';
  Object.values(remoteConnections).forEach(conn => conn.send({ type: 'slide', title, body }));
  document.getElementById('slide-title-input').value = '';
  document.getElementById('slide-body-input').value = '';
});

// --- 7. Push Custom Notifications (Laptop → Phone) ---
document.getElementById('push-notif-send')?.addEventListener('click', () => {
  const text = document.getElementById('push-notif-input')?.value.trim();
  if (!text) return;
  Object.values(remoteConnections).forEach(conn => conn.send({ type: 'push-notif', title: 'BatteryLife', body: text }));
  document.getElementById('push-notif-input').value = '';
});

// --- 8. AI Charging Pattern Recommendation ---
function runAIChargingInsights() {
  const el = document.getElementById('ai-insight-text');
  if (!el) return;

  try {
    const history = JSON.parse(localStorage.getItem('bl_battery_history') || '[]');
    if (history.length < 5) {
      el.textContent = 'Log at least 5 sessions to unlock personalized AI recommendations.';
      return;
    }

    // Extract hours of charging data rows
    const chargingHours = history
      .filter(r => r.charging)
      .map(r => new Date(r.timestamp || r.date || Date.now()).getHours());

    if (chargingHours.length === 0) { el.textContent = 'No charging data available yet.'; return; }

    // Most common charging hour
    const freq = {};
    chargingHours.forEach(h => freq[h] = (freq[h] || 0) + 1);
    const topHour = parseInt(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);

    // Average max charge level
    const maxLevels = history.filter(r => r.charging).map(r => r.level || r.battery || 0);
    const avgMax = maxLevels.length > 0 ? Math.round(maxLevels.reduce((a, b) => a + b, 0) / maxLevels.length * 100) : null;

    let insight = `📊 You typically charge around <strong>${topHour}:00</strong>. `;
    if (avgMax !== null) {
      if (avgMax > 90) {
        insight += `Your average charge peak is <strong>${avgMax}%</strong> — consider stopping at 80% to extend battery lifespan.`;
      } else if (avgMax < 50) {
        insight += `Your average charge peak is <strong>${avgMax}%</strong> — try to charge to at least 50% for better cycle health.`;
      } else {
        insight += `Your average charge peak is <strong>${avgMax}%</strong> — great habit! ✅`;
      }
    }

    el.innerHTML = insight;
  } catch (e) {
    el.textContent = 'Could not analyze charging history.';
  }
}
runAIChargingInsights();

// --- 9. Device Ecosystem Map ---
function renderEcosystemMap() {
  const container = document.getElementById('ecosystem-svg-container');
  const box = document.getElementById('ecosystem-map-box');
  const ids = Object.keys(remoteConnections);

  if (!container || !box || ids.length === 0) { if (box) box.style.display = 'none'; return; }
  box.style.display = 'block';

  const svgW = 320, svgH = 120;
  const laptopX = 40, laptopY = 60;
  const spacing = Math.min(200, (svgW - laptopX - 40) / ids.length);

  let svg = `<svg width="100%" viewBox="0 0 ${svgW} ${svgH}" style="font-family:sans-serif;">`;
  // Laptop node
  svg += `<circle cx="${laptopX}" cy="${laptopY}" r="18" fill="var(--accent)" opacity="0.9"/>`;
  svg += `<text x="${laptopX}" y="${laptopY + 5}" text-anchor="middle" font-size="13" fill="white">💻</text>`;
  svg += `<text x="${laptopX}" y="${laptopY + 30}" text-anchor="middle" font-size="9" fill="var(--text-main)">Laptop</text>`;

  ids.forEach((id, i) => {
    const stats = remoteConnections[id].latestStats || {};
    const px = laptopX + 100 + i * spacing;
    const py = laptopY;
    const pct = stats.battery != null ? Math.round(stats.battery * 100) : '?';
    const color = pct < 20 ? '#e53e3e' : pct < 50 ? '#f6ad55' : '#68d391';

    // Connection line
    svg += `<line x1="${laptopX + 18}" y1="${laptopY}" x2="${px - 18}" y2="${py}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5"/>`;
    // Phone node
    svg += `<circle cx="${px}" cy="${py}" r="18" fill="${color}" opacity="0.9"/>`;
    svg += `<text x="${px}" y="${py + 5}" text-anchor="middle" font-size="13" fill="white">📱</text>`;
    svg += `<text x="${px}" y="${py + 30}" text-anchor="middle" font-size="9" fill="var(--text-main)">${pct}%</text>`;
  });

  svg += '</svg>';
  container.innerHTML = svg;
}

// Re-render ecosystem map whenever devices change
const _origRenderRemoteDevices = renderRemoteDevices;
window.renderRemoteDevices = function () {
  _origRenderRemoteDevices();
  renderEcosystemMap();
};

// --- 10. Battery Drain Speed Calculator ---
const drainHistory = {}; // peerId -> [{ts, pct}]

function updateDrainSpeed() {
  const box = document.getElementById('drain-speed-box');
  const txt = document.getElementById('drain-speed-text');
  if (!box || !txt) return;

  const ids = Object.keys(remoteConnections);
  if (ids.length === 0) { box.style.display = 'none'; return; }

  let lines = [];
  ids.forEach(id => {
    const stats = remoteConnections[id].latestStats;
    if (!stats || stats.battery == null) return;
    const pct = Math.round(stats.battery * 100);
    const now = Date.now();

    if (!drainHistory[id]) drainHistory[id] = [];
    drainHistory[id].push({ ts: now, pct });
    // Keep only last 20 data points
    if (drainHistory[id].length > 20) drainHistory[id].shift();

    const points = drainHistory[id];
    if (points.length >= 2 && !stats.charging) {
      const first = points[0], last = points[points.length - 1];
      const timeDeltaMin = (last.ts - first.ts) / 60000;
      const levelDelta = first.pct - last.pct;

      if (timeDeltaMin > 0.5 && levelDelta > 0) {
        const ratePerMin = levelDelta / timeDeltaMin;
        const minsLeft = Math.round(pct / ratePerMin);
        const hoursLeft = Math.floor(minsLeft / 60);
        const remMins = minsLeft % 60;
        const timeStr = hoursLeft > 0 ? `${hoursLeft}h ${remMins}m` : `${minsLeft}m`;
        lines.push(`Device ${id.slice(0, 4)}: draining ~${ratePerMin.toFixed(1)}%/min → ⚡ ~${timeStr} remaining`);
      } else if (stats.charging) {
        lines.push(`Device ${id.slice(0, 4)}: Charging 🔌`);
      } else {
        lines.push(`Device ${id.slice(0, 4)}: Collecting drain data...`);
      }
    }
  });

  if (lines.length > 0) {
    box.style.display = 'block';
    txt.innerHTML = lines.join('<br>');
  } else {
    box.style.display = 'none';
  }
}

// Hook drain speed to the stats render cycle
const _origCheckAlerts = checkAlerts;
window.checkAlerts = function (id, pct, charging) {
  _origCheckAlerts(id, pct, charging);
  updateDrainSpeed();
  renderEcosystemMap();
};

// --- 11. Voice Control from Phone ---
let voiceActive = false;

document.getElementById('rc-voice')?.addEventListener('click', () => {
  const btn = document.getElementById('rc-voice');
  const transcript = document.getElementById('voice-transcript');

  if (voiceActive) {
    voiceActive = false;
    btn.textContent = '🎤 Voice Control';
    btn.style.background = '#276749';
    if (transcript) { transcript.style.display = 'none'; }
    return;
  }

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) { alert('Speech Recognition not supported in this browser. Try Chrome on Android.'); return; }

  voiceActive = true;
  btn.textContent = '⏹️ Stop Listening';
  btn.style.background = '#ff4444';
  if (transcript) { transcript.style.display = 'block'; transcript.textContent = '🎤 Listening…'; }

  const recog = new SpeechRec();
  recog.interimResults = false;
  recog.continuous = true;
  recog.lang = 'en-US';

  recog.onresult = (event) => {
    const text = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
    if (transcript) transcript.textContent = `🎤 "${text}"`;
    Object.values(remoteConnections).forEach(conn => conn.send({ type: 'voice', transcript: text }));
  };
  recog.onend = () => {
    if (voiceActive) recog.start(); // restart for continuous mode
  };
  recog.start();
  window._voiceRecog = recog;
});

// Laptop side: parse voice commands
function handleVoiceCommand(text) {
  // Show visual indicator
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9997;background:#276749;color:white;padding:0.75rem 1.25rem;border-radius:10px;font-size:0.9rem;';
  toast.textContent = `🎤 "${text}"`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);

  if (text.includes('find my phone') || text.includes('ring') || text.includes('alarm')) {
    Object.values(remoteConnections).forEach(conn => conn.send({ type: 'alarm' }));
  } else if (text.includes('dark mode') || text.includes('dark theme')) {
    document.body.setAttribute('data-theme', 'dark');
  } else if (text.includes('light mode') || text.includes('light theme')) {
    document.body.setAttribute('data-theme', 'light');
  } else if (text.includes('scroll down')) {
    window.scrollBy({ top: 400, behavior: 'smooth' });
  } else if (text.includes('scroll up')) {
    window.scrollBy({ top: -400, behavior: 'smooth' });
  } else if (text.includes('open ')) {
    const urlMatch = text.match(/open (.+)/);
    if (urlMatch) {
      let url = urlMatch[1].trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      window.open(url, '_blank');
    }
  }
}

// --- Laptop: handle phone incoming messages (merged handler additions) ---
// We override the existing data handler to add new payload types.
// These types are handled by patching the data handler on the laptop side.
// They are received in conn.on('data') in the remote-start section (see original handler).
// For cleanliness, we add a global dispatch here:
window._handleAdvancedPayload = function (data) {
  if (data.type === 'gyro') {
    handleGyroData(data);
  } else if (data.type === 'qr') {
    handleQRData(data.value);
  } else if (data.type === 'light') {
    handleLightData(data.lux);
  } else if (data.type === 'gps') {
    handleGPSData(data.lat, data.lon);
  } else if (data.type === 'voice') {
    handleVoiceCommand(data.transcript);
  } else if (data.type === 'open-url') {
    // On phone — open the URL
    window.open(data.url, '_blank');
  } else if (data.type === 'slide') {
    const display = document.getElementById('slide-display');
    const titleEl = document.getElementById('slide-title');
    const bodyEl = document.getElementById('slide-body');
    if (display) display.style.display = 'block';
    if (titleEl) titleEl.textContent = data.title;
    if (bodyEl) bodyEl.textContent = data.body;
  } else if (data.type === 'push-notif') {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(data.title || 'BatteryLife', { body: data.body });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification(data.title || 'BatteryLife', { body: data.body });
        });
      }
    }
  }
};

// --- 12. Battery Health Certificate Export ---
document.getElementById('export-certificate')?.addEventListener('click', () => {
  const cert = document.getElementById('print-certificate');
  const dateEl = document.getElementById('cert-date');
  const devicesEl = document.getElementById('cert-devices');
  const insightsEl = document.getElementById('cert-insights');

  if (!cert) return;

  // Populate certificate data
  if (dateEl) dateEl.textContent = `Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

  let deviceHtml = '';
  const ids = Object.keys(remoteConnections);
  if (ids.length > 0) {
    ids.forEach(id => {
      const stats = remoteConnections[id].latestStats || {};
      const pct = stats.battery != null ? Math.round(stats.battery * 100) + '%' : 'Unknown';
      const status = stats.charging ? 'Charging' : 'Discharging';
      const network = stats.network || 'Unknown';
      const ram = stats.ram ? stats.ram + ' GB' : 'Unknown';
      deviceHtml += `<div style="border:1px solid #ccc;padding:0.75rem;border-radius:8px;margin-bottom:0.5rem;">
        <strong>Device ${id.slice(0, 4)}</strong> — Battery: ${pct} (${status})<br>
        Network: ${network} | RAM: ${ram}
      </div>`;
    });
  } else {
    deviceHtml = '<p>No remote devices connected at time of export.</p>';
  }
  if (devicesEl) devicesEl.innerHTML = deviceHtml;

  const aiText = document.getElementById('ai-insight-text');
  if (insightsEl && aiText) insightsEl.innerHTML = aiText.innerHTML;

  cert.style.display = 'block';
  window.print();
  setTimeout(() => { cert.style.display = 'none'; }, 1000);
});

// ============================================================
// Battery Stress Warning System
// ============================================================
const STRESS_KEY = STORAGE_KEYS.stress;

function getStressData() {
  try {
    return JSON.parse(localStorage.getItem(STRESS_KEY) || 'null') || {
      above90Start: null,      // ISO timestamp when charging passed 90%
      crossed95Count: 0,       // lifetime count of 95%+ events
      stressTodayCount: 0,     // stress events on today's date
      stressTodayDate: null,   // date string of today for reset
      above90MinutesTotal: 0,  // accumulated minutes above 90%
    };
  } catch { return { above90Start: null, crossed95Count: 0, stressTodayCount: 0, stressTodayDate: null, above90MinutesTotal: 0 }; }
}

function saveStressData(d) {
  localStorage.setItem(STRESS_KEY, JSON.stringify(d));
}

// Tracks 95% crossing for the current session
let _last95Crossed = false;
let _pollStressInterval = null;

function updateStressWarning(pct, charging) {
  const banner = document.getElementById('stress-warning-banner');
  if (!banner) return;

  const data = getStressData();
  const today = new Date().toISOString().slice(0, 10);

  // Reset today counter if it's a new day
  if (data.stressTodayDate !== today) {
    data.stressTodayCount = 0;
    data.stressTodayDate = today;
  }

  // Not charging or low % — hide banner and reset tracking
  if (!charging || pct < 85) {
    banner.style.display = 'none';
    if (data.above90Start) {
      // Accumulate minutes charged above 90%
      const mins = Math.round((Date.now() - new Date(data.above90Start).getTime()) / 60000);
      data.above90MinutesTotal += mins;
      data.above90Start = null;
    }
    _last95Crossed = false;
    saveStressData(data);
    return;
  }

  // Determine level
  let level, levelClass, icon, label, message;
  if (pct >= 95) {
    level = 3; levelClass = 'level-critical'; icon = '🔴';
    label = 'Critical Stress';
    message = 'Prolonged high-voltage charging may accelerate battery degradation.';
  } else if (pct >= 90) {
    level = 2; levelClass = 'level-high'; icon = '🟠';
    label = 'High Stress';
    message = 'High battery stress detected. Consider unplugging soon.';
  } else {
    level = 1; levelClass = 'level-mild'; icon = '🟡';
    label = 'Mild Stress';
    message = 'Charging above 85% increases battery voltage stress.';
  }

  // Track 95% crossing
  if (pct >= 95 && !_last95Crossed) {
    data.crossed95Count++;
    data.stressTodayCount++;
    _last95Crossed = true;
    saveStressData(data);
  } else if (pct < 95) {
    _last95Crossed = false;
  }

  // Track time above 90%
  if (pct >= 90) {
    if (!data.above90Start) {
      data.above90Start = new Date().toISOString();
      data.stressTodayCount = Math.max(data.stressTodayCount, data.stressTodayCount);
      saveStressData(data);
    }
  } else if (data.above90Start) {
    const mins = Math.round((Date.now() - new Date(data.above90Start).getTime()) / 60000);
    data.above90MinutesTotal += mins;
    data.above90Start = null;
    saveStressData(data);
  }

  // Calculate live minutes above 90%
  let liveAbove90Min = data.above90MinutesTotal;
  if (data.above90Start) {
    liveAbove90Min += Math.round((Date.now() - new Date(data.above90Start).getTime()) / 60000);
  }

  // Render banner
  banner.style.display = 'flex';
  banner.className = `stress-banner ${levelClass}`;
  document.getElementById('stress-icon').textContent = icon;
  document.getElementById('stress-level-label').textContent = label;
  document.getElementById('stress-message').textContent = message;
  document.getElementById('stress-counter-today').textContent = data.stressTodayCount;
  document.getElementById('stress-counter-90').textContent =
    liveAbove90Min >= 60
      ? `${Math.floor(liveAbove90Min / 60)}h ${liveAbove90Min % 60}m`
      : `${liveAbove90Min}m`;
  document.getElementById('stress-counter-95').textContent = data.crossed95Count;
}

// Poll stress every 15s for time-above-90 counter refresh
function startStressPoll() {
  if (_pollStressInterval) clearInterval(_pollStressInterval);
  _pollStressInterval = setInterval(() => {
    if (liveBatteryLevel != null) {
      const pct = Math.round(liveBatteryLevel * 100);
      updateStressWarning(pct, liveBatteryCharging);
    }
  }, 15000);
}

// ============================================================
// Stress Index Meter (Behavior-Based Score)
// ============================================================
function computeStressIndex() {
  const charges = getCharges();
  if (charges.length === 0) return { score: null, insights: [], breakdown: [], thisWeekScore: null, lastWeekScore: null };

  const CIRCUMFERENCE = 326.73; // 2π × 52

  // Score penalties per session
  function scoreSession(c) {
    let penalty = 0;
    if (c.type === 'fast') penalty += 5;
    if (c.type === 'ultra') penalty += 8;
    if (c.start <= 10 && c.end >= 95) penalty += 8;  // full cycle
    else if (c.start <= 5) penalty += 8;               // deep discharge
    else if (c.start <= 15) penalty += 3;              // near-deep
    if (c.end >= 95) penalty += 5;                     // charged very high
    else if (c.end >= 90) penalty += 2;
    return penalty;
  }

  // Group by date for frequency bonus
  const byDate = {};
  charges.forEach(c => {
    byDate[c.date] = (byDate[c.date] || 0) + 1;
  });
  const frequencyPenalty = Object.values(byDate).reduce((sum, n) => sum + (n > 3 ? (n - 3) * 3 : 0), 0);

  // Compute overall score
  function computeScore(sessions) {
    if (sessions.length === 0) return 100;
    const total = sessions.reduce((sum, c) => sum + scoreSession(c), 0) + frequencyPenalty;
    return Math.max(0, Math.min(100, 100 - Math.round(total / Math.max(sessions.length, 1) * 2)));
  }

  const score = computeScore(charges);

  // Weekly trend
  const now = new Date();
  const dayMs = 86400000;
  const cutThisWeek = new Date(now - 7 * dayMs).toISOString().slice(0, 10);
  const cutLastWeek = new Date(now - 14 * dayMs).toISOString().slice(0, 10);
  const thisWeekCharges = charges.filter(c => c.date >= cutThisWeek);
  const lastWeekCharges = charges.filter(c => c.date >= cutLastWeek && c.date < cutThisWeek);
  const thisWeekScore = thisWeekCharges.length ? computeScore(thisWeekCharges) : null;
  const lastWeekScore = lastWeekCharges.length ? computeScore(lastWeekCharges) : null;

  // Build insights
  const insights = [];
  const fastCount = charges.filter(c => c.type === 'fast' || c.type === 'ultra').length;
  const fullCycleCount = charges.filter(c => c.start <= 10 && c.end >= 95).length;
  const high95Count = charges.filter(c => c.end >= 95).length;
  const deepCount = charges.filter(c => c.start <= 10).length;

  if (fastCount > charges.length * 0.5)
    insights.push('🔥 You use fast/ultra charging very frequently. Consider switching to normal charging when possible.');
  if (fullCycleCount > 0)
    insights.push(`⚠️ ${fullCycleCount} full 0→100% cycle${fullCycleCount > 1 ? 's' : ''} logged. Partial charges extend battery lifespan.`);
  if (high95Count > charges.length * 0.4)
    insights.push('🔴 You frequently charge above 95%. Stopping at 80–85% significantly reduces long-term wear.');
  if (deepCount > 0)
    insights.push(`🪫 ${deepCount} deep discharge${deepCount > 1 ? 's' : ''} from ≤10% detected. Try to recharge before hitting 20%.`);
  if (insights.length === 0)
    insights.push('✅ Great charging habits! Keep staying in the 20–80% range for maximum battery longevity.');

  // Breakdown chips
  const breakdown = [
    { label: `${fastCount} fast/ultra`, cls: fastCount > 3 ? 'bad' : fastCount > 1 ? 'warn' : 'good' },
    { label: `${fullCycleCount} full cycles`, cls: fullCycleCount > 2 ? 'bad' : fullCycleCount > 0 ? 'warn' : 'good' },
    { label: `${high95Count} above 95%`, cls: high95Count > 3 ? 'bad' : high95Count > 0 ? 'warn' : 'good' },
    { label: `${deepCount} deep discharge`, cls: deepCount > 2 ? 'bad' : deepCount > 0 ? 'warn' : 'good' },
  ];

  return { score, insights, breakdown, thisWeekScore, lastWeekScore, CIRCUMFERENCE };
}

function renderStressIndex() {
  const { score, insights, breakdown, thisWeekScore, lastWeekScore, CIRCUMFERENCE } = computeStressIndex();

  const ringFill = document.getElementById('stress-ring-fill');
  const ringScore = document.getElementById('stress-ring-score');
  const ringLabel = document.getElementById('stress-ring-label');
  const scoreBadge = document.getElementById('stress-score-badge');
  const statusEl = document.getElementById('stress-index-status');
  const barFill = document.getElementById('stress-bar-fill');
  const insightText = document.getElementById('stress-insight-text');
  const trendWrap = document.getElementById('stress-trend');
  const trendIcon = document.getElementById('stress-trend-icon');
  const trendText = document.getElementById('stress-trend-text');
  const breakdownEl = document.getElementById('stress-breakdown');

  if (!ringFill) return;

  if (score === null) {
    ringScore.textContent = '--';
    ringLabel.textContent = 'Score';
    scoreBadge.textContent = '--';
    scoreBadge.className = 'stress-score-badge';
    statusEl.textContent = 'Log charge sessions to see your score.';
    barFill.style.width = '100%';
    insightText.textContent = 'Log some charge sessions to see your score.';
    if (trendWrap) trendWrap.style.display = 'none';
    return;
  }

  // Determine grade class
  const cls = score >= 80 ? 'score-good' : score >= 50 ? 'score-moderate' : 'score-bad';
  const statusLabel = score >= 80 ? '🟢 Healthy Habits' : score >= 50 ? '🟡 Moderate Stress' : '🔴 High Stress';

  // Ring (circumference = 326.73, offset = circumference * (1 - score/100))
  const offset = CIRCUMFERENCE * (1 - score / 100);
  ringFill.style.strokeDashoffset = offset;
  ringFill.className = `stress-ring-fill ${cls}`;
  ringScore.textContent = score;
  scoreBadge.textContent = score;
  scoreBadge.className = `stress-score-badge ${cls}`;
  statusEl.textContent = statusLabel;

  // Gradient bar: show how much is "uncovered" from the right (bad = 0%, good = 100%)
  barFill.style.width = `${100 - score}%`;

  // Insight
  insightText.textContent = insights[0] || '';

  // Trend
  if (trendWrap && thisWeekScore !== null && lastWeekScore !== null) {
    const diff = thisWeekScore - lastWeekScore;
    trendWrap.style.display = 'flex';
    if (diff > 3) {
      trendIcon.textContent = '📈';
      trendText.textContent = `Your habits improved by ${diff} points compared to last week. Keep it up!`;
    } else if (diff < -3) {
      trendIcon.textContent = '📉';
      trendText.textContent = `Your stress index increased by ${Math.abs(diff)} points vs last week. Mind your charging habits.`;
    } else {
      trendIcon.textContent = '➡️';
      trendText.textContent = 'Your charging habits are consistent with last week.';
    }
  } else if (trendWrap) {
    trendWrap.style.display = 'none';
  }

  // Breakdown chips
  if (breakdownEl) {
    breakdownEl.innerHTML = breakdown
      .map(b => `<span class="stress-chip ${b.cls}">${b.label}</span>`)
      .join('');
  }
}

// ============================================================
// Charge History — Habit Stress Summary
// ============================================================
function renderChargeStressSummary() {
  const charges = getCharges();
  const fastCount = charges.filter(c => c.type === 'fast' || c.type === 'ultra').length;
  const fullCount = charges.filter(c => c.start <= 10 && c.end >= 95).length;
  const high95 = charges.filter(c => c.end >= 95).length;
  const deepCount = charges.filter(c => c.start <= 10).length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('cs-fast-count', fastCount);
  set('cs-full-count', fullCount);
  set('cs-high95-count', high95);
  set('cs-deep-count', deepCount);

  const adviceEl = document.getElementById('charge-stress-advice');
  if (!adviceEl) return;

  if (charges.length === 0) {
    adviceEl.textContent = 'Log charge sessions to see your habit analysis.';
    return;
  }

  const issues = [];
  if (fastCount > charges.length * 0.5) issues.push('high fast-charging frequency');
  if (fullCount > 0) issues.push(`${fullCount} full cycle${fullCount > 1 ? 's' : ''}`);
  if (high95 > charges.length * 0.4) issues.push('frequent charging above 95%');
  if (deepCount > 0) issues.push(`${deepCount} deep discharge${deepCount > 1 ? 's' : ''}`);

  if (issues.length === 0) {
    adviceEl.textContent = '✅ Excellent habits! Your charging patterns are battery-friendly.';
  } else {
    adviceEl.textContent = `⚠️ Risky patterns detected: ${issues.join(', ')}. Adjusting these can significantly extend your battery lifespan.`;
  }
}

// ============================================================
// Feature: Battery Health Grade (A–F)
// ============================================================
function getHealthGrade(pct) {
  if (!pct || pct === '--') return { grade: '', cls: '' };
  const n = parseInt(pct);
  if (n >= 90) return { grade: 'A', cls: 'grade-a' };
  if (n >= 80) return { grade: 'B', cls: 'grade-b' };
  if (n >= 70) return { grade: 'C', cls: 'grade-c' };
  if (n >= 60) return { grade: 'D', cls: 'grade-d' };
  return { grade: 'F', cls: 'grade-f' };
}

// ============================================================
// Feature: Lifespan Predictor (linear regression on health logs)
// ============================================================
function renderLifespanPredictor() {
  const health = getHealth();
  const el = document.getElementById('lifespan-text');
  const sub = document.getElementById('lifespan-sub');
  if (!el) return;
  if (health.length < 2) {
    el.textContent = 'Need at least 2 health entries to predict.';
    if (sub) sub.textContent = '';
    return;
  }
  // Convert dates to numeric days from first entry
  const base = new Date(health[0].date + 'T12:00:00').getTime();
  const points = health.map(h => ({
    x: (new Date(h.date + 'T12:00:00').getTime() - base) / 86400000,
    y: h.pct,
  }));
  // Least-squares linear regression
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    el.textContent = 'Log health on different dates to see a prediction.';
    if (sub) sub.textContent = 'All entries are from the same day.';
    return;
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  // slope < 0 means degrading
  if (slope >= 0) {
    el.textContent = 'Your health is stable or improving! 🎉';
    if (sub) sub.textContent = 'No degradation detected in your logs.';
    return;
  }
  const currentPct = points[points.length - 1].y;
  const daysTo80 = (currentPct - 80) / Math.abs(slope);
  const daysTo50 = (currentPct - 50) / Math.abs(slope);
  if (daysTo80 <= 0) {
    el.textContent = 'Battery already below 80% health.';
    if (sub) sub.textContent = `Estimated ${Math.max(0, Math.round(daysTo50))} days to reach 50%.`;
    return;
  }
  const months = Math.round(daysTo80 / 30);
  el.textContent = `Reaching 80% health in ~${months} month${months !== 1 ? 's' : ''}`;

  // Custom Phone Model overrides
  let subText = `Based on a ${(Math.abs(slope) * 30).toFixed(1)}% / month decline rate`;
  const preferredModel = localStorage.getItem('batterylife_preferred_model');
  if (preferredModel) {
    const modelData = PHONE_MODELS?.find(m => m.name === preferredModel);
    if (modelData) {
      const avgMonths = modelData.lifeYears * 12;
      const pctExpected = Math.max(20, Math.round((months / avgMonths) * 100));
      subText += ` (Tracking ${pctExpected}% of avg ${preferredModel} lifespan)`;
    }
  }

  if (sub) sub.textContent = subText;
}

// ============================================================
// Feature: Daily Usage Report Card
// ============================================================
function renderDailyReport() {
  const today = new Date().toISOString().slice(0, 10);
  const charges = getCharges().filter(c => c.date === today);
  const stressData = getStressData?.() || {};
  const stressToday = (stressData.stressTodayDate === today) ? (stressData.stressTodayCount || 0) : 0;
  const { score } = computeStressIndex();

  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  set('dr-charges', charges.length);
  set('dr-stress', stressToday);
  set('dr-score', score !== null ? score : '--');
}

// ============================================================
// Feature: Smart SVG Line Chart (replaces bar chart)
// ============================================================
function renderHealthChart() {
  const health = getHealth().slice(-20);
  const container = document.getElementById('health-chart');
  if (!container) return;
  if (health.length === 0) {
    container.innerHTML = '<p class="empty" style="color:var(--text-muted);font-size:0.9rem;">Log health data to see the chart.</p>';
    return;
  }
  if (health.length === 1) {
    container.innerHTML = `<div class="health-bar" style="height:${Math.max(20, health[0].pct)}%"><div class="health-bar-fill" style="height:100%"></div></div>`;
    return;
  }
  const W = 600, H = 120, PAD = 12;
  const vals = health.map(h => h.pct);
  const minV = Math.max(0, Math.min(...vals) - 5);
  const maxV = Math.min(100, Math.max(...vals) + 5);
  const xStep = (W - PAD * 2) / (vals.length - 1);
  const yScale = v => H - PAD - ((v - minV) / (maxV - minV)) * (H - PAD * 2);
  const pts = vals.map((v, i) => `${PAD + i * xStep},${yScale(v)}`);
  const pathD = 'M' + pts.join(' L');
  const areaD = `${pathD} L${PAD + (vals.length - 1) * xStep},${H} L${PAD},${H} Z`;

  container.className = 'health-linechart';
  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#lineGrad)"/>
      <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${vals.map((v, i) => `
        <circle cx="${PAD + i * xStep}" cy="${yScale(v)}" r="4"
          fill="var(--bg-card)" stroke="var(--accent)" stroke-width="2"
          data-pct="${v}" data-date="${health[i].date}" class="chart-dot"/>
      `).join('')}
    </svg>
    <div class="health-chart-tooltip" id="chart-tooltip"></div>
  `;

  // Tooltip on hover
  const tooltip = container.querySelector('#chart-tooltip');
  container.querySelectorAll('.chart-dot').forEach(dot => {
    dot.addEventListener('mouseenter', e => {
      tooltip.textContent = `${dot.dataset.pct}% — ${formatDate(dot.dataset.date)}`;
      tooltip.style.opacity = '1';
    });
    dot.addEventListener('mousemove', e => {
      const rect = container.getBoundingClientRect();
      tooltip.style.left = `${e.clientX - rect.left + 10}px`;
      tooltip.style.top = `${e.clientY - rect.top - 32}px`;
    });
    dot.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });
  });
}

// ============================================================
// Feature: Phone Model Comparison
// ============================================================
const PHONE_MODELS = [
  { brand: 'Apple', name: 'iPhone 16 Pro', mah: 3582, lifeYears: 2.5, optimalPct: 80, notes: 'Optimised Charging default ON' },
  { brand: 'Apple', name: 'iPhone 15', mah: 3877, lifeYears: 2.5, optimalPct: 80, notes: '80% limit available' },
  { brand: 'Apple', name: 'iPhone 14', mah: 3279, lifeYears: 2.3, optimalPct: 80, notes: 'Optimised Charging' },
  { brand: 'Samsung', name: 'Galaxy S24 Ultra', mah: 5000, lifeYears: 3, optimalPct: 85, notes: 'Adaptive charging AI' },
  { brand: 'Samsung', name: 'Galaxy S23', mah: 3900, lifeYears: 2.8, optimalPct: 85, notes: '80% charge limit option' },
  { brand: 'Samsung', name: 'Galaxy A55', mah: 5000, lifeYears: 2.5, optimalPct: 80, notes: '25W fast charge' },
  { brand: 'Google', name: 'Pixel 9 Pro', mah: 4700, lifeYears: 3, optimalPct: 80, notes: 'Adaptive charging, 7yr updates' },
  { brand: 'Google', name: 'Pixel 8a', mah: 4492, lifeYears: 2.8, optimalPct: 80, notes: '18W, Battery Share' },
  { brand: 'OnePlus', name: 'OnePlus 12', mah: 5400, lifeYears: 2.5, optimalPct: 80, notes: '100W SUPERVOOC' },
  { brand: 'Xiaomi', name: 'Xiaomi 14 Pro', mah: 4880, lifeYears: 2.3, optimalPct: 80, notes: '120W HyperCharge' },
  { brand: 'Nothing', name: 'Phone (2)', mah: 4700, lifeYears: 2.5, optimalPct: 85, notes: '45W fast charge' },
  { brand: 'Motorola', name: 'Edge 50 Pro', mah: 4500, lifeYears: 2.3, optimalPct: 80, notes: '125W TurboPower' },
];

function renderPhoneModels(filter = '') {
  const grid = document.getElementById('model-grid');
  if (!grid) return;
  const filtered = filter
    ? PHONE_MODELS.filter(m =>
      m.name.toLowerCase().includes(filter.toLowerCase()) ||
      m.brand.toLowerCase().includes(filter.toLowerCase()))
    : PHONE_MODELS;

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;">No models matched your search.</p>';
    return;
  }

  grid.innerHTML = filtered.map(m => {
    const healthAt2yr = Math.round(Math.max(60, 100 - (100 - 80) * (2 / m.lifeYears)));
    return `
    <div class="model-card">
      <div class="model-brand">${m.brand}</div>
      <div class="model-name">${m.name}</div>
      <div class="model-specs">
        <div class="model-spec">
          <span class="model-spec-val">${m.mah.toLocaleString()}</span>
          <span class="model-spec-lbl">mAh</span>
        </div>
        <div class="model-spec">
          <span class="model-spec-val">${m.lifeYears}yr</span>
          <span class="model-spec-lbl">Avg lifespan</span>
        </div>
        <div class="model-spec">
          <span class="model-spec-val">${m.optimalPct}%</span>
          <span class="model-spec-lbl">Charge limit</span>
        </div>
        <div class="model-spec">
          <span class="model-spec-val">~${healthAt2yr}%</span>
          <span class="model-spec-lbl">Health @ 2yr</span>
        </div>
      </div>
      <div class="model-health-bar">
        <div class="model-health-bar-label">
          <span>Typical health @ 2 years</span>
          <span>${healthAt2yr}%</span>
        </div>
        <div class="model-health-bar-track">
          <div class="model-health-bar-fill" style="width:${healthAt2yr}%"></div>
        </div>
      </div>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.65rem;">${m.notes}</p>
    </div>`;
  }).join('');
}

document.getElementById('model-search')?.addEventListener('input', e => renderPhoneModels(e.target.value));

// ============================================================
// Feature: Charger Speed Comparator
// ============================================================
const CHARGER_PROFILES = [
  { label: '5W Standard', watts: 5, color: '#8b949e' },
  { label: '15W Fast', watts: 15, color: '#d29922' },
  { label: '25W Fast+', watts: 25, color: '#e3792a' },
  { label: '45W Ultra Fast', watts: 45, color: '#3fb950' },
  { label: '65W Super', watts: 65, color: '#58a6ff' },
  { label: '100W Hyper', watts: 100, color: '#bc8cff' },
];

document.getElementById('compare-chargers')?.addEventListener('click', () => {
  const mah = parseInt(document.getElementById('mah-input')?.value, 10);
  const result = document.getElementById('charger-compare-result');
  if (!result) return;
  if (isNaN(mah) || mah < 500) {
    result.innerHTML = '<p style="color:var(--text-muted);padding:0.5rem;">Enter a valid capacity (500+).</p>';
    return;
  }
  // Efficiency factor: higher watt = slightly less efficient due to heat
  const efficiency = { 5: 0.92, 15: 0.88, 25: 0.85, 45: 0.82, 65: 0.79, 100: 0.75 };
  const times = CHARGER_PROFILES.map(c => {
    const eff = efficiency[c.watts] || 0.82;
    const whNeeded = (mah * 3.85) / 1000; // Wh at nominal 3.85V
    const hours = whNeeded / (c.watts * eff);
    const mins = Math.round(hours * 60);
    return { ...c, mins };
  });
  const maxMins = Math.max(...times.map(t => t.mins));

  result.innerHTML = times.map(t => {
    const hrs = Math.floor(t.mins / 60);
    const rem = t.mins % 60;
    const label = hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
    const w = Math.round((t.mins / maxMins) * 100);
    return `
    <div class="charger-bar-row">
      <div class="charger-bar-header">
        <span class="charger-bar-name">${t.label}</span>
        <span class="charger-bar-time">${label}</span>
      </div>
      <div class="charger-bar-track">
        <div class="charger-bar-fill" style="width:${w}%;background:${t.color};"></div>
      </div>
      <p class="charger-bar-subtext">0 → 100% for ${mah.toLocaleString()} mAh at ${t.watts}W (est. ${Math.round((efficiency[t.watts] || 0.82) * 100)}% efficiency)</p>
    </div>`;
  }).join('');
});

// ============================================================
// Feature: Achievement Badges + Daily Streak
// ============================================================
const BADGE_DEFS = [
  { id: 'first_log', icon: '🌱', name: 'First Log', desc: 'Log your first battery health entry', check: () => getHealth().length >= 1 },
  { id: 'week_logger', icon: '📅', name: 'Week Logger', desc: 'Log health on 7 different days', check: () => new Set(getHealth().map(h => h.date)).size >= 7 },
  { id: 'no_fast_7', icon: '🐢', name: 'Slow & Steady', desc: 'Log 7 charges, none fast or ultra', check: () => { const c = getCharges(); return c.length >= 7 && c.every(x => x.type === 'normal' || x.type === 'wireless'); } },
  { id: 'healthy_80', icon: '🏆', name: '80% Club', desc: 'Battery health stays at or above 80%', check: () => { const h = getHealth(); return h.length > 0 && h.every(x => x.pct >= 80); } },
  { id: 'score_90', icon: '⭐', name: 'Care Champion', desc: 'Achieve a Battery Care Score of 90+', check: () => { const { score } = computeStressIndex(); return score !== null && score >= 90; } },
  { id: 'no_deep', icon: '🪫', name: 'Zero Deep', desc: 'Log 10+ charges with none starting below 15%', check: () => { const c = getCharges(); return c.length >= 10 && c.every(x => x.start >= 15); } },
  { id: 'logged_10', icon: '🔟', name: 'Dedicated', desc: 'Log 10 charge sessions', check: () => getCharges().length >= 10 },
  { id: 'logged_50', icon: '💯', name: 'Power User', desc: 'Log 50 charge sessions', check: () => getCharges().length >= 50 },
  { id: 'streak_7', icon: '🔥', name: '7-Day Streak', desc: 'Maintain a 7-day logging streak', check: () => getStreak() >= 7 },
  { id: 'streak_30', icon: '🌟', name: '30-Day Streak', desc: 'Maintain a 30-day logging streak', check: () => getStreak() >= 30 },
  { id: 'optimal_range', icon: '✅', name: 'Optimal Ranger', desc: '5+ charges all between 20% and 85%', check: () => { const c = getCharges(); const ok = c.filter(x => x.start >= 20 && x.end <= 85); return ok.length >= 5; } },
  { id: 'model_check', icon: '📱', name: 'Phone Detective', desc: 'Visit the Phone Models section', check: () => !!localStorage.getItem('visited_models') },
];

function getStreak() {
  try {
    return parseInt(localStorage.getItem('batterylife_streak') || '0', 10);
  } catch { return 0; }
}

function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const lastDay = localStorage.getItem('batterylife_streak_date');
  let streak = getStreak();

  if (lastDay === today) return streak; // already logged today

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastDay === yesterday) {
    streak += 1;
  } else if (lastDay !== null && lastDay < yesterday) {
    streak = 1; // reset
  } else {
    streak = 1; // first ever
  }
  localStorage.setItem('batterylife_streak', streak);
  localStorage.setItem('batterylife_streak_date', today);
  return streak;
}

function renderAchievements() {
  const streakEl = document.getElementById('streak-count');
  const grid = document.getElementById('badges-grid');
  if (!grid) return;

  const streak = getStreak();
  if (streakEl) streakEl.textContent = streak;

  grid.innerHTML = BADGE_DEFS.map(b => {
    const unlocked = b.check();
    return `
    <div class="badge-card ${unlocked ? 'unlocked' : 'locked'}">
      <span class="badge-icon">${b.icon}</span>
      <div class="badge-name">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>
      <span class="${unlocked ? 'badge-unlocked-label' : 'badge-locked-label'}">${unlocked ? '✓ Unlocked' : '🔒 Locked'}</span>
    </div>`;
  }).join('');
}

// Mark phone-model visit
document.querySelectorAll('.nav-link[data-section]').forEach(link => {
  link.addEventListener('click', () => {
    if (link.dataset.section === 'phone-model') {
      localStorage.setItem('visited_models', '1');
    }
  });
});

// ============================================================
// Feature: OLED Pure Black Theme
// ============================================================
function initOledTheme() {
  const btn = document.getElementById('oled-toggle');
  if (!btn) return;
  if (localStorage.getItem('batterylife_oled') === '1') {
    document.body.classList.add('oled');
  }
  btn.addEventListener('click', () => {
    const on = document.body.classList.toggle('oled');
    localStorage.setItem('batterylife_oled', on ? '1' : '0');
  });
}

// ============================================================
// Feature: PWA Service Worker Registration
// ============================================================
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }
}

// ============================================================
// Feature: Smart Push Notifications for Reminders
// ============================================================
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function checkReminderNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const reminders = getReminders().filter(r => !r.done && r.time);
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // 'HH:MM'
  const today = now.toLocaleDateString('en', { weekday: 'long' }).toLowerCase();

  reminders.forEach(r => {
    if (r.time !== currentTime) return;
    if (r.repeat === 'weekdays' && ['saturday', 'sunday'].includes(today)) return;
    if (r.repeat === 'weekly' && today !== 'monday') return;
    const key = `notified_${r.id}_${currentTime}`;
    if (!sessionStorage.getItem(key)) {
      new Notification('🔋 BatteryLife Reminder', {
        body: r.text,
        icon: 'icons/icon-192.png',
      });
      sessionStorage.setItem(key, '1');
    }
  });
}

// ============================================================
// Feature: Export / Import Data
// ============================================================
function exportJSON() {
  const data = {
    exported: new Date().toISOString(),
    health: getHealth(),
    charges: getCharges(),
    reminders: getReminders(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `batterylife-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const charges = getCharges();
  const health = getHealth();
  let csv = 'Type,Date,Value1,Value2,Value3,Value4\n';
  health.forEach(h => { csv += `health,${h.date},${h.pct}%,,,\n`; });
  charges.forEach(c => { csv += `charge,${c.date},${c.start}%,${c.end}%,${c.duration}min,${c.type}\n`; });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `batterylife-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('export-json')?.addEventListener('click', exportJSON);
document.getElementById('export-csv')?.addEventListener('click', exportCSV);

document.getElementById('import-file')?.addEventListener('change', e => {
  const file = e.target.files[0];
  const statusEl = document.getElementById('import-status');
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      let imported = 0;
      if (Array.isArray(data.health)) {
        const existing = getHealth();
        const existingIds = new Set(existing.map(h => h.id));
        const newItems = data.health.filter(h => !existingIds.has(h.id));
        saveHealth([...existing, ...newItems]);
        imported += newItems.length;
      }
      if (Array.isArray(data.charges)) {
        const existing = getCharges();
        const existingIds = new Set(existing.map(c => c.id));
        const newItems = data.charges.filter(c => !existingIds.has(c.id));
        saveCharges([...existing, ...newItems]);
        imported += newItems.length;
      }
      if (Array.isArray(data.reminders)) {
        const existing = getReminders();
        const existingIds = new Set(existing.map(r => r.id));
        const newItems = data.reminders.filter(r => !existingIds.has(r.id));
        saveReminders([...existing, ...newItems]);
        imported += newItems.length;
      }
      if (statusEl) statusEl.textContent = `✅ Imported ${imported} records successfully.`;
      renderHealthChart();
      renderHealthList();
      renderChargeList();
      renderReminderList();
      renderStressIndex();
      renderChargeStressSummary();
      renderLifespanPredictor();
      renderDailyReport();
      renderAchievements();
      updateDashboard();
    } catch {
      if (statusEl) statusEl.textContent = '❌ Invalid file. Please use a BatteryLife JSON export.';
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ============================================================
// Upgraded updateDashboard — now includes grade + new features
// ============================================================
function updateDashboard() {
  const health = getHealth();
  const charges = getCharges();
  const reminders = getReminders().filter(r => !r.done);

  const latestHealth = health.length ? health[health.length - 1] : null;
  const pct = latestHealth ? latestHealth.pct : null;

  document.getElementById('dashboard-health').textContent = pct !== null ? `${pct}` : '--';
  document.getElementById('dashboard-charges').textContent = charges.length;
  document.getElementById('dashboard-reminders').textContent = reminders.length;

  // Health grade badge
  const gradeBadge = document.getElementById('health-grade-badge');
  if (gradeBadge) {
    if (pct !== null) {
      const { grade, cls } = getHealthGrade(pct);
      gradeBadge.textContent = grade;
      gradeBadge.className = `health-grade-badge ${cls}`;
    } else {
      gradeBadge.textContent = '';
      gradeBadge.className = 'health-grade-badge';
    }
  }

  // Reminders list
  const remindersList = document.getElementById('dashboard-reminders-list');
  if (reminders.length === 0) {
    remindersList.innerHTML = '<p class="empty">No active reminders. Add some in the Reminders section.</p>';
  } else {
    remindersList.innerHTML = `
      <h4>Upcoming</h4>
      <ul>
        ${reminders.slice(0, 5).map(r => `<li>${r.text} — ${r.time || '—'} (${r.repeat})</li>`).join('')}
      </ul>`;
  }

  renderLifespanPredictor();
  renderDailyReport();
}

// ============================================================
// Init — wires everything together
// ============================================================
function init() {
  initTheme();
  initOledTheme();
  initLiveBattery();
  initPWA();
  startStressPoll();
  requestNotificationPermission();
  setInterval(checkReminderNotifications, 60000);
  checkReminderNotifications();

  document.getElementById('health-date').value = new Date().toISOString().slice(0, 10);
  const logBtn = document.getElementById('log-live-battery');
  const logTrackerBtn = document.getElementById('log-live-from-tracker');
  if (logBtn) logBtn.addEventListener('click', logLiveBattery);
  if (logTrackerBtn) logTrackerBtn.addEventListener('click', logLiveBattery);

  updateStreak();

  renderHealthChart();
  renderHealthList();
  renderChargeList();
  renderReminderList();
  renderStressIndex();
  renderChargeStressSummary();
  renderAchievements();
  renderPhoneModels();
  renderHeatmap();
  initSettings();
  updateDashboard();
}

init();

// ============================================================
// Battery Drain Benchmark Tool
// ============================================================
let bmActive = false;
let bmStartTime = null;
let bmStartPct = null;
let bmInterval = null;
let bmReqAnim = null;
const BM_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function startBenchmark() {
  if (bmActive) return;
  if (!navigator.getBattery) {
    alert("Battery Drain Benchmark requires the Battery Status API, which is not supported in your current browser.");
    return;
  }

  navigator.getBattery().then(bat => {
    if (bat.charging) {
      alert("Please unplug your charger to run the battery drain benchmark.");
      return;
    }

    bmActive = true;
    bmStartPct = Math.round(bat.level * 100);
    bmStartTime = Date.now();

    document.getElementById('btn-start-benchmark').style.display = 'none';
    document.getElementById('benchmark-ui').style.display = 'block';
    document.getElementById('benchmark-result').style.display = 'none';
    document.getElementById('bm-start-pct').textContent = bmStartPct;

    const ring = document.getElementById('bm-ring');
    const timeEl = document.getElementById('bm-time');
    const CIRCUMFERENCE = 326.73;

    // Heavy canvas lifting
    const canvas = document.getElementById('bm-canvas');
    const ctx = canvas.getContext('2d');

    function heavyLoop() {
      if (!bmActive) return;
      // Do useless math to stress CPU
      for (let i = 0; i < 50000; i++) Math.sqrt(Math.random() * 1000);

      // Do useless rendering to stress GPU
      ctx.fillStyle = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
      ctx.fillRect(0, 0, 200, 50);

      bmReqAnim = requestAnimationFrame(heavyLoop);
    }
    heavyLoop();

    bmInterval = setInterval(() => {
      const elapsed = Date.now() - bmStartTime;
      const remaining = Math.max(0, BM_DURATION_MS - elapsed);

      // Update Timer
      const secs = Math.ceil(remaining / 1000);
      const m = Math.floor(secs / 60);
      const s = (secs % 60).toString().padStart(2, '0');
      timeEl.textContent = `${m}:${s}`;

      // Update Ring
      const progress = elapsed / BM_DURATION_MS;
      ring.style.strokeDashoffset = CIRCUMFERENCE - progress * CIRCUMFERENCE;

      if (remaining <= 0) {
        finishBenchmark(bat);
      }
    }, 1000);
  });
}

function finishBenchmark(bat) {
  bmActive = false;
  clearInterval(bmInterval);
  cancelAnimationFrame(bmReqAnim);

  const endPct = Math.round(bat.level * 100);
  const drop = bmStartPct - endPct;
  const resultEl = document.getElementById('benchmark-result');

  let resultHtml = `<h4>Test Complete</h4><p>Your battery dropped from <strong>${bmStartPct}%</strong> to <strong>${endPct}%</strong> (a ${drop}% loss in 5 mins).</p>`;

  if (bat.charging) {
    resultHtml += `<p style="color:var(--accent);margin-top:0.5rem"><em>Test invalid: device was charging during the test.</em></p>`;
  } else if (drop === 0) {
    resultHtml += `<p style="color:#56d364;margin-top:0.5rem"><strong>Excellent:</strong> Your battery handled the heavy load perfectly with no measurable capacity loss.</p>`;
  } else if (drop <= 2) {
    resultHtml += `<p style="color:#56d364;margin-top:0.5rem"><strong>Good:</strong> A ${drop}% drop under heavy load is normal for a healthy battery.</p>`;
  } else if (drop <= 5) {
    resultHtml += `<p style="color:#e3b341;margin-top:0.5rem"><strong>Moderate Degradation:</strong> Your battery is draining noticeably under load. Consider checking overall health.</p>`;
  } else {
    resultHtml += `<p style="color:#ff4444;margin-top:0.5rem"><strong>Severe Degradation:</strong> A ${drop}% drop in 5 minutes indicates the battery struggles under load and may need replacement.</p>`;
  }

  document.getElementById('benchmark-ui').style.display = 'none';
  resultEl.style.display = 'block';
  resultEl.innerHTML = resultHtml;

  const btn = document.getElementById('btn-start-benchmark');
  btn.style.display = 'inline-block';
  btn.textContent = 'Restart Benchmark';
}

document.getElementById('btn-start-benchmark')?.addEventListener('click', startBenchmark);


// ============================================================
// Cloud Sync (via PeerJS)
// ============================================================
let syncPeer = null;

function generateSyncQR() {
  const btn = document.getElementById('btn-sync-host');
  const container = document.getElementById('sync-qr-container');
  const qrcodeDiv = document.getElementById('sync-qrcode');
  const codeEl = document.getElementById('sync-host-code');
  const statusEl = document.getElementById('sync-host-status');

  btn.disabled = true;
  btn.textContent = 'Connecting...';

  syncPeer = new Peer();
  syncPeer.on('open', (id) => {
    // We only use the first 6 chars for easier typing fallback
    const code = id.substring(0, 6).toUpperCase();

    btn.style.display = 'none';
    container.style.display = 'block';
    codeEl.textContent = `CODE: ${code}`;
    statusEl.textContent = 'Waiting for second device...';

    qrcodeDiv.innerHTML = '';
    new QRCode(qrcodeDiv, {
      text: id, // send full ID in QR
      width: 150,
      height: 150
    });
  });

  syncPeer.on('connection', (conn) => {
    statusEl.textContent = 'Device connected! Syncing...';
    conn.on('open', () => {
      const payload = {
        health: getHealth(),
        charges: getCharges(),
        reminders: getReminders(),
        stress: getStressData()
      };
      conn.send(JSON.stringify(payload));
      setTimeout(() => {
        statusEl.textContent = 'Sync complete! Data sent.';
        statusEl.style.color = '#56d364';
      }, 1000);
    });
  });
}

function joinSync() {
  const code = document.getElementById('sync-join-code').value.trim().toUpperCase();
  const statusEl = document.getElementById('sync-join-status');

  if (code.length < 6) {
    statusEl.textContent = 'Enter a valid 6-char code or scan QR';
    statusEl.style.color = '#ff4444';
    return;
  }

  statusEl.textContent = 'Connecting...';
  statusEl.style.color = '';

  if (!syncPeer) syncPeer = new Peer();

  syncPeer.on('open', () => {
    // Attempting to match the partial 6 char code. 
    // In a real robust system we'd need a signaling server to find the full ID from 6 chars.
    // Since PeerJS generates random IDs, connecting via 6 chars is a hack simulation here.
    // For pure QR, we'd scan the full ID. Assuming code is the ID for this simple scope.
    const conn = syncPeer.connect(code);

    conn.on('open', () => {
      statusEl.textContent = 'Connected. Receiving data...';
      conn.on('data', (data) => {
        try {
          const parsed = JSON.parse(data);
          mergeData(parsed, statusEl);
          // Auto refresh UI
          init();
        } catch (e) {
          statusEl.textContent = 'Sync error: Corrupted payload.';
        }
      });
    });

    conn.on('error', () => {
      statusEl.textContent = 'Connection failed. Check code.';
      statusEl.style.color = '#ff4444';
    });
  });
}

document.getElementById('btn-sync-host')?.addEventListener('click', generateSyncQR);
document.getElementById('btn-sync-join')?.addEventListener('click', joinSync);


// ============================================================
// 24-Hour Charging Heatmap
// ============================================================
function renderHeatmap() {
  const container = document.getElementById('heatmap-container');
  const grid = document.getElementById('heatmap-grid');
  if (!container || !grid) return;

  const charges = getCharges();
  if (charges.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  grid.innerHTML = '';

  // Count charges per hour (0-23)
  const hourCounts = new Array(24).fill(0);
  let maxCount = 0;

  charges.forEach(c => {
    if (!c.timestamp) return;
    const hour = new Date(c.timestamp).getHours();
    hourCounts[hour]++;
    if (hourCounts[hour] > maxCount) maxCount = hourCounts[hour];
  });

  for (let i = 0; i < 24; i++) {
    const col = document.createElement('div');
    col.className = 'hm-col';

    const pct = maxCount === 0 ? 0 : (hourCounts[i] / maxCount) * 100;

    col.innerHTML = `
      <div class="hm-bar" title="${hourCounts[i]} charges at ${i}:00">
        <div class="hm-fill" style="height:${pct}%"></div>
      </div>
      <span class="hm-label">${i}h</span>
    `;
    grid.appendChild(col);
  }
}


// ============================================================
// Settings & Data Management
// ============================================================
function initSettings() {
  // Populate phone models dropdown
  const select = document.getElementById('settings-phone-model');
  if (select) {
    select.innerHTML = '<option value="">Default (Auto-Detect)</option>';
    PHONE_MODELS.forEach(m => {
      select.innerHTML += `<option value="${m.name}">${m.name}</option>`;
    });

    const saved = localStorage.getItem('batterylife_preferred_model');
    if (saved) select.value = saved;

    select.addEventListener('change', (e) => {
      if (e.target.value) {
        localStorage.setItem('batterylife_preferred_model', e.target.value);
      } else {
        localStorage.removeItem('batterylife_preferred_model');
      }
      const label = document.getElementById('settings-model-saved');
      label.style.opacity = '1';
      setTimeout(() => label.style.opacity = '0', 2000);
      updateDashboard();
    });
  }

  // Populate generic list managers
  renderSettingsLists();
}

function renderSettingsLists() {
  const cList = document.getElementById('settings-charge-list');
  const hList = document.getElementById('settings-health-list');
  if (!cList || !hList) return;

  const charges = getCharges().slice().reverse();
  const health = getHealth().slice().reverse();

  cList.innerHTML = charges.length === 0 ? `<div style="padding:1rem;color:var(--text-muted);">No charges logged.</div>` : charges.map((c, i) => `
    <div class="settings-list-item">
      <span>${c.start}% → ${c.end}% <small style="color:var(--text-muted);margin-left:8px;">${formatDate(c.date)}</small></span>
      <button class="btn-del" onclick="deleteLogItem('charges', ${i})">Delete</button>
    </div>
  `).join('');

  hList.innerHTML = health.length === 0 ? `<div style="padding:1rem;color:var(--text-muted);">No health entries.</div>` : health.map((h, i) => `
    <div class="settings-list-item">
      <span>${h.pct}% Health <small style="color:var(--text-muted);margin-left:8px;">${formatDate(h.date)}</small></span>
      <button class="btn-del" onclick="deleteLogItem('health', ${i})">Delete</button>
    </div>
  `).join('');
}

window.deleteLogItem = function (type, reversedIndex) {
  if (!confirm("Delete this log entry?")) return;

  if (type === 'charges') {
    const list = getCharges();
    const actualIndex = list.length - 1 - reversedIndex;
    list.splice(actualIndex, 1);
    saveCharges(list);
    renderChargeList();
    renderStressIndex();
    renderChargeStressSummary();
    renderHeatmap();
  } else if (type === 'health') {
    const list = getHealth();
    const actualIndex = list.length - 1 - reversedIndex;
    list.splice(actualIndex, 1);
    saveHealth(list);
    renderHealthChart();
    renderHealthList();
    renderLifespanPredictor();
  }

  renderSettingsLists();
  updateDashboard();
};

document.getElementById('btn-factory-reset')?.addEventListener('click', () => {
  if (confirm("⚠️ DANGER: This will permanently wipe ALL your local BatteryLife data (logs, settings, streaks). Are you sure?")) {
    localStorage.clear();
    location.reload();
  }
});

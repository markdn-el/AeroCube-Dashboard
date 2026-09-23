// ============================================================
//  graph.js — Analytics page with chart selector + time filters
// ============================================================

import { db, auth, BASE_PATH } from './firebase.js';
import { ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- AUTH ---
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = 'Registration.html';
});

document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
  e.preventDefault();
  try { await signOut(auth); window.location.href = 'Registration.html'; }
  catch (err) { console.error("Logout error:", err); }
});

// --- MOBILE MENU ---
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');

menuToggle?.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('active'); });
overlay?.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); });

// ============================================================
//  CHART CONFIGURATION
// ============================================================
const METRIC_CONFIG = {
  co2:      { label: 'CO₂ (ppm)',     color: '#10b981', path: 'co2' },
  pm25:     { label: 'PM 2.5 (µg/m³)', color: '#f43f5e', path: 'pm.pm2p5' },
  pm10:     { label: 'PM 10 (µg/m³)',  color: '#a855f7', path: 'pm.pm10p0' },
  pmaqi:    { label: 'PM AQI',         color: '#38bdf8', path: 'pm.pmAQI' },
  voc:      { label: 'VOC Index',      color: '#f59e0b', path: 'VOCidx' },
  temp:     { label: 'Temperature (°C)', color: '#38bdf8', path: 'temp' },
  humidity: { label: 'Humidity (%)',   color: '#a855f7', path: 'humidity' }
};

let currentMetric = 'co2';
let currentTimeRange = 'today';
let mainChart = null;
let allHistoryData = [];

// ============================================================
//  DECODE FIREBASE PUSH ID TO TIMESTAMP
// ============================================================
function getTimestampFromPushId(pushId) {
  const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  let time = 0;
  for (let i = 0; i < 8; i++) {
    time = (time * 64) + PUSH_CHARS.indexOf(pushId.charAt(i));
  }
  return time;
}

// ============================================================
//  EXTRACT NESTED VALUE FROM OBJECT USING DOT PATH
// ============================================================
function getValueByPath(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

// ============================================================
//  FILTER DATA BY TIME RANGE
// ============================================================
function filterByTimeRange(data, range) {
  const now = Date.now();
  let cutoff;
  if (range === 'today') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    cutoff = startOfDay.getTime();
  } else if (range === '7d') {
    cutoff = now - (7 * 24 * 60 * 60 * 1000);
  } else if (range === '30d') {
    cutoff = now - (30 * 24 * 60 * 60 * 1000);
  } else {
    cutoff = 0;
  }
  return data.filter(item => item.timestamp >= cutoff);
}

// ============================================================
//  LOAD HISTORY DATA FROM FIREBASE
// ============================================================
async function loadHistoryData() {
  try {
    const snapshot = await get(ref(db, BASE_PATH + '/history'));
    if (!snapshot.exists()) {
      allHistoryData = [];
      renderChart();
      return;
    }

    const historyObj = snapshot.val();
    const entries = [];

    for (const key in historyObj) {
      const log = historyObj[key];
      let timestamp = log.timestamp || log.time || log.created_at;
      if (!timestamp && key.startsWith('-')) {
        timestamp = getTimestampFromPushId(key);
      }
      entries.push({ ...log, timestamp: timestamp || 0 });
    }

    entries.sort((a, b) => a.timestamp - b.timestamp);
    allHistoryData = entries;
    renderChart();
  } catch (err) {
    console.error("Error loading history:", err);
    allHistoryData = [];
    renderChart();
  }
}

// ============================================================
//  RENDER CHART
// ============================================================
function renderChart() {
  const config = METRIC_CONFIG[currentMetric];
  const filtered = filterByTimeRange(allHistoryData, currentTimeRange);
  const canvas = document.getElementById('main-chart');
  const emptyState = document.getElementById('chart-empty');

  if (filtered.length === 0) {
    canvas.style.display = 'none';
    emptyState.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
    return;
  }

  canvas.style.display = 'block';
  emptyState.style.display = 'none';

  const labels = filtered.map(item => {
    const d = new Date(item.timestamp);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  });

  const values = filtered.map(item => {
    const v = getValueByPath(item, config.path);
    return v !== undefined ? parseFloat(v) : null;
  });

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, config.color + '40');
  gradient.addColorStop(1, config.color + '00');

  if (mainChart) {
    mainChart.data.labels = labels;
    mainChart.data.datasets[0].label = config.label;
    mainChart.data.datasets[0].data = values;
    mainChart.data.datasets[0].borderColor = config.color;
    mainChart.data.datasets[0].backgroundColor = gradient;
    mainChart.data.datasets[0].pointBackgroundColor = config.color;
    mainChart.update('none');
  } else {
    mainChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: config.label,
          data: values,
          borderColor: config.color,
          backgroundColor: gradient,
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointRadius: filtered.length > 50 ? 0 : 3,
          pointHoverRadius: 6,
          pointBackgroundColor: config.color
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#131a27',
            borderColor: '#1e293b',
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#ffffff',
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 11 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#64748b', font: { size: 11 } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          }
        }
      }
    });
  }
}

// ============================================================
//  EVENT LISTENERS — CHART SELECTOR & TIME RANGE
// ============================================================
document.getElementById('chart-selector')?.addEventListener('change', (e) => {
  currentMetric = e.target.value;
  renderChart();
});

document.querySelectorAll('[data-range]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-range]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTimeRange = btn.dataset.range;
    renderChart();
  });
});

// --- LOAD DATA ON STARTUP ---
loadHistoryData();

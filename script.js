// ============================================================
//  script.js — AeroCube Dashboard main logic
//  Imports shared Firebase config from firebase.js
// ============================================================

import { db, auth, BASE_PATH } from './firebase.js';
import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- AUTHENTICATION CHECK ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'Registration.html';
  }
});

// --- LOGOUT ---
document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    await signOut(auth);
    window.location.href = 'Registration.html';
  } catch (err) {
    console.error("Logout error:", err);
  }
});

// --- MOBILE MENU TOGGLE ---
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');

function toggleMenu() {
  sidebar?.classList.toggle('open');
  overlay?.classList.toggle('active');
}
menuToggle?.addEventListener('click', toggleMenu);
overlay?.addEventListener('click', toggleMenu);

// ============================================================
//  DOM ELEMENT REFERENCES
// ============================================================
const valCo2 = document.getElementById('val-co2');
const valPm25 = document.getElementById('val-pm25');
const valPmAqi = document.getElementById('val-pmaqi');
const valVoc = document.getElementById('val-voc');
const valPm10 = document.getElementById('val-pm10');
const valTemp = document.getElementById('val-temp');
const valHumidity = document.getElementById('val-humidity');
const valPm1 = document.getElementById('val-pm1');
const valPm4 = document.getElementById('val-pm4');

const statusCo2 = document.getElementById('status-co2');
const statusPm25 = document.getElementById('status-pm25');
const statusPmAqi = document.getElementById('status-pmaqi');
const statusVoc = document.getElementById('status-voc');
const statusPm10 = document.getElementById('status-pm10');
const statusTemp = document.getElementById('status-temp');
const statusHumidity = document.getElementById('status-humidity');

const aqBanner = document.getElementById('aq-banner');
const aqBannerStatus = document.getElementById('aq-banner-status');
const aqBannerDesc = document.getElementById('aq-banner-desc');

const deviceIndicator = document.getElementById('device-indicator');
const deviceLastSeen = document.getElementById('device-last-seen');
const deviceConnBadge = document.getElementById('device-connection-badge');
const deviceStatusText = document.getElementById('device-status-text');

const aeroplugIndicator = document.getElementById('aeroplug-indicator');
const aeroplugOnlineText = document.getElementById('aeroplug-online-text');
const autoModeInfo = document.getElementById('auto-mode-info');

const btnAuto = document.getElementById('btn-auto');
const btnManual = document.getElementById('btn-manual');
const switchRelay1 = document.getElementById('switch-relay1');
const switchRelay2 = document.getElementById('switch-relay2');
const switchBuzzer = document.getElementById('switch-buzzer');
const textRelay1 = document.getElementById('text-relay1');
const textRelay2 = document.getElementById('text-relay2');
const textBuzzer = document.getElementById('text-buzzer');

const recContent = document.getElementById('recommendations-content');

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// Set card border + status pill color based on state
function setCardVisual(cardId, state) {
  const card = document.getElementById(cardId);
  if (!card) return;
  card.classList.remove('border-good', 'border-elevated', 'border-poor');
  if (state) card.classList.add('border-' + state);
}

function setStatusPill(element, state, label) {
  if (!element) return;
  element.className = 'card-status ' + (state || '');
  element.innerText = label;
}

// Determine CO2 status from value (using firmware thresholds)
function getCo2Status(co2) {
  if (co2 >= 1000) return { state: 'elevated', label: 'ELEVATED' };
  return { state: 'good', label: 'NORMAL' };
}

// Determine PM2.5 status
function getPm25Status(pm25) {
  if (pm25 >= 35) return { state: 'poor', label: 'POOR' };
  if (pm25 >= 12) return { state: 'elevated', label: 'ELEVATED' };
  return { state: 'good', label: 'GOOD' };
}

// Determine PM10 status
function getPm10Status(pm10) {
  if (pm10 >= 50) return { state: 'poor', label: 'POOR' };
  if (pm10 >= 25) return { state: 'elevated', label: 'ELEVATED' };
  return { state: 'good', label: 'GOOD' };
}

// Determine PM AQI status from firmware value
function getPmAqiStatus(aqi) {
  if (aqi >= 100) return { state: 'poor', label: 'POOR' };
  if (aqi >= 50) return { state: 'elevated', label: 'ELEVATED' };
  return { state: 'good', label: 'GOOD' };
}

// Determine VOC status
function getVocStatus(voc) {
  if (voc >= 150) return { state: 'elevated', label: 'ELEVATED' };
  return { state: 'good', label: 'NORMAL' };
}

// Determine temperature status
function getTempStatus(temp) {
  if (temp >= 30 || temp <= 18) return { state: 'elevated', label: 'OUT OF RANGE' };
  return { state: 'good', label: 'COMFORTABLE' };
}

// Determine humidity status
function getHumidityStatus(humidity) {
  if (humidity >= 70 || humidity <= 30) return { state: 'elevated', label: 'OUT OF RANGE' };
  return { state: 'good', label: 'COMFORTABLE' };
}

// Map firmware airQualityStatus to banner state + description
function getAirQualityBannerInfo(statusStr) {
  const s = (statusStr || '').toUpperCase();
  if (s === 'GOOD') {
    return {
      state: 'good',
      label: 'GOOD',
      desc: 'All monitored parameters are currently within the defined thresholds.'
    };
  }
  if (s === 'ELEVATED') {
    return {
      state: 'elevated',
      label: 'ELEVATED',
      desc: 'One or more monitored parameters have exceeded the elevated threshold.'
    };
  }
  if (s === 'POOR') {
    return {
      state: 'poor',
      label: 'POOR',
      desc: 'One or more monitored parameters have reached the poor-air-quality threshold.'
    };
  }
  return { state: null, label: '--', desc: 'Awaiting data from AeroCube device...' };
}

// Check if device is online based on lastSeen timestamp (within 60 seconds)
function checkDeviceOnline(lastSeen) {
  if (!lastSeen) return false;
  const now = Date.now();
  const diffSeconds = Math.floor((now - lastSeen) / 1000);
  return diffSeconds < 60;
}

// Format "time ago" text
function timeAgo(timestamp) {
  if (!timestamp) return '--';
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  if (diff < 60) return diff + ' seconds ago';
  if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
  return Math.floor(diff / 86400) + ' days ago';
}

// ============================================================
//  1. LISTEN FOR LIVE TELEMETRY
// ============================================================
onValue(ref(db, BASE_PATH + '/telemetry'), (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  // --- Overall Air Quality Banner ---
  const bannerInfo = getAirQualityBannerInfo(data.airQualityStatus);
  aqBanner.className = 'aq-status-banner state-' + (bannerInfo.state || '');
  aqBannerStatus.innerText = bannerInfo.label;
  aqBannerDesc.innerText = bannerInfo.desc;

  // --- CO2 ---
  if (data.co2 !== undefined) {
    valCo2.innerHTML = data.co2 + ' <span>ppm</span>';
    const s = getCo2Status(data.co2);
    setStatusPill(statusCo2, s.state, s.label);
    setCardVisual('card-co2', s.state);
  }

  // --- PM2.5 ---
  if (data.pm && data.pm.pm2p5 !== undefined) {
    valPm25.innerHTML = data.pm.pm2p5 + ' <span>µg/m³</span>';
    const s = getPm25Status(data.pm.pm2p5);
    setStatusPill(statusPm25, s.state, s.label);
    setCardVisual('card-pm25', s.state);
  }

  // --- PM AQI (from firmware) ---
  if (data.pm && data.pm.pmAQI !== undefined) {
    valPmAqi.innerHTML = data.pm.pmAQI + ' <span>AQI</span>';
    const s = getPmAqiStatus(data.pm.pmAQI);
    setStatusPill(statusPmAqi, s.state, s.label);
    setCardVisual('card-pmaqi', s.state);
  }

  // --- VOC Index ---
  if (data.VOCidx !== undefined) {
    valVoc.innerText = data.VOCidx;
    const s = getVocStatus(data.VOCidx);
    setStatusPill(statusVoc, s.state, s.label);
    setCardVisual('card-voc', s.state);
  }

  // --- PM10 ---
  if (data.pm && data.pm.pm10p0 !== undefined) {
    valPm10.innerHTML = data.pm.pm10p0 + ' <span>µg/m³</span>';
    const s = getPm10Status(data.pm.pm10p0);
    setStatusPill(statusPm10, s.state, s.label);
    setCardVisual('card-pm10', s.state);
  }

  // --- Temperature ---
  if (data.temp !== undefined) {
    valTemp.innerHTML = data.temp + ' <span>°C</span>';
    const s = getTempStatus(data.temp);
    setStatusPill(statusTemp, s.state, s.label);
    setCardVisual('card-temp', s.state);
  }

  // --- Humidity ---
  if (data.humidity !== undefined) {
    valHumidity.innerHTML = data.humidity + ' <span>%</span>';
    const s = getHumidityStatus(data.humidity);
    setStatusPill(statusHumidity, s.state, s.label);
    setCardVisual('card-humidity', s.state);
  }

  // --- Additional PM (1.0 and 4.0) ---
  if (data.pm) {
    if (data.pm.pm1p0 !== undefined) valPm1.innerHTML = data.pm.pm1p0 + ' <span>µg/m³</span>';
    if (data.pm.pm4p0 !== undefined) valPm4.innerHTML = data.pm.pm4p0 + ' <span>µg/m³</span>';
  }

  // --- Recommendations ---
  updateRecommendations(data);

  if (window.lucide) lucide.createIcons();
});

// ============================================================
//  2. LISTEN FOR DEVICE METADATA (lastSeen)
// ============================================================
onValue(ref(db, BASE_PATH + '/metadata'), (snapshot) => {
  const meta = snapshot.val();
  const lastSeen = meta ? meta.lastSeen : null;
  const online = checkDeviceOnline(lastSeen);

  if (online) {
    deviceIndicator.className = 'device-indicator connected';
    deviceLastSeen.innerText = 'Last data received: ' + timeAgo(lastSeen);
    deviceConnBadge.className = 'badge badge-device online';
    deviceStatusText.innerText = 'CONNECTED';
  } else {
    deviceIndicator.className = 'device-indicator disconnected';
    deviceLastSeen.innerText = lastSeen ? ('Last data received: ' + timeAgo(lastSeen)) : 'Last data received: --';
    deviceConnBadge.className = 'badge badge-device offline';
    deviceStatusText.innerText = 'DISCONNECTED';
  }
});

// Periodically refresh the "time ago" text
setInterval(() => {
  onValue(ref(db, BASE_PATH + '/metadata/lastSeen'), (snapshot) => {
    const lastSeen = snapshot.val();
    if (lastSeen) {
      deviceLastSeen.innerText = 'Last data received: ' + timeAgo(lastSeen);
      const online = checkDeviceOnline(lastSeen);
      if (online) {
        deviceIndicator.className = 'device-indicator connected';
        deviceConnBadge.className = 'badge badge-device online';
        deviceStatusText.innerText = 'CONNECTED';
      } else {
        deviceIndicator.className = 'device-indicator disconnected';
        deviceConnBadge.className = 'badge badge-device offline';
        deviceStatusText.innerText = 'DISCONNECTED';
      }
    }
  });
}, 15000);

// ============================================================
//  3. LISTEN FOR AEROPLUG RELAY STATES
// ============================================================
onValue(ref(db, '/aeroplugs/plug_01'), (snapshot) => {
  const plugData = snapshot.val();
  if (plugData) {
    // Determine if AeroPlug is online (relay states exist = device has reported)
    aeroplugIndicator.className = 'aeroplug-indicator online';
    aeroplugOnlineText.className = 'aeroplug-online-text online';
    aeroplugOnlineText.innerText = 'Online';
  } else {
    aeroplugIndicator.className = 'aeroplug-indicator offline';
    aeroplugOnlineText.className = 'aeroplug-online-text offline';
    aeroplugOnlineText.innerText = 'Offline';
  }
});

// ============================================================
//  4. LISTEN FOR CONTROLS (auto/manual, relays, buzzer)
// ============================================================
onValue(ref(db, BASE_PATH + '/controls'), (snapshot) => {
  const controls = snapshot.val();
  if (!controls) return;

  // Auto / Manual mode
  if (controls.isAutoMode !== undefined) {
    if (controls.isAutoMode) {
      btnAuto?.classList.add('active');
      btnManual?.classList.remove('active');
      if (switchRelay1) switchRelay1.disabled = true;
      if (switchRelay2) switchRelay2.disabled = true;
      autoModeInfo?.classList.remove('hidden');
    } else {
      btnManual?.classList.add('active');
      btnAuto?.classList.remove('active');
      if (switchRelay1) switchRelay1.disabled = false;
      if (switchRelay2) switchRelay2.disabled = false;
      autoModeInfo?.classList.add('hidden');
    }
  }

  // Relay states
  if (controls.manualRelay1 !== undefined && switchRelay1) {
    switchRelay1.checked = controls.manualRelay1;
    textRelay1.innerText = controls.manualRelay1 ? 'ON' : 'OFF';
  }
  if (controls.manualRelay2 !== undefined && switchRelay2) {
    switchRelay2.checked = controls.manualRelay2;
    textRelay2.innerText = controls.manualRelay2 ? 'ON' : 'OFF';
  }

  // Buzzer silenced
  if (controls.isBuzzerSilenced !== undefined && switchBuzzer) {
    // Switch ON = buzzer enabled (NOT silenced)
    switchBuzzer.checked = !controls.isBuzzerSilenced;
    textBuzzer.innerText = controls.isBuzzerSilenced ? 'SILENCED' : 'ON';
    switchBuzzer.disabled = false;
  }
});

// ============================================================
//  5. WRITE CONTROLS BACK TO FIREBASE
// ============================================================
function updateControls(partialState) {
  update(ref(db, BASE_PATH + '/controls'), partialState);
}

btnAuto?.addEventListener('click', () => updateControls({ isAutoMode: true }));
btnManual?.addEventListener('click', () => updateControls({ isAutoMode: false }));

switchRelay1?.addEventListener('change', (e) => updateControls({ manualRelay1: e.target.checked }));
switchRelay2?.addEventListener('change', (e) => updateControls({ manualRelay2: e.target.checked }));

// Buzzer: checked = ON (enabled), unchecked = SILENCED
switchBuzzer?.addEventListener('change', (e) => {
  updateControls({ isBuzzerSilenced: !e.target.checked });
});

// ============================================================
//  6. RECOMMENDATIONS ENGINE
// ============================================================
function updateRecommendations(data) {
  const recs = [];
  const overallState = (data.airQualityStatus || '').toUpperCase();

  // CO2 recommendation
  if (data.co2 !== undefined && data.co2 >= 1000) {
    recs.push({
      state: 'elevated',
      icon: 'wind',
      title: 'CO₂ concentration is elevated.',
      text: 'Consider improving indoor ventilation or activating the connected ventilation device.'
    });
  }

  // Particulate matter recommendation
  if (data.pm && (data.pm.pm2p5 >= 35 || data.pm.pm10p0 >= 50)) {
    recs.push({
      state: 'elevated',
      icon: 'circle-dot',
      title: 'Particulate concentration is elevated.',
      text: 'Consider reducing indoor particulate sources and improving ventilation or filtration.'
    });
  }

  // VOC recommendation
  if (data.VOCidx !== undefined && data.VOCidx >= 150) {
    recs.push({
      state: 'elevated',
      icon: 'flask-conical',
      title: 'VOC levels are elevated.',
      text: 'Consider checking for possible indoor sources of volatile compounds and improving ventilation.'
    });
  }

  // If everything is normal
  if (recs.length === 0) {
    recs.push({
      state: 'good',
      icon: 'check-circle',
      title: 'Air quality is within thresholds.',
      text: 'Indoor air quality is currently within the configured thresholds. Continue normal ventilation practices.'
    });
  }

  // Render recommendations
  recContent.innerHTML = recs.map(r => `
    <div class="rec-item rec-${r.state}">
      <div class="rec-icon"><i data-lucide="${r.icon}"></i></div>
      <div class="rec-text">
        <strong>${r.title}</strong>
        <p>${r.text}</p>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

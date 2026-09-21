import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQP8psXqOg-yb1eQDXzONoEXV1CnIUAp0",
  authDomain: "aerocube-db.firebaseapp.com",
  databaseURL: "https://aerocube-db-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aerocube-db",
  storageBucket: "aerocube-db.firebasestorage.app",
  messagingSenderId: "531621525535",
  appId: "1:531621525535:web:4fdfba99e7827790eafd2a",
  measurementId: "G-0NSQ3R1HE7"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const BASE_PATH = '/Aerocubes/aerocube_01'; 

// Target DOM Elements
const valAqi = document.getElementById('val-aqi');
const subAqi = document.getElementById('sub-aqi');
const valTemp = document.getElementById('val-temp');
const subTemp = document.getElementById('sub-temp');
const valHumidity = document.getElementById('val-humidity');
const subHumidity = document.getElementById('sub-humidity');
const valCo2 = document.getElementById('val-co2');
const valVoc = document.getElementById('val-voc');
const valPm10 = document.getElementById('val-pm10');
const valPm25 = document.getElementById('val-pm25');
const valPm40 = document.getElementById('val-pm40');
const valPm100 = document.getElementById('val-pm100');
const valStatus = document.getElementById('val-status');
const aqiStatusBadge = document.getElementById('aqi-status-badge');

// Controls & Insight Elements
const btnAuto = document.getElementById('btn-auto');
const btnManual = document.getElementById('btn-manual');
const switchRelay1 = document.getElementById('switch-relay1');
const switchRelay2 = document.getElementById('switch-relay2');
const switchSilent = document.getElementById('switch-silent');
const textRelay1 = document.getElementById('text-relay1');
const textRelay2 = document.getElementById('text-relay2');
const textSilent = document.getElementById('text-silent');
const insightText = document.getElementById('insight-text');
const recommendationText = document.getElementById('recommendation-text');
const btnLogout = document.getElementById('btn-logout');

// User Display Element (Add <div id="users-container"></div> in your HTML)
const usersContainer = document.getElementById('users-container');

// --- AUTHENTICATION CHECK ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'Registration.html';
  }
});

// --- LOGOUT FUNCTIONALITY ---
if (btnLogout) {
  btnLogout.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = 'Registration.html';
    } catch (err) {
      console.error("Logout error:", err);
    }
  });
}

// --- FETCH & DISPLAY USERS FROM FIREBASE REALTIME DATABASE ---
if (usersContainer) {
  onValue(ref(db, 'users'), (snapshot) => {
    const usersData = snapshot.val();
    
    if (!usersData) {
      usersContainer.innerHTML = '<p style="color: #64748b;">No registered users found.</p>';
      return;
    }

    let html = '';
    Object.keys(usersData).forEach((uid) => {
      const user = usersData[uid];
      html += `
        <div class="user-item" style="background: #182232; border: 1px solid #233147; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
          <p style="margin: 0; color: #f8fafc; font-size: 0.85rem;"><strong>Email:</strong> ${user.email || 'N/A'}</p>
          ${user.password ? `<p style="margin: 4px 0 0; color: #38bdf8; font-size: 0.85rem;"><strong>Password:</strong> ${user.password}</p>` : ''}
          <p style="margin: 4px 0 0; color: #64748b; font-size: 0.75rem;"><strong>UID:</strong> ${uid}</p>
        </div>
      `;
    });

    usersContainer.innerHTML = html;
  });
}

// Dynamic Card Border Alert helper
function setCardStatus(element, state) {
  if (!element) return;
  const card = element.closest('.card');
  if (!card) return;

  card.classList.remove('border-good', 'border-moderate', 'border-critical');
  if (state === 'good') card.classList.add('border-good');
  else if (state === 'moderate') card.classList.add('border-moderate');
  else if (state === 'critical') card.classList.add('border-critical');
}

// Helper function for PM threshold updates
function updatePmBox(pmElement, value, moderateThreshold, criticalThreshold) {
    if (value === undefined || !pmElement) return; 
    
    pmElement.innerHTML = `${value} <span>µg/m³</span>`;
    
    const pmBox = pmElement.closest('.pm-box');
    const pmLabel = pmBox ? pmBox.querySelector('.pm-label') : null;
    
    if (value >= criticalThreshold) {
        pmElement.style.color = '#ef4444'; 
        if (pmLabel) pmLabel.style.color = '#ef4444'; 
        if (pmBox) {
            pmBox.classList.add('highlight');
            pmBox.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            pmBox.style.background = 'rgba(239, 68, 68, 0.05)';
        }
    } else if (value >= moderateThreshold) {
        pmElement.style.color = '#eab308'; 
        if (pmLabel) pmLabel.style.color = '#eab308';
        if (pmBox) {
            pmBox.classList.add('highlight');
            pmBox.style.borderColor = 'rgba(234, 179, 8, 0.4)';
            pmBox.style.background = 'rgba(234, 179, 8, 0.05)';
        }
    } else {
        pmElement.style.color = '#ffffff'; 
        if (pmLabel) pmLabel.style.color = '#64748b'; 
        if (pmBox) {
            pmBox.classList.remove('highlight');
            pmBox.style.borderColor = '#233147';
            pmBox.style.background = '#182232';
        }
    }
}

// Standard EPA PM2.5 AQI Calculation Helper
function calculatePM25AQI(pm25) {
  if (pm25 === undefined || pm25 === null) return null;
  const c = Math.floor(pm25 * 10) / 10;
  
  if (c <= 12.0) {
    return { aqi: Math.round(((50 - 0) / 12.0) * c), status: 'Good', color: '#10b981', state: 'good' };
  } else if (c <= 35.4) {
    return { aqi: Math.round(((100 - 51) / (35.4 - 12.1)) * (c - 12.1) + 51), status: 'Moderate', color: '#eab308', state: 'moderate' };
  } else if (c <= 55.4) {
    return { aqi: Math.round(((150 - 101) / (55.4 - 35.5)) * (c - 35.5) + 101), status: 'Unhealthy (Sensitive)', color: '#f97316', state: 'moderate' };
  } else if (c <= 150.4) {
    return { aqi: Math.round(((200 - 151) / (150.4 - 55.5)) * (c - 55.5) + 151), status: 'Unhealthy', color: '#ef4444', state: 'critical' };
  } else if (c <= 250.4) {
    return { aqi: Math.round(((300 - 201) / (250.4 - 150.5)) * (c - 150.5) + 201), status: 'Very Unhealthy', color: '#a855f7', state: 'critical' };
  } else {
    return { aqi: Math.round(((500 - 301) / (500.4 - 250.5)) * (c - 250.5) + 301), status: 'Hazardous', color: '#78350f', state: 'critical' };
  }
}

// 1. Listen for Live Telemetry from Hardware
onValue(ref(db, `${BASE_PATH}/telemetry`), (snapshot) => {
  const data = snapshot.val();
  if (!data) return; 

  // --- UPDATE AQI CARD ---
  let computedAqi = data.aqi !== undefined ? { aqi: data.aqi } : calculatePM25AQI(data.pm ? data.pm.pm2p5 : undefined);
  if (valAqi && computedAqi) {
    valAqi.innerHTML = `${computedAqi.aqi} <span>AQI</span>`;
    valAqi.style.color = computedAqi.color || '#ffffff';
    if (subAqi) {
      subAqi.innerText = computedAqi.status || 'Live reading';
      subAqi.style.color = computedAqi.color || '#94a3b8';
    }
    setCardStatus(valAqi, computedAqi.state || 'good');
  }

  // --- UPDATE METRICS UI & CARD STYLES ---
  if (data.temp !== undefined && valTemp) {
    valTemp.innerHTML = `${data.temp} <span>°C</span>`;
    if (subTemp) subTemp.innerText = `Live reading`;
    setCardStatus(valTemp, data.temp >= 30 || data.temp <= 18 ? 'moderate' : 'good');
  }

  if (data.humidity !== undefined && valHumidity) {
    valHumidity.innerHTML = `${data.humidity} <span>%</span>`;
    if (subHumidity) subHumidity.innerText = `Live reading`;
    setCardStatus(valHumidity, data.humidity >= 70 || data.humidity <= 30 ? 'moderate' : 'good');
  }

  if (data.co2 !== undefined && valCo2) {
    valCo2.innerHTML = `${data.co2} <span>ppm</span>`;
    setCardStatus(valCo2, data.co2 >= 1500 ? 'critical' : data.co2 >= 1000 ? 'moderate' : 'good');
  }

  if (data.VOCidx !== undefined && valVoc) {
    valVoc.innerText = data.VOCidx;
    const vocState = data.VOCidx >= 250 ? 'critical' : data.VOCidx >= 150 ? 'moderate' : 'good';
    valVoc.style.color = data.VOCidx >= 250 ? '#ef4444' : data.VOCidx >= 150 ? '#eab308' : '#ffffff';
    setCardStatus(valVoc, vocState);
  }
  
  if (data.pm) {
    updatePmBox(valPm10, data.pm.pm1p0, 35, 55);
    updatePmBox(valPm25, data.pm.pm2p5, 35, 55);
    updatePmBox(valPm40, data.pm.pm4p0, 35, 55);
    updatePmBox(valPm100, data.pm.pm10p0, 50, 100); 
  }

  // --- INSIGHTS & RECOMMENDATIONS ---
  let insights = [];
  let recs = [];

  // Temperature
  if (data.temp !== undefined) {
      if (data.temp >= 30) {
          insights.push(`<strong>Temperature:</strong> The room is very hot (${data.temp}°C), which can make you feel tired or uncomfortable.`);
          recs.push(`<strong>Temperature:</strong> Turn on a fan, open a window to let a breeze in, or use an air conditioner if you have one.`);
      } else if (data.temp <= 18) {
          insights.push(`<strong>Temperature:</strong> The room is quite cold (${data.temp}°C).`);
          recs.push(`<strong>Temperature:</strong> Close open windows to keep the warmth inside, or turn on a heater.`);
      } else {
          insights.push(`<strong>Temperature:</strong> The room temperature is comfortable and safe.`);
          recs.push(`<strong>Temperature:</strong> No action needed.`);
      }
  }

  // Humidity
  if (data.humidity !== undefined) {
      if (data.humidity >= 70) {
          insights.push(`<strong>Humidity:</strong> The air is very damp (${data.humidity}%). This can feel muggy and might cause mold to grow on walls or fabrics.`);
          recs.push(`<strong>Humidity:</strong> Open windows to improve airflow, or turn on an exhaust fan or dehumidifier to dry the air.`);
      } else if (data.humidity <= 30) {
          insights.push(`<strong>Humidity:</strong> The air is very dry (${data.humidity}%), which can dry out your skin, eyes, and throat.`);
          recs.push(`<strong>Humidity:</strong> Consider using a humidifier or placing a bowl of water in the room to add moisture back into the air.`);
      } else {
          insights.push(`<strong>Humidity:</strong> The moisture level in the air is well-balanced.`);
          recs.push(`<strong>Humidity:</strong> No action needed.`);
      }
  }

  // CO2
  if (data.co2 !== undefined) {
      if (data.co2 >= 1000) {
          insights.push(`<strong>Air Freshness (CO2):</strong> The room is getting stuffy (${data.co2} ppm). Breathing in stale air can cause headaches, sleepiness, and make it hard to focus.`);
          recs.push(`<strong>Air Freshness (CO2):</strong> Open doors and windows to let fresh air inside. If there are many people in the room, consider taking a short break outside.`);
      } else {
          insights.push(`<strong>Air Freshness (CO2):</strong> The air is fresh and well-ventilated.`);
          recs.push(`<strong>Air Freshness (CO2):</strong> Keep the room properly ventilated as it currently is.`);
      }
  }

  // VOC
  if (data.VOCidx !== undefined) {
      if (data.VOCidx >= 150) {
          insights.push(`<strong>Odors & Chemicals (VOC):</strong> Strong smells or chemicals are detected in the air. This can irritate your eyes, nose, and throat.`);
          recs.push(`<strong>Odors & Chemicals (VOC):</strong> Find the source (like open paint cans, strong perfumes, or cleaning sprays) and close it. Open windows immediately to clear the air out.`);
      } else {
          insights.push(`<strong>Odors & Chemicals (VOC):</strong> Chemical and odor levels are low and safe.`);
          recs.push(`<strong>Odors & Chemicals (VOC):</strong> No action needed. Continue using household products safely.`);
      }
  }

  // PM
  if (data.pm) {
      const isHighPm = (data.pm.pm1p0 >= 35 || data.pm.pm2p5 >= 35 || data.pm.pm4p0 >= 35 || data.pm.pm10p0 >= 50);
      if (isHighPm) {
          insights.push(`<strong>Particulate Matter (PM):</strong> There is a high amount of fine dust or smoke floating in the air. This is unhealthy to breathe in.`);
          recs.push(`<strong>Particulate Matter (PM):</strong> Stop activities that create dust, like sweeping. If the smoke is coming from outside (like traffic or burning leaves), close your windows. Consider wearing a mask if you are sensitive to dust.`);
      } else {
          insights.push(`<strong>Particulate Matter (PM):</strong> The air is clear of heavy dust and smoke particles.`);
          recs.push(`<strong>Particulate Matter (PM):</strong> No action needed.`);
      }
  }

  // Render Insights and Recommendations to DOM
  if (insightText && recommendationText) {
    const listStyle = "display: flex; flex-direction: column; gap: 0.75rem; color: #94a3b8; font-size: 0.88rem; line-height: 1.5;";
    insightText.innerHTML = `<div style="${listStyle}">${insights.map(i => `<div>${i}</div>`).join('')}</div>`;
    recommendationText.innerHTML = `<div style="${listStyle}">${recs.map(r => `<div>${r}</div>`).join('')}</div>`;
  }

  // Air Quality Status Check
  let status = (data.airQualityStatus || 'NORMAL').toUpperCase();
  if (!data.airQualityStatus) {
      if (data.co2 >= 1500 || data.VOCidx >= 250 || (data.pm && data.pm.pm2p5 >= 55)) status = 'CRITICAL';
      else if (data.co2 >= 1000 || data.VOCidx >= 150 || (data.pm && data.pm.pm2p5 >= 35)) status = 'WARNING';
  }
  
  if (valStatus) valStatus.innerText = `STATUS: ${status}`;

  if (aqiStatusBadge) {
      if (status === 'CRITICAL' || status === 'BAD') {
        aqiStatusBadge.style.background = 'rgba(239, 68, 68, 0.1)';
        aqiStatusBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        aqiStatusBadge.style.color = '#ef4444';
      } else if (status === 'WARNING' || status === 'MODERATE') {
        aqiStatusBadge.style.background = 'rgba(234, 179, 8, 0.1)';
        aqiStatusBadge.style.borderColor = 'rgba(234, 179, 8, 0.3)';
        aqiStatusBadge.style.color = '#eab308';
      } else {
        aqiStatusBadge.style.background = 'rgba(16, 185, 129, 0.1)';
        aqiStatusBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        aqiStatusBadge.style.color = '#10b981';
      }
  }

  if (window.lucide) lucide.createIcons();
});

// 2. Listen for Controls Status from Hardware
onValue(ref(db, `${BASE_PATH}/controls`), (snapshot) => {
  const controls = snapshot.val();
  if (!controls) return;

  if (controls.isAutoMode !== undefined) {
    if (controls.isAutoMode) {
      if(btnAuto) btnAuto.classList.add('active');
      if(btnManual) btnManual.classList.remove('active');
      if(switchRelay1) switchRelay1.disabled = true;
      if(switchRelay2) switchRelay2.disabled = true;
    } else {
      if(btnManual) btnManual.classList.add('active');
      if(btnAuto) btnAuto.classList.remove('active');
      if(switchRelay1) switchRelay1.disabled = false;
      if(switchRelay2) switchRelay2.disabled = false;
    }
  }

  if (controls.manualRelay1 !== undefined && switchRelay1) {
    switchRelay1.checked = controls.manualRelay1;
    if(textRelay1) textRelay1.innerText = controls.manualRelay1 ? 'ACTIVE' : 'INACTIVE';
  }
  
  if (controls.manualRelay2 !== undefined && switchRelay2) {
    switchRelay2.checked = controls.manualRelay2;
    if(textRelay2) textRelay2.innerText = controls.manualRelay2 ? 'ACTIVE' : 'INACTIVE';
  }

  if (controls.isBuzzerSilenced !== undefined && switchSilent) {
    switchSilent.checked = controls.isBuzzerSilenced;
    if(textSilent) textSilent.innerText = controls.isBuzzerSilenced ? 'ON' : 'OFF';
  }
});

// 3. Dispatch Controls back to Firebase
function updateControls(newPartialState) {
  update(ref(db, `${BASE_PATH}/controls`), newPartialState);
}

if(btnAuto) btnAuto.addEventListener('click', () => updateControls({ isAutoMode: true }));
if(btnManual) btnManual.addEventListener('click', () => updateControls({ isAutoMode: false }));
if(switchRelay1) switchRelay1.addEventListener('change', (e) => updateControls({ manualRelay1: e.target.checked }));
if(switchRelay2) switchRelay2.addEventListener('change', (e) => updateControls({ manualRelay2: e.target.checked }));
if(switchSilent) switchSilent.addEventListener('change', (e) => updateControls({ isBuzzerSilenced: e.target.checked }));

// Mobile hamburger menu toggle
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('sidebarOverlay');

function toggleMenu() {
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('active');
}

if (menuToggle && sidebar && overlay) {
  menuToggle.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', toggleMenu);
}
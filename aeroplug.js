// ============================================================
//  aeroplug.js — AeroPlug control page logic
// ============================================================

import { db, auth, BASE_PATH } from './firebase.js';
import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
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

// --- DOM ELEMENTS ---
const btnAuto = document.getElementById('btn-auto');
const btnManual = document.getElementById('btn-manual');
const switchRelay1 = document.getElementById('switch-relay1');
const switchRelay2 = document.getElementById('switch-relay2');
const switchBuzzer = document.getElementById('switch-buzzer');
const textRelay1 = document.getElementById('text-relay1');
const textRelay2 = document.getElementById('text-relay2');
const textBuzzer = document.getElementById('text-buzzer');
const autoModeInfo = document.getElementById('auto-mode-info');
const manualModeInfo = document.getElementById('manual-mode-info');
const aeroplugIndicator = document.getElementById('aeroplug-indicator');
const aeroplugOnlineText = document.getElementById('aeroplug-online-text');

// --- LISTEN FOR AEROPLUG STATUS ---
onValue(ref(db, '/aeroplugs/plug_01'), (snapshot) => {
  const plugData = snapshot.val();
  if (plugData) {
    aeroplugIndicator.className = 'aeroplug-indicator online';
    aeroplugOnlineText.className = 'aeroplug-online-text online';
    aeroplugOnlineText.innerText = 'Online';
  } else {
    aeroplugIndicator.className = 'aeroplug-indicator offline';
    aeroplugOnlineText.className = 'aeroplug-online-text offline';
    aeroplugOnlineText.innerText = 'Offline';
  }
});

// --- LISTEN FOR CONTROLS ---
onValue(ref(db, BASE_PATH + '/controls'), (snapshot) => {
  const controls = snapshot.val();
  if (!controls) return;

  if (controls.isAutoMode !== undefined) {
    if (controls.isAutoMode) {
      btnAuto?.classList.add('active');
      btnManual?.classList.remove('active');
      if (switchRelay1) switchRelay1.disabled = true;
      if (switchRelay2) switchRelay2.disabled = true;
      autoModeInfo?.classList.remove('hidden');
      manualModeInfo?.classList.add('hidden');
    } else {
      btnManual?.classList.add('active');
      btnAuto?.classList.remove('active');
      if (switchRelay1) switchRelay1.disabled = false;
      if (switchRelay2) switchRelay2.disabled = false;
      autoModeInfo?.classList.add('hidden');
      manualModeInfo?.classList.remove('hidden');
    }
  }

  if (controls.manualRelay1 !== undefined && switchRelay1) {
    switchRelay1.checked = controls.manualRelay1;
    textRelay1.innerText = controls.manualRelay1 ? 'ON' : 'OFF';
  }
  if (controls.manualRelay2 !== undefined && switchRelay2) {
    switchRelay2.checked = controls.manualRelay2;
    textRelay2.innerText = controls.manualRelay2 ? 'ON' : 'OFF';
  }
  if (controls.isBuzzerSilenced !== undefined && switchBuzzer) {
    switchBuzzer.checked = !controls.isBuzzerSilenced;
    textBuzzer.innerText = controls.isBuzzerSilenced ? 'SILENCED' : 'ON';
    switchBuzzer.disabled = false;
  }
});

// --- WRITE CONTROLS ---
function updateControls(partialState) {
  update(ref(db, BASE_PATH + '/controls'), partialState);
}

btnAuto?.addEventListener('click', () => updateControls({ isAutoMode: true }));
btnManual?.addEventListener('click', () => updateControls({ isAutoMode: false }));
switchRelay1?.addEventListener('change', (e) => updateControls({ manualRelay1: e.target.checked }));
switchRelay2?.addEventListener('change', (e) => updateControls({ manualRelay2: e.target.checked }));
switchBuzzer?.addEventListener('change', (e) => updateControls({ isBuzzerSilenced: !e.target.checked }));

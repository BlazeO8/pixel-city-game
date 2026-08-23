// ============================================
// GTA: PIXEL CITY - ENHANCED EDITION v3.0 (ORIGINAL MAP)
// v3 features + v2 map/world size
// ============================================

const cv = document.getElementById('gc');
const ctx = cv.getContext('2d');
const mm = document.getElementById('minimap');
const mctx = mm.getContext('2d');

const W = 560, H = 480;
const WORLD = 3200; // EXPANDED MAP — original area preserved, new space added

const overlay = document.getElementById('overlay');
const obtn = document.getElementById('obtn');
const hpBar = document.getElementById('hp-bar');
const cashEl = document.getElementById('cash');
const starsEl = document.getElementById('stars-hud');
const ammoEl = document.getElementById('ammo');
const weaponEl = document.getElementById('weapon');
const levelEl = document.getElementById('level');
const notificationEl = document.getElementById('notification');
const missionTypeEl = document.getElementById('mission-type');
const missionProgressEl = document.getElementById('mission-progress');
const missionTargetEl = document.getElementById('mission-target');

let keys = {}, mouse = { x: W / 2, y: H / 2, down: false };
let cam, player, cars, peds, cops, bullets, copBullets, particles, explosions;
let throwables = [], fireZones = [], gangBullets = [];
let casings = [], decals = [];
let dangerEvents = []; // recent gunfire/explosions — nearby NPCs panic and flee

function addDanger(x, y) {
    if (isHost) dangerEvents.push({ x, y, life: 1400 });
}
let wanted, cash, hp, score, state = 'idle', animId, lastT = 0;
let level = 1, missions = [], activeMission = null, missionComplete = false;
let screenShake = 0;

// ============================================
// WEAPON SYSTEM
// ============================================
const WEAPONS = {
    PISTOL: { ammo: Infinity, fireRate: 180, damage: 1, bulletSpeed: 9, spread: 0 },
    RIFLE: { ammo: 60, fireRate: 80, damage: 2, bulletSpeed: 12, spread: 0.15 },
    SHOTGUN: { ammo: 30, fireRate: 400, damage: 3, bulletSpeed: 8, spread: 0.5, pellets: 5 },
    MINIGUN: { ammo: 200, fireRate: 40, damage: 1, bulletSpeed: 10, spread: 0.2 },
    SNIPER: { ammo: 8, fireRate: 950, damage: 6, bulletSpeed: 22, spread: 0 },
    MELEE: { ammo: Infinity, fireRate: 380, damage: 2, melee: true, range: 24 }
};

let currentWeapon = 'PISTOL';
let ammo = { PISTOL: Infinity, RIFLE: 0, SHOTGUN: 0, MINIGUN: 0, SNIPER: 0, MELEE: Infinity };

// ============================================
// VEHICLE TYPES
// ============================================
const VEHICLE_TYPES = {
    CAR:       { w: 26, h: 14, color: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'], speed: 5,   handling: 0.045, accel: 0.42, brake: 0.30 },
    TRUCK:     { w: 35, h: 18, color: ['#c0392b', '#34495e'],                                  speed: 4,   handling: 0.03,  accel: 0.26, brake: 0.20 }, // heavy, slow to build speed
    BIKE:      { w: 20, h: 10, color: ['#e67e22', '#16a085', '#8e44ad'],                       speed: 6,   handling: 0.08,  accel: 0.60, brake: 0.34 }, // snappy
    POLICE:    { w: 26, h: 14, color: ['#1d4ed8'],                                             speed: 5.5, handling: 0.05,  accel: 0.50, brake: 0.32 }, // sporty
    AMBULANCE: { w: 28, h: 15, color: ['#ecf0f1'],                                             speed: 4.5, handling: 0.04,  accel: 0.36, brake: 0.24 }
};

// ============================================
// PLAYER SKINS
// ============================================
const PLAYER_SKINS = [
    { name: 'Default', color: '#f5c542', head: '#fde68a' },
    { name: 'Red',     color: '#f43f5e', head: '#fca5a5' },
    { name: 'Blue',    color: '#3b82f6', head: '#93c5fd' },
    { name: 'Green',   color: '#10b981', head: '#a7f3d0' },
    { name: 'Purple',  color: '#a855f7', head: '#e9d5ff' }
];

let currentSkin = 0;

// ============================================
// COLOR SCHEME
// ============================================
const COLORS = {
    road:     '#1c1c1c',
    lane:     '#f5c542',
    sidewalk: '#2a2a2a',
    grass:    '#1a3a1a',
    building: ['#2d2d3a', '#3a2d2d', '#2d3a2d', '#3a3a2d', '#4a3a2d', '#2d3a3a'],
    car:      ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'],
    cop:      '#3498db',
    ped:      ['#f39c12', '#e67e22', '#16a085', '#8e44ad', '#c0392b', '#2980b9'],
    bullet:   '#ffe066',
    copBullet:'#60a5fa',
    explosion:'#ff6b35'
};

// ============================================
// VISUAL OVERHAUL — COLOR HELPERS & DAY/NIGHT CYCLE
// ============================================
function shadeColor(hex, amt) {
    // amt > 0 lightens, amt < 0 darkens. hex like '#rrggbb'
    if (typeof hex !== 'string' || hex[0] !== '#') hex = '#888888'; // safe fallback
    const n = parseInt(hex.replace('#', ''), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgba(hex, a) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
    return `rgba(${r},${g},${b},${a})`;
}

// dayTime cycles 0..1 (0 = midnight, 0.5 = noon). A full cycle takes DAY_CYCLE_MS.
const DAY_CYCLE_MS = 240000; // 4 real minutes per full day/night cycle
let dayTime = 0.28; // start just after sunrise
let nightFactor = 0; // 0 = full day, 1 = full night — recomputed each frame in update()

function computeNightFactor(t) {
    const sunHeight = Math.cos((t - 0.5) * Math.PI * 2); // 1 at noon, -1 at midnight
    return Math.max(0, Math.min(1, -sunHeight * 1.4));
}

// ---- Weather (rain) ----
let isRaining = false;
let weatherTimer = 0;
let weatherCheckIn = 25000 + Math.random() * 20000; // time until next weather roll
let rainIntensity = 0; // eases in/out so rain doesn't snap on/off
let rainDrops = [];    // screen-space particles
let lightningFlash = 0;
let lightningTimer = 0;

function initRainDrops() {
    rainDrops = [];
    for (let i = 0; i < 140; i++) {
        rainDrops.push({
            x: Math.random() * W,
            y: Math.random() * H,
            len: 8 + Math.random() * 10,
            spd: 9 + Math.random() * 6
        });
    }
}
initRainDrops();

// ============================================
// AUDIO ENGINE — fully synthesized via Web Audio API (no external sound files)
// ============================================
let actx = null;
let masterGain = null;
let sfxMuted = false;

const VOLUME_KEY = 'pixelCityVolume';
let masterVolume = 0.75; // default bumped up from 0.5 — sound was reported too quiet
try {
    const savedVol = localStorage.getItem(VOLUME_KEY);
    if (savedVol !== null) masterVolume = Math.max(0, Math.min(1, parseFloat(savedVol)));
} catch (e) { /* storage unavailable — use default */ }

function setMasterVolume(v) {
    masterVolume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = sfxMuted ? 0 : masterVolume;
    try { localStorage.setItem(VOLUME_KEY, String(masterVolume)); } catch (e) { /* ignore */ }
    syncVolumeUI();
}

function syncVolumeUI() {
    const pct = Math.round(masterVolume * 100);
    const icon = sfxMuted || pct === 0 ? '🔇' : pct < 34 ? '🔈' : pct < 67 ? '🔉' : '🔊';
    [document.getElementById('volume-slider'), document.getElementById('volume-slider-hud')].forEach(el => {
        if (el) el.value = sfxMuted ? 0 : pct;
    });
    const valueLabel = document.getElementById('volume-value');
    if (valueLabel) valueLabel.textContent = (sfxMuted ? 0 : pct) + '%';
    [document.getElementById('volume-icon'), document.getElementById('volume-icon-menu')].forEach(el => {
        if (el) el.textContent = icon;
    });
}

function initAudio() {
    if (actx) return;
    try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = actx.createGain();
        masterGain.gain.value = sfxMuted ? 0 : masterVolume;
        masterGain.connect(actx.destination);
    } catch (e) {
        actx = null; // Web Audio unavailable — game still works, just silent
    }
}

function playTone(freq, dur, type, vol, when, freqEnd) {
    if (!actx || sfxMuted) return;
    type = type || 'sine'; vol = vol == null ? 0.3 : vol; when = when || 0;
    const t = actx.currentTime + when;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol, filterFreq, when) {
    if (!actx || sfxMuted) return;
    vol = vol == null ? 0.3 : vol; filterFreq = filterFreq || 1500; when = when || 0;
    const t = actx.currentTime + when;
    const bufferSize = Math.max(1, Math.floor(actx.sampleRate * dur));
    const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = actx.createBufferSource();
    src.buffer = buffer;
    const filter = actx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = actx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(t);
}

// One-shot sound effects, keyed to specific entities/events
const SFX = {
    gunshot(weapon) {
        switch (weapon) {
            case 'SHOTGUN': noiseBurst(0.2, 0.4, 1100); playTone(90, 0.14, 'square', 0.2); break;
            case 'MINIGUN':  noiseBurst(0.05, 0.16, 3200); break;
            case 'RIFLE':   noiseBurst(0.1, 0.28, 2400); playTone(220, 0.06, 'square', 0.16); break;
            case 'SNIPER':  noiseBurst(0.14, 0.35, 1800); playTone(140, 0.2, 'sawtooth', 0.22, 0, 40); break;
            default:        noiseBurst(0.08, 0.22, 3000); playTone(180, 0.05, 'square', 0.12); // PISTOL
        }
    },
    melee()       { playTone(220, 0.08, 'triangle', 0.15, 0, 160); },
    meleeHit()    { noiseBurst(0.06, 0.22, 1400); playTone(90, 0.06, 'square', 0.15); },
    throwSound()  { playTone(300, 0.12, 'sine', 0.15, 0, 500); },
    carHonk()     { playTone(320, 0.15, 'square', 0.1, 0); playTone(260, 0.15, 'square', 0.1, 0.12); },
    pedScream()   { playTone(700, 0.1, 'sawtooth', 0.09, 0, 300); },
    copAlert()    { playTone(500, 0.06, 'square', 0.12, 0); playTone(700, 0.08, 'square', 0.12, 0.07); },
    gangShout()   { playTone(180, 0.1, 'sawtooth', 0.13, 0, 90); },
    fireCrackle() { noiseBurst(0.1, 0.1, 2200); },
    copHit()      { playTone(300, 0.08, 'square', 0.14, 0, 150); },
    pedHit()      { playTone(140, 0.12, 'square', 0.18, 0, 60); },
    vehicleHit()  { noiseBurst(0.08, 0.18, 900); },
    explosion()   { noiseBurst(0.6, 0.5, 500); playTone(80, 0.5, 'sawtooth', 0.3, 0, 30); },
    crash()       { noiseBurst(0.15, 0.3, 700); playTone(70, 0.15, 'square', 0.15); },
    enterCar()    { playTone(150, 0.1, 'square', 0.2); playTone(100, 0.15, 'square', 0.15, 0.05); },
    exitCar()     { playTone(220, 0.08, 'square', 0.14); },
    weaponSwitch(){ playTone(880, 0.05, 'square', 0.15); },
    hurt()        { noiseBurst(0.1, 0.22, 1000); },
    wasted()      { playTone(220, 0.3, 'sawtooth', 0.28); playTone(110, 0.5, 'sawtooth', 0.28, 0.25); },
    missionStart(){ playTone(523, 0.1, 'sine', 0.22); playTone(659, 0.1, 'sine', 0.22, 0.1); playTone(784, 0.15, 'sine', 0.22, 0.2); },
    missionComplete() { playTone(659, 0.1, 'sine', 0.28); playTone(784, 0.1, 'sine', 0.28, 0.1); playTone(988, 0.22, 'sine', 0.28, 0.2); },
    footstep(leftFoot) { playTone(leftFoot ? 95 : 108, 0.045, 'sine', 0.055, 0, leftFoot ? 60 : 68); }
};

// ---- Looping siren (cop cars) — one persistent oscillator pair, volume-driven ----
let sirenOsc = null, sirenLFO = null, sirenGain = null, sirenStopHandle = null;

function updateSiren() {
    if (!actx) return;
    const active = cops.length > 0 && wanted > 0;
    if (active && !sirenOsc) {
        if (sirenStopHandle) { clearTimeout(sirenStopHandle); sirenStopHandle = null; }
        sirenOsc = actx.createOscillator();
        sirenLFO = actx.createOscillator();
        const lfoGain = actx.createGain();
        sirenGain = actx.createGain();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 650;
        sirenLFO.frequency.value = 4.2;
        lfoGain.gain.value = 260;
        sirenLFO.connect(lfoGain);
        lfoGain.connect(sirenOsc.frequency);
        sirenGain.gain.value = 0;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(masterGain);
        sirenOsc.start();
        sirenLFO.start();
    }
    if (sirenGain) {
        let targetVol = 0;
        if (active && !sfxMuted) {
            let minD = Infinity;
            cops.forEach(c => { const d = Math.hypot(c.x - player.x, c.y - player.y); if (d < minD) minD = d; });
            targetVol = Math.max(0, Math.min(0.22, 0.22 * (1 - minD / 500)));
        }
        sirenGain.gain.setTargetAtTime(targetVol, actx.currentTime, 0.15);
    }
    if (!active && sirenOsc && !sirenStopHandle) {
        const osc = sirenOsc, lfo = sirenLFO;
        sirenStopHandle = setTimeout(() => {
            try { osc.stop(); lfo.stop(); } catch (e) {}
            sirenStopHandle = null;
        }, 600);
        sirenOsc = null; sirenLFO = null; sirenGain = null;
    }
}

// ---- Player vehicle engine hum — timbre differs per vehicle type ----
// Each engine layers three sound sources for a fuller, more "real" texture:
// a low fundamental oscillator, a second oscillator an octave up for harmonic
// bite, and filtered looping noise for engine/road rumble.
let engineOsc = null, engineOsc2 = null, engineNoise = null, engineGain = null,
    engineFilter = null, engineNoiseFilter = null, engineNoiseGain = null, engineType = null;
let noiseBuffer = null;

function getNoiseBuffer() {
    if (noiseBuffer || !actx) return noiseBuffer;
    const len = actx.sampleRate * 2;
    noiseBuffer = actx.createBuffer(1, len, actx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
}

const ENGINE_PROFILES = {
    CAR:       { wave: 'sawtooth', baseFreq: 60,  freqPerSpd: 26, filterFreq: 550,  maxVol: 0.22, noiseFreq: 300,  noiseVol: 0.05 },
    TRUCK:     { wave: 'sawtooth', baseFreq: 42,  freqPerSpd: 16, filterFreq: 320,  maxVol: 0.28, noiseFreq: 180,  noiseVol: 0.08 }, // deeper growl, gritty
    BIKE:      { wave: 'triangle', baseFreq: 110, freqPerSpd: 40, filterFreq: 1400, maxVol: 0.20, noiseFreq: 700,  noiseVol: 0.04 }, // buzzy/whiny
    POLICE:    { wave: 'sawtooth', baseFreq: 70,  freqPerSpd: 28, filterFreq: 650,  maxVol: 0.22, noiseFreq: 350,  noiseVol: 0.05 }, // brighter/sportier
    AMBULANCE: { wave: 'square',   baseFreq: 55,  freqPerSpd: 20, filterFreq: 420,  maxVol: 0.22, noiseFreq: 260,  noiseVol: 0.05 }  // boxier/smoother
};

function updateEngineHum() {
    if (!actx) return;
    if (player.inCar) {
        const type = player.inCar.type || 'CAR';
        const profile = ENGINE_PROFILES[type] || ENGINE_PROFILES.CAR;

        // Rebuild if we just entered a car or switched vehicle types (each
        // type needs a different waveform, which can't be changed live)
        if (!engineOsc || engineType !== type) {
            [engineOsc, engineOsc2, engineNoise].forEach(n => { try { if (n) n.stop(); } catch (e) {} });
            engineType = type;

            engineOsc = actx.createOscillator();
            engineFilter = actx.createBiquadFilter();
            engineGain = actx.createGain();
            engineOsc.type = profile.wave;
            engineFilter.type = 'lowpass';
            engineFilter.frequency.value = profile.filterFreq;
            engineGain.gain.value = 0;
            engineOsc.connect(engineFilter);
            engineFilter.connect(engineGain);
            engineGain.connect(masterGain);
            engineOsc.start();

            // Second oscillator an octave up, quieter — adds harmonic "engine bite"
            engineOsc2 = actx.createOscillator();
            engineOsc2.type = profile.wave;
            const gain2 = actx.createGain();
            gain2.gain.value = 0.35;
            engineOsc2.connect(gain2);
            gain2.connect(engineFilter);
            engineOsc2.start();

            // Filtered noise layer for road/engine rumble texture
            engineNoise = actx.createBufferSource();
            engineNoise.buffer = getNoiseBuffer();
            engineNoise.loop = true;
            engineNoiseFilter = actx.createBiquadFilter();
            engineNoiseFilter.type = 'bandpass';
            engineNoiseFilter.frequency.value = profile.noiseFreq;
            engineNoiseFilter.Q.value = 0.7;
            engineNoiseGain = actx.createGain();
            engineNoiseGain.gain.value = 0;
            engineNoise.connect(engineNoiseFilter);
            engineNoiseFilter.connect(engineNoiseGain);
            engineNoiseGain.connect(masterGain);
            engineNoise.start();
        }

        const spd = Math.abs(player.inCar.spd);
        const freq = profile.baseFreq + spd * profile.freqPerSpd;
        engineOsc.frequency.setTargetAtTime(freq, actx.currentTime, 0.08);
        engineOsc2.frequency.setTargetAtTime(freq * 2, actx.currentTime, 0.08);
        const vol = sfxMuted ? 0 : Math.min(profile.maxVol, 0.08 + spd * 0.026);
        engineGain.gain.setTargetAtTime(vol, actx.currentTime, 0.08);
        engineNoiseGain.gain.setTargetAtTime(sfxMuted ? 0 : Math.min(profile.noiseVol, 0.01 + spd * 0.006), actx.currentTime, 0.1);
    } else if (engineOsc) {
        [engineGain, engineNoiseGain].forEach(g => { if (g) g.gain.setTargetAtTime(0, actx.currentTime, 0.15); });
        const nodes = [engineOsc, engineOsc2, engineNoise];
        setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch (e) {} }); }, 400);
        engineOsc = null; engineOsc2 = null; engineNoise = null;
        engineGain = null; engineFilter = null; engineNoiseFilter = null; engineNoiseGain = null; engineType = null;
    }
}

// ---- Siren for whichever emergency vehicle the PLAYER is currently driving ----
// (separate from updateSiren(), which is the "cops are chasing you" wanted-level siren —
// this one plays because of what you're driving, and sounds different per vehicle type
// so police and ambulance are distinguishable by ear, not just by sight.)
let vehSirenOsc = null, vehSirenLFO = null, vehSirenGain = null, vehSirenType = null;
let ambSirenToggleTimer = 0;

function updatePlayerVehicleSiren(dt) {
    if (!actx) return;
    const type = player.inCar && (player.inCar.type === 'POLICE' || player.inCar.type === 'AMBULANCE')
        ? player.inCar.type : null;

    if (type && (!vehSirenOsc || vehSirenType !== type)) {
        if (vehSirenOsc) { try { vehSirenOsc.stop(); vehSirenLFO.stop(); } catch (e) {} }
        vehSirenType = type;
        vehSirenOsc = actx.createOscillator();
        vehSirenGain = actx.createGain();
        vehSirenGain.gain.value = 0;
        vehSirenOsc.connect(vehSirenGain);
        vehSirenGain.connect(masterGain);

        if (type === 'POLICE') {
            // Smooth continuous pitch wail
            vehSirenOsc.type = 'sine';
            vehSirenOsc.frequency.value = 650;
            vehSirenLFO = actx.createOscillator();
            const lfoGain = actx.createGain();
            vehSirenLFO.frequency.value = 4.2;
            lfoGain.gain.value = 260;
            vehSirenLFO.connect(lfoGain);
            lfoGain.connect(vehSirenOsc.frequency);
            vehSirenLFO.start();
        } else {
            // Ambulance: classic alternating two-tone "hi-lo" wail
            vehSirenOsc.type = 'sine';
            vehSirenOsc.frequency.value = 500;
            ambSirenToggleTimer = 0;
        }
        vehSirenOsc.start();
    }

    if (vehSirenOsc && type === 'AMBULANCE') {
        ambSirenToggleTimer += dt;
        if (ambSirenToggleTimer > 350) {
            ambSirenToggleTimer = 0;
            const high = vehSirenOsc.frequency.value < 575;
            vehSirenOsc.frequency.setTargetAtTime(high ? 650 : 500, actx.currentTime, 0.03);
        }
    }

    if (vehSirenGain) {
        vehSirenGain.gain.setTargetAtTime(type && !sfxMuted ? 0.16 : 0, actx.currentTime, 0.1);
    }

    if (!type && vehSirenOsc) {
        const osc = vehSirenOsc, lfo = vehSirenLFO;
        setTimeout(() => { try { osc.stop(); if (lfo) lfo.stop(); } catch (e) {} }, 400);
        vehSirenOsc = null; vehSirenLFO = null; vehSirenGain = null; vehSirenType = null;
    }
}

// ---- Procedural radio — a few short looping note patterns, playable while driving ----
// Station 0 = off. Each station is [frequency, duration_ms] pairs, looped.
const RADIO_STATIONS = [
    null,
    { name: 'CITY FM (SYNTH)', wave: 'square', notes: [[392, 160], [523, 160], [659, 160], [523, 160], [440, 160], [523, 160], [392, 160], [330, 160]] },
    { name: 'LOWRIDER (SMOOTH)', wave: 'sine', notes: [[220, 300], [261, 300], [196, 300], [246, 300]] },
    { name: 'STATIC ROCK (SAW)', wave: 'sawtooth', notes: [[196, 120], [196, 120], [233, 120], [196, 120], [174, 120], [155, 120]] }
];
let radioStation = 0;
let radioNoteIdx = 0;
let radioNoteTimer = 0;

function cycleRadio() {
    radioStation = (radioStation + 1) % RADIO_STATIONS.length;
    radioNoteIdx = 0;
    radioNoteTimer = 0;
    showNotification(radioStation === 0 ? 'RADIO: OFF' : 'RADIO: ' + RADIO_STATIONS[radioStation].name);
}

function updateRadio(dt) {
    if (!actx || radioStation === 0 || !player.inCar || sfxMuted) return;
    radioNoteTimer -= dt;
    if (radioNoteTimer <= 0) {
        const station = RADIO_STATIONS[radioStation];
        const [freq, dur] = station.notes[radioNoteIdx % station.notes.length];
        playTone(freq, dur / 1000 * 0.9, station.wave, 0.06, 0, null);
        radioNoteTimer = dur;
        radioNoteIdx++;
    }
}

// ============================================
// MULTIPLAYER — serverless LAN/internet co-op via WebRTC (PeerJS).
// No Node server to run: the host's browser tab opens a direct WebRTC
// connection to each friend's browser tab. A short game code (not a URL)
// is all that needs to be shared. PeerJS's free public broker
// (0.peerjs.com) is only used for the initial handshake between peers —
// once connected, all game traffic flows directly between browsers.
//
// Whoever hosts keeps running the exact same simulation as single-player
// (cops, peds, missions, weather) and relays it to everyone else, same
// design as before — just without a Node process in the middle.
// ============================================
let isMultiplayer = false;
let isHost = true; // stays true (=> unchanged single-player behavior) unless multiplayer connects
let myId = null;
let peer = null;          // PeerJS Peer instance (both host and joiners have one)
let hostConn = null;       // joiner's DataConnection to the host
let connections = {};      // host's map of peerId -> DataConnection (one per joined friend)
let remotePlayers = {};    // id -> { x, y, angle, name, skin, weapon, alive, inCar }
let netTimer = 0;

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L — easy to read aloud
function generateGameCode() {
    let code = '';
    for (let i = 0; i < 5; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    return code;
}

function peerConfig() {
    // Overridable for local testing; otherwise ships with PeerJS's default
    // broker PLUS extra STUN/TURN servers. STUN alone often fails to punch
    // through stricter networks (campus/corporate WiFi) — TURN acts as a
    // relay fallback for exactly that case. These are free public servers
    // (Google STUN + OpenRelay's community TURN), fine for casual play.
    if (window.__PEERJS_TEST_CONFIG) return window.__PEERJS_TEST_CONFIG;
    return {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ]
        }
    };
}

function hostGame(displayName, attempt) {
    attempt = attempt || 0;
    if (attempt > 6) {
        showNotification('COULD NOT START A HOST SESSION — TRY AGAIN');
        resetMpButtons();
        return;
    }
    const code = generateGameCode();
    const p = new Peer(code, peerConfig());

    const openTimeout = setTimeout(() => {
        showNotification('CONNECTION TIMED OUT — check your internet and try again');
        resetMpButtons();
        try { p.destroy(); } catch (e) {}
    }, 15000);

    p.on('open', id => {
        clearTimeout(openTimeout);
        peer = p;
        isMultiplayer = true;
        isHost = true;
        myId = id;
        connections = {};
        remotePlayers = {};
        worldSeed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
        rng = mulberry32(worldSeed);
        initAudio();
        if (actx && actx.state === 'suspended') actx.resume();
        initGame();
        overlay.style.display = 'none';
        if (!animId) { lastT = performance.now(); animId = requestAnimationFrame(loop); }
        showNotification('HOSTING — YOUR GAME CODE IS ' + id);
        showGameCode(id);

        p.on('connection', conn => setupHostConnection(conn));
        p.on('error', err => console.warn('Peer error (host):', err.type));
    });
    p.on('error', err => {
        if (err.type === 'unavailable-id') {
            clearTimeout(openTimeout);
            p.destroy();
            hostGame(displayName, attempt + 1);
        } else {
            clearTimeout(openTimeout);
            showNotification('HOST ERROR: ' + err.type);
            resetMpButtons();
        }
    });
}

function setupHostConnection(conn) {
    conn.on('open', () => {
        connections[conn.peer] = conn;
    });
    conn.on('data', data => handleNetMessage(data, conn.peer));
    conn.on('close', () => {
        delete connections[conn.peer];
        delete remotePlayers[conn.peer];
        cars.forEach(c => { if (c.claimedBy === conn.peer) c.claimedBy = null; });
        broadcastFromHost({ type: 'player_left', id: conn.peer });
    });
    conn.on('error', err => console.warn('Peer connection error:', err));
}

function joinGame(codeRaw, displayName) {
    const code = (codeRaw || '').trim().toUpperCase();
    if (!code) { showNotification('ENTER A GAME CODE'); resetMpButtons(); return; }
    const p = new Peer(peerConfig());

    let settled = false;
    const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        showNotification('COULD NOT REACH HOST — they may be offline, or your network is blocking the connection (try a mobile hotspot)');
        resetMpButtons();
        try { p.destroy(); } catch (e) {}
    }, 15000);

    p.on('open', () => {
        peer = p;
        const conn = p.connect(code, { reliable: true });
        hostConn = conn;
        conn.on('open', () => {
            mpSendToHost({ type: 'hello', name: (displayName || 'Player').slice(0, 16) });
        });
        conn.on('data', data => {
            if (!settled) { settled = true; clearTimeout(timeout); }
            handleNetMessage(data);
        });
        conn.on('close', () => {
            showNotification('DISCONNECTED FROM HOST');
        });
        conn.on('error', err => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            showNotification('CONNECTION ERROR — check the code and try again');
            resetMpButtons();
        });
    });
    p.on('error', err => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (err.type === 'peer-unavailable') showNotification('NO GAME FOUND WITH THAT CODE');
        else showNotification('JOIN ERROR: ' + err.type);
        resetMpButtons();
    });
}

function resetMpButtons() {
    if (mpHostBtn) { mpHostBtn.disabled = false; mpHostBtn.textContent = '[ HOST A GAME ]'; }
    if (mpJoinBtn) { mpJoinBtn.disabled = false; mpJoinBtn.textContent = '[ JOIN GAME ]'; }
}

function mpSendToHost(obj) {
    if (hostConn && hostConn.open) hostConn.send(obj);
}

function broadcastFromHost(obj, exceptId) {
    for (const pid in connections) {
        if (pid !== exceptId && connections[pid].open) connections[pid].send(obj);
    }
}

// fromId is set only for messages the HOST receives from a specific connection
function handleNetMessage(msg, fromId) {
    switch (msg.type) {
        case 'hello': // host-only: a friend just connected
            if (fromId && connections[fromId]) {
                connections[fromId].send({ type: 'welcome', id: fromId, seed: worldSeed });
                remotePlayers[fromId] = remotePlayers[fromId] || {};
                remotePlayers[fromId].name = msg.name;
                showNotification((msg.name || 'A player') + ' JOINED');
            }
            break;
        case 'claim_car': { // host-only: a friend wants to drive a car
            if (!fromId || !connections[fromId]) break;
            const car = cars.find(c => c.id === msg.carId);
            const granted = !!(car && !car.driver && !car.claimedBy && car.hp > 0);
            if (granted) car.claimedBy = fromId;
            connections[fromId].send({ type: 'car_claim_result', carId: msg.carId, granted });
            break;
        }
        case 'release_car': { // host-only: a friend got out of a car
            const car = cars.find(c => c.id === msg.carId);
            if (car && car.claimedBy === fromId) car.claimedBy = null;
            break;
        }
        case 'car_update': { // host-only: a friend is driving — apply their live position
            if (!fromId) break;
            const car = cars.find(c => c.id === msg.data.carId);
            if (car && car.claimedBy === fromId) {
                car.x = msg.data.x; car.y = msg.data.y; car.angle = msg.data.angle;
                car.spd = msg.data.spd; car.wheelRotation = msg.data.wheelRotation;
            }
            break;
        }
        case 'car_claim_result': // joiner-only: host responded to our claim request
            player.pendingClaim = null;
            if (msg.granted) {
                const car = cars.find(c => c.id === msg.carId);
                if (car) {
                    player.inCar = car;
                    SFX.enterCar();
                    showNotification('ENTERED ' + car.type);
                }
            } else {
                showNotification('SOMEONE ELSE HAS THAT CAR');
            }
            break;
        case 'welcome': // joiner-only: host accepted us
            myId = msg.id;
            isHost = false;
            isMultiplayer = true;
            rng = mulberry32(msg.seed);
            initAudio();
            if (actx && actx.state === 'suspended') actx.resume();
            initGame();
            overlay.style.display = 'none';
            if (!animId) { lastT = performance.now(); animId = requestAnimationFrame(loop); }
            showNotification('JOINED GAME');
            break;
        case 'player_update':
            if (fromId) {
                // Host received this from a connected friend — mirror it locally
                // and relay it on to everyone else so all players see each other
                remotePlayers[fromId] = { ...msg.data, name: (remotePlayers[fromId] && remotePlayers[fromId].name) };
                broadcastFromHost({ type: 'player_update', id: fromId, data: remotePlayers[fromId] }, fromId);
            } else if (msg.id !== myId) {
                remotePlayers[msg.id] = msg.data;
            }
            break;
        case 'player_left':
            delete remotePlayers[msg.id];
            break;
        case 'state':
            if (!isHost) applyWorldSnapshot(msg.data);
            break;
        case 'remote_shoot': // host-only: a friend fired
            if (fromId) spawnRemoteBullet({ ...msg.data, ownerId: fromId });
            break;
        case 'remote_melee': // host-only: a friend swung a melee weapon
            if (fromId) meleeAttack(msg.data.x, msg.data.y, msg.data.angle, msg.data.range, msg.data.damage, fromId);
            break;
        case 'remote_throw': // host-only: a friend threw a molotov
            if (fromId) {
                throwables.push({
                    x: msg.data.x, y: msg.data.y,
                    vx: Math.cos(msg.data.angle) * 6, vy: Math.sin(msg.data.angle) * 6,
                    life: 16, ownerId: fromId, real: true
                });
            }
            break;
        case 'credit':
            cash += msg.cash || 0;
            if (activeMission && msg.missionType && activeMission.type === msg.missionType && !activeMission.completed) {
                activeMission.progress++;
                updateMissionDisplay();
            }
            updateHUD();
            break;
        case 'melee_hit':
            if (state === 'playing') {
                hp = Math.max(0, hp - 1);
                spawnParticle(player.x, player.y, '#f43f5e', 8, 3);
                SFX.hurt();
                updateHUD();
                if (hp <= 0) { state = 'dead'; showOver(); }
            }
            break;
    }
}

// Non-host clients mirror the host's world instead of simulating it
function applyWorldSnapshot(data) {
    // If I'm currently driving a claimed car, keep MY live position for it —
    // the host's copy is just an echo of what I last told it, so it always
    // lags slightly behind; overwriting with it would make my own car jitter.
    const drivenCarId = player.inCar ? player.inCar.id : null;
    const drivenCarSnapshot = drivenCarId != null ? { ...player.inCar } : null;

    cars = data.cars;
    peds = data.peds;
    cops = data.cops;

    if (drivenCarId != null) {
        const idx = cars.findIndex(c => c.id === drivenCarId);
        if (idx !== -1) {
            cars[idx] = drivenCarSnapshot;
            player.inCar = cars[idx];
        }
    }
    fireZones = data.fireZones || [];

    // Check cop-bullet damage against MY OWN player exactly once per snapshot
    // (not every render frame) so a single bullet can't repeatedly drain HP
    // while we wait for the next update.
    data.copBullets.forEach(b => {
        if (state === 'playing' && Math.hypot(b.x - player.x, b.y - player.y) < 12) {
            hp = Math.max(0, hp - 1);
            spawnParticle(player.x, player.y, '#f43f5e', 8, 3);
            SFX.hurt();
            updateHUD();
            if (hp <= 0) { state = 'dead'; showOver(); }
        }
    });
    copBullets = data.copBullets;

    // Same one-shot-per-snapshot self-damage check for gang gunfire
    (data.gangBullets || []).forEach(b => {
        if (state === 'playing' && Math.hypot(b.x - player.x, b.y - player.y) < 12) {
            hp = Math.max(0, hp - 1);
            spawnParticle(player.x, player.y, '#f43f5e', 8, 3);
            SFX.hurt();
            updateHUD();
            if (hp <= 0) { state = 'dead'; showOver(); }
        }
    });
    gangBullets = data.gangBullets || [];

    wanted = data.wanted;
    dayTime = data.dayTime;
    nightFactor = data.nightFactor;
    isRaining = data.isRaining;
    rainIntensity = data.rainIntensity;
    lightningFlash = data.lightningFlash;

    if (data.mission) {
        if (!activeMission) activeMission = {};
        const wasCompleted = activeMission.completed;
        const prevType = activeMission.type;
        activeMission.type = data.mission.type;
        activeMission.progress = data.mission.progress;
        activeMission.target = data.mission.target;
        activeMission.completed = data.mission.completed;
        if (data.mission.completed && !wasCompleted) {
            SFX.missionComplete();
            showNotification('✓ HOST COMPLETED A MISSION');
        } else if (prevType && prevType !== data.mission.type) {
            SFX.missionStart();
        }
        updateMissionDisplay();
    }
}

// A remote player fired — the host spawns a real bullet so it's resolved by
// the same collision code as any other shot; ownerId decides who gets credit.
function spawnRemoteBullet(d) {
    const weapon = WEAPONS[d.weapon] || WEAPONS.PISTOL;
    bullets.push({
        x: d.x, y: d.y,
        vx: Math.cos(d.angle) * weapon.bulletSpeed,
        vy: Math.sin(d.angle) * weapon.bulletSpeed,
        life: 60, damage: weapon.damage,
        ownerId: d.ownerId
    });
    addDanger(d.x, d.y);
}

// Instant-hit melee swing in a narrow arc in front of the attacker (host-authoritative)
function meleeAttack(x, y, angle, range, damage, ownerId) {
    let hitSomething = false;
    const inArc = (tx, ty, extraRange) => {
        const d = Math.hypot(tx - x, ty - y);
        if (d > range + (extraRange || 0)) return false;
        let da = Math.abs(Math.atan2(ty - y, tx - x) - angle);
        if (da > Math.PI) da = Math.PI * 2 - da;
        return da < 0.9;
    };

    cops.forEach(c => {
        if (c.hp > 0 && inArc(c.x, c.y)) {
            c.hp -= damage;
            spawnParticle(c.x, c.y, '#3498db', 6, 2);
            hitSomething = true;
            if (c.hp <= 0) creditKill(ownerId, 100, 'elimination');
        }
    });
    peds.forEach(p => {
        if (p.alive && inArc(p.x, p.y)) {
            if (p.gang) {
                p.hp = (p.hp || 2) - damage;
                spawnParticle(p.x, p.y, '#f43f5e', 6, 2);
                hitSomething = true;
                if (p.hp <= 0) { p.alive = false; p.deathTimer = Date.now(); spawnDecal(p.x, p.y, 'blood'); creditKill(ownerId, 40, 'elimination'); }
            } else {
                p.alive = false;
                p.deathTimer = Date.now();
                wanted = Math.min(5, wanted + 1);
                creditKill(ownerId, 20, 'elimination');
                spawnParticle(p.x, p.y, '#f43f5e', 8, 2);
                spawnDecal(p.x, p.y, 'blood');
                hitSomething = true;
            }
        }
    });
    cars.forEach(c => {
        if (!c.driver && c.hp > 0 && inArc(c.x, c.y, 10)) {
            c.hp -= damage;
            spawnParticle(c.x, c.y, '#f97316', 5, 2);
            hitSomething = true;
            if (c.hp <= 0) { spawnExplosion(c.x, c.y); SFX.explosion(); creditKill(ownerId, 200, 'rampage'); }
        }
    });
    if (hitSomething) SFX.meleeHit();
    addDanger(x, y);
}

function throwMolotov() {
    if (state !== 'playing') return;
    if (player.molotovs <= 0) { showNotification('NO MOLOTOVS LEFT'); return; }
    player.molotovs--;
    const ox = player.inCar ? player.inCar.x : player.x;
    const oy = player.inCar ? player.inCar.y : player.y;
    const ang = player.angle;
    throwables.push({
        x: ox, y: oy,
        vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6,
        life: 16, ownerId: myId, real: isHost
    });
    SFX.throwSound();
    showNotification('MOLOTOV THROWN (' + player.molotovs + ' LEFT)');
    if (!isHost) {
        mpSendToHost({ type: 'remote_throw', data: { x: ox, y: oy, angle: ang } });
    }
    updateHUD();
}


function creditKill(ownerId, cashAmt, missionType) {
    if (!ownerId || ownerId === myId) {
        cash += cashAmt;
        if (activeMission && missionType && activeMission.type === missionType && !activeMission.completed) {
            activeMission.progress++;
            updateMissionDisplay();
        }
    } else if (connections[ownerId] && connections[ownerId].open) {
        connections[ownerId].send({ type: 'credit', cash: cashAmt, missionType });
    }
}

// Called every frame from loop(); throttles network chatter to a sane rate
function networkTick(dt) {
    if (!isMultiplayer) return;
    netTimer += dt;
    if (netTimer < 90) return;
    netTimer = 0;

    const ownData = {
        x: player.x, y: player.y, angle: player.angle,
        skin: PLAYER_SKINS[currentSkin], weapon: currentWeapon,
        alive: hp > 0, inCar: !!player.inCar
    };

    if (isHost) {
        broadcastFromHost({ type: 'player_update', id: myId, data: ownData });
        broadcastFromHost({
            type: 'state',
            data: {
                cars, peds, cops, copBullets, fireZones, gangBullets,
                wanted, dayTime, nightFactor, isRaining, rainIntensity, lightningFlash,
                mission: activeMission ? {
                    type: activeMission.type, progress: activeMission.progress,
                    target: activeMission.target, completed: activeMission.completed
                } : null
            }
        });
    } else {
        mpSendToHost({ type: 'player_update', data: ownData });
        if (player.inCar) {
            mpSendToHost({
                type: 'car_update',
                data: {
                    carId: player.inCar.id, x: player.inCar.x, y: player.inCar.y,
                    angle: player.inCar.angle, spd: player.inCar.spd, wheelRotation: player.inCar.wheelRotation
                }
            });
        }
    }
}



// ============================================
// ROAD LAYOUT — ORIGINAL (v2) + EXPANDED AREA
// ============================================
const roads = [
    // ---- ORIGINAL 5 horizontal roads (auto-stretch to new WORLD width) ----
    { x: 0,    y: 200,  w: WORLD, h: 80 },
    { x: 0,    y: 500,  w: WORLD, h: 80 },
    { x: 0,    y: 800,  w: WORLD, h: 80 },
    { x: 0,    y: 1100, w: WORLD, h: 80 },
    { x: 0,    y: 1400, w: WORLD, h: 80 },
    // ---- ORIGINAL 5 vertical roads (auto-stretch to new WORLD height) ----
    { x: 150,  y: 0, w: 80, h: WORLD },
    { x: 450,  y: 0, w: 80, h: WORLD },
    { x: 800,  y: 0, w: 80, h: WORLD },
    { x: 1100, y: 0, w: 80, h: WORLD },
    { x: 1500, y: 0, w: 80, h: WORLD },
    // ---- NEW horizontal roads in the y > 1800 zone ----
    { x: 0, y: 1900, w: WORLD, h: 80 },
    { x: 0, y: 2200, w: WORLD, h: 80 },
    { x: 0, y: 2600, w: WORLD, h: 80 },
    { x: 0, y: 3000, w: WORLD, h: 80 },
    // ---- NEW vertical roads in the x > 1800 zone ----
    { x: 1850, y: 0, w: 80, h: WORLD },
    { x: 2200, y: 0, w: 80, h: WORLD },
    { x: 2600, y: 0, w: 80, h: WORLD },
    { x: 3000, y: 0, w: 80, h: WORLD }
];

let buildings = [];
let streetlights = [];

function genStreetlights() {
    streetlights = [];
    roads.forEach(r => {
        if (r.w > r.h) { // horizontal road — lights along top & bottom edges
            for (let x = r.x + 90; x < r.x + r.w - 60; x += 240) {
                streetlights.push({ x, y: r.y - 12 });
                streetlights.push({ x, y: r.y + r.h + 12 });
            }
        } else { // vertical road — lights along left & right edges
            for (let y = r.y + 90; y < r.y + r.h - 60; y += 240) {
                streetlights.push({ x: r.x - 12, y });
                streetlights.push({ x: r.x + r.w + 12, y });
            }
        }
    });
}
genStreetlights();

// ============================================
// BUILDING GENERATION — ORIGINAL ZONES (v2) + EXPANDED AREA
// ============================================
// ============================================
// SEEDED RNG — lets every client in a multiplayer session generate an
// identical city layout from the same seed (buildings affect collision,
// so they must match exactly across all connected players).
// ============================================
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
let worldSeed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
let rng = Math.random; // swapped for a seeded version when hosting/joining multiplayer

function genBuildings() {
    buildings = [];
    const zones = [
        // ---- ORIGINAL 18 zones — untouched ----
        { x: 240,  y: 0,    w: 200, h: 190 },
        { x: 540,  y: 0,    w: 250, h: 190 },
        { x: 890,  y: 0,    w: 200, h: 190 },
        { x: 1200, y: 0,    w: 250, h: 190 },
        { x: 1550, y: 0,    w: 200, h: 190 },
        { x: 240,  y: 290,  w: 200, h: 200 },
        { x: 540,  y: 290,  w: 250, h: 200 },
        { x: 890,  y: 290,  w: 200, h: 200 },
        { x: 1200, y: 290,  w: 250, h: 200 },
        { x: 1550, y: 290,  w: 200, h: 200 },
        { x: 240,  y: 590,  w: 200, h: 300 },
        { x: 540,  y: 590,  w: 250, h: 300 },
        { x: 890,  y: 590,  w: 200, h: 300 },
        { x: 1200, y: 590,  w: 250, h: 300 },
        { x: 1550, y: 590,  w: 200, h: 300 },
        { x: 240,  y: 1000, w: 1300, h: 800 },
        { x: 0,    y: 0,    w: 140,  h: 1800 },
        { x: 1660, y: 0,    w: 140,  h: 1800 },

        // ---- NEW zones in the x > 1800 column (right expansion) ----
        // Between x=1930 and x=2200 (between new roads at 1850 and 2200)
        { x: 1940, y: 0,    w: 240, h: 190 },
        { x: 1940, y: 290,  w: 240, h: 200 },
        { x: 1940, y: 590,  w: 240, h: 300 },
        { x: 1940, y: 1000, w: 240, h: 800 },
        // Between x=2280 and x=2600
        { x: 2290, y: 0,    w: 290, h: 190 },
        { x: 2290, y: 290,  w: 290, h: 200 },
        { x: 2290, y: 590,  w: 290, h: 300 },
        { x: 2290, y: 1000, w: 290, h: 800 },
        // Between x=2680 and x=3000
        { x: 2690, y: 0,    w: 290, h: 190 },
        { x: 2690, y: 290,  w: 290, h: 200 },
        { x: 2690, y: 590,  w: 290, h: 300 },
        { x: 2690, y: 1000, w: 290, h: 800 },
        // Between x=3080 and right edge
        { x: 3090, y: 0,    w: 100, h: 1800 },

        // ---- NEW zones in the y > 1800 row (bottom expansion) ----
        // Full strip of blocks between y=1480 and y=1900 (between original y=1400 road and new y=1900 road)
        { x: 0,    y: 1500, w: 140,  h: 380 },
        { x: 240,  y: 1500, w: 200,  h: 380 },
        { x: 540,  y: 1500, w: 240,  h: 380 },
        { x: 890,  y: 1500, w: 200,  h: 380 },
        { x: 1200, y: 1500, w: 240,  h: 380 },
        { x: 1550, y: 1500, w: 290,  h: 380 },
        { x: 1940, y: 1500, w: 240,  h: 380 },
        { x: 2290, y: 1500, w: 290,  h: 380 },
        { x: 2690, y: 1500, w: 290,  h: 380 },
        { x: 3090, y: 1500, w: 100,  h: 380 },
        // Between y=1980 and y=2200
        { x: 0,    y: 1990, w: 140,  h: 190 },
        { x: 240,  y: 1990, w: 200,  h: 190 },
        { x: 540,  y: 1990, w: 240,  h: 190 },
        { x: 890,  y: 1990, w: 200,  h: 190 },
        { x: 1200, y: 1990, w: 240,  h: 190 },
        { x: 1550, y: 1990, w: 290,  h: 190 },
        { x: 1940, y: 1990, w: 240,  h: 190 },
        { x: 2290, y: 1990, w: 290,  h: 190 },
        { x: 2690, y: 1990, w: 290,  h: 190 },
        { x: 3090, y: 1990, w: 100,  h: 190 },
        // Between y=2280 and y=2600
        { x: 0,    y: 2290, w: 140,  h: 290 },
        { x: 240,  y: 2290, w: 200,  h: 290 },
        { x: 540,  y: 2290, w: 240,  h: 290 },
        { x: 890,  y: 2290, w: 200,  h: 290 },
        { x: 1200, y: 2290, w: 240,  h: 290 },
        { x: 1550, y: 2290, w: 290,  h: 290 },
        { x: 1940, y: 2290, w: 240,  h: 290 },
        { x: 2290, y: 2290, w: 290,  h: 290 },
        { x: 2690, y: 2290, w: 290,  h: 290 },
        { x: 3090, y: 2290, w: 100,  h: 290 },
        // Between y=2680 and y=3000
        { x: 0,    y: 2690, w: 140,  h: 290 },
        { x: 240,  y: 2690, w: 200,  h: 290 },
        { x: 540,  y: 2690, w: 240,  h: 290 },
        { x: 890,  y: 2690, w: 200,  h: 290 },
        { x: 1200, y: 2690, w: 240,  h: 290 },
        { x: 1550, y: 2690, w: 290,  h: 290 },
        { x: 1940, y: 2690, w: 240,  h: 290 },
        { x: 2290, y: 2690, w: 290,  h: 290 },
        { x: 2690, y: 2690, w: 290,  h: 290 },
        { x: 3090, y: 2690, w: 100,  h: 290 },
        // Between y=3080 and bottom edge
        { x: 0,    y: 3090, w: WORLD, h: 110 },
    ];

    // Never place a building on top of a road — zone boundaries are hand-tuned
    // and some are slightly off, which let ~25% of buildings spill onto roads
    // and block them. This is a hard guarantee that catches all such cases.
    const ROAD_MARGIN = 4;
    function overlapsAnyRoad(bx, by, bw, bh) {
        for (let i = 0; i < roads.length; i++) {
            const r = roads[i];
            if (bx < r.x + r.w + ROAD_MARGIN && bx + bw > r.x - ROAD_MARGIN &&
                by < r.y + r.h + ROAD_MARGIN && by + bh > r.y - ROAD_MARGIN) {
                return true;
            }
        }
        return false;
    }

    zones.forEach(z => {
        for (let bx = z.x + 8; bx + 30 < z.x + z.w; bx += 50 + rng() * 20) {
            for (let by = z.y + 8; by + 30 < z.y + z.h; by += 50 + rng() * 20) {
                const bw = 30 + rng() * 30;
                const bh = 30 + rng() * 30;
                if (bx + bw < z.x + z.w - 8 && by + bh < z.y + z.h - 8 && !overlapsAnyRoad(bx, by, bw, bh)) {
                    const windows = [];
                    for (let wx = 4; wx < bw - 4; wx += 10)
                        for (let wy = 4; wy < bh - 4; wy += 10)
                            windows.push({
                                x: wx, y: wy,
                                lit: rng() < 0.35,
                                flicker: rng() < 0.12,
                                phase: rng() * Math.PI * 2
                            });
                    let roofProp = null;
                    if (bw > 32 && bh > 32) {
                        const r = rng();
                        if (r < 0.18) roofProp = 'ac';
                        else if (r < 0.26) roofProp = 'tower';
                        else if (r < 0.36) roofProp = 'antenna';
                    }
                    buildings.push({
                        x: bx, y: by, w: bw, h: bh,
                        col: COLORS.building[Math.floor(rng() * COLORS.building.length)],
                        shadeVariance: Math.floor(rng() * 16) - 8,
                        windows,
                        roofProp
                    });
                }
            }
        }
    });
}

// ============================================
// COLLISION DETECTION
// ============================================
function isRoad(x, y, pad = 0) {
    return roads.some(r => x + pad > r.x && x - pad < r.x + r.w && y + pad > r.y && y - pad < r.y + r.h);
}

function isBuilding(x, y, w = 10, h = 10) {
    return buildings.some(b => x + w > b.x && x < b.x + b.w && y + h > b.y && y < b.y + b.h);
}

function roadPos() {
    const r = roads[Math.floor(Math.random() * roads.length)];
    return { x: r.x + 10 + Math.random() * (r.w - 20), y: r.y + 10 + Math.random() * (r.h - 20), road: r };
}

// ============================================
// MISSION SYSTEM
// ============================================
function missionObjectiveText(mission) {
    switch (mission.type) {
        case 'elimination': return mission.target + ' targets';
        case 'rampage':     return mission.target + ' vehicles destroyed';
        case 'delivery':    return mission.target + ' deliveries (drive around)';
        case 'escape':      return mission.target + ' (stay wanted & survive)';
        default:            return mission.target + ' targets';
    }
}

function createMission(type, reward) {
    const types = ['elimination', 'delivery', 'escape', 'rampage'];
    return {
        id: Math.random(),
        type: type || types[Math.floor(Math.random() * types.length)],
        reward: reward || 500 + Math.random() * 500,
        progress: 0,
        target: Math.floor(Math.random() * 5 + 3),
        active: false,
        completed: false,
        driveDist: 0,    // used by 'delivery' missions
        escapeTimer: 0   // used by 'escape' missions
    };
}

function showNotification(text, duration = 2000) {
    notificationEl.textContent = text;
    notificationEl.classList.add('show');
    setTimeout(() => notificationEl.classList.remove('show'), duration);
}

// ============================================
// PARTICLES & EFFECTS — ENHANCED (v3)
// ============================================
function spawnParticle(x, y, col, n = 6, size = 2.5) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = Math.random() * 4 + 0.5;
        particles.push({
            x, y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            life: 1,
            col,
            size,
            gravity: 0.1
        });
    }
}

function spawnCasing(x, y, angle) {
    const eject = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    casings.push({
        x, y,
        vx: Math.cos(eject) * (1.5 + Math.random()), vy: Math.sin(eject) * (1.5 + Math.random()),
        rot: Math.random() * Math.PI * 2, rotSpd: (Math.random() - 0.5) * 0.5,
        life: 1, settleTimer: 0
    });
    if (decals.length > 220) decals.splice(0, decals.length - 220);
}

function spawnDecal(x, y, type) {
    decals.push({ x, y, type, size: type === 'blood' ? 4 + Math.random() * 3 : 3, rot: Math.random() * Math.PI * 2, life: 1 });
    if (decals.length > 220) decals.splice(0, decals.length - 220);
}

function spawnExplosion(x, y) {
    screenShake = 15;
    addDanger(x, y);
    explosions.push({ x, y, radius: 1, maxRadius: 100, life: 1, particles: [] });
    for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = Math.random() * 5 + 3;
        explosions[explosions.length - 1].particles.push({
            x, y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            life: 1,
            col: [COLORS.explosion, '#ffab40', '#ff6b35'][Math.floor(Math.random() * 3)],
            size: Math.random() * 3 + 1
        });
    }
    for (let i = 0; i < 3; i++) {
        setTimeout(() => screenShake = 10, i * 50);
    }
    for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = Math.random() * 4 + 2;
        particles.push({
            x, y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1.5,
            life: 1, col: ['#333', '#555', '#222'][Math.floor(Math.random() * 3)],
            size: Math.random() * 2.5 + 1.5, gravity: 0.22
        });
    }
}

// ============================================
// GAME INITIALIZATION
// ============================================
function initGame() {
    // Stop any looping audio nodes left over from a previous session
    [sirenOsc, sirenLFO, engineOsc, engineOsc2, engineNoise, vehSirenOsc, vehSirenLFO].forEach(n => { try { if (n) n.stop(); } catch (e) {} });
    sirenOsc = null; sirenLFO = null; sirenGain = null;
    if (sirenStopHandle) { clearTimeout(sirenStopHandle); sirenStopHandle = null; }
    engineOsc = null; engineOsc2 = null; engineNoise = null;
    engineGain = null; engineFilter = null; engineNoiseFilter = null; engineNoiseGain = null; engineType = null;
    vehSirenOsc = null; vehSirenLFO = null; vehSirenGain = null; vehSirenType = null;

    genBuildings();
    wanted = 0;
    cash = 0;
    hp = 5;
    score = 0;
    level = 1;
    currentWeapon = 'PISTOL';
    currentSkin = Math.floor(Math.random() * PLAYER_SKINS.length);
    ammo = { PISTOL: Infinity, RIFLE: 0, SHOTGUN: 0, MINIGUN: 0, SNIPER: 0, MELEE: Infinity };
    missions = [createMission()];
    activeMission = missions[0];

    cam = { x: 0, y: 0 };
    player = {
        x: 240, y: 240, w: 16, h: 10, angle: 0, spd: 0,
        inCar: null, shootCD: 0,
        ...PLAYER_SKINS[currentSkin],
        animFrame: 0,
        molotovs: 2
    };
    cars = [];
    peds = [];
    cops = [];
    bullets = [];
    copBullets = [];
    gangBullets = [];
    throwables = [];
    fireZones = [];
    casings = [];
    decals = [];
    dangerEvents = [];
    particles = [];
    explosions = [];

    // Spawn multiple vehicle types
    const vehicleTypeKeys = Object.keys(VEHICLE_TYPES);
    for (let i = 0; i < 45; i++) {
        const p = roadPos();
        const vType = vehicleTypeKeys[Math.floor(Math.random() * vehicleTypeKeys.length)];
        const vData = VEHICLE_TYPES[vType];
        const horizontal = p.road.w > p.road.h;
        const isAiTraffic = Math.random() < 0.7; // rest stay parked, handy for stealing
        cars.push({
            id: i,
            x: p.x, y: p.y,
            w: vData.w, h: vData.h,
            angle: isAiTraffic
                ? (horizontal ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2))
                : Math.random() * Math.PI * 2,
            spd: 0, driver: null, claimedBy: null,
            col: vData.color[Math.floor(Math.random() * vData.color.length)],
            hp: 3,
            type: vType,
            maxSpeed: vData.speed,
            handling: vData.handling,
            accel: vData.accel,
            brake: vData.brake,
            wheelRotation: 0,
            animFrame: 0,
            ai: isAiTraffic,
            aiSpd: vData.speed * (0.35 + Math.random() * 0.25),
            aiTurnCheck: Math.random() * 400
        });
    }

    // Spawn pedestrians
    for (let i = 0; i < 65; i++) {
        const p = roadPos();
        const isGang = Math.random() < 0.15;
        const faction = Math.random() < 0.5 ? 0 : 1;
        peds.push({
            x: p.x, y: p.y, w: 8, h: 8,
            angle: Math.random() * Math.PI * 2,
            spd: 0.8, t: Math.random() * 100,
            col: isGang ? (faction === 0 ? '#4b1f1f' : '#16283f') : COLORS.ped[Math.floor(Math.random() * COLORS.ped.length)],
            alive: true, flee: 0,
            walkFrame: 0,
            gang: isGang,
            faction: isGang ? faction : undefined,
            hp: isGang ? 2 : undefined,
            shootCD: isGang ? Math.random() * 800 : undefined
        });
    }

    updateHUD();
    updateMissionDisplay();
    state = 'playing';
    SFX.missionStart();
    showNotification('MISSION: ' + activeMission.type.toUpperCase() + ' (' + missionObjectiveText(activeMission) + ')');
}

// ============================================
// HUD UPDATE
// ============================================
function updateHUD() {
    hpBar.textContent = '■'.repeat(Math.max(0, hp)) + '□'.repeat(Math.max(0, 5 - hp));
    hpBar.style.color = hp > 3 ? '#4ade80' : hp > 1 ? '#f5c542' : '#f43f5e';
    cashEl.textContent = cash;
    levelEl.textContent = level;
    weaponEl.textContent = currentWeapon;
    ammoEl.textContent = ammo[currentWeapon] === Infinity ? '∞' : ammo[currentWeapon];
    const s = Math.min(5, wanted);
    starsEl.textContent = '★'.repeat(s) + '☆'.repeat(5 - s);
    starsEl.style.color = s >= 4 ? '#f43f5e' : s >= 2 ? '#f5c542' : '#aaa';

    if (Math.random() < 0.01) {
        const weaponList = Object.keys(WEAPONS);
        weaponList.forEach(w => {
            if (w !== 'PISTOL' && ammo[w] < WEAPONS[w].ammo) {
                ammo[w] = Math.min(ammo[w] + 1, WEAPONS[w].ammo);
            }
        });
    }
}

// ============================================
// MISSION DISPLAY UPDATE
// ============================================
function updateMissionDisplay() {
    if (activeMission) {
        missionTypeEl.textContent = activeMission.type.toUpperCase();
        missionProgressEl.textContent = activeMission.progress;
        missionTargetEl.textContent = activeMission.target;

        const progressPercent = activeMission.progress / activeMission.target;
        if (progressPercent >= 1) {
            missionProgressEl.style.color = '#4ade80';
        } else if (progressPercent >= 0.5) {
            missionProgressEl.style.color = '#f5c542';
        } else {
            missionProgressEl.style.color = '#f43f5e';
        }
    }
}

// ============================================
// COP SPAWNING
// ============================================
function spawnCop(patrol) {
    const p = roadPos();
    const swat = !patrol && wanted >= 5;
    cops.push({
        x: p.x, y: p.y, w: 26, h: 14,
        angle: patrol ? (p.road.w > p.road.h ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2)) : 0,
        spd: 0,
        shootCD: 80, hp: swat ? 5 : 3, alertT: 0,
        wheelRotation: 0,
        type: 'POLICE',
        col: swat ? '#1a1a2e' : VEHICLE_TYPES.POLICE.color[0],
        patrol: !!patrol,
        swat,
        aiTurnCheck: Math.random() * 500
    });
}

// ============================================
// WEAPON CYCLING
// ============================================
function cycleWeapon() {
    const weaponList = Object.keys(WEAPONS);
    const currentIndex = weaponList.indexOf(currentWeapon);
    const nextIndex = (currentIndex + 1) % weaponList.length;
    currentWeapon = weaponList[nextIndex];

    if (ammo[currentWeapon] === 0) {
        ammo[currentWeapon] = WEAPONS[currentWeapon].ammo;
    }

    SFX.weaponSwitch();
    showNotification('WEAPON: ' + currentWeapon + ' | AMMO: ' + (ammo[currentWeapon] === Infinity ? '∞' : ammo[currentWeapon]));
    updateHUD();
}

// ============================================
// GAME UPDATE LOGIC
// ============================================
let wantedTimer = 0, copSpawnTimer = 0, wantedDecayTimer = 0, patrolCheckTimer = 0;

function update(dt) {
    if (state !== 'playing') return;
    const s = dt / 16;

    saveTimer += dt;
    if (saveTimer > 15000) { saveTimer = 0; saveGame(); }

    // Day/night cycle (host-authoritative in multiplayer — others receive it via snapshot)
    if (isHost) {
        dayTime = (dayTime + dt / DAY_CYCLE_MS) % 1;
        nightFactor = computeNightFactor(dayTime);

        // Weather — periodically roll for rain starting/stopping, ease intensity in/out
        weatherTimer += dt;
        if (weatherTimer > weatherCheckIn) {
            weatherTimer = 0;
            weatherCheckIn = 25000 + Math.random() * 20000;
            if (!isRaining && Math.random() < 0.35) isRaining = true;
            else if (isRaining && Math.random() < 0.5) isRaining = false;
        }
        rainIntensity += ((isRaining ? 1 : 0) - rainIntensity) * Math.min(1, dt / 3000);
        if (rainIntensity > 0.01) {
            lightningTimer -= dt;
            if (lightningTimer <= 0 && rainIntensity > 0.5) {
                lightningTimer = 4000 + Math.random() * 9000;
                if (Math.random() < 0.5) lightningFlash = 1;
            }
        }
        lightningFlash = Math.max(0, lightningFlash - dt / 120);
    }
    // Rain drops are purely decorative screen-space particles — animate locally
    // for everyone so the rain looks smooth regardless of snapshot timing
    if (rainIntensity > 0.01) {
        rainDrops.forEach(d => {
            d.y += d.spd * s;
            d.x -= 2 * s;
            if (d.y > H) { d.y = -10; d.x = Math.random() * W; }
            if (d.x < 0) d.x = W;
        });
    }

    // Screen shake decay
    screenShake = Math.max(0, screenShake - 1);

    // Camera tracking
    const tx = player.x - W / 2;
    const ty = player.y - H / 2;
    cam.x += (tx - cam.x) * 0.12;
    cam.y += (ty - cam.y) * 0.12;
    cam.x = Math.max(0, Math.min(WORLD - W, cam.x));
    cam.y = Math.max(0, Math.min(WORLD - H, cam.y));

    const wx = mouse.x + cam.x;
    const wy = mouse.y + cam.y;

    // ===== PLAYER ON FOOT =====
    if (!player.inCar) {
        const dx = keys['d'] || keys['arrowright'] ? 1 : keys['a'] || keys['arrowleft'] ? -1 : 0;
        const dy = keys['s'] || keys['arrowdown'] ? 1 : keys['w'] || keys['arrowup'] ? -1 : 0;
        const spd = 2.8 * s;
        let nx = player.x + dx * spd;
        let ny = player.y + dy * spd;

        if (!isBuilding(nx - 6, ny - 5, 12, 10)) player.x = nx;
        if (!isBuilding(player.x - 6, ny - 5, 12, 10)) player.y = ny;

        player.x = Math.max(5, Math.min(WORLD - 5, player.x));
        player.y = Math.max(5, Math.min(WORLD - 5, player.y));
        // Aim angle is computed from screen center (where the player is always
        // rendered), not from player.x/cam.x — the camera lags the player with
        // a lerp for smoothness, so deriving aim from that lagged position made
        // the reticle drift/wobble on its own during movement even with the
        // mouse held still. Screen center is stable regardless of camera lag.
        player.angle = Math.atan2(mouse.y - H / 2, mouse.x - W / 2);

        // Walking animation
        if (dx || dy) {
            const prevFrame = Math.floor(player.animFrame);
            player.animFrame = (player.animFrame + 0.2) % 4;
            const newFrame = Math.floor(player.animFrame);
            if (newFrame !== prevFrame) SFX.footstep(newFrame % 2 === 0);
        }

        // Enter car — in multiplayer, non-host players must ask the host to
        // claim it first (host is authoritative on who's driving what, so two
        // players can never end up fighting over the same car)
        if (keys['e'] || keys['f']) {
            keys['e'] = false; keys['f'] = false;
            const near = cars.find(c => !c.driver && !c.claimedBy && Math.hypot(c.x - player.x, c.y - player.y) < 30);
            if (near) {
                if (isMultiplayer && !isHost) {
                    if (!player.pendingClaim) {
                        player.pendingClaim = near.id;
                        mpSendToHost({ type: 'claim_car', carId: near.id });
                        setTimeout(() => {
                            if (player.pendingClaim === near.id) player.pendingClaim = null;
                        }, 3000);
                    }
                } else {
                    near.driver = player;
                    player.inCar = near;
                    SFX.enterCar();
                    showNotification('ENTERED ' + near.type);
                }
            }
        }
    } else {
        // ===== PLAYER IN CAR =====
        const car = player.inCar;
        const acc = keys['w'] || keys['arrowup'] ? car.accel : keys['s'] || keys['arrowdown'] ? -car.brake : 0;
        const turn = keys['a'] || keys['arrowleft'] ? -car.handling : keys['d'] || keys['arrowright'] ? car.handling : 0;

        car.spd += acc * s;
        car.spd *= 0.92;
        car.spd = Math.max(-2, Math.min(car.maxSpeed, car.spd));

        if (Math.abs(car.spd) > 0.1) car.angle += turn * s * (car.spd > 0 ? 1 : -1);

        // Skid marks when turning sharply at speed
        if (turn !== 0 && Math.abs(car.spd) > car.maxSpeed * 0.55 && Math.random() < 0.4) {
            spawnDecal(car.x - Math.cos(car.angle) * 6, car.y - Math.sin(car.angle) * 6, 'skid');
        }

        // Wheel rotation animation
        car.wheelRotation += car.spd * 0.05;

        let nx = car.x + Math.cos(car.angle) * car.spd * s * 2;
        let ny = car.y + Math.sin(car.angle) * car.spd * s * 2;

        if (!isBuilding(nx - car.w / 2, ny - car.h / 2, car.w, car.h)) {
            car.x = nx;
            car.y = ny;
        } else {
            if (Math.abs(car.spd) > 1) SFX.crash();
            car.spd *= -0.4;
            spawnParticle(car.x, car.y, '#888', 8, 2);
        }

        car.x = Math.max(10, Math.min(WORLD - 10, car.x));
        car.y = Math.max(10, Math.min(WORLD - 10, car.y));
        player.x = car.x;
        player.y = car.y;

        // Run over pedestrians (host-authoritative — see note on multiplayer scope)
        if (isHost) peds.forEach(p => {
            if (!p.alive) return;
            if (Math.abs(car.spd) > 1.5 && Math.hypot(p.x - car.x, p.y - car.y) < 20) {
                p.alive = false;
                p.deathTimer = Date.now();
                cash += 50;
                wanted = Math.min(5, wanted + 1);
                if (activeMission && activeMission.type === 'elimination') {
                    activeMission.progress++;
                    updateMissionDisplay();
                }
                spawnParticle(p.x, p.y, '#f43f5e', 12, 3);
                spawnDecal(p.x, p.y, 'blood');
                SFX.pedHit();
                updateHUD();
            }
        });

        // Exit car
        if (keys['f']) {
            car.driver = null;
            if (isMultiplayer && !isHost) {
                car.claimedBy = null;
                mpSendToHost({ type: 'release_car', carId: car.id });
            }
            player.inCar = null;
            player.x = car.x + 30;
            player.y = car.y;
            car.spd = 0;
            keys['f'] = false;
            SFX.exitCar();
            showNotification('EXITED CAR');
        }
    }

    // ===== SHOOTING SYSTEM =====
    player.shootCD = Math.max(0, player.shootCD - dt);

    if ((mouse.down || keys[' ']) && player.shootCD <= 0) {
        const weapon = WEAPONS[currentWeapon];
        if (ammo[currentWeapon] > 0 || ammo[currentWeapon] === Infinity) {
            player.shootCD = weapon.fireRate;
            const ang = player.angle;
            const ox = player.inCar ? player.inCar.x : player.x;
            const oy = player.inCar ? player.inCar.y : player.y;

            if (weapon.melee) {
                const hitX = ox + Math.cos(ang) * weapon.range * 0.6;
                const hitY = oy + Math.sin(ang) * weapon.range * 0.6;
                spawnParticle(hitX, hitY, '#e5e7eb', 5, 2);
                SFX.melee();
                if (isHost) {
                    meleeAttack(ox, oy, ang, weapon.range, weapon.damage, myId);
                } else {
                    mpSendToHost({ type: 'remote_melee', data: { x: ox, y: oy, angle: ang, range: weapon.range, damage: weapon.damage } });
                }
                updateHUD();
                return;
            }

            const bulletCount = currentWeapon === 'SHOTGUN' ? weapon.pellets : 1;
            for (let i = 0; i < bulletCount; i++) {
                const spreadAngle = (Math.random() - 0.5) * weapon.spread;
                const finalAngle = ang + spreadAngle;
                bullets.push({
                    x: ox + Math.cos(finalAngle) * 18,
                    y: oy + Math.sin(finalAngle) * 18,
                    vx: Math.cos(finalAngle) * weapon.bulletSpeed,
                    vy: Math.sin(finalAngle) * weapon.bulletSpeed,
                    life: 60,
                    damage: weapon.damage
                });
            }

            spawnParticle(ox, oy, '#ffe066', 6, 2);
            spawnCasing(ox, oy, ang);
            addDanger(ox, oy);
            SFX.gunshot(currentWeapon);
            if (isHost) {
                wanted = Math.min(5, wanted + 0.5);
            } else {
                mpSendToHost({ type: 'remote_shoot', data: { x: ox, y: oy, angle: ang, weapon: currentWeapon } });
            }
            if (ammo[currentWeapon] !== Infinity) ammo[currentWeapon]--;
            updateHUD();
        }
    }

    // ===== BULLET PHYSICS =====
    bullets = bullets.filter(b => {
        b.x += b.vx * s;
        b.y += b.vy * s;
        b.life -= s;

        if (isBuilding(b.x, b.y)) {
            spawnParticle(b.x, b.y, '#aaa', 5, 2);
            return false;
        }

        // Hit cops
        if (isHost) cops.forEach(c => {
            if (Math.hypot(b.x - c.x, b.y - c.y) < 16) {
                c.hp -= b.damage;
                spawnParticle(c.x, c.y, '#3498db', 8, 2);
                SFX.copHit();
                b.life = 0;
                if (c.hp <= 0) creditKill(b.ownerId, 100, 'elimination');
            }
        });

        // Hit pedestrians
        if (isHost) peds.forEach(p => {
            if (p.alive && Math.hypot(b.x - p.x, b.y - p.y) < 10) {
                spawnParticle(p.x, p.y, '#f43f5e', 10, 2);
                SFX.pedHit();
                b.life = 0;
                if (p.gang) {
                    p.hp -= b.damage;
                    if (p.hp <= 0) { p.alive = false; p.deathTimer = Date.now(); spawnDecal(p.x, p.y, 'blood'); creditKill(b.ownerId, 40, 'elimination'); }
                } else {
                    p.alive = false;
                    p.deathTimer = Date.now();
                    spawnDecal(p.x, p.y, 'blood');
                    wanted = Math.min(5, wanted + 1);
                    creditKill(b.ownerId, 20, 'elimination');
                }
                updateHUD();
            }
        });

        // Hit cars
        if (isHost) cars.forEach(c => {
            if (!c.driver && Math.hypot(b.x - c.x, b.y - c.y) < 18) {
                c.hp -= b.damage;
                spawnParticle(c.x, c.y, '#f97316', 6, 2);
                if (c.hp <= 0) {
                    spawnExplosion(c.x, c.y);
                    SFX.explosion();
                    creditKill(b.ownerId, 200, 'rampage');
                } else {
                    SFX.vehicleHit();
                }
                b.life = 0;
            }
        });

        return b.life > 0;
    });

    // Danger events (gunfire/explosions) decay over time; NPCs react to them below
    if (isHost) dangerEvents = dangerEvents.filter(d => (d.life -= dt) > 0);

    // ===== NPC TRAFFIC AI (host-authoritative — non-host clients receive cars via snapshot) =====
    if (isHost) cars.forEach(car => {
        if (!car.ai || car.driver || car.claimedBy || car.hp <= 0) return;

        // Panic near recent gunfire/explosions — floor it away from danger
        car.panicTimer = Math.max(0, (car.panicTimer || 0) - dt);
        let nearestDanger = null, nearestDist = 130;
        dangerEvents.forEach(d => {
            const dd = Math.hypot(car.x - d.x, car.y - d.y);
            if (dd < nearestDist) { nearestDist = dd; nearestDanger = d; }
        });
        if (nearestDanger) {
            if (car.panicTimer <= 0) SFX.carHonk();
            car.panicTimer = 1600;
            const fleeAngle = Math.atan2(car.y - nearestDanger.y, car.x - nearestDanger.x);
            const options = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
            let best = car.angle, bestScore = -Infinity;
            options.forEach(a => {
                const score = Math.cos(a - fleeAngle);
                if (score > bestScore && isRoad(car.x + Math.cos(a) * 24, car.y + Math.sin(a) * 24, 4)) {
                    bestScore = score; best = a;
                }
            });
            car.angle = best;
        }

        if (car.panicTimer <= 0) {
            car.aiTurnCheck += dt;
            if (car.aiTurnCheck > 500) {
                car.aiTurnCheck = 0;
                if (Math.random() < 0.3) {
                    const turn = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
                    const candidate = car.angle + turn;
                    const lookX = car.x + Math.cos(candidate) * 24;
                    const lookY = car.y + Math.sin(candidate) * 24;
                    if (isRoad(lookX, lookY, 4)) car.angle = candidate;
                }
            }
        }

        const moveSpd = (car.panicTimer > 0 ? car.aiSpd * 1.6 : car.aiSpd) * s;
        const nx = car.x + Math.cos(car.angle) * moveSpd * 2;
        const ny = car.y + Math.sin(car.angle) * moveSpd * 2;

        if (isRoad(nx, ny, 4) && !isBuilding(nx - car.w / 2, ny - car.h / 2, car.w, car.h)) {
            car.x = Math.max(10, Math.min(WORLD - 10, nx));
            car.y = Math.max(10, Math.min(WORLD - 10, ny));
            car.spd = moveSpd;
        } else {
            car.angle += Math.PI; // dead end / blocked — turn around
        }
        car.wheelRotation += moveSpd * 0.1;
    });

    // ===== COP AI (host-authoritative — non-host clients receive cops via snapshot) =====
    cops = cops.filter(c => c.hp > 0);
    updateEngineHum();
    updatePlayerVehicleSiren(dt);
    updateRadio(dt);
    if (isHost) {
        wantedTimer += dt;
        updateSiren();

        if (wanted >= 1 && wantedTimer > 3000 / (wanted + 1)) {
            wantedTimer = 0;
            if (cops.length < wanted * 2 + level) spawnCop();
        }

        // Baseline patrol presence even with no wanted level — a couple of
        // cop cars visibly cruising the city, not chasing anyone
        patrolCheckTimer -= dt;
        if (patrolCheckTimer <= 0) {
            patrolCheckTimer = 4000;
            if (cops.filter(c => c.patrol).length < Math.min(3, 1 + Math.floor(level / 2))) spawnCop(true);
        }

        cops.forEach(c => {
            // Cops chase whichever player (host or a remote) is currently nearest
            let tx = player.x, ty = player.y, targetIsSelf = true, targetId = null;
            let dist = Math.hypot(player.x - c.x, player.y - c.y);
            for (const rid in remotePlayers) {
                const rp = remotePlayers[rid];
                if (!rp.alive) continue;
                const d = Math.hypot(rp.x - c.x, rp.y - c.y);
                if (d < dist) { dist = d; tx = rp.x; ty = rp.y; targetIsSelf = false; targetId = rid; }
            }

            // Patrol cops just cruise like traffic until there's an actual wanted level
            if (c.patrol && wanted === 0) {
                c.aiTurnCheck += dt;
                if (c.aiTurnCheck > 500) {
                    c.aiTurnCheck = 0;
                    if (Math.random() < 0.3) {
                        const turn = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
                        const candidate = c.angle + turn;
                        if (isRoad(c.x + Math.cos(candidate) * 24, c.y + Math.sin(candidate) * 24, 4)) c.angle = candidate;
                    }
                }
                const cruiseSpd = 1.6 * s;
                const cnx = c.x + Math.cos(c.angle) * cruiseSpd * 2;
                const cny = c.y + Math.sin(c.angle) * cruiseSpd * 2;
                if (isRoad(cnx, cny, 4) && !isBuilding(cnx - c.w / 2, cny - c.h / 2, c.w, c.h)) {
                    c.x = cnx; c.y = cny; c.spd = cruiseSpd;
                } else {
                    c.angle += Math.PI;
                }
                c.wheelRotation += cruiseSpd * 0.1;
                return;
            }

            // First frame a cop actually engages — bark an alert
            if (!c.engaged) { c.engaged = true; SFX.copAlert(); }

            const dx = tx - c.x, dy = ty - c.y;
            c.angle = Math.atan2(dy, dx);

            const swatBoost = c.swat ? 1.35 : 1;
            const spd = (1.8 + wanted * 0.3 + level * 0.2) * s * swatBoost;
            let nx = c.x + Math.cos(c.angle) * spd;
            let ny = c.y + Math.sin(c.angle) * spd;

            if (!isBuilding(nx - c.w / 2, ny - c.h / 2, c.w, c.h)) {
                c.x = nx;
                c.y = ny;
                c.spd = spd;
            } else {
                c.spd = 0;
            }

            // Wheel animation for cop cars
            c.wheelRotation = (c.wheelRotation || 0) + spd * 0.05;

            c.shootCD = Math.max(0, c.shootCD - dt);
            if (dist < 200 && c.shootCD <= 0) {
                c.shootCD = (c.swat ? 90 : 120) + Math.random() * 80;
                copBullets.push({
                    x: c.x + Math.cos(c.angle) * 18,
                    y: c.y + Math.sin(c.angle) * 18,
                    vx: Math.cos(c.angle) * 7,
                    vy: Math.sin(c.angle) * 7,
                    life: 50
                });
                addDanger(c.x, c.y);
            }

            if (dist < 18) {
                if (targetIsSelf) {
                    hp = Math.max(0, hp - 1);
                    spawnParticle(player.x, player.y, '#f43f5e', 8, 3);
                    SFX.hurt();
                    updateHUD();
                    if (hp <= 0) {
                        state = 'dead';
                        showOver();
                    }
                } else if (targetId && connections[targetId] && connections[targetId].open) {
                    connections[targetId].send({ type: 'melee_hit' });
                }
            }
        });
    }

    // ===== COP BULLETS =====
    if (isHost) copBullets = copBullets.filter(b => {
        b.x += b.vx * s;
        b.y += b.vy * s;
        b.life -= s;

        if (isBuilding(b.x, b.y)) return false;

        if (Math.hypot(b.x - player.x, b.y - player.y) < 12) {
            hp = Math.max(0, hp - 1);
            spawnParticle(player.x, player.y, '#f43f5e', 8, 3);
            SFX.hurt();
            updateHUD();
            if (hp <= 0) {
                state = 'dead';
                showOver();
            }
            return false;
        }

        return b.life > 0;
    });

    // ===== THROWABLES (molotovs) — physics run for everyone (smooth local
    // motion), but only the host's copy ever spawns a real fire zone =====
    throwables = throwables.filter(t => {
        t.x += t.vx * s;
        t.y += t.vy * s;
        t.life -= s;
        const landed = t.life <= 0 || isBuilding(t.x, t.y);
        if (landed) {
            spawnParticle(t.x, t.y, '#ff6b35', 10, 3);
            if (t.real) {
                fireZones.push({ x: t.x, y: t.y, radius: 45, life: 4000, tickCD: 0, ownerId: t.ownerId });
                SFX.explosion();
            }
            return false;
        }
        return true;
    });

    // Fire-zone damage to shared world entities — host-authoritative
    if (isHost) fireZones.forEach(fz => {
        fz.tickCD -= dt;
        if (fz.tickCD <= 0) {
            fz.tickCD = 500;
            cops.forEach(c => {
                if (c.hp > 0 && Math.hypot(c.x - fz.x, c.y - fz.y) < fz.radius) {
                    c.hp -= 1;
                    if (c.hp <= 0) creditKill(fz.ownerId, 100, 'elimination');
                }
            });
            peds.forEach(p => {
                if (p.alive && Math.hypot(p.x - fz.x, p.y - fz.y) < fz.radius) {
                    p.alive = false;
                    wanted = Math.min(5, wanted + 1);
                    creditKill(fz.ownerId, 20, 'elimination');
                }
            });
            cars.forEach(c => {
                if (!c.driver && c.hp > 0 && Math.hypot(c.x - fz.x, c.y - fz.y) < fz.radius) {
                    c.hp -= 1;
                    if (c.hp <= 0) { spawnExplosion(c.x, c.y); SFX.explosion(); creditKill(fz.ownerId, 200, 'rampage'); }
                }
            });
        }
    });
    // Fire-zone lifecycle is host-authoritative; non-host mirrors via snapshot
    if (isHost) fireZones = fireZones.filter(fz => (fz.life -= dt) > 0);

    // Fire-zone damage to the LOCAL player — runs for every client (host or
    // not), since it only ever touches that client's own hp, same pattern as
    // the melee/copBullet self-damage checks above.
    player.fireDamageCD = Math.max(0, (player.fireDamageCD || 0) - dt);
    if (state === 'playing' && player.fireDamageCD <= 0) {
        const burning = fireZones.some(fz => Math.hypot(player.x - fz.x, player.y - fz.y) < fz.radius);
        if (burning) {
            hp = Math.max(0, hp - 1);
            player.fireDamageCD = 600;
            spawnParticle(player.x, player.y, '#ff6b35', 6, 2);
            SFX.hurt();
            updateHUD();
            if (hp <= 0) { state = 'dead'; showOver(); }
        }
    }

    // ===== PEDESTRIANS (host-authoritative — non-host clients receive peds via snapshot) =====
    if (isHost) peds.forEach(p => {
        if (!p.alive) return;
        p.walkFrame = (p.walkFrame + 0.1) % 4;

        if (p.gang) {
            // Gang members hunt whichever player (host or remote) is nearest —
            // but a closer rival-faction gang member is an even higher priority
            let tx = player.x, ty = player.y, dist = Math.hypot(player.x - p.x, player.y - p.y);
            for (const rid in remotePlayers) {
                const rp = remotePlayers[rid];
                if (!rp.alive) continue;
                const d = Math.hypot(rp.x - p.x, rp.y - p.y);
                if (d < dist) { dist = d; tx = rp.x; ty = rp.y; }
            }
            peds.forEach(rival => {
                if (rival === p || !rival.gang || !rival.alive || rival.faction === p.faction) return;
                const d = Math.hypot(rival.x - p.x, rival.y - p.y);
                if (d < dist) { dist = d; tx = rival.x; ty = rival.y; }
            });
            p.shootCD = Math.max(0, p.shootCD - dt);
            if (dist < 160) {
                if (!p.engaged) { p.engaged = true; SFX.gangShout(); }
                p.angle = Math.atan2(ty - p.y, tx - p.x);
                if (dist > 30) {
                    let nx = p.x + Math.cos(p.angle) * p.spd * 1.3 * s;
                    let ny = p.y + Math.sin(p.angle) * p.spd * 1.3 * s;
                    if (!isBuilding(nx - 3, ny - 3, 6, 6)) { p.x = nx; p.y = ny; }
                }
                if (dist < 160 && p.shootCD <= 0) {
                    p.shootCD = 700 + Math.random() * 400;
                    gangBullets.push({
                        x: p.x + Math.cos(p.angle) * 10, y: p.y + Math.sin(p.angle) * 10,
                        vx: Math.cos(p.angle) * 6.5, vy: Math.sin(p.angle) * 6.5, life: 50,
                        shooterFaction: p.faction
                    });
                    addDanger(p.x, p.y);
                }
            } else {
                p.engaged = false;
            }
            return;
        }

        // Panic near recent gunfire/explosions, regardless of wanted level
        p.panicTimer = Math.max(0, (p.panicTimer || 0) - dt);
        let nearestDanger = null, nearestDist = 90;
        dangerEvents.forEach(d => {
            const dd = Math.hypot(p.x - d.x, p.y - d.y);
            if (dd < nearestDist) { nearestDist = dd; nearestDanger = d; }
        });
        if (nearestDanger) {
            if (p.panicTimer <= 0) SFX.pedScream();
            p.panicTimer = 1300;
            p.angle = Math.atan2(p.y - nearestDanger.y, p.x - nearestDanger.x);
        }

        if (p.panicTimer > 0) {
            let nx = p.x + Math.cos(p.angle) * p.spd * 2.1 * s;
            let ny = p.y + Math.sin(p.angle) * p.spd * 2.1 * s;
            if (!isBuilding(nx - 3, ny - 3, 6, 6) && nx > 0 && nx < WORLD && ny > 0 && ny < WORLD) {
                p.x = nx; p.y = ny;
            } else {
                p.angle += Math.PI * (0.5 + Math.random());
            }
            return;
        }

        if (wanted > 0) {
            p.flee += dt;
            if (p.flee > 500) p.angle = Math.atan2(p.y - player.y, p.x - player.x);
        } else {
            // Occasionally just stop and stand for a bit — not everyone's always walking somewhere
            p.idleTimer = Math.max(0, (p.idleTimer || 0) - dt);
            if (p.idleTimer > 0) return;
            if (Math.random() < 0.002) { p.idleTimer = 1000 + Math.random() * 2000; return; }
            if (Math.random() < 0.005) p.angle += 0.5 * (Math.random() - 0.5) * Math.PI;
        }

        let nx = p.x + Math.cos(p.angle) * p.spd * s;
        let ny = p.y + Math.sin(p.angle) * p.spd * s;

        if (!isBuilding(nx - 3, ny - 3, 6, 6) && nx > 0 && nx < WORLD && ny > 0 && ny < WORLD) {
            p.x = nx;
            p.y = ny;
        } else {
            p.angle += Math.PI * (0.5 + Math.random());
        }
    });

    // ===== GANG BULLETS =====
    if (isHost) gangBullets = gangBullets.filter(b => {
        b.x += b.vx * s;
        b.y += b.vy * s;
        b.life -= s;
        if (isBuilding(b.x, b.y)) return false;
        if (Math.hypot(b.x - player.x, b.y - player.y) < 12) {
            hp = Math.max(0, hp - 1);
            spawnParticle(player.x, player.y, '#f43f5e', 8, 3);
            SFX.hurt();
            updateHUD();
            if (hp <= 0) { state = 'dead'; showOver(); }
            return false;
        }
        // Crossfire — a stray bullet can also hit a rival gang member
        let hitRival = false;
        peds.forEach(p2 => {
            if (hitRival || !p2.gang || !p2.alive || p2.faction === b.shooterFaction) return;
            if (Math.hypot(b.x - p2.x, b.y - p2.y) < 10) {
                p2.hp = (p2.hp || 2) - 1;
                spawnParticle(p2.x, p2.y, '#f43f5e', 6, 2);
                hitRival = true;
                if (p2.hp <= 0) { p2.alive = false; p2.deathTimer = Date.now(); spawnDecal(p2.x, p2.y, 'blood'); }
            }
        });
        if (hitRival) { SFX.pedHit(); return false; }
        return b.life > 0;
    });

    // ===== WANTED LEVEL DECAY =====
    // Uses its own timer (wantedDecayTimer) instead of sharing wantedTimer,
    // which is also reset every cop-spawn cooldown cycle — sharing it meant
    // the decay countdown got wiped out before it could ever reach 8000ms.
    if (isHost) {
        if (wanted > 0 && cops.length === 0) {
            wantedDecayTimer += dt;
        } else {
            wantedDecayTimer = 0;
        }
        if (wanted > 0 && cops.length === 0 && wantedDecayTimer > 8000) {
            wanted = Math.max(0, wanted - 1);
            updateHUD();
            wantedDecayTimer = 0;
        }
    }

    // ===== PARTICLES (with gravity) =====
    particles = particles.filter(p => {
        p.x += p.vx * s;
        p.y += (p.vy + p.gravity) * s;
        p.life -= 0.03 * s;
        p.vx *= 0.9;
        p.vy *= 0.9;
        return p.life > 0;
    });

    // ===== SHELL CASINGS =====
    casings = casings.filter(c => {
        c.x += c.vx * s;
        c.y += c.vy * s;
        c.vx *= 0.88;
        c.vy *= 0.88;
        c.rot += c.rotSpd;
        c.settleTimer += dt;
        if (c.settleTimer > 2500) c.life -= 0.02 * s; // starts fading after resting a while
        return c.life > 0;
    });

    // ===== EXPLOSIONS =====
    explosions = explosions.filter(e => {
        e.life -= 0.02;
        e.radius = (1 - e.life) * e.maxRadius;
        return e.life > 0;
    });

    // ===== CASH GENERATION =====
    score += dt;
    if (Math.floor(score / 5000) > Math.floor((score - dt) / 5000)) {
        cash += 10;
        updateHUD();
    }

    // ===== TYPE-SPECIFIC MISSION PROGRESS (delivery / escape) =====
    // 'elimination' progress is incremented where kills happen; 'rampage' where
    // vehicles are destroyed. Delivery/escape have no discrete "event", so they
    // accumulate continuously here instead. Host-authoritative in multiplayer.
    if (isHost && activeMission && !activeMission.completed) {
        if (activeMission.type === 'delivery' && player.inCar) {
            activeMission.driveDist += Math.abs(player.inCar.spd) * s;
            const distPerPoint = 200; // distance driven per delivery point
            const dProgress = Math.min(activeMission.target, Math.floor(activeMission.driveDist / distPerPoint));
            if (dProgress > activeMission.progress) {
                activeMission.progress = dProgress;
                updateMissionDisplay();
            }
        } else if (activeMission.type === 'escape' && wanted >= 1) {
            activeMission.escapeTimer += dt;
            const msPerPoint = 3000; // ms survived (while wanted) per escape point
            const eProgress = Math.min(activeMission.target, Math.floor(activeMission.escapeTimer / msPerPoint));
            if (eProgress > activeMission.progress) {
                activeMission.progress = eProgress;
                updateMissionDisplay();
            }
        }
    }

    // ===== MISSION PROGRESS =====
    if (isHost && activeMission && !activeMission.completed) {
        if (activeMission.progress >= activeMission.target) {
            activeMission.completed = true;
            cash += Math.floor(activeMission.reward);
            level++;
            SFX.missionComplete();
            showNotification('✓ MISSION COMPLETE! +$' + Math.floor(activeMission.reward) + ' +LEVEL');
            saveGame();

            missions.push(createMission());
            activeMission = missions[missions.length - 1];
            SFX.missionStart();
            showNotification('NEW MISSION: ' + activeMission.type.toUpperCase() + ' (' + missionObjectiveText(activeMission) + ')');
            updateHUD();
            updateMissionDisplay();
        }
    }
}

// ============================================
// DRAWING — SCREEN SHAKE AWARE
// ============================================
function drawRotatedRect(c, x, y, w, h, angle, fillCol, strokeCol) {
    c.save();
    c.translate(
        x - cam.x + (Math.random() - 0.5) * screenShake,
        y - cam.y + (Math.random() - 0.5) * screenShake
    );
    c.rotate(angle);
    c.fillStyle = fillCol;
    c.fillRect(-w / 2, -h / 2, w, h);
    if (strokeCol) {
        c.strokeStyle = strokeCol;
        c.lineWidth = 1.5;
        c.strokeRect(-w / 2, -h / 2, w, h);
    }
    c.restore();
}

// ============================================
// VEHICLE DRAWING — UNIQUE DESIGNS (v3)
// ============================================
// Builds a rounded, front-tapered car silhouette (top-down) instead of a flat
// rectangle — sharper curve at the nose, squarer at the rear, so front/back
// actually read as different ends of a vehicle rather than a plain box.
function carBodyPath(c, w, h) {
    const r = h / 2.6;
    const nr = r * 1.6; // nose gets a tighter curve than the tail
    c.beginPath();
    c.moveTo(-w / 2 + r, -h / 2);
    c.lineTo(w / 2 - nr, -h / 2);
    c.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + nr);
    c.lineTo(w / 2, h / 2 - nr);
    c.quadraticCurveTo(w / 2, h / 2, w / 2 - nr, h / 2);
    c.lineTo(-w / 2 + r, h / 2);
    c.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    c.lineTo(-w / 2, -h / 2 + r);
    c.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    c.closePath();
}

// Side mirrors + door seam lines, shared by the sedan-shaped vehicles
function drawCarDetails(c, w, h) {
    c.fillStyle = '#1a1a1a';
    c.fillRect(w * 0.14, -h / 2 - 1.5, 2, 1.5);
    c.fillRect(w * 0.14, h / 2, 2, 1.5);
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 0.6;
    [w * 0.05, w * 0.28].forEach(sx => {
        c.beginPath();
        c.moveTo(sx, -h / 2 + 1);
        c.lineTo(sx, h / 2 - 1);
        c.stroke();
    });
}

function drawVehicle(c, car) {
    c.save();
    c.translate(car.x - cam.x, car.y - cam.y);
    c.rotate(car.angle);

    // Drop shadow (drawn first, in the same rotated frame — good enough approximation
    // for a top-down view and much cheaper than an unrotated projected shadow)
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.ellipse(1.5, car.h / 2 - 1, car.w / 2 + 1, car.h / 3, 0, 0, Math.PI * 2);
    c.fill();

    switch (car.type) {
        case 'CAR':       drawCar(c, car);       break;
        case 'TRUCK':     drawTruck(c, car);     break;
        case 'BIKE':      drawBike(c, car);      break;
        case 'POLICE':    drawPoliceCar(c, car); break;
        case 'AMBULANCE': drawAmbulance(c, car); break;
        default:          drawCar(c, car);
    }

    c.restore();
}

// Builds a top-lit gradient across the vehicle body for a bit of dimensionality
function vehicleBodyGradient(c, car, baseCol) {
    const g = c.createLinearGradient(0, -car.h / 2, 0, car.h / 2);
    g.addColorStop(0, shadeColor(baseCol, 45));
    g.addColorStop(0.5, baseCol);
    g.addColorStop(1, shadeColor(baseCol, -35));
    return g;
}

// Draws a small rooftop detail so building tops aren't perfectly flat/empty
function drawRoofProp(c, bx, by, bw, bh, type) {
    const cx = bx + bw / 2;
    if (type === 'ac') {
        const boxW = Math.min(14, bw * 0.35), boxH = 8;
        const bxp = cx - boxW / 2, byp = by + bh * 0.25;
        c.fillStyle = '#5a5a5a';
        c.fillRect(bxp, byp, boxW, boxH);
        c.fillStyle = '#3a3a3a';
        for (let i = 2; i < boxW - 2; i += 3) c.fillRect(bxp + i, byp + 1, 1.5, boxH - 2);
    } else if (type === 'tower') {
        const legY = by + bh * 0.18;
        c.strokeStyle = '#444';
        c.lineWidth = 1;
        [-6, 6].forEach(dx => {
            c.beginPath();
            c.moveTo(cx + dx, legY + 10);
            c.lineTo(cx + dx * 0.4, legY);
            c.stroke();
        });
        c.fillStyle = '#6b6b6b';
        c.beginPath();
        c.ellipse(cx, legY, 8, 6, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#555';
        c.fillRect(cx - 8, legY - 3, 16, 3);
    } else if (type === 'antenna') {
        const topY = by + bh * 0.15;
        c.strokeStyle = '#666';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(cx, by + bh * 0.3);
        c.lineTo(cx, topY);
        c.stroke();
        const blink = Math.floor(Date.now() / 700) % 2 === 0;
        c.fillStyle = (nightFactor > 0.2 && blink) ? '#ff3b3b' : '#7a2a2a';
        c.beginPath();
        c.arc(cx, topY, 1.6, 0, Math.PI * 2);
        c.fill();
    }
}

function drawCar(c, car) {
    const w = car.w, h = car.h;
    carBodyPath(c, w, h);
    c.fillStyle = vehicleBodyGradient(c, car, car.col);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.4)';
    c.lineWidth = 0.8;
    c.stroke();

    // Headlights (nose)
    c.fillStyle = '#ffff99';
    c.fillRect(w / 2 - 2, -h / 2 + 1.5, 2, 1.5);
    c.fillRect(w / 2 - 2, h / 2 - 3, 2, 1.5);
    // Taillights (tail)
    c.fillStyle = '#ff4444';
    c.fillRect(-w / 2 + 0.5, -h / 2 + 1.5, 1.8, 1.5);
    c.fillRect(-w / 2 + 0.5, h / 2 - 3, 1.8, 1.5);

    // Windshield + roof + rear windshield (cabin greenhouse, inset from the body)
    const cabinFront = w * 0.22, cabinBack = -w * 0.08, roofFront = w * 0.1;
    const gw = c.createLinearGradient(0, -h / 2, 0, h / 2);
    gw.addColorStop(0, '#dff3ff99');
    gw.addColorStop(0.5, shadeColor(car.col, -55));
    gw.addColorStop(1, '#87ceeb55');
    c.fillStyle = gw;
    c.beginPath();
    c.moveTo(cabinFront, -h / 2 + 1.5);
    c.lineTo(roofFront, -h / 2 + 2.2);
    c.lineTo(cabinBack, -h / 2 + 2.2);
    c.lineTo(cabinBack - 3, -h / 2 + 1.5);
    c.lineTo(cabinBack - 3, h / 2 - 1.5);
    c.lineTo(cabinBack, h / 2 - 2.2);
    c.lineTo(roofFront, h / 2 - 2.2);
    c.lineTo(cabinFront, h / 2 - 1.5);
    c.closePath();
    c.fill();

    drawCarDetails(c, w, h);
    drawWheels(c, car);
}

function drawTruck(c, car) {
    c.fillStyle = vehicleBodyGradient(c, car, car.col);
    c.fillRect(-car.w / 2, -car.h / 2, car.w * 0.7, car.h);
    c.strokeStyle = '#00000055';
    c.lineWidth = 1;
    for (let i = -car.h / 2 + 2; i < car.h / 2; i += 3) {
        c.beginPath();
        c.moveTo(-car.w / 2 + 2, i);
        c.lineTo(-car.w / 2 + car.w * 0.7 - 2, i);
        c.stroke();
    }
    c.fillStyle = vehicleBodyGradient(c, car, car.col);
    c.fillRect(-car.w / 2 + car.w * 0.65, -car.h / 2, car.w * 0.35, car.h);
    c.beginPath();
    c.moveTo(-car.w / 2 + car.w * 0.65, -car.h / 2 - 1);
    c.lineTo(-car.w / 2 + car.w, -car.h / 2 - 1);
    c.lineTo(-car.w / 2 + car.w - 2, -car.h / 2 - 3);
    c.lineTo(-car.w / 2 + car.w * 0.65 + 2, -car.h / 2 - 3);
    c.fill();
    c.fillStyle = '#87ceeb88';
    c.fillRect(-car.w / 2 + car.w * 0.67, -car.h / 2 + 2, car.w * 0.3, 3);
    c.fillStyle = '#ffff99';
    c.fillRect(-car.w / 2 + car.w * 0.68, -car.h / 2 + 2, 1.5, 1);
    c.fillRect(-car.w / 2 + car.w * 0.68, -car.h / 2 + 5, 1.5, 1);
    drawTruckWheels(c, car);
}

function drawBike(c, car) {
    c.fillStyle = vehicleBodyGradient(c, car, car.col);
    c.beginPath();
    c.moveTo(-car.w / 2, 0);
    c.quadraticCurveTo(-car.w / 2 + car.w / 3, -car.h / 2, car.w / 2, 0);
    c.quadraticCurveTo(-car.w / 2 + car.w / 3, car.h / 2, -car.w / 2, 0);
    c.fill();
    c.fillStyle = '#000';
    c.beginPath();
    c.moveTo(car.w / 2 - 3, -car.h / 2 + 1);
    c.lineTo(car.w / 2, -car.h / 2);
    c.lineTo(car.w / 2, car.h / 2);
    c.lineTo(car.w / 2 - 3, car.h / 2 - 1);
    c.fill();
    c.fillStyle = '#ffff99';
    c.beginPath();
    c.arc(car.w / 2 - 1, 0, 1.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#666';
    c.fillRect(-car.w / 2 + 2, -car.h / 2 + 2, 3, 3);
    drawBikeWheels(c, car);
}

function drawPoliceCar(c, car) {
    const w = car.w, h = car.h;
    carBodyPath(c, w, h);
    c.fillStyle = vehicleBodyGradient(c, car, car.col);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.4)';
    c.lineWidth = 0.8;
    c.stroke();

    // White door stripe
    c.save();
    carBodyPath(c, w, h);
    c.clip();
    c.fillStyle = '#ffffff';
    c.fillRect(-3, -h / 2, 6, h);
    c.restore();

    // Headlights / taillights
    c.fillStyle = '#ffff99';
    c.fillRect(w / 2 - 2, -h / 2 + 1.5, 2, 1.5);
    c.fillRect(w / 2 - 2, h / 2 - 3, 2, 1.5);
    c.fillStyle = '#ff4444';
    c.fillRect(-w / 2 + 0.5, -h / 2 + 1.5, 1.8, 1.5);
    c.fillRect(-w / 2 + 0.5, h / 2 - 3, 1.8, 1.5);

    // Light bar (roof), just behind the windshield
    c.fillStyle = '#222';
    c.fillRect(w * 0.02, -h / 2 + 0.5, 5, h - 1);
    c.fillStyle = '#f43f5e';
    c.fillRect(w * 0.02, -h / 2 + 0.5, 5, h / 2 - 0.5);
    c.fillStyle = '#60a5fa';
    c.fillRect(w * 0.02, 0, 5, h / 2 - 0.5);

    // Windshield
    const gw = c.createLinearGradient(0, -h / 2, 0, h / 2);
    gw.addColorStop(0, '#dff3ff99');
    gw.addColorStop(0.5, shadeColor(car.col, -55));
    gw.addColorStop(1, '#87ceeb55');
    c.fillStyle = gw;
    c.beginPath();
    c.moveTo(w * 0.22, -h / 2 + 1.5);
    c.lineTo(w * 0.08, -h / 2 + 2.2);
    c.lineTo(-w * 0.12, -h / 2 + 2.2);
    c.lineTo(-w * 0.15, -h / 2 + 1.5);
    c.lineTo(-w * 0.15, h / 2 - 1.5);
    c.lineTo(-w * 0.12, h / 2 - 2.2);
    c.lineTo(w * 0.08, h / 2 - 2.2);
    c.lineTo(w * 0.22, h / 2 - 1.5);
    c.closePath();
    c.fill();

    drawCarDetails(c, w, h);
    drawWheels(c, car);
}

function drawAmbulance(c, car) {
    const w = car.w, h = car.h;
    carBodyPath(c, w, h);
    c.fillStyle = vehicleBodyGradient(c, car, '#f5f5f5');
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.4)';
    c.lineWidth = 0.8;
    c.stroke();

    // Headlights / taillights
    c.fillStyle = '#ffff99';
    c.fillRect(w / 2 - 2, -h / 2 + 1.5, 2, 1.5);
    c.fillRect(w / 2 - 2, h / 2 - 3, 2, 1.5);
    c.fillStyle = '#ff4444';
    c.fillRect(-w / 2 + 0.5, -h / 2 + 1.5, 1.8, 1.5);
    c.fillRect(-w / 2 + 0.5, h / 2 - 3, 1.8, 1.5);

    // Red cross on the box body
    c.fillStyle = '#e11d2e';
    c.fillRect(-w * 0.15, -1, w * 0.3, 2);
    c.fillRect(-w * 0.02, -h * 0.28, w * 0.04, h * 0.56);

    // Light bar (roof)
    c.fillStyle = '#222';
    c.fillRect(w * 0.02, -h / 2 + 0.5, 5, h - 1);
    const flashOn = Math.floor(Date.now() / 180) % 2 === 0;
    c.fillStyle = flashOn ? '#ff3b3b' : '#7a1010';
    c.fillRect(w * 0.02, -h / 2 + 0.5, 5, h / 2 - 0.5);
    c.fillStyle = flashOn ? '#7a1010' : '#ff3b3b';
    c.fillRect(w * 0.02, 0, 5, h / 2 - 0.5);

    // Windshield
    const gw = c.createLinearGradient(0, -h / 2, 0, h / 2);
    gw.addColorStop(0, '#dff3ff99');
    gw.addColorStop(0.5, '#c9c9c9');
    gw.addColorStop(1, '#87ceeb55');
    c.fillStyle = gw;
    c.beginPath();
    c.moveTo(w * 0.22, -h / 2 + 1.5);
    c.lineTo(w * 0.08, -h / 2 + 2.2);
    c.lineTo(-w * 0.1, -h / 2 + 2.2);
    c.lineTo(-w * 0.13, -h / 2 + 1.5);
    c.lineTo(-w * 0.13, h / 2 - 1.5);
    c.lineTo(-w * 0.1, h / 2 - 2.2);
    c.lineTo(w * 0.08, h / 2 - 2.2);
    c.lineTo(w * 0.22, h / 2 - 1.5);
    c.closePath();
    c.fill();

    drawCarDetails(c, w, h);
    drawWheels(c, car);
}

// ============================================
// WHEEL HELPERS
// ============================================
function drawWheel(c, size) {
    c.fillStyle = '#111';
    c.beginPath();
    c.arc(0, 0, size, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#888';
    c.beginPath();
    c.arc(0, 0, size * 0.6, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#333';
    c.lineWidth = 0.5;
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        c.beginPath();
        c.moveTo(Math.cos(angle) * size * 0.3, Math.sin(angle) * size * 0.3);
        c.lineTo(Math.cos(angle) * size * 0.8, Math.sin(angle) * size * 0.8);
        c.stroke();
    }
}

function drawWheels(c, car) {
    const positions = [
        [-car.w / 3, -car.h / 2 + 1],
        [-car.w / 3,  car.h / 2 - 1],
        [ car.w / 3, -car.h / 2 + 1],
        [ car.w / 3,  car.h / 2 - 1]
    ];
    positions.forEach(([wx, wy]) => {
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.beginPath();
        c.ellipse(wx, wy, 3.2, 2, 0, 0, Math.PI * 2);
        c.fill();
        c.save();
        c.translate(wx, wy);
        c.rotate(car.wheelRotation);
        drawWheel(c, 2.5);
        c.restore();
    });
}

function drawTruckWheels(c, car) {
    const frontPos = [
        [-car.w / 2 + 5, -car.h / 2 + 1],
        [-car.w / 2 + 5,  car.h / 2 - 1]
    ];
    const rearPos = [
        [car.w / 3,     -car.h / 2],
        [car.w / 3 + 2, -car.h / 2],
        [car.w / 3,      car.h / 2],
        [car.w / 3 + 2,  car.h / 2]
    ];
    frontPos.forEach(([wx, wy]) => {
        c.save(); c.translate(wx, wy); c.rotate(car.wheelRotation); drawWheel(c, 2.5); c.restore();
    });
    rearPos.forEach(([wx, wy]) => {
        c.save(); c.translate(wx, wy); c.rotate(car.wheelRotation); drawWheel(c, 3); c.restore();
    });
}

function drawBikeWheels(c, car) {
    [[ car.w / 2 - 4, 0], [-car.w / 2 + 2, 0]].forEach(([wx, wy]) => {
        c.save(); c.translate(wx, wy); c.rotate(car.wheelRotation); drawWheel(c, 2); c.restore();
    });
}

// ============================================
// PLAYER DRAWING — HUMANOID CHARACTER
// ============================================
// Draws a weapon at the current origin, pointing in the +x (forward) direction.
// Each weapon type gets a genuinely different silhouette, not just a recolor.
function drawWeapon(c, type) {
    switch (type) {
        case 'RIFLE':
            c.fillStyle = '#2b2b2b';
            c.fillRect(0, -1, 15, 2);                 // long barrel
            c.fillRect(-3, -1.5, 4, 3);                // receiver
            c.fillStyle = '#4a3524';
            c.fillRect(-6, -0.5, 4, 2);                 // stock
            c.fillStyle = '#1a1a1a';
            c.fillRect(3, 1, 1.5, 3);                 // foregrip
            break;

        case 'SHOTGUN':
            c.fillStyle = '#3a2b1a';
            c.fillRect(-5, -1, 5, 2.5);                // wood stock
            c.fillStyle = '#2b2b2b';
            c.fillRect(0, -1.3, 12, 2.6);                 // thick barrel
            c.fillStyle = '#4a4a4a';
            c.fillRect(2, 0.8, 4, 1.6);               // pump foregrip
            break;

        case 'MINIGUN':
            c.fillStyle = '#333';
            c.fillRect(-4, -3, 6, 6);                  // ammo box body
            c.fillStyle = '#222';
            [-1.6, 0, 1.6].forEach(o => c.fillRect(2, o - 0.6, 11, 1.2)); // barrel cluster
            c.fillStyle = '#555';
            c.beginPath();
            c.arc(2, 0, 2, 0, Math.PI * 2);            // barrel hub
            c.fill();
            break;

        case 'SNIPER':
            c.fillStyle = '#241f17';
            c.fillRect(-7, -0.8, 6, 1.6);               // stock
            c.fillStyle = '#2b2b2b';
            c.fillRect(-1, -1, 19, 2);                  // long barrel
            c.fillStyle = '#1a3a1a';
            c.fillRect(2, -3, 6, 1.8);                  // scope body
            c.fillStyle = '#8ecae6';
            c.fillRect(3, -3.3, 1.4, 0.7);               // scope lens glint
            break;

        case 'MELEE':
            c.fillStyle = '#7a5230';
            c.fillRect(-2, -1.1, 14, 2.2);               // bat handle-to-barrel taper
            c.fillStyle = '#8a6238';
            c.fillRect(9, -1.8, 6, 3.6);                 // bat head (thicker end)
            c.strokeStyle = '#5a3d20';
            c.lineWidth = 0.6;
            c.strokeRect(-2, -1.1, 14, 2.2);
            break;

        default: // PISTOL
            c.fillStyle = '#2b2b2b';
            c.fillRect(0, -1, 6, 2);                   // slide/barrel
            c.fillRect(-1, 1, 2.5, 4);                  // grip
            c.fillStyle = '#888';
            c.fillRect(5.5, -0.6, 1.5, 1.2);              // barrel tip highlight
    }
}

function drawPlayer(c, p) {
    c.save();
    c.translate(
        p.x - cam.x + (Math.random() - 0.5) * screenShake,
        p.y - cam.y + (Math.random() - 0.5) * screenShake
    );
    c.rotate(p.angle);

    // Drop shadow
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.ellipse(0, 6, 6, 3, 0, 0, Math.PI * 2);
    c.fill();

    const walk = Math.sin(p.animFrame * Math.PI / 2);
    const legSwing = walk * 3.5;
    const armSwing = walk * 2;

    const darkenHex = (hex, amt) => {
        const n = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (n >> 16) - amt);
        const g = Math.max(0, ((n >> 8) & 0xff) - amt);
        const b = Math.max(0, (n & 0xff) - amt);
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    };
    const darkColor = darkenHex(p.color, 40);

    c.lineCap = 'round';

    // ---- LEGS (thin stick limbs) ----
    c.strokeStyle = darkColor;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-1.5, 3);
    c.lineTo(-3 + legSwing * 0.3, 9);
    c.moveTo(1.5, 3);
    c.lineTo(3 - legSwing * 0.3, 9);
    c.stroke();

    // ---- BACK ARM (thin stick limb, non-gun side) ----
    c.strokeStyle = p.color;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(-1, -2);
    c.lineTo(-4 - armSwing * 0.2, 1);
    c.stroke();

    // ---- TORSO (slim stick-figure body, not a filled blob) ----
    c.strokeStyle = p.color;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(0, -6);
    c.lineTo(0, 3);
    c.stroke();

    // ---- FORWARD ARM + WEAPON ----
    c.save();
    c.translate(3, -1);
    c.rotate(armSwing * 0.03);
    c.strokeStyle = p.color;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(4, 0.5);
    c.stroke();
    c.translate(4, 0.5);
    drawWeapon(c, p.weapon || 'PISTOL');
    c.restore();

    // ---- HEAD (big relative to body — classic stick-figure proportions) ----
    c.save();
    c.translate(0, -9);

    c.fillStyle = p.head;
    c.beginPath();
    c.arc(0, 0, 5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = darkenHex(p.head, 40);
    c.lineWidth = 1;
    c.stroke();

    // Eyes (face forward = +x in rotated space)
    c.fillStyle = '#111';
    c.beginPath();
    c.arc(2.5, -1.3, 0.9, 0, Math.PI * 2);
    c.arc(2.5, 1.3, 0.9, 0, Math.PI * 2);
    c.fill();

    c.restore();

    c.restore();
}

// ============================================
// MAIN DRAW LOOP
// ============================================
function draw() {
    // Ground — subtly tinted toward blue as night falls
    ctx.fillStyle = shadeColor('#1a1a1a', -Math.floor(nightFactor * 8));
    ctx.fillRect(0, 0, W, H);

    // Roads
    ctx.fillStyle = COLORS.road;
    roads.forEach(r => ctx.fillRect(r.x - cam.x, r.y - cam.y, r.w, r.h));

    // Sidewalk / curb edges (uses the previously-unused COLORS.sidewalk)
    ctx.strokeStyle = COLORS.sidewalk;
    ctx.lineWidth = 3;
    roads.forEach(r => ctx.strokeRect(r.x - cam.x + 1.5, r.y - cam.y + 1.5, r.w - 3, r.h - 3));

    // Lane markings
    ctx.strokeStyle = COLORS.lane;
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 15]);
    roads.forEach(r => {
        ctx.beginPath();
        if (r.w > r.h) {
            ctx.moveTo(r.x - cam.x, r.y + r.h / 2 - cam.y);
            ctx.lineTo(r.x + r.w - cam.x, r.y + r.h / 2 - cam.y);
        } else {
            ctx.moveTo(r.x + r.w / 2 - cam.x, r.y - cam.y);
            ctx.lineTo(r.x + r.w / 2 - cam.x, r.y + r.h - cam.y);
        }
        ctx.stroke();
    });
    ctx.setLineDash([]);

    // Wet-road sheen when raining
    if (rainIntensity > 0.02) {
        roads.forEach(r => {
            const rx = r.x - cam.x, ry = r.y - cam.y;
            if (rx > -r.w && rx < W && ry > -r.h && ry < H) {
                const horiz = r.w > r.h;
                const g = horiz
                    ? ctx.createLinearGradient(rx, ry, rx, ry + r.h)
                    : ctx.createLinearGradient(rx, ry, rx + r.w, ry);
                g.addColorStop(0, `rgba(120,150,180,${(rainIntensity * 0.10).toFixed(3)})`);
                g.addColorStop(0.5, `rgba(200,220,240,${(rainIntensity * 0.18).toFixed(3)})`);
                g.addColorStop(1, `rgba(120,150,180,${(rainIntensity * 0.10).toFixed(3)})`);
                ctx.fillStyle = g;
                ctx.fillRect(rx, ry, r.w, r.h);
            }
        });
    }

    // Streetlight poles (glow itself is added later, in the lighting pass)
    const visibleLights = streetlights.filter(l => {
        const lx = l.x - cam.x, ly = l.y - cam.y;
        return lx > -20 && lx < W + 20 && ly > -20 && ly < H + 20;
    });
    visibleLights.forEach(l => {
        const lx = l.x - cam.x, ly = l.y - cam.y;
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(lx - 1, ly - 10, 2, 10);
        ctx.fillStyle = nightFactor > 0.15 ? '#ffe9a8' : '#555';
        ctx.beginPath();
        ctx.arc(lx, ly - 11, 2.2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Ground decals (skid marks, blood) — sit under everything else
    decals.forEach(d => {
        const dx = d.x - cam.x, dy = d.y - cam.y;
        if (dx < -20 || dx > W + 20 || dy < -20 || dy > H + 20) return;
        if (d.type === 'blood') {
            ctx.fillStyle = 'rgba(120,10,10,0.55)';
            ctx.beginPath();
            ctx.ellipse(dx, dy, d.size, d.size * 0.7, d.rot, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = 'rgba(20,20,20,0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(dx, dy, d.size, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    // Buildings — gradient body, drop shadow, rooftop cap, lit/dark windows
    buildings.forEach(b => {
        const bx = b.x - cam.x;
        const by = b.y - cam.y;
        if (bx > -80 && bx < W + 80 && by > -80 && by < H + 80) {
            // Cast shadow on the ground, down-and-right of the building
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.fillRect(bx + 4, by + 4, b.w, b.h);

            // Body with a top-left light source gradient
            const col = shadeColor(b.col, b.shadeVariance);
            const g = ctx.createLinearGradient(bx, by, bx + b.w, by + b.h);
            g.addColorStop(0, shadeColor(col, 28));
            g.addColorStop(0.55, col);
            g.addColorStop(1, shadeColor(col, -25));
            ctx.fillStyle = g;
            ctx.fillRect(bx, by, b.w, b.h);

            // Rooftop cap (parapet highlight)
            ctx.fillStyle = shadeColor(col, 40);
            ctx.fillRect(bx, by, b.w, 2);

            if (b.roofProp) drawRoofProp(ctx, bx, by, b.w, b.h, b.roofProp);

            ctx.strokeStyle = '#111';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, b.w, b.h);

            // Windows — lit ones glow warm at night, dim during day; unlit are cool glass
            const t = Date.now() / 1000;
            b.windows.forEach(win => {
                const wx = bx + win.x, wy = by + win.y;
                if (win.lit) {
                    let intensity = 1;
                    if (win.flicker) {
                        // irregular flicker: combine two sines + a step so it reads as "electrical", not smooth breathing
                        intensity = 0.55 + 0.45 * Math.sin(t * 9 + win.phase) * Math.sin(t * 2.3 + win.phase);
                        intensity = Math.max(0.15, intensity);
                    }
                    const base = nightFactor > 0.2 ? 0.87 : 0.33;
                    ctx.fillStyle = hexToRgba('#ffe066', base * intensity);
                } else {
                    ctx.fillStyle = nightFactor > 0.4 ? '#1b2a3a99' : '#87ceeb44';
                }
                ctx.fillRect(wx, wy, 6, 6);
            });
        }
    });

    // Dead pedestrians — brief collapse animation instead of an instant swap
    peds.filter(p => !p.alive).forEach(p => {
        const elapsed = Date.now() - (p.deathTimer || 0);
        const t = Math.min(1, elapsed / 400);
        ctx.save();
        ctx.translate(p.x - cam.x, p.y - cam.y);
        ctx.rotate((p.angle || 0) + t * Math.PI / 2); // tips over onto its side
        ctx.globalAlpha = 0.5 + 0.5 * (1 - t);
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(-4, -1.5 * (1 - t) - 1, 8, 3 + 2 * t);
        ctx.restore();
        ctx.globalAlpha = 1;
    });

    // Live pedestrians (animated)
    peds.filter(p => p.alive).forEach(p => {
        ctx.save();
        ctx.translate(p.x - cam.x, p.y - cam.y);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 4, 4.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        const legSwing = Math.sin(p.walkFrame * Math.PI / 2) * 2;
        ctx.fillStyle = p.col;
        ctx.fillRect(-4 + legSwing, -4, 8, 8);
        ctx.fillStyle = shadeColor(p.col, -30);
        ctx.fillRect(-4 + legSwing, 1, 8, 3);
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(0, -6, 3, 0, Math.PI * 2);
        ctx.fill();
        if (p.gang) {
            ctx.fillStyle = p.faction === 0 ? '#dc2626' : '#2563eb';
            ctx.fillRect(-3, -7.5, 6, 1.6); // bandana, colored by faction
        }
        ctx.restore();
    });

    // Gang gunfire
    gangBullets.forEach(b => {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(b.x - cam.x, b.y - cam.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // Vehicles
    cars.filter(c => c.hp > 0).forEach(c => drawVehicle(ctx, c));

    // Cop cars with alternating lights
    cops.forEach(c => {
        drawVehicle(ctx, c);
        ctx.save();
        ctx.translate(c.x - cam.x, c.y - cam.y);
        ctx.rotate(c.angle);
        const isRedLight = Math.floor(Date.now() / 200) % 2 === 0;
        ctx.fillStyle = isRedLight ? '#f43f5e' : '#60a5fa';
        ctx.fillRect(-4, -2, 4, 4);
        ctx.fillStyle = isRedLight ? '#60a5fa' : '#f43f5e';
        ctx.fillRect(4, -2, 4, 4);
        ctx.restore();
    });

    // Player
    if (!player.inCar) {
        player.weapon = currentWeapon;
        drawPlayer(ctx, player);
    }

    // Other connected players (multiplayer)
    if (isMultiplayer) {
        for (const rid in remotePlayers) {
            const rp = remotePlayers[rid];
            if (!rp.alive) continue;
            const rx = rp.x - cam.x, ry = rp.y - cam.y;
            if (rx < -20 || rx > W + 20 || ry < -20 || ry > H + 20) continue;
            drawPlayer(ctx, {
                x: rp.x, y: rp.y, angle: rp.angle, animFrame: 0,
                color: (rp.skin && rp.skin.color) || '#f5c542',
                head: (rp.skin && rp.skin.head) || '#fde68a',
                weapon: rp.weapon || 'PISTOL'
            });
            ctx.fillStyle = '#e5e7eb';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(rp.name || 'Player', rx, ry - 16);
        }
    }

    // Player bullets
    bullets.forEach(b => {
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(b.x - cam.x, b.y - cam.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffab40';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Cop bullets
    copBullets.forEach(b => {
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(b.x - cam.x, b.y - cam.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // Thrown molotovs (spinning bottle with a lit fuse trail)
    throwables.forEach(t => {
        const tx = t.x - cam.x, ty = t.y - cam.y;
        ctx.fillStyle = '#3a5f3a';
        ctx.beginPath();
        ctx.arc(tx, ty, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff9d3b';
        ctx.beginPath();
        ctx.arc(tx + Math.cos(Date.now() / 40) * 1.5, ty - 3, 1.6, 0, Math.PI * 2);
        ctx.fill();
    });

    // Fire zones (flickering ground fire from a landed molotov)
    fireZones.forEach(fz => {
        const fx = fz.x - cam.x, fy = fz.y - cam.y;
        const flicker = 0.75 + Math.sin(Date.now() / 90 + fz.x) * 0.25;
        const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fz.radius);
        grad.addColorStop(0, `rgba(255,180,60,${(0.55 * flicker).toFixed(3)})`);
        grad.addColorStop(0.6, `rgba(255,90,30,${(0.35 * flicker).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fx, fy, fz.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Shell casings
    casings.forEach(c => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, c.life);
        ctx.translate(c.x - cam.x, c.y - cam.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(-1.5, -0.6, 3, 1.2);
        ctx.restore();
    });
    ctx.globalAlpha = 1;

    // Particles (variable size + gravity)
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x - cam.x, p.y - cam.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Explosions with outline
    explosions.forEach(e => {
        ctx.globalAlpha = e.life;
        ctx.fillStyle = COLORS.explosion;
        ctx.beginPath();
        ctx.arc(e.x - cam.x, e.y - cam.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffab40';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // ===== DAY/NIGHT LIGHTING PASS =====
    // Darken the whole scene toward night (and a bit under overcast rain), then punch
    // light sources back through with an additive ('lighter') blend so they glow.
    const darkAlpha = Math.min(0.75, nightFactor * 0.55 + rainIntensity * 0.12);
    if (darkAlpha > 0.01) {
        ctx.fillStyle = `rgba(10,14,22,${darkAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
    }

    if (nightFactor > 0.01) {
        ctx.globalCompositeOperation = 'lighter';

        // Streetlight glow
        visibleLights.forEach(l => {
            const lx = l.x - cam.x, ly = l.y - cam.y - 11;
            const radius = 42;
            const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
            glow.addColorStop(0, `rgba(255,232,168,${(nightFactor * 0.55).toFixed(3)})`);
            glow.addColorStop(1, 'rgba(255,232,168,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(lx, ly, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Wet-road reflections — streetlights streak downward on the shiny road surface
        if (rainIntensity > 0.02) {
            visibleLights.forEach(l => {
                const lx = l.x - cam.x, ly = l.y - cam.y - 11;
                const a = (nightFactor * rainIntensity * 0.4);
                const refl = ctx.createLinearGradient(lx, ly + 4, lx, ly + 60);
                refl.addColorStop(0, `rgba(255,232,168,${a.toFixed(3)})`);
                refl.addColorStop(1, 'rgba(255,232,168,0)');
                ctx.fillStyle = refl;
                ctx.fillRect(lx - 10, ly + 4, 20, 56);
            });
        }

        // Lit-window glow (subtle, only for on-screen buildings)
        buildings.forEach(b => {
            const bx = b.x - cam.x, by = b.y - cam.y;
            if (bx > -40 && bx < W + 40 && by > -40 && by < H + 40) {
                b.windows.forEach(win => {
                    if (!win.lit) return;
                    const wx = bx + win.x + 3, wy = by + win.y + 3;
                    const glow = ctx.createRadialGradient(wx, wy, 0, wx, wy, 10);
                    glow.addColorStop(0, `rgba(255,224,102,${(nightFactor * 0.35).toFixed(3)})`);
                    glow.addColorStop(1, 'rgba(255,224,102,0)');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(wx, wy, 10, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        });

        // Vehicle headlights — a soft elongated glow projected in front of moving cars
        const movingVehicles = [...cars.filter(c => c.hp > 0), ...cops];
        movingVehicles.forEach(c => {
            if (Math.abs(c.spd) < 0.4) return;
            const dir = c.spd > 0 ? c.angle : c.angle + Math.PI;
            const cx = c.x - cam.x, cy = c.y - cam.y;
            const len = 46;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(dir);
            const glow = ctx.createRadialGradient(len * 0.3, 0, 0, len * 0.3, 0, len * 0.75);
            glow.addColorStop(0, `rgba(255,250,210,${(nightFactor * 0.45).toFixed(3)})`);
            glow.addColorStop(1, 'rgba(255,250,210,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.ellipse(len * 0.35, 0, len * 0.75, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        ctx.globalCompositeOperation = 'source-over';
    }

    // Rain (screen-space streaks) and occasional lightning flash
    if (rainIntensity > 0.02) {
        ctx.strokeStyle = `rgba(190,210,230,${(rainIntensity * 0.5).toFixed(3)})`;
        ctx.lineWidth = 1;
        rainDrops.forEach(d => {
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x + 2, d.y + d.len);
            ctx.stroke();
        });
    }
    if (lightningFlash > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${(lightningFlash * 0.5).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
    }

    // Minimap
    mctx.fillStyle = '#111';
    mctx.fillRect(0, 0, 100, 100);
    const scl = 100 / WORLD;

    mctx.fillStyle = '#333';
    roads.forEach(r => mctx.fillRect(r.x * scl, r.y * scl, r.w * scl, r.h * scl));

    mctx.fillStyle = '#4ade80';
    mctx.fillRect(player.x * scl - 2, player.y * scl - 2, 4, 4);

    if (isMultiplayer) {
        for (const rid in remotePlayers) {
            const rp = remotePlayers[rid];
            if (!rp.alive) continue;
            mctx.fillStyle = '#22d3ee'; // cyan blips for other players
            mctx.strokeStyle = '#ffffff';
            mctx.lineWidth = 0.5;
            mctx.fillRect(rp.x * scl - 2, rp.y * scl - 2, 4, 4);
            mctx.strokeRect(rp.x * scl - 2, rp.y * scl - 2, 4, 4);
        }
    }

    cops.forEach(c => {
        mctx.fillStyle = '#f43f5e'; // red cop blips (v3)
        mctx.fillRect(c.x * scl - 1, c.y * scl - 1, 3, 3);
    });

    mctx.strokeStyle = '#f5c54244';
    mctx.lineWidth = 1;
    mctx.strokeRect(cam.x * scl, cam.y * scl, W * scl, H * scl);
}

// ============================================
// GAME LOOP
// ============================================
function loop(ts) {
    const dt = ts - lastT;
    lastT = ts;
    update(dt);
    networkTick(dt);
    draw();
    animId = requestAnimationFrame(loop);
}

// ============================================
// GAME OVER SCREEN
// ============================================
function showOver() {
    SFX.wasted();
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <h2 style="color:#f43f5e">BUSTED!</h2>
        <p>
            LEVEL: ${level}<br>
            CASH EARNED: $${cash}<br>
            WANTED LEVEL: ${'★'.repeat(Math.min(5, wanted))}${'☆'.repeat(5 - Math.min(5, wanted))}<br>
            MISSIONS COMPLETED: ${missions.filter(m => m.completed).length}<br>
            SKIN: ${PLAYER_SKINS[currentSkin].name}
        </p>
        <button id="obtn">[ RESPAWN ]</button>
    `;
    overlay.querySelector('#obtn').onclick = () => startGame();
}

// ============================================
// START GAME
// ============================================
// ============================================
// SAVE / PROGRESSION SYSTEM (localStorage)
// ============================================
const SAVE_KEY = 'pixelCitySave';
let saveTimer = 0;

function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            cash, level, currentWeapon, ammo, currentSkin,
            molotovs: player ? player.molotovs : 2
        }));
    } catch (e) { /* storage unavailable — silently skip */ }
}

function loadSavedGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function applySavedGame(save) {
    cash = save.cash || 0;
    level = save.level || 1;
    if (save.ammo) ammo = { ...ammo, ...save.ammo };
    if (save.currentWeapon && WEAPONS[save.currentWeapon]) currentWeapon = save.currentWeapon;
    if (typeof save.currentSkin === 'number') currentSkin = save.currentSkin;
    if (player && typeof save.molotovs === 'number') player.molotovs = save.molotovs;
    updateHUD();
}

function startGame(continueData) {
    overlay.style.display = 'none';
    initAudio();
    if (actx && actx.state === 'suspended') actx.resume();
    initGame();
    if (continueData) {
        applySavedGame(continueData);
        showNotification('CONTINUING — LEVEL ' + level + ' — $' + cash);
    }
    if (!animId) {
        lastT = performance.now();
        animId = requestAnimationFrame(loop);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
obtn.onclick = () => startGame();

const continueBtn = document.getElementById('continue-btn');
const savedGame = loadSavedGame();
if (savedGame && continueBtn) {
    continueBtn.style.display = 'inline-block';
    continueBtn.textContent = `[ CONTINUE — LVL ${savedGame.level || 1}, $${savedGame.cash || 0} ]`;
    continueBtn.onclick = () => startGame(savedGame);
}

const mpToggle = document.getElementById('mp-toggle');

// Volume sliders — the HUD one and the start-screen one stay in sync
function handleVolumeInput(e) {
    sfxMuted = false;
    setMasterVolume(e.target.value / 100);
}
const volumeSlider = document.getElementById('volume-slider');
const volumeSliderHud = document.getElementById('volume-slider-hud');
if (volumeSlider) volumeSlider.addEventListener('input', handleVolumeInput);
if (volumeSliderHud) volumeSliderHud.addEventListener('input', handleVolumeInput);
syncVolumeUI();
const mpPanel = document.getElementById('mp-panel');
const mpName = document.getElementById('mp-name');
const mpHostBtn = document.getElementById('mp-host');
const mpJoinCode = document.getElementById('mp-join-code');
const mpJoinBtn = document.getElementById('mp-join');
const mpCodeDisplay = document.getElementById('mp-code-display');
const mpCodeValue = document.getElementById('mp-code-value');
const mpCodeCopy = document.getElementById('mp-code-copy');

if (mpToggle) {
    mpToggle.onclick = () => {
        const showing = getComputedStyle(mpPanel).display !== 'none';
        mpPanel.style.display = showing ? 'none' : 'flex';
        mpToggle.textContent = showing ? '[ PLAY MULTIPLAYER ]' : '[ HIDE ]';
    };
}
if (mpHostBtn) {
    mpHostBtn.onclick = () => {
        mpHostBtn.disabled = true;
        mpJoinBtn.disabled = true;
        mpHostBtn.textContent = '[ STARTING... ]';
        hostGame(mpName.value);
    };
}
if (mpJoinBtn) {
    mpJoinBtn.onclick = () => {
        mpHostBtn.disabled = true;
        mpJoinBtn.disabled = true;
        mpJoinBtn.textContent = '[ CONNECTING... ]';
        joinGame(mpJoinCode.value, mpName.value);
    };
}

// Shows the host's game code prominently once hosting has started
function showGameCode(code) {
    if (!mpCodeDisplay) return;
    mpCodeValue.textContent = code;
    mpCodeDisplay.style.display = 'flex';
    if (mpCodeCopy) {
        mpCodeCopy.onclick = () => {
            navigator.clipboard.writeText(code).then(() => {
                mpCodeCopy.textContent = 'COPIED!';
                setTimeout(() => { mpCodeCopy.textContent = 'COPY'; }, 1500);
            }).catch(() => {});
        };
    }
}

cv.addEventListener('mousemove', e => {
    const r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});

cv.addEventListener('mousedown', e => {
    mouse.down = true;
    e.preventDefault();
});

cv.addEventListener('mouseup', () => mouse.down = false);

cv.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    if (key === 'q') cycleWeapon();
    if (key === 'g') throwMolotov();
    if (key === 'r') cycleRadio();
    if (key === 'v') {
        sfxMuted = !sfxMuted;
        if (masterGain) masterGain.gain.value = sfxMuted ? 0 : masterVolume;
        syncVolumeUI();
        showNotification(sfxMuted ? 'SOUND: OFF' : 'SOUND: ON');
    }
    if (key === 'm' && activeMission) {
        activeMission.active = !activeMission.active;
        showNotification(activeMission.active ? 'MISSION ACTIVE' : 'MISSION PAUSED');
    }

    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key))
        e.preventDefault();
});

document.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
});

// Initial canvas clear
ctx.fillStyle = '#111';
ctx.fillRect(0, 0, W, H);

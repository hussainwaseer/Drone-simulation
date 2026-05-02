/* ============================================================
   3D AI Interception Simulation - FULL OVERHAUL v3
   ============================================================ */

// ─── OPTIMIZATION CACHE ───────────────────────────────────────
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _vUp = new THREE.Vector3(0, 1, 0);

const _cDayTop = new THREE.Color(0x083a8c), _cDayMid = new THREE.Color(0x2e7fc4), _cDayBot = new THREE.Color(0x9fd8f0);
const _cSetTop = new THREE.Color(0x200b30), _cSetMid = new THREE.Color(0xd64d4d), _cSetBot = new THREE.Color(0xffa07a);
const _cNigTop = new THREE.Color(0x01040a), _cNigMid = new THREE.Color(0x040b1a), _cNigBot = new THREE.Color(0x0a1533);
const _cTop = new THREE.Color(), _cMid = new THREE.Color(), _cBot = new THREE.Color();

// ─── CONFIGURATION ────────────────────────────────────────────
const THREAT_DEFS = [
    { key: 'DRONE', name: 'Attack Drone', category: 'UAV', speed: 165, spawnHMin: 500, spawnHMax: 1200, ballistic: false, trailColor: 0xff4400, scale: 1.4 },
    { key: 'CRUISE', name: 'Cruise Missile', category: 'ALCM', speed: 480, spawnHMin: 180, spawnHMax: 320, ballistic: false, trailColor: 0xffaa33, scale: 0.8 },
    { key: 'SRBM', name: 'Short-Range Ballistic', category: 'SRBM', speed: 950, spawnHMin: 1000, spawnHMax: 2200, ballistic: true, trailColor: 0xff7700, scale: 0.9 },
    { key: 'MRBM', name: 'Medium-Range Ballistic', category: 'MRBM', speed: 1650, spawnHMin: 1500, spawnHMax: 3000, ballistic: true, trailColor: 0xff3388, scale: 1.1 },
    { key: 'HYPERSONIC', name: 'Hypersonic Glide', category: 'HGV', speed: 2500, spawnHMin: 900, spawnHMax: 1800, ballistic: false, trailColor: 0xcc55ff, scale: 1.0 },
    { key: 'B2', name: 'B-2 Spirit', category: 'Bomber', speed: 180, spawnHMin: 1800, spawnHMax: 2000, ballistic: false, trailColor: 0x222222, scale: 3.5, isStealth: true, isBomber: true }
];

const ENEMY_COUNTRIES = [
    { name: 'Pakistan', flag: '🇵🇰' },
    { name: 'China', flag: '🇨🇳' },
    { name: 'North Korea', flag: '🇰🇵' },
    { name: 'Iran', flag: '🇮🇷' },
    { name: 'Russia', flag: '🇷🇺' }
];

// Country DOM-id map (spaces → no-space for element IDs)
const COUNTRY_DOM_ID = {
    'Pakistan': 'Pakistan',
    'China': 'China',
    'North Korea': 'NorthKorea',
    'Iran': 'Iran',
    'Russia': 'Russia'
};

const INTERCEPTOR_DEFS = {
    DRONE: { name: 'Iron Dome', abbr: 'IDM', color: 0x44ff88, speed: 600, trailColor: 0x33ff77 },
    CRUISE: { name: 'Patriot PAC-3', abbr: 'PAC', color: 0x44ccff, speed: 820, trailColor: 0x44bbee },
    SRBM: { name: 'S-400 Triumf', abbr: 'S40', color: 0x66fcf1, speed: 1150, trailColor: 0x55eedd },
    MRBM: { name: 'THAAD', abbr: 'THD', color: 0xaaffee, speed: 1900, trailColor: 0x88ffdd },
    HYPERSONIC: { name: 'Arrow-3', abbr: 'AR3', color: 0xffffff, speed: 2700, trailColor: 0xddffff }
};

// ─── SCENE CONSTANTS ──────────────────────────────────────────
const CITY_SIZE = 2400;
const TARGET_RADIUS = 110;
const GEOFENCE_RADIUS = 1100;   // main geofence (big)
const SPAWN_RADIUS = CITY_SIZE * 0.92;

// Site positions (bigger world)
const SITES = {
    hq: { pos: new THREE.Vector3(0, 0, 0), name: 'Air HQ', gfR: GEOFENCE_RADIUS, domeColor: 0x45a29e, damage: 0, health: 100 },
    parliament: { pos: new THREE.Vector3(-1400, 0, -1150), name: 'Parliament', gfR: 350, domeColor: 0x4499ff, damage: 0, health: 100 },
    sc: { pos: new THREE.Vector3(1400, 0, -1150), name: 'Supreme Court', gfR: 280, domeColor: 0x44ee88, damage: 0, health: 100 }
};

// ─── DOM REFERENCES ───────────────────────────────────────────
const uiSpawned = document.getElementById('stat-spawned');
const uiIntercepted = document.getElementById('stat-intercepted');
const uiMissed = document.getElementById('stat-missed');
const uiAccuracy = document.getElementById('stat-accuracy');
const container = document.getElementById('simulation-container');
const threatList = document.getElementById('threat-list');
const intList = document.getElementById('interceptor-list');
const threatBadge = document.getElementById('threat-count-badge');
const liveDot = document.getElementById('live-dot');

// ─── TAB SWITCHING ────────────────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('content-' + tab).classList.add('active');
}

// ─── STATE ────────────────────────────────────────────────────
let isRunning = false;
let stats = { spawned: 0, intercepted: 0, missed: 0, credits: 100000 };
let lastTime = performance.now();
let threatIdCtr = 0;
let threatLog = [];        // {id,def,country,siteName,siteKey,status,interceptorName,domEl}
let activeThreatCount = 0;

// Multi-select attack targets
let attackTargetKeys = new Set(['hq']);

// Multi-select attacking countries (default: Pakistan active)
let activeAttackingCountries = new Set(['Pakistan']);

// Multi-select threat types (default: all active)
let activeThreatTypes = new Set(['DRONE', 'CRUISE', 'SRBM', 'MRBM', 'HYPERSONIC']);
let b2Cooldown = 0; // Cooldown for manual B-2 launch

// THREE objects
let scene, camera, renderer, controls;
let drones = [], missiles = [], interceptors = [], particles = [], trails = [], clouds = [], debris = [];
let siteGroups = { hq: null, parliament: null, sc: null };
let siteVisuals = { hq: [], parliament: [], sc: [] }; // Track domes/rings for removal
let cityMats = []; // New: track city materials for lights
let moonLight; // New: moonlight
let minimap; // New: tactical minimap
let siteDamageVisuals = { hq: [], parliament: [], sc: [] }; // New: track fire/smoke
let smokeColumns = [];        // Persistent smoke columns over destroyed sites
let missionTimer = 0;         // Elapsed seconds since simulation started
let gameEnded = false;        // Locks out further end-screen triggers
const MISSION_DURATION = 180; // 3 minutes = victory

// ─── AUDIO MANAGER ────────────────────────────────────────────
class AudioManager {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.enabled = false;
    }
    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.25;
            this.master.connect(this.ctx.destination);
            this.enabled = true;
        } catch (e) { console.warn("Audio not supported"); }
    }
    playLaunch() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.6);
        g.gain.setValueAtTime(0.2, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
        osc.connect(g); g.connect(this.master);
        osc.start(); osc.stop(this.ctx.currentTime + 0.6);
    }
    playExplosion(isBig = false) {
        if (!this.enabled || !this.ctx) return;
        const bufSize = this.ctx.sampleRate * (isBig ? 0.8 : 0.4);
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isBig ? 400 : 800, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + (isBig ? 0.7 : 0.3));
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(isBig ? 0.6 : 0.35, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isBig ? 0.7 : 0.3));
        src.connect(filter); filter.connect(g); g.connect(this.master);
        src.start();
    }
}
const audio = new AudioManager();

// ─── KILL CAM SYSTEM ──────────────────────────────────────────
class KillCamSystem {
    constructor() {
        this.container = document.getElementById('kill-cam-container');
        this.view = document.getElementById('kill-cam-view');
        this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 1, 4000);
        this.renderer = null;
        this.target = null;
        this.source = null;
        this.active = false;
        this.timer = 0;
        this.mode = 'normal';
    }
    init() {
        if (this.renderer) return;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.view.clientWidth || 320, this.view.clientHeight || 180);
        this.renderer.setClearColor(0x000000, 0.8);
        this.view.appendChild(this.renderer.domElement);
    }
    trigger(targetEntity, sourceEntity = null) {
        if (this.active && this.timer > 0.5) return;
        this.target = targetEntity;
        this.source = sourceEntity;
        this.active = true;
        this.timer = 2.2; // Enough time for approach + impact
        this.mode = 'normal';
        if (this.hudEl) { this.hudEl.remove(); this.hudEl = null; }
        this.container.classList.remove('hidden');
        this.init();
    }
    triggerBomber(bomber) {
        if (this.active && this.timer > 1.0) return;
        this.source = bomber;
        this.target = null;
        this.active = true;
        this.timer = 16.0; // Perfect sync with bomb drop
        this.mode = 'bomber';
        if (this.hudEl) { this.hudEl.remove(); this.hudEl = null; }
        this.container.classList.remove('hidden');
        this.init();
    }
    update(dt) {
        if (!this.active) return;
        this.timer -= dt;
        if (this.timer <= 0) {
            this.active = false;
            this.container.classList.add('hidden');
            if (this.hudEl) { this.hudEl.remove(); this.hudEl = null; }
            return;
        }
        if (this.mode === 'bomber' && this.source) {
            const bPos = this.source.pos;
            const vel = this.source.vel.clone();
            if (vel.lengthSq() < 0.1) vel.set(0, 0, 1);
            vel.normalize();
            const right = new THREE.Vector3(0, 1, 0).cross(vel).normalize();

            const t = 16.0 - this.timer;

            // Manage immersive green cockpit HUD overlay
            if (!this.hudEl) {
                this.hudEl = document.createElement('div');
                this.hudEl.style.position = 'absolute';
                this.hudEl.style.top = '0';
                this.hudEl.style.left = '0';
                this.hudEl.style.width = '100%';
                this.hudEl.style.height = '100%';
                this.hudEl.style.pointerEvents = 'none';
                this.hudEl.style.color = '#00ff00';
                this.hudEl.style.fontFamily = 'monospace';
                // Inline HTML HUD
                this.hudEl.innerHTML = `
                    <div style="position:absolute; top:20px; left:20px; font-size:14px; text-shadow:0 0 5px #0f0;">ALT: 18000 FT<br>SPD: MACH 0.8<br>TGT: LOCK</div>
                    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); border:2px solid #0f0; width:80px; height:80px; opacity:0.6; display:flex; justify-content:center; align-items:center;">+</div>
                    <div style="position:absolute; bottom:20px; right:20px; font-size:14px; text-shadow:0 0 5px #0f0;">B-2 SPIRIT // FPV</div>
                `;
                this.container.appendChild(this.hudEl);
            }

            if (t < 3.0) {
                // Phase 1: Inside Cockpit FPV (0-3s)
                this.hudEl.style.display = 'block';
                // Mount camera exactly inside the nose canopy looking forward
                this.camera.position.copy(bPos).add(vel.clone().multiplyScalar(4)).add(new THREE.Vector3(0, 4, 0));
                this.camera.lookAt(bPos.clone().add(vel.multiplyScalar(1000)).sub(new THREE.Vector3(0, 100, 0))); // looking forward into distance
            } else if (t < 6.0) {
                // Phase 2: Pilot Profile Shot (3-6s)
                this.hudEl.style.display = 'none';
                // Camera sitting slightly left and forward of the pilot, looking at him
                this.camera.position.copy(bPos).add(vel.clone().multiplyScalar(-2)).add(right.multiplyScalar(4)).add(new THREE.Vector3(0, 3, 0));
                this.camera.lookAt(bPos.clone().add(vel.clone().multiplyScalar(-5)).add(new THREE.Vector3(0, 1.5, 0)));
            } else if (t < 9.0) {
                // Phase 3: Forward Low Flyby (6-9s)
                this.hudEl.style.display = 'none';
                const distAhead = 500 - ((t - 6.0) * 120);
                this.camera.position.copy(bPos).add(vel.multiplyScalar(distAhead)).add(right.multiplyScalar(60)).sub(new THREE.Vector3(0, 80, 0));
                this.camera.lookAt(bPos);
            } else {
                // Phase 4: Underside tracking as bombs drop (9-16s)
                this.hudEl.style.display = 'none';
                this.camera.position.copy(bPos).sub(vel.multiplyScalar(80)).add(right.multiplyScalar(40)).sub(new THREE.Vector3(0, 80, 0));
                this.camera.lookAt(bPos.clone().add(vel.multiplyScalar(120)).sub(new THREE.Vector3(0, 180, 0)));
            }

            this.renderer.render(scene, this.camera);
            return;
        }
        if (this.target) {
            const tPos = this.target.pos.clone(); // Use entity pos directly

            if (this.source && this.source.active) {
                const sPos = this.source.pos.clone();
                const mid = new THREE.Vector3().lerpVectors(sPos, tPos, 0.5);
                const dir = new THREE.Vector3().subVectors(tPos, sPos).normalize();
                const side = new THREE.Vector3(0, 1, 0).cross(dir).normalize().multiplyScalar(120);
                this.camera.position.set(mid.x + side.x, mid.y + 50, mid.z + side.z);
                this.camera.lookAt(tPos);
            } else {
                this.camera.position.set(tPos.x + 100, tPos.y + 50, tPos.z + 100);
                this.camera.lookAt(tPos);
            }
            this.renderer.render(scene, this.camera);
        }
    }
}
const killCam = new KillCamSystem();

// Advanced Mode State
let camMode = 'normal';
let isAudioEnabled = false;
let isStormMode = false;


// Environment State
let simTime = 0.5; // 0=midnight, 0.5=noon
let skyMat, sunVisual, sunGlow, sunLight, ambientLight;

function toggleThermalView() {
    const btn = document.getElementById('btn-thermal');
    if (camMode === 'normal') {
        camMode = 'satellite';
        btn.innerHTML = '🌡 Thermal: ON';
        document.body.classList.add('thermal-mode');
    } else {
        camMode = 'normal';
        btn.innerHTML = '🌡 Thermal: OFF';
        document.body.classList.remove('thermal-mode');
    }
    btn.classList.toggle('active', camMode === 'satellite');
}

function toggleAudio() {
    isAudioEnabled = !isAudioEnabled;
    if (isAudioEnabled) audio.init();
    audio.enabled = isAudioEnabled;
    const btn = document.getElementById('btn-audio');
    btn.innerHTML = isAudioEnabled ? '🔊 Audio: ON' : '🔊 Audio: OFF';
    btn.classList.toggle('active', isAudioEnabled);
}

function toggleStorm() {
    isStormMode = !isStormMode;
    if (weather) weather.points.visible = isStormMode;
    const btn = document.getElementById('btn-storm');
    if (btn) {
        btn.innerHTML = isStormMode ? '⛈ Storm: ON' : '⛈ Storm: OFF';
        btn.classList.toggle('active', isStormMode);
    }
}

// ─── ENVIRONMENT UPDATE ───────────────────────────────────────
function updateEnvironment(dt) {
    if (!isRunning) return;
    simTime += dt * 0.005; // Full cycle in ~200s
    if (simTime > 1) simTime -= 1;

    // Sun & Moon Path (Opposite)
    const angle = simTime * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * 3500;
    const py = Math.sin(angle) * 3500;
    const pz = -1500;

    sunLight.position.set(px, py, pz);

    // Moon on the opposite side
    if (moonLight) moonLight.position.set(-px, -py, -pz);

    if (sunVisual) {
        sunVisual.position.set(px, py, pz);
        sunGlow.position.copy(sunVisual.position);
    }

    const h = py / 3500; // -1 to 1 (Sun height)

    // Sky Color Lerps
    if (h > 0.4) {
        _cTop.copy(_cDayTop); _cMid.copy(_cDayMid); _cBot.copy(_cDayBot);
    } else if (h > -0.1) {
        const t = (h + 0.1) / 0.5;
        _cTop.copy(_cSetTop).lerp(_cDayTop, t);
        _cMid.copy(_cSetMid).lerp(_cDayMid, t);
        _cBot.copy(_cSetBot).lerp(_cDayBot, t);
    } else {
        _cTop.copy(_cNigTop); _cMid.copy(_cNigMid); _cBot.copy(_cNigBot);
    }

    if (skyMat) {
        skyMat.uniforms.top.value.copy(_cTop);
        skyMat.uniforms.mid.value.copy(_cMid);
        skyMat.uniforms.bot.value.copy(_cBot);
    }

    // Lighting tweaks
    sunLight.intensity = Math.max(0, h) * 2.5 + 0.05;
    if (moonLight) moonLight.intensity = Math.max(0, -h) * 1.8;
    ambientLight.intensity = Math.max(0.15, h + 0.25) * 1.1;
    scene.fog.color.copy(_cBot);

    // City Lights: Glow when sun goes down (h < 0.2)
    const emissiveInt = Math.max(0, 0.2 - h) * 4.0; // Scaled intensity
    cityMats.forEach(m => {
        m.emissiveIntensity = Math.min(2.0, emissiveInt);
    });
}

class WeatherSystem {
    constructor() {
        this.rainCount = 3000;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.rainCount * 3);
        for (let i = 0; i < this.rainCount; i++) {
            this.positions[i * 3] = Math.random() * 4000 - 2000;
            this.positions[i * 3 + 1] = Math.random() * 2000;
            this.positions[i * 3 + 2] = Math.random() * 4000 - 2000;
        }
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.material = new THREE.PointsMaterial({ color: 0x8899aa, size: 2, transparent: true, opacity: 0.4 });
        this.points = new THREE.Points(this.geometry, this.material);
        this.points.visible = false;
        scene.add(this.points);
    }
    update(dt) {
        if (!this.points.visible) return;
        const pos = this.geometry.attributes.position.array;
        for (let i = 0; i < this.rainCount; i++) {
            pos[i * 3 + 1] -= dt * 1200;
            if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 2000;
        }
        this.geometry.attributes.position.needsUpdate = true;

        // Storm effect: random lightning
        if (Math.random() < 0.004) {
            ambientLight.intensity = 4.0;
            setTimeout(() => { if (ambientLight) ambientLight.intensity = 0.4; }, 40);
        }
    }
}


let weather;
let repairDrones = [];
const REPAIR_COST = 2000;

class RepairDrone {
    constructor(siteKey) {
        this.siteKey = siteKey;
        this.targetSite = SITES[siteKey];
        this.pos = new THREE.Vector3(0, 800, 0);
        this.active = true;
        this.state = 'MOVING';
        this.timer = 0;
        this.mesh3 = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), new THREE.MeshPhongMaterial({ color: 0x44ff44 }));
        this.mesh3.add(body);
        const l = new THREE.Mesh(new THREE.SphereGeometry(4), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
        l.position.y = 8; this.mesh3.add(l);
        scene.add(this.mesh3);
    }
    update(dt) {
        if (!this.active) return;
        const tPos = this.targetSite.pos.clone().add(new THREE.Vector3(0, 120, 0));
        if (this.state === 'MOVING') {
            const dir = new THREE.Vector3().subVectors(tPos, this.pos).normalize();
            this.pos.addScaledVector(dir, 400 * dt);
            if (this.pos.distanceTo(tPos) < 15) { this.state = 'REPAIRING'; this.timer = 6.0; }
        } else if (this.state === 'REPAIRING') {
            this.timer -= dt;
            if (Math.random() < 0.2) particles.push(new Explosion(this.pos.clone().add(new THREE.Vector3(0, -40, 0)), 0x44ff44, 0.4));
            if (this.timer <= 0) {
                const s = this.targetSite;
                s.health = Math.min(100, s.health + 50);
                updateHealthUI(this.siteKey);
                const g = siteGroups[this.siteKey];
                if (g) {
                    g.traverse(c => { if (c.isMesh && c.material) { c.material.color.lerp(new THREE.Color(0xffffff), 0.5); if (c.material.emissive) c.material.emissive.setHex(0x000000); } });
                    if (s.health > 0 && g.position.y < 0) g.position.y += 7.5;

                    // Re-enable targeting if it was destroyed
                    const btn = document.getElementById('target-' + this.siteKey);
                    if (btn) {
                        btn.classList.remove('destroyed');
                        btn.onclick = () => toggleAttackTarget(this.siteKey);
                        const check = document.getElementById('check-' + this.siteKey);
                        if (check) check.textContent = '✓';
                    }

                    // Add back to attackTargetKeys if no targets were active
                    if (attackTargetKeys.size === 0) attackTargetKeys.add(this.siteKey);

                    // Clear persistent damage visuals
                    if (siteDamageVisuals[this.siteKey]) {
                        siteDamageVisuals[this.siteKey].forEach(v => v.destroy());
                        siteDamageVisuals[this.siteKey] = [];
                    }

                    this.state = 'RETURNING';
                }
            }
        } else if (this.state === 'RETURNING') {
            const h = new THREE.Vector3(0, 800, 0);
            const d = new THREE.Vector3().subVectors(h, this.pos).normalize();
            this.pos.addScaledVector(d, 400 * dt);
            if (this.pos.distanceTo(h) < 30) this.destroy();
        }
        this.mesh3.position.copy(this.pos);
        this.mesh3.rotation.y += dt * 2;
    }
    destroy() { this.active = false; scene.remove(this.mesh3); }
}

function repairSite(key) {
    if (!isRunning || stats.credits < REPAIR_COST) return;
    if (repairDrones.some(d => d.siteKey === key && d.active)) return;
    if (SITES[key].health >= 100) return;
    stats.credits -= REPAIR_COST;
    updateUI();
    const drone = new RepairDrone(key);
    repairDrones.push(drone);

    // Trigger cinematic repair view
    killCam.trigger(SITES[key], drone);
}

class PersistentDamage {
    constructor(pos, siteKey) {
        this.pos = pos.clone();
        this.siteKey = siteKey;
        this.active = true;
        this.timer = 0;
        this.fireParticles = [];
    }
    update(dt) {
        this.timer += dt;
        if (Math.random() < 0.15) {
            const spark = new Explosion(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 40, 5 + Math.random() * 20, (Math.random() - 0.5) * 40)), 0xff6600);
            particles.push(spark);
        }
        if (Math.random() < 0.08) {
            const smoke = new Explosion(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 30, 20 + Math.random() * 40, (Math.random() - 0.5) * 30)), 0x333333);
            particles.push(smoke);
        }
    }
    destroy() {
        this.active = false;
    }
}

class TacticalMinimap {
    constructor() {
        this.canvas = document.getElementById('minimap-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.size = 200;
        this.canvas.width = this.canvas.height = this.size;
    }
    update() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.size, this.size);

        // Draw border/grid
        ctx.strokeStyle = 'rgba(102, 252, 241, 0.2)';
        ctx.strokeRect(0, 0, this.size, this.size);
        ctx.beginPath();
        ctx.moveTo(this.size / 2, 0); ctx.lineTo(this.size / 2, this.size);
        ctx.moveTo(0, this.size / 2); ctx.lineTo(this.size, this.size / 2);
        ctx.stroke();

        const scale = this.size / (CITY_SIZE * 2.2);
        const center = this.size / 2;

        // Draw Sites
        for (const site of Object.values(SITES)) {
            const sx = center + site.pos.x * scale;
            const sy = center + site.pos.z * scale;
            ctx.fillStyle = '#' + site.domeColor.toString(16).padStart(6, '0');
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            ctx.fill();
            // Geofence
            ctx.strokeStyle = 'rgba(102, 252, 241, 0.3)';
            ctx.beginPath();
            ctx.arc(sx, sy, site.gfR * scale, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw Threats
        [...drones, ...missiles].forEach(t => {
            if (!t.active || (t.def.isStealth && camMode !== 'satellite')) return;
            const tx = center + t.pos.x * scale;
            const ty = center + t.pos.z * scale;
            ctx.fillStyle = t.def.isBomber ? '#ff33ff' : '#ff3333';
            ctx.fillRect(tx - 2, ty - 2, 4, 4);
        });

        // Draw Interceptors
        interceptors.forEach(i => {
            if (!i.active) return;
            const ix = center + i.pos.x * scale;
            const iy = center + i.pos.z * scale;
            ctx.fillStyle = '#44ff88';
            ctx.beginPath();
            ctx.arc(ix, iy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// ─── SMOKE COLUMN ─────────────────────────────────────────────
class SmokeColumn {
    constructor(pos) {
        this.pos = pos.clone().add(new THREE.Vector3(0, 30, 0));
        this.active = true;
        this.puffs = [];
        this.spawnTimer = 0;
    }
    update(dt) {
        if (!this.active) return;
        this.spawnTimer += dt;
        if (this.spawnTimer >= 0.18) {
            this.spawnTimer = 0;
            this._spawnPuff();
        }
        for (let i = this.puffs.length - 1; i >= 0; i--) {
            const p = this.puffs[i];
            p.age += dt;
            if (p.age >= p.maxAge) {
                scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.puffs.splice(i, 1);
                continue;
            }
            const t = p.age / p.maxAge;
            p.mesh.position.y += dt * p.speed;
            p.mesh.position.x += Math.sin(p.age * p.wobble) * dt * 6;
            p.mesh.scale.setScalar(1 + t * 3.2);
            p.mesh.material.opacity = (1 - t) * 0.30;
        }
    }
    _spawnPuff() {
        const ox = (Math.random() - 0.5) * 25;
        const oz = (Math.random() - 0.5) * 25;
        const shade = 0.10 + Math.random() * 0.12;
        const geo = new THREE.SphereGeometry(14 + Math.random() * 10, 5, 5);
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(shade, shade, shade),
            transparent: true, opacity: 0.30, depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(this.pos.x + ox, this.pos.y, this.pos.z + oz);
        scene.add(mesh);
        this.puffs.push({
            mesh, age: 0,
            maxAge: 4 + Math.random() * 2.5,
            speed: 55 + Math.random() * 35,
            wobble: 0.8 + Math.random() * 1.2
        });
    }
    destroy() {
        this.active = false;
        this.puffs.forEach(p => {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        });
        this.puffs = [];
    }
}

// ─── END SCREEN ───────────────────────────────────────────────
function showEndScreen(victory) {
    if (gameEnded) return;
    gameEnded = true;
    isRunning = false;
    const btn = document.getElementById('btn-toggle');
    if (btn) { btn.innerHTML = '▶ Start'; btn.classList.remove('running'); }

    const mins = Math.floor(missionTimer / 60);
    const secs = Math.floor(missionTimer % 60).toString().padStart(2, '0');
    const acc = stats.spawned > 0 ? Math.round((stats.intercepted / stats.spawned) * 100) : 100;

    const overlay = document.createElement('div');
    overlay.id = 'end-screen-overlay';
    overlay.className = 'end-overlay';
    overlay.innerHTML = `
        <div class="end-panel ${victory ? 'victory' : 'defeat'}">
            <div class="end-icon">${victory ? '🏆' : '💀'}</div>
            <h2 class="end-title">${victory ? 'MISSION COMPLETE' : 'MISSION FAILED'}</h2>
            <p class="end-subtitle">${victory ? 'All sites defended for 3 minutes — outstanding command!' : 'All defensive sites have been destroyed.'}</p>
            <div class="end-stats">
                <div class="end-stat"><span class="end-val">${mins}:${secs}</span><span class="end-lbl">Survival</span></div>
                <div class="end-stat"><span class="end-val">${stats.spawned}</span><span class="end-lbl">Threats</span></div>
                <div class="end-stat"><span class="end-val end-green">${stats.intercepted}</span><span class="end-lbl">Intercepted</span></div>
                <div class="end-stat"><span class="end-val end-red">${stats.missed}</span><span class="end-lbl">Breached</span></div>
                <div class="end-stat"><span class="end-val">${acc}%</span><span class="end-lbl">Accuracy</span></div>
                <div class="end-stat"><span class="end-val end-gold">$${stats.credits.toLocaleString()}</span><span class="end-lbl">Credits</span></div>
            </div>
            <button class="end-btn" onclick="document.getElementById('end-screen-overlay').remove(); handleReset();">↺ Play Again</button>
        </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('visible'), 40);
}

function showSwarmAlert(msg = '⚠️ SWARM DRONES ALERT ⚠️') {
    const alert = document.createElement('div');
    alert.className = 'swarm-alert';
    alert.innerHTML = msg;
    document.body.appendChild(alert);
    setTimeout(() => alert.classList.add('visible'), 10);
    setTimeout(() => { alert.classList.remove('visible'); setTimeout(() => alert.remove(), 500); }, 3000);

    if (audio.enabled) audio.playLaunch();
}


// ─── MULTI-SELECT TARGET TOGGLE ───────────────────────────────
function toggleAttackTarget(key) {
    if (attackTargetKeys.has(key)) {
        if (attackTargetKeys.size === 1) return; // keep at least 1
        attackTargetKeys.delete(key);
    } else {
        if (SITES[key] && SITES[key].health <= 0) return; // Cannot attack destroyed site
        attackTargetKeys.add(key);
    }
    ['hq', 'parliament', 'sc'].forEach(k => {
        const btn = document.getElementById('target-' + k);
        if (btn) btn.classList.toggle('active', attackTargetKeys.has(k));
    });
}

// ─── MULTI-SELECT COUNTRY TOGGLE ─────────────────────────────
function toggleAttackingCountry(name) {
    if (activeAttackingCountries.has(name)) {
        if (activeAttackingCountries.size === 1) return; // keep at least 1
        activeAttackingCountries.delete(name);
    } else {
        activeAttackingCountries.add(name);
    }
    // Sync button styles
    Object.entries(COUNTRY_DOM_ID).forEach(([cName, domId]) => {
        const btn = document.getElementById('country-' + domId);
        if (btn) btn.classList.toggle('active', activeAttackingCountries.has(cName));
    });
}

// ─── MULTI-SELECT THREAT TYPE TOGGLE ─────────────────────────
function toggleThreatType(key) {
    if (activeThreatTypes.has(key)) {
        if (activeThreatTypes.size === 1) return; // keep at least 1
        activeThreatTypes.delete(key);
    } else {
        activeThreatTypes.add(key);
    }
    // Sync button styles
    ['DRONE', 'CRUISE', 'SRBM', 'MRBM', 'HYPERSONIC'].forEach(k => {
        const btn = document.getElementById('tt-' + k);
        if (btn) btn.classList.toggle('active', activeThreatTypes.has(k));
    });
}

// ─── THREAT LOG UI ────────────────────────────────────────────
function addThreatEntry(id, def, country, siteKey) {
    const site = SITES[siteKey] || { name: 'Unknown' };
    const entry = { id, def, country, siteName: site.name, siteKey, status: 'airborne', interceptorName: '', domEl: null };
    threatLog.unshift(entry);
    if (threatLog.length > 20) threatLog.pop();
    if (!def.isStealth) {
        activeThreatCount++;
        updateThreatBadge();
    }

    // Build DOM
    const iDef = INTERCEPTOR_DEFS[def.key];
    const el = document.createElement('div');
    el.className = 'threat-entry airborne';
    if (def.isStealth) el.style.display = 'none';
    el.id = 'te-' + id;
    el.innerHTML = `
      <div class="threat-row1">
        <span class="threat-flag">${country.flag}</span>
        <span class="threat-category">${def.category}</span>
        <span class="threat-type-name">${def.name}</span>
        <span class="threat-status status-air" id="ts-${id}">✈ IN AIR</span>
      </div>
      <div class="threat-row2">
        <span class="threat-country">${country.name}</span>
        <span class="threat-arrow">→</span>
        <span class="threat-target-name">${site.name}</span>
        <span class="threat-interceptor" id="ti-${id}"></span>
      </div>`;
    entry.domEl = el;

    // Insert at top
    const first = threatList.querySelector('.threat-entry');
    if (first) threatList.insertBefore(el, first);
    else { threatList.innerHTML = ''; threatList.appendChild(el); }

    return entry;
}

function updateThreatStatus(entry, status, interceptorName) {
    entry.status = status;
    entry.interceptorName = interceptorName || '';
    const statEl = document.getElementById('ts-' + entry.id);
    const intEl = document.getElementById('ti-' + entry.id);
    if (!statEl) return;
    if (status === 'intercepted') {
        entry.domEl.className = 'threat-entry intercepted';
        statEl.className = 'threat-status status-intercepted';
        statEl.textContent = '✓ INTERCEPTED';
        if (intEl && interceptorName) intEl.textContent = '↑ ' + interceptorName;
        activeThreatCount = Math.max(0, activeThreatCount - 1);
        updateThreatBadge();
    } else if (status === 'breached') {
        entry.domEl.className = 'threat-entry breached';
        statEl.className = 'threat-status status-breached';
        statEl.textContent = '💥 BREACHED';
        activeThreatCount = Math.max(0, activeThreatCount - 1);
        updateThreatBadge();
    }
}

function updateThreatBadge() {
    if (activeThreatCount === 0) {
        threatBadge.textContent = 'All Clear';
        threatBadge.className = 'threat-badge clear';
        liveDot.classList.remove('on');
    } else {
        threatBadge.textContent = activeThreatCount + ' Active';
        threatBadge.className = 'threat-badge';
        liveDot.classList.add('on');
    }
}

// Interceptor log
function addInterceptorEntry(iDef, targetName) {
    const el = document.createElement('div');
    el.className = 'interceptor-entry';
    const id = 'int-' + Date.now() + Math.random();
    el.id = id;
    el.innerHTML = `<span class="int-dot"></span>
      <span class="interceptor-name">${iDef.name}</span>
      <span class="interceptor-target">→ ${targetName}</span>`;
    const empty = intList.querySelector('.no-threats');
    if (empty) intList.innerHTML = '';
    intList.insertBefore(el, intList.firstChild);
    if (intList.children.length > 8) intList.lastChild.remove();
    return id;
}
function removeInterceptorEntry(id) {
    const el = document.getElementById(id);
    if (el) { el.style.opacity = '0'; el.style.transition = 'opacity 0.5s'; setTimeout(() => el.remove(), 500); }
    setTimeout(() => {
        if (intList.children.length === 0) intList.innerHTML = '<div class="no-threats">No interceptors active.</div>';
    }, 600);
}

// ─── 3D INIT ──────────────────────────────────────────────────
function init3D() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 1800, 6000);

    camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 1, 7000);
    camera.position.set(0, 700, 1500);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;

    // Lighting – bright day
    ambientLight = new THREE.AmbientLight(0xd0e8ff, 1.1);
    scene.add(ambientLight);
    sunLight = new THREE.DirectionalLight(0xfff5d0, 2.5);
    sunLight.position.set(800, 1200, -600);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -CITY_SIZE; sunLight.shadow.camera.right = CITY_SIZE;
    sunLight.shadow.camera.top = CITY_SIZE; sunLight.shadow.camera.bottom = -CITY_SIZE;
    sunLight.shadow.camera.far = 5000;
    scene.add(sunLight);

    moonLight = new THREE.DirectionalLight(0x4488ff, 0.0);
    moonLight.position.set(-800, -1200, 600);
    scene.add(moonLight);

    scene.add(new THREE.HemisphereLight(0x4488ff, 0x335522, 0.55));

    buildSky();
    buildSun();
    buildGround();
    buildClouds();
    generateCity();
    addRoads();

    // Site structures
    siteGroups.hq = buildSiteHQ();
    siteGroups.parliament = buildParliament(SITES.parliament.pos);
    siteGroups.sc = buildSupremeCourt(SITES.sc.pos);

    // Site domes & geofences
    for (const [key, site] of Object.entries(SITES)) {
        addSiteDome(site.pos, TARGET_RADIUS, site.domeColor, key);
        addGeofenceRing(site.pos, site.gfR, key);
    }


    window.addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });
}

// ─── ENVIRONMENT ──────────────────────────────────────────────
function buildSky() {
    const vs = `varying vec3 vWorldPos;
    void main(){ vec4 wp=modelMatrix*vec4(position,1.); vWorldPos=wp.xyz;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
    const fs = `uniform vec3 top,mid,bot; varying vec3 vWorldPos;
    void main(){ float h=normalize(vWorldPos).y;
    vec3 c=mix(bot,mid,smoothstep(-0.12,0.28,h));
    c=mix(c,top,smoothstep(0.28,0.88,h)); gl_FragColor=vec4(c,1.); }`;
    skyMat = new THREE.ShaderMaterial({
        vertexShader: vs, fragmentShader: fs, side: THREE.BackSide, depthWrite: false,
        uniforms: { top: { value: new THREE.Color(0x083a8c) }, mid: { value: new THREE.Color(0x2e7fc4) }, bot: { value: new THREE.Color(0x9fd8f0) } }
    });
    const sky = new THREE.Mesh(
        new THREE.SphereGeometry(5500, 32, 15),
        skyMat
    );
    scene.add(sky);
}

function buildSun() {
    sunVisual = new THREE.Mesh(new THREE.SphereGeometry(65, 20, 20), new THREE.MeshBasicMaterial({ color: 0xfff9dd }));
    sunVisual.position.set(2200, 1600, -2000);
    scene.add(sunVisual);
    sunGlow = new THREE.Mesh(new THREE.SphereGeometry(105, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false }));
    sunGlow.position.copy(sunVisual.position);
    scene.add(sunGlow);
}

function buildGround() {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000),
        new THREE.MeshStandardMaterial({ color: 0x2d4620, roughness: 0.95, metalness: 0.0 }));
    g.rotation.x = -Math.PI / 2; g.receiveShadow = true;
    scene.add(g);
}

function makeB2Mesh() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7, metalness: 0.2 });

    const shape = new THREE.Shape();
    shape.moveTo(0, 20); // nose
    shape.lineTo(-50, -15); // left wing tip
    shape.lineTo(-50, -20); // slightly down along tip
    shape.lineTo(-25, -5);  // inner zig
    shape.lineTo(-10, -15); // middle zag
    shape.lineTo(0, -10);   // tail center
    shape.lineTo(10, -15);  // middle zag right
    shape.lineTo(25, -5);   // inner zig right
    shape.lineTo(50, -20);  // right wing tip
    shape.lineTo(50, -15);  // slightly up tip
    shape.lineTo(0, 20);    // back to nose

    const geom = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2 });
    geom.computeBoundingBox();
    const bbox = geom.boundingBox;
    geom.translate(0, (-bbox.min.y - (bbox.max.y - bbox.min.y) / 2), -1.5);

    const wing = new THREE.Mesh(geom, mat);
    wing.rotation.x = Math.PI / 2;
    g.add(wing);

    // Using stretched spheres since CapsuleGeometry didn't exist in r128
    const cockGeo = new THREE.SphereGeometry(2.5, 12, 12);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x050505, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.9 });
    const cock = new THREE.Mesh(cockGeo, glassMat);
    cock.scale.set(1, 2, 1);
    cock.rotation.x = Math.PI / 2;
    cock.position.set(0, 1.8, 8);
    g.add(cock);

    // Add Pilot inside cockpit
    const pilotGroup = new THREE.Group();
    // Green flight suit body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x226622, roughness: 0.9 });
    const pilotBody = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 1.8, 8), bodyMat);
    pilotBody.position.set(0, -0.6, 0);
    pilotGroup.add(pilotBody);
    // Dark helmet
    const headMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.6 });
    const pilotHead = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), headMat);
    pilotHead.position.set(0, 0.6, 0);
    pilotGroup.add(pilotHead);
    // Visor
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.9, roughness: 0.1 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.6), visorMat);
    visor.position.set(0, 0.6, -0.4); // negative Z is forward in local pilot frame
    pilotGroup.add(visor);
    // Position pilot
    pilotGroup.position.set(0, 1.5, 6.5);
    g.add(pilotGroup);

    const engGeo = new THREE.SphereGeometry(2, 10, 10);
    const engL = new THREE.Mesh(engGeo, mat);
    engL.scale.set(1, 1.5, 1);
    engL.rotation.x = Math.PI / 2;
    engL.position.set(-6, 1.5, 4);
    g.add(engL);

    const engR = new THREE.Mesh(engGeo, mat);
    engR.scale.set(1, 1.5, 1);
    engR.rotation.x = Math.PI / 2;
    engR.position.set(6, 1.5, 4);
    g.add(engR);

    return g;
}

function makeBombMesh() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 8), new THREE.MeshPhongMaterial({ color: 0x333333 }));
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), new THREE.MeshPhongMaterial({ color: 0x666666 }));
    tip.position.z = 4;
    g.add(tip);
    return g;
}

class BombEntity {
    constructor(pos, siteKey) {
        this.pos = pos.clone();
        this.vel = new THREE.Vector3(0, -50, 0);
        this.siteKey = siteKey;
        this.site = SITES[siteKey];
        this.active = true;
        this.id = ++threatIdCtr;
        this.def = { key: 'BOMB', name: 'Gravity Bomb', trailColor: 0x666666 };
        this.mesh3 = makeBombMesh();
        this.mesh3.position.copy(this.pos);
        scene.add(this.mesh3);
        this.trail = new Trail(this.def.trailColor);
        trails.push(this.trail);
    }
    update(dt) {
        if (!this.active) return;
        this.vel.y -= 450 * dt;
        this.pos.addScaledVector(this.vel, dt);
        this.mesh3.position.copy(this.pos);
        this.mesh3.lookAt(this.pos.clone().add(this.vel));
        this.trail.add(this.pos);
    }
    destroy(intercepted) {
        if (!this.active) return;
        this.active = false;
        scene.remove(this.mesh3);
        if (intercepted) stats.intercepted++;
        else stats.missed++;
        updateUI();
    }
}

function buildClouds() {
    const positions = [
        [1200, 700, -1100], [-1400, 750, -800], [600, 820, -1600],
        [-800, 680, 900], [1600, 700, 300], [-1700, 730, -200],
        [200, 850, -500], [900, 760, 1300], [-1100, 700, -600],
        [1800, 680, -400], [-500, 770, 1600], [700, 810, -900],
        [-200, 900, 400], [1400, 650, -1300], [-1000, 780, 200]
    ];
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, roughness: 1, metalness: 0 });
    positions.forEach(([x, y, z]) => {
        const g = new THREE.Group();
        const n = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < n; i++) {
            const r = 55 + Math.random() * 90;
            const m = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 7), mat);
            m.position.set((Math.random() - .5) * 320, (Math.random() - .5) * 70, (Math.random() - .5) * 130);
            m.scale.y = 0.5 + Math.random() * 0.35;
            g.add(m);
        }
        g.position.set(x, y, z);
        g.userData.speed = 0.7 + Math.random() * 1.4;
        scene.add(g); clouds.push(g);
    });
}

function updateHeatSignatures() {
    const isThermal = (camMode === 'satellite');
    drones.forEach(d => {
        if (!d.active || !d.mesh3) return;

        // Apply "Heat Glow" if in thermal mode
        d.mesh3.traverse(child => {
            if (child.isMesh && child.material) {
                if (isThermal) {
                    if (!child.userData.origEmissive) child.userData.origEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0, 0, 0);
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0xff3300);
                        child.material.emissiveIntensity = 2.0;
                    }
                } else if (child.userData.origEmissive) {
                    if (child.material.emissive) {
                        child.material.emissive.copy(child.userData.origEmissive);
                        child.material.emissiveIntensity = 0.2;
                    }
                }
            }
        });

        // B-2 Stealth Reveal Logic
        if (isThermal && d.def.isBomber && d.logEntry && d.logEntry.domEl && d.logEntry.domEl.style.display === 'none') {
            // Visual discovery in Thermal Mode
            d.logEntry.domEl.style.display = 'grid';
            activeThreatCount++;
            updateThreatBadge();
            showSwarmAlert('🌡 THERMAL SIGNATURE DETECTED: STEALTH BOMBER');
        }
    });
}

// ─── CITY ─────────────────────────────────────────────────────
function makeWinTex(base, lit, dim) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 256);
    for (let y = 5; y < 256; y += 12) for (let x = 6; x < 128; x += 11) {
        const r = Math.random();
        if (r > 0.78) ctx.fillStyle = lit; else if (r > 0.52) ctx.fillStyle = dim; else continue;
        ctx.fillRect(x, y, 6, 8);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
}

function generateCity() {
    const styles = [
        { base: '#1b2638', lit: '#ffd888', dim: '#2b3648' },
        { base: '#201820', lit: '#ffeecc', dim: '#302830' },
        { base: '#121820', lit: '#b8d8ff', dim: '#222830' },
        { base: '#182018', lit: '#b8ffcc', dim: '#283028' }
    ];
    const textures = styles.map(s => makeWinTex(s.base, s.lit, s.dim));
    const baseMat = new THREE.MeshStandardMaterial({ metalness: 0.25, roughness: 0.75 });

    for (let i = 0; i < 800; i++) {
        let w = 25 + Math.random() * 45, d = 25 + Math.random() * 45;
        let h = 40 + Math.random() * 220;
        const isSky = Math.random() > 0.88;
        if (isSky) h += 180 + Math.random() * 150;

        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * CITY_SIZE;
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
        const bPos = new THREE.Vector3(x, 0, z);

        // Optimization: Use distanceToSquared
        let inZone = false;
        let siteMatched = '';
        for (const [key, site] of Object.entries(SITES)) {
            if (bPos.distanceToSquared(site.pos) < (site.gfR * 0.95) ** 2) {
                inZone = true;
                siteMatched = key;
                break;
            }
        }
        if (!inZone) continue;

        // Density Control
        if (siteMatched === 'hq' && Math.random() > 0.3) continue;
        if (siteMatched === 'parliament' || siteMatched === 'sc') continue;

        // Keep away from site structures
        let tooClose = false;
        for (const site of Object.values(SITES)) {
            if (bPos.distanceToSquared(site.pos) < 130 ** 2) { tooClose = true; break; }
        }
        if (tooClose) continue;

        const tex = textures[Math.floor(Math.random() * textures.length)];
        const mat = baseMat.clone();
        mat.map = tex;
        mat.emissiveMap = tex;
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveIntensity = 0;
        cityMats.push(mat);

        tex.repeat.set(w / 70, h / 100);

        const bld = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        bld.position.set(x, h / 2, z);
        bld.castShadow = bld.receiveShadow = true;
        scene.add(bld);

        if (isSky) {
            const top = new THREE.Mesh(new THREE.BoxGeometry(w * .65, 30, d * .65),
                new THREE.MeshStandardMaterial({ color: 0x0d1015 }));
            top.position.set(x, h + 15, z); scene.add(top);
            const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.2, 50),
                new THREE.MeshBasicMaterial({ color: 0x444444 }));
            ant.position.set(x, h + 30 + 25, z); scene.add(ant);
            const bea = new THREE.Mesh(new THREE.SphereGeometry(1.8),
                new THREE.MeshBasicMaterial({ color: 0xff2200 }));
            bea.position.set(x, h + 30 + 50, z); scene.add(bea);
        }
    }
}

function addRoads() {
    const rMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.95 });
    const lMat = new THREE.MeshBasicMaterial({ color: 0xffdd55 });
    const L = 3200, W = 30, half = L / 2;
    // Grid
    [0, 380, -380, 760, -760].forEach(off => {
        ['x', 'z'].forEach(axis => {
            const geo = axis === 'x' ? new THREE.PlaneGeometry(L, W) : new THREE.PlaneGeometry(W, L);
            const m = new THREE.Mesh(geo, rMat);
            m.rotation.x = -Math.PI / 2; m.position.y = 0.4;
            axis === 'x' ? m.position.z = off : m.position.x = off;
            scene.add(m);
            for (let i = -half + 50; i < half; i += 90) {
                const lg = axis === 'x' ? new THREE.PlaneGeometry(45, 2) : new THREE.PlaneGeometry(2, 45);
                const lm = new THREE.Mesh(lg, lMat);
                lm.rotation.x = -Math.PI / 2; lm.position.y = 0.6;
                axis === 'x' ? lm.position.set(i, 0.6, off) : lm.position.set(off, 0.6, i);
                scene.add(lm);
            }
        });
    });
    // Diagonal to sites
    function diagRoad(ax, az, bx, bz) {
        const dx = bx - ax, dz = bz - az, len = Math.sqrt(dx * dx + dz * dz), ang = Math.atan2(dz, dx);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 24), rMat);
        m.rotation.x = -Math.PI / 2; m.rotation.z = -ang;
        m.position.set((ax + bx) / 2, 0.4, (az + bz) / 2);
        scene.add(m);
    }
    diagRoad(0, 0, SITES.parliament.pos.x, SITES.parliament.pos.z);
    diagRoad(0, 0, SITES.sc.pos.x, SITES.sc.pos.z);
}

// ─── BUILDINGS ────────────────────────────────────────────────
function buildSiteHQ() {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(55, 70, 22, 16),
        new THREE.MeshStandardMaterial({ color: 0x112233, emissive: 0x003355, roughness: 0.4 }));
    base.position.y = 11; base.castShadow = true; g.add(base);
    scene.add(g);
    return g;
}

function buildParliament(p) {
    const g = new THREE.Group();
    const bm = new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.78 });
    const dm = new THREE.MeshStandardMaterial({ color: 0xc4a070, roughness: 0.45 });
    const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(p.x + px, py, p.z + pz); m.castShadow = true; g.add(m); return m; };
    add(new THREE.BoxGeometry(220, 40, 160), bm, 0, 20, 0);
    add(new THREE.BoxGeometry(190, 30, 140), bm, 0, 55, 0);
    add(new THREE.CylinderGeometry(32, 32, 22, 24), bm, 0, 73, 0);
    add(new THREE.SphereGeometry(42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), dm, 0, 84, 0);
    add(new THREE.CylinderGeometry(9, 12, 24, 16), dm, 0, 128, 0);
    add(new THREE.ConeGeometry(7, 18, 8), dm, 0, 152, 0);
    for (const sx of [-95, 95]) {
        add(new THREE.BoxGeometry(65, 32, 120), bm, sx, 16, 0);
        add(new THREE.SphereGeometry(24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), dm, sx, 34, 0);
    }
    for (let c = -3; c <= 3; c++) add(new THREE.CylinderGeometry(4.5, 4.5, 42, 8), bm, c * 22, 21, 80);
    // Flag
    add(new THREE.CylinderGeometry(1.2, 1.2, 55, 8),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa }), 0, 169, 0);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(26, 14),
        new THREE.MeshBasicMaterial({ color: 0xff9933, side: THREE.DoubleSide }));
    flag.position.set(p.x + 13, 191, p.z); g.add(flag);
    // Extra Launchers
    const lm = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
    [[-80, 80], [80, 80]].forEach(([lx, lz]) => {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(32, 8, 32), lm); pad.position.set(p.x + lx, 4, p.z + lz); g.add(pad);
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 30, 8), lm); tube.position.set(p.x + lx, 18, p.z + lz); tube.rotation.x = -Math.PI / 6; g.add(tube);
    });
    scene.add(g);
    return g;
}

function buildSupremeCourt(p) {
    const g = new THREE.Group();
    const sm = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.82 });
    const dk = new THREE.MeshStandardMaterial({ color: 0x4a4030, roughness: 0.9 });
    const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(p.x + px, py, p.z + pz); m.castShadow = true; g.add(m); };
    add(new THREE.BoxGeometry(190, 12, 140), sm, 0, 6, 0);
    add(new THREE.BoxGeometry(165, 45, 115), sm, 0, 34, 0);
    add(new THREE.BoxGeometry(95, 60, 22), sm, 0, 52, 70);
    add(new THREE.ConeGeometry(68, 28, 4), sm, 0, 92, 70);
    add(new THREE.BoxGeometry(172, 9, 125), dk, 0, 60, 0);
    for (let c = -3; c <= 3; c++) {
        add(new THREE.CylinderGeometry(5, 5.5, 62, 10), sm, c * 20, 31, 70);
        add(new THREE.BoxGeometry(12, 5, 12), sm, c * 20, 62, 70);
    }
    for (let s = 0; s < 5; s++) add(new THREE.BoxGeometry(115 + s * 12, 4, 9), sm, 0, s * 3.5 + 2, 80 + s * 5);
    for (const wx of [-88, 88]) add(new THREE.BoxGeometry(36, 40, 95), sm, wx, 20, 0);
    add(new THREE.CylinderGeometry(5, 7, 22, 8), sm, 0, 78, 0);
    add(new THREE.SphereGeometry(7, 8, 8), sm, 0, 96, 0);
    // Extra Launchers
    const lm = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.2 });
    [[-70, -70], [70, -70]].forEach(([lx, lz]) => {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(30, 7, 30), lm); pad.position.set(p.x + lx, 3.5, p.z + lz); g.add(pad);
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 28, 8), lm); tube.position.set(p.x + lx, 16, p.z + lz); tube.rotation.x = Math.PI / 6; g.add(tube);
    });
    scene.add(g);
    return g;
}

function addSiteDome(pos, radius, color, key) {
    const g = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshPhysicalMaterial({
            color, transparent: true, opacity: 0.2,
            roughness: 0.1, transmission: 0.9, thickness: 0.5, emissive: color, emissiveIntensity: 0.3
        })
    );
    g.position.copy(pos);
    g.castShadow = false; g.receiveShadow = false;
    scene.add(g);
    if (key && siteVisuals[key]) siteVisuals[key].push(g);
}


function addGeofenceRing(pos, radius, key) {
    const colors = { hq: 0xff6600, parliament: 0x2255ff, sc: 0x22cc55 };
    const emissives = { hq: 0xcc4400, parliament: 0x1133aa, sc: 0x118833 };
    const c = colors[key], e = emissives[key];
    const wall = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 2200, 40, 1, true),
        new THREE.MeshPhysicalMaterial({
            color: c, emissive: e, transparent: true, opacity: 0.09,
            side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
        })
    );
    wall.position.set(pos.x, 1100, pos.z);
    wall.castShadow = false; wall.receiveShadow = false;
    scene.add(wall);
    if (siteVisuals[key]) siteVisuals[key].push(wall);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 5, 8, 64),
        new THREE.MeshBasicMaterial({ color: c })
    );
    ring.rotation.x = Math.PI / 2; ring.position.set(pos.x, 4, pos.z);
    ring.castShadow = false; ring.receiveShadow = false;
    scene.add(ring);
    if (siteVisuals[key]) siteVisuals[key].push(ring);

    // Top ring
    const topRing = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 3, 8, 64),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5 })
    );
    topRing.rotation.x = Math.PI / 2; topRing.position.set(pos.x, 1200, pos.z);
    topRing.castShadow = false; topRing.receiveShadow = false;
    scene.add(topRing);
    if (siteVisuals[key]) siteVisuals[key].push(topRing);
}


// ─── PARTICLE SYSTEM ──────────────────────────────────────────
class Explosion {
    constructor(pos, color) {
        this.n = 60; const geo = new THREE.BufferGeometry();
        this.pos_a = new Float32Array(this.n * 3); this.vel = [];
        for (let i = 0; i < this.n; i++) {
            this.pos_a.set([pos.x, pos.y, pos.z], i * 3);
            const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
            const sp = 100 + Math.random() * 240;
            this.vel.push(sp * Math.sin(ph) * Math.cos(th), sp * Math.sin(ph) * Math.sin(th), sp * Math.cos(ph));
        }
        geo.setAttribute('position', new THREE.BufferAttribute(this.pos_a, 3));
        this.sys = new THREE.Points(geo, new THREE.PointsMaterial({
            color, size: 16, transparent: true, opacity: 1,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        scene.add(this.sys); this.life = 1; this.active = true;
    }
    update(dt) {
        if (!this.active) return;
        this.life -= dt * 1.4;
        if (this.life <= 0) {
            this.active = false; scene.remove(this.sys);
            this.sys.geometry.dispose(); this.sys.material.dispose(); return;
        }
        const p = this.sys.geometry.attributes.position.array;
        for (let i = 0; i < this.n; i++) {
            p[i * 3] += this.vel[i * 3] * dt; p[i * 3 + 1] += this.vel[i * 3 + 1] * dt; p[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
            this.vel[i * 3 + 1] -= 180 * dt;
        }
        this.sys.geometry.attributes.position.needsUpdate = true;
        this.sys.material.opacity = this.life;
    }
}

class Trail {
    constructor(color) {
        this.max = 18; this.pts = [];
        const geo = new THREE.BufferGeometry();
        this.arr = new Float32Array(this.max * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(this.arr, 3));
        this.mat = new THREE.LineBasicMaterial({
            color, transparent: true, opacity: 1,
            blending: THREE.AdditiveBlending, linewidth: 1
        });
        this.line = new THREE.Line(geo, this.mat);
        scene.add(this.line); this.active = true;
    }
    add(pos) {
        if (!this.active) return;
        this.pts.unshift(pos.clone());
        if (this.pts.length > this.max) this.pts.pop();
        const a = this.line.geometry.attributes.position.array;
        for (let i = 0; i < this.pts.length; i++) this.pts[i].toArray(a, i * 3);
        const last = this.pts[this.pts.length - 1];
        for (let i = this.pts.length; i < this.max; i++) last.toArray(a, i * 3);
        this.line.geometry.attributes.position.needsUpdate = true;
    }
    fade(dt) {
        this.mat.opacity -= dt * 2.8;
        if (this.mat.opacity <= 0) {
            this.active = false; scene.remove(this.line);
            this.line.geometry.dispose(); this.mat.dispose();
        }
    }
}

class Debris {
    constructor(pos, vel, color, scale = 1) {
        this.pos = pos.clone();
        this.vel = vel.clone();
        this.active = true;
        this.onGround = false;
        this.life = 4.0; // Stay for 4 seconds
        this.fadeStart = 1.0; // Start fading in the last second

        const geo = new THREE.BoxGeometry(2 * scale, 1.5 * scale, 3 * scale);
        const mat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.6, roughness: 0.4, transparent: true });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(this.pos);
        this.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        this.rotVel = new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    }
    update(dt) {
        if (!this.active) return;

        if (!this.onGround) {
            this.vel.y -= 500 * dt; // Gravity
            this.pos.addScaledVector(this.vel, dt);
            this.mesh.rotation.x += this.rotVel.x * dt;
            this.mesh.rotation.y += this.rotVel.y * dt;
            this.mesh.rotation.z += this.rotVel.z * dt;

            if (this.pos.y <= 0.8) {
                this.pos.y = 0.8;
                this.onGround = true;
                this.vel.set(0, 0, 0);
                this.rotVel.set(0, 0, 0);
                // Randomize final rotation on ground
                this.mesh.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
            }
        } else {
            this.life -= dt;
            if (this.life <= this.fadeStart) {
                this.mesh.material.opacity = this.life / this.fadeStart;
            }
            if (this.life <= 0) {
                this.active = false;
                scene.remove(this.mesh);
                this.mesh.geometry.dispose();
                this.mesh.material.dispose();
            }
        }
        this.mesh.position.copy(this.pos);
    }
}

// ─── DRONE 3D MODEL (quadcopter) ──────────────────────────────
function makeDroneMesh() {
    const g = new THREE.Group();
    const bodyM = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 });
    const accM = new THREE.MeshStandardMaterial({ color: 0xff2200, metalness: 0.6, roughness: 0.3 });
    const propM = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.5, transparent: true, opacity: 0.72 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x88ccff, roughness: 0, transmission: 0.85, thickness: 0.2 });

    g.add(mesh(new THREE.BoxGeometry(14, 5, 14), bodyM));
    const shell = mesh(new THREE.SphereGeometry(8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), bodyM); shell.position.y = 2.5; g.add(shell);
    const cam = mesh(new THREE.SphereGeometry(2.8, 10, 10), glass); cam.position.set(0, -1.5, 8); g.add(cam);

    const arms = [Math.PI / 4, -Math.PI / 4, Math.PI / 4 + Math.PI, -Math.PI / 4 + Math.PI];
    const armLen = 18;
    arms.forEach((ang, idx) => {
        const arm = mesh(new THREE.BoxGeometry(armLen, 2, 2.8), idx % 2 === 0 ? accM : bodyM);
        arm.rotation.y = ang;
        arm.position.set(Math.cos(ang) * armLen * 0.5, -1, Math.sin(ang) * armLen * 0.5);
        g.add(arm);
        const motor = mesh(new THREE.CylinderGeometry(3.2, 3.2, 3.5, 12), bodyM);
        motor.position.set(Math.cos(ang) * armLen, 0, Math.sin(ang) * armLen); g.add(motor);
        const prop = mesh(new THREE.CylinderGeometry(8, 8, 0.7, 14), propM);
        prop.position.set(Math.cos(ang) * armLen, 3, Math.sin(ang) * armLen); g.add(prop);
        prop.userData.isProp = true;
    });
    const legM = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.7 });
    [[-7, 8], [7, 8], [-7, -8], [7, -8]].forEach(([lx, lz]) => {
        const leg = mesh(new THREE.CylinderGeometry(0.9, 0.9, 9, 6), legM); leg.position.set(lx, -5.5, lz); g.add(leg);
        const ft = mesh(new THREE.BoxGeometry(11, 1.2, 2.5), legM); ft.position.set(lx, -10.2, lz); g.add(ft);
    });
    const led = mesh(new THREE.SphereGeometry(1.3), new THREE.MeshBasicMaterial({ color: 0xff0000 })); led.position.y = 4; g.add(led);
    return g;
}

// ─── MISSILE 3D MODEL (inbound threat) ────────────────────────
function makeMissileThreatMesh(tKey) {
    const colors = { DRONE: null, CRUISE: 0xcc8833, SRBM: 0xcc4422, MRBM: 0xaa1144, HYPERSONIC: 0x9922cc };
    const g = new THREE.Group();
    const bodyC = colors[tKey] || 0xcc4422;
    const bodyM = new THREE.MeshStandardMaterial({ color: bodyC, metalness: 0.8, roughness: 0.2 });
    const noseM = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.1 });
    const finM = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.25 });
    const thrM = new THREE.MeshBasicMaterial({ color: 0xff7700, transparent: true, opacity: 0.88 });

    g.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 32, 12), bodyM));
    const nose = mesh(new THREE.ConeGeometry(2.4, 12, 12), noseM); nose.position.y = 22; g.add(nose);
    const nz = mesh(new THREE.CylinderGeometry(2.8, 3.5, 6, 12), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.95 }));
    nz.position.y = -20; g.add(nz);
    const fl = mesh(new THREE.ConeGeometry(3, 10, 10), thrM); fl.rotation.x = Math.PI; fl.position.y = -26; g.add(fl);
    const ci = mesh(new THREE.ConeGeometry(1.5, 6, 8), new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.85 }));
    ci.rotation.x = Math.PI; ci.position.y = -23; g.add(ci);
    for (let f = 0; f < 4; f++) {
        const ang = f / 4 * Math.PI * 2;
        const fin = mesh(new THREE.BoxGeometry(0.9, 11, 9), finM);
        fin.position.set(Math.cos(ang) * 3.8, -13, Math.sin(ang) * 3.8); fin.rotation.y = ang; g.add(fin);
    }
    for (let f = 0; f < 4; f++) {
        const ang = f / 4 * Math.PI * 2 + Math.PI / 4;
        const fin = mesh(new THREE.BoxGeometry(0.7, 5, 6), finM);
        fin.position.set(Math.cos(ang) * 3, 3, Math.sin(ang) * 3); fin.rotation.y = ang; g.add(fin);
    }
    const band = mesh(new THREE.CylinderGeometry(2.45, 2.45, 3, 12),
        new THREE.MeshStandardMaterial({ color: 0xff4400, metalness: 0.7 }));
    band.position.y = 5; g.add(band);
    return g;
}

// ─── INTERCEPTOR 3D MODELS ────────────────────────────────────
function makeInterceptorMesh(iKey) {
    const g = new THREE.Group();
    const specs = {
        DRONE: { bl: 22, br: 1.6, col: 0xeeeeee, fins: 4, finH: 6, finD: 4, label: 'TAMIR' },  // Iron Dome
        CRUISE: { bl: 32, br: 2.1, col: 0xfafafa, fins: 4, finH: 10, finD: 6, label: 'PAC-3' }, // Patriot
        SRBM: { bl: 38, br: 2.5, col: 0xe0e0e0, fins: 4, finH: 14, finD: 8, label: '48N6' },  // S-400
        MRBM: { bl: 45, br: 2.2, col: 0xddeeff, fins: 4, finH: 16, finD: 9, label: 'THAAD' }, // THAAD
        HYPERSONIC: { bl: 42, br: 2.9, col: 0xffffff, fins: 4, finH: 18, finD: 11, label: 'ARW-3' } // Arrow-3
    };
    const s = specs[iKey] || specs.SRBM;

    // Materials
    const bodyM = new THREE.MeshPhysicalMaterial({
        color: 0xdddddd, metalness: 0.9, roughness: 0.2,
        clearcoat: 1.0, clearcoatRoughness: 0.1
    });
    const tipM = new THREE.MeshPhysicalMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
    const accM = new THREE.MeshPhysicalMaterial({ color: s.col, metalness: 0.5, roughness: 0.5, emissive: s.col, emissiveIntensity: 0.2 });
    const nozzleM = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 1.0, roughness: 0.3 });
    const thrM = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });

    // Main Body (Multi-stage look)
    const stage1H = s.bl * 0.6;
    const stage2H = s.bl * 0.4;

    // Booster (Stage 1)
    const booster = mesh(new THREE.CylinderGeometry(s.br, s.br, stage1H, 16), bodyM);
    booster.position.y = -stage2H / 2;
    g.add(booster);

    // Kill Vehicle / Nose (Stage 2)
    const upper = mesh(new THREE.CylinderGeometry(s.br * 0.85, s.br, stage2H, 16), bodyM);
    upper.position.y = stage1H / 2;
    g.add(upper);

    // Separation Band
    const band = mesh(new THREE.TorusGeometry(s.br + 0.1, 0.4, 8, 20), accM);
    band.rotation.x = Math.PI / 2;
    band.position.y = stage1H / 2 - stage2H / 2;
    g.add(band);

    // Tip / Seeker
    const nose = mesh(new THREE.ConeGeometry(s.br * 0.85, s.bl * 0.3, 16), tipM);
    nose.position.y = stage1H / 2 + stage2H / 2 + (s.bl * 0.15);
    g.add(nose);

    // Nozzle
    const nozzle = mesh(new THREE.CylinderGeometry(s.br * 0.7, s.br * 1.1, 6, 12), nozzleM);
    nozzle.position.y = -s.bl * 0.6;
    g.add(nozzle);

    // Thruster Flare
    const flare = mesh(new THREE.ConeGeometry(s.br, 15, 12), thrM);
    flare.rotation.x = Math.PI;
    flare.position.y = -s.bl * 0.75;
    g.add(flare);

    // Fins (Main)
    for (let i = 0; i < s.fins; i++) {
        const ang = (i / s.fins) * Math.PI * 2;
        const fGeo = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            0, 0, 0,                             // Internal bottom
            Math.cos(ang) * s.finH, -s.finD, Math.sin(ang) * s.finH,  // External bottom
            Math.cos(ang) * s.finH, s.finD, Math.sin(ang) * s.finH,   // External top
            0, s.finD * 0.5, 0                   // Internal top
        ]);
        const indices = [0, 1, 2, 0, 2, 3];
        fGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        fGeo.setIndex(indices);
        fGeo.computeVertexNormals();

        const fin = mesh(fGeo, bodyM);
        fin.position.y = -s.bl * 0.4;
        g.add(fin);
    }

    // Mid Canards
    if (iKey !== 'DRONE') {
        for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const canard = mesh(new THREE.BoxGeometry(s.br * 0.2, 4, 6), bodyM);
            canard.position.set(Math.cos(ang) * s.br, s.bl * 0.2, Math.sin(ang) * s.br);
            canard.rotation.y = ang;
            g.add(canard);
        }
    }

    return g;
}

function mesh(geo, mat) { return new THREE.Mesh(geo, mat); }

// ─── ENTITY: DRONE / THREAT ───────────────────────────────────
class ThreatEntity {
    constructor(defKey) {
        const keys = Array.from(attackTargetKeys);
        if (keys.length === 0) { this.active = false; return; }
        const siteKey = keys[Math.floor(Math.random() * keys.length)];
        const site = SITES[siteKey];
        const def = THREAT_DEFS.find(d => d.key === defKey) || THREAT_DEFS[0];
        // Only pick from currently active attacking countries
        const eligibleCountries = ENEMY_COUNTRIES.filter(c => activeAttackingCountries.has(c.name));
        const countryPool = eligibleCountries.length > 0 ? eligibleCountries : ENEMY_COUNTRIES;
        const country = countryPool[Math.floor(Math.random() * countryPool.length)];

        this.def = def; this.siteKey = siteKey; this.site = site;
        this.country = country; this.active = true; this.targetedBy = 0;
        this.id = ++threatIdCtr;

        // Threat log entry
        this.logEntry = addThreatEntry(this.id, def, country, siteKey);

        const angle = Math.random() * Math.PI * 2;
        const h = def.spawnHMin + Math.random() * (def.spawnHMax - def.spawnHMin);
        const x = Math.cos(angle) * SPAWN_RADIUS, z = Math.sin(angle) * SPAWN_RADIUS;

        this.pos = new THREE.Vector3(x, h, z);
        this.vel = new THREE.Vector3(0, 0, 0);
        this.speed = def.speed;

        if (def.key === 'DRONE') {
            this.mesh3 = makeDroneMesh();
            this.propellers = [];
            this.mesh3.traverse(c => { if (c.isMesh && c.userData.isProp) this.propellers.push(c); });
        } else if (def.key === 'B2') {
            this.mesh3 = makeB2Mesh();
            this.bombsDropped = 0;
            this.dropTimer = 0;
        } else {
            this.mesh3 = makeMissileThreatMesh(def.key);
        }
        this.mesh3.scale.setScalar(def.scale);
        this.mesh3.position.copy(this.pos);
        scene.add(this.mesh3);

        this.trail = new Trail(def.trailColor);
        trails.push(this.trail);

        // Ballistic arc vars
        this.ballistic = (def.ballistic === true);
        if (this.ballistic && site) {
            // Aim for target site via high arc
            const dir = new THREE.Vector3().subVectors(site.pos, this.pos).normalize();
            const hdist = new THREE.Vector2(this.pos.x - site.pos.x, this.pos.z - site.pos.z).length();
            this.vel.set(dir.x * this.speed * .7, this.speed * .85, dir.z * this.speed * .7);
        } else {
            // Fallback for non-ballistic or no site
            const targetPos = site ? site.pos.clone() : new THREE.Vector3(0, 0, 0);
            if (this.def.isBomber) {
                targetPos.y = this.pos.y; // Keep altitude!
                this.attackDir = new THREE.Vector3().subVectors(targetPos, this.pos).normalize();
            }
            const dir = new THREE.Vector3().subVectors(targetPos, this.pos).normalize();
            this.vel.copy(dir).multiplyScalar(this.speed);
        }
        this.wobbleX = Math.random() * Math.PI * 2;
        this.wobbleY = Math.random() * Math.PI * 2;
        this.wobbleSpd = 1.5 + Math.random() * 3;
    }

    update(dt) {
        if (!this.active) return;
        if (this.def.key === 'DRONE') this.propellers.forEach(p => p.rotation.y += dt * 28);

        const target = this.site.pos;

        if (this.ballistic) {
            this.vel.y -= 350 * dt; // gravity for ballistic
            _v1.copy(this.vel).multiplyScalar(dt);
            this.pos.add(_v1);
            // Gradually steer toward target
            _v1.subVectors(target, this.pos).normalize();
            this.vel.x = THREE.MathUtils.lerp(this.vel.x, _v1.x * this.speed, dt * .3);
            this.vel.z = THREE.MathUtils.lerp(this.vel.z, _v1.z * this.speed, dt * .3);
        } else {
            this.wobbleX += dt * this.wobbleSpd; this.wobbleY += dt * this.wobbleSpd * 1.6;

            if (this.def.isBomber && this.attackDir) {
                _v1.copy(this.attackDir); // Lock bomber to straight attack vector
            } else {
                _v1.subVectors(target, this.pos).normalize();
            }

            _v2.crossVectors(_v1, _vUp).normalize(); // right
            _v3.crossVectors(_v2, _v1).normalize(); // up
            _v4.copy(_v1).multiplyScalar(this.speed)
                .add(_v2.multiplyScalar(Math.sin(this.wobbleX) * 55))
                .add(_v3.multiplyScalar(Math.cos(this.wobbleY) * 40));
            this.vel.lerp(_v4, dt * 2.5);
            if (this.pos.y < 80 && !this.def.isBomber) this.vel.y += 220 * dt;
            this.pos.addScaledVector(this.vel, dt);
        }

        // Bomber Logic
        if (this.def.isBomber && this.active) {
            // Check escape
            const distFromCenter = new THREE.Vector2(this.pos.x, this.pos.z).length();
            if (distFromCenter > SPAWN_RADIUS + 300) {
                this.silentRemove();
                return;
            }

            const hDist = new THREE.Vector2(this.pos.x - target.x, this.pos.z - target.z).length();
            if (hDist < 500 && this.bombsDropped < 4) {
                this.dropTimer -= dt;
                if (this.dropTimer <= 0) {
                    const bomb = new BombEntity(this.pos, this.siteKey);
                    drones.push(bomb);
                    this.bombsDropped++;
                    this.dropTimer = 0.6;
                    // Reveal on drop
                    if (this.logEntry && this.logEntry.domEl && this.logEntry.domEl.style.display === 'none') {
                        this.logEntry.domEl.style.display = 'grid';
                        activeThreatCount++;
                        updateThreatBadge();
                        showSwarmAlert('⚠️ STEALTH BOMBER DETECTED ⚠️');
                    }
                }
            }
        }

        // Maintain proper altitude visibility and stealth mechanics
        if (this.def.isBomber) {
            this.mesh3.visible = (camMode === 'satellite' || killCam.source === this);
        }

        this.mesh3.position.copy(this.pos);
        _v1.copy(this.vel);
        if (_v1.lengthSq() > 0.1) {
            _v1.normalize();
            if (this.def.key === 'DRONE' || this.def.isBomber) {
                _v2.copy(this.pos).add(_v1);
                this.mesh3.lookAt(_v2);
            } else {
                this.mesh3.quaternion.setFromUnitVectors(_vUp, _v1);
            }
        }
        this.trail.add(this.pos);
    }

    silentRemove() {
        if (!this.active) return;
        this.active = false;
        scene.remove(this.mesh3);
        this.mesh3.traverse(c => { if (c.isMesh) c.geometry.dispose(); });
        if (this.logEntry && this.logEntry.domEl) {
            this.logEntry.domEl.style.opacity = '0';
            setTimeout(() => { if (this.logEntry && this.logEntry.domEl) this.logEntry.domEl.remove(); }, 1000);
        }
        activeThreatCount = Math.max(0, activeThreatCount - 1);
        updateThreatBadge();
    }

    destroy(intercepted, interceptorName) {
        if (!this.active) return;
        this.active = false;

        // Spawn debris
        const count = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const v = new THREE.Vector3((Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150);
            debris.push(new Debris(this.pos, v, this.def.trailColor, this.def.scale));
        }

        scene.remove(this.mesh3);
        this.mesh3.traverse(c => { if (c.isMesh) c.geometry.dispose(); });
        updateThreatStatus(this.logEntry, intercepted ? 'intercepted' : 'breached', interceptorName || '');
    }
}

// ─── ENTITY: INTERCEPTOR MISSILE ─────────────────────────────
class InterceptorEntity {
    constructor(target, siteKey) {
        const site = SITES[siteKey];
        const iDef = INTERCEPTOR_DEFS[target.def.key] || INTERCEPTOR_DEFS.SRBM;
        this.iDef = iDef; this.target = target; this.siteKey = siteKey;
        this.speed = iDef.speed; this.life = 12; this.active = true;
        if (target.active) target.targetedBy++;

        // Multi-launcher logic: pick a pad if it's Parliament or SC
        this.pos = site.pos.clone();
        if (siteKey === 'parliament') {
            const pads = [[-80, 80], [80, 80], [0, 0]];
            const p = pads[Math.floor(Math.random() * pads.length)];
            this.pos.x += p[0]; this.pos.z += p[1];
        } else if (siteKey === 'sc') {
            const pads = [[-70, -70], [70, -70], [0, 0]];
            const p = pads[Math.floor(Math.random() * pads.length)];
            this.pos.x += p[0]; this.pos.z += p[1];
        }
        this.pos.y = 25;

        this.vel = new THREE.Vector3((Math.random() - .5) * 120, 350 + Math.random() * 200, (Math.random() - .5) * 120);

        this.mesh3 = makeInterceptorMesh(target.def.key);
        this.mesh3.scale.setScalar(0.7);
        this.mesh3.position.copy(this.pos);
        scene.add(this.mesh3);

        this.trail = new Trail(iDef.trailColor);
        trails.push(this.trail);

        // Log in interceptor panel
        this.intPanelId = addInterceptorEntry(iDef, target.site.name + ' defense');

        // Audio trigger
        audio.playLaunch();
    }

    update(dt) {
        if (!this.active) return;
        this.life -= dt;
        if (this.life <= 0 || !this.target || !this.target.active) { this.destroy(); return; }

        const dist = this.pos.distanceTo(this.target.pos);
        const toa = dist / this.speed;
        _v1.copy(this.target.pos).addScaledVector(this.target.vel, toa); // pred
        _v2.subVectors(_v1, this.pos); // dir
        if (_v2.lengthSq() > 0.001) _v2.normalize();
        this.vel.lerp(_v2.multiplyScalar(this.speed), dt * 7);
        this.vel.normalize().multiplyScalar(this.speed);
        this.pos.addScaledVector(this.vel, dt);
        this.mesh3.position.copy(this.pos);
        if (this.vel.lengthSq() > 0.1) {
            _v1.copy(this.vel).normalize();
            this.mesh3.quaternion.setFromUnitVectors(_vUp, _v1);
        }
        this.trail.add(this.pos);
    }

    destroy() {
        if (!this.active) return;
        this.active = false;
        scene.remove(this.mesh3);
        this.mesh3.traverse(c => { if (c.isMesh) c.geometry.dispose(); });
        if (this.target && this.target.active) this.target.targetedBy--;
        removeInterceptorEntry(this.intPanelId);
    }
}

// ─── GAME LOGIC ───────────────────────────────────────────────
function updateUI() {
    uiSpawned.innerText = stats.spawned;
    uiIntercepted.innerText = stats.intercepted;
    uiMissed.innerText = stats.missed;
    const acc = stats.spawned === 0 ? 100 : Math.round(stats.intercepted / (stats.intercepted + stats.missed + 0.0001) * 100);
    uiAccuracy.innerText = acc + '%';

    // Update Credits if element exists
    const creditEl = document.getElementById('stat-credits');
    if (creditEl) {
        creditEl.innerText = '$' + stats.credits.toLocaleString();
        creditEl.classList.toggle('danger', stats.credits < 500);
    }
}

function updateHealthUI(key) {
    const site = SITES[key];
    const pct = Math.max(0, Math.round(site.health));
    const label = document.getElementById(`pct-${key}`);
    const bar = document.getElementById(`bar-${key}`);
    if (label) label.innerText = pct + '%';
    if (bar) {
        bar.style.width = pct + '%';
        bar.classList.toggle('warning', pct < 60 && pct >= 30);
        bar.classList.toggle('danger', pct < 30);
    }
}

function updateB2ButtonUI() {
    const btn = document.getElementById('btn-b2-attack');
    if (!btn) return;
    if (b2Cooldown > 0) {
        const m = Math.floor(b2Cooldown / 60);
        const s = Math.floor(b2Cooldown % 60).toString().padStart(2, '0');
        btn.textContent = `⏳ B-2 Cooldown (${m}:${s})`;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    } else {
        btn.textContent = `🚀 Launch B-2 Bomber (Ready)`;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    }
}

function launchB2Manual() {
    if (!isRunning || b2Cooldown > 0) return;
    if (attackTargetKeys.size === 0) return;

    const b2Def = THREAT_DEFS.find(d => d.key === 'B2');
    if (!b2Def) return;

    const threat = new ThreatEntity('B2');
    drones.push(threat);

    // Trigger majestic 14s killcam sequence immediately on spawn
    if (killCam) killCam.triggerBomber(threat);

    stats.spawned++;
    updateUI();

    b2Cooldown = 120; // 2 minutes cooldown
    updateB2ButtonUI();
}

function spawnThreat() {
    if (!isRunning) return;
    if (attackTargetKeys.size === 0) return;

    const allWeights = [4, 2, 2, 1, 1, 1]; // Weights for each threat type in THREAT_DEFS
    const eligible = THREAT_DEFS
        .map((d, i) => ({ def: d, weight: allWeights[i] }))
        .filter(e => activeThreatTypes.has(e.def.key));
    if (eligible.length === 0) return;
    const total = eligible.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total, chosen = eligible[eligible.length - 1].def;
    for (const e of eligible) { r -= e.weight; if (r <= 0) { chosen = e.def; break; } }

    const rcount = (Math.random() < 0.15 && chosen.key === 'DRONE') ? 3 + Math.floor(Math.random() * 3) : 1;
    const finalChosen = chosen;
    const count = rcount;

    const keys = Array.from(attackTargetKeys);
    const targetKey = keys[Math.floor(Math.random() * keys.length)];
    const angle = Math.random() * Math.PI * 2;
    const ox = Math.cos(angle) * SPAWN_RADIUS, oz = Math.sin(angle) * SPAWN_RADIUS;

    if (count > 1) showSwarmAlert();

    for (let i = 0; i < count; i++) {
        const threat = new ThreatEntity(finalChosen.key);
        if (count > 1) {
            threat.siteKey = targetKey;
            threat.site = SITES[targetKey];
            threat.pos.set(ox + (Math.random() - 0.5) * 150, threat.pos.y, oz + (Math.random() - 0.5) * 150);
            const dir = new THREE.Vector3().subVectors(threat.site.pos, threat.pos).normalize();
            threat.vel.copy(dir).multiplyScalar(threat.speed);
            threat.mesh3.position.copy(threat.pos);
        }
        drones.push(threat);
        stats.spawned++;
    }
    updateUI();
}

const INTERCEPTOR_COST = 250;
const INTERCEPTION_REWARD = 3000;
const BREACH_PENALTY = 1000;

function launchInterceptors() {
    for (const threat of drones) {
        if (!threat.active) continue;
        const maxInt = (threat.siteKey === 'hq') ? 1 : 3;
        if (threat.targetedBy >= maxInt) continue;

        const site = SITES[threat.siteKey];
        const dist = threat.pos.distanceTo(site.pos);
        if (dist < site.gfR) {
            // Check budget
            if (stats.credits >= INTERCEPTOR_COST) {
                stats.credits -= INTERCEPTOR_COST;
                interceptors.push(new InterceptorEntity(threat, threat.siteKey));
                updateUI();
            } else {
                // Potential: Show budget warning in logs
            }
        }
    }
}

function checkCollisions() {
    const explosionDistSq = 40 * 40;
    const siteDistSq = (TARGET_RADIUS + 20) ** 2;

    for (const ic of interceptors) {
        if (!ic.active || !ic.target || !ic.target.active) continue;
        const distSq = ic.pos.distanceToSquared(ic.target.pos);

        // Early cinematic trigger
        if (distSq < 550 * 550 && !killCam.active) {
            killCam.trigger(ic.target, ic);
        }

        if (distSq < explosionDistSq) {
            const name = ic.iDef.name;
            ic.destroy();
            particles.push(new Explosion(ic.target.pos, 0xffcc44));

            // Advanced mode triggers
            audio.playExplosion(false);

            stats.credits += INTERCEPTION_REWARD;
            ic.target.destroy(true, name);
            drones = drones.filter(d => d !== ic.target);
            stats.intercepted++; updateUI();
        }
    }
    for (const t of drones) {
        if (!t.active) continue;
        const sitePos = t.site.pos;
        if (t.pos.distanceToSquared(sitePos) < siteDistSq) {
            t.destroy(false, '');
            particles.push(new Explosion(t.pos, 0xff2222));

            // Audio trigger for breach
            audio.playExplosion(true);

            stats.credits = Math.max(0, stats.credits - BREACH_PENALTY);
            const dmg = (t.def.key === 'BOMB') ? 20 : 50;
            damageSite(t.siteKey, dmg);
            stats.missed++; updateUI();
        }
    }
}

function damageSite(key, amount = 50) {
    const site = SITES[key];
    const group = siteGroups[key];
    if (!site || !group || site.health <= 0) return;
    site.damage++;
    site.health = Math.max(0, site.health - amount); // Custom payload damage

    updateHealthUI(key);

    // Spawn damage visual
    if (!siteDamageVisuals[key]) siteDamageVisuals[key] = [];
    const p = new PersistentDamage(site.pos, key);
    siteDamageVisuals[key].push(p);

    group.traverse(child => {
        if (child.isMesh && child.material) {
            // Morph material toward charred look
            child.material.color.lerp(new THREE.Color(0x111111), 0.4);
            if (child.material.emissive) child.material.emissive.setHex(0x000000);
            child.material.roughness = 1.0;
        }
    });

    if (site.health <= 0) {
        destroySite(key);
    }
}

function destroySite(key) {
    const site = SITES[key];
    const group = siteGroups[key];

    // 1. Remove from attack targets
    attackTargetKeys.delete(key);

    // 2. UI Update: disable/mark the button
    const btn = document.getElementById('target-' + key);
    if (btn) {
        btn.classList.add('destroyed');
        btn.onclick = null;
        const check = document.getElementById('check-' + key);
        if (check) check.textContent = '✖';
    }

    // 3. Visual destruction
    // Massive explosion
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            particles.push(new Explosion(site.pos.clone().add(new THREE.Vector3(Math.random() * 40 - 20, i * 20, Math.random() * 40 - 20)), 0xff4422));
        }, i * 200);
    }

    // Remove protective visuals
    if (siteVisuals[key]) {
        siteVisuals[key].forEach(obj => {
            scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        siteVisuals[key] = [];
    }

    // "Destroy" the building: lower it and add smoke/fire
    group.position.y -= 15;
    group.traverse(child => {
        if (child.isMesh && child.material) {
            child.material.color.setHex(0x0a0a0a);
            if (child.material.emissive) child.material.emissive.setHex(0x221100);
        }
    });

    // Spawn a persistent smoke column over the destruction
    smokeColumns.push(new SmokeColumn(site.pos));

    // Game over if all sites destroyed
    const allGone = Object.values(SITES).every(s => s.health <= 0);
    if (allGone) showEndScreen(false);
}


function updateSimulation(dt) {
    if (!isRunning) return;
    drones.forEach(d => d.update(dt));
    interceptors.forEach(i => i.update(dt));
    particles.forEach(p => p.update(dt));
    debris.forEach(deb => deb.update(dt));
    launchInterceptors();
    checkCollisions();
    drones = drones.filter(d => d.active);
    interceptors = interceptors.filter(i => i.active);
    particles = particles.filter(p => p.active);
    debris = debris.filter(deb => deb.active);

    if (b2Cooldown > 0) {
        b2Cooldown -= dt;
        if (b2Cooldown <= 0) b2Cooldown = 0;
        updateB2ButtonUI();
    }

    // Update advanced features
    killCam.update(dt);
    if (minimap) minimap.update();

    // Smoke columns
    smokeColumns.forEach(s => s.update(dt));
    smokeColumns = smokeColumns.filter(s => s.active);

    // Mission timer + victory check
    if (!gameEnded) {
        missionTimer += dt;
        if (missionTimer >= MISSION_DURATION) showEndScreen(true);
    }

    for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i];
        if (!t.active) { trails.splice(i, 1); continue; }
        let orphan = true;
        for (const d of drones) if (d.trail === t) orphan = false;
        for (const ic of interceptors) if (ic.trail === t) orphan = false;
        if (orphan) t.fade(dt);
    }
}

function updateClouds(dt) {
    clouds.forEach(c => { c.position.x += c.userData.speed * dt * 9; if (c.position.x > 3000) c.position.x = -3000; });
}

// ─── LOOP ─────────────────────────────────────────────────────
function loop(ts) {
    try {
        let dt = (ts - lastTime) / 1000; lastTime = ts;
        if (isNaN(dt) || dt > 0.1) dt = 0.1;
        if (isRunning) {
            updateSimulation(dt);
            updateEnvironment(dt);
            updateHeatSignatures();
            if (weather) weather.update(dt);

            repairDrones.forEach(d => d.update(dt));
            repairDrones = repairDrones.filter(d => d.active);

            // Update damage visuals
            Object.values(siteDamageVisuals).forEach(list => {
                list.forEach(v => v.update(dt));
            });
        }
        updateClouds(dt);
        if (controls) controls.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
        requestAnimationFrame(loop);
    } catch (e) {
        console.error("Loop Error:", e);
        isRunning = false;
        alert("Simulation Loop Error: " + e.message);
    }
}

// ─── BUTTON HANDLERS (called from inline HTML onclick) ────────────
function handleToggle() {
    isRunning = !isRunning;
    const btn = document.getElementById('btn-toggle');
    btn.innerHTML = isRunning ? '⏹ Stop' : '▶ Start';
    btn.classList.toggle('running', isRunning);
    if (isRunning) lastTime = performance.now();
}

function handleReset() {
    drones.forEach(d => d.destroy(false, ''));
    interceptors.forEach(i => i.destroy());
    drones = []; interceptors = [];
    particles = []; trails = [];

    // Clear smoke columns
    smokeColumns.forEach(s => s.destroy());
    smokeColumns = [];

    // Clear game state
    gameEnded = false;
    missionTimer = 0;
    b2Cooldown = 0;
    updateB2ButtonUI();
    const oldOverlay = document.getElementById('end-screen-overlay');
    if (oldOverlay) oldOverlay.remove();

    debris.forEach(d => { scene.remove(d.mesh); if (d.mesh.geometry) d.mesh.geometry.dispose(); if (d.mesh.material) d.mesh.material.dispose(); });
    debris = [];

    // Reset Damage Visuals
    Object.keys(siteDamageVisuals).forEach(key => {
        siteDamageVisuals[key].forEach(v => v.destroy());
        siteDamageVisuals[key] = [];
    });

    // Reset Site Damage & Visuals
    for (const [key, site] of Object.entries(SITES)) {
        site.damage = 0;
        site.health = 100;
        updateHealthUI(key);
        if (siteVisuals[key]) {
            siteVisuals[key].forEach(obj => { scene.remove(obj); if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose(); });
            siteVisuals[key] = [];
        }
        if (siteGroups[key]) {
            scene.remove(siteGroups[key]);
            siteGroups[key].traverse(c => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); } });
        }
        // Re-enable buttons if they were destroyed
        const btn = document.getElementById('target-' + key);
        if (btn) {
            btn.classList.remove('destroyed');
            btn.onclick = () => toggleAttackTarget(key); // Re-assign handler
            const check = document.getElementById('check-' + key);
            if (check) check.textContent = '✓';
        }
    }
    // Restore default target
    attackTargetKeys = new Set(['hq']);
    ['hq', 'parliament', 'sc'].forEach(k => {
        const btn = document.getElementById('target-' + k);
        if (btn) btn.classList.toggle('active', attackTargetKeys.has(k));
    });

    siteGroups.hq = buildSiteHQ();
    siteGroups.parliament = buildParliament(SITES.parliament.pos);
    siteGroups.sc = buildSupremeCourt(SITES.sc.pos);

    stats = { spawned: 0, intercepted: 0, missed: 0, credits: 100000 }; updateUI();
    threatLog = []; threatIdCtr = 0; activeThreatCount = 0;
    threatList.innerHTML = '<div class="empty-log">No threats detected.<br>Start simulation to begin tracking.</div>';
    intList.innerHTML = '<div class="empty-log">No interceptors active.</div>';
    updateThreatBadge();
}

function init() {
    try {
        init3D();
        weather = new WeatherSystem();
        minimap = new TacticalMinimap();
        setInterval(spawnThreat, 1100);
        requestAnimationFrame(loop);
    } catch (e) {
        console.error("Init Error:", e);
        alert("Init Error: " + e.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const old = document.getElementById('simulation-canvas');
        if (old) old.remove();
        init();
    } catch (e) {
        alert("Startup Error: " + e.message);
    }
});
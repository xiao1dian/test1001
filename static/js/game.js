import * as THREE from 'three';

// ─── SITELOCK — round-based bomb defusal ─────────────────────────────────────

const TILE = 1;
const EYE = 1.62, CROUCH_EYE = 1.15, RADIUS = 0.38;
const WALK = 6.4, SNEAK = 3.2, CROUCH_SPD = 2.6, JUMP = 7.2, GRAV = 24;
const FOV = 74, ADS_FOV = 58, SCOPE_FOV = 22;
const BUY_TIME = 12, ROUND_TIME = 105, BOMB_TIME = 40, WIN_ROUNDS = 8;
const PLANT_T = 3.2, DEFUSE_T = 10, DEFUSE_KIT = 5;

const TEAM = { T: 't', CT: 'ct' };
const COL = { t: 0xc98c28, ct: 0x4f8ec9 };

const WEAPONS = {
  knife:  { id:'knife',  slot:'melee',    name:'KNIFE',        price:0,    dmg:65,  rate:400, mag:1,  res:0,  spread:0,     ads:0,     recoil:0,    auto:false, melee:true },
  p9:     { id:'p9',     slot:'pistol',   name:'P9 COMPACT',   price:0,    dmg:33,  rate:220, mag:12, res:24, spread:0.018, ads:0.006, recoil:0.012,auto:false },
  g18:    { id:'g18',    slot:'pistol',   name:'G18',          price:0,    dmg:26,  rate:95,  mag:20, res:40, spread:0.03,  ads:0.014, recoil:0.016,auto:true },
  deagle: { id:'deagle', slot:'pistol',   name:'HAND CANNON',  price:700,  dmg:63,  rate:420, mag:7,  res:21, spread:0.012, ads:0.004, recoil:0.028,auto:false },
  smg:    { id:'smg',    slot:'primary',  name:'VECTOR',       price:1250, dmg:18,  rate:70,  mag:30, res:90, spread:0.04,  ads:0.018, recoil:0.01, auto:true },
  shotgun:{ id:'shotgun',slot:'primary',  name:'BOSS-12',      price:1800, dmg:16,  rate:780, mag:7,  res:21, spread:0.09,  ads:0.05,  recoil:0.04, auto:false, pellets:8 },
  kr47:   { id:'kr47',   slot:'primary',  name:'KR-47',        price:2700, dmg:31,  rate:100, mag:30, res:90, spread:0.026, ads:0.01,  recoil:0.018,auto:true },
  m4c:    { id:'m4c',    slot:'primary',  name:'M4 CARBINE',   price:3100, dmg:28,  rate:105, mag:30, res:90, spread:0.02,  ads:0.007, recoil:0.014,auto:true },
  scout:  { id:'scout',  slot:'primary',  name:'SCOUT',        price:1700, dmg:78,  rate:1250,mag:10, res:30, spread:0.008, ads:0.001, recoil:0.03, auto:false, scope:true },
  dmr:    { id:'dmr',    slot:'primary',  name:'MARKSMAN',     price:4750, dmg:110, rate:1400,mag:10, res:20, spread:0.006, ads:0.0004,recoil:0.04, auto:false, scope:true },
  he:     { id:'he',     slot:'nade',     name:'HE GRENADE',   price:300,  dmg:80,  rate:800, mag:1,  res:0,  spread:0,     ads:0,     recoil:0,    nade:'he' },
  flash:  { id:'flash',  slot:'nade',     name:'FLASH',        price:200,  dmg:0,   rate:800, mag:1,  res:0,  spread:0,     ads:0,     recoil:0,    nade:'flash' },
  smoke:  { id:'smoke',  slot:'nade',     name:'SMOKE',        price:300,  dmg:0,   rate:800, mag:1,  res:0,  spread:0,     ads:0,     recoil:0,    nade:'smoke' },
  bomb:   { id:'bomb',   slot:'bomb',     name:'CHARGE',       price:0,    dmg:0,   rate:0,   mag:1,  res:0,  spread:0,     ads:0,     recoil:0,    bomb:true },
};

const DIFFICULTY = {
  easy:   { label:'RECRUIT', acc:0.22, spd:4.2, dmg:12, rate:900,  hp:90  },
  normal: { label:'REGULAR', acc:0.42, spd:5.4, dmg:18, rate:620,  hp:100 },
  hard:   { label:'VETERAN', acc:0.62, spd:6.2, dmg:24, rate:420,  hp:100 },
};

const T_NAMES  = ['RUSH','DUSK','COIL','HEX'];
const CT_NAMES = ['WATCH','RIDGE','HALO','FROST'];

const WAYPOINTS = {
  tspawn:  { x:  0, z: 26, links:['mid','tunnels','long'] },
  tunnels: { x:-26, z: 20, links:['tspawn','bsite'] },
  bsite:   { x:-26, z: -8, links:['tunnels','bcon','ctspawn'] },
  bcon:    { x:-16, z:  0, links:['bsite','mid'] },
  mid:     { x:  0, z:  2, links:['tspawn','bcon','acon','ctspawn'] },
  acon:    { x: 16, z: -2, links:['mid','asite'] },
  long:    { x: 26, z: 20, links:['tspawn','asite'] },
  asite:   { x: 26, z:-10, links:['long','acon','ctspawn'] },
  ctspawn: { x:  0, z:-26, links:['mid','asite','bsite'] },
};

const SITES = {
  A: { x: 26, z: -10, r: 7 },
  B: { x:-26, z:  -8, r: 7 },
};

const SPAWNS = {
  t:  [{x:0,z:26},{x:-3.2,z:27},{x:3.2,z:27},{x:-6,z:25},{x:6,z:25}],
  ct: [{x:0,z:-26},{x:-3.2,z:-27},{x:3.2,z:-27},{x:-6,z:-25},{x:6,z:-25}],
};

// ─── STATE ───────────────────────────────────────────────────────────────────

const state = {
  screen: 'menu',
  phase: 'idle', // idle | buy | live | bomb | end
  side: TEAM.T,
  difficulty: 'normal',
  round: 0,
  scoreT: 0,
  scoreCT: 0,
  time: 0,
  bombTime: 0,
  bombPlanted: false,
  bombSite: null,
  bombPos: null,
  bombCarrier: null,
  plantedBy: null,
  lossT: 0,
  lossCT: 0,
  health: 100,
  armor: 0,
  helmet: false,
  kit: false,
  money: 800,
  kills: 0,
  deaths: 0,
  dead: false,
  ammo: {},
  inv: { melee:'knife', pistol:'g18', primary:null, nade:null, bomb:null },
  slot: 'pistol',
  keys: {},
  aiming: false,
  crouch: false,
  shooting: false,
  reloading: false,
  lastShot: 0,
  recoil: 0,
  channel: null,
  channelT: 0,
  pointerLocked: false,
  showBuy: false,
  showScore: false,
  colliders: [],
  walls2d: [],
  smokes: [],
  nades: [],
  tracers: [],
  bots: [],
  planSite: 'A',
  impacts: [],
  kick: 0,
  landDip: 0,
};

const player = { x:0, z:26, yaw:Math.PI, pitch:0, y:0, velY:0, vx:0, vz:0, onGround:true };
const input = { w:false, a:false, s:false, d:false, space:false, shift:false, ctrl:false, e:false };

// ─── AUDIO ───────────────────────────────────────────────────────────────────

let actx = null;
function audio() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur, type='square', vol=0.06, slide=0) {
  const ctx = audio();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq+slide), ctx.currentTime+dur);
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime+dur);
}
function noiseBurst(dur=0.08, vol=0.12, hp=400, lp=4000) {
  const ctx = audio();
  const n = ctx.createBuffer(1, Math.max(1, ctx.sampleRate*dur|0), ctx.sampleRate);
  const d = n.getChannelData(0);
  for (let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/d.length, 0.45);
  const src = ctx.createBufferSource(); src.buffer = n;
  const hpF = ctx.createBiquadFilter(); hpF.type='highpass'; hpF.frequency.value=hp;
  const lpF = ctx.createBiquadFilter(); lpF.type='lowpass'; lpF.frequency.value=lp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
  src.connect(hpF); hpF.connect(lpF); lpF.connect(g); g.connect(ctx.destination); src.start();
}
function gunshot(vol=0.16, heavy=false) {
  noiseBurst(heavy?0.16:0.09, vol, heavy?120:280, heavy?1800:5200);
  tone(heavy?95:140, heavy?0.12:0.07, 'sawtooth', vol*0.35, heavy?-50:-90);
  tone(heavy?220:340, 0.03, 'square', vol*0.12, -120);
}
const sfx = {
  shoot: (v=0.16) => gunshot(v, false),
  sniper: (v=0.2) => gunshot(v, true),
  hit: () => { tone(900, 0.03, 'square', 0.04); tone(180, 0.06, 'sine', 0.03); },
  plant: () => { tone(720, 0.05, 'square', 0.05); setTimeout(()=>tone(920,0.05,'square',0.05),70); },
  beep: () => tone(1350, 0.04, 'square', 0.045),
  explode: () => { noiseBurst(0.7, 0.28, 40, 900); tone(55, 0.55, 'sawtooth', 0.12, -25); },
  buy: () => tone(620, 0.07, 'triangle', 0.04),
  win: () => { tone(523,0.12,'sine',0.05); setTimeout(()=>tone(784,0.18,'sine',0.05),110); },
  lose: () => tone(130, 0.4, 'triangle', 0.05, -70),
  step: () => noiseBurst(0.07, 0.045, 80, 500),
  land: () => noiseBurst(0.12, 0.08, 60, 400),
  ricochet: () => { noiseBurst(0.05, 0.06, 2000, 8000); tone(2400, 0.04, 'square', 0.03, -800); },
  body: () => noiseBurst(0.12, 0.08, 90, 700),
};

// ─── SCENE ───────────────────────────────────────────────────────────────────

const container = document.getElementById('game-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, innerWidth/innerHeight, 0.05, 250);
scene.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.tabIndex = 0;
container.appendChild(renderer.domElement);

const mapGroup = new THREE.Group();
const botGroup = new THREE.Group();
const fxGroup = new THREE.Group();
scene.add(mapGroup, botGroup, fxGroup);

scene.add(new THREE.HemisphereLight(0xb9d4ee, 0x6b5428, 0.72));
const sun = new THREE.DirectionalLight(0xffe0b0, 1.55);
sun.position.set(28, 46, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.035;
sun.shadow.camera.near = 2; sun.shadow.camera.far = 120;
sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x6a5840, 0.22));

const viewModel = new THREE.Group();
camera.add(viewModel);
const vmLight = new THREE.PointLight(0xfff3e0, 6, 8, 0);
vmLight.position.set(0.12, 0.1, 0.1);
viewModel.add(vmLight);
viewModel.add(new THREE.AmbientLight(0xffffff, 0.8));

let gunMesh = null, muzzleFlash = null, armR = null;

const raycaster = new THREE.Raycaster();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function fbm(x, y) {
  const n0 = hash2(Math.floor(x), Math.floor(y));
  const n1 = hash2(Math.floor(x)+1, Math.floor(y));
  const n2 = hash2(Math.floor(x), Math.floor(y)+1);
  const n3 = hash2(Math.floor(x)+1, Math.floor(y)+1);
  const fx = x - Math.floor(x), fy = y - Math.floor(y);
  return n0*(1-fx)*(1-fy) + n1*fx*(1-fy) + n2*(1-fx)*fy + n3*fx*fy;
}
function makeTex(size, a, b, scale, grain=1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    const n = fbm(x*scale, y*scale)*0.55 + fbm(x*scale*2.3, y*scale*2.3)*0.3 + fbm(x*scale*7, y*scale*7)*0.15;
    const t = Math.min(1, Math.max(0, n * grain));
    const i = (y*size+x)*4;
    img.data[i]   = a[0] + (b[0]-a[0])*t;
    img.data[i+1] = a[1] + (b[1]-a[1])*t;
    img.data[i+2] = a[2] + (b[2]-a[2])*t;
    img.data[i+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function letterTex(ch, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,256,256);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.font = 'bold 180px Barlow Condensed, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(ch, 128, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const TEX = {
  sand: makeTex(256, [198,166,98], [128,102,52], 0.04),
  plaster: makeTex(256, [214,192,152], [168,142,102], 0.065, 1.15),
  wood: makeTex(128, [118,82,42], [72,48,24], 0.12),
  metal: makeTex(128, [78,82,86], [42,44,48], 0.2),
  dirt: makeTex(128, [92,70,42], [58,44,26], 0.1),
};
TEX.sand.repeat.set(22, 20);
TEX.plaster.repeat.set(6, 2.2);
TEX.wood.repeat.set(1.4, 1.4);

const MATS = {
  sand: new THREE.MeshStandardMaterial({ map: TEX.sand, roughness: 0.96, metalness: 0.02 }),
  adobe: new THREE.MeshStandardMaterial({ map: TEX.plaster, roughness: 0.88, metalness: 0.04 }),
  wood: new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.82, metalness: 0.05 }),
  metal: new THREE.MeshStandardMaterial({ map: TEX.metal, roughness: 0.42, metalness: 0.72 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.8, map: TEX.plaster }),
};

function makeSky() {
  const geo = new THREE.SphereGeometry(160, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      varying vec3 vP;
      void main(){
        float h = normalize(vP).y;
        vec3 horizon = vec3(0.78, 0.62, 0.42);
        vec3 zenith  = vec3(0.38, 0.62, 0.86);
        vec3 col = mix(horizon, zenith, smoothstep(-0.05, 0.62, h));
        col = mix(col, vec3(0.96,0.90,0.72), smoothstep(0.55, 1.0, h) * 0.22);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.name = 'sky';
  sky.raycast = () => {};
  return sky;
}

function addSunDisc() {
  const s = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff1c2 })
  );
  s.position.copy(sun.position).setLength(90);
  s.raycast = () => {};
  return s;
}

// ─── MAP ─────────────────────────────────────────────────────────────────────

function addCollider(x, z, w, d) {
  state.colliders.push({
    minx: x - w/2, maxx: x + w/2,
    minz: z - d/2, maxz: z + d/2,
  });
  state.walls2d.push({ x, z, w, d });
}

function wall(x, z, w, d, h=4.6, mat=MATS.adobe) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, h/2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mapGroup.add(mesh);
  addCollider(x, z, w, d);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.12, 0.12, d + 0.12),
    MATS.dark
  );
  cap.position.set(x, h + 0.04, z);
  cap.castShadow = true;
  mapGroup.add(cap);
  return mesh;
}

function crate(x, z, s=1.55, h=1.2) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(s, h, s), MATS.wood);
  mesh.position.set(x, h/2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.y = (x+z) * 0.15;
  mapGroup.add(mesh);
  const band = new THREE.Mesh(new THREE.BoxGeometry(s+0.04, 0.08, s+0.04), MATS.metal);
  band.position.set(x, h*0.35, z);
  mapGroup.add(band);
  addCollider(x, z, s, s);
}

function barrel(x, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 1.05, 12), MATS.metal);
  mesh.position.set(x, 0.53, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mapGroup.add(mesh);
  addCollider(x, z, 0.8, 0.8);
}

function palm(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.2, 4.4, 7),
    new THREE.MeshStandardMaterial({ color: 0x6a4a28, roughness: 0.9 })
  );
  trunk.position.set(x, 2.2, z);
  trunk.castShadow = true;
  mapGroup.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d6a32, roughness: 0.85 });
  for (let i=0;i<6;i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 1.8), leafMat);
    leaf.position.set(x, 4.3, z);
    leaf.rotation.y = i * Math.PI/3;
    leaf.rotation.x = 0.45;
    leaf.castShadow = true;
    mapGroup.add(leaf);
  }
}

function sitePad(site, x, z, r) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r-0.45, r, 40),
    new THREE.MeshBasicMaterial({
      color: site === 'A' ? 0x3d7eb8 : 0xc48a22,
      transparent: true, opacity: 0.42, side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI/2;
  ring.position.set(x, 0.025, z);
  mapGroup.add(ring);
  const letter = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({
      map: letterTex(site, site === 'A' ? '#5aa0d8' : '#e0a33a'),
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  letter.rotation.x = -Math.PI/2;
  letter.position.set(x, 0.03, z);
  mapGroup.add(letter);
}

function dirtPatch(x, z, w, d) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ map: TEX.dirt, roughness: 1, transparent: true, opacity: 0.55 })
  );
  m.rotation.x = -Math.PI/2;
  m.position.set(x, 0.02, z);
  mapGroup.add(m);
}

function buildMap() {
  while (mapGroup.children.length) {
    const c = mapGroup.children[0];
    mapGroup.remove(c);
    c.traverse(o => { o.geometry?.dispose(); });
  }
  state.colliders = [];
  state.walls2d = [];
  state._bombMesh = null;

  scene.background = new THREE.Color(0x7aa3c2);
  scene.fog = new THREE.Fog(0xc4b38a, 48, 125);
  mapGroup.add(makeSky());
  mapGroup.add(addSunDisc());

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(96, 86, 8, 8), MATS.sand);
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  mapGroup.add(floor);

  dirtPatch(0, 2, 18, 22);
  dirtPatch(26, -10, 14, 14);
  dirtPatch(-26, -8, 14, 14);
  dirtPatch(0, 26, 16, 10);

  wall(0, -36, 84, 2, 5.2);
  wall(0,  36, 84, 2, 5.2);
  wall(-42, 0, 2, 74, 5.2);
  wall( 42, 0, 2, 74, 5.2);

  wall(-10, -20, 12, 1.7, 4.5);
  wall( 10, -20, 12, 1.7, 4.5);
  wall(-10,  18, 12, 1.7, 4.5);
  wall( 10,  18, 12, 1.7, 4.5);

  wall(-16, -13, 1.7, 16, 4.5);
  wall(-16,  11, 1.7, 12, 4.5);
  wall(-36, 16, 10, 1.7, 4.5);
  wall(-18.5, 16, 5, 1.7, 4.5);

  wall(16, -13, 1.7, 16, 4.5);
  wall(16,  11, 1.7, 12, 4.5);
  wall(18.5, 16, 5, 1.7, 4.5);
  wall(36, 16, 10, 1.7, 4.5);

  wall(-5.5, 0, 1.35, 8, 3.4, MATS.dark);
  wall( 5.5, 0, 1.35, 8, 3.4, MATS.dark);

  crate(-26, -6); crate(-22, -11); crate(-29, -3);
  crate(26, -8); crate(22, -13); crate(30, -5);
  crate(0, 8, 1.8, 1.35); crate(-3.2, -8, 1.45, 1.05); crate(3.2, -8, 1.45, 1.05);
  crate(-26, 22, 1.4, 1); crate(26, 22, 1.4, 1);
  barrel(-24, -3.5); barrel(24, -5.5); barrel(1.8, 6.4); barrel(-28, 20);

  palm(-38, 32); palm(38, 32); palm(-38, -32); palm(38, -32);
  palm(-20, 34); palm(20, -34);

  sitePad('A', SITES.A.x, SITES.A.z, SITES.A.r);
  sitePad('B', SITES.B.x, SITES.B.z, SITES.B.r);

  const tPad = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshBasicMaterial({ color:0xc98c28, transparent:true, opacity:0.07, side:THREE.DoubleSide }));
  tPad.rotation.x = -Math.PI/2; tPad.position.set(0, 0.021, 26); mapGroup.add(tPad);
  const ctPad = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshBasicMaterial({ color:0x4f8ec9, transparent:true, opacity:0.07, side:THREE.DoubleSide }));
  ctPad.rotation.x = -Math.PI/2; ctPad.position.set(0, 0.021, -26); mapGroup.add(ctPad);
}

function collides(x, z) {
  const r = RADIUS;
  for (const c of state.colliders) {
    if (x + r > c.minx && x - r < c.maxx && z + r > c.minz && z - r < c.maxz) return true;
  }
  return Math.abs(x) > 41 || Math.abs(z) > 35;
}

function inSite(x, z) {
  for (const [name, s] of Object.entries(SITES)) {
    if (Math.hypot(x - s.x, z - s.z) < s.r) return name;
  }
  return null;
}

function nearestWp(x, z) {
  let best = 'mid', bd = 1e9;
  for (const [id, w] of Object.entries(WAYPOINTS)) {
    const d = Math.hypot(x - w.x, z - w.z);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

function astar(fromId, toId) {
  if (fromId === toId) return [fromId];
  const open = [fromId];
  const prev = {};
  const g = { [fromId]: 0 };
  const seen = new Set();
  while (open.length) {
    open.sort((a,b) => (g[a]??1e9) - (g[b]??1e9));
    const cur = open.shift();
    if (cur === toId) break;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const n of WAYPOINTS[cur].links) {
      const step = Math.hypot(WAYPOINTS[n].x - WAYPOINTS[cur].x, WAYPOINTS[n].z - WAYPOINTS[cur].z);
      const ng = (g[cur]??1e9) + step;
      if (ng < (g[n]??1e9)) { g[n] = ng; prev[n] = cur; open.push(n); }
    }
  }
  if (!(toId in prev) && fromId !== toId) return [fromId, toId];
  const path = [toId];
  while (path[0] !== fromId) path.unshift(prev[path[0]] || fromId);
  return path;
}

// ─── GUNS / BOTS ─────────────────────────────────────────────────────────────

function makeGun(id, scale=1, basic=false) {
  const g = new THREE.Group();
  const M = (c, metal=0.65, rough=0.32) => basic
    ? new THREE.MeshBasicMaterial({ color:c })
    : new THREE.MeshStandardMaterial({ color:c, metalness:metal, roughness:rough });
  const steel = M(0x3a3e42, 0.82, 0.28);
  const dark = M(0x1c1e20, 0.55, 0.4);
  const wood = M(0x5c3a1e, 0.08, 0.72);
  const poly = M(0x2a2d30, 0.25, 0.5);
  const add = (geo, mat, x,y,z, rx=0, ry=0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x*scale, y*scale, z*scale);
    m.rotation.set(rx, ry, 0);
    m.castShadow = !basic;
    g.add(m); return m;
  };
  if (id==='kr47') {
    add(new THREE.BoxGeometry(0.065,0.09,0.42), wood, 0,0,-0.08);
    add(new THREE.CylinderGeometry(0.016,0.014,0.55,8), steel, 0,0.028,-0.48, Math.PI/2);
    add(new THREE.BoxGeometry(0.05,0.16,0.065), wood, 0,-0.11,-0.01, 0.18);
    add(new THREE.BoxGeometry(0.04,0.11,0.05), dark, 0,-0.08,-0.16);
    add(new THREE.BoxGeometry(0.03,0.04,0.12), dark, 0,0.06,-0.02);
  } else if (id==='m4c') {
    add(new THREE.BoxGeometry(0.06,0.08,0.4), poly, 0,0,-0.08);
    add(new THREE.CylinderGeometry(0.014,0.013,0.52,8), steel, 0,0.025,-0.46, Math.PI/2);
    add(new THREE.BoxGeometry(0.042,0.14,0.055), dark, 0,-0.1,-0.02, 0.12);
    add(new THREE.BoxGeometry(0.038,0.1,0.045), dark, 0,-0.08,-0.14);
    add(new THREE.BoxGeometry(0.04,0.035,0.16), steel, 0,0.055,-0.04);
    add(new THREE.BoxGeometry(0.05,0.07,0.08), poly, 0,0.02,0.14);
  } else if (id==='smg') {
    add(new THREE.BoxGeometry(0.05,0.075,0.28), poly, 0,0,-0.04);
    add(new THREE.CylinderGeometry(0.013,0.012,0.26,8), steel, 0,0.025,-0.24, Math.PI/2);
    add(new THREE.BoxGeometry(0.038,0.12,0.05), dark, 0,-0.09,0.02, 0.15);
  } else if (id==='shotgun') {
    add(new THREE.BoxGeometry(0.06,0.07,0.38), wood, 0,0,-0.06);
    add(new THREE.CylinderGeometry(0.026,0.022,0.5,8), steel, 0,0.025,-0.4, Math.PI/2);
    add(new THREE.BoxGeometry(0.04,0.12,0.05), wood, 0,-0.09,0.04, 0.2);
  } else if (id==='scout' || id==='dmr') {
    add(new THREE.BoxGeometry(0.05,0.07,0.52), dark, 0,0,-0.08);
    add(new THREE.CylinderGeometry(0.012,0.01,0.72,8), steel, 0,0.022,-0.52, Math.PI/2);
    add(new THREE.CylinderGeometry(0.026,0.026,0.16,10), steel, 0,0.085,-0.02, Math.PI/2);
    add(new THREE.BoxGeometry(0.04,0.13,0.05), poly, 0,-0.1,0.04, 0.12);
    add(new THREE.BoxGeometry(0.035,0.08,0.04), dark, 0,-0.07,-0.18);
  } else if (id==='deagle') {
    add(new THREE.BoxGeometry(0.05,0.075,0.15), steel, 0,0.01,0);
    add(new THREE.CylinderGeometry(0.015,0.014,0.2,8), steel, 0,0.035,-0.15, Math.PI/2);
    add(new THREE.BoxGeometry(0.038,0.12,0.048), dark, 0,-0.085,0.04, 0.22);
  } else if (id==='knife') {
    add(new THREE.BoxGeometry(0.028,0.038,0.1), dark, 0,-0.015,0.02);
    add(new THREE.BoxGeometry(0.01,0.042,0.22), M(0xc5c9d0, 0.9, 0.18), 0,0.005,-0.12);
  } else if (WEAPONS[id]?.nade) {
    add(new THREE.SphereGeometry(0.048,10,8), M(id==='smoke'?0x6a7a62:id==='flash'?0xc8c48a:0x3d4a28, 0.3, 0.5), 0,0,-0.04);
    add(new THREE.CylinderGeometry(0.012,0.012,0.04,6), steel, 0,0.05,-0.04);
  } else if (id==='bomb') {
    add(new THREE.BoxGeometry(0.14,0.07,0.2), M(0x2c2c22, 0.4, 0.55), 0,0,-0.03);
    add(new THREE.BoxGeometry(0.06,0.03,0.08), M(0x8a2018, 0.2, 0.4), 0,0.04,0.02);
  } else {
    add(new THREE.BoxGeometry(0.046,0.08,0.15), poly, 0,0.005,-0.01);
    add(new THREE.CylinderGeometry(0.012,0.012,0.14,8), steel, 0,0.028,-0.13, Math.PI/2);
    add(new THREE.BoxGeometry(0.036,0.11,0.042), dark, 0,-0.085,0.04, 0.2);
  }
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18*scale, 0.18*scale),
    new THREE.MeshBasicMaterial({ color:0xffe08a, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide })
  );
  flash.name = 'flash';
  flash.position.set(0, 0.03*scale, id==='scout'||id==='dmr' ? -0.85*scale : -0.58*scale);
  g.add(flash);
  const flash2 = flash.clone();
  flash2.rotation.y = Math.PI/2;
  flash2.name = 'flash2';
  g.add(flash2);
  return g;
}

function buildViewModel() {
  viewModel.clear();
  viewModel.add(vmLight);
  const w = currentWeapon();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc4a07a, roughness: 0.7 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.8 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.65 });

  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.22), sleeve);
  upper.position.set(0.17, -0.16, 0.02);
  viewModel.add(upper);
  armR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.075, 0.16), skin);
  armR.position.set(0.18, -0.15, -0.12);
  viewModel.add(armR);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.065, 0.08), glove);
  hand.position.set(0.2, -0.14, -0.22);
  viewModel.add(hand);

  gunMesh = makeGun(w?.id || 'p9', w?.melee ? 1.05 : 1.32, true);
  gunMesh.position.set(0.2, -0.12, -0.18);
  gunMesh.rotation.set(-0.04, -0.05, 0.04);
  viewModel.add(gunMesh);
  muzzleFlash = gunMesh.getObjectByName('flash');
  viewModel.position.set(0.34, -0.28, -0.5);
  viewModel.traverse(c => { if (c.isMesh) { c.renderOrder = 999; c.frustumCulled = false; } });
}

function makeBotMesh(team, gunId) {
  const g = new THREE.Group();
  const vest = team === TEAM.T ? 0xb8862a : 0x3d6a94;
  const pants = team === TEAM.T ? 0x4a3a28 : 0x2a3340;
  const skin = new THREE.MeshStandardMaterial({ color: 0xcbb08a, roughness: 0.7 });
  const vestM = new THREE.MeshStandardMaterial({ color: vest, roughness: 0.55, metalness: 0.12 });
  const pantsM = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 });
  const bootM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
  const helmM = new THREE.MeshStandardMaterial({ color: team===TEAM.T ? 0x6a5428 : 0x2c3a48, roughness: 0.45, metalness: 0.25 });

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.22), pantsM);
  hips.position.y = 0.78; hips.castShadow = true; g.add(hips);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.72, 0.22), pantsM);
  legs.position.y = 0.4; legs.castShadow = true; legs.name = 'legs'; g.add(legs);
  const boots = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.28), bootM);
  boots.position.y = 0.07; boots.castShadow = true; g.add(boots);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.26), vestM);
  body.position.y = 1.12; body.castShadow = true; body.name = 'body'; g.add(body);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), vestM);
  armL.position.set(-0.28, 1.05, 0.02); armL.castShadow = true; g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), vestM);
  armR.position.set(0.28, 1.05, 0.08); armR.rotation.x = -0.4; armR.castShadow = true; g.add(armR);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skin);
  neck.position.y = 1.46; g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), skin);
  head.position.y = 1.62; head.castShadow = true; head.name = 'head'; g.add(head);
  const helm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.26), helmM);
  helm.position.set(0, 1.72, 0.01); helm.castShadow = true; g.add(helm);

  const gun = makeGun(gunId || 'kr47', 0.72);
  gun.position.set(0.26, 1.05, 0.28);
  gun.rotation.set(-0.15, Math.PI, 0);
  g.add(gun);
  return g;
}

function currentWeapon() {
  const id = state.inv[state.slot];
  return WEAPONS[id] || WEAPONS.knife;
}

function defaultPistol(side) { return side === TEAM.T ? 'g18' : 'p9'; }

// ─── MATCH / ROUNDS ──────────────────────────────────────────────────────────

function startMatch() {
  audio();
  state.screen = 'match';
  state.scoreT = 0; state.scoreCT = 0;
  state.round = 0;
  state.money = 800;
  state.kills = 0; state.deaths = 0;
  state.lossT = 0; state.lossCT = 0;
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  buildMap();
  startRound();
}

function startRound() {
  state.round++;
  state.phase = 'buy';
  state.time = BUY_TIME;
  state.bombPlanted = false;
  state.bombTime = 0;
  state.bombPos = null;
  state.bombSite = null;
  state.plantedBy = null;
  state.dead = false;
  state.health = 100;
  state.reloading = false;
  state.channel = null;
  state.smokes = [];
  state.nades = [];
  state.tracers = [];
  while (fxGroup.children.length) fxGroup.remove(fxGroup.children[0]);
  if (state._bombMesh) state._bombMesh.visible = false;
  state.planSite = Math.random() < 0.5 ? 'A' : 'B';
  state.showBuy = true;
  document.getElementById('buy-menu').classList.remove('hidden');
  document.getElementById('bomb-icon').classList.add('hidden');
  document.getElementById('spec-overlay').classList.add('hidden');
  document.getElementById('round-banner').classList.add('hidden');

  if (state.round === 1 || state.round === 9) {
    state.money = 800;
    state.armor = 0; state.helmet = false; state.kit = false;
    state.inv.primary = null;
    state.inv.nade = null;
    state.inv.pistol = defaultPistol(state.side);
  }

  state.inv.melee = 'knife';
  state.inv.bomb = state.side === TEAM.T ? 'bomb' : null;
  state.slot = state.inv.primary ? 'primary' : 'pistol';
  initAmmo();

  const sp = SPAWNS[state.side][0];
  player.x = sp.x; player.z = sp.z; player.y = 0; player.velY = 0; player.vx = 0; player.vz = 0; player.onGround = true;
  player.yaw = state.side === TEAM.T ? 0 : Math.PI;
  player.pitch = 0;
  camera.rotation.z = 0;
  state.bombCarrier = state.side === TEAM.T ? 'player' : null;

  spawnBots();
  buildViewModel();
  fillBuyMenu();
  updateHUD();
  showBanner('ROUND ' + state.round, 'BUY PHASE — PRESS B', '');
}

function spawnBots() {
  clearBots();
  const diff = DIFFICULTY[state.difficulty];
  const myTeam = state.side;
  const enemy = myTeam === TEAM.T ? TEAM.CT : TEAM.T;
  const allyNames = myTeam === TEAM.T ? T_NAMES : CT_NAMES;
  const enemyNames = enemy === TEAM.T ? T_NAMES.concat(['VOLT']) : CT_NAMES.concat(['PIKE']);
  const pistolRound = state.round === 1 || state.round === 9;

  for (let i=0;i<4;i++) addBot(myTeam, allyNames[i], SPAWNS[myTeam][i+1], diff, true, pistolRound);
  for (let i=0;i<5;i++) addBot(enemy, enemyNames[i], SPAWNS[enemy][i], diff, false, pistolRound);

  if (state.side === TEAM.CT) {
    const carriers = state.bots.filter(b => b.team === TEAM.T);
    if (carriers.length) {
      const c = carriers[Math.floor(Math.random()*carriers.length)];
      c.hasBomb = true;
      state.bombCarrier = c;
    }
  }
}

function addBot(team, name, spawn, diff, ally, pistolRound) {
  const rifle = pistolRound ? (team === TEAM.T ? 'g18' : 'p9') : (team === TEAM.T ? 'kr47' : 'm4c');
  const mesh = makeBotMesh(team, rifle);
  mesh.position.set(spawn.x, 0, spawn.z);
  botGroup.add(mesh);
  const goal = team === TEAM.T ? (state.planSite === 'A' ? 'asite' : 'bsite')
    : (['asite','bsite','mid','asite','bsite'][state.bots.filter(b=>b.team===TEAM.CT).length] || 'mid');
  state.bots.push({
    mesh, name, team, ally, alive:true,
    health: diff.hp, armor: 50, helmet:true,
    x: spawn.x, z: spawn.z,
    kills:0, deaths:0, assists:0, money: 800 + (state.round>1?0:0),
    lastShot:0, path:[], goal, strafe: Math.random()<0.5?1:-1, strafeT:0,
    hasBomb: false, gun: rifle, diff, plantT:0, defuseT:0,
  });
}

function clearBots() {
  state.bots.forEach(b => { botGroup.remove(b.mesh); b.mesh.traverse(o=>{ o.geometry?.dispose(); }); });
  state.bots = [];
}

function initAmmo() {
  state.ammo = {};
  for (const w of Object.values(WEAPONS)) state.ammo[w.id] = { cur:w.mag, res:w.res };
}

function endRound(winner, reason) {
  if (state.phase === 'end') return;
  state.phase = 'end';
  state.channel = null;
  state.showBuy = false;
  document.getElementById('buy-menu').classList.add('hidden');
  if (winner === TEAM.T) { state.scoreT++; state.lossT = 0; state.lossCT = Math.min(4, state.lossCT+1); }
  else { state.scoreCT++; state.lossCT = 0; state.lossT = Math.min(4, state.lossT+1); }

  const playerWon = winner === state.side;
  const lossPay = [1400,1900,2400,2900,3400];
  if (playerWon) state.money = Math.min(16000, state.money + 3250 + (state.plantedBy==='player'&&winner===TEAM.T?300:0));
  else state.money = Math.min(16000, state.money + lossPay[state.side===TEAM.T?state.lossT:state.lossCT] + (state.side===TEAM.T && state.bombPlanted ? 800 : 0));

  if (playerWon) sfx.win(); else sfx.lose();
  showBanner(playerWon ? 'ROUND WON' : 'ROUND LOST', reason, playerWon ? 'win' : 'lose');

  const matchOver = state.scoreT >= WIN_ROUNDS || state.scoreCT >= WIN_ROUNDS;
  setTimeout(() => {
    if (matchOver) {
      const won = (state.side===TEAM.T ? state.scoreT : state.scoreCT) >= WIN_ROUNDS;
      showBanner(won ? 'MATCH WON' : 'MATCH LOST', `${state.scoreT} - ${state.scoreCT}`, won?'win':'lose');
      setTimeout(returnToMenu, 3500);
    } else startRound();
  }, 3800);
}

function returnToMenu() {
  state.screen = 'menu';
  state.phase = 'idle';
  clearBots();
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('menu').classList.remove('hidden');
  document.getElementById('buy-menu').classList.add('hidden');
  document.getElementById('scoreboard').classList.add('hidden');
  document.exitPointerLock?.();
}

function checkRoundState() {
  if (state.phase !== 'live' && state.phase !== 'bomb') return;
  const tAlive = (state.side===TEAM.T && !state.dead ? 1 : 0) + state.bots.filter(b=>b.team===TEAM.T && b.alive).length;
  const ctAlive = (state.side===TEAM.CT && !state.dead ? 1 : 0) + state.bots.filter(b=>b.team===TEAM.CT && b.alive).length;
  if (ctAlive === 0) { endRound(TEAM.T, 'DEFENDERS ELIMINATED'); return; }
  if (tAlive === 0 && !state.bombPlanted) { endRound(TEAM.CT, 'ATTACKERS ELIMINATED'); return; }
}

// ─── COMBAT ──────────────────────────────────────────────────────────────────

function shoot() {
  const w = currentWeapon();
  if (!w || state.dead || state.phase==='end' || state.reloading) return;
  if (state.phase==='buy') return;
  const now = performance.now();
  if (now - state.lastShot < w.rate) return;
  if (w.bomb) return;
  if (w.nade) { throwNade(w.nade); consumeNade(); state.lastShot = now; return; }
  if (w.melee) { melee(); state.lastShot = now; return; }
  const a = state.ammo[w.id];
  if (!a || a.cur <= 0) { if (a?.res>0) reload(); return; }
  a.cur--;
  state.lastShot = now;
  state.recoil = Math.min(0.14, state.recoil + w.recoil);
  state.kick = 1;
  player.pitch = Math.max(-1.2, player.pitch - w.recoil * 0.85);
  player.yaw += (Math.random()-0.5) * w.recoil * 1.1;
  flashMuzzle();
  if (w.scope) sfx.sniper(); else sfx.shoot();

  const spd = Math.hypot(player.vx, player.vz);
  const spread = (state.aiming ? w.ads : w.spread)
    + (spd / WALK) * 0.038
    + (!player.onGround ? 0.055 : 0)
    + (state.crouch ? -0.008 : 0)
    + state.recoil * 0.45;
  const pellets = w.pellets || 1;
  let hit = false, head = false;
  for (let i=0;i<pellets;i++) {
    camera.getWorldDirection(_v);
    _v.x += (Math.random()-0.5)*spread;
    _v.y += (Math.random()-0.5)*spread*0.65;
    _v.z += (Math.random()-0.5)*spread;
    _v.normalize();
    raycaster.set(camera.position, _v);
    raycaster.far = 140;
    const botHits = raycaster.intersectObjects(botGroup.children, true);
    const worldHits = raycaster.intersectObjects(mapGroup.children, true);
    const botHit = botHits[0];
    const worldHit = worldHits[0];
    const botFirst = botHit && (!worldHit || botHit.distance < worldHit.distance - 0.05);
    if (botFirst) {
      const bot = findBot(botHit.object);
      addTracer(camera.position.clone(), _v, botHit.distance);
      if (!bot || !bot.alive || bot.ally) continue;
      const isHead = botHit.object.name === 'head';
      const falloff = Math.max(0.55, 1 - botHit.distance / 90);
      damageBot(bot, w.dmg * falloff, isHead);
      addBlood(botHit.point);
      hit = true; if (isHead) head = true;
    } else if (worldHit) {
      addTracer(camera.position.clone(), _v, worldHit.distance);
      addBulletHole(worldHit.point, worldHit.face?.normal, worldHit.object);
      if (Math.random() < 0.35) sfx.ricochet();
    } else {
      addTracer(camera.position.clone(), _v, 48);
    }
  }
  if (hit) { sfx.hit(); flashHit(head); }
  updateHUD();
}

function flashMuzzle() {
  const flashes = [];
  if (muzzleFlash) flashes.push(muzzleFlash);
  const f2 = gunMesh?.getObjectByName('flash2');
  if (f2) flashes.push(f2);
  flashes.forEach(f => { f.material.opacity = 0.95; });
  setTimeout(() => flashes.forEach(f => { if (f.material) f.material.opacity = 0; }), 38);
}

function addBulletHole(point, normal, obj) {
  const n = (normal || new THREE.Vector3(0,1,0)).clone();
  if (obj) n.transformDirection(obj.matrixWorld);
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.045 + Math.random()*0.02, 8),
    new THREE.MeshBasicMaterial({ color: 0x1a140c, transparent:true, opacity:0.85, depthWrite:false })
  );
  m.position.copy(point).add(n.multiplyScalar(0.012));
  m.lookAt(point.clone().add(n));
  fxGroup.add(m);
  state.impacts.push({ mesh:m, t:12 });
}

function addBlood(point) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 5, 5),
    new THREE.MeshBasicMaterial({ color: 0x7a1010, transparent:true, opacity:0.85 })
  );
  m.position.copy(point);
  fxGroup.add(m);
  state.impacts.push({ mesh:m, t:0.35, blood:true });
}

function melee() {
  camera.getWorldDirection(_v);
  raycaster.set(camera.position, _v); raycaster.far = 2.2;
  const hits = raycaster.intersectObjects(botGroup.children, true);
  if (!hits.length) return;
  const bot = findBot(hits[0].object);
  if (bot && bot.alive && !bot.ally) damageBot(bot, 65, false);
}

function findBot(obj) {
  let n = obj;
  while (n) {
    const bot = state.bots.find(b => b.mesh === n);
    if (bot) return bot;
    n = n.parent;
  }
  return null;
}

function damageBot(bot, raw, head, killer=null) {
  if (!bot.alive) return;
  let dmg = head ? raw * 3.6 : raw;
  if (bot.armor > 0 && !head) { dmg *= 0.55; bot.armor = Math.max(0, bot.armor - raw*0.4); }
  else if (bot.helmet && head) dmg *= 0.72;
  bot.health -= dmg;
  const body = bot.mesh.getObjectByName('body');
  if (body) { body.material.emissive = new THREE.Color(0xffffff); body.material.emissiveIntensity = 0.7; setTimeout(()=>{ if(body.material) body.material.emissiveIntensity=0; }, 50); }
  if (bot.health <= 0) killBot(bot, head, killer);
}

function killBot(bot, head, killer=null) {
  bot.alive = false; bot.deaths++; bot.deadT = 0;
  sfx.body();
  if (killer) killer.kills++;
  if (!bot.ally && !killer) {
    state.kills++;
    state.money = Math.min(16000, state.money + 300);
    addFeed('YOU', bot.name, state.side, bot.team, head);
    showKill(head);
  } else if (killer) {
    addFeed(killer.name, bot.name, killer.team, bot.team, head);
  } else {
    addFeed('ENEMY', bot.name, bot.team===TEAM.T?TEAM.CT:TEAM.T, bot.team, false);
  }
  if (bot.hasBomb) dropBomb(bot.x, bot.z);
  updateHUD();
  checkRoundState();
}

function damagePlayer(amt, src) {
  if (state.dead || state.phase==='buy') return;
  let dmg = amt;
  if (state.armor > 0) { dmg *= 0.55; state.armor = Math.max(0, state.armor - amt*0.45); }
  state.health = Math.max(0, state.health - dmg);
  document.getElementById('damage-vignette').classList.add('show');
  setTimeout(()=>document.getElementById('damage-vignette').classList.remove('show'), 120);
  updateHUD();
  if (state.health <= 0) {
    state.dead = true;
    state.deaths++;
    document.getElementById('spec-overlay').classList.remove('hidden');
    if (src) { src.kills++; addFeed(src.name, 'YOU', src.team, state.side, false); }
    if (state.bombCarrier === 'player') dropBomb(player.x, player.z);
    checkRoundState();
  }
}

function dropBomb(x, z) {
  state.bombCarrier = null;
  state.inv.bomb = null;
  if (state.slot === 'bomb') state.slot = state.inv.primary ? 'primary' : 'pistol';
  state.bombPos = { x, z, y: 0.12 };
  if (!state._bombMesh) {
    state._bombMesh = makeGun('bomb', 1.6);
    mapGroup.add(state._bombMesh);
  }
  state._bombMesh.visible = true;
  state._bombMesh.position.set(x, 0.12, z);
  buildViewModel();
}

function pickupBomb() {
  if (state.side !== TEAM.T || state.dead || !state.bombPos || state.bombPlanted) return;
  if (Math.hypot(player.x - state.bombPos.x, player.z - state.bombPos.z) > 1.6) return;
  state.inv.bomb = 'bomb';
  state.bombCarrier = 'player';
  state.bombPos = null;
  if (state._bombMesh) state._bombMesh.visible = false;
  buildViewModel();
}

function plantBomb() {
  const site = inSite(player.x, player.z);
  if (!site || state.inv.bomb !== 'bomb' || state.dead) return;
  state.bombPlanted = true;
  state.bombSite = site;
  state.bombTime = BOMB_TIME;
  state.phase = 'bomb';
  state.plantedBy = 'player';
  state.inv.bomb = null;
  state.bombCarrier = null;
  state.bombPos = { x: player.x, z: player.z };
  state.slot = state.inv.primary ? 'primary' : 'pistol';
  if (!state._bombMesh) { state._bombMesh = makeGun('bomb', 1.8); mapGroup.add(state._bombMesh); }
  state._bombMesh.visible = true;
  state._bombMesh.position.set(player.x, 0.12, player.z);
  document.getElementById('bomb-icon').classList.remove('hidden');
  sfx.plant();
  buildViewModel();
}

function botPlant(bot, site) {
  if (state.bombPlanted) return;
  state.bombPlanted = true;
  state.bombSite = site;
  state.bombTime = BOMB_TIME;
  state.phase = 'bomb';
  state.plantedBy = bot.name;
  bot.hasBomb = false;
  state.bombCarrier = null;
  state.bombPos = { x: bot.x, z: bot.z };
  if (!state._bombMesh) { state._bombMesh = makeGun('bomb', 1.8); mapGroup.add(state._bombMesh); }
  state._bombMesh.visible = true;
  state._bombMesh.position.set(bot.x, 0.12, bot.z);
  document.getElementById('bomb-icon').classList.remove('hidden');
  sfx.plant();
}

function defuseBomb() {
  if (!state.bombPlanted) return;
  state.bombPlanted = false;
  if (state._bombMesh) state._bombMesh.visible = false;
  document.getElementById('bomb-icon').classList.add('hidden');
  endRound(TEAM.CT, 'CHARGE DEFUSED');
}

function explodeBomb() {
  sfx.explode();
  if (state._bombMesh) state._bombMesh.visible = false;
  document.getElementById('bomb-icon').classList.add('hidden');
  if (state.bombPos && Math.hypot(player.x-state.bombPos.x, player.z-state.bombPos.z) < 18) damagePlayer(200, null);
  endRound(TEAM.T, 'CHARGE DETONATED');
}

function throwNade(kind) {
  camera.getWorldDirection(_v);
  const pos = camera.position.clone().add(_v.clone().multiplyScalar(1.2));
  const vel = _v.multiplyScalar(14); vel.y += 5;
  const color = kind==='smoke'?0x778877:kind==='flash'?0xeeeecc:0x556633;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8), new THREE.MeshStandardMaterial({ color }));
  mesh.position.copy(pos);
  fxGroup.add(mesh);
  state.nades.push({ mesh, vel, t:0, kind, exploded:false });
}

function consumeNade() {
  state.inv.nade = null;
  if (state.slot === 'nade') state.slot = state.inv.primary ? 'primary' : 'pistol';
  buildViewModel();
}

function updateNades(dt) {
  for (let i=state.nades.length-1;i>=0;i--) {
    const n = state.nades[i];
    n.t += dt;
    n.vel.y -= GRAV * dt;
    n.mesh.position.add(n.vel.clone().multiplyScalar(dt));
    if (n.mesh.position.y < 0.1) { n.mesh.position.y = 0.1; n.vel.y *= -0.2; n.vel.x *= 0.6; n.vel.z *= 0.6; }
    if (n.t > 1.35 && !n.exploded) {
      n.exploded = true;
      const p = n.mesh.position;
      if (n.kind === 'he') {
        state.bots.filter(b=>b.alive && !b.ally).forEach(b => {
          const d = Math.hypot(b.x-p.x, b.z-p.z);
          if (d < 6.5) damageBot(b, 98*(1-d/6.5), false);
        });
        if (Math.hypot(player.x-p.x, player.z-p.z) < 6.5) damagePlayer(55, null);
        sfx.explode();
      } else if (n.kind === 'flash') {
        camera.getWorldDirection(_v);
        _v2.set(p.x, p.y, p.z).sub(camera.position).normalize();
        if (_v.dot(_v2) > 0.15 && camera.position.distanceTo(p) < 22) {
          const el = document.getElementById('flash-overlay');
          el.style.opacity = '1';
          setTimeout(()=>{ el.style.transition='opacity 1.6s'; el.style.opacity='0'; setTimeout(()=>{ el.style.transition='opacity 0.15s'; }, 1600); }, 180);
        }
      } else if (n.kind === 'smoke') {
        const s = new THREE.Mesh(
          new THREE.SphereGeometry(4.4, 14, 12),
          new THREE.MeshStandardMaterial({ color:0x9aa392, transparent:true, opacity:0.5, depthWrite:false })
        );
        s.position.copy(p); s.position.y = 1.5;
        fxGroup.add(s);
        state.smokes.push({ mesh:s, t:15, x:p.x, z:p.z });
      }
      fxGroup.remove(n.mesh);
      state.nades.splice(i,1);
    }
  }
  for (let i=state.smokes.length-1;i>=0;i--) {
    state.smokes[i].t -= dt;
    state.smokes[i].mesh.material.opacity = Math.min(0.55, state.smokes[i].t/6);
    if (state.smokes[i].t <= 0) { fxGroup.remove(state.smokes[i].mesh); state.smokes.splice(i,1); }
  }
}

function addTracer(origin, dir, dist) {
  const start = origin.clone().add(dir.clone().multiplyScalar(0.6));
  const g = new THREE.BufferGeometry().setFromPoints([start, origin.clone().add(dir.clone().multiplyScalar(Math.min(dist, 55)))]);
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color:0xffc266, transparent:true, opacity:0.45 }));
  fxGroup.add(line);
  state.tracers.push({ mesh:line, t:0.05 });
}

function losBlocked(ax, az, bx, bz) {
  const dx = bx-ax, dz = bz-az, len = Math.hypot(dx,dz);
  if (len < 0.2) return false;
  const steps = Math.ceil(len / 0.6);
  for (let i=1;i<steps;i++) {
    const x = ax + dx * i/steps, z = az + dz * i/steps;
    if (collides(x, z)) return true;
    if (state.smokes.some(s => Math.hypot(x-s.x, z-s.z) < 4.2)) return true;
  }
  return false;
}

function reload() {
  const w = currentWeapon();
  const a = state.ammo[w?.id];
  if (!w || w.melee || w.nade || w.bomb || state.reloading || !a || a.cur>=w.mag || a.res<=0) return;
  state.reloading = true;
  setTimeout(() => {
    const need = w.mag - a.cur, take = Math.min(need, a.res);
    a.cur += take; a.res -= take; state.reloading = false; updateHUD();
  }, 1400);
}

function buy(id) {
  if (state.phase !== 'buy' || state.dead) return;
  if (id === 'kevlar') {
    if (state.money < 1000 || state.armor>=100) return;
    state.money -= 1000; state.armor = 100; sfx.buy(); updateHUD(); fillBuyMenu(); return;
  }
  if (id === 'helmet') {
    if (state.money < 1600) return;
    state.money -= 1600; state.armor = 100; state.helmet = true; sfx.buy(); updateHUD(); fillBuyMenu(); return;
  }
  if (id === 'kit') {
    if (state.side!==TEAM.CT || state.money<400 || state.kit) return;
    state.money -= 400; state.kit = true; sfx.buy(); updateHUD(); fillBuyMenu(); return;
  }
  const w = WEAPONS[id];
  if (!w || w.price<=0 || state.money < w.price) return;
  state.money -= w.price;
  if (w.slot === 'primary') { state.inv.primary = id; state.slot = 'primary'; }
  else if (w.slot === 'pistol') { state.inv.pistol = id; state.slot = 'pistol'; }
  else if (w.slot === 'nade') { state.inv.nade = id; }
  initAmmo();
  buildViewModel();
  sfx.buy();
  updateHUD();
  fillBuyMenu();
}

function fillBuyMenu() {
  const grid = document.getElementById('buy-grid');
  const items = [];
  items.push({ id:'kevlar', name:'KEVLAR', price:1000 });
  items.push({ id:'helmet', name:'KEVLAR + HELMET', price:1600 });
  if (state.side === TEAM.CT) items.push({ id:'kit', name:'DEFUSE KIT', price:400 });
  const rifles = state.side===TEAM.T ? ['kr47','smg','shotgun','scout','deagle'] : ['m4c','smg','shotgun','dmr','deagle'];
  rifles.forEach(id => items.push({ id, name: WEAPONS[id].name, price: WEAPONS[id].price }));
  ['he','flash','smoke'].forEach(id => items.push({ id, name: WEAPONS[id].name, price: WEAPONS[id].price }));
  grid.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button');
    b.className = 'buy-item' + (state.money < it.price ? ' disabled' : '');
    b.innerHTML = `<span class="nm">${it.name}</span><span class="pr">$${it.price}</span>`;
    b.onclick = () => buy(it.id);
    grid.appendChild(b);
  });
  document.getElementById('buy-money').textContent = '$'+state.money;
}

// ─── BOT AI ──────────────────────────────────────────────────────────────────

function updateBots(dt) {
  if (state.phase === 'buy' || state.phase === 'end') return;
  const diff = DIFFICULTY[state.difficulty];
  for (const bot of state.bots) {
    if (!bot.alive) {
      bot.deadT = (bot.deadT || 0) + dt;
      bot.mesh.rotation.x = Math.min(1.42, bot.deadT * 3.4);
      bot.mesh.position.y = Math.max(0.04, 0.32 - bot.deadT * 0.45);
      continue;
    }
    const enemies = livingEnemies(bot);
    const vis = enemies.find(e => !losBlocked(bot.x, bot.z, e.x, e.z) && Math.hypot(bot.x-e.x, bot.z-e.z) < 42);
    if (vis) {
      bot.mesh.lookAt(vis.x, 1.2, vis.z);
      bot.strafeT -= dt;
      if (bot.strafeT <= 0) { bot.strafeT = 0.4+Math.random(); bot.strafe *= -1; }
      const ang = Math.atan2(vis.x-bot.x, vis.z-bot.z);
      const sx = Math.cos(ang)*bot.strafe, sz = -Math.sin(ang)*bot.strafe;
      tryMoveBot(bot, sx * diff.spd * 0.7 * dt, sz * diff.spd * 0.7 * dt);
      const now = performance.now();
      if (now - bot.lastShot > diff.rate) {
        bot.lastShot = now;
        const dist = Math.hypot(bot.x-player.x, bot.z-player.z);
        sfx.shoot(Math.max(0.025, 0.12 / (1 + dist * 0.08)));
        if (Math.random() < diff.acc + 0.1) {
          const pistolRound = state.round === 1 || state.round === 9;
          const dmg = pistolRound ? Math.round(diff.dmg * 0.65) : diff.dmg;
          if (vis.isPlayer) damagePlayer(dmg, bot);
          else damageBot(vis, dmg, Math.random()<0.12, bot);
        }
      }
      continue;
    }

    if (bot.team === TEAM.T && bot.hasBomb) {
      const site = inSite(bot.x, bot.z);
      if (site && !state.bombPlanted) {
        bot.plantT += dt;
        if (bot.plantT >= PLANT_T) botPlant(bot, site);
        continue;
      }
      bot.plantT = 0;
      bot.goal = state.planSite === 'A' ? 'asite' : 'bsite';
    } else if (bot.team === TEAM.CT && state.bombPlanted && state.bombPos) {
      const d = Math.hypot(bot.x-state.bombPos.x, bot.z-state.bombPos.z);
      if (d < 1.4) {
        bot.defuseT += dt;
        if (bot.defuseT >= DEFUSE_KIT) defuseBomb();
        continue;
      }
      bot.defuseT = 0;
      bot.goal = state.bombSite === 'A' ? 'asite' : 'bsite';
    }

    followPath(bot, dt, diff.spd);
    bot.walkC = (bot.walkC || 0) + dt * 9;
    const legs = bot.mesh.getObjectByName('legs');
    if (legs) legs.rotation.x = Math.sin(bot.walkC) * 0.2;
    bot.mesh.position.set(bot.x, 0, bot.z);
  }
}

function livingEnemies(bot) {
  const out = [];
  if (!bot.ally && !state.dead) out.push({ x:player.x, z:player.z, isPlayer:true, alive:true });
  state.bots.forEach(o => {
    if (o!==bot && o.alive && o.team !== bot.team) out.push(o);
  });
  return out;
}

function tryMoveBot(bot, dx, dz) {
  if (!collides(bot.x+dx, bot.z)) bot.x += dx;
  if (!collides(bot.x, bot.z+dz)) bot.z += dz;
  bot.mesh.position.set(bot.x, 0, bot.z);
}

function followPath(bot, dt, spd) {
  const here = nearestWp(bot.x, bot.z);
  const dest = WAYPOINTS[bot.goal] ? bot.goal : 'mid';
  if (here === dest) {
    const w = WAYPOINTS[dest];
    const dx = w.x - bot.x, dz = w.z - bot.z, d = Math.hypot(dx,dz);
    if (d > 0.8) tryMoveBot(bot, dx/d*spd*dt, dz/d*spd*dt);
    bot.mesh.lookAt(w.x, 1, w.z);
    return;
  }
  if (!bot.path.length || bot.path[bot.path.length-1] !== dest) bot.path = astar(here, dest);
  const nextId = bot.path[1] || bot.path[0];
  const n = WAYPOINTS[nextId];
  if (!n) return;
  const dx = n.x - bot.x, dz = n.z - bot.z, d = Math.hypot(dx,dz);
  if (d < 1.2) bot.path.shift();
  else {
    tryMoveBot(bot, dx/d*spd*dt, dz/d*spd*dt);
    bot.mesh.lookAt(n.x, 1, n.z);
  }
}

// ─── MOVEMENT / USE ──────────────────────────────────────────────────────────

function syncCamera() {
  const eye = state.crouch ? CROUCH_EYE : EYE;
  camera.position.set(player.x, player.y + eye, player.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function updateMovement(dt) {
  viewModel.visible = !state.dead;
  if (state.screen !== 'match' || state.dead) {
    if (state.dead) {
      camera.rotation.order = 'YXZ';
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;
      camera.position.x = player.x;
      camera.position.z = player.z;
      camera.position.y += ((player.y + 0.52) - camera.position.y) * (1 - Math.exp(-2.5*dt));
      camera.rotation.z += (0.42 - camera.rotation.z) * (1 - Math.exp(-2.5*dt));
    } else {
      syncCamera();
    }
    return;
  }
  const sneak = input.shift;
  const maxSpd = state.crouch ? CROUCH_SPD : (sneak ? SNEAK : WALK);
  let wx=0, wz=0;
  const yaw = player.yaw;
  if (input.w) { wx -= Math.sin(yaw); wz -= Math.cos(yaw); }
  if (input.s) { wx += Math.sin(yaw); wz += Math.cos(yaw); }
  if (input.a) { wx -= Math.cos(yaw); wz += Math.sin(yaw); }
  if (input.d) { wx += Math.cos(yaw); wz -= Math.sin(yaw); }
  const wish = Math.hypot(wx, wz);
  const accel = player.onGround ? 38 : 12;
  const friction = player.onGround ? 10 : 1.2;
  if (wish > 0.001 && state.phase !== 'end') {
    wx/=wish; wz/=wish;
    player.vx += wx * accel * dt;
    player.vz += wz * accel * dt;
  } else {
    const drop = Math.exp(-friction * dt);
    player.vx *= drop; player.vz *= drop;
  }
  let spd = Math.hypot(player.vx, player.vz);
  if (spd > maxSpd) { player.vx *= maxSpd/spd; player.vz *= maxSpd/spd; spd = maxSpd; }
  const nx = player.x + player.vx * dt;
  const nz = player.z + player.vz * dt;
  if (!collides(nx, player.z)) player.x = nx; else player.vx = 0;
  if (!collides(player.x, nz)) player.z = nz; else player.vz = 0;

  if (spd > 1.2 && !sneak && player.onGround) {
    state._step = (state._step||0)+dt;
    if (state._step > (state.crouch ? 0.55 : 0.38)) { state._step=0; sfx.step(); }
  }
  if (input.space && player.onGround && !state.crouch) {
    player.velY = JUMP; player.onGround = false;
  }
  if (!player.onGround) {
    player.velY -= GRAV * dt;
    player.y += player.velY * dt;
    if (player.y <= 0) {
      if (player.velY < -4) { sfx.land(); state.landDip = 0.12; }
      player.y = 0; player.velY = 0; player.onGround = true;
    }
  }
  state.landDip *= Math.exp(-8*dt);
  state.recoil *= Math.exp(-5.5*dt);
  state.kick *= Math.exp(-10*dt);

  const t = performance.now() * 0.001;
  const bob = spd > 0.8 ? Math.sin(t * (sneak?8:12)) * 0.014 * Math.min(1, spd/WALK) : Math.sin(t * 1.6) * 0.003;
  const kickZ = state.kick * 0.045;
  const adsX = state.aiming ? -0.26 : 0;
  const adsY = state.aiming ? -0.04 : 0;
  viewModel.position.set(0.34 + adsX, -0.28 + bob + adsY - (state.crouch?0.07:0) - state.landDip, -0.5 + kickZ);
  viewModel.rotation.x = -state.kick * 0.08 - state.landDip;

  const w = currentWeapon();
  let tfov = FOV;
  if (state.aiming) tfov = w?.scope ? SCOPE_FOV : ADS_FOV;
  camera.fov += (tfov - camera.fov) * (1 - Math.exp(-12*dt));
  camera.updateProjectionMatrix();

  const strafeRoll = THREE.MathUtils.clamp(-player.vx * Math.cos(yaw) + player.vz * Math.sin(yaw), -6, 6) * 0.012;
  camera.rotation.z += (strafeRoll - camera.rotation.z) * (1 - Math.exp(-8*dt));
  syncCamera();
  camera.position.y -= state.landDip;

  const gap = 5 + state.recoil * 90 + Math.min(10, spd * 1.4);
  document.getElementById('crosshair')?.style.setProperty('--gap', gap.toFixed(1)+'px');
}

function updateUse(dt) {
  const prompt = document.getElementById('use-prompt');
  const bar = document.getElementById('channel-bar');
  const fill = document.getElementById('channel-fill');
  const lab = document.getElementById('channel-label');
  let action = null, dur = 1;

  if (!state.dead && state.phase !== 'buy' && state.phase !== 'end') {
    if (state.side===TEAM.T && state.inv.bomb==='bomb' && inSite(player.x, player.z) && !state.bombPlanted) {
      action = 'plant'; dur = PLANT_T;
    } else if (state.side===TEAM.CT && state.bombPlanted && state.bombPos && Math.hypot(player.x-state.bombPos.x, player.z-state.bombPos.z)<1.5) {
      action = 'defuse'; dur = state.kit ? DEFUSE_KIT : DEFUSE_T;
    } else if (state.side===TEAM.T && state.bombPos && !state.bombPlanted && Math.hypot(player.x-state.bombPos.x, player.z-state.bombPos.z)<1.6) {
      action = 'pickup'; dur = 0.01;
    }
  }

  if (action) {
    prompt.classList.remove('hidden');
    prompt.innerHTML = action==='plant' ? 'HOLD <kbd>E</kbd> PLANT' : action==='defuse' ? 'HOLD <kbd>E</kbd> DEFUSE' : 'HOLD <kbd>E</kbd> PICK UP';
  } else prompt.classList.add('hidden');

  if (input.e && action && action !== 'pickup') {
    if (state.channel !== action) { state.channel = action; state.channelT = 0; }
    state.channelT += dt;
    bar.classList.remove('hidden');
    fill.style.width = Math.min(100, state.channelT/dur*100)+'%';
    lab.textContent = action === 'plant' ? 'PLANTING' : 'DEFUSING';
    if (state.channelT >= dur) {
      if (action==='plant') plantBomb();
      else defuseBomb();
      state.channel = null; state.channelT = 0;
    }
  } else if (input.e && action==='pickup') {
    pickupBomb();
  } else {
    state.channel = null; state.channelT = 0;
    bar.classList.add('hidden');
  }
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function updateHUD() {
  if (state.screen !== 'match') return;
  const w = currentWeapon();
  const a = state.ammo[w?.id] || { cur:0, res:0 };
  document.getElementById('health-num').textContent = Math.round(state.health);
  document.getElementById('armor-num').textContent = Math.round(state.armor);
  document.getElementById('money-num').textContent = '$'+state.money;
  document.getElementById('ammo-cur').textContent = w?.melee || w?.nade || w?.bomb ? '—' : a.cur;
  document.getElementById('ammo-res').textContent = w?.melee || w?.nade || w?.bomb ? '' : a.res;
  document.getElementById('wpn-name').textContent = w?.name || '';
  document.getElementById('score-t').textContent = state.scoreT;
  document.getElementById('score-ct').textContent = state.scoreCT;
  document.getElementById('round-num').textContent = 'ROUND '+state.round;
  const t = state.phase==='bomb' ? state.bombTime : (state.phase==='buy' ? state.time : state.time);
  const m = Math.max(0, Math.floor(t/60)), s = Math.max(0, Math.floor(t%60)).toString().padStart(2,'0');
  document.getElementById('match-timer').textContent = `${m}:${s}`;
  document.getElementById('buy-timer').textContent = state.phase==='buy' ? `${Math.ceil(state.time)}s` : '';
  document.getElementById('buy-money').textContent = '$'+state.money;
  const bar = document.getElementById('weapon-bar');
  const slots = ['primary','pistol','melee','nade','bomb'];
  bar.innerHTML = slots.map((sl,i) => {
    if (!state.inv[sl]) return '';
    return `<div class="wpn-icon ${state.slot===sl?'active':''}">${i+1}</div>`;
  }).join('');
  drawRadar();
}

function drawRadar() {
  const c = document.getElementById('radar');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = 'rgba(8,12,10,0.85)';
  ctx.fillRect(0,0,W,H);
  const sx = W/84, sz = H/72;
  const wx = x => (x+42)*sx, wz = z => (z+36)*sz;
  ctx.fillStyle = 'rgba(180,160,110,0.35)';
  state.walls2d.forEach(w => ctx.fillRect(wx(w.x-w.w/2), wz(w.z-w.d/2), w.w*sx, w.d*sz));
  ctx.fillStyle = '#4f8ec9'; ctx.beginPath(); ctx.arc(wx(SITES.A.x), wz(SITES.A.z), 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#c98c28'; ctx.beginPath(); ctx.arc(wx(SITES.B.x), wz(SITES.B.z), 5, 0, 7); ctx.fill();
  state.bots.filter(b=>b.alive).forEach(b => {
    ctx.fillStyle = b.team===TEAM.T ? '#e0a33a' : '#7eb4e0';
    ctx.fillRect(wx(b.x)-2, wz(b.z)-2, 4, 4);
  });
  if (state.bombPlanted && state.bombPos) {
    ctx.fillStyle = '#e05a5a';
    ctx.fillRect(wx(state.bombPos.x)-3, wz(state.bombPos.z)-3, 6, 6);
  }
  ctx.save();
  ctx.translate(wx(player.x), wz(player.z));
  ctx.rotate(player.yaw);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(4,5); ctx.lineTo(-4,5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function addFeed(killer, victim, kt, vt, head) {
  const f = document.getElementById('kill-feed');
  const e = document.createElement('div');
  e.className = 'entry';
  e.innerHTML = `<span class="${kt}">${killer}</span> ${head?'◉':''} <span class="${vt}">${victim}</span>`;
  f.prepend(e);
  if (f.children.length > 6) f.lastChild.remove();
  setTimeout(()=>e.remove(), 4500);
}

function showKill(head) {
  const b = document.getElementById('kill-banner');
  b.textContent = head ? 'HEADSHOT' : 'ELIMINATED';
  b.className = 'kill-banner' + (head?' head':'');
  setTimeout(()=>b.classList.add('hidden'), 700);
}

function flashHit(head) {
  const h = document.getElementById('hitmarker');
  h.classList.add('show');
  h.style.borderColor = head ? '#ff6b4a' : '#fff';
  setTimeout(()=>h.classList.remove('show'), 90);
}

function showBanner(title, sub, cls) {
  const b = document.getElementById('round-banner');
  b.className = 'round-banner ' + (cls||'');
  b.innerHTML = `${title}<div class="sub">${sub||''}</div>`;
  if (title.startsWith('ROUND ') && state.phase==='buy') {
    setTimeout(()=>b.classList.add('hidden'), 1400);
  }
}

function updateScoreboard() {
  const fill = (id, team) => {
    const tb = document.getElementById(id);
    tb.innerHTML = '';
    const rows = [];
    if (state.side === team) rows.push({ name:'YOU', kills: state.kills, deaths: state.deaths, money:state.money, me:true, alive:!state.dead });
    state.bots.filter(b=>b.team===team).forEach(b => rows.push({ name:b.name, kills:b.kills, deaths:b.deaths, money:b.money, me:false, alive:b.alive }));
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = (r.me?'me ':'') + (r.alive?'':'dead');
      tr.innerHTML = `<td>${r.name}</td><td>${r.kills||0}</td><td>0</td><td>${r.deaths||0}</td><td>$${r.me?state.money: (r.money||0)}</td>`;
      tb.appendChild(tr);
    });
  };
  fill('sb-t', TEAM.T); fill('sb-ct', TEAM.CT);
}

// ─── INPUT ───────────────────────────────────────────────────────────────────

function lockPointer() { renderer.domElement.requestPointerLock?.(); }

document.querySelectorAll('.side-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.side = btn.dataset.side;
    state.inv.pistol = defaultPistol(state.side);
  };
});

const diffEl = document.getElementById('diff-options');
Object.entries(DIFFICULTY).forEach(([id, d]) => {
  const c = document.createElement('div');
  c.className = 'chip' + (id===state.difficulty?' selected':'');
  c.textContent = d.label;
  c.onclick = () => { diffEl.querySelectorAll('.chip').forEach(x=>x.classList.remove('selected')); c.classList.add('selected'); state.difficulty=id; };
  diffEl.appendChild(c);
});

document.getElementById('play-btn').onclick = startMatch;

document.addEventListener('pointerlockchange', () => {
  state.pointerLocked = document.pointerLockElement === renderer.domElement;
});
document.addEventListener('mousemove', e => {
  if (!state.pointerLocked || state.showScore || state.showBuy) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, -1.25, 1.25);
  syncCamera();
});

function setKey(e, down) {
  const c = e.code;
  if (c==='KeyW'||c==='ArrowUp') input.w = down;
  if (c==='KeyS'||c==='ArrowDown') input.s = down;
  if (c==='KeyA'||c==='ArrowLeft') input.a = down;
  if (c==='KeyD'||c==='ArrowRight') input.d = down;
  if (c==='Space') input.space = down;
  if (c==='ShiftLeft'||c==='ShiftRight') input.shift = down;
  if (c==='ControlLeft'||c==='ControlRight') { input.ctrl = down; state.crouch = down; }
  if (c==='KeyE') input.e = down;
}

document.addEventListener('keydown', e => {
  if (['KeyW','KeyA','KeyS','KeyD','Space','ControlLeft'].includes(e.code)) e.preventDefault();
  setKey(e, true);
  if (e.code==='Escape' && state.screen==='match') { returnToMenu(); return; }
  if (e.code==='Tab') { e.preventDefault(); state.showScore=!state.showScore; document.getElementById('scoreboard').classList.toggle('hidden', !state.showScore); if (state.showScore) updateScoreboard(); return; }
  if (e.code==='KeyB' && state.screen==='match' && state.phase==='buy') {
    state.showBuy = !state.showBuy;
    document.getElementById('buy-menu').classList.toggle('hidden', !state.showBuy);
    if (state.showBuy) { fillBuyMenu(); document.exitPointerLock?.(); } else lockPointer();
  }
  if (e.code==='KeyR') reload();
  if (e.code==='Digit1' && state.inv.primary) { state.slot='primary'; buildViewModel(); updateHUD(); }
  if (e.code==='Digit2' && state.inv.pistol) { state.slot='pistol'; buildViewModel(); updateHUD(); }
  if (e.code==='Digit3') { state.slot='melee'; buildViewModel(); updateHUD(); }
  if (e.code==='Digit4' && state.inv.nade) { state.slot='nade'; buildViewModel(); updateHUD(); }
  if (e.code==='Digit5' && state.inv.bomb) { state.slot='bomb'; buildViewModel(); updateHUD(); }
  if (e.code==='KeyG' && state.inv.bomb==='bomb') dropBomb(player.x, player.z);
  if (e.code==='KeyQ') {
    const next = state.slot==='primary' ? 'pistol' : (state.inv.primary ? 'primary' : 'pistol');
    if (state.inv[next]) { state.slot = next; buildViewModel(); updateHUD(); }
  }
});
document.addEventListener('keyup', e => setKey(e, false));
window.addEventListener('blur', () => { input.w=input.a=input.s=input.d=input.space=input.shift=input.ctrl=input.e=false; });

renderer.domElement.addEventListener('click', () => {
  if (state.screen==='match' && !state.showBuy && !state.showScore) lockPointer();
});
document.addEventListener('mousedown', e => {
  if (state.screen!=='match' || state.dead || state.showBuy || state.showScore) return;
  if (e.button===0) { state.shooting = true; shoot(); }
  if (e.button===2) state.aiming = true;
});
document.addEventListener('mouseup', e => {
  if (e.button===0) state.shooting = false;
  if (e.button===2) state.aiming = false;
});
document.addEventListener('contextmenu', e => e.preventDefault());

// ─── LOOP ────────────────────────────────────────────────────────────────────

const clock = new THREE.Clock();
let beepAcc = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.screen === 'match') {
    updateMovement(dt);
    updateUse(dt);
    updateNades(dt);
    updateBots(dt);
    if (state.shooting && currentWeapon()?.auto) shoot();
    for (let i=state.tracers.length-1;i>=0;i--) {
      state.tracers[i].t -= dt;
      if (state.tracers[i].t<=0) { fxGroup.remove(state.tracers[i].mesh); state.tracers.splice(i,1); }
    }
    for (let i=state.impacts.length-1;i>=0;i--) {
      const p = state.impacts[i];
      p.t -= dt;
      if (p.blood) { p.mesh.scale.multiplyScalar(1+dt*2); p.mesh.material.opacity *= 0.92; }
      if (p.t<=0) { fxGroup.remove(p.mesh); state.impacts.splice(i,1); }
    }
    state.smokes.forEach(s => s.mesh.scale.addScalar(dt * 0.03));
    if (state.phase==='buy') {
      state.time -= dt;
      if (state.time <= 0) {
        state.phase = 'live';
        state.time = ROUND_TIME;
        state.showBuy = false;
        document.getElementById('buy-menu').classList.add('hidden');
        document.getElementById('round-banner').classList.add('hidden');
        lockPointer();
        autoBuyBots();
      }
    } else if (state.phase==='live') {
      state.time -= dt;
      if (state.time <= 0 && !state.bombPlanted) endRound(TEAM.CT, 'TIME EXPIRED');
    } else if (state.phase==='bomb') {
      state.bombTime -= dt;
      beepAcc += dt;
      const interval = state.bombTime < 10 ? 0.25 : state.bombTime < 20 ? 0.5 : 1;
      if (beepAcc >= interval) { beepAcc = 0; sfx.beep(); }
      if (state.bombTime <= 0) explodeBomb();
    }
    updateHUD();
  } else {
    const t = performance.now() * 0.00012;
    camera.position.set(Math.sin(t)*24, 11, Math.cos(t)*24);
    camera.lookAt(0, 1.4, 0);
  }
  renderer.render(scene, camera);
}

function autoBuyBots() {
  state.bots.forEach(b => {
    if (b.team===TEAM.T) b.gun = 'kr47';
    else b.gun = 'm4c';
  });
}

try {
  buildMap();
  animate();
} catch (err) {
  console.error(err);
  const el = document.getElementById('load-error');
  if (el) { el.style.display='block'; el.textContent = 'Failed to load: '+err.message; }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

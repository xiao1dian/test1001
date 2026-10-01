import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { buildPark, updatePark } from './dino-park.js';
import { createHybrid, getAllDinos } from './dino-hybrid.js';
import { usesRiggedModel, getRiggedModelKey, buildSpeciesMesh } from './dino-models.js';
import {
  dist, initCombatState, startWorldCombat, minFightDist, biteRange, separateFighters,
  updateCombatMovement, COMBAT_DUR, updateCombatMotion,
} from './dino-combat.js';

// ─── JURASSIC CLASH — 3D Dinosaur Fight Simulator ───────────────────────────

const MODEL_FILES = {
  trex_fabulous: { type: 'gltf', url: '/static/models/dinos/trex_fabulous.glb' },
  indominus_jwe: { type: 'gltf', url: '/static/models/dinos/indominus_jwe/scene.gltf' },
  indoraptor: { type: 'gltf', url: '/static/models/dinos/indoraptor/scene.gltf' },
  hunting_spinosaurus: { type: 'gltf', url: '/static/models/dinos/hunting_spinosaurus/scene.gltf', static: true },
  world_stegosaurus: { type: 'gltf', url: '/static/models/dinos/world_stegosaurus/scene.gltf', static: true },
  hunting_brachiosaurus: { type: 'gltf', url: '/static/models/dinos/hunting_brachiosaurus/scene.gltf', static: true },
  hunting_rhamphorhynchus: { type: 'gltf', url: '/static/models/dinos/hunting_rhamphorhynchus/scene.gltf', static: true },
  quaternius_velociraptor: { type: 'fbx', url: '/static/models/dinos/quaternius_velociraptor.fbx' },
  quaternius_triceratops: { type: 'fbx', url: '/static/models/dinos/quaternius_triceratops.fbx' },
  quaternius_parasaurolophus: { type: 'fbx', url: '/static/models/dinos/quaternius_parasaurolophus.fbx' },
};

const MODEL_ANIM = {
  quaternius_velociraptor: {
    idle: 'Idle', walk: 'Walk', run: 'Run', bite: 'Attack', roar: 'Attack',
    charge: 'Run', special: 'Jump', hit: 'Idle', death: 'Death',
  },
  quaternius_triceratops: {
    idle: 'Idle', walk: 'Walk', run: 'Run', bite: 'Attack', roar: 'Attack',
    charge: 'Run', special: 'Jump', hit: 'Idle', death: 'Death',
  },
  quaternius_parasaurolophus: {
    idle: 'Idle', walk: 'Walk', run: 'Run', bite: 'Attack', roar: 'Attack',
    charge: 'Run', special: 'Jump', hit: 'Idle', death: 'Death',
  },
  trex_fabulous: {
    idle: 'CINEMA', walk: 'CINEMA', run: 'CINEMA', bite: 'CINEMA', roar: 'CINEMA',
    charge: 'CINEMA', special: 'CINEMA', hit: 'CINEMA', death: 'CINEMA',
  },
  indominus_jwe: {
    idle: 'Animation', walk: 'Animation', run: 'Animation', bite: 'Animation', roar: 'Animation',
    charge: 'Animation', special: 'Animation', hit: 'Animation', death: 'Animation',
  },
  indoraptor: {
    idle: 'dec_indoraptor', walk: 'dec_indoraptor', run: 'dec_indoraptor', bite: 'dec_indoraptor',
    roar: 'dec_indoraptor', charge: 'dec_indoraptor', special: 'dec_indoraptor', hit: 'dec_indoraptor', death: 'dec_indoraptor',
  },
};

const TEXTURED_MODELS = new Set([
  'trex_fabulous', 'indominus_jwe', 'indoraptor',
  'hunting_spinosaurus', 'world_stegosaurus', 'hunting_brachiosaurus', 'hunting_rhamphorhynchus',
]);

const DINOS = {
  trex: {
    id: 'trex', name: 'Tyrannosaurus Rex', emoji: '🦖',
    hp: 120, atk: 35, def: 20, spd: 6, scale: 1.4,
    modelScale: 1.15, height: 4.2,
    special: 'Crushing Bite',
    desc: 'King of predators. Massive jaws deliver devastating bites.',
    type: 'carnivore', era: 'Late Cretaceous',
  },
  raptor: {
    id: 'raptor', name: 'Velociraptor', emoji: '🦎',
    hp: 70, atk: 28, def: 10, spd: 12, scale: 0.7,
    modelScale: 1.0, height: 1.8,
    special: 'Pack Strike',
    desc: 'Lightning-fast hunter with lethal sickle claws.',
    type: 'carnivore', era: 'Late Cretaceous',
  },
  triceratops: {
    id: 'triceratops', name: 'Triceratops', emoji: '🦕',
    hp: 110, atk: 25, def: 30, spd: 5, scale: 1.1,
    modelScale: 1.05, height: 2.8, tint: 0x8a7050,
    special: 'Horn Charge',
    desc: 'Three-horned herbivore. Charges with bone-crushing force.',
    type: 'herbivore', era: 'Late Cretaceous',
  },
  spinosaurus: {
    id: 'spinosaurus', name: 'Spinosaurus', emoji: '🐊',
    hp: 115, atk: 32, def: 18, spd: 7, scale: 1.3,
    modelScale: 1.25, height: 4.5, tint: 0x3a6a4a,
    special: 'Sail Slash',
    desc: 'Largest carnivore ever. Sail-backed aquatic predator.',
    type: 'carnivore', era: 'Early Cretaceous',
  },
  dilophosaurus: {
    id: 'dilophosaurus', name: 'Dilophosaurus', emoji: '🦎',
    hp: 55, atk: 18, def: 8, spd: 10, scale: 0.65,
    modelScale: 0.85, height: 2.0, tint: 0x6a9a5a,
    special: 'Venom Spit',
    desc: 'Frilled spitter. Blinds prey with toxic venom.',
    type: 'carnivore', era: 'Early Jurassic',
  },
  indominus: {
    id: 'indominus', name: 'Indominus Rex', emoji: '👹',
    hp: 130, atk: 38, def: 22, spd: 9, scale: 1.5,
    modelScale: 0.85, height: 4.8,
    special: 'Camo Strike',
    desc: 'Genetically engineered hybrid. Unmatched aggression.',
    type: 'hybrid', era: 'Jurassic World',
  },
  indoraptor: {
    id: 'indoraptor', name: 'Indoraptor', emoji: '🐺',
    hp: 95, atk: 34, def: 14, spd: 13, scale: 1.0,
    modelScale: 1.0, height: 2.4,
    special: 'Night Hunt',
    desc: 'Stealth hybrid predator. Blinding speed and lethal claws.',
    type: 'hybrid', era: 'Jurassic World',
  },
  stegosaurus: {
    id: 'stegosaurus', name: 'Stegosaurus', emoji: '🦕',
    hp: 100, atk: 22, def: 28, spd: 4, scale: 1.2,
    modelScale: 1.0, height: 2.6,
    special: 'Tail Spike',
    desc: 'Plated tank. Swings spiked tail with deadly accuracy.',
    type: 'herbivore', era: 'Late Jurassic',
  },
  ankylosaurus: {
    id: 'ankylosaurus', name: 'Ankylosaurus', emoji: '🛡️',
    hp: 105, atk: 20, def: 35, spd: 3, scale: 1.0,
    modelScale: 0.9, height: 1.6, tint: 0x4a4035,
    special: 'Club Tail',
    desc: 'Walking fortress. Armored body and bone-crushing club.',
    type: 'herbivore', era: 'Late Cretaceous',
  },
  carnotaurus: {
    id: 'carnotaurus', name: 'Carnotaurus', emoji: '🐂',
    hp: 85, atk: 30, def: 15, spd: 11, scale: 1.0,
    modelScale: 1.15, height: 2.4, tint: 0xa05030,
    special: 'Bull Rush',
    desc: 'Horned sprinter. Charges at blistering speed.',
    type: 'carnivore', era: 'Late Cretaceous',
  },
  giganotosaurus: {
    id: 'giganotosaurus', name: 'Giganotosaurus', emoji: '🦖',
    hp: 125, atk: 36, def: 19, spd: 7, scale: 1.45,
    modelScale: 1.2, height: 4.4, tint: 0x5a6a30,
    special: 'Savage Rip',
    desc: 'South American giant. Rivals T-Rex in size and power.',
    type: 'carnivore', era: 'Late Cretaceous',
  },
  allosaurus: {
    id: 'allosaurus', name: 'Allosaurus', emoji: '🦖',
    hp: 90, atk: 29, def: 14, spd: 8, scale: 1.05,
    modelScale: 1.2, height: 2.8, tint: 0x5a7a40,
    special: 'Ambush Pounce',
    desc: 'Apex Jurassic predator. Leaps from the shadows.',
    type: 'carnivore', era: 'Late Jurassic',
  },
  parasaurolophus: {
    id: 'parasaurolophus', name: 'Parasaurolophus', emoji: '🦕',
    hp: 75, atk: 15, def: 12, spd: 9, scale: 0.95,
    modelScale: 0.85, height: 2.2, tint: 0xb09060,
    special: 'Alarm Call',
    desc: 'Crested hadrosaur. Sonic blast disorients foes.',
    type: 'herbivore', era: 'Late Cretaceous',
  },
  pteranodon: {
    id: 'pteranodon', name: 'Pteranodon', emoji: '🦅',
    hp: 50, atk: 16, def: 6, spd: 14, scale: 0.8,
    modelScale: 0.75, height: 1.4, tint: 0x908070,
    special: 'Dive Bomb',
    desc: 'Sky hunter. Dives from above with razor beak.',
    type: 'pterosaur', era: 'Late Cretaceous',
  },
  compsognathus: {
    id: 'compsognathus', name: 'Compsognathus', emoji: '🐦',
    hp: 40, atk: 12, def: 5, spd: 15, scale: 0.4,
    modelScale: 0.5, height: 0.7, tint: 0x9a8a60,
    special: 'Swarm Bite',
    desc: 'Tiny but vicious. Overwhelms with rapid attacks.',
    type: 'carnivore', era: 'Late Jurassic',
  },
  brachiosaurus: {
    id: 'brachiosaurus', name: 'Brachiosaurus', emoji: '🦒',
    hp: 140, atk: 18, def: 25, spd: 3, scale: 1.8,
    modelScale: 1.5, height: 6.0, tint: 0x7a6848,
    special: 'Stomp',
    desc: 'Colossal sauropod. Earth-shaking stomp attack.',
    type: 'herbivore', era: 'Late Jurassic',
  },
  mosasaurus: {
    id: 'mosasaurus', name: 'Mosasaurus', emoji: '🐋',
    hp: 115, atk: 34, def: 16, spd: 8, scale: 1.4,
    modelScale: 1.2, height: 3.5, tint: 0x2a5a6a,
    special: 'Apex Lunge',
    desc: 'Tyrant of the ancient seas. Explodes from the depths.',
    type: 'aquatic', era: 'Late Cretaceous',
  },
};

function getDino(id) {
  return state.customHybrids[id] || DINOS[id];
}

function allDinos() {
  return getAllDinos(DINOS, state.customHybrids);
}

const COOLDOWNS = { bite: 2.8, charge: 9.0, special: 20.0, roar: 14.0 };
const FIGHT_HP_MULT = 5;
const FIGHT_DMG_SCALE = 0.32;
const AI_DECISION_MIN = 2.2;
const AI_DECISION_MAX = 5.0;

const ARENA_R = 28;
const STAMINA_MAX = 100;
const STAMINA_REGEN = 18;
const STAMINA_COST = { bite: 12, charge: 30, special: 40, roar: 20 };

const state = {
  screen: 'menu',
  playerId: null,
  enemyId: null,
  selectMode: 'player',
  fightTime: 0,
  over: false,
  winner: null,
  log: [],
  customHybrids: {},
  labParentA: null,
  labParentB: null,
};

const player = { hp: 0, maxHp: 0, cds: {}, stunned: 0, aiTimer: 0, aiState: 'approach' };
const enemy = { hp: 0, maxHp: 0, cds: {}, stunned: 0, aiTimer: 0, aiState: 'approach' };

const keys = {};
let scene, camera, renderer, clock, gltfLoader, fbxLoader, orbitControls;
let playerGroup, enemyGroup, playerFighter, enemyFighter;
let arena, particles = [], floatTexts = [];
let playerPos = new THREE.Vector3(-8, 0, 0);
let enemyPos = new THREE.Vector3(8, 0, 0);
const modelCache = new Map();
const mixers = [];

let actx = null;
function audio() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur, type = 'sawtooth', vol = 0.08) {
  const ctx = audio();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + dur);
}
function roarSound(low = 80) {
  tone(low, 0.5, 'sawtooth', 0.12);
  setTimeout(() => tone(low * 0.7, 0.4, 'square', 0.08), 100);
}
function hitSound() { tone(120 + Math.random() * 60, 0.12, 'square', 0.1); }
function specialSound() { tone(200, 0.3, 'sine', 0.1); setTimeout(() => tone(300, 0.2, 'sine', 0.08), 150); }

function setLoading(show, pct = 0, text = '') {
  const el = document.getElementById('loading');
  if (!el) return;
  el.classList.toggle('hidden', !show);
  const fill = document.getElementById('loading-fill');
  const label = document.getElementById('loading-text');
  if (fill) fill.style.width = `${Math.round(pct * 100)}%`;
  if (label && text) label.textContent = text;
}

function loadModel(key) {
  if (modelCache.has(key)) return modelCache.get(key);
  const def = MODEL_FILES[key];
  const promise = new Promise((resolve, reject) => {
    const onProgress = (xhr) => {
      if (xhr.total) setLoading(true, xhr.loaded / xhr.total, `Loading ${key.replace('quaternius_', '').replace('_', ' ')}…`);
    };
    if (def.type === 'fbx') {
      fbxLoader.load(
        def.url,
        (object) => resolve({ scene: object, animations: object.animations || [] }),
        onProgress,
        reject,
      );
    } else {
      gltfLoader.load(def.url, resolve, onProgress, reject);
    }
  });
  modelCache.set(key, promise);
  return promise;
}

async function preloadModels() {
  setLoading(true, 0, 'Loading dinosaur models…');
  const keys = Object.keys(MODEL_FILES);
  for (let i = 0; i < keys.length; i++) {
    setLoading(true, i / keys.length, `Loading ${keys[i].replace('_', ' ')}…`);
    await loadModel(keys[i]);
  }
  setLoading(true, 1, 'Ready!');
  setTimeout(() => setLoading(false), 400);
}

function cleanSketchfabScene(root) {
  const remove = [];
  root.traverse(obj => {
    const n = (obj.name || '').toLowerCase();
    if (/camera|light|sky|background|shadow_plane|lensflare|physical_sky|moon|sun/.test(n)) {
      remove.push(obj);
    }
  });
  remove.forEach(obj => obj.parent?.remove(obj));
}

function findClip(clips, keyword) {
  if (!clips?.length) return null;
  const keys = Array.isArray(keyword) ? keyword : [keyword];
  for (const k of keys) {
    const clip = clips.find(c => c.name.toLowerCase().includes(String(k).toLowerCase()));
    if (clip) return clip;
  }
  return clips[0];
}

function buildActions(mixer, animations, modelKey) {
  const animMap = MODEL_ANIM[modelKey] || MODEL_ANIM.quaternius_trex;
  const actions = {};
  const speedFor = (name) => {
    if (name === 'run') return 1.55;
    if (name === 'walk') return 1.0;
    if (name === 'bite' || name === 'charge' || name === 'special') return 1.9;
    if (name === 'hit') return 1.4;
    if (name === 'roar') return 0.95;
    if (name === 'death') return 0.75;
    return 0.85;
  };
  for (const [name, keyword] of Object.entries(animMap)) {
    const clip = findClip(animations, keyword);
    if (clip) {
      actions[name] = mixer.clipAction(clip);
      actions[name].setEffectiveTimeScale(speedFor(name));
    }
  }
  if (!actions.idle && animations.length) {
    const fallback = animations[0];
    for (const name of Object.keys(animMap)) {
      if (!actions[name]) actions[name] = mixer.clipAction(fallback);
    }
  }
  return actions;
}

function applyTint(root, tint) {
  if (!tint) return;
  const color = new THREE.Color(tint);
  root.traverse(obj => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach(m => {
      if (m.map) {
        m.color.lerp(color, 0.35);
      } else {
        m.color.copy(color);
      }
    });
  });
}

function cloneMaterials(root) {
  root.traverse(obj => {
    if (!obj.isMesh || !obj.material) return;
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map(m => m.clone());
    } else {
      obj.material = obj.material.clone();
    }
  });
}

function fitModelToHeight(root, targetHeight, scaleMul = 1) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  if (size.y < 0.001) {
    root.scale.setScalar(scaleMul);
    return root;
  }
  const s = (targetHeight / size.y) * scaleMul;
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);
  const grounded = new THREE.Box3().setFromObject(root);
  root.position.y = -grounded.min.y;
  return root;
}

function disposeFighter(fighter) {
  if (!fighter) return;
  fighter.mixer?.stopAllAction();
  fighter.group?.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => {
        m.map?.dispose();
        m.dispose();
      });
    }
  });
  if (fighter.group?.parent) fighter.group.parent.remove(fighter.group);
}

function meshSpecies(spec) {
  return spec.meshId || spec.id;
}

function createProceduralFighter(spec, side) {
  const speciesId = meshSpecies(spec);
  const root = buildSpeciesMesh(speciesId, spec);
  const wrapper = new THREE.Group();
  wrapper.add(root);
  fitModelToHeight(root, spec.height || 2.5, 1);
  return {
    group: wrapper,
    root,
    mixer: null,
    actions: {},
    current: null,
    spec,
    side,
    lastMotion: 'idle',
    procedural: true,
    _baseScaleY: root.scale.y,
  };
}

function createFighter(spec, side) {
  const speciesId = meshSpecies(spec);
  if (!usesRiggedModel(speciesId)) {
    return Promise.resolve(createProceduralFighter(spec, side));
  }
  const modelKey = getRiggedModelKey(speciesId);
  return loadModel(modelKey).then(asset => {
    const root = SkeletonUtils.clone(asset.scene);
    if (modelKey === 'trex_fabulous') cleanSketchfabScene(root);
    cloneMaterials(root);
    root.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            if (m.map && renderer) {
              m.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
            }
          });
        }
      }
    });
    if (!TEXTURED_MODELS.has(modelKey)) applyTint(root, spec.tint);
    fitModelToHeight(root, spec.height || 2.5, spec.modelScale || 1);

    const wrapper = new THREE.Group();
    wrapper.add(root);

    const animations = asset.animations || [];
    const hasAnims = animations.length > 0;
    const mixer = hasAnims ? new THREE.AnimationMixer(root) : null;
    if (mixer) mixers.push(mixer);

    const actions = mixer ? buildActions(mixer, animations, modelKey) : {};
    const isStatic = MODEL_FILES[modelKey]?.static || false;
    const fighter = {
      group: wrapper,
      root,
      mixer,
      actions,
      current: null,
      spec,
      side,
      lastMotion: 'idle',
      procedural: !hasAnims,
      staticMesh: isStatic || !hasAnims,
    };
    if (hasAnims) playAnim(fighter, 'idle', true);
    fighter._baseScaleY = root.scale.y;
    return fighter;
  });
}

function playAnim(fighter, name, loop = false, timeScale = 1) {
  const next = fighter.actions[name] || fighter.actions.idle;
  if (!next) return;
  if (loop && fighter.current === next && next.isRunning()) return;
  next.reset();
  next.setEffectiveTimeScale(timeScale);
  next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  next.clampWhenFinished = !loop;
  if (fighter.current && fighter.current !== next) fighter.current.fadeOut(0.25);
  next.fadeIn(0.15).play();
  fighter.current = next;
  if (!loop) {
    fighter.combatBusy = true;
    const dur = (next.getClip().duration / Math.max(timeScale, 0.1)) * 1000 + 80;
    clearTimeout(fighter._combatTimer);
    fighter._combatTimer = setTimeout(() => {
      fighter.combatBusy = false;
      if (fighter.combatMotion) fighter.combatMotion = null;
      if (fighter.current === next && !state.over) {
        playAnim(fighter, fighter.lastMotion || 'idle', true);
      }
    }, dur);
  }
}

function startCombatMotion(fighter, type) {
  if (!fighter) return;
  const animMap = {
    bite: ['bite', 2.0],
    hit: ['hit', 1.3],
    roar: ['roar', 0.9],
    charge: ['charge', 2.2],
    special: ['special', 1.6],
    tail: ['special', 1.4],
    death: ['death', 0.75],
  };
  const [anim, speed] = animMap[type] || ['bite', 1.8];
  const useSkel = !fighter.staticMesh && !fighter.procedural && (fighter.actions[anim] || fighter.actions.bite);
  if (useSkel) {
    playAnim(fighter, fighter.actions[anim] ? anim : 'bite', false, speed);
    return;
  }
  fighter.combatMotion = { type, t: 0, dur: COMBAT_DUR[type] || 0.8 };
  fighter.combatBusy = true;
  if (fighter.actions[anim] || fighter.actions.idle) {
    playAnim(fighter, fighter.actions[anim] ? anim : 'idle', false, speed);
  }
}

function updateFighterMotion(fighter, moving, running, dt) {
  if (fighter?.combatMotion) {
    updateCombatMotion(fighter, dt);
    return;
  }
  if (!fighter) return;
  if (fighter.staticMesh || fighter.procedural) {
    if (fighter.root && !fighter.combatBusy) {
      const t = clock.getElapsedTime();
      const bob = fighter.staticMesh ? 0.02 : 0.04;
      fighter.root.position.y = Math.sin(t * 3) * bob;
      if (moving || running) {
        fighter.root.rotation.z = Math.sin(t * 5) * 0.04;
        fighter.root.rotation.x = Math.sin(t * 4) * 0.03;
      }
    }
    return;
  }
  if (fighter.combatBusy) return;
  const busy = fighter.current && fighter.current.loop === THREE.LoopOnce && fighter.current.isRunning();
  if (busy) return;
  let target = running ? 'run' : moving ? 'walk' : 'idle';
  if (!fighter.actions[target]) target = 'idle';
  if (!fighter.actions[target]) return;
  if (fighter.lastMotion === target && fighter.current === fighter.actions[target]) return;
  fighter.lastMotion = target;
  const speed = target === 'run' ? 1.6 : target === 'walk' ? 1.0 : 0.85;
  playAnim(fighter, target, true, speed);
}

function spawnFighter(spec, side) {
  return createFighter(spec, side);
}

function buildArena() {
  arena = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(ARENA_R + 5, 64),
    new THREE.MeshLambertMaterial({ color: 0x3a5a2a })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  arena.add(ground);

  const sand = new THREE.Mesh(
    new THREE.CircleGeometry(ARENA_R, 48),
    new THREE.MeshLambertMaterial({ color: 0x8a7a50 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = 0.02;
  sand.receiveShadow = true;
  arena.add(sand);

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const r = ARENA_R - 1;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.6, 0),
      new THREE.MeshLambertMaterial({ color: 0x5a5040 })
    );
    rock.position.set(Math.cos(angle) * r, 0.4, Math.sin(angle) * r);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    arena.add(rock);
  }

  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = ARENA_R + 3 + Math.random() * 8;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.35, 3 + Math.random() * 2, 6),
      new THREE.MeshLambertMaterial({ color: 0x4a3020 })
    );
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    tree.add(trunk);
    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(1.5 + Math.random(), 3 + Math.random() * 2, 8),
      new THREE.MeshLambertMaterial({ color: 0x2a5a1a + Math.floor(Math.random() * 0x101010) })
    );
    foliage.position.y = 3.5 + Math.random();
    foliage.castShadow = true;
    tree.add(foliage);
    tree.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    arena.add(tree);
  }

  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 5 + Math.random() * (ARENA_R - 8);
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 6, 4),
      new THREE.MeshLambertMaterial({ color: 0x3a6a2a })
    );
    bush.position.set(Math.cos(angle) * r, 0.3, Math.sin(angle) * r);
    bush.scale.y = 0.6;
    arena.add(bush);
  }

  scene.add(arena);
  buildPark(scene, ARENA_R);
}

function setupLights() {
  scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3d5c3a, 0.65));
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.5);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;
  sun.shadow.bias = -0.0003;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x90b8d0, 0.4);
  fill.position.set(-25, 30, -15);
  scene.add(fill);
  scene.fog = new THREE.FogExp2(0x9ab8c8, 0.006);
}

function initThree() {
  const container = document.getElementById('game-container');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ec8e3);
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 200);
  camera.position.set(0, 12, 18);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);
  gltfLoader = new GLTFLoader();
  fbxLoader = new FBXLoader();
  setupLights();
  buildArena();
  clock = new THREE.Clock();

  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.06;
  orbitControls.minDistance = 4;
  orbitControls.maxDistance = 70;
  orbitControls.maxPolarAngle = Math.PI / 2 - 0.02;
  orbitControls.target.set(0, 2, 0);
  orbitControls.enabled = true;
  orbitControls.target.set(0, 0, -15);
  camera.position.set(15, 22, 40);
  orbitControls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function calcDmg(attacker, defender, mult = 1, ignoreDef = 0) {
  const atkSpec = getDino(attacker === 'player' ? state.playerId : state.enemyId);
  const defSpec = getDino(defender === 'player' ? state.playerId : state.enemyId);
  const base = atkSpec.atk * mult;
  const def = defSpec.def * (1 - ignoreDef);
  return Math.max(1, Math.round((base - def * 0.35 + (Math.random() - 0.5) * 4) * FIGHT_DMG_SCALE));
}

function useStamina() { return true; }

function onCooldown(who, ability) {
  const ent = who === 'player' ? player : enemy;
  return (ent.cds[ability] || 0) > 0;
}

function setCooldown(who, ability, dur) {
  const ent = who === 'player' ? player : enemy;
  ent.cds[ability] = dur;
}

function dealDamage(attacker, defender, amount, label) {
  const ent = defender === 'player' ? player : enemy;
  ent.hp = Math.max(0, ent.hp - amount);
  spawnFloatText(defender === 'player' ? playerPos : enemyPos, `-${amount}`, defender === 'player' ? '#e07060' : '#c9a84c');
  hitSound();
  shakeCamera(0.2);
  const atkName = getDino(attacker === 'player' ? state.playerId : state.enemyId).name;
  addLog(`${atkName} ${label} for ${amount} damage!`, 'log-special');
  animateHit(defender);
  const defBot = defender === 'player' ? player : enemy;
  const defPos = defender === 'player' ? playerPos : enemyPos;
  const atkPos = attacker === 'player' ? playerPos : enemyPos;
  const aSpec = getDino(attacker === 'player' ? state.playerId : state.enemyId);
  const dSpec = getDino(defender === 'player' ? state.playerId : state.enemyId);
  if (label !== 'roars at') {
    startWorldCombat(defBot, defPos, atkPos, 'knockback', minFightDist(dSpec, aSpec));
  }
  if (ent.hp <= 0) endFight(attacker);
  updateHud();
}

function doBite(attacker) {
  if (onCooldown(attacker, 'bite')) return;
  const pos = attacker === 'player' ? playerPos : enemyPos;
  const target = attacker === 'player' ? enemyPos : playerPos;
  const aSpec = getDino(attacker === 'player' ? state.playerId : state.enemyId);
  const dSpec = getDino(attacker === 'player' ? state.enemyId : state.playerId);
  const range = biteRange(aSpec, dSpec);
  if (dist(pos, target) > range) return;
  setCooldown(attacker, 'bite', COOLDOWNS.bite);
  const bot = attacker === 'player' ? player : enemy;
  startWorldCombat(bot, pos, target, 'lunge', minFightDist(aSpec, dSpec));
  animateBite(attacker);
  const defender = attacker === 'player' ? 'enemy' : 'player';
  const dmg = calcDmg(attacker, defender);
  setTimeout(() => {
    if (state.over) return;
    const p = attacker === 'player' ? playerPos : enemyPos;
    const t = attacker === 'player' ? enemyPos : playerPos;
    if (dist(p, t) <= range) {
      dealDamage(attacker, defender, dmg, 'bites');
    }
  }, 420);
}

function doCharge(attacker) {
  if (onCooldown(attacker, 'charge')) return;
  const ent = attacker === 'player' ? player : enemy;
  const pos = attacker === 'player' ? playerPos : enemyPos;
  const target = attacker === 'player' ? enemyPos : playerPos;
  const aSpec = getDino(attacker === 'player' ? state.playerId : state.enemyId);
  const dSpec = getDino(attacker === 'player' ? state.enemyId : state.playerId);
  setCooldown(attacker, 'charge', COOLDOWNS.charge);
  ent.aiState = 'rush';
  startWorldCombat(ent, pos, target, 'charge', minFightDist(aSpec, dSpec));
  animateCharge(attacker === 'player' ? playerFighter : enemyFighter);
  const defender = attacker === 'player' ? 'enemy' : 'player';
  setTimeout(() => {
    if (state.over) return;
    const p = attacker === 'player' ? playerPos : enemyPos;
    const t = attacker === 'player' ? enemyPos : playerPos;
    if (dist(p, t) <= minFightDist(aSpec, dSpec) + 2) {
      const dmg = calcDmg(attacker, defender, 1.5);
      dealDamage(attacker, defender, dmg, 'charges into');
      shakeCamera(0.35);
    }
  }, 780);
}

function doSpecial(attacker) {
  if (onCooldown(attacker, 'special')) return;
  const pos = attacker === 'player' ? playerPos : enemyPos;
  const target = attacker === 'player' ? enemyPos : playerPos;
  setCooldown(attacker, 'special', COOLDOWNS.special);
  specialSound();
  const spec = getDino(attacker === 'player' ? state.playerId : state.enemyId);
  const defender = attacker === 'player' ? 'enemy' : 'player';
  const defSpec = getDino(defender === 'player' ? state.playerId : state.enemyId);
  addLog(`${spec.name} uses ${spec.special}!`, 'log-special');
  animateSpecial(attacker === 'player' ? playerFighter : enemyFighter);
  if (spec.id === 'stegosaurus') {
    startCombatMotion(attacker === 'player' ? playerFighter : enemyFighter, 'tail');
    const defBot = defender === 'player' ? player : enemy;
    const defPos = defender === 'player' ? playerPos : enemyPos;
    const atkPos = attacker === 'player' ? playerPos : enemyPos;
    startWorldCombat(defBot, defPos, atkPos, 'knockback', minFightDist(defSpec, spec));
  }
  const defEnt = defender === 'player' ? player : enemy;
  let dmg = calcDmg(attacker, defender, 1.8);
  let stun = 0;
  switch (spec.id) {
    case 'dilophosaurus':
      stun = 2.5;
      dmg = calcDmg(attacker, defender, 1.2, 0.5);
      break;
    case 'indominus':
      dmg = calcDmg(attacker, defender, 2.0, 0.5);
      break;
    case 'parasaurolophus':
      stun = 1.5;
      dmg = calcDmg(attacker, defender, 0.8);
      break;
    case 'brachiosaurus':
      dmg = calcDmg(attacker, defender, 2.2);
      break;
    default:
      dmg = calcDmg(attacker, defender, 1.6);
  }
  setTimeout(() => {
    if (state.over) return;
    const posNow = attacker === 'player' ? playerPos : enemyPos;
    const tgtNow = attacker === 'player' ? enemyPos : playerPos;
    if (dist(posNow, tgtNow) <= 7 || spec.id === 'parasaurolophus' || spec.id === 'dilophosaurus') {
      if (stun) defEnt.stunned = stun;
      if (spec.id === 'brachiosaurus') {
        shakeCamera(0.6);
        spawnParticles(tgtNow, 0x8a7a50, 20);
      }
      if (spec.id === 'dilophosaurus') spawnParticles(tgtNow, 0x80ff40, 12);
      if (spec.id === 'parasaurolophus') spawnParticles(tgtNow, 0x80c0ff, 8);
      dealDamage(attacker, defender, dmg, `uses ${spec.special} on`);
    }
  }, 700);
}

function doRoar(attacker) {
  if (onCooldown(attacker, 'roar')) return;
  setCooldown(attacker, 'roar', COOLDOWNS.roar);
  roarSound(attacker === 'player' ? 90 : 70);
  const spec = getDino(attacker === 'player' ? state.playerId : state.enemyId);
  addLog(`${spec.name} ROARS!`, 'log-special');
  animateRoar(attacker);
  const defender = attacker === 'player' ? 'enemy' : 'player';
  const defEnt = defender === 'player' ? player : enemy;
  setTimeout(() => {
    if (state.over) return;
    const pos = attacker === 'player' ? playerPos : enemyPos;
    const target = attacker === 'player' ? enemyPos : playerPos;
    if (dist(pos, target) <= 11) {
      defEnt.stunned = Math.max(defEnt.stunned, 1.2);
      const dmg = Math.round(calcDmg(attacker, defender, 0.5));
      dealDamage(attacker, defender, dmg, 'roars at');
    }
  }, 600);
}

function animateBite(side) {
  const f = side === 'player' ? playerFighter : enemyFighter;
  startCombatMotion(f, 'bite');
}
function animateHit(side) {
  const f = side === 'player' ? playerFighter : enemyFighter;
  startCombatMotion(f, 'hit');
}
function animateRoar(side) {
  const f = side === 'player' ? playerFighter : enemyFighter;
  startCombatMotion(f, 'roar');
}
function animateCharge(fighter) { startCombatMotion(fighter, 'charge'); }
function animateSpecial(fighter) { startCombatMotion(fighter, 'special'); }

function spawnFloatText(pos, text, color) {
  floatTexts.push({ pos: pos.clone(), text, color, life: 1.5, y: 3 });
}

function spawnParticles(pos, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 2 + Math.random(), (Math.random() - 0.5) * 2)),
      vel: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8),
      life: 0.8 + Math.random() * 0.4,
      color,
    });
  }
}

let camShake = 0;
function shakeCamera(amount) { camShake = Math.max(camShake, amount); }
function flashDamage() {
  const el = document.getElementById('damage-flash');
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 200);
}

function updateBotAI(side, dt) {
  if (state.over) return;
  const bot = side === 'player' ? player : enemy;
  const myPos = side === 'player' ? playerPos : enemyPos;
  const theirPos = side === 'player' ? enemyPos : playerPos;
  const fighter = side === 'player' ? playerFighter : enemyFighter;
  const mySpec = getDino(side === 'player' ? state.playerId : state.enemyId);
  const theirSpec = getDino(side === 'player' ? state.enemyId : state.playerId);
  const minD = minFightDist(mySpec, theirSpec);
  const biteR = biteRange(mySpec, theirSpec);
  if (bot.stunned > 0) return;
  if (fighter?.combatBusy || bot.worldCombat) return;
  bot.aiTimer -= dt;
  if (bot.aiTimer > 0) return;
  bot.aiTimer = AI_DECISION_MIN + Math.random() * (AI_DECISION_MAX - AI_DECISION_MIN);
  const d = dist(myPos, theirPos);

  if (d > minD + 6) {
    if (!onCooldown(side, 'charge') && Math.random() < 0.4) {
      doCharge(side);
      return;
    }
    bot.aiState = 'stalk';
    return;
  }

  if (d <= minD + 2 && bot.aiState === 'clash') {
    const roll = Math.random();
    if (roll < 0.55 && !onCooldown(side, 'bite')) { doBite(side); return; }
    if (roll < 0.72 && !onCooldown(side, 'charge')) { doCharge(side); return; }
  }

  const roll = Math.random();
  if (roll < 0.42 && !onCooldown(side, 'bite') && d <= biteR) doBite(side);
  else if (roll < 0.58 && !onCooldown(side, 'special') && d <= biteR + 1) doSpecial(side);
  else if (roll < 0.72 && !onCooldown(side, 'roar') && d <= minD + 8) doRoar(side);
  else if (roll < 0.85 && !onCooldown(side, 'charge')) doCharge(side);
  else if (!onCooldown(side, 'bite') && d <= biteR) doBite(side);
  else {
    bot.aiState = Math.random() < 0.5 ? 'circle' : 'rush';
    bot.stateTimer = 1.5 + Math.random() * 2;
  }
}

function updateFreeCamera(dt) {
  if (!orbitControls?.enabled || state.screen !== 'fight') return;
  const speed = 16 * dt;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.001) return;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  if (keys['w'] || keys['arrowup']) orbitControls.target.addScaledVector(forward, speed);
  if (keys['s'] || keys['arrowdown']) orbitControls.target.addScaledVector(forward, -speed);
  if (keys['a'] || keys['arrowleft']) orbitControls.target.addScaledVector(right, -speed);
  if (keys['d'] || keys['arrowright']) orbitControls.target.addScaledVector(right, speed);
  if (keys['q']) orbitControls.target.y = Math.max(0.5, orbitControls.target.y - speed * 0.6);
  if (keys['e']) orbitControls.target.y = Math.min(25, orbitControls.target.y + speed * 0.6);
}

async function startFight() {
  if (!state.playerId || !state.enemyId) return;
  setLoading(true, 0.2, 'Spawning fighters…');
  state.screen = 'fight';
  state.over = false;
  state.winner = null;
  state.fightTime = 0;
  state.log = [];
  const pSpec = getDino(state.playerId);
  const eSpec = getDino(state.enemyId);
  player.hp = player.maxHp = Math.round(pSpec.hp * FIGHT_HP_MULT);
  player.cds = {}; player.stunned = 0; player.aiTimer = 2.5;
  initCombatState(player);
  enemy.hp = enemy.maxHp = Math.round(eSpec.hp * FIGHT_HP_MULT);
  enemy.cds = {}; enemy.stunned = 0; enemy.aiTimer = 3;
  initCombatState(enemy);
  const spawnDist = minFightDist(pSpec, eSpec) + 10;
  playerPos.set(-spawnDist * 0.5, 0, 0);
  enemyPos.set(spawnDist * 0.5, 0, 0);

  disposeFighter(playerFighter);
  disposeFighter(enemyFighter);
  playerFighter = null;
  enemyFighter = null;
  mixers.length = 0;

  try {
    const [pF, eF] = await Promise.all([
      spawnFighter(pSpec, 'player'),
      spawnFighter(eSpec, 'enemy'),
    ]);
    playerFighter = pF;
    enemyFighter = eF;
    playerGroup = pF.group;
    enemyGroup = eF.group;
    scene.add(playerGroup);
    scene.add(enemyGroup);
  } catch (err) {
    console.error(err);
    setLoading(false);
    alert('Failed to load dinosaur models. Please refresh and try again.');
    return;
  }

  setLoading(false);
  showScreen('fight');
  document.getElementById('player-name').textContent = pSpec.name;
  document.getElementById('enemy-name').textContent = eSpec.name;
  if (orbitControls) {
    orbitControls.target.set(0, 2.5, 0);
    orbitControls.enabled = true;
    camera.position.set(0, 8, 24);
    orbitControls.update();
  }
  updateHud();
  addLog(`Battle begins! ${pSpec.name} vs ${eSpec.name}`, 'log-special');
  addLog('Drag to rotate camera · Scroll to zoom', '');
}

function endFight(winner) {
  state.over = true;
  state.winner = winner;
  const pSpec = getDino(state.playerId);
  const eSpec = getDino(state.enemyId);
  const loser = winner === 'player' ? enemyFighter : playerFighter;
  if (loser?.actions.death) {
    startCombatMotion(loser, 'death');
  } else if (loser) {
    startCombatMotion(loser, 'death');
  }
  setTimeout(() => {
    showScreen('victory');
    const winnerSpec = winner === 'player' ? pSpec : eSpec;
    const loserSpec = winner === 'player' ? eSpec : pSpec;
    document.getElementById('victory-icon').textContent = '🏆';
    document.getElementById('victory-title').textContent = 'FIGHT OVER';
    document.getElementById('victory-msg').textContent = `${winnerSpec.name} defeats ${loserSpec.name}!`;
    const winnerHp = winner === 'player' ? player.hp : enemy.hp;
    document.getElementById('victory-stats').innerHTML = `
      <div><strong>${Math.round(state.fightTime)}s</strong>Battle Time</div>
      <div><strong>${winnerHp}</strong>Winner HP Left</div>
      <div><strong>${winnerSpec.name}</strong>Champion</div>
    `;
    tone(300, 0.3); setTimeout(() => tone(400, 0.3), 200); setTimeout(() => tone(500, 0.4), 400);
  }, 1500);
}

function updateHud() {
  const pPct = (player.hp / player.maxHp) * 100;
  const ePct = (enemy.hp / enemy.maxHp) * 100;
  document.getElementById('player-hp').style.width = pPct + '%';
  document.getElementById('enemy-hp').style.width = ePct + '%';
  document.getElementById('player-hp-text').textContent = `${player.hp} / ${player.maxHp}`;
  document.getElementById('enemy-hp-text').textContent = `${enemy.hp} / ${enemy.maxHp}`;
  const mins = Math.floor(state.fightTime / 60);
  const secs = Math.floor(state.fightTime % 60);
  document.getElementById('round-timer').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function addLog(msg, cls = '') {
  state.log.unshift({ msg, cls });
  if (state.log.length > 6) state.log.pop();
  document.getElementById('combat-log').innerHTML = state.log.map(l => `<div class="${l.cls}">${l.msg}</div>`).join('');
}

function showScreen(name) {
  document.getElementById('menu').classList.toggle('hidden', name !== 'menu');
  document.getElementById('select').classList.toggle('hidden', name !== 'select');
  document.getElementById('lab').classList.toggle('hidden', name !== 'lab');
  document.getElementById('hud').classList.toggle('hidden', name !== 'fight');
  document.getElementById('victory').classList.toggle('hidden', name !== 'victory');
  if (orbitControls) {
    orbitControls.enabled = true;
    if (name === 'menu' || name === 'select' || name === 'lab') {
      camera.position.set(15, 22, 40);
      orbitControls.target.set(0, 0, -15);
      orbitControls.update();
    }
  }
  if (name === 'lab') { buildLabGrid(); renderHybridList(); updateLabPreview(); }
  state.screen = name;
}

function buildDinoGrid() {
  const grid = document.getElementById('dino-grid');
  grid.innerHTML = '';
  Object.values(allDinos()).forEach(d => {
    const card = document.createElement('div');
    card.className = 'dino-card' + (d.hybrid ? ' hybrid-card' : '');
    card.dataset.id = d.id;
    card.innerHTML = `
      <div class="dino-emoji">${d.emoji}</div>
      <div class="dino-name">${d.name}</div>
      ${d.hybrid ? `<div class="hybrid-badge">MUTATION ${d.mutation}%</div>` : ''}
      <div class="dino-stats">
        <span>HP <span class="stat-val">${d.hp}</span></span>
        <span>ATK <span class="stat-val">${d.atk}</span></span>
        <span>DEF <span class="stat-val">${d.def}</span></span>
        <span>SPD <span class="stat-val">${d.spd}</span></span>
      </div>
    `;
    card.addEventListener('click', () => selectDino(d.id));
    card.addEventListener('mouseenter', (e) => showTooltip(e, d));
    card.addEventListener('mouseleave', hideTooltip);
    grid.appendChild(card);
  });
}

function buildLabGrid() {
  const grid = document.getElementById('lab-dino-grid');
  if (!grid) return;
  grid.innerHTML = '';
  Object.values(allDinos()).filter(d => !d.hybrid).forEach(d => {
    const card = document.createElement('div');
    card.className = 'dino-card lab-card';
    card.dataset.id = d.id;
    card.innerHTML = `<div class="dino-emoji">${d.emoji}</div><div class="dino-name">${d.name}</div>`;
    card.addEventListener('click', () => selectLabParent(d.id));
    grid.appendChild(card);
  });
}

function selectLabParent(id) {
  const d = getDino(id);
  if (!state.labParentA || (state.labParentA && state.labParentB)) {
    state.labParentA = id;
    state.labParentB = null;
    document.getElementById('lab-parent-a').textContent = d.name;
    document.getElementById('lab-parent-a').classList.remove('empty');
    document.getElementById('lab-parent-b').textContent = 'Select second parent';
    document.getElementById('lab-parent-b').classList.add('empty');
  } else if (id !== state.labParentA) {
    state.labParentB = id;
    document.getElementById('lab-parent-b').textContent = d.name;
    document.getElementById('lab-parent-b').classList.remove('empty');
  }
  document.querySelectorAll('.lab-card').forEach(c => {
    c.classList.toggle('selected-player', c.dataset.id === state.labParentA);
    c.classList.toggle('selected-enemy', c.dataset.id === state.labParentB);
  });
  updateLabPreview();
}

function updateLabPreview() {
  const mut = parseInt(document.getElementById('mutation-slider')?.value || 50, 10);
  const preview = document.getElementById('lab-preview');
  const btn = document.getElementById('create-hybrid-btn');
  if (!state.labParentA || !state.labParentB) {
    if (preview) preview.innerHTML = '<p class="lab-empty">Select two parent dinosaurs to preview the hybrid.</p>';
    if (btn) btn.disabled = true;
    return;
  }
  const hybrid = createHybrid(DINOS, state.labParentA, state.labParentB, mut);
  if (preview) {
    preview.innerHTML = `
      <div class="lab-preview-card">
        <div class="preview-emoji">${hybrid.emoji}</div>
        <div class="preview-name">${hybrid.name}</div>
        <div class="preview-stats">
          <span>HP ${hybrid.hp}</span><span>ATK ${hybrid.atk}</span>
          <span>DEF ${hybrid.def}</span><span>SPD ${hybrid.spd}</span>
        </div>
        <div class="preview-special">${hybrid.special}</div>
        <div class="preview-desc">${hybrid.desc}</div>
      </div>`;
  }
  if (btn) btn.disabled = false;
}

function confirmHybrid() {
  const mut = parseInt(document.getElementById('mutation-slider').value, 10);
  if (!state.labParentA || !state.labParentB) return;
  const hybrid = createHybrid(DINOS, state.labParentA, state.labParentB, mut);
  state.customHybrids[hybrid.id] = hybrid;
  buildDinoGrid();
  renderHybridList();
  tone(220, 0.2); setTimeout(() => tone(330, 0.3), 150); setTimeout(() => tone(440, 0.4), 300);
  document.getElementById('lab-result').textContent = `Created: ${hybrid.name}!`;
  document.getElementById('lab-result').classList.remove('hidden');
}

function renderHybridList() {
  const list = document.getElementById('hybrid-list');
  if (!list) return;
  const hybrids = Object.values(state.customHybrids);
  if (!hybrids.length) {
    list.innerHTML = '<p class="lab-empty">No hybrids created yet.</p>';
    return;
  }
  list.innerHTML = hybrids.map(h => `
    <div class="hybrid-item">
      <span>${h.emoji} ${h.name}</span>
      <span class="hybrid-mut">${h.mutation}%</span>
    </div>`).join('');
}

function selectDino(id) {
  const d = getDino(id);
  if (!state.playerId || (state.playerId && state.enemyId)) {
    state.playerId = id;
    state.enemyId = null;
    state.selectMode = 'enemy';
    document.getElementById('player-pick').textContent = d.name;
    document.getElementById('player-pick').classList.remove('empty');
    document.getElementById('enemy-pick').textContent = 'Click opponent';
    document.getElementById('enemy-pick').classList.add('empty');
  } else if (state.selectMode === 'enemy' && id !== state.playerId) {
    state.enemyId = id;
    document.getElementById('enemy-pick').textContent = d.name;
    document.getElementById('enemy-pick').classList.remove('empty');
  } else if (state.selectMode === 'enemy' && id === state.playerId) {
    return;
  } else {
    state.playerId = id;
    document.getElementById('player-pick').textContent = d.name;
  }
  updateCardSelection();
  document.getElementById('fight-btn').disabled = !(state.playerId && state.enemyId);
}

function updateCardSelection() {
  document.querySelectorAll('.dino-card').forEach(c => {
    c.classList.remove('selected-player', 'selected-enemy');
    if (c.dataset.id === state.playerId) c.classList.add('selected-player');
    if (c.dataset.id === state.enemyId) c.classList.add('selected-enemy');
  });
}

function randomMatch() {
  const ids = Object.keys(allDinos());
  state.playerId = ids[Math.floor(Math.random() * ids.length)];
  do { state.enemyId = ids[Math.floor(Math.random() * ids.length)]; } while (state.enemyId === state.playerId);
  document.getElementById('player-pick').textContent = getDino(state.playerId).name;
  document.getElementById('player-pick').classList.remove('empty');
  document.getElementById('enemy-pick').textContent = getDino(state.enemyId).name;
  document.getElementById('enemy-pick').classList.remove('empty');
  updateCardSelection();
  document.getElementById('fight-btn').disabled = false;
  startFight();
}

function showTooltip(e, d) {
  const tip = document.getElementById('dino-tooltip');
  tip.innerHTML = `<strong>${d.name}</strong><br>${d.desc}<br><em>${d.era} · ${d.type}</em><br>Special: <strong>${d.special}</strong>`;
  tip.classList.remove('hidden');
  tip.style.left = (e.clientX + 12) + 'px';
  tip.style.top = (e.clientY + 12) + 'px';
}
function hideTooltip() { document.getElementById('dino-tooltip').classList.add('hidden'); }

function setupInput() {
  window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  document.getElementById('play-btn').addEventListener('click', () => {
    state.playerId = null; state.enemyId = null;
    document.getElementById('player-pick').textContent = 'Click a dinosaur';
    document.getElementById('player-pick').classList.add('empty');
    document.getElementById('enemy-pick').textContent = 'Click a dinosaur';
    document.getElementById('enemy-pick').classList.add('empty');
    document.getElementById('fight-btn').disabled = true;
    updateCardSelection();
    showScreen('select');
  });
  document.getElementById('quick-btn').addEventListener('click', () => randomMatch());
  document.getElementById('lab-btn').addEventListener('click', () => {
    state.labParentA = null; state.labParentB = null;
    document.getElementById('lab-parent-a').textContent = 'Select first parent';
    document.getElementById('lab-parent-a').classList.add('empty');
    document.getElementById('lab-parent-b').textContent = 'Select second parent';
    document.getElementById('lab-parent-b').classList.add('empty');
    document.getElementById('lab-result').classList.add('hidden');
    showScreen('lab');
  });
  document.getElementById('lab-back-btn').addEventListener('click', () => showScreen('menu'));
  document.getElementById('lab-fight-btn').addEventListener('click', () => showScreen('select'));
  document.getElementById('create-hybrid-btn').addEventListener('click', confirmHybrid);
  document.getElementById('mutation-slider').addEventListener('input', () => {
    document.getElementById('mutation-val').textContent = document.getElementById('mutation-slider').value + '%';
    updateLabPreview();
  });
  document.getElementById('fight-btn').addEventListener('click', startFight);
  document.getElementById('random-btn').addEventListener('click', randomMatch);
  document.getElementById('rematch-btn').addEventListener('click', startFight);
  document.getElementById('menu-btn').addEventListener('click', () => showScreen('menu'));
}

function update(dt) {
  mixers.forEach(m => m.update(dt));
  if (state.screen !== 'fight' || state.over || !playerGroup || !enemyGroup) return;
  state.fightTime += dt;
  const pSpec = getDino(state.playerId);
  const eSpec = getDino(state.enemyId);
  ['bite', 'charge', 'special', 'roar'].forEach(ab => {
    if (player.cds[ab] > 0) player.cds[ab] -= dt;
    if (enemy.cds[ab] > 0) enemy.cds[ab] -= dt;
  });

  let playerMoving = false;
  if (player.stunned > 0) player.stunned -= dt;
  else {
    playerMoving = updateCombatMovement(player, playerPos, enemyPos, pSpec, eSpec, dt, ARENA_R);
    updateBotAI('player', dt);
  }

  let enemyMoving = false;
  if (enemy.stunned > 0) enemy.stunned -= dt;
  else {
    enemyMoving = updateCombatMovement(enemy, enemyPos, playerPos, eSpec, pSpec, dt, ARENA_R);
    updateBotAI('enemy', dt);
  }

  separateFighters(playerPos, enemyPos, minFightDist(pSpec, eSpec), ARENA_R);

  const playerRunning = player.worldCombat?.type === 'charge' || player.aiState === 'rush';
  const enemyRunning = enemy.worldCombat?.type === 'charge' || enemy.aiState === 'rush';
  updateFighterMotion(playerFighter, playerMoving, playerRunning, dt);
  updateFighterMotion(enemyFighter, enemyMoving, enemyRunning, dt);

  playerGroup.position.set(playerPos.x, playerPos.y || 0, playerPos.z);
  enemyGroup.position.set(enemyPos.x, enemyPos.y || 0, enemyPos.z);
  const pToE = Math.atan2(enemyPos.x - playerPos.x, enemyPos.z - playerPos.z);
  const eToP = Math.atan2(playerPos.x - enemyPos.x, playerPos.z - enemyPos.z);
  if (!player.worldCombat && player.stunned <= 0) playerGroup.rotation.y = pToE;
  if (!enemy.worldCombat && enemy.stunned <= 0) enemyGroup.rotation.y = eToP;

  if (camShake > 0 && orbitControls) {
    orbitControls.target.x += (Math.random() - 0.5) * camShake * 0.4;
    orbitControls.target.z += (Math.random() - 0.5) * camShake * 0.4;
    camShake -= dt * 2;
    if (camShake < 0) camShake = 0;
  }
  updateHud();
}

function updateParticles(dt) {
  particles = particles.filter(p => {
    p.life -= dt;
    p.pos.add(p.vel.clone().multiplyScalar(dt));
    p.vel.y -= 12 * dt;
    return p.life > 0;
  });
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();
  update(dt);
  updatePark(dt, elapsed);
  if (orbitControls?.enabled) {
    updateFreeCamera(dt);
    orbitControls.update();
  }
  updateParticles(dt);
  floatTexts = floatTexts.filter(ft => { ft.life -= dt; ft.y += dt; return ft.life > 0; });
  renderer.render(scene, camera);
}

try {
  initThree();
  buildDinoGrid();
  setupInput();
  showScreen('menu');
  animate();
  preloadModels().catch(err => {
    console.error('Model preload failed:', err);
    const el = document.getElementById('load-error');
    el.style.display = 'block';
    el.textContent = 'Failed to load 3D models: ' + err.message;
  });
} catch (err) {
  console.error(err);
  const el = document.getElementById('load-error');
  el.style.display = 'block';
  el.textContent = 'Failed to load game: ' + err.message;
}

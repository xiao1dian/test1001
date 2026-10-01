import { getHybridMeshId } from './dino-models.js';

const NAME_PARTS = {
  carnivore: ['Rex', 'Claw', 'Fang', 'Ripper', 'Hunter', 'Strike'],
  herbivore: ['Shield', 'Horns', 'Plate', 'Titan', 'Guard', 'Ram'],
  hybrid: ['Indominus', 'Chimera', 'Abomination', 'Fusion', 'Mutant', 'Prime'],
  aquatic: ['Leviathan', 'Depth', 'Surge', 'Tide', 'Apex'],
};

const PREFIXES = ['Neo', 'Alpha', 'Omega', 'Ultra', 'Mega', 'Proto', 'Cyber', 'Dark'];

function lerp(a, b, t) { return a + (b - a) * t; }

function blendHex(c1, c2, t) {
  if (c1 == null && c2 == null) return undefined;
  if (c1 == null) return c2;
  if (c2 == null) return c1;
  const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
  const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
  return (Math.round(lerp(r1, r2, t)) << 16) | (Math.round(lerp(g1, g2, t)) << 8) | Math.round(lerp(b1, b2, t));
}

function pickModel(a, b, mutation) {
  const meshId = getHybridMeshId(a, b, mutation);
  return meshId;
}

function hybridName(a, b, mutation) {
  const pool = mutation > 50 ? NAME_PARTS.hybrid : [...NAME_PARTS.carnivore, ...NAME_PARTS.herbivore];
  const prefix = mutation > 30 ? PREFIXES[Math.floor(Math.random() * PREFIXES.length)] + ' ' : '';
  const part = pool[Math.floor(Math.random() * pool.length)];
  const aShort = a.name.split(' ').pop().replace(/saurus|raptor|titan/gi, '').slice(0, 5);
  const bShort = b.name.split(' ').pop().replace(/saurus|raptor|titan/gi, '').slice(0, 5);
  return `${prefix}${aShort}${bShort} ${part}`;
}

function hybridSpecial(a, b, mutation) {
  const specials = [a.special, b.special];
  if (mutation > 60) return `Mutated ${specials[Math.floor(Math.random() * specials.length)]}`;
  return `${a.special.split(' ')[0]}-${b.special.split(' ')[0]} Fusion`;
}

export function createHybrid(baseDinos, parentAId, parentBId, mutationPct) {
  const a = baseDinos[parentAId];
  const b = baseDinos[parentBId];
  if (!a || !b) return null;

  const mut = Math.max(0, Math.min(100, mutationPct)) / 100;
  const t = 0.5 + (Math.random() - 0.5) * mut * 0.5;
  const boost = 1 + mut * 0.25;

  const id = `hybrid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const meshId = pickModel(a, b, mutationPct);

  return {
    id,
    name: hybridName(a, b, mutationPct),
    emoji: mutationPct > 75 ? '👹' : mutationPct > 40 ? '🧬' : '🔬',
    hp: Math.round(lerp(a.hp, b.hp, t) * boost),
    atk: Math.round(lerp(a.atk, b.atk, t) * boost),
    def: Math.round(lerp(a.def, b.def, t) * boost),
    spd: Math.round(lerp(a.spd, b.spd, t) * (1 + mut * 0.1)),
    scale: lerp(a.scale, b.scale, t),
    meshId,
    modelScale: lerp(a.modelScale || 1, b.modelScale || 1, t) * (1 + mut * 0.15),
    height: lerp(a.height || 2.5, b.height || 2.5, t) * (1 + mut * 0.1),
    tint: blendHex(a.tint, b.tint, t),
    special: hybridSpecial(a, b, mutationPct),
    desc: `Gen-lab hybrid of ${a.name} + ${b.name}. Mutation: ${mutationPct}%.`,
    type: 'hybrid',
    era: 'InGen Laboratory',
    hybrid: true,
    parents: [parentAId, parentBId],
    mutation: mutationPct,
  };
}

export function getAllDinos(baseDinos, customHybrids) {
  return { ...baseDinos, ...customHybrids };
}

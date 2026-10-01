import * as THREE from 'three';

const mat = (color, rough = 0.65, metal = 0.05) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

function part(geo, material, pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildTheropodBase(color, belly, opts = {}) {
  const g = new THREE.Group();
  const body = part(new THREE.CapsuleGeometry(0.7 * opts.s, 1.8 * opts.s, 8, 16), mat(color), [0, 1.1 * opts.s, 0]);
  const bellyM = part(new THREE.SphereGeometry(0.55 * opts.s, 12, 8), mat(belly), [0, 0.9 * opts.s, 0.2 * opts.s], [0.3, 0, 0], [1.4, 0.8, 1.6]);
  g.add(body, bellyM);
  const neck = part(new THREE.CylinderGeometry(0.25 * opts.s, 0.4 * opts.s, 0.9 * opts.s, 8), mat(color), [0, 1.8 * opts.s, 0.5 * opts.s], [-0.5, 0, 0]);
  const head = part(new THREE.BoxGeometry(0.9 * opts.s, 0.55 * opts.s, 1.1 * opts.s), mat(color), [0, 2.2 * opts.s, 1.0 * opts.s]);
  const jaw = part(new THREE.BoxGeometry(0.75 * opts.s, 0.2 * opts.s, 0.9 * opts.s), mat(belly), [0, 1.95 * opts.s, 1.15 * opts.s]);
  g.add(neck, head, jaw);
  const tail = part(new THREE.ConeGeometry(0.35 * opts.s, 2.2 * opts.s, 8), mat(color), [0, 0.9 * opts.s, -1.5 * opts.s], [1.2, 0, 0]);
  g.add(tail);
  for (const [x, z] of [[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.4], [0.5, -0.4]]) {
    g.add(part(new THREE.CylinderGeometry(0.1 * opts.s, 0.14 * opts.s, 0.9 * opts.s, 6), mat(color), [x * opts.s, 0.45 * opts.s, z * opts.s]));
  }
  return g;
}

const BUILDERS = {
  triceratops(s, tint) {
    const g = new THREE.Group();
    const c = tint || 0x8a7050;
    g.add(part(new THREE.SphereGeometry(1.1 * s, 16, 12), mat(c), [0, 1.3 * s, 0], [0, 0, 0], [1.4, 1, 1.6]));
    const frill = part(new THREE.CircleGeometry(1.1 * s, 12), mat(c), [0, 1.8 * s, -0.3 * s], [-1.2, 0, 0]);
    g.add(frill);
    [[-0.35, 0.7], [0, 0.95], [0.35, 0.7]].forEach(([x, h], i) => {
      g.add(part(new THREE.ConeGeometry(0.1 * s, h * s, 6), mat(0xddd0b0), [x * s, (1.8 + h * 0.3) * s, 1.2 * s]));
    });
    g.add(part(new THREE.BoxGeometry(0.8 * s, 0.45 * s, 1.0 * s), mat(c), [0, 1.5 * s, 1.0 * s]));
    for (const x of [-0.7, 0.7]) {
      for (const z of [-0.5, 0.6]) {
        g.add(part(new THREE.CylinderGeometry(0.18 * s, 0.22 * s, 0.8 * s, 8), mat(c), [x * s, 0.4 * s, z * s]));
      }
    }
    return g;
  },

  spinosaurus(s, tint) {
    const g = buildTheropodBase(tint || 0x3a6a4a, 0x5a8a6a, { s });
    for (let i = 0; i < 8; i++) {
      const h = (0.6 + i * 0.15) * s;
      g.add(part(new THREE.BoxGeometry(0.06 * s, h, 0.35 * s), mat(0xc04040), [0, (1.5 + h * 0.4) * s, (-0.5 + i * 0.35) * s]));
    }
    g.add(part(new THREE.BoxGeometry(0.5 * s, 0.25 * s, 1.8 * s), mat(tint || 0x3a6a4a), [0, 2.0 * s, 1.5 * s])); // long snout
    return g;
  },

  dilophosaurus(s, tint) {
    const g = buildTheropodBase(tint || 0x6a9a5a, 0x8ab88a, { s: s * 0.85 });
    [-0.3, 0.3].forEach(x => {
      g.add(part(new THREE.CircleGeometry(0.35 * s, 8), mat(0xc06060), [x * s, 2.6 * s, 0.9 * s], [-0.3, x > 0 ? -0.5 : 0.5, 0]));
    });
    return g;
  },

  ankylosaurus(s, tint) {
    const g = new THREE.Group();
    const c = tint || 0x4a4035;
    g.add(part(new THREE.SphereGeometry(1.0 * s, 14, 10), mat(c), [0, 0.8 * s, 0], [0, 0, 0], [1.8, 0.9, 2.2]));
    for (let i = 0; i < 14; i++) {
      g.add(part(new THREE.BoxGeometry(0.15 * s, 0.1 * s, 0.12 * s), mat(0x2a2018), [(Math.random() - 0.5) * s, (0.9 + Math.random() * 0.5) * s, (Math.random() - 0.5) * 1.5 * s]));
    }
    for (const x of [-0.6, 0.6]) {
      for (const z of [-0.4, 0.5]) {
        g.add(part(new THREE.CylinderGeometry(0.15 * s, 0.18 * s, 0.55 * s, 8), mat(c), [x * s, 0.28 * s, z * s]));
      }
    }
    g.add(part(new THREE.SphereGeometry(0.4 * s, 10, 8), mat(0x2a2018), [0, 0.55 * s, -1.5 * s], [0, 0, 0], [1.2, 1, 1.4]));
    g.add(part(new THREE.BoxGeometry(0.7 * s, 0.35 * s, 0.7 * s), mat(c), [0, 0.75 * s, 1.0 * s]));
    return g;
  },

  carnotaurus(s, tint) {
    const g = buildTheropodBase(tint || 0xa05030, 0xc07050, { s: s * 1.05 });
    [-0.25, 0.25].forEach(x => {
      g.add(part(new THREE.ConeGeometry(0.12 * s, 0.35 * s, 6), mat(0xeee0c0), [x * s, 2.55 * s, 1.1 * s], [-0.4, 0, 0]));
    });
    return g;
  },

  allosaurus(s, tint) {
    const g = buildTheropodBase(tint || 0x5a7a40, 0x7a9a60, { s: s * 1.1 });
    g.add(part(new THREE.BoxGeometry(0.15 * s, 0.12 * s, 0.5 * s), mat(0x888870), [0, 2.45 * s, 0.85 * s])); // crest
    return g;
  },

  parasaurolophus(s, tint) {
    const g = new THREE.Group();
    const c = tint || 0xb09060;
    g.add(part(new THREE.CapsuleGeometry(0.65 * s, 1.6 * s, 8, 12), mat(c), [0, 1.1 * s, 0]));
    g.add(part(new THREE.BoxGeometry(0.6 * s, 0.4 * s, 0.8 * s), mat(c), [0, 1.4 * s, 0.8 * s]));
    const crest = part(new THREE.TorusGeometry(0.4 * s, 0.08 * s, 6, 16, Math.PI), mat(c), [0, 2.2 * s, 0.3 * s], [Math.PI / 2, 0, Math.PI / 2]);
    g.add(crest);
    for (const x of [-0.55, 0.55]) {
      for (const z of [-0.4, 0.5]) {
        g.add(part(new THREE.CylinderGeometry(0.12 * s, 0.15 * s, 0.85 * s, 8), mat(c), [x * s, 0.42 * s, z * s]));
      }
    }
    return g;
  },

  pteranodon(s, tint) {
    const g = new THREE.Group();
    const c = tint || 0x908070;
    g.add(part(new THREE.CapsuleGeometry(0.25 * s, 0.8 * s, 6, 10), mat(c), [0, 1.5 * s, 0]));
    g.add(part(new THREE.ConeGeometry(0.12 * s, 0.5 * s, 4), mat(0xc04040), [0, 1.9 * s, 0.5 * s], [-0.8, 0, 0]));
    const wingMat = mat(c, 0.8); wingMat.side = THREE.DoubleSide;
    [-1, 1].forEach(side => {
      g.add(part(new THREE.PlaneGeometry(2.5 * s, 0.9 * s), wingMat, [side * 1.3 * s, 1.5 * s, 0], [0, side * 0.4, 0.1]));
    });
    g.add(part(new THREE.ConeGeometry(0.08 * s, 0.35 * s, 4), mat(c), [0, 1.65 * s, 0.45 * s]));
    return g;
  },

  compsognathus(s, tint) {
    return buildTheropodBase(tint || 0x9a8a60, 0xb0a080, { s: s * 0.45 });
  },

  brachiosaurus(s, tint) {
    const g = new THREE.Group();
    const c = tint || 0x7a6848;
    g.add(part(new THREE.CapsuleGeometry(1.4 * s, 3.0 * s, 10, 16), mat(c), [0, 2.0 * s, 0], [0, 0, 0], [1.2, 1, 1.4]));
    const neck = part(new THREE.CylinderGeometry(0.35 * s, 0.55 * s, 4.5 * s, 10), mat(c), [0, 4.5 * s, 0.8 * s], [0.25, 0, 0]);
    g.add(neck);
    g.add(part(new THREE.SphereGeometry(0.55 * s, 12, 10), mat(c), [0, 6.8 * s, 1.5 * s]));
    const tail = part(new THREE.ConeGeometry(0.5 * s, 3.0 * s, 8), mat(c), [0, 1.5 * s, -2.5 * s], [1.0, 0, 0]);
    g.add(tail);
    for (const x of [-0.9, 0.9]) {
      for (const z of [-0.8, 0.9, -1.8]) {
        g.add(part(new THREE.CylinderGeometry(0.28 * s, 0.35 * s, 1.6 * s, 8), mat(c), [x * s, 0.8 * s, z * s]));
      }
    }
    return g;
  },

  giganotosaurus(s, tint) {
    const g = buildTheropodBase(tint || 0x556b2f, 0x708040, { s: s * 1.35 });
    g.add(part(new THREE.BoxGeometry(0.12 * s, 0.1 * s, 0.6 * s), mat(0x888870), [0, 2.5 * s, 0.9 * s]));
    return g;
  },

  mosasaurus(s, tint) {
    const c = tint || 0x2a5a6a;
    const g = new THREE.Group();
    g.add(part(new THREE.CapsuleGeometry(0.9 * s, 5 * s, 8, 16), mat(c), [0.5 * s, 0, 0], [0, 0, Math.PI / 2]));
    g.add(part(new THREE.ConeGeometry(0.7 * s, 3.5 * s, 8), mat(c), [-3.8 * s, 0, 0], [0, 0, Math.PI / 2]));
    g.add(part(new THREE.BoxGeometry(1.2 * s, 0.8 * s, 1.4 * s), mat(c), [3.2 * s, 0.2 * s, 0]));
    return g;
  },
};

// Which species use rigged 3D models (unique mesh per species)
export const RIGGED_SPECIES = {
  trex: 'trex_fabulous',
  raptor: 'quaternius_velociraptor',
  stegosaurus: 'world_stegosaurus',
  triceratops: 'quaternius_triceratops',
  spinosaurus: 'hunting_spinosaurus',
  parasaurolophus: 'quaternius_parasaurolophus',
  brachiosaurus: 'hunting_brachiosaurus',
  pteranodon: 'hunting_rhamphorhynchus',
  indominus: 'indominus_jwe',
  indoraptor: 'indoraptor',
};

export function usesRiggedModel(speciesId) {
  return !!RIGGED_SPECIES[speciesId];
}

export function getRiggedModelKey(speciesId) {
  return RIGGED_SPECIES[speciesId] || null;
}

// Back-compat aliases used by dino.js
export const usesGltf = usesRiggedModel;
export const getGltfKey = getRiggedModelKey;

export function buildSpeciesMesh(speciesId, spec) {
  const s = spec.modelScale || 1;
  const builder = BUILDERS[speciesId];
  if (builder) return builder(s, spec.tint);
  // Fallback generic theropod
  return buildTheropodBase(spec.tint || 0x6a7a5a, 0x8a9a7a, { s });
}

export function isProceduralSpecies(speciesId) {
  return !usesGltf(speciesId);
}

export function getHybridMeshId(parentA, parentB, mutation) {
  if (mutation > 70) return 'indominus';
  if (mutation > 45) return Math.random() > 0.5 ? parentA.id : parentB.id;
  return parentA.id;
}

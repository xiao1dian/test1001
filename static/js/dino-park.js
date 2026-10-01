import * as THREE from 'three';

let parkGroup, waterMesh, waterMat;
const visitors = [];
const mosasaurs = [];
let parkTime = 0;

function buildVisitor(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 4, 8), bodyMat);
  body.position.y = 0.72;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), skinMat);
  head.position.y = 1.25;
  g.add(head);
  if (Math.random() > 0.5) {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), new THREE.MeshStandardMaterial({ color: 0xf5f5dc }));
    hat.position.y = 1.42;
    g.add(hat);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function buildMosasaurMesh(scale = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a5a6a, roughness: 0.55, metalness: 0.15 });
  const belly = new THREE.MeshStandardMaterial({ color: 0x6a8a9a, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9 * scale, 5 * scale, 8, 16), mat);
  body.rotation.z = Math.PI / 2;
  body.position.x = 0.5 * scale;
  g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.7 * scale, 3.5 * scale, 8), mat);
  tail.rotation.z = -Math.PI / 2;
  tail.position.x = -3.8 * scale;
  g.add(tail);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 0.8 * scale, 1.4 * scale), mat);
  head.position.set(3.2 * scale, 0.2 * scale, 0);
  g.add(head);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(1.0 * scale, 0.25 * scale, 1.1 * scale), belly);
  jaw.position.set(3.5 * scale, -0.15 * scale, 0);
  g.add(jaw);
  [[-0.5, 0.6], [-0.5, -0.6], [0.8, 0.7], [0.8, -0.7]].forEach(([fx, fz]) => {
    const flip = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 0.08 * scale, 0.5 * scale), mat);
    flip.position.set(fx * scale, -0.3 * scale, fz * scale);
    g.add(flip);
  });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function buildFenceSegment(len) {
  const g = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i <= len; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 0.12), postMat);
    post.position.set(i * 2 - len, 1.4, 0);
    g.add(post);
  }
  for (let w = 0; w < 5; w++) {
    const wire = new THREE.Mesh(new THREE.BoxGeometry(len * 2, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x332200 }));
    wire.position.set(0, 0.8 + w * 0.45, 0);
    g.add(wire);
  }
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.08), new THREE.MeshStandardMaterial({ color: 0xcc0000 }));
  sign.position.set(0, 3.2, 0.1);
  g.add(sign);
  return g;
}

function buildBleachers() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x707880, roughness: 0.85 });
  for (let row = 0; row < 5; row++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(22, 0.35, 1.2), mat);
    step.position.set(0, 0.2 + row * 0.45, row * 0.8);
    step.receiveShadow = true;
    g.add(step);
    for (let s = 0; s < 8 + row * 2; s++) {
      if (Math.random() > 0.35) continue;
      const shirt = [0x2563eb, 0xdc2626, 0x16a34a, 0xf59e0b, 0x9333ea, 0xffffff][Math.floor(Math.random() * 6)];
      const v = buildVisitor(shirt);
      v.position.set(-9 + s * (18 / (8 + row * 2)), 0.55 + row * 0.45, row * 0.8 - 0.3);
      v.rotation.y = Math.PI + (Math.random() - 0.5) * 0.4;
      v.scale.setScalar(0.85);
      g.add(v);
    }
  }
  return g;
}

export function buildPark(scene, arenaRadius) {
  parkGroup = new THREE.Group();

  // ── Animated ocean ──
  waterMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      shallow: { value: new THREE.Color(0x48cae4) },
      deep: { value: new THREE.Color(0x023047) },
    },
    vertexShader: `
      varying vec2 vUv; varying float vWave;
      uniform float time;
      void main() {
        vUv = uv;
        vec3 p = position;
        float w = sin(p.x * 0.15 + time * 1.2) * 0.25 + sin(p.z * 0.12 + time * 0.9) * 0.2;
        p.y += w; vWave = w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv; varying float vWave;
      uniform vec3 shallow; uniform vec3 deep; uniform float time;
      void main() {
        float ripples = sin(vUv.x * 40.0 + time * 2.0) * sin(vUv.y * 35.0 - time * 1.5);
        vec3 col = mix(deep, shallow, 0.45 + vWave * 2.0 + ripples * 0.08);
        gl_FragColor = vec4(col, 0.92);
      }`,
    transparent: true,
    side: THREE.DoubleSide,
  });
  waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(220, 220, 64, 64), waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(0, -0.35, -35);
  parkGroup.add(waterMesh);

  // Beach
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 18, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xd4c4a0, roughness: 0.95 })
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.01, -22);
  beach.receiveShadow = true;
  parkGroup.add(beach);

  // Coast grass overlay
  const coast = new THREE.Mesh(
    new THREE.RingGeometry(arenaRadius - 2, arenaRadius + 8, 48, 1, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.9 })
  );
  coast.rotation.x = -Math.PI / 2;
  coast.rotation.z = Math.PI / 2;
  coast.position.set(0, 0.015, -5);
  parkGroup.add(coast);

  // Boardwalk
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.85 });
  for (let side of [-1, 1]) {
    const boardwalk = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 55), walkMat);
    boardwalk.position.set(side * (arenaRadius + 5), 0.1, 8);
    boardwalk.receiveShadow = true;
    parkGroup.add(boardwalk);
  }

  // Viewing platform
  const platform = new THREE.Mesh(new THREE.BoxGeometry(24, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0x606870, roughness: 0.7 }));
  platform.position.set(0, 1.2, arenaRadius + 3);
  platform.castShadow = true;
  platform.receiveShadow = true;
  parkGroup.add(platform);
  const rails = new THREE.Mesh(new THREE.BoxGeometry(24, 1.0, 0.08), new THREE.MeshStandardMaterial({ color: 0x889098 }));
  rails.position.set(0, 1.8, arenaRadius + 1.1);
  parkGroup.add(rails);

  // Bleachers (visitor seating)
  const bleachers = buildBleachers();
  bleachers.position.set(0, 0, arenaRadius + 8);
  bleachers.rotation.y = Math.PI;
  parkGroup.add(bleachers);

  // Electric fences around arena
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const fence = buildFenceSegment(6);
    fence.position.set(Math.cos(angle) * (arenaRadius + 1.5), 0, Math.sin(angle) * (arenaRadius + 1.5));
    fence.rotation.y = -angle + Math.PI / 2;
    parkGroup.add(fence);
  }

  // Palm trees along coast
  for (let i = 0; i < 12; i++) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 4, 6), new THREE.MeshStandardMaterial({ color: 0x6b4423 }));
    trunk.position.y = 2;
    trunk.castShadow = true;
    palm.add(trunk);
    for (let f = 0; f < 6; f++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.08, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0x2d6a4f }));
      frond.position.set(Math.cos(f) * 0.8, 4.2, Math.sin(f) * 0.8);
      frond.rotation.z = Math.cos(f) * 0.8;
      frond.rotation.x = Math.sin(f) * 0.8;
      palm.add(frond);
    }
    const px = -40 + i * 7;
    palm.position.set(px, 0, -16 - Math.random() * 4);
    palm.rotation.y = Math.random() * Math.PI;
    parkGroup.add(palm);
  }

  // Mosasaurs in the lagoon
  const mosaConfigs = [
    { x: -18, z: -42, scale: 1.3, speed: 0.4, phase: 0 },
    { x: 8, z: -50, scale: 1.6, speed: 0.3, phase: 1.5 },
    { x: 22, z: -38, scale: 1.0, speed: 0.5, phase: 3.0 },
    { x: -5, z: -55, scale: 1.8, speed: 0.25, phase: 4.5 },
  ];
  mosaConfigs.forEach(cfg => {
    const mesh = buildMosasaurMesh(cfg.scale);
    mesh.position.set(cfg.x, -0.5, cfg.z);
    mesh.rotation.y = Math.PI / 2;
    parkGroup.add(mesh);
    mosasaurs.push({ mesh, ...cfg, breachT: 0 });
  });

  // Walking visitors on perimeter path
  const shirtColors = [0x2563eb, 0xdc2626, 0x16a34a, 0xf59e0b, 0x9333ea, 0xec4899, 0xffffff, 0x1e293b];
  for (let i = 0; i < 55; i++) {
    const v = buildVisitor(shirtColors[i % shirtColors.length]);
    const angle = (i / 55) * Math.PI * 2;
    const r = arenaRadius + 3.5 + (Math.random() - 0.5) * 2;
    v.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    v.rotation.y = -angle + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    parkGroup.add(v);
    visitors.push({
      mesh: v,
      angle,
      r,
      speed: 0.08 + Math.random() * 0.12,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  // Extra visitors on boardwalks
  for (let i = 0; i < 20; i++) {
    const v = buildVisitor(shirtColors[Math.floor(Math.random() * shirtColors.length)]);
    v.position.set((Math.random() > 0.5 ? 1 : -1) * (arenaRadius + 5), 0.25, -15 + Math.random() * 40);
    v.rotation.y = Math.random() * Math.PI * 2;
    parkGroup.add(v);
    visitors.push({
      mesh: v,
      boardwalk: true,
      z: v.position.z,
      dir: Math.random() > 0.5 ? 1 : -1,
      speed: 0.6 + Math.random() * 0.8,
      x: v.position.x,
    });
  }

  scene.add(parkGroup);
  return parkGroup;
}

export function updatePark(dt, elapsed) {
  parkTime = elapsed;
  if (waterMat) waterMat.uniforms.time.value = elapsed;

  visitors.forEach(v => {
    if (v.boardwalk) {
      v.z += v.dir * v.speed * dt;
      if (v.z > 30 || v.z < -15) v.dir *= -1;
      v.mesh.position.z = v.z;
      v.mesh.rotation.y = v.dir > 0 ? 0 : Math.PI;
    } else {
      v.angle += v.speed * dt;
      v.mesh.position.x = Math.cos(v.angle) * v.r;
      v.mesh.position.z = Math.sin(v.angle) * v.r;
      v.mesh.rotation.y = -v.angle + Math.PI / 2;
      v.mesh.position.y = Math.sin(elapsed * 3 + v.wobble) * 0.02;
    }
  });

  mosasaurs.forEach(m => {
    const t = elapsed * m.speed + m.phase;
    m.mesh.position.x = m.x + Math.sin(t * 0.7) * 12;
    m.mesh.position.z = m.z + Math.cos(t * 0.5) * 8;
    m.mesh.rotation.y = Math.atan2(
      Math.cos(t * 0.5) * 8 * 0.5,
      Math.sin(t * 0.7) * 12 * 0.7
    ) + Math.PI / 2;
    m.mesh.position.y = -0.6 + Math.sin(t * 2) * 0.15;

    // Occasional breach
    m.breachT -= dt;
    if (m.breachT <= 0 && Math.random() < 0.002) {
      m.breachT = 3 + Math.random() * 4;
    }
    if (m.breachT > 2.5) {
      m.mesh.position.y = -0.6 + (3 - m.breachT) * 4;
      m.mesh.rotation.x = -(3 - m.breachT) * 0.4;
    } else {
      m.mesh.rotation.x *= 0.95;
    }
  });
}

export function isProceduralModel(modelId) {
  return modelId === 'mosasaurus';
}

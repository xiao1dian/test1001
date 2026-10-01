// Jurassic Park-style combat movement — circle, rush, lunge, knockback

export function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

/** Approximate collision radius from dino stats */
export function bodyRadius(spec) {
  const s = spec?.scale ?? 1;
  const h = spec?.height ?? 2.5;
  return s * 2.0 + h * 0.22;
}

export function minFightDist(mySpec, theirSpec) {
  return bodyRadius(mySpec) + bodyRadius(theirSpec) + 1.4;
}

export function biteRange(mySpec, theirSpec) {
  return minFightDist(mySpec, theirSpec) + 1.2;
}

export function initCombatState(bot) {
  bot.aiState = 'stalk';
  bot.strafeDir = Math.random() > 0.5 ? 1 : -1;
  bot.stateTimer = 1.5 + Math.random() * 2;
  bot.worldCombat = null;
}

export function clampToArena(pos, arenaR) {
  const r = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
  if (r > arenaR - 2) {
    pos.x *= (arenaR - 2) / r;
    pos.z *= (arenaR - 2) / r;
  }
}

/** Push two fighters apart so they never overlap */
export function separateFighters(posA, posB, minDist, arenaR) {
  const dx = posB.x - posA.x;
  const dz = posB.z - posA.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < 0.001 || d >= minDist) return;
  const push = (minDist - d) * 0.55;
  const nx = dx / d;
  const nz = dz / d;
  posA.x -= nx * push;
  posA.z -= nz * push;
  posB.x += nx * push;
  posB.z += nz * push;
  clampToArena(posA, arenaR);
  clampToArena(posB, arenaR);
}

/** Move the dino in world space during a bite lunge or hit knockback */
export function startWorldCombat(bot, myPos, theirPos, type, minDist = 5) {
  const dx = theirPos.x - myPos.x;
  const dz = theirPos.z - myPos.z;
  const d = Math.max(dist(myPos, theirPos), 0.001);
  const dirX = dx / d;
  const dirZ = dz / d;
  let travel = 0;
  let dur = 0.5;
  const gap = Math.max(0, d - minDist);
  switch (type) {
    case 'lunge':
      travel = Math.min(gap * 0.92, 4.5);
      dur = 0.5;
      break;
    case 'knockback':
      travel = -Math.min(4.0, minDist * 0.45);
      dur = 0.5;
      bot.aiState = 'retreat';
      bot.stateTimer = 1.0;
      break;
    case 'charge':
      travel = Math.min(gap + 1.5, 7);
      dur = 0.95;
      break;
    case 'shove':
      travel = Math.min(1.5, gap * 0.5);
      dur = 0.35;
      break;
    default:
      travel = Math.min(2, gap);
  }
  bot.worldCombat = {
    type,
    t: 0,
    dur,
    sx: myPos.x,
    sz: myPos.z,
    dirX,
    dirZ,
    travel,
  };
  bot.aiState = 'attack';
}

export function updateWorldCombat(bot, myPos, arenaR, dt) {
  const wc = bot.worldCombat;
  if (!wc) return;
  wc.t = Math.min(wc.t + dt, wc.dur);
  const p = wc.t / wc.dur;
  const ease = Math.sin(p * Math.PI);
  myPos.x = wc.sx + wc.dirX * wc.travel * ease;
  myPos.z = wc.sz + wc.dirZ * wc.travel * ease;
  if (wc.type === 'charge') {
    myPos.y = Math.sin(p * Math.PI) * 0.45;
  } else if (wc.type === 'lunge') {
    myPos.y = Math.sin(p * Math.PI) * 0.25;
  } else {
    myPos.y = 0;
  }
  clampToArena(myPos, arenaR);
  if (wc.t >= wc.dur) {
    bot.worldCombat = null;
    myPos.y = 0;
    if (bot.aiState === 'attack') bot.aiState = 'circle';
    bot.stateTimer = 1.2 + Math.random() * 1.5;
  }
}

function pushBackIfTooClose(myPos, theirPos, minDist, spec, dt) {
  const d = dist(myPos, theirPos);
  if (d >= minDist || d < 0.001) return false;
  const dx = myPos.x - theirPos.x;
  const dz = myPos.z - theirPos.z;
  const push = ((minDist - d) / d) * spec.spd * 2.2 * dt;
  myPos.x += dx * push;
  myPos.z += dz * push;
  return true;
}

/** Circle, stalk, rush — maintain spacing, no body clipping */
export function updateCombatMovement(bot, myPos, theirPos, spec, theirSpec, dt, arenaR) {
  if (bot.worldCombat) {
    updateWorldCombat(bot, myPos, arenaR, dt);
    return bot.worldCombat?.type === 'charge';
  }

  const minDist = minFightDist(spec, theirSpec);
  const engageDist = minDist + 2.5;
  const d = dist(myPos, theirPos);
  const dx = theirPos.x - myPos.x;
  const dz = theirPos.z - myPos.z;
  const nd = Math.max(d, 0.001);
  const nx = dx / nd;
  const nz = dz / nd;
  const px = -nz;
  const pz = nx;

  bot.stateTimer -= dt;
  let moving = false;

  switch (bot.aiState) {
    case 'stalk':
      if (d > engageDist + 8) {
        myPos.x += nx * spec.spd * 1.4 * dt;
        myPos.z += nz * spec.spd * 1.4 * dt;
        moving = true;
      } else if (d > engageDist) {
        myPos.x += nx * spec.spd * 0.9 * dt;
        myPos.z += nz * spec.spd * 0.9 * dt;
        moving = true;
      }
      if (d <= engageDist + 2) {
        bot.aiState = 'circle';
        bot.stateTimer = 2.5 + Math.random() * 3;
        bot.strafeDir = Math.random() > 0.5 ? 1 : -1;
      }
      break;

    case 'circle': {
      const orbitR = minDist + 2.5 + Math.sin(bot.stateTimer * 0.7) * 1.5;
      const angle = Math.atan2(myPos.x - theirPos.x, myPos.z - theirPos.z);
      const newAngle = angle + bot.strafeDir * 1.2 * dt;
      const tx = theirPos.x + Math.sin(newAngle) * orbitR;
      const tz = theirPos.z + Math.cos(newAngle) * orbitR;
      myPos.x += (tx - myPos.x) * Math.min(1, dt * 2.5);
      myPos.z += (tz - myPos.z) * Math.min(1, dt * 2.5);
      moving = true;
      if (bot.stateTimer <= 0) {
        bot.aiState = Math.random() < 0.55 ? 'rush' : 'stalk';
        bot.stateTimer = 1.2 + Math.random() * 1.5;
      }
      if (d < minDist + 0.5) bot.aiState = 'clash';
      break;
    }

    case 'rush':
      if (d > minDist + 1.2) {
        myPos.x += nx * spec.spd * 2.2 * dt;
        myPos.z += nz * spec.spd * 2.2 * dt;
        moving = true;
      }
      if (d <= minDist + 1.5 || bot.stateTimer <= 0) {
        bot.aiState = 'clash';
        bot.stateTimer = 0.8 + Math.random() * 0.6;
      }
      break;

    case 'clash':
      myPos.x += px * bot.strafeDir * spec.spd * 0.75 * dt;
      myPos.z += pz * bot.strafeDir * spec.spd * 0.75 * dt;
      moving = pushBackIfTooClose(myPos, theirPos, minDist, spec, dt) || moving;
      if (bot.stateTimer <= 0) {
        bot.aiState = Math.random() < 0.45 ? 'retreat' : 'circle';
        bot.stateTimer = 1.5 + Math.random() * 2;
      }
      break;

    case 'retreat':
      myPos.x -= nx * spec.spd * 1.5 * dt;
      myPos.z -= nz * spec.spd * 1.5 * dt;
      moving = true;
      if (bot.stateTimer <= 0 || d > engageDist) {
        bot.aiState = 'circle';
        bot.stateTimer = 2;
      }
      break;

    case 'attack':
      moving = false;
      break;

    default:
      bot.aiState = 'circle';
      break;
  }

  pushBackIfTooClose(myPos, theirPos, minDist, spec, dt);
  clampToArena(myPos, arenaR);
  return moving || bot.aiState === 'rush';
}

export const COMBAT_DUR = {
  bite: 0.9,
  hit: 0.65,
  roar: 1.5,
  charge: 1.2,
  special: 1.8,
  death: 2.8,
};

export function updateCombatMotion(fighter, dt) {
  const cm = fighter?.combatMotion;
  if (!cm || !fighter.root) return;
  cm.t = Math.min(cm.t + dt, cm.dur);
  const p = cm.t / cm.dur;
  const root = fighter.root;
  const ease = Math.sin(p * Math.PI);
  const heavy = fighter.staticMesh ? 2.2 : 1;

  switch (cm.type) {
    case 'bite':
      root.position.z = ease * 2.8 * heavy;
      root.rotation.x = -ease * 0.65;
      root.rotation.y = Math.sin(p * Math.PI * 2) * 0.12;
      break;
    case 'hit':
      root.position.x = Math.sin(p * Math.PI * 6) * 0.7 * (1 - p);
      root.rotation.z = Math.sin(p * Math.PI * 5) * 0.35;
      root.rotation.x = ease * 0.35;
      root.position.z = -ease * 0.5;
      break;
    case 'roar':
      root.rotation.x = -ease * 0.35;
      root.scale.y = (fighter._baseScaleY ?? 1) + ease * 0.12;
      root.position.y = ease * 0.3;
      break;
    case 'charge':
      root.position.z = ease * 1.0 * heavy;
      root.rotation.x = -ease * 0.25;
      break;
    case 'special':
      root.position.y = ease * 1.2;
      root.rotation.y += dt * 4;
      root.rotation.x = -ease * 0.3;
      break;
    case 'tail':
      root.rotation.y = Math.sin(p * Math.PI * 3) * 0.9;
      root.position.z = ease * 1.5;
      break;
    case 'death':
      root.rotation.z = p * 0.85;
      root.position.y = -p * 0.8;
      root.rotation.x = p * 0.3;
      break;
    default:
      break;
  }

  if (cm.t >= cm.dur) {
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.y = fighter._baseScaleY ?? 1;
    fighter.combatMotion = null;
    fighter.combatBusy = false;
  }
}

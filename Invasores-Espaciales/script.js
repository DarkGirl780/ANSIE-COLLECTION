const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const victoryScreen = document.getElementById('victoryScreen');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const victoryScoreEl = document.getElementById('victoryScore');

const startBtn = document.getElementById('startBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartPauseBtn = document.getElementById('restartPauseBtn');
const retryBtn = document.getElementById('retryBtn');
const victoryBtn = document.getElementById('victoryBtn');
const backBtn = document.getElementById('backBtn');

const touchButtons = {
  left: document.getElementById('btnLeft'),
  shoot: document.getElementById('btnShoot'),
  right: document.getElementById('btnRight'),
  pause: document.getElementById('btnPause')
};

let gameState = 'menu';
let keys = {};
let controlState = { left: false, right: false, shoot: false, pause: false };

let score = 0;
let level = 1;
let lives = 3;
let player;
let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let stars = [];
let midStars = [];
let nearStars = [];
let nebulae = [];
let planets = [];
let moons = [];
let asteroids = [];
let backgroundParticles = [];
let boss = null;
let bossHitFlash = 0;
let waveTimer = 0;
let lastTime = 0;
let formationOffsetX = 0;
let formationDirection = 1;
let formationSpeed = 1.4;
let formationDrop = 0;
let levelTransitionTimer = 0;
let levelText = '';
let victoryFlash = 0;
let spaceDust = [];
let audioCtx;
let animationFrameId = null;
let pendingTimeouts = [];
let specialEnemy = null;
let lifeCarrierEnemy = null;
let shieldRechargeTimer = 0;
let shieldPulse = 0;
let backgroundPulse = 0;
let bossAtmosphere = 0;
let specialSignal = 0;

function initAudio() {
  if (audioCtx) return;

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return;

  audioCtx = new AudioContextCtor();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(freq, duration, type = 'square', volume = 0.3) {
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.value = volume;

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
}

function clearPendingTimeouts() {
  pendingTimeouts.forEach((id) => clearTimeout(id));
  pendingTimeouts = [];
}

function scheduleTimeout(callback, delay) {
  const timeoutId = setTimeout(() => {
    pendingTimeouts = pendingTimeouts.filter((id) => id !== timeoutId);
    callback();
  }, delay);
  pendingTimeouts.push(timeoutId);
  return timeoutId;
}

function playerShootSound() {
  playSound(880, 0.06, 'square', 0.03);
  scheduleTimeout(() => playSound(1320, 0.04, 'triangle', 0.015), 15);
}

function enemyDestroyedSound() {
  playSound(720, 0.05, 'triangle', 0.03);
  scheduleTimeout(() => playSound(480, 0.08, 'square', 0.02), 20);
}

function playerDamageSound() {
  playSound(220, 0.08, 'sawtooth', 0.025);
}

function playerLoseLifeSound() {
  playSound(180, 0.12, 'sawtooth', 0.04);
}

function lifeRewardSound() {
  playSound(660, 0.08, 'sine', 0.035);
  scheduleTimeout(() => playSound(880, 0.06, 'triangle', 0.025), 18);
}

function bossAppearSound() {
  playSound(280, 0.16, 'triangle', 0.04);
  scheduleTimeout(() => playSound(420, 0.16, 'square', 0.025), 40);
}

function bossHitSound() {
  playSound(540, 0.045, 'square', 0.03);
}

function bossDefeatedSound() {
  playSound(620, 0.1, 'triangle', 0.04);
  scheduleTimeout(() => playSound(820, 0.16, 'sine', 0.025), 50);
}

function gameOverSound() {
  playSound(320, 0.2, 'sawtooth', 0.04);
  scheduleTimeout(() => playSound(220, 0.28, 'square', 0.03), 60);
}

function levelCompleteSound() {
  playSound(660, 0.06, 'square', 0.03);
  scheduleTimeout(() => playSound(840, 0.06, 'triangle', 0.025), 25);
  scheduleTimeout(() => playSound(1000, 0.08, 'sine', 0.02), 50);
}

function uiStartSound() {
  playSound(720, 0.06, 'square', 0.025);
  scheduleTimeout(() => playSound(980, 0.06, 'triangle', 0.02), 20);
}

function uiRetrySound() {
  playSound(540, 0.06, 'triangle', 0.02);
}

function uiPauseSound() {
  playSound(440, 0.05, 'square', 0.02);
  scheduleTimeout(() => playSound(360, 0.05, 'triangle', 0.015), 20);
}

function uiExitSound() {
  playSound(300, 0.06, 'sawtooth', 0.02);
}

function setupGame() {
  player = {
    x: canvas.width / 2 - 18,
    y: canvas.height - 44,
    width: 36,
    height: 24,
    speed: 3.4,
    cooldown: 0,
    hitFlash: 0,
    invulnerable: 0,
    shield: 0,
    shieldHitsLeft: 0
  };
  bullets = [];
  enemyBullets = [];
  enemies = [];
  particles = [];
  boss = null;
  bossHitFlash = 0;
  waveTimer = 0;
  specialEnemy = null;
  lifeCarrierEnemy = null;
  shieldRechargeTimer = 0;
  shieldPulse = 0;
  formationOffsetX = 0;
  formationDirection = 1;
  formationSpeed = 1.4;
  formationDrop = 0;
  levelTransitionTimer = 0;
  levelText = '';
  victoryFlash = 0;
  spaceDust = [];
  backgroundPulse = 0;
  bossAtmosphere = 0;
  specialSignal = 0;
  createStars();
  createWave();
  updateHud();
}

function createStars() {
  stars = [];
  midStars = [];
  nearStars = [];
  nebulae = [];
  planets = [];
  moons = [];
  asteroids = [];
  backgroundParticles = [];

  for (let i = 0; i < 90; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.4 + 0.4,
      speed: Math.random() * 0.35 + 0.08,
      alpha: Math.random() * 0.8 + 0.2
    });
  }

  for (let i = 0; i < 55; i++) {
    midStars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.6 + 0.6,
      speed: Math.random() * 0.7 + 0.25,
      alpha: Math.random() * 0.7 + 0.2
    });
  }

  for (let i = 0; i < 30; i++) {
    nearStars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.2 + 0.8,
      speed: Math.random() * 1.2 + 0.45,
      alpha: Math.random() * 0.85 + 0.25
    });
  }

  for (let i = 0; i < 5; i++) {
    nebulae.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.65,
      radius: 70 + Math.random() * 90,
      alpha: 0.08 + Math.random() * 0.1,
      hue: i % 2 === 0 ? 196 : 214,
      drift: 0.2 + Math.random() * 0.25
    });
  }

  for (let i = 0; i < 3; i++) {
    planets.push({
      x: Math.random() * canvas.width,
      y: 80 + Math.random() * 140,
      radius: 24 + Math.random() * 26,
      alpha: 0.75,
      glow: 10 + Math.random() * 12,
      hue: i === 0 ? 203 : 218,
      orbit: Math.random() * 0.6 + 0.2
    });
  }

  for (let i = 0; i < 4; i++) {
    moons.push({
      x: Math.random() * canvas.width,
      y: 50 + Math.random() * 170,
      radius: 4 + Math.random() * 4,
      alpha: 0.85,
      orbit: 0.18 + Math.random() * 0.3,
      drift: Math.random() * 0.6 + 0.2
    });
  }

  for (let i = 0; i < 10; i++) {
    asteroids.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 6 + Math.random() * 10,
      speed: 0.15 + Math.random() * 0.3,
      angle: Math.random() * Math.PI * 2,
      alpha: 0.45 + Math.random() * 0.25
    });
  }

  for (let i = 0; i < 24; i++) {
    backgroundParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 0.8 + Math.random() * 1.8,
      speed: 0.08 + Math.random() * 0.16,
      alpha: 0.2 + Math.random() * 0.4,
      hue: Math.random() > 0.5 ? 190 : 210
    });
  }

  spaceDust = Array.from({ length: 30 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 22 + 8,
    drift: Math.random() * 0.9 + 0.2,
    alpha: Math.random() * 0.18 + 0.05
  }));
}

function createWave() {
  const rows = Math.min(5, 2 + Math.floor(level / 3));
  const cols = Math.min(6, 4 + Math.floor(level / 2));
  const spacingX = 48;
  const spacingY = 32;
  const startX = (canvas.width - (cols - 1) * spacingX) / 2;
  const startY = 52;

  enemies = [];
  formationOffsetX = 0;
  formationDirection = 1;
  formationSpeed = 1.1 + level * 0.06;
  formationDrop = 0;
  waveTimer = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const type = row === 0 ? 'elite' : row === 1 ? 'scout' : 'basic';
      const hp = type === 'elite' ? 2 : type === 'scout' ? 1 : 1;
      enemies.push({
        x: startX + col * spacingX,
        y: startY + row * spacingY,
        startX: startX + col * spacingX,
        startY: startY + row * spacingY,
        width: 26,
        height: 20,
        hp,
        type,
        row,
        col,
        shootTimer: Math.random() * 120 + 60,
        flash: 0,
        special: false,
        specialType: null,
        specialTimer: 0,
        warningPulse: 0
      });
    }
  }

  if (enemies.length > 0 && level > 1 && !specialEnemy && Math.random() < 0.6) {
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    target.special = true;
    target.specialType = 'shield';
    target.specialTimer = 180 - Math.min(level * 10, 90);
    specialEnemy = target;
    specialSignal = 28;
  } else if (specialEnemy) {
    specialEnemy = null;
  }

  if (enemies.length > 0 && level > 2 && !specialEnemy && !lifeCarrierEnemy && Math.random() < 0.16) {
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    target.special = true;
    target.specialType = 'life';
    target.hp = 1;
    target.specialTimer = 150 - Math.min(level * 8, 70);
    lifeCarrierEnemy = target;
    specialSignal = 28;
  }
}

function activateShield() {
  player.shield = 1;
  player.shieldHitsLeft = 2;
  shieldPulse = 24;
}

function grantLifeReward() {
  lives += 1;
  updateHud();
  initAudio();
  lifeRewardSound();
  spawnParticle(player.x + player.width / 2, player.y + player.height / 2, '#4dff92', 24, 1.4);
}

function startBoss() {
  bossAppearSound();
  bossAtmosphere = 140;
  backgroundPulse = 0;
  boss = {
    x: canvas.width / 2 - 90,
    y: 36,
    width: 180,
    height: 110,
    hp: 2600 + level * 120,
    maxHp: 2600 + level * 120,
    phase: 1,
    attackTimer: 0,
    moveTimer: 0,
    pulse: 0,
    alive: true
  };
  bossHitFlash = 0;
}

function advanceToNextStage() {
  if (level >= 10) {
    levelText = 'BOSS FINAL';
    levelTransitionTimer = 90;
    return;
  }

  levelText = `NIVEL ${level + 1}`;
  levelTransitionTimer = 90;
}

function startLoop() {
  if (animationFrameId !== null) return;
  lastTime = performance.now();
  animationFrameId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function startGame() {
  initAudio();
  stopLoop();
  clearPendingTimeouts();
  uiStartSound();
  score = 0;
  level = 1;
  lives = 3;
  setupGame();
  gameState = 'running';
  hideScreens();
  resetControls();
  startLoop();
}

function showScreen(screen) {
  [startScreen, pauseScreen, gameOverScreen, victoryScreen].forEach((item) => {
    item.style.display = 'none';
  });
  screen.style.display = 'flex';
}

function hideScreens() {
  [startScreen, pauseScreen, gameOverScreen, victoryScreen].forEach((item) => {
    item.style.display = 'none';
  });
}

function updateHud() {
  scoreEl.textContent = `SCORE: ${String(score).padStart(6, '0')}`;
  levelEl.textContent = `LEVEL: ${String(level).padStart(2, '0')}`;
  livesEl.textContent = `LIVES: ${lives}`;
}

function resetControls() {
  controlState = { left: false, right: false, shoot: false, pause: false };
}

function shootPlayer() {
  if (gameState !== 'running') return;
  if (player.cooldown > 0) return;
  bullets.push({
    x: player.x + player.width / 2 - 2,
    y: player.y - 8,
    width: 4,
    height: 12,
    speed: 7,
    color: '#4de7ff'
  });
  bullets.push({
    x: player.x + player.width / 2 - 10,
    y: player.y - 2,
    width: 4,
    height: 10,
    speed: 7,
    color: '#7af0ff'
  });
  bullets.push({
    x: player.x + player.width / 2 + 6,
    y: player.y - 2,
    width: 4,
    height: 10,
    speed: 7,
    color: '#7af0ff'
  });
  player.cooldown = 10;
  initAudio();
  playerShootSound();
  spawnParticle(player.x + player.width / 2, player.y, '#4de7ff', 10, 0.8);
}

function spawnParticle(x, y, color, count = 10, speed = 1) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * speed * 2.5,
      vy: (Math.random() - 0.5) * speed * 2.5 - 1,
      life: 24 + Math.random() * 18,
      size: 2 + Math.random() * 2,
      color
    });
  }
}

function createExplosion(x, y, color) {
  spawnParticle(x, y, color, 24, 2.2);
}

function loseLife() {
  if (gameState !== 'running' || player.invulnerable > 0) return;

  if (player.shield > 0 && player.shieldHitsLeft > 0) {
    player.shieldHitsLeft -= 1;
    shieldPulse = 12;
    createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#4de7ff');
    if (player.shieldHitsLeft <= 0) {
      player.shield = 0;
    }
    return;
  }

  initAudio();
  playerDamageSound();
  lives -= 1;
  updateHud();

  player.invulnerable = 90;
  player.hitFlash = 30;
  createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ff5f5f');

  if (lives <= 0) {
    gameOverSound();
    gameState = 'gameover';
    finalScoreEl.textContent = `SCORE: ${String(score).padStart(6, '0')}`;
    showScreen(gameOverScreen);
    resetControls();
    return;
  }

  player.x = canvas.width / 2 - player.width / 2;
  enemyBullets = enemyBullets.filter((bullet) => bullet.y < player.y - 20);

  if (lives > 0) {
    playerLoseLifeSound();
  }
}

function updatePlayer(delta) {
  if (controlState.left) player.x -= player.speed * delta;
  if (controlState.right) player.x += player.speed * delta;
  player.x = Math.max(10, Math.min(canvas.width - player.width - 10, player.x));

  if (player.cooldown > 0) player.cooldown -= 1;
  if (controlState.shoot && player.cooldown <= 0) shootPlayer();

  if (player.hitFlash > 0) player.hitFlash -= 1;
  if (player.invulnerable > 0) player.invulnerable -= 1;
}

function updateBullets(delta) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.y -= bullet.speed * delta;
    if (bullet.y < -20) {
      bullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (
        bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y
      ) {
        enemy.hp -= 1;
        enemy.flash = 8;
        bullets.splice(i, 1);
        createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#7af0ff');
        if (enemy.special && enemy.hp <= 0) {
          if (enemy.specialType === 'shield') {
            activateShield();
            score += 260;
          } else if (enemy.specialType === 'life') {
            grantLifeReward();
            score += 320;
          }
        }
        if (enemy.hp <= 0) {
          enemies.splice(j, 1);
          score += 120 + (enemy.type === 'elite' ? 80 : 0);
          enemyDestroyedSound();
          createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.type === 'elite' ? '#ff64b7' : '#4de7ff');
          if (specialEnemy && specialEnemy === enemy) {
            specialEnemy = null;
          }
          if (lifeCarrierEnemy && lifeCarrierEnemy === enemy) {
            lifeCarrierEnemy = null;
          }
          if (enemies.length === 0) {
            levelCompleteSound();
            advanceToNextStage();
          }
        }
        break;
      }
    }
  }

  if (boss && boss.alive) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      if (
        bullet.x < boss.x + boss.width &&
        bullet.x + bullet.width > boss.x &&
        bullet.y < boss.y + boss.height &&
        bullet.y + bullet.height > boss.y
      ) {
        boss.hp -= 1;
        bossHitFlash = 8;
        bullets.splice(i, 1);
        bossHitSound();
        createExplosion(bullet.x, bullet.y, '#7af0ff');
        if (boss.hp <= 0) {
          bossDefeatedSound();
          boss.alive = false;
          score += 5000;
          victoryFlash = 90;
          gameState = 'victory';
          victoryScoreEl.textContent = `SCORE: ${String(score).padStart(6, '0')}`;
          showScreen(victoryScreen);
        }
      }
    }
  }
}

function updateEnemyBullets(delta) {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    bullet.y += bullet.speed * delta;
    if (bullet.y > canvas.height + 20) {
      enemyBullets.splice(i, 1);
      continue;
    }

    if (
      bullet.x < player.x + player.width &&
      bullet.x + bullet.width > player.x &&
      bullet.y < player.y + player.height &&
      bullet.y + bullet.height > player.y
    ) {
      enemyBullets.splice(i, 1);
      loseLife();
    }
  }
}

function updateEnemies(delta) {
  if (enemies.length === 0) return;

  waveTimer += 1;
  formationOffsetX += formationDirection * formationSpeed * delta;
  if (Math.abs(formationOffsetX) > 38) {
    formationDirection *= -1;
    formationDrop += 8;
    formationOffsetX += formationDirection * formationSpeed * delta;
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const wobble = waveTimer * 0.01;
    const patternOffset = enemy.type === 'scout' ? 1.2 : 0.6;
    const movementScale = enemy.specialType === 'life' ? 1.45 : 1;
    const driftAmount = enemy.specialType === 'life' ? 6.4 : (enemy.type === 'elite' ? 12 : 8);

    enemy.x = enemy.startX + formationOffsetX * movementScale + Math.sin(wobble + enemy.row * patternOffset) * driftAmount;
    enemy.y = enemy.startY + formationDrop + Math.sin(wobble * 1.5 + enemy.col) * (enemy.specialType === 'life' ? 5.6 : 4);

    if (enemy.flash > 0) enemy.flash -= 1;
    if (enemy.specialType === 'shield') {
      enemy.specialTimer -= 1;
      enemy.warningPulse = (enemy.warningPulse + 1) % 12;
      if (enemy.specialTimer <= 0) {
        enemy.special = false;
        enemy.specialType = null;
        specialEnemy = null;
      }
    } else if (enemy.specialType === 'life') {
      enemy.specialTimer -= 1;
      enemy.warningPulse = (enemy.warningPulse + 1) % 12;
      if (enemy.specialTimer <= 0) {
        if (lifeCarrierEnemy && lifeCarrierEnemy === enemy) {
          lifeCarrierEnemy = null;
        }
        enemies.splice(i, 1);
        continue;
      }
    }

    if (enemy.shootTimer > 0) {
      enemy.shootTimer -= 1;
    } else {
      enemy.shootTimer = 60 - Math.min(level * 3, 28) + Math.random() * 30;
      if (Math.random() < 0.7 || enemy.type === 'elite') {
        enemyBullets.push({
          x: enemy.x + enemy.width / 2 - 2,
          y: enemy.y + enemy.height,
          width: 4,
          height: 10,
          speed: 2.2 + level * 0.08,
          color: enemy.type === 'elite' ? '#ff3d7a' : '#ff5f1f'
        });
      }
    }

    if (enemy.y + enemy.height > player.y - 4) {
      lives = 0;
      gameState = 'gameover';
      gameOverSound();
      finalScoreEl.textContent = `SCORE: ${String(score).padStart(6, '0')}`;
      showScreen(gameOverScreen);
      return;
    }
  }
}

function updateBoss(delta) {
  if (!boss || !boss.alive) return;
  boss.moveTimer += delta;
  boss.attackTimer -= 1;
  boss.pulse += 0.04;
  boss.x = canvas.width / 2 - 90 + Math.sin(boss.moveTimer * 0.02) * 40;

  if (boss.attackTimer <= 0) {
    boss.attackTimer = 28 - Math.min(level * 2, 14);
    const pattern = boss.phase;
    if (pattern === 1) {
      for (let i = -2; i <= 2; i++) {
        enemyBullets.push({
          x: boss.x + boss.width / 2 - 2 + i * 12,
          y: boss.y + 60,
          width: 4,
          height: 12,
          speed: 2.6 + (boss.phase - 1) * 0.3,
          color: '#ff2d55'
        });
      }
    } else if (pattern === 2) {
      for (let i = 0; i < 7; i++) {
        enemyBullets.push({
          x: boss.x + 20 + i * 20,
          y: boss.y + 70,
          width: 4,
          height: 12,
          speed: 2.2 + i * 0.04,
          color: '#ff7a00'
        });
      }
    } else {
      for (let i = 0; i < 9; i++) {
        const spread = (i - 4) * 0.35;
        enemyBullets.push({
          x: boss.x + boss.width / 2 - 2,
          y: boss.y + 70,
          width: 5,
          height: 14,
          speed: 2.4 + i * 0.05,
          color: '#8b2cff'
        });
        enemyBullets[enemyBullets.length - 1].vx = spread * 1.6;
      }
    }
  }

  if (boss.hp < boss.maxHp * 0.6 && boss.phase < 2) {
    boss.phase = 2;
  } else if (boss.hp < boss.maxHp * 0.3 && boss.phase < 3) {
    boss.phase = 3;
  }

  if (bossHitFlash > 0) bossHitFlash -= 1;
}

function updateParticles(delta) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.vy += 0.01;
    p.life -= 1;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateStars(delta) {
  for (const star of stars) {
    star.y += star.speed * delta;
    if (star.y > canvas.height + 2) {
      star.y = -2;
      star.x = Math.random() * canvas.width;
    }
  }
  for (const star of midStars) {
    star.y += star.speed * delta * 0.8;
    if (star.y > canvas.height + 2) {
      star.y = -2;
      star.x = Math.random() * canvas.width;
    }
  }
  for (const star of nearStars) {
    star.y += star.speed * delta * 1.1;
    if (star.y > canvas.height + 2) {
      star.y = -2;
      star.x = Math.random() * canvas.width;
    }
  }
  for (const nebula of nebulae) {
    nebula.y += nebula.drift * delta * 0.18;
    if (nebula.y > canvas.height + 120) nebula.y = -120;
  }
  for (const planet of planets) {
    planet.y += 0.02 * delta;
    if (planet.y > canvas.height + 70) planet.y = -70;
  }
  for (const moon of moons) {
    moon.y += moon.drift * delta * 0.08;
    if (moon.y > canvas.height + 40) moon.y = -40;
  }
  for (const asteroid of asteroids) {
    asteroid.y += asteroid.speed * delta * 0.65;
    asteroid.angle += 0.008 * delta;
    if (asteroid.y > canvas.height + 20) {
      asteroid.y = -20;
      asteroid.x = Math.random() * canvas.width;
    }
  }
  for (const particle of backgroundParticles) {
    particle.y += particle.speed * delta * 0.5;
    if (particle.y > canvas.height + 4) {
      particle.y = -4;
      particle.x = Math.random() * canvas.width;
    }
  }
  for (const dust of spaceDust) {
    dust.y += dust.drift * delta;
    if (dust.y > canvas.height + dust.radius) {
      dust.y = -dust.radius;
      dust.x = Math.random() * canvas.width;
    }
  }
  if (specialSignal > 0) specialSignal -= 1;
  if (bossAtmosphere > 0) bossAtmosphere -= 1;
  if (backgroundPulse > 0) backgroundPulse -= 1;
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#02040b');
  gradient.addColorStop(0.4, '#050a16');
  gradient.addColorStop(1, '#030611');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bossDark = bossAtmosphere > 0 ? 0.22 + bossAtmosphere / 700 : 0;
  ctx.save();
  ctx.globalAlpha = 0.2 + bossDark;
  ctx.fillStyle = '#000611';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  for (const nebula of nebulae) {
    const glow = ctx.createRadialGradient(nebula.x, nebula.y, 10, nebula.x, nebula.y, nebula.radius);
    glow.addColorStop(0, `hsla(${nebula.hue}, 90%, 70%, ${nebula.alpha})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const planet of planets) {
    const glow = ctx.createRadialGradient(planet.x, planet.y, 6, planet.x, planet.y, planet.radius + 14);
    glow.addColorStop(0, `hsla(${planet.hue}, 80%, 64%, 0.3)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius + 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(${planet.hue}, 70%, 62%, ${planet.alpha})`;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const moon of moons) {
    ctx.fillStyle = `rgba(220, 235, 255, ${moon.alpha})`;
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, moon.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const asteroid of asteroids) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.angle);
    ctx.fillStyle = `rgba(130, 149, 173, ${asteroid.alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -asteroid.radius);
    ctx.lineTo(asteroid.radius * 0.7, -asteroid.radius * 0.4);
    ctx.lineTo(asteroid.radius, asteroid.radius * 0.2);
    ctx.lineTo(asteroid.radius * 0.4, asteroid.radius);
    ctx.lineTo(-asteroid.radius * 0.2, asteroid.radius * 0.7);
    ctx.lineTo(-asteroid.radius, asteroid.radius * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (const dust of spaceDust) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(77, 231, 255, ${dust.alpha})`;
    ctx.arc(dust.x, dust.y, dust.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const particle of backgroundParticles) {
    ctx.fillStyle = `hsla(${particle.hue}, 100%, 72%, ${particle.alpha})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const star of stars) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const star of midStars) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(120, 220, 255, ${star.alpha})`;
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const star of nearStars) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(77, 231, 255, ${star.alpha * 0.8})`;
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  if (specialSignal > 0 || backgroundPulse > 0) {
    const pulse = (specialSignal > 0 ? specialSignal : backgroundPulse) / 28;
    ctx.save();
    ctx.globalAlpha = 0.12 + pulse * 0.08;
    ctx.strokeStyle = '#4de7ff';
    ctx.lineWidth = 1.5 + pulse * 0.8;
    ctx.beginPath();
    ctx.arc(canvas.width * 0.75, canvas.height * 0.24, 80 + pulse * 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (bossAtmosphere > 0) {
    const wave = bossAtmosphere / 140;
    ctx.save();
    ctx.globalAlpha = 0.13 + wave * 0.12;
    ctx.strokeStyle = '#4de7ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.35);
    ctx.quadraticCurveTo(canvas.width * 0.25, canvas.height * 0.2, canvas.width * 0.5, canvas.height * 0.3);
    ctx.quadraticCurveTo(canvas.width * 0.75, canvas.height * 0.4, canvas.width, canvas.height * 0.25);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.12 + wave * 0.15;
    ctx.fillStyle = '#0b1630';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.08 + (bossAtmosphere > 0 ? 0.04 : 0);
  ctx.strokeStyle = '#4de7ff';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 80 + i * 40);
    ctx.quadraticCurveTo(200, 20 + i * 10, canvas.width, 80 + i * 30);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  if (player.hitFlash > 0) ctx.globalAlpha = 0.7;
  if (player.shield > 0) {
    ctx.save();
    ctx.strokeStyle = '#4de7ff';
    ctx.lineWidth = 2 + (shieldPulse > 0 ? 1 : 0);
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 26 + Math.sin(shieldPulse * 0.3) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#4de7ff';
  ctx.strokeStyle = '#7af0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x + player.width, player.y + player.height);
  ctx.lineTo(player.x + player.width / 2 + 8, player.y + player.height - 5);
  ctx.lineTo(player.x + player.width / 2, player.y + player.height - 8);
  ctx.lineTo(player.x + player.width / 2 - 8, player.y + player.height - 5);
  ctx.lineTo(player.x, player.y + player.height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(player.x + 12, player.y + 8, 6, 6);
  ctx.fillRect(player.x + 18, player.y + 8, 6, 6);
  ctx.restore();
}

function drawBullets() {
  for (const bullet of bullets) {
    ctx.save();
    ctx.fillStyle = bullet.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = bullet.color;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    ctx.restore();
  }

  for (const bullet of enemyBullets) {
    const glow = bullet.color || '#ff3b3b';
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = glow;
    ctx.fillStyle = glow;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    ctx.fillStyle = '#ff8a00';
    ctx.fillRect(bullet.x + 1, bullet.y + 1, bullet.width - 2, bullet.height - 3);
    ctx.fillStyle = '#8b2cff';
    ctx.fillRect(bullet.x + 1, bullet.y + 3, bullet.width - 2, bullet.height - 6);

    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bullet.x + bullet.width / 2, bullet.y + bullet.height);
    ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + bullet.height + 8);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    const pulse = enemy.flash > 0 ? 0.6 : 1;
    ctx.save();
    if (enemy.specialType === 'shield') {
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#4de7ff';
    } else if (enemy.specialType === 'life') {
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#4dff92';
    }
    ctx.globalAlpha = pulse;
    if (enemy.specialType === 'shield') {
      ctx.fillStyle = '#4de7ff';
      ctx.strokeStyle = '#dffbff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.x + 13, enemy.y);
      ctx.lineTo(enemy.x + enemy.width, enemy.y + 8);
      ctx.lineTo(enemy.x + enemy.width - 8, enemy.y + enemy.height);
      ctx.lineTo(enemy.x + 8, enemy.y + enemy.height);
      ctx.lineTo(enemy.x, enemy.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(enemy.x + 8, enemy.y + 5, enemy.width - 16, 6);
      ctx.fillRect(enemy.x + 8, enemy.y + 11, enemy.width - 16, 4);
    } else if (enemy.specialType === 'life') {
      ctx.fillStyle = '#34ff80';
      ctx.strokeStyle = '#d8ffe6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.x + 8, enemy.y);
      ctx.lineTo(enemy.x + enemy.width - 4, enemy.y + 6);
      ctx.lineTo(enemy.x + enemy.width - 2, enemy.y + enemy.height - 4);
      ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
      ctx.lineTo(enemy.x + 2, enemy.y + enemy.height - 4);
      ctx.lineTo(enemy.x + 2, enemy.y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(enemy.x + 7, enemy.y + 5, enemy.width - 14, 4);
      ctx.fillRect(enemy.x + 8, enemy.y + 10, enemy.width - 16, 3);
    } else if (enemy.type === 'elite') {
      ctx.fillStyle = '#ff64b7';
      ctx.strokeStyle = '#ffd3ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.x + 13, enemy.y);
      ctx.lineTo(enemy.x + enemy.width, enemy.y + 8);
      ctx.lineTo(enemy.x + enemy.width - 8, enemy.y + enemy.height);
      ctx.lineTo(enemy.x + 8, enemy.y + enemy.height);
      ctx.lineTo(enemy.x, enemy.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (enemy.type === 'scout') {
      ctx.fillStyle = '#7af0ff';
      ctx.fillRect(enemy.x + 5, enemy.y + 4, enemy.width - 10, enemy.height - 8);
      ctx.fillRect(enemy.x + 8, enemy.y + 2, enemy.width - 16, enemy.height - 4);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(enemy.x + 7, enemy.y + 6, enemy.width - 14, enemy.height - 12);
    } else {
      ctx.fillStyle = '#4de7ff';
      ctx.fillRect(enemy.x + 4, enemy.y + 4, enemy.width - 8, enemy.height - 8);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(enemy.x + 4, enemy.y + 4, enemy.width - 8, enemy.height - 8);
    }
    ctx.restore();
  }
}

function drawBoss() {
  if (!boss || !boss.alive) return;
  ctx.save();
  if (bossHitFlash > 0) ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#ff64b7';
  ctx.strokeStyle = '#ffd3ea';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(boss.x, boss.y, boss.width, boss.height, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4de7ff';
  ctx.fillRect(boss.x + 28, boss.y + 28, boss.width - 56, 20);
  ctx.fillStyle = '#0c1427';
  ctx.fillRect(boss.x + 30, boss.y + 30, boss.width - 60, 16);
  ctx.fillStyle = '#7af0ff';
  ctx.fillRect(boss.x + 30, boss.y + 30, (boss.width - 60) * (boss.hp / boss.maxHp), 16);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(boss.x + 45, boss.y + 55, 20, 18);
  ctx.fillRect(boss.x + boss.width - 65, boss.y + 55, 20, 18);
  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawHudText() {
  if (specialEnemy && specialEnemy.specialType === 'shield') {
    ctx.save();
    ctx.fillStyle = specialEnemy.warningPulse % 2 === 0 ? 'rgba(77, 231, 255, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`SHIELD CARRIER ${Math.max(0, Math.ceil(specialEnemy.specialTimer / 60))}`, canvas.width / 2, 24);
    ctx.restore();
  }

  if (lifeCarrierEnemy && lifeCarrierEnemy.specialType === 'life') {
    ctx.save();
    ctx.fillStyle = lifeCarrierEnemy.warningPulse % 2 === 0 ? 'rgba(77, 255, 138, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`GREEN LIFE CARRIER ${Math.max(0, Math.ceil(lifeCarrierEnemy.specialTimer / 60))}`, canvas.width / 2, 44);
    ctx.restore();
  }

  if (levelTransitionTimer > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(77, 231, 255, 0.95)';
    ctx.font = 'bold 22px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(levelText, canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }
}

function render() {
  drawBackground();
  drawParticles();
  drawBullets();
  drawEnemies();
  drawBoss();
  drawPlayer();
  drawHudText();
}

function loop(timestamp) {
  const delta = Math.min(1.7, (timestamp - lastTime) / 16.67 || 1);
  lastTime = timestamp;

  if (gameState === 'running') {
    updatePlayer(delta);
    updateBullets(delta);
    updateEnemyBullets(delta);
    if (boss && boss.alive) {
      updateBoss(delta);
    } else if (enemies.length > 0) {
      updateEnemies(delta);
    }
    updateParticles(delta);
    updateStars(delta);

    if (levelTransitionTimer > 0) {
      levelTransitionTimer -= 1;
      if (levelTransitionTimer <= 0) {
        if (level >= 10 && !boss) {
          startBoss();
        } else if (level < 10) {
          level += 1;
          createWave();
          updateHud();
        }
      }
    } else if (enemies.length === 0 && !boss && levelTransitionTimer <= 0) {
      advanceToNextStage();
    }

    if (victoryFlash > 0) {
      victoryFlash -= 1;
    }
    if (shieldPulse > 0) {
      shieldPulse -= 1;
    }
  }

  render();
  if (gameState === 'running' || gameState === 'paused' || gameState === 'victory') {
    animationFrameId = requestAnimationFrame(loop);
  } else {
    animationFrameId = null;
  }
}

function handleKeyDown(event) {
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') controlState.left = true;
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') controlState.right = true;
  if (event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    controlState.shoot = true;
  }
  if (event.key.toLowerCase() === 'p') {
    event.preventDefault();
    togglePause();
  }
}

function handleKeyUp(event) {
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') controlState.left = false;
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') controlState.right = false;
  if (event.key === ' ' || event.key === 'Spacebar') controlState.shoot = false;
}

function togglePause() {
  if (gameState === 'running') {
    gameState = 'paused';
    uiPauseSound();
    showScreen(pauseScreen);
  } else if (gameState === 'paused') {
    gameState = 'running';
    uiPauseSound();
    hideScreens();
    lastTime = performance.now();
  }
}

function bindTouch(buttonName) {
  const btn = touchButtons[buttonName];
  if (!btn) return;

  let suppressNextClick = false;

  const handleInput = (event) => {
    if (event.type === 'touchstart' || event.type === 'pointerdown') {
      event.preventDefault();
      event.stopPropagation();
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      suppressNextClick = true;
      controlState[buttonName] = true;
      if (buttonName === 'shoot') shootPlayer();
      if (buttonName === 'pause') togglePause();
      return;
    }

    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

    controlState[buttonName] = true;
    if (buttonName === 'shoot') shootPlayer();
    if (buttonName === 'pause') togglePause();
  };

  btn.addEventListener('touchstart', handleInput, { passive: false });
  btn.addEventListener('pointerdown', handleInput);
  btn.addEventListener('click', handleInput);
  btn.addEventListener('pointerup', () => {
    controlState[buttonName] = false;
  });
  btn.addEventListener('pointerleave', () => {
    controlState[buttonName] = false;
  });
}

function restartCurrentGame() {
  stopLoop();
  clearPendingTimeouts();
  score = 0;
  level = 1;
  lives = 3;
  setupGame();
  gameState = 'running';
  hideScreens();
  resetControls();
  startLoop();
}

startBtn.addEventListener('click', () => {
  initAudio();
  startGame();
});

resumeBtn.addEventListener('click', () => {
  initAudio();
  togglePause();
});
restartPauseBtn.addEventListener('click', () => {
  initAudio();
  uiRetrySound();
  restartCurrentGame();
});
retryBtn.addEventListener('click', () => {
  initAudio();
  uiRetrySound();
  restartCurrentGame();
});
victoryBtn.addEventListener('click', () => {
  initAudio();
  uiRetrySound();
  restartCurrentGame();
});
backBtn.addEventListener('click', () => {
  initAudio();
  uiExitSound();
  window.location.href = '../index.html';
});

bindTouch('left', 'left');
bindTouch('right', 'right');
bindTouch('shoot', 'shoot');
bindTouch('pause', 'pause');

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('pointerdown', initAudio, { once: true });
window.addEventListener('keydown', initAudio, { once: true });

updateHud();
render();

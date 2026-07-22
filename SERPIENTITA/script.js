const GRID_SIZE = 20;
const CELL_SIZE = 20;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let snake, food, bonus, walls, dx, dy, nextDx, nextDy, score, speed, gameRunning, paused, lastMoveTime, level, shakeAmount, levelMessage, levelMessageTime, foodTimer;

let audioCtx;

// Elementos
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const winScreen = document.getElementById('winScreen');
const pauseBtn = document.getElementById('btnPause');

// ====================== AUDIO ======================
function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(freq, duration, type = 'square', volume = 0.3) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// ====================== INICIO ======================
function initGame() {
  snake = [{x: 10, y: 10}];
  dx = 1; dy = 0;
  nextDx = 1; nextDy = 0;
  score = 0;
  level = 1;
  speed = 155;
  gameRunning = true;
  paused = false;
  shakeAmount = 0;
  levelMessage = "";
  levelMessageTime = 0;
  lastMoveTime = Date.now();
  foodTimer = Date.now();
  walls = [];

  document.getElementById('score').textContent = `SCORE: 00000`;
  document.getElementById('level').textContent = `LEVEL: 01`;

  spawnFood();
  bonus = null;
  setTimeout(spawnBonus, 18000);
}

function startNewGame() {
  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  winScreen.style.display = 'none';
  initGame();
  requestAnimationFrame(gameLoop);
}

// ====================== SONIDOS ======================
function eatNormalSound() {
  playSound(820, 0.07);
  setTimeout(() => playSound(1250, 0.1), 30);
}

function eatBonusSound() {
  playSound(650, 0.1);
  playSound(1050, 0.15, 'sawtooth');
  playSound(1350, 0.25, 'sine', 0.4);
}

function deathSound() {
  playSound(400, 0.5, 'sawtooth', 0.6);
  setTimeout(() => playSound(180, 0.8, 'sawtooth', 0.5), 150);
}

// ====================== CONTROLES (Teclado + Táctil) ======================
function changeDirection(newDx, newDy) {
  if (!gameRunning || paused) return;
  if (dx === -newDx && dy === -newDy) return; // evitar giro 180°
  nextDx = newDx;
  nextDy = newDy;
}

function bindButtonAction(button, handler) {
  let suppressNextClick = false;

  const runAction = (event) => {
    if (event.type === 'touchstart' || event.type === 'pointerdown') {
      event.preventDefault();
      event.stopPropagation();
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      suppressNextClick = true;
      handler(event);
      return;
    }

    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

    handler(event);
  };

  button.addEventListener('touchstart', runAction, { passive: false });
  button.addEventListener('pointerdown', runAction);
  button.addEventListener('click', runAction);
}

function togglePause() {
  if (!gameRunning || gameOver) return;
  paused = !paused;
  if (!paused) {
    lastMoveTime = Date.now();
  }
  draw();
}

document.addEventListener('keydown', e => {
  switch(e.key.toLowerCase()) {
    case 'w': case 'arrowup':    changeDirection(0, -1); break;
    case 's': case 'arrowdown':  changeDirection(0, 1); break;
    case 'a': case 'arrowleft':  changeDirection(-1, 0); break;
    case 'd': case 'arrowright': changeDirection(1, 0); break;
    case 'p':
      e.preventDefault();
      togglePause();
      break;
  }
});

// Controles táctiles y clic
document.getElementById('btnUp') && bindButtonAction(document.getElementById('btnUp'), () => changeDirection(0, -1));
document.getElementById('btnDown') && bindButtonAction(document.getElementById('btnDown'), () => changeDirection(0, 1));
document.getElementById('btnLeft') && bindButtonAction(document.getElementById('btnLeft'), () => changeDirection(-1, 0));
document.getElementById('btnRight') && bindButtonAction(document.getElementById('btnRight'), () => changeDirection(1, 0));
pauseBtn && bindButtonAction(pauseBtn, togglePause);

// ====================== LÓGICA DEL JUEGO ======================
function updateDirection() {
  dx = nextDx;
  dy = nextDy;
}

function moveSnake() {
  if (paused || !gameRunning) return;
  updateDirection();

  let head = { x: snake[0].x + dx, y: snake[0].y + dy };

  if (head.x < 0) head.x = GRID_SIZE - 1;
  if (head.x >= GRID_SIZE) head.x = 0;
  if (head.y < 0) head.y = GRID_SIZE - 1;
  if (head.y >= GRID_SIZE) head.y = 0;

  if (walls.some(w => w.x === head.x && w.y === head.y) || snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 1;
    eatNormalSound();
    updateScore();
    spawnFood();
    if (score % 7 === 0 && level < 20) nextLevel();
    increaseSpeed();
  } else if (bonus && head.x === bonus.x && head.y === bonus.y) {
    score += 10;
    eatBonusSound();
    updateScore();
    bonus = null;
    shakeAmount = 12;
  } else {
    snake.pop();
  }

  if (level >= 8 && Date.now() - foodTimer > 7500) spawnFood();
}

function increaseSpeed() {
  if (speed > 65 && level < 20) speed = Math.max(65, 155 - level * 4.5);
}

function updateScore() {
  document.getElementById('score').textContent = `SCORE: ${score.toString().padStart(5, '0')}`;
  document.getElementById('level').textContent = `LEVEL: ${level.toString().padStart(2, '0')}`;
}

// Spawn
function spawnFood() {
  do {
    food = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
  } while (snake.some(s => s.x === food.x && s.y === food.y) || walls.some(w => w.x === food.x && w.y === food.y));
  foodTimer = Date.now();
}

function spawnBonus() {
  if (!gameRunning || paused) return;
  do {
    bonus = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
  } while (snake.some(s => s.x === bonus.x && s.y === bonus.y) || walls.some(w => w.x === bonus.x && w.y === bonus.y));
  setTimeout(() => { if (bonus) bonus = null; }, 5000);
  setTimeout(spawnBonus, Math.random() * 16000 + 14000);
}

function nextLevel() {
  level++;
  updateScore();
  levelMessage = `LEVEL ${level}`;
  levelMessageTime = Date.now() + 1100;
  if (level >= 5 && walls.length === 0) generateWalls();
  if (level >= 20) winGame();
}

function generateWalls() {
  walls = [];
  for (let i = 0; i < 7; i++) {
    let w;
    do {
      w = { x: Math.floor(Math.random() * 14) + 3, y: Math.floor(Math.random() * 14) + 3 };
    } while (snake.some(s => s.x === w.x && s.y === w.y) || walls.some(wall => wall.x === w.x && wall.y === w.y));
    walls.push(w);
  }
}

// ====================== DIBUJO ======================
function draw() {
  const shake = shakeAmount > 0 ? (Math.random() * shakeAmount - shakeAmount/2) : 0;
  ctx.save();
  ctx.translate(shake, shake);

  ctx.fillStyle = '#001a00';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(0, 110, 0, 0.3)';
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i*CELL_SIZE, 0); ctx.lineTo(i*CELL_SIZE, canvas.height);
    ctx.moveTo(0, i*CELL_SIZE); ctx.lineTo(canvas.width, i*CELL_SIZE);
    ctx.stroke();
  }

  ctx.fillStyle = '#555';
  ctx.strokeStyle = '#888';
  walls.forEach(w => {
    ctx.fillRect(w.x*CELL_SIZE+2, w.y*CELL_SIZE+2, CELL_SIZE-4, CELL_SIZE-4);
    ctx.strokeRect(w.x*CELL_SIZE+4, w.y*CELL_SIZE+4, CELL_SIZE-8, CELL_SIZE-8);
  });

  snake.forEach((seg, i) => {
    if (i === 0) {
      ctx.fillStyle = '#0f0';
      ctx.fillRect(seg.x*CELL_SIZE, seg.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.fillStyle = '#000';
      const es = 4;
      if (dx===1) { ctx.fillRect(seg.x*CELL_SIZE+12, seg.y*CELL_SIZE+6, es, es); ctx.fillRect(seg.x*CELL_SIZE+12, seg.y*CELL_SIZE+12, es, es); }
      else if (dx===-1) { ctx.fillRect(seg.x*CELL_SIZE+4, seg.y*CELL_SIZE+6, es, es); ctx.fillRect(seg.x*CELL_SIZE+4, seg.y*CELL_SIZE+12, es, es); }
      else if (dy===-1) { ctx.fillRect(seg.x*CELL_SIZE+6, seg.y*CELL_SIZE+4, es, es); ctx.fillRect(seg.x*CELL_SIZE+12, seg.y*CELL_SIZE+4, es, es); }
      else { ctx.fillRect(seg.x*CELL_SIZE+6, seg.y*CELL_SIZE+12, es, es); ctx.fillRect(seg.x*CELL_SIZE+12, seg.y*CELL_SIZE+12, es, es); }
    } else {
      ctx.fillStyle = i%2===0 ? '#0c0' : '#0a0';
      ctx.fillRect(seg.x*CELL_SIZE+1, seg.y*CELL_SIZE+1, CELL_SIZE-2, CELL_SIZE-2);
    }
  });

  const p = Math.sin(Date.now()/140)*1.5 + 4;
  ctx.fillStyle = '#f00';
  ctx.fillRect(food.x*CELL_SIZE + p, food.y*CELL_SIZE + 6, 12, 10);
  ctx.fillStyle = '#0a0';
  ctx.fillRect(food.x*CELL_SIZE + 8, food.y*CELL_SIZE + 2, 4, 6);

  if (bonus) {
    const a = Math.sin(Date.now()/80)*0.3 + 0.7;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ff0';
    ctx.font = 'bold 20px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('◆', bonus.x*CELL_SIZE+10, bonus.y*CELL_SIZE+17);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  if (Date.now() < levelMessageTime) {
    ctx.fillStyle = '#ff0';
    ctx.font = 'bold 28px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(levelMessage, 200, 60);
  }

  if (shakeAmount > 0) shakeAmount *= 0.82;
}

// ====================== PANTALLAS ======================
function gameOver() {
  gameRunning = false;
  deathSound();
  shakeAmount = 25;
  setTimeout(() => {
    document.getElementById('finalScore').textContent = `SCORE: ${score.toString().padStart(5,'0')}`;
    gameOverScreen.style.display = 'flex';
  }, 600);
}

function winGame() {
  gameRunning = false;
  shakeAmount = 15;
  setTimeout(() => {
    document.getElementById('winScore').textContent = `SCORE: ${score.toString().padStart(5,'0')}`;
    winScreen.style.display = 'flex';
  }, 500);
}

function showPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0,0,400,400);
  ctx.fillStyle = '#ff0';
  ctx.font = 'bold 36px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSA', 200, 180);
  ctx.font = '20px Courier New';
  ctx.fillText('P = REANUDAR', 200, 230);
}

function hidePause() { draw(); }

// ====================== GAME LOOP ======================
function gameLoop() {
  if (!gameRunning) return;
  if (Date.now() - lastMoveTime >= speed) {
    moveSnake();
    lastMoveTime = Date.now();
  }
  draw();
  if (paused) showPause();
  requestAnimationFrame(gameLoop);
}

// ====================== BOTONES ======================
document.getElementById('startBtn').addEventListener('click', startNewGame);
document.getElementById('retryBtn').addEventListener('click', startNewGame);
document.getElementById('winRestartBtn').addEventListener('click', startNewGame);

// ====================== INICIO ======================
initAudio();
startScreen.style.display = 'flex';
gameOverScreen.style.display = 'none';
winScreen.style.display = 'none';
// Botón volver al menú
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.location.href = '../index.html';
  });
}
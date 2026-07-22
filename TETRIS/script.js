const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;
const PREVIEW_SIZE = 4;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;

const scoreLabel = document.getElementById('score');
const levelLabel = document.getElementById('level');
const linesLabel = document.getElementById('lines');
const finalScore = document.getElementById('finalScore');

const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');

const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartPauseBtn = document.getElementById('restartPauseBtn');
const backBtn = document.getElementById('backBtn');

const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnRotate = document.getElementById('btnRotate');
const btnDown = document.getElementById('btnDown');
const btnHardDrop = document.getElementById('btnHardDrop');
const btnPause = document.getElementById('btnPause');
const mascot = document.getElementById('mascot');
let mascotModeTimer = null;

const TETROMINOES = {
  I: { color: '#ff4d4d', matrix: [[1, 1, 1, 1]] },
  O: { color: '#ff7070', matrix: [[1, 1], [1, 1]] },
  T: { color: '#ff2f2f', matrix: [[0, 1, 0], [1, 1, 1]] },
  S: { color: '#ff7b7b', matrix: [[0, 1, 1], [1, 1, 0]] },
  Z: { color: '#ff5353', matrix: [[1, 1, 0], [0, 1, 1]] },
  J: { color: '#ff9090', matrix: [[1, 0, 0], [1, 1, 1]] },
  L: { color: '#ff6666', matrix: [[0, 0, 1], [1, 1, 1]] },
};

const PIECE_TYPES = Object.keys(TETROMINOES);

const state = {
  board: [],
  currentPiece: null,
  nextPiece: null,
  score: 0,
  lines: 0,
  level: 1,
  dropInterval: 800,
  lastTime: 0,
  paused: false,
  running: false,
  gameOver: false,
  lineClearAnimation: null,
  animationFrameId: null,
  audioContext: null,
};

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function randomPiece() {
  const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  return createPiece(type);
}

function createPiece(type) {
  const shape = TETROMINOES[type];
  return {
    type,
    color: shape.color,
    matrix: cloneMatrix(shape.matrix),
    x: Math.floor((COLS - shape.matrix[0].length) / 2),
    y: -1,
  };
}

function initAudio() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return;
  state.audioContext = new AudioContextCtor();
}

function playSound(frequency, duration, type = 'square', volume = 0.05) {
  if (!state.audioContext) return;

  const oscillator = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, state.audioContext.currentTime);
  gain.gain.value = volume;

  oscillator.connect(gain);
  gain.connect(state.audioContext.destination);

  oscillator.start();
  oscillator.stop(state.audioContext.currentTime + duration);
}

function playSoundEffect(name) {
  switch (name) {
    case 'move':
      playSound(220, 0.03, 'square', 0.03);
      break;
    case 'rotate':
      playSound(330, 0.04, 'square', 0.04);
      break;
    case 'lock':
      playSound(180, 0.06, 'triangle', 0.04);
      break;
    case 'clear':
      playSound(420, 0.07, 'sawtooth', 0.05);
      setTimeout(() => playSound(700, 0.08, 'triangle', 0.04), 35);
      break;
    case 'gameOver':
      playSound(220, 0.22, 'sawtooth', 0.05);
      setTimeout(() => playSound(120, 0.4, 'sawtooth', 0.05), 80);
      break;
    default:
      break;
  }
}

function updateHud() {
  scoreLabel.textContent = `SCORE: ${state.score.toString().padStart(6, '0')}`;
  levelLabel.textContent = `LEVEL: ${state.level.toString().padStart(2, '0')}`;
  linesLabel.textContent = `LINES: ${state.lines.toString().padStart(3, '0')}`;
}

function setMascotMood(mood, direction = null) {
  if (!mascot) return;

  if (mascotModeTimer) {
    clearTimeout(mascotModeTimer);
  }

  mascot.classList.remove('look-left', 'look-right', 'spin', 'celebrate', 'excited', 'sad', 'sleep');

  if (direction === 'left') {
    mascot.classList.add('look-left');
  } else if (direction === 'right') {
    mascot.classList.add('look-right');
  }

  if (mood) {
    mascot.classList.add(mood);
  }

  if (mood === 'spin' || mood === 'celebrate' || mood === 'excited') {
    mascotModeTimer = setTimeout(() => {
      mascot.classList.remove(mood);
      mascot.classList.remove('look-left', 'look-right');
    }, 500);
  }
}

function normalizeMascot() {
  setMascotMood(null);
}

function resetGame() {
  state.board = createEmptyBoard();
  state.currentPiece = randomPiece();
  state.nextPiece = randomPiece();
  state.score = 0;
  state.lines = 0;
  state.level = 1;
  state.dropInterval = 800;
  state.lastTime = performance.now();
  state.paused = false;
  state.running = true;
  state.gameOver = false;
  state.lineClearAnimation = null;
  updateHud();
  drawPreview(nextCtx, state.nextPiece, nextCanvas);
}

function startGame() {
  resetGame();
  startScreen.style.display = 'none';
  pauseScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  if (pauseScreen) {
    pauseScreen.style.display = 'none';
  }
  draw();
  state.animationFrameId = requestAnimationFrame(gameLoop);
}

function showGameOver() {
  state.running = false;
  state.gameOver = true;
  finalScore.textContent = `SCORE: ${state.score.toString().padStart(6, '0')}`;
  gameOverScreen.style.display = 'flex';
  setMascotMood('sad');
  playSoundEffect('gameOver');
}

function togglePause() {
  if (!state.running || state.gameOver) return;

  state.paused = !state.paused;
  if (state.paused) {
    pauseScreen.style.display = 'flex';
  } else {
    pauseScreen.style.display = 'none';
    state.lastTime = performance.now();
  }
}

function restartGame() {
  if (state.animationFrameId) {
    cancelAnimationFrame(state.animationFrameId);
  }
  startGame();
}

function drawCell(context, x, y, color, size) {
  context.fillStyle = color;
  context.fillRect(x * size, y * size, size, size);
  context.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  context.lineWidth = 2;
  context.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function drawPreview(context, piece, canvasElement) {
  if (!canvasElement) return;

  const previewContext = context || (canvasElement.getContext ? canvasElement.getContext('2d') : null);
  if (!previewContext) return;

  previewContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
  previewContext.fillStyle = '#120909';
  previewContext.fillRect(0, 0, canvasElement.width, canvasElement.height);

  if (!piece) return;

  const matrix = piece.matrix;
  const offsetX = Math.floor((canvasElement.width - matrix[0].length * 20) / 2);
  const offsetY = Math.floor((canvasElement.height - matrix.length * 20) / 2);

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(previewContext, x + offsetX / 20, y + offsetY / 20, piece.color, 20);
      }
    });
  });
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#120909';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      ctx.strokeStyle = 'rgba(255, 40, 40, 0.15)';
      ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
  }

  state.board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(ctx, x, y, value, BLOCK_SIZE);
      }
    });
  });
}

function drawGhostPiece() {
  if (!state.currentPiece) return;

  const ghost = {
    ...state.currentPiece,
    matrix: cloneMatrix(state.currentPiece.matrix),
  };

  while (!collides(ghost, 0, 1)) {
    ghost.y += 1;
  }

  ghost.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        ctx.fillStyle = 'rgba(255, 80, 80, 0.24)';
        ctx.fillRect((ghost.x + x) * BLOCK_SIZE + 4, (ghost.y + y) * BLOCK_SIZE + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8);
      }
    });
  });
}

function drawCurrentPiece() {
  if (!state.currentPiece) return;

  state.currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(ctx, state.currentPiece.x + x, state.currentPiece.y + y, state.currentPiece.color, BLOCK_SIZE);
      }
    });
  });
}

function drawLineClearAnimation() {
  if (!state.lineClearAnimation) return;
  const alpha = Math.max(0.28, 0.7 - (performance.now() - state.lineClearAnimation.start) / 180);

  state.lineClearAnimation.rows.forEach((rowIndex) => {
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(0, rowIndex * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
  });
}

function draw() {
  drawBoard();
  drawGhostPiece();
  drawCurrentPiece();
  drawLineClearAnimation();
}

function collides(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;

      const nextX = piece.x + x + offsetX;
      const nextY = piece.y + y + offsetY;

      if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
        return true;
      }

      if (nextY >= 0 && state.board[nextY][nextX]) {
        return true;
      }
    }
  }

  return false;
}

function mergePieceIntoBoard() {
  state.currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const boardY = state.currentPiece.y + y;
        const boardX = state.currentPiece.x + x;
        if (boardY >= 0) {
          state.board[boardY][boardX] = state.currentPiece.color;
        }
      }
    });
  });
}

function clearLines() {
  const rowsToClear = [];

  for (let y = 0; y < ROWS; y++) {
    if (state.board[y].every(Boolean)) {
      rowsToClear.push(y);
    }
  }

  if (rowsToClear.length === 0) return 0;

  state.lineClearAnimation = {
    rows: rowsToClear,
    start: performance.now(),
  };

  const linesCount = rowsToClear.length;

  setTimeout(() => {
    rowsToClear.forEach((rowIndex) => {
      state.board.splice(rowIndex, 1);
      state.board.unshift(Array(COLS).fill(null));
    });

    state.lines += linesCount;
    state.score += [0, 100, 300, 500, 800][linesCount] * state.level;
    state.level = Math.floor(state.lines / 10) + 1;
    state.dropInterval = Math.max(120, 800 - (state.level - 1) * 60);
    state.lineClearAnimation = null;
    updateHud();
    if (nextCtx && nextCanvas) {
      drawPreview(nextCtx, state.nextPiece, nextCanvas);
    }
  }, 150);

  return linesCount;
}

function lockPiece() {
  mergePieceIntoBoard();
  playSoundEffect('lock');
  setMascotMood('celebrate');

  const clearedLines = clearLines();
  if (clearedLines > 0) {
    playSoundEffect('clear');
    if (clearedLines > 1) {
      setMascotMood('excited');
    }
  }

  state.currentPiece = state.nextPiece;
  state.nextPiece = randomPiece();

  if (collides(state.currentPiece, 0, 0)) {
    showGameOver();
  }

  drawPreview(nextCtx, state.nextPiece, nextCanvas);
}

function movePiece(direction) {
  if (!state.running || state.paused || state.gameOver) return;

  if (!collides(state.currentPiece, direction, 0)) {
    state.currentPiece.x += direction;
    playSoundEffect('move');
    setMascotMood(null, direction > 0 ? 'right' : 'left');
    draw();
  }
}

function rotatePiece() {
  if (!state.running || state.paused || state.gameOver) return;

  const rotatedMatrix = state.currentPiece.matrix[0].map((_, index) =>
    state.currentPiece.matrix.map((row) => row[index]).reverse()
  );

  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collides(state.currentPiece, kick, 0, rotatedMatrix)) {
      state.currentPiece.matrix = rotatedMatrix;
      state.currentPiece.x += kick;
      playSoundEffect('rotate');
      setMascotMood('spin');
      draw();
      return;
    }
  }
}

function softDrop() {
  if (!state.running || state.paused || state.gameOver) return;

  if (!collides(state.currentPiece, 0, 1)) {
    state.currentPiece.y += 1;
    state.score += 1;
    updateHud();
  } else {
    lockPiece();
  }
}

function hardDrop() {
  if (!state.running || state.paused || state.gameOver) return;

  let dropDistance = 0;
  while (!collides(state.currentPiece, 0, 1)) {
    state.currentPiece.y += 1;
    dropDistance += 1;
  }

  state.score += dropDistance * 2;
  updateHud();
  lockPiece();
}

function updateGame(time) {
  if (!state.running || state.paused || state.gameOver) return;

  if (time - state.lastTime >= state.dropInterval) {
    if (!collides(state.currentPiece, 0, 1)) {
      state.currentPiece.y += 1;
    } else {
      lockPiece();
    }

    state.lastTime = time;
  }
}

function gameLoop(time) {
  updateGame(time);
  draw();

  if (state.running) {
    state.animationFrameId = requestAnimationFrame(gameLoop);
  }
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();

  if (key === 'p') {
    event.preventDefault();
    togglePause();
    return;
  }

  if (!state.running || state.paused || state.gameOver) return;

  switch (key) {
    case 'arrowleft':
    case 'a':
      event.preventDefault();
      movePiece(-1);
      break;
    case 'arrowright':
    case 'd':
      event.preventDefault();
      movePiece(1);
      break;
    case 'arrowdown':
    case 's':
      event.preventDefault();
      softDrop();
      break;
    case 'arrowup':
    case 'w':
      event.preventDefault();
      rotatePiece();
      break;
    case ' ':
      event.preventDefault();
      hardDrop();
      break;
    default:
      break;
  }
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

function bindControls() {
  document.addEventListener('keydown', handleKeydown);

  startBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', restartGame);
  resumeBtn.addEventListener('click', togglePause);
  if (restartPauseBtn) {
    restartPauseBtn.addEventListener('click', restartGame);
  }

  if (btnLeft) {
    bindButtonAction(btnLeft, () => movePiece(-1));
  }

  if (btnRight) {
    bindButtonAction(btnRight, () => movePiece(1));
  }

  if (btnRotate) {
    bindButtonAction(btnRotate, () => rotatePiece());
  }

  if (btnDown) {
    bindButtonAction(btnDown, () => softDrop());
  }

  if (btnHardDrop) {
    bindButtonAction(btnHardDrop, () => hardDrop());
  }

  if (btnPause) {
    bindButtonAction(btnPause, () => togglePause());
  }

  backBtn.addEventListener('click', () => {
    window.location.href = '../index.html';
  });
}

function init() {
  initAudio();
  bindControls();
  updateHud();
  if (nextCtx && nextCanvas) {
    drawPreview(nextCtx, null, nextCanvas);
  }
  normalizeMascot();
  draw();
}

init();

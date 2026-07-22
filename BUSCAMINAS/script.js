const GRID_SIZE = 10;
const CELL_SIZE = 40;
const TOTAL_MINES = 12;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let board = [];
let revealed = [];
let flags = [];
let gameRunning = false;
let gameOver = false;
let win = false;
let timer = 0;
let timerInterval;
let minesLeft = TOTAL_MINES;

function initBoard() {
  board = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
  revealed = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
  flags = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
  
  let placed = 0;
  while (placed < TOTAL_MINES) {
    let x = Math.floor(Math.random() * GRID_SIZE);
    let y = Math.floor(Math.random() * GRID_SIZE);
    if (board[y][x] !== -1) {
      board[y][x] = -1;
      placed++;
    }
  }
  
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (board[y][x] === -1) continue;
      board[y][x] = countAdjacentMines(x, y);
    }
  }
}

function countAdjacentMines(x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (board[ny][nx] === -1) count++;
      }
    }
  }
  return count;
}

function draw() {
  ctx.fillStyle = '#001a00';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      if (revealed[y][x]) {
        ctx.fillStyle = '#222';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        
        const value = board[y][x];
        if (value === -1) {
          ctx.fillStyle = '#f00';
          ctx.font = 'bold 28px Courier New';
          ctx.textAlign = 'center';
          ctx.fillText('💥', px + CELL_SIZE/2, py + CELL_SIZE/2 + 8);
        } else if (value > 0) {
          ctx.fillStyle = ['#0f0', '#ff0', '#f00', '#c0f'][value-1] || '#fff';
          ctx.font = 'bold 24px Courier New';
          ctx.fillText(value.toString(), px + CELL_SIZE/2, py + CELL_SIZE/2 + 8);
        }
      } else {
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        
        if (flags[y][x]) {
          ctx.fillStyle = '#f00';
          ctx.font = 'bold 24px Courier New';
          ctx.fillText('🚩', px + CELL_SIZE/2, py + CELL_SIZE/2 + 8);
        }
      }
    }
  }
}

function reveal(x, y) {
  if (revealed[y][x] || flags[y][x] || gameOver) return;
  
  revealed[y][x] = true;
  
  if (board[y][x] === -1) {
    gameOver = true;
    clearInterval(timerInterval);
    document.getElementById('gameOverScreen').style.display = 'flex';
    draw();
    return;
  }
  
  if (board[y][x] === 0) {
    floodFill(x, y);
  }
  
  checkWin();
  draw();
}

function floodFill(x, y) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (!revealed[ny][nx] && !flags[ny][nx]) {
          revealed[ny][nx] = true;
          if (board[ny][nx] === 0) floodFill(nx, ny);
        }
      }
    }
  }
}

function checkWin() {
  let unrevealed = 0;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!revealed[y][x] && board[y][x] !== -1) unrevealed++;
    }
  }
  if (unrevealed === 0) {
    win = true;
    gameOver = true;
    clearInterval(timerInterval);
    document.getElementById('winScreen').style.display = 'flex';
  }
}

let suppressNextCanvasClick = false;

function getCanvasCellFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / CELL_SIZE);
  const y = Math.floor((event.clientY - rect.top) / CELL_SIZE);
  return { x, y };
}

function handleCanvasInput(event) {
  if (event.type === 'touchstart' || event.type === 'pointerdown') {
    event.preventDefault();
    event.stopPropagation();
    if (suppressNextCanvasClick) {
      suppressNextCanvasClick = false;
      return;
    }
    suppressNextCanvasClick = true;
    const { x, y } = getCanvasCellFromEvent(event);
    reveal(x, y);
    return;
  }

  if (suppressNextCanvasClick) {
    suppressNextCanvasClick = false;
    return;
  }

  const { x, y } = getCanvasCellFromEvent(event);
  reveal(x, y);
}

canvas.addEventListener('touchstart', handleCanvasInput, { passive: false });
canvas.addEventListener('pointerdown', handleCanvasInput);
canvas.addEventListener('click', handleCanvasInput);

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (!gameRunning || gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
  const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
  
  if (!revealed[y][x]) {
    flags[y][x] = !flags[y][x];
    minesLeft = TOTAL_MINES - flags.flat().filter(f => f).length;
    document.getElementById('minesLeft').textContent = `MINAS: ${minesLeft}`;
    draw();
  }
});

// Controles de botones
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);
document.getElementById('winRestartBtn').addEventListener('click', startGame);

// Botón X
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.location.href = '../index.html';
  });
}

function startGame() {
  initBoard();
  gameRunning = true;
  gameOver = false;
  win = false;
  timer = 0;
  minesLeft = TOTAL_MINES;
  
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('winScreen').style.display = 'none';
  document.getElementById('gameContainer').style.display = 'block';
  
  if (backBtn) backBtn.style.display = 'block';
  
  document.getElementById('minesLeft').textContent = `MINAS: ${minesLeft}`;
  document.getElementById('timer').textContent = `TIEMPO: 000`;
  
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer++;
    document.getElementById('timer').textContent = `TIEMPO: ${timer.toString().padStart(3, '0')}`;
  }, 1000);
  
  draw();
}

// Iniciar
document.getElementById('startScreen').style.display = 'flex';
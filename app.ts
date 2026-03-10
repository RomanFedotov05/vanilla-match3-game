{
  // Додаємо стилі прямо в body, щоб прибрати скроли і відступи браузера
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.backgroundColor = "#1E1E24";

  const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;

  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.touchAction = "none";

  const ROWS = 8,
    COLS = 8,
    TYPES = 5;
  const colors = ["", "#FF595E", "#8AC926", "#1982C4", "#FFCA3A", "#6A4C93"];

  // Динамічні змінні (тепер вони змінюються при ресайзі)
  let CELL_SIZE = 70;
  let OFFSET_X = 40,
    OFFSET_Y = 40,
    UI_X = 780,
    UI_Y = 40;

  let board: number[][] = [];
  let visualY: number[][] = [];
  let visualX: number[][] = [];
  let scale: number[][] = [];
  let flash: number[][] = [];

  let selectedTile: { r: number; c: number } | null = null;
  let isDragging = false;
  let gameState:
    | "WAITING"
    | "ANIMATING_SWAP"
    | "ANIMATING_MATCHES"
    | "REFILLING" = "WAITING";
  let lastMoveTiles: { r: number; c: number }[] = [];

  const SWAP_DELAY = 300;

  let currentCombo = 0,
    maxCombo = 0,
    lastRecord = 0,
    comboAlpha = 0,
    comboScale = 1;
  let screenShake = 0;
  let particles: any[] = [];
  let lightnings: any[] = [];

  // --- СУПЕР АДАПТИВНІСТЬ ---
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (canvas.height > canvas.width) {
      // ПОРТРЕТ (Телефон)
      CELL_SIZE = Math.floor((canvas.width * 0.85) / COLS);
      OFFSET_X = (canvas.width - CELL_SIZE * COLS) / 2;
      OFFSET_Y = canvas.height - CELL_SIZE * ROWS - canvas.height * 0.05; // Поле внизу
      UI_X = canvas.width / 2;
      UI_Y = OFFSET_Y / 4; // Меню по центру зверху
    } else {
      // ЛАНДШАФТ (ПК)
      CELL_SIZE = Math.floor((canvas.height * 0.85) / ROWS);
      OFFSET_X = canvas.width * 0.05; // Поле зліва
      OFFSET_Y = (canvas.height - CELL_SIZE * ROWS) / 2;
      let rightEdge = OFFSET_X + CELL_SIZE * COLS;
      UI_X = rightEdge + (canvas.width - rightEdge) / 2; // Меню рівно по центру вільної правої зони
      UI_Y = canvas.height / 3;
    }

    // Миттєво оновлюємо координати, якщо гравець перевернув екран
    for (let r = 0; r < ROWS; r++) {
      if (!visualY[r]) continue;
      for (let c = 0; c < COLS; c++) {
        visualY[r][c] = r * CELL_SIZE;
        visualX[r][c] = c * CELL_SIZE;
      }
    }
  }
  window.addEventListener("resize", resizeCanvas);
  // Викликаємо одразу при старті
  resizeCanvas();

  // --- ЗВУКИ ---
  let audioCtx: AudioContext | null = null;
  function initAudio() {
    if (!audioCtx)
      audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }
  function playSound(type: "swap" | "match" | "bomb" | "crystal") {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === "swap") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "match") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "bomb") {
      osc.type = "square";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === "crystal") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  function initBoard() {
    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      visualY[r] = [];
      visualX[r] = [];
      scale[r] = [];
      flash[r] = [];
      for (let c = 0; c < COLS; c++) {
        let type: number;
        do {
          type = Math.floor(Math.random() * TYPES) + 1;
        } while (
          (c >= 2 &&
            board[r][c - 1] % 10 === type &&
            board[r][c - 2] % 10 === type) ||
          (r >= 2 &&
            board[r - 1] &&
            board[r - 1][c] % 10 === type &&
            board[r - 2] &&
            board[r - 2][c] % 10 === type)
        );
        board[r][c] = type;
        visualY[r][c] = r * CELL_SIZE;
        visualX[r][c] = c * CELL_SIZE;
        scale[r][c] = 1;
        flash[r][c] = 0;
      }
    }
  }

  function createBoolGrid(): boolean[][] {
    let grid: boolean[][] = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) grid[r][c] = false;
    }
    return grid;
  }

  function getClusters() {
    let matches = createBoolGrid();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let t = board[r][c] % 10;
        if (t === 0) continue;
        if (
          c < COLS - 2 &&
          board[r][c + 1] % 10 === t &&
          board[r][c + 2] % 10 === t
        ) {
          matches[r][c] = true;
          matches[r][c + 1] = true;
          matches[r][c + 2] = true;
        }
        if (
          r < ROWS - 2 &&
          board[r + 1][c] % 10 === t &&
          board[r + 2][c] % 10 === t
        ) {
          matches[r][c] = true;
          matches[r + 1][c] = true;
          matches[r + 2][c] = true;
        }
      }
    }
    let visited = createBoolGrid();
    let clusters: { r: number; c: number }[][] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (matches[r][c] && !visited[r][c]) {
          let cluster: { r: number; c: number }[] = [];
          let queue = [{ r: r, c: c }];
          visited[r][c] = true;
          let type = board[r][c] % 10;
          while (queue.length > 0) {
            let curr = queue.shift()!;
            cluster.push(curr);
            let dirs = [
              [0, 1],
              [0, -1],
              [1, 0],
              [-1, 0],
            ];
            for (let d = 0; d < dirs.length; d++) {
              let nr = curr.r + dirs[d][0],
                nc = curr.c + dirs[d][1];
              if (
                nr >= 0 &&
                nr < ROWS &&
                nc >= 0 &&
                nc < COLS &&
                matches[nr][nc] &&
                !visited[nr][nc] &&
                board[nr][nc] % 10 === type
              ) {
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc });
              }
            }
          }
          clusters.push(cluster);
        }
      }
    }
    return clusters;
  }

  function executeSuperQueue(
    queue: { r: number; c: number; type: number }[],
    index: number,
    onComplete: () => void,
  ) {
    if (index >= queue.length) {
      onComplete();
      return;
    }
    executeSuper(queue[index].r, queue[index].c, queue[index].type, () =>
      executeSuperQueue(queue, index + 1, onComplete),
    );
  }

  function executeSuper(
    r: number,
    c: number,
    type: number,
    onComplete: () => void,
  ) {
    flash[r][c] = 1;
    scale[r][c] = 1.3;
    setTimeout(() => {
      let affected: { r: number; c: number }[] = [];
      let cx = OFFSET_X + c * CELL_SIZE + CELL_SIZE / 2,
        cy = OFFSET_Y + r * CELL_SIZE + CELL_SIZE / 2;
      let hexColor = colors[type % 10] || "#FFF";

      if (type > 10 && type < 20) {
        playSound("bomb");
        for (let i = -1; i <= 1; i++)
          for (let j = -1; j <= 1; j++) {
            let nr = r + i,
              nc = c + j;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS)
              affected.push({ r: nr, c: nc });
          }
        screenShake = 20;
        for (let p = 0; p < 40; p++) {
          let angle = Math.random() * Math.PI * 2;
          let speed = (Math.random() * 0.15 + 0.05) * CELL_SIZE; // Адаптивна швидкість
          particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30,
            maxLife: 30,
            color: Math.random() > 0.5 ? hexColor : "#FFF",
            size: (Math.random() * 0.1 + 0.05) * CELL_SIZE,
          });
        }
      } else if (type > 20) {
        playSound("crystal");
        let color = type % 10;
        for (let i = 0; i < ROWS; i++)
          for (let j = 0; j < COLS; j++)
            if (board[i][j] > 0 && board[i][j] % 10 === color)
              affected.push({ r: i, c: j });
        screenShake = 10;
        for (let i = 0; i < affected.length; i++) {
          lightnings.push({
            x1: cx,
            y1: cy,
            x2: OFFSET_X + affected[i].c * CELL_SIZE + CELL_SIZE / 2,
            y2: OFFSET_Y + affected[i].r * CELL_SIZE + CELL_SIZE / 2,
            life: 25,
            maxLife: 25,
            color: hexColor,
          });
        }
      }

      let step = 25;
      let interval = setInterval(() => {
        for (let i = 0; i < affected.length; i++)
          scale[affected[i].r][affected[i].c] = step / 25;
        step--;
        if (step < 0) {
          clearInterval(interval);
          let chainReactions: { r: number; c: number; type: number }[] = [];
          for (let i = 0; i < affected.length; i++) {
            let p = affected[i],
              t = board[p.r][p.c];
            if (t > 10 && (p.r !== r || p.c !== c))
              chainReactions.push({ r: p.r, c: p.c, type: t });
            board[p.r][p.c] = 0;
            scale[p.r][p.c] = 1;
            flash[p.r][p.c] = 0;
          }
          board[r][c] = 0;
          scale[r][c] = 1;
          executeSuperQueue(chainReactions, 0, onComplete);
        }
      }, 20);
    }, 400);
  }

  function handleMatches() {
    let clusters = getClusters();
    if (clusters.length === 0) {
      gameState = "WAITING";
      return;
    }

    gameState = "ANIMATING_MATCHES";
    currentCombo += clusters.length;
    if (currentCombo > maxCombo) maxCombo = currentCombo;
    if (currentCombo > 1) {
      comboAlpha = 1.0;
      comboScale = 1.5;
    }

    let toPop: { r: number; c: number }[] = [];
    let superToTrigger: { r: number; c: number; type: number }[] = [];

    for (let i = 0; i < clusters.length; i++) {
      let cl = clusters[i],
        type = board[cl[0].r][cl[0].c] % 10;
      let spawnPoint: { r: number; c: number } | null = null;
      for (let j = 0; j < cl.length; j++) {
        for (let k = 0; k < lastMoveTiles.length; k++)
          if (lastMoveTiles[k].r === cl[j].r && lastMoveTiles[k].c === cl[j].c)
            spawnPoint = cl[j];
      }
      if (!spawnPoint && cl.length >= 4)
        spawnPoint = cl[Math.floor(cl.length / 2)];

      for (let j = 0; j < cl.length; j++) {
        let p = cl[j],
          cellType = board[p.r][p.c];
        if (cellType > 10) {
          superToTrigger.push({ r: p.r, c: p.c, type: cellType });
          toPop.push(p);
        } else if (
          spawnPoint &&
          p.r === spawnPoint.r &&
          p.c === spawnPoint.c &&
          cl.length >= 4
        ) {
          board[p.r][p.c] = type + (cl.length >= 5 ? 20 : 10);
          spawnPoint = null;
        } else toPop.push(p);
      }
    }
    lastMoveTiles = [];

    let step = 20;
    let interval = setInterval(() => {
      for (let i = 0; i < toPop.length; i++) {
        let p = toPop[i],
          isDyingSuper = false;
        for (let s = 0; s < superToTrigger.length; s++)
          if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
            isDyingSuper = true;
        if (board[p.r][p.c] < 10 || isDyingSuper) scale[p.r][p.c] = step / 20;
      }
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) if (flash[r][c] > 0) flash[r][c] -= 0.05;
      step--;
      if (step < 0) {
        clearInterval(interval);
        playSound("match");
        for (let i = 0; i < toPop.length; i++) {
          let p = toPop[i],
            isDyingSuper = false;
          for (let s = 0; s < superToTrigger.length; s++)
            if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
              isDyingSuper = true;
          if (board[p.r][p.c] < 10 || isDyingSuper) {
            board[p.r][p.c] = 0;
            scale[p.r][p.c] = 1;
          }
        }
        executeSuperQueue(superToTrigger, 0, () => {
          gameState = "REFILLING";
          refillBoard();
        });
      }
    }, 20);
  }

  function refillBoard() {
    for (let c = 0; c < COLS; c++) {
      let empty = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][c] === 0) empty++;
        else if (empty > 0) {
          board[r + empty][c] = board[r][c];
          visualY[r + empty][c] = visualY[r][c];
          visualX[r + empty][c] = visualX[r][c];
          scale[r + empty][c] = scale[r][c];
          board[r][c] = 0;
        }
      }
      let spawnedInThisCol = 1;
      for (let r = empty - 1; r >= 0; r--) {
        board[r][c] = Math.floor(Math.random() * TYPES) + 1;
        visualY[r][c] = -CELL_SIZE * spawnedInThisCol;
        visualX[r][c] = c * CELL_SIZE;
        scale[r][c] = 1;
        spawnedInThisCol++;
      }
    }
  }

  function isSwapping(r: number, c: number): boolean {
    if (gameState !== "ANIMATING_SWAP") return false;
    for (let i = 0; i < lastMoveTiles.length; i++)
      if (lastMoveTiles[i].r === r && lastMoveTiles[i].c === c) return true;
    return false;
  }

  function update() {
    // Адаптивна швидкість падіння
    let dynamicFallSpeed = CELL_SIZE * 0.1;
    let dynamicSwapSpeed = CELL_SIZE * 0.08;
    let moving = false,
      currentSpeed =
        gameState === "ANIMATING_SWAP" ? dynamicSwapSpeed : dynamicFallSpeed;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let targetY = r * CELL_SIZE;
        if (Math.abs(visualY[r][c] - targetY) > currentSpeed) {
          visualY[r][c] +=
            targetY - visualY[r][c] > 0 ? currentSpeed : -currentSpeed;
          moving = true;
        } else visualY[r][c] = targetY;

        let targetX = c * CELL_SIZE;
        if (Math.abs(visualX[r][c] - targetX) > currentSpeed) {
          visualX[r][c] +=
            targetX - visualX[r][c] > 0 ? currentSpeed : -currentSpeed;
          moving = true;
        } else visualX[r][c] = targetX;

        if (flash[r][c] > 0) flash[r][c] -= 0.02;
        if (
          scale[r][c] > 1 &&
          gameState !== "ANIMATING_MATCHES" &&
          flash[r][c] <= 0
        )
          scale[r][c] -= 0.02;
      }
    }

    if (gameState === "WAITING" && comboAlpha > 0) comboAlpha -= 0.02;
    if (comboScale > 1) comboScale -= 0.05;
    if (screenShake > 0) screenShake -= 1;

    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].life--;
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
    for (let i = lightnings.length - 1; i >= 0; i--) {
      lightnings[i].life--;
      if (lightnings[i].life <= 0) lightnings.splice(i, 1);
    }
    if (!moving && gameState === "REFILLING") handleMatches();
  }

  function drawTile(r: number, c: number) {
    let type = board[r][c];
    if (type === 0) return;
    let s = scale[r][c];
    let x = OFFSET_X + visualX[r][c] + (CELL_SIZE * (1 - s)) / 2;
    let y = OFFSET_Y + visualY[r][c] + (CELL_SIZE * (1 - s)) / 2;
    let size = CELL_SIZE * s;
    let m = size / 70; // Множник для збереження пропорцій малюнку

    if (flash[r][c] > 0) {
      ctx.fillStyle = `rgba(255, 200, 50, ${flash[r][c]})`;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, 50 * m, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 255, 255, ${flash[r][c]})`;
      ctx.lineWidth = 3 * m;
      for (let i = 0; i < 8; i++) {
        let angle = ((Math.PI * 2) / 8) * i;
        ctx.beginPath();
        ctx.moveTo(
          x + size / 2 + Math.cos(angle) * 20 * m,
          y + size / 2 + Math.sin(angle) * 20 * m,
        );
        ctx.lineTo(
          x + size / 2 + Math.cos(angle) * 45 * m,
          y + size / 2 + Math.sin(angle) * 45 * m,
        );
        ctx.stroke();
      }
    }

    ctx.fillStyle = colors[type % 10];

    if (type > 20) {
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + 4 * m);
      ctx.lineTo(x + size - 6 * m, y + size / 2);
      ctx.lineTo(x + size / 2, y + size - 4 * m);
      ctx.lineTo(x + 6 * m, y + size / 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + 4 * m);
      ctx.lineTo(x + size / 2, y + size - 4 * m);
      ctx.lineTo(x + 6 * m, y + size / 2);
      ctx.fill();
    } else if (type > 10) {
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + 10 * m);
      ctx.quadraticCurveTo(
        x + size / 2 + 15 * m,
        y - 4 * m,
        x + size / 2 + 18 * m,
        y + 6 * m,
      );
      ctx.strokeStyle = "#C19A6B";
      ctx.lineWidth = 3 * m;
      ctx.stroke();
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(x + size / 2 + 18 * m, y + 6 * m, 4 * m, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#888";
      ctx.fillRect(x + size / 2 - 8 * m, y + 6 * m, 16 * m, 8 * m);
      ctx.fillStyle = colors[type % 10];
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2 + 5 * m, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(
        x + size / 2 - 6 * m,
        y + size / 2 - 3 * m,
        size * 0.12,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(
          x + 5 * m,
          y + 5 * m,
          size - 10 * m,
          size - 10 * m,
          12 * m,
        );
      } else {
        ctx.rect(x + 5 * m, y + 5 * m, size - 10 * m, size - 10 * m);
      }
      ctx.fill();
    }

    if (selectedTile && selectedTile.r === r && selectedTile.c === c) {
      ctx.strokeStyle = "white";
      ctx.lineWidth = 4 * m;
      if (typeof (ctx as any).roundRect === "function") {
        ctx.beginPath();
        (ctx as any).roundRect(
          x + 1 * m,
          y + 1 * m,
          size - 2 * m,
          size - 2 * m,
          14 * m,
        );
        ctx.stroke();
      } else {
        ctx.strokeRect(x + 1 * m, y + 1 * m, size - 2 * m, size - 2 * m);
      }
    }
  }

  function draw() {
    ctx.fillStyle = "#1E1E24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * screenShake,
        (Math.random() - 0.5) * screenShake,
      );
    }

    let pad = CELL_SIZE * 0.2;
    ctx.fillStyle = "#2B2B33";
    if (typeof (ctx as any).roundRect === "function") {
      ctx.beginPath();
      (ctx as any).roundRect(
        OFFSET_X - pad,
        OFFSET_Y - pad,
        COLS * CELL_SIZE + pad * 2,
        ROWS * CELL_SIZE + pad * 2,
        pad * 1.5,
      );
      ctx.fill();
    } else {
      ctx.fillRect(
        OFFSET_X - pad,
        OFFSET_Y - pad,
        COLS * CELL_SIZE + pad * 2,
        ROWS * CELL_SIZE + pad * 2,
      );
    }

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) if (!isSwapping(r, c)) drawTile(r, c);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) if (isSwapping(r, c)) drawTile(r, c);

    for (let i = 0; i < lightnings.length; i++) {
      let l = lightnings[i];
      ctx.globalAlpha = l.life / l.maxLife;
      ctx.strokeStyle = l.color;
      ctx.lineWidth = CELL_SIZE * 0.08;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      let steps = 5;
      for (let s = 1; s <= steps; s++) {
        let t = s / steps,
          lx =
            l.x1 + (l.x2 - l.x1) * t + (Math.random() - 0.5) * CELL_SIZE * 0.5,
          ly =
            l.y1 + (l.y2 - l.y1) * t + (Math.random() - 0.5) * CELL_SIZE * 0.5;
        if (s === steps) {
          lx = l.x2;
          ly = l.y2;
        }
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
      ctx.strokeStyle = "white";
      ctx.lineWidth = CELL_SIZE * 0.03;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // --- АДАПТИВНИЙ UI ---
    let fSmall = Math.floor(CELL_SIZE * 0.35); // Шрифт для текстів
    let fBig = Math.floor(CELL_SIZE * 1.15); // Шрифт для великих чисел
    let fMed = Math.floor(CELL_SIZE * 0.4);

    ctx.fillStyle = "#888";
    ctx.font = `${fSmall}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("MAX COMBO", UI_X, UI_Y);

    ctx.fillStyle = "#FFD700";
    ctx.font = `bold ${fBig}px Arial`;
    ctx.fillText(`x${maxCombo}`, UI_X, UI_Y + fBig);

    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(UI_X - CELL_SIZE * 1.5, UI_Y + fBig + fSmall);
    ctx.lineTo(UI_X + CELL_SIZE * 1.5, UI_Y + fBig + fSmall);
    ctx.stroke();

    ctx.fillStyle = "#CCC";
    ctx.font = `${fSmall}px Arial`;
    ctx.fillText(
      `LAST RECORD: x${lastRecord}`,
      UI_X,
      UI_Y + fBig + fSmall * 2.5,
    );

    ctx.beginPath();
    ctx.moveTo(UI_X - CELL_SIZE * 1.5, UI_Y + fBig + fSmall * 3.5);
    ctx.lineTo(UI_X + CELL_SIZE * 1.5, UI_Y + fBig + fSmall * 3.5);
    ctx.stroke();

    if (currentCombo > 1 && comboAlpha > 0) {
      ctx.save();
      ctx.translate(UI_X, UI_Y + fBig + fSmall * 6);
      ctx.scale(comboScale, comboScale);
      ctx.fillStyle = `rgba(255, 89, 94, ${comboAlpha})`;
      ctx.font = `bold ${fBig * 0.8}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`x${currentCombo}`, 0, -fSmall);
      ctx.font = `bold ${fMed}px Arial`;
      ctx.fillText("COMBO!", 0, fSmall);
      ctx.restore();
    }
  }

  function swap(r1: number, c1: number, r2: number, c2: number) {
    gameState = "ANIMATING_SWAP";
    playSound("swap");
    if (currentCombo > 0) lastRecord = currentCombo;
    currentCombo = 0;
    selectedTile = null;

    let t1 = board[r1][c1],
      t2 = board[r2][c2];
    board[r1][c1] = t2;
    board[r2][c2] = t1;
    visualX[r1][c1] = c2 * CELL_SIZE;
    visualY[r1][c1] = r2 * CELL_SIZE;
    visualX[r2][c2] = c1 * CELL_SIZE;
    visualY[r2][c2] = r1 * CELL_SIZE;
    lastMoveTiles = [
      { r: r1, c: c1 },
      { r: r2, c: c2 },
    ];

    setTimeout(() => {
      if (getClusters().length === 0) {
        board[r1][c1] = t1;
        board[r2][c2] = t2;
        visualX[r1][c1] = c1 * CELL_SIZE;
        visualY[r1][c1] = r1 * CELL_SIZE;
        visualX[r2][c2] = c2 * CELL_SIZE;
        visualY[r2][c2] = r2 * CELL_SIZE;
        setTimeout(() => {
          gameState = "WAITING";
          lastMoveTiles = [];
        }, SWAP_DELAY);
      } else {
        handleMatches();
      }
    }, SWAP_DELAY);
  }

  function getLogicalPos(clientX: number, clientY: number) {
    return {
      c: Math.floor((clientX - OFFSET_X) / CELL_SIZE),
      r: Math.floor((clientY - OFFSET_Y) / CELL_SIZE),
    };
  }

  function handleInputStart(clientX: number, clientY: number) {
    initAudio(); // Ініціалізація аудіо після першого дотику (вимога браузерів)
    if (gameState !== "WAITING") return;
    const pos = getLogicalPos(clientX, clientY);
    if (pos.c < 0 || pos.c >= COLS || pos.r < 0 || pos.r >= ROWS) return;

    if (board[pos.r][pos.c] > 10) {
      gameState = "ANIMATING_MATCHES";
      if (currentCombo > 0) lastRecord = currentCombo;
      currentCombo = 0;
      executeSuper(pos.r, pos.c, board[pos.r][pos.c], () => {
        gameState = "REFILLING";
        refillBoard();
      });
      board[pos.r][pos.c] = 0;
    } else {
      if (selectedTile) {
        if (
          (pos.r !== selectedTile.r || pos.c !== selectedTile.c) &&
          Math.abs(pos.r - selectedTile.r) +
            Math.abs(pos.c - selectedTile.c) ===
            1
        ) {
          swap(selectedTile.r, selectedTile.c, pos.r, pos.c);
          return;
        }
      }
      selectedTile = { r: pos.r, c: pos.c };
      isDragging = true;
    }
  }

  function handleInputMove(clientX: number, clientY: number) {
    if (!isDragging || !selectedTile || gameState !== "WAITING") return;
    const pos = getLogicalPos(clientX, clientY);
    if (pos.c < 0 || pos.c >= COLS || pos.r < 0 || pos.r >= ROWS) return;

    if (
      (pos.r !== selectedTile.r || pos.c !== selectedTile.c) &&
      Math.abs(pos.r - selectedTile.r) + Math.abs(pos.c - selectedTile.c) === 1
    ) {
      swap(selectedTile.r, selectedTile.c, pos.r, pos.c);
      isDragging = false;
    }
  }

  canvas.addEventListener("mousedown", (e) =>
    handleInputStart(e.clientX, e.clientY),
  );
  canvas.addEventListener("mousemove", (e) =>
    handleInputMove(e.clientX, e.clientY),
  );
  window.addEventListener("mouseup", () => (isDragging = false));

  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      handleInputStart(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: false },
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      handleInputMove(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: false },
  );
  window.addEventListener("touchend", () => (isDragging = false));

  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }
  initBoard();
  gameLoop();
}

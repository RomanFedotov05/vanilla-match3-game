{
  const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;

  canvas.width = 800;
  canvas.height = 480;

  const ROWS = 8,
    COLS = 8,
    CELL_SIZE = 50,
    TYPES = 5;
  const OFFSET_X = 40;
  const OFFSET_Y = 40;

  const colors = ["", "#FF595E", "#8AC926", "#1982C4", "#FFCA3A", "#6A4C93"];

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

  const FALL_SPEED = 4.5;
  const SWAP_SPEED = 2.5;
  const SWAP_DELAY = 400;

  let currentCombo = 0;
  let maxCombo = 0;
  let lastRecord = 0;
  let comboAlpha = 0;
  let comboScale = 1;

  // --- НОВІ ЕФЕКТИ ---
  let screenShake = 0;
  let particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
  }[] = [];
  let lightnings: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    life: number;
    maxLife: number;
    color: string;
  }[] = [];

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
    let s = queue[index];
    executeSuper(s.r, s.c, s.type, () => {
      executeSuperQueue(queue, index + 1, onComplete);
    });
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
      let cx = OFFSET_X + c * CELL_SIZE + CELL_SIZE / 2;
      let cy = OFFSET_Y + r * CELL_SIZE + CELL_SIZE / 2;
      let hexColor = colors[type % 10] || "#FFF";

      if (type > 10 && type < 20) {
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            let nr = r + i,
              nc = c + j;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS)
              affected.push({ r: nr, c: nc });
          }
        }

        screenShake = 15;
        for (let p = 0; p < 40; p++) {
          let angle = Math.random() * Math.PI * 2;
          let speed = Math.random() * 8 + 2;
          particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 100,
            maxLife: 100,
            color: Math.random() > 0.5 ? hexColor : "#FFF",
            size: Math.random() * 6 + 3,
          });
        }
      } else if (type > 20) {
        let color = type % 10;
        for (let i = 0; i < ROWS; i++) {
          for (let j = 0; j < COLS; j++) {
            if (board[i][j] > 0 && board[i][j] % 10 === color)
              affected.push({ r: i, c: j });
          }
        }

        screenShake = 8;
        for (let i = 0; i < affected.length; i++) {
          let targetX = OFFSET_X + affected[i].c * CELL_SIZE + CELL_SIZE / 2;
          let targetY = OFFSET_Y + affected[i].r * CELL_SIZE + CELL_SIZE / 2;
          lightnings.push({
            x1: cx,
            y1: cy,
            x2: targetX,
            y2: targetY,
            life: 100,
            maxLife: 100,
            color: hexColor,
          });
        }
      }

      let step = 25;
      let interval = setInterval(() => {
        for (let i = 0; i < affected.length; i++) {
          scale[affected[i].r][affected[i].c] = step / 25;
        }
        step--;
        if (step < 0) {
          clearInterval(interval);
          let chainReactions: { r: number; c: number; type: number }[] = [];
          for (let i = 0; i < affected.length; i++) {
            let p = affected[i];
            let t = board[p.r][p.c];
            if (t > 10 && (p.r !== r || p.c !== c)) {
              chainReactions.push({ r: p.r, c: p.c, type: t });
            }
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
      let cl = clusters[i];
      let type = board[cl[0].r][cl[0].c] % 10;

      let spawnPoint: { r: number; c: number } | null = null;
      for (let j = 0; j < cl.length; j++) {
        let p = cl[j];
        for (let k = 0; k < lastMoveTiles.length; k++) {
          if (lastMoveTiles[k].r === p.r && lastMoveTiles[k].c === p.c) {
            spawnPoint = p;
            break;
          }
        }
        if (spawnPoint) break;
      }

      if (!spawnPoint && cl.length >= 4) {
        spawnPoint = cl[Math.floor(cl.length / 2)];
      }

      for (let j = 0; j < cl.length; j++) {
        let p = cl[j];
        let cellType = board[p.r][p.c];

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
        } else {
          toPop.push(p);
        }
      }
    }

    lastMoveTiles = [];

    let step = 20;
    let interval = setInterval(() => {
      for (let i = 0; i < toPop.length; i++) {
        let p = toPop[i];
        let isDyingSuper = false;
        for (let s = 0; s < superToTrigger.length; s++) {
          if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
            isDyingSuper = true;
        }

        if (board[p.r][p.c] < 10 || isDyingSuper) {
          scale[p.r][p.c] = step / 20;
        }
      }

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (flash[r][c] > 0) flash[r][c] -= 0.05;
        }
      }

      step--;
      if (step < 0) {
        clearInterval(interval);
        for (let i = 0; i < toPop.length; i++) {
          let p = toPop[i];
          let isDyingSuper = false;
          for (let s = 0; s < superToTrigger.length; s++) {
            if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
              isDyingSuper = true;
          }

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

  // --- ТУТ ОНОВЛЕНА ЛОГІКА ОЛЕКСІЯ ---
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
  // -----------------------------------

  function isSwapping(r: number, c: number): boolean {
    if (gameState !== "ANIMATING_SWAP") return false;
    for (let i = 0; i < lastMoveTiles.length; i++) {
      if (lastMoveTiles[i].r === r && lastMoveTiles[i].c === c) return true;
    }
    return false;
  }

  function update() {
    let moving = false;
    let currentSpeed = gameState === "ANIMATING_SWAP" ? SWAP_SPEED : FALL_SPEED;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let targetY = r * CELL_SIZE;
        if (Math.abs(visualY[r][c] - targetY) > currentSpeed) {
          visualY[r][c] +=
            targetY - visualY[r][c] > 0 ? currentSpeed : -currentSpeed;
          moving = true;
        } else {
          visualY[r][c] = targetY;
        }

        let targetX = c * CELL_SIZE;
        if (Math.abs(visualX[r][c] - targetX) > currentSpeed) {
          visualX[r][c] +=
            targetX - visualX[r][c] > 0 ? currentSpeed : -currentSpeed;
          moving = true;
        } else {
          visualX[r][c] = targetX;
        }

        if (flash[r][c] > 0) flash[r][c] -= 0.02;
        if (
          scale[r][c] > 1 &&
          gameState !== "ANIMATING_MATCHES" &&
          flash[r][c] <= 0
        ) {
          scale[r][c] -= 0.02;
        }
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

    if (!moving && gameState === "REFILLING") {
      handleMatches();
    }
  }

  function drawTile(r: number, c: number) {
    let type = board[r][c];
    if (type === 0) return;
    let s = scale[r][c];
    let x = OFFSET_X + visualX[r][c] + (CELL_SIZE * (1 - s)) / 2;
    let y = OFFSET_Y + visualY[r][c] + (CELL_SIZE * (1 - s)) / 2;
    let size = CELL_SIZE * s;

    if (flash[r][c] > 0) {
      ctx.fillStyle = `rgba(255, 200, 50, ${flash[r][c]})`;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, 40 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 255, 255, ${flash[r][c]})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        let angle = ((Math.PI * 2) / 8) * i;
        ctx.beginPath();
        ctx.moveTo(
          x + size / 2 + Math.cos(angle) * 15,
          y + size / 2 + Math.sin(angle) * 15,
        );
        ctx.lineTo(
          x + size / 2 + Math.cos(angle) * 35,
          y + size / 2 + Math.sin(angle) * 35,
        );
        ctx.stroke();
      }
    }

    ctx.fillStyle = colors[type % 10];

    if (type > 20) {
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + 2);
      ctx.lineTo(x + size - 4, y + size / 2);
      ctx.lineTo(x + size / 2, y + size - 2);
      ctx.lineTo(x + 4, y + size / 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + 2);
      ctx.lineTo(x + size / 2, y + size - 2);
      ctx.lineTo(x + 4, y + size / 2);
      ctx.fill();
    } else if (type > 10) {
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + 8);
      ctx.quadraticCurveTo(x + size / 2 + 10, y - 2, x + size / 2 + 12, y + 4);
      ctx.strokeStyle = "#C19A6B";
      ctx.lineWidth = 2 * s;
      ctx.stroke();
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(x + size / 2 + 12, y + 4, 3 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#888";
      ctx.fillRect(x + size / 2 - 6 * s, y + 4 * s, 12 * s, 6 * s);
      ctx.fillStyle = colors[type % 10];
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2 + 4 * s, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(
        x + size / 2 - 4 * s,
        y + size / 2 - 2 * s,
        size * 0.12,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(x + 4, y + 4, size - 8, size - 8, 8 * s);
      } else {
        ctx.rect(x + 4, y + 4, size - 8, size - 8);
      }
      ctx.fill();
    }

    if (selectedTile && selectedTile.r === r && selectedTile.c === c) {
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      if (typeof (ctx as any).roundRect === "function") {
        ctx.beginPath();
        (ctx as any).roundRect(x + 1, y + 1, size - 2, size - 2, 10);
        ctx.stroke();
      } else {
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
      }
    }
  }

  function draw() {
    ctx.fillStyle = "#1E1E24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    if (screenShake > 0) {
      let dx = (Math.random() - 0.5) * screenShake;
      let dy = (Math.random() - 0.5) * screenShake;
      ctx.translate(dx, dy);
    }

    ctx.fillStyle = "#2B2B33";
    if (typeof (ctx as any).roundRect === "function") {
      ctx.beginPath();
      (ctx as any).roundRect(
        OFFSET_X - 10,
        OFFSET_Y - 10,
        COLS * CELL_SIZE + 20,
        ROWS * CELL_SIZE + 20,
        15,
      );
      ctx.fill();
    } else {
      ctx.fillRect(
        OFFSET_X - 10,
        OFFSET_Y - 10,
        COLS * CELL_SIZE + 20,
        ROWS * CELL_SIZE + 20,
      );
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!isSwapping(r, c)) drawTile(r, c);
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (isSwapping(r, c)) drawTile(r, c);
      }
    }

    for (let i = 0; i < lightnings.length; i++) {
      let l = lightnings[i];
      ctx.globalAlpha = l.life / l.maxLife;
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      let steps = 5;
      for (let s = 1; s <= steps; s++) {
        let t = s / steps;
        let lx = l.x1 + (l.x2 - l.x1) * t + (Math.random() - 0.5) * 30;
        let ly = l.y1 + (l.y2 - l.y1) * t + (Math.random() - 0.5) * 30;
        if (s === steps) {
          lx = l.x2;
          ly = l.y2;
        }
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
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

    let uiX = 520;

    ctx.fillStyle = "#888";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("MAX COMBO", uiX + 60, 100);

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 56px Arial";
    ctx.fillText(`x${maxCombo}`, uiX + 60, 160);

    ctx.strokeStyle = "#444";
    ctx.beginPath();
    ctx.moveTo(uiX, 200);
    ctx.lineTo(uiX + 120, 200);
    ctx.stroke();

    ctx.fillStyle = "#CCC";
    ctx.font = "14px Arial";
    ctx.fillText(`LAST RECORD: x${lastRecord}`, uiX + 60, 230);

    ctx.beginPath();
    ctx.moveTo(uiX, 250);
    ctx.lineTo(uiX + 120, 250);
    ctx.stroke();

    if (currentCombo > 1 && comboAlpha > 0) {
      ctx.save();
      ctx.translate(uiX + 60, 320);
      ctx.scale(comboScale, comboScale);

      ctx.fillStyle = `rgba(255, 89, 94, ${comboAlpha})`;
      ctx.font = "bold 42px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`x${currentCombo}`, 0, -15);

      ctx.font = "bold 20px Arial";
      ctx.fillText("COMBO!", 0, 15);
      ctx.restore();
    }
  }

  function swap(r1: number, c1: number, r2: number, c2: number) {
    gameState = "ANIMATING_SWAP";
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

  canvas.addEventListener("mousedown", (e) => {
    if (gameState !== "WAITING") return;
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left - OFFSET_X) / CELL_SIZE);
    const r = Math.floor((e.clientY - rect.top - OFFSET_Y) / CELL_SIZE);

    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;

    if (board[r][c] > 10) {
      gameState = "ANIMATING_MATCHES";
      if (currentCombo > 0) lastRecord = currentCombo;
      currentCombo = 0;
      executeSuper(r, c, board[r][c], () => {
        gameState = "REFILLING";
        refillBoard();
      });
      board[r][c] = 0;
    } else {
      if (selectedTile) {
        if (
          (r !== selectedTile.r || c !== selectedTile.c) &&
          Math.abs(r - selectedTile.r) + Math.abs(c - selectedTile.c) === 1
        ) {
          swap(selectedTile.r, selectedTile.c, r, c);
          return;
        }
      }
      selectedTile = { r, c };
      isDragging = true;
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDragging || !selectedTile || gameState !== "WAITING") return;
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left - OFFSET_X) / CELL_SIZE);
    const r = Math.floor((e.clientY - rect.top - OFFSET_Y) / CELL_SIZE);

    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;

    if (
      (r !== selectedTile.r || c !== selectedTile.c) &&
      Math.abs(r - selectedTile.r) + Math.abs(c - selectedTile.c) === 1
    ) {
      swap(selectedTile.r, selectedTile.c, r, c);
      isDragging = false;
    }
  });

  window.addEventListener("mouseup", () => (isDragging = false));
  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }
  initBoard();
  gameLoop();
}

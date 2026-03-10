{
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
  const COLORS = ["", "#FF595E", "#8AC926", "#1982C4", "#FFCA3A", "#6A4C93"];

  let CELL_SIZE = 70;
  let OFFSET_X = 40,
    OFFSET_Y = 40,
    UI_X = 780,
    UI_Y = 40;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (canvas.height > canvas.width) {
      CELL_SIZE = Math.floor((canvas.width * 0.85) / COLS);
      OFFSET_X = (canvas.width - CELL_SIZE * COLS) / 2;
      OFFSET_Y = canvas.height - CELL_SIZE * ROWS - canvas.height * 0.05;
      UI_X = canvas.width / 2;
      UI_Y = OFFSET_Y / 4;
    } else {
      CELL_SIZE = Math.floor((canvas.height * 0.85) / ROWS);
      OFFSET_X = canvas.width * 0.05;
      OFFSET_Y = (canvas.height - CELL_SIZE * ROWS) / 2;
      let rightEdge = OFFSET_X + CELL_SIZE * COLS;
      UI_X = rightEdge + (canvas.width - rightEdge) / 2;
      UI_Y = canvas.height / 3;
    }
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // --- AUDIO ---
  class AudioManager {
    ctx: AudioContext | null = null;
    init() {
      if (!this.ctx)
        this.ctx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      if (this.ctx.state === "suspended") this.ctx.resume();
    }
    play(type: "swap" | "match" | "bomb" | "crystal") {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      const now = this.ctx.currentTime;

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
  }
  const audio = new AudioManager();

  // --- CLASSES ---

  class Tile {
    r: number;
    c: number;
    visualX: number;
    visualY: number;
    type: number;
    scale: number = 1;
    flash: number = 0;

    constructor(r: number, c: number, type: number, startVisualY?: number) {
      this.r = r;
      this.c = c;
      this.type = type;
      this.visualX = c * CELL_SIZE;
      this.visualY = startVisualY !== undefined ? startVisualY : r * CELL_SIZE;
    }

    update(speed: number): boolean {
      let moving = false;
      let targetX = this.c * CELL_SIZE;
      let targetY = this.r * CELL_SIZE;

      if (Math.abs(this.visualX - targetX) > speed) {
        this.visualX += targetX - this.visualX > 0 ? speed : -speed;
        moving = true;
      } else {
        this.visualX = targetX;
      }

      if (Math.abs(this.visualY - targetY) > speed) {
        this.visualY += targetY - this.visualY > 0 ? speed : -speed;
        moving = true;
      } else {
        this.visualY = targetY;
      }

      if (this.flash > 0) this.flash -= 0.02;
      if (this.scale > 1 && this.flash <= 0) this.scale -= 0.02;

      return moving;
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean) {
      let s = this.scale;
      let x = OFFSET_X + this.visualX + (CELL_SIZE * (1 - s)) / 2;
      let y = OFFSET_Y + this.visualY + (CELL_SIZE * (1 - s)) / 2;
      let size = CELL_SIZE * s;
      let m = size / 70;

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(255, 200, 50, ${this.flash})`;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, 50 * m, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.flash})`;
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

      ctx.fillStyle = COLORS[this.type % 10];

      if (this.type > 20) {
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
      } else if (this.type > 10) {
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
        ctx.fillStyle = COLORS[this.type % 10];
        ctx.beginPath();
        ctx.arc(
          x + size / 2,
          y + size / 2 + 5 * m,
          size * 0.38,
          0,
          Math.PI * 2,
        );
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

      if (isSelected) {
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
  }

  class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;

    constructor(x: number, y: number, color: string) {
      this.x = x;
      this.y = y;
      let angle = Math.random() * Math.PI * 2;
      let speed = (Math.random() * 0.15 + 0.05) * CELL_SIZE;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.maxLife = this.life = 30;
      this.color = Math.random() > 0.5 ? color : "#FFF";
      this.size = (Math.random() * 0.1 + 0.05) * CELL_SIZE;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life--;
    }
    draw(ctx: CanvasRenderingContext2D) {
      ctx.globalAlpha = this.life / this.maxLife;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  class Lightning {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    life: number;
    maxLife: number;
    color: string;

    constructor(x1: number, y1: number, x2: number, y2: number, color: string) {
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
      this.maxLife = this.life = 25;
      this.color = color;
    }
    update() {
      this.life--;
    }
    draw(ctx: CanvasRenderingContext2D) {
      ctx.globalAlpha = this.life / this.maxLife;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = CELL_SIZE * 0.08;
      ctx.beginPath();
      ctx.moveTo(this.x1, this.y1);
      let steps = 5;
      for (let s = 1; s <= steps; s++) {
        let t = s / steps;
        let lx =
          this.x1 +
          (this.x2 - this.x1) * t +
          (Math.random() - 0.5) * CELL_SIZE * 0.5;
        let ly =
          this.y1 +
          (this.y2 - this.y1) * t +
          (Math.random() - 0.5) * CELL_SIZE * 0.5;
        if (s === steps) {
          lx = this.x2;
          ly = this.y2;
        }
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
      ctx.strokeStyle = "white";
      ctx.lineWidth = CELL_SIZE * 0.03;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }

  // --- MAIN GAME CLASS ---

  class Game {
    grid: (Tile | null)[][];
    state: "WAITING" | "ANIMATING_SWAP" | "ANIMATING_MATCHES" | "REFILLING" =
      "WAITING";

    selected: { r: number; c: number } | null = null;
    dragStart: { r: number; c: number } | null = null;
    isDragging: boolean = false;

    lastMove: { r: number; c: number }[] = [];

    currentCombo = 0;
    maxCombo = 0;
    lastRecord = 0;
    comboAlpha = 0;
    comboScale = 1;
    screenShake = 0;

    particles: Particle[] = [];
    lightnings: Lightning[] = [];

    SWAP_DELAY = 300;

    constructor() {
      this.grid = [];
      for (let r = 0; r < ROWS; r++) {
        this.grid[r] = [];
        for (let c = 0; c < COLS; c++) {
          this.grid[r][c] = null;
        }
      }
      this.initBoard();
    }

    initBoard() {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          let type: number;
          do {
            type = Math.floor(Math.random() * TYPES) + 1;
          } while (
            (c >= 2 &&
              this.grid[r][c - 1]?.type % 10 === type &&
              this.grid[r][c - 2]?.type % 10 === type) ||
            (r >= 2 &&
              this.grid[r - 1][c]?.type % 10 === type &&
              this.grid[r - 2][c]?.type % 10 === type)
          );
          this.grid[r][c] = new Tile(r, c, type);
        }
      }
    }

    getLogicalPos(clientX: number, clientY: number) {
      return {
        c: Math.floor((clientX - OFFSET_X) / CELL_SIZE),
        r: Math.floor((clientY - OFFSET_Y) / CELL_SIZE),
      };
    }

    handleInputStart(clientX: number, clientY: number) {
      audio.init();
      if (this.state !== "WAITING") return;
      const pos = this.getLogicalPos(clientX, clientY);
      if (pos.c < 0 || pos.c >= COLS || pos.r < 0 || pos.r >= ROWS) return;

      if (this.selected) {
        if (
          (pos.r !== this.selected.r || pos.c !== this.selected.c) &&
          Math.abs(pos.r - this.selected.r) +
            Math.abs(pos.c - this.selected.c) ===
            1
        ) {
          this.swap(this.selected.r, this.selected.c, pos.r, pos.c);
          return;
        }
      }

      this.dragStart = { r: pos.r, c: pos.c };
      this.selected = { r: pos.r, c: pos.c };
      this.isDragging = true;
    }

    handleInputMove(clientX: number, clientY: number) {
      if (!this.isDragging || !this.dragStart || this.state !== "WAITING")
        return;
      const pos = this.getLogicalPos(clientX, clientY);
      if (pos.c < 0 || pos.c >= COLS || pos.r < 0 || pos.r >= ROWS) return;

      if (
        (pos.r !== this.dragStart.r || pos.c !== this.dragStart.c) &&
        Math.abs(pos.r - this.dragStart.r) +
          Math.abs(pos.c - this.dragStart.c) ===
          1
      ) {
        this.swap(this.dragStart.r, this.dragStart.c, pos.r, pos.c);
        this.isDragging = false;
        this.dragStart = null;
      }
    }

    handleInputEnd(clientX: number, clientY: number) {
      if (!this.isDragging || !this.dragStart || this.state !== "WAITING") {
        this.isDragging = false;
        return;
      }

      const pos = this.getLogicalPos(clientX, clientY);

      if (pos.r === this.dragStart.r && pos.c === this.dragStart.c) {
        const tile = this.grid[pos.r][pos.c];

        if (tile && tile.type > 10) {
          this.state = "ANIMATING_MATCHES";
          if (this.currentCombo > 0) this.lastRecord = this.currentCombo;
          this.currentCombo = 0;
          this.executeSuper(pos.r, pos.c, tile.type, () => {
            this.state = "REFILLING";
            this.refillBoard();
          });
          this.grid[pos.r][pos.c] = null;
          this.selected = null;
        }
      }

      this.isDragging = false;
      this.dragStart = null;
    }

    swap(r1: number, c1: number, r2: number, c2: number) {
      this.state = "ANIMATING_SWAP";
      audio.play("swap");
      if (this.currentCombo > 0) this.lastRecord = this.currentCombo;
      this.currentCombo = 0;
      this.selected = null;

      let t1 = this.grid[r1][c1]!;
      let t2 = this.grid[r2][c2]!;
      t1.r = r2;
      t1.c = c2;
      t2.r = r1;
      t2.c = c1;
      this.grid[r1][c1] = t2;
      this.grid[r2][c2] = t1;
      this.lastMove = [
        { r: r1, c: c1 },
        { r: r2, c: c2 },
      ];

      setTimeout(() => {
        if (this.getClusters().length === 0) {
          t1.r = r1;
          t1.c = c1;
          t2.r = r2;
          t2.c = c2;
          this.grid[r1][c1] = t1;
          this.grid[r2][c2] = t2;
          setTimeout(() => {
            this.state = "WAITING";
            this.lastMove = [];
          }, this.SWAP_DELAY);
        } else {
          this.handleMatches();
        }
      }, this.SWAP_DELAY);
    }

    getClusters() {
      let matches: boolean[][] = [];
      for (let r = 0; r < ROWS; r++) {
        matches[r] = [];
        for (let c = 0; c < COLS; c++) matches[r][c] = false;
      }
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          let t = this.grid[r][c]?.type;
          if (!t) continue;
          let color = t % 10;
          if (
            c < COLS - 2 &&
            this.grid[r][c + 1]?.type % 10 === color &&
            this.grid[r][c + 2]?.type % 10 === color
          ) {
            matches[r][c] = true;
            matches[r][c + 1] = true;
            matches[r][c + 2] = true;
          }
          if (
            r < ROWS - 2 &&
            this.grid[r + 1][c]?.type % 10 === color &&
            this.grid[r + 2][c]?.type % 10 === color
          ) {
            matches[r][c] = true;
            matches[r + 1][c] = true;
            matches[r + 2][c] = true;
          }
        }
      }
      let visited: boolean[][] = [];
      for (let r = 0; r < ROWS; r++) {
        visited[r] = [];
        for (let c = 0; c < COLS; c++) visited[r][c] = false;
      }
      let clusters: { r: number; c: number }[][] = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (matches[r][c] && !visited[r][c]) {
            let cluster: { r: number; c: number }[] = [];
            let queue = [{ r, c }];
            visited[r][c] = true;
            let type = this.grid[r][c]!.type % 10;
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
                  this.grid[nr][nc]?.type % 10 === type
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

    executeSuperQueue(
      queue: { r: number; c: number; type: number }[],
      index: number,
      onComplete: () => void,
    ) {
      if (index >= queue.length) {
        onComplete();
        return;
      }
      this.executeSuper(queue[index].r, queue[index].c, queue[index].type, () =>
        this.executeSuperQueue(queue, index + 1, onComplete),
      );
    }

    executeSuper(r: number, c: number, type: number, onComplete: () => void) {
      let centerTile = this.grid[r][c];
      if (centerTile) {
        centerTile.flash = 1;
        centerTile.scale = 1.3;
      }

      setTimeout(() => {
        let affected: { r: number; c: number }[] = [];
        let cx = OFFSET_X + c * CELL_SIZE + CELL_SIZE / 2,
          cy = OFFSET_Y + r * CELL_SIZE + CELL_SIZE / 2;
        let hexColor = COLORS[type % 10] || "#FFF";

        if (type > 10 && type < 20) {
          audio.play("bomb");
          for (let i = -1; i <= 1; i++)
            for (let j = -1; j <= 1; j++) {
              let nr = r + i,
                nc = c + j;
              if (
                nr >= 0 &&
                nr < ROWS &&
                nc >= 0 &&
                nc < COLS &&
                this.grid[nr][nc]
              )
                affected.push({ r: nr, c: nc });
            }
          this.screenShake = 20;
          for (let p = 0; p < 40; p++)
            this.particles.push(new Particle(cx, cy, hexColor));
        } else if (type > 20) {
          audio.play("crystal");
          let color = type % 10;
          for (let i = 0; i < ROWS; i++)
            for (let j = 0; j < COLS; j++)
              if (this.grid[i][j] && this.grid[i][j]!.type % 10 === color)
                affected.push({ r: i, c: j });
          this.screenShake = 10;
          for (let i = 0; i < affected.length; i++) {
            this.lightnings.push(
              new Lightning(
                cx,
                cy,
                OFFSET_X + affected[i].c * CELL_SIZE + CELL_SIZE / 2,
                OFFSET_Y + affected[i].r * CELL_SIZE + CELL_SIZE / 2,
                hexColor,
              ),
            );
          }
        }

        let step = 25;
        let interval = setInterval(() => {
          for (let i = 0; i < affected.length; i++) {
            let t = this.grid[affected[i].r][affected[i].c];
            if (t) t.scale = step / 25;
          }
          step--;
          if (step < 0) {
            clearInterval(interval);
            let chainReactions: { r: number; c: number; type: number }[] = [];
            for (let i = 0; i < affected.length; i++) {
              let p = affected[i],
                tile = this.grid[p.r][p.c];
              if (tile) {
                if (tile.type > 10 && (p.r !== r || p.c !== c))
                  chainReactions.push({ r: p.r, c: p.c, type: tile.type });
                this.grid[p.r][p.c] = null;
              }
            }
            this.grid[r][c] = null;
            this.executeSuperQueue(chainReactions, 0, onComplete);
          }
        }, 20);
      }, 400);
    }

    handleMatches() {
      let clusters = this.getClusters();
      if (clusters.length === 0) {
        this.state = "WAITING";
        return;
      }

      this.state = "ANIMATING_MATCHES";
      this.currentCombo += clusters.length;
      if (this.currentCombo > this.maxCombo) this.maxCombo = this.currentCombo;
      if (this.currentCombo > 1) {
        this.comboAlpha = 1.0;
        this.comboScale = 1.5;
      }

      let toPop: { r: number; c: number }[] = [];
      let superToTrigger: { r: number; c: number; type: number }[] = [];

      for (let i = 0; i < clusters.length; i++) {
        let cl = clusters[i],
          type = this.grid[cl[0].r][cl[0].c]!.type % 10;
        let spawnPoint: { r: number; c: number } | null = null;
        for (let j = 0; j < cl.length; j++) {
          for (let k = 0; k < this.lastMove.length; k++)
            if (
              this.lastMove[k].r === cl[j].r &&
              this.lastMove[k].c === cl[j].c
            )
              spawnPoint = cl[j];
        }
        if (!spawnPoint && cl.length >= 4)
          spawnPoint = cl[Math.floor(cl.length / 2)];

        for (let j = 0; j < cl.length; j++) {
          let p = cl[j],
            tile = this.grid[p.r][p.c]!;
          if (tile.type > 10) {
            superToTrigger.push({ r: p.r, c: p.c, type: tile.type });
            toPop.push(p);
          } else if (
            spawnPoint &&
            p.r === spawnPoint.r &&
            p.c === spawnPoint.c &&
            cl.length >= 4
          ) {
            this.grid[p.r][p.c] = new Tile(
              p.r,
              p.c,
              type + (cl.length >= 5 ? 20 : 10),
            );
            spawnPoint = null;
          } else toPop.push(p);
        }
      }
      this.lastMove = [];

      let step = 20;
      let interval = setInterval(() => {
        for (let i = 0; i < toPop.length; i++) {
          let p = toPop[i],
            isDyingSuper = false;
          for (let s = 0; s < superToTrigger.length; s++)
            if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
              isDyingSuper = true;
          let tile = this.grid[p.r][p.c];
          if (tile && (tile.type < 10 || isDyingSuper)) tile.scale = step / 20;
        }
        step--;
        if (step < 0) {
          clearInterval(interval);
          audio.play("match");
          for (let i = 0; i < toPop.length; i++) {
            let p = toPop[i],
              isDyingSuper = false;
            for (let s = 0; s < superToTrigger.length; s++)
              if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
                isDyingSuper = true;
            let tile = this.grid[p.r][p.c];
            if (tile && (tile.type < 10 || isDyingSuper))
              this.grid[p.r][p.c] = null;
          }
          this.executeSuperQueue(superToTrigger, 0, () => {
            this.state = "REFILLING";
            this.refillBoard();
          });
        }
      }, 20);
    }

    refillBoard() {
      for (let c = 0; c < COLS; c++) {
        let empty = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (this.grid[r][c] === null) empty++;
          else if (empty > 0) {
            let tile = this.grid[r][c]!;
            tile.r = r + empty;
            this.grid[r + empty][c] = tile;
            this.grid[r][c] = null;
          }
        }
        let spawnedInThisCol = 1;
        for (let r = empty - 1; r >= 0; r--) {
          let type = Math.floor(Math.random() * TYPES) + 1;
          this.grid[r][c] = new Tile(r, c, type, -CELL_SIZE * spawnedInThisCol);
          spawnedInThisCol++;
        }
      }
    }

    update() {
      let speed =
        this.state === "ANIMATING_SWAP" ? CELL_SIZE * 0.08 : CELL_SIZE * 0.1;
      let moving = false;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.grid[r][c]?.update(speed)) moving = true;
        }
      }

      if (this.state === "WAITING" && this.comboAlpha > 0)
        this.comboAlpha -= 0.02;
      if (this.comboScale > 1) this.comboScale -= 0.05;
      if (this.screenShake > 0) this.screenShake -= 1;

      for (let i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].update();
        if (this.particles[i].life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.lightnings.length - 1; i >= 0; i--) {
        this.lightnings[i].update();
        if (this.lightnings[i].life <= 0) this.lightnings.splice(i, 1);
      }

      if (!moving && this.state === "REFILLING") this.handleMatches();
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = "#1E1E24";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      if (this.screenShake > 0)
        ctx.translate(
          (Math.random() - 0.5) * this.screenShake,
          (Math.random() - 0.5) * this.screenShake,
        );

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

      // Малюємо спочатку звичайні, потім ті що свапаються
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          let isSwapping = this.lastMove.some((m) => m.r === r && m.c === c);
          if (!isSwapping && this.grid[r][c])
            this.grid[r][c]!.draw(
              ctx,
              this.selected?.r === r && this.selected?.c === c,
            );
        }
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          let isSwapping = this.lastMove.some((m) => m.r === r && m.c === c);
          if (isSwapping && this.grid[r][c]) this.grid[r][c]!.draw(ctx, false);
        }

      this.lightnings.forEach((l) => l.draw(ctx));
      this.particles.forEach((p) => p.draw(ctx));
      ctx.restore();

      // --- UI ---
      let fSmall = Math.floor(CELL_SIZE * 0.35),
        fBig = Math.floor(CELL_SIZE * 1.15),
        fMed = Math.floor(CELL_SIZE * 0.4);

      ctx.fillStyle = "#888";
      ctx.font = `${fSmall}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText("MAX COMBO", UI_X, UI_Y);
      ctx.fillStyle = "#FFD700";
      ctx.font = `bold ${fBig}px Arial`;
      ctx.fillText(`x${this.maxCombo}`, UI_X, UI_Y + fBig);

      ctx.strokeStyle = "#444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(UI_X - CELL_SIZE * 1.5, UI_Y + fBig + fSmall);
      ctx.lineTo(UI_X + CELL_SIZE * 1.5, UI_Y + fBig + fSmall);
      ctx.stroke();

      ctx.fillStyle = "#CCC";
      ctx.font = `${fSmall}px Arial`;
      ctx.fillText(
        `LAST RECORD: x${this.lastRecord}`,
        UI_X,
        UI_Y + fBig + fSmall * 2.5,
      );

      ctx.beginPath();
      ctx.moveTo(UI_X - CELL_SIZE * 1.5, UI_Y + fBig + fSmall * 3.5);
      ctx.lineTo(UI_X + CELL_SIZE * 1.5, UI_Y + fBig + fSmall * 3.5);
      ctx.stroke();

      if (this.currentCombo > 1 && this.comboAlpha > 0) {
        ctx.save();
        ctx.translate(UI_X, UI_Y + fBig + fSmall * 6);
        ctx.scale(this.comboScale, this.comboScale);
        ctx.fillStyle = `rgba(255, 89, 94, ${this.comboAlpha})`;
        ctx.font = `bold ${fBig * 0.8}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`x${this.currentCombo}`, 0, -fSmall);
        ctx.font = `bold ${fMed}px Arial`;
        ctx.fillText("COMBO!", 0, fSmall);
        ctx.restore();
      }
    }
  }

  // Ініціалізація та слухачі
  const game = new Game();

  canvas.addEventListener("mousedown", (e) =>
    game.handleInputStart(e.clientX, e.clientY),
  );
  canvas.addEventListener("mousemove", (e) =>
    game.handleInputMove(e.clientX, e.clientY),
  );
  window.addEventListener("mouseup", (e) => {
    game.handleInputEnd(e.clientX, e.clientY);
  });

  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      game.handleInputStart(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: false },
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      game.handleInputMove(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: false },
  );
  window.addEventListener("touchend", (e) => {
    if (e.changedTouches.length > 0) {
      game.handleInputEnd(
        e.changedTouches[0].clientX,
        e.changedTouches[0].clientY,
      );
    } else {
      game.isDragging = false;
    }
  });

  function gameLoop() {
    game.update();
    game.draw(ctx);
    requestAnimationFrame(gameLoop);
  }
  gameLoop();
}

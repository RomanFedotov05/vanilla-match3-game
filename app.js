{
    // Додаємо стилі прямо в body, щоб прибрати скроли і відступи браузера
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "#1E1E24";
    var canvas_1 = document.getElementById("gameCanvas");
    var ctx_1 = canvas_1.getContext("2d");
    canvas_1.style.position = "absolute";
    canvas_1.style.top = "0";
    canvas_1.style.left = "0";
    canvas_1.style.width = "100vw";
    canvas_1.style.height = "100vh";
    canvas_1.style.touchAction = "none";
    var ROWS_1 = 8, COLS_1 = 8, TYPES_1 = 5;
    var colors_1 = ["", "#FF595E", "#8AC926", "#1982C4", "#FFCA3A", "#6A4C93"];
    // Динамічні змінні (тепер вони змінюються при ресайзі)
    var CELL_SIZE_1 = 70;
    var OFFSET_X_1 = 40, OFFSET_Y_1 = 40, UI_X_1 = 780, UI_Y_1 = 40;
    var board_1 = [];
    var visualY_1 = [];
    var visualX_1 = [];
    var scale_1 = [];
    var flash_1 = [];
    var selectedTile_1 = null;
    var isDragging_1 = false;
    var gameState_1 = "WAITING";
    var lastMoveTiles_1 = [];
    var SWAP_DELAY_1 = 300;
    var currentCombo_1 = 0, maxCombo_1 = 0, lastRecord_1 = 0, comboAlpha_1 = 0, comboScale_1 = 1;
    var screenShake_1 = 0;
    var particles_1 = [];
    var lightnings_1 = [];
    // --- СУПЕР АДАПТИВНІСТЬ ---
    function resizeCanvas() {
        canvas_1.width = window.innerWidth;
        canvas_1.height = window.innerHeight;
        if (canvas_1.height > canvas_1.width) {
            // ПОРТРЕТ (Телефон)
            CELL_SIZE_1 = Math.floor((canvas_1.width * 0.85) / COLS_1);
            OFFSET_X_1 = (canvas_1.width - CELL_SIZE_1 * COLS_1) / 2;
            OFFSET_Y_1 = canvas_1.height - CELL_SIZE_1 * ROWS_1 - canvas_1.height * 0.05; // Поле внизу
            UI_X_1 = canvas_1.width / 2;
            UI_Y_1 = OFFSET_Y_1 / 4; // Меню по центру зверху
        }
        else {
            // ЛАНДШАФТ (ПК)
            CELL_SIZE_1 = Math.floor((canvas_1.height * 0.85) / ROWS_1);
            OFFSET_X_1 = canvas_1.width * 0.05; // Поле зліва
            OFFSET_Y_1 = (canvas_1.height - CELL_SIZE_1 * ROWS_1) / 2;
            var rightEdge = OFFSET_X_1 + CELL_SIZE_1 * COLS_1;
            UI_X_1 = rightEdge + (canvas_1.width - rightEdge) / 2; // Меню рівно по центру вільної правої зони
            UI_Y_1 = canvas_1.height / 3;
        }
        // Миттєво оновлюємо координати, якщо гравець перевернув екран
        for (var r = 0; r < ROWS_1; r++) {
            if (!visualY_1[r])
                continue;
            for (var c = 0; c < COLS_1; c++) {
                visualY_1[r][c] = r * CELL_SIZE_1;
                visualX_1[r][c] = c * CELL_SIZE_1;
            }
        }
    }
    window.addEventListener("resize", resizeCanvas);
    // Викликаємо одразу при старті
    resizeCanvas();
    // --- ЗВУКИ ---
    var audioCtx_1 = null;
    function initAudio() {
        if (!audioCtx_1)
            audioCtx_1 = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx_1.state === "suspended")
            audioCtx_1.resume();
    }
    function playSound(type) {
        if (!audioCtx_1)
            return;
        var osc = audioCtx_1.createOscillator();
        var gain = audioCtx_1.createGain();
        osc.connect(gain);
        gain.connect(audioCtx_1.destination);
        var now = audioCtx_1.currentTime;
        if (type === "swap") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
        else if (type === "match") {
            osc.type = "triangle";
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
        else if (type === "bomb") {
            osc.type = "square";
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        }
        else if (type === "crystal") {
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
        for (var r = 0; r < ROWS_1; r++) {
            board_1[r] = [];
            visualY_1[r] = [];
            visualX_1[r] = [];
            scale_1[r] = [];
            flash_1[r] = [];
            for (var c = 0; c < COLS_1; c++) {
                var type = void 0;
                do {
                    type = Math.floor(Math.random() * TYPES_1) + 1;
                } while ((c >= 2 &&
                    board_1[r][c - 1] % 10 === type &&
                    board_1[r][c - 2] % 10 === type) ||
                    (r >= 2 &&
                        board_1[r - 1] &&
                        board_1[r - 1][c] % 10 === type &&
                        board_1[r - 2] &&
                        board_1[r - 2][c] % 10 === type));
                board_1[r][c] = type;
                visualY_1[r][c] = r * CELL_SIZE_1;
                visualX_1[r][c] = c * CELL_SIZE_1;
                scale_1[r][c] = 1;
                flash_1[r][c] = 0;
            }
        }
    }
    function createBoolGrid() {
        var grid = [];
        for (var r = 0; r < ROWS_1; r++) {
            grid[r] = [];
            for (var c = 0; c < COLS_1; c++)
                grid[r][c] = false;
        }
        return grid;
    }
    function getClusters() {
        var matches = createBoolGrid();
        for (var r = 0; r < ROWS_1; r++) {
            for (var c = 0; c < COLS_1; c++) {
                var t = board_1[r][c] % 10;
                if (t === 0)
                    continue;
                if (c < COLS_1 - 2 &&
                    board_1[r][c + 1] % 10 === t &&
                    board_1[r][c + 2] % 10 === t) {
                    matches[r][c] = true;
                    matches[r][c + 1] = true;
                    matches[r][c + 2] = true;
                }
                if (r < ROWS_1 - 2 &&
                    board_1[r + 1][c] % 10 === t &&
                    board_1[r + 2][c] % 10 === t) {
                    matches[r][c] = true;
                    matches[r + 1][c] = true;
                    matches[r + 2][c] = true;
                }
            }
        }
        var visited = createBoolGrid();
        var clusters = [];
        for (var r = 0; r < ROWS_1; r++) {
            for (var c = 0; c < COLS_1; c++) {
                if (matches[r][c] && !visited[r][c]) {
                    var cluster = [];
                    var queue = [{ r: r, c: c }];
                    visited[r][c] = true;
                    var type = board_1[r][c] % 10;
                    while (queue.length > 0) {
                        var curr = queue.shift();
                        cluster.push(curr);
                        var dirs = [
                            [0, 1],
                            [0, -1],
                            [1, 0],
                            [-1, 0],
                        ];
                        for (var d = 0; d < dirs.length; d++) {
                            var nr = curr.r + dirs[d][0], nc = curr.c + dirs[d][1];
                            if (nr >= 0 &&
                                nr < ROWS_1 &&
                                nc >= 0 &&
                                nc < COLS_1 &&
                                matches[nr][nc] &&
                                !visited[nr][nc] &&
                                board_1[nr][nc] % 10 === type) {
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
    function executeSuperQueue(queue, index, onComplete) {
        if (index >= queue.length) {
            onComplete();
            return;
        }
        executeSuper(queue[index].r, queue[index].c, queue[index].type, function () {
            return executeSuperQueue(queue, index + 1, onComplete);
        });
    }
    function executeSuper(r, c, type, onComplete) {
        flash_1[r][c] = 1;
        scale_1[r][c] = 1.3;
        setTimeout(function () {
            var affected = [];
            var cx = OFFSET_X_1 + c * CELL_SIZE_1 + CELL_SIZE_1 / 2, cy = OFFSET_Y_1 + r * CELL_SIZE_1 + CELL_SIZE_1 / 2;
            var hexColor = colors_1[type % 10] || "#FFF";
            if (type > 10 && type < 20) {
                playSound("bomb");
                for (var i = -1; i <= 1; i++)
                    for (var j = -1; j <= 1; j++) {
                        var nr = r + i, nc = c + j;
                        if (nr >= 0 && nr < ROWS_1 && nc >= 0 && nc < COLS_1)
                            affected.push({ r: nr, c: nc });
                    }
                screenShake_1 = 20;
                for (var p = 0; p < 40; p++) {
                    var angle = Math.random() * Math.PI * 2;
                    var speed = (Math.random() * 0.15 + 0.05) * CELL_SIZE_1; // Адаптивна швидкість
                    particles_1.push({
                        x: cx,
                        y: cy,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 30,
                        maxLife: 30,
                        color: Math.random() > 0.5 ? hexColor : "#FFF",
                        size: (Math.random() * 0.1 + 0.05) * CELL_SIZE_1,
                    });
                }
            }
            else if (type > 20) {
                playSound("crystal");
                var color = type % 10;
                for (var i = 0; i < ROWS_1; i++)
                    for (var j = 0; j < COLS_1; j++)
                        if (board_1[i][j] > 0 && board_1[i][j] % 10 === color)
                            affected.push({ r: i, c: j });
                screenShake_1 = 10;
                for (var i = 0; i < affected.length; i++) {
                    lightnings_1.push({
                        x1: cx,
                        y1: cy,
                        x2: OFFSET_X_1 + affected[i].c * CELL_SIZE_1 + CELL_SIZE_1 / 2,
                        y2: OFFSET_Y_1 + affected[i].r * CELL_SIZE_1 + CELL_SIZE_1 / 2,
                        life: 25,
                        maxLife: 25,
                        color: hexColor,
                    });
                }
            }
            var step = 25;
            var interval = setInterval(function () {
                for (var i = 0; i < affected.length; i++)
                    scale_1[affected[i].r][affected[i].c] = step / 25;
                step--;
                if (step < 0) {
                    clearInterval(interval);
                    var chainReactions = [];
                    for (var i = 0; i < affected.length; i++) {
                        var p = affected[i], t = board_1[p.r][p.c];
                        if (t > 10 && (p.r !== r || p.c !== c))
                            chainReactions.push({ r: p.r, c: p.c, type: t });
                        board_1[p.r][p.c] = 0;
                        scale_1[p.r][p.c] = 1;
                        flash_1[p.r][p.c] = 0;
                    }
                    board_1[r][c] = 0;
                    scale_1[r][c] = 1;
                    executeSuperQueue(chainReactions, 0, onComplete);
                }
            }, 20);
        }, 400);
    }
    function handleMatches() {
        var clusters = getClusters();
        if (clusters.length === 0) {
            gameState_1 = "WAITING";
            return;
        }
        gameState_1 = "ANIMATING_MATCHES";
        currentCombo_1 += clusters.length;
        if (currentCombo_1 > maxCombo_1)
            maxCombo_1 = currentCombo_1;
        if (currentCombo_1 > 1) {
            comboAlpha_1 = 1.0;
            comboScale_1 = 1.5;
        }
        var toPop = [];
        var superToTrigger = [];
        for (var i = 0; i < clusters.length; i++) {
            var cl = clusters[i], type = board_1[cl[0].r][cl[0].c] % 10;
            var spawnPoint = null;
            for (var j = 0; j < cl.length; j++) {
                for (var k = 0; k < lastMoveTiles_1.length; k++)
                    if (lastMoveTiles_1[k].r === cl[j].r && lastMoveTiles_1[k].c === cl[j].c)
                        spawnPoint = cl[j];
            }
            if (!spawnPoint && cl.length >= 4)
                spawnPoint = cl[Math.floor(cl.length / 2)];
            for (var j = 0; j < cl.length; j++) {
                var p = cl[j], cellType = board_1[p.r][p.c];
                if (cellType > 10) {
                    superToTrigger.push({ r: p.r, c: p.c, type: cellType });
                    toPop.push(p);
                }
                else if (spawnPoint &&
                    p.r === spawnPoint.r &&
                    p.c === spawnPoint.c &&
                    cl.length >= 4) {
                    board_1[p.r][p.c] = type + (cl.length >= 5 ? 20 : 10);
                    spawnPoint = null;
                }
                else
                    toPop.push(p);
            }
        }
        lastMoveTiles_1 = [];
        var step = 20;
        var interval = setInterval(function () {
            for (var i = 0; i < toPop.length; i++) {
                var p = toPop[i], isDyingSuper = false;
                for (var s = 0; s < superToTrigger.length; s++)
                    if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
                        isDyingSuper = true;
                if (board_1[p.r][p.c] < 10 || isDyingSuper)
                    scale_1[p.r][p.c] = step / 20;
            }
            for (var r = 0; r < ROWS_1; r++)
                for (var c = 0; c < COLS_1; c++)
                    if (flash_1[r][c] > 0)
                        flash_1[r][c] -= 0.05;
            step--;
            if (step < 0) {
                clearInterval(interval);
                playSound("match");
                for (var i = 0; i < toPop.length; i++) {
                    var p = toPop[i], isDyingSuper = false;
                    for (var s = 0; s < superToTrigger.length; s++)
                        if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
                            isDyingSuper = true;
                    if (board_1[p.r][p.c] < 10 || isDyingSuper) {
                        board_1[p.r][p.c] = 0;
                        scale_1[p.r][p.c] = 1;
                    }
                }
                executeSuperQueue(superToTrigger, 0, function () {
                    gameState_1 = "REFILLING";
                    refillBoard();
                });
            }
        }, 20);
    }
    function refillBoard() {
        for (var c = 0; c < COLS_1; c++) {
            var empty = 0;
            for (var r = ROWS_1 - 1; r >= 0; r--) {
                if (board_1[r][c] === 0)
                    empty++;
                else if (empty > 0) {
                    board_1[r + empty][c] = board_1[r][c];
                    visualY_1[r + empty][c] = visualY_1[r][c];
                    visualX_1[r + empty][c] = visualX_1[r][c];
                    scale_1[r + empty][c] = scale_1[r][c];
                    board_1[r][c] = 0;
                }
            }
            var spawnedInThisCol = 1;
            for (var r = empty - 1; r >= 0; r--) {
                board_1[r][c] = Math.floor(Math.random() * TYPES_1) + 1;
                visualY_1[r][c] = -CELL_SIZE_1 * spawnedInThisCol;
                visualX_1[r][c] = c * CELL_SIZE_1;
                scale_1[r][c] = 1;
                spawnedInThisCol++;
            }
        }
    }
    function isSwapping(r, c) {
        if (gameState_1 !== "ANIMATING_SWAP")
            return false;
        for (var i = 0; i < lastMoveTiles_1.length; i++)
            if (lastMoveTiles_1[i].r === r && lastMoveTiles_1[i].c === c)
                return true;
        return false;
    }
    function update() {
        // Адаптивна швидкість падіння
        var dynamicFallSpeed = CELL_SIZE_1 * 0.1;
        var dynamicSwapSpeed = CELL_SIZE_1 * 0.08;
        var moving = false, currentSpeed = gameState_1 === "ANIMATING_SWAP" ? dynamicSwapSpeed : dynamicFallSpeed;
        for (var r = 0; r < ROWS_1; r++) {
            for (var c = 0; c < COLS_1; c++) {
                var targetY = r * CELL_SIZE_1;
                if (Math.abs(visualY_1[r][c] - targetY) > currentSpeed) {
                    visualY_1[r][c] +=
                        targetY - visualY_1[r][c] > 0 ? currentSpeed : -currentSpeed;
                    moving = true;
                }
                else
                    visualY_1[r][c] = targetY;
                var targetX = c * CELL_SIZE_1;
                if (Math.abs(visualX_1[r][c] - targetX) > currentSpeed) {
                    visualX_1[r][c] +=
                        targetX - visualX_1[r][c] > 0 ? currentSpeed : -currentSpeed;
                    moving = true;
                }
                else
                    visualX_1[r][c] = targetX;
                if (flash_1[r][c] > 0)
                    flash_1[r][c] -= 0.02;
                if (scale_1[r][c] > 1 &&
                    gameState_1 !== "ANIMATING_MATCHES" &&
                    flash_1[r][c] <= 0)
                    scale_1[r][c] -= 0.02;
            }
        }
        if (gameState_1 === "WAITING" && comboAlpha_1 > 0)
            comboAlpha_1 -= 0.02;
        if (comboScale_1 > 1)
            comboScale_1 -= 0.05;
        if (screenShake_1 > 0)
            screenShake_1 -= 1;
        for (var i = particles_1.length - 1; i >= 0; i--) {
            particles_1[i].x += particles_1[i].vx;
            particles_1[i].y += particles_1[i].vy;
            particles_1[i].life--;
            if (particles_1[i].life <= 0)
                particles_1.splice(i, 1);
        }
        for (var i = lightnings_1.length - 1; i >= 0; i--) {
            lightnings_1[i].life--;
            if (lightnings_1[i].life <= 0)
                lightnings_1.splice(i, 1);
        }
        if (!moving && gameState_1 === "REFILLING")
            handleMatches();
    }
    function drawTile(r, c) {
        var type = board_1[r][c];
        if (type === 0)
            return;
        var s = scale_1[r][c];
        var x = OFFSET_X_1 + visualX_1[r][c] + (CELL_SIZE_1 * (1 - s)) / 2;
        var y = OFFSET_Y_1 + visualY_1[r][c] + (CELL_SIZE_1 * (1 - s)) / 2;
        var size = CELL_SIZE_1 * s;
        var m = size / 70; // Множник для збереження пропорцій малюнку
        if (flash_1[r][c] > 0) {
            ctx_1.fillStyle = "rgba(255, 200, 50, ".concat(flash_1[r][c], ")");
            ctx_1.beginPath();
            ctx_1.arc(x + size / 2, y + size / 2, 50 * m, 0, Math.PI * 2);
            ctx_1.fill();
            ctx_1.strokeStyle = "rgba(255, 255, 255, ".concat(flash_1[r][c], ")");
            ctx_1.lineWidth = 3 * m;
            for (var i = 0; i < 8; i++) {
                var angle = ((Math.PI * 2) / 8) * i;
                ctx_1.beginPath();
                ctx_1.moveTo(x + size / 2 + Math.cos(angle) * 20 * m, y + size / 2 + Math.sin(angle) * 20 * m);
                ctx_1.lineTo(x + size / 2 + Math.cos(angle) * 45 * m, y + size / 2 + Math.sin(angle) * 45 * m);
                ctx_1.stroke();
            }
        }
        ctx_1.fillStyle = colors_1[type % 10];
        if (type > 20) {
            ctx_1.beginPath();
            ctx_1.moveTo(x + size / 2, y + 4 * m);
            ctx_1.lineTo(x + size - 6 * m, y + size / 2);
            ctx_1.lineTo(x + size / 2, y + size - 4 * m);
            ctx_1.lineTo(x + 6 * m, y + size / 2);
            ctx_1.fill();
            ctx_1.fillStyle = "rgba(255,255,255,0.4)";
            ctx_1.beginPath();
            ctx_1.moveTo(x + size / 2, y + 4 * m);
            ctx_1.lineTo(x + size / 2, y + size - 4 * m);
            ctx_1.lineTo(x + 6 * m, y + size / 2);
            ctx_1.fill();
        }
        else if (type > 10) {
            ctx_1.beginPath();
            ctx_1.moveTo(x + size / 2, y + 10 * m);
            ctx_1.quadraticCurveTo(x + size / 2 + 15 * m, y - 4 * m, x + size / 2 + 18 * m, y + 6 * m);
            ctx_1.strokeStyle = "#C19A6B";
            ctx_1.lineWidth = 3 * m;
            ctx_1.stroke();
            ctx_1.fillStyle = "#FFD700";
            ctx_1.beginPath();
            ctx_1.arc(x + size / 2 + 18 * m, y + 6 * m, 4 * m, 0, Math.PI * 2);
            ctx_1.fill();
            ctx_1.fillStyle = "#888";
            ctx_1.fillRect(x + size / 2 - 8 * m, y + 6 * m, 16 * m, 8 * m);
            ctx_1.fillStyle = colors_1[type % 10];
            ctx_1.beginPath();
            ctx_1.arc(x + size / 2, y + size / 2 + 5 * m, size * 0.38, 0, Math.PI * 2);
            ctx_1.fill();
            ctx_1.fillStyle = "rgba(255,255,255,0.3)";
            ctx_1.beginPath();
            ctx_1.arc(x + size / 2 - 6 * m, y + size / 2 - 3 * m, size * 0.12, 0, Math.PI * 2);
            ctx_1.fill();
        }
        else {
            ctx_1.beginPath();
            if (typeof ctx_1.roundRect === "function") {
                ctx_1.roundRect(x + 5 * m, y + 5 * m, size - 10 * m, size - 10 * m, 12 * m);
            }
            else {
                ctx_1.rect(x + 5 * m, y + 5 * m, size - 10 * m, size - 10 * m);
            }
            ctx_1.fill();
        }
        if (selectedTile_1 && selectedTile_1.r === r && selectedTile_1.c === c) {
            ctx_1.strokeStyle = "white";
            ctx_1.lineWidth = 4 * m;
            if (typeof ctx_1.roundRect === "function") {
                ctx_1.beginPath();
                ctx_1.roundRect(x + 1 * m, y + 1 * m, size - 2 * m, size - 2 * m, 14 * m);
                ctx_1.stroke();
            }
            else {
                ctx_1.strokeRect(x + 1 * m, y + 1 * m, size - 2 * m, size - 2 * m);
            }
        }
    }
    function draw() {
        ctx_1.fillStyle = "#1E1E24";
        ctx_1.fillRect(0, 0, canvas_1.width, canvas_1.height);
        ctx_1.save();
        if (screenShake_1 > 0) {
            ctx_1.translate((Math.random() - 0.5) * screenShake_1, (Math.random() - 0.5) * screenShake_1);
        }
        var pad = CELL_SIZE_1 * 0.2;
        ctx_1.fillStyle = "#2B2B33";
        if (typeof ctx_1.roundRect === "function") {
            ctx_1.beginPath();
            ctx_1.roundRect(OFFSET_X_1 - pad, OFFSET_Y_1 - pad, COLS_1 * CELL_SIZE_1 + pad * 2, ROWS_1 * CELL_SIZE_1 + pad * 2, pad * 1.5);
            ctx_1.fill();
        }
        else {
            ctx_1.fillRect(OFFSET_X_1 - pad, OFFSET_Y_1 - pad, COLS_1 * CELL_SIZE_1 + pad * 2, ROWS_1 * CELL_SIZE_1 + pad * 2);
        }
        for (var r = 0; r < ROWS_1; r++)
            for (var c = 0; c < COLS_1; c++)
                if (!isSwapping(r, c))
                    drawTile(r, c);
        for (var r = 0; r < ROWS_1; r++)
            for (var c = 0; c < COLS_1; c++)
                if (isSwapping(r, c))
                    drawTile(r, c);
        for (var i = 0; i < lightnings_1.length; i++) {
            var l = lightnings_1[i];
            ctx_1.globalAlpha = l.life / l.maxLife;
            ctx_1.strokeStyle = l.color;
            ctx_1.lineWidth = CELL_SIZE_1 * 0.08;
            ctx_1.beginPath();
            ctx_1.moveTo(l.x1, l.y1);
            var steps = 5;
            for (var s = 1; s <= steps; s++) {
                var t = s / steps, lx = l.x1 + (l.x2 - l.x1) * t + (Math.random() - 0.5) * CELL_SIZE_1 * 0.5, ly = l.y1 + (l.y2 - l.y1) * t + (Math.random() - 0.5) * CELL_SIZE_1 * 0.5;
                if (s === steps) {
                    lx = l.x2;
                    ly = l.y2;
                }
                ctx_1.lineTo(lx, ly);
            }
            ctx_1.stroke();
            ctx_1.strokeStyle = "white";
            ctx_1.lineWidth = CELL_SIZE_1 * 0.03;
            ctx_1.stroke();
            ctx_1.globalAlpha = 1.0;
        }
        for (var i = 0; i < particles_1.length; i++) {
            var p = particles_1[i];
            ctx_1.globalAlpha = p.life / p.maxLife;
            ctx_1.fillStyle = p.color;
            ctx_1.beginPath();
            ctx_1.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx_1.fill();
        }
        ctx_1.globalAlpha = 1.0;
        ctx_1.restore();
        // --- АДАПТИВНИЙ UI ---
        var fSmall = Math.floor(CELL_SIZE_1 * 0.35); // Шрифт для текстів
        var fBig = Math.floor(CELL_SIZE_1 * 1.15); // Шрифт для великих чисел
        var fMed = Math.floor(CELL_SIZE_1 * 0.4);
        ctx_1.fillStyle = "#888";
        ctx_1.font = "".concat(fSmall, "px Arial");
        ctx_1.textAlign = "center";
        ctx_1.fillText("MAX COMBO", UI_X_1, UI_Y_1);
        ctx_1.fillStyle = "#FFD700";
        ctx_1.font = "bold ".concat(fBig, "px Arial");
        ctx_1.fillText("x".concat(maxCombo_1), UI_X_1, UI_Y_1 + fBig);
        ctx_1.strokeStyle = "#444";
        ctx_1.lineWidth = 2;
        ctx_1.beginPath();
        ctx_1.moveTo(UI_X_1 - CELL_SIZE_1 * 1.5, UI_Y_1 + fBig + fSmall);
        ctx_1.lineTo(UI_X_1 + CELL_SIZE_1 * 1.5, UI_Y_1 + fBig + fSmall);
        ctx_1.stroke();
        ctx_1.fillStyle = "#CCC";
        ctx_1.font = "".concat(fSmall, "px Arial");
        ctx_1.fillText("LAST RECORD: x".concat(lastRecord_1), UI_X_1, UI_Y_1 + fBig + fSmall * 2.5);
        ctx_1.beginPath();
        ctx_1.moveTo(UI_X_1 - CELL_SIZE_1 * 1.5, UI_Y_1 + fBig + fSmall * 3.5);
        ctx_1.lineTo(UI_X_1 + CELL_SIZE_1 * 1.5, UI_Y_1 + fBig + fSmall * 3.5);
        ctx_1.stroke();
        if (currentCombo_1 > 1 && comboAlpha_1 > 0) {
            ctx_1.save();
            ctx_1.translate(UI_X_1, UI_Y_1 + fBig + fSmall * 6);
            ctx_1.scale(comboScale_1, comboScale_1);
            ctx_1.fillStyle = "rgba(255, 89, 94, ".concat(comboAlpha_1, ")");
            ctx_1.font = "bold ".concat(fBig * 0.8, "px Arial");
            ctx_1.textAlign = "center";
            ctx_1.textBaseline = "middle";
            ctx_1.fillText("x".concat(currentCombo_1), 0, -fSmall);
            ctx_1.font = "bold ".concat(fMed, "px Arial");
            ctx_1.fillText("COMBO!", 0, fSmall);
            ctx_1.restore();
        }
    }
    function swap(r1, c1, r2, c2) {
        gameState_1 = "ANIMATING_SWAP";
        playSound("swap");
        if (currentCombo_1 > 0)
            lastRecord_1 = currentCombo_1;
        currentCombo_1 = 0;
        selectedTile_1 = null;
        var t1 = board_1[r1][c1], t2 = board_1[r2][c2];
        board_1[r1][c1] = t2;
        board_1[r2][c2] = t1;
        visualX_1[r1][c1] = c2 * CELL_SIZE_1;
        visualY_1[r1][c1] = r2 * CELL_SIZE_1;
        visualX_1[r2][c2] = c1 * CELL_SIZE_1;
        visualY_1[r2][c2] = r1 * CELL_SIZE_1;
        lastMoveTiles_1 = [
            { r: r1, c: c1 },
            { r: r2, c: c2 },
        ];
        setTimeout(function () {
            if (getClusters().length === 0) {
                board_1[r1][c1] = t1;
                board_1[r2][c2] = t2;
                visualX_1[r1][c1] = c1 * CELL_SIZE_1;
                visualY_1[r1][c1] = r1 * CELL_SIZE_1;
                visualX_1[r2][c2] = c2 * CELL_SIZE_1;
                visualY_1[r2][c2] = r2 * CELL_SIZE_1;
                setTimeout(function () {
                    gameState_1 = "WAITING";
                    lastMoveTiles_1 = [];
                }, SWAP_DELAY_1);
            }
            else {
                handleMatches();
            }
        }, SWAP_DELAY_1);
    }
    function getLogicalPos(clientX, clientY) {
        return {
            c: Math.floor((clientX - OFFSET_X_1) / CELL_SIZE_1),
            r: Math.floor((clientY - OFFSET_Y_1) / CELL_SIZE_1),
        };
    }
    function handleInputStart(clientX, clientY) {
        initAudio(); // Ініціалізація аудіо після першого дотику (вимога браузерів)
        if (gameState_1 !== "WAITING")
            return;
        var pos = getLogicalPos(clientX, clientY);
        if (pos.c < 0 || pos.c >= COLS_1 || pos.r < 0 || pos.r >= ROWS_1)
            return;
        if (board_1[pos.r][pos.c] > 10) {
            gameState_1 = "ANIMATING_MATCHES";
            if (currentCombo_1 > 0)
                lastRecord_1 = currentCombo_1;
            currentCombo_1 = 0;
            executeSuper(pos.r, pos.c, board_1[pos.r][pos.c], function () {
                gameState_1 = "REFILLING";
                refillBoard();
            });
            board_1[pos.r][pos.c] = 0;
        }
        else {
            if (selectedTile_1) {
                if ((pos.r !== selectedTile_1.r || pos.c !== selectedTile_1.c) &&
                    Math.abs(pos.r - selectedTile_1.r) +
                        Math.abs(pos.c - selectedTile_1.c) ===
                        1) {
                    swap(selectedTile_1.r, selectedTile_1.c, pos.r, pos.c);
                    return;
                }
            }
            selectedTile_1 = { r: pos.r, c: pos.c };
            isDragging_1 = true;
        }
    }
    function handleInputMove(clientX, clientY) {
        if (!isDragging_1 || !selectedTile_1 || gameState_1 !== "WAITING")
            return;
        var pos = getLogicalPos(clientX, clientY);
        if (pos.c < 0 || pos.c >= COLS_1 || pos.r < 0 || pos.r >= ROWS_1)
            return;
        if ((pos.r !== selectedTile_1.r || pos.c !== selectedTile_1.c) &&
            Math.abs(pos.r - selectedTile_1.r) + Math.abs(pos.c - selectedTile_1.c) === 1) {
            swap(selectedTile_1.r, selectedTile_1.c, pos.r, pos.c);
            isDragging_1 = false;
        }
    }
    canvas_1.addEventListener("mousedown", function (e) {
        return handleInputStart(e.clientX, e.clientY);
    });
    canvas_1.addEventListener("mousemove", function (e) {
        return handleInputMove(e.clientX, e.clientY);
    });
    window.addEventListener("mouseup", function () { return (isDragging_1 = false); });
    canvas_1.addEventListener("touchstart", function (e) {
        e.preventDefault();
        handleInputStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    canvas_1.addEventListener("touchmove", function (e) {
        e.preventDefault();
        handleInputMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    window.addEventListener("touchend", function () { return (isDragging_1 = false); });
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    initBoard();
    gameLoop();
}

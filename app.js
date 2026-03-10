{
    var canvas_1 = document.getElementById("gameCanvas");
    var ctx_1 = canvas_1.getContext("2d");
    canvas_1.width = 800;
    canvas_1.height = 480;
    var ROWS_1 = 8, COLS_1 = 8, CELL_SIZE_1 = 50, TYPES_1 = 5;
    var OFFSET_X_1 = 40;
    var OFFSET_Y_1 = 40;
    var colors_1 = ["", "#FF595E", "#8AC926", "#1982C4", "#FFCA3A", "#6A4C93"];
    var board_1 = [];
    var visualY_1 = [];
    var visualX_1 = [];
    var scale_1 = [];
    var flash_1 = [];
    var selectedTile_1 = null;
    var isDragging_1 = false;
    var gameState_1 = "WAITING";
    var lastMoveTiles_1 = [];
    var FALL_SPEED_1 = 4.5;
    var SWAP_SPEED_1 = 2.5;
    var SWAP_DELAY_1 = 400;
    var currentCombo_1 = 0;
    var maxCombo_1 = 0;
    var lastRecord_1 = 0;
    var comboAlpha_1 = 0;
    var comboScale_1 = 1;
    // --- НОВІ ЕФЕКТИ ---
    var screenShake_1 = 0;
    var particles_1 = [];
    var lightnings_1 = [];
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
        var s = queue[index];
        executeSuper(s.r, s.c, s.type, function () {
            executeSuperQueue(queue, index + 1, onComplete);
        });
    }
    function executeSuper(r, c, type, onComplete) {
        // Ефект "заряду" перед вибухом
        flash_1[r][c] = 1;
        scale_1[r][c] = 1.3;
        setTimeout(function () {
            var affected = [];
            var cx = OFFSET_X_1 + c * CELL_SIZE_1 + CELL_SIZE_1 / 2;
            var cy = OFFSET_Y_1 + r * CELL_SIZE_1 + CELL_SIZE_1 / 2;
            var hexColor = colors_1[type % 10] || "#FFF";
            if (type > 10 && type < 20) {
                // БОМБА: Збираємо фігури навколо
                for (var i = -1; i <= 1; i++) {
                    for (var j = -1; j <= 1; j++) {
                        var nr = r + i, nc = c + j;
                        if (nr >= 0 && nr < ROWS_1 && nc >= 0 && nc < COLS_1)
                            affected.push({ r: nr, c: nc });
                    }
                }
                // --- ГЕНЕРУЄМО ВИБУХ (Тряска + Частинки) ---
                screenShake_1 = 15; // Сила тряски
                for (var p = 0; p < 40; p++) {
                    var angle = Math.random() * Math.PI * 2;
                    var speed = Math.random() * 8 + 2;
                    particles_1.push({
                        x: cx,
                        y: cy,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 100,
                        maxLife: 100,
                        color: Math.random() > 0.5 ? hexColor : "#FFF", // Іскри кольору бомби + білі
                        size: Math.random() * 6 + 3,
                    });
                }
            }
            else if (type > 20) {
                // КРИСТАЛ: Збираємо всі фігури цього кольору
                var color = type % 10;
                for (var i = 0; i < ROWS_1; i++) {
                    for (var j = 0; j < COLS_1; j++) {
                        if (board_1[i][j] > 0 && board_1[i][j] % 10 === color)
                            affected.push({ r: i, c: j });
                    }
                }
                // --- ГЕНЕРУЄМО СТРУМ (Блискавки) ---
                screenShake_1 = 8; // Легка вібрація
                for (var i = 0; i < affected.length; i++) {
                    var targetX = OFFSET_X_1 + affected[i].c * CELL_SIZE_1 + CELL_SIZE_1 / 2;
                    var targetY = OFFSET_Y_1 + affected[i].r * CELL_SIZE_1 + CELL_SIZE_1 / 2;
                    lightnings_1.push({
                        x1: cx,
                        y1: cy,
                        x2: targetX,
                        y2: targetY,
                        life: 100,
                        maxLife: 100, // Тривалість струму
                        color: hexColor,
                    });
                }
            }
            // Плавне зникнення фігур
            var step = 25;
            var interval = setInterval(function () {
                for (var i = 0; i < affected.length; i++) {
                    scale_1[affected[i].r][affected[i].c] = step / 25;
                }
                step--;
                if (step < 0) {
                    clearInterval(interval);
                    var chainReactions = [];
                    for (var i = 0; i < affected.length; i++) {
                        var p = affected[i];
                        var t = board_1[p.r][p.c];
                        if (t > 10 && (p.r !== r || p.c !== c)) {
                            chainReactions.push({ r: p.r, c: p.c, type: t });
                        }
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
            var cl = clusters[i];
            var type = board_1[cl[0].r][cl[0].c] % 10;
            var spawnPoint = null;
            for (var j = 0; j < cl.length; j++) {
                var p = cl[j];
                for (var k = 0; k < lastMoveTiles_1.length; k++) {
                    if (lastMoveTiles_1[k].r === p.r && lastMoveTiles_1[k].c === p.c) {
                        spawnPoint = p;
                        break;
                    }
                }
                if (spawnPoint)
                    break;
            }
            if (!spawnPoint && cl.length >= 4) {
                spawnPoint = cl[Math.floor(cl.length / 2)];
            }
            for (var j = 0; j < cl.length; j++) {
                var p = cl[j];
                var cellType = board_1[p.r][p.c];
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
                else {
                    toPop.push(p);
                }
            }
        }
        lastMoveTiles_1 = [];
        var step = 20;
        var interval = setInterval(function () {
            for (var i = 0; i < toPop.length; i++) {
                var p = toPop[i];
                var isDyingSuper = false;
                for (var s = 0; s < superToTrigger.length; s++) {
                    if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
                        isDyingSuper = true;
                }
                if (board_1[p.r][p.c] < 10 || isDyingSuper) {
                    scale_1[p.r][p.c] = step / 20;
                }
            }
            for (var r = 0; r < ROWS_1; r++) {
                for (var c = 0; c < COLS_1; c++) {
                    if (flash_1[r][c] > 0)
                        flash_1[r][c] -= 0.05;
                }
            }
            step--;
            if (step < 0) {
                clearInterval(interval);
                for (var i = 0; i < toPop.length; i++) {
                    var p = toPop[i];
                    var isDyingSuper = false;
                    for (var s = 0; s < superToTrigger.length; s++) {
                        if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
                            isDyingSuper = true;
                    }
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
            for (var r = 0; r < empty; r++) {
                board_1[r][c] = Math.floor(Math.random() * TYPES_1) + 1;
                visualY_1[r][c] = -CELL_SIZE_1 * (r + 1);
                visualX_1[r][c] = c * CELL_SIZE_1;
                scale_1[r][c] = 1;
            }
        }
    }
    function isSwapping(r, c) {
        if (gameState_1 !== "ANIMATING_SWAP")
            return false;
        for (var i = 0; i < lastMoveTiles_1.length; i++) {
            if (lastMoveTiles_1[i].r === r && lastMoveTiles_1[i].c === c)
                return true;
        }
        return false;
    }
    function update() {
        var moving = false;
        var currentSpeed = gameState_1 === "ANIMATING_SWAP" ? SWAP_SPEED_1 : FALL_SPEED_1;
        // Оновлення фігур
        for (var r = 0; r < ROWS_1; r++) {
            for (var c = 0; c < COLS_1; c++) {
                var targetY = r * CELL_SIZE_1;
                if (Math.abs(visualY_1[r][c] - targetY) > currentSpeed) {
                    visualY_1[r][c] +=
                        targetY - visualY_1[r][c] > 0 ? currentSpeed : -currentSpeed;
                    moving = true;
                }
                else {
                    visualY_1[r][c] = targetY;
                }
                var targetX = c * CELL_SIZE_1;
                if (Math.abs(visualX_1[r][c] - targetX) > currentSpeed) {
                    visualX_1[r][c] +=
                        targetX - visualX_1[r][c] > 0 ? currentSpeed : -currentSpeed;
                    moving = true;
                }
                else {
                    visualX_1[r][c] = targetX;
                }
                if (flash_1[r][c] > 0)
                    flash_1[r][c] -= 0.02;
                if (scale_1[r][c] > 1 &&
                    gameState_1 !== "ANIMATING_MATCHES" &&
                    flash_1[r][c] <= 0) {
                    scale_1[r][c] -= 0.02;
                }
            }
        }
        if (gameState_1 === "WAITING" && comboAlpha_1 > 0)
            comboAlpha_1 -= 0.02;
        if (comboScale_1 > 1)
            comboScale_1 -= 0.05;
        // Оновлення Тряски
        if (screenShake_1 > 0)
            screenShake_1 -= 1;
        // Оновлення Частинок (Вибух)
        for (var i = particles_1.length - 1; i >= 0; i--) {
            particles_1[i].x += particles_1[i].vx;
            particles_1[i].y += particles_1[i].vy;
            particles_1[i].life--;
            if (particles_1[i].life <= 0)
                particles_1.splice(i, 1);
        }
        // Оновлення Блискавок
        for (var i = lightnings_1.length - 1; i >= 0; i--) {
            lightnings_1[i].life--;
            if (lightnings_1[i].life <= 0)
                lightnings_1.splice(i, 1);
        }
        if (!moving && gameState_1 === "REFILLING") {
            handleMatches();
        }
    }
    function drawTile(r, c) {
        var type = board_1[r][c];
        if (type === 0)
            return;
        var s = scale_1[r][c];
        var x = OFFSET_X_1 + visualX_1[r][c] + (CELL_SIZE_1 * (1 - s)) / 2;
        var y = OFFSET_Y_1 + visualY_1[r][c] + (CELL_SIZE_1 * (1 - s)) / 2;
        var size = CELL_SIZE_1 * s;
        if (flash_1[r][c] > 0) {
            ctx_1.fillStyle = "rgba(255, 200, 50, ".concat(flash_1[r][c], ")");
            ctx_1.beginPath();
            ctx_1.arc(x + size / 2, y + size / 2, 40 * s, 0, Math.PI * 2);
            ctx_1.fill();
            ctx_1.strokeStyle = "rgba(255, 255, 255, ".concat(flash_1[r][c], ")");
            ctx_1.lineWidth = 2;
            for (var i = 0; i < 8; i++) {
                var angle = ((Math.PI * 2) / 8) * i;
                ctx_1.beginPath();
                ctx_1.moveTo(x + size / 2 + Math.cos(angle) * 15, y + size / 2 + Math.sin(angle) * 15);
                ctx_1.lineTo(x + size / 2 + Math.cos(angle) * 35, y + size / 2 + Math.sin(angle) * 35);
                ctx_1.stroke();
            }
        }
        ctx_1.fillStyle = colors_1[type % 10];
        if (type > 20) {
            ctx_1.beginPath();
            ctx_1.moveTo(x + size / 2, y + 2);
            ctx_1.lineTo(x + size - 4, y + size / 2);
            ctx_1.lineTo(x + size / 2, y + size - 2);
            ctx_1.lineTo(x + 4, y + size / 2);
            ctx_1.fill();
            ctx_1.fillStyle = "rgba(255,255,255,0.4)";
            ctx_1.beginPath();
            ctx_1.moveTo(x + size / 2, y + 2);
            ctx_1.lineTo(x + size / 2, y + size - 2);
            ctx_1.lineTo(x + 4, y + size / 2);
            ctx_1.fill();
        }
        else if (type > 10) {
            ctx_1.beginPath();
            ctx_1.moveTo(x + size / 2, y + 8);
            ctx_1.quadraticCurveTo(x + size / 2 + 10, y - 2, x + size / 2 + 12, y + 4);
            ctx_1.strokeStyle = "#C19A6B";
            ctx_1.lineWidth = 2 * s;
            ctx_1.stroke();
            ctx_1.fillStyle = "#FFD700";
            ctx_1.beginPath();
            ctx_1.arc(x + size / 2 + 12, y + 4, 3 * s, 0, Math.PI * 2);
            ctx_1.fill();
            ctx_1.fillStyle = "#888";
            ctx_1.fillRect(x + size / 2 - 6 * s, y + 4 * s, 12 * s, 6 * s);
            ctx_1.fillStyle = colors_1[type % 10];
            ctx_1.beginPath();
            ctx_1.arc(x + size / 2, y + size / 2 + 4 * s, size * 0.38, 0, Math.PI * 2);
            ctx_1.fill();
            ctx_1.fillStyle = "rgba(255,255,255,0.3)";
            ctx_1.beginPath();
            ctx_1.arc(x + size / 2 - 4 * s, y + size / 2 - 2 * s, size * 0.12, 0, Math.PI * 2);
            ctx_1.fill();
        }
        else {
            ctx_1.beginPath();
            if (typeof ctx_1.roundRect === "function") {
                ctx_1.roundRect(x + 4, y + 4, size - 8, size - 8, 8 * s);
            }
            else {
                ctx_1.rect(x + 4, y + 4, size - 8, size - 8);
            }
            ctx_1.fill();
        }
        if (selectedTile_1 && selectedTile_1.r === r && selectedTile_1.c === c) {
            ctx_1.strokeStyle = "white";
            ctx_1.lineWidth = 3;
            if (typeof ctx_1.roundRect === "function") {
                ctx_1.beginPath();
                ctx_1.roundRect(x + 1, y + 1, size - 2, size - 2, 10);
                ctx_1.stroke();
            }
            else {
                ctx_1.strokeRect(x + 1, y + 1, size - 2, size - 2);
            }
        }
    }
    function draw() {
        ctx_1.fillStyle = "#1E1E24";
        ctx_1.fillRect(0, 0, canvas_1.width, canvas_1.height);
        ctx_1.save();
        // Застосовуємо Тряску Екрану
        if (screenShake_1 > 0) {
            var dx = (Math.random() - 0.5) * screenShake_1;
            var dy = (Math.random() - 0.5) * screenShake_1;
            ctx_1.translate(dx, dy);
        }
        ctx_1.fillStyle = "#2B2B33";
        if (typeof ctx_1.roundRect === "function") {
            ctx_1.beginPath();
            ctx_1.roundRect(OFFSET_X_1 - 10, OFFSET_Y_1 - 10, COLS_1 * CELL_SIZE_1 + 20, ROWS_1 * CELL_SIZE_1 + 20, 15);
            ctx_1.fill();
        }
        else {
            ctx_1.fillRect(OFFSET_X_1 - 10, OFFSET_Y_1 - 10, COLS_1 * CELL_SIZE_1 + 20, ROWS_1 * CELL_SIZE_1 + 20);
        }
        for (var r = 0; r < ROWS_1; r++) {
            for (var c = 0; c < COLS_1; c++) {
                if (!isSwapping(r, c))
                    drawTile(r, c);
            }
        }
        for (var r = 0; r < ROWS_1; r++) {
            for (var c = 0; c < COLS_1; c++) {
                if (isSwapping(r, c))
                    drawTile(r, c);
            }
        }
        // МАЛЮЄМО СТРУМ (Блискавки)
        for (var i = 0; i < lightnings_1.length; i++) {
            var l = lightnings_1[i];
            ctx_1.globalAlpha = l.life / l.maxLife;
            ctx_1.strokeStyle = l.color;
            ctx_1.lineWidth = 4;
            ctx_1.beginPath();
            ctx_1.moveTo(l.x1, l.y1);
            var steps = 5;
            for (var s = 1; s <= steps; s++) {
                var t = s / steps;
                var lx = l.x1 + (l.x2 - l.x1) * t + (Math.random() - 0.5) * 30; // Електричне мерехтіння
                var ly = l.y1 + (l.y2 - l.y1) * t + (Math.random() - 0.5) * 30;
                if (s === steps) {
                    lx = l.x2;
                    ly = l.y2;
                }
                ctx_1.lineTo(lx, ly);
            }
            ctx_1.stroke();
            // Біла серцевина струму
            ctx_1.strokeStyle = "white";
            ctx_1.lineWidth = 2;
            ctx_1.stroke();
            ctx_1.globalAlpha = 1.0;
        }
        // МАЛЮЄМО ЧАСТИНКИ (Вибух)
        for (var i = 0; i < particles_1.length; i++) {
            var p = particles_1[i];
            ctx_1.globalAlpha = p.life / p.maxLife;
            ctx_1.fillStyle = p.color;
            ctx_1.beginPath();
            ctx_1.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx_1.fill();
        }
        ctx_1.globalAlpha = 1.0;
        ctx_1.restore(); // Кінець блоку тряски
        // --- МЕНЮ СТАТИСТИКИ ---
        var uiX = 520;
        ctx_1.fillStyle = "#888";
        ctx_1.font = "16px Arial";
        ctx_1.textAlign = "center";
        ctx_1.fillText("MAX COMBO", uiX + 60, 100);
        ctx_1.fillStyle = "#FFD700";
        ctx_1.font = "bold 56px Arial";
        ctx_1.fillText("x".concat(maxCombo_1), uiX + 60, 160);
        ctx_1.strokeStyle = "#444";
        ctx_1.beginPath();
        ctx_1.moveTo(uiX, 200);
        ctx_1.lineTo(uiX + 120, 200);
        ctx_1.stroke();
        ctx_1.fillStyle = "#CCC";
        ctx_1.font = "14px Arial";
        ctx_1.fillText("LAST RECORD: x".concat(lastRecord_1), uiX + 60, 230);
        ctx_1.beginPath();
        ctx_1.moveTo(uiX, 250);
        ctx_1.lineTo(uiX + 120, 250);
        ctx_1.stroke();
        if (currentCombo_1 > 1 && comboAlpha_1 > 0) {
            ctx_1.save();
            ctx_1.translate(uiX + 60, 320);
            ctx_1.scale(comboScale_1, comboScale_1);
            ctx_1.fillStyle = "rgba(255, 89, 94, ".concat(comboAlpha_1, ")");
            ctx_1.font = "bold 42px Arial";
            ctx_1.textAlign = "center";
            ctx_1.textBaseline = "middle";
            ctx_1.fillText("x".concat(currentCombo_1), 0, -15);
            ctx_1.font = "bold 20px Arial";
            ctx_1.fillText("COMBO!", 0, 15);
            ctx_1.restore();
        }
    }
    function swap(r1, c1, r2, c2) {
        gameState_1 = "ANIMATING_SWAP";
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
    canvas_1.addEventListener("mousedown", function (e) {
        if (gameState_1 !== "WAITING")
            return;
        var rect = canvas_1.getBoundingClientRect();
        var c = Math.floor((e.clientX - rect.left - OFFSET_X_1) / CELL_SIZE_1);
        var r = Math.floor((e.clientY - rect.top - OFFSET_Y_1) / CELL_SIZE_1);
        if (c < 0 || c >= COLS_1 || r < 0 || r >= ROWS_1)
            return;
        if (board_1[r][c] > 10) {
            gameState_1 = "ANIMATING_MATCHES";
            if (currentCombo_1 > 0)
                lastRecord_1 = currentCombo_1;
            currentCombo_1 = 0;
            executeSuper(r, c, board_1[r][c], function () {
                gameState_1 = "REFILLING";
                refillBoard();
            });
            board_1[r][c] = 0;
        }
        else {
            if (selectedTile_1) {
                if ((r !== selectedTile_1.r || c !== selectedTile_1.c) &&
                    Math.abs(r - selectedTile_1.r) + Math.abs(c - selectedTile_1.c) === 1) {
                    swap(selectedTile_1.r, selectedTile_1.c, r, c);
                    return;
                }
            }
            selectedTile_1 = { r: r, c: c };
            isDragging_1 = true;
        }
    });
    canvas_1.addEventListener("mousemove", function (e) {
        if (!isDragging_1 || !selectedTile_1 || gameState_1 !== "WAITING")
            return;
        var rect = canvas_1.getBoundingClientRect();
        var c = Math.floor((e.clientX - rect.left - OFFSET_X_1) / CELL_SIZE_1);
        var r = Math.floor((e.clientY - rect.top - OFFSET_Y_1) / CELL_SIZE_1);
        if (c < 0 || c >= COLS_1 || r < 0 || r >= ROWS_1)
            return;
        if ((r !== selectedTile_1.r || c !== selectedTile_1.c) &&
            Math.abs(r - selectedTile_1.r) + Math.abs(c - selectedTile_1.c) === 1) {
            swap(selectedTile_1.r, selectedTile_1.c, r, c);
            isDragging_1 = false;
        }
    });
    window.addEventListener("mouseup", function () { return (isDragging_1 = false); });
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    initBoard();
    gameLoop();
}

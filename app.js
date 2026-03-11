{
    // НАЛАШТУВАННЯ СТОРІНКИ ТА CANVAS
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "#1E1E24";
    var canvas_1 = document.getElementById("gameCanvas");
    var ctx_1 = canvas_1.getContext("2d");
    // Робимо Canvas абсолютним, щоб він розтягувався на весь видимий простір (viewport)
    canvas_1.style.position = "absolute";
    canvas_1.style.top = "0";
    canvas_1.style.left = "0";
    canvas_1.style.width = "100vw";
    canvas_1.style.height = "100vh";
    // Заборона браузеру реагувати на свайпи (щоб сторінка не перезавантажувалась при свайпі вниз)
    canvas_1.style.touchAction = "none";
    // КОНСТАНТИ ГРИ
    var ROWS_1 = 8; // Кількість рядків
    var COLS_1 = 8; // Кількість колонок
    var TYPES_1 = 5; // Кількість звичайних кольорів (фігур)
    // Масив кольорів (індекс 0 порожній, кольори йдуть з 1 по 5)
    var COLORS_1 = ["", "#FF595E", "#8AC926", "#1982C4", "#FFCA3A", "#6A4C93"];
    // ДИНАМІЧНІ ЗМІННІ (Для адаптивності)
    var CELL_SIZE_1 = 70; // Поточний розмір однієї клітинки (змінюється при ресайзі)
    var OFFSET_X_1 = 40; // Зсув ігрового поля зліва
    var OFFSET_Y_1 = 40; // Зсув ігрового поля зверху
    var UI_X_1 = 780; // X-координата для відмальовки тексту (рахунок, комбо)
    var UI_Y_1 = 40; // Y-координата для відмальовки тексту
    // Функція для перерахунку розмірів під поточний екран (мобільний або ПК)
    function resizeCanvas() {
        // Фізичний розмір полотна = розмір вікна
        canvas_1.width = window.innerWidth;
        canvas_1.height = window.innerHeight;
        if (canvas_1.height > canvas_1.width) {
            // ПОРТРЕТНА ОРІЄНТАЦІЯ (Телефони)
            // Ширина поля займає 85% екрану. Ділимо на кількість колонок.
            CELL_SIZE_1 = Math.floor((canvas_1.width * 0.85) / COLS_1);
            OFFSET_X_1 = (canvas_1.width - CELL_SIZE_1 * COLS_1) / 2; // Центруємо по горизонталі
            // Поле знаходиться внизу, меню - зверху
            OFFSET_Y_1 = canvas_1.height - CELL_SIZE_1 * ROWS_1 - canvas_1.height * 0.05;
            UI_X_1 = canvas_1.width / 2;
            UI_Y_1 = OFFSET_Y_1 / 4;
        }
        else {
            // ЛАНДШАФТНА ОРІЄНТАЦІЯ (ПК / Планшети)
            // Висота поля займає 85% екрану.
            CELL_SIZE_1 = Math.floor((canvas_1.height * 0.85) / ROWS_1);
            OFFSET_X_1 = canvas_1.width * 0.05; // Поле притиснуте ліворуч
            OFFSET_Y_1 = (canvas_1.height - CELL_SIZE_1 * ROWS_1) / 2; // Центрую по вертикалі
            // Меню знаходиться праворуч від поля
            var rightEdge = OFFSET_X_1 + CELL_SIZE_1 * COLS_1;
            UI_X_1 = rightEdge + (canvas_1.width - rightEdge) / 2;
            UI_Y_1 = canvas_1.height / 3;
        }
    }
    // Перерахунок розмірів при старті та при зміні розміру вікна
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    // СИСТЕМА АУДІО (Синтезатор звуків без mp3 файлів)
    var AudioManager = /** @class */ (function () {
        function AudioManager() {
            this.ctx = null;
        }
        // Ініціалізація аудіо (повинна викликатися після першого кліку користувача )
        AudioManager.prototype.init = function () {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx.state === "suspended")
                this.ctx.resume();
        };
        // Генерація різних звуків за допомогою осциляторів
        AudioManager.prototype.play = function (type) {
            if (!this.ctx)
                return;
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain(); // Контролер гучності
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            var now = this.ctx.currentTime;
            // Налаштування частоти і гучності для кожного ефекту
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
        };
        return AudioManager;
    }());
    var audio_1 = new AudioManager();
    // ООП КЛАСИ ІГРОВИХ СУТНОСТЕЙ
    // Клас, що описує один ігровий камінець
    var Tile_1 = /** @class */ (function () {
        function Tile(r, c, type, startVisualY) {
            this.scale = 1; // Масштаб (для анімації зменшення/збільшення)
            this.flash = 0; // Ефект світіння перед вибухом
            this.r = r;
            this.c = c;
            this.type = type;
            this.visualX = c * CELL_SIZE_1;
            // Якщо задано startVisualY, камінь "падає" з цієї висоти, інакше з'являється одразу на своєму місці
            this.visualY = startVisualY !== undefined ? startVisualY : r * CELL_SIZE_1;
        }
        // Метод оновлення фізики камінця (викликається кожен кадр)
        Tile.prototype.update = function (speed) {
            var moving = false;
            var targetX = this.c * CELL_SIZE_1; // Де камінь МАЄ бути по X
            var targetY = this.r * CELL_SIZE_1; // Де камінь МАЄ бути по Y
            // Плавний рух до цілі по осі X
            if (Math.abs(this.visualX - targetX) > speed) {
                this.visualX += targetX - this.visualX > 0 ? speed : -speed;
                moving = true;
            }
            else {
                this.visualX = targetX; // Якщо дійшли до цілі - фіксуємо
            }
            // Плавний рух до цілі по осі Y (падіння)
            if (Math.abs(this.visualY - targetY) > speed) {
                this.visualY += targetY - this.visualY > 0 ? speed : -speed;
                moving = true;
            }
            else {
                this.visualY = targetY;
            }
            // Загасання ефекту світіння та зменшення масштабу (це для бомби після вибуху)
            if (this.flash > 0)
                this.flash -= 0.02;
            if (this.scale > 1 && this.flash <= 0)
                this.scale -= 0.02;
            return moving; // Повертає true, якщо камінь все ще в русі
        };
        // Метод малювання камінця на Canvas
        Tile.prototype.draw = function (ctx, isSelected) {
            var s = this.scale;
            // Центруєм камінець, якщо його масштаб змінився (щоб він зменшувався в центр, а не в кут)
            var x = OFFSET_X_1 + this.visualX + (CELL_SIZE_1 * (1 - s)) / 2;
            var y = OFFSET_Y_1 + this.visualY + (CELL_SIZE_1 * (1 - s)) / 2;
            var size = CELL_SIZE_1 * s;
            var m = size / 70; // Множник для збереження пропорцій іконок при різному CELL_SIZE
            // 1.Відмальовка ефекту світіння (заряду), якщо він є
            if (this.flash > 0) {
                ctx.fillStyle = "rgba(255, 200, 50, ".concat(this.flash, ")");
                ctx.beginPath();
                ctx.arc(x + size / 2, y + size / 2, 50 * m, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "rgba(255, 255, 255, ".concat(this.flash, ")");
                ctx.lineWidth = 3 * m;
                // Малюю промені ("зірочку")
                for (var i = 0; i < 8; i++) {
                    var angle = ((Math.PI * 2) / 8) * i;
                    ctx.beginPath();
                    ctx.moveTo(x + size / 2 + Math.cos(angle) * 20 * m, y + size / 2 + Math.sin(angle) * 20 * m);
                    ctx.lineTo(x + size / 2 + Math.cos(angle) * 45 * m, y + size / 2 + Math.sin(angle) * 45 * m);
                    ctx.stroke();
                }
            }
            // 2. Встановлюємо основний колір фігури (% 10 відкидає десятки, залишаючи базовий колір)
            ctx.fillStyle = COLORS_1[this.type % 10];
            // 3. Малюємо саму фігуру залежно від її типу
            if (this.type > 20) {
                // КРИСТАЛ (Блискавка) - малюємо ромб
                ctx.beginPath();
                ctx.moveTo(x + size / 2, y + 4 * m);
                ctx.lineTo(x + size - 6 * m, y + size / 2);
                ctx.lineTo(x + size / 2, y + size - 4 * m);
                ctx.lineTo(x + 6 * m, y + size / 2);
                ctx.fill();
                // Відблиск на кристалі
                ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.beginPath();
                ctx.moveTo(x + size / 2, y + 4 * m);
                ctx.lineTo(x + size / 2, y + size - 4 * m);
                ctx.lineTo(x + 6 * m, y + size / 2);
                ctx.fill();
            }
            else if (this.type > 10) {
                // БОМБА - малюю круглу бомбочку з гнотом
                // Гніт
                ctx.beginPath();
                ctx.moveTo(x + size / 2, y + 10 * m);
                ctx.quadraticCurveTo(x + size / 2 + 15 * m, y - 4 * m, x + size / 2 + 18 * m, y + 6 * m);
                ctx.strokeStyle = "#C19A6B";
                ctx.lineWidth = 3 * m;
                ctx.stroke();
                // Вогник
                ctx.fillStyle = "#FFD700";
                ctx.beginPath();
                ctx.arc(x + size / 2 + 18 * m, y + 6 * m, 4 * m, 0, Math.PI * 2);
                ctx.fill();
                // Металева кришка
                ctx.fillStyle = "#888";
                ctx.fillRect(x + size / 2 - 8 * m, y + 6 * m, 16 * m, 8 * m);
                // Тіло бомби
                ctx.fillStyle = COLORS_1[this.type % 10];
                ctx.beginPath();
                ctx.arc(x + size / 2, y + size / 2 + 5 * m, size * 0.38, 0, Math.PI * 2);
                ctx.fill();
                // Відблиск
                ctx.fillStyle = "rgba(255,255,255,0.3)";
                ctx.beginPath();
                ctx.arc(x + size / 2 - 6 * m, y + size / 2 - 3 * m, size * 0.12, 0, Math.PI * 2);
                ctx.fill();
            }
            else {
                // ЗВИЧАЙНИЙ КАМІНЕЦЬ - квадрат із закругленими кутами
                ctx.beginPath();
                if (typeof ctx.roundRect === "function") {
                    ctx.roundRect(x + 5 * m, y + 5 * m, size - 10 * m, size - 10 * m, 12 * m);
                }
                else {
                    ctx.rect(x + 5 * m, y + 5 * m, size - 10 * m, size - 10 * m); // Фолбек для старих браузерів
                }
                ctx.fill();
            }
            // 4. Малюємо білу рамку, якщо камінець вибраний гравцем
            if (isSelected) {
                ctx.strokeStyle = "white";
                ctx.lineWidth = 4 * m;
                if (typeof ctx.roundRect === "function") {
                    ctx.beginPath();
                    ctx.roundRect(x + 1 * m, y + 1 * m, size - 2 * m, size - 2 * m, 14 * m);
                    ctx.stroke();
                }
                else {
                    ctx.strokeRect(x + 1 * m, y + 1 * m, size - 2 * m, size - 2 * m);
                }
            }
        };
        return Tile;
    }());
    // Клас для ефектів вибуху (маленькі кружечки, що розлітаються)
    var Particle_1 = /** @class */ (function () {
        function Particle(x, y, color) {
            this.x = x;
            this.y = y;
            // Задаємо випадковий напрямок (кут) і швидкість розльоту
            var angle = Math.random() * Math.PI * 2;
            var speed = (Math.random() * 0.15 + 0.05) * CELL_SIZE_1;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.maxLife = this.life = 30; // Живе 30 кадрів (пів секунди)
            this.color = Math.random() > 0.5 ? color : "#FFF"; // 50/50 кольорова або біла іскра
            this.size = (Math.random() * 0.1 + 0.05) * CELL_SIZE_1;
        }
        Particle.prototype.update = function () {
            this.x += this.vx;
            this.y += this.vy;
            this.life--; // Старіє з кожним кадром
        };
        Particle.prototype.draw = function (ctx) {
            ctx.globalAlpha = this.life / this.maxLife; // Чим менше життя, тим прозоріша
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0; // Повертаємо прозорість в норму для інших малювань
        };
        return Particle;
    }());
    // Клас для ефекту струму (від кристалів)
    var Lightning_1 = /** @class */ (function () {
        function Lightning(x1, y1, x2, y2, color) {
            this.x1 = x1;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;
            this.maxLife = this.life = 25;
            this.color = color;
        }
        Lightning.prototype.update = function () {
            this.life--;
        };
        Lightning.prototype.draw = function (ctx) {
            ctx.globalAlpha = this.life / this.maxLife;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = CELL_SIZE_1 * 0.08;
            ctx.beginPath();
            ctx.moveTo(this.x1, this.y1);
            // Малюємо ламану лінію з 5 кроків
            var steps = 5;
            for (var s = 1; s <= steps; s++) {
                var t = s / steps;
                // Знаходимо проміжну точку і додаємо трохи хаосу (random), щоб виглядало як справжній струм
                var lx = this.x1 +
                    (this.x2 - this.x1) * t +
                    (Math.random() - 0.5) * CELL_SIZE_1 * 0.5;
                var ly = this.y1 +
                    (this.y2 - this.y1) * t +
                    (Math.random() - 0.5) * CELL_SIZE_1 * 0.5;
                // Остання точка має точно влучити в ціль
                if (s === steps) {
                    lx = this.x2;
                    ly = this.y2;
                }
                ctx.lineTo(lx, ly);
            }
            ctx.stroke();
            // Малюємо тонку білу серцевину струму поверх кольорової
            ctx.strokeStyle = "white";
            ctx.lineWidth = CELL_SIZE_1 * 0.03;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        };
        return Lightning;
    }());
    // ГОЛОВНИЙ КЛАС ГРИ
    var Game = /** @class */ (function () {
        function Game() {
            // State Machine (Кінцевий автомат) - визначає, що гра робить прямо зараз
            this.state = "WAITING";
            // Змінні для керування (Drag & Drop)
            this.selected = null; // Виділений камінь
            this.dragStart = null; // Звідки почали тягнути
            this.isDragging = false; // Чи тримає гравець палець/мишку
            this.lastMove = []; // Зберігає останній хід (для утворення супер-елементів)
            // Статистика
            this.currentCombo = 0;
            this.maxCombo = 0;
            this.lastRecord = 0;
            this.comboAlpha = 0; // Для анімації напису "COMBO!"
            this.comboScale = 1;
            this.screenShake = 0; // Сила тряски екрану при вибухах
            // Масиви для візуальних ефектів
            this.particles = [];
            this.lightnings = [];
            this.SWAP_DELAY = 300; // Скільки мілісекунд триває анімація обміну камінців
            // Створюємо порожню сітку ROWS x COLS
            this.grid = [];
            for (var r = 0; r < ROWS_1; r++) {
                this.grid[r] = [];
                for (var c = 0; c < COLS_1; c++) {
                    this.grid[r][c] = null;
                }
            }
            this.initBoard(); // Заповнюємо сітку
        }
        // Заповнення поля так, щоб на старті не було готових ліній
        Game.prototype.initBoard = function () {
            var _a, _b, _c, _d;
            for (var r = 0; r < ROWS_1; r++) {
                for (var c = 0; c < COLS_1; c++) {
                    var type = void 0;
                    do {
                        type = Math.floor(Math.random() * TYPES_1) + 1; // Випадковий колір від 1 до 5
                    } while (
                    // Перевіряємо, чи не створюємо ми лінію з 3-х однакових по горизонталі
                    (c >= 2 &&
                        ((_a = this.grid[r][c - 1]) === null || _a === void 0 ? void 0 : _a.type) % 10 === type &&
                        ((_b = this.grid[r][c - 2]) === null || _b === void 0 ? void 0 : _b.type) % 10 === type) ||
                        // Або по вертикалі
                        (r >= 2 &&
                            ((_c = this.grid[r - 1][c]) === null || _c === void 0 ? void 0 : _c.type) % 10 === type &&
                            ((_d = this.grid[r - 2][c]) === null || _d === void 0 ? void 0 : _d.type) % 10 === type));
                    // Створюємо новий об'єкт Tile і кладемо його в масив
                    this.grid[r][c] = new Tile_1(r, c, type);
                }
            }
        };
        // Конвертує пікселі екрана (мишки) в індекси масиву гри (ряд і колонка)
        Game.prototype.getLogicalPos = function (clientX, clientY) {
            return {
                c: Math.floor((clientX - OFFSET_X_1) / CELL_SIZE_1),
                r: Math.floor((clientY - OFFSET_Y_1) / CELL_SIZE_1),
            };
        };
        // Обробка ПОЧАТКУ дотику (mousedown / touchstart)
        Game.prototype.handleInputStart = function (clientX, clientY) {
            audio_1.init(); // Ініціалізуємо аудіо
            if (this.state !== "WAITING")
                return; // Блокуємо кліки, якщо гра в процесі анімації
            var pos = this.getLogicalPos(clientX, clientY);
            if (pos.c < 0 || pos.c >= COLS_1 || pos.r < 0 || pos.r >= ROWS_1)
                return; // Клік поза полем
            // Логіка "Подвійного кліку": якщо вже є виділений камінь, і ми клікнули на сусідній
            if (this.selected) {
                if ((pos.r !== this.selected.r || pos.c !== this.selected.c) &&
                    Math.abs(pos.r - this.selected.r) +
                        Math.abs(pos.c - this.selected.c) ===
                        1) {
                    this.swap(this.selected.r, this.selected.c, pos.r, pos.c);
                    return;
                }
            }
            // Запам'ятовуємо клітинку для драгу (поки не знаємо, гравець клікне чи потягне)
            this.dragStart = { r: pos.r, c: pos.c };
            this.selected = { r: pos.r, c: pos.c };
            this.isDragging = true;
        };
        // Обробка РУХУ миші/пальця (mousemove / touchmove)
        Game.prototype.handleInputMove = function (clientX, clientY) {
            if (!this.isDragging || !this.dragStart || this.state !== "WAITING")
                return;
            var pos = this.getLogicalPos(clientX, clientY);
            if (pos.c < 0 || pos.c >= COLS_1 || pos.r < 0 || pos.r >= ROWS_1)
                return;
            // Якщо гравець перетягнув курсор на сусідню клітинку (відстань = 1)
            if ((pos.r !== this.dragStart.r || pos.c !== this.dragStart.c) &&
                Math.abs(pos.r - this.dragStart.r) +
                    Math.abs(pos.c - this.dragStart.c) ===
                    1) {
                // Виконуємо обмін (навіть якщо це бомба, ми її просто тягнемо, а не підриваємо)
                this.swap(this.dragStart.r, this.dragStart.c, pos.r, pos.c);
                this.isDragging = false;
                this.dragStart = null;
            }
        };
        // Обробка ЗАКІНЧЕННЯ дотику (mouseup / touchend)
        Game.prototype.handleInputEnd = function (clientX, clientY) {
            var _this = this;
            if (!this.isDragging || !this.dragStart || this.state !== "WAITING") {
                this.isDragging = false;
                return;
            }
            var pos = this.getLogicalPos(clientX, clientY);
            // Якщо гравець ВІДПУСТИВ курсор на тій самій клітинці, де й натиснув (Простий клік)
            if (pos.r === this.dragStart.r && pos.c === this.dragStart.c) {
                var tile = this.grid[pos.r][pos.c];
                // Якщо це була супер-фігура (бомба чи кристал) - активуємо її вибух!
                if (tile && tile.type > 10) {
                    this.state = "ANIMATING_MATCHES";
                    if (this.currentCombo > 0)
                        this.lastRecord = this.currentCombo;
                    this.currentCombo = 0;
                    this.executeSuper(pos.r, pos.c, tile.type, function () {
                        _this.state = "REFILLING";
                        _this.refillBoard();
                    });
                    this.grid[pos.r][pos.c] = null; // Видаляємо саму бомбу
                    this.selected = null;
                }
            }
            this.isDragging = false;
            this.dragStart = null;
        };
        // Метод обміну двох камінців місцями
        Game.prototype.swap = function (r1, c1, r2, c2) {
            var _this = this;
            this.state = "ANIMATING_SWAP";
            audio_1.play("swap");
            if (this.currentCombo > 0)
                this.lastRecord = this.currentCombo;
            this.currentCombo = 0;
            this.selected = null;
            // Міняємо об'єкти в масиві
            var t1 = this.grid[r1][c1];
            var t2 = this.grid[r2][c2];
            t1.r = r2;
            t1.c = c2;
            t2.r = r1;
            t2.c = c1;
            this.grid[r1][c1] = t2;
            this.grid[r2][c2] = t1;
            // Запам'ятовуємо цей хід (щоб знати, де створювати бомбу, якщо вийде лінія з 4+)
            this.lastMove = [
                { r: r1, c: c1 },
                { r: r2, c: c2 },
            ];
            // Чекаємо завершення анімації (SWAP_DELAY) перед перевіркою збігів
            setTimeout(function () {
                if (_this.getClusters().length === 0) {
                    // Якщо збігів немає - повертаємо камінці назад (невірний хід)
                    t1.r = r1;
                    t1.c = c1;
                    t2.r = r2;
                    t2.c = c2;
                    _this.grid[r1][c1] = t1;
                    _this.grid[r2][c2] = t2;
                    setTimeout(function () {
                        _this.state = "WAITING";
                        _this.lastMove = [];
                    }, _this.SWAP_DELAY);
                }
                else {
                    // Якщо збіги є - починаємо їх знищувати
                    _this.handleMatches();
                }
            }, this.SWAP_DELAY);
        };
        // Головний алгоритм пошуку збігів (ліній по 3 і більше)
        Game.prototype.getClusters = function () {
            var _a, _b, _c, _d, _e, _f;
            // 1. Створюю матрицю з false
            var matches = [];
            for (var r = 0; r < ROWS_1; r++) {
                matches[r] = [];
                for (var c = 0; c < COLS_1; c++)
                    matches[r][c] = false;
            }
            // 2. Відмічаю як true всі елементи, що утворюють лінії по 3
            for (var r = 0; r < ROWS_1; r++) {
                for (var c = 0; c < COLS_1; c++) {
                    var t = (_a = this.grid[r][c]) === null || _a === void 0 ? void 0 : _a.type;
                    if (!t)
                        continue;
                    var color = t % 10; // Шукаю за базовим кольором (бомби теж вважаються кольором)
                    // Горизонтально
                    if (c < COLS_1 - 2 &&
                        ((_b = this.grid[r][c + 1]) === null || _b === void 0 ? void 0 : _b.type) % 10 === color &&
                        ((_c = this.grid[r][c + 2]) === null || _c === void 0 ? void 0 : _c.type) % 10 === color) {
                        matches[r][c] = true;
                        matches[r][c + 1] = true;
                        matches[r][c + 2] = true;
                    }
                    // Вертикально
                    if (r < ROWS_1 - 2 &&
                        ((_d = this.grid[r + 1][c]) === null || _d === void 0 ? void 0 : _d.type) % 10 === color &&
                        ((_e = this.grid[r + 2][c]) === null || _e === void 0 ? void 0 : _e.type) % 10 === color) {
                        matches[r][c] = true;
                        matches[r + 1][c] = true;
                        matches[r + 2][c] = true;
                    }
                }
            }
            // 3. Збираю відмічені елементи в кластери (групи) за допомогою пошуку в ширину
            var visited = [];
            for (var r = 0; r < ROWS_1; r++) {
                visited[r] = [];
                for (var c = 0; c < COLS_1; c++)
                    visited[r][c] = false;
            }
            var clusters = [];
            for (var r = 0; r < ROWS_1; r++) {
                for (var c = 0; c < COLS_1; c++) {
                    if (matches[r][c] && !visited[r][c]) {
                        var cluster = [];
                        var queue = [{ r: r, c: c }];
                        visited[r][c] = true;
                        var type = this.grid[r][c].type % 10;
                        while (queue.length > 0) {
                            var curr = queue.shift();
                            cluster.push(curr);
                            var dirs = [
                                [0, 1],
                                [0, -1],
                                [1, 0],
                                [-1, 0],
                            ]; // Вгору, вниз, вліво, вправо
                            for (var d = 0; d < dirs.length; d++) {
                                var nr = curr.r + dirs[d][0], nc = curr.c + dirs[d][1];
                                if (nr >= 0 &&
                                    nr < ROWS_1 &&
                                    nc >= 0 &&
                                    nc < COLS_1 &&
                                    matches[nr][nc] &&
                                    !visited[nr][nc] &&
                                    ((_f = this.grid[nr][nc]) === null || _f === void 0 ? void 0 : _f.type) % 10 === type) {
                                    visited[nr][nc] = true;
                                    queue.push({ r: nr, c: nc });
                                }
                            }
                        }
                        clusters.push(cluster);
                    }
                }
            }
            return clusters; // Повертаю список знайдених груп
        };
        // Допоміжна функція для ланцюгової реакції вибухів (щоб бомби вибухали по черзі)
        Game.prototype.executeSuperQueue = function (queue, index, onComplete) {
            var _this = this;
            if (index >= queue.length) {
                onComplete();
                return;
            }
            this.executeSuper(queue[index].r, queue[index].c, queue[index].type, function () {
                return _this.executeSuperQueue(queue, index + 1, onComplete);
            });
        };
        // Виконання логіки супер-елементів (бомб та кристалів)
        Game.prototype.executeSuper = function (r, c, type, onComplete) {
            var _this = this;
            var centerTile = this.grid[r][c];
            if (centerTile) {
                centerTile.flash = 1; // Заряджаємо бомбу перед вибухом
                centerTile.scale = 1.3;
            }
            setTimeout(function () {
                var affected = [];
                var cx = OFFSET_X_1 + c * CELL_SIZE_1 + CELL_SIZE_1 / 2, cy = OFFSET_Y_1 + r * CELL_SIZE_1 + CELL_SIZE_1 / 2;
                var hexColor = COLORS_1[type % 10] || "#FFF";
                if (type > 10 && type < 20) {
                    // БОМБА: Збирає всі фігури навколо (3х3)
                    audio_1.play("bomb");
                    for (var i = -1; i <= 1; i++) {
                        for (var j = -1; j <= 1; j++) {
                            var nr = r + i, nc = c + j;
                            if (nr >= 0 &&
                                nr < ROWS_1 &&
                                nc >= 0 &&
                                nc < COLS_1 &&
                                _this.grid[nr][nc])
                                affected.push({ r: nr, c: nc });
                        }
                    }
                    _this.screenShake = 20; // Тряска екрану
                    for (var p = 0; p < 40; p++)
                        _this.particles.push(new Particle_1(cx, cy, hexColor)); // Іскри
                }
                else if (type > 20) {
                    // КРИСТАЛ: Збирає всі фігури такого ж кольору по всій карті
                    audio_1.play("crystal");
                    var color = type % 10;
                    for (var i = 0; i < ROWS_1; i++) {
                        for (var j = 0; j < COLS_1; j++) {
                            if (_this.grid[i][j] && _this.grid[i][j].type % 10 === color)
                                affected.push({ r: i, c: j });
                        }
                    }
                    _this.screenShake = 10;
                    for (var i = 0; i < affected.length; i++) {
                        _this.lightnings.push(new Lightning_1(cx, cy, OFFSET_X_1 + affected[i].c * CELL_SIZE_1 + CELL_SIZE_1 / 2, OFFSET_Y_1 + affected[i].r * CELL_SIZE_1 + CELL_SIZE_1 / 2, hexColor));
                    }
                }
                // Анімація зникнення вражених фігур
                var step = 25;
                var interval = setInterval(function () {
                    for (var i = 0; i < affected.length; i++) {
                        var t = _this.grid[affected[i].r][affected[i].c];
                        if (t)
                            t.scale = step / 25; // Зменшуємо масштаб
                    }
                    step--;
                    if (step < 0) {
                        clearInterval(interval);
                        var chainReactions = [];
                        // Перевірка, чи не зачепило вибухом іншу бомбу (ланцюгова реакція)
                        for (var i = 0; i < affected.length; i++) {
                            var p = affected[i], tile = _this.grid[p.r][p.c];
                            if (tile) {
                                if (tile.type > 10 && (p.r !== r || p.c !== c))
                                    chainReactions.push({ r: p.r, c: p.c, type: tile.type });
                                _this.grid[p.r][p.c] = null; // Видаляємо з масиву
                            }
                        }
                        _this.grid[r][c] = null; // Видаляємо саму центральну бомбу
                        // Запускаємо наступні вибухи, якщо вони є, а потім onComplete
                        _this.executeSuperQueue(chainReactions, 0, onComplete);
                    }
                }, 20);
            }, 400); // Затримка "заряду" перед вибухом
        };
        // Обробка знищення ліній
        Game.prototype.handleMatches = function () {
            var _this = this;
            var clusters = this.getClusters();
            if (clusters.length === 0) {
                this.state = "WAITING"; // Збігів більше немає - передаємо керування гравцю
                return;
            }
            this.state = "ANIMATING_MATCHES";
            // Логіка комбо (кількість знищень за один хід)
            this.currentCombo += clusters.length;
            if (this.currentCombo > this.maxCombo)
                this.maxCombo = this.currentCombo;
            if (this.currentCombo > 1) {
                this.comboAlpha = 1.0;
                this.comboScale = 1.5;
            }
            var toPop = []; // Список для видалення
            var superToTrigger = []; // Знайдені бомби в лініях
            for (var i = 0; i < clusters.length; i++) {
                var cl = clusters[i], type = this.grid[cl[0].r][cl[0].c].type % 10;
                // Визначення місця, де з'явиться нова супер-фігура (якщо лінія >= 4)
                var spawnPoint = null;
                for (var j = 0; j < cl.length; j++) {
                    for (var k = 0; k < this.lastMove.length; k++) {
                        // Якщо гравець сам пересунув сюди камінь - тут і з'явиться бомба
                        if (this.lastMove[k].r === cl[j].r &&
                            this.lastMove[k].c === cl[j].c)
                            spawnPoint = cl[j];
                    }
                }
                // Якщо гравець цього не робив (камені впали самі) - бомба з'явиться по центру лінії
                if (!spawnPoint && cl.length >= 4)
                    spawnPoint = cl[Math.floor(cl.length / 2)];
                for (var j = 0; j < cl.length; j++) {
                    var p = cl[j], tile = this.grid[p.r][p.c];
                    if (tile.type > 10) {
                        // Якщо в лінію попала готова бомба - вона має вибухнути
                        superToTrigger.push({ r: p.r, c: p.c, type: tile.type });
                        toPop.push(p);
                    }
                    else if (spawnPoint &&
                        p.r === spawnPoint.r &&
                        p.c === spawnPoint.c &&
                        cl.length >= 4) {
                        // Створюємо нову бомбу (4 камені = +10, 5 каменів = +20 (кристал))
                        this.grid[p.r][p.c] = new Tile_1(p.r, p.c, type + (cl.length >= 5 ? 20 : 10));
                        spawnPoint = null;
                    }
                    else {
                        toPop.push(p); // Звичайний камінь йде на видалення
                    }
                }
            }
            this.lastMove = [];
            // Анімація зменшення камінців перед зникненням
            var step = 20;
            var interval = setInterval(function () {
                for (var i = 0; i < toPop.length; i++) {
                    var p = toPop[i], isDyingSuper = false;
                    for (var s = 0; s < superToTrigger.length; s++)
                        if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
                            isDyingSuper = true;
                    var tile = _this.grid[p.r][p.c];
                    if (tile && (tile.type < 10 || isDyingSuper))
                        tile.scale = step / 20;
                }
                step--;
                if (step < 0) {
                    clearInterval(interval);
                    audio_1.play("match");
                    // Остаточно видаляю об'єкти з сітки
                    for (var i = 0; i < toPop.length; i++) {
                        var p = toPop[i], isDyingSuper = false;
                        for (var s = 0; s < superToTrigger.length; s++)
                            if (superToTrigger[s].r === p.r && superToTrigger[s].c === p.c)
                                isDyingSuper = true;
                        var tile = _this.grid[p.r][p.c];
                        if (tile && (tile.type < 10 || isDyingSuper))
                            _this.grid[p.r][p.c] = null;
                    }
                    // Якщо в лінії були бомби - підриваємо їх, потім заповнюємо поле
                    _this.executeSuperQueue(superToTrigger, 0, function () {
                        _this.state = "REFILLING";
                        _this.refillBoard();
                    });
                }
            }, 20);
        };
        // Заповнення порожніх місць після зникнення
        Game.prototype.refillBoard = function () {
            for (var c = 0; c < COLS_1; c++) {
                var empty = 0; // Скільки порожніх клітинок знизу ми знайшли
                // 1. Проходимо колонку знизу вгору
                for (var r = ROWS_1 - 1; r >= 0; r--) {
                    if (this.grid[r][c] === null) {
                        empty++; // Знайшли дірку
                    }
                    else if (empty > 0) {
                        // Знайшли камінь над діркою - "скидаємо" його вниз на кількість дірок
                        var tile = this.grid[r][c];
                        tile.r = r + empty; // Оновлюємо логічну координату
                        this.grid[r + empty][c] = tile;
                        this.grid[r][c] = null; // Звільняємо старе місце
                    }
                }
                // 2. Створюємо нові камінці на самому верху (щоб заповнити дірки)
                var spawnedInThisCol = 1;
                for (var r = empty - 1; r >= 0; r--) {
                    var type = Math.floor(Math.random() * TYPES_1) + 1;
                    // Передаємо від'ємний visualY, щоб камінь намалювався високо над полем і красиво впав вниз
                    this.grid[r][c] = new Tile_1(r, c, type, -CELL_SIZE_1 * spawnedInThisCol);
                    spawnedInThisCol++;
                }
            }
        };
        // Фізичний апдейт (викликається кожен кадр)
        Game.prototype.update = function () {
            var _a;
            // Швидкість руху залежить від стану гри (свап повільніше, падіння швидше)
            var speed = this.state === "ANIMATING_SWAP" ? CELL_SIZE_1 * 0.08 : CELL_SIZE_1 * 0.1;
            var moving = false;
            // Оновлюємо кожен камінець. Якщо хоч один ще рухається - moving = true
            for (var r = 0; r < ROWS_1; r++) {
                for (var c = 0; c < COLS_1; c++) {
                    if ((_a = this.grid[r][c]) === null || _a === void 0 ? void 0 : _a.update(speed))
                        moving = true;
                }
            }
            // Оновлюємо UI ефекти
            if (this.state === "WAITING" && this.comboAlpha > 0)
                this.comboAlpha -= 0.02;
            if (this.comboScale > 1)
                this.comboScale -= 0.05;
            if (this.screenShake > 0)
                this.screenShake -= 1;
            // Оновлюємо частинки та блискавки (і видаляємо їх, коли life <= 0)
            for (var i = this.particles.length - 1; i >= 0; i--) {
                this.particles[i].update();
                if (this.particles[i].life <= 0)
                    this.particles.splice(i, 1);
            }
            for (var i = this.lightnings.length - 1; i >= 0; i--) {
                this.lightnings[i].update();
                if (this.lightnings[i].life <= 0)
                    this.lightnings.splice(i, 1);
            }
            // Коли всі камінці долетіли вниз, шукаємо нові збіги
            if (!moving && this.state === "REFILLING")
                this.handleMatches();
        };
        // Малювання всієї гри (викликається кожен кадр)
        Game.prototype.draw = function (ctx) {
            var _a, _b;
            // Очищення екрану (фон)
            ctx.fillStyle = "#1E1E24";
            ctx.fillRect(0, 0, canvas_1.width, canvas_1.height);
            ctx.save();
            // Ефект тряски (зсуваємо весь canvas на випадкову кількість пікселів)
            if (this.screenShake > 0)
                ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
            // Малюємо підкладку під ігрове поле
            var pad = CELL_SIZE_1 * 0.2;
            ctx.fillStyle = "#2B2B33";
            if (typeof ctx.roundRect === "function") {
                ctx.beginPath();
                ctx.roundRect(OFFSET_X_1 - pad, OFFSET_Y_1 - pad, COLS_1 * CELL_SIZE_1 + pad * 2, ROWS_1 * CELL_SIZE_1 + pad * 2, pad * 1.5);
                ctx.fill();
            }
            else {
                ctx.fillRect(OFFSET_X_1 - pad, OFFSET_Y_1 - pad, COLS_1 * CELL_SIZE_1 + pad * 2, ROWS_1 * CELL_SIZE_1 + pad * 2);
            }
            var _loop_1 = function (r) {
                var _loop_3 = function (c) {
                    var isSwapping = this_1.lastMove.some(function (m) { return m.r === r && m.c === c; });
                    if (!isSwapping && this_1.grid[r][c])
                        this_1.grid[r][c].draw(ctx, ((_a = this_1.selected) === null || _a === void 0 ? void 0 : _a.r) === r && ((_b = this_1.selected) === null || _b === void 0 ? void 0 : _b.c) === c);
                };
                for (var c = 0; c < COLS_1; c++) {
                    _loop_3(c);
                }
            };
            var this_1 = this;
            // Малюємо камінці. Спочатку статичні, потім ті, що свапаються (щоб вони малювались ПОВЕРХ інших)
            for (var r = 0; r < ROWS_1; r++) {
                _loop_1(r);
            }
            var _loop_2 = function (r) {
                var _loop_4 = function (c) {
                    var isSwapping = this_2.lastMove.some(function (m) { return m.r === r && m.c === c; });
                    if (isSwapping && this_2.grid[r][c])
                        this_2.grid[r][c].draw(ctx, false);
                };
                for (var c = 0; c < COLS_1; c++) {
                    _loop_4(c);
                }
            };
            var this_2 = this;
            for (var r = 0; r < ROWS_1; r++) {
                _loop_2(r);
            }
            // Малюємо спецефекти
            this.lightnings.forEach(function (l) { return l.draw(ctx); });
            this.particles.forEach(function (p) { return p.draw(ctx); });
            ctx.restore(); // Відновлюємо Canvas (щоб тряска не впливала на UI)
            // ВІДМАЛЬОВКА ІНТЕРФЕЙСУ (UI)
            // Розраховуємо розмір шрифтів відносно розміру клітинки екрана
            var fSmall = Math.floor(CELL_SIZE_1 * 0.35);
            var fBig = Math.floor(CELL_SIZE_1 * 1.15);
            var fMed = Math.floor(CELL_SIZE_1 * 0.4);
            ctx.fillStyle = "#888";
            ctx.font = "".concat(fSmall, "px Arial");
            ctx.textAlign = "center";
            ctx.fillText("MAX COMBO", UI_X_1, UI_Y_1);
            ctx.fillStyle = "#FFD700";
            ctx.font = "bold ".concat(fBig, "px Arial");
            ctx.fillText("x".concat(this.maxCombo), UI_X_1, UI_Y_1 + fBig);
            ctx.strokeStyle = "#444";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(UI_X_1 - CELL_SIZE_1 * 1.5, UI_Y_1 + fBig + fSmall);
            ctx.lineTo(UI_X_1 + CELL_SIZE_1 * 1.5, UI_Y_1 + fBig + fSmall);
            ctx.stroke();
            ctx.fillStyle = "#CCC";
            ctx.font = "".concat(fSmall, "px Arial");
            ctx.fillText("LAST RECORD: x".concat(this.lastRecord), UI_X_1, UI_Y_1 + fBig + fSmall * 2.5);
            ctx.beginPath();
            ctx.moveTo(UI_X_1 - CELL_SIZE_1 * 1.5, UI_Y_1 + fBig + fSmall * 3.5);
            ctx.lineTo(UI_X_1 + CELL_SIZE_1 * 1.5, UI_Y_1 + fBig + fSmall * 3.5);
            ctx.stroke();
            // Анімація великого напису COMBO при збігах
            if (this.currentCombo > 1 && this.comboAlpha > 0) {
                ctx.save();
                ctx.translate(UI_X_1, UI_Y_1 + fBig + fSmall * 6);
                ctx.scale(this.comboScale, this.comboScale); // Ефект пульсації
                ctx.fillStyle = "rgba(255, 89, 94, ".concat(this.comboAlpha, ")");
                ctx.font = "bold ".concat(fBig * 0.8, "px Arial");
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("x".concat(this.currentCombo), 0, -fSmall);
                ctx.font = "bold ".concat(fMed, "px Arial");
                ctx.fillText("COMBO!", 0, fSmall);
                ctx.restore();
            }
        };
        return Game;
    }());
    // ІНІЦІАЛІЗАЦІЯ ТА ПОДІЇ
    var game_1 = new Game();
    // Підключення мишки
    canvas_1.addEventListener("mousedown", function (e) {
        return game_1.handleInputStart(e.clientX, e.clientY);
    });
    canvas_1.addEventListener("mousemove", function (e) {
        return game_1.handleInputMove(e.clientX, e.clientY);
    });
    window.addEventListener("mouseup", function (e) {
        return game_1.handleInputEnd(e.clientX, e.clientY);
    });
    // Підключення сенсорного екрану
    canvas_1.addEventListener("touchstart", function (e) {
        e.preventDefault(); // Забороняємо стандартну поведінку (скрол сторінки)
        game_1.handleInputStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    canvas_1.addEventListener("touchmove", function (e) {
        e.preventDefault();
        game_1.handleInputMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    window.addEventListener("touchend", function (e) {
        // В touchend координати зберігаються в changedTouches
        if (e.changedTouches.length > 0) {
            game_1.handleInputEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
        else {
            game_1.isDragging = false;
        }
    });
    // Головний ігровий цикл (Game Loop)
    function gameLoop() {
        game_1.update(); // Перераховуємо фізику
        game_1.draw(ctx_1); // Малюємо новий кадр
        requestAnimationFrame(gameLoop); // Просимо браузер викликати цю функцію знову (60 разів на секунду)
    }
    // Запускаємо гру
    gameLoop();
}

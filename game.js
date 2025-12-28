// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size to window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let gameState = 'start'; // 'start', 'shipSelect', 'playing', 'gameOver'
let paused = false;
let score = 0;
let highScore = localStorage.getItem('spaceShooterHighScore') || 0;
let lives = 3;
let difficulty = 1;
let gameTime = 0;
let bossesDefeated = 0;

// Boss state
let boss = null;
let bossActive = false;
let lastBossLevel = 0;
let enemyBullets = [];

// Dying hearts animation
let dyingHearts = [];

// Function to handle losing a life with animation
function loseLife() {
    if (lives <= 0) return;

    // Calculate position of the heart that will be lost (leftmost heart)
    const heartIndex = lives - 1;
    const heartX = canvas.width - 40 - heartIndex * 45;
    const heartY = 38;

    // Add dying heart animation
    dyingHearts.push({
        x: heartX,
        y: heartY,
        life: 1.0,  // Fades from 1 to 0
        splitOffset: 0  // How far apart the broken pieces are
    });

    playLoseLifeSound();
    lives--;
}

// Power-up system
let powerUps = [];
let lastPowerUpSpawn = 0;
let activePowerUps = {
    rapidFire: 0,    // Timestamp when effect ends
    tripleShot: 0,   // Timestamp when effect ends
    shield: false    // Boolean - active until hit
};

const powerUpTypes = {
    rapidFire: {
        name: 'RAPID FIRE',
        color: '#ff4400',
        duration: 10000,  // 10 seconds
        letter: 'R'
    },
    tripleShot: {
        name: 'TRIPLE SHOT',
        color: '#00ff44',
        duration: 10000,  // 10 seconds
        letter: 'T'
    },
    shield: {
        name: 'SHIELD',
        color: '#4488ff',
        duration: 0,  // Lasts until hit
        letter: 'S'
    }
};

// Speed settings
const speedSettings = {
    slow: { speed: 2, accel: 0.25, name: 'Slow' },
    medium: { speed: 3.5, accel: 0.4, name: 'Medium' },
    fast: { speed: 5, accel: 0.6, name: 'Fast' }
};
let currentSpeed = 'slow';

// Ship types - player can choose at start
const shipTypes = {
    falcon: {
        name: 'Falcon',
        description: 'Fastest ship, single shot',
        speed: 4,
        accel: 0.25,
        shootDelay: 180,    // Medium fire rate
        shotCount: 1,
        color: '#00ffff',
        glowColor: 'rgba(0, 255, 255, 0.5)',
        bulletColor: '#00ffff'
    },
    tank: {
        name: 'Tank',
        description: 'Slowest but 3-shot spread',
        speed: 2,
        accel: 0.125,
        shootDelay: 280,    // Slow fire rate
        shotCount: 3,
        color: '#ff6600',
        glowColor: 'rgba(255, 102, 0, 0.5)',
        bulletColor: '#ff6600'
    },
    wasp: {
        name: 'Wasp',
        description: 'Fastest fire rate',
        speed: 3,
        accel: 0.175,
        shootDelay: 140,    // Fast fire rate (nerfed)
        shotCount: 1,
        color: '#ffff00',
        glowColor: 'rgba(255, 255, 0, 0.5)',
        bulletColor: '#ffff00'
    }
};
let selectedShip = 'falcon';

// Game difficulty settings (affects enemy size, speed, spawn rate)
const gameDifficulty = {
    easy: {
        name: 'Easy',
        sizeMultiplier: 1.8,      // Bigger UFOs = easier to hit
        speedMultiplier: 0.7,     // Slower enemies
        spawnMultiplier: 1.4,     // Slower spawn rate
        bossHealthMultiplier: 0.7,
        color: '#00ff00'
    },
    medium: {
        name: 'Medium',
        sizeMultiplier: 1.3,
        speedMultiplier: 1.0,
        spawnMultiplier: 1.0,
        bossHealthMultiplier: 1.0,
        color: '#ffff00'
    },
    hard: {
        name: 'Hard',
        sizeMultiplier: 1.0,      // Smaller UFOs = harder to hit
        speedMultiplier: 1.3,     // Faster enemies
        spawnMultiplier: 0.7,     // Faster spawn rate
        bossHealthMultiplier: 1.5,
        color: '#ff4444'
    }
};
let currentDifficulty = 'easy';

// Sound system using Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playShootSound() {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
}

function playHitSound() {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
}

function playLoseLifeSound() {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.4);
}

function playBossDefeatSound() {
    // Epic explosion sound for boss defeat
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100 + Math.random() * 100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
        }, i * 100);
    }
}

// Background music system
let musicPlaying = false;
let musicNodes = [];

function startMusic() {
    if (musicPlaying) return;
    musicPlaying = true;

    // Bass line
    const bassNotes = [55, 55, 73.42, 73.42, 82.41, 82.41, 73.42, 73.42]; // A1, D2, E2 pattern
    let bassIndex = 0;

    function playBassNote() {
        if (!musicPlaying) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        osc.frequency.setValueAtTime(bassNotes[bassIndex], audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.35);

        bassIndex = (bassIndex + 1) % bassNotes.length;

        musicNodes.push(setTimeout(playBassNote, 350));
    }

    // Arpeggio melody
    const arpNotes = [220, 277.18, 329.63, 440, 329.63, 277.18]; // Am arpeggio
    let arpIndex = 0;

    function playArpNote() {
        if (!musicPlaying) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(arpNotes[arpIndex], audioCtx.currentTime);

        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.18);

        arpIndex = (arpIndex + 1) % arpNotes.length;

        musicNodes.push(setTimeout(playArpNote, 175));
    }

    playBassNote();
    setTimeout(playArpNote, 100);
}

function stopMusic() {
    musicPlaying = false;
    musicNodes.forEach(node => clearTimeout(node));
    musicNodes = [];
}

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'start') {
            gameState = 'shipSelect';
        } else if (gameState === 'gameOver') {
            gameState = 'shipSelect';
        }
    }

    // Ship selection (1, 2, 3 keys on ship select screen)
    if (gameState === 'shipSelect') {
        if (e.code === 'Digit1') {
            selectedShip = 'falcon';
            startGame();
        }
        if (e.code === 'Digit2') {
            selectedShip = 'tank';
            startGame();
        }
        if (e.code === 'Digit3') {
            selectedShip = 'wasp';
            startGame();
        }
    }

    // Difficulty settings (E, M, H keys) - only on start screen
    if (gameState === 'start') {
        if (e.code === 'KeyE') currentDifficulty = 'easy';
        if (e.code === 'KeyM') currentDifficulty = 'medium';
        if (e.code === 'KeyH') currentDifficulty = 'hard';
    }

    // Pause toggle (P key) - only during gameplay
    if (e.code === 'KeyP' && gameState === 'playing') {
        paused = !paused;
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Mobile touch controls - detect touch capability
const isMobile = ('ontouchstart' in window) ||
                 (navigator.maxTouchPoints > 0) ||
                 /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const touchState = {
    joystick: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        id: null
    },
    fire: {
        active: false,
        id: null
    }
};

const joystickRadius = 60;
const joystickX = 100;
const joystickY = () => canvas.height - 120;

const fireButtonRadius = 50;
const fireButtonX = () => canvas.width - 100;
const fireButtonY = () => canvas.height - 120;

// Touch event handlers
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();

    // Handle menu navigation - tap anywhere to proceed
    if (gameState === 'start') {
        gameState = 'shipSelect';
        return;
    } else if (gameState === 'gameOver') {
        gameState = 'shipSelect';
        return;
    }

    for (let touch of e.changedTouches) {
        const x = touch.clientX;
        const y = touch.clientY;

        // Check if touch is on fire button (right side)
        const fbX = fireButtonX();
        const fbY = fireButtonY();
        if (Math.hypot(x - fbX, y - fbY) < fireButtonRadius * 1.5) {
            touchState.fire.active = true;
            touchState.fire.id = touch.identifier;
            continue;
        }

        // Check if touch is on left side (joystick area)
        if (x < canvas.width / 2 && !touchState.joystick.active) {
            touchState.joystick.active = true;
            touchState.joystick.startX = x;
            touchState.joystick.startY = y;
            touchState.joystick.currentX = x;
            touchState.joystick.currentY = y;
            touchState.joystick.id = touch.identifier;
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();

    for (let touch of e.changedTouches) {
        if (touch.identifier === touchState.joystick.id) {
            touchState.joystick.currentX = touch.clientX;
            touchState.joystick.currentY = touch.clientY;
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();

    for (let touch of e.changedTouches) {
        if (touch.identifier === touchState.joystick.id) {
            touchState.joystick.active = false;
            touchState.joystick.id = null;
        }
        if (touch.identifier === touchState.fire.id) {
            touchState.fire.active = false;
            touchState.fire.id = null;
        }
    }
}, { passive: false });

canvas.addEventListener('touchcancel', (e) => {
    touchState.joystick.active = false;
    touchState.joystick.id = null;
    touchState.fire.active = false;
    touchState.fire.id = null;
}, { passive: false });

// Ship selection via touch (tap on ship)
canvas.addEventListener('click', (e) => {
    if (gameState === 'shipSelect') {
        const x = e.clientX;
        const spacing = canvas.width / 4;

        if (x < spacing * 1.5) {
            selectedShip = 'falcon';
            startGame();
        } else if (x < spacing * 2.5) {
            selectedShip = 'tank';
            startGame();
        } else {
            selectedShip = 'wasp';
            startGame();
        }
    }
});

// Draw touch controls
function drawTouchControls() {
    if (!isMobile || gameState !== 'playing') return;

    ctx.save();
    ctx.globalAlpha = 0.4;

    // Draw joystick base
    const jY = joystickY();
    ctx.fillStyle = '#333333';
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(joystickX, jY, joystickRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw joystick thumb
    let thumbX = joystickX;
    let thumbY = jY;
    if (touchState.joystick.active) {
        const dx = touchState.joystick.currentX - touchState.joystick.startX;
        const dy = touchState.joystick.currentY - touchState.joystick.startY;
        const dist = Math.min(Math.hypot(dx, dy), joystickRadius);
        const angle = Math.atan2(dy, dx);
        thumbX = joystickX + Math.cos(angle) * dist;
        thumbY = jY + Math.sin(angle) * dist;
    }

    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 25, 0, Math.PI * 2);
    ctx.fill();

    // Draw fire button
    const fbX = fireButtonX();
    const fbY = fireButtonY();
    ctx.fillStyle = touchState.fire.active ? '#ff4444' : '#aa2222';
    ctx.strokeStyle = '#ff6666';
    ctx.beginPath();
    ctx.arc(fbX, fbY, fireButtonRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fire button label
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FIRE', fbX, fbY);

    ctx.restore();
}

// Player
const player = {
    x: 0,
    y: 0,
    width: 50,
    height: 60,
    speed: 7,
    vx: 0,
    vy: 0,
    friction: 0.92,
    shootCooldown: 0,
    shootDelay: 150, // milliseconds between shots
    color: '#00ffff',
    glowColor: 'rgba(0, 255, 255, 0.5)'
};

// Arrays for game objects
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];

// Initialize stars for background
function initStars() {
    stars = [];
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 2 + 0.5,
            brightness: Math.random()
        });
    }
}

// Start/restart game
function startGame() {
    gameState = 'playing';
    paused = false;
    score = 0;
    lives = 3;
    difficulty = 1;
    gameTime = 0;
    bossesDefeated = 0;
    boss = null;
    bossActive = false;
    lastBossLevel = 0;
    enemyBullets = [];
    powerUps = [];
    lastPowerUpSpawn = 0;
    activePowerUps = { rapidFire: 0, tripleShot: 0, shield: false };
    dyingHearts = [];

    // Apply selected ship stats
    const ship = shipTypes[selectedShip];
    player.speed = ship.speed;
    player.shootDelay = ship.shootDelay;
    player.color = ship.color;
    player.glowColor = ship.glowColor;

    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.vx = 0;
    player.vy = 0;
    bullets = [];
    enemies = [];
    particles = [];
    initStars();
    startMusic();
}

// Spawn power-up (floats down from top)
function spawnPowerUp() {
    const now = Date.now();
    // Spawn a power-up every 15-25 seconds
    const spawnInterval = 15000 + Math.random() * 10000;

    if (now - lastPowerUpSpawn > spawnInterval) {
        lastPowerUpSpawn = now;

        // Random power-up type
        const types = ['rapidFire', 'tripleShot', 'shield'];
        const type = types[Math.floor(Math.random() * types.length)];

        powerUps.push({
            x: Math.random() * (canvas.width - 60) + 30,
            y: -30,
            width: 40,
            height: 40,
            speed: 1.5,
            type: type,
            rotation: 0
        });
    }
}

// Spawn boss every 3 levels
function spawnBoss() {
    const bossLevel = bossesDefeated + 1;
    const diffSettings = gameDifficulty[currentDifficulty];
    const baseHealth = Math.floor((20 + bossLevel * 10) * diffSettings.bossHealthMultiplier);

    boss = {
        x: canvas.width / 2,
        y: -100,
        targetY: 120,
        width: 150 + bossLevel * 20,
        height: 80 + bossLevel * 10,
        health: baseHealth,
        maxHealth: baseHealth,
        speed: 1.5 * diffSettings.speedMultiplier,
        direction: 1,
        shootCooldown: 0,
        shootDelay: Math.max(500, (1500 - bossLevel * 100) / diffSettings.speedMultiplier),
        points: 2000 + bossLevel * 500,
        phase: 'entering', // 'entering', 'fighting'
        color: '#ff00ff',
        glowColor: 'rgba(255, 0, 255, 0.6)'
    };
    bossActive = true;
}

// Boss shoots at player
function bossShoot() {
    if (!boss || boss.phase !== 'fighting') return;

    const now = Date.now();
    if (now - boss.shootCooldown > boss.shootDelay) {
        boss.shootCooldown = now;

        // Shoot 3 bullets in a spread
        for (let i = -1; i <= 1; i++) {
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + i * 0.3;
            enemyBullets.push({
                x: boss.x,
                y: boss.y + boss.height / 2,
                vx: Math.cos(angle) * 5,
                vy: Math.sin(angle) * 5,
                width: 10,
                height: 10,
                color: '#ff00ff'
            });
        }
    }
}

// Create bullet
function shoot() {
    const now = Date.now();
    // Rapid fire = half the delay
    const shootDelay = activePowerUps.rapidFire > now ? player.shootDelay / 2 : player.shootDelay;

    if (now - player.shootCooldown > shootDelay) {
        player.shootCooldown = now;
        playShootSound();

        // Triple shot or single shot
        if (activePowerUps.tripleShot > now) {
            // Fire 3 bullets in spread
            for (let i = -1; i <= 1; i++) {
                bullets.push({
                    x: player.x + i * 15,
                    y: player.y - player.height / 2,
                    width: 6,
                    height: 20,
                    speed: 12,
                    vx: i * 2,  // Spread horizontally
                    color: '#00ff44',
                    glowColor: 'rgba(0, 255, 68, 0.6)'
                });
            }
        } else {
            // Normal shot based on ship's shot count
            const ship = shipTypes[selectedShip];
            const bulletColor = ship.bulletColor;
            const bulletGlow = ship.glowColor;

            if (ship.shotCount === 3) {
                // Triple spread shot (Tank) - center + 30 degree angles
                // Center shot
                bullets.push({
                    x: player.x,
                    y: player.y - player.height / 2,
                    width: 6,
                    height: 20,
                    speed: 12,
                    vx: 0,
                    color: bulletColor,
                    glowColor: bulletGlow
                });
                // Left angled shot (12.5 degrees)
                bullets.push({
                    x: player.x - 10,
                    y: player.y - player.height / 2,
                    width: 6,
                    height: 20,
                    speed: 12,
                    vx: -2.7,  // ~12.5 degree angle left
                    color: bulletColor,
                    glowColor: bulletGlow
                });
                // Right angled shot (12.5 degrees)
                bullets.push({
                    x: player.x + 10,
                    y: player.y - player.height / 2,
                    width: 6,
                    height: 20,
                    speed: 12,
                    vx: 2.7,   // ~12.5 degree angle right
                    color: bulletColor,
                    glowColor: bulletGlow
                });
            } else if (ship.shotCount === 2) {
                // Dual shot - two parallel bullets
                bullets.push({
                    x: player.x - 12,
                    y: player.y - player.height / 2,
                    width: 6,
                    height: 20,
                    speed: 12,
                    vx: 0,
                    color: bulletColor,
                    glowColor: bulletGlow
                });
                bullets.push({
                    x: player.x + 12,
                    y: player.y - player.height / 2,
                    width: 6,
                    height: 20,
                    speed: 12,
                    vx: 0,
                    color: bulletColor,
                    glowColor: bulletGlow
                });
            } else {
                // Single shot
                bullets.push({
                    x: player.x,
                    y: player.y - player.height / 2,
                    width: 6,
                    height: 20,
                    speed: 12,
                    vx: 0,
                    color: bulletColor,
                    glowColor: bulletGlow
                });
            }
        }
    }
}

// Enemy types
const enemyTypes = {
    basic: {
        width: 40,
        height: 40,
        speed: 2,
        health: 1,
        points: 100,
        color: '#ff4444',
        glowColor: 'rgba(255, 68, 68, 0.5)'
    },
    fast: {
        width: 30,
        height: 30,
        speed: 2.5,
        health: 1,
        points: 150,
        color: '#ff8800',
        glowColor: 'rgba(255, 136, 0, 0.5)'
    },
    tough: {
        width: 55,
        height: 55,
        speed: 1.5,
        health: 3,
        points: 300,
        color: '#aa44ff',
        glowColor: 'rgba(170, 68, 255, 0.5)'
    }
};

// Spawn enemy
let lastEnemySpawn = 0;
let lastFastEnemyDefeat = 0;
const FAST_ENEMY_COOLDOWN = 3000; // 3 seconds cooldown after defeating orange ship
function spawnEnemy() {
    const now = Date.now();
    const diffSettings = gameDifficulty[currentDifficulty];
    const baseSpawnRate = Math.max(500, 1500 - difficulty * 100);
    let spawnRate = baseSpawnRate * diffSettings.spawnMultiplier;

    // Spawn much slower during boss fights - enemies every 4 seconds instead
    if (bossActive) {
        spawnRate = 4000;
    }

    if (now - lastEnemySpawn > spawnRate) {
        lastEnemySpawn = now;

        // Choose enemy type based on level difficulty
        let type;
        const rand = Math.random();
        const fastOnCooldown = (now - lastFastEnemyDefeat) < FAST_ENEMY_COOLDOWN;

        if (difficulty < 3) {
            type = 'basic';
        } else if (rand < 0.6) {
            type = 'basic';
        } else if (rand < 0.85) {
            // Only spawn fast enemy if not on cooldown, otherwise spawn basic
            type = fastOnCooldown ? 'basic' : 'fast';
        } else {
            type = 'tough';
        }

        const template = enemyTypes[type];
        const sizeMultiplier = diffSettings.sizeMultiplier;
        const speedMultiplier = diffSettings.speedMultiplier;

        enemies.push({
            x: Math.random() * (canvas.width - template.width * sizeMultiplier * 2) + template.width * sizeMultiplier,
            y: -template.height * sizeMultiplier,
            width: template.width * sizeMultiplier,
            height: template.height * sizeMultiplier,
            speed: template.speed * (1 + difficulty * 0.1) * speedMultiplier,
            health: template.health,
            maxHealth: template.health,
            points: template.points,
            color: template.color,
            glowColor: template.glowColor,
            type: type
        });
    }
}

// Create explosion particles
function createExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        const speed = Math.random() * 4 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 6 + 3,
            color: color,
            life: 1,
            decay: Math.random() * 0.03 + 0.02
        });
    }
}

// Collision detection
function checkCollision(a, b) {
    return a.x - a.width / 2 < b.x + b.width / 2 &&
           a.x + a.width / 2 > b.x - b.width / 2 &&
           a.y - a.height / 2 < b.y + b.height / 2 &&
           a.y + a.height / 2 > b.y - b.height / 2;
}

// Update game logic
function update(deltaTime) {
    if (gameState !== 'playing') return;
    if (paused) return;

    gameTime += deltaTime;
    difficulty = 1 + Math.floor(gameTime / 15000); // Increase difficulty every 15 seconds

    // Player movement (using ship's speed stats)
    const ship = shipTypes[selectedShip];

    // Keyboard controls
    if (keys['ArrowLeft'] || keys['KeyA']) player.vx -= ship.accel;
    if (keys['ArrowRight'] || keys['KeyD']) player.vx += ship.accel;

    // Touch joystick controls
    if (touchState.joystick.active) {
        const dx = touchState.joystick.currentX - touchState.joystick.startX;
        const normalizedX = Math.max(-1, Math.min(1, dx / joystickRadius));
        player.vx += normalizedX * ship.accel * 1.5;
    }

    // Shooting (keyboard or touch)
    if (keys['Space'] || touchState.fire.active) shoot();

    // Apply physics
    player.vx *= player.friction;
    player.vy *= player.friction;
    player.x += player.vx * ship.speed;
    player.y += player.vy * ship.speed;

    // Keep player in bounds
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));

    // Update bullets
    bullets = bullets.filter(bullet => {
        bullet.y -= bullet.speed;
        bullet.x += bullet.vx || 0;  // Apply horizontal spread if any
        return bullet.y > -bullet.height && bullet.x > 0 && bullet.x < canvas.width;
    });

    // Spawn enemies
    spawnEnemy();

    // Update enemies
    enemies = enemies.filter(enemy => {
        enemy.y += enemy.speed;

        // Check if enemy reached bottom
        if (enemy.y > canvas.height + enemy.height) {
            loseLife();
            if (lives <= 0) {
                gameOver();
            }
            return false;
        }

        // Check collision with player
        if (checkCollision(player, enemy)) {
            createExplosion(enemy.x, enemy.y, enemy.color, 20);
            if (activePowerUps.shield) {
                // Shield absorbs the hit
                activePowerUps.shield = false;
                createExplosion(player.x, player.y, '#4488ff', 15);
            } else {
                loseLife();
                if (lives <= 0) {
                    gameOver();
                }
            }
            return false;
        }

        return true;
    });

    // Check bullet-enemy collisions
    bullets = bullets.filter(bullet => {
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (checkCollision(bullet, enemies[i])) {
                enemies[i].health--;
                createExplosion(bullet.x, bullet.y, '#ffff00', 5);

                if (enemies[i].health <= 0) {
                    playHitSound();
                    createExplosion(enemies[i].x, enemies[i].y, enemies[i].color, 20);
                    score += enemies[i].points;
                    // Start cooldown if fast (orange) enemy was defeated
                    if (enemies[i].type === 'fast') {
                        lastFastEnemyDefeat = Date.now();
                    }
                    enemies.splice(i, 1);
                }
                return false;
            }
        }
        return true;
    });

    // Boss spawning - every 3 levels
    if (difficulty >= 3 && difficulty !== lastBossLevel && difficulty % 3 === 0 && !bossActive) {
        lastBossLevel = difficulty;
        spawnBoss();
        enemies = []; // Clear regular enemies for boss fight
    }

    // Update boss
    if (boss && bossActive) {
        // Boss entering phase
        if (boss.phase === 'entering') {
            boss.y += 2;
            if (boss.y >= boss.targetY) {
                boss.y = boss.targetY;
                boss.phase = 'fighting';
            }
        } else {
            // Boss movement - side to side
            boss.x += boss.speed * boss.direction;
            if (boss.x > canvas.width - boss.width / 2) {
                boss.direction = -1;
            } else if (boss.x < boss.width / 2) {
                boss.direction = 1;
            }

            // Boss shoots
            bossShoot();
        }

        // Check bullets hitting boss
        bullets = bullets.filter(bullet => {
            if (!boss) return true; // Boss already defeated, keep bullet
            if (checkCollision(bullet, boss)) {
                boss.health--;
                createExplosion(bullet.x, bullet.y, '#ffff00', 5);

                if (boss.health <= 0) {
                    // Boss defeated!
                    playBossDefeatSound();
                    // Capture boss position before setting to null
                    const bossX = boss.x;
                    const bossY = boss.y;
                    const bossW = boss.width;
                    const bossH = boss.height;
                    const bossColor = boss.color;
                    for (let i = 0; i < 5; i++) {
                        setTimeout(() => {
                            createExplosion(
                                bossX + (Math.random() - 0.5) * bossW,
                                bossY + (Math.random() - 0.5) * bossH,
                                bossColor, 30
                            );
                        }, i * 150);
                    }
                    score += boss.points;
                    bossesDefeated++;
                    boss = null;
                    bossActive = false;
                    enemyBullets = [];
                }
                return false;
            }
            return true;
        });
    }

    // Update enemy bullets
    enemyBullets = enemyBullets.filter(bullet => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // Check if bullet hits player
        if (checkCollision(bullet, player)) {
            if (activePowerUps.shield) {
                // Shield absorbs the hit
                activePowerUps.shield = false;
                createExplosion(player.x, player.y, '#4488ff', 15);
                playHitSound();
            } else {
                createExplosion(player.x, player.y, '#ff0000', 10);
                loseLife();
                if (lives <= 0) {
                    gameOver();
                }
            }
            return false;
        }

        // Remove if off screen
        return bullet.y < canvas.height + 20 && bullet.y > -20 &&
               bullet.x > -20 && bullet.x < canvas.width + 20;
    });

    // Spawn and update power-ups
    spawnPowerUp();

    powerUps = powerUps.filter(powerUp => {
        powerUp.y += powerUp.speed;
        powerUp.rotation += 0.02;

        // Check if player bullet hits power-up
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (checkCollision(bullets[i], powerUp)) {
                // Activate power-up
                const now = Date.now();
                const type = powerUp.type;
                const typeInfo = powerUpTypes[type];

                if (type === 'shield') {
                    activePowerUps.shield = true;
                } else {
                    activePowerUps[type] = now + typeInfo.duration;
                }

                // Visual feedback
                createExplosion(powerUp.x, powerUp.y, typeInfo.color, 20);
                playHitSound();

                // Remove the bullet that hit
                bullets.splice(i, 1);
                return false;
            }
        }

        // Remove if off screen
        return powerUp.y < canvas.height + 50;
    });

    // Update particles
    particles = particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Gravity
        particle.life -= particle.decay;
        return particle.life > 0;
    });

    // Update dying hearts
    dyingHearts = dyingHearts.filter(heart => {
        heart.life -= 0.02;
        heart.splitOffset += 2;
        heart.y += 1;
        return heart.life > 0;
    });

    // Update stars (parallax)
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

// Game over
function gameOver() {
    gameState = 'gameOver';
    stopMusic();
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spaceShooterHighScore', highScore);
    }
    createExplosion(player.x, player.y, player.color, 30);
}

// Draw functions
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);

    // Glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.glowColor;

    if (selectedShip === 'falcon') {
        // Falcon: Sleek pointed ship with swept wings
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.moveTo(0, -player.height / 2);
        ctx.lineTo(-player.width / 3, player.height / 3);
        ctx.lineTo(0, player.height / 5);
        ctx.lineTo(player.width / 3, player.height / 3);
        ctx.closePath();
        ctx.fill();

        // Swept wings
        ctx.beginPath();
        ctx.moveTo(-player.width / 3, player.height / 6);
        ctx.lineTo(-player.width / 2, player.height / 3);
        ctx.lineTo(-player.width / 3, player.height / 4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(player.width / 3, player.height / 6);
        ctx.lineTo(player.width / 2, player.height / 3);
        ctx.lineTo(player.width / 3, player.height / 4);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, -5, 6, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Engine glow
        ctx.fillStyle = '#ff6600';
        ctx.shadowColor = 'rgba(255, 102, 0, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-8, player.height / 3);
        ctx.lineTo(0, player.height / 3 + 15 + Math.random() * 10);
        ctx.lineTo(8, player.height / 3);
        ctx.closePath();
        ctx.fill();

    } else if (selectedShip === 'tank') {
        // Tank: Wide, chunky ship with dual cannons
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.moveTo(0, -player.height / 3);
        ctx.lineTo(-player.width / 2.5, 0);
        ctx.lineTo(-player.width / 2, player.height / 3);
        ctx.lineTo(player.width / 2, player.height / 3);
        ctx.lineTo(player.width / 2.5, 0);
        ctx.closePath();
        ctx.fill();

        // Dual cannons
        ctx.fillRect(-player.width / 2.2, -player.height / 4, 8, player.height / 2);
        ctx.fillRect(player.width / 2.2 - 8, -player.height / 4, 8, player.height / 2);

        // Armor plates
        ctx.fillStyle = '#cc5500';
        ctx.fillRect(-player.width / 4, -player.height / 6, player.width / 2, player.height / 4);

        // Cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, -5, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dual engine glows
        ctx.fillStyle = '#ff6600';
        ctx.shadowColor = 'rgba(255, 102, 0, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-15, player.height / 3);
        ctx.lineTo(-12, player.height / 3 + 12 + Math.random() * 8);
        ctx.lineTo(-9, player.height / 3);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(9, player.height / 3);
        ctx.lineTo(12, player.height / 3 + 12 + Math.random() * 8);
        ctx.lineTo(15, player.height / 3);
        ctx.closePath();
        ctx.fill();

    } else if (selectedShip === 'wasp') {
        // Wasp: Small, compact ship with stinger
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.moveTo(0, -player.height / 2);
        ctx.lineTo(-player.width / 4, player.height / 6);
        ctx.lineTo(-player.width / 5, player.height / 3);
        ctx.lineTo(player.width / 5, player.height / 3);
        ctx.lineTo(player.width / 4, player.height / 6);
        ctx.closePath();
        ctx.fill();

        // Stinger/tail
        ctx.beginPath();
        ctx.moveTo(-player.width / 6, player.height / 3);
        ctx.lineTo(0, player.height / 2);
        ctx.lineTo(player.width / 6, player.height / 3);
        ctx.closePath();
        ctx.fill();

        // Small wings
        ctx.beginPath();
        ctx.moveTo(-player.width / 4, 0);
        ctx.lineTo(-player.width / 2.5, player.height / 6);
        ctx.lineTo(-player.width / 4, player.height / 8);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(player.width / 4, 0);
        ctx.lineTo(player.width / 2.5, player.height / 6);
        ctx.lineTo(player.width / 4, player.height / 8);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, -8, 5, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Engine glow
        ctx.fillStyle = '#ff6600';
        ctx.shadowColor = 'rgba(255, 102, 0, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-5, player.height / 2);
        ctx.lineTo(0, player.height / 2 + 10 + Math.random() * 8);
        ctx.lineTo(5, player.height / 2);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = bullet.glowColor;

        // Bullet gradient
        const gradient = ctx.createLinearGradient(bullet.x, bullet.y - bullet.height / 2, bullet.x, bullet.y + bullet.height / 2);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, bullet.color);
        gradient.addColorStop(1, '#ff8800');

        ctx.fillStyle = gradient;
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
        ctx.restore();
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.shadowBlur = 15;
        ctx.shadowColor = enemy.glowColor;

        if (enemy.type === 'basic') {
            // Classic flying saucer UFO
            // Bottom dome (darker)
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.ellipse(0, 5, enemy.width / 2, enemy.height / 4, 0, 0, Math.PI);
            ctx.fill();

            // Main saucer body
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.width / 2, enemy.height / 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Top dome (cockpit)
            ctx.fillStyle = '#88ffff';
            ctx.beginPath();
            ctx.ellipse(0, -5, enemy.width / 4, enemy.height / 4, 0, Math.PI, Math.PI * 2);
            ctx.fill();

            // Lights on saucer
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(-enemy.width / 3, 0, 3, 0, Math.PI * 2);
            ctx.arc(enemy.width / 3, 0, 3, 0, Math.PI * 2);
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();

        } else if (enemy.type === 'fast') {
            // Sleek scout UFO
            // Main body - pointed oval
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.moveTo(0, -enemy.height / 2);
            ctx.bezierCurveTo(enemy.width / 2, -enemy.height / 4, enemy.width / 2, enemy.height / 4, 0, enemy.height / 2);
            ctx.bezierCurveTo(-enemy.width / 2, enemy.height / 4, -enemy.width / 2, -enemy.height / 4, 0, -enemy.height / 2);
            ctx.fill();

            // Cockpit window
            ctx.fillStyle = '#aaffaa';
            ctx.beginPath();
            ctx.ellipse(0, -enemy.height / 6, enemy.width / 4, enemy.height / 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Engine glow at back
            ctx.fillStyle = '#ff8800';
            ctx.shadowColor = '#ff8800';
            ctx.beginPath();
            ctx.ellipse(0, enemy.height / 3, enemy.width / 5, enemy.height / 8, 0, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // Large mothership UFO
            // Main hull
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.width / 2, enemy.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Upper structure
            ctx.beginPath();
            ctx.moveTo(-enemy.width / 3, -5);
            ctx.lineTo(-enemy.width / 5, -enemy.height / 2.5);
            ctx.lineTo(enemy.width / 5, -enemy.height / 2.5);
            ctx.lineTo(enemy.width / 3, -5);
            ctx.closePath();
            ctx.fill();

            // Command dome
            ctx.fillStyle = '#ffaaff';
            ctx.beginPath();
            ctx.ellipse(0, -enemy.height / 3, enemy.width / 6, enemy.height / 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Bottom lights array
            ctx.fillStyle = '#00ffff';
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.arc(i * (enemy.width / 6), enemy.height / 6, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Health indicator for tough enemies
            if (enemy.maxHealth > 1) {
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(enemy.health, 0, 8);
            }
        }

        ctx.restore();
    });
}

function drawPowerUps() {
    const now = Date.now();
    powerUps.forEach(powerUp => {
        ctx.save();
        ctx.translate(powerUp.x, powerUp.y);
        ctx.rotate(powerUp.rotation);

        const typeInfo = powerUpTypes[powerUp.type];

        // Gift box glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = typeInfo.color;

        // Box body
        ctx.fillStyle = typeInfo.color;
        ctx.fillRect(-powerUp.width / 2, -powerUp.height / 2, powerUp.width, powerUp.height);

        // Darker edges
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-powerUp.width / 2, -powerUp.height / 2, powerUp.width, 5);
        ctx.fillRect(-powerUp.width / 2, powerUp.height / 2 - 5, powerUp.width, 5);

        // Ribbon horizontal
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-powerUp.width / 2, -4, powerUp.width, 8);

        // Ribbon vertical
        ctx.fillRect(-4, -powerUp.height / 2, 8, powerUp.height);

        // Bow on top
        ctx.beginPath();
        ctx.arc(-8, -powerUp.height / 2, 6, 0, Math.PI * 2);
        ctx.arc(8, -powerUp.height / 2, 6, 0, Math.PI * 2);
        ctx.fill();

        // Letter label
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(typeInfo.letter, 0, 2);

        ctx.restore();
    });
}

function drawShield() {
    if (!activePowerUps.shield) return;

    ctx.save();
    ctx.translate(player.x, player.y);

    // Pulsating shield effect
    const pulse = Math.sin(Date.now() / 100) * 0.2 + 0.8;

    ctx.strokeStyle = `rgba(68, 136, 255, ${pulse})`;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#4488ff';

    ctx.beginPath();
    ctx.arc(0, 0, player.width / 2 + 15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

function drawBoss() {
    if (!boss) return;

    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.shadowBlur = 25;
    ctx.shadowColor = boss.glowColor;

    // Main mothership body
    ctx.fillStyle = boss.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, boss.width / 2, boss.height / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper command structure
    ctx.beginPath();
    ctx.moveTo(-boss.width / 3, -10);
    ctx.lineTo(-boss.width / 5, -boss.height / 2);
    ctx.lineTo(boss.width / 5, -boss.height / 2);
    ctx.lineTo(boss.width / 3, -10);
    ctx.closePath();
    ctx.fill();

    // Command dome
    ctx.fillStyle = '#ff88ff';
    ctx.beginPath();
    ctx.ellipse(0, -boss.height / 2.5, boss.width / 6, boss.height / 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing extensions
    ctx.fillStyle = boss.color;
    ctx.beginPath();
    ctx.moveTo(-boss.width / 2, 0);
    ctx.lineTo(-boss.width / 2 - 30, boss.height / 4);
    ctx.lineTo(-boss.width / 2, boss.height / 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(boss.width / 2, 0);
    ctx.lineTo(boss.width / 2 + 30, boss.height / 4);
    ctx.lineTo(boss.width / 2, boss.height / 4);
    ctx.closePath();
    ctx.fill();

    // Bottom weapon array lights (animated)
    const time = Date.now() / 100;
    for (let i = -3; i <= 3; i++) {
        ctx.fillStyle = Math.sin(time + i) > 0 ? '#ff0000' : '#ffff00';
        ctx.beginPath();
        ctx.arc(i * (boss.width / 8), boss.height / 4, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    // Health bar
    const barWidth = boss.width;
    const barHeight = 12;
    const barX = boss.x - barWidth / 2;
    const barY = boss.y - boss.height / 2 - 30;

    // Background
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health
    const healthPercent = boss.health / boss.maxHealth;
    ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Boss label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`BOSS - ${boss.health}/${boss.maxHealth}`, boss.x, barY - 5);
}

function drawEnemyBullets() {
    enemyBullets.forEach(bullet => {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = bullet.color;
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawParticles() {
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawStars() {
    stars.forEach(star => {
        ctx.save();
        ctx.globalAlpha = 0.5 + star.brightness * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawUI() {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);
    ctx.fillText(`High Score: ${highScore}`, 20, 70);

    // Draw lives as glowing hearts (3x bigger)
    const heartSize = 54;
    for (let i = 0; i < lives; i++) {
        ctx.save();
        const heartX = canvas.width - 60 - i * 70;
        const heartY = 55;

        // Gentle pulsing
        const pulse = Math.sin(Date.now() / 200 + i * 0.5) * 0.08 + 1;

        ctx.translate(heartX, heartY);
        ctx.scale(pulse, pulse);

        // Subtle glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff4466';

        // Solid color (no gradient - faster)
        ctx.fillStyle = '#ff4466';

        // Draw heart shape
        ctx.beginPath();
        ctx.moveTo(0, heartSize * 0.4);
        ctx.bezierCurveTo(-heartSize * 0.1, heartSize * 0.1, -heartSize * 0.6, heartSize * 0.1, -heartSize * 0.6, -heartSize * 0.3);
        ctx.bezierCurveTo(-heartSize * 0.6, -heartSize * 0.7, 0, -heartSize * 0.7, 0, -heartSize * 0.3);
        ctx.bezierCurveTo(0, -heartSize * 0.7, heartSize * 0.6, -heartSize * 0.7, heartSize * 0.6, -heartSize * 0.3);
        ctx.bezierCurveTo(heartSize * 0.6, heartSize * 0.1, heartSize * 0.1, heartSize * 0.1, 0, heartSize * 0.4);
        ctx.closePath();
        ctx.fill();

        // Inner highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-heartSize * 0.2, -heartSize * 0.3, heartSize * 0.12, heartSize * 0.1, -0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Draw dying/broken hearts
    dyingHearts.forEach(heart => {
        ctx.save();
        ctx.globalAlpha = heart.life;
        ctx.translate(heart.x, heart.y);

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff4466';
        ctx.fillStyle = '#ff4466';

        // Left half of broken heart
        ctx.save();
        ctx.translate(-heart.splitOffset, 0);
        ctx.rotate(-heart.splitOffset * 0.02);
        ctx.beginPath();
        ctx.moveTo(0, heartSize * 0.4);
        ctx.bezierCurveTo(-heartSize * 0.1, heartSize * 0.1, -heartSize * 0.6, heartSize * 0.1, -heartSize * 0.6, -heartSize * 0.3);
        ctx.bezierCurveTo(-heartSize * 0.6, -heartSize * 0.7, 0, -heartSize * 0.7, 0, -heartSize * 0.3);
        ctx.lineTo(0, heartSize * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Right half of broken heart
        ctx.save();
        ctx.translate(heart.splitOffset, 0);
        ctx.rotate(heart.splitOffset * 0.02);
        ctx.beginPath();
        ctx.moveTo(0, heartSize * 0.4);
        ctx.lineTo(0, -heartSize * 0.3);
        ctx.bezierCurveTo(0, -heartSize * 0.7, heartSize * 0.6, -heartSize * 0.7, heartSize * 0.6, -heartSize * 0.3);
        ctx.bezierCurveTo(heartSize * 0.6, heartSize * 0.1, heartSize * 0.1, heartSize * 0.1, 0, heartSize * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();
    });

    // Difficulty indicator
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '16px Arial';
    ctx.fillText(`Level: ${difficulty}`, 20, 100);

    // Bosses defeated
    if (bossesDefeated > 0) {
        ctx.fillStyle = '#ff00ff';
        ctx.fillText(`Bosses Defeated: ${bossesDefeated}`, 20, 150);
    }

    // Active power-ups display
    const now = Date.now();
    let powerUpY = canvas.height - 30;

    if (activePowerUps.shield) {
        ctx.fillStyle = '#4488ff';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('SHIELD ACTIVE', 20, powerUpY);
        powerUpY -= 25;
    }

    if (activePowerUps.rapidFire > now) {
        const remaining = Math.ceil((activePowerUps.rapidFire - now) / 1000);
        ctx.fillStyle = '#ff4400';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`RAPID FIRE: ${remaining}s`, 20, powerUpY);
        powerUpY -= 25;
    }

    if (activePowerUps.tripleShot > now) {
        const remaining = Math.ceil((activePowerUps.tripleShot - now) / 1000);
        ctx.fillStyle = '#00ff44';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`TRIPLE SHOT: ${remaining}s`, 20, powerUpY);
        powerUpY -= 25;
    }

    // Boss warning
    if (bossActive && boss && boss.phase === 'entering') {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ BOSS APPROACHING ⚠', canvas.width / 2, canvas.height / 2);
    }

    ctx.restore();
}

function drawStartScreen() {
    ctx.save();

    // Title
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SPACE SHOOTER', canvas.width / 2, canvas.height / 2 - 80);

    // Instructions
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = '28px Arial';
    ctx.fillText(isMobile ? 'Tap to Start' : 'Press SPACE to Start', canvas.width / 2, canvas.height / 2 + 20);

    ctx.font = '20px Arial';
    ctx.fillStyle = '#aaaaaa';
    if (isMobile) {
        ctx.fillText('Use joystick to move', canvas.width / 2, canvas.height / 2 + 70);
        ctx.fillText('FIRE button to shoot', canvas.width / 2, canvas.height / 2 + 100);
    } else {
        ctx.fillText('Arrow Keys / WASD to Move', canvas.width / 2, canvas.height / 2 + 70);
        ctx.fillText('SPACE to Shoot', canvas.width / 2, canvas.height / 2 + 100);
    }

    // Difficulty setting
    const diffSettings = gameDifficulty[currentDifficulty];
    ctx.fillStyle = diffSettings.color;
    ctx.font = 'bold 22px Arial';
    ctx.fillText(`Game Difficulty: ${diffSettings.name}`, canvas.width / 2, canvas.height / 2 + 210);
    ctx.fillStyle = '#888888';
    ctx.font = '16px Arial';
    ctx.fillText('Press E (Easy) / M (Medium) / H (Hard)', canvas.width / 2, canvas.height / 2 + 235);

    // Difficulty description
    ctx.font = '14px Arial';
    ctx.fillStyle = '#666666';
    if (currentDifficulty === 'easy') {
        ctx.fillText('Bigger UFOs, slower enemies, more time between spawns', canvas.width / 2, canvas.height / 2 + 260);
    } else if (currentDifficulty === 'medium') {
        ctx.fillText('Balanced gameplay for a fair challenge', canvas.width / 2, canvas.height / 2 + 260);
    } else {
        ctx.fillText('Smaller UFOs, faster enemies, rapid spawns', canvas.width / 2, canvas.height / 2 + 260);
    }

    // High score
    if (highScore > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.font = '24px Arial';
        ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 310);
    }

    ctx.restore();
}

function drawShipSelectScreen() {
    ctx.save();
    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('SELECT YOUR SHIP', canvas.width / 2, 100);

    ctx.shadowBlur = 0;

    const shipKeys = ['falcon', 'tank', 'wasp'];
    const spacing = canvas.width / 4;

    shipKeys.forEach((key, index) => {
        const ship = shipTypes[key];
        const x = spacing * (index + 1);
        const y = canvas.height / 2 - 50;

        // Ship number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.fillText(`[${index + 1}]`, x, y - 120);

        // Draw ship preview
        ctx.save();
        ctx.translate(x, y);
        ctx.shadowBlur = 20;
        ctx.shadowColor = ship.glowColor;

        if (key === 'falcon') {
            // Sleek pointed ship
            ctx.fillStyle = ship.color;
            ctx.beginPath();
            ctx.moveTo(0, -40);
            ctx.lineTo(-20, 30);
            ctx.lineTo(0, 20);
            ctx.lineTo(20, 30);
            ctx.closePath();
            ctx.fill();
            // Wings
            ctx.beginPath();
            ctx.moveTo(-20, 10);
            ctx.lineTo(-35, 25);
            ctx.lineTo(-20, 20);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(20, 10);
            ctx.lineTo(35, 25);
            ctx.lineTo(20, 20);
            ctx.closePath();
            ctx.fill();
        } else if (key === 'tank') {
            // Wide chunky ship
            ctx.fillStyle = ship.color;
            ctx.beginPath();
            ctx.moveTo(0, -30);
            ctx.lineTo(-30, 0);
            ctx.lineTo(-35, 30);
            ctx.lineTo(35, 30);
            ctx.lineTo(30, 0);
            ctx.closePath();
            ctx.fill();
            // Cannons
            ctx.fillRect(-28, -10, 8, 30);
            ctx.fillRect(20, -10, 8, 30);
        } else if (key === 'wasp') {
            // Small compact ship
            ctx.fillStyle = ship.color;
            ctx.beginPath();
            ctx.moveTo(0, -30);
            ctx.lineTo(-15, 5);
            ctx.lineTo(-10, 25);
            ctx.lineTo(10, 25);
            ctx.lineTo(15, 5);
            ctx.closePath();
            ctx.fill();
            // Stinger shape at back
            ctx.beginPath();
            ctx.moveTo(-5, 25);
            ctx.lineTo(0, 35);
            ctx.lineTo(5, 25);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();

        // Ship name
        ctx.fillStyle = ship.color;
        ctx.font = 'bold 28px Arial';
        ctx.fillText(ship.name, x, y + 70);

        // Description
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '18px Arial';
        ctx.fillText(ship.description, x, y + 100);

        // Stats with color coding
        ctx.font = '16px Arial';

        // Speed stat
        const speedLabel = ship.speed >= 4 ? 'Fast' : ship.speed >= 3 ? 'Medium' : 'Slow';
        const speedColor = ship.speed >= 4 ? '#00ff88' : ship.speed >= 3 ? '#ffff00' : '#ff6666';
        ctx.fillStyle = '#888888';
        ctx.fillText('Speed: ', x - 40, y + 130);
        ctx.fillStyle = speedColor;
        ctx.fillText(speedLabel, x + 20, y + 130);

        // Fire rate stat
        const fireLabel = ship.shootDelay <= 150 ? 'Fast' : ship.shootDelay <= 200 ? 'Medium' : 'Slow';
        const fireColor = ship.shootDelay <= 150 ? '#00ff88' : ship.shootDelay <= 200 ? '#ffff00' : '#ff6666';
        ctx.fillStyle = '#888888';
        ctx.fillText('Fire Rate: ', x - 40, y + 155);
        ctx.fillStyle = fireColor;
        ctx.fillText(fireLabel, x + 30, y + 155);

        // Shots stat
        const shotLabel = ship.shotCount === 3 ? '3 (spread)' : '1';
        const shotColor = ship.shotCount >= 3 ? '#00ff88' : '#ffff00';
        ctx.fillStyle = '#888888';
        ctx.fillText('Shots: ', x - 40, y + 180);
        ctx.fillStyle = shotColor;
        ctx.fillText(shotLabel, x + 15, y + 180);
    });

    // Instructions
    ctx.fillStyle = '#666666';
    ctx.font = '20px Arial';
    ctx.fillText(isMobile ? 'Tap a ship to select' : 'Press 1, 2, or 3 to select your ship', canvas.width / 2, canvas.height - 80);

    ctx.restore();
}

function drawPauseScreen() {
    ctx.save();

    // Dim overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Paused text
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 20);

    // Resume instruction
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '28px Arial';
    ctx.fillText('Press P to Resume', canvas.width / 2, canvas.height / 2 + 40);

    ctx.restore();
}

function drawGameOverScreen() {
    ctx.save();

    // Game Over text
    ctx.fillStyle = '#ff4444';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff4444';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60);

    // Score
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = '36px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

    // New high score
    if (score >= highScore && score > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.font = '28px Arial';
        ctx.fillText('NEW HIGH SCORE!', canvas.width / 2, canvas.height / 2 + 70);
    }

    // Restart instruction
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '24px Arial';
    ctx.fillText(isMobile ? 'Tap to Play Again' : 'Press SPACE to Play Again', canvas.width / 2, canvas.height / 2 + 130);

    ctx.restore();
}

// Main render function
function draw() {
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000022');
    gradient.addColorStop(1, '#000044');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Always draw stars
    drawStars();

    if (gameState === 'start') {
        drawStartScreen();
    } else if (gameState === 'shipSelect') {
        drawShipSelectScreen();
    } else if (gameState === 'playing') {
        drawBullets();
        drawEnemyBullets();
        drawPowerUps();
        drawEnemies();
        drawBoss();
        drawPlayer();
        drawShield();
        drawParticles();
        drawUI();
        drawTouchControls();
        if (paused) {
            drawPauseScreen();
        }
    } else if (gameState === 'gameOver') {
        drawBullets();
        drawEnemyBullets();
        drawPowerUps();
        drawEnemies();
        drawBoss();
        drawParticles();
        drawUI();
        drawGameOverScreen();
    }
}

// Game loop
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// Initialize and start
initStars();
requestAnimationFrame(gameLoop);

// 游戏变量
let canvas, ctx;
let gameRunning = false;
let players = [];
let zombies = [];
let bullets = [];
let damageTexts = []; // 伤害飘字
let obstacles = []; // 地形障碍物
let keys = {};
let mouse = { x: 0, y: 0 };
let lastZombieSpawn = 0;
let zombieSpawnInterval = 2000;
let maxZombies = 15; // 最大僵尸数量限制
let frameCount = 0; // 帧计数器，用于优化绘制
let audioContext = null;
// 作弊功能变量
let godMode = false; // 无敌模式
let freezeZombies = false; // 怪物静止模式

// 游戏对象类
class Player {
    constructor(x, y, color, controls, isPlayer1) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.color = color;
        this.controls = controls;
        this.isPlayer1 = isPlayer1;
        this.health = 100;
        this.score = 0;
        this.speed = 2;
        this.lastShot = 0;
        this.shotCooldown = 200;
        this.direction = { x: 0, y: -1 }; // 默认向上
        this.autoShoot = false; // 自动射击开关
        this.isInvulnerable = false; // 是否处于无敌状态
        this.invulnerabilityDuration = 1000; // 无敌持续时间（毫秒）
        this.lastHitTime = 0; // 最后被击中的时间
        this.isFlashing = false; // 是否正在闪烁
        this.flashInterval = 100; // 闪烁间隔时间（毫秒）
        this.lastFlashTime = 0; // 最后闪烁的时间
        this.isDead = false; // 是否死亡
        this.isReviving = false; // 是否正在复活队友
        this.reviveTarget = null; // 复活目标
        this.reviveStartTime = 0; // 复活开始时间
        this.reviveDuration = 1000; // 复活持续时间（毫秒）
    }

    update() {
        // 死亡玩家不能操作
        if (this.isDead) return;
        
        // 移动逻辑
        let moveX = 0;
        let moveY = 0;
        
        if (this.isPlayer1) {
            if (keys['w']) moveY -= this.speed;
            if (keys['s']) moveY += this.speed;
            if (keys['a']) moveX -= this.speed;
            if (keys['d']) moveX += this.speed;
        } else {
            if (keys['ArrowUp']) moveY -= this.speed;
            if (keys['ArrowDown']) moveY += this.speed;
            if (keys['ArrowLeft']) moveX -= this.speed;
            if (keys['ArrowRight']) moveX += this.speed;
        }
        
        // 处理斜向移动，保持速度一致
        if (moveX !== 0 && moveY !== 0) {
            const diagonalSpeed = this.speed / Math.sqrt(2);
            moveX = moveX > 0 ? diagonalSpeed : -diagonalSpeed;
            moveY = moveY > 0 ? diagonalSpeed : -diagonalSpeed;
        }
        
        // 检查是否正在复活，如果移动则打断
        if (this.isReviving && (moveX !== 0 || moveY !== 0)) {
            this.isReviving = false;
            this.reviveTarget = null;
        }
        
        // 检测与障碍物的碰撞
        let canMoveX = true;
        let canMoveY = true;
        
        // 检测X方向移动
        const testX = this.x + moveX;
        const testRectX = { x: testX, y: this.y, width: this.width, height: this.height };
        for (const obstacle of obstacles) {
            if (collision(testRectX, obstacle)) {
                canMoveX = false;
                break;
            }
        }
        
        // 检测Y方向移动
        const testY = this.y + moveY;
        const testRectY = { x: this.x, y: testY, width: this.width, height: this.height };
        for (const obstacle of obstacles) {
            if (collision(testRectY, obstacle)) {
                canMoveY = false;
                break;
            }
        }
        
        // 更新位置
        if (canMoveX) {
            this.x = Math.max(0, Math.min(canvas.width - this.width, testX));
        }
        if (canMoveY) {
            this.y = Math.max(0, Math.min(canvas.height - this.height, testY));
        }
        
        // 更新方向
        if (moveX !== 0 || moveY !== 0) {
            const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
            this.direction = { x: moveX / magnitude, y: moveY / magnitude };
        }
        
        // 处理无敌时间
        const now = Date.now();
        if (this.isInvulnerable && now - this.lastHitTime > this.invulnerabilityDuration) {
            this.isInvulnerable = false;
            this.isFlashing = false;
        }
        
        // 处理闪烁效果
        if (this.isInvulnerable) {
            if (now - this.lastFlashTime > this.flashInterval) {
                this.isFlashing = !this.isFlashing;
                this.lastFlashTime = now;
            }
        }
        
        // 处理复活逻辑
        if (this.isReviving && this.reviveTarget) {
            if (now - this.reviveStartTime > this.reviveDuration) {
                // 复活成功
                this.reviveTarget.health = 50;
                this.reviveTarget.isDead = false;
                this.reviveTarget.isInvulnerable = true;
                this.reviveTarget.isFlashing = true;
                this.reviveTarget.lastHitTime = now;
                this.reviveTarget.lastFlashTime = now;
                this.isReviving = false;
                this.reviveTarget = null;
            }
        }
        
        // 自动射击逻辑
        if (this.autoShoot && this.health > 0 && !this.isDead && !this.isReviving) {
            this.shoot();
        }
    }

    draw() {
        if (this.health > 0 && !this.isDead && !this.isFlashing) {
            // 绘制玩家主体
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // 绘制玩家头部
            ctx.fillStyle = '#f0f0f0';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 3, this.width / 4, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制玩家武器
            ctx.fillStyle = '#333';
            const weaponLength = 15;
            const weaponWidth = 6;
            
            // 计算武器的终点位置
            const weaponEndX = this.x + this.width / 2 + this.direction.x * weaponLength;
            const weaponEndY = this.y + this.height / 2 + this.direction.y * weaponLength;
            
            // 绘制武器（线段形式）
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
            ctx.lineTo(weaponEndX, weaponEndY);
            ctx.lineWidth = weaponWidth;
            ctx.strokeStyle = '#333';
            ctx.stroke();
            
            // 绘制自动射击状态指示器
            if (this.autoShoot) {
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(this.x + this.width - 5, this.y + 5, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.isDead) {
            // 绘制尸体
            ctx.fillStyle = '#888';
            ctx.fillRect(this.x, this.y + this.height / 2, this.width, this.height / 2);
            
            // 绘制尸体头部
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 4, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制复活提示
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('按E复活', this.x + this.width / 2, this.y - 5);
        }
        
        // 绘制生命值条
        if (!this.isDead) {
            ctx.fillStyle = '#ff6b6b';
            const healthPercentage = Math.max(0, this.health) / 100;
            ctx.fillRect(this.x, this.y - 10, this.width * healthPercentage, 5);
        }
        
        // 绘制复活进度条
        if (this.isReviving && this.reviveTarget) {
            const now = Date.now();
            const reviveProgress = Math.min(1, (now - this.reviveStartTime) / this.reviveDuration);
            
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x, this.y - 15, this.width * reviveProgress, 5);
            
            // 绘制复活提示
            ctx.fillStyle = '#00ff00';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('复活中...', this.x + this.width / 2, this.y - 25);
        }
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot < this.shotCooldown || this.isDead || this.isReviving) return;
        
        this.lastShot = now;
        // 两个玩家都使用当前朝向射击
        const direction = this.direction;
        
        bullets.push({
            x: this.x + this.width / 2 - 2,
            y: this.y + this.height / 2 - 2,
            width: 4,
            height: 4,
            speed: 8,
            direction: direction,
            player: this
        });
        
        // 播放枪声
        playGunshot();
    }
}

class Zombie {
    constructor(isBoss = false) {
        // 从屏幕边缘随机生成
        const side = Math.floor(Math.random() * 4);
        if (side === 0) {
            // 顶部
            this.x = Math.random() * canvas.width;
            this.y = -50;
        } else if (side === 1) {
            // 右侧
            this.x = canvas.width + 50;
            this.y = Math.random() * canvas.height;
        } else if (side === 2) {
            // 底部
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + 50;
        } else {
            // 左侧
            this.x = -50;
            this.y = Math.random() * canvas.height;
        }
        
        this.isBoss = isBoss;
        if (isBoss) {
            this.width = 50;
            this.height = 50;
            this.color = '#ff6b6b';
            this.speed = 0.1;
            this.health = 400;
        } else {
            this.width = 25;
            this.height = 25;
            this.color = '#4caf50';
            this.speed = 0.3;
            this.health = 50;
        }
    }

    update() {
        // 检查是否启用了怪物静止模式
        if (freezeZombies) return;
        
        // BOSS吃小丧尸逻辑
        if (this.isBoss) {
            for (let i = zombies.length - 1; i >= 0; i--) {
                const otherZombie = zombies[i];
                if (otherZombie !== this && !otherZombie.isBoss) {
                    const distance = Math.sqrt(
                        Math.pow(otherZombie.x - this.x, 2) + Math.pow(otherZombie.y - this.y, 2)
                    );
                    if (distance < this.width / 2 + otherZombie.width / 2) {
                        // 吃掉小丧尸
                        zombies.splice(i, 1);
                        // 增加体型和生命值
                        this.width += 3;
                        this.height += 3;
                        this.health += 30;
                        break;
                    }
                }
            }
        }
        
        // 只考虑存活的玩家
        const alivePlayers = players.filter(player => player.health > 0 && !player.isDead);
        if (alivePlayers.length === 0) return; // 没有存活玩家时停止移动
        
        // 向最近的存活玩家移动
        let closestPlayer = alivePlayers[0];
        let minDistance = Infinity;
        
        alivePlayers.forEach(player => {
            const distance = Math.sqrt(
                Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestPlayer = player;
            }
        });
        
        const dx = closestPlayer.x - this.x;
        const dy = closestPlayer.y - this.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        // 计算移动向量
        const moveX = (dx / magnitude) * this.speed;
        const moveY = (dy / magnitude) * this.speed;
        
        // 检测与障碍物的碰撞
        let canMoveX = true;
        let canMoveY = true;
        
        // 检测X方向移动
        const testX = this.x + moveX;
        const testRectX = { x: testX, y: this.y, width: this.width, height: this.height };
        for (const obstacle of obstacles) {
            if (collision(testRectX, obstacle)) {
                canMoveX = false;
                break;
            }
        }
        
        // 检测Y方向移动
        const testY = this.y + moveY;
        const testRectY = { x: this.x, y: testY, width: this.width, height: this.height };
        for (const obstacle of obstacles) {
            if (collision(testRectY, obstacle)) {
                canMoveY = false;
                break;
            }
        }
        
        // 更新位置
        if (canMoveX) {
            this.x = testX;
        }
        if (canMoveY) {
            this.y = testY;
        }
    }

    draw() {
        // 绘制僵尸身体
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 绘制僵尸头部
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 3, this.width / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制僵尸眼睛
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 3, this.y + this.height / 3, this.width / 8, 0, Math.PI * 2);
        ctx.arc(this.x + 2 * this.width / 3, this.y + this.height / 3, this.width / 8, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制僵尸手臂
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 10, this.y + this.height / 2, 10, 20);
        ctx.fillRect(this.x + this.width, this.y + this.height / 2, 10, 20);
        
        // 绘制生命值条
        ctx.fillStyle = '#ff6b6b';
        const maxHealth = this.isBoss ? 400 : 50;
        ctx.fillRect(this.x, this.y - 10, this.width * (this.health / maxHealth), 5);
        
        // 绘制BOSS标识
        if (this.isBoss) {
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('BOSS', this.x + this.width / 2, this.y - 15);
        }
    }
}

// 游戏初始化
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // 初始化玩家
    players = [
        new Player(100, canvas.height / 2, '#4ecdc4', ['w', 's', 'a', 'd'], true),
        new Player(canvas.width - 140, canvas.height / 2, '#45b7d1', ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], false)
    ];
    
    // 清空数组
    zombies = [];
    bullets = [];
    damageTexts = [];
    obstacles = [];
    
    // 生成随机地形
    generateObstacles();
    
    // 事件监听
    window.addEventListener('keydown', (e) => {
        // 阻止方向键、空格键和回车键的默认行为，避免页面滚动
        if (e.key.startsWith('Arrow') || e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
        }
        
        // 对于方向键，保持原始形式
        if (e.key.startsWith('Arrow')) {
            keys[e.key] = true;
        } else {
            keys[e.key.toLowerCase()] = true;
        }
        
        // 玩家1使用空格键射击
        if (e.key === ' ' && gameRunning) {
            players[0].shoot();
        }
        
        // 玩家2使用回车键射击
        if (e.key === 'Enter' && gameRunning) {
            players[1].shoot();
        }
        
        // Q键切换自动射击模式
        if (e.key.toLowerCase() === 'q' && gameRunning) {
            players.forEach(player => {
                player.autoShoot = !player.autoShoot;
            });
        }
        
        // 作弊功能
        if (gameRunning) {
            // 数字键1：无敌模式
            if (e.key === '1') {
                godMode = !godMode;
                if (godMode) {
                    players.forEach(player => {
                        player.health = 9999;
                    });
                }
            }
            // 数字键2：怪物静止
            else if (e.key === '2') {
                freezeZombies = !freezeZombies;
            }
            // 数字键3：清屏（秒杀所有怪物）
            else if (e.key === '3') {
                zombies = [];
            }
        }
        
        // E键复活队友
        if (e.key.toLowerCase() === 'e' && gameRunning) {
            players.forEach(player => {
                if (player.health > 0 && !player.isDead && !player.isReviving) {
                    // 查找附近的死亡队友
                    const deadTeammates = players.filter(teammate => teammate.isDead && teammate !== player);
                    for (const teammate of deadTeammates) {
                        const distance = Math.sqrt(
                            Math.pow(teammate.x - player.x, 2) + Math.pow(teammate.y - player.y, 2)
                        );
                        if (distance < 50) { // 50像素范围内
                            player.isReviving = true;
                            player.reviveTarget = teammate;
                            player.reviveStartTime = Date.now();
                            break;
                        }
                    }
                }
            });
        }
    });
    
    window.addEventListener('keyup', (e) => {
        // 对于方向键，保持原始形式
        if (e.key.startsWith('Arrow')) {
            keys[e.key] = false;
        } else {
            keys[e.key.toLowerCase()] = false;
        }
    });
}

// 游戏循环
function gameLoop() {
    if (!gameRunning) return;
    
    frameCount++;
    
    // 重新绘制画布，解决拖影问题
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制障碍物
    drawObstacles();
    
    // 生成僵尸
    const now = Date.now();
    if (now - lastZombieSpawn > zombieSpawnInterval && zombies.length < maxZombies) {
        // 10%概率生成BOSS
        const isBoss = Math.random() < 0.1;
        zombies.push(new Zombie(isBoss));
        lastZombieSpawn = now;
        // 逐渐缩短生成间隔
        zombieSpawnInterval = Math.max(1000, zombieSpawnInterval - 20);
    }
    
    // 更新和绘制玩家
    players.forEach(player => {
        player.update();
        player.draw();
    });
    
    // 更新和绘制僵尸
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        zombie.update();
        zombie.draw();
        
        // 检测僵尸与玩家碰撞
        players.forEach(player => {
            if (!godMode && player.health > 0 && !player.isDead && !player.isInvulnerable && collision(zombie, player)) {
                const damage = 5;
                player.health = Math.max(0, player.health - damage);
                // 显示伤害飘字
                createDamageText(player.x + player.width / 2, player.y, damage);
                // 僵尸被击退
                zombie.x -= (zombie.x - player.x) / 10;
                zombie.y -= (zombie.y - player.y) / 10;
                // 设置无敌时间
                player.isInvulnerable = true;
                player.isFlashing = true;
                player.lastHitTime = Date.now();
                player.lastFlashTime = Date.now();
            }
        });
    }
    
    // 更新和绘制子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.direction.x * bullet.speed;
        bullet.y += bullet.direction.y * bullet.speed;
        
        ctx.fillStyle = bullet.player.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        
        let bulletHit = false;
        
        // 检测子弹与僵尸碰撞
        for (let j = zombies.length - 1; j >= 0; j--) {
            const zombie = zombies[j];
            if (collision(bullet, zombie)) {
                const damage = 25;
                zombie.health -= damage;
                // 显示伤害飘字
                createDamageText(zombie.x + zombie.width / 2, zombie.y, damage);
                bulletHit = true;
                
                if (zombie.health <= 0) {
                    zombies.splice(j, 1);
                    bullet.player.score += 10;
                }
                break;
            }
        }
        
        // 检测子弹与障碍物碰撞
        for (const obstacle of obstacles) {
            if (collision(bullet, obstacle)) {
                bulletHit = true;
                break;
            }
        }
        
        // 子弹出界或击中目标
        if (bulletHit || bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }
    
    // 更新和绘制伤害飘字
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        const text = damageTexts[i];
        text.y += text.yVelocity;
        text.opacity -= 0.01;
        text.life -= 16; // 假设60fps
        
        if (text.life <= 0) {
            damageTexts.splice(i, 1);
            continue;
        }
        
        ctx.save();
        ctx.globalAlpha = text.opacity;
        ctx.fillStyle = '#ff0000';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('-' + text.damage, text.x, text.y);
        ctx.restore();
    }
    
    // 每2帧更新一次UI，减少DOM操作
    if (frameCount % 2 === 0) {
        document.getElementById('player1Health').textContent = Math.max(0, players[0].health);
        document.getElementById('player1Score').textContent = players[0].score;
        document.getElementById('player2Health').textContent = Math.max(0, players[1].health);
        document.getElementById('player2Score').textContent = players[1].score;
    }
    
    // 检查玩家死亡
    players.forEach(player => {
        if (player.health <= 0 && !player.isDead) {
            player.isDead = true;
        }
    });
    
    // 检查游戏结束
    const alivePlayers = players.filter(player => player.health > 0 && !player.isDead);
    if (alivePlayers.length === 0) {
        endGame('游戏结束！所有玩家死亡');
    }
    
    requestAnimationFrame(gameLoop);
}

// 碰撞检测
function collision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 开始游戏
function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    gameRunning = true;
    zombieSpawnInterval = 2000;
    init();
    gameLoop();
}

// 重新开始游戏
function restartGame() {
    startGame();
}

// 结束游戏
function endGame(message) {
    gameRunning = false;
    document.getElementById('winner').textContent = message;
    document.getElementById('gameOver').style.display = 'block';
}

// 播放枪声
function playGunshot() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('Web Audio API not supported');
            return;
        }
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 枪声效果
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// 创建伤害飘字
function createDamageText(x, y, damage) {
    damageTexts.push({
        x: x,
        y: y,
        damage: damage,
        opacity: 1,
        yVelocity: -1,
        life: 1500
    });
}

// 生成随机地形
function generateObstacles() {
    obstacles = [];
    const obstacleCount = 10; // 障碍物数量
    
    for (let i = 0; i < obstacleCount; i++) {
        const width = Math.random() * 60 + 20; // 20-80之间的宽度
        const height = Math.random() * 60 + 20; // 20-80之间的高度
        const x = Math.random() * (canvas.width - width);
        const y = Math.random() * (canvas.height - height);
        
        // 确保障碍物不会生成在玩家初始位置附近
        const distanceFromPlayer1 = Math.sqrt(
            Math.pow(x - 100, 2) + Math.pow(y - canvas.height / 2, 2)
        );
        const distanceFromPlayer2 = Math.sqrt(
            Math.pow(x - (canvas.width - 140), 2) + Math.pow(y - canvas.height / 2, 2)
        );
        
        if (distanceFromPlayer1 > 100 && distanceFromPlayer2 > 100) {
            obstacles.push({
                x: x,
                y: y,
                width: width,
                height: height,
                color: '#8b4513'
            });
        }
    }
}

// 绘制障碍物
function drawObstacles() {
    obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.color;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
}

// 检测碰撞
function collision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 初始化
window.onload = init;
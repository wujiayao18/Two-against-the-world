// 游戏变量
let canvas, ctx; // 画布和上下文
let gameRunning = false; // 游戏运行状态
let players = []; // 玩家数组
let zombies = []; // 僵尸数组
let bullets = []; // 子弹数组
let damageTexts = []; // 伤害飘字
let obstacles = []; // 地形障碍物
let keys = {}; // 键盘按键状态
let mouse = { x: 0, y: 0 }; // 鼠标位置
let lastZombieSpawn = 0; // 上次生成僵尸的时间戳
let zombieSpawnInterval = 2000; // 僵尸生成间隔（毫秒）
let maxZombies = 100; // 保持不动，最大僵尸数量限制，减少僵尸数量提高性能
let frameCount = 0; // 帧计数器，用于优化绘制
let audioContext = null; // 音频上下文，用于播放音效
// 作弊功能变量
let godMode = false; // 无敌模式
let freezeZombies = false; // 怪物静止模式
let infiniteAmmo = false; // 无限子弹模式
let gameSpeed = 1.0; // 游戏速度，1.0为正常速度

// 日志功能
function addLog(message) {
    const logElement = document.getElementById('gameLog');
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    const logItem = document.createElement('div');
    logItem.textContent = logMessage;
    logElement.appendChild(logItem);
    logElement.scrollTop = logElement.scrollHeight;
    // 限制日志数量，最多显示50条
    if (logElement.children.length > 50) {
        logElement.removeChild(logElement.firstChild);
    }
}

// 游戏对象类
class Player {
    constructor(x, y, color, controls, isPlayer1) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.collisionRadius = 10; // 碰撞半径
        this.collisionType = 'player'; // 碰撞类型
        this.color = color;
        this.controls = controls;
        this.isPlayer1 = isPlayer1;
        this.health = 100;
        this.score = 0;
        this.speed = 2; // 玩家移动速度
        this.lastShot = 0;
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
        
        // 自动回血设置
        this.healthRegenRate = 1; // 每秒恢复的生命值
        this.lastHealthRegenTime = 0; // 上次回血时间
        this.healthRegenInterval = 1000; // 回血间隔（毫秒）
        
        // 武器系统
        this.weapons = {
            pistol: {
                name: '普通手枪',
                damage: 25, // 伤害值
                fireRate: 200, // 射击间隔（毫秒）
                bulletSpeed: 8, // 子弹速度
                magazineSize: -1, // -1表示无限子弹
                currentAmmo: -1, // -1表示无限子弹
                reloadTime: 1000, // 换弹时间（毫秒）
                knockback: 5 // 击退距离
            },
            magnum: {
                name: '马格南',
                damage: 50, // 伤害值
                fireRate: 400, // 射击间隔（毫秒）
                bulletSpeed: 10, // 子弹速度
                magazineSize: 6, // 弹匣容量
                currentAmmo: 6, // 当前弹药
                reloadTime: 1500, // 换弹时间（毫秒）
                knockback: 10 // 击退距离
            },
            uzi: {
                name: 'UZI冲锋枪',
                damage: 15, // 伤害值
                fireRate: 50, // 射击间隔（毫秒），加快射速
                bulletSpeed: 7, // 子弹速度
                magazineSize: 50, // 弹匣容量，增加子弹数量
                currentAmmo: 50, // 当前弹药，增加子弹数量
                reloadTime: 1200, // 换弹时间（毫秒）
                knockback: 3 // 击退距离
            },
            rifle: {
                name: '突击步枪',
                damage: 30, // 伤害值
                fireRate: 150, // 射击间隔（毫秒）
                bulletSpeed: 9, // 子弹速度
                magazineSize: 20, // 弹匣容量
                currentAmmo: 20, // 当前弹药
                reloadTime: 1300, // 换弹时间（毫秒）
                knockback: 7 // 击退距离
            },
            shotgun: {
                name: '霰弹枪',
                damage: 20, // 伤害值
                fireRate: 300, // 射击间隔（毫秒）
                bulletSpeed: 6, // 子弹速度
                magazineSize: 8, // 弹匣容量
                currentAmmo: 8, // 当前弹药
                reloadTime: 1400, // 换弹时间（毫秒）
                knockback: 8 // 击退距离
            }
        };
        this.currentWeapon = 'pistol'; // 当前使用的武器
        this.isReloading = false; // 是否正在换弹
        this.reloadStartTime = 0; // 换弹开始时间
        this.isAI = !isPlayer1; // 玩家2默认为AI
        this.aiLastDirectionChange = 0; // 上次方向改变时间
        this.aiDirectionChangeInterval = 500; // 方向改变间隔（毫秒），一秒最多转向2次
        this.aiLastShootTime = 0; // 上次射击时间
        this.aiShootInterval = 300; // 射击间隔（毫秒）
        
        // 音效
        this.sounds = {
            reload: null // 稍后初始化
        };
        
        // 尝试初始化音效
        try {
            // 创建一个简单的静音音频对象，避免浏览器自动播放限制
            this.sounds.reload = new Audio();
            this.sounds.reload.volume = 0.5;
        } catch (e) {
            console.log('音效初始化失败:', e);
        }
    }

    update() {
        // 死亡玩家不能操作
        if (this.isDead) return;
        
        // 自动回血逻辑
        const now = Date.now();
        if (now - this.lastHealthRegenTime >= this.healthRegenInterval / gameSpeed) {
            if (this.health < 100) {
                this.health = Math.min(100, this.health + this.healthRegenRate);
                this.lastHealthRegenTime = now;
            }
        }
        
        // 移动逻辑
        let moveX = 0;
        let moveY = 0;
        
        // AI行为逻辑
        if (this.isAI) {
            
            // 优先复活死亡队友
            const deadTeammates = players.filter(teammate => teammate.isDead && teammate !== this);
            if (deadTeammates.length > 0) {
                // 找到最近的死亡队友
                let closestDeadTeammate = deadTeammates[0];
                let minDistance = Infinity;
                
                for (const teammate of deadTeammates) {
                    const distance = Math.sqrt(
                        Math.pow(teammate.x - this.x, 2) + Math.pow(teammate.y - this.y, 2)
                    );
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestDeadTeammate = teammate;
                    }
                }
                
                // 向死亡队友移动
                const dx = closestDeadTeammate.x - this.x;
                const dy = closestDeadTeammate.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 50) {
                    // 向队友移动
                    const moveMagnitude = Math.min(this.speed, distance);
                    moveX = (dx / distance) * moveMagnitude;
                    moveY = (dy / distance) * moveMagnitude;
                } else {
                    // 开始复活
                    if (!this.isReviving) {
                        this.isReviving = true;
                        this.reviveTarget = closestDeadTeammate;
                        this.reviveStartTime = now;
                    }
                }
            } else {
                // 尽量靠近其他活着的玩家
                const aliveTeammates = players.filter(teammate => !teammate.isDead && teammate !== this);
                if (aliveTeammates.length > 0) {
                    // 找到最近的队友
                    let closestTeammate = aliveTeammates[0];
                    let minDistance = Infinity;
                    
                    for (const teammate of aliveTeammates) {
                        const distance = Math.sqrt(
                            Math.pow(teammate.x - this.x, 2) + Math.pow(teammate.y - this.y, 2)
                        );
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestTeammate = teammate;
                        }
                    }
                    
                    // 向队友移动，但保持一定距离
                    const dx = closestTeammate.x - this.x;
                    const dy = closestTeammate.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 80) { // 保持80像素的距离
                        const moveMagnitude = Math.min(this.speed * gameSpeed, distance - 80);
                        let intendedX = (dx / distance) * moveMagnitude;
                        let intendedY = (dy / distance) * moveMagnitude;
                        
                        // 检测移动路径上是否有障碍物
                        if (isPathBlocked(this.x, this.y, this.x + intendedX, this.y + intendedY)) {
                            // 尝试绕开障碍物
                            // 方法：随机选择一个方向尝试移动
                            const directions = [
                                { x: 1, y: 0 },  // 右
                                { x: -1, y: 0 }, // 左
                                { x: 0, y: 1 },  // 下
                                { x: 0, y: -1 }, // 上
                                { x: 1, y: 1 },  // 右下
                                { x: -1, y: 1 }, // 左下
                                { x: 1, y: -1 }, // 右上
                                { x: -1, y: -1 } // 左上
                            ];
                            
                            // 打乱方向顺序
                            for (let i = directions.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [directions[i], directions[j]] = [directions[j], directions[i]];
                            }
                            
                            // 尝试找到一个可行的方向
                            let foundPath = false;
                            for (const dir of directions) {
                                const testX = this.x + dir.x * this.speed * gameSpeed;
                                const testY = this.y + dir.y * this.speed * gameSpeed;
                                if (!isPathBlocked(this.x, this.y, testX, testY)) {
                                    moveX = dir.x * this.speed * gameSpeed;
                                    moveY = dir.y * this.speed * gameSpeed;
                                    foundPath = true;
                                    break;
                                }
                            }
                            
                            // 如果没有找到可行方向，尝试向远离障碍物的方向移动
                            if (!foundPath) {
                                moveX = intendedX * 0.5;
                                moveY = intendedY * 0.5;
                            }
                        } else {
                            // 路径畅通，正常移动
                            moveX = intendedX;
                            moveY = intendedY;
                        }
                    } else {
                        // 靠近队友时，保持静止，避免抖动
                        moveX = 0;
                        moveY = 0;
                    }
                }
                
                // 主动攻击丧尸
                const aliveZombies = zombies.filter(zombie => zombie.health > 0);
                if (aliveZombies.length > 0) {
                    // 找到最近且在视线范围内的丧尸
                    let closestZombie = null;
                    let minDistance = Infinity;
                    
                    for (const zombie of aliveZombies) {
                        const distance = Math.sqrt(
                            Math.pow(zombie.x - this.x, 2) + Math.pow(zombie.y - this.y, 2)
                        );
                        
                        // 只考虑攻击范围内的丧尸
                        if (distance < 200) {
                            // 检查是否有障碍物阻挡
                            if (!isPathBlocked(this.x, this.y, zombie.x, zombie.y)) {
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    closestZombie = zombie;
                                }
                            }
                        }
                    }
                    
                    // 如果找到合适的目标
                    if (closestZombie) {
                        // 向丧尸方向射击
                        const dx = closestZombie.x - this.x;
                        const dy = closestZombie.y - this.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // 检查是否靠近队友
                        let nearTeammate = false;
                        const aliveTeammates = players.filter(teammate => !teammate.isDead && teammate !== this);
                        if (aliveTeammates.length > 0) {
                            for (const teammate of aliveTeammates) {
                                const teammateDistance = Math.sqrt(
                                    Math.pow(teammate.x - this.x, 2) + Math.pow(teammate.y - this.y, 2)
                                );
                                if (teammateDistance < 100) {
                                    nearTeammate = true;
                                    break;
                                }
                            }
                        }
                        
                        // 根据距离调整转向频率
                        let adjustedDirectionChangeInterval = this.aiDirectionChangeInterval;
                        if (distance < 30) {
                            // 距离小于30像素时，转向频率降低为原来的3倍
                            adjustedDirectionChangeInterval = this.aiDirectionChangeInterval * 3;
                        } else if (distance < 50) {
                            // 距离小于50像素时，转向频率降低为原来的2倍
                            adjustedDirectionChangeInterval = this.aiDirectionChangeInterval * 2;
                        }
                        
                        // 限制转向频率
                        if (now - this.aiLastDirectionChange > adjustedDirectionChangeInterval) {
                            // 更新方向
                            this.direction = { x: dx / distance, y: dy / distance };
                            this.aiLastDirectionChange = now;
                        }
                        
                        // 限制射击频率
                        if (now - this.aiLastShootTime > this.aiShootInterval / gameSpeed) {
                            // 射击
                            this.shoot();
                            this.aiLastShootTime = now;
                        }
                    }
                }
                
                // 确保AI不会停止移动，但靠近队友时除外
                if (moveX === 0 && moveY === 0) {
                    // 检查是否靠近队友
                    let nearTeammate = false;
                    const aliveTeammates = players.filter(teammate => !teammate.isDead && teammate !== this);
                    if (aliveTeammates.length > 0) {
                        for (const teammate of aliveTeammates) {
                            const teammateDistance = Math.sqrt(
                                Math.pow(teammate.x - this.x, 2) + Math.pow(teammate.y - this.y, 2)
                            );
                            if (teammateDistance < 100) {
                                nearTeammate = true;
                                break;
                            }
                        }
                    }
                    // 只有在不靠近队友时才随机移动
                    if (!nearTeammate) {
                        const angle = Math.random() * Math.PI * 2;
                        moveX = Math.cos(angle) * this.speed;
                        moveY = Math.sin(angle) * this.speed;
                    }
                }
            }
        } else {
            // 玩家控制逻辑
            if (this.isPlayer1) {
                if (keys['w']) moveY -= this.speed * gameSpeed;
                if (keys['s']) moveY += this.speed * gameSpeed;
                if (keys['a']) moveX -= this.speed * gameSpeed;
                if (keys['d']) moveX += this.speed * gameSpeed;
            } else {
                if (keys['ArrowUp']) moveY -= this.speed * gameSpeed;
                if (keys['ArrowDown']) moveY += this.speed * gameSpeed;
                if (keys['ArrowLeft']) moveX -= this.speed * gameSpeed;
                if (keys['ArrowRight']) moveX += this.speed * gameSpeed;
            }
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
        const testRectX = { x: testX, y: this.y, width: this.width, height: this.height, collisionRadius: this.collisionRadius };
        for (const obstacle of obstacles) {
            if (collisionWithVolume(testRectX, obstacle)) {
                canMoveX = false;
                break;
            }
        }
        
        // 检测与其他玩家的碰撞
        if (canMoveX) {
            for (const player of players) {
                if (player !== this && !player.isDead) {
                    if (collisionWithVolume(testRectX, player)) {
                        canMoveX = false;
                        break;
                    }
                }
            }
        }
        
        // 检测与僵尸的碰撞
        if (canMoveX) {
            for (const zombie of zombies) {
                if (collisionWithVolume(testRectX, zombie)) {
                    canMoveX = false;
                    // 推开僵尸 - 限制推挤距离，但无法推开BOSS，AI玩家不会推开僵尸，并检查是否会被推入地形
                    if (!zombie.isBoss && !this.isAI) {
                        const pushDistance = Math.min(3, Math.abs(moveX) * 2);
                        if (moveX > 0) {
                            const newX = Math.min(canvas.width - zombie.width, zombie.x + pushDistance);
                            // 检查新位置是否会与障碍物碰撞
                            const testZombieX = { x: newX, y: zombie.y, width: zombie.width, height: zombie.height, collisionRadius: zombie.collisionRadius };
                            let canPush = true;
                            for (const obstacle of obstacles) {
                                if (collisionWithVolume(testZombieX, obstacle)) {
                                    canPush = false;
                                    break;
                                }
                            }
                            if (canPush) {
                                zombie.x = newX;
                            }
                        } else if (moveX < 0) {
                            const newX = Math.max(0, zombie.x - pushDistance);
                            // 检查新位置是否会与障碍物碰撞
                            const testZombieX = { x: newX, y: zombie.y, width: zombie.width, height: zombie.height, collisionRadius: zombie.collisionRadius };
                            let canPush = true;
                            for (const obstacle of obstacles) {
                                if (collisionWithVolume(testZombieX, obstacle)) {
                                    canPush = false;
                                    break;
                                }
                            }
                            if (canPush) {
                                zombie.x = newX;
                            }
                        }
                    }
                    break;
                }
            }
        }
        
        // 检测Y方向移动
        const testY = this.y + moveY;
        const testRectY = { x: this.x, y: testY, width: this.width, height: this.height, collisionRadius: this.collisionRadius };
        for (const obstacle of obstacles) {
            if (collisionWithVolume(testRectY, obstacle)) {
                canMoveY = false;
                break;
            }
        }
        
        // 检测与其他玩家的碰撞
        if (canMoveY) {
            for (const player of players) {
                if (player !== this && !player.isDead) {
                    if (collisionWithVolume(testRectY, player)) {
                        canMoveY = false;
                        break;
                    }
                }
            }
        }
        
        // 检测与僵尸的碰撞
        if (canMoveY) {
            for (const zombie of zombies) {
                if (collisionWithVolume(testRectY, zombie)) {
                    canMoveY = false;
                    // 推开僵尸 - 限制推挤距离，但无法推开BOSS，AI玩家不会推开僵尸，并检查是否会被推入地形
                    if (!zombie.isBoss && !this.isAI) {
                        const pushDistance = Math.min(3, Math.abs(moveY) * 2);
                        if (moveY > 0) {
                            const newY = Math.min(canvas.height - zombie.height, zombie.y + pushDistance);
                            // 检查新位置是否会与障碍物碰撞
                            const testZombieY = { x: zombie.x, y: newY, width: zombie.width, height: zombie.height, collisionRadius: zombie.collisionRadius };
                            let canPush = true;
                            for (const obstacle of obstacles) {
                                if (collisionWithVolume(testZombieY, obstacle)) {
                                    canPush = false;
                                    break;
                                }
                            }
                            if (canPush) {
                                zombie.y = newY;
                            }
                        } else if (moveY < 0) {
                            const newY = Math.max(0, zombie.y - pushDistance);
                            // 检查新位置是否会与障碍物碰撞
                            const testZombieY = { x: zombie.x, y: newY, width: zombie.width, height: zombie.height, collisionRadius: zombie.collisionRadius };
                            let canPush = true;
                            for (const obstacle of obstacles) {
                                if (collisionWithVolume(testZombieY, obstacle)) {
                                    canPush = false;
                                    break;
                                }
                            }
                            if (canPush) {
                                zombie.y = newY;
                            }
                        }
                    }
                    break;
                }
            }
        }
        
        // 更新位置 - 使用滑动机制
        if (canMoveX && canMoveY) {
            // 两个方向都可以移动
            if (canMoveX) {
                this.x = Math.max(0, Math.min(canvas.width - this.width, testX));
            }
            if (canMoveY) {
                this.y = Math.max(0, Math.min(canvas.height - this.height, testY));
            }
        } else if (canMoveX && !canMoveY) {
            // 只有X方向可以移动
            this.x = Math.max(0, Math.min(canvas.width - this.width, testX));
        } else if (!canMoveX && canMoveY) {
            // 只有Y方向可以移动
            this.y = Math.max(0, Math.min(canvas.height - this.height, testY));
        }
        // 如果两个方向都不能移动，玩家保持原地
        
        // 更新方向
        if (moveX !== 0 || moveY !== 0) {
            // AI玩家在靠近队友时不根据移动向量更新朝向
            if (!this.isAI) {
                const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
                this.direction = { x: moveX / magnitude, y: moveY / magnitude };
            } else {
                // 检查是否靠近队友
                let nearTeammate = false;
                const aliveTeammates = players.filter(teammate => !teammate.isDead && teammate !== this);
                if (aliveTeammates.length > 0) {
                    for (const teammate of aliveTeammates) {
                        const teammateDistance = Math.sqrt(
                            Math.pow(teammate.x - this.x, 2) + Math.pow(teammate.y - this.y, 2)
                        );
                        if (teammateDistance < 100) {
                            nearTeammate = true;
                            break;
                        }
                    }
                }
                // 靠近队友时，不根据移动向量更新朝向，避免抖动
                if (!nearTeammate) {
                    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
                    this.direction = { x: moveX / magnitude, y: moveY / magnitude };
                }
            }
        }
        
        // 处理无敌时间
        if (this.isInvulnerable && now - this.lastHitTime > this.invulnerabilityDuration / gameSpeed) {
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
        
        // 处理换弹逻辑
        if (this.isReloading) {
            const weapon = this.weapons[this.currentWeapon];
            if (now - this.reloadStartTime > weapon.reloadTime / gameSpeed) {
                weapon.currentAmmo = weapon.magazineSize;
                this.isReloading = false;
                addLog(`玩家${this.isPlayer1 ? '1' : '2'}换弹完成 - ${weapon.name}`);
            }
        }
        
        // 自动复活逻辑（AI已在上面处理，这里处理玩家）
        if (!this.isAI && this.health > 0 && !this.isDead && !this.isReviving) {
            // 查找附近的死亡队友
            const deadTeammates = players.filter(teammate => teammate.isDead && teammate !== this);
            for (const teammate of deadTeammates) {
                const distance = Math.sqrt(
                    Math.pow(teammate.x - this.x, 2) + Math.pow(teammate.y - this.y, 2)
                );
                if (distance < 50) { // 50像素范围内
                    this.isReviving = true;
                    this.reviveTarget = teammate;
                    this.reviveStartTime = now;
                    break;
                }
            }
        } else if (this.isReviving && this.reviveTarget) {
            // 检查是否仍然在死亡队友附近
            const distance = Math.sqrt(
                Math.pow(this.reviveTarget.x - this.x, 2) + Math.pow(this.reviveTarget.y - this.y, 2)
            );
            if (distance > 50) { // 超过50像素范围，中断复活
                this.isReviving = false;
                this.reviveTarget = null;
            } else if (now - this.reviveStartTime > this.reviveDuration / gameSpeed) {
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
        if (this.autoShoot && this.health > 0 && !this.isDead && !this.isReviving && !this.isAI) {
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
            ctx.fillText('靠近复活', this.x + this.width / 2, this.y - 5);
        }
        
        // 绘制生命值条
        if (!this.isDead) {
            ctx.fillStyle = '#4caf50';
            const healthPercentage = godMode ? 1 : Math.max(0, this.health) / 100;
            ctx.fillRect(this.x, this.y - 10, this.width * healthPercentage, 5);
        }
        
        // 绘制武器信息和弹药数量（在血条上方）
        if (!this.isDead) {
            const weapon = this.weapons[this.currentWeapon];
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(weapon.name, this.x + this.width / 2, this.y - 25);
            
            // 绘制弹药信息
            let ammoText;
            if (this.isReloading) {
                ammoText = '换弹中';
                ctx.fillStyle = '#ff6b6b'; // 红色文字
            } else {
                ammoText = weapon.magazineSize === -1 ? '∞' : `${weapon.currentAmmo}/${weapon.magazineSize}`;
                ctx.fillStyle = '#ffffff'; // 白色文字
            }
            ctx.fillText(ammoText, this.x + this.width / 2, this.y - 15);
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
        const weapon = this.weapons[this.currentWeapon];
        
        // 检查是否可以射击
        if (now - this.lastShot < weapon.fireRate / gameSpeed || this.isDead || this.isReviving || this.isReloading) return;
        
        // 检查弹药（如果不是无限子弹且不在无限子弹模式下）
        if (weapon.currentAmmo === 0 && !infiniteAmmo) {
            // 自动换弹
            this.reload();
            return;
        }
        
        this.lastShot = now;
        
        // 消耗弹药（如果不是无限子弹且不在无限子弹模式下）
        if (weapon.currentAmmo > 0 && !infiniteAmmo) {
            weapon.currentAmmo--;
        }
        
        // 使用当前朝向射击
        const direction = this.direction;
        
        // 霰弹枪特殊处理
        if (this.currentWeapon === 'shotgun') {
            // 霰弹枪发射5发子弹，呈扇形分布
            for (let i = -2; i <= 2; i++) {
                const angle = i * 0.1; // 每发子弹的角度偏移
                const shotDirection = {
                    x: direction.x * Math.cos(angle) - direction.y * Math.sin(angle),
                    y: direction.x * Math.sin(angle) + direction.y * Math.cos(angle)
                };
                
                bullets.push({
                    x: this.x + this.width / 2 - 2,
                    y: this.y + this.height / 2 - 2,
                    width: 4,
                    height: 4,
                    collisionRadius: 2, // 子弹碰撞半径
                    collisionType: 'bullet', // 碰撞类型
                    speed: weapon.bulletSpeed,
                    direction: shotDirection,
                    player: this,
                    damage: weapon.damage // 添加伤害属性
                });
            }
        } else {
            // 其他武器发射单发子弹
            bullets.push({
                x: this.x + this.width / 2 - 2,
                y: this.y + this.height / 2 - 2,
                width: 4,
                height: 4,
                collisionRadius: 2, // 子弹碰撞半径
                collisionType: 'bullet', // 碰撞类型
                speed: weapon.bulletSpeed,
                direction: direction,
                player: this,
                damage: weapon.damage // 添加伤害属性
            });
        }
        
        // 播放枪声
        playGunshot();
    }
    
    // 换弹方法
    reload() {
        const weapon = this.weapons[this.currentWeapon];
        
        // 无限子弹不需要换弹
        if (weapon.magazineSize === -1 || infiniteAmmo) return;
        
        // 已经在换弹中
        if (this.isReloading) return;
        
        // 弹药已满
        if (weapon.currentAmmo === weapon.magazineSize) return;
        
        this.isReloading = true;
        this.reloadStartTime = Date.now();
        addLog(`玩家${this.isPlayer1 ? '1' : '2'}正在换弹 - ${weapon.name}`);
        
        // 播放换弹音效
        try {
            this.sounds.reload.currentTime = 0;
            this.sounds.reload.play().catch(e => console.log('音效播放失败:', e));
        } catch (e) {
            console.log('音效初始化失败:', e);
        }
    }
    
    // 切换武器方法
    switchWeapon(weaponName) {
        if (this.weapons[weaponName]) {
            this.currentWeapon = weaponName;
            addLog(`玩家${this.isPlayer1 ? '1' : '2'}切换到 ${this.weapons[weaponName].name}`);
        }
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
            this.collisionRadius = 20; // BOSS僵尸碰撞半径
            this.collisionType = 'zombie'; // 碰撞类型
            this.color = '#ff6b6b';
            this.speed = 0.08; // BOSS僵尸移动速度
            this.health = 400;
            this.turnSpeed = 0.01; // BOSS僵尸转向速度
        } else {
            this.width = 21;
            this.height = 21;
            this.collisionRadius = 10; // 普通僵尸碰撞半径
            this.collisionType = 'zombie'; // 碰撞类型
            this.color = '#4caf50';
            this.speed = 0.2; // 普通僵尸移动速度
            this.health = 50;
            this.turnSpeed = 0.015; // 普通僵尸转向速度
        }
        
        // 朝向属性
        this.direction = { x: 0, y: -1 }; // 默认向上
        this.facingAngle = Math.atan2(this.direction.y, this.direction.x); // 当前朝向角度
        this.targetAngle = this.facingAngle; // 目标朝向角度
        this.turnDirection = 1; // 转向方向：1为顺时针，-1为逆时针
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
        
        // 计算目标朝向角度
        this.targetAngle = Math.atan2(dy, dx);
        
        // 平滑转向
        let angleDiff = this.targetAngle - this.facingAngle;
        
        // 规范化角度差到[-π, π]范围内
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // 确定转向方向
        if (angleDiff > 0) {
            this.turnDirection = 1; // 顺时针
        } else {
            this.turnDirection = -1; // 逆时针
        }
        
        // 平滑转向
        if (Math.abs(angleDiff) > this.turnSpeed) {
            this.facingAngle += this.turnDirection * this.turnSpeed;
        } else {
            this.facingAngle = this.targetAngle;
        }
        
        // 更新朝向向量
        this.direction = {
            x: Math.cos(this.facingAngle),
            y: Math.sin(this.facingAngle)
        };
        
        // 计算移动向量
        const moveX = (dx / magnitude) * this.speed * gameSpeed;
        const moveY = (dy / magnitude) * this.speed * gameSpeed;
        
        // 检测与障碍物的碰撞
        let canMoveX = true;
        let canMoveY = true;
        
        // 检测X方向移动
        const testX = this.x + moveX;
        const testRectX = { x: testX, y: this.y, width: this.width, height: this.height, collisionRadius: this.collisionRadius };
        for (const obstacle of obstacles) {
            if (collisionWithVolume(testRectX, obstacle)) {
                canMoveX = false;
                break;
            }
        }
        
        // 检测与玩家的碰撞
        if (canMoveX) {
            for (const player of players) {
                if (!player.isDead && collisionWithVolume(testRectX, player)) {
                    canMoveX = false;
                    // 推开玩家 - 限制推挤距离，并检查是否会被推入地形
                    const pushDistance = Math.min(2, Math.abs(moveX) * 1.5);
                    if (moveX > 0) {
                        const newX = Math.min(canvas.width - player.width, player.x + pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testPlayerX = { x: newX, y: player.y, width: player.width, height: player.height, collisionRadius: player.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testPlayerX, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        if (canPush) {
                            player.x = newX;
                        }
                    } else if (moveX < 0) {
                        const newX = Math.max(0, player.x - pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testPlayerX = { x: newX, y: player.y, width: player.width, height: player.height, collisionRadius: player.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testPlayerX, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        if (canPush) {
                            player.x = newX;
                        }
                    }
                    break;
                }
            }
        }
        
        // 检测与其他僵尸的碰撞
        if (canMoveX) {
            for (const zombie of zombies) {
                if (zombie !== this && collisionWithVolume(testRectX, zombie)) {
                    canMoveX = false;
                    // 推开其他僵尸 - 限制推挤距离，并检查是否会被推入地形
                    const pushDistance = Math.min(1, Math.abs(moveX));
                    if (moveX > 0) {
                        const newX = Math.min(canvas.width - zombie.width, zombie.x + pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testZombieX = { x: newX, y: zombie.y, width: zombie.width, height: zombie.height, collisionRadius: zombie.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testZombieX, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        if (canPush) {
                            zombie.x = newX;
                        }
                    } else if (moveX < 0) {
                        const newX = Math.max(0, zombie.x - pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testZombieX = { x: newX, y: zombie.y, width: zombie.width, height: zombie.height, collisionRadius: zombie.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testZombieX, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        if (canPush) {
                            zombie.x = newX;
                        }
                    }
                    break;
                }
            }
        }
        
        // 检测Y方向移动
        const testY = this.y + moveY;
        const testRectY = { x: this.x, y: testY, width: this.width, height: this.height, collisionRadius: this.collisionRadius };
        for (const obstacle of obstacles) {
            if (collisionWithVolume(testRectY, obstacle)) {
                canMoveY = false;
                break;
            }
        }
        
        // 检测与玩家的碰撞
        if (canMoveY) {
            for (const player of players) {
                if (!player.isDead && collisionWithVolume(testRectY, player)) {
                    canMoveY = false;
                    // 推开玩家 - 限制推挤距离，并检查是否会被推入地形
                    const pushDistance = Math.min(2, Math.abs(moveY) * 1.5);
                    if (moveY > 0) {
                        const newY = Math.min(canvas.height - player.height, player.y + pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testPlayerY = { x: player.x, y: newY, width: player.width, height: player.height, collisionRadius: player.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testPlayerY, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        if (canPush) {
                            player.y = newY;
                        }
                    } else if (moveY < 0) {
                        const newY = Math.max(0, player.y - pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testPlayerY = { x: player.x, y: newY, width: player.width, height: player.height, collisionRadius: player.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testPlayerY, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        if (canPush) {
                            player.y = newY;
                        }
                    }
                    break;
                }
            }
        }
        
        // 检测与其他僵尸的碰撞
        if (canMoveY) {
            for (const zombie of zombies) {
                if (zombie !== this && collisionWithVolume(testRectY, zombie)) {
                    canMoveY = false;
                    // 推开其他僵尸 - 限制推挤距离，并检查是否会被推入地形
                    const pushDistance = Math.min(1, Math.abs(moveY));
                    if (moveY > 0) {
                        const newY = Math.min(canvas.height - zombie.height, zombie.y + pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testZombieY = { x: zombie.x, y: newY, width: zombie.width, height: zombie.height, collisionRadius: zombie.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testZombieY, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        if (canPush) {
                            zombie.y = newY;
                        }
                    } else if (moveY < 0) {
                        const newY = Math.max(0, zombie.y - pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testZombieY = { x: zombie.x, y: newY, width: zombie.width, height: zombie.height, collisionRadius: zombie.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testZombieY, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        if (canPush) {
                            zombie.y = newY;
                        }
                    }
                    break;
                }
            }
        }
        
        // 更新位置 - 使用滑动机制
        if (canMoveX && canMoveY) {
            // 两个方向都可以移动
            this.x = testX;
            this.y = testY;
        } else if (canMoveX && !canMoveY) {
            // 只有X方向可以移动
            this.x = testX;
        } else if (!canMoveX && canMoveY) {
            // 只有Y方向可以移动
            this.y = testY;
        }
        // 如果两个方向都不能移动，僵尸保持原地
    }

    draw() {
        ctx.save();
        
        // 将坐标系原点移动到僵尸中心
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        ctx.translate(centerX, centerY);
        
        // 旋转整个僵尸（额外旋转90度）
        ctx.rotate(this.facingAngle + Math.PI / 2);
        
        // 绘制僵尸身体
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // 绘制僵尸头部 - 椭圆形，窄边对着前方（Y轴负方向）
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.ellipse(0, -this.height / 2 - this.width / 8, this.width / 8, this.width / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制僵尸眼睛 - 在头部前方，左右排列
        ctx.fillStyle = '#ff0000';
        const eyeOffset = this.width / 8;
        const eyeX = 0;
        const eyeY = -this.height / 2 - this.width / 8;
        const eyeRadius = this.width / 8;
        
        ctx.beginPath();
        ctx.arc(eyeX - eyeOffset, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.arc(eyeX + eyeOffset, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制僵尸手臂 - 向前伸出
        ctx.fillStyle = this.color;
        const armLength = 25;
        const armWidth = 10;
        const armXOffset = this.width / 1.25;
        const armYOffset = -this.height / 2 + 10;
        
        // 左手臂 - 从身体左侧向前伸出
        ctx.beginPath();
        ctx.moveTo(-armXOffset, armYOffset);
        ctx.lineTo(-armXOffset, armYOffset - armLength);
        ctx.lineTo(-armXOffset + armWidth, armYOffset - armLength);
        ctx.lineTo(-armXOffset + armWidth, armYOffset);
        ctx.closePath();
        ctx.fill();
        
        // 右手臂 - 从身体右侧向前伸出
        ctx.beginPath();
        ctx.moveTo(armXOffset - armWidth, armYOffset);
        ctx.lineTo(armXOffset - armWidth, armYOffset - armLength);
        ctx.lineTo(armXOffset, armYOffset - armLength);
        ctx.lineTo(armXOffset, armYOffset);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // 绘制生命值条（不旋转）
        ctx.fillStyle = '#ff6b6b';
        const maxHealth = this.isBoss ? 400 : 50;
        ctx.fillRect(this.x, this.y - 10, this.width * (this.health / maxHealth), 5);
        
        // 绘制BOSS标识（不旋转）
        if (this.isBoss) {
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('BOSS', this.x + this.width / 2, this.y - 15);
        }
    }
}

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
    
    // Q键：上一个武器
    if (e.key.toLowerCase() === 'q' && gameRunning) {
        players.forEach(player => {
            const weaponNames = Object.keys(player.weapons);
            const currentIndex = weaponNames.indexOf(player.currentWeapon);
            const prevIndex = (currentIndex - 1 + weaponNames.length) % weaponNames.length;
            player.switchWeapon(weaponNames[prevIndex]);
        });
    }
    
    // E键：下一个武器
    if (e.key.toLowerCase() === 'e' && gameRunning) {
        players.forEach(player => {
            const weaponNames = Object.keys(player.weapons);
            const currentIndex = weaponNames.indexOf(player.currentWeapon);
            const nextIndex = (currentIndex + 1) % weaponNames.length;
            player.switchWeapon(weaponNames[nextIndex]);
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
                addLog('启用无敌模式');
            } else {
                players.forEach(player => {
                    player.health = 100;
                });
                addLog('禁用无敌模式');
            }
        }
        // 数字键2：怪物静止
        else if (e.key === '2') {
            freezeZombies = !freezeZombies;
            addLog(freezeZombies ? '启用怪物静止模式' : '禁用怪物静止模式');
        }
        // 数字键3：清屏（秒杀所有怪物）
        else if (e.key === '3') {
            zombies = [];
            addLog('清屏：秒杀所有怪物');
        }
        // 数字键4：自动射击
        else if (e.key === '4') {
            players.forEach(player => {
                player.autoShoot = !player.autoShoot;
            });
            addLog(players[0].autoShoot ? '启用自动射击' : '禁用自动射击');
        }
        // 数字键5：无限子弹
        else if (e.key === '5') {
            infiniteAmmo = !infiniteAmmo;
            addLog(infiniteAmmo ? '启用无限子弹模式' : '禁用无限子弹模式');
        }
        // 加号键：加速游戏
        else if (e.key === '+' || e.key === '=') {
            gameSpeed = Math.min(5.0, gameSpeed + 1);
            addLog(`游戏速度: ${gameSpeed.toFixed(0)}x`);
        }
        // 减号键：减速游戏
        else if (e.key === '-' || e.key === '_') {
            gameSpeed = Math.max(1.0, gameSpeed - 1);
            addLog(`游戏速度: ${gameSpeed.toFixed(0)}x`);
        }
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

// 游戏初始化
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // 初始化玩家
    players = [
        new Player(100, canvas.height / 2, '#ff6b6b', ['w', 's', 'a', 'd'], true),
        new Player(canvas.width - 140, canvas.height / 2, '#45b7d1', ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], false)
    ];
    
    // 清空数组
    zombies = [];
    bullets = [];
    damageTexts = [];
    obstacles = [];
    
    // 生成随机地形
    generateObstacles();
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
    if (now - lastZombieSpawn > zombieSpawnInterval / gameSpeed && zombies.length < maxZombies) {
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
            if (player.health > 0 && !player.isDead && collisionWithVolume(zombie, player)) {
                if (!godMode && !player.isInvulnerable) {
                    // 检查僵尸是否正面对着玩家
                    const zombieToPlayer = {
                        x: player.x + player.width / 2 - (zombie.x + zombie.width / 2),
                        y: player.y + player.height / 2 - (zombie.y + zombie.height / 2)
                    };
                    
                    // 计算距离
                    const distance = Math.sqrt(
                        zombieToPlayer.x * zombieToPlayer.x + zombieToPlayer.y * zombieToPlayer.y
                    );
                    
                    // 归一化向量
                    const normalizedZombieToPlayer = {
                        x: zombieToPlayer.x / distance,
                        y: zombieToPlayer.y / distance
                    };
                    
                    // 计算点积
                    const dotProduct = zombie.direction.x * normalizedZombieToPlayer.x + 
                                     zombie.direction.y * normalizedZombieToPlayer.y;
                    
                    // 只有当僵尸正面对着玩家时才造成伤害（点积大于0.7，约45度角内）
                    if (dotProduct > 0.7) {
                        const damage = 5;
                        player.health = Math.max(0, player.health - damage);
                        // 显示伤害飘字
                        createDamageText(player.x + player.width / 2, player.y, damage);
                        // 设置无敌时间
                        player.isInvulnerable = true;
                        player.isFlashing = true;
                        player.lastHitTime = Date.now();
                        player.lastFlashTime = Date.now();
                        // 非无敌模式下执行僵尸击退（除非静止模式）
                        if (!freezeZombies) {
                            // 僵尸被击退
                            zombie.x -= (zombie.x - player.x) / 10;
                            zombie.y -= (zombie.y - player.y) / 10;
                        }
                    }
                }
            }
        });
    }
    
    // 更新和绘制子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.direction.x * bullet.speed * gameSpeed;
        bullet.y += bullet.direction.y * bullet.speed * gameSpeed;
        
        ctx.fillStyle = bullet.player.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        
        let bulletHit = false;
        
        // 检测子弹与僵尸碰撞
        for (let j = zombies.length - 1; j >= 0; j--) {
            const zombie = zombies[j];
            if (collisionWithVolume(bullet, zombie)) {
                const damage = bullet.damage || 25; // 使用子弹的伤害属性，如果没有则使用默认值25
                zombie.health -= damage;
                // 显示伤害飘字
                createDamageText(zombie.x + zombie.width / 2, zombie.y, damage);
                bulletHit = true;
                
                // 计算击退效果
                if (!freezeZombies) {
                    // 获取武器的击退距离
                    const weapon = bullet.player.weapons[bullet.player.currentWeapon];
                    let knockbackDistance = weapon.knockback || 5;
                    
                    // BOSS僵尸的击退效果减半
                    if (zombie.isBoss) {
                        knockbackDistance *= 0.5;
                    }
                    
                    // 计算击退方向（与子弹方向相同）
                    const knockbackX = bullet.direction.x * knockbackDistance;
                    const knockbackY = bullet.direction.y * knockbackDistance;
                    
                    // 应用击退
                    zombie.x += knockbackX;
                    zombie.y += knockbackY;
                }
                
                if (zombie.health <= 0) {
                    zombies.splice(j, 1);
                    bullet.player.score += 10;
                }
                break;
            }
        }
        
        // 检测子弹与障碍物碰撞
        for (let j = obstacles.length - 1; j >= 0; j--) {
            const obstacle = obstacles[j];
            if (collisionWithVolume(bullet, obstacle)) {
                // 木墙可以被破坏，石墙不可以
                if (obstacle.type === 'wood') {
                    obstacle.health -= bullet.damage || 25;
                    if (obstacle.health <= 0) {
                        obstacles.splice(j, 1);
                    }
                }
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
        ctx.fillStyle = text.color;
        ctx.font = text.size + 'px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text.damage === '死亡' ? text.damage : '-' + text.damage, text.x, text.y);
        ctx.restore();
    }
    
    // 每2帧更新一次UI，减少DOM操作
    if (frameCount % 2 === 0) {
        document.getElementById('player1Health').textContent = godMode ? 100 : Math.max(0, players[0].health);
        document.getElementById('player1Score').textContent = players[0].score;
        document.getElementById('player2Health').textContent = godMode ? 100 : Math.max(0, players[1].health);
        document.getElementById('player2Score').textContent = players[1].score;
        document.getElementById('zombieCount').textContent = zombies.length;
    }
    
    // 检查玩家死亡
    players.forEach(player => {
        if (player.health <= 0 && !player.isDead) {
            player.isDead = true;
            // 显示死亡提示
            createDamageText(player.x + player.width / 2, player.y, '死亡', '#ff0000', 30);
            // 记录死亡日志
            addLog(`玩家${player.isPlayer1 ? '1' : '2'}死亡`);
        }
    });
    
    // 检查游戏结束
    const alivePlayers = players.filter(player => player.health > 0 && !player.isDead);
    if (alivePlayers.length === 0) {
        endGame('游戏结束！所有玩家死亡');
    }
    
    requestAnimationFrame(gameLoop);
}

// 碰撞检测 - 矩形碰撞（备用）
function collision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 基于碰撞体积的碰撞检测 - 圆形碰撞
function collisionWithVolume(obj1, obj2) {
    // 计算两个对象中心之间的距离
    const dx = (obj1.x + obj1.width / 2) - (obj2.x + obj2.width / 2);
    const dy = (obj1.y + obj1.height / 2) - (obj2.y + obj2.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 检查两个对象的碰撞半径之和是否大于距离
    const radius1 = obj1.collisionRadius || Math.min(obj1.width, obj1.height) / 2;
    const radius2 = obj2.collisionRadius || Math.min(obj2.width, obj2.height) / 2;
    
    return distance < (radius1 + radius2);
}

// 开始游戏
function startGame() {
    console.log('startGame called');
    try {
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOver').style.display = 'none';
        gameRunning = true;
        zombieSpawnInterval = 2000;
        init();
        gameLoop();
        addLog('游戏开始');
        console.log('Game started successfully');
    } catch (e) {
        console.error('Error starting game:', e);
    }
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
function createDamageText(x, y, damage, color = '#ff0000', size = 16) {
    damageTexts.push({
        x: x,
        y: y,
        damage: damage,
        color: color,
        size: size,
        opacity: 1,
        yVelocity: -1,
        life: 1500
    });
}

// 墙体配置参数
const WALL_CONFIG = {
    obstacleCount: 60, // 障碍物总数量
    unitSize: 30, // 最小地形单元大小
    stoneWallProbability: 0.6, // 石墙生成概率（60%）
    woodWallProbability: 0.4, // 木墙生成概率（40%）
    stoneWallColor: '#666666', // 石墙颜色（灰色）
    woodWallColor: '#8b4513', // 木墙颜色（棕色）
    woodWallHealth: 100, // 木墙初始生命值
    stoneWallHealth: -1, // 石墙生命值（-1表示不可破坏）
    minUnits: 1, // 最小单元数
    maxUnits: 3, // 最大单元数
    safeDistance: 100, // 玩家初始位置的安全距离
    isolationProbability: 0, // 孤立墙体的概率（0%，完全杜绝）
    maxConnections: 2 // 最大连接面数
};

// 检测路径是否被障碍物阻挡
function isPathBlocked(x1, y1, x2, y2) {
    // 检查路径上是否与障碍物相交
    for (const obstacle of obstacles) {
        // 简化的碰撞检测：检查线段是否与障碍物矩形相交
        if (lineIntersectsRect(x1, y1, x2, y2, obstacle)) {
            return true;
        }
    }
    return false;
}

// 检测线段是否与矩形相交
function lineIntersectsRect(x1, y1, x2, y2, rect) {
    // 矩形的四个边
    const rectLines = [
        // 上边
        { x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y },
        // 下边
        { x1: rect.x, y1: rect.y + rect.height, x2: rect.x + rect.width, y2: rect.y + rect.height },
        // 左边
        { x1: rect.x, y1: rect.y, x2: rect.x, y2: rect.y + rect.height },
        // 右边
        { x1: rect.x + rect.width, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height }
    ];
    
    // 检查线段是否与矩形的任何边相交
    for (const line of rectLines) {
        if (doLinesIntersect(x1, y1, x2, y2, line.x1, line.y1, line.x2, line.y2)) {
            return true;
        }
    }
    
    // 检查线段的起点或终点是否在矩形内部
    if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) {
        return true;
    }
    
    return false;
}

// 检测点是否在矩形内部
function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

// 检测两条线段是否相交
function doLinesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    // 计算分母
    const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    
    // 避免除以零
    if (denominator === 0) {
        return false;
    }
    
    // 计算参数 t 和 u
    const t = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    const u = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
    
    // 检查线段是否相交
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// 生成随机地形
function generateObstacles() {
    obstacles = [];
    
    // 计算网格大小
    const gridWidth = Math.floor(canvas.width / WALL_CONFIG.unitSize);
    const gridHeight = Math.floor(canvas.height / WALL_CONFIG.unitSize);
    
    // 创建网格，记录每个单元格是否被占用
    const grid = new Array(gridHeight).fill(null).map(() => new Array(gridWidth).fill(false));
    
    // 标记玩家初始位置附近为安全区域
    const player1X = Math.floor(100 / WALL_CONFIG.unitSize);
    const player1Y = Math.floor((canvas.height / 2) / WALL_CONFIG.unitSize);
    const player2X = Math.floor((canvas.width - 140) / WALL_CONFIG.unitSize);
    const player2Y = Math.floor((canvas.height / 2) / WALL_CONFIG.unitSize);
    const safeRadius = Math.ceil(WALL_CONFIG.safeDistance / WALL_CONFIG.unitSize);
    
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            // 检查是否在玩家安全区域内
            const dist1 = Math.sqrt(Math.pow(x - player1X, 2) + Math.pow(y - player1Y, 2));
            const dist2 = Math.sqrt(Math.pow(x - player2X, 2) + Math.pow(y - player2Y, 2));
            if (dist1 <= safeRadius || dist2 <= safeRadius) {
                grid[y][x] = true; // 标记为已占用
            }
        }
    }
    
    let placedObstacles = 0;
    
    while (placedObstacles < WALL_CONFIG.obstacleCount) {
        // 随机选择一个起始位置
        let startX, startY;
        let found = false;
        
        for (let attempts = 0; attempts < 100; attempts++) {
            startX = Math.floor(Math.random() * gridWidth);
            startY = Math.floor(Math.random() * gridHeight);
            
            // 检查是否在安全区域外且未被占用
            if (!grid[startY][startX]) {
                // 检查周围是否有相邻的墙体
                const neighbors = getNeighbors(grid, startX, startY, obstacles);
                const neighborCount = neighbors.filter(n => n.hasWall).length;
                
                // 检查是否是同一列或同一行的两面拼接
                let sameRowOrColumn = false;
                if (neighborCount === 2) {
                    // 检查是否是上下或左右的组合
                    const hasTop = neighbors[0].hasWall;
                    const hasBottom = neighbors[1].hasWall;
                    const hasLeft = neighbors[2].hasWall;
                    const hasRight = neighbors[3].hasWall;
                    
                    // 上下组合（同一列）或左右组合（同一行）
                    sameRowOrColumn = (hasTop && hasBottom) || (hasLeft && hasRight);
                }
                
                // 增加两面拼接的概率，降低多面拼接的概率
                if (neighborCount === 0) {
                    // 孤立墙体，完全拒绝
                    continue;
                } else if (neighborCount === 1) {
                    // 单面拼接，接受
                } else if (neighborCount === 2) {
                    if (sameRowOrColumn) {
                        // 同一列或同一行的两面拼接，接受
                    } else {
                        // 其他两面拼接（对角线），98%概率拒绝，进一步降低对角线拼接的概率
                        if (Math.random() < 0.98) {
                            continue;
                        }
                    }
                } else if (neighborCount === 3) {
                    // 三面拼接，80%概率拒绝，降低3面拼接的概率
                    if (Math.random() < 0.8) {
                        continue;
                    }
                } else if (neighborCount >= 4) {
                    // 四面或更多拼接，完全拒绝
                    continue;
                }
                
                found = true;
                break;
            }
        }
        
        if (!found) break;
        
        // 调整障碍物大小生成概率，降低2x2墙体的生成概率
        let unitsX, unitsY;
        if (Math.random() < 0.7) { // 70%概率生成1x1墙体
            unitsX = 1;
            unitsY = 1;
        } else { // 30%概率生成2x2墙体
            unitsX = 2;
            unitsY = 2;
        }
        
        // 检查是否超出边界
        if (startX + unitsX > gridWidth || startY + unitsY > gridHeight) {
            continue;
        }
        
        // 检查区域是否已被占用，并且确保不会形成3面或4面拼接
        let canPlace = true;
        let hasNeighbor = false; // 检查是否有邻居
        let neighborCountTotal = 0; // 记录总邻居数量
        let stoneNeighborCount = 0; // 记录石墙邻居数量
        let woodNeighborCount = 0; // 记录木墙邻居数量
        for (let y = startY; y < startY + unitsY; y++) {
            for (let x = startX; x < startX + unitsX; x++) {
                if (grid[y][x]) {
                    canPlace = false;
                    break;
                }
                
                // 检查该位置的邻居数量，确保不会形成4面或更多拼接
                const neighbors = getNeighbors(grid, x, y, obstacles);
                const neighborCount = neighbors.filter(n => n.hasWall).length;
                neighborCountTotal += neighborCount;
                if (neighborCount >= 4) {
                    canPlace = false;
                    break;
                }
                
                // 检查是否有邻居
                if (neighborCount > 0) {
                    hasNeighbor = true;
                }
                
                // 统计石墙和木墙邻居数量
                for (const neighbor of neighbors) {
                    if (neighbor.hasWall && neighbor.obstacleType === 'stone') {
                        stoneNeighborCount++;
                    } else if (neighbor.hasWall && neighbor.obstacleType === 'wood') {
                        woodNeighborCount++;
                    }
                }
            }
            if (!canPlace) break;
        }
        
        // 如果不是第一个墙体且没有邻居，拒绝放置（杜绝孤立墙体）
        if (placedObstacles > 0 && !hasNeighbor) {
            canPlace = false;
        }
        
        // 对于2x2墙体，要求至少有2个邻居，降低孤立2x2地形的概率
        if (placedObstacles > 0 && unitsX === 2 && unitsY === 2 && neighborCountTotal < 2) {
            canPlace = false;
        }
        
        // 检查是否会形成封闭区域
        if (canPlace && willCreateEnclosedArea(grid, startX, startY, unitsX, unitsY)) {
            canPlace = false;
        }
        
        if (canPlace) {
            // 标记网格为已占用
            for (let y = startY; y < startY + unitsY; y++) {
                for (let x = startX; x < startX + unitsX; x++) {
                    grid[y][x] = true;
                }
            }
            
            // 根据邻居类型优先选择墙体类型
            let isStoneWall;
            if (placedObstacles > 0 && (stoneNeighborCount > 0 || woodNeighborCount > 0)) {
                // 优先选择与邻居相同类型的墙体
                if (stoneNeighborCount >= woodNeighborCount) {
                    isStoneWall = true;
                } else {
                    isStoneWall = false;
                }
            } else {
                // 没有邻居或邻居数量相等，按概率生成
                isStoneWall = Math.random() < WALL_CONFIG.stoneWallProbability;
            }
            
            // 将2x2墙体拆分成4个独立的1x1墙体
            for (let y = startY; y < startY + unitsY; y++) {
                for (let x = startX; x < startX + unitsX; x++) {
                    const obstacleX = x * WALL_CONFIG.unitSize;
                    const obstacleY = y * WALL_CONFIG.unitSize;
                    const width = WALL_CONFIG.unitSize;
                    const height = WALL_CONFIG.unitSize;
                    
                    const obstacle = {
                        x: obstacleX,
                        y: obstacleY,
                        width: width,
                        height: height,
                        collisionRadius: Math.min(width, height) / 2, // 碰撞半径
                        collisionType: 'obstacle', // 碰撞类型
                        color: isStoneWall ? WALL_CONFIG.stoneWallColor : WALL_CONFIG.woodWallColor,
                        type: isStoneWall ? 'stone' : 'wood', // 类型：stone（石墙）或 wood（木墙）
                        health: isStoneWall ? WALL_CONFIG.stoneWallHealth : WALL_CONFIG.woodWallHealth, // 生命值，-1表示不可破坏
                        damagePattern: isStoneWall ? null : generateDamagePattern(width, height) // 为木墙生成静态的损伤模式
                    };
                    obstacles.push(obstacle);
                }
            }
            
            placedObstacles++;
        }
    }
}

// 获取指定位置的邻居
function getNeighbors(grid, x, y, obstacles = []) {
    const neighbors = [];
    const directions = [
        [-1, 0], // 上
        [1, 0],  // 下
        [0, -1], // 左
        [0, 1],  // 右
        [-1, -1], // 左上
        [-1, 1],  // 右上
        [1, -1],  // 左下
        [1, 1]    // 右下
    ];
    
    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length) {
            // 查找该位置的障碍物类型
            let obstacleType = null;
            const obstacleX = nx * WALL_CONFIG.unitSize;
            const obstacleY = ny * WALL_CONFIG.unitSize;
            for (const obstacle of obstacles) {
                if (obstacle.x === obstacleX && obstacle.y === obstacleY) {
                    obstacleType = obstacle.type;
                    break;
                }
            }
            
            neighbors.push({
                hasWall: grid[ny][nx],
                dx: dx,
                dy: dy,
                obstacleType: obstacleType
            });
        } else {
            neighbors.push({ hasWall: false, dx: dx, dy: dy, obstacleType: null });
        }
    }
    
    return neighbors;
}

// 检查是否会形成封闭区域
function willCreateEnclosedArea(grid, startX, startY, unitsX, unitsY) {
    // 创建临时网格
    const tempGrid = grid.map(row => [...row]);
    
    // 标记要放置墙体的位置
    for (let y = startY; y < startY + unitsY; y++) {
        for (let x = startX; x < startX + unitsX; x++) {
            tempGrid[y][x] = true;
        }
    }
    
    // 找到第一个空单元格
    let firstEmpty = null;
    for (let y = 0; y < tempGrid.length; y++) {
        for (let x = 0; x < tempGrid[0].length; x++) {
            if (!tempGrid[y][x]) {
                firstEmpty = { x, y };
                break;
            }
        }
        if (firstEmpty) break;
    }
    
    // 如果没有空单元格，返回false
    if (!firstEmpty) return false;
    
    // 使用洪水填充算法计算连通的空单元格数量
    const visited = new Set();
    const queue = [firstEmpty];
    visited.add(`${firstEmpty.x},${firstEmpty.y}`);
    
    while (queue.length > 0) {
        const current = queue.shift();
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dx, dy] of directions) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            
            if (nx >= 0 && nx < tempGrid[0].length && ny >= 0 && ny < tempGrid.length) {
                if (!tempGrid[ny][nx] && !visited.has(`${nx},${ny}`)) {
                    visited.add(`${nx},${ny}`);
                    queue.push({ x: nx, y: ny });
                }
            }
        }
    }
    
    // 计算总空单元格数量
    let totalEmpty = 0;
    for (let y = 0; y < tempGrid.length; y++) {
        for (let x = 0; x < tempGrid[0].length; x++) {
            if (!tempGrid[y][x]) {
                totalEmpty++;
            }
        }
    }
    
    // 如果连通的空单元格数量小于总空单元格数量，说明形成了封闭区域
    return visited.size < totalEmpty;
}

// 为木墙生成静态的损伤模式
function generateDamagePattern(width, height) {
    const pattern = {
        cracks: []
    };
    
    // 生成一些初始裂缝
    const initialCracks = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < initialCracks; i++) {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        const angle = Math.random() * Math.PI * 2;
        const length = 10 + Math.random() * 20;
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;
        
        pattern.cracks.push({
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            width: 1 + Math.random() * 2
        });
    }
    
    return pattern;
}

// 绘制障碍物
function drawObstacles() {
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'wood') {
            // 木墙根据血量显示不同的破碎效果
            const maxHealth = WALL_CONFIG.woodWallHealth;
            const healthPercentage = obstacle.health / maxHealth;
            
            // 基础颜色
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // 根据损伤程度显示静态的破碎效果
            if (healthPercentage < 0.8 && obstacle.damagePattern && obstacle.damagePattern.cracks) {
                // 轻微损伤：显示一些裂缝
                ctx.strokeStyle = '#553311';
                ctx.lineWidth = 1;
                
                // 使用静态损伤模式，显示固定的裂缝
                const visibleCracks = Math.floor((1 - healthPercentage) * obstacle.damagePattern.cracks.length);
                for (let i = 0; i < visibleCracks; i++) {
                    const crack = obstacle.damagePattern.cracks[i];
                    // 确保裂缝在木墙边界内
                    const startX = Math.max(obstacle.x, Math.min(obstacle.x + obstacle.width, obstacle.x + crack.startX));
                    const startY = Math.max(obstacle.y, Math.min(obstacle.y + obstacle.height, obstacle.y + crack.startY));
                    const endX = Math.max(obstacle.x, Math.min(obstacle.x + obstacle.width, obstacle.x + crack.startX + crack.endX));
                    const endY = Math.max(obstacle.y, Math.min(obstacle.y + obstacle.height, obstacle.y + crack.startY + crack.endY));
                    
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
            }
            
            if (healthPercentage < 0.5 && obstacle.damagePattern && obstacle.damagePattern.cracks) {
                // 严重损伤：显示更多裂缝
                ctx.strokeStyle = '#332211';
                ctx.lineWidth = 2;
                
                // 显示所有裂缝
                for (const crack of obstacle.damagePattern.cracks) {
                    // 确保裂缝在木墙边界内
                    const startX = Math.max(obstacle.x, Math.min(obstacle.x + obstacle.width, obstacle.x + crack.startX));
                    const startY = Math.max(obstacle.y, Math.min(obstacle.y + obstacle.height, obstacle.y + crack.startY));
                    const endX = Math.max(obstacle.x, Math.min(obstacle.x + obstacle.width, obstacle.x + crack.startX + crack.endX));
                    const endY = Math.max(obstacle.y, Math.min(obstacle.y + obstacle.height, obstacle.y + crack.startY + crack.endY));
                    
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
            }
            
            if (healthPercentage < 0.2 && obstacle.damagePattern && obstacle.damagePattern.cracks) {
                // 即将破坏：显示大部分破碎
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // 显示所有裂缝
                ctx.strokeStyle = '#332211';
                ctx.lineWidth = 2;
                for (const crack of obstacle.damagePattern.cracks) {
                    // 确保裂缝在木墙边界内
                    const startX = Math.max(obstacle.x, Math.min(obstacle.x + obstacle.width, obstacle.x + crack.startX));
                    const startY = Math.max(obstacle.y, Math.min(obstacle.y + obstacle.height, obstacle.y + crack.startY));
                    const endX = Math.max(obstacle.x, Math.min(obstacle.x + obstacle.width, obstacle.x + crack.startX + crack.endX));
                    const endY = Math.max(obstacle.y, Math.min(obstacle.y + obstacle.height, obstacle.y + crack.startY + crack.endY));
                    
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
            }
        } else {
            // 石墙正常显示
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });
}

// 检测碰撞
function collision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}
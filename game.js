// 游戏变量
let canvas, ctx; // 画布和上下文
let gameRunning = false; // 游戏运行状态
let gamePaused = false; // 游戏暂停状态
let gameStartTime = 0; // 游戏开始时间
let pauseStartTime = 0; // 暂停开始时间
let totalPauseTime = 0; // 总暂停时间
let players = []; // 玩家数组
let zombies = []; // 僵尸数组
let bullets = []; // 子弹数组
let damageTexts = []; // 伤害飘字
let medkits = []; // 急救包
let lastMedkitSpawn = 0; // 上次生成急救包的时间
const medkitSpawnInterval = 60000; // 急救包生成间隔（毫秒）
const medkitSpawnChance = 0.1; // 急救包生成概率（10%）
const medkitHealAmount = 50; // 急救包恢复生命值
let barrels = []; // 油桶
let particles = []; // 粒子特效数组
const barrelCount = 5; // 初始油桶数量
const barrelExplosionRadius = 100; // 油桶爆炸范围
const barrelExplosionDamage = 50; // 油桶爆炸伤害
let obstacles = []; // 地形障碍物
let keys = {}; // 键盘按键状态
let mouse = { x: 0, y: 0 }; // 鼠标位置
let lastZombieSpawn = 0; // 上次生成僵尸的时间戳
let zombieSpawnInterval = 2000; // 僵尸生成间隔（毫秒）
let maxZombies = 200; // 保持不动，最大僵尸数量限制，减少僵尸数量提高性能
let frameCount = 0; // 帧计数器，用于优化绘制
let lastFrameTime = 0; // 上次帧时间
const targetFPS = 60; // 目标帧率
const frameInterval = 1000 / targetFPS; // 每帧间隔时间（毫秒）
let audioContext = null; // 音频上下文，用于播放音效
let mapImage = null; // 地图背景图片
let lights = []; // 动态光照效果数组

// 对象池
const objectPools = {
    bullets: [], // 子弹对象池
    damageTexts: [] // 伤害文本对象池
};

// 武器配置
let WEAPON_CONFIG = {};

// 从CSV文件加载武器配置
// 加载武器配置（从嵌入的常量读取）
async function loadWeaponsFromCSV() {
    try {
        console.log('开始加载武器配置...');
        
        if (typeof WEAPON_DATA === 'undefined') {
            throw new Error('WEAPON_DATA not found');
        }
        
        // 直接使用WEAPON_DATA
        WEAPON_CONFIG = WEAPON_DATA;
        
        console.log('武器配置加载成功:', WEAPON_CONFIG);
        console.log('已加载武器数量:', Object.keys(WEAPON_CONFIG).length);
    } catch (error) {
        console.error('加载武器配置失败:', error);
        // 加载失败时使用默认配置
        WEAPON_CONFIG = {
            pistol: {
                name: '普通手枪',
                damage: 25,
                fireRate: 200,
                bulletSpeed: 8,
                magazineSize: -1,
                currentAmmo: -1,
                reloadTime: 1000,
                knockback: 5,
                range: 300,
                shotgunPellets: 1
            },
            magnum: {
                name: '马格南',
                damage: 50,
                fireRate: 400,
                bulletSpeed: 10,
                magazineSize: 6,
                currentAmmo: 6,
                reloadTime: 1500,
                knockback: 10,
                range: 350,
                shotgunPellets: 1
            },
            uzi: {
                name: 'UZI冲锋枪',
                damage: 15,
                fireRate: 50,
                bulletSpeed: 7,
                magazineSize: 50,
                currentAmmo: 50,
                reloadTime: 1200,
                knockback: 3,
                range: 250,
                shotgunPellets: 1
            },
            rifle: {
                name: '突击步枪',
                damage: 30,
                fireRate: 150,
                bulletSpeed: 9,
                magazineSize: 20,
                currentAmmo: 20,
                reloadTime: 1300,
                knockback: 7,
                range: 400,
                shotgunPellets: 1
            },
            shotgun: {
                name: '霰弹枪',
                damage: 20,
                fireRate: 300,
                bulletSpeed: 6,
                magazineSize: 8,
                currentAmmo: 8,
                reloadTime: 1400,
                knockback: 8,
                range: 150,
                shotgunPellets: 8
            }
        };
        console.log('使用默认武器配置:', WEAPON_CONFIG);
    }
}

// 立即加载武器配置
loadWeaponsFromCSV();

// 作弊功能变量
let godMode = false; // 无敌模式
let freezeZombies = false; // 怪物静止模式
let infiniteAmmo = false; // 无限子弹模式
let gameSpeed = 1.0; // 游戏速度，1.0为正常速度
let showAttackRange = true; // 显示攻击范围
let friendlyFire = false; // 友伤开关，开启后玩家可能会伤害队友
let showMapDebug = false; // 显示地图调试模式（灰色可通行/紫色不可通行）
let cameraScale = 1.2; // 视角缩放比例，默认1.2
const minCameraScale = 0.8; // 最小缩放比例
const maxCameraScale = 2.0; // 最大缩放比例
const cameraScaleStep = 0.1; // 每次缩放的步长
let cameraOffset = { x: 0, y: 0 }; // 相机偏移量，用于实现相机跟随

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

// 对象池管理函数
function getObjectFromPool(poolName) {
    const pool = objectPools[poolName];
    if (pool && pool.length > 0) {
        return pool.pop();
    }
    return null;
}

function returnObjectToPool(poolName, object) {
    const pool = objectPools[poolName];
    if (pool) {
        // 限制对象池大小，避免内存占用过高
        if (pool.length < 100) {
            pool.push(object);
        }
    }
}

// 游戏对象类
class Player {
    constructor(x, y, color, controls, isPlayer1) {
        this.x = x; // 玩家X坐标
        this.y = y; // 玩家Y坐标
        this.width = 25; // 玩家宽度
        this.height = 25; // 玩家高度
        this.collisionRadius = 10; // 碰撞半径
        this.collisionType = 'player'; // 碰撞类型
        this.color = color; // 玩家颜色
        this.controls = controls; // 玩家控制键
        this.isPlayer1 = isPlayer1; // 是否为玩家1
        this.health = 100; // 生命值
        this.score = 0; // 得分
        this.speed = 2; // 玩家移动速度
        this.lastShot = 0; // 上次射击时间
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
        
        // 武器系统 - 从外部配置文件加载
        this.weapons = JSON.parse(JSON.stringify(WEAPON_CONFIG));
        this.currentWeapon = 'pistol'; // 当前使用的武器
        this.isReloading = false; // 是否正在换弹
        this.reloadStartTime = 0; // 换弹开始时间
        this.isAI = !isPlayer1; // 玩家2默认为AI
        this.aiLastDirectionChange = 0; // 上次方向改变时间
        this.aiDirectionChangeInterval = 500; // 方向改变间隔（毫秒），一秒最多转向2次
        this.aiLastShootTime = 0; // 上次射击时间
        this.aiShootInterval = 300; // 射击间隔（毫秒）
        
        // 朝向固定
        this.isDirectionFixed = false; // 是否固定朝向
        
        // 音效
        this.sounds = {
            reload: null, // 换弹声音
            shoot: null,  // 射击声音
            footstep: null, // 脚步声
            hurt: null    // 受伤声音
        };
        
        // 尝试初始化音效
        try {
            // 使用Web Audio API创建3D音效
            this.sounds.reload = (sourceX = this.x, sourceY = this.y) => {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                const pannerNode = audioContext.createPanner();
                
                // 设置3D音效参数
                pannerNode.panningModel = 'HRTF';
                pannerNode.distanceModel = 'inverse';
                pannerNode.refDistance = 100;
                pannerNode.maxDistance = 10000;
                pannerNode.rolloffFactor = 1;
                pannerNode.coneInnerAngle = 360;
                pannerNode.coneOuterAngle = 0;
                pannerNode.coneOuterGain = 0;
                
                // 计算声源位置（相对于玩家）
                const relativeX = sourceX - (this.x + this.width / 2);
                const relativeY = sourceY - (this.y + this.height / 2);
                const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
                
                // 设置声源位置
                pannerNode.setPosition(relativeX / 100, relativeY / 100, 0);
                
                // 连接音频节点
                oscillator.connect(gainNode);
                gainNode.connect(pannerNode);
                pannerNode.connect(audioContext.destination);
                
                // 换弹声音
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
                
                // 根据距离调整音量
                const volume = Math.max(0.1, Math.min(0.5, 1 / (1 + distance / 200)));
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            };
            
            // 射击声音
            this.sounds.shoot = (sourceX = this.x, sourceY = this.y) => {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                const pannerNode = audioContext.createPanner();
                
                // 设置3D音效参数
                pannerNode.panningModel = 'HRTF';
                pannerNode.distanceModel = 'inverse';
                pannerNode.refDistance = 100;
                pannerNode.maxDistance = 10000;
                pannerNode.rolloffFactor = 1;
                
                // 计算声源位置（相对于玩家）
                const relativeX = sourceX - (this.x + this.width / 2);
                const relativeY = sourceY - (this.y + this.height / 2);
                
                // 设置声源位置
                pannerNode.setPosition(relativeX / 100, relativeY / 100, 0);
                
                // 连接音频节点
                oscillator.connect(gainNode);
                gainNode.connect(pannerNode);
                pannerNode.connect(audioContext.destination);
                
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.05);
                
                // 根据距离调整音量
                const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
                const volume = Math.max(0.1, Math.min(0.3, 1 / (1 + distance / 200)));
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.05);
            };
            
            // 脚步声
            this.sounds.footstep = (sourceX = this.x, sourceY = this.y) => {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                const pannerNode = audioContext.createPanner();
                
                // 设置3D音效参数
                pannerNode.panningModel = 'HRTF';
                pannerNode.distanceModel = 'inverse';
                pannerNode.refDistance = 100;
                pannerNode.maxDistance = 10000;
                pannerNode.rolloffFactor = 1;
                
                // 计算声源位置（相对于玩家）
                const relativeX = sourceX - (this.x + this.width / 2);
                const relativeY = sourceY - (this.y + this.height / 2);
                
                // 设置声源位置
                pannerNode.setPosition(relativeX / 100, relativeY / 100, 0);
                
                // 连接音频节点
                oscillator.connect(gainNode);
                gainNode.connect(pannerNode);
                pannerNode.connect(audioContext.destination);
                
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                
                // 根据距离调整音量
                const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
                const volume = Math.max(0.05, Math.min(0.1, 1 / (1 + distance / 150)));
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
            };
            
            // 受伤声音
            this.sounds.hurt = (sourceX = this.x, sourceY = this.y) => {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                const pannerNode = audioContext.createPanner();
                
                // 设置3D音效参数
                pannerNode.panningModel = 'HRTF';
                pannerNode.distanceModel = 'inverse';
                pannerNode.refDistance = 100;
                pannerNode.maxDistance = 10000;
                pannerNode.rolloffFactor = 1;
                
                // 计算声源位置（相对于玩家）
                const relativeX = sourceX - (this.x + this.width / 2);
                const relativeY = sourceY - (this.y + this.height / 2);
                
                // 设置声源位置
                pannerNode.setPosition(relativeX / 100, relativeY / 100, 0);
                
                // 连接音频节点
                oscillator.connect(gainNode);
                gainNode.connect(pannerNode);
                pannerNode.connect(audioContext.destination);
                
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.3);
                
                // 根据距离调整音量
                const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
                const volume = Math.max(0.1, Math.min(0.2, 1 / (1 + distance / 200)));
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            };
        } catch (e) {
            console.log('音效初始化失败:', e);
        }
    }

    update() {
        // 死亡玩家不能操作
        if (this.isDead) return;
        
        try {
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
                            // 检查射击路径上是否有友方玩家（在友伤模式下）
                            let canShoot = true;
                            if (friendlyFire) {
                                // 计算指向目标的方向
                                const targetDx = closestZombie.x + closestZombie.width / 2 - (this.x + this.width / 2);
                                const targetDy = closestZombie.y + closestZombie.height / 2 - (this.y + this.height / 2);
                                const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
                                const targetDirection = {
                                    x: targetDx / targetDistance,
                                    y: targetDy / targetDistance
                                };
                                
                                // 检查友方玩家是否在射击路径上
                                for (const teammate of players) {
                                    if (teammate !== this && !teammate.isDead) {
                                        // 计算队友相对于玩家的位置
                                        const teammateDx = teammate.x + teammate.width / 2 - (this.x + this.width / 2);
                                        const teammateDy = teammate.y + teammate.height / 2 - (this.y + this.height / 2);
                                        const teammateDistance = Math.sqrt(teammateDx * teammateDx + teammateDy * teammateDy);
                                        
                                        // 检查队友是否在射击方向上
                                        if (teammateDistance < targetDistance) {
                                            // 计算队友相对于射击方向的角度
                                            const teammateAngle = Math.atan2(teammateDy, teammateDx);
                                            const shootAngle = Math.atan2(targetDirection.y, targetDirection.x);
                                            
                                            // 计算角度差
                                            let angleDiff = teammateAngle - shootAngle;
                                            // 规范化角度差到[-π, π]范围内
                                            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                                            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                                            
                                            // 如果角度差小于15度，且队友在射击路径上，则不射击
                                            if (Math.abs(angleDiff) < Math.PI / 12) {
                                                canShoot = false;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // 射击
                            if (canShoot) {
                                this.shoot();
                                this.aiLastShootTime = now;
                            }
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
        
        // 检测与油桶的碰撞
        if (canMoveX) {
            for (const barrel of barrels) {
                if (collisionWithVolume(testRectX, barrel)) {
                    canMoveX = false;
                    break;
                }
            }
        }
        
        // 检测与其他玩家的碰撞
        if (canMoveX) {
            for (const player of players) {
                if (player !== this && !player.isDead) {
                    if (collisionWithVolume(testRectX, player)) {
                        canMoveX = false;
                        // 推开玩家 - 限制推挤距离，并检查是否会被推入地形或与其他玩家碰撞
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
                            // 检查新位置是否会与其他玩家碰撞
                            if (canPush) {
                                for (const otherPlayer of players) {
                                    if (otherPlayer !== player && otherPlayer !== this && !otherPlayer.isDead) {
                                        if (collisionWithVolume(testPlayerX, otherPlayer)) {
                                            canPush = false;
                                            break;
                                        }
                                    }
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
                            // 检查新位置是否会与其他玩家碰撞
                            if (canPush) {
                                for (const otherPlayer of players) {
                                    if (otherPlayer !== player && otherPlayer !== this && !otherPlayer.isDead) {
                                        if (collisionWithVolume(testPlayerX, otherPlayer)) {
                                            canPush = false;
                                            break;
                                        }
                                    }
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
        }
        
        // 检测与油桶的碰撞
        if (canMoveX) {
            for (const barrel of barrels) {
                if (collisionWithVolume(testRectX, barrel)) {
                    canMoveX = false;
                    // 轻轻推动油桶
                    const pushDistance = Math.min(2, Math.abs(moveX) * 1.5);
                    if (moveX > 0) {
                        const newX = Math.min(canvas.width - barrel.width, barrel.x + pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testBarrelX = { x: newX, y: barrel.y, width: barrel.width, height: barrel.height, collisionRadius: barrel.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testBarrelX, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        // 检查新位置是否会与其他油桶碰撞
                        if (canPush) {
                            for (const otherBarrel of barrels) {
                                if (otherBarrel !== barrel && collisionWithVolume(testBarrelX, otherBarrel)) {
                                    canPush = false;
                                    break;
                                }
                            }
                        }
                        if (canPush) {
                            barrel.x = newX;
                            // 推动油桶时减速
                            moveX *= 0.5;
                        }
                    } else if (moveX < 0) {
                        const newX = Math.max(0, barrel.x - pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testBarrelX = { x: newX, y: barrel.y, width: barrel.width, height: barrel.height, collisionRadius: barrel.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testBarrelX, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        // 检查新位置是否会与其他油桶碰撞
                        if (canPush) {
                            for (const otherBarrel of barrels) {
                                if (otherBarrel !== barrel && collisionWithVolume(testBarrelX, otherBarrel)) {
                                    canPush = false;
                                    break;
                                }
                            }
                        }
                        if (canPush) {
                            barrel.x = newX;
                            // 推动油桶时减速
                            moveX *= 0.5;
                        }
                    }
                    break;
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
        
        // 检测与油桶的碰撞
        if (canMoveY) {
            for (const barrel of barrels) {
                if (collisionWithVolume(testRectY, barrel)) {
                    canMoveY = false;
                    break;
                }
            }
        }
        
        // 检测与其他玩家的碰撞
        if (canMoveY) {
            for (const player of players) {
                if (player !== this && !player.isDead) {
                    if (collisionWithVolume(testRectY, player)) {
                        canMoveY = false;
                        // 推开玩家 - 限制推挤距离，并检查是否会被推入地形或与其他玩家碰撞
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
                            // 检查新位置是否会与其他玩家碰撞
                            if (canPush) {
                                for (const otherPlayer of players) {
                                    if (otherPlayer !== player && otherPlayer !== this && !otherPlayer.isDead) {
                                        if (collisionWithVolume(testPlayerY, otherPlayer)) {
                                            canPush = false;
                                            break;
                                        }
                                    }
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
                            // 检查新位置是否会与其他玩家碰撞
                            if (canPush) {
                                for (const otherPlayer of players) {
                                    if (otherPlayer !== player && otherPlayer !== this && !otherPlayer.isDead) {
                                        if (collisionWithVolume(testPlayerY, otherPlayer)) {
                                            canPush = false;
                                            break;
                                        }
                                    }
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
        }
        
        // 检测与油桶的碰撞
        if (canMoveY) {
            for (const barrel of barrels) {
                if (collisionWithVolume(testRectY, barrel)) {
                    canMoveY = false;
                    // 轻轻推动油桶
                    const pushDistance = Math.min(2, Math.abs(moveY) * 1.5);
                    if (moveY > 0) {
                        const newY = Math.min(canvas.height - barrel.height, barrel.y + pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testBarrelY = { x: barrel.x, y: newY, width: barrel.width, height: barrel.height, collisionRadius: barrel.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testBarrelY, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        // 检查新位置是否会与其他油桶碰撞
                        if (canPush) {
                            for (const otherBarrel of barrels) {
                                if (otherBarrel !== barrel && collisionWithVolume(testBarrelY, otherBarrel)) {
                                    canPush = false;
                                    break;
                                }
                            }
                        }
                        if (canPush) {
                            barrel.y = newY;
                            // 推动油桶时减速
                            moveY *= 0.5;
                        }
                    } else if (moveY < 0) {
                        const newY = Math.max(0, barrel.y - pushDistance);
                        // 检查新位置是否会与障碍物碰撞
                        const testBarrelY = { x: barrel.x, y: newY, width: barrel.width, height: barrel.height, collisionRadius: barrel.collisionRadius };
                        let canPush = true;
                        for (const obstacle of obstacles) {
                            if (collisionWithVolume(testBarrelY, obstacle)) {
                                canPush = false;
                                break;
                            }
                        }
                        // 检查新位置是否会与其他油桶碰撞
                        if (canPush) {
                            for (const otherBarrel of barrels) {
                                if (otherBarrel !== barrel && collisionWithVolume(testBarrelY, otherBarrel)) {
                                    canPush = false;
                                    break;
                                }
                            }
                        }
                        if (canPush) {
                            barrel.y = newY;
                            // 推动油桶时减速
                            moveY *= 0.5;
                        }
                    }
                    break;
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
                this.x = Math.max(0, Math.min(canvas.width - this.width, this.x + moveX));
            }
            if (canMoveY) {
                this.y = Math.max(0, Math.min(canvas.height - this.height, this.y + moveY));
            }
        } else if (canMoveX && !canMoveY) {
            // 只有X方向可以移动
            this.x = Math.max(0, Math.min(canvas.width - this.width, this.x + moveX));
        } else if (!canMoveX && canMoveY) {
            // 只有Y方向可以移动
            this.y = Math.max(0, Math.min(canvas.height - this.height, this.y + moveY));
        }
        // 如果两个方向都不能移动，玩家保持原地
        
        // 更新方向
        if ((moveX !== 0 || moveY !== 0) && !this.isDirectionFixed) {
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
                // 创建复活粒子特效
                createParticles(this.reviveTarget.x + this.reviveTarget.width / 2, this.reviveTarget.y + this.reviveTarget.height / 2, 'smoke', 20);
                // 创建复活光照效果
                createLight(this.reviveTarget.x + this.reviveTarget.width / 2, this.reviveTarget.y + this.reviveTarget.height / 2, 100, '#00ff88', 1500);
                this.isReviving = false;
                this.reviveTarget = null;
            }
        }
        
        // 自动射击逻辑
        if (this.autoShoot && this.health > 0 && !this.isDead && !this.isReviving && !this.isAI) {
            this.shoot();
        }
        
        // 长按攻击键连发逻辑
        if (!this.isAI && this.health > 0 && !this.isDead && !this.isReviving) {
            // 玩家1使用空格键射击
            if (this.isPlayer1 && keys[' ']) {
                this.shoot();
            }
            // 玩家2使用回车键射击
            if (!this.isPlayer1 && keys['enter']) {
                this.shoot();
            }
        }
        
        } catch (error) {
            console.error('玩家更新错误:', error);
            // 显示错误信息到游戏界面
            addLog(`玩家${this.isPlayer1 ? '1' : '2'}更新错误: ${error.message}`);
        }
    }

    draw() {
        // 检查玩家是否与其他物体重叠，如果重叠则降低透明度
        let hasOverlap = false;
        if (this.health > 0 && !this.isDead) {
            // 检查与僵尸重叠
            for (const zombie of zombies) {
                if (collisionWithVolume(this, zombie)) {
                    hasOverlap = true;
                    break;
                }
            }
            // 检查与障碍物重叠
            if (!hasOverlap) {
                for (const obstacle of obstacles) {
                    if (this.x < obstacle.x + obstacle.width && 
                        this.x + this.width > obstacle.x && 
                        this.y < obstacle.y + obstacle.height && 
                        this.y + this.height > obstacle.y) {
                        hasOverlap = true;
                        break;
                    }
                }
            }
            // 检查与油桶重叠
            if (!hasOverlap) {
                for (const barrel of barrels) {
                    if (collisionWithVolume(this, barrel)) {
                        hasOverlap = true;
                        break;
                    }
                }
            }
            // 检查与急救包重叠
            if (!hasOverlap) {
                for (const medkit of medkits) {
                    if (this.x < medkit.x + medkit.width && 
                        this.x + this.width > medkit.x && 
                        this.y < medkit.y + medkit.height && 
                        this.y + this.height > medkit.y) {
                        hasOverlap = true;
                        break;
                    }
                }
            }
        }
        
        // 如果重叠，设置半透明
        ctx.save();
        if (hasOverlap) {
            ctx.globalAlpha = 0.6;
        }
        
        if (this.health > 0 && !this.isDead && !this.isFlashing) {
            // 绘制玩家主体
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // 主体描边
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            
            // 绘制玩家头部
            ctx.fillStyle = '#f0f0f0';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 3, this.width / 4, 0, Math.PI * 2);
            ctx.fill();
            // 头部描边
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 3, this.width / 4, 0, Math.PI * 2);
            ctx.stroke();
            
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
            
            // 绘制扇形攻击范围
            if (showAttackRange) {
                const attackAngle = Math.PI / 1.8; // 100度转换为弧度
                const weapon = this.weapons[this.currentWeapon];
                const attackRange = weapon.range; // 使用武器的射程属性
                
                ctx.save();
                ctx.globalAlpha = 0.3; // 设置半透明
                ctx.strokeStyle = '#ff0000'; // 红色线条
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                // 从玩家中心开始
                ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
                
                // 计算扇形的起始角度
                const playerAngle = Math.atan2(this.direction.y, this.direction.x);
                const startAngle = playerAngle - attackAngle / 2;
                const endAngle = playerAngle + attackAngle / 2;
                
                // 绘制扇形弧线
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, attackRange, startAngle, endAngle);
                
                // 回到玩家中心
                ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
                
                ctx.stroke();
                ctx.restore();
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
                
                // 绘制换弹进度条
                const now = Date.now();
                const reloadProgress = Math.min(1, (now - this.reloadStartTime) / weapon.reloadTime);
                
                ctx.fillStyle = '#ff6b6b';
                ctx.fillRect(this.x, this.y - 15, this.width * reloadProgress, 5);
            } else {
                ammoText = weapon.magazineSize === -1 ? '∞' : `${weapon.currentAmmo}/${weapon.magazineSize}`;
                ctx.fillStyle = '#ffffff'; // 白色文字
                ctx.fillText(ammoText, this.x + this.width / 2, this.y - 15);
            }
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
        
        // 绘制碰撞体积（红色线条）
        if (showAttackRange) {
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.collisionRadius, 0, Math.PI * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ff0000';
            ctx.stroke();
        }
        
        // 恢复透明度设置
        ctx.restore();
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
        
        // 计算扇形攻击范围（视野范围无限）
        const attackAngle = Math.PI / 1.8; // 100度转换为弧度
        const weaponRange = weapon.range; // 武器的射程属性
        
        // 查找视野范围内的所有僵尸（排除被地形阻挡的）
        const visibleZombies = [];
        for (const zombie of zombies) {
            if (!zombie.isDead) {
                // 计算僵尸相对于玩家的位置
                const dx = zombie.x + zombie.width / 2 - (this.x + this.width / 2);
                const dy = zombie.y + zombie.height / 2 - (this.y + this.height / 2);
                
                // 计算僵尸相对于玩家朝向的角度
                const zombieAngle = Math.atan2(dy, dx);
                const playerAngle = Math.atan2(this.direction.y, this.direction.x);
                
                // 计算角度差
                let angleDiff = zombieAngle - playerAngle;
                // 规范化角度差到[-π, π]范围内
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                // 检查是否在扇形视野范围内
                if (Math.abs(angleDiff) <= attackAngle / 2) {
                    // 检查视线是否被地形阻挡
                    if (lineOfSight(this.x + this.width / 2, this.y + this.height / 2, zombie.x + zombie.width / 2, zombie.y + zombie.height / 2)) {
                        visibleZombies.push({
                            zombie: zombie,
                            distance: Math.sqrt(dx * dx + dy * dy)
                        });
                    }
                }
            }
        }
        
        // 射击逻辑
        if (visibleZombies.length > 0) {
            // 按距离排序，优先射击最近的目标
            visibleZombies.sort((a, b) => a.distance - b.distance);
            
            const closestTarget = visibleZombies[0].zombie;
            
            // 计算指向目标的方向
            const targetDx = closestTarget.x + closestTarget.width / 2 - (this.x + this.width / 2);
            const targetDy = closestTarget.y + closestTarget.height / 2 - (this.y + this.height / 2);
            const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
            const targetDirection = {
                x: targetDx / targetDistance,
                y: targetDy / targetDistance
            };
            
            // 霰弹枪特殊处理
            if (this.currentWeapon === 'shotgun') {
                // 霰弹枪发射多颗子弹，呈扇形分布
                const pelletCount = weapon.shotgunPellets || 5;
                const halfCount = Math.floor(pelletCount / 2);
                for (let i = -halfCount; i <= halfCount; i++) {
                    const angle = i * 0.1; // 每发子弹的角度偏移
                    const shotDirection = {
                        x: targetDirection.x * Math.cos(angle) - targetDirection.y * Math.sin(angle),
                        y: targetDirection.x * Math.sin(angle) + targetDirection.y * Math.cos(angle)
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
                        damage: weapon.damage, // 添加伤害属性
                        range: weaponRange, // 添加射程属性
                        startX: this.x + this.width / 2, // 添加初始X位置
                        startY: this.y + this.height / 2 // 添加初始Y位置
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
                    direction: targetDirection,
                    player: this,
                    damage: weapon.damage, // 添加伤害属性
                    range: weaponRange, // 添加射程属性
                    startX: this.x + this.width / 2, // 添加初始X位置
                    startY: this.y + this.height / 2 // 添加初始Y位置
                });
            }
        } else {
            // 攻击范围内没有目标，朝正前方射击
            // 创建一个新的方向对象，避免引用玩家的direction对象导致子弹转弯
            const direction = {
                x: this.direction.x,
                y: this.direction.y
            };
            
            // 霰弹枪特殊处理
            if (this.currentWeapon === 'shotgun') {
                // 霰弹枪发射多颗子弹，呈扇形分布
                const pelletCount = weapon.shotgunPellets || 5;
                const halfCount = Math.floor(pelletCount / 2);
                for (let i = -halfCount; i <= halfCount; i++) {
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
                        damage: weapon.damage, // 添加伤害属性
                        range: weaponRange, // 添加射程属性
                        startX: this.x + this.width / 2, // 添加初始X位置
                        startY: this.y + this.height / 2 // 添加初始Y位置
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
                    damage: weapon.damage, // 添加伤害属性
                    range: weaponRange, // 添加射程属性
                    startX: this.x + this.width / 2, // 添加初始X位置
                    startY: this.y + this.height / 2 // 添加初始Y位置
                });
            }
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
            if (typeof this.sounds.reload === 'function') {
                this.sounds.reload();
            }
        } catch (e) {
            console.log('音效播放失败:', e);
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
        // 从与可通行区域相连的边缘生成
        const spawnPos = this.findValidSpawnPosition();
        this.x = spawnPos.x;
        this.y = spawnPos.y;
        
        this.isBoss = isBoss; // 是否为BOSS僵尸
        if (isBoss) {
            this.width = 40; // BOSS宽度
            this.height = 40; // BOSS高度
            this.collisionRadius = 15; // BOSS僵尸碰撞半径
            this.collisionType = 'zombie'; // 碰撞类型
            this.color = '#d32f2f'; // BOSS颜色（深红色，与玩家1的浅红色区分）
            this.speed = 0.08; // BOSS僵尸移动速度
            this.health = 800; // BOSS生命值
            this.turnSpeed = 0.01; // BOSS僵尸转向速度
        } else {
            this.width = 16; // 普通僵尸宽度
            this.height = 16; // 普通僵尸高度
            this.collisionRadius = 8; // 普通僵尸碰撞半径
            this.collisionType = 'zombie'; // 碰撞类型
            this.color = '#4caf50'; // 普通僵尸颜色
            this.speed = 0.2; // 普通僵尸移动速度
            this.health = 50; // 普通僵尸生命值
            this.turnSpeed = 0.015; // 普通僵尸转向速度
        }
        
        // 朝向属性
        this.direction = { x: 0, y: -1 }; // 默认向上
        this.facingAngle = Math.atan2(this.direction.y, this.direction.x); // 当前朝向角度
        this.targetAngle = this.facingAngle; // 目标朝向角度
        this.turnDirection = 1; // 转向方向：1为顺时针，-1为逆时针
        
        // 攻击相关属性
        // 攻击范围：缩小范围并调整位置
        this.attackRange = this.isBoss ? 25 : 15; // 攻击范围（略微缩小）
        this.attackDamage = this.isBoss ? 20 : 5; // 攻击力（BOSS伤害翻倍）
        this.attackCooldown = this.isBoss ? 1000 : 1500; // 攻击冷却时间（毫秒）
        this.lastAttackTime = 0; // 上次攻击时间
        this.isAttacking = false; // 是否正在攻击
        this.attackAnimationTime = 200; // 攻击动画持续时间
        this.attackStartTime = 0; // 攻击开始时间
        
        // 音效
        this.sounds = {
            groan: null,   // 低吼声音
            footstep: null, // 脚步声
            hurt: null     // 受伤声音
        };
        
        // 尝试初始化音效
        try {
            // 低吼声音
            this.sounds.groan = (sourceX = this.x, sourceY = this.y) => {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                const pannerNode = audioContext.createPanner();
                
                // 设置3D音效参数
                pannerNode.panningModel = 'HRTF';
                pannerNode.distanceModel = 'inverse';
                pannerNode.refDistance = 100;
                pannerNode.maxDistance = 10000;
                pannerNode.rolloffFactor = 1;
                
                // 计算声源位置（相对于玩家）
                let relativeX = 0;
                let relativeY = 0;
                if (players.length > 0) {
                    const player = players[0]; // 以玩家1为参考
                    relativeX = sourceX - (player.x + player.width / 2);
                    relativeY = sourceY - (player.y + player.height / 2);
                }
                
                // 设置声源位置
                pannerNode.setPosition(relativeX / 100, relativeY / 100, 0);
                
                // 连接音频节点
                oscillator.connect(gainNode);
                gainNode.connect(pannerNode);
                pannerNode.connect(audioContext.destination);
                
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 1);
                
                // 根据距离调整音量
                const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
                const volume = Math.max(0.05, Math.min(0.1, 1 / (1 + distance / 150)));
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 1);
            };
            
            // 脚步声
            this.sounds.footstep = (sourceX = this.x, sourceY = this.y) => {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                const pannerNode = audioContext.createPanner();
                
                // 设置3D音效参数
                pannerNode.panningModel = 'HRTF';
                pannerNode.distanceModel = 'inverse';
                pannerNode.refDistance = 100;
                pannerNode.maxDistance = 10000;
                pannerNode.rolloffFactor = 1;
                
                // 计算声源位置（相对于玩家）
                let relativeX = 0;
                let relativeY = 0;
                if (players.length > 0) {
                    const player = players[0]; // 以玩家1为参考
                    relativeX = sourceX - (player.x + player.width / 2);
                    relativeY = sourceY - (player.y + player.height / 2);
                }
                
                // 设置声源位置
                pannerNode.setPosition(relativeX / 100, relativeY / 100, 0);
                
                // 连接音频节点
                oscillator.connect(gainNode);
                gainNode.connect(pannerNode);
                pannerNode.connect(audioContext.destination);
                
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
                
                // 根据距离调整音量
                const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
                const volume = Math.max(0.03, Math.min(0.08, 1 / (1 + distance / 120)));
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
            };
            
            // 受伤声音
            this.sounds.hurt = (sourceX = this.x, sourceY = this.y) => {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                const pannerNode = audioContext.createPanner();
                
                // 设置3D音效参数
                pannerNode.panningModel = 'HRTF';
                pannerNode.distanceModel = 'inverse';
                pannerNode.refDistance = 100;
                pannerNode.maxDistance = 10000;
                pannerNode.rolloffFactor = 1;
                
                // 计算声源位置（相对于玩家）
                let relativeX = 0;
                let relativeY = 0;
                if (players.length > 0) {
                    const player = players[0]; // 以玩家1为参考
                    relativeX = sourceX - (player.x + player.width / 2);
                    relativeY = sourceY - (player.y + player.height / 2);
                }
                
                // 设置声源位置
                pannerNode.setPosition(relativeX / 100, relativeY / 100, 0);
                
                // 连接音频节点
                oscillator.connect(gainNode);
                gainNode.connect(pannerNode);
                pannerNode.connect(audioContext.destination);
                
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
                
                // 根据距离调整音量
                const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
                const volume = Math.max(0.08, Math.min(0.15, 1 / (1 + distance / 150)));
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            };
        } catch (e) {
            console.log('僵尸音效初始化失败:', e);
        }
    }
    
    // A*路径寻找算法
    findPath(startX, startY, targetX, targetY) {
        // 网格大小
        const gridSize = 20;
        
        // 转换为网格坐标
        const startNode = {
            x: Math.floor(startX / gridSize),
            y: Math.floor(startY / gridSize)
        };
        const targetNode = {
            x: Math.floor(targetX / gridSize),
            y: Math.floor(targetY / gridSize)
        };
        
        // 检查起点和终点是否相同
        if (startNode.x === targetNode.x && startNode.y === targetNode.y) {
            return [{ x: startX, y: startY }, { x: targetX, y: targetY }];
        }
        
        // 检查目标位置是否可通行
        if (!this.isWalkable(targetX, targetY, gridSize)) {
            return null;
        }
        
        // 方向数组（8个方向）
        const directions = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }
        ];
        
        // 开放列表和关闭列表
        const openList = [];
        const closeList = new Set();
        
        // 初始节点
        const start = {
            x: startNode.x,
            y: startNode.y,
            g: 0,
            h: this.calculateHeuristic(startNode, targetNode),
            parent: null
        };
        
        openList.push(start);
        
        // 最大搜索次数
        const maxIterations = 500;
        let iterations = 0;
        
        while (openList.length > 0 && iterations < maxIterations) {
            // 找到f值最小的节点
            let currentIndex = 0;
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].g + openList[i].h < openList[currentIndex].g + openList[currentIndex].h) {
                    currentIndex = i;
                }
            }
            
            const current = openList[currentIndex];
            
            // 检查是否到达目标
            if (current.x === targetNode.x && current.y === targetNode.y) {
                // 回溯路径
                const path = [];
                let node = current;
                while (node) {
                    path.unshift({
                        x: node.x * gridSize + gridSize / 2,
                        y: node.y * gridSize + gridSize / 2
                    });
                    node = node.parent;
                }
                return path;
            }
            
            // 从开放列表中移除当前节点，添加到关闭列表
            openList.splice(currentIndex, 1);
            closeList.add(`${current.x},${current.y}`);
            
            // 检查所有相邻节点
            for (const dir of directions) {
                const neighborX = current.x + dir.x;
                const neighborY = current.y + dir.y;
                
                // 检查是否在网格内
                if (neighborX < 0 || neighborX >= Math.ceil(canvas.width / gridSize) ||
                    neighborY < 0 || neighborY >= Math.ceil(canvas.height / gridSize)) {
                    continue;
                }
                
                // 检查是否在关闭列表中
                if (closeList.has(`${neighborX},${neighborY}`)) {
                    continue;
                }
                
                // 检查是否可通行
                const neighborWorldX = neighborX * gridSize + gridSize / 2;
                const neighborWorldY = neighborY * gridSize + gridSize / 2;
                if (!this.isWalkable(neighborWorldX, neighborWorldY, gridSize)) {
                    continue;
                }
                
                // 计算g值
                const g = current.g + (dir.x !== 0 && dir.y !== 0 ? 1.414 : 1);
                
                // 检查是否在开放列表中
                let neighbor = openList.find(n => n.x === neighborX && n.y === neighborY);
                if (!neighbor) {
                    // 创建新节点
                    neighbor = {
                        x: neighborX,
                        y: neighborY,
                        g: g,
                        h: this.calculateHeuristic({ x: neighborX, y: neighborY }, targetNode),
                        parent: current
                    };
                    openList.push(neighbor);
                } else if (g < neighbor.g) {
                    // 更新节点
                    neighbor.g = g;
                    neighbor.parent = current;
                }
            }
            
            iterations++;
        }
        
        // 没有找到路径
        return null;
    }
    
    // 计算启发函数（曼哈顿距离）
    calculateHeuristic(node, target) {
        return Math.abs(node.x - target.x) + Math.abs(node.y - target.y);
    }
    
    // 检查位置是否可通行
    isWalkable(x, y, gridSize) {
        // 检查是否与障碍物碰撞
        for (const obstacle of obstacles) {
            if (x >= obstacle.x - gridSize / 2 && x < obstacle.x + obstacle.width + gridSize / 2 &&
                y >= obstacle.y - gridSize / 2 && y < obstacle.y + obstacle.height + gridSize / 2) {
                return false;
            }
        }
        
        // 检查是否与油桶碰撞
        for (const barrel of barrels) {
            if (x >= barrel.x - gridSize / 2 && x < barrel.x + barrel.width + gridSize / 2 &&
                y >= barrel.y - gridSize / 2 && y < barrel.y + barrel.height + gridSize / 2) {
                return false;
            }
        }
        
        return true;
    }

    // 查找有效的生成位置（从与可通行区域相连的边缘）
    findValidSpawnPosition() {
        const margin = 50; // 边缘距离
        const maxAttempts = 100; // 最大尝试次数
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const side = Math.floor(Math.random() * 4);
            let x, y;
            
            // 在边缘生成候选位置
            if (side === 0) {
                // 顶部边缘
                x = Math.random() * canvas.width;
                y = -margin;
            } else if (side === 1) {
                // 右侧边缘
                x = canvas.width + margin;
                y = Math.random() * canvas.height;
            } else if (side === 2) {
                // 底部边缘
                x = Math.random() * canvas.width;
                y = canvas.height + margin;
            } else {
                // 左侧边缘
                x = -margin;
                y = Math.random() * canvas.height;
            }
            
            // 检查这个位置是否靠近可通行区域（即不与障碍物重叠，且附近有可通行区域）
            if (this.isNearPassableArea(x, y)) {
                return { x, y };
            }
        }
        
        // 如果找不到有效位置，返回默认位置（左上角）
        return { x: -margin, y: -margin };
    }
    
    // 检查位置是否靠近可通行区域
    isNearPassableArea(x, y) {
        const checkRadius = 60; // 检查半径
        
        // 检查周围是否有可通行区域
        for (let dy = -checkRadius; dy <= checkRadius; dy += 20) {
            for (let dx = -checkRadius; dx <= checkRadius; dx += 20) {
                const checkX = x + dx;
                const checkY = y + dy;
                
                // 检查是否在画布内
                if (checkX < 0 || checkX >= canvas.width || checkY < 0 || checkY >= canvas.height) {
                    continue;
                }
                
                // 检查是否与障碍物重叠
                let isBlocked = false;
                for (const obstacle of obstacles) {
                    if (checkX >= obstacle.x && checkX < obstacle.x + obstacle.width &&
                        checkY >= obstacle.y && checkY < obstacle.y + obstacle.height) {
                        isBlocked = true;
                        break;
                    }
                }
                
                // 如果找到可通行区域，返回true
                if (!isBlocked) {
                    return true;
                }
            }
        }
        
        return false;
    }

    update() {
        // 检查是否启用了怪物静止模式
        if (freezeZombies) return;
        
        try {
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
                        this.collisionRadius += 1.5; // 同步增加碰撞半径（约为宽度增加量的一半）
                        this.attackRange += 1.5; // 同步增加攻击范围（与碰撞半径同步）
                        this.health += 60;
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
        
        // 攻击逻辑
        const now = Date.now();
        // 计算攻击范围圆心位置（略微靠后）
        const attackCenterX = this.x + this.width / 2 + this.direction.x * (this.height * 0.7);
        const attackCenterY = this.y + this.height / 2 + this.direction.y * (this.height * 0.7);
        // 计算从攻击范围圆心到最近玩家的距离
        const attackDistance = Math.sqrt(
            Math.pow(closestPlayer.x + closestPlayer.width / 2 - attackCenterX, 2) + 
            Math.pow(closestPlayer.y + closestPlayer.height / 2 - attackCenterY, 2)
        );
        if (attackDistance <= this.attackRange && now - this.lastAttackTime > this.attackCooldown) {
            this.isAttacking = true;
            this.attackStartTime = now;
            this.lastAttackTime = now;
            
            // 造成伤害
            if (!godMode && !closestPlayer.isInvulnerable) {
                // 检查僵尸是否正面对着玩家
                const zombieToPlayer = {
                    x: closestPlayer.x + closestPlayer.width / 2 - (this.x + this.width / 2),
                    y: closestPlayer.y + closestPlayer.height / 2 - (this.y + this.height / 2)
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
                const dotProduct = this.direction.x * normalizedZombieToPlayer.x + 
                                 this.direction.y * normalizedZombieToPlayer.y;
                
                // 只有当僵尸正面对着玩家时才造成伤害（点积大于0.7，约45度角内）
                if (dotProduct > 0.7) {
                    closestPlayer.health = Math.max(0, closestPlayer.health - this.attackDamage);
                    // 显示伤害飘字
                    createDamageText(closestPlayer.x + closestPlayer.width / 2, closestPlayer.y, this.attackDamage);
                    // 设置无敌时间
                    closestPlayer.isInvulnerable = true;
                    closestPlayer.isFlashing = true;
                    closestPlayer.lastHitTime = now;
                    
                    // 玩家受到攻击后有轻微的后退
                    const knockbackDistance = 5;
                    // 计算攻击方向（从玩家指向僵尸）
                    const attackDirection = {
                        x: this.x + this.width / 2 - (closestPlayer.x + closestPlayer.width / 2),
                        y: this.y + this.height / 2 - (closestPlayer.y + closestPlayer.height / 2)
                    };
                    // 归一化攻击方向
                    const attackDistance = Math.sqrt(attackDirection.x * attackDirection.x + attackDirection.y * attackDirection.y);
                    const normalizedAttackDirection = {
                        x: attackDirection.x / attackDistance,
                        y: attackDirection.y / attackDistance
                    };
                    // 朝着攻击方向的反方向后退
                    const knockbackX = normalizedAttackDirection.x * knockbackDistance;
                    const knockbackY = normalizedAttackDirection.y * knockbackDistance;
                    
                    // 应用击退效果，同时检查碰撞
                    const newX = closestPlayer.x + knockbackX;
                    const newY = closestPlayer.y + knockbackY;
                    
                    // 检查新位置是否会与障碍物碰撞
                    const testPlayer = { x: newX, y: newY, width: closestPlayer.width, height: closestPlayer.height, collisionRadius: closestPlayer.collisionRadius };
                    let canKnockback = true;
                    for (const obstacle of obstacles) {
                        if (collisionWithVolume(testPlayer, obstacle)) {
                            canKnockback = false;
                            break;
                        }
                    }
                    
                    if (canKnockback) {
                        closestPlayer.x = Math.max(0, Math.min(canvas.width - closestPlayer.width, newX));
                        closestPlayer.y = Math.max(0, Math.min(canvas.height - closestPlayer.height, newY));
                    }
                }
            }
        }
        
        // BOSS攻击木墙逻辑 - 只有当没有玩家在攻击范围内时才攻击木墙
        if (this.isBoss && now - this.lastAttackTime > this.attackCooldown && attackDistance > this.attackRange) {
            // 检测攻击范围内的木墙
            for (let j = obstacles.length - 1; j >= 0; j--) {
                const obstacle = obstacles[j];
                if (obstacle.type === 'wood' && !obstacle.indestructible) {
                    // 计算从攻击范围圆心到木墙的距离
                    const wallDistance = Math.sqrt(
                        Math.pow(obstacle.x + obstacle.width / 2 - attackCenterX, 2) + 
                        Math.pow(obstacle.y + obstacle.height / 2 - attackCenterY, 2)
                    );
                    
                    if (wallDistance <= this.attackRange) {
                        this.isAttacking = true;
                        this.attackStartTime = now;
                        this.lastAttackTime = now;
                        
                        // 对木墙造成伤害
                        obstacle.health -= this.attackDamage;
                        // 显示伤害飘字
                        createDamageText(obstacle.x + obstacle.width / 2, obstacle.y, this.attackDamage);
                        
                        // 如果木墙被破坏，移除它
                        if (obstacle.health <= 0) {
                            obstacles.splice(j, 1);
                        }
                        break;
                    }
                }
            }
        }
        
        // 攻击动画结束
        if (this.isAttacking && now - this.attackStartTime > this.attackAnimationTime) {
            this.isAttacking = false;
        }
        
        // 路径寻找算法
        // 计算到最近玩家的路径
        const targetX = closestPlayer.x + closestPlayer.width / 2;
        const targetY = closestPlayer.y + closestPlayer.height / 2;
        const startX = this.x + this.width / 2;
        const startY = this.y + this.height / 2;
        
        // 尝试寻找路径
        const path = this.findPath(startX, startY, targetX, targetY);
        
        let targetAngle = this.facingAngle;
        if (path && path.length > 1) {
            // 如果找到路径，使用路径的下一个点作为目标
            const nextPoint = path[1];
            const dx = nextPoint.x - startX;
            const dy = nextPoint.y - startY;
            targetAngle = Math.atan2(dy, dx);
        } else {
            // 如果没有找到路径，直接向玩家移动
            const dx = targetX - startX;
            const dy = targetY - startY;
            targetAngle = Math.atan2(dy, dx);
        }
        
        // 平滑转向
        let angleDiff = targetAngle - this.facingAngle;
        
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
            this.facingAngle = targetAngle;
        }
        
        // 更新朝向向量
        this.direction = {
            x: Math.cos(this.facingAngle),
            y: Math.sin(this.facingAngle)
        };
        
        // 计算移动向量
        const moveX = this.direction.x * this.speed * gameSpeed;
        const moveY = this.direction.y * this.speed * gameSpeed;
        
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
        
        // 检测与油桶的碰撞
        if (canMoveX) {
            for (const barrel of barrels) {
                if (collisionWithVolume(testRectX, barrel)) {
                    canMoveX = false;
                    break;
                }
            }
        }
        
        // 检测与玩家的碰撞
        if (canMoveX) {
            for (const player of players) {
                if (!player.isDead && collisionWithVolume(testRectX, player)) {
                    canMoveX = false;
                    // 推开玩家 - 限制推挤距离，并检查是否会被推入地形或与其他玩家碰撞
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
                        // 检查新位置是否会与其他玩家碰撞
                        if (canPush) {
                            for (const otherPlayer of players) {
                                if (otherPlayer !== player && !otherPlayer.isDead) {
                                    if (collisionWithVolume(testPlayerX, otherPlayer)) {
                                        canPush = false;
                                        break;
                                    }
                                }
                            }
                        }
                        // 检查新位置是否会与其他僵尸（包括BOSS）碰撞
                        if (canPush) {
                            for (const zombie of zombies) {
                                if (!zombie.isDead) {
                                    if (collisionWithVolume(testPlayerX, zombie)) {
                                        canPush = false;
                                        break;
                                    }
                                }
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
                        // 检查新位置是否会与其他玩家碰撞
                        if (canPush) {
                            for (const otherPlayer of players) {
                                if (otherPlayer !== player && !otherPlayer.isDead) {
                                    if (collisionWithVolume(testPlayerX, otherPlayer)) {
                                        canPush = false;
                                        break;
                                    }
                                }
                            }
                        }
                        // 检查新位置是否会与其他僵尸（包括BOSS）碰撞
                        if (canPush) {
                            for (const zombie of zombies) {
                                if (!zombie.isDead) {
                                    if (collisionWithVolume(testPlayerX, zombie)) {
                                        canPush = false;
                                        break;
                                    }
                                }
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
                    // 推开其他僵尸 - 限制推挤距离，并检查是否会被推入地形或与玩家碰撞
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
                        // 检查新位置是否会与玩家碰撞
                        if (canPush) {
                            for (const player of players) {
                                if (!player.isDead && collisionWithVolume(testZombieX, player)) {
                                    canPush = false;
                                    break;
                                }
                            }
                        }
                        // 检查新位置是否会与其他僵尸碰撞
                        if (canPush) {
                            for (const otherZombie of zombies) {
                                if (otherZombie !== zombie && !otherZombie.isDead && collisionWithVolume(testZombieX, otherZombie)) {
                                    canPush = false;
                                    break;
                                }
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
                        // 检查新位置是否会与玩家碰撞
                        if (canPush) {
                            for (const player of players) {
                                if (!player.isDead && collisionWithVolume(testZombieX, player)) {
                                    canPush = false;
                                    break;
                                }
                            }
                        }
                        // 检查新位置是否会与其他僵尸碰撞
                        if (canPush) {
                            for (const otherZombie of zombies) {
                                if (otherZombie !== zombie && !otherZombie.isDead && collisionWithVolume(testZombieX, otherZombie)) {
                                    canPush = false;
                                    break;
                                }
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
        
        // 检测与油桶的碰撞
        if (canMoveY) {
            for (const barrel of barrels) {
                if (collisionWithVolume(testRectY, barrel)) {
                    canMoveY = false;
                    break;
                }
            }
        }
        
        // 检测与玩家的碰撞
        if (canMoveY) {
            for (const player of players) {
                if (!player.isDead && collisionWithVolume(testRectY, player)) {
                    canMoveY = false;
                    // 推开玩家 - 限制推挤距离，并检查是否会被推入地形或与其他玩家碰撞
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
                        // 检查新位置是否会与其他玩家碰撞
                        if (canPush) {
                            for (const otherPlayer of players) {
                                if (otherPlayer !== player && !otherPlayer.isDead) {
                                    if (collisionWithVolume(testPlayerY, otherPlayer)) {
                                        canPush = false;
                                        break;
                                    }
                                }
                            }
                        }
                        // 检查新位置是否会与其他僵尸（包括BOSS）碰撞
                        if (canPush) {
                            for (const zombie of zombies) {
                                if (!zombie.isDead) {
                                    if (collisionWithVolume(testPlayerY, zombie)) {
                                        canPush = false;
                                        break;
                                    }
                                }
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
                        // 检查新位置是否会与其他玩家碰撞
                        if (canPush) {
                            for (const otherPlayer of players) {
                                if (otherPlayer !== player && !otherPlayer.isDead) {
                                    if (collisionWithVolume(testPlayerY, otherPlayer)) {
                                        canPush = false;
                                        break;
                                    }
                                }
                            }
                        }
                        // 检查新位置是否会与其他僵尸（包括BOSS）碰撞
                        if (canPush) {
                            for (const zombie of zombies) {
                                if (!zombie.isDead) {
                                    if (collisionWithVolume(testPlayerY, zombie)) {
                                        canPush = false;
                                        break;
                                    }
                                }
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
                    // 推开其他僵尸 - 限制推挤距离，并检查是否会被推入地形或与玩家碰撞
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
                        // 检查新位置是否会与玩家碰撞
                        if (canPush) {
                            for (const player of players) {
                                if (!player.isDead && collisionWithVolume(testZombieY, player)) {
                                    canPush = false;
                                    break;
                                }
                            }
                        }
                        // 检查新位置是否会与其他僵尸碰撞
                        if (canPush) {
                            for (const otherZombie of zombies) {
                                if (otherZombie !== zombie && !otherZombie.isDead && collisionWithVolume(testZombieY, otherZombie)) {
                                    canPush = false;
                                    break;
                                }
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
                        // 检查新位置是否会与玩家碰撞
                        if (canPush) {
                            for (const player of players) {
                                if (!player.isDead && collisionWithVolume(testZombieY, player)) {
                                    canPush = false;
                                    break;
                                }
                            }
                        }
                        // 检查新位置是否会与其他僵尸碰撞
                        if (canPush) {
                            for (const otherZombie of zombies) {
                                if (otherZombie !== zombie && !otherZombie.isDead && collisionWithVolume(testZombieY, otherZombie)) {
                                    canPush = false;
                                    break;
                                }
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
        
        } catch (error) {
            console.error('僵尸更新错误:', error);
            // 显示错误信息到游戏界面
            addLog(`僵尸更新错误: ${error.message}`);
        }
    }

    draw() {
        ctx.save();
        
        // 将坐标系原点移动到僵尸中心
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        ctx.translate(centerX, centerY);
        
        // 旋转整个僵尸（额外旋转90度）
        ctx.rotate(this.facingAngle + Math.PI / 2);
        
        // 攻击动画效果
        let attackOffset = 0;
        if (this.isAttacking) {
            const attackProgress = (Date.now() - this.attackStartTime) / this.attackAnimationTime;
            attackOffset = Math.sin(attackProgress * Math.PI) * 10; // 手臂向前伸展的偏移量
        }
        
        // 绘制僵尸身体
        ctx.fillStyle = this.color;
        if (this.isBoss) {
            // BOSS绘制为圆形
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            // BOSS身体描边
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // 普通僵尸绘制为矩形
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            // 普通僵尸身体描边
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
        
        // 绘制僵尸头部 - 椭圆形，窄边对着前方（Y轴负方向）
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.ellipse(0, -this.height / 2 - this.width / 8, this.width / 8, this.width / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // 头部描边
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -this.height / 2 - this.width / 8, this.width / 8, this.width / 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        
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
        // 眼睛描边
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(eyeX - eyeOffset, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.arc(eyeX + eyeOffset, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制僵尸手臂 - 向前伸出
        ctx.fillStyle = this.color;
        // 手臂长度和宽度相对于身体大小（BOSS手臂更长更粗）
        const armLengthRatio = this.isBoss ? 0.5 : 0.94; // 手臂长度相对于身体宽度的比例
        const armWidthRatio = this.isBoss ? 0.2 : 0.375; // 手臂宽度相对于身体宽度的比例
        const armLength = (this.width * armLengthRatio) + attackOffset;
        const armWidth = this.width * armWidthRatio;
        // 手臂水平间距相对于身体宽度的比例（0.6表示手臂距离身体中心60%的宽度）
        const armSpreadRatio = 0.6;
        const armXOffset = this.width * armSpreadRatio;
        const armYOffset = -this.height / 2 + (this.height * 0.2); // 手臂Y位置也相对于身体高度
        
        // 左手臂 - 从身体左侧向前伸出
        ctx.beginPath();
        ctx.moveTo(-armXOffset, armYOffset);
        ctx.lineTo(-armXOffset, armYOffset - armLength);
        ctx.lineTo(-armXOffset + armWidth, armYOffset - armLength);
        ctx.lineTo(-armXOffset + armWidth, armYOffset);
        ctx.closePath();
        ctx.fill();
        // 左手臂描边
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-armXOffset, armYOffset);
        ctx.lineTo(-armXOffset, armYOffset - armLength);
        ctx.lineTo(-armXOffset + armWidth, armYOffset - armLength);
        ctx.lineTo(-armXOffset + armWidth, armYOffset);
        ctx.closePath();
        ctx.stroke();
        
        // 右手臂 - 从身体右侧向前伸出
        ctx.beginPath();
        ctx.moveTo(armXOffset - armWidth, armYOffset);
        ctx.lineTo(armXOffset - armWidth, armYOffset - armLength);
        ctx.lineTo(armXOffset, armYOffset - armLength);
        ctx.lineTo(armXOffset, armYOffset);
        ctx.closePath();
        ctx.fill();
        // 右手臂描边
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(armXOffset - armWidth, armYOffset);
        ctx.lineTo(armXOffset - armWidth, armYOffset - armLength);
        ctx.lineTo(armXOffset, armYOffset - armLength);
        ctx.lineTo(armXOffset, armYOffset);
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
        
        // 绘制生命值条（不旋转）
        ctx.fillStyle = '#ff6b6b';
        const maxHealth = this.isBoss ? 800 : 50; // 最大生命值：BOSS为800，普通僵尸为50
        const maxBarWidth = this.isBoss ? 50 : 40; // 血条最大宽度限制：BOSS为80像素，普通僵尸为50像素
        const barWidth = Math.min(this.width, maxBarWidth) * (this.health / maxHealth);
        ctx.fillRect(this.x, this.y - 10, barWidth, 5);
        
        // 绘制BOSS标识（不旋转）
        if (this.isBoss) {
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('BOSS', this.x + this.width / 2, this.y - 15);
        }
        
        // 绘制攻击范围（红色半透明圆圈）- 圆心向前偏移，更符合手臂攻击范围
        if (showAttackRange) {
            const attackCenterX = this.x + this.width / 2 + this.direction.x * (this.height);
            const attackCenterY = this.y + this.height / 2 + this.direction.y * (this.height);
            ctx.beginPath();
            ctx.arc(attackCenterX, attackCenterY, this.attackRange, 0, Math.PI * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.stroke();
        }
        
        // 绘制碰撞体积（红色线条）
        if (showAttackRange) {
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.collisionRadius, 0, Math.PI * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ff0000';
            ctx.stroke();
        }
    }
}

// 事件监听
window.addEventListener('keydown', (e) => {
    // 阻止方向键、空格键和回车键的默认行为，避免页面滚动
    if (e.key.startsWith('Arrow') || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
    }
    
    // 开始界面：按空格或回车键开始游戏
    if (!gameRunning && (e.key === ' ' || e.key === 'Enter')) {
        const startScreen = document.getElementById('startScreen');
        if (startScreen && startScreen.style.display !== 'none') {
            startGame();
            return;
        }
    }
    
    // 对于方向键，保持原始形式
    if (e.key.startsWith('Arrow')) {
        keys[e.key] = true;
    } else {
        keys[e.key.toLowerCase()] = true;
    }
    
    // ESC键：暂停/恢复游戏
    if (e.key === 'Escape' && gameRunning) {
        if (!gamePaused) {
            // 开始暂停
            gamePaused = true;
            pauseStartTime = Date.now();
            addLog('游戏已暂停');
        } else {
            // 恢复游戏
            gamePaused = false;
            totalPauseTime += Date.now() - pauseStartTime;
            addLog('游戏已恢复');
        }
    }
    
    // 只有在游戏未暂停时才处理其他按键
    if (!gamePaused) {
        // 小键盘1：玩家2上一个武器
        if (e.code === 'Numpad1' && gameRunning) {
            const player2 = players[1];
            const weaponNames = Object.keys(player2.weapons);
            const currentIndex = weaponNames.indexOf(player2.currentWeapon);
            const prevIndex = (currentIndex - 1 + weaponNames.length) % weaponNames.length;
            player2.switchWeapon(weaponNames[prevIndex]);
        }
        
        // 小键盘2：玩家2下一个武器
        if (e.code === 'Numpad2' && gameRunning) {
            const player2 = players[1];
            const weaponNames = Object.keys(player2.weapons);
            const currentIndex = weaponNames.indexOf(player2.currentWeapon);
            const nextIndex = (currentIndex + 1) % weaponNames.length;
            player2.switchWeapon(weaponNames[nextIndex]);
        }
        
        // Q键：玩家1上一个武器
        if (e.key.toLowerCase() === 'q' && gameRunning) {
            const player1 = players[0];
            const weaponNames = Object.keys(player1.weapons);
            const currentIndex = weaponNames.indexOf(player1.currentWeapon);
            const prevIndex = (currentIndex - 1 + weaponNames.length) % weaponNames.length;
            player1.switchWeapon(weaponNames[prevIndex]);
        }
        
        // E键：玩家1下一个武器
        if (e.key.toLowerCase() === 'e' && gameRunning) {
            const player1 = players[0];
            const weaponNames = Object.keys(player1.weapons);
            const currentIndex = weaponNames.indexOf(player1.currentWeapon);
            const nextIndex = (currentIndex + 1) % weaponNames.length;
            player1.switchWeapon(weaponNames[nextIndex]);
        }
        
        // 作弊功能
        if (gameRunning) {
            // 数字键0：玩家2开关AI托管（使用e.code确保只响应普通数字键）
            if (e.code === 'Digit0') {
                const player2 = players[1];
                player2.isAI = !player2.isAI;
                addLog(player2.isAI ? '玩家2已启用AI托管' : '玩家2已禁用AI托管');
            }
            // 数字键1：无敌模式（使用e.code确保只响应普通数字键）
            else if (e.code === 'Digit1') {
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
            // 数字键2：怪物静止（使用e.code确保只响应普通数字键）
            else if (e.code === 'Digit2') {
                freezeZombies = !freezeZombies;
                addLog(freezeZombies ? '启用怪物静止模式' : '禁用怪物静止模式');
            }
            // 数字键3：清屏（秒杀所有怪物）（使用e.code确保只响应普通数字键）
            else if (e.code === 'Digit3') {
                zombies = [];
                addLog('清屏：秒杀所有怪物');
            }
            // 数字键4：自动射击（使用e.code确保只响应普通数字键）
            else if (e.code === 'Digit4') {
                players.forEach(player => {
                    player.autoShoot = !player.autoShoot;
                });
                addLog(players[0].autoShoot ? '启用自动射击' : '禁用自动射击');
            }
            // 数字键5：无限子弹（使用e.code确保只响应普通数字键）
            else if (e.code === 'Digit5') {
                infiniteAmmo = !infiniteAmmo;
                addLog(infiniteAmmo ? '启用无限子弹模式' : '禁用无限子弹模式');
            }
            // 数字键7：开关友伤机制（使用e.code确保只响应普通数字键）
            else if (e.code === 'Digit7') {
                friendlyFire = !friendlyFire;
                addLog(friendlyFire ? '启用友伤机制' : '禁用友伤机制');
            }
            // 数字键8：开关地图调试模式（使用e.code确保只响应普通数字键）
            else if (e.code === 'Digit8') {
                showMapDebug = !showMapDebug;
                addLog(showMapDebug ? '显示地图调试模式' : '隐藏地图调试模式');
            }
            // 数字键9：开关攻击范围显示（使用e.code确保只响应普通数字键）
            else if (e.code === 'Digit9') {
                console.log('数字键9被按下，当前状态:', showAttackRange);
                showAttackRange = !showAttackRange;
                addLog(showAttackRange ? '显示攻击范围' : '隐藏攻击范围');
                console.log('切换后状态:', showAttackRange);
            }
            // 【键：视角缩小
            else if (e.key === '【' || e.key === '[') {
                cameraScale = Math.max(minCameraScale, cameraScale - cameraScaleStep);
                addLog(`视角缩小至 ${cameraScale.toFixed(1)}x`);
            }
            // 】键：视角放大
            else if (e.key === '】' || e.key === ']') {
                cameraScale = Math.min(maxCameraScale, cameraScale + cameraScaleStep);
                addLog(`视角放大至 ${cameraScale.toFixed(1)}x`);
            }
            // Z键：开关朝向固定
            else if (e.key.toLowerCase() === 'z') {
                players.forEach(player => {
                    if (!player.isAI) {
                        player.isDirectionFixed = !player.isDirectionFixed;
                        addLog(`${player.isPlayer1 ? '玩家1' : '玩家2'}${player.isDirectionFixed ? '开启' : '关闭'}朝向固定`);
                    }
                });
            }
            // 加号键：加速游戏
            else if (e.key === '+' || e.key === '=') {
                gameSpeed = Math.min(8.0, gameSpeed + 0.5);
                addLog(`游戏速度: ${gameSpeed.toFixed(1)}x`);
            }
            // 减号键：减速游戏
            else if (e.key === '-' || e.key === '_') {
                gameSpeed = Math.max(0.5, gameSpeed - 0.5);
                addLog(`游戏速度: ${gameSpeed.toFixed(1)}x`);
            }
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
    medkits = [];
    barrels = [];
    particles = [];
    lights = [];
    // 如果没有从地图数据加载障碍物，才清空obstacles数组
    if (obstacles.length === 0) {
        obstacles = [];
    }
    
    // 生成随机地形（已注释，使用navmesh.png生成的障碍物）
    // generateObstacles();
    
    // 生成油桶
    for (let i = 0; i < barrelCount; i++) {
        let validPosition = false;
        let barrelX, barrelY;
        const barrelWidth = 20; // 油桶宽度
        const barrelHeight = 20; // 油桶高度
        
        while (!validPosition) {
                barrelX = Math.random() * (canvas.width - barrelWidth);
                barrelY = Math.random() * (canvas.height - barrelHeight);
            
            // 检查是否与障碍物重叠
            validPosition = true;
            for (const obstacle of obstacles) {
                if (barrelX < obstacle.x + obstacle.width && 
                    barrelX + barrelWidth > obstacle.x && 
                    barrelY < obstacle.y + obstacle.height && 
                    barrelY + barrelHeight > obstacle.y) {
                    validPosition = false;
                    break;
                }
            }
            
            // 检查是否与玩家重叠
            if (validPosition) {
                for (const player of players) {
                    if (barrelX < player.x + player.width && 
                        barrelX + barrelWidth > player.x && 
                        barrelY < player.y + player.height && 
                        barrelY + barrelHeight > player.y) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            // 检查是否与其他油桶重叠
            if (validPosition) {
                for (const existingBarrel of barrels) {
                    if (barrelX < existingBarrel.x + existingBarrel.width && 
                        barrelX + barrelWidth > existingBarrel.x && 
                        barrelY < existingBarrel.y + existingBarrel.height && 
                        barrelY + barrelHeight > existingBarrel.y) {
                        validPosition = false;
                        break;
                    }
                }
            }
        }
        
        barrels.push({
            x: barrelX,
            y: barrelY,
            width: barrelWidth,
            height: barrelHeight,
            health: 1, // 一击就爆炸
            collisionRadius: 10,
            collisionType: 'barrel'
        });
    }
}

// 创建粒子特效
function createParticles(x, y, type = 'explosion', count = 20) {
    for (let i = 0; i < count; i++) {
        let particle;
        
        switch (type) {
            case 'explosion':
                particle = {
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 1.0,
                    maxLife: 1.0,
                    size: Math.random() * 4 + 2,
                    color: `hsl(${Math.random() * 60 + 20}, 100%, ${Math.random() * 50 + 50}%)`,
                    type: 'explosion'
                };
                break;
            case 'hit':
                particle = {
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    life: 0.8,
                    maxLife: 0.8,
                    size: Math.random() * 2 + 1,
                    color: `hsl(${Math.random() * 30}, 100%, ${Math.random() * 30 + 70}%)`,
                    type: 'hit'
                };
                break;
            case 'blood':
                particle = {
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 0.5) * 3 - 2,
                    life: 1.2,
                    maxLife: 1.2,
                    size: Math.random() * 3 + 1,
                    color: `hsl(${Math.random() * 20}, 100%, 30%)`,
                    type: 'blood'
                };
                break;
            case 'smoke':
                particle = {
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -Math.random() * 3 - 1,
                    life: 2.0,
                    maxLife: 2.0,
                    size: Math.random() * 3 + 2,
                    color: `hsl(0, 0%, ${Math.random() * 30 + 50}%)`,
                    type: 'smoke'
                };
                break;
            default:
                particle = {
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    life: 1.0,
                    maxLife: 1.0,
                    size: Math.random() * 3 + 1,
                    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                    type: 'default'
                };
        }
        
        particles.push(particle);
    }
}

// 更新粒子特效
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // 更新位置
        particle.x += particle.vx * gameSpeed;
        particle.y += particle.vy * gameSpeed;
        
        // 应用重力
        if (particle.type !== 'smoke' && particle.type !== 'explosion') {
            particle.vy += 0.2 * gameSpeed;
        }
        
        // 减少生命值
        particle.life -= 0.02 * gameSpeed;
        
        // 移除生命值为0的粒子
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// 绘制粒子特效
function drawParticles() {
    for (const particle of particles) {
        // 计算透明度
        const alpha = particle.life / particle.maxLife;
        
        // 绘制粒子
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        
        if (particle.type === 'smoke') {
            // 绘制烟雾效果（圆形）
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 绘制其他粒子（矩形）
            ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
        }
        
        ctx.restore();
    }
}

// 创建动态光源
function createLight(x, y, radius, color, duration = 2000) {
    lights.push({
        x: x,
        y: y,
        radius: radius,
        color: color,
        duration: duration,
        startTime: Date.now()
    });
}

// 更新光源效果
function updateLights() {
    const now = Date.now();
    for (let i = lights.length - 1; i >= 0; i--) {
        const light = lights[i];
        
        // 检查是否过期
        if (now - light.startTime > light.duration) {
            lights.splice(i, 1);
        }
    }
}

// 绘制光源效果
function drawLights() {
    for (const light of lights) {
        const elapsed = Date.now() - light.startTime;
        const progress = elapsed / light.duration;
        const alpha = Math.max(0, 1 - progress);
        
        // 绘制光源
        ctx.save();
        ctx.globalAlpha = alpha * 0.3;
        
        // 创建径向渐变
        const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
        gradient.addColorStop(0, light.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// 游戏循环
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    // 帧率控制
    if (!lastFrameTime) lastFrameTime = timestamp;
    const elapsed = timestamp - lastFrameTime;
    
    // 只有当经过的时间大于或等于帧间隔时，才执行游戏逻辑
    if (elapsed >= frameInterval) {
        frameCount++;
        lastFrameTime = timestamp - (elapsed % frameInterval); // 调整lastFrameTime，保持帧率稳定
        
        try {
    
    // 更新游戏时间显示
    if (gameStartTime > 0) {
        let elapsedTime = Date.now() - gameStartTime;
        // 如果游戏暂停，减去当前的暂停时间
        if (gamePaused) {
            elapsedTime -= (Date.now() - pauseStartTime);
        }
        // 减去之前的总暂停时间
        elapsedTime -= totalPauseTime;
        
        const seconds = Math.floor(elapsedTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        document.getElementById('gameTime').textContent = timeString;
    }
    
    // 重新绘制画布，解决拖影问题
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算相机偏移量，实现相机跟随
    if (cameraScale > 1.0 && players.length > 0) {
        // 计算所有存活玩家的平均位置
        let alivePlayers = players.filter(player => !player.isDead);
        if (alivePlayers.length > 0) {
            let avgX = 0;
            let avgY = 0;
            for (const player of alivePlayers) {
                avgX += player.x + player.width / 2;
                avgY += player.y + player.height / 2;
            }
            avgX /= alivePlayers.length;
            avgY /= alivePlayers.length;
            
            // 计算相机目标偏移量，使玩家保持在屏幕中心
            const targetOffsetX = (canvas.width / 2 - avgX) * (cameraScale - 1);
            const targetOffsetY = (canvas.height / 2 - avgY) * (cameraScale - 1);
            
            // 平滑相机移动
            cameraOffset.x += (targetOffsetX - cameraOffset.x) * 0.1;
            cameraOffset.y += (targetOffsetY - cameraOffset.y) * 0.1;
            
            // 当有两个或更多玩家时，检查玩家之间的距离
            if (alivePlayers.length >= 2) {
                // 计算玩家之间的最大距离
                let maxDistance = 0;
                for (let i = 0; i < alivePlayers.length; i++) {
                    for (let j = i + 1; j < alivePlayers.length; j++) {
                        const player1 = alivePlayers[i];
                        const player2 = alivePlayers[j];
                        const dx = (player1.x + player1.width / 2) - (player2.x + player2.width / 2);
                        const dy = (player1.y + player1.height / 2) - (player2.y + player2.height / 2);
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance > maxDistance) {
                            maxDistance = distance;
                        }
                    }
                }
                
                // 计算屏幕对角线长度
                const screenDiagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
                // 当玩家距离超过屏幕对角线的70%时，自动缩小视角
                const distanceThreshold = screenDiagonal * 0.7 / cameraScale;
                if (maxDistance > distanceThreshold && cameraScale > minCameraScale) {
                    // 缓慢缩小视角
                    cameraScale = Math.max(minCameraScale, cameraScale - 0.01);
                    addLog(`玩家距离过远，自动缩小视角至 ${cameraScale.toFixed(1)}x`);
                }
                // 当玩家距离较近时，自动放大视角恢复到默认值
                else if (maxDistance < distanceThreshold * 0.5 && cameraScale < 1.2) {
                    // 缓慢放大视角
                    cameraScale = Math.min(1.2, cameraScale + 0.01);
                    addLog(`玩家距离较近，自动放大视角至 ${cameraScale.toFixed(1)}x`);
                }
            }
        }
    } else {
        // 当缩放比例为1或没有玩家时，重置相机偏移
        cameraOffset.x = 0;
        cameraOffset.y = 0;
    }
    
    // 应用视角缩放和相机偏移
    ctx.save();
    // 计算缩放后的中心点
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // 移动到中心点，缩放，然后移回并应用相机偏移
    ctx.translate(centerX, centerY);
    ctx.scale(cameraScale, cameraScale);
    ctx.translate(-centerX + cameraOffset.x, -centerY + cameraOffset.y);
    
    // 绘制地图背景
    if (mapImage) {
        try {
            if (showMapDebug) {
                // 先绘制地图背景图片
                ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
                
                // 绘制灰色和紫色的可通行/不可通行区域
                // 灰色表示可通行区域，紫色表示不可通行区域
                const cellSize = 20;
                
                for (let y = 0; y < canvas.height; y += cellSize) {
                    for (let x = 0; x < canvas.width; x += cellSize) {
                        // 检查这个位置是否有障碍物
                        let hasObstacle = false;
                        for (const obstacle of obstacles) {
                            if (obstacle.x === x && obstacle.y === y) {
                                hasObstacle = true;
                                break;
                            }
                        }
                        
                        // 根据是否有障碍物绘制不同颜色
                        if (!hasObstacle) {
                            // 可通行区域 - 半透明灰色
                            ctx.fillStyle = 'rgba(136, 136, 136, 0.3)';
                        } else {
                            // 不可通行区域 - 半透明紫色
                            ctx.fillStyle = 'rgba(128, 0, 128, 0.5)';
                        }
                        ctx.fillRect(x, y, cellSize, cellSize);
                    }
                }
            } else {
                // 绘制地图背景图片
                ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
            }
        } catch (error) {
            console.error('绘制地图时出错:', error);
            // 出错时绘制默认背景
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } else {
        // 如果地图图片未加载，绘制默认背景
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 绘制障碍物
    drawObstacles();
    
    // 绘制光源效果
    drawLights();
    
    // 只有在游戏未暂停时才更新游戏逻辑
    if (!gamePaused) {
        // 生成僵尸
        const now = Date.now();
        if (now - lastZombieSpawn > zombieSpawnInterval / gameSpeed && zombies.length < maxZombies) {
            // 5%概率生成BOSS
            const isBoss = Math.random() < 0.05;
            zombies.push(new Zombie(isBoss));
            lastZombieSpawn = now;
            // 逐渐缩短生成间隔
            zombieSpawnInterval = Math.max(1000, zombieSpawnInterval - 20);
        }
        
        // 生成急救包
        if (now - lastMedkitSpawn > medkitSpawnInterval && Math.random() < medkitSpawnChance) {
            // 随机生成急救包位置，确保不在障碍物上
            let validPosition = false;
            let medkitX, medkitY;
            
            while (!validPosition) {
                medkitX = Math.random() * (canvas.width - 20);
                medkitY = Math.random() * (canvas.height - 20);
                
                // 检查是否与障碍物重叠
                validPosition = true;
                for (const obstacle of obstacles) {
                    if (medkitX < obstacle.x + obstacle.width && 
                        medkitX + 30 > obstacle.x && 
                        medkitY < obstacle.y + obstacle.height && 
                        medkitY + 30 > obstacle.y) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            medkits.push({
                x: medkitX,
                y: medkitY,
                width: 20,
                height: 20,
                spawnTime: now
            });
            lastMedkitSpawn = now;
        }
        
        // 更新和绘制急救包（在玩家和僵尸之前绘制，使其层级更低）
        for (let i = medkits.length - 1; i >= 0; i--) {
            const medkit = medkits[i];
            
            // 绘制急救包（白色矩形）
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(medkit.x, medkit.y, medkit.width, medkit.height);
            // 急救包描边
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(medkit.x, medkit.y, medkit.width, medkit.height);
            
            // 绘制红色+号
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(medkit.x + 5, medkit.y + medkit.height / 2);
            ctx.lineTo(medkit.x + medkit.width - 5, medkit.y + medkit.height / 2);
            ctx.moveTo(medkit.x + medkit.width / 2, medkit.y + 5);
            ctx.lineTo(medkit.x + medkit.width / 2, medkit.y + medkit.height - 5);
            ctx.stroke();
        }
        
        // 更新和绘制僵尸（在玩家之前绘制）
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
                                // 创建受伤粒子特效
                                createParticles(player.x + player.width / 2, player.y + player.height / 2, 'blood', 15);
                                // 设置无敌时间
                                player.isInvulnerable = true;
                                player.isFlashing = true;
                                player.lastHitTime = Date.now();
                                player.lastFlashTime = Date.now();
                            // 非无敌模式下执行僵尸和玩家的击退（除非静止模式）
                            if (!freezeZombies) {
                                // 僵尸被击退
                                zombie.x -= (zombie.x - player.x) / 10;
                                zombie.y -= (zombie.y - player.y) / 10;
                                
                                // 玩家被击退
                                const playerKnockbackDistance = 5;
                                const playerKnockbackX = (zombie.x - player.x) / 10 * playerKnockbackDistance;
                                const playerKnockbackY = (zombie.y - player.y) / 10 * playerKnockbackDistance;
                                
                                // 计算玩家的新位置
                                const newPlayerX = player.x + playerKnockbackX;
                                const newPlayerY = player.y + playerKnockbackY;
                                
                                // 检查新位置是否会与其他玩家碰撞
                                let canKnockback = true;
                                for (const otherPlayer of players) {
                                    if (otherPlayer !== player && !otherPlayer.isDead) {
                                        // 检查碰撞
                                        const testPlayer = {
                                            x: newPlayerX,
                                            y: newPlayerY,
                                            width: player.width,
                                            height: player.height,
                                            collisionRadius: player.collisionRadius
                                        };
                                        if (collisionWithVolume(testPlayer, otherPlayer)) {
                                            canKnockback = false;
                                            break;
                                        }
                                    }
                                }
                                
                                // 检查新位置是否会与障碍物碰撞
                                if (canKnockback) {
                                    for (const obstacle of obstacles) {
                                        const testPlayer = {
                                            x: newPlayerX,
                                            y: newPlayerY,
                                            width: player.width,
                                            height: player.height,
                                            collisionRadius: player.collisionRadius
                                        };
                                        if (collisionWithVolume(testPlayer, obstacle)) {
                                            canKnockback = false;
                                            break;
                                        }
                                    }
                                }
                                
                                // 检查新位置是否会与其他僵尸（包括BOSS）碰撞
                                if (canKnockback) {
                                    for (const zombie of zombies) {
                                        if (!zombie.isDead) {
                                            const testPlayer = {
                                                x: newPlayerX,
                                                y: newPlayerY,
                                                width: player.width,
                                                height: player.height,
                                                collisionRadius: player.collisionRadius
                                            };
                                            if (collisionWithVolume(testPlayer, zombie)) {
                                                canKnockback = false;
                                                break;
                                            }
                                        }
                                    }
                                }
                                
                                // 检查新位置是否在画布范围内
                                if (canKnockback) {
                                    if (newPlayerX >= 0 && newPlayerX <= canvas.width - player.width &&
                                        newPlayerY >= 0 && newPlayerY <= canvas.height - player.height) {
                                        player.x = newPlayerX;
                                        player.y = newPlayerY;
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // 更新和绘制玩家（最后绘制，层级最高）
        players.forEach(player => {
            player.update();
            player.draw();
        });
        
        // 更新和绘制子弹
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.x += bullet.direction.x * bullet.speed * gameSpeed;
            bullet.y += bullet.direction.y * bullet.speed * gameSpeed;
            
            // 检查子弹是否超过射程
            if (bullet.startX && bullet.startY && bullet.range) {
                const distance = Math.sqrt(
                    Math.pow(bullet.x - bullet.startX, 2) + 
                    Math.pow(bullet.y - bullet.startY, 2)
                );
                if (distance > bullet.range) {
                            // 将子弹返回对象池
                            returnObjectToPool('bullets', bullet);
                            bullets.splice(i, 1);
                            continue;
                        }
            }
            
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
                    // 创建击中粒子特效
                    createParticles(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 'hit', 10);
                    createParticles(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 'blood', 15);
                    bulletHit = true;
                    
                    // 计算击退效果
                    if (!freezeZombies) {
                        // 获取武器的击退距离
                        const weapon = bullet.player.weapons[bullet.player.currentWeapon];
                        let knockbackDistance = weapon.knockback || 5;
                        
                        // 计算子弹飞行距离衰减
                        const bulletTravelDistance = Math.sqrt(
                            Math.pow(bullet.x - bullet.startX, 2) + 
                            Math.pow(bullet.y - bullet.startY, 2)
                        );
                        const weaponRange = weapon.range || 300;
                        const distanceDecay = Math.max(0.2, 1 - (bulletTravelDistance / weaponRange));
                        knockbackDistance *= distanceDecay;
                        
                        // BOSS僵尸的击退效果根据体型减小（体型越大，抗击退能力越强）
                        if (zombie.isBoss) {
                            // 基础BOSS宽度为40，每增加3宽度，击退效果降低5%
                            const baseWidth = 40;
                            const sizeFactor = Math.max(0.2, baseWidth / zombie.width); // 最小保留20%击退效果
                            knockbackDistance *= sizeFactor;
                        }
                        
                        // 计算击退方向（与子弹方向相同）
                        const knockbackX = bullet.direction.x * knockbackDistance;
                        const knockbackY = bullet.direction.y * knockbackDistance;
                        
                        // 应用击退
                        zombie.x += knockbackX;
                        zombie.y += knockbackY;
                    }
                    
                    if (zombie.health <= 0) {
                        // 创建死亡粒子特效
                        // 调整粒子大小、速度和颜色为红色
                        for (let i = 0; i < 20; i++) {
                            const particle = {
                                x: zombie.x + zombie.width / 2,
                                y: zombie.y + zombie.height / 2,
                                vx: (Math.random() - 0.5) * 2,
                                vy: (Math.random() - 0.5) * 2 - 1,
                                life: 1.2,
                                maxLife: 1.2,
                                size: Math.random() * 2 + 1,
                                color: `hsl(${Math.random() * 20}, 100%, 30%)`,
                                type: 'blood'
                            };
                            particles.push(particle);
                        }
                        // 创建少量烟雾特效
                        createParticles(zombie.x + zombie.width / 2, zombie.y + zombie.height / 2, 'smoke', 10);
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
                    // 木墙可以被破坏，石墙不可以，不可破坏的障碍物不可以
                    if (obstacle.type === 'wood' && !obstacle.indestructible) {
                        obstacle.health -= bullet.damage || 25;
                        if (obstacle.health <= 0) {
                            obstacles.splice(j, 1);
                        }
                    }
                    bulletHit = true;
                    break;
                }
            }
            
            // 检测子弹与油桶碰撞
            for (let j = barrels.length - 1; j >= 0; j--) {
                const barrel = barrels[j];
                if (collisionWithVolume(bullet, barrel)) {
                    // 油桶受到伤害，直接爆炸
                    explodeBarrel(barrel);
                    barrels.splice(j, 1);
                    
                    bulletHit = true;
                    break;
                }
            }
            
            // 检测子弹与玩家碰撞（友伤机制）
            for (let j = players.length - 1; j >= 0; j--) {
                const player = players[j];
                if (player !== bullet.player && collisionWithVolume(bullet, player) && !player.isDead) {
                    // 只有在友伤模式下才会伤害队友
                    if (friendlyFire) {
                        const damage = bullet.damage || 25;
                        player.health = Math.max(0, player.health - damage);
                        createDamageText(player.x + player.width / 2, player.y, damage);
                        // 设置无敌时间
                        player.isInvulnerable = true;
                        player.isFlashing = true;
                        player.lastHitTime = Date.now();
                        player.lastFlashTime = Date.now();
                        
                        // 玩家被击退
                        const playerKnockbackDistance = 5;
                        const playerKnockbackX = bullet.direction.x * playerKnockbackDistance;
                        const playerKnockbackY = bullet.direction.y * playerKnockbackDistance;
                        
                        // 计算玩家的新位置
                        const newPlayerX = player.x + playerKnockbackX;
                        const newPlayerY = player.y + playerKnockbackY;
                        
                        // 检查新位置是否会与其他玩家碰撞
                        let canKnockback = true;
                        for (const otherPlayer of players) {
                            if (otherPlayer !== player && !otherPlayer.isDead) {
                                // 检查碰撞
                                const testPlayer = {
                                    x: newPlayerX,
                                    y: newPlayerY,
                                    width: player.width,
                                    height: player.height,
                                    collisionRadius: player.collisionRadius
                                };
                                if (collisionWithVolume(testPlayer, otherPlayer)) {
                                    canKnockback = false;
                                    break;
                                }
                            }
                        }
                        
                        // 检查新位置是否会与障碍物碰撞
                        if (canKnockback) {
                            for (const obstacle of obstacles) {
                                const testPlayer = {
                                    x: newPlayerX,
                                    y: newPlayerY,
                                    width: player.width,
                                    height: player.height,
                                    collisionRadius: player.collisionRadius
                                };
                                if (collisionWithVolume(testPlayer, obstacle)) {
                                    canKnockback = false;
                                    break;
                                }
                            }
                        }
                        
                        // 检查新位置是否会与其他僵尸（包括BOSS）碰撞
                        if (canKnockback) {
                            for (const zombie of zombies) {
                                if (!zombie.isDead) {
                                    const testPlayer = {
                                        x: newPlayerX,
                                        y: newPlayerY,
                                        width: player.width,
                                        height: player.height,
                                        collisionRadius: player.collisionRadius
                                    };
                                    if (collisionWithVolume(testPlayer, zombie)) {
                                        canKnockback = false;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // 检查新位置是否在画布范围内
                        if (canKnockback) {
                            if (newPlayerX >= 0 && newPlayerX <= canvas.width - player.width &&
                                newPlayerY >= 0 && newPlayerY <= canvas.height - player.height) {
                                player.x = newPlayerX;
                                player.y = newPlayerY;
                            }
                        }
                    }
                    bulletHit = true;
                    break;
                }
            }
            
            // 子弹出界或击中目标
            if (bulletHit || bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
                // 将子弹返回对象池
                returnObjectToPool('bullets', bullet);
                bullets.splice(i, 1);
            }
        }
        
        // 更新和绘制油桶
        for (let i = barrels.length - 1; i >= 0; i--) {
            const barrel = barrels[i];
            
            // 绘制灰色圆柱体油桶
            // 绘制主体
            ctx.fillStyle = '#888';
            ctx.fillRect(barrel.x, barrel.y, barrel.width, barrel.height);
            // 主体描边
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(barrel.x, barrel.y, barrel.width, barrel.height);
            
            // 绘制顶部和底部
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.ellipse(barrel.x + barrel.width / 2, barrel.y, barrel.width / 2, barrel.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();
            // 顶部描边
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(barrel.x + barrel.width / 2, barrel.y, barrel.width / 2, barrel.height / 4, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.ellipse(barrel.x + barrel.width / 2, barrel.y + barrel.height, barrel.width / 2, barrel.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();
            // 底部描边
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(barrel.x + barrel.width / 2, barrel.y + barrel.height, barrel.width / 2, barrel.height / 4, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            // 绘制碰撞体积（红色线条）
            if (showAttackRange) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                ctx.strokeRect(barrel.x, barrel.y, barrel.width, barrel.height);
            }
        }
        
        // 检测玩家与急救包的碰撞
        for (let i = medkits.length - 1; i >= 0; i--) {
            const medkit = medkits[i];
            
            // 检测玩家与急救包的碰撞
            for (const player of players) {
                if (!player.isDead && player.health > 0) {
                    if (player.x < medkit.x + medkit.width && 
                        player.x + player.width > medkit.x && 
                        player.y < medkit.y + medkit.height && 
                        player.y + player.height > medkit.y) {
                        // 玩家拾取急救包
                        player.health = Math.min(100, player.health + medkitHealAmount);
                        createDamageText(player.x + player.width / 2, player.y, `+${medkitHealAmount}`, '#00ff00');
                        addLog(`${player.isPlayer1 ? '玩家1' : '玩家2'}拾取了急救包，恢复了${medkitHealAmount}点生命值`);
                        medkits.splice(i, 1);
                        break;
                    }
                }
            }
        }
        
        // 更新和绘制伤害飘字
        for (let i = damageTexts.length - 1; i >= 0; i--) {
            const text = damageTexts[i];
            text.y += text.yVelocity * (elapsed / 16.666); // 基于60fps的时间缩放
            text.opacity -= 0.01 * (elapsed / 16.666); // 基于60fps的时间缩放
            text.life -= elapsed; // 根据实际经过的时间减少生命值
            
            if (text.life <= 0) {
                // 将伤害文本返回对象池
                returnObjectToPool('damageTexts', text);
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
            // 玩家1信息
            if (players[0].isDead) {
                document.getElementById('player1Health').textContent = '死亡';
            } else {
                document.getElementById('player1Health').textContent = godMode ? 100 : Math.max(0, players[0].health);
            }
            document.getElementById('player1Score').textContent = players[0].score;
            
            // 玩家2信息
            if (players[1].isDead) {
                document.getElementById('player2Health').textContent = '死亡';
            } else {
                document.getElementById('player2Health').textContent = godMode ? 100 : Math.max(0, players[1].health);
            }
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
        
        // 更新粒子特效
        updateParticles();
        // 更新光源效果
        updateLights();
        
        // 检查游戏结束
        const alivePlayers = players.filter(player => player.health > 0 && !player.isDead);
        if (alivePlayers.length === 0) {
            endGame('游戏结束！所有玩家死亡');
        }
    } else {
        // 游戏暂停时绘制所有游戏元素（不更新）
        players.forEach(player => {
            player.draw();
        });
        
        zombies.forEach(zombie => {
            zombie.draw();
        });
        
        bullets.forEach(bullet => {
            ctx.fillStyle = bullet.player.color;
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // 绘制急救包
        medkits.forEach(medkit => {
            // 绘制急救包（白色矩形）
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(medkit.x, medkit.y, medkit.width, medkit.height);
            // 急救包描边
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(medkit.x, medkit.y, medkit.width, medkit.height);
            
            // 绘制红色+号
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(medkit.x + 5, medkit.y + medkit.height / 2);
            ctx.lineTo(medkit.x + medkit.width - 5, medkit.y + medkit.height / 2);
            ctx.moveTo(medkit.x + medkit.width / 2, medkit.y + 5);
            ctx.lineTo(medkit.x + medkit.width / 2, medkit.y + medkit.height - 5);
            ctx.stroke();
            
            // 绘制碰撞体积（红色线条）
            if (showAttackRange) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                ctx.strokeRect(medkit.x, medkit.y, medkit.width, medkit.height);
            }
        });
        
        // 绘制油桶
        barrels.forEach(barrel => {
            // 绘制灰色圆柱体油桶
            // 绘制主体
            ctx.fillStyle = '#888';
            ctx.fillRect(barrel.x, barrel.y, barrel.width, barrel.height);
            // 主体描边
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(barrel.x, barrel.y, barrel.width, barrel.height);
            
            // 绘制顶部和底部
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.ellipse(barrel.x + barrel.width / 2, barrel.y, barrel.width / 2, barrel.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();
            // 顶部描边
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(barrel.x + barrel.width / 2, barrel.y, barrel.width / 2, barrel.height / 4, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.ellipse(barrel.x + barrel.width / 2, barrel.y + barrel.height, barrel.width / 2, barrel.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();
            // 底部描边
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(barrel.x + barrel.width / 2, barrel.y + barrel.height, barrel.width / 2, barrel.height / 4, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            // 绘制碰撞体积（红色线条）
            if (showAttackRange) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                ctx.strokeRect(barrel.x, barrel.y, barrel.width, barrel.height);
            }
        });
        
        damageTexts.forEach(text => {
            ctx.save();
            ctx.globalAlpha = text.opacity;
            ctx.fillStyle = text.color;
            ctx.font = text.size + 'px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(text.damage === '死亡' ? text.damage : '-' + text.damage, text.x, text.y);
            ctx.restore();
        });
        
        // 绘制光源效果
        drawLights();
        // 绘制粒子特效
        drawParticles();
        
        // 绘制暂停界面
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏暂停', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.font = '24px Arial';
        ctx.fillText('按 ESC 键继续游戏', canvas.width / 2, canvas.height / 2 + 50);
    }
    
    // 绘制粒子特效
    drawParticles();
    
    // 恢复画布状态
    ctx.restore();
    
    } catch (error) {
        console.error('游戏循环错误:', error);
        // 显示错误信息到游戏界面
        addLog(`游戏错误: ${error.message}`);
    }
    }
    
    // 继续游戏循环
    requestAnimationFrame(gameLoop);
}

// 油桶爆炸函数
function explodeBarrel(barrel) {
    const centerX = barrel.x + barrel.width / 2;
    const centerY = barrel.y + barrel.height / 2;
    
    // 创建爆炸粒子特效
    createParticles(centerX, centerY, 'explosion', 50);
    createParticles(centerX, centerY, 'smoke', 20);
    
    // 创建爆炸光照效果
    createLight(centerX, centerY, 150, '#ff8800', 1000);
    
    // 播放爆炸音效
    if (audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    // 绘制爆炸效果
    ctx.fillStyle = 'rgba(255, 165, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, barrelExplosionRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // 对范围内的玩家造成伤害
    for (const player of players) {
        if (!player.isDead) {
            const distance = Math.sqrt(
                Math.pow(player.x + player.width / 2 - centerX, 2) + 
                Math.pow(player.y + player.height / 2 - centerY, 2)
            );
            if (distance <= barrelExplosionRadius) {
                // 只有在友伤模式下才会伤害玩家
                if (friendlyFire) {
                    player.health = Math.max(0, player.health - barrelExplosionDamage);
                    createDamageText(player.x + player.width / 2, player.y, barrelExplosionDamage);
                    // 设置无敌时间
                    player.isInvulnerable = true;
                    player.isFlashing = true;
                    player.lastHitTime = Date.now();
                    player.lastFlashTime = Date.now();
                    
                    // 玩家被击退
                    const playerKnockbackDistance = 5;
                    // 计算爆炸中心到玩家的方向
                    const knockbackX = (player.x + player.width / 2 - centerX) / distance * playerKnockbackDistance;
                    const knockbackY = (player.y + player.height / 2 - centerY) / distance * playerKnockbackDistance;
                    
                    // 计算玩家的新位置
                    const newPlayerX = player.x + knockbackX;
                    const newPlayerY = player.y + knockbackY;
                    
                    // 检查新位置是否会与其他玩家碰撞
                    let canKnockback = true;
                    for (const otherPlayer of players) {
                        if (otherPlayer !== player && !otherPlayer.isDead) {
                            // 检查碰撞
                            const testPlayer = {
                                x: newPlayerX,
                                y: newPlayerY,
                                width: player.width,
                                height: player.height,
                                collisionRadius: player.collisionRadius
                            };
                            if (collisionWithVolume(testPlayer, otherPlayer)) {
                                canKnockback = false;
                                break;
                            }
                        }
                    }
                    
                    // 检查新位置是否会与障碍物碰撞
                        if (canKnockback) {
                            for (const obstacle of obstacles) {
                                const testPlayer = {
                                    x: newPlayerX,
                                    y: newPlayerY,
                                    width: player.width,
                                    height: player.height,
                                    collisionRadius: player.collisionRadius
                                };
                                if (collisionWithVolume(testPlayer, obstacle)) {
                                    canKnockback = false;
                                    break;
                                }
                            }
                        }
                        
                        // 检查新位置是否会与其他僵尸（包括BOSS）碰撞
                        if (canKnockback) {
                            for (const zombie of zombies) {
                                if (!zombie.isDead) {
                                    const testPlayer = {
                                        x: newPlayerX,
                                        y: newPlayerY,
                                        width: player.width,
                                        height: player.height,
                                        collisionRadius: player.collisionRadius
                                    };
                                    if (collisionWithVolume(testPlayer, zombie)) {
                                        canKnockback = false;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // 检查新位置是否在画布范围内
                        if (canKnockback) {
                            if (newPlayerX >= 0 && newPlayerX <= canvas.width - player.width &&
                                newPlayerY >= 0 && newPlayerY <= canvas.height - player.height) {
                                player.x = newPlayerX;
                                player.y = newPlayerY;
                            }
                        }
                }
            }
        }
    }
    
    // 对范围内的僵尸造成伤害
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        const distance = Math.sqrt(
            Math.pow(zombie.x + zombie.width / 2 - centerX, 2) + 
            Math.pow(zombie.y + zombie.height / 2 - centerY, 2)
        );
        if (distance <= barrelExplosionRadius) {
            zombie.health -= barrelExplosionDamage;
            createDamageText(zombie.x + zombie.width / 2, zombie.y, barrelExplosionDamage);
            if (zombie.health <= 0) {
                zombies.splice(i, 1);
                // 为所有玩家增加分数
                players.forEach(player => {
                    player.score += 10;
                });
            }
        }
    }
    
    // 添加爆炸日志
    addLog('油桶爆炸了！');
}

// 碰撞检测 - 矩形碰撞（备用）
function collision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 基于碰撞体积的碰撞检测
function collisionWithVolume(obj1, obj2) {
    // 检查是否有任意一个对象是地形（obstacle）或油桶
    if (obj1.type === 'wood' || obj1.type === 'stone' || obj2.type === 'wood' || obj2.type === 'stone' || obj1.collisionType === 'barrel' || obj2.collisionType === 'barrel') {
        // 至少有一个是地形或油桶，使用矩形碰撞检测
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    } else {
        // 两个都是非地形对象，使用圆形碰撞检测
        // 计算两个对象中心之间的距离
        const dx = (obj1.x + obj1.width / 2) - (obj2.x + obj2.width / 2);
        const dy = (obj1.y + obj1.height / 2) - (obj2.y + obj2.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 检查两个对象的碰撞半径之和是否大于距离
        const radius1 = obj1.collisionRadius || Math.min(obj1.width, obj1.height) / 2;
        const radius2 = obj2.collisionRadius || Math.min(obj2.width, obj2.height) / 2;
        
        return distance < (radius1 + radius2);
    }
}

// 检测两个点之间是否有视线（是否被障碍物阻挡）
function lineOfSight(x1, y1, x2, y2) {
    for (const obstacle of obstacles) {
        // 检查线段是否与障碍物矩形相交
        if (lineIntersectsRect(x1, y1, x2, y2, obstacle)) {
            return false; // 被障碍物阻挡
        }
    }
    return true; // 视线畅通
}

// 检测两条线段是否相交
function lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denominator === 0) {
        return false; // 线段平行
    }
    
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

// 开始游戏
async function startGame() {
    console.log('startGame called');
    try {
        // 确保武器配置加载完成
        if (Object.keys(WEAPON_CONFIG).length === 0) {
            console.log('等待武器配置加载...');
            // 重新加载武器配置
            await loadWeaponsFromCSV();
        }
        
        // 加载地图数据（从嵌入的常量读取）
        console.log('加载地图数据...');
        await loadMapData();
        
        // 如果没有通过地图数据生成障碍物，生成默认障碍物（已注释，使用navmesh.png生成的障碍物）
        // if (obstacles.length === 0) {
        //     console.log('没有地图数据，生成默认障碍物');
        //     generateObstacles();
        // }
        
        // 初始化游戏（在地图数据加载之后）
        init();
        
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOver').style.display = 'none';
        gameRunning = true;
        gameStartTime = Date.now(); // 记录游戏开始时间
        zombieSpawnInterval = 2000;
        gameLoop();
        addLog('游戏开始');
        console.log('Game started successfully');
        console.log('当前武器配置:', WEAPON_CONFIG);
        console.log('障碍物数量:', obstacles.length);
    } catch (e) {
        console.error('Error starting game:', e);
    }
}

// 加载地图数据（从嵌入的常量读取）
async function loadMapData() {
    return new Promise((resolve, reject) => {
        try {
            console.log('开始加载地图数据...');
            
            if (typeof MAP_DATA === 'undefined') {
                throw new Error('MAP_DATA not found');
            }
            
            console.log('地图数据加载成功');
            console.log('地图版本:', MAP_DATA.version);
            console.log('游戏画布尺寸:', MAP_DATA.gameCanvas.width, 'x', MAP_DATA.gameCanvas.height);
            console.log('地图图片尺寸:', MAP_DATA.mapImageSize.width, 'x', MAP_DATA.mapImageSize.height);
            console.log('单元格大小:', MAP_DATA.cellSize);
            console.log('障碍物数量:', MAP_DATA.obstacles.length);
            console.log('可通行区域:', MAP_DATA.statistics.passableCells, '个单元格');
            console.log('不可通行区域:', MAP_DATA.statistics.impassableCells, '个单元格');
            
            // 清空现有障碍物
            obstacles = [];
            
            // 从MAP_DATA加载障碍物
            for (const obstacleData of MAP_DATA.obstacles) {
                obstacles.push({
                    x: obstacleData.x,
                    y: obstacleData.y,
                    width: obstacleData.width,
                    height: obstacleData.height,
                    type: obstacleData.type,
                    health: obstacleData.health,
                    indestructible: true // 从map1.png加载的障碍物不可破坏
                });
            }
            
            console.log('地图数据加载完成，障碍物总数:', obstacles.length);
            
            // 加载地图背景图片
            console.log('开始加载地图背景图片: images/map1.png');
            mapImage = new Image();
            mapImage.src = 'images/map1.png';
            mapImage.onload = () => {
                console.log('地图背景图片加载成功，尺寸:', mapImage.width, 'x', mapImage.height);
                resolve();
            };
            mapImage.onerror = (e) => {
                console.error('地图背景图片加载失败:', e);
                resolve();
            };
        } catch (error) {
            console.error('地图数据加载失败:', error);
            // 加载失败时清空障碍物
            obstacles = [];
            resolve();
        }
    });
}

// 加载地图背景图片（黑白地图，黑色不可通行，白色可通行）
function loadMapImage() {
    return new Promise((resolve, reject) => {
        try {
            console.log('开始加载地图图片: images/map1.png');
            mapImage = new Image();
            mapImage.src = 'images/map1.png';
            mapImage.onload = () => {
                try {
                    console.log('地图背景图片加载成功，尺寸:', mapImage.width, 'x', mapImage.height);
                    // 分析黑白地图，设置可通行和不可通行区域
                    analyzeBlackWhiteMap();
                    resolve();
                } catch (error) {
                    console.error('地图分析失败:', error);
                    // 即使分析失败也继续游戏
                    resolve();
                }
            };
            mapImage.onerror = (e) => {
                console.error('地图背景图片加载失败:', e);
                // 即使加载失败也继续游戏
                resolve();
            };
        } catch (error) {
            console.error('地图加载初始化失败:', error);
            resolve();
        }
    });
}

// 分析黑白地图，自动设置可通行和不可通行区域
// 黑色区域表示不可通行，白色区域表示可通行
function analyzeBlackWhiteMap() {
    try {
        if (!mapImage) {
            console.log('没有地图图片，跳过分析');
            return;
        }
        
        console.log('开始分析黑白地图...');
        console.log('地图尺寸:', mapImage.width, 'x', mapImage.height);
        console.log('画布尺寸:', canvas.width, 'x', canvas.height);
        
        // 创建临时画布用于分析
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = mapImage.width;
        tempCanvas.height = mapImage.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 绘制地图图片到临时画布
        tempCtx.drawImage(mapImage, 0, 0);
        
        // 获取像素数据
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        console.log('像素数据长度:', data.length);
        
        // 清空现有障碍物
        obstacles = [];
        
        // 分析像素，创建障碍物
        const cellSize = 20; // 障碍物单元格大小
        const scaleX = tempCanvas.width / canvas.width;
        const scaleY = tempCanvas.height / canvas.height;
        
        console.log('缩放比例:', scaleX, scaleY);
        
        let passableCount = 0;
        let impassableCount = 0;
        
        for (let y = 0; y < canvas.height; y += cellSize) {
            for (let x = 0; x < canvas.width; x += cellSize) {
                // 检查这个区域的颜色
                let isBlack = false;
                
                // 直接检查单元格中心的像素颜色，这样更准确反映navmesh的实际情况
                const centerX = x + cellSize / 2;
                const centerY = y + cellSize / 2;
                const mapX = Math.floor(centerX * scaleX);
                const mapY = Math.floor(centerY * scaleY);
                
                if (mapX < tempCanvas.width && mapY < tempCanvas.height) {
                    const index = (mapY * tempCanvas.width + mapX) * 4;
                    if (index + 2 < data.length) {
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];
                        
                        // 计算亮度，小于80认为是黑色（不可通行），与convert-map.py保持一致
                        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                        isBlack = brightness < 80;
                        
                        // 只在调试时输出，避免控制台输出过多
                        if (Math.random() < 0.01) { // 只输出1%的日志
                            console.log(`单元格 (${x},${y}) 中心像素亮度: ${brightness}, 黑色: ${isBlack}`);
                        }
                    }
                }
                
                if (isBlack) {
                    obstacles.push({
                        x: x,
                        y: y,
                        width: cellSize,
                        height: cellSize,
                        type: 'wood',
                        health: 100,
                        indestructible: true
                    });
                    impassableCount++;
                } else {
                    passableCount++;
                }
            }
        }
        
        console.log('地图分析完成，生成了', obstacles.length, '个障碍物');
        console.log('可通行区域:', passableCount, '个单元格');
        console.log('不可通行区域:', impassableCount, '个单元格');
    } catch (error) {
        console.error('地图分析出错:', error);
        // 出错时清空障碍物，确保游戏能继续
        obstacles = [];
    }
}

// 重新开始游戏
async function restartGame() {
    await startGame();
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
    // 从对象池获取伤害文本
    let damageText = getObjectFromPool('damageTexts');
    if (!damageText) {
        // 如果对象池为空，创建新伤害文本
        damageText = {
            x: 0,
            y: 0,
            damage: 0,
            color: '',
            size: 0,
            opacity: 0,
            yVelocity: 0,
            life: 0
        };
    }
    
    // 初始化伤害文本属性
    damageText.x = x;
    damageText.y = y;
    damageText.damage = damage;
    damageText.color = color;
    damageText.size = size;
    damageText.opacity = 1;
    damageText.yVelocity = -1;
    damageText.life = 1500;
    
    damageTexts.push(damageText);
}

// 墙体配置参数
const WALL_CONFIG = {
    obstacleCount: 60, // 障碍物总数量
    unitSize: 30, // 最小地形单元大小
    stoneWallProbability: 0.3, // 石墙生成概率（30%）
    woodWallProbability: 0.7, // 木墙生成概率（70%）
    stoneWallColor: '#666666', // 石墙颜色（灰色）
    woodWallColor: '#8b4513', // 木墙颜色（棕色）
    woodWallHealth: 100, // 木墙初始生命值
    stoneWallHealth: -1, // 石墙生命值（-1表示不可破坏）
    minUnits: 1, // 最小单元数
    maxUnits: 3, // 最大单元数
    safeDistance: 100, // 玩家安全区域距离
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
    // 如果已经通过地图分析生成了障碍物，就不再生成默认障碍物
    if (obstacles.length > 0) {
        console.log('已通过地图分析生成障碍物，跳过默认障碍物生成');
        return;
    }
    
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
                    // 单面拼接，接受（增加概率，为后续两面拼接创造机会）
                } else if (neighborCount === 2) {
                    if (sameRowOrColumn) {
                        // 同一列或同一行的两面拼接，接受
                    } else {
                        // 其他两面拼接（对角线），95%概率拒绝，降低对角线拼接的概率
                        if (Math.random() < 0.95) {
                            continue;
                        }
                    }
                } else if (neighborCount === 3) {
                    // 三面拼接，85%概率拒绝，降低3面拼接的概率
                    if (Math.random() < 0.85) {
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
    // 隐藏所有地形效果，不绘制任何障碍物
    return;
    
    // 以下是原始的障碍物绘制代码，已注释掉
    /*
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
        
        // 绘制碰撞体积（红色线条）
        if (showAttackRange) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });
    */
}

// 检测碰撞
function collision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}
// 武器配置数据
const WEAPON_DATA = {
    pistol: {
        id: 'pistol',
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
        id: 'magnum',
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
        id: 'uzi',
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
        id: 'rifle',
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
        id: 'shotgun',
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
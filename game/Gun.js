/**
 * Created by long on 14-2-22.
 */
var lg = lg || {};

lg.GunParam = cc.Class.extend({
    bulletPlist:null,//the plist of the bullet
    bulletID:null,//the id of the bullet asset
    collideSize:20,//the bullet collide radius
    targetMap:null,//the TileMap name of the target to shoot
    damage:1,//the damage of the bullet, if it's Array with two elements, set a random value between them
    speed:600,//the move speed of the bullet per second
    interval:0.15,//the interval time between two launch
    count:1,//the bullet count in one launch
    angleGap:5,//if count > 1, angle gap between two bullets at one launch
    waveInterval:0,//the seconds interval between two wave launch, if <= 0 then no wave mode
    countInWave:6,//launch times in one wave
    fireSound:null,//the sound when fire
    fireEffectID:null,//the id of fire effect, it must be packed with the bullet plist together
    hitEffectID:null,//the id of hit effect, it must be packed with the bullet plist together
    alwaysLive:false,//if true, when the bullet hurt target, it'll not disappear, continue to hurt next enemy on the path
    bulletPlayOnce:false,//if true, the bullet will play only once after fire, otherwise always play again and again
    isMissle:false//todo, if it's missile
});

lg.GunParam.create = function(param)
{
    var gp = new lg.GunParam();
    lg.copyProperties(param, gp);
    return gp;
}

lg.Gun = cc.Node.extend({
    owner:null,
    param:null,
    _firing:false,
    _pool:null,
    _waveTime:0,
    _maxShootDistance:0,
//    _bullets:null,
    _targetMap:null,

    init:function()
    {
        this._super();
//        this._bullets = [];
    },
    start:function()
    {
        if(this._firing) return;
        this._firing = true;

        this._pool = lg.ObjectPool.get(this.param.bulletPlist, "lg.Animator","___bullet");//this.param.bulletID);
        this._waveTime = this.param.interval*this.param.countInWave + this.param.waveInterval;
        this._maxShootDistance = Math.max(cc.visibleRect.width, cc.visibleRect.height)*1.5;

        if(this.param.waveInterval <= 0 || this.param.countInWave <= 1) {
            this.schedule(this._createBullet, this.param.interval);
            this._createBullet();
        }else{
            this._waveFire();
        }
//        this.scheduleUpdate();
    },
    end:function()
    {
        if(!this._firing) return;
        this._firing = false;
        this.unschedule(this._createBullet);
        this.unschedule(this._createWave);
//        this.unscheduleUpdate();
    },
    updateParam:function(param)
    {
        if(param == null) return;
        lg.copyProperties(param, this.param);
        this.end();
        this.start();
    },
    isFiring:function()
    {
        return this._firing;
    },
    _waveFire:function()
    {
        if(!this._firing) return;
        this._createWave();
        this.schedule(this._createWave, this._waveTime, cc.REPEAT_FOREVER);
    },
    _createBullet:function()
    {
        if(lg.bulletCanvas == null) {
            cc.log("Pls set batch canvas for me to show the bullet: lg.bulletCanvas!");
            return;
        }
        var t = this._maxShootDistance/this.param.speed;
        var pos = this.parent.convertToWorldSpace(this.getPosition());
        pos = lg.bulletCanvas.convertToNodeSpace(pos);
        var rot = lg.getRotation(this, true);
        var b = null;
        var i = -1;
        var r = 0;
        var d = 0;
        var ints  = lg.createDInts(this.param.count);
        while(++i < this.param.count)
        {
            d = ints[i];
            r = rot + d*this.param.angleGap;
            b = this._pool.fetch(this.param.bulletID, lg.bulletCanvas);
            b.owner = this.owner;
            b.param = this.param;
            b.targetMap = lg.getTileMap(this.param.targetMap);
            b.gotoAndPlay(0);
            b.autoStopWhenOver = this.param.bulletPlayOnce;
            b.setPosition(pos);
            b.setRotation(r);

            var dmg = this.param.damage;
            if(dmg instanceof Array){
                if(dmg.length == 1) dmg = dmg[0];
                else if(dmg.length >= 2) dmg = lg.randInt(dmg[0], dmg[1]);
            }
            b.damage = dmg;

            b.__speed = this.param.speed;
            b.__moveRotation = r;
//            b.runAction(cc.MoveBy.create(t,lg.getPointOnCircle(this._maxShootDistance, r)));
            lg.bulletCanvas._bullets.push(b);
        }
        this._showFireEffect(pos, r);
        if(this.param.fireSound) lg.playSound(this.param.fireSound);
    },
    _createWave:function()
    {
        this.schedule(this._createBullet, this.param.interval, this.param.countInWave - 1);
    },
    _showFireEffect:function(pos, rot)
    {
        if(this.param.fireEffectID == null || this.param.fireEffectID == "") return;
        var fireEffect = lg.assetsManager.createDisplay(this.param.bulletPlist, this.param.fireEffectID, null, true, lg.bulletCanvas);
        fireEffect.zIndex = 999;
        fireEffect.autoDestroyWhenOver = true;
        fireEffect.setPosition(pos);
        fireEffect.setRotation(rot);
        fireEffect.gotoAndPlay(0);
    }
});
lg.BulletCanvas = cc.SpriteBatchNode.extend({
//lg.BulletCanvas = cc.Sprite.extend({
    _bullets:null,
    _stageRect:null,
    onEnter:function(){
        this._super();
        this._bullets = [];
        this._stageRect = cc.rect(0, 0, cc.visibleRect.width, cc.visibleRect.height);
        this.scheduleUpdate();
    },
    update:function(delta)
    {
        var i = this._bullets.length;
        if(i == 0) return;
        var b = null;
        var targets = null;
        var target = null;
        var j = -1;
        var rect = null;
        var over = false;
        var pos = null;
        var rot = null;
        var collide = null;
        //Note: how to delete item of an Array in a loop, this is a template!
        while(i--) {
            b = this._bullets[i];

            var dis = b.__speed*delta;
            b.setPosition(cc.pAdd(b.getPosition(), lg.getPointOnCircle(dis, b.__moveRotation)));

            rect = b.collider;
            over = false;
            var outofScreen = !cc.rectIntersectsRect(this._stageRect, rect);
            if(outofScreen){
                over = true;
            }else {
                if(b.targetMap) targets = b.targetMap.getCoveredTiles1(rect, true);
                else targets = b.owner.targets;
                if(!targets || !targets.length) continue;

                j = -1;
                pos = lg.getPosition(b, true);
                rot = lg.getRotation(b, true);
                while(++j < targets.length) {
                    target = targets[j];
                    if(target == b.owner) continue;
                    if(target.dead === true) continue;
                    if(b.owner && target.camp == b.owner.camp) continue;
                    //hit the target
//                    collide = cc.rectIntersection(target.collider, rect);
                    if(cc.pDistance(pos, target.collidCenter) < b.param.collideSize){
                        if(target.onHit) {
                            target.dead = target.onHit(b);
                        }
                        this._showHitEffect(b, pos, rot);
                        over = true;
                        break;
                    }
                }
            }
            if(over && !b.param.alwaysLive) {
                b.destroy();
                this._bullets.splice(i, 1);
            }
        }
    },
    _showHitEffect:function(bullet, pos, rot)
    {
        if(bullet.param.hitEffectID == null || bullet.param.hitEffectID == "") return;
        var hitEffect = lg.assetsManager.createDisplay(bullet.param.bulletPlist, bullet.param.hitEffectID, null, true, this);
        hitEffect.zIndex = 999;
        hitEffect.autoDestroyWhenOver = true;
        hitEffect.setPosition(pos);
        hitEffect.setRotation(rot);
        hitEffect.gotoAndPlay(0);
    }
});

lg.BulletCanvas.create = function (fileImage) {
//    return new lg.BulletCanvas();
    return new lg.BulletCanvas(fileImage, 100);
};

lg.Gun.create = function(param)
{
    if(param == null) {
        cc.log("Please give me a param defiled like: lg.GunParam!");
        return null;
    }
    param = lg.GunParam.create(param);
    var gun = new lg.Gun();
    gun.param = param;
    gun.init();
    return gun;
};
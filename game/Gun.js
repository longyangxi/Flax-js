/**
 * Created by long on 14-2-22.
 */
var lg = lg || {};

lg.GunParam = cc.Class.extend({
    bulletPlist:null,//the plist of the bullet
    bulletID:null,//the id of the bullet asset
    targetMap:null,//the TileMap name of the target to shoot
    damage:1,//the damage of the bullet, if it's Array with two elements, set a random value between them
    damageRadius:0,//if damageRadius > 1, bullet will make splash damage to the enemies around it
    speed:600,//the move speed of the bullet per second
    interval:0.15,//the interval time between two launch
    count:1,//the bullet count in one launch
    angleGap:5,//if count > 1, angle gap between two bullets at one launch
    angleOffset:0,//the bullet move angle offset according to the gun itself
    waveInterval:0,//the seconds interval between two wave launch, if <= 0 then no wave mode
    countInWave:6,//launch times in one wave
    gravityX:0,//gravity on x
    gravityY:0,//gravity on y
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
    _targetMap:null,

    start:function()
    {
        if(this._firing) return;
        this._firing = true;

        if(this.param.waveInterval <= 0 || this.param.countInWave <= 1) {
            this.schedule(this.shootOnce, this.param.interval);
            this.shootOnce();
        }else{
            this._waveFire();
        }
    },
    end:function()
    {
        if(!this._firing) return;
        this._firing = false;
        this.unschedule(this.shootOnce);
        this.unschedule(this._createWave);
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
        var t = this.param.interval*this.param.countInWave + this.param.waveInterval;
        this.schedule(this._createWave, t, cc.REPEAT_FOREVER);
    },
    shootOnce:function()
    {
        if(this.parent == null) return;
        if(lg.bulletCanvas == null) {
            cc.log("Pls set batch canvas for me to show the bullet: lg.bulletCanvas!");
            return;
        }
        var pos = this.parent.convertToWorldSpace(this.getPosition());
        pos = lg.bulletCanvas.convertToNodeSpace(pos);
        var rot = lg.getRotation(this, true);
        var b = null;
        var i = -1;
        var r = 0;
        var r1 = 0;
        var d = 0;
        var ints  = lg.createDInts(this.param.count);
        while(++i < this.param.count)
        {
            d = ints[i];
            r = rot + d*this.param.angleGap;
            if(this._pool == null) this._pool = lg.ObjectPool.get(this.param.bulletPlist, "lg.Animator","___bullet");
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

            r1 = DEGREE_TO_RADIAN*(90 - (r + this.param.angleOffset));
            b.__vx = this.param.speed*Math.cos(r1);
            b.__vy = this.param.speed*Math.sin(r1);

            lg.bulletCanvas._bullets.push(b);
        }
        this._showFireEffect(pos, r);
        if(this.param.fireSound) lg.playSound(this.param.fireSound);
    },
    _createWave:function()
    {
        this.schedule(this.shootOnce, this.param.interval, this.param.countInWave - 1);
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
    //out of the rect, the bullet will auto destroyed
    stageRect:null,
    _bullets:null,
    onEnter:function(){
        this._super();
        this._bullets = [];
        if(this.stageRect == null) this.stageRect = cc.rect(0, 0, cc.visibleRect.width, cc.visibleRect.height);
        this.scheduleUpdate();
    },
    update:function(delta)
    {
        var i = this._bullets.length;
        if(i == 0) return;
        var b = null;
        var targets = null;
        var j = -1;
        var rect = null;
        var over = false;
        var pos = null;
        var rot = null;
        //Note: how to delete item of an Array in a loop, this is a template!
        while(i--) {
            b = this._bullets[i];

            b.__vx = b.__vx + b.param.gravityX*delta;
            b.__vy = b.__vy + b.param.gravityY*delta;
            b.x += b.__vx*delta;
            b.y += b.__vy*delta;

            b.rotation = lg.getAngle1(b.__vx, b.__vy, true) - b.param.angleOffset;

            rect = lg.getRect(b, true);
            over = false;
            targets = null;
            var outOfBounds = !cc.rectIntersectsRect(this.stageRect, rect);
            if(outOfBounds){
                over = true;
            }else{
                targets = this._checkHittedTarget(b, rect, false);
            }
            if(targets && targets.length){
                pos = lg.getPosition(b, true);
                rot = lg.getRotation(b, true);
                var radius = b.param.damageRadius;
                if(radius > 0){
                    rect = cc.rect(pos.x - radius/2, pos.y - radius/2, radius, radius);
                    targets = this._checkHittedTarget(b, rect, true);
                }
                var t;
                j = targets.length;
                while(j--){
                    t = targets[j];
                    if(t.onHit) {
                        t.dead = t.onHit(b);
                    }
                }
                this._showHitEffect(b, pos, rot);
                over = true;
            }
            if(over && !b.param.alwaysLive) {
                b.destroy();
                this._bullets.splice(i, 1);
            }
        }
    },
    _checkHittedTarget:function(b, rect, multiple){
        var hittedTargets = [];
        var targets = null;
        if(b.targetMap) targets = b.targetMap.getCoveredTiles1(rect, true);
        else targets = b.owner.targets;
        if(!targets || !targets.length) return hittedTargets;

        var i = -1;
        while(++i < targets.length) {
            target = targets[i];
            if(target == b.owner || target.dead === true || b.owner && target.camp == b.owner.camp) continue;
            //hit the target
            if(b.mainCollider.checkCollision(target.mainCollider)) {
                if(!multiple) return [target];
                hittedTargets.push(target);
            }
        }
        return hittedTargets;
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
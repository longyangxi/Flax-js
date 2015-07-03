/**
 * Created by long on 14-2-22.
 */

flax.GunParam = cc.Class.extend({
    bulletAssets:null,//the assets file of the bullet
    bulletID:null,//the id of the bullet asset
    targetMap:null,//the TileMap name of the target to shoot
    selfMap:null,//the TileMap the bullet itself to be added to
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
    fireEffectID:null,//the id of fire effect, it must be packed with the bullet asset id together
    hitEffectID:null,//the id of hit effect, it must be packed with the bullet assets id together
    alwaysLive:false,//if true, when the bullet hurt target, it'll not disappear, continue to hurt next enemy on the path
    bulletPlayOnce:false,//if true, the bullet will play only once after fire, otherwise always play again and again
    fps:0,//if the bullet has animation, then set the fps, or use the default fps in the fla
    isMissle:false//todo, if it's missile
});

flax.GunParam.create = function(param)
{
    var gp = new flax.GunParam();
    //fixed the speed == 0 bug
    if(param.speed == 0) param.speed = 0.001;
    flax.copyProperties(param, gp);
    return gp;
};

flax.Gun = cc.Node.extend({
    owner:null,
    param:null,
    aimTarget:null,
    _firing:false,
    _targetMap:null,
    _canvas:null,

    start:function()
    {
        if(this._firing) return;
        this._firing = true;

        this._canvas = flax.BulletCanvas.fetch(this.param.bulletAssets);

        if(this.param.waveInterval <= 0 || this.param.countInWave < 1) {
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
        flax.copyProperties(param, this.param);
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

        var pos = this.parent.convertToWorldSpace(this.getPosition());
        if(this.aimTarget && this.aimTarget.parent && this.aimTarget.visible){
            var angle = flax.getAngle(flax.getPosition(this, true), this.aimTarget.center);
            this.owner.onAimingTarget(angle);
            this.rotation = angle - this.param.angleOffset - this.parent.rotation;
        }
        pos = this._canvas.convertToNodeSpace(pos);
        var rot = flax.getRotation(this, true);
        var i = -1;
        var r = 0;
        var d = 0;
        var ints  = flax.createDInts(this.param.count);
        while(++i < this.param.count)
        {
            d = ints[i];
            r = rot + d*this.param.angleGap;
            this._canvas.addBullet(r, pos, this.param, this.owner);
        }
        this._showFireEffect(pos, r);
        if(this.param.fireSound) flax.playSound(this.param.fireSound);
    },
    _createWave:function()
    {
        if(this.param.countInWave > 1) this.schedule(this.shootOnce, this.param.interval, this.param.countInWave - 1);
        else this.shootOnce();
    },
    _showFireEffect:function(pos, rot)
    {
        if(this.param.fireEffectID == null || this.param.fireEffectID == "") return;
        var fireEffect = flax.assetsManager.createDisplay(this.param.bulletAssets, this.param.fireEffectID, {parent: this._canvas}, true);
        fireEffect.zIndex = 999;
        fireEffect.autoDestroyWhenOver = true;
        fireEffect.setPosition(pos);
        fireEffect.setRotation(rot);
        fireEffect.gotoAndPlay(0);
    }
});
flax.BulletCanvas = cc.SpriteBatchNode.extend({
    assetsFile:null,
    onBulletHit:null,
    onBulletOut:null,
    _bullets:null,
    onEnter:function(){
        this._super();
        this._bullets = [];
        this.onBulletHit = new signals.Signal();
        this.onBulletOut = new signals.Signal();
        this.scheduleUpdate();
    },
    onExit:function(){
        this._super();
        this.onBulletHit.removeAll();
        this.onBulletOut.removeAll();
    },
    addBullet:function(rotation, position, param, owner){
        if(this.parent == null) {
            cc.log("Please create a bullet canvas: flax.BulletCanvas.create('"+this.assetsFile+"', container, zIndex);");
            return;
        }
        if(!(param instanceof flax.GunParam)) param = flax.GunParam.create(param);
        var b = flax.assetsManager.createDisplay(param.bulletAssets, param.bulletID, {parent: this}, true);
        b.owner = owner;
        b.param = param;
        if(owner && owner.targets) b.targets = owner.targets;
        if(param.targetMap) b.targetMap = flax.getTileMap(param.targetMap);
        if(param.fps) b.fps = param.fps;
        b.__physicalShooted = false;
        //if it's MovieClip
        if(b instanceof flax.MovieClip){
            b.__isMovieClip = true;
            b.autoPlayChildren = true;
            b.autoDestroyWhenOver = true;
            var i = b.children.length;
            var cb;
            while(i--){
                cb = b.children[i];
                if(param.selfMap) {
                    cb.setTileMap(param.selfMap);
                }
                cb.__isBullet = true;
                cb.__canvas = this;
                cb.__body = b;
            }
        }else if(param.selfMap) {
            b.setTileMap(param.selfMap);
            b.__isBullet = true;
            b.__canvas = this;
            b.__body = b;
        }
        b.play();
        b.autoStopWhenOver = param.bulletPlayOnce;
        b.setPosition(position);
        b.setRotation(rotation);

        var dmg = param.damage;
        if(dmg instanceof Array){
            if(dmg.length == 1) dmg = dmg[0];
            else if(dmg.length >= 2) dmg = flax.randInt(dmg[0], dmg[1]);
        }
        b.damage = dmg;

        var r1 = DEGREE_TO_RADIAN*(90 - (rotation + param.angleOffset));
        b.__vx = param.speed*Math.cos(r1);
        b.__vy = param.speed*Math.sin(r1);

        this._bullets.push(b);
        return b;
    },
    destroyBullet:function(b, i, doDestroy){
        if(i === undefined) i = this._bullets.indexOf(b);
        if(i < 0) return;
        if(doDestroy !== false) b.destroy();
        this._bullets.splice(i, 1);
    },
    update:function(delta)
    {
        var i = this._bullets.length;
        if(i == 0) return;
        var b = null;
        var targets = null;
        var j = -1;
        var rect = null;
        var hitted = false;
        var pos = null;
        var rot = null;
        //Note: how to delete item of an Array in a loop, this is a template!
        while(i--) {
            b = this._bullets[i];
            //if the bullet controlled by physics, then don't move it here
            if(b.physicsBody){
                if(!b.__physicalShooted){
                    b.physicsBody.SetLinearVelocity({x:b.__vx/PTM_RATIO, y:b.__vy/PTM_RATIO});
                    b.__physicalShooted = true;
                }
//                continue;
            }else{
                b.__vx = b.__vx + b.param.gravityX*delta;
                b.__vy = b.__vy + b.param.gravityY*delta;
                b.x += b.__vx*delta;
                b.y += b.__vy*delta;
                b.rotation = flax.getAngle1(b.__vx, b.__vy, true) - b.param.angleOffset;
            }
            rect = flax.getRect(b, true);
            hitted = false;
            targets = null;
            var outOfBounds = !cc.rectIntersectsRect(flax.stageRect, rect);
            if(!outOfBounds){
                targets = this._checkHittedTarget(b, rect, false);
                if(targets && targets.length){
                    pos = flax.getPosition(b, true);
                    var radius = b.param.damageRadius;
                    if(radius > 0){
                        rect = cc.rect(pos.x - radius/2, pos.y - radius/2, radius, radius);
                        targets = this._checkHittedTarget(b, rect, true);
                    }
                    hitted = true;
                }
            }
            if(outOfBounds) {
                this.onBulletOut.dispatch(b);
                this.destroyBullet(b, i);
            }else if(hitted){
                this.onBulletHit.dispatch(b);
                if(!b.param.alwaysLive) this.destroyBullet(b, i);
            }
        }
    },
    _checkHittedTarget:function(b, rect, multiple){
        var hittedTargets = [];
        var targets = null;
        if(b.targets) targets = b.targets;
        else if(b.targetMap) targets = b.targetMap.getCoveredTiles1(rect, true);
        if(!targets || !targets.length) return hittedTargets;

        var rot = flax.getRotation(b, true);
        var i = -1;
        while(++i < targets.length) {
            target = targets[i];
            if(!target || !target.parent || !target.visible) continue;
            if(b.owner && (target == b.owner || flax.isChildOf(b.owner, target) || target.dead === true || (b.owner.camp != null && target.camp == b.owner.camp))) continue;
            //hit the target
            if(b.__isMovieClip){
                var children = b.children;
                var num = children.length;
                while(num--){
                    var cb = children[num];
                    rot = flax.getRotation(cb, true);
                    if(cb.mainCollider.checkCollision(target.mainCollider)) {
//                        if(target.onHit) target.dead = target.onHit(b);
                        flax.callModuleFunction(target, "onHit", b);
                        if(target.hurtable !== false) this._showHitEffect(b, rot, b.convertToWorldSpace(cb.getPosition()));
                        if(target.__isBullet) {
                            var ii = target.__canvas._bullets.indexOf(target);
                            if(ii > -1) target.__canvas._bullets.splice(ii, 1);
                            target.__body.destroy();
                        }
                        if(!multiple) return [target];
                        hittedTargets.push(target);
                    }
                }
            }else{
                if(b.mainCollider.checkCollision(target.mainCollider)) {
//                    if(target.onHit) target.dead = target.onHit(b);
                    flax.callModuleFunction(target, "onHit", b);
                    if(target.hurtable !== false) this._showHitEffect(b, rot, b.getPosition());
                    if(target.__isBullet) {
                        var ii = target.__canvas._bullets.indexOf(target);
                        if(ii > -1) target.__canvas._bullets.splice(ii, 1);
                        target.__body.destroy();
                    }
                    if(!multiple) return [target];
                    hittedTargets.push(target);
                }
            }
        }
        return hittedTargets;
    },
    _showHitEffect:function(bullet, rot, pos)
    {
        if(bullet.param.hitEffectID == null || bullet.param.hitEffectID == "") return;
        var hitEffect = flax.assetsManager.createDisplay(bullet.param.bulletAssets, bullet.param.hitEffectID, {parent: this}, true);
        hitEffect.zIndex = 999;
        hitEffect.autoDestroyWhenOver = true;
        hitEffect.setPosition(pos || bullet.getPosition());
        hitEffect.setRotation(rot);
        hitEffect.gotoAndPlay(0);
    }
});
flax.BulletCanvas.create = function(assetsFile, container, zIndex) {
    var canvas = flax.BulletCanvas.fetch(assetsFile);
    if(canvas.parent != container){
        canvas.removeFromParent();
        container.addChild(canvas, zIndex || 999);
    }
};
flax.BulletCanvas.fetch = function (assetsFile) {
    if(flax._bulletCanvases[assetsFile]) return flax._bulletCanvases[assetsFile];
    var texturePath = cc.path.changeBasename(assetsFile, ".png");
    var c = new flax.BulletCanvas(texturePath, 100);
    c.assetsFile = assetsFile;
    flax._bulletCanvases[assetsFile] = c;
    return c;
};
flax._bulletCanvases = {};
flax.BulletCanvas.release = function(){
    flax._bulletCanvases = {};
};

flax.Gun.create = function(param)
{
    if(param == null) {
        cc.log("Please give me a param defiled like: flax.GunParam!");
        return null;
    }
    param = flax.GunParam.create(param);
    var gun = new flax.Gun();
    gun.param = param;
    gun.init();
    return gun;
};
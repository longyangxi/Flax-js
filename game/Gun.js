/**
 * Created by long on 14-2-22.
 */
var lg = lg || {};

lg.GunParam = cc.Class.extend({
    bulletPlist:null,//the plist of the bullet
    bulletID:null,//the id of the bullet asset
    targetMap:null,//the TileMap name of the target to shoot
    selfMap:null,//the TileMap the bullet itself to be added to, the bullet can be shooted on this situation
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
    fps:30,//if the bullet has animation, then set the fps
    isMissle:false//todo, if it's missile
});

lg.GunParam.create = function(param)
{
    var gp = new lg.GunParam();
    //fixed the speed == 0 bug
    if(param.speed == 0) param.speed = 0.001;
    lg.copyProperties(param, gp);
    return gp;
}

lg.Gun = cc.Node.extend({
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

        this._canvas = lg.BulletCanvas.fetch(this.param.bulletPlist);

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

        var pos = this.parent.convertToWorldSpace(this.getPosition());
        if(this.aimTarget){
            var angle = lg.getAngle(lg.getPosition(this, true), this.aimTarget.center);
            this.rotation = angle - this.param.angleOffset - this.parent.rotation;
        }
        pos = this._canvas.convertToNodeSpace(pos);
        var rot = lg.getRotation(this, true);
        var i = -1;
        var r = 0;
        var d = 0;
        var ints  = lg.createDInts(this.param.count);
        while(++i < this.param.count)
        {
            d = ints[i];
            r = rot + d*this.param.angleGap;
            this._canvas.addBullet(r, pos, this.param, this.owner);
        }
        this._showFireEffect(pos, r);
        if(this.param.fireSound) lg.playSound(this.param.fireSound);
    },
    _createWave:function()
    {
        if(this.param.countInWave > 1) this.schedule(this.shootOnce, this.param.interval, this.param.countInWave - 1);
        else this.shootOnce();
    },
    _showFireEffect:function(pos, rot)
    {
        if(this.param.fireEffectID == null || this.param.fireEffectID == "") return;
        var fireEffect = lg.assetsManager.createDisplay(this.param.bulletPlist, this.param.fireEffectID, null, true, this._canvas);
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
    plistFile:null,
    onBulletHit:null,
    onBulletOut:null,
    _bullets:null,
    onEnter:function(){
        this._super();
        this._bullets = [];
        if(this.stageRect == null) this.stageRect = cc.rect(0, 0, cc.visibleRect.width, cc.visibleRect.height);
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
            cc.log("Please add the bullet canvas to the stage: container.addChild(lg.BulletCanvas.fetch('"+this.plistFile+"'));");
            return;
        }
        if(!(param instanceof lg.GunParam)) param = lg.GunParam.create(param);
        var b = lg.assetsManager.createDisplay(param.bulletPlist, param.bulletID, null, true, this);
        b.owner = owner;
        b.param = param;
        if(owner && owner.targets) b.targets = owner.targets;
        if(param.targetMap) b.targetMap = lg.getTileMap(param.targetMap);
        b.fps = param.fps;
        b.__physicalShooted = false;
        //if it's MovieClip
        if(b instanceof lg.MovieClip){
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
            else if(dmg.length >= 2) dmg = lg.randInt(dmg[0], dmg[1]);
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
                b.rotation = lg.getAngle1(b.__vx, b.__vy, true) - b.param.angleOffset;
            }
            rect = lg.getRect(b, true);
            hitted = false;
            targets = null;
            var outOfBounds = !cc.rectIntersectsRect(this.stageRect, rect);
            if(!outOfBounds){
                targets = this._checkHittedTarget(b, rect, false);
                if(targets && targets.length){
                    pos = lg.getPosition(b, true);
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

        var rot = lg.getRotation(b, true);
        var i = -1;
        while(++i < targets.length) {
            target = targets[i];
            if(b.owner && (target == b.owner || lg.isChildOf(b.owner, target) || target.dead === true || (b.owner.camp != null && target.camp == b.owner.camp))) continue;
            //hit the target
            if(b.__isMovieClip){
                var children = b.children;
                var num = children.length;
                while(num--){
                    var cb = children[num];
                    rot = lg.getRotation(cb, true);
                    if(cb.mainCollider.checkCollision(target.mainCollider)) {
                        if(target.onHit) target.dead = target.onHit(b);
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
                    if(target.onHit) target.dead = target.onHit(b);
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
        var hitEffect = lg.assetsManager.createDisplay(bullet.param.bulletPlist, bullet.param.hitEffectID, null, true, this);
        hitEffect.zIndex = 999;
        hitEffect.autoDestroyWhenOver = true;
        hitEffect.setPosition(pos || bullet.getPosition());
        hitEffect.setRotation(rot);
        hitEffect.gotoAndPlay(0);
    }
});

lg.BulletCanvas.fetch = function (plistFile) {
    if(lg._bulletCanvases[plistFile]) return lg._bulletCanvases[plistFile];
    var texturePath = plistFile.replace("."+lg.getFileExtension(plistFile), ".png");
    var c = new lg.BulletCanvas(texturePath, 100);
    c.plistFile = plistFile;
    lg._bulletCanvases[plistFile] = c;
    return c;
};
lg._bulletCanvases = {};
lg.BulletCanvas.reset = function(){
    for(var k in lg._bulletCanvases){
        lg._bulletCanvases[k].removeFromParent(true);
    }
    lg._bulletCanvases = {};
}

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
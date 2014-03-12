/**
 * Created by long on 14-2-22.
 */
var lg = lg || {};

lg.Gun = cc.Node.extend({
    damage:1,//the damage of the bullet
    speed:500,//the move speed of the bullet per second
    interval:0.2,//the interval time between two launch
    count:1,//the bullet count in one launch
    angleGap:5,//if count > 1, angle gap between two bullets at one launch
    waveInterval:1,//the seconds interval between two wave launch, if <= 0 then no wave mode
    countInWave:6,//launch times in one wave
    collideSize:20,//the bullet collide radius
    isMissle:false,//todo, if it's missile
    owner:null,
    fireSound:null,
    _plistFile:null,
    _bulletID:null,
    _firing:false,
    _pool:null,
    _waveTime:0,
    _fireEffect:null,
    _hitEffect:null,
    _maxShootDistance:0,
    _bullets:null,
    _targetMap:null,


    onEnter:function()
    {
        this._super();
        this._pool = lg.ObjectPool.get(this._plistFile, "lg.Animator");
        this._waveTime = this.interval*this.countInWave + this.waveInterval;
        this._maxShootDistance = Math.max(lg.stage.width(), lg.stage.height())*1.5;
        this._bullets = [];
    },
    start:function()
    {
        if(this._firing) return;
        this._firing = true;
        if(this.waveInterval <= 0 || this.countInWave <= 1) {
            this.schedule(this._createBullet, this.interval);
        }else{
            this._waveFire();
        }
        this.scheduleUpdate();
    },
    end:function()
    {
        if(!this._firing) return;
        this._firing = false;
        this.unschedule(this._createBullet);
        this.unschedule(this._createWave);
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
            rect = b.collider;
            over = false;
            if(!cc.rectIntersectsRect(lg.stage.rect(), rect)){
                over = true;
            }else if(this._targetMap){
                targets = this._targetMap.getCoveredTiles1(rect, true);
                j = -1;
                pos = lg.getPosition(b, true);
                rot = lg.getRotation(b, true);
                while(++j < targets.length) {
                    target = targets[j];
                    if(target == this.owner) continue;
                    if(target.dead === true) continue;
                    if(this.owner && target.camp == this.owner.camp) continue;
                    //hit the target
//                    collide = cc.rectIntersection(target.collider, rect);
//                    if(this.collideSize == -1) this.collideSize = (rect.width*rect.height)/2;
//                    if(collide.width*collide.height > this.collideSize){
                    collide = cc.rectIntersection(target.collider, rect);
//                    if(this.collideSize == -1) this.collideSize = 2*(rect.width + rect.height)/(2*Math.PI);
                    if(cc.pDistance(pos, target.collidCenter) < this.collideSize){
                        if(target["onHit"]) {
                            target.dead = target.onHit(b);
                        }
                        this._showHitEffect(pos, rot);
                        over = true;
                        break;
                    }
                }
            }
            if(over) {
                b.destroy();
                this._bullets.splice(i, 1);
            }
        }
    },
    setParams:function(params)
    {
        if(params == null) return;
        lg.copyProperties(params, this);
        this.end();
        this.start();
    },
    setTargetMap:function(mapId)
    {
        this._targetMap = lg.getTileMap(mapId);
    },
    setFireEffect:function(plistFile, assetID)
    {
        //todo, pool
        this._fireEffect = lg.assetsManager.createDisplay(plistFile, assetID);
        this._fireEffect.autoHideWhenOver = true;
    },
    setHitEffect:function(plistFile, assetID)
    {
        //todo, pool
        this._hitEffect = lg.assetsManager.createDisplay(plistFile, assetID);
        this._hitEffect.autoHideWhenOver = true;
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
        if(lg.Gun.batchCanvas == null) {
            cc.log("Pls set batch canvas for me to show the bullet: lg.Gun.batchCanvas!");
            return;
        }
        var t = this._maxShootDistance/this.speed;
        var pos = this.getParent().convertToWorldSpace(this.getPosition());
        var rot = lg.getRotation(this);
        var b = null;
        var i = -1;
        var r = 0;
        var d = 0;
        var ints  = lg.createDInts(this.count);
        while(++i < this.count)
        {
            d = ints[i];
            r = rot + d*this.angleGap;
            b = this._pool.fetch(this._bulletID);
            b.damage = this.damage;
            b.play();
            b.autoRecycle = true;
            b.setPosition(pos);
            b.setRotation(r);
            //todo, implement in the ObjectPool.fetch里面去？
            if(b.getParent() && b.getParent() != lg.Gun.batchCanvas) {
                b.removeFromParent(false);
            }
            if(b.getParent() == null)  lg.Gun.batchCanvas.addChild(b);
            b.runAction(cc.MoveBy.create(t,lg.getPointOnCircle(this._maxShootDistance, r)));
            this._bullets.push(b);
        }
        this._showFireEffect(pos, rot);
        if(this.fireSound) lg.playSound(this.fireSound);
    },
    _createWave:function()
    {
        this.schedule(this._createBullet, this.interval, this.countInWave - 1);
    },
    _showFireEffect:function(pos, rot)
    {
        if(this._fireEffect) {
            if(this._fireEffect.getParent() == null) lg.Gun.batchCanvas.addChild(this._fireEffect, 100);
            this._fireEffect.setVisible(true);
            this._fireEffect.setPosition(pos);
            this._fireEffect.setRotation(rot);
            this._fireEffect.gotoAndPlay1(1);
        }
    },
    _showHitEffect:function(pos, rot)
    {
        if(this._hitEffect) {
            if(this._hitEffect.getParent() == null) lg.Gun.batchCanvas.addChild(this._hitEffect, 100);
            this._hitEffect.setVisible(true);
            this._hitEffect.setPosition(pos);
            this._hitEffect.setRotation(rot);
            this._hitEffect.gotoAndPlay1(1);
        }
    }
});

lg.Gun.batchCanvas = null;

lg.Gun.create = function(plistFile, bulletID)
{
    var gun = new lg.Gun();
    if(gun.init()){
        gun._plistFile = plistFile;
        gun._bulletID = bulletID;
        return gun;
    }
    return null;
};
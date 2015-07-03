/**
 * Created by long on 14-4-24.
 */

flax._gunnerDefine = {
    camp:null,//Player or Enemy?
    _gunParam:null,//see flax.GunParam, remember the anchors, ["weapon1","weapon2"]
    targets:null,//the targets array of the enemy
    alwaysBind:true,//if the gun always bind to the anchor every frame
    _guns:null,
    _autoShooting:false,
    _waitingShoot:false,
    _auto:false,//if true, will auto shoot according to the gunParam

    onEnter:function()
    {
        this._super();
        this._guns = [];
        if(this._gunParam) this.setGunParam(this._gunParam);
    },
    onRecycle:function()
    {
        this._super();
        this.camp = null;
        this._gunParam = null;
        this.targets = null;
        this._guns = null;
        this._autoShooting = this._waitingShoot = this._auto = false;
        this.stopShoot();
    },
    getGunParam:function(){
        return this._gunParam;
    },
    setGunParam:function(param, gunAnchors)
    {
        this._gunParam = param;
        if(this.parent == null) return;
        if(!gunAnchors) gunAnchors = param.gunAnchors;
        if(gunAnchors == null){
            cc.log("Please set the gunAnchors param!");
            return;
        }
        var i = -1;
        var n = gunAnchors.length;
        var gunAnchor = null;
        var gun = null;
        while(++i < n)
        {
            gunAnchor = gunAnchors[i];
            gun = flax.Gun.create(this._gunParam);
            if(this.bindAnchor(gunAnchor, gun, this.alwaysBind)) {
                gun.owner = this;
                gun.name = gunAnchor;
                this[gunAnchor] = gun;
                this._guns.push(gun);
            }
        }
        if(this._waitingShoot){
            this.scheduleOnce(this.autoShoot, 0.1);
        }
    },
    shoot:function(){
        this._auto = false;
        this._doBeginShoot();
    },
    autoShoot:function(delay)
    {
        this._auto = true;
        if(this.parent == null || this._guns == null || this._guns.length == 0) {
            this._waitingShoot = true;
            return;
        }
        if(delay > 0){
            this.scheduleOnce(this._doBeginShoot, delay);
        }else{
            this._doBeginShoot();
        }
        this._autoShooting = true;
        this._waitingShoot = false;
    },
    /**
     * Set a target to aim to
     * */
    aimToTarget:function(target){
        if(!target || !target.parent || !target.visible) return;
        if(this.targets == null) this.targets = [target];
        else if(this.targets.indexOf(target) == -1) this.targets.push(target);
        var i = -1;
        var n = this._guns.length;
        var gun = null;
        while(++i < n)
        {
            gun = this._guns[i];
            gun.aimTarget = target;
        }
    },
    onAimingTarget:function(angle){
        //to be override
    },
    _doBeginShoot:function()
    {
        var i = -1;
        var n = this._guns.length;
        while(++i < n)
        {
            if(this._auto) this._guns[i].start();
            else this._guns[i].shootOnce();
        }
    },
    stopShoot:function()
    {
        this._autoShooting = false;
        if(this._guns == null || this._guns.length == 0) return;
        var i = -1;
        var n = this._guns.length;
        while(++i < n)
        {
            this._guns[i].end();
        }
    },
    upgradeGun:function(deltaParam, time)
    {
        var delta = this._deltaGunParam(deltaParam);
        if(!isNaN(time) && time > 0){
            this.scheduleOnce(function(){
                this._deltaGunParam(delta);
            }, time);
        }else{
            this._deltaGunParam(delta);
        }
    },
    _deltaGunParam:function(param)
    {
        if(this._guns.length == 0) return;
        var delta = {};
        var newValue = 0;
        for(var k in param){
            newValue = this._guns[0].param[k] + param[k];
            if(newValue <= 0) {
                delete param[k];
                continue;
            }
            delta[k] = -param[k];
            param[k] = newValue;
        }
        var i = this._guns.length;
        var gun = null;
        while(i--)
        {
            gun = this._guns[i];
            gun.updateParam(param);
        }
        return delta;
    },
    onDie:function()
    {
        this.stopShoot();
        flax.callModuleFunction(this, "onDie");
        if(this.ownerBody) this.ownerBody.destroy();
        else this.destroy();
    }
};

flax.Gunner = flax.Animator.extend(flax._gunnerDefine);
//Avoid to advanced compile mode
window['flax']['Gunner'] = flax.Gunner;

flax.MCGunner = flax.MovieClip.extend(flax._gunnerDefine);
//Avoid to advanced compile mode
window['flax']['MCGunner'] = flax.MCGunner;

flax.addModule(flax.Gunner, flax.HealthModule, false);
flax.addModule(flax.MCGunner, flax.HealthModule, false);

var _p = flax.Gunner.prototype;
/** @expose */
_p.onHit;
/** @expose */
_p.onDie;
/** @expose */
_p.gunParam;
cc.defineGetterSetter(_p, "gunParam", _p.getGunParam, _p.setGunParam);

_p = flax.MCGunner.prototype;
/** @expose */
_p.onHit;
/** @expose */
_p.onDie;
/** @expose */
_p.gunParam;
cc.defineGetterSetter(_p, "gunParam", _p.getGunParam, _p.setGunParam);

flax.Gunner.create = function(assetsFile, assetID)
{
    var h = new flax.Gunner(assetsFile, assetID);
    h.clsName = "flax.Gunner";
    return h;
};

flax.MCGunner.create = function(assetsFile, assetID)
{
    var h = new flax.MCGunner(assetsFile, assetID);
    h.clsName = "flax.MCGunner";
    return h;
};




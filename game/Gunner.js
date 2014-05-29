/**
 * Created by long on 14-4-24.
 */
var lg = lg || {};

var GunnerCamp = {
    player:"Player",
    enemy:"Enemy"
};

lg._gunnerDefine = {
    camp:"Player",
    gunParam:null,//see lg.GunParam
    gunAnchors:null,//["weapon1","weapon2"]
    targets:null,//the targets array of the enemy
    maxHealth:100,
    health:100,
    dead:false,
    _guns:null,
    _shooting:false,

    onEnter:function()
    {
        this._super();
        this._guns = [];
        if(this.camp == GunnerCamp.player) lg.Gunner.players.push(this);
        else lg.Gunner.enemies.push(this);
        this.health = this.maxHealth;
        this.dead = false;

        if(this.gunParam) this.setGunParam(this.gunParam);
    },
    onRecycle:function()
    {
        this._super();
        this.stopShoot();
        var arr = (this.camp == GunnerCamp.player) ? lg.Gunner.players : lg.Gunner.enemies;
        var i = arr.indexOf(this);
        if(i > -1) {
            arr.splice(i, 1);
        }
    },
    setGunParam:function(param)
    {
        this.gunParam = param;
        if(this.parent == null) return;
        if(lg.bulletCanvas == null) {
            var texturePath = cc.path.changeBasename(this.gunParam.bulletPlist, ".png");
            lg.bulletCanvas = lg.BulletCanvas.create(texturePath);
            this.parent.addChild(lg.bulletCanvas, 999999);
        }
        if(this.gunAnchors == null){
            cc.log("Pleas set the gunAnchors param!");
            return;
        }
        var i = -1;
        var n = this.gunAnchors.length;
        var gunAnchor = null;
        var gun = null;
        while(++i < n)
        {
            gunAnchor = this.gunAnchors[i];
            gun = lg.Gun.create(this.gunParam);
            if(this.bindAnchor(gunAnchor, gun)) {
                gun.owner = this;
                this._guns.push(gun);
            }
        }
        if(this._shooting) this.beginShoot();
    },
    beginShoot:function(delay)
    {
        this._shooting = true;
        if(this._guns == null || this._guns.length == 0) return;
        if(delay > 0){
            this.scheduleOnce(this._doBeginShoot, delay);
        }else{
            this._doBeginShoot();
        }
    },
    _doBeginShoot:function()
    {
        var i = -1;
        var n = this._guns.length;
        while(++i < n)
        {
            this._guns[i].start();
        }
    },
    stopShoot:function()
    {
        this._shooting = false;
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
            newValue = this._guns[0][k] + param[k];
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
    onHit:function(bullet)
    {
        if(!this._canBeHurt()) return;
        this.health -= bullet.damage;
        if(this.health <= 0) {
            this.stopShoot();
            this._onDie();
            return true;
        }
        return false;
    },
    _onDie:function()
    {
        this.destroy();
    },
    _canBeHurt:function()
    {
        return true;
    }
};

lg.Gunner = lg.Animator.extend(lg._gunnerDefine);
lg.MCGunner = lg.MovieClip.extend(lg._gunnerDefine);

lg.Gunner.players = [];
lg.Gunner.enemies = [];

lg.Gunner.create = function(plistFile, assetID)
{
    var h = new lg.Gunner(plistFile, assetID);
    h.clsName = "lg.Gunner";
    return h;
};

lg.MCGunner.create = function(plistFile, assetID)
{
    var h = new lg.MCGunner(plistFile, assetID);
    h.clsName = "lg.MCGunner";
    return h;
};




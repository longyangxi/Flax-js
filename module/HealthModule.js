/**
 * Created by long on 14-7-10.
 */
var lg = lg || {};

lg.HealthModule = {
    maxHealth:100,
    health:100,
    dead:false,
    body:null,//the body to be hurted, when health == 0, the body will disappear, default body is the gunner itself
    onEnter:function(){
        this.health = this.maxHealth;
        this.dead = false;
    },
    onExit:function(){
    },
    onHit:function(bullet)
    {
        if(!this._canBeHurt()) return false;
        if(this.dead) return true;
        this.health -= bullet.damage;
        if(this.health <= 0) {
            this.dead = true;
            this.health = 0;
            this._onDie();
            return true;
        }
        return false;
    },
    _onDie:function()
    {
        cc.log("die in module")
        if(this.body) this.body.destroy();
        else this.destroy();
    },
    _canBeHurt:function()
    {
        return true;
    }
}
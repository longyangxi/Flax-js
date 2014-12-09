var SimpleScene = cc.Scene.extend({
    onEnter:function(){
        this._super();

        var zombie = flax.assetsManager.createDisplay(res.zombie, "ZombieAttack", {parent: this, x: 300, y: 200, fps:12});
        zombie.play();
    }
});
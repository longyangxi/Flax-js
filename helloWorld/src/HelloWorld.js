var HelloWorld = cc.Scene.extend({
    onEnter:function(){
        this._super();
        var winSize = cc.visibleRect;
        var anim = flax.assetsManager.createDisplay(res.anim, "anim", {parent: this, x: winSize.width/2, y: winSize.height/2});
        anim.autoStopWhenOver = true;
        anim.play();
    }
});
var HelloWorld = cc.Scene.extend({
    onEnter:function(){
        this._super();
        var winSize = cc.visibleRect;
        //从flax输出的素材文件中，创建id为anim的动画，对应flash库中链接名为mc.anim的动画
        //添加到this中，并设置位置为舞台中心
        var anim = flax.assetsManager.createDisplay(res.anim, "helloWorld", {parent: this, x: winSize.width/2, y: winSize.height/2});
        //在最后一帧停住
        anim.autoStopWhenOver = true;
        //从当前帧就是第1帧开始播放
        anim.play();
    }
});
/**
 * Created by long on 14-2-1.
 */
var flax = flax || {};

flax.Animator = flax.FlaxSprite.extend({
    frameNames:null,
    clsName:"flax.Animator",
    onNewSource:function()
    {
        var startFrame = this.define.start;
        var endFrame = this.define.end;

        this.frameNames = flax.assetsManager.getFrameNames(this.assetsFile, startFrame, endFrame);
        this.totalFrames = this.frameNames.length;
        if(this.totalFrames == 0)
        {
            cc.log("There is no frame for display: "+this.assetID);
            return;
        }
    },
    doRenderFrame:function(frame)
    {
        var sFrame = cc.spriteFrameCache.getSpriteFrame(this.frameNames[frame]);
        if(sFrame) this.setSpriteFrame(sFrame);
    },
    getDefine:function()
    {
       var define = flax.assetsManager.getDisplayDefine(this.assetsFile, this.assetID);
       if(define == null) throw "There is no Animator named: " + this.assetID + " in assets: " + this.assetsFile;
       return define;
    }
});

flax.Animator.create = function(assetsFile, assetID)
{
    var mc = new flax.Animator(assetsFile, assetID);
    mc.clsName = "flax.Animator";
    return mc;
};
/**
 * Created by long on 14-2-1.
 */
var lg = lg || {};

lg.Animator = lg.TimeLine.extend({
    frameNames:null,
    onNewSheet:function()
    {
        var startFrame = this.define["start"];
        var endFrame = this.define["end"];

        this.frameNames = lg.assetsManager.getFrameNames(this.assetsFile, startFrame, endFrame);
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
       return lg.assetsManager.getDisplayDefine(this.assetsFile, this.assetID);
    }
});

lg.Animator.create = function(assetsFile, assetID)
{
    var mc = new lg.Animator(assetsFile, assetID);
    mc.clsName = "lg.Animator";
    return mc;
};
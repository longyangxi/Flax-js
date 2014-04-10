/**
 * Created by long on 14-2-1.
 */
var lg = lg || {};

lg.Animator = lg.TimeLine.extend({
    frameName:null,
    frameNames:null,
    onNewSheet:function()
    {
        var startFrame = this.define["start"];
        var endFrame = this.define["end"];

        this.frameNames = lg.assetsManager.getFrameNames(this.plistFile, startFrame, endFrame);
        this.totalFrames = this.frameNames.length;
        if(this.totalFrames == 0)
        {
            cc.log("There is no frame for display: "+this.assetID);
            return;
        }
    },
    onEnter:function()
    {
        this._super();
//        lg.drawRect(lg.getRect(this,true));
    },
    doRenderFrame:function(frame)
    {
        var sFrame = cc.SpriteFrameCache.getInstance().getSpriteFrame(this.frameNames[frame]);
        if(sFrame) this.setDisplayFrame(sFrame);
    },
    getDefine:function()
    {
       return lg.assetsManager.getDisplayDefine(this.plistFile, this.assetID);
    }
});

lg.Animator.create = function(plistFile, assetID)
{
    var mc = new lg.Animator();
    mc.setPlist(plistFile, assetID);
    mc.clsName = "lg.Animator";
    return mc;
};
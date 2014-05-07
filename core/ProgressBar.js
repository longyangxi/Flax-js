/**
 * Created by long on 14-5-7.
 */
var lg = lg || {};
lg.ProgressBarType = {
    HORIZONTAL:"horizontal",
    VERTICAL:"vertical",
    RADIAL:"radial"
};
lg.ProgressBar = lg.Animator.extend({
    pBar:null,
    _type:null,
    _reversed:false,
    _percentage:0,
    _tween:null,
    init:function()
    {
        this._super();
        if(this._type == null) this._type = lg.ProgressBarType.HORIZONTAL;
    },
    onReset:function()
    {
        this._super();
        this.setOpacity(0);
    },
    getPercentage:function()
    {
        return this._percentage;
    },
    setPercentage:function(p)
    {
        if(this.pBar) this.pBar.percentage = p;
        this._percentage = this.pBar.percentage;
    },
    getType:function()
    {
        return this._type;
    },
    setType:function(type)
    {
        if(this._type == type) return;
        this._type = type;
        this._updatePBar();
    },
    getReversed:function()
    {
        return this._reversed;
    },
    setReversed:function(r)
    {
        if(this._reversed == r) return;
        this._reversed = r;
        this._updatePBar();
        //to fix the setReverse bug
        this.percentage += 0.1;
        this.percentage -= 0.1;
    },
    tween:function(from, to, duration)
    {
        if(this.pBar == null) return;
        if(this._tween) this.pBar.stopAction(this._tween);
        this._tween = cc.ProgressFromTo.create(duration, from, to);
        this.pBar.runAction(this._tween);
    },
    stopTween:function()
    {
        if(this._tween && this.pBar) {
            this.pBar.stopAction(this._tween);
            this._tween = null;
        }
    },
    doRenderFrame:function(frame)
    {
        var sFrame = cc.spriteFrameCache.getSpriteFrame(this.frameNames[frame]);
        if(sFrame) {
            //todo, is there some performance issue? pool?
            var frameSprite = cc.Sprite.create(sFrame);
            if(this.pBar == null){
                this.width = frameSprite.width;
                this.height = frameSprite.height;

                this.pBar = cc.ProgressTimer.create(frameSprite);

                this._updatePBar();

                this.pBar.setAnchorPoint(this.getAnchorPoint());
                this.pBar.setPosition(this.getAnchorPointInPoints());
                this.addChild(this.pBar);
            }else{
                this.pBar.setSprite(frameSprite);
            }
        }
    },
    _updatePBar:function()
    {
        if(this.pBar == null) return;
        if(this._type == lg.ProgressBarType.RADIAL) {
            this.pBar.type = cc.PROGRESS_TIMER_TYPE_RADIAL;
            this.pBar.setReverseDirection(this._reversed);
            this.pBar.midPoint = cc.p(0.5, 0.5);
        }else{
            this.pBar.type = cc.PROGRESS_TIMER_TYPE_BAR;
            var isHorizontal = this._type == lg.ProgressBarType.HORIZONTAL;
            var mid = cc.p(0, 0);
            var cRate = cc.p(isHorizontal ? 1: 0, isHorizontal ? 0 : 1);
            if(this._reversed){
                if(isHorizontal) mid.x = 1;
                else mid.y = 1;
            }
            this.pBar.midPoint = mid;
            this.pBar.barChangeRate = cRate;
        }
    }
});
lg.ProgressBar.create = function(plistFile, assetID)
{
    var p = new lg.ProgressBar();
    p.setPlist(plistFile, assetID);
    p.clsName = "lg.ProgressBar";
    return p;
};

window._p = lg.ProgressBar.prototype;

/** @expose */
_p.percentage;
cc.defineGetterSetter(_p, "percentage", _p.getPercentage, _p.setPercentage);
/** @expose */
_p.type;
cc.defineGetterSetter(_p, "type", _p.getType, _p.setType);
/** @expose */
_p.reversed;
cc.defineGetterSetter(_p, "reversed", _p.getReversed, _p.setReversed);

delete window._p;


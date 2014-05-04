/**
 * Created by long on 14-2-8.
 */

var lg = lg || {};

lg.ProgressBar = cc.ClippingNode.extend({
    tweenSpeed:1000,
    _bar:null,
    _progress:1.0,
    _tempPos:null,
    _valueTweeningGap:0,
    _toValue:null,

    init:function(stencil)
    {
        this._tempPos = new cc.Point();
        this._super(stencil);

        var size = this._bar.getContentSize();
        this.setContentSize(size);
        this.setAnchorPoint(this._bar.getAnchorPoint());
        this._bar.setAnchorPoint(0, 0);
        this._bar.setPosition(cc.p());

        this._stencil = cc.DrawNode.create();
        var rectangle = [cc.p(0, 0),cc.p(size.width, 0),
            cc.p(size.width, size.height),
            cc.p(0, size.height)];

        var white = cc.color(1, 1, 1, 0);
        this._stencil.drawPoly(rectangle, white, 1, white);

        this.addChild(this._bar);
        this._updateProgress();
    },
    setProgress:function(value, tween)
    {
        if(this._progress == value) return;
        this._progress = value;
        this._progress = lg.restrictValue(this._progress, 0, 1);
        this._updateProgress(tween);
    },
    getProgress:function()
    {
        return this._progress;
    },
    tweenValue:function(from, to, t)
    {
        from = lg.restrictValue(from, 0, 1);
        to = lg.restrictValue(to, 0, 1);
        if(from == to) return;
        this.setProgress(from, true);
        this._toValue = to;
        var interval = Math.min(t, 0.1);
        var count = t/interval;
        this._valueTweeningGap = (to - from)/count;
        this.schedule(this._updateValueTween,interval,count - 1);
    },
    stopTweenValue:function()
    {
        this.unschedule(this._updateValueTween);
    },
    _updateValueTween:function(delta)
    {
        this._progress += this._valueTweeningGap;
        this.setProgress(this._progress + this._valueTweeningGap);
    },
    _updateProgress:function(tween)
    {
        this._tempPos.x = - (1.0 - this._progress)*this.width;
        this._tempPos.y = this._stencil.y;
        if(this.tweenSpeed > 0 && tween !== false) {
            this._stencil.stopAllActions();
            var t = Math.abs(this._tempPos.x - this.x)/this.tweenSpeed;
            this._stencil.runAction(cc.MoveTo.create(t, this._tempPos));
        }
        else this._stencil.setPosition(this._tempPos);
    }
});

lg.ProgressBar.create = function(plistFile, assetID)
{
    var bar = new lg.ProgressBar();
    bar._bar = lg.Animator.create(plistFile, assetID);
    bar.init();
    return bar;
};
/**
 * Created by long on 14-2-8.
 */

var lg = lg || {};

lg.ProgressBar = cc.ClippingNode.extend({
    tweenSpeed:1000,
    _bar:null,
    _progress:1.0,
    _tempPos:null,

    init:function(stencil)
    {
        this._tempPos = new cc.Point();
        this._super(stencil);

        var size = this._bar.getContentSize();
        this.setContentSize(size);
        this.setAnchorPoint(this._bar.getAnchorPoint());
        this._bar.setAnchorPoint(0, 0);
        this._bar.setPosition(cc.POINT_ZERO);

        this._stencil = cc.DrawNode.create();
        var rectangle = [cc.p(0, 0),cc.p(size.width, 0),
            cc.p(size.width, size.height),
            cc.p(0, size.height)];

        var white = cc.c4f(1, 1, 1, 0);
        this._stencil.drawPoly(rectangle, white, 1, white);

        this.addChild(this._bar);

        this._updateProgress();
    },
    setProgress:function(value)
    {
        if(this._progress == value) return;
        this._progress = value;
        this._updateProgress();
    },
    getProgress:function()
    {
        return this._progress;
    },
    _updateProgress:function()
    {
        this._tempPos.x = - (1.0 - this._progress)*this.getContentSize().width;
        this._tempPos.y = this._stencil.getPositionY();
        if(this.tweenSpeed > 0) {
            this._stencil.stopAllActions();
            var t = Math.abs(this._tempPos.x - this.getPositionX())/this.tweenSpeed;
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
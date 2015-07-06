/**
 * Created by long on 15-5-10.
 */
var HLayoutType = {
    LEFT:0,
    CENTER:1,
    RIGHT:2
}
var VLayoutType = {
    BOTTOM:0,
    MIDDLE:1,
    TOP:2
}

flax.getLayoutPosition = function(target, hLayout, vLayout)
{
    var rect = flax.getRect(target, true);
    var sCenter = cc.visibleRect.center;
    var anchorPos = target.getAnchorPointInPoints();

    var x = 0;
    var y = 0;

    switch(hLayout){
        case HLayoutType.LEFT:
            x = 0;
            break;
        case HLayoutType.CENTER:
            x = sCenter.x - rect.width/2;
            break;
        case HLayoutType.RIGHT:
            x = cc.visibleRect.right.x - rect.width;
            break;
    }
    switch(vLayout){
        case VLayoutType.BOTTOM:
            y = 0;
            break;
        case VLayoutType.MIDDLE:
            y = sCenter.y - rect.height/2;
            break;
        case VLayoutType.TOP:
            y = cc.visibleRect.top.y - rect.height;
            break;
    }

    var scale = flax.getScale(target, true);
    var offsetX = !hLayout ? cc.visibleRect.bottomLeft.x : 0;
    var offsetY = !vLayout ? cc.visibleRect.bottomLeft.y : 0;
    var pos = cc.p(x + offsetX + anchorPos.x*scale.x, y + offsetY + anchorPos.y*scale.y);

    if(target.parent){
        pos = target.parent.convertToNodeSpace(pos);
    }
    return pos;
}

flax.ScreenLayoutModule = {
    _isAutoLayout:false,
    _hlayout:null,
    _vlayout:null,
    _offsetX:0,
    _offsetY:0,
    onEnter:function()
    {
        flax.onDeviceRotate.add(this._updateLayout, this);
        flax.onScreenResize.add(this._updateLayout, this);
    },
    onExit:function()
    {
        flax.onDeviceRotate.remove(this._updateLayout, this);
        flax.onScreenResize.remove(this._updateLayout, this);
    },
    setLayoutOffset:function(offsetX, offsetY)
    {
        this._offsetX = offsetX;
        this._offsetY = offsetY;
        this._updateLayout();
    },
    /**
     * Set the layout
     * @param {HLayoutType} hLayout Layout type on horizontal direction
     * @param {VLayoutType} vLayout Layout type on vertical direction
     * */
    setLayout:function(hLayout, vLayout)
    {
        this._isAutoLayout = false;
        this._hlayout = hLayout;
        this._vlayout = vLayout;
        var pos = flax.getLayoutPosition(this, hLayout, vLayout);
        pos.x += this._offsetX;
        pos.y += this._offsetY;
        this.setPosition(pos);
    },
    /**
     * Auto layout on the screen according on the designed position.
     * In most situations, the object on the top-left will still on the top-left when screen size changed.
     * Note: This can be used only on the resolution policy of cc.ResolutionPolicy.NO_BORDER
     * */
    autoLayout:function()
    {
        if(cc.view.getResolutionPolicy() != cc.ResolutionPolicy.NO_BORDER) return;

        this._isAutoLayout = true;

        var rect = flax.getRect(this, this.parent);
        var sCenter = cc.visibleRect.center;
        var anchorPos = this.getAnchorPointInPoints();
        var offsetPlus = 0;

        var rateX = cc.visibleRect.width/flax.designedStageSize.width;
        if(rateX != 1.0){
            var offsetX = this.x - sCenter.x;
            if(offsetX > 0) {
                offsetPlus = rect.width;
            }
            offsetX = rect.x + offsetPlus - sCenter.x;
            this.x = sCenter.x + offsetX*rateX + anchorPos.x*this.scaleX - offsetPlus + this._offsetX;
        }

        var rateY = cc.visibleRect.height/flax.designedStageSize.height;
        if(rateY != 1.0){
            var offsetY = this.y - sCenter.y;
            offsetPlus = 0;
            if(offsetY > 0) {
                offsetPlus = rect.height;
            }
            offsetY = rect.y + offsetPlus - sCenter.y;
            this.y = sCenter.y + offsetY*rateY + anchorPos.y*this.scaleY - offsetPlus + this._offsetY;
        }
    },
    _updateLayout:function(landscape)
    {
        if(this._isAutoLayout){
            this.autoLayout();
        }else if(this._hlayout != null && this._vlayout != null){
            this.setLayout(this._hlayout, this._vlayout);
        }
    }
}
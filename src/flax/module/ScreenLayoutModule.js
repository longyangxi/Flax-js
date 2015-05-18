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
flax.ScreenLayoutModule = {
    onEnter:function()
    {

    },
    onExit:function()
    {

    },
    /**
     * Set the layout
     * @param {HLayoutType} hLayout Layout type on horizontal direction
     * @param {VLayoutType} vLayout Layout type on vertical direction
     * */
    setLayout:function(hLayout, vLayout)
    {
        var rect = flax.getRect(this, true);
        var sCenter = cc.visibleRect.center;
        var anchorPos = this.getAnchorPointInPoints();

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

        var scale = flax.getScale(this, true);
        var offsetX = !hLayout ? flax.stageRect.x : 0;
        var offsetY = !vLayout ? flax.stageRect.y : 0;
        var pos = cc.p(x + offsetX + anchorPos.x*scale.x, y + offsetY + anchorPos.y*scale.y);

        if(this.parent){
            pos = this.parent.convertToNodeSpace(pos);
        }
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

        var rect = flax.getRect(this, this.parent);
        var sCenter = cc.visibleRect.center;
        var anchorPos = this.getAnchorPointInPoints();
        var offsetPlus = 0;

        var rateX = flax.stageRect.width/flax.designedStageSize.width;
        if(rateX != 1.0){
            var offsetX = this.x - sCenter.x;
            if(offsetX > 0) {
                offsetPlus = rect.width;
            }
            offsetX = rect.x + offsetPlus - sCenter.x;
            this.x = sCenter.x + offsetX*rateX + anchorPos.x*this.scaleX - offsetPlus;
        }

        var rateY = flax.stageRect.height/flax.designedStageSize.height;
        if(rateY != 1.0){
            var offsetY = this.y - sCenter.y;
            offsetPlus = 0;
            if(offsetY > 0) {
                offsetPlus = rect.height;
            }
            offsetY = rect.y + offsetPlus - sCenter.y;
            this.y = sCenter.y + offsetY*rateY + anchorPos.y*this.scaleY - offsetPlus;
        }
    }
}
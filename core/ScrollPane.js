/**
 * Created by long on 14-6-6.
 */
var lg = lg || {};

lg._scrollPaneDefine = {
    _viewRect:null,
    onEnter:function(){
        this._super();
        this._viewRect = this.getCollider("view").getRect(false);
        if(!this._viewRect) {
            cc.log("If you want me scrollable, please set collider__view for me!");
            return;
        }
        lg.inputManager.addListener(this, this.startDrag, InputType.press);
        //todo, mask the content
//        var stencil = cc.DrawNode.create();
//        var rectangle = [cc.p(0, 0),cc.p(this._viewRect.width, 0),cc.p(this._viewRect.width, this._viewRect.height),cc.p(0, this._viewRect.height)];
//        var color = cc.color(255, 255, 255, 100);
//        stencil.drawPoly(rectangle, color, 1, color);
////        this.parent.addChild(stencil, 10000);
//        stencil.setPosition(this._viewRect.x, this._viewRect.y);
//        var mask = cc.ClippingNode.create(stencil);
//        mask.addChild(this);
    },
    startDrag:function(touch, event){
        lg.inputManager.addListener(this, this.drag, InputType.move);
        lg.inputManager.addListener(this, this.stopDrag, InputType.up);
    },
    drag:function(touch, event){
        var delta = touch.getDelta();

        //if the viewRect is larger than the content itself, then do nothing
        if(this._viewRect.width >= this.width) delta.x = 0;
        if(this._viewRect.height >= this.height) delta.y = 0;

        var x = this.x + delta.x;
        x = Math.max(this._viewRect.x + this._viewRect.width - this.width, x);
        x = Math.min(this._viewRect.x, x);

        var y = this.y + delta.y;
        y = Math.max(this._viewRect.y + this._viewRect.height - this.height, y);
        y = Math.min(this._viewRect.y, y);

        this.x = x;
        this.y = y;
    },
    stopDrag:function(touch, event){
        lg.inputManager.removeListener(this, this.drag, InputType.move);
        lg.inputManager.removeListener(this, this.stopDrag, InputType.up);
    }
};
lg.ScrollPane = lg.MovieClip.extend(lg._scrollPaneDefine);
lg.ScrollPane.create = function(plistFile, assetID){
    var s = new lg.ScrollPane(plistFile, assetID);
    return s;
}

lg.ScrollPane1 = lg.Animator.extend(lg._scrollPaneDefine);
lg.ScrollPane1.create = function(plistFile, assetID){
    var s = new lg.ScrollPane1(plistFile, assetID);
    return s;
}

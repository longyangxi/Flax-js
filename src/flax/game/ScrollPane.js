/**
 * Created by long on 14-6-6.
 */

flax._scrollPaneDefine = {
    _viewRect:null,
    onEnter:function(){
        this._super();
        //todo, maybe true
        this._viewRect = this.getCollider("view").getRect(true);
        if(!this._viewRect) {
            cc.log("If you want me scrollable, please set collider__view for me!");
            return;
        }
        flax.inputManager.addListener(null, this._startDrag, InputType.press, this);
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
    /**
     * Scroll the pane to make the target in the screen center
     * @param {sprite || point} target the sprite or the position in this pane
     * @param {number} time the duration to scroll to
     * */
    scrollToCenter:function(target, time){
        var pos0 = cc.visibleRect.center;
        pos0 = this.parent.convertToNodeSpace(pos0);
        var pos = this.convertToWorldSpace( target.getPosition ? target.getPosition() : target);
        pos = this.parent.convertToNodeSpace(pos);
        var delta = cc.pSub(pos0, pos);
        var x = this.x + delta.x;
        var y = this.y + delta.y;
        var newPos = this._validatePos(x, y);
        if(time > 0){
            this.runAction(cc.MoveTo.create(time, newPos));
        }else{
            this.setPosition(newPos);
        }
    },
    _startDrag:function(touch, event){
        this.scheduleOnce(function(){
            flax.inputManager.addListener(null, this._drag, InputType.move,this);
            flax.inputManager.addListener(null, this._stopDrag, InputType.up, this);
        },0.01);
    },
    _drag:function(touch, event){
        var delta = touch.getDelta();
        //if the viewRect is larger than the content itself, then do nothing
        if(this._viewRect.width >= this.width) delta.x = 0;
        if(this._viewRect.height >= this.height) delta.y = 0;

        var x = this.x + delta.x;
        var y = this.y + delta.y;
        var newPos = this._validatePos(x, y);
        this.x = newPos.x;
        this.y = newPos.y;
    },
    _stopDrag:function(touch, event){
        flax.inputManager.removeListener(null, this._drag, InputType.move);
        flax.inputManager.removeListener(null, this._stopDrag, InputType.up);
    },
    _validatePos:function(x, y){
        x = Math.max(this._viewRect.x + this._viewRect.width - this.width, x);
        x = Math.min(this._viewRect.x, x);

        y = Math.max(this._viewRect.y + this._viewRect.height - this.height, y);
        y = Math.min(this._viewRect.y, y);

        return cc.p(x, y);
    }
};

flax.ScrollPane = flax.Animator.extend(flax._scrollPaneDefine);
flax.ScrollPane.create = function(assetsFile, assetID){
    var s = new flax.ScrollPane(assetsFile, assetID);
    return s;
};

//Avoid to advanced compile mode
window['flax']['ScrollPane'] = flax.ScrollPane;

flax.MCScrollPane = flax.MovieClip.extend(flax._scrollPaneDefine);
flax.MCScrollPane.create = function(assetsFile, assetID){
    var s = new flax.MCScrollPane(assetsFile, assetID);
    return s;
};

//Avoid to advanced compile mode
window['flax']['MCScrollPane'] = flax.MCScrollPane;

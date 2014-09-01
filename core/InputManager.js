/**
 * Created by long on 14-2-5.
 */
var lg = lg || {};

var InputType = {
    press:"onPress",
    up:"onUp",//The touch position maybe not within the press target
    click:"onClick",
    move:"onMouseMove"//The touch position maybe not within the press target
};

lg.InputManager = cc.Node.extend({
    enabled:true,
    inTouching:false,
    inDragging:false,
    justDragged:false,
    justDragDist:0,
    _masks:[],
    _callbacks:{},
    _radioButtons:{},
    onEnter:function()
    {
        this._super();
        var self = this;
        var listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: false,
            onTouchBegan:function(touch, event)
            {
                if (!self.enabled) return false;
                self.inDragging = false;
                self.justDragged = false;
                self.justDragDist = 0;
                self.inTouching = true;
                self._dispatchOne(self, touch, event, InputType.press);
                return true;
            },
            onTouchEnded:function(touch, event)
            {
                self.inDragging = false;
                self.inTouching = false;
                self._dispatchOne(self, touch, event, InputType.up);
                self._dispatchOne(self, touch, event, InputType.click);
            },
            onTouchMoved:function(touch, event)
            {
                self.inDragging = true;
                self.justDragged = true;
                self.justDragDist += cc.pDistance(cc.p(), touch.getDelta());
                self._dispatchOne(self, touch, event, InputType.move);
            }
        })
        cc.eventManager.addListener(listener, this);
    },
    onExit:function(){
        this._super();
        this._masks = [];
        this.inTouching = false;
        this._callbacks = {};
        this._radioButtons = {};
        cc.eventManager.removeAllListeners();
    },
    /**
     * Add a Sprite node which will permitted the lower sprite to get touch event callback
     * */
    addMask:function(mask){
        if(this._masks.indexOf(mask) > -1) return;
        this._masks.push(mask);
    },
    removeMask:function(mask){
        var i = this._masks.indexOf(mask);
        if(i > -1) this._masks.splice(i, 1);
    },
    _compareRealZIndex:function(node0, node1){
        if(!node0.parent || !node1.parent) return 1;
        if(node0.parent == node1.parent) return this._childIsOnFront(node0, node1);

        var theSameParent = null;
        var theSameIndex = 0;

        var parents0 = [];
        var node = node0.parent;
        while(node){
            parents0.push(node);
            node = node.parent;
        }

        var parents1 = [];
        node = node1.parent;
        while(node){
            theSameIndex = parents0.indexOf(node);
            if(theSameIndex > -1) {
                theSameParent = node;
                break;
            }
            parents1.push(node);
            node = node.parent;
        }
        parents0 = parents0.slice(0, theSameIndex);
        var front = this._childIsOnFront(parents0[parents0.length - 1] || node0, parents1[parents1.length - 1] || node1, theSameParent);
        return front ? 1 : -1;
    },
    _childIsOnFront:function(child0, child1, parent){
        if(parent == null) parent = child0.parent;
        return parent.children.indexOf(child0) > parent.children.indexOf(child1);
    },
    /**
     * @param{cc.Node}target the target want to receive the touch event, if target is null, then global event will be triggered
     * @param{function}function to call back, func(touch, event),{event.currentTarget, event.target}
     * @param{string}event type as InputType said
     * @param{cc.Node}context the callback context of "THIS", if null, use target as the context
     * */
    addListener:function(target, func, type, context)
    {
        if(func == null) {
            throw "Event callback can not be null!"
        }
        if(target == null) {
            cc.log("target is null, make sure you want to listen to the full screen input!")
            target = this;
        }

        type = (type == null) ? InputType.click : type;

        var arr = this._callbacks[target.__instanceId];
        if(arr == null){
            arr = [];
            this._callbacks[target.__instanceId] = arr;
            if(target != this) {
                this._createListener(target, true);
                if(lg.isButton(target) && target.radioGroup){
                    if(this._radioButtons[target.radioGroup] == null) this._radioButtons[target.radioGroup] = [];
                    this._radioButtons[target.radioGroup].push(target);
                }
            }
        }

        var i = arr.length;
        while(i--){
            if(arr[i].type == type && arr[i].func == func)  return;
        }
        var callback = {type:type, func:func, context:context || target};
        arr.push(callback);
    },
    removeListener:function(target, func, type)
    {
        if(target == null) target = this;
        var calls = this._callbacks[target.__instanceId];
        if(!calls) return;
        this.scheduleOnce(function(){
            var call = null;
            var i = calls.length;
            if(func || type) {
                while(i--){
                    call = calls[i];
                    if((type && call.type == type) || (func && call.func == func)) calls.splice(i, 1);
                }
            }
            if(calls.length == 0 || (!func && !type)){
                delete this._callbacks[target.__instanceId];
            }
        },0.01);
    },
    handleTouchBegan:function(touch, event)
    {
        if (!this.enabled) return false;

        var target = event.getCurrentTarget();

        if(this._ifTargetIgnore(target, touch)) return false;
        var pos = touch.getLocation();

        //handle the masks
        var i = this._masks.length;
        var mask = null;
        var maskTouchedItem = null;
        while(i--){
            mask = this._masks[i];
            if(target == mask || lg.isChildOf(target, mask) || lg.isChildOf(mask, target)) continue;
            if(this._ifTargetIgnore(mask)) continue;
            if(this._compareRealZIndex(mask, target) == 1){
                maskTouchedItem = this._findRealTarget(mask, pos);
                if(maskTouchedItem) return false;
            }
        }

        if(lg.isButton(target)) {
            if(lg.buttonSound) lg.playSound(lg.buttonSound);
            this._setButtonState(target, ButtonState.DOWN);
        }
        event.currentTarget = target;
        event.target = this._findRealTarget(target, pos) || target;
        //if currentTarget is cc.Layer or lg.MovieClip and hasn't touch any of it's child, then ignore!
        if((target instanceof cc.Layer || target instanceof lg.MovieClip) && event.target == target) {
            return false;
        }
        this._dispatch(target, touch, event, InputType.press);
//        cc.log("touch begin result: "+target.name+", "+target.assetID);
        return true;
    },
    handleTouchEnded:function(touch, event)
    {
        var target = event.getCurrentTarget();

        event.currentTarget = target;
        event.target = this._findRealTarget(target, touch.getLocation()) || target;

        this._dispatch(target, touch, event, InputType.up);
//        cc.log("touch end: "+this.name+", "+this.type+", "+this._itemTouched);
        var onTarget = lg.ifTouched(target, touch.getLocation());
        if(onTarget && (lg.isButton(target))){
            if(target.isSelectable())
            {
                if (!target.isSelected() || target.radioGroup){
                    if(!target.isSelected() && target.radioGroup){
                        var arr = this._radioButtons[target.radioGroup];
                        if(arr && arr.length > 1){
                            for(var i = 0; i < arr.length; i++){
                                if(arr[i] != target){
                                    arr[i].setState(ButtonState.UP);
                                }
                            }
                        }
                    }
                    target.setState(ButtonState.SELECTED);
                }else {
                    target.setState(ButtonState.UP);
                }
            }else{
                target.setState(ButtonState.UP);
            }
        }
        if(onTarget) this._dispatch(target, touch, event, InputType.click);
    },
    handleTouchMoved:function(touch, event)
    {
        var target = event.getCurrentTarget();
        if(lg.isButton(target)){
            if(lg.ifTouched(target, touch.getLocation())){
                this._setButtonState(target, ButtonState.DOWN);
            }else{
                this._setButtonState(target, ButtonState.UP);
            }
        }
//        cc.log("moving: "+target.clsName);
        this._dispatch(target, touch, event, InputType.move);
    },
    _createListener:function(target, swallow)
    {
        var self = this;
        listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: swallow,
            onTouchBegan:function(touch, event)
            {
                return self.handleTouchBegan(touch, event);
            },
            onTouchEnded:function(touch, event)
            {
                self.handleTouchEnded(touch, event);
            },
            onTouchMoved:function(touch, event)
            {
                self.handleTouchMoved(touch, event);
            },
            onTouchCancelled:function(touch, event){
                self.handleTouchEnded(touch, event);
            }
        })
        cc.eventManager.addListener(listener, target);
    },
    /**
     * Find the real target that clicked, the basic element in the targets...
     * */
    _findRealTarget:function(targets, pos)
    {
        if(!(targets instanceof Array)) targets = [targets];
        var target = null;
        var i = targets.length;
        while(i--){
            target = targets[i];
            if(this._ifTargetIgnore(target)) continue;
            if(target.children.length > 0){
                this._temp = this._findRealTarget(target.children, pos);
                if(this._temp) {
                    return this._temp;
                }
            }
            if(lg.ifTouched(target, pos)){
                return target;
            }
        }
        return null;
    },
    _ifTargetIgnore:function(target, touch)
    {
        if(target == null) return true;
        if(!target.running) return true;
        if(!this._ifTargetVisible(target)) return true;
        if(target.isMouseEnabled && target.isMouseEnabled() === false) return true;
        if(touch && !lg.ifTouched(target, touch.getLocation())) return true;
        return false;
    },
    _ifTargetVisible:function(target){
        while(target){
            if(!target.visible) return false;
            target = target.parent;
        }
        return true;
    },
    _setButtonState:function(button, state)
    {
        if(button.isSelectable() && button.isSelected())
        {
            if(state == ButtonState.UP) state = ButtonState.SELECTED;
            else state = "selected_"+state;
        }
        button.setState(state);
    },
    _dispatch:function(target, touch, event, type){
        var p = target;
        //if the child triggered some event, then its parent should also be informed
        while(p){
            this._dispatchOne(p, touch, event, type);
            p = p.parent;
        }
    },
    _dispatchOne:function(target, touch, event, type)
    {
        var calls = this._callbacks[target.__instanceId];
        if(!calls) return;
        var call = null;
        var i = calls.length;
        while(i--){
            call = calls[i];
            if(call.type == type) {
                event.currentTarget = target;
                call.func.apply(call.context, [touch, event]);
            }
        }
    }
});

lg.InputManager.create = function(){
    var im = new lg.InputManager();
    im.init();
    return im;
}
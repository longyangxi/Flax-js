/**
 * Created by long on 14-2-5.
 */
var lg = lg || {};

var InputType = {
    press:"onPress",
    click:"onClick",
    move:"onMouseMove"
};

lg.InputManager = cc.Layer.extend({
    checkMouseMove:true,
    enabled:true,
    _listener:null,
    _callbacks:{},
    _ignoreChildren:[],
    _itemTouched:null,
    _doTouched:false,
    _inTouching:false,
    _targets:[],
    _tempResult:null,

    /**
     * @param{cc.Node}target the target want to receive the mouse/touch/keyboard input
     * @param{function}function to call back, func(touch, target, itemTouched), the scope is the TARGET itself in the function
     * @param{string}event type as InputType said
     * @param{cc.Node}context the callback context of "THIS", if null, use target as the context
     * @param{Integer}priority the priority is bigger than the target will receive callback earlier
     * Note: if the target has _tilemap, the performance will be very good
     * Note: Pls call this in onEnter function and removeListener in onExit function
     * */
    addListener:function(target, func, type, context, priority)
    {
        if(target == null || func == null) {
            throw "Event target is null!"
        }
        type = (type == null) ? InputType.click : type;
        var arr = this._callbacks[type];
        if(arr == null){
            arr = [];
            this._callbacks[type] = arr;
        }
        arr.push({target:target,func:func, context:context || target});

        if(this._targets.indexOf(target) == -1) {
            this._targets.push(target);
            target.__input__priority = (priority === undefined) ? 0 : parseInt(priority);
        }
    },
    removeListener:function(target, func, type)
    {
        //remove all the callbacks for the target, if funcName == null
        var i = this._targets.indexOf(target);
        var exist = (i > -1);
        if(func == null && exist) {
            this._targets.splice(i, 1);
            delete target.__input__priority;
        }
        if(!exist) return;

        var arr = null;
        if(type != null){
            arr = this._callbacks[type];
            this._removeCallback(arr, target, func);
        }else{
            for(var t in InputType){
                arr = this._callbacks[InputType[t]];
                this._removeCallback(arr, target, func);
            }
        }
    },
    _removeCallback:function(calls, target, func)
    {
        if(calls == null) return;
        var i = -1;
        var call = null;
        while(++i < calls.length)
        {
            call = calls[i];
            if(call.target == target && (func == null || call.func == func)){
                calls.splice(i, 1);
                break;
            }
        }
    },
    reset:function()
    {
        this._targets = [];
        this._ignoreChildren = [];
        this._callbacks = {};
    },
    onEnter:function()
    {
        this._super();
        var self = this;

        this._listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
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
                self.handleTouchMoved(touch);
            }
        });
        cc.eventManager.addListener(this._listener, this);

//        var listener = cc.EventListener.create({
//            event: cc.EventListener.MOUSE,
//            onMouseDown: function(event) {
//                cc.log("onMouseDown");
//            },
//            onMouseMove: function(event) {
//                cc.log("mouse move: "+event.getLocationX());
//                self.handleTouchMoved(cc.p(event.getLocationX(), event.getLocationY()));
//            }
//        });
//        cc.eventManager.addListener(listener, this);
    },
    onExit:function()
    {
        this._super();
        cc.eventManager.removeListener(this._listener);
    },
    findTouchedItem:function(touch)
    {
        if(!this.enabled || !this.isVisible()) return null;
        //except the priority, zIndex doesn't need sorting, this may impact the performance when mouse moving
        //todo,if the targets are not in the same container, then the zIndex sort is not necessary
        this._targets.sort(this._sortTargets);
        return this._searchChildren(this._targets, touch);
    },
    _searchChildren:function(children, touch)
    {
        var child = null;
        var tileMap = null;
        var tiles = null;
        var pos = touch;
        if(touch instanceof cc.Touch) pos = touch.getLocation();
        var i = children.length;
        while(--i >= 0){
            child = children[i];
            if(this.ifTargetIgnore(child)) continue;
            if(child._children.length > 0){
                //if child is a tiled layer, then use the high performance searching
                tileMap = child._tileMap;
                if(tileMap){
                    //todo, maybe should convert the space coordinate
                    tiles = tileMap.getObjects1(pos.x, pos.y);
                    if(tiles.length) {
                        this._doTouched = true;
                        //the last child would be the toppest child in zOrder
                        return tiles[tiles.length - 1];
                    }
                }
                this._tempResult = this._searchChildren(child._children, touch);
                if(this._tempResult) {
                    this._doTouched = true;
                    return this._tempResult;
                }
            }
            if(lg.ifTouched(child, pos)){
                this._doTouched = true;
                return child;
            }
        }
        return null;
    },
    ifTargetIgnore:function(child)
    {
        if(child == null) return true;
        if(!child.isRunning()) return true;
        if(!child.isVisible()) return true;
        if(!child.isRunning()) return true;
        if(!child._tileMap && child["isMouseEnabled"] && child.isMouseEnabled() === false) return true;
        var i = -1;
        var ignoreName = null;
        while(++i < this._ignoreChildren.length)
        {
            ignoreName = this._ignoreChildren[i];
            if(child.name == ignoreName) return true;
        }
        return false;
    },
    handleTouchBegan:function(pTouch)
    {
        if (!this.enabled || !this.isVisible()) {
            return false;
        }
        this._inTouching = true;
        this._doTouched = false;
        this._itemTouched = this.findTouchedItem(pTouch);
        if(this._itemTouched){
            var btn = lg.findButton(this._itemTouched);
            if(btn) this._setButtonState(btn, ButtonState.DOWN);
        }
        this._dispatch(pTouch, InputType.press);
//        cc.log("touch begin result: "+this.name+", "+this.type+", "+this._doTouched);
        return this._doTouched;
    },
    handleTouchEnded:function(pTouch)
    {
        if(!this.enabled || !this.isVisible()) return;
        this._inTouching = false;
//        cc.log("touch end: "+this.name+", "+this.type+", "+this._itemTouched);
        if(this._itemTouched)
        {
            var btn = lg.findButton(this._itemTouched);
            if(btn) {
                if(btn.isSelectable())
                {
                    if (!btn.isSelected()) btn.setState(ButtonState.SELECTED);
                    else btn.setState(ButtonState.UP);
                }
                var newTouched = this.findTouchedItem(pTouch);
                var state = (lg.isChildOf(newTouched, btn)) ? ButtonState.OVER : ButtonState.UP;
                this._setButtonState(btn, state);
            }
        }
        this._dispatch(pTouch, InputType.click);
        this._itemTouched = null;
    },
    handleTouchMoved:function(touch)
    {
        if(!this.enabled || !this.isVisible()) return;
        if(!this.checkMouseMove) return;
        var touched = this.findTouchedItem(touch);
        if(touched != this._itemTouched) {
            if(this._itemTouched) {
                var btn = lg.findButton(this._itemTouched);
                if(btn){
                    var state = (btn.isSelectable() && btn.isSelected()) ? ButtonState.SELECTED : ButtonState.UP;
                    btn.setState(state);
                }
                this._itemTouched = null;
            }

            if(touched) {
                this._itemTouched = touched;
//                cc.log("moved: "+this._inTouching+", "+Types.isSimpleButton(this._itemTouched)+", "+touched.name);
                var btn = lg.findButton(this._itemTouched);
                if(btn){
                    var state = this._inTouching ? ButtonState.DOWN : ButtonState.OVER;
                    this._setButtonState(btn, state);
                }
            }
        }
        this._dispatch(touch, InputType.move);
    },
    handleToucheCanceled:function(touch, event)
    {
        this._inTouching = false;
        if(this._itemTouched)
        {
            var btn = lg.findButton(this._itemTouched);
            if(btn){
                var state = (btn.isSelectable() && btn.isSelected()) ? ButtonState.SELECTED : ButtonState.UP;
                btn.setState(state);
            }
            this._itemTouched = null;
        }
    },
    _dispatch:function(touch, type)
    {
        if(!this._itemTouched || (this._itemTouched["isMouseEnabled"] && this._itemTouched.isMouseEnabled() === false)) return;

        var calls = this._callbacks[type];
        var call = null;
        var target = null;
        if(calls){
            var i = calls.length;
            while(i--)
            {
                call = calls[i];
                target = call.target;
                if(target.isVisible() && target.isRunning()
                    && (target == this._itemTouched || lg.isChildOf(this._itemTouched, target)))
                {
                    call.func.apply(call.context, [touch, target, this._itemTouched]);
                }
            }
        }
    },
    _setButtonState:function(button, state)
    {
        if(button.isSelectable() && button.isSelected())
        {
            state = "selected_"+state;
        }
        button.setState(state);
    },
    /**
     * Sort the targets ascending according its zIndex firstly and the __input_priority secondly
     * */
    _sortTargets:function(target1, target2)
    {
        if(target1.zIndex == target2.zIndex)
        {
            return target1.__input__priority > target2.__input__priority ? 1 : -1;
        }else if(target1.zIndex > target2.zIndex)
        {
            return 1;
        }else {
            return -1;
        }
    }
});

lg.InputManager.create = function()
{
    var layer = new lg.InputManager();
    layer.init();
    layer.checkMouseMove = true;
    return layer;
};
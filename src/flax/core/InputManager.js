/**
 * Created by long on 14-2-5.
 */
var InputType = {
    press:"onPress",
    up:"onUp",//The touch position maybe not within the press target
    click:"onClick",
    move:"onMouseMove",//The touch position maybe not within the press target
    keyPress:"onKeyPress",
    keyUp:"onKeyUp"
};

flax.InputManager = cc.Node.extend({
    enabled:true,
    nullEnabled:false,
    inTouching:false,
    inDragging:false,
    justDragged:false,
    justDragDist:0,
    _masks:[],
    _callbacks:{},
    _keyboardCallbacks:{},
    _keyboardListener:null,
    _touchListeners:null,

    ctor:function()
    {
        cc.Node.prototype.ctor.call(this);
        this._masks = [];
        this.inTouching = false;
        this._callbacks = {};
        this._keyboardCallbacks = {};
        this._keyboardListener = null;
        this._touchListeners = {};
    },
    onEnter:function()
    {
        this._super();

        var self = this;

        //listen the mouse move event on PC
        if(!cc.sys.isMobile){
            var mouseListener = cc.EventListener.create({
                event: cc.EventListener.MOUSE,
                onMouseMove:function(event){
                    //event.getButton() == 0 means left mouse is in pressing
                    self.inDragging = event.getButton() == 0;
                    self.justDragged = self.inDragging;
                    if(self.inDragging) {
                        self.justDragDist += cc.pLength(event.getDelta());
                    }
                    //dispatch mouse hover event
                    if(!self.inDragging){
                        var evt = {target:self, currentTarget:self};
                        self._dispatchOne(self, event, evt, InputType.move);
                        //todo, dispatch for every single target
//                        self._dispatch(self, event, evt, InputType.move);
                    }
                    flax.mousePos = event.getLocation();
                }
            })
            cc.eventManager.addListener(mouseListener, this);
        }

        var touchListener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: false,
            onTouchBegan:function(touch, event)
            {
                flax.mousePos = touch.getLocation();
                if(!self.nullEnabled) return false;
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
                if(!self.nullEnabled) return;
                self.inDragging = false;
                self.inTouching = false;
                self._dispatchOne(self, touch, event, InputType.up);
                self._dispatchOne(self, touch, event, InputType.click);
            },
            onTouchMoved:function(touch, event)
            {
                flax.mousePos = touch.getLocation();
                if(!self.nullEnabled) return;
                self.inDragging = true;
                self.justDragged = true;
                self.justDragDist += cc.pLength(touch.getDelta());
                self._dispatchOne(self, touch, event, InputType.move);
            }
        });
        cc.eventManager.addListener(touchListener, this);
    },
    onExit:function(){
        this._super();
        this.removeAllTouchListeners();
        this.removeAllKeyboardListeners();
        this.removeAllMasks();
//        cc.eventManager.removeAllListeners();
    },
    /**
     * Add a Sprite node which will permitted the lower sprite to get touch event callback
     * */
    addMask:function(mask){
        if(this._masks.indexOf(mask) > -1) return;
        this._masks.push(mask);
        mask.__isInputMask = true;
    },
    removeMask:function(mask){
        var i = this._masks.indexOf(mask);
        if(i > -1) {
            this._masks.splice(i, 1);
            mask.__isInputMask = false;
        }
    },
    removeAllMasks:function(){
        var i = this._masks.length;
        while(i--){
            this._masks[i].__isInputMask = false;
            this._masks.splice(i, 1);
        }
        this._masks.length = 0;
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
     * @param{cc.Node} target the target want to receive the touch event, if target is null, then global event will be triggered
     *                       for keyboard event, the target will be the context if the real context is null
     * @param{function} func function to call back, for touch event: func(touch, event),{event.currentTarget, event.target}
     *                       for keyboard event: func(key){};
     * @param{string} type event type as InputType said
     * @param{cc.Node} context the callback context of "THIS", if null, use target as the context
     * Note: If the target is null, then listen the global event, in this instance, be sure to REMOVE the listener manually
     * on the sprite exit, otherwise, a new sprite will not receive the event again!
     * */
    addListener:function(target, func, type, context)
    {
        if(func == null) {
            throw "Event callback can not be null!"
        }
        var isKeyboardEvent = (type == InputType.keyPress || type == InputType.keyUp);
        if(target == null) {
            target = this;
            if(!isKeyboardEvent) {
                cc.log("Listening target is null, make sure you want to listen to the full screen input!");
            }
        }

        if(isKeyboardEvent) {
            var arr = this._keyboardCallbacks[type];
            if(arr == null) {
                arr = [];
                this._keyboardCallbacks[type] = arr;
            }
            //Make sure no duplicated listener
            var i = arr.length;
            while(i--){
                if(arr[i].func == func)  return;
            }
            arr.push({func:func, context:context || target});
            if(!this._keyboardListener) {
                this._createKeyboardListener();
            }
            return;
        }

        type = (type == null) ? InputType.click : type;
        if(target.__instanceId == null) target.__instanceId = ClassManager.getNewInstanceId();
        var arr = this._callbacks[target.__instanceId];
        if(arr == null){
            arr = [];
            this._callbacks[target.__instanceId] = arr;
            if(target != this) {
                var listener =  this._createListener(target, true);
                this._touchListeners[target.__instanceId] = listener;
            }
        }
        //Make sure no duplicated listener
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
        if(calls && (type == null || (type != InputType.keyPress && type != InputType.keyUp))) {
//            this.scheduleOnce(function(){
                var call = null;
                var i = calls.length;
                if(func || type) {
                    while(i--){
                        call = calls[i];
                        if((!type || call.type == type) && (!func || call.func == func)) {
                            calls.splice(i, 1);
                        }
                    }
                }
                if(calls.length == 0 || (!func && !type)){
                    delete this._callbacks[target.__instanceId];
                    var listener = this._touchListeners[target.__instanceId];
                    if(listener){
                        //todo,3.5 cause Invalid native object error!
//                        cc.eventManager.removeListener(listener);
                        delete this._touchListeners[target.__instanceId];
                    }
                }
//            },0.01);
        }
        if(func && (type == null || type == InputType.keyPress || type == InputType.keyUp)){
            if(type == null) {
                calls = this._keyboardCallbacks[InputType.keyPress] || [];
                calls = calls.concat(this._keyboardCallbacks[InputType.keyUp] || []);
            }else{
                calls = this._keyboardCallbacks[type];
            }
            if(calls && calls.length){
//                this.scheduleOnce(function(){
                    var call = null;
                    var i = calls.length;
                    while(i--){
                        call = calls[i];
                        if(call.func == func) calls.splice(i, 1);
                    }
//                },0.01);
            }
        }
    },
    removeAllTouchListeners:function()
    {
        this._callbacks = {};
        for(var id in this._touchListeners){
            var listener = this._touchListeners[id];
            cc.eventManager.removeListener(listener);
            delete this._touchListeners[id];

        }
    },
    removeAllKeyboardListeners:function()
    {
        this._keyboardCallbacks = {};
        if(this._keyboardListener) {
            //todo,3.5 cause Invalid native object error!
//            cc.eventManager.removeListener(this._keyboardListener);
            this._keyboardListener = null;
        }
    },
    handleTouchBegan:function(touch, event)
    {
        if (!this.enabled) return false;

        var target = event.getCurrentTarget();

        if(this._ifTargetIgnore(target, touch)) return false;
        var pos = touch.getLocation();

        //handle the masks
        if(!this._ifNotMasked(target, pos)) return false;

        event.currentTarget = target;
        event.target = this._findRealTarget(target, pos) || target;
        //if currentTarget is cc.Layer or flax.MovieClip and hasn't touch any of it's child, then ignore!
        if((target instanceof cc.Layer || target instanceof flax.MovieClip) && event.target == target) {
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
        var onTarget = flax.ifTouched(target, touch.getLocation());
        if(onTarget) this._dispatch(target, touch, event, InputType.click);
    },
    handleTouchMoved:function(touch, event)
    {
        var target = event.getCurrentTarget();
//        cc.log("moving: "+target.clsName);
        this._dispatch(target, touch, event, InputType.move);
    },
    _createListener:function(target, swallow)
    {
        var self = this;
        var listener = cc.EventListener.create({
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
        });
        cc.eventManager.addListener(listener, target);
        return listener;
    },
    _createKeyboardListener:function()
    {
        var self = this;
        this._keyboardListener = {
            event: cc.EventListener.KEYBOARD,
            onKeyPressed:  function(keyCode, event){
                self._dispatchKeyboardEvent(keyCode, InputType.keyPress);
            },
            onKeyReleased: function(keyCode, event){
                self._dispatchKeyboardEvent(keyCode, InputType.keyUp);
            }
        };
        cc.eventManager.addListener(this._keyboardListener, this);
    },
    _ifNotMasked:function(target, pos)
    {
        var i = this._masks.length;
        var mask = null;
        var maskTouchedItem = null;
        while(i--){
            mask = this._masks[i];
            if(target == mask || flax.isChildOf(target, mask) || flax.isChildOf(mask, target)) continue;
            if(this._ifTargetIgnore(mask)) continue;
            if(this._compareRealZIndex(mask, target) == 1){
                maskTouchedItem = this._findRealTarget(mask, pos);
                if(maskTouchedItem) return false;
            }
        }
        return true;
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
            if(flax.ifTouched(target, pos)){
                return target;
            }
        }
        return null;
    },
    _ifTargetIgnore:function(target, touch)
    {
        if(target == null) return true;
        if(!(target instanceof cc.Scene) && !target.parent) return true;
        if(!this._ifTargetVisible(target)) return true;
        if(target.isMouseEnabled && target.isMouseEnabled() === false) return true;
        if(touch && !flax.ifTouched(target, touch.getLocation())) return true;
        return false;
    },
    _ifTargetVisible:function(target){
        while(target){
            if(!target.visible) return false;
            target = target.parent;
        }
        return true;
    },
    _dispatch:function(target, touch, event, type){
        //If the target is button, then don't handle its parent's event
//        if(target.__isButton) {
//            this._dispatchOne(target, touch, event, type);
//            return;
//        }
        var p = target;
        //if the child triggered some event, then its parent should also be informed
        var ps = [];
        while(p){
            //Fixed the bug when addListener on the callback
            var calls = this._callbacks[p.__instanceId];
            if(calls && calls.length){
                ps.push(p);
            }
            p = p.parent;
        }
        for(var i = 0; i < ps.length; i++){
            p = ps[i];
            this._dispatchOne(p, touch, event, type);
        }
    },
    _dispatchOne:function(target, touch, event, type)
    {
        var calls = this._callbacks[target.__instanceId];
        if(!calls || !calls.length) return;
        event.currentTarget = target;
        event.inputType = type;
        var call = null;
        var dispatches = [];
        var i = calls.length;
        while(i--){
            call = calls[i];
            if(call.type == type) {
                dispatches.push(call);
            }
        }
        //handle object according by the time it addListener
        i = dispatches.length;
        while(i--){
            call = dispatches[i];
            call.func.apply(call.context, [touch, event]);
        }
    },
    _dispatchKeyboardEvent:function(keyCode, type)
    {
        var calls = this._keyboardCallbacks[type];
        if(!calls || !calls.length) return;
        var key = this._getNativeKeyName(keyCode);
        var call = null;
        var dispatches = [];
        var i = calls.length;
        while(i--){
            call = calls[i];
            dispatches.push(call);
        }
        //handle object according by the time it addListener
        i = dispatches.length;
        while(i--){
            call = dispatches[i];
            call.func.apply(call.context, [key]);
        }
    },
    _getNativeKeyName:function(keyCode) {
        var allCode = Object.getOwnPropertyNames(flax.KEY);
        var keyName = "";
        for(var x in allCode){
            if(flax.KEY[allCode[x]] == keyCode){
                keyName = allCode[x];
                break;
            }
        }
        return keyName;
    }
});
//Fixed bug in advanced mode compile when use cc.KEY
flax.KEY = {
    'none':0,

    // android
    'back':6,
    'menu':18,

    'backspace':8,
    'tab':9,

    'enter':13,

    'shift':16, //should use shiftkey instead
    'ctrl':17, //should use ctrlkey
    'alt':18, //should use altkey
    'pause':19,
    'capslock':20,

    'escape':27,
    'space':32,
    'pageup':33,
    'pagedown':34,
    'end':35,
    'home':36,
    'left':37,
    'up':38,
    'right':39,
    'down':40,
    'select':41,

    'insert':45,
    'Delete':46,
    '0':48,
    '1':49,
    '2':50,
    '3':51,
    '4':52,
    '5':53,
    '6':54,
    '7':55,
    '8':56,
    '9':57,
    'a':65,
    'b':66,
    'c':67,
    'd':68,
    'e':69,
    'f':70,
    'g':71,
    'h':72,
    'i':73,
    'j':74,
    'k':75,
    'l':76,
    'm':77,
    'n':78,
    'o':79,
    'p':80,
    'q':81,
    'r':82,
    's':83,
    't':84,
    'u':85,
    'v':86,
    'w':87,
    'x':88,
    'y':89,
    'z':90,
    //todo for advanced cimpile
    num0:96,
    num1:97,
    num2:98,
    num3:99,
    num4:100,
    num5:101,
    num6:102,
    num7:103,
    num8:104,
    num9:105,
    '*':106,
    '+':107,
    '-':109,
    'numdel':110,
    '/':111,
    f1:112, //f1-f12 dont work on ie
    f2:113,
    f3:114,
    f4:115,
    f5:116,
    f6:117,
    f7:118,
    f8:119,
    f9:120,
    f10:121,
    f11:122,
    f12:123,

    numlock:144,
    scrolllock:145,

    ';':186,
    semicolon:186,
    equal:187,
    '=':187,
    ',':188,
    comma:188,
    dash:189,
    '.':190,
    period:190,
    forwardslash:191,
    grave:192,
    '[':219,
    openbracket:219,
    backslash:220,
    ']':221,
    closebracket:221,
    quote:222,

    // gamepad controll
    dpadLeft:1000,
    dpadRight:1001,
    dpadUp:1003,
    dpadDown:1004,
    dpadCenter:1005
}
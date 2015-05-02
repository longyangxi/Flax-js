/**
 * Created by long on 14-4-25.
 */

var ButtonState = {
    UP:"up",
    OVER:"over",
    DOWN:"down",
    SELECTED:"selected",
    SELECTED_OVER:"selected_over",
    SELECTED_DOWN:"selected_down",
    DISABLED:"disabled"
};

MOUSE_DOWN_SCALE = 0.95;

flax._buttonDefine = {
    clickSound:null,//The sound will play when click
    group:null,//the button group it belongs to
    _playChildrenOnState:false,//If auto play children's animation when change state
    _state:null,
    _initScale:null,
    __isButton:true,

    onEnter:function(){
        this._super();
        this._initScale = {x: this.scaleX, y : this.scaleY};
        flax.inputManager.addListener(this, this._onPress, InputType.press);
        flax.inputManager.addListener(this, this._onClick, InputType.click);
        flax.inputManager.addListener(this, this._onMove, InputType.move);
    },
    onExit:function(){
        if(this.group){
            this.group.removeButton(this);
            this.group = null;
        }
        this._super();
    },
    onRecycle:function(){
        this._super();
        this._playChildrenOnState = false;
        this._state = null;
    },
    setState:function(state)
    {
        if(this._state == state) return;
        var oldSelected = this.isSelected();
        this._state = state;
        if(!this.gotoAndStop(this._state))
        {
            var optionState = this.isSelected() ? ButtonState.SELECTED : ButtonState.UP;
            if(!this.gotoAndStop(optionState)){
                //if there is only one frame, we auto implement the button down effect
                if(this.totalFrames == 1 && this._initScale){
                    if(this._state.indexOf("down") > -1) {
                        this.scaleX = this._initScale.x*MOUSE_DOWN_SCALE;
                        this.scaleY = this._initScale.y*MOUSE_DOWN_SCALE;
                    } else {
                        this.scaleX = this._initScale.x;
                        this.scaleY = this._initScale.y;
                    }
                }
                this.gotoAndStop(0);
            }
        }
        this._playOrPauseChildren();
        if(this.isSelected() && !oldSelected && this.group){
            this.group.updateButtons(this);
        }
        this.handleStateChange();
    },
    handleStateChange:function()
    {
        //to be override
    },
    getState:function()
    {
        return this._state;
    },
    isSelected:function()
    {
        return this._state && (this._state.indexOf("selected") == 0);
    },
    setSelected:function(value)
    {
        if(this.isSelected() == value || !this.isSelectable() || !this.isMouseEnabled()) return;
        this.setState(value ? ButtonState.SELECTED : ButtonState.UP);
    },
    isSelectable:function()
    {
        return this.hasLabel(ButtonState.SELECTED);
    },
    setMouseEnabled:function(enable)
    {
        if(this.isMouseEnabled() == enable) return false;
        this.setState(enable ? ButtonState.UP : ButtonState.DISABLED);
        return true;
    },
    isMouseEnabled:function()
    {
        return this._state != ButtonState.DISABLED;
    },
    setPlayChildrenOnState:function(play)
    {
        if(this._playChildrenOnState == play) return;
        this._playChildrenOnState = play;
        this._playOrPauseChildren();
    },
    getPlayChildrenOnState:function()
    {
        return this._playChildrenOnState;
    },
    _onPress:function(touch, event)
    {
        var sound = this.clickSound || flax.buttonSound;
        if(sound) flax.playSound(sound);
        this._toSetState(ButtonState.DOWN);
    },
    _onClick:function(touch, event)
    {
        if(this.isSelectable())
        {
            if (!this.isSelected() || this.group){
                this.setState(ButtonState.SELECTED);
            }else {
                this.setState(ButtonState.UP);
            }
        }else{
            this.setState(ButtonState.UP);
        }
    },
    _onMove:function(touch, event)
    {
        if(flax.ifTouched(this, touch.getLocation())){
            this._toSetState(ButtonState.DOWN);
        }else{
            this._toSetState(ButtonState.UP);
        }
    },
    _toSetState:function(state)
    {
        if(this.isSelectable() && this.isSelected())
        {
            if(state == ButtonState.UP) state = ButtonState.SELECTED;
            else state = "selected_"+state;
        }
        this.setState(state);
    },
    /**
     * Auto play the children's animation on new state if _playChildrenOnState = true
     * */
    _playOrPauseChildren:function()
    {
        var i = this.childrenCount;
        while(i--){
            var child = this.children[i];
            if(!flax.isFlaxSprite(child)) continue;
            if(this._playChildrenOnState) {
                child.autoPlayChildren = true;
                child.play();
            }else{
                child.autoPlayChildren = false;
                child.stop();
            }
        }
    }
};

flax.SimpleButton = flax.Animator.extend(flax._buttonDefine);
flax.SimpleButton.create = function(assetsFile, assetID)
{
    var btn = new flax.SimpleButton(assetsFile, assetID);
    btn.clsName = "flax.SimpleButton";
    btn.setState(ButtonState.UP);
    return btn;
};

//Avoid to advanced compile mode
window['flax']['SimpleButton'] = flax.SimpleButton;

var _p = flax.SimpleButton.prototype;
/** @expose */
_p.state;
cc.defineGetterSetter(_p, "state", _p.getState, _p.setState);
/** @expose */
_p.playChildrenOnState;
cc.defineGetterSetter(_p, "playChildrenOnState", _p.getPlayChildrenOnState, _p.setPlayChildrenOnState);
/** @expose */
_p.selected;
cc.defineGetterSetter(_p, "selected", _p.isSelected, _p.setSelected);

flax.Button = flax.MovieClip.extend(flax._buttonDefine);
flax.Button.create = function(assetsFile, assetID)
{
    var btn = new flax.Button(assetsFile, assetID);
    btn.clsName = "flax.Button";
    btn.setState(ButtonState.UP);
    return btn;
};

//Avoid to advanced compile mode
window['flax']['Button'] = flax.Button;

_p = flax.Button.prototype;
/** @expose */
_p.state;
cc.defineGetterSetter(_p, "state", _p.getState, _p.setState);
/** @expose */
_p.playChildrenOnState;
cc.defineGetterSetter(_p, "playChildrenOnState", _p.getPlayChildrenOnState, _p.setPlayChildrenOnState);
/** @expose */
_p.selected;
cc.defineGetterSetter(_p, "selected", _p.isSelected, _p.setSelected);

flax.ButtonGroup = cc.Class.extend({
    buttons:null,
    selectedButton:null,
    onSelected:null,
    ctor:function(name)
    {
        this.buttons = [];
        this.onSelected = new signals.Signal();
    },
    addButton:function(buttons)
    {
        if(!(buttons instanceof  Array)) {
            buttons = Array.prototype.slice.call(arguments);
        }
        for(var i = 0; i < buttons.length; i++){
            var btn = buttons[i];
            if(!flax.isButton(btn)) continue;
            if(this.buttons.indexOf(btn) > -1) continue;
            this.buttons.push(btn);
            btn.group = this;
        }
    },
    removeButton:function(button)
    {
        var i = this.buttons.indexOf(button);
        if(i > -1){
            this.buttons.splice(i, 1);
            button.group = null;
            if(this.selectedButton == button){
                this.selectedButton = this.buttons[0];
                if(this.selectedButton) this.selectedButton.setState(ButtonState.SELECTED);
            }
        }
        if(this.buttons.length == 0){
            this.onSelected.removeAll();
            this.onSelected = null;
        }
    },
    updateButtons:function(newSelected)
    {
        for(var i = 0; i < this.buttons.length; i++){
            var btn = this.buttons[i];
            if(btn != newSelected){
               btn.setState(ButtonState.UP);
            }
        }
        this.selectedButton = newSelected;
        this.onSelected.dispatch(newSelected);
    }
});
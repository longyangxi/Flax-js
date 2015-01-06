/**
 * Created by long on 14-4-25.
 */
var flax = flax || {};

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

flax._radioButtons = {};

flax._buttonDefine = {
    clickSound:null,//The sound will play when click
    _radioGroup:"",//All the button with the same _radioGroup will only have only one button selected!
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
        this._removeRadioGroup();
        this._super();
    },
    setState:function(state)
    {
        if(this._state == state) return;
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
        //auto play the children's animation on new state
        var i = this.childrenCount;
        while(i--){
            var child = this.children[i];
            if(child.play) child.play();
        }
    },
    getState:function()
    {
        return this._state;
    },
    setRadioGroup:function(radioGroup)
    {
        if(!radioGroup || radioGroup == this._radioGroup) return;
        if(this._radioGroup) {
            cc.log("Button's radioGroup could be set only once!");
            return;
        }
        this._radioGroup = radioGroup;
        if(flax._radioButtons[this._radioGroup] == null) flax._radioButtons[this._radioGroup] = [];
        flax._radioButtons[this._radioGroup].push(this);
    },
    getRadioGroup:function()
    {
        return this._radioGroup;
    },
    isSelected:function()
    {
        return this._state == ButtonState.SELECTED || this._state == ButtonState.SELECTED_OVER || this._state == ButtonState.SELECTED_DOWN;
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
    _removeRadioGroup:function()
    {
        if(this._radioGroup){
            var arr = flax._radioButtons[this._radioGroup];
            if(arr == null) return;
            var i = arr.indexOf(this);
            if(i > -1) arr.splice(i, 1);
        }
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
            if (!this.isSelected() || this._radioGroup){
                if(!this.isSelected() && this._radioGroup){
                    var arr = flax._radioButtons[this._radioGroup];
                    if(arr && arr.length > 1){
                        for(var i = 0; i < arr.length; i++){
                            if(arr[i] != this){
                                arr[i].setState(ButtonState.UP);
                            }
                        }
                    }
                }
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
    }
}

flax.SimpleButton = flax.Animator.extend(flax._buttonDefine);
flax.SimpleButton.create = function(assetsFile, assetID)
{
    var btn = new flax.SimpleButton(assetsFile, assetID);
    btn.clsName = "flax.SimpleButton";
    btn.setState(ButtonState.UP);
    return btn;
};

window._p = flax.SimpleButton.prototype;
/** @expose */
_p.state;
cc.defineGetterSetter(_p, "state", _p.getState, _p.setState);
/** @expose */
_p.radioGroup;
cc.defineGetterSetter(_p, "radioGroup", _p.getRadioGroup, _p.setRadioGroup);
delete window._p;

flax.Button = flax.MovieClip.extend(flax._buttonDefine);
flax.Button.create = function(assetsFile, assetID)
{
    var btn = new flax.Button(assetsFile, assetID);
    btn.clsName = "flax.Button";
    btn.setState(ButtonState.UP);
    return btn;
};
flax.Button.reset = function()
{
    flax._radioButtons = {};
}

window._p = flax.Button.prototype;
/** @expose */
_p.state;
cc.defineGetterSetter(_p, "state", _p.getState, _p.setState);
/** @expose */
_p.radioGroup;
cc.defineGetterSetter(_p, "radioGroup", _p.getRadioGroup, _p.setRadioGroup);
delete window._p;
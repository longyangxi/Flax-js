/**
 * Created by long on 14-4-25.
 */
var lg = lg || {};

var ButtonState = {
    UP:"up",
    OVER:"over",
    DOWN:"down",
    SELECTED:"selected",
    SELECTED_OVER:"selected_over",
    SELECTED_DOWN:"selected_down",
    DISABLED:"disabled"
};

lg._buttonDefine = {
    radioGroup:"",//All the button with the same radioGroup will only have only one button selected!
    _state:null,
    _initScale:null,

    onEnter:function(){
        this._super();
        this._initScale = {x: this.scaleX, y : this.scaleY};
    },
    onExit:function(){
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
                        this.scaleX = this._initScale.x*0.95;
                        this.scaleY = this._initScale.y*0.95;
                    } else {
                        this.scaleX = this._initScale.x;
                        this.scaleY = this._initScale.y;
                    }
                }
                this.gotoAndStop(0);
            }
        }
    },
    getState:function()
    {
        return this._state;
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
    }
}

lg.SimpleButton = lg.Animator.extend(lg._buttonDefine);
lg.SimpleButton.create = function(assetsFile, assetID)
{
    var btn = new lg.SimpleButton(assetsFile, assetID);
    btn.clsName = "lg.SimpleButton";
    btn.setState(ButtonState.UP);
    return btn;
};

lg.Button = lg.MovieClip.extend(lg._buttonDefine);
lg.Button.create = function(assetsFile, assetID)
{
    var btn = new lg.Button(assetsFile, assetID);
    btn.clsName = "lg.Button";
    btn.setState(ButtonState.UP);
    return btn;
};

lg.isButton = function(sprite){
    return sprite instanceof lg.SimpleButton || sprite instanceof lg.Button;
}
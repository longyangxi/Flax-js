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
    name:null,
    _state:null,

    setState:function(state)
    {
        if(this._state == ButtonState.DISABLED) return;
        if(this._state == state) return;
        this._state = state;
        if(!this.gotoAndStop(this._state))
        {
            var optionState = this.isSelected() ? ButtonState.SELECTED : ButtonState.UP;
            if(!this.gotoAndStop(optionState)){
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
        if(this.isMouseEnabled() == enable) return;
        this.setState(enable ? ButtonState.UP : ButtonState.DISABLED);
    },
    isMouseEnabled:function()
    {
        return this._state != ButtonState.DISABLED;
    }
}

lg.Button = lg.MovieClip.extend(lg._buttonDefine);
lg.Button.create = function(plistFile, assetID)
{
    var btn = new lg.Button(plistFile, assetID);
    btn.clsName = "lg.Button";
    btn.setState(ButtonState.UP);
    return btn;
};

lg.SimpleButton = lg.Animator.extend(lg._buttonDefine);
lg.SimpleButton.create = function(plistFile, assetID)
{
    var btn = new lg.SimpleButton(plistFile, assetID);
    btn.clsName = "lg.SimpleButton";
    btn.setState(ButtonState.UP);
    return btn;
};
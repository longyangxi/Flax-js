/**
 * Created by long on 14-2-2.
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

lg.SimpleButton = lg.Animator.extend({
    name:null,
    _state:null,

    setState:function(state)
    {
        if(this._state == ButtonState.DISABLED) return;
        if(this._state == state) return;
        this._state = state;
        this.enabled = this._state != ButtonState.DISABLED;
        if(!this.gotoAndStop1(this._state))
        {
            var optionState = this.isSelected() ? ButtonState.SELECTED : ButtonState.UP;
            if(!this.gotoAndStop1(optionState)){
                this.gotoAndStop(1);
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
});
lg.SimpleButton.create = function(plistFile, assetID)
{
    var btn = new lg.SimpleButton();
    btn.init();
    btn.setPlist(plistFile, assetID);
    btn.setState(ButtonState.UP);
    return btn;
};
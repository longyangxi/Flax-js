/**
 * Created by long on 15-5-7.
 */

flax._soundButton = {
    onEnter:function()
    {
        this._super();
        this.setState(flax.getSoundEnabled() ? ButtonState.UP : ButtonState.SELECTED);
    },
    _onClick:function(touch, event)
    {
        this._super(touch, event);
        flax.setSoundEnabled(!this.isSelected());
    }
}

flax.SimpleSoundButton = flax.SimpleButton.extend(flax._soundButton);

flax.SoundButton = flax.Button.extend(flax._soundButton);
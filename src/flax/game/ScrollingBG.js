/**
 * Created by long on 14-2-27.
 */

flax.ScrollingBG = cc.Node.extend({
    name:null,
    source:null,
    assetID:null,
    bg0:null,
    bg1:null,
    _isTiled:null,
    _scrolling:false,
    _paused:false,
    _speedX:0,
    _speedY:0,
    _d:1,
    _size:null,
    _x0:0,
    _y0:0,
    ctor:function(source, assetID, isTiled)
    {
        this._super();
        this.source = source;
        this.assetID = assetID;
        this._isTiled = isTiled;
        if(this.source == null){
            cc.log("Please give a source!");
            return false;
        }
        //If it's a custom display
        if(this.assetID != null){
            if(this._isTiled !== true){
                this.bg0 = flax.assetsManager.createDisplay(this.source, this.assetID);
                this.bg1 = flax.assetsManager.createDisplay(this.source, this.assetID);
            }else{
                this.bg0 = flax.TiledImage.create(this.source, this.assetID);
                this.bg1 = flax.TiledImage.create(this.source, this.assetID);
            }
        }else if(this.source){
            //if it's a FlaxSprite
            if(flax.isFlaxDisplay(this.source)){
                if(this.source.parent) this.source.parent.addChild(this, this.source.zIndex);
                this.name = this.source.name;
                if(this.parent) this.parent[this.name] = this;
                this.setPosition(this.source.getPosition());
                this.bg0 = flax.assetsManager.cloneDisplay(this.source);
                this.bg1 = flax.assetsManager.cloneDisplay(this.source);
                this.source.destroy();
            }
            //If it's a image
            else if(flax.isImageFile(this.source)){
                this.bg0 = cc.Sprite.create(this.source);
                this.bg1 = cc.Sprite.create(this.source);
            }else {
                cc.log("Not support source type!");
                return false;
            }
        }else{
            throw "Arguments is not valid!"
        }
        this.bg0.setAnchorPoint(0, 0);
        this.bg1.setAnchorPoint(0, 0);
        this.addChild(this.bg0);
        this.addChild(this.bg1);
        this._size = this.bg0.getContentSize();
        this.setContentSize(this._size);
    },
    reset:function()
    {
        this._paused = false;
        if(!this._scrolling) return;
        this._scrolling = false;
        this._speedX = this._speedY = 0;
        this.bg0.setPosition(this._x0, this._y0);
        this.bg1.setPosition(this._x0, this._y0);
        this.unscheduleUpdate();
    },
    startXScroll:function(speed)
    {
        if(speed == 0) return;
        if(this._scrolling) return;
        this._scrolling = true;
        this._speedX = speed;
        this._speedY = 0;
        this._d = (this._speedX > 0) ? 1: -1;
        this._resetScroll();
        this.scheduleUpdate();
    },
    startYScroll:function(speed)
    {
        if(speed == 0) return;
        if(this._scrolling) return;
        this._scrolling = true;
        this._speedY = speed;
        this._speedX = 0;
        this._d = (this._speedY > 0) ? 1: -1;
        this._resetScroll();
        this.scheduleUpdate();
    },
    pauseScroll:function()
    {
        if(!this._scrolling) return;
        if(this._paused) return;
        this._paused = true;
        this.unscheduleUpdate();
    },
    resumeScroll:function()
    {
        if(!this._scrolling) return;
        if(!this._paused) return;
        this._paused = false;
        this.scheduleUpdate();
    },
    _resetScroll:function()
    {
        this.bg0.setPosition(this._x0, this._y0);
        (this._speedX != 0) ? this.bg1.x = -this._d*(this._size.width - 1) : this.bg1.y = -this._d*(this._size.height - 1);
    },
    update:function(delta)
    {
        if(this._size.width*this._size.height == 0) {
            this._size = this.bg0.getContentSize();
            if(this._size.width*this._size.height != 0){
                this.setContentSize(this._size);
                this._resetScroll();
            }
            return;
        }
        var needReset = false;
        if(this._speedX != 0){
            var dx = this._speedX*delta;
            this.bg0.x += dx;
            this.bg1.x += dx;
            var dist = this._size.width - this.bg0.x*this._d;
            if(dist <= 0){
                this.bg0.x += this._d*dist;
                this.bg1.x += this._d*dist;
                needReset = true;
            }
        }else if(this._speedY != 0){
            var dy = this._speedY*delta;
            this.bg0.y += dy;
            this.bg1.y += dy;
            var dist = this._size.height - this.bg0.y*this._d;
            if(dist <= 0){
                this.bg0.y += this._d*dist;
                this.bg1.y += this._d*dist;
                needReset = true;
            }
        }
        if(needReset){
            var temp = this.bg0;
            this.bg0 = this.bg1;
            this.bg1 = temp;
            this._resetScroll();
        }
    },
    getRect:function(){
        if(this._size.width*this._size.height == 0) {
            this._size = this.bg0.getContentSize();
            if(this._size.width*this._size.height != 0){
                this.setContentSize(this._size);
            }
        }
        return cc.rect(0, 0, this._size.width, this._size.height);
    }
});

flax.ScrollingBG.create = function(source, assetID, isTiled)
{
    var bg = new flax.ScrollingBG(source, assetID, isTiled);
    return bg;
};
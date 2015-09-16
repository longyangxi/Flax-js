/**
 * Created by long on 14-2-27.
 */

flax.ScrollingBG = cc.Node.extend({
    name:null,
    onScrolledOver:null,
    _loop:true,
    _bg0:null,
    _bg1:null,
    _sources:null,
    _scrollingIndex:0,
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
        this._sources = [];
        this.onScrolledOver = new signals.Signal();
        if(source){
            this.addSource(source, assetID, isTiled);
        }
    },
    onExit:function()
    {
        this._super();
        this.onScrolledOver.removeAll();
    },
    addSource:function(source, assetID, isTile)
    {
        this._sources.push({source: source, assetID: assetID, isTile:isTile});
        if(this._bg0 == null){
            this._bg0 = this._createNextBG();
        }
    },
    _createNextBG:function()
    {
        if(this._scrollingIndex > this._sources.length - 1){
            this._scrollingIndex = 0;
        }
        var bgData = this._sources[this._scrollingIndex];
        this._scrollingIndex ++;

        var bg = null;
        //If it's a custom display
        if(bgData.assetID != null){
            if(bgData.isTile !== true){
                bg = flax.assetsManager.createDisplay(bgData.source, bgData.assetID, null, true);
            }else{
                bg = new flax.TiledImage(bgData.source, bgData.assetID);
            }
        }else if(bgData.source){
            //if it's a FlaxSprite
            if(flax.isFlaxDisplay(bgData.source)){
                //todo, JSB Invalid native object error!
                if(bgData.source.parent) bgData.source.parent.addChild(this, bgData.source.zIndex);
                this.name = bgData.source.name;
                if(this.parent) this.parent[this.name] = this;
                this.setPosition(bgData.source.getPosition());
                bg = flax.assetsManager.cloneDisplay(bgData.source);
                bgData.source.removeFromParent();
            }
            //If it's a image
            else if(flax.isImageFile(bgData.source)){
                bg = new cc.Sprite(bgData.source);
            }else {
                throw "Not supported source type!";
            }
        }else{
            throw "Arguments is not valid!"
        }
        bg.setAnchorPoint(0, 0);
        this.addChild(bg);

        if(this._size == null){
            this._size = bg.getContentSize();
            this.setContentSize(this._size);
        }

        return bg;
    },
    reset:function()
    {
        this._paused = false;
        if(!this._scrolling) return;
        this._scrolling = false;
        this._speedX = this._speedY = 0;

        if(this._bg0.destroy) this._bg0.destroy();
        else this._bg0.removeFromParent();
        this._bg0 = null;

        if(this._bg1.destroy) this._bg1.destroy();
        else this._bg1.removeFromParent();
        this._bg1 = null;

        this._scrollingIndex = 0;
        if(this._bg0 == null) this._bg0 = this._createNextBG();
        this._bg0.setPosition(this._x0, this._y0);
        this.unscheduleUpdate();
    },
    startXScroll:function(speed, loop)
    {
        if(speed == 0 || this._bg0 == null) return;
        if(this._scrolling) return;
        this._scrolling = true;
        this._loop = loop !== false;
        this._speedX = speed;
        this._speedY = 0;
        this._d = (this._speedX > 0) ? 1: -1;
        this._resetScroll();
        this.scheduleUpdate();
    },
    startYScroll:function(speed, loop)
    {
        if(speed == 0 || this._bg0 == null) return;
        if(this._scrolling) return;
        this._scrolling = true;
        this._loop = loop !== false;
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
        this._bg0.setPosition(this._x0, this._y0);
        if(this._bg1 == null) this._bg1 = this._createNextBG();
        (this._speedX != 0) ? this._bg1.x = -this._d*(this._size.width - 1) : this._bg1.y = -this._d*(this._size.height - 1);
    },
    update:function(delta)
    {
        if(this._size.width*this._size.height == 0) {
            this._size = this._bg0.getContentSize();
            if(this._size.width*this._size.height != 0){
                this.setContentSize(this._size);
                this._resetScroll();
            }
            return;
        }
        var needReset = false;
        if(this._speedX != 0){
            var dx = this._speedX*delta;
            this._bg0.x += dx;
            this._bg1.x += dx;
            var dist = this._size.width - this._bg0.x*this._d;
            if(dist <= 0){
                this._bg0.x += this._d*dist;
                this._bg1.x += this._d*dist;
                needReset = true;
            }
        }else if(this._speedY != 0){
            var dy = this._speedY*delta;
            this._bg0.y += dy;
            this._bg1.y += dy;
            var dist = this._size.height - this._bg0.y*this._d;
            if(dist <= 0){
                this._bg0.y += this._d*dist;
                this._bg1.y += this._d*dist;
                needReset = true;
            }
        }
        if(needReset){
            if(!this._loop && this._scrollingIndex > this._sources.length - 1){
                this.onScrolledOver.dispatch();
                this.pauseScroll();
                return;
            }
            //todo, performance improve by reuse the bg?
            if(this._bg0.destroy) this._bg0.destroy();
            else this._bg0.removeFromParent();
            this._bg0 = this._bg1;
            this._bg1 = this._createNextBG();
            this._resetScroll();
        }
    },
    getRect:function(){
        if(this._size.width*this._size.height == 0) {
            this._size = this._bg0.getContentSize();
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
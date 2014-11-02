/**
 * Created by long on 14-2-14.
 */

var flax = flax || {};

flax.FrameData = cc.Class.extend({
    x:0,
    y:0,
    rotation:0,
    scaleX:1,
    scaleY:1,
    opacity:255,

    ctor:function(data){
        data = data.split(",");
        this.x = parseFloat(data[0]);
        this.y = parseFloat(data[1]);
        this.rotation = parseFloat(data[2]);
        this.scaleX = parseFloat(data[3]);
        this.scaleY = parseFloat(data[4]);
        this.opacity = Math.round(255*parseFloat(data[5]));
    }
});

flax.MovieClip = flax.FlaxSprite.extend({
    autoPlayChildren:false,
    noOpacity:true,
    _namedChildren:null,
    _theRect:null,
    __isMovieClip:true,

    replaceChild:function(childName, assetID)
    {
        var childDefine = this.define.children[childName];
        if(childDefine == null){
            cc.log("There is no child with named: "+childName +"  in MovieClip: "+this.assetID);
            return;
        }
        var child = this._namedChildren[childName];
        if(child)
        {
            child.setSource(this.assetsFile, assetID);
        }else{
            childDefine["class"] = assetID;
        }
    },
    onNewSheet:function()
    {
        for(var childName in this._namedChildren){
            this._namedChildren[childName].destroy();
            delete  this[childName];
        }
        this._namedChildren = {};
        this.totalFrames = this.define.totalFrames;
        this._theRect = cc.rect(this.define.rect);
        this.setContentSize(this._theRect.width, this._theRect.height);
    },
    onEnter:function()
    {
        this._super();
        this.setContentSize(this._theRect.width, this._theRect.height);
        //MovieClip is just a container here, so we don't need a texture for it, and opacity = 0 will not impact the children
        this.opacity = 0;
    },
    doRenderFrame:function(frame)
    {
        var child;
        var childDefine;
        var frameData;
        for(var childName in this.define.children)
        {
            childDefine = this.define.children[childName];
            frameData = childDefine.frames[frame];
            child = this._namedChildren[childName];
            if(frameData == null) {
                if(child) child.visible = false;
            }else {
                var offsetX = 0;
                var offsetY = 0;
                if(child == null){
                    //hadle the label text
                    if(childDefine.text != null){
                        child = flax.Label.create(this.assetsFile, childDefine);
                        if(child.__isTTF){
                            offsetX = childDefine.width/2;
                            offsetY = -childDefine.height/2;
                        }
                    }else{
                        child = flax.assetsManager.createDisplay(this.assetsFile, childDefine["class"], null, true);
                    }
                    child.name = childName;
                    this._namedChildren[childName] = child;
                    if(this.autoPlayChildren) {
                        this.playing ? child.gotoAndPlay(0) : child.gotoAndStop(0);
                    }
                    this[childName] = child;
                    this.onNewChild(child);
                }
                var x = frameData.x + offsetX;
                var y = frameData.y + offsetY;

                if(x != child.x) child.x = x;
                if(y != child.y) child.y = y;
                if(frameData.rotation != child.rotation) child.rotation = frameData.rotation;
                if(frameData.scaleX != child.scaleX) child.scaleX = frameData.scaleX;
                if(frameData.scaleY != child.scaleY) child.scaleY = frameData.scaleY;
                //todo, movieclip adn progressbar can not set opacity on canvas render mode..., maybe we could override the setOpacity function, but some difficult
                if(child.noOpacity !== true && child.setOpacity && frameData.opacity != child.opacity) child.opacity = frameData.opacity;
                child.visible = true;
                child.autoPlayChildren = this.autoPlayChildren;
                if(this.autoPlayChildren) {
                    this.playing ? child.play() : child.stop();
                }
                if(child.parent != this){
                    child.removeFromParent(false);
                    this.addChild(child, childDefine.zIndex);
                }else if(child.zIndex != childDefine.zIndex){
                    child.zIndex = childDefine.zIndex;
                }
            }
        }
    },
    stop:function()
    {
        this._super();
        if(this.autoPlayChildren) {
            for(var key in this._namedChildren) {
                var child = this._namedChildren[key];
                if(child instanceof flax.FlaxSprite) {
                    child.stop();
                }
            }
        }
    },
    play:function()
    {
        this._super();
        if(this.autoPlayChildren) {
            for(var key in this._namedChildren) {
                var child = this._namedChildren[key];
                if(child instanceof flax.FlaxSprite) {
                    child.play();
                }
            }
        }
    },
    onNewChild:function(child)
    {

    },
    getDefine:function()
    {
        var define = flax.assetsManager.getMc(this.assetsFile, this.assetID);
        return define;
    },
    getChildOfName:function(name, nest)
    {
        if(nest === undefined) nest = true;
        var child = this._namedChildren[name];
        if(child) return child;
        if(!nest) return null;
        for(var key in this._namedChildren) {
            child = this._namedChildren[key];
            if(child.getChildOfName) {
                child = child.getChildOfName(name, nest);
                if(child) return child;
            }
        }
    },
    getChildByAssetID:function(id)
    {
        var child = null;
        for(var key in this._namedChildren) {
            child = this._namedChildren[key];
            if(child.assetID == id){
                return child;
            }
        }
        return null;
    },
    getLabelText:function(labelName, ifNest)
    {
        var label = this.getChildOfName(labelName, ifNest === undefined ? true : ifNest);
        if(label && (label instanceof flax.Label)) return label.getString();
        return null;
    },
    setLabelText:function(labelName, text, ifNest)
    {
        var label = this.getChildOfName(labelName, ifNest === undefined ? true : ifNest);
        if(label && (label instanceof flax.Label)) {
            label.setString(text);
            return label;
        }
        return null;
    },
    addChildrenPhysics:function(name, type, density, friction,restitution, isSensor, fixedRotation, catBits, maskBits, bullet){
        var child = null;
        for(var key in this._namedChildren) {
            child = this._namedChildren[key];
            child.addPhysics(name, type, density, friction, restitution, isSensor, fixedRotation, catBits, maskBits, bullet);
        }
    },
    removeChildrenPhysics:function(name){
        var child = null;
        for(var key in this._namedChildren) {
            child = this._namedChildren[key];
            child.removePhysics(name);
        }
    },
    onRecycle:function()
    {
        this._super();
        this.autoPlayChildren = false;
        for(var key in this._namedChildren) {
            var child = this._namedChildren[key];
            if(child instanceof flax.FlaxSprite) {
                child.gotoAndStop(0);
            }
        }

    }
});
flax.MovieClip.create = function(assetsFile, assetID)
{
    var mc = new flax.MovieClip(assetsFile, assetID);
    mc.clsName = "flax.MovieClip";
    return mc;
};
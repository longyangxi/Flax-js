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
    zIndex:-1,

    ctor:function(data){
        data = data.split(",");
        this.x = parseFloat(data[0]);
        this.y = parseFloat(data[1]);
        this.rotation = parseFloat(data[2]);
        this.scaleX = parseFloat(data[3]);
        this.scaleY = parseFloat(data[4]);
        this.opacity = Math.round(255*parseFloat(data[5]));
        if(data.length > 6) this.zIndex = parseInt(data[6]);
    }
});

flax.MovieClip = flax.FlaxSprite.extend({
    clsName:"flax.MovieClip",
    autoPlayChildren:false,//auto play children when play
    sameFpsForChildren:true,//all children use the same fps with this
    _namedChildren:null,
    _theRect:null,
    _frameDatas:null,
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
    onNewSource:function()
    {
        for(var childName in this._namedChildren){
            this._namedChildren[childName].destroy();
            delete  this[childName];
        }
        this._namedChildren = {};
        this.totalFrames = this.define.totalFrames;
        this._theRect = this._strToRect(this.define.rect);
        this.setContentSize(this._theRect.width, this._theRect.height);
        this._initFrameDatas();
    },
    _initFrameDatas:function()
    {
        this._frameDatas = {};
        for(var childName in this.define.children)
        {
            var frames = [];
            var fs = this.define.children[childName].frames;
            var i = -1;
            while(++i < fs.length){
                if(fs[i]) frames[i] = new flax.FrameData(fs[i]);
            }
            this._frameDatas[childName] = frames;
        }
    },
    onEnter:function()
    {
        this._super();
        this.setContentSize(this._theRect.width, this._theRect.height);
    },
    doRenderFrame:function(frame)
    {
        var child;
        var childDefine;
        var frameData;
        for(var childName in this.define.children)
        {
            childDefine = this.define.children[childName];
            frameData = this._frameDatas[childName][frame];
            child = this._namedChildren[childName];
            if(frameData) {
                var offsetX = 0;
                var offsetY = 0;
                if(child == null){
                    //hadle the label text
                    if(childDefine.text != null){
                        child = flax.Label.create(this.assetsFile, childDefine);
                        if(child instanceof cc.LabelTTF){
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
                if(child.setOpacity && frameData.opacity != child.opacity) child.opacity = frameData.opacity;
                //all children use the same fps with this
                if(this.sameFpsForChildren) child.fps = this.fps;
                child.visible = true;
                child.autoPlayChildren = this.autoPlayChildren;
                if(this.autoPlayChildren) {
                    this.playing ? child.play() : child.stop();
                }
                //To fix the zIndex bug when use the old version tool
                var zIndex = (frameData.zIndex == -1) ? childDefine.zIndex : frameData.zIndex;
                if(child.parent != this){
                    child.removeFromParent(false);
                    this.addChild(child, zIndex);
                }else if(child.zIndex != zIndex){
                    child.zIndex = zIndex;
                }
            }else if(child) {
                if(child.destroy) child.destroy();
                else child.removeFromParent(true);
                delete this._namedChildren[childName];
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
        if(define == null) throw "There is no MovieClip named: " + this.assetID + " in assets: " + this.assetsFile+", make sure you are a pro user!";
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
    setFPS:function(f)
    {
        if(this._fps == f)  return;
        this._fps = f;
        this.updateSchedule();
        if(!this.sameFpsForChildren) return;
        var child = null;
        for(var key in this._namedChildren) {
            child = this._namedChildren[key];
            child.fps = this._fps;
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

    },
    _strToRect:function(str)
    {
        var arr = str.split(",");
        return cc.rect(parseFloat(arr[0]), parseFloat(arr[1]), parseFloat(arr[2]), parseFloat(arr[3]));
    }
});
flax.MovieClip.create = function(assetsFile, assetID)
{
    var mc = new flax.MovieClip(assetsFile, assetID);
    mc.clsName = "flax.MovieClip";
    return mc;
};
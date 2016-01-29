/**
 * Created by long on 14-2-14.
 */

flax.FrameData = cc.Class.extend({
    x:0,
    y:0,
    rotation:0,
    scaleX:1,
    scaleY:1,
    opacity:255,
    zIndex:-1,
    skewX:0,
    skewY:0,
    //ttf text properties
    font:null,
    fontSize:12,
    fontColor:"",
    textAlign:"",
    textWidth:40,
    textHeight:20,

    _isText:false,
    _data:null,
    _hasSkew:false,

    ctor:function(data){
        this._data = data;
        this.x = parseFloat(data[0]);
        this.y = parseFloat(data[1]);
        this.rotation = parseFloat(data[2]);
        this.scaleX = parseFloat(data[3]);
        this.scaleY = parseFloat(data[4]);
        this.opacity = Math.round(255*parseFloat(data[5]));
        if(data.length > 6) this.zIndex = parseInt(data[6]);
        if(data.length > 7) this.skewX = parseFloat(data[7]);
        if(data.length > 8) this.skewY = parseFloat(data[8]);
        this._hasSkew = (data.length > 7);
        //the ttf text info
        if(data.length > 9) {
            this._isText = true;
            this.font = data[9];
            this.fontSize = parseInt(data[10]);
            this.fontColor = cc.hexToColor(data[11]);
            this.textAlign = H_ALIGHS.indexOf(data[12]);
            this.textWidth = parseFloat(data[13]);
            this.textHeight = parseFloat(data[14]);
        }
    },
    setForChild:function(child)
    {
        if(!this._hasSkew) child.setRotation(this.rotation);
        child.setScaleX(this.scaleX);
        child.setScaleY(this.scaleY);

        if(this._hasSkew){
            child.setRotationX(this.skewX);
            child.setRotationY(this.skewY);
        }

        if(child.setOpacity) child.setOpacity(this.opacity);

        var x = this.x;
        var y = this.y;
        //set the ttf text properties
        if(this.font && child instanceof cc.LabelTTF)
        {
            child.setFontName(this.font);
            child.setFontFillColor(this.fontColor);
            child.setHorizontalAlignment(this.textAlign);
            child.setDimensions({width: this.textWidth, height:this.textHeight});
            //todo: fix the bug of cocos: no update when the font color changed
            child.setFontSize(this.fontSize - 1);
            child.setFontSize(this.fontSize);
            //ttf position offset
            x += this.textWidth/2;
            y -= this.textHeight/2;
        }

        child.setPositionX(x);
        child.setPositionY(y);
    },
    clone:function(){
        return new flax.FrameData(this._data);
    }
});

flax._movieClip = {
    clsName:"flax.MovieClip",
    sameFpsForChildren:true,//all children use the same fps with this
    createChildFromPool:true,
    _autoPlayChildren:false,//auto play children when play
    namedChildren:null,
//    _stoppingChildren:null,
    _theRect:null,
    _frameDatas:null,
    __isMovieClip:true,
    /**
     * Replace a child with name of childName by an asset of assetID in assetsFile
     * @param {String} childName the child to be replaced
     * @param {String} assetID the new assetID
     * @param {String} assetsFile the new asset's assetsFile, if null, use this.assetsFile
     * */
    replaceChild:function(childName, assetID, assetsFile)
    {
        var childDefine = this.define['children'][childName];
        if(childDefine == null){
            cc.log("There is no child with named: "+childName +"  in MovieClip: "+this.assetID);
            return;
        }
        var child = this.namedChildren[childName];
        if(child)
        {
            if(!assetsFile) assetsFile = this.assetsFile;
            var assetType = flax.assetsManager.getAssetType(assetsFile, assetID);
            if(!assetType){
                throw "There is no display with assetID: " + assetID + " in assets: " + assetsFile;
            }
            if(flax.assetsManager.getAssetType(child.assetsFile, child.assetID) == assetType){
                child.setSource(assetsFile, assetID);
            } else {
                var autoPlay = child._autoPlayChildren;
                child.destroy();
                child = flax.assetsManager.createDisplay(assetsFile, assetID, null, this.createChildFromPool);
                child.name = childName;
                this.namedChildren[childName] = child;
                if(child.__isMovieClip === true && !autoPlay) child.autoPlayChildren = this._autoPlayChildren;
                if(this._autoPlayChildren && child.__isFlaxSprite === true) {
                    this.playing ? child.gotoAndPlay(0) : child.gotoAndStop(0);
                }
                this[childName] = child;
                this.addChild(child);
            }
        }else{
            childDefine["class"] = assetID;
            childDefine.assetsFile = assetsFile;
        }
    },
    getFrameData:function(childName, frame)
    {
        if(this._frameDatas[childName] == null) return null;
        var frameData = this._frameDatas[childName][frame];
        return frameData;
    },
    setOpacity: function (opacity) {
        cc.Node.prototype.setOpacity.call(this, opacity);
        for(var k in this.namedChildren){
            var child = this.namedChildren[k];
            if(child.setOpacity) child.setOpacity(opacity);
        }
    },
    setColor: function (color) {
        cc.Node.prototype.setColor.call(this, color);
        for(var k in this.namedChildren){
            var child = this.namedChildren[k];
            if(child.setColor) child.setColor(color);
        }
    },
    /**
     * Stop the child with name at some frame or label on all frames, if just child.gotAndStop(frameOrLabel), it maybe
     * only take effect on some frames instead all frames especially in $ animation
     * @param {String|Sprite} nameOrInstance The child or its name
     * @param {String|Integer} frameOrLabel The frame or label to stop, if null, set random frame
     * */
//    stopChildAt:function(nameOrInstance, frameOrLabel)
//    {
//        var child = null;
//        if(typeof nameOrInstance === "string") {
//            child = this.namedChildren[nameOrInstance];
//            if(child == null){
//                cc.log("***Warning--There is no child with name: " + nameOrInstance);
//                return;
//            }
//        }else if(nameOrInstance.__isFlaxSprite === true) {
//            child = nameOrInstance;
//            if(child.parent != this){
//                cc.log("***Warning--The target is not a child of this!");
//                return;
//            }
//        }else throw 'Invalid child name of instance!'
//        if(frameOrLabel == null) frameOrLabel = flax.randInt(0, child.totalFrames);
//        if(child.gotoAndStop(frameOrLabel)){
//            if(this._stoppingChildren == null) this._stoppingChildren = {};
//            this._stoppingChildren[child.name] = frameOrLabel;
//        }
//    },
//    updateStoppingChildren:function()
//    {
//        if(this._stoppingChildren){
//            for(var childName in this._stoppingChildren){
//                var child = this.namedChildren[childName];
//                if(child){
//                    child.gotoAndStop(this._stoppingChildren[childName]);
//                }
//            }
//        }
//    },
    onNewSource:function()
    {
        for(var childName in this.namedChildren){
            this.namedChildren[childName].destroy();
            delete this.namedChildren[childName];
            delete this[childName];
        }
        this.namedChildren = {};
        this.totalFrames = this.define['totalFrames'];
        this._theRect = flax._strToRect(this.define['rect']);
        this.setContentSize(this._theRect.width, this._theRect.height);
        this._initFrameDatas();
    },
    _initFrameDatas:function()
    {
        this._frameDatas = {};
        for(var childName in this.define['children'])
        {
            var frames = [];
            var fs = this.define['children'][childName].frames;
            var i = -1;
            while(++i < fs.length){
                var fd = fs[i];
                if(fd){
                    fd = fd.split(",");
                    frames[i] = new flax.FrameData(fd);
                }
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
        for(var childName in this.define['children'])
        {
            childDefine = this.define['children'][childName];
            frameData = this._frameDatas[childName][frame];
            child = this.namedChildren[childName];
            if(frameData) {
                if(child == null){
                    //hadle the label text
                    if(childDefine.text != null){
                        child = flax.Label.create(this.assetsFile, frameData, childDefine);
                    }else{
                        child = flax.assetsManager.createDisplay(childDefine.assetsFile || this.assetsFile, childDefine["class"], null, this.createChildFromPool);
                    }

                    child.name = childName;
                    this.namedChildren[childName] = child;
                    this[childName] = child;
                    this.onNewChild(child);
                }
                frameData.setForChild(child);
                //all children use the same fps with this
                if(this.sameFpsForChildren) child.fps = this.fps;
//                if(child.__isMovieClip === true && !child.getAutoPlayChildren()) child._autoPlayChildren = this._autoPlayChildren;
//                if(this._autoPlayChildren && flax.isFlaxSprite(child)) {
//                    this.playing ? child.play() : child.stop();
//                }
                //To fix the zIndex bug when use the old version tool
                var zIndex = (frameData.zIndex == -1) ? childDefine['zIndex'] : frameData.zIndex;
                if(child.parent != this){
                    child.removeFromParent(false);
                    this.addChild(child, zIndex);
                }else if(child.zIndex != zIndex){
                    child.zIndex = zIndex;
                }
            }else if(child) {
                if(child.destroy) child.destroy();
                else child.removeFromParent(true);
                delete this.namedChildren[childName];
                delete this[childName];
            }
        }
    },
    stop:function()
    {
        this._super();
        if(this._autoPlayChildren) {
            for(var key in this.namedChildren) {
                var child = this.namedChildren[key];
                if(child.__isFlaxSprite === true) {
                    child.stop();
                }
            }
        }
    },
    play:function()
    {
        this._super();
        if(this._autoPlayChildren) {
            for(var key in this.namedChildren) {
                var child = this.namedChildren[key];
                if(child.__isFlaxSprite === true) {
                    child.play();
                }
            }
        }
    },
    getAutoPlayChildren:function()
    {
        return this._autoPlayChildren;
    },
    setAutoPlayChildren:function(v)
    {
        if(this._autoPlayChildren == v) return;
        this._autoPlayChildren = v;
        for(var key in this.namedChildren) {
            var child = this.namedChildren[key];
            if(child.__isMovieClip === true) {
                child.setAutoPlayChildren(v);
            }
            if(child.__isFlaxSprite) {
                v ? child.play() : child.stop();
            }
        }
    },
    onNewChild:function(child)
    {
        if(child.__isMovieClip === true) child.autoPlayChildren = this._autoPlayChildren;
        if(this._autoPlayChildren && child.__isFlaxSprite === true) {
            this.playing ? child.gotoAndPlay(0) : child.gotoAndStop(0);
        }
//        if(this._stoppingChildren && child.__isFlaxSprite === true){
//            var frameOrLabel = this._stoppingChildren[child.name];
//            if(frameOrLabel != null) child.gotoAndStop(frameOrLabel);
//        }
//        if(child.__isMovieClip === true && child._stoppingChildren){
//            child.updateStoppingChildren();
//        }
    },
    getDefine:function()
    {
        var define = flax.assetsManager.getMc(this.assetsFile, this.assetID);
        if(define == null) throw "There is no MovieClip named: " + this.assetID + " in assets: " + this.assetsFile + ", or make sure this class extends from the proper class!";
        return define;
    },
    getChild:function(name, nest)
    {
        if(nest === undefined) nest = true;
        var child = this.namedChildren[name];
        if(child) return child;
        if(!nest) return null;
        for(var key in this.namedChildren) {
            child = this.namedChildren[key];
            if(child.getChild) {
                child = child.getChild(name, nest);
                if(child) return child;
            }
        }
        return null;
    },
    getChildByAssetID:function(id)
    {
        var child = null;
        for(var key in this.namedChildren) {
            child = this.namedChildren[key];
            if(child.assetID == id){
                return child;
            }
        }
        return null;
    },
    getLabelText:function(labelName, ifNest)
    {
        var label = this.getChild(labelName, ifNest === undefined ? true : ifNest);
        if(label && (label instanceof flax.Label || label instanceof cc.LabelTTF)) return label.getString();
        return null;
    },
    setLabelText:function(labelName, text, ifNest)
    {
        var label = this.getChild(labelName, ifNest === undefined ? true : ifNest);
        if(label && (label instanceof flax.Label || label instanceof cc.LabelTTF)) {
            label.setString(text);
            return label;
        }
        return null;
    },
    setFPS:function(f)
    {
        if(this._fps == f)  return;
        this._fps = f;
        this.updateSchedule();
        if(!this.sameFpsForChildren) return;
        var child = null;
        for(var key in this.namedChildren) {
            child = this.namedChildren[key];
            child.fps = this._fps;
        }
    },
    //todo, not verified yet
//    getRect:function(coordinate)
//    {
//        var rect = null;
//        for (var i = 0; i < this.children.length; i++) {
//            var child = this.children[i];
//            var r = flax.getRect(child, coordinate);
//            if(rect) rect = cc.rectUnion(r, rect);
//            else rect = r;
//        }
//        return rect;
//    },
    onRecycle:function()
    {
        this._super();
        this.sameFpsForChildren = true;
        this.createChildFromPool = true;
        this._autoPlayChildren = false;
        if(RESET_FRAME_ON_RECYCLE){
            for(var key in this.namedChildren) {
                var child = this.namedChildren[key];
                if(child.__isFlaxSprite === true) {
                    child.gotoAndStop(0);
                }
            }
        }
    },
    onExit: function () {
        this._super();
        for(var childName in this.namedChildren){
            delete this.namedChildren[childName];
            delete this[childName];
        }
        //this._childrenDefine = null;
    }
};

flax.MovieClip = flax.FlaxSprite.extend(flax._movieClip);
flax.MovieClip.create = function(assetsFile, assetID)
{
    var mc = new flax.MovieClip(assetsFile, assetID);
    mc.clsName = "flax.MovieClip";
    return mc;
};

var _p = flax.MovieClip.prototype;
/** @expose */
_p.autoPlayChildren;
cc.defineGetterSetter(_p, "autoPlayChildren", _p.getAutoPlayChildren, _p.setAutoPlayChildren);
cc.defineGetterSetter(_p, "opacity", _p.getOpacity, _p.setOpacity);

//Avoid to advanced compile mode
window['flax']['MovieClip'] = flax.MovieClip;

flax.MovieClipBatch = flax.FlaxSpriteBatch.extend(flax._movieClip);
flax.MovieClipBatch.create = function(assetsFile, assetID)
{
    var mc = new flax.MovieClipBatch(assetsFile, assetID);
    mc.clsName = "flax.MovieClipBatch";
    return mc;
};

_p = flax.MovieClipBatch.prototype;
/** @expose */
_p.autoPlayChildren;
cc.defineGetterSetter(_p, "autoPlayChildren", _p.getAutoPlayChildren, _p.setAutoPlayChildren);
cc.defineGetterSetter(_p, "opacity", _p.getOpacity, _p.setOpacity);

//Avoid to advanced compile mode
window['flax']['MovieClipBatch'] = flax.MovieClipBatch;
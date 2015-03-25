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
        if(!this._hasSkew && this.rotation != child.rotation) child.rotation = this.rotation;
        if(this.scaleX != child.scaleX) child.scaleX = this.scaleX;
        if(this.scaleY != child.scaleY) child.scaleY = this.scaleY;

        if(this._hasSkew){
            child.rotationX = this.skewX;
            child.rotationY = this.skewY;
        }

        if(child.setOpacity && this.opacity != child.opacity) child.opacity = this.opacity;

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

        if(x != child.x) child.x = x;
        if(y != child.y) child.y = y;
    },
    clone:function(){
        return new flax.FrameData(this._data);
    }
});

flax._movieClip = {
    clsName:"flax.MovieClip",
    autoPlayChildren:false,//auto play children when play
    sameFpsForChildren:true,//all children use the same fps with this
    _namedChildren:null,
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
        var child = this._namedChildren[childName];
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
                child.destroy();
                child = flax.assetsManager.createDisplay(assetsFile, assetID, null, true);
                child.name = childName;
                this._namedChildren[childName] = child;
                if(this.autoPlayChildren && flax.isFlaxSprite(child)) {
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
    onNewSource:function()
    {
        for(var childName in this._namedChildren){
            this._namedChildren[childName].destroy();
            delete this._namedChildren[childName];
            delete this[childName];
        }
        this._namedChildren = {};
        this.totalFrames = this.define['totalFrames'];
        this._theRect = this._strToRect(this.define['rect']);
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
            child = this._namedChildren[childName];
            if(frameData) {
                if(child == null){
                    //hadle the label text
                    if(childDefine.text != null){
                        child = flax.Label.create(this.assetsFile, frameData, childDefine);
                    }else{
                        child = flax.assetsManager.createDisplay(childDefine.assetsFile || this.assetsFile, childDefine["class"], null, true);
                    }

                    child.name = childName;
                    this._namedChildren[childName] = child;
                    if(this.autoPlayChildren && flax.isFlaxSprite(child)) {
                        this.playing ? child.gotoAndPlay(0) : child.gotoAndStop(0);
                    }
                    this[childName] = child;
                    this.onNewChild(child);
                }
                frameData.setForChild(child);
                //all children use the same fps with this
                if(this.sameFpsForChildren) child.fps = this.fps;
                child.visible = true;
                child.autoPlayChildren = this.autoPlayChildren;
                if(this.autoPlayChildren && flax.isFlaxSprite(child)) {
                    this.playing ? child.play() : child.stop();
                }
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
                delete this._namedChildren[childName];
                delete this[childName];
            }
        }
    },
    stop:function()
    {
        this._super();
        if(this.autoPlayChildren) {
            for(var key in this._namedChildren) {
                var child = this._namedChildren[key];
                if(flax.isFlaxSprite(child)) {
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
                if(flax.isFlaxSprite(child)) {
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
        if(define == null) throw "There is no MovieClip named: " + this.assetID + " in assets: " + this.assetsFile + ", or make sure this class extends from the proper class!";
        return define;
    },
    findChildByName:function(name, nest)
    {
        if(nest === undefined) nest = true;
        var child = this._namedChildren[name];
        if(child) return child;
        if(!nest) return null;
        for(var key in this._namedChildren) {
            child = this._namedChildren[key];
            if(child.findChildByName) {
                child = child.findChildByName(name, nest);
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
        var label = this.findChildByName(labelName, ifNest === undefined ? true : ifNest);
        if(label && (label instanceof flax.Label)) return label.getString();
        return null;
    },
    setLabelText:function(labelName, text, ifNest)
    {
        var label = this.findChildByName(labelName, ifNest === undefined ? true : ifNest);
        if(label && (label instanceof flax.Label)) {
            label.setString(text);
            return label;
        }
        return null;
    },
//    addChildrenPhysics:function(name, type, density, friction,restitution, isSensor, fixedRotation, catBits, maskBits, bullet){
//        var child = null;
//        for(var key in this._namedChildren) {
//            child = this._namedChildren[key];
//            child.addPhysics(name, type, density, friction, restitution, isSensor, fixedRotation, catBits, maskBits, bullet);
//        }
//    },
//    removeChildrenPhysics:function(name){
//        var child = null;
//        for(var key in this._namedChildren) {
//            child = this._namedChildren[key];
//            child.removePhysics(name);
//        }
//    },
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
            if(flax.isFlaxSprite(child)) {
                child.gotoAndStop(0);
            }
        }

    },
    _strToRect:function(str)
    {
        var arr = str.split(",");
        return cc.rect(parseFloat(arr[0]), parseFloat(arr[1]), parseFloat(arr[2]), parseFloat(arr[3]));
    }
}

flax.MovieClip = flax.FlaxSprite.extend(flax._movieClip);
flax.MovieClip.create = function(assetsFile, assetID)
{
    var mc = new flax.MovieClip(assetsFile, assetID);
    mc.clsName = "flax.MovieClip";
    return mc;
};

//Avoid to advanced compile mode
window['flax']['MovieClip'] = flax.MovieClip;

flax.MovieClipBatch = flax.FlaxSpriteBatch.extend(flax._movieClip);
flax.MovieClipBatch.create = function(assetsFile, assetID)
{
    var mc = new flax.MovieClipBatch(assetsFile, assetID);
    mc.clsName = "flax.MovieClipBatch";
    return mc;
};

//Avoid to advanced compile mode
window['flax']['MovieClipBatch'] = flax.MovieClipBatch;
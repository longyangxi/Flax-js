/**
 * Created by long on 14-12-27.
 */
flax._image = {
    define:null,
    name:null,
    assetsFile:null,
    assetID:null,
    clsName:"flax.Image",
    autoRecycle:false,
    _anchorBindings:null,
    __instanceId:null,
    _imgFile:null,
    _sx:1.0,
    _sy:1.0,
    _imgSize:null,
    _destroyed:false,

    ctor:function(assetsFile, assetID){
        if(this instanceof cc.Sprite) cc.Sprite.prototype.ctor.call(this);
        else {
            //todo, use texture as scale9
            this.define = flax.assetsManager.getDisplayDefine(assetsFile, assetID);
            //get the resource folder
            this._imgFile = this.define['url'];
            this._super();
            var batch = new cc.SpriteBatchNode(this._imgFile);
            this.updateWithBatchNode(batch, cc.rect(), false, this.define['scale9']);
        }
        if(!assetsFile || !assetID) throw "Please set assetsFile and assetID to me!";
        this.__instanceId = ClassManager.getNewInstanceId();
        this._anchorBindings = [];
        this.setSource(assetsFile, assetID);
    },
    /**
     * @param {String} assetsFile the assets file path
     * @param {String} assetID the display id in the assets file
     * */
    setSource:function(assetsFile, assetID)
    {
        if(assetsFile == null || assetID == null){
            throw 'assetsFile and assetID can not be null!';
            return;
        }
        if(this.assetsFile == assetsFile && this.assetID == assetID) return;
        this.assetsFile = assetsFile;
        this.assetID = assetID;
        this.define = flax.assetsManager.getDisplayDefine(this.assetsFile, this.assetID);
        //get the resource folder
        var dir = this.assetsFile.slice(0, this.assetsFile.lastIndexOf("/"));
        this._imgFile = dir + "/" + this.define['url'];
        if(flax.Scale9Image && this instanceof flax.Scale9Image) this.initWithFile(this._imgFile, cc.rect(), this.define['scale9']);
        else this.initWithFile(this._imgFile);
        if(!cc.sys.isNative) this.addEventListener("load", this.onImgLoaded, this);
        else this.onImgLoaded();
        //set the anchor
        var anchorX = this.define['anchorX'];
        var anchorY = this.define['anchorY'];
        if(!isNaN(anchorX) && !isNaN(anchorY)) {
            this.setAnchorPoint(anchorX, anchorY);
        }
        this.onNewSource();
        if(this.__pool__id__ == null) this.__pool__id__ = this.assetID;
    },
    onImgLoaded:function()
    {
        var temp = new cc.Sprite(this._imgFile);
        this._imgSize = temp.getContentSize();
        //to fix the bug... not scaled properly
        this.scheduleOnce(function(){
            this._updateSize(this._sx, this._sy);
        },0.01)
    },
    destroy:function()
    {
        if(this._destroyed) return;
        this._destroyed = true;
        if(this.autoRecycle) {
            var pool = flax.ObjectPool.get(this.assetsFile, this.clsName, this.__pool__id__ || "");
            pool.recycle(this);
        }
        this.removeFromParent();
    },
    onEnter:function()
    {
        this._super();
        this._destroyed = false;
    },
    onExit:function()
    {
        this._super();

        flax.inputManager.removeListener(this);

        //remove anchors
        var node = null;
        var i = -1;
        var n = this._anchorBindings.length;
        while(++i < n) {
            node = this._anchorBindings[i];
            if(node.destroy) node.destroy();
            else node.removeFromParent(true);
            delete  node.__anchor__;
        }
        this._anchorBindings.length = 0;
    },
    /**
     * Do some thins when the object recycled by the pool
     * */
    onRecycle:function()
    {
        //when recycled, reset all the prarams as default
        this.autoRecycle = false;
        this.setScale(1);
        this.opacity = 255;
        this.rotation = 0;
        this.setPosition(0, 0);
    },
    getAnchor:function(name)
    {
        if(this.define['anchors']){
            var an = this.define['anchors'][name];
            if(an != null) {
                return new flax.Anchor(an[0]);
            }
        }
        return null;
    },
    bindAnchor:function(anchorName, node, alwaysBind)
    {
        if(!this.define['anchors']) {
            cc.log(this.assetID+": there is no any anchor!");
            return false;
        }
        if(this.define['anchors'][anchorName] == null) {
            cc.log(this.assetID+": there is no anchor named "+anchorName);
            return false;
        }
        if(node == null) throw "Node can't be null!";
        if(this._anchorBindings.indexOf(node) > -1) {
            cc.log(this.assetID+": anchor has been bound, "+anchorName);
            return false;
        }
        if(alwaysBind !== false) this._anchorBindings.push(node);
        node.__anchor__ = anchorName;
        this._updateAnchorNode(node, this.getAnchor(anchorName));
        if(node.parent != this){
            node.removeFromParent(false);
            this.addChild(node);
        }
        return true;
    },
    _updateAnchorNode:function(node, anchor)
    {
        if(anchor == null) return;
        node.x = anchor.x;
        node.y = anchor.y;
        node.zIndex = anchor.zIndex;
        node.rotation = anchor.rotation;
    },
    //todo, setScale has issue in JSB
//    setScale:function(sx, sy)
//    {
//        if(flax.Scale9Image && target instanceof flax.Scale9Image){
//            if(sy == null){
//                this._sx = sx.x;
//                this._sy = sx.y;
//            }else{
//                this._sx = sx;
//                this._sy = sy;
//            }
//            this._updateSize(sx, sy);
//        }else{
//            this._super(sx, sy);
//        }
//    },
    setScaleX:function(sx)
    {
        if(flax.Scale9Image && this instanceof flax.Scale9Image){
            this._sx = sx;
            this._updateSize(sx, this._sy);
        }else{
            cc.Node.prototype.setScaleX.call(this, sx);
        }
    },
    setScaleY:function(sy)
    {
        if(flax.Scale9Image && this instanceof flax.Scale9Image){
            this._sy = sy;
            this._updateSize(this._sx, sy);
        }else{
            cc.Node.prototype.setScaleY.call(this, sy);
        }
    },
    _updateSize:function(sx, sy)
    {
        if(this._imgSize == null) return;
        this.width = this._imgSize.width*sx;
        this.height = this._imgSize.height*sy;
    },
    onNewSource:function()
    {

    }
};

flax.Image = cc.Sprite.extend(flax._image);

if(cc.Scale9Sprite) {
    flax.Scale9Image = cc.Scale9Sprite.extend(flax._image);

    var _p = flax.Image.prototype;
//cc.defineGetterSetter(_p, "scale", _p.getScale, _p.setScale);
    cc.defineGetterSetter(_p, "scaleX", _p.getScaleX, _p.setScaleX);
    cc.defineGetterSetter(_p, "scaleY", _p.getScaleY, _p.setScaleY);

    _p = flax.Scale9Image.prototype;
//cc.defineGetterSetter(_p, "scale", _p.getScale, _p.setScale);
    cc.defineGetterSetter(_p, "scaleX", _p.getScaleX, _p.setScaleX);
    cc.defineGetterSetter(_p, "scaleY", _p.getScaleY, _p.setScaleY);

//Avoid to advanced compile mode
    window['flax']['Image'] = flax.Image;
    window['flax']['Scale9Image'] = flax.Scale9Image;
}

flax.Image.create = function(assetsFile, assetID)
{
    var define = flax.assetsManager.getDisplayDefine(assetsFile, assetID);
    if(define['scale9']) {
        if(flax.Scale9Image == null) throw "Please add module of 'gui' into project.json if you want to use Scale9Image!";
        var img = new flax.Scale9Image(assetsFile, assetID);
    }else{
        img = new flax.Image(assetsFile, assetID);
    }
    return img;
}
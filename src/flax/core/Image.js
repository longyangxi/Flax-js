/**
 * Created by long on 14-12-27.
 */
flax.Image = cc.Sprite.extend({
    define:null,
    name:null,
    assetsFile:null,
    assetID:null,
    clsName:"flax.Image",
    autoRecycle:false,
    _anchorBindings:null,
    __instanceId:null,

    ctor:function(assetsFile, assetID){
        cc.Sprite.prototype.ctor.call(this);
        if(!assetsFile || !assetID) throw "Please set assetsFile and assetID to me!"
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
            throw 'assetsFile and assetID can not be null!'
            return;
        }
        if(this.assetsFile == assetsFile && this.assetID == assetID) return;
        this.assetsFile = assetsFile;
        this.assetID = assetID;
        this.define = flax.assetsManager.getDisplayDefine(this.assetsFile, this.assetID);
        //get the resource folder
        var dir = this.assetsFile.slice(0, this.assetsFile.lastIndexOf("/"));
        this.initWithFile(dir + "/" + this.define.url);
        //set the anchor
        var anchorX = this.define.anchorX;
        var anchorY = this.define.anchorY;
        if(!isNaN(anchorX) && !isNaN(anchorY)) {
            this.setAnchorPoint(anchorX, anchorY);
        }
        this.onNewSource();
        if(this.__pool__id__ == null) this.__pool__id__ = this.assetID;
    },
    _destroyed:false,
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
        if(this.define.anchors){
            var an = this.define.anchors[name];
            if(an != null) {
                return new flax.Anchor(an[0]);
            }
        }
        return null;
    },
    bindAnchor:function(anchorName, node, alwaysBind)
    {
        if(!this.define.anchors) {
            cc.log(this.assetID+": there is no any anchor!");
            return false;
        }
        if(this.define.anchors[anchorName] == null) {
            cc.log(this.assetID+": there is no anchor named "+anchorName);
            return false;
        }
        if(node == null) throw "Node can't be null!"
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
    onNewSource:function()
    {
    }
});
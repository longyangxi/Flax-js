/**
 * Created by long on 14-2-14.
 */
var lg = lg || {};

lg.TimeLine = cc.Sprite.extend({
    onAnimationOver:null,
    autoDestroyWhenOver:false,
    autoStopWhenOver:false,
    autoHideWhenOver:false,
    autoRecycle:false,
    plistFile:null,
    currentFrame:0,
    prevFrame:-1,
    totalFrames:0,
    frameInterval:0,
    loopStart:0,
    loopEnd:0,
    define:null,
    name:null,
    assetID:null,
    clsName:"lg.TimeLine",
    fps:30,
    playing:false,
    inRecycle:false,
    collider:null,
    collidCenter:null,
    _anchorBindings:null,
    _inited:false,
    tx:0,
    ty:0,
    autoUpdateTileWhenMove:true,
    tileValue:TileValue.WALKABLE,
    _tileMap:null,
    _tileInited:false,
    _mouseEnabled:true,
    _baseAssetID:null,
    _currentSubAnim:null,
    _subAnims:null,
    _animSequence:null,

    init:function()
    {
        if(this._inited) return false;
        if(this._super()){
            this.doInit();
            this._inited = true;
            this._anchorBindings = [];
            this._animSequence = [];
            this.collidCenter = cc.p();
            this.onAnimationOver = new signals.Signal();
            return true;
        }
        return false;
    },
    /**
     * @param {String} plistFile the plist file path
     * @param {String} assetID the display id in the plist file
     * */
    setPlist:function(plistFile, assetID)
    {
        if(plistFile == null || assetID == null){
            throw 'plistFile and assetID can not be null!'
            return;
        }
        if(this.plistFile == plistFile && (this.assetID == assetID || this._baseAssetID == assetID)) return;
        this.plistFile = plistFile;
        lg.assetsManager.addPlist(plistFile);

        //see if there is a sub animation
        var ns = assetID.split("$");
        this._baseAssetID = ns[0];
        this._subAnims = lg.assetsManager.getSubAnims(plistFile, this._baseAssetID);
        var anim = ns[1];
        if(anim == null && this._subAnims) anim = this._subAnims[0];
        assetID = this._baseAssetID;
        if(anim) {
            assetID = this._baseAssetID+"$"+anim;
            this._currentSubAnim = anim;
        }

        this.assetID = assetID;
        this.define = this.getDefine();
        if(this.define) {
            this.init();
            //set the anchor
            var anchorX = this.define.anchorX;
            var anchorY = this.define.anchorY;
            if(!isNaN(anchorX) && !isNaN(anchorY)) {
                this.setAnchorPoint(anchorX, anchorY);
            }
            this.onNewSheet();
            //todo, to be verified
//            this.renderFrame(this.currentFrame, true);
            this.renderFrame(0, true);
        }else {
            this.init();
            cc.log("There is no display named: "+assetID+" in plist: "+plistFile);
        }
    },
    setParams:function(params)
    {
        lg.copyProperties(params, this);
    },
    getLabels:function(label)
    {
        if(this.define.labels){
            return this.define.labels[label];
        }
        return null;
    },
    hasLabel:function(label)
    {
        return this.getLabels(label) != null;
    },
    _getAnchor:function(name)
    {
        if(this.define.anchors){
            var an = this.define.anchors[name];
            if(an != null) {
              an = an[this.currentFrame];
              return an;
            }
        }
        return null;
    },
    bindAchor:function(anchorName, node)
    {
        if(!this.define.anchors) {
//            cc.log(this.assetID+": no anchors, "+anchorName);
            return false;
        }
        if(this.define.anchors[anchorName] == null) {
//            cc.log(this.assetID+": no anchor name, "+anchorName);
            return false;
        }
        if(this._anchorBindings.indexOf(node) > -1) {
//            cc.log(this.assetID+": anchor exit, "+anchorName);
            return false;
        }
        this._anchorBindings.push(node);
        node.__anchor__ = anchorName;
        if(node.getParent() != this){
            node.removeFromParent(false);
            this.addChild(node);
        }
        this._handleAnchorBindings();
        return true;
    },
    getCurrentLabel:function()
    {
        if(!this.define.labels) return null;
        var labels = this.define.labels;
        var label = null;
        for(var name in labels)
        {
            label = labels[name];
            if(this.currentFrame >= label.start && this.currentFrame <= label.end){
                return name;
            }
        }
        return null;
    },
    play:function()
    {
        this.loopStart = 0;
        this.loopEnd = this.totalFrames - 1;
        this.updatePlaying(true);
        this._animSequence.length = 0;
    },
    playSequence:function(anims){
        if(anims == null) return;
        if(!(anims instanceof  Array)) {
            anims = Array.prototype.slice.call(arguments);
        }
        if(anims.length == 0) return;

        this.gotoAndPlay(anims.shift());
        this._animSequence = anims;
    },
    setSubAnim:function(anim, autoPlay)
    {
        if(!anim || anim.length == 0) return false;
        if(this._subAnims == null || this._subAnims.indexOf(anim) == -1){
//            cc.log("There is no animation named: "+anim);
            return false;
        }
//        if(this._currentSubAnim == anim) return false;
        this._currentSubAnim = anim;
        this.setPlist(this.plistFile, this._baseAssetID+"$"+anim);
        if(autoPlay === false) this.gotoAndStop(0);
        else this.gotoAndPlay1(0);
        this._animSequence.length = 0;
        return true;
    },
    gotoAndPlay:function(label)
    {
        var lbl = this.getLabels(label);
        if(lbl == null){
            if(!this.setSubAnim(label, true)) {
                this.play();
                return false;
            }else {
                return true;
            }
        }
        this.loopStart = lbl.start;
        this.loopEnd = lbl.end;
        this.updatePlaying(true);
        this.currentFrame = this.loopStart;
        this._animSequence.length = 0;
        return true;
    },
    gotoAndPlay1:function(frame)
    {
        if(!this.isValideFrame(frame))
        {
            cc.log("The frame: "+frame +" is out of range!");
            return false;
        }
//        if(this.playing && frame == this.currentFrame) return true;
        this.loopStart = 0;
        this.loopEnd = this.totalFrames - 1;
        this.updatePlaying(true);
        this.currentFrame = frame;
        this._animSequence.length = 0;
        return true;
    },
    stop:function()
    {
        this.updatePlaying(false);
    },
    gotoAndStop:function(frame)
    {
        if(!this.isValideFrame(frame))
        {
            cc.log("The frame: "+frame +" is out of range!");
            return false;
        }
//        if(!this.playing && this.currentFrame == frame) return true;
        this.updatePlaying(false);
        this.currentFrame = frame;
        this.renderFrame(frame);
        this._animSequence.length = 0;
        return true;
    },
    gotoAndStop1:function(label)
    {
        var lbl = this.getLabels(label);
        if(lbl == null){
            return this.setSubAnim(label, false);
        }
        var theFrame = lbl.start;
        return this.gotoAndStop(theFrame);
    },
    setFPS:function(f)
    {
        if(this.fps == f)  return;
        this.fps = f;
        this.updateSchedule();
    },
    updatePlaying:function(state)
    {
        if(this.playing == state) return;
        this.playing = state;
        this.updateSchedule();
    },
    updateSchedule:function()
    {
        if(this.playing)
        {
            this.schedule(this.onFrame, 1.0/this.fps, cc.REPEAT_FOREVER, 0.0);
        }else{
            this.unschedule(this.onFrame);
        }
    },
    onFrame:function(delta)
    {
        if(!this.playing || this.totalFrames <= 1) return;
        if(!this._visible || this.inRecycle) return;
        this.renderFrame(this.currentFrame);
        this.currentFrame++;
        if(this.currentFrame > this.loopEnd)
        {
            if(this.onAnimationOver.getNumListeners())
            {
                this.onAnimationOver.dispatch(this);
            }
            if(this.autoDestroyWhenOver)
            {
                this.updatePlaying(false);
                this.destroy();
            }else if(this.autoStopWhenOver){
                this.currentFrame = this.loopEnd;
                this.updatePlaying(false);
            }else if(this.autoHideWhenOver) {
                this.currentFrame = this.loopEnd;
                this.updatePlaying(false);
                this.setVisible(false);
            }else if(this._animSequence.length) {
                var anims = this._animSequence.concat();
                this.gotoAndPlay(anims.shift());
                this._animSequence = anims;
//                this._recoverOldAnim();
            }else{
                this.currentFrame = this.loopStart;
            }
        }
    },
    isValideFrame:function(frame)
    {
        return frame >= 0 && frame < this.totalFrames;
    },
    renderFrame:function(frame, forceUpdate)
    {
        if(this.prevFrame == frame && forceUpdate != true) return;
        if(this.prevFrame != frame) this.prevFrame = frame;
        this._handleAnchorBindings();
        this.doRenderFrame(frame);
    },
    doRenderFrame:function(frame)
    {
        //to be implemented
    },
    _handleAnchorBindings:function()
    {
        var node = null;
        var anchor = null;
        var i = -1;
        var n = this._anchorBindings.length;
        while(++i < n) {
            node = this._anchorBindings[i];
            if(!node.isVisible()) continue;
            anchor = this._getAnchor(node.__anchor__);
            if(anchor == null) continue;
            this._updateAnchorNode(node, anchor);
        }
     },
    _updateAnchorNode:function(node, anchor)
    {
//        if(node._position._x != anchor[0] || node._position._y != anchor[0]) {
            node.setPosition(anchor[0], anchor[1]);
//        }
    },
    onEnter:function()
    {
        this._super();
        this.onReset(true);
    },
    onExit:function()
    {
        this._super();
        if(this._tileMap) this._tileMap.removeObject(this);
        lg.inputManager.removeListener(this);
        this.onAnimationOver.removeAll();
    },
    getTileMap:function()
    {
        return this._tileMap;
    },
    setTileMap:function(map)
    {
        if(map && !(map instanceof lg.TileMap)) map = lg.getTileMap(map);
        if(this._tileMap == map) return;
        if(this._tileMap) this._tileMap.removeObject(this);
        this._tileMap = map;
        if(this._tileMap == null) return;
        var newTx = this._tileMap.getTileIndexX(this.getPositionX());
        var newTy = this._tileMap.getTileIndexY(this.getPositionY());
        this.setTile(newTx, newTy, true);
    },
    setPosition:function(pos, yValue)
    {
        var dirty = false;
        if(yValue === undefined) {
            dirty = (pos.x != this._position._x || pos.y != this._position._y);
            if(dirty) this._super(pos);
        }else {
            dirty = (pos != this._position._x || yValue != this._position._y);
            if(dirty) this._super(pos, yValue);
        }
        if(!dirty || this.inRecycle) return;
        if(this.autoUpdateTileWhenMove && this._tileMap){
            var newTx = this._tileMap.getTileIndexX(this.getPositionX());
            var newTy = this._tileMap.getTileIndexY(this.getPositionY());
            this.setTile(newTx, newTy);
        }

        if(this.collider == null) {
            this.collider = lg.getRect(this, true);
        }else{
            //todo
            this.collider = lg.getRect(this, true);
        }
        this.collidCenter.x = this.collider.x + this.collider.width/2;
        this.collidCenter.y = this.collider.y + this.collider.height/2;
    },
    setTile:function(tx, ty, forceUpdate)
    {
        if (forceUpdate === true || tx != this.tx || ty != this.ty) {
            var oldTx = this.tx;
            var oldTy = this.ty;
            this.tx = tx;
            this.ty = ty;
            if(this._tileMap && this._parent)
            {
                this._tileMap.removeObject(this, oldTx, oldTy);
                if(!this.inRecycle) {
                    this._tileMap.addObject(this);
                    this._tileInited = true;
                }
            }
        }else {
            //update the zOrder sort in the tile
//            this._tileMap.updateLayout(tx, ty);
        }
    },
    destroy:function()
    {
        if(this.autoRecycle) {
            if(!this.inRecycle) {
                var pool = lg.ObjectPool.get(this.plistFile, this.clsName);
                pool.recycle(this);
            }
        }else{
            this.removeFromParent();
        }
    },
    /**
     * Reset some parameters, called when onEnter, or fetch from the pool
     * */
    onReset:function(firstTime)
    {
        if(!this._running) return;
        firstTime = (firstTime === true);
        this.inRecycle = false;
        this.setVisible(true);
        if(this._tileMap && !this._tileInited) {
            this._tileMap.addObject(this);
            this._tileInited = true;
        }
    },
    /**
     * Do some thins when the object recycled by the pool
     * */
    onRecycle:function()
    {
        this.inRecycle = true;
        //when recycled, reset all the prarams as default
        this.autoRecycle = false;
        this.setZOrder(0);
        this.setScale(1);
        this.setOpacity(255);
        this.setRotation(0);
        this.autoDestroyWhenOver = false;
        this.autoStopWhenOver = false;
        this.autoHideWhenOver = false;
        //hide the object
        this.setVisible(false);
        this.stop();
        this.stopAllActions();
        this.unscheduleAllCallbacks();
        if(this._tileMap) this._tileMap.removeObject(this);
        this._tileInited = false;
        this.setPosition(-1000, -1000);
        this._animSequence.length = 0;

        //remove all anchor nodes
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
    isMouseEnabled:function()
    {
        return this._mouseEnabled;
    },
    setMouseEnabled:function(value)
    {
        this._mouseEnabled = value;
    },

    doInit:function()
    {

    },
    getDefine:function()
    {
        return null;
    },
    onNewSheet:function()
    {

    }
});

lg.TimeLine.create = function(plistFile, assetID)
{
    var tl = new lg.TimeLine();
    tl.setPlist(plistFile, assetID);
    tl.clsName = "lg.TimeLine";
    return tl;
};
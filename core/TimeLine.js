/**
 * Created by long on 14-2-14.
 */
var lg = lg || {};
lg.ColliderType = {
    rect: "Rect",
    circle: "Circle"
}
lg.Collider = cc.Class.extend({
    name:null,
    owner:null,
    type:lg.ColliderType.rect,
    x:0,//center x
    y:0,//center y
    width:0,
    height:0,
    rotation:0,
    _localRect:null,
    ctor:function(arr, centerAnchor){
        this.type = arr[0];
        this.x = arr[1];
        this.y = arr[2];
        this.width = arr[3];
        this.height = arr[4];
        this.rotation = arr[5];
        if(centerAnchor === false) {
            this.x += this.width/2;
            this.y += this.height/2;
        }
        this._localRect = cc.rect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    },
    clone:function(){
        var c = new lg.Collider([this.type,this.x, this.y, this.width, this.height, this.rotation]);
        c.name = this.name;
        c.owner = this.owner;
        return c;
    },
    checkCollision:function(collider){
        if(collider.type == this.type && this.type == lg.ColliderType.rect){
            return cc.rectIntersectsRect(this.getRect(), collider.getRect());
        }
        //todo, add more type check
        //todo, if rotation
    },
    getRect:function(global){
        global = (global !== false);
        if(!global) return this._localRect;

        var pos = this.owner.convertToWorldSpace(cc.p(this.x, this.y));
        var s = lg.getScale(this.owner, true);
        var w = this.width*Math.abs(s.x);
        var h = this.height*Math.abs(s.y);
        var rect = cc.rect(pos.x - w/2, pos.y - h/2, w, h);

        return rect;
    }
});

lg.Anchor = cc.Class.extend({
    x:0,
    y:0,
    zIndex:0,
    rotation:0,
    ctor:function(arr){
        this.x = arr[0];
        this.y = arr[1];
        if(arr.length > 2) this.zIndex = arr[2];
        if(arr.length > 3) this.rotation = arr[3];
    }
});

lg.TimeLine = cc.Sprite.extend({
    onAnimationOver:null,
    autoDestroyWhenOver:false,
    autoStopWhenOver:false,
    autoHideWhenOver:false,
    autoRecycle:false,
    plistFile:null,
    currentFrame:0,
    currentAnim:null,
    prevFrame:-1,
    totalFrames:0,
    frameInterval:0,
    loopStart:0,
    loopEnd:0,
    define:null,
    name:null,
    assetID:null,
    clsName:"lg.TimeLine",
    _fps:30,
    playing:false,
    inRecycle:false,
    _colliders:null,
    _mainCollider:null,
    _definedMainCollider:false,
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
    _loopSequence:false,
    _sequenceIndex:0,

    ctor:function(plistFile, assetID){
        cc.Sprite.prototype.ctor.call(this);
        if(!plistFile || !assetID) throw "Please set plistFile and assetID to me!"
        this._anchorBindings = [];
        this._animSequence = [];
        this.onAnimationOver = new signals.Signal();
        this.setPlist(plistFile, assetID);
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
            //set the anchor
            var anchorX = this.define.anchorX;
            var anchorY = this.define.anchorY;
            if(!isNaN(anchorX) && !isNaN(anchorY)) {
                this.setAnchorPoint(anchorX, anchorY);
            }
            this.onNewSheet();
            this.currentFrame = 0;
            this.renderFrame(this.currentFrame, true);
            this._initColliders();
        }else {
            cc.log("There is no display named: "+assetID+" in plist: "+plistFile);
        }
        if(this.parent){
            this._updateLaguage();
        }
        if(this.__pool__id__ == null) this.__pool__id__ = this.assetID;
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
    getMainCollider:function(){
        return this._mainCollider;
    },
    getCollider:function(name){
        if(this._colliders){
            var an = this._colliders[name];
            if(an != null) {
                an = an[this.currentFrame];
                return an;
            }
        }
        return null;
    },
    _initColliders:function(){
        this._mainCollider = null;
        this._colliders = {};
        var cs = this.define.colliders;
        if(cs){
            var cd = null;
            for(var k in cs){
                this._colliders[k] = [];
                var cArr = cs[k];
                var frame = -1;
                while(++frame < cArr.length){
                    if(cArr[frame] == null) {
                        this._colliders[k][frame] = null;
                        continue;
                    }
                    cd = this._colliders[k][frame] = cArr[frame].clone();
                    cd.name = k;
                    cd.owner = this;
                    if(k == "main") this._mainCollider = cd;
                }
            }
        }
        this._definedMainCollider = (this._mainCollider != null);
        if(!this._definedMainCollider){
            this._mainCollider = new lg.Collider(["Rect", 0, 0, this.width, this.height, 0], false);
            this._mainCollider.name = "main";
            this._mainCollider.owner = this;
        }
    },
    getRect:function(global)
    {
        return this._mainCollider.getRect(global);
    },
    getCenter:function(global){
        var rect = this.getRect(global);
        return cc.p(rect.x + rect.width/2, rect.y + rect.height/2);
    },
    getAnchor:function(name)
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
    },
    /**
     * Play a sequence animations, for example:
     * hero.playSequence("anim1","anim2");//play anim1 firstly, and then play anim2 for loop
     * hero.playSequence("anim1",3,"anim2")//play anim firstly, then stop for 3 seconds and play "anim2" for loop
     * */
    playSequence:function(anims){
        if(anims == null) return false;
        if(!(anims instanceof  Array)) {
            anims = Array.prototype.slice.call(arguments);
        }
        if(anims.length == 0) return false;
        this._loopSequence = false;
        this._sequenceIndex = 0;
        var ok = this.gotoAndPlay(anims[0]);
        this._animSequence = anims;
        return ok;
    },
    /**
     * Play a sequence animations for loop, for example:
     * hero.playSequenceLoop("anim1","anim2");//play anim1 firstly, and then play anim2, loop this behavior again and again
     * hero.playSequenceLoop("anim1",3,"anim2",2)//play anim1 firstly, then stop for 3 seconds and play "anim2", stop for 2 second,loop this behavior again and again
     * */
    playSequenceLoop:function(anims){
        if(!(anims instanceof  Array)) {
            anims = Array.prototype.slice.call(arguments);
        }
        this.playSequence(anims);
        this._loopSequence = true;
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
        else this.gotoAndPlay(0);
        this._animTime = 0;
        return true;
    },
    gotoAndPlay:function(frameOrLabel)
    {
        if(typeof frameOrLabel === "string") {
            var lbl = this.getLabels(frameOrLabel);
            if(lbl == null){
                if(!this.setSubAnim(frameOrLabel, true)) {
                    this.play();
//                    cc.log("There is no frame label: "+frameOrLabel+" in the display: "+this._baseAssetID);
                    return false;
                }else {
                    return true;
                }
            }
            this.loopStart = lbl.start;
            this.loopEnd = lbl.end;
            this.currentFrame = this.loopStart;
            this.currentAnim = frameOrLabel;
        }else{
            if(!this.isValideFrame(frameOrLabel))
            {
                cc.log("The frame: "+frameOrLabel +" is out of range!");
                return false;
            }
            this.loopStart = 0;
            this.loopEnd = this.totalFrames - 1;
            this.currentFrame = frameOrLabel;
        }
        this.renderFrame(this.currentFrame);
        this.updatePlaying(true);
        this._animTime = 0;
        return true;
    },
    stop:function()
    {
        this.updatePlaying(false);
    },
    gotoAndStop:function(frameOrLabel)
    {
        //convert frame label to frame number
        if(isNaN(frameOrLabel)) {
            var lbl = this.getLabels(frameOrLabel);
            if(lbl == null){
                return this.setSubAnim(frameOrLabel, false);
            }
            this.currentAnim = frameOrLabel;
            frameOrLabel = lbl.start;
        }else{
            this.currentAnim = null;
        }

        if(!this.isValideFrame(frameOrLabel))
        {
            cc.log("The frame: "+frameOrLabel +" is out of range!");
            return false;
        }
        this.updatePlaying(false);
        this.currentFrame = frameOrLabel;
        this.renderFrame(frameOrLabel);
        return true;
    },
    setFPS:function(f)
    {
        if(this._fps == f)  return;
        this._fps = f;
        this.updateSchedule();
    },
    getFPS:function(){
        return this._fps;
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
            if(this.totalFrames > 1) this.schedule(this.onFrame, 1.0/this._fps, cc.REPEAT_FOREVER, 0.0);
        }else{
            this.unschedule(this.onFrame);
        }
    },
    _animTime:0,
    onFrame:function(delta)
    {
        if(!this._visible || this.inRecycle) return;
        this.renderFrame(this.currentFrame);
        this.currentFrame++;
        this._animTime += delta;
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
                this.visible = false;
            }else if(this._animSequence.length) {
                this._playNext();
            }else{
                this.currentFrame = this.loopStart;
            }
            this._animTime = 0;
        }
    },
    _playNext:function(){
        this._sequenceIndex++;
        if(this._sequenceIndex >= this._animSequence.length){
            if(!this._loopSequence) {
                this._animSequence = [];
                return;
            }
            this._sequenceIndex = 0;
        }
        var anims = this._animSequence;
        var anim = anims[this._sequenceIndex];
        if(typeof anim === "number"){
            if(this._loopSequence && this._sequenceIndex == anims.length - 1){
                this._sequenceIndex = 0;
            }else{
                this._sequenceIndex++;
            }
            if(anims.length > this._sequenceIndex && typeof anims[this._sequenceIndex] === "string"){
                var delay = anim;
                anim = anims[this._sequenceIndex];
                this.scheduleOnce(function(){
                    this.gotoAndPlay(anim);
                }, delay - this._animTime);
                this.updatePlaying(false);
            }else{
                this._animSequence = [];
                this.currentFrame = this.loopStart;
            }
        }else{
            this.gotoAndPlay(anim);
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
        this._updateCollider();
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
            if(!node.visible) continue;
            anchor = this.getAnchor(node.__anchor__);
            if(anchor == null) continue;
            this._updateAnchorNode(node, anchor);
        }
    },
    _updateAnchorNode:function(node, anchor)
    {
        if(anchor == null) return;
        node.x = anchor.x;
        node.y = anchor.y;
        node.zIndex = anchor.zIndex;
        node.rotation = anchor.rotation;
    },
    onEnter:function()
    {
        this._super();
        this.inRecycle = false;
        if(this._tileMap && !this._tileInited) {
            this._updateTileMap(true);
        }
        this._updateCollider();
        this._updateLaguage();
        //call the module onEnter
        lg.callModuleOnEnter(this);
    },
    onExit:function()
    {
        this._super();
        if(this._tileMap) this._tileMap.removeObject(this);
        lg.inputManager.removeListener(this);
        this.onAnimationOver.removeAll();
        //call the module onExit
        lg.callModuleOnExit(this);
    },
    _updateLaguage:function(){
        if(lg.languageIndex > -1 && this.name && this.name.indexOf("label__") > -1) this.gotoAndStop(lg.languageIndex);
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
        if(this._parent) {
            this._updateTileMap(true);
            this._updateCollider();
        }
    },
    _updateTileMap:function(forceUpdate){
        var pos = this._position;
        if(this.parent) pos = this.parent.convertToWorldSpace(pos);
        var t = this._tileMap.getTileIndex(pos);
        this.setTile(t.x, t.y, forceUpdate);
    },
    _updateCollider:function(){
//        if(this._mainCollider == null) {
//            this._mainCollider = lg.getRect(this, true);
//        }else{
        //todo
//            this._mainCollider = lg.getRect(this, true);
//        }
//        this.collidCenter.x = this._mainCollider.x + this._mainCollider.width/2;
//        this.collidCenter.y = this._mainCollider.y + this._mainCollider.height/2;
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
            this._updateTileMap();
        }
        this._updateCollider();
    },
    setPositionX:function (x) {
        this.setPosition(x, this._position.y);
    },
    setPositionY:function (y) {
        this.setPosition(this._position.x, y);
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
                var pool = lg.ObjectPool.get(this.plistFile, this.clsName, this.__pool__id__ || "");
                pool.recycle(this);
            }
        }
        this.removeFromParent();
    },
    /**
     * Do some thins when the object recycled by the pool
     * */
    onRecycle:function()
    {
        this.inRecycle = true;
        //when recycled, reset all the prarams as default
        this.autoRecycle = false;
        //todo, if reset zIndex to 0, when it is reused, the zIndex is not correct!
//        this.zIndex = 0;
        this.setScale(1);
        this.opacity = 255;
        this.rotation = 0;
        this.autoDestroyWhenOver = false;
        this.autoStopWhenOver = false;
        this.autoHideWhenOver = false;
        this.gotoAndStop(0);
        if(this._tileMap) this._tileMap.removeObject(this);
        lg.inputManager.removeListener(this);
        this._tileInited = false;
        this.setPosition(0, 0);
        this._animSequence.length = 0;
        this._loopSequence = false;
        this._sequenceIndex = 0;

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
    var tl = new lg.TimeLine(plistFile, assetID);
    tl.clsName = "lg.TimeLine";
    return tl;
};

window._p = lg.TimeLine.prototype;

/** @expose */
_p.mainCollider;
cc.defineGetterSetter(_p, "mainCollider", _p.getMainCollider);

/** @expose */
_p.center;
cc.defineGetterSetter(_p, "center", _p.getCenter);

_p.fps;
cc.defineGetterSetter(_p, "fps", _p.getFPS, _p.setFPS);

delete window._p;
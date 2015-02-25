/**
 * Created by long on 14-2-14.
 */
flax.Anchor = cc.Class.extend({
    x:0,
    y:0,
    zIndex:0,
    rotation:0,
    ctor:function(data){
        data = data.split(",");
        this.x = parseFloat(data[0]);
        this.y = parseFloat(data[1]);
        if(data.length > 2) this.zIndex = parseInt(data[2]);
        if(data.length > 3) this.rotation = parseFloat(data[3]);
    }
});

flax._sprite = {
    __instanceId:null,
    onAnimationOver:null,
    onSequenceOver:null,
    onFrameChanged:null,
    autoDestroyWhenOver:false,
    autoStopWhenOver:false,
    autoHideWhenOver:false,
    autoRecycle:false,
    currentFrame:0,
    currentAnim:null,
    prevFrame:-1,
    totalFrames:0,
    frameInterval:0,
    define:null,
    name:null,
    assetsFile:null,
    assetID:null,
    clsName:"flax.FlaxSprite",
    playing:false,
    _loopStart:0,
    _loopEnd:0,
    _isLanguageElement:false,
    __isFlaxSprite:true,
    __isInputMask:false,
    _fps:24,
    _colliders:null,
    _mainCollider:null,
    _physicsBody:null,
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
    _subAnims:null,
    _animSequence:null,
    _loopSequence:false,
    _sequenceIndex:0,
    _physicsToBeSet:null,
    _physicsBodyParam:null,
    _physicsColliders:null,

    ctor:function(assetsFile, assetID){
        if(this.clsName == "flax.FlaxSprite") throw  "flax.FlaxSprite is an abstract class, please use flax.Animator or flax.MovieClip!";
        if(this instanceof cc.SpriteBatchNode) cc.SpriteBatchNode.prototype.ctor.call(this, cc.path.changeExtname(assetsFile, ".png"));
        else cc.Sprite.prototype.ctor.call(this);
        if(!assetsFile || !assetID) throw "Please set assetsFile and assetID to me!"
        this.__instanceId = ClassManager.getNewInstanceId();
        this._anchorBindings = [];
        this._animSequence = [];
        this.onAnimationOver = new signals.Signal();
        this.onSequenceOver = new signals.Signal();
        this.onFrameChanged = new signals.Signal();
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
        if(this.assetsFile == assetsFile && (this.assetID == assetID || this._baseAssetID == assetID)) return;
        this.assetsFile = assetsFile;
        //see if there is a sub animation
        this.assetID = this._handleSumAnims(assetID);
        this.define = this.getDefine();
        //set the anchor
        var anchorX = this.define.anchorX;
        var anchorY = this.define.anchorY;
        if(!isNaN(anchorX) && !isNaN(anchorY)) {
            this.setAnchorPoint(anchorX, anchorY);
        }
        //set the fps from flash
        if(this.fps == 0) this.fps = this.define.fps;
        this.onNewSource();
        this.currentFrame = 0;
        this.renderFrame(this.currentFrame, true);
        this._initColliders();
        if(this.parent){
            this._updateLaguage();
        }
        if(this.__pool__id__ == null) this.__pool__id__ = this.assetID;
    },
    _handleSumAnims:function(assetID)
    {
        var ns = assetID.split("$");
        this._baseAssetID = ns[0];
        this._subAnims = flax.assetsManager.getSubAnims(this.assetsFile, this._baseAssetID);
        var anim = ns[1];
        if(anim == null && this._subAnims) anim = this._subAnims[0];
        assetID = this._baseAssetID;
        if(anim) {
            assetID = this._baseAssetID+"$"+anim;
            this.currentAnim = anim;
        }
        return assetID;
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
    getPhysicsBody:function(){
        return this._physicsBody;
    },
    getCollider:function(name){
        var c = null;
        if(this._colliders){
            var an = this._colliders[name];
            if(an != null) {
                c = an[this.currentFrame];
            }
        }
        if(c == null) cc.log("Warning: The collider: " + name + " can't be found at " + this.assetID + "of" + this.assetsFile + ", make sure you are a pro user!");
        return c;
    },
    createPhysics:function(type, fixedRotation, bullet){
        if(type == null) type = Box2D.Dynamics.b2Body.b2_dynamicBody;
        this._physicsBodyParam = {type:type, fixedRotation:fixedRotation, bullet:bullet};
        if(!this.parent) return null;
        if(this._physicsBody == null) {
            var def = new Box2D.Dynamics.b2BodyDef();
            def.type = type;
            def.fixedRotation = fixedRotation;
            def.bullet = bullet;
            def.userData = this;
            var pos = flax.getPosition(this, true);
            def.position.Set(pos.x / PTM_RATIO, pos.y / PTM_RATIO);
            this._physicsBody = flax.getPhysicsWorld().CreateBody(def);
            this._physicsBody.__rotationOffset = this.rotation;
        }
        return this._physicsBody;
    },
    destroyPhysics:function(){
        this.removePhysicsShape();
    },
    addPhysicsShape:function(name, density, friction,restitution, isSensor, catBits, maskBits){
        if(this._physicsBody == null) throw "Please createPhysics firstly!"
        var collider = this.getCollider(name);
        if(collider == null) {
            cc.log("There is no collider named: "+name);
            return null;
        }else if(collider.physicsFixture){
            return collider.physicsFixture;
        }
        var param = {density:density,friction:friction,restitution:restitution,isSensor:isSensor,catBits:catBits,maskBits:maskBits};
        if(this.parent) {
            var fixture = collider.createPhysics(density, friction, restitution, isSensor, catBits, maskBits);
            if(this._physicsColliders.indexOf(collider) == -1) this._physicsColliders.push(collider);
            return fixture;
        }
        if(this._physicsToBeSet == null) this._physicsToBeSet = {};
        if(this._physicsToBeSet[name] == null) this._physicsToBeSet[name] = param;
        return null;
    },
    /**
     * Remove the physics of name, if not set name, remove all
     * */
    removePhysicsShape:function(name){
        var i = this._physicsColliders.length;
        while(i--){
            var c = this._physicsColliders[i];
            if(name == null || c.name == name){
                c.destroyPhysics();
                this._physicsColliders.splice(i, 1);
            }
        }
        if(this._physicsColliders.length == 0){
            flax.removePhysicsBody(this._physicsBody);
            this._physicsBody = null;
        }
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
                    cd = this._colliders[k][frame] = new flax.Collider(cArr[frame]);
                    cd.name = k;
                    cd.owner = this;
                    if(k == "main" || k == "base") {
                        this._mainCollider = cd;
                    }
                }
            }
        }
        this._definedMainCollider = (this._mainCollider != null);
        if(!this._definedMainCollider){
            this._mainCollider = new flax.Collider("Rect,0,0," + this.width + "," + this.height + ",0", false);
            this._mainCollider.name = "main";
            this._mainCollider.owner = this;
        }
        this._physicsColliders = [];
    },
    getRect:function(global)
    {
        return this._mainCollider.getRect(global);
    },
    getCenter:function(global){
        return this._mainCollider.getCenter(global);
    },
    getAnchor:function(name)
    {
        if(this.define.anchors){
            var an = this.define.anchors[name];
            if(an != null) {
                return new flax.Anchor(an[this.currentFrame]);
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
    getCurrentLabel:function()
    {
        if(!this.define.labels) return null;
        var labels = this.define.labels;
        for(var name in labels)
        {
            var label = labels[name];
            if(this.currentFrame >= label.start && this.currentFrame <= label.end){
                return name;
            }
        }
        return null;
    },
    nextFrame:function(){
        this.gotoAndStop(Math.min(++this.currentFrame , this.totalFrames - 1));
    },
    prevFrame:function(){
        this.gotoAndStop(Math.max(--this.currentFrame , 0));
    },
    play:function()
    {
        //disable the language element and button to play
        if(this._isLanguageElement || this.__isButton) return;
        this._loopStart = 0;
        this._loopEnd = this.totalFrames - 1;
        this.updatePlaying(true);
        this.currentAnim = null
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
            if(!this.__isButton) cc.log("There is no animation named: " + anim);
            return false;
        }
        this.setSource(this.assetsFile, this._baseAssetID+"$"+anim);
        if(autoPlay === false) this.gotoAndStop(0);
        else this.gotoAndPlay(0);
        this.currentAnim = anim;
        this._animTime = 0;
        return true;
    },
    gotoAndPlay:function(frameOrLabel,forcePlay)
    {
        //disable the language element and button to play
        if(this._isLanguageElement || this.__isButton) return false;
        if(typeof frameOrLabel === "string") {
            if(this.playing && this.currentAnim == frameOrLabel && forcePlay !== true) return true;
            var lbl = this.getLabels(frameOrLabel);
            if(lbl == null){
                var has = this.setSubAnim(frameOrLabel, true);
                if(!has) {
                    cc.log("There is no animation named: " + frameOrLabel);
                    this.play();
                }
                return has;
            }
            this._loopStart = lbl.start;
            this._loopEnd = lbl.end;
            this.currentFrame = this._loopStart;
            this.currentAnim = frameOrLabel;
        }else{
            if(!this.isValideFrame(frameOrLabel))
            {
                cc.log("The frame: "+frameOrLabel +" is out of range!");
                return false;
            }
            this._loopStart = 0;
            this._loopEnd = this.totalFrames - 1;
            this.currentFrame = frameOrLabel;
            this.currentAnim = null;
        }
        this.renderFrame(this.currentFrame);
        this.updatePlaying(true);
        this._animTime = 0;
        return true;
    },
    stop:function()
    {
        this.updatePlaying(false);
        this.currentAnim = null
    },
    gotoAndStop:function(frameOrLabel)
    {
        //convert frame label to frame number
        if(isNaN(frameOrLabel)) {
            var lbl = this.getLabels(frameOrLabel);
            if(lbl == null){
                var has = this.setSubAnim(frameOrLabel, false);
                if(!has && !this.__isButton) cc.log("There is no animation named: " + frameOrLabel);
                return has;
            }
            frameOrLabel = lbl.start;
        }
        this.currentAnim = null;

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
        if(!this.visible) return;
        this.currentFrame++;
        this._animTime += delta;
        if(this.currentFrame > this._loopEnd)
        {
            this.currentFrame = this._loopEnd;
            if(this.autoDestroyWhenOver || this.autoStopWhenOver || this.autoHideWhenOver){
                this.updatePlaying(false);
            }
            if(this.onAnimationOver.getNumListeners())
            {
                this.onAnimationOver.dispatch(this);
            }
            if(this.autoDestroyWhenOver){
                this.destroy();
            }else if(this.autoHideWhenOver){
                this.visible = false;
            }else if(this._animSequence.length){
                this._playNext();
            }else if(!this.autoStopWhenOver){
                this.currentFrame = this._loopStart;
            }
            this._animTime = 0;
        }
        if(this.currentFrame > this._loopEnd || this.currentFrame > this.totalFrames - 1) this.currentFrame = this._loopStart;
        this.renderFrame(this.currentFrame);
    },
    _playNext:function(){
        this._sequenceIndex++;
        if(this._sequenceIndex >= this._animSequence.length){
            if(this.onSequenceOver.getNumListeners()){
                this.onSequenceOver.dispatch(this);
            }
            if(!this._loopSequence) {
                this.gotoAndPlay(this._animSequence[this._sequenceIndex - 1], true);
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
                this.currentFrame = this._loopStart;
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
        if(this.onFrameChanged.getNumListeners()) this.onFrameChanged.dispatch(this.currentFrame);
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
        this._destroyed = false;
        if(this._tileMap && !this._tileInited) {
            this.updateTile(true);
        }
        this._updateCollider();
        if(this._physicsBodyParam) {
            this.createPhysics(this._physicsBodyParam.type, this._physicsBodyParam.fixedRotation, this._physicsBodyParam.bullet);
        }
        if(this._physicsToBeSet){
            for(var name in this._physicsToBeSet){
                var collider = this.getCollider(name);
                var param = this._physicsToBeSet[name];
                collider.createPhysics(param.density, param.friction, param.restitution, param.isSensor, param.catBits, param.maskBits);
                delete this._physicsToBeSet[name];
                if(this._physicsColliders.indexOf(collider) == -1) this._physicsColliders.push(collider);
            }
        }
        this._updateLaguage();
        //call the module onEnter
        flax.callModuleOnEnter(this);

        if(this.__fromPool){
            this.__fromPool = false;
            this.release();
        }
    },
    onExit:function()
    {
        this._super();

        this.onAnimationOver.removeAll();
        this.onSequenceOver.removeAll();
        this.onFrameChanged.removeAll();
        flax.inputManager.removeListener(this);
        if(this.__isInputMask) flax.inputManager.removeMask(this);

        //remove tilemap
        if(this._tileMap) this._tileMap.removeObject(this);
        this._tileMap = null;

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

        //remove physics
        for(var i = 0; i < this._physicsColliders.length; i++){
            this._physicsColliders[i].destroyPhysics();
        }
        this._physicsColliders = [];

        if(this._physicsBody){
            flax.removePhysicsBody(this._physicsBody);
            this._physicsBody = null;
        }
        this._physicsBodyParam = null;
        //call the module onExit
        flax.callModuleOnExit(this);
    },
    _updateLaguage:function(){
        this._isLanguageElement = (flax.languageIndex > -1 && this.name && this.name.indexOf("label__") == 0);
        if(this._isLanguageElement){
            if(!this.gotoAndStop(flax.languageIndex)){
                this.gotoAndStop(0);
            }
        }
    },
    getTileMap:function()
    {
        return this._tileMap;
    },
    setTileMap:function(map)
    {
        if(map && !(map instanceof flax.TileMap)) map = flax.getTileMap(map);
        if(this._tileMap == map) return;
        if(this._tileMap) this._tileMap.removeObject(this);
        this._tileMap = map;
        if(this._tileMap == null) return;

        if(this.parent) {
            this.updateTile(true);
            this._updateCollider();
        }
    },
    updateTile:function(forceUpdate){
        if(!this._tileMap) return;
        var pos = this.getPosition();
        if(this.parent) pos = this.parent.convertToWorldSpace(pos);
        var t = this._tileMap.getTileIndex(pos);
        this.setTile(t.x, t.y, forceUpdate);
    },
    _updateCollider:function(){
//        if(this._mainCollider == null) {
//            this._mainCollider = flax.getRect(this, true);
//        }else{
        //todo
//            this._mainCollider = flax.getRect(this, true);
//        }
//        this.collidCenter.x = this._mainCollider.x + this._mainCollider.width/2;
//        this.collidCenter.y = this._mainCollider.y + this._mainCollider.height/2;
    },
    setPosition:function(pos, yValue)
    {
        var dirty = false;
        if(yValue === undefined) {
            dirty = (pos.x != this.x || pos.y != this.y);
            if(dirty) this._super(pos);
        }else {
            dirty = (pos != this.x || yValue != this.y);
            if(dirty) this._super(pos, yValue);
        }
        if(!dirty || !this.parent) return;
        if(this.autoUpdateTileWhenMove && this._tileMap){
            this.updateTile();
        }
        this._updateCollider();
    },
    setPositionX:function (x) {
        this.setPosition(x, this.y);
    },
    setPositionY:function (y) {
        this.setPosition(this.x, y);
    },
    setTile:function(tx, ty, forceUpdate)
    {
        if (forceUpdate === true || tx != this.tx || ty != this.ty) {
            var oldTx = this.tx;
            var oldTy = this.ty;
            this.tx = tx;
            this.ty = ty;
            if(this._tileMap && this.parent)
            {
                this._tileMap.removeObject(this, oldTx, oldTy);
                if(this.parent) {
                    this._tileMap.addObject(this);
                    this._tileInited = true;
                }
            }
        }else {
            //update the zOrder sort in the tile
//            this._tileMap.updateLayout(tx, ty);
        }
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
        this.autoDestroyWhenOver = false;
        this.autoStopWhenOver = false;
        this.autoHideWhenOver = false;
        this.gotoAndStop(0);

        this._tileInited = false;
        this.setPosition(0, 0);
        this._animSequence.length = 0;
        this._loopSequence = false;
        this._sequenceIndex = 0;
        this.currentAnim = null;
        this.__isInputMask = false;
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
    onNewSource:function()
    {

    }
}
/////////////////////////////////////////////////////////////
flax.FlaxSprite = cc.Sprite.extend(flax._sprite);
flax.FlaxSprite.create = function(assetsFile, assetID)
{
    var tl = new flax.FlaxSprite(assetsFile, assetID);
    tl.clsName = "flax.FlaxSprite";
    return tl;
};
/////////////////////////////////////////////////////////////
flax.FlaxSpriteBatch = cc.SpriteBatchNode.extend(flax._sprite);
flax.FlaxSpriteBatch.create = function(assetsFile, assetID)
{
    var tl = new flax.FlaxSpriteBatch(assetsFile, assetID);
    tl.clsName = "flax.FlaxSpriteBatch";
    return tl;
}

/////////////////////////////////////////////////////////////
window._p = flax.FlaxSprite.prototype;
/** @expose */
_p.mainCollider;
cc.defineGetterSetter(_p, "mainCollider", _p.getMainCollider);
/** @expose */
_p.physicsBody;
cc.defineGetterSetter(_p, "physicsBody", _p.getPhysicsBody);
/** @expose */
_p.center;
cc.defineGetterSetter(_p, "center", _p.getCenter);
/** @expose */
_p.fps;
cc.defineGetterSetter(_p, "fps", _p.getFPS, _p.setFPS);
/** @expose */
_p.tileMap;
cc.defineGetterSetter(_p, "tileMap", _p.getTileMap, _p.setTileMap);
/** @expose */
_p.currentLabel;
cc.defineGetterSetter(_p, "currentLabel", _p.getCurrentLabel);
//fix the .x, .y bug no invoking setPosition mehtod
try{
    /** @expose */
    _p.x;
    cc.defineGetterSetter(_p, "x", _p.getPositionX, _p.setPositionX);
    /** @expose */
    _p.y;
    cc.defineGetterSetter(_p, "y", _p.getPositionY, _p.setPositionY);
}catch (e){

}
//////////////////////////////////////////////////////////////////////

window._p = flax.FlaxSpriteBatch.prototype;

/** @expose */
_p.mainCollider;
cc.defineGetterSetter(_p, "mainCollider", _p.getMainCollider);
/** @expose */
_p.physicsBody;
cc.defineGetterSetter(_p, "physicsBody", _p.getPhysicsBody);
/** @expose */
_p.center;
cc.defineGetterSetter(_p, "center", _p.getCenter);
/** @expose */
_p.fps;
cc.defineGetterSetter(_p, "fps", _p.getFPS, _p.setFPS);
/** @expose */
_p.tileMap;
cc.defineGetterSetter(_p, "tileMap", _p.getTileMap, _p.setTileMap);
/** @expose */
_p.currentLabel;
cc.defineGetterSetter(_p, "currentLabel", _p.getCurrentLabel);
//fix the .x, .y bug no invoking setPosition mehtod
try{
    /** @expose */
    _p.x;
    cc.defineGetterSetter(_p, "x", _p.getPositionX, _p.setPositionX);
    /** @expose */
    _p.y;
    cc.defineGetterSetter(_p, "y", _p.getPositionY, _p.setPositionY);
}catch (e){

}

delete window._p;
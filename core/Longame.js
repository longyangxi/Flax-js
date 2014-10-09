/**
 * Created by long on 14-2-2.
 */
PTM_RATIO = 32;
RADIAN_TO_DEGREE = 180.0/Math.PI;
DEGREE_TO_RADIAN = Math.PI/180.0;
IMAGE_TYPES = ["png", "jpg", "bmp","jpeg","gif"];
H_ALIGHS = ["left","center","right"];
LANGUAGES = ['en','de','fr','it','es','tr','pt','ru','cn'];

var lg = lg || {};

lg.version = 1.41;
lg.language = null;
lg.languageIndex = -1;
lg.landscape = false;
lg.osVersion = "unknown";
lg.assetsManager = null;
lg.inputManager = null;
lg.currentSceneName = "";
lg.currentScene = null;
lg.buttonSound = null;
lg.frameInterval = 1/60;
lg._scenesDict = {};
lg._resourcesLoaded = [];
lg._soundEnabled = true;
lg._inited = false;
lg._orientationTip = null;
lg._languageDict = null;
lg._languageToLoad = null;
/**Fixed the grey banner on the botton when landscape*/
document.body.scrollTop = 0;

lg.init = function()
{
    if(lg._inited) return;
    lg._inited = true;
    lg._checkOSVersion();

    lg.frameInterval = 1/cc.game.config.frameRate;
    lg.assetsManager = lg.AssetsManager.create();
    lg.inputManager = lg.InputManager.create();
    if(cc.game.config.timeScale)  cc.director.getScheduler().setTimeScale(cc.game.config.timeScale);

    var lan = cc.game.config.language;
    if(lan == null || lan == "") lan = cc.sys.language;
    lg.updateLanguage(lan);
}
lg.getLanguageStr = function(key){
    if(lg._languageDict == null) {
        cc.log("Error: there is no language defined: "+lg.language);
        return null;
    }
    var str = lg._languageDict[key];
    if(str == null) cc.log("Warning: there is no language string for key: "+key);
    //todo, more param replace
    return str;
}
lg.updateLanguage = function(lan){
    if(lan == null || lan == "" || lan == lg.language) return;
    lg.language = lan;
    lg.languageIndex = LANGUAGES.indexOf(lan);
    if(lg.languageIndex == -1) cc.log("Invalid language: " + lan);
    else lg._languageToLoad = lg._getLanguagePath(lan);
}
lg._getLanguagePath = function(lan){
    return  "res/locale/"+(lan || lg.language)+".json";
}
/**
 * Add a function module to some class
 * The function in the class will override the same name function in the module
 * But if override === true, the function in the module will override the same name function in the class,
 * Note: if the owner is not a lg.TimeLine and its successor,
 * pls call lg.callModuleOnEnter(this) within onEnter and call lg.callModuleOnExit(this) within onExit
 * */
lg.addModule = function(cls, module, override){
    for(var k in module){
        if(k === "onEnter"){
            if(cls.prototype.__onEnterNum === undefined) cls.prototype.__onEnterNum = 0;
            else cls.prototype.__onEnterNum++;
            cls.prototype["__onEnter"+cls.prototype.__onEnterNum] = module.onEnter;
        }else if(k === "onExit"){
            if(cls.prototype.__onExitNum === undefined) cls.prototype.__onExitNum = 0;
            else cls.prototype.__onExitNum++;
            cls.prototype["__onExit"+cls.prototype.__onExitNum] = module.onExit;
        }else if(override === true || !cls.prototype[k]){
            cls.prototype[k] = module[k];
        }
    }
}
lg.callModuleOnEnter = function(owner){
    if(owner.__onEnterNum !== undefined){
        var i = owner.__onEnterNum;
        while(i >= 0){
            owner["__onEnter"+i]();
            i--;
        }
    }
}
lg.callModuleOnExit = function(owner){
    if(owner.__onExitNum !== undefined){
        var i = owner.__onExitNum;
        while(i >= 0){
            owner["__onExit"+i]();
            i--;
        }
    }
}

//todo, now only handle the mobile device
lg._checkOSVersion = function(){
    var ua = navigator.userAgent;
    var i;
    if(ua.match(/iPad/i) || ua.match(/iPhone/i)){
        i = ua.indexOf( 'OS ' );
        cc.sys.os = cc.sys.OS_IOS;
        if(i > -1) lg.osVersion = ua.substr( i + 3, 3 ).replace( '_', '.' );
    }else if(ua.match(/Android/i)){
        i = ua.indexOf( 'Android ' );
        cc.sys.os = cc.sys.OS_ANDROID;
        if(i > -1) lg.osVersion = ua.substr( i + 8, 3 );
    }
}

lg.registerScene = function(name, scene, resources)
{
    lg.init();
    lg._scenesDict[name] = {scene:scene, res:resources};
}
lg.replaceScene = function(sceneName)
{
    var s = lg._scenesDict[sceneName];
    if(s == null){
        throw "Please register the scene: "+sceneName+" firstly!";
        return;
    }
    if(lg._languageToLoad && s.res.indexOf(lg._languageToLoad) == -1){
        s.res.push(lg._languageToLoad);
    }
    lg.ObjectPool.release();
    if(lg.BulletCanvas) lg.BulletCanvas.reset();
    if(lg.Label) lg.Label.pool = {};
    cc.director.resume();
    lg.currentSceneName = sceneName;
    lg.inputManager.removeFromParent(false);
    if(lg.stopPhysicsWorld) lg.stopPhysicsWorld();
    lg.currentScene = new s.scene();
    lg.preload(s.res,function(){
        //init language
        if(lg._languageToLoad){
            lg._languageDict = cc.loader.getRes(lg._getLanguagePath());
            lg._languageToLoad = null;
        }
        lg.currentScene.addChild(lg.inputManager, 999999);
        cc.director.runScene(lg.currentScene);
        lg._checkDeviceOrientation();
    });
}
lg._tileMaps = {};
lg.getTileMap = function(id)
{
    if(typeof lg._tileMaps[id] !== "undefined") return lg._tileMaps[id];
    cc.log("The tileMap: "+id+" hasn't been defined, pls use lg.registerTileMap to define it firstly!");
    return null;
}
lg.registerTileMap = function(tileMap)
{
    lg._tileMaps[tileMap.id] = tileMap;
}
//----------------------scene about-------------------------------------------------------

//----------------------sound about-------------------------------------------------------
lg.setSoundEnabled = function(value)
{
    if(lg._soundEnabled == value) return;
    lg._soundEnabled = value;
    var audioEngine = cc.audioEngine;
    if(value)
    {
        audioEngine.resumeMusic();
        if(lg._lastMusic) {
            lg.playMusic(lg._lastMusic, true);
            lg._lastMusic = null;
        }
    }else{
        audioEngine.pauseMusic();
        audioEngine.stopAllEffects();
    }
}
lg.getSoundEnabled = function() {
    return lg._soundEnabled;
}
lg._lastMusic = null;
lg.playMusic = function(path, loop)
{
    var audioEngine = cc.audioEngine;
    audioEngine.stopMusic(true);
    if(lg._soundEnabled){
        audioEngine.playMusic(path, loop);
    }else{
        lg._lastMusic = path;
    }
}
lg.playSound = function(path)
{
    if(lg._soundEnabled){
        cc.audioEngine.playEffect(path);
    }
}
//----------------------sound about-------------------------------------------------------
lg._checkDeviceOrientation = function(){
    if(!lg._orientationTip && cc.sys.isMobile && cc.game.config.rotateImg){
        lg._orientationTip = cc.LayerColor.create(cc.color(0,0,0), cc.visibleRect.width + 10, cc.visibleRect.height +10);
        var img =  cc.Sprite.create(cc.game.config.rotateImg);
        img.setPosition(cc.visibleRect.center);
        lg._orientationTip.__icon = img;
        lg._orientationTip.addChild(img);
        var orientationEvent = ("onorientationchange" in window) ? "orientationchange" : "resize";
        window.addEventListener(orientationEvent, lg._showOrientaionTip, true);
        lg._showOrientaionTip();
    }
    if(lg._orientationTip){
        lg._orientationTip.removeFromParent();
        lg.currentScene.addChild(lg._orientationTip, 1000000);
    }
}
lg._oldGamePauseState = false;
lg._showOrientaionTip = function(){
    lg.landscape = (Math.abs(window.orientation) == 90);
    lg._orientationTip.visible = (cc.game.config.landscape != lg.landscape);
    lg._orientationTip.__icon.rotation = (lg.landscape ? -90 : 0);
    document.body.scrollTop = 0;
    if(lg._orientationTip.visible) {
        lg._oldGamePauseState = cc.director.isPaused();
        cc.director.pause();
    }else if(!lg._oldGamePauseState){
        cc.director.resume();
    }
}

///---------------------utils-------------------------------------------------------------
lg.getAngle = function(startPoint, endPoint, forDegree)
{
    var dx = endPoint.x - startPoint.x;
    var dy = endPoint.y - startPoint.y;
    return lg.getAngle1(dx, dy, forDegree);
};
lg.getAngle1 = function(dx, dy, forDegree)
{
    if(forDegree === undefined) forDegree = true;
    var angle = Math.atan2(dx, dy);
    if(angle < 0) angle += 2*Math.PI;
    if(forDegree)
    {
        angle *= RADIAN_TO_DEGREE;
    }
    return angle;
};
lg.getPointOnCircle = function(center, radius, angleDegree)
{
    angleDegree = 90 - angleDegree;
    angleDegree *= DEGREE_TO_RADIAN;
    if(center == null) center = cc.p();
    return cc.pAdd(center, cc.p(radius*Math.cos(angleDegree), radius*Math.sin(angleDegree)));
};
lg.getPosition = function(sprite, global)
{
    var pos = sprite.getPosition();
    if(global === true && sprite.parent) pos = sprite.parent.convertToWorldSpace(pos);
    return pos;
};
/**
 * Get the sprite's global rotation, if the sprite rotated 30 and the parent rotated -15, then the sprite's global rotation is 15
 * */
lg.getRotation = function(sprite, global)
{
    if(global !== true) return sprite.rotation;
    var r = 0;
    var p = sprite;
    while(p)
    {
        r += p.rotation;
        p = p.parent;
    }
    return r;
};
/**
 * Get the sprite's global scale
 * */
lg.getScale = function(sprite, global)
{
    if(global !== true) return cc.p(sprite.scaleX, sprite.scaleY);
    var sx = 1.0;
    var sy = 1.0;
    var p = sprite;
    while(p)
    {
        sx *= p.scaleX;
        sy *= p.scaleY;
        p = p.parent;
    }
    return cc.p(sx, sy);
};
/**
 * Get the bounding rect of the sprite, maybe should refer the getBoundingBoxToWorld of the cc.Node
 * */
lg.getRect = function(sprite, global)
{
    var rect;
    if(sprite.getRect) {
        rect = sprite.getRect(global);
        return rect;
    }
    global = (global !== false);
    var pos = sprite.getPosition();
    if(global && sprite.parent) pos = sprite.parent.convertToWorldSpace(pos);
    var size = sprite.getContentSize();
    var anchor = sprite.getAnchorPoint();
    rect = cc.rect(pos.x - size.width * anchor.x,pos.y - size.height * anchor.y,size.width, size.height);
    return rect;
};

lg.ifTouched = function(target, pos)
{
    if(target == null) return false;
    if(!(target instanceof cc.Node)) return false;
    //if its lg.TimeLine
    if(target.mainCollider){
        return target.mainCollider.containPoint(pos);
    }
    var local = target.convertToNodeSpace(pos);
    var r = lg.getRect(target,false);
    return cc.rectContainsPoint(r, local);
};
lg.ifCollide = function(sprite1, sprite2)
{
    return sprite1.mainCollider.checkCollision(sprite2.mainCollider);
};
lg.isChildOf = function(child, parent)
{
    if(child == null || parent == null) return false;
    if(child == parent) return false;
    var p = child.parent;
    while(p)
    {
        if(p == parent) return true;
        p = p.parent;
    }
    return false;
};

lg.findParentWithClass = function(sprite, cls)
{
    var p = sprite;
    while(p){
        if(p instanceof cls) return p;
        p = p.parent;
    }
    return null;
}

lg.findChildWithClass = function(sprite, cls)
{
    var children = sprite.children;
    var i = children.length;
    var child;
    while(i--){
        child = children[i];
        if(child instanceof cls) return child;
        child = lg.findChildWithClass(child, cls);
        if(child) return child;
    }
    return null;
}

/**
 * Convert a name to a Object or a Function
 * @param {String}name cc.Sprite
 * @param {String}type function or object, defaut is function
 * */
lg.nameToObject = function(name, type) {
    if(name == undefined || name == "") return null;
    type = type || "function";
    var arr = name.split(".");

    var fn = (window || this);
    for (var i = 0, len = arr.length; i < len; i++) {
        try{
            fn = fn[arr[i]];
        }catch(err){
            break;
        }
    }
    if (typeof fn !== type) {
//        cc.log(type +" not found: " + name);
        return null;
    }
    return  fn;
};
lg.createBGLayer = function(scene, color)
{
    if(color == null) color = cc.color(255, 255, 255, 255);
    var layer = cc.LayerColor.create(color, cc.visibleRect.width, cc.visibleRect.height);
    scene.addChild(layer, 0);
    return layer;
};

Array.prototype.shuffle = function(len)
{
    if(len === undefined || len <= 0 || len > this.length) len = this.length;
    for (var i = len - 1; i >= 0; i--) {
        var j = 0 | (cc.rand() % (i + 1));
        var v = this[i];
        this[i] = this[j];
        this[j] = v;
    }
};
lg.restrictValue = function(value, min, max)
{
    value = Math.max(min, value);
    value = Math.min(max, value);
    return value;
}
lg.numberSign = function(number){
    if(number == 0) return 0;
    return number > 0 ? 1 : -1;
}
lg.randInt = function (start, end)
{
    return start + Math.floor(Math.random()*(end - start));
};
lg.getRandomInArray = function (arr)
{
    if(arr == null) return null;
    var i = lg.randInt(0, arr.length);
    return arr[i];
};

lg.getFileExtension = function(path)
{
    var ext = path.substring(path.lastIndexOf(".") + 1,path.length);
    var index = ext.indexOf("?");
    if(index > 0) ext = ext.substring(0, index);
    return ext;
};
lg.isImageFile = function(path)
{
    var ext = lg.getFileExtension(path);
    return IMAGE_TYPES.indexOf(ext) > -1;
};
/**
 * Copy all the properties of params to target if it own the property
 * */
lg.copyProperties = function(params, target)
{
    if(params == null || target == null) return;
    for(var k in params){
        try{
            target[k] = params[k];
        }catch (err) {

        }
    }
};

/**
 * Create an int array like this: [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7, ...]
 * */
lg.createDInts = function(count, centerInt)
{
    if(isNaN(centerInt)) centerInt = 0;
    var ds = [];
    var i = -1;
    var d0 = centerInt - 1;
    var d1 = centerInt;
    while(++i < count){
        if(i%2 == 0) {
            ds.push(++d0);
        }else{
            ds.push(--d1);
        }
    }
    return ds;
};
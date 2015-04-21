/**
 * Created by long on 14-2-2.
 */
PTM_RATIO = 32;
RADIAN_TO_DEGREE = 180.0/Math.PI;
DEGREE_TO_RADIAN = Math.PI/180.0;
IMAGE_TYPES = [".png", ".jpg", ".bmp",".jpeg",".gif"];
SOUND_TYPES = [".mp3", ".ogg", ".wav", ".mp4", ".m4a"];
DEFAULT_SOUNDS_FOLDER = "res/music/";
H_ALIGHS = ["left","center","right"];

var TileValue = TileValue || {
    WALKABLE:0,
    BLOCK1:1,
    BLOCK2:2,
    BLOCK3:3,
    BLOCK4:4,
    BLOCK5:5
};

var flax = flax || {};

//Avoid to advanced compile mode
window['flax'] = flax;

flax.version = 2.0;
flax.minToolVersion = 2.0;
flax.language = null;
flax.languageIndex = -1;
flax.languages = ["en","zh","de","fr","it","es","tr","pt","ru"];
flax.landscape = false;
flax.osVersion = "unknown";
flax.assetsManager = null;
flax.inputManager = null;
flax.currentSceneName = "";
flax.currentScene = null;
flax.buttonSound = null;
flax.frameInterval = 1/60;
flax._scenesDict = {};
flax._soundEnabled = true;
flax._inited = false;
flax._orientationTip = null;
flax._languageDict = null;
flax._languageToLoad = null;

flax._addResVersion = function(url)
{
    if(cc.sys.isNative  || typeof url != "string" || flax.isSoundFile(url)) return url;
    if(url.indexOf("?v=") > -1) return url;
    return url + "?v=" + cc.game.config["version"];
};
flax._removeResVersion = function(url)
{
    if(cc.sys.isNative  || typeof url != "string" || flax.isSoundFile(url)) return url;
    var i = url.indexOf("?v=");
    if(i > -1) url = url.substr(0, i);
    return url;
};
flax.isDomainAllowed = function()
{
    if(cc.sys.isNative) return true;
    var domain = document.domain;
    var domainAllowed = cc.game.config["domainAllowed"];
    return flax.isLocalDebug() || domainAllowed == null || domainAllowed.length == 0 || domainAllowed.indexOf(domain) > -1;
};
flax.isLocalDebug = function()
{
    if(cc.sys.isNative) return false;
    var domain = document.domain;
    return domain == "localhost" || domain.indexOf("192.168.") == 0;
};
if(!cc.sys.isNative){
    //if local debug, make the version randomly, so every time debug is refresh
    if(flax.isLocalDebug()) {
        cc.game.config["version"] = 1 + Math.floor(Math.random()*(999999 - 1))
    }
//set the game canvas color as html body color
    /************************************************/
        //delay call to override the black color setting in js-boot.js
    setTimeout(function(){
        var bgColor = document.body.style.backgroundColor;
        var canvasNode = document.getElementById(cc.game.config["id"]);
        canvasNode.style.backgroundColor = bgColor;

        bgColor = bgColor.replace("rgb(","");
        bgColor = bgColor.replace(")", "");
        bgColor = bgColor.split(",");
        flax.bgColor = cc.color(parseInt(bgColor[0]), parseInt(bgColor[1]), parseInt(bgColor[2]));
    }, 0.01);
    /**Fixed the grey banner on the botton when landscape when in iOS*/
    if(cc.sys.isMobile){
        var __hideBottomBar = function(){
            document.body.scrollTop = 0;
        };
        var orientationEvent = ("onorientationchange" in window) ? "orientationchange" : "resize";
        window.addEventListener(orientationEvent, __hideBottomBar, true);
        __hideBottomBar();
    }
    /************************************************/
}
/**
 * @param {cc.ResolutionPolicy} resolutionPolicy resolution policy
 * @param {Object} initialUserData initial user data
 * */
flax.init = function(resolutionPolicy, initialUserData)
{
    if(flax._inited) return;
    flax._inited = true;
    cc.log("Flax inited, version: "+flax.version);

    if(resolutionPolicy == null) resolutionPolicy = cc.ResolutionPolicy.SHOW_ALL;
    if(flax.fetchUserData) flax.fetchUserData(initialUserData);
    flax._checkOSVersion();

    var width = cc.game.config["width"];
    var height = cc.game.config["height"];
    if(!width || !height) throw "Please set the game width and height in the project.json!"
    if(!cc.sys.isNative){
        var stg = document.getElementById(cc.game.config["id"]);
        stg.width = width = width || stg.width;
        stg.height = height = height || stg.height;
        cc.view.adjustViewPort(true);
        cc.view.setDesignResolutionSize(width, height, resolutionPolicy);
        cc.view.resizeWithBrowserSize(true);
    }else{
        cc.view.setDesignResolutionSize(width, height, resolutionPolicy);
    }

    flax.frameInterval = 1/cc.game.config["frameRate"];
    flax.assetsManager = flax.AssetsManager.create();
    //if(cc.game.config.timeScale)  cc.director.getScheduler().setTimeScale(cc.game.config.timeScale);

    var lan = cc.game.config["language"];
    if(lan == null || lan == "") {
        if(flax.language == null) {
            lan = cc.sys.language;
            flax.updateLanguage(lan);
        }
    }else{
        flax.updateLanguage(lan);
    }
};

flax.getLanguageStr = function(key){
    if(flax._languageDict == null) {
        cc.log("Warning: there is no language defined: "+flax.language);
        return null;
    }
    var str = flax._languageDict[key];
    if(str == null) cc.log("Warning: there is no language string for key: "+key);
    //todo, more param replace
    return str;
};
flax.updateLanguage = function(lan){
    if(lan == null || lan == "" || lan == flax.language) return;
    flax.language = lan;
    if(cc.game.config["languages"] && cc.game.config["languages"].length) flax.languages = cc.game.config["languages"];
    flax.languageIndex = flax.languages.indexOf(lan);
    if(flax.languageIndex == -1) cc.log("Invalid language: " + lan);
    if(cc.game.config["languageJson"]) flax._languageToLoad = flax._getLanguagePath(lan);
};
flax._getLanguagePath = function(lan){
    return  "res/locale/"+(lan || flax.language)+".json";
};
/**
 * Add a function module to some class
 * The function in the class will override the same name function in the module
 * But if override === true, the function in the module will override the same name function in the class,
 * Note: if the owner is not a flax.FlaxSprite and its successor,
 * pls call flax.callModuleOnEnter(this) within onEnter and call flax.callModuleOnExit(this) within onExit
 * */
flax.addModule = function(cls, module, override){
    if(module == null){
        throw "Module can not be null!"
    }
    for(var k in module){
        if(k.indexOf("on") == 0){
            var nk = "__" + k;
            var kn = nk + "Num";
            if(cls.prototype[kn] === undefined) cls.prototype[kn] = 0;
            else cls.prototype[kn]++;
            cls.prototype[nk + cls.prototype[kn]] = module[k];
        }else if(override === true || !cls.prototype[k]){
            cls.prototype[k] = module[k];
        }
    }
};
flax.callModuleFuction = function(owner, funcName, params){
    funcName = "__" + funcName;
    var num = owner[funcName + "Num"];
    if(num !== undefined){
        var i = num;
        while(i >= 0){
            owner[funcName+i](params);
            i--;
        }
    }else if(owner[funcName]){
        owner[funcName](params);
    }
};
flax.callModuleOnEnter = function(owner){
    flax.callModuleFuction(owner, "onEnter");
};
flax.callModuleOnExit = function(owner){
    flax.callModuleFuction(owner, "onExit");
};

flax._checkOSVersion = function(){
    if(cc.sys.isNative) return;
    var ua = navigator.userAgent;
    var i;
    if(ua.match(/iPad/i) || ua.match(/iPhone/i)){
        i = ua.indexOf( 'OS ' );
        cc.sys.os = cc.sys.OS_IOS;
        if(i > -1) flax.osVersion = ua.substr( i + 3, 3 ).replace( '_', '.' );
    }else if(ua.match(/Android/i)){
        i = ua.indexOf( 'Android ' );
        cc.sys.os = cc.sys.OS_ANDROID;
        if(i > -1) flax.osVersion = ua.substr( i + 8, 3 );
    }
};

flax.registerScene = function(name, scene, resources)
{
    if(!resources) resources = [];
    if(!(resources instanceof Array)) resources = [resources];
    flax._scenesDict[name] = {scene:scene, res:resources};
};
/**
 * Replace the current scene
 * @param {String} sceneName the scene name registered
 * @param {cc.TransitionXXX} transition the transition effect for this scene switch
 * @param {Number} duration the duration for the transition
 * */
flax.replaceScene = function(sceneName, transition, duration)
{
    if(!flax.isDomainAllowed()) return;
    var s = flax._scenesDict[sceneName];
    if(s == null){
        throw "Please register the scene: "+sceneName+" firstly!";
        return;
    }
    //to load the language resource
    if(flax._languageToLoad && s.res.indexOf(flax._languageToLoad) == -1){
        s.res.push(flax._languageToLoad);
    }
    //to load the font resources
    if(flax._fontResources) {
        for(var fontName in flax._fontResources) {
            s.res.push({type:"font", name:fontName, srcs:flax._fontResources[fontName]});
        }
    }
    if(flax.ObjectPool) flax.ObjectPool.release();
    if(flax.BulletCanvas) flax.BulletCanvas.release();
    cc.director.resume();
    flax.currentSceneName = sceneName;
    if(flax.stopPhysicsWorld) flax.stopPhysicsWorld();
    if(flax.inputManager) flax.inputManager.removeFromParent();
    flax.preload(s.res,function(){
        //init language
        if(flax._languageToLoad){
            flax._languageDict = cc.loader.getRes(flax._getLanguagePath());
            var i = s.res.indexOf(flax._languageToLoad);
            if(i > -1) s.res.splice(i, 1);
            flax._languageToLoad = null;
        }
        //remove the font resources
        if(flax._fontResources){
            var i = s.res.length;
            while(i--){
                if(typeof s.res[i] == "object") s.res.splice(i, 1);
            }
            flax._fontResources = null;
        }
        flax.currentScene = new s.scene();
        var transitioned = false;
        if(transition){
            if(!duration || duration < 0) duration = 0.5;
            var tScene = transition.create(duration,flax.currentScene);
            if(tScene){
                transitioned = true;
                cc.director.runScene(tScene);
            }
        }
        if(!transitioned){
            cc.director.runScene(flax.currentScene);
        }
        flax.inputManager = new flax.InputManager();
        flax.currentScene.addChild(flax.inputManager, 999999);
        flax._checkDeviceOrientation();
    });
};
/**
 * Refresh current scene
 * */
flax.refreshScene = function()
{
    if(flax.currentSceneName){
        flax.replaceScene(flax.currentSceneName);
    }
};
flax._soundResources = {};
flax.preload = function(res, callBack)
{
    if(res == null || res.length == 0) {
        callBack();
        return;
    }
    var needLoad = false;
    var res1 = [];
    var i = res.length;
    while(i--)
    {
        var r = res[i];
        if(r == null) throw "There is a null resource!";
        if(cc.loader.getRes(r) == null && flax._soundResources[r] == null) {
            //in mobile web or jsb, .flax is not good now, so replace it  to .plist and .png
            if(typeof r == "string" && cc.path.extname(r) == ".flax" && (cc.sys.isNative || cc.game.config["useFlaxRes"] === false)){
                if(cc.sys.isNative) cc.log("***Warning: .flax is not support JSB for now, use .plist + .png insteadly!");
                var plist = cc.path.changeBasename(r,".plist");
                var png = cc.path.changeBasename(r,".png");
                if(cc.loader.getRes(png) == null) {
                    res1.unshift(flax._addResVersion(plist));
                    res1.unshift(flax._addResVersion(png));
                    needLoad = true;
                }
            }else{
                needLoad = true;
                res1.unshift(flax._addResVersion(r));
            }
        }
    }
    if(needLoad){
        var loaderScene =  flax.nameToObject(cc.game.config["preloader"] || "flax.Preloader");
        loaderScene = new loaderScene();
        loaderScene.initWithResources(res1, function(){
            //replace the resource's key with no version string when not in JSB
            if(!cc.sys.isNative) {
                var i = res1.length;
                while(i--){
                    var res = res1[i];
                    if(flax.isSoundFile(res)) flax._soundResources[res] = "loaded";
                    var data = cc.loader.getRes(res);
                    if(data){
                        var pureUrl = flax._removeResVersion(res);
                        cc.loader.cache[pureUrl] = data;
                        //fixed the bug when opengl
                        if(flax.isImageFile(pureUrl) && cc.sys.capabilities.opengl) cc.textureCache.handleLoadedTexture(pureUrl);
                        cc.loader.release(res);
                    }
                }
            }
            callBack();
        });

        cc.director.runScene(loaderScene);
        return loaderScene;
    }else{
        callBack();
    }
};

//----------------------scene about-------------------------------------------------------

//----------------------sound about-------------------------------------------------------
flax.setSoundEnabled = function(value)
{
    if(flax._soundEnabled == value) return;
    flax._soundEnabled = value;
    var audioEngine = cc.audioEngine;
    if(value)
    {
        audioEngine.resumeMusic();
        if(flax._lastMusic) {
            flax.playMusic(flax._lastMusic, true);
            flax._lastMusic = null;
        }
    }else{
        audioEngine.pauseMusic();
        audioEngine.stopAllEffects();
    }
};
flax.getSoundEnabled = function() {
    return flax._soundEnabled;
};
flax._lastMusic = null;
flax.playMusic = function(path, loop, releaseOld)
{
    var audioEngine = cc.audioEngine;
    audioEngine.stopMusic(releaseOld === true);
    if(flax._soundEnabled){
        audioEngine.playMusic(path, loop);
    }else{
        flax._lastMusic = path;
    }
};
flax.stopMusic = function(release){
    cc.audioEngine.stopMusic(release === true);
};
flax.pauseMusic = function(){
    cc.audioEngine.pauseMusic();
};
flax.playEffect = function(path)
{
    if(!flax._soundEnabled) return;
    var audioEngine = cc.audioEngine;
    var id = audioEngine.playEffect(path);
    return id;
};
flax.stopEffect = function(effectID)
{
    var audioEngine = cc.audioEngine;
    if(effectID != null) audioEngine.stopEffect(effectID);
    else audioEngine.stopAllEffects();
};
flax.playSound = function(path)
{
    return flax.playEffect(path);
};
//----------------------sound about-------------------------------------------------------
flax._checkDeviceOrientation = function(){
    if(cc.sys.isNative) return;
    if(!flax._orientationTip && cc.sys.isMobile && cc.game.config["rotateImg"]){
        flax._orientationTip = cc.LayerColor.create(flax.bgColor, cc.visibleRect.width + 10, cc.visibleRect.height +10);
        var img =  cc.Sprite.create(cc.game.config["rotateImg"]);
        img.setPosition(cc.visibleRect.center);
        flax._orientationTip.__icon = img;
        flax._orientationTip.addChild(img);
        var orientationEvent = ("onorientationchange" in window) ? "orientationchange" : "resize";
        window.addEventListener(orientationEvent, flax._showOrientaionTip, true);
        flax._showOrientaionTip();
    }
    if(flax._orientationTip){
        flax._orientationTip.removeFromParent();
        flax.currentScene.addChild(flax._orientationTip, 1000000);
    }
};
flax._oldGamePauseState = false;
flax._showOrientaionTip = function(){
    var newLandscape = (Math.abs(window.orientation) == 90);
    flax._orientationTip.visible = (cc.game.config["landscape"] != newLandscape);
    flax._orientationTip.__icon.rotation = (newLandscape ? -90 : 0);
    document.body.scrollTop = 0;
    if(flax._orientationTip.visible) {
        if(flax.landscape != newLandscape) flax._oldGamePauseState = cc.director.isPaused();
        cc.director.pause();
    }else if(!flax._oldGamePauseState){
        cc.director.resume();
    }
    flax.inputManager.enabled = !flax._orientationTip.visible;
    flax.landscape = newLandscape;
};

///---------------------utils-------------------------------------------------------------
flax.getAngle = function(startPoint, endPoint, forDegree)
{
    var dx = endPoint.x - startPoint.x;
    var dy = endPoint.y - startPoint.y;
    return flax.getAngle1(dx, dy, forDegree);
};
flax.getAngle1 = function(dx, dy, forDegree)
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
flax.getPointOnCircle = function(center, radius, angleDegree)
{
    angleDegree = 90 - angleDegree;
    angleDegree *= DEGREE_TO_RADIAN;
    if(center == null) center = cc.p();
    return cc.pAdd(center, cc.p(radius*Math.cos(angleDegree), radius*Math.sin(angleDegree)));
};
flax.getPosition = function(sprite, global)
{
    var pos = sprite.getPosition();
    if(global === true && sprite.parent) pos = sprite.parent.convertToWorldSpace(pos);
    return pos;
};
/**
 * Get the sprite's global rotation, if the sprite rotated 30 and the parent rotated -15, then the sprite's global rotation is 15
 * */
flax.getRotation = function(sprite, global)
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
flax.getScale = function(sprite, global)
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
flax.getRect = function(sprite, global)
{
    var rect;
    if(sprite.getRect) {
        rect = sprite.getRect(global);
        return rect;
    }else if(sprite instanceof cc.Layer || sprite instanceof cc.Scene){
        return cc.rect(0, 0, cc.visibleRect.width, cc.visibleRect.height);
    }
    global = (global !== false);
    var pos = sprite.getPosition();
    if(sprite.parent){
        if(global) {
            pos = sprite.parent.convertToWorldSpace(pos);
        }else {
            pos = sprite.getAnchorPointInPoints();
            pos = flax.currentScene.convertToNodeSpace(pos);
        }
    }
    var size = sprite.getContentSize();
    var anchor = sprite.getAnchorPoint();
    rect = cc.rect(pos.x - size.width * anchor.x,pos.y - size.height * anchor.y,size.width, size.height);
    return rect;
};

flax._strToRect = function(str)
{
    var arr = str.split(",");
    return cc.rect(parseFloat(arr[0]), parseFloat(arr[1]), parseFloat(arr[2]), parseFloat(arr[3]));
};

flax.ifTouched = function(target, pos)
{
    if(target == null) return false;
    if(!(target instanceof cc.Node)) return false;
    //if its flax.FlaxSprite
    if(target.mainCollider){
        return target.mainCollider.containsPoint(pos);
    }
    var local = target.convertToNodeSpace(pos);
    var r = flax.getRect(target,false);
    return cc.rectContainsPoint(r, local);
};
flax.ifCollide = function(sprite1, sprite2)
{
    return sprite1.mainCollider.checkCollision(sprite2.mainCollider);
};
flax.isFlaxDisplay = function(target)
{
    return target instanceof flax.FlaxSprite || target instanceof flax.FlaxSpriteBatch || target instanceof flax.Image || (flax.Scale9Image && target instanceof flax.Scale9Image);
};
flax.isFlaxSprite = function(target)
{
    return target instanceof flax.FlaxSprite || target instanceof flax.FlaxSpriteBatch
};
flax.isMovieClip = function(target)
{
    return target instanceof flax.MovieClip || target instanceof flax.MovieClipBatch;
};
flax.isButton = function(target)
{
    return target instanceof flax.Button || target instanceof flax.SimpleButton;
};
flax.isChildOf = function(child, parent)
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

flax.findParentWithClass = function(sprite, cls)
{
    var p = sprite;
    while(p){
        if(p instanceof cls) return p;
        p = p.parent;
    }
    return null;
};

flax.findChildWithClass = function(sprite, cls)
{
    var children = sprite.children;
    var i = children.length;
    var child;
    while(i--){
        child = children[i];
        if(child instanceof cls) return child;
        child = flax.findChildWithClass(child, cls);
        if(child) return child;
    }
    return null;
};
/**
 * Fetch URL GET variables
 * */
flax.getUrlVars = function() {
    var vars = {};
    if(cc.sys.isNative) return vars;
    var query = window.location.search.substring(1);
    var varsArr = query.split("&");
    for (var i = 0; i < varsArr.length; i++) {
        var pair = varsArr[i].split("=");
        vars[pair[0]] = decodeURIComponent(pair[1]);
    }
    return vars;
};
/**
 * Convert a name to a Object or a Function
 * @param {String}name cc.Sprite
 * @param {String}type function or object, defaut is function
 * */
flax.nameToObject = function(name, type) {
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
flax.createBGLayer = function(scene, color)
{
    if(color == null) color = cc.color(255, 255, 255, 255);
    var layer = cc.LayerColor.create(color, cc.visibleRect.width, cc.visibleRect.height);
    scene.addChild(layer, 0);
    return layer;
};

flax.shuffleArray = function(arr, len)
{
    if(len === undefined || len <= 0 || len > arr.length) len = arr.length;
    for (var i = len - 1; i >= 0; i--) {
        var j = 0 | (cc.rand() % (i + 1));
        var v = arr[i];
        arr[i] = arr[j];
        arr[j] = v;
    }
};
flax.restrictValue = function(value, min, max)
{
    value = Math.max(min, value);
    value = Math.min(max, value);
    return value;
};
flax.numberSign = function(number){
    if(number == 0) return 0;
    return number > 0 ? 1 : -1;
};
flax.randInt = function (start, end)
{
    return start + Math.floor(Math.random()*(end - start));
};
flax.getRandomInArray = function (arr)
{
    if(arr == null) return null;
    var i = flax.randInt(0, arr.length);
    return arr[i];
};

flax.isImageFile = function(path)
{
    if(typeof path != "string") return false;
    var ext = cc.path.extname(path);
    return IMAGE_TYPES.indexOf(ext) > -1;
};
flax.isSoundFile = function(path)
{
    if(typeof path != "string") return false;
    var ext = cc.path.extname(path);
    return SOUND_TYPES.indexOf(ext) > -1;
};
/**
 * Copy all the properties of params to target if it own the property
 * */
flax.copyProperties = function(params, target)
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
flax.createDInts = function(count, centerInt)
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

flax.homeUrl = "http://flax.so";
flax.goHomeUrl = function()
{
    var homeUrl = cc.game.config["homeUrl"] || flax.homeUrl;
    if(!cc.sys.isNative && homeUrl){
        window.open(homeUrl);
    }
};
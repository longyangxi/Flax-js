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
//Reset animation frame to 0 when recycle
RESET_FRAME_ON_RECYCLE = true;

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

flax.version = 2.4;
flax.gameVersion = 0;
flax.minToolVersion = 2.0;
flax.language = null;
flax.languageIndex = -1;
flax.languages = ["zh","en","de","fr","it","es","tr","pt","ru"];
flax.landscape = false;
flax.stageRect = null;
flax.designedStageSize = null;
flax.osVersion = "unknown";
flax.assetsManager = null;
flax.inputManager = null;
flax.mousePos = null;
flax.currentSceneName = null;
flax.currentScene = null;
flax.prevSceneName = null;
flax.buttonSound = null;
flax.frameInterval = 1/60;
flax.pointZero = {x:0, y:0};

flax._scenesDict = {};
flax._soundEnabled = true;
flax._inited = false;
flax._orientationTip = null;
flax._languageDict = null;
flax._languageToLoad = null;

flax.onDeviceRotate = null;
flax.onScreenResize = null;
flax.onSceneExit = null;
flax.onSceneEnter = null;

flax._addResVersion = function(url)
{
    if(cc.sys.isNative  || typeof url != "string" || flax.isSoundFile(url)) return url;
    if(url.indexOf("?v=") > -1) return url;
    return url + "?v=" + (flax.gameVersion || cc.game.config['version']);
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
        flax.gameVersion = 1 + Math.floor(Math.random()*(999999 - 1))
    }
//set the game canvas color as html body color
    /************************************************/
        //delay call to override the black color setting in js-boot.js
    setTimeout(function(){
        var bgColor = document.body.style.backgroundColor;
        var canvasNode = document.getElementById(cc.game.config["id"]);
        canvasNode.style.backgroundColor = bgColor;//'transparent'

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
 * @param {Size}   designSize  custom the designed screen size
 * */
flax.init = function(resolutionPolicy, initialUserData, designSize)
{
    if(flax._inited) return;
    flax._inited = true;
    cc.log("Flax inited, version: "+flax.version);

    if(resolutionPolicy == null) resolutionPolicy = cc.sys.isMobile ? cc.ResolutionPolicy.NO_BORDER : cc.ResolutionPolicy.SHOW_ALL;
    if(flax.fetchUserData) flax.fetchUserData(initialUserData);
    flax._checkOSVersion();

    var width = designSize ? designSize.width : cc.game.config["width"];
    var height = designSize ? designSize.height: cc.game.config["height"];
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
    flax.designedStageSize = cc.size(width, height);

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

    flax.stageRect = cc.rect(cc.visibleRect.bottomLeft.x, cc.visibleRect.bottomLeft.y, cc.visibleRect.width, cc.visibleRect.height);

    flax.onDeviceRotate = new signals.Signal();
    flax.onScreenResize = new signals.Signal();
    flax.onSceneExit = new signals.Signal();
    flax.onSceneEnter = new signals.Signal();

    if(!cc.sys.isNative){
        window.addEventListener("resize", function(){
            flax.stageRect = cc.rect(cc.visibleRect.bottomLeft.x, cc.visibleRect.bottomLeft.y, cc.visibleRect.width, cc.visibleRect.height);
            flax.onScreenResize.dispatch();
        }, false);
    }
};

flax.getLanguageStr = function(key, params){
    if(flax._languageDict == null) {
        cc.log("Warning: there is no language defined: "+flax.language);
        return null;
    }
    var str = flax._languageDict[key];
    if(str == null) cc.log("Warning: there is no language string for key: "+key);
    else if(params){
        for(var key in params){
            var rk = "{" + key + "}";
            str = str.replace(new RegExp(rk, 'g'), params[key]);
        }
    }
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
 * Create a display from a assetsFile with assetID
 * @param {String} assetsFile the assetsFile
 * @param {String} assetID the asset id in the assetsFile
 * @param {Object} params params could be set to the target with attr function
 *                 the special param is:
 *                 parent, if set parent, the display will be auto added to it
 *                 class, if set class, the display will be created with the class
 *                 batch, if set true and it is MovieClip then create flax.MovieClipBatch instance
 * @param {Boolean} fromPool if the display should fetch from the pool
 * @param {String} clsName the class name to create the display, if null, it'll be automatically set according by the assets file
 * Deprecated: createDisplay:function(assetsFile, assetID, clsName, fromPool, parent, params)
 * */
flax.createDisplay = function(assetsFile, assetID, params, fromPool, clsName)
{
    return flax.assetsManager.createDisplay(assetsFile, assetID, params, fromPool, clsName);
}
/**
 * @param{cc.Node} target the target want to receive the touch event, if target is null, then global event will be triggered
 *                       for keyboard event, the target will be the context if the real context is null
 * @param{function} func function to call back, for touch event: func(touch, event),{event.currentTarget, event.target}
 *                       for keyboard event: func(key){};
 * @param{string} type event type as InputType said
 * @param{cc.Node} context the callback context of "THIS", if null, use target as the context
 * Note: If the target is null, then listen the global event, in this instance, be sure to REMOVE the listener manually
 * on the sprite exit, otherwise, a new sprite will not receive the event again!
 * */
flax.addListener = function(target, func, type, context)
{
    flax.inputManager.addListener(target, func, type, context);
}
flax.removeListener = function(target, func, type)
{
    flax.inputManager.removeListener(target, func, type);
}
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
            var value = module[k];
            if (value && (typeof value.get === 'function' || typeof value.set === 'function'))
            {
                if (typeof value.clone === 'function')
                {
                    cls.prototype[k] = value.clone();
                }
                else
                {
                    Object.defineProperty(cls.prototype, k, value);
                }
            }
            else
            {
                cls.prototype[k] = value;
            }
        }
    }
};
flax.callModuleFunction = function(owner, funcName, params){
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
    flax.callModuleFunction(owner, "onEnter");
};
flax.callModuleOnExit = function(owner){
    flax.callModuleFunction(owner, "onExit");
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

    if(flax.currentSceneName) flax.onSceneExit.dispatch(flax.currentSceneName);

    if(flax.ObjectPool) flax.ObjectPool.release();
    if(flax.BulletCanvas) flax.BulletCanvas.release();
    cc.director.resume();
    flax.prevSceneName = flax.currentSceneName;
    flax.currentSceneName = sceneName;
    if(flax.stopPhysicsWorld) flax.stopPhysicsWorld();
    if(flax.inputManager) flax.inputManager.removeFromParent();
    if(flax.clearDraw) flax.clearDraw(true);

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

        flax.onSceneEnter.dispatch(flax.currentSceneName);
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
flax.preload = function(res, callBack, dynamic, context)
{
    if(res == null || res.length == 0) {
        callBack.apply(context);
        return;
    }
    if(typeof res === "string") res = [res];
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
        var loader =  flax.nameToObject(cc.game.config["preloader"] || "flax.Preloader");
        //If dynamic load resources staying on current scene
        if(dynamic === true) loader = flax.ResPreloader;
        loader = new loader();
        loader.initWithResources(res1, function(){
            if(dynamic === true) {
                flax.inputManager.removeMask(loader);
                loader.removeFromParent();
            }
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
            callBack.apply(context);
        });

        if(dynamic === true) {
            flax.currentScene.addChild(loader, 999999);
            flax.inputManager.addMask(loader);
        }else{
            cc.director.runScene(loader);
        }
        return loader;
    }else{
        callBack.apply(context);
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
flax.resumeMusic = function(){
    cc.audioEngine.resumeMusic();
}
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
    if(!flax._orientationTip && cc.sys.isMobile){
        if(cc.game.config["rotateImg"]){
            flax._orientationTip = cc.LayerColor.create(flax.bgColor, cc.visibleRect.width + 10, cc.visibleRect.height +10);
            var img =  new cc.Sprite(cc.game.config["rotateImg"]);
            img.setPosition(cc.visibleRect.center);
            flax._orientationTip.__icon = img;
            flax._orientationTip.addChild(img);
        }
        var orientationEvent = ("onorientationchange" in window) ? "orientationchange" : "resize";
        window.addEventListener(orientationEvent, flax._showOrientaionTip, true);
        flax._showOrientaionTip();
    }
    if(flax._orientationTip){
        flax._orientationTip.removeFromParent();
        flax.currentScene.addChild(flax._orientationTip, Number.MAX_VALUE);
    }
};
flax._oldGamePauseState = false;
flax._showOrientaionTip = function(){
    //Math.abs(window.orientation) = 90 || 0
    var newLandscape = (Math.abs(window.orientation) == 90);
    var landscapeConfiged = cc.game.config["landscape"];
    if(flax._orientationTip){
        var notLandscapeAsSet = (landscapeConfiged != newLandscape);
        flax._orientationTip.visible = notLandscapeAsSet;
        flax._orientationTip.__icon.rotation = (newLandscape ? -90 : 0);
        document.body.scrollTop = 0;
        if(flax._orientationTip.visible) {
            if(flax.landscape != newLandscape) flax._oldGamePauseState = cc.director.isPaused();
            cc.director.pause();
        }else if(!flax._oldGamePauseState){
            cc.director.resume();
        }
        flax.inputManager.enabled = !flax._orientationTip.visible;
    }
    flax.landscape = newLandscape;


    //if(landscapeConfiged == newLandscape){
    //    cc.view.setDesignResolutionSize(flax.designedStageSize.width, flax.designedStageSize.height, cc.view.getResolutionPolicy());
    //}else{
    //    cc.view.setDesignResolutionSize(flax.designedStageSize.height, flax.designedStageSize.width, cc.view.getResolutionPolicy());
    //}
    //flax.stageRect = cc.rect(cc.visibleRect.bottomLeft.x, cc.visibleRect.bottomLeft.y, cc.visibleRect.width, cc.visibleRect.height);

    flax.onDeviceRotate.dispatch(flax.landscape);
};

///---------------------utils-------------------------------------------------------------
flax.getAngle = function(startPoint, endPoint, forDegree)
{
    var x0 = 0;
    var y0 = 0;
    if(startPoint){
        x0 = startPoint.x;
        y0 = startPoint.y;
    }
    var dx = endPoint.x - x0;
    var dy = endPoint.y - y0;
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
flax.getDistance = function(p0, p1)
{
    var x0 = p0 == null ? 0 : p0.x;
    var y0 = p0 == null ? 0 : p0.y;
    var dx = p1.x - x0;
    var dy = p1.y - y0;
    return Math.sqrt(dx*dx + dy*dy);
}
flax.getPointOnCircle = function(center, radius, angleDegree)
{
    angleDegree = 90 - angleDegree;
    angleDegree *= DEGREE_TO_RADIAN;
    var cx = center ? center.x : 0;
    var cy = center ? center.y : 0;
    return {x: cx + radius*Math.cos(angleDegree), y: cy + radius*Math.sin(angleDegree)};
};
flax.getPosition = function(sprite, coordinate)
{
    var pos = sprite.getPosition();
    if(sprite.parent){
        if(coordinate) pos = sprite.parent.convertToWorldSpace(pos);
        if(coordinate instanceof cc.Sprite) pos = coordinate.convertToNodeSpace(pos);
    }
    return pos;
};
/**
 * Get the sprite's rotation in coordinate, if the sprite rotated 30 and the parent rotated -15, then the sprite's global rotation is 15
 * If coordinate === true, will return global rotation
 * */
flax.getRotation = function(sprite, coordinate)
{
    if(coordinate == false) return sprite.rotation;
    var r = 0;
    var p = sprite;
    while(p)
    {
        r += p.rotation;
        p = p.parent;
        if(p === coordinate) break;
    }
    return r;
};
/**
 * Get the sprite's global scale
 * */
flax.getScale = function(sprite, coordinate)
{
    if(coordinate == false) return {x:sprite.scaleX, y:sprite.scaleY};
    var sx = 1.0;
    var sy = 1.0;
    var p = sprite;
    while(p)
    {
        sx *= p.scaleX;
        sy *= p.scaleY;
        p = p.parent;
        if(p === coordinate) break;
    }
    return {x:sx, y:sy};
};
/**
 * Get the bounding rect of the sprite, maybe should refer the getBoundingBoxToWorld of the cc.Node
 * @param {cc.Sprite} sprite The target to cal
 * @param {Bollean|cc.Node} coordinate The coordinate to cal, if === undefined or === true means global coordinate
 *                                       if === cc.Sprite, cal in its coordinate!
 * */
flax.getRect = function(sprite, coordinate)
{
    var rect;
    if(sprite.getRect) {
        rect = sprite.getRect(coordinate);
        return rect;
    //edit box it is layer
    }else if((sprite instanceof cc.Layer || sprite instanceof cc.Scene) && (!cc.EditBox || !(sprite instanceof cc.EditBox))){
        return flax.stageRect;
    }
    if(coordinate == null) coordinate = true;

    var size = sprite.getContentSize();
    var s = flax.getScale(sprite, coordinate);

    var pos = sprite.getPosition();
    if(sprite.parent){
        if(coordinate) {
            if(coordinate != sprite.parent){
                pos = sprite.parent.convertToWorldSpace(pos);
                if(coordinate instanceof cc.Node){
                    pos = coordinate.convertToNodeSpace(pos);
                }
            }
        }else {
            size.width *= Math.abs(s.x);
            size.height *= Math.abs(s.y);
            return cc.rect(0, 0,size.width, size.height);
        }
    }
    var anchor = sprite.getAnchorPoint();
    rect = cc.rect(pos.x - size.width * s.x * anchor.x, pos.y - size.height* s.y * anchor.y, size.width * Math.abs(s.x), size.height * Math.abs(s.y));
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
    var r = flax.getRect(target,true);
    return cc.rectContainsPoint(r, pos);
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
flax.getRandomInArray = function (arr, rates)
{
    if(arr == null) return null;
    if(rates == null){
        var i = flax.randInt(0, arr.length);
        return arr[i];
    }
    var rate = Math.random();
    var totalRate = 0;
    for(var i = 0; i < rates.length; i++)
    {
        if(rates[i] <= 0) continue;
        totalRate += rates[i];
        if(rate <= totalRate){
            break;
        }
    }
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

/**
 * Convert to utf-8 string to unicode string, especially for Chinese chars from server of JSB
 * */
flax.utf8ToUnicode = function(strUtf8) {
    if(!strUtf8){
        return;
    }

    var bstr = "";
    var nTotalChars = strUtf8.length; // total chars to be processed.
    var nOffset = 0; // processing point on strUtf8
    var nRemainingBytes = nTotalChars; // how many bytes left to be converted
    var nOutputPosition = 0;
    var iCode, iCode1, iCode2; // the value of the unicode.
    while (nOffset < nTotalChars) {
        iCode = strUtf8.charCodeAt(nOffset);
        if ((iCode & 0x80) == 0) // 1 byte.
        {
            if (nRemainingBytes < 1) // not enough data
                break;
            bstr += String.fromCharCode(iCode & 0x7F);
            nOffset++;
            nRemainingBytes -= 1;
        }
        else if ((iCode & 0xE0) == 0xC0) // 2 bytes
        {
            iCode1 = strUtf8.charCodeAt(nOffset + 1);
            if (nRemainingBytes < 2 || // not enough data
                (iCode1 & 0xC0) != 0x80) // invalid pattern
            {
                break;
            }
            bstr += String
                .fromCharCode(((iCode & 0x3F) << 6) | (iCode1 & 0x3F));
            nOffset += 2;
            nRemainingBytes -= 2;
        } else if ((iCode & 0xF0) == 0xE0) // 3 bytes
        {
            iCode1 = strUtf8.charCodeAt(nOffset + 1);
            iCode2 = strUtf8.charCodeAt(nOffset + 2);
            if (nRemainingBytes < 3 || // not enough data
                (iCode1 & 0xC0) != 0x80 || // invalid pattern
                (iCode2 & 0xC0) != 0x80) {
                break;
            }
            bstr += String.fromCharCode(((iCode & 0x0F) << 12)
                | ((iCode1 & 0x3F) << 6) | (iCode2 & 0x3F));
            nOffset += 3;
            nRemainingBytes -= 3;
        } else
        // 4 or more bytes -- unsupported
            break;
    }
    if (nRemainingBytes != 0) { // bad UTF8 string.
        return "";
    }
    return bstr;
}
flax.formatTime = function(seconds, levels)
{
    if(levels <= 1) return seconds + "";
    if(!levels) levels = 2;

    var h = 0;
    if(levels > 2) h = Math.floor(seconds/3600);
    var m = Math.floor((seconds - h*3600)/60);
    var s = seconds - h*3600 - m*60;

    if(h < 10) h = "0" + h;
    if(m < 10) m = "0" + m;
    if(s < 10) s = "0" + s;

    if(levels > 2) return h + ":" + m + ":" + s;
    return m + ":" + s;
}
/**
 * generate a unique id
 //8 character ID (base=2)
 uuid(8, 2)  //  "01001010"
 //8 character ID (base=10)
 uuid(8, 10) // "47473046"
 //8 character ID (base=16)
 uuid(8, 16) // "098F4D35"
 * */
flax.generateUid = function(len, radix) {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    var uuid = [], i;
    radix = radix || chars.length;

    if (len) {
        // Compact form
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
    } else {
        // rfc4122, version 4 form
        var r;

        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';

        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | Math.random()*16;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
    }

    return uuid.join('');
}

flax.homeUrl = "http://flax.so";
flax.goHomeUrl = function()
{
    var homeUrl = cc.game.config["homeUrl"] || flax.homeUrl;
    if(!cc.sys.isNative && homeUrl){
        window.open(homeUrl);
    }
};

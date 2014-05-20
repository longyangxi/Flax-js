/**
 * Created by long on 14-2-2.
 */

RADIAN_TO_DEGREE = 180.0/Math.PI;
DEGREE_TO_RADIAN = Math.PI/180.0;

var lg = lg || {};

lg.version = 1.32;
//----------------------scene about----------------------------------------------------
lg.assetsManager = null;
lg.inputManager = null;
lg.currentSceneName = "";
lg.currentScene = null;
lg._scenesDict = {};
lg._resourcesLoaded = [];
lg._soundEnabled = true;
lg._inited = false;
lg._orientationTip = null;

lg.startGame = function(scene, resources){

    lg.init();

    lg.preload(resources, function(){
        var splashing = false;
        if(a10Enabled) {
            if(a10Remote) {
                var splashScreenData = GameAPI.Branding.getSplashScreen();
                if (splashScreenData.show) {
                    showSplash(splashScreenData.action, scene);
                    splashing = true;
                }
            }else {
                showSplash(goMoreGame, scene);
                splashing = true;
            }
        }
        if(!splashing) {
            lg.replaceScene(scene);
        }
    });
}

lg.init = function()
{
    if(lg._inited) return;
    lg._inited = true;
    lg.assetsManager = lg.AssetsManager.create();
    lg.inputManager = lg.InputManager.create();
    if(cc.game.config.timeScale)  cc.director.getScheduler().setTimeScale(cc.game.config.timeScale);
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
    lg.ObjectPool.release();
    if(lg.bulletCanvas) lg.bulletCanvas = null;
    lg.currentSceneName = sceneName;
    lg.inputManager.removeFromParent(false);
    lg.currentScene = new s.scene();
    lg.preload(s.res,function(){
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
    }else{
        audioEngine.pauseMusic();
        audioEngine.stopAllEffects();
    }
}
lg.getSoundEnabled = function()
{
    return lg._soundEnabled;
}
lg.playMusic = function(path, loop)
{
    if(lg._soundEnabled){
        var audioEngine = cc.audioEngine;
        audioEngine.stopMusic(true);
        audioEngine.playMusic(path, loop);
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
    var landscape = (Math.abs(window.orientation) == 90);
    lg._orientationTip.visible = (cc.game.config.landscape != landscape);
    lg._orientationTip.__icon.rotation = (landscape ? -90 : 0);
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
lg.getPointOnCircle = function(radius, angle)
{
    angle = - angle;
    angle *= DEGREE_TO_RADIAN;
    return new cc.Point(radius*Math.cos(angle), radius*Math.sin(angle));
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
 * Get the bounding rect of the sprite, maybe should refer the getBoundingBoxToWorld of the cc.Node
 * */
lg.getRect = function(sprite, global)
{
    var rect;
    if(sprite.getRect) {
        rect = sprite.getRect(global);
        if(rect) return rect;
    }
    global = (global === true);
    var pos = sprite.getPosition();
    if(global && sprite.parent) pos = sprite.parent.convertToWorldSpace(pos);
    var size = sprite.getContentSize();
    var anchor = sprite.getAnchorPoint();
    rect = cc.rect(pos.x - size.width * anchor.x,pos.y - size.height * anchor.y,size.width, size.height);
    return rect;
};
lg.drawRect = function(rect, drawNode, lineWidth, lineColor, fillColor)
{
    if(drawNode == null) {
        drawNode = cc.DrawNode.create();
        if(lg.currentScene) lg.currentScene.addChild(drawNode, 99999);
    }
    if(lineWidth == null) lineWidth = 1;
    if(lineColor == null) lineColor = cc.color(255, 0, 0, 255);
    var dp = cc.pAdd(cc.p(rect.x, rect.y), cc.p(rect.width, rect.height));
    drawNode.drawRect(cc.p(rect.x, rect.y), dp, fillColor, lineWidth, lineColor);
};
lg.ifTouched = function(target, pos)
{
    if(target == null) return false;
    if(!(target instanceof cc.Node)) return false;

    var local = target.convertToNodeSpace(pos);
    var r = lg.getRect(target);
    r.x = r.y = 0;
//    cc.log(child.name+": "+cc.rectContainsPoint(r, local));
    return cc.rectContainsPoint(r, local);
};
lg.ifCollide = function(sprite1, sprite2)
{
    var rect1 = lg.getRect(sprite1, true);
    var rect2 = lg.getRect(sprite2, true);
    return cc.rectIntersectsRect(rect1, rect2);
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
    var types = cc.RESOURCE_TYPE["IMAGE"];
    return types.indexOf(ext) > -1;
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
/**
 * Created by long on 14-2-2.
 */

RADIAN_TO_DEGREE = 180.0/Math.PI;
DEGREE_TO_RADIAN = Math.PI/180.0;

var lg = lg || {};

lg.version = 1.2;

//----------------------scene about----------------------------------------------------
lg.assetsManager = null;
lg.inputManager = null;
lg.currentSceneName = "";
lg.currentScene = null;
lg._scenesDict = {};
lg._resourcesLoaded = [];
lg._soundEnabled = true;
lg._soundBugFixed = false;
lg._inited = false;

lg.init = function()
{
    if(lg._inited) return;
    lg._inited = true;
    lg.assetsManager = lg.AssetsManager.create();
    lg.inputManager = lg.InputManager.create();
}

lg.registerScene = function(name, scene, resources)
{
    lg.init();
    lg._scenesDict[name] = {scene:scene, res:resources};
}
lg.preload = function(res, callBack)
{
    if(res == null || res.length == 0) {
        callBack();
        return;
    }
    var hasLoaded = true;
    var i = -1;
    while(++i < res.length)
    {
        if(lg._resourcesLoaded.indexOf(res[i].src) == -1){
            lg._resourcesLoaded.push(res[i].src);
            hasLoaded = false;
        }
    }
    if(hasLoaded){
        callBack();
    }else{
        Preloader.load(res, function(){
            callBack();
        }, this);
    }
    lg._fixSoundBug();
}
lg.replaceScene = function(sceneName)
{
    if(lg.currentSceneName == sceneName) return;
    var s = lg._scenesDict[sceneName];
    if(s == null){
        throw "Please register the scene: "+sceneName+" firstly!";
        return;
    }
    lg.ObjectPool.release();
    lg.currentSceneName = sceneName;
    lg.currentScene = new s.scene();
    lg.preload(s.res,function(){
        if(lg.inputManager.getParent()) lg.inputManager.removeFromParent(false);
        lg.currentScene.addChild(lg.inputManager, 999999);
        cc.Director.getInstance().replaceScene(lg.currentScene);
    });
}
lg._tileMaps = {};
lg.getTileMap = function(id)
{
    if(id == null) id = "default";
    if(lg._tileMaps.hasOwnProperty(id)) return lg._tileMaps[id];
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
    var audioEngine = cc.AudioEngine.getInstance();
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
        var audioEngine = cc.AudioEngine.getInstance();
        audioEngine.stopMusic(true);
        audioEngine.playMusic(path, loop);
    }
}
lg.playSound = function(path)
{
    if(lg._soundEnabled){
        cc.AudioEngine.getInstance().playEffect(path);
    }
}
lg._fixSoundBug = function()
{
    if(lg._soundBugFixed) return;
    lg._soundBugFixed = true;

    var hidden, visibilityChange;
    if (typeof document.hidden !== "undefined") {
        hidden = "hidden";
        visibilityChange = "visibilitychange";
    } else if (typeof document.mozHidden !== "undefined") {
        hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
    }
    var audioEngine = cc.AudioEngine.getInstance();
    window.addEventListener("focus", function () {
        if(!cc.AudioEngine) return;
        audioEngine._resumePlaying();
        lg._soundEnabled = true;
    }, false);
    window.addEventListener("blur", function () {
        if(!cc.AudioEngine) return;
        setTimeout(function(){
            audioEngine._pausePlaying();
            lg._soundEnabled = false;
        },0.1);
    }, false);
    document.addEventListener(visibilityChange, handleVisibilityChange, false);

    function handleVisibilityChange() {
        if(!cc.AudioEngine) return;
        if (!document.hidden){
            cc.Director.getInstance()._resetLastUpdate();
            audioEngine._resumePlaying();
            lg._soundEnabled = true;
        } else{
            setTimeout(function(){
                audioEngine._pausePlaying();
                lg._soundEnabled = false;
            },0.1);
        }
    }
}
//----------------------sound about-------------------------------------------------------


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
    var angle = Math.PI/2 - Math.atan2(dy, dx);
    if(forDegree)
    {
        angle *= RADIAN_TO_DEGREE;
    }
    return angle;
};
lg.getPointOnCircle = function(radius, angle)
{
    angle = 90 - angle;
    angle *= DEGREE_TO_RADIAN;
    return new cc.Point(radius*Math.cos(angle), radius*Math.sin(angle));
};
lg.getPosition = function(sprite, global)
{
    var pos = sprite.getPosition();
    if(global === true && sprite.getParent()) pos = sprite.getParent().convertToWorldSpace(pos);
    return pos;
};
/**
 * Get the sprite's global rotation, if the sprite rotated 30 and the parent rotated -15, then the sprite's global rotation is 15
 * */
lg.getRotation = function(sprite, global)
{
    if(global !== true) return sprite.getRotation();
    var r = 0;
    var p = sprite;
    while(p)
    {
        r += p.getRotation();
        p = p.getParent();
    }
    return r;
};
/**
 * Get the bounding rect of the sprite, maybe should refer the getBoundingBoxToWorld of the cc.Node
 * */
lg.getRect = function(sprite, global)
{
    var rect;
    if(sprite instanceof  lg.MovieClip) {
        rect = sprite.getRect(global);
        if(rect) return rect;
    }
    global = (global === true);
    var pos = sprite.getPosition();
    if(global && sprite.getParent()) pos = sprite.getParent().convertToWorldSpace(pos);
    var size = sprite.getContentSize();
    var anchor = sprite.getAnchorPoint();
    rect = cc.rect(pos.x - size.width * anchor.x,pos.y - size.height * anchor.y,size.width, size.height);
    return rect;
};
lg.rectClone = function(rect)
{
    if(rect == null) return null;
    return cc.rect(rect._origin.x, rect._origin.y, rect._size.width, rect._size.height);
};
lg.drawRect = function(rect, drawNode, lineWidth, lineColor, fillColor)
{
    if(drawNode == null) {
        drawNode = cc.DrawNode.create();
        if(lg.currentScene) lg.currentScene.addChild(drawNode, 99999);
    }
    if(lineWidth == null) lineWidth = 1;
    if(lineColor == null) lineColor = cc.c4f(255, 0, 0, 255);
    var dp = cc.pAdd(rect._origin, cc.p(rect._size.width, rect._size.height));
    drawNode.drawRect(rect._origin, dp, fillColor, lineWidth, lineColor);
};
lg.ifTouched = function(target, touch)
{
    if(target == null) return false;
    if(!(target instanceof cc.Node)) return false;
    var pos = touch.getLocation();
    var local = target.convertToNodeSpace(pos);
    var r = lg.getRect(target);
    r._origin.x = r._origin.y = 0;
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
    var p = child.getParent();
    while(p)
    {
        if(p == parent) return true;
        p = p.getParent();
    }
    return false;
};

//lg.getClassName = function(object)
//{
//    var fn = window || this;
//    var obj = null;
//    for (var key in fn) {
//        obj = fn[key];
//        if(key == "lg"){
//            for (var key1 in obj) {
//                var obj1 = obj[key1];
//                if(obj1 === object || (typeof obj1 === "function" && object instanceof obj1)) return "lg."+key1;
//            }
//        }
//
//        if(typeof obj !== "function") continue;
//        try{
//            if (obj === object || object instanceof obj)
//                return key;
//        }catch (err){
//
//        }
//    }
//    return "undefined";
//};
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
    if(color == null) color = cc.c4b(255, 255, 255, 255);
    var layer = cc.LayerColor.create(color, lg.stage.width(), lg.stage.height());
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
///---------------------utils-------------------------------------------------------------

///---------------------stage-------------------------------------------------------------
lg.anchorCenter = cc.p(0.5, 0.5);
lg.anchorTop = cc.p(0.5, 1);
lg.anchorTopRight = cc.p(1, 1);
lg.anchorRight = cc.p(1, 0.5);
lg.anchorBottomRight = cc.p(1, 0);
lg.anchorBottom = cc.p(0.5, 0);
lg.anchorBottomLeft = cc.p(0, 0);
lg.anchorLeft = cc.p(0, 0.5);
lg.anchorTopLeft = cc.p(0, 1);


lg.stage = {
    _rcVisible:cc.RectZero(),
    _ptCenter:cc.PointZero(),
    _ptTop:cc.PointZero(),
    _ptTopRight:cc.PointZero(),
    _ptRight:cc.PointZero(),
    _ptBottomRight:cc.PointZero(),
    _ptBottom:cc.PointZero(),
    _ptLeft:cc.PointZero(),
    _ptTopLeft:cc.PointZero(),
    _ptBottomLeft:cc.PointZero(),
    _width:0,
    _height:0,

    rect:function () {
        if (this._rcVisible.width == 0) {
            var s = cc.Director.getInstance().getWinSize();
            this._rcVisible = cc.rect(0, 0, s.width, s.height);
        }
        return this._rcVisible;
    },
    width:function(){
        if(this._width == 0) this._width = this.rect().width;
        return this._width;
    },
    height:function(){
        if(this._height == 0) this._height = this.rect().height;
        return this._height;
    },
    center:function () {
        if (this._ptCenter.x == 0) {
            var rc = this.rect();
            this._ptCenter.x = rc.x + rc.width / 2;
            this._ptCenter.y = rc.y + rc.height / 2;
        }
        return this._ptCenter;
    },
    top:function () {
        if (this._ptTop.x == 0) {
            var rc = this.rect();
            this._ptTop.x = rc.x + rc.width / 2;
            this._ptTop.y = rc.y + rc.height;
        }
        return this._ptTop;
    },
    topRight:function () {
        if (this._ptTopRight.x == 0) {
            var rc = this.rect();
            this._ptTopRight.x = rc.x + rc.width;
            this._ptTopRight.y = rc.y + rc.height;
        }
        return this._ptTopRight;
    },
    right:function () {
        if (this._ptRight.x == 0) {
            var rc = this.rect();
            this._ptRight.x = rc.x + rc.width;
            this._ptRight.y = rc.y + rc.height / 2;
        }
        return this._ptRight;
    },
    bottomRight:function () {
        if (this._ptBottomRight.x == 0) {
            var rc = this.rect();
            this._ptBottomRight.x = rc.x + rc.width;
            this._ptBottomRight.y = rc.y;
        }
        return this._ptBottomRight;
    },
    bottom:function () {
        if (this._ptBottom.x == 0) {
            var rc = this.rect();
            this._ptBottom.x = rc.x + rc.width / 2;
            this._ptBottom.y = rc.y;
        }
        return this._ptBottom;
    },
    bottomLeft:function () {
        return this._ptBottomLeft;
    },
    left:function () {
        if (this._ptLeft.y == 0) {
            var rc = this.rect();
            this._ptLeft.x = rc.x;
            this._ptLeft.y = rc.y + rc.height / 2;
        }
        return this._ptLeft;
    },
    topLeft:function () {
        if (this._ptTopLeft.y == 0) {
            var rc = this.rect();
            this._ptTopLeft.x = rc.x;
            this._ptTopLeft.y = rc.y + rc.height;
        }
        return this._ptTopLeft;
    }
};
///---------------------stage-------------------------------------------------------------
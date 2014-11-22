/**
 * Created by long on 14-1-31.
 */

var flax = flax || {};

F2C_ALIAS = {mc:"flax.MovieClip",
             btn:"flax.SimpleButton",
             button:"flax.Button",
             progress:"flax.ProgressBar",
             scrollPane:"flax.ScrollPane",
             scrollPane1:"flax.ScrollPane1",
             gun:"flax.Gunner",
             gun1:"flax.MCGunner"
            };

flax.AssetsManager = cc.Class.extend({
    framesCache:null,
    displaysCache:null,
    displayDefineCache:null,
    mcsCache:null,
    subAnimsCache:null,
    fontsCache:null,

   init:function()
   {
       this.framesCache = {};
       this.displaysCache = {};
       this.displayDefineCache = {};
       this.mcsCache = {};
       this.subAnimsCache = {};
       this.fontsCache = {};
   },
    /**
     * Create a display from a assetsFile with assetID
     * @param {String} assetsFile the assetsFile
     * @param {String} assetID the asset id in the assetsFile
     * @param {Object} params params could be set to the target with attr function
     *                 the special is parent, if set parent, the display will be auto added to it
     * @param {Boolean} fromPool if the display should fetch from the pool
     * @param {String} clsName the class name to create the display, if null, it'll be automatically set according by the assets file
     * Deprecated: createDisplay:function(assetsFile, assetID, clsName, fromPool, parent, params)
     * */
    createDisplay:function(assetsFile, assetID, params, fromPool, clsName)
    {
        if(assetsFile == null || assetID == null){
            throw  "Pleas give me assetsFile and assetID!";
        }
        if((params && typeof params === "string") || (clsName && typeof clsName !== "string")) {
            throw "Params error: maybe you are using the old api, please use the latest!";
        }
        this.addAssets(assetsFile);

        var clsPreDefined = false;
        if(clsName) clsPreDefined = true;
        else clsName = assetID;

        var subAnims = this.getSubAnims(assetsFile, assetID);
        if(subAnims.length) {
            assetID = assetID + "$" + subAnims[0];
        }

        var mcCls = flax.nameToObject(clsName);
        if(mcCls == null && clsPreDefined){
            throw "The class: "+clsName+" doesn't exist!"
        }
        if(mcCls == null && !clsPreDefined) {
            var define = this.getDisplayDefine(assetsFile, assetID);
            var isMC = false;
            if(define == null) {
                define = this.getMc(assetsFile, assetID);
                isMC = true;
            }
            if(define){
                clsName = define.type;
                mcCls = flax.nameToObject(clsName);
                if(mcCls == null){
                    clsName = F2C_ALIAS[clsName];
                    mcCls = flax.nameToObject(clsName);
                }
                if(mcCls == null)
                {
                    mcCls = isMC ? flax.MovieClip : flax.Animator;
                    clsName = isMC ? "flax.MovieClip" : "flax.Animator";
                }
            }else{
                throw  "There is no display with assetID: "+assetID+" in assets file: "+assetsFile;
            }
        }
        if(params == null) params = {};
        var mc = null;
        var parent = params.parent;
        delete params.parent;
        if(fromPool === true) {
            mc = flax.ObjectPool.get(assetsFile,clsName,assetID).fetch(assetID, parent, params);
        }else{
            if(mcCls.create) mc = mcCls.create(assetsFile, assetID);
            else mc = new mcCls(assetsFile, assetID);
            mc.attr(params);
            if(parent) parent.addChild(mc);
            mc.clsName = clsName;
        }
        return mc;
    },
    /**
     * Clone a new display from the target, if fromPool = true, it'll be fetched from the pool
     * It only supports flax.FlaxSprite or its sub classes
     * */
    cloneDisplay:function(target, fromPool, autoAdd)
    {
        if(!(target instanceof flax.FlaxSprite)) {
            throw "cloneDisplay only support flax.FlaxSprite type!"
        }
        var obj = this.createDisplay(target.assetsFile, target.assetID, {parent: (autoAdd ? target.parent : null)}, fromPool, target.clsName);
        if(autoAdd) obj.setPosition(target.getPosition());
        obj.setScale(target.getScale());
        obj.setRotation(target.rotation);
        obj.zIndex = target.zIndex;
        return obj;
    },
    addAssets:function(assetsFile)
    {
        if(typeof this.framesCache[assetsFile] !== "undefined") return false;

        var assetsFile1 = assetsFile;
        var ext = cc.path.extname(assetsFile)
        if(ext == ".flax") assetsFile1 = cc.path.changeBasename(assetsFile1, ".plist");
        var dict = cc.loader.getRes(assetsFile1);
        if(dict == null){
            throw "Make sure you have pre-loaded the resource: "+assetsFile;
        }
        cc.spriteFrameCache.addSpriteFrames(assetsFile1);
        //Note: the plist will be released by cocos when addSpriteFrames
        //We want it to be there to check the resource if loaded
        cc.loader.cache[assetsFile1] = "loaded!";

        //parse the frames
        var frames = [];
        var frameDict = dict.frames;
        for(var key in frameDict)
        {
            frames.push(key);
        }
        //sort ascending
        frames.sort();

        this.framesCache[assetsFile] = frames;

        //parse the displays defined in the assets
        if(dict.displays)
        {
            this._parseDisplays(assetsFile, dict.displays);
        }
        //parse the movieClipgs
        if(dict.mcs)
        {
            this._parseMovieClips(assetsFile, dict.mcs);
        }
        //parse the fonts
        if(dict.fonts)
        {
            this._parseFonts(assetsFile, dict.fonts);
        }
        return true;
    },
    _parseDisplays:function(assetsFile, displays){
        var displayNames = [];
        var dDefine = null;
        for(var dName in displays)
        {
            displayNames.push(dName);
            dDefine = displays[dName];
            if(dDefine.anchors) dDefine.anchors = this._parseFrames(dDefine.anchors);
            if(dDefine.colliders) dDefine.colliders = this._parseFrames(dDefine.colliders);
            this.displayDefineCache[assetsFile + dName] = dDefine;
            this._parseSubAnims(assetsFile, dName);
        }
        this.displaysCache[assetsFile] = displayNames;
    },
    _parseMovieClips:function(assetsFile, mcs){
        for(var sName in mcs)
        {
            var mcDefine = mcs[sName];
            if(mcDefine.anchors) mcDefine.anchors = this._parseFrames(mcDefine.anchors);
            if(mcDefine.colliders) mcDefine.colliders = this._parseFrames(mcDefine.colliders);
            var childDefine;
            var childrenDefine = mcDefine.children;
            for(var childName in childrenDefine)
            {
                childDefine = childrenDefine[childName];
                childDefine.frames = this._strToArray(childDefine.frames);
            }
            this.mcsCache[assetsFile + sName] = mcDefine;
            //see if there is a '$' sign which present sub animation of the mc
            this._parseSubAnims(assetsFile, sName);
        }
    },
    _parseFonts:function(assetsFile, fonts){
        for(var fName in fonts)
        {
            this.fontsCache[assetsFile + fName] = fonts[fName];
        }
    },
    _parseSubAnims:function(assetsFile, assetID)
    {
        var aarr = assetID.split("$");
        var rname = aarr[0];
        var aname = aarr[1];
        if(rname && aname && rname != '' && aname != ''){
            var akey = assetsFile + rname;
            var anims = this.subAnimsCache[akey];
            if(anims == null) {
                anims = [];
                this.subAnimsCache[akey] = anims;
            }
            anims.push(aname);
        }
    },
    _parseFrames:function(data){
        var dict = {};
        for(var name in data)
        {
            dict[name] = this._strToArray(data[name]);
        }
        return dict;
    },
    _strToArray:function(str){
        var frames = str.split("|");
        var i = -1;
        var arr = [];
        while(++i < frames.length)
        {
            var frame = frames[i];
            if(frame === "null") arr.push(null);
            //"" means the params is the same as prev frame
            else if(frame === "") arr.push(arr[i - 1]);
            else arr.push(frame);
        }
        return arr;
    },
    getFrameNames:function(assetsFile, startFrame, endFrame)
    {
        this.addAssets(assetsFile);
        var frames = this.framesCache[assetsFile];
        if(frames == null) return [];
        if(startFrame == -1) startFrame = 0;
        if(endFrame == -1) endFrame = frames.length - 1;
        return frames.slice(parseInt(startFrame), parseInt(endFrame) + 1);
    },
    getFrameNamesOfDisplay:function(assetsFile, assetID)
    {
        var define = this.getDisplayDefine(assetsFile, assetID);
        if(define == null) throw "There is no display named: " + assetID + " in assetsFile: " + assetsFile;
        return this.getFrameNames(assetsFile, define.start, define.end);
    },
    getDisplayDefine:function(assetsFile, assetID)
    {
        this.addAssets(assetsFile);
        var key = assetsFile + assetID;
        return this.displayDefineCache[key];
    },
    getDisplayNames:function(assetsFile)
    {
        this.addAssets(assetsFile);
        return this.displaysCache[assetsFile] || [];
    },
    getRandomDisplayName:function(assetsFile)
    {
        var names = this.getDisplayNames(assetsFile);
        var i = Math.floor(Math.random()*names.length);
        return names[i];
    },
    getMc:function(assetsFile, assetID)
    {
        this.addAssets(assetsFile);
        var key = assetsFile + assetID;
        return this.mcsCache[key];
    },
    getSubAnims:function(assetsFile, theName)
    {
        this.addAssets(assetsFile);
        var akey = assetsFile + theName;
        return this.subAnimsCache[akey] || [];
    },
    getFont:function(assetsFile, fontName)
    {
        this.addAssets(assetsFile);
        var key = assetsFile + fontName;
        return this.fontsCache[key];
    }
});



flax.AssetsManager.create = function()
{
    var am = new flax.AssetsManager();
    am.init();
    return am;
};

flax._flaxLoader = {
    load : function(realUrl, url, res, cb){
        cc.loader.loadBinary(realUrl, function(err, data){
            realUrl = flax._removeResVersion(realUrl);
            var zlib = new Zlib.RawInflate(data);
            var txts = zlib.decompress();

            //from char code to string
            var txt = "";
            var len = txts.length;
            for(var i = 0; i < len; i++){
                txt += String.fromCharCode(txts[i]);
            }
            var keyWord = "data:image/gif;base64,";
            data = txt.split(keyWord);
            var dataUrl = cc.path.changeBasename(realUrl, ".plist");
            var pngUrl = cc.path.changeBasename(realUrl, ".png");
            //hadle json
            cc.loader.cache[dataUrl] = JSON.parse(data[0]);
            //handle image
            var image = new Image();
            image.src = keyWord+data[1];
            cc.loader.cache[pngUrl] = image;
            cc.textureCache.handleLoadedTexture(pngUrl);
            flax.assetsManager.addAssets(realUrl);

            err ? cb(err) : cb(null, "Not reachable!");
            //release the resource
            cc.loader.release(realUrl);
            //but tell the loader, this resource has been loaded!
            cc.loader.cache[realUrl] = "loaded!";
        });
    }
};
//todo: .flax is not supported now in JSB
if(!cc.sys.isNative){
    cc.loader.register(["flax"], flax._flaxLoader);
}
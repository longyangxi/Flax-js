/**
 * Created by long on 14-2-22.
 */
var lg = lg || {};

lg.ObjectPool = cc.Class.extend({
    maxCount:100,
    _clsName:null,
    _cls:null,
    _plistFile:null,
    _pool:null,
    _extraID:"",

    init:function(plistFile, clsName, maxCount)
    {
        if(this._plistFile && this._cls){
            cc.log("The pool has been inited with cls: "+this._cls);
            return false;
        }
        this._clsName = clsName;
        this._cls = lg.nameToObject(clsName);
        if(this._cls == null){
            cc.log("There is no class named: "+clsName);
            return false;
        }
        this._plistFile = plistFile;
        this._pool = [];
        if(maxCount !== undefined) this.maxCount = maxCount;
        return true;
    },
    fetch:function(assetID, parent, params)
    {
        if(assetID == null){
            cc.log("Please give me a assetID to fetch a object!");
            return null;
        }
        var obj = null;
        if(this._pool.length > 0){
            obj = this._pool.shift();
            obj.setPlist(this._plistFile, assetID);
        }else{
            obj = this._cls.create(this._plistFile, assetID);
        }

        obj.__pool__id__ = this._extraID;
        obj.clsName = this._clsName;
        obj.autoRecycle = true;
        obj.visible = true;

        //to fix the zIndex bug
        if(params){
            if(!("zIndex" in params)) params.zIndex = 0;
        }else{
            params = {zIndex:0};
        }
        obj.attr(params);
        if(parent && obj.parent != parent){
            obj.removeFromParent(false);
            parent.addChild(obj);
        }else if(obj.parent){
            if(obj instanceof lg.TimeLine) obj.onReset();
        }
        return obj;
    },
    recycle:function(object)
    {
        if(!(object instanceof this._cls)){
            cc.log("The object to recycle is not the same type with this pool: "+this._cls);
            return;
        }
        if(this._pool.length > this.maxCount){
            object.removeFromParent();
        }else{
            object.visible = false;
            if(object.onRecycle) object.onRecycle();
            this._pool.push(object);
        }
    },
    release:function()
    {
        this._pool.length = 0;
    }
});

lg.ObjectPool.all = {};

lg.ObjectPool.create = function(plistFile, clsName, maxCount)
{
    var pool = new lg.ObjectPool();
    if(pool.init(plistFile, clsName, maxCount)) {
        return pool;
    }
    return null;
};
lg.ObjectPool.get = function(plistFile, clsName, id)
{
    if(clsName == null) clsName = "lg.Animator";
    if(id == null) id = "";
    var key = plistFile+clsName+id;
    var pool = lg.ObjectPool.all[key];
    if(pool == null){
        pool = lg.ObjectPool.create(plistFile, clsName);
        pool._extraID = id;
        lg.ObjectPool.all[key] = pool;
    }
    return pool;
};

lg.ObjectPool.release = function()
{
    for(var k in lg.ObjectPool.all){
        lg.ObjectPool.all[k].release();
        delete  lg.ObjectPool.all[k];
    }
};


/**
 * Created by long on 14-2-22.
 */

flax.ObjectPool = cc.Class.extend({
    maxCount:100,
    _clsName:null,
    _cls:null,
    _assetsFile:null,
    _pool:null,
    _extraID:"",

    init:function(assetsFile, clsName, maxCount)
    {
        if(this._assetsFile && this._cls){
            cc.log("The pool has been inited with cls: "+this._cls);
            return false;
        }
        this._clsName = clsName;
        this._cls = flax.nameToObject(clsName);
        if(this._cls == null){
            cc.log("There is no class named: "+clsName);
            return false;
        }
        this._assetsFile = assetsFile;
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
            obj.__fromPool = true;
            obj.setSource(this._assetsFile, assetID);
        }else{
            if(this._cls.create) obj = this._cls.create(this._assetsFile, assetID);
            else obj = new this._cls(this._assetsFile, assetID);
        }

        obj.__pool__id__ = this._extraID;
        obj.clsName = this._clsName;
        obj._destroyed = false;
        obj.autoRecycle = true;
        obj.visible = true;

        //to fix the zIndex bug
        if(params){
            if(typeof params.zIndex === "undefined") params.zIndex = 0;
        }else{
            params = {zIndex:0};
        }
        obj.attr(params);
        if(parent) parent.addChild(obj);
//        cc.log("fetch: "+obj.assetID);
        return obj;
    },
    recycle:function(object)
    {
        if(!(object instanceof this._cls)){
            cc.log("The object to recycle is not the same type with this pool: "+this._clsName);
            return;
        }
        if(this._pool.length < this.maxCount){
//            cc.log("recycle: "+object.assetID);
            object.onRecycle&&object.onRecycle();
            object.retain&&object.retain();
            this._pool.push(object);
        }
    },
    release:function()
    {
        var i = this._pool.length;
        while(i--){
            this._pool[i].release&&this._pool[i].release();
        }
        this._pool.length = 0;
    }
});

flax.ObjectPool.all = {};

flax.ObjectPool.create = function(assetsFile, clsName, maxCount)
{
    var pool = new flax.ObjectPool();
    if(pool.init(assetsFile, clsName, maxCount)) {
        return pool;
    }
    return null;
};
flax.ObjectPool.get = function(assetsFile, clsName, id)
{
    if(clsName == null) clsName = "flax.Animator";
    if(id == null) id = "";
    var key = assetsFile+clsName+id;
    var pool = flax.ObjectPool.all[key];
    if(pool == null){
        pool = flax.ObjectPool.create(assetsFile, clsName);
        pool._extraID = id;
        flax.ObjectPool.all[key] = pool;
    }
    return pool;
};

flax.ObjectPool.release = function()
{
    for(var k in flax.ObjectPool.all){
        flax.ObjectPool.all[k].release();
        delete  flax.ObjectPool.all[k];
    }
};


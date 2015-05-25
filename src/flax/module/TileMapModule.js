/**
 * Created by long on 15-3-21.
 */
flax.TileMapModule = {
    tx:0,
    ty:0,
    autoUpdateTileWhenMove:true,
    tileValue:TileValue.WALKABLE,
    _tileMap:null,
    _tileInited:false,

    onEnter:function()
    {
        if(this._tileMap && !this._tileInited) {
            this.updateTile(true);
        }
    },
    onExit:function()
    {
        if(this._tileMap) this._tileMap.removeObject(this);
        this._tileMap = null;
        this._tileInited = false;
    },
    onPosition:function()
    {
        if(this.autoUpdateTileWhenMove && this._tileMap){
            this.updateTile();
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
            //todo
//            this._updateCollider();
        }
    },
    updateTile:function(forceUpdate){
        if(!this._tileMap) return;
        var pos = this.getPosition();
        if(this.parent) pos = this.parent.convertToWorldSpace(pos);
        var t = this._tileMap.getTileIndex(pos);
        this.setTile(t.x, t.y, forceUpdate);
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
    snapToTile:function(tx, ty, autoAdd)
    {
        this._tileMap.snapToTile(this,tx, ty, autoAdd);
    }
};
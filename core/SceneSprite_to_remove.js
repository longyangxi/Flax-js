/**
 * Created by long on 14-2-2.
 */

var lg = lg || {};

lg.SceneSprite = lg.Animator.extend({
    tx:0,
    ty:0,
    vx:0.0,
    vy:0.0,
    moveAngle:0.0,
    autoRotateWhenMove:false,
    autoUpdateTileWhenMove:true,
    _tileMap:null,
    _tileValue:TileValue.WALKABLE,
    _tileInited:false,

    onEnter:function()
    {
        this._super();
        if(this._tileMap && this._tileValue != TileValue.IGNORE && !this._tileInited) {
            this._tileMap.addObject(this);
            this._tileInited = true;
        }
    },
    onExit:function()
    {
        this._super();
        if(this._tileMap && this._tileValue != TileValue.IGNORE) this._tileMap.removeObject(this);
    },
    getTileMap:function()
    {
        return this._tileMap;
    },
    setTileMap:function(id)
    {
        if(this._tileMap) return;
        this._tileMap = lg.getTileMap(id);
        if(this._tileMap == null) return;
        var newTx = this._tileMap.getTileIndexX(this.getPositionX());
        var newTy = this._tileMap.getTileIndexY(this.getPositionY());
        this.setTile(newTx, newTy);
    },
    onLogic:function(delta)
    {
        this._super(delta);
        if(this.vx != 0.0 || this.vy != 0.0)
        {
            this.setPosition(this.getPositionX + this.vx, this.getPositionY + this.vy);
        }
    },
    setPosition:function(pos, yValue)
    {
        if(yValue === undefined) this._super(pos);
        else this._super(pos, yValue);
        if(this.autoUpdateTileWhenMove && this._tileMap){
            var newTx = this._tileMap.getTileIndexX(this.getPositionX());
            var newTy = this._tileMap.getTileIndexY(this.getPositionY());
            this.setTile(newTx, newTy);
        }
    },
    onTileChanged:function(oldTx, oldTy)
    {
        if(this._tileMap && this._parent && this._tileValue != TileValue.IGNORE)
        {
            this._tileMap.removeObject(this, oldTx, oldTy);
            this._tileMap.addObject(this);
            this._tileInited = true;
        }
    },
    setSpeed:function(vx, vy)
    {
        this.vx = vx;
        this.vy = vy;
        this.moveAngle = lg.getAngle1(vx, vy,true);
        if(this.autoRotateWhenMove)
        {
            this.setRotation(this.moveAngle);//?-180
        }
    },
    setSpeed1:function(speed, angle)
    {
        this.moveAngle = angle;
        var v = lg.getPointOnCircle(1.0, angle*DEGREE_TO_RADIAN);
        this.vx = v.x*speed;
        this.vy = v.y*speed;
        if(this.autoRotateWhenMove)
        {
            this.setRotation(this.moveAngle);//?-180
        }
    },
    setTile:function(tx, ty)
    {
        if (tx != this.tx || ty != this.ty) {
            var oldTx = this.tx;
            var oldTy = this.ty;
            this.tx = tx;
            this.ty = ty;
            this.onTileChanged(oldTx, oldTy);
        }
    },
    setTileValue:function(value)
    {
        if(this._tileValue == value) return;
        if(this._parent && this._tileMap){
            if(this._tileValue != TileValue.IGNORE) this._tileMap.removeObject(this);
            else {
                this._tileValue = value;
                this._tileMap.addObject(this);
            }
        }
        this._tileValue = value;
    },
    getTileValue:function()
    {
        return this._tileValue;
    }
});

lg.SceneSprite.create = function(plistFile, id)
{
    var mc = new lg.SceneSprite();
    mc.init();
    mc.setPlist(plistFile, id);
    return mc;
};
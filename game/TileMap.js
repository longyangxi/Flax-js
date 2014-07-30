/**
 * Created by long on 14-2-2.
 */
var lg = lg || {};

EIGHT_DIRECTIONS = [[0,1],[0,-1],[-1,0],[1,0],[-1,1],[1,1],[1,-1],[-1,-1]];
MAX_IN_TILE = 10;

var TileValue = TileValue || {
    WALKABLE:0,
    BLOCK1:1,
    BLOCK2:2,
    BLOCK3:3,
    BLOCK4:4,
    BLOCK5:5
};

lg.TileMap = cc.Class.extend({
    id:"default",
    offsetX:0,
    offsetY:0,
    isHexagon:false,//if true, the tiles will layout like the bubble safari
    autoLayout:false,
    _tileWidth:0,
    _tileHeight:0,
    _mapWidth:0,
    _mapHeight:0,
    _objectsMap:null,
    _objectsArr:null,

    setTileSize:function(tw, th)
    {
        if(this._tileWidth == tw && this._tileHeight == th) return;
        this._tileWidth = tw;
        this._tileHeight = th;
    },
    setMapSizePixel:function(w, h)
    {
        if(w == null) w = cc.visibleRect.width;
        if(h == null) h = cc.visibleRect.height;
        return this.setMapSize(Math.ceil(w/this._tileWidth), Math.ceil(h/this._tileHeight));
    },
    setMapSize:function(w, h)
    {
        var result = [];
        //the objects in the tiles would be removed from the data
        result[0] = [];
        //the new tiles added
        result[1] = [];

        if(this._mapWidth == w && this._mapHeight == h) return result;
        if(this._objectsArr == null) this._objectsArr = [];
        if(this._objectsMap == null) this._objectsMap = [];
        var oldW = this._mapWidth;
        var oldH = this._mapHeight;

        var i = -1;
        var j = -1;
        var maxW = Math.max(w, oldW);
        var maxH = Math.max(h, oldH);
        while(++i < maxW)
        {
            if(this._objectsMap[i] == null) this._objectsMap[i] = [];
            j = -1;
            while(++j < maxH)
            {
                if(i >= w || j >= h){
                    result[0] = result[0].concat(this._objectsMap[i][j]);
                    this.removeObjects(i, j);
                    delete this._objectsMap[i][j];
                    continue;
                }else if(i < oldW && j < oldH) {
                    continue;
                }
                this._objectsMap[i][j] = [];
                result[1].push([i, j]);
            }
            if(this._objectsMap[i].length == 0) delete  this._objectsMap[i];
        }
        this._mapWidth = w;
        this._mapHeight = h;
        return result;
    },
    showDebugGrid:function(){
        if(lg.currentScene == null) return;
        if(lg.tileMapCanvas) lg.tileMapCanvas.clear();
        else{
            lg.tileMapCanvas = cc.DrawNode.create();
            lg.currentScene.addChild(lg.tileMapCanvas, 100000);
        }
        lg.tileMapCanvas.setPosition(this.offsetX, this.offsetY);
        for(var i = 0; i <= this._mapWidth; i++){
            lg.tileMapCanvas.drawSegment(cc.p(i*this._tileWidth, 0), cc.p(i*this._tileWidth, this._tileHeight*this._mapHeight), 1, cc.color(255,0,0,255));
        }
        for(var j = 0; j <= this._mapHeight; j++){
            lg.tileMapCanvas.drawSegment(cc.p(0, j*this._tileHeight), cc.p(this._tileWidth*this._mapWidth, j*this._tileHeight), 1, cc.color(255,0,0,255));
        }
    },
    clear:function(removeChildren)
    {
        if(this._objectsArr.length == 0) return;
        if(removeChildren === undefined) removeChildren = true;
        var children;
        for(var i = 0; i < this._mapWidth; i++)
        {
            for(var j = 0; j < this._mapHeight; j++)
            {
                if(removeChildren) {
                    children = this._objectsMap[i][j];
                    for(var k in children)
                    {
                        var child = children[k];
                        if(child instanceof cc.Node){
                            child.destroy();
                        }
                    }
                }
                this._objectsMap[i][j] = [];
            }
        }
        this._objectsArr.length = 0;
    },
    getPixelSize:function()
    {
        var s = cc.size(this._tileWidth*this._mapWidth, this._tileHeight*this._mapHeight);
        if(this.isHexagon) s.width += this._tileWidth*0.5;
        return s;
    },
    getTileIndex:function(pos){
        var tx = Math.floor((pos.x - this.offsetX)/this._tileWidth);
        var ty = Math.floor((pos.y - this.offsetY)/this._tileHeight);
        if(this.isHexagon && ty%2 != 0) tx = Math.floor((pos.x - this.offsetX - this._tileWidth*0.5)/this._tileWidth);
        return cc.p(tx, ty);
    },
    getTiledPosition:function(tx, ty){
        var x = (tx + 0.5)*this._tileWidth + this.offsetX;
        var y = (ty + 0.5)*this._tileHeight + this.offsetY;
        if(this.isHexagon && ty%2 != 0) x += 0.5*this._tileWidth;
        return cc.p(x, y);
    },
    /**
     * All the tiles/objects occupied by the sprite bounds, if returnObjects == true, then return all the objects in these tiles
     * */
    getCoveredTiles:function(sprite, returnObjects)
    {
        var rect = lg.getRect(sprite, true);
        return this.getCoveredTiles1(rect, returnObjects);
    },
    /**
     * All the tiles/objects occupied by the rect bounds, if returnObjects == true, then return all the objects in these tiles
     * */
    getCoveredTiles1:function(rect, returnObjects)
    {
        returnObjects = (returnObjects === true);
        var t = this.getTileIndex(cc.p(rect.x, rect.y));
        var leftX = t.x;
        var leftY = t.y;
        t = this.getTileIndex(cc.p(rect.x + rect.width, rect.y + rect.height));
        var rightX = t.x;
        var rightY = t.y;
        var tiles = [];
        var i = leftX - 1;
        var j = 0;
        while(++i <= rightX) {
            j = leftY - 1;
            while(++j <= rightY) {
                if(returnObjects) {
                    tiles = tiles.concat(this.getObjects(i, j));
                }else {
                    tiles.push(cc.p(i, j));
                }
            }
        }
        return tiles;
    },
    isValideTile:function(tx, ty)
    {
        return tx >= 0 && tx < this._mapWidth && ty >= 0 && ty < this._mapHeight;
    },
    snapToTile:function(sprite, tx, ty, autoAdd)
    {
        if(!(sprite instanceof cc.Node)) return;
        var pos = null;
        if(tx === undefined || ty === undefined) {
            pos = sprite.getPosition();
            if(sprite.parent) pos = sprite.parent.convertToWorldSpace(pos);
            var t = this.getTileIndex(pos);
            tx = t.x;
            ty = t.y;
        }
        pos = this.getTiledPosition(tx, ty);
        if(sprite.parent) pos = sprite.parent.convertToNodeSpace(pos);
        sprite.setPosition(pos);
        if(autoAdd === true) {
            sprite.setTileMap(this);
        }
    },
    snapAll:function()
    {
        var n = this._objectsArr.length;
        var i = -1;
        var obj = null;
        while(++i < n)
        {
            obj = this._objectsArr[i];
            this.snapToTile(obj)
        }
    },
    addObject:function(object, tx, ty)
    {
        if(tx === undefined) tx = object.tx;
        if(ty === undefined) ty = object.ty;
        object.tx = tx;
        object.ty = ty;
        if(!this.isValideTile(tx, ty)) return;
        if(this._objectsArr.indexOf(object) > -1) return;
        this._objectsArr.push(object);
        var objs = this._objectsMap[tx][ty];
        if(!(object instanceof cc.Node)|| !this.autoLayout) {
            objs.push(object);
            return;
        }
        var zIndex0 = (tx + (this._mapHeight - 1 - ty)*this._mapWidth)*MAX_IN_TILE;
        var child = null;
        var childCount = 0;
        var inserted = false;
        for(var i = 0; i < objs.length; i++)
        {
            child = objs[i];
            if(child instanceof cc.Node)
            {
                if(!inserted && child.y <= object.y)
                {
                    objs.splice(i, 0, object);
                    object.zIndex = Math.min(childCount, MAX_IN_TILE) + zIndex0;
                    inserted = true;
                    childCount++;
                    i++;
                }
                child.zIndex = Math.min(childCount, MAX_IN_TILE) + zIndex0;
                childCount++;
            }
        }
        if(!inserted)
        {
            objs.push(object);
            object.zOrder = Math.min(childCount, MAX_IN_TILE) + zIndex0;
        }
    },
    updateLayout:function(tx, ty)
    {
        if(!this.isValideTile(tx, ty)) return;
        var objs = this._objectsMap[tx][ty];
        if(objs.length == 0) return;
        objs.sort(this._sortByY);
        var zOrder0 = (tx + (this._mapHeight - 1 - ty)*this._mapWidth)*MAX_IN_TILE;
        var child = null;
        var childCount = 0;
        for(var i = 0; i < objs.length; i++)
        {
            child = objs[i];
            if(child instanceof cc.Node)
            {
                child.zIndex = Math.min(childCount, MAX_IN_TILE) + zIndex0;
                childCount++;
            }
        }
    },
    removeObject:function(object, tx, ty)
    {
        if(tx === undefined) tx = object.tx;
        if(ty === undefined) ty = object.ty;
        if(this.isValideTile(tx, ty))
        {
            var objs = this._objectsMap[tx][ty];
            var i = objs.indexOf(object);
            if(i > -1)
            {
                objs.splice(i, 1);
            }
            i = this._objectsArr.indexOf(object);
            if(i > -1){
                this._objectsArr.splice(i, 1);
            }
        }
    },
    removeObjects:function(tx, ty)
    {
        if(!this.isValideTile(tx, ty)) return;
        var objs = this._objectsMap[tx][ty];
        var obj = null;
        var i = -1;
        while(objs.length)
        {
            obj = objs[0];
            obj.tx = obj.ty = -1;
            i = this._objectsArr.indexOf(obj);
            if(i > -1) this._objectsArr.splice(i, 1);
            objs.splice(0, 1);
        }
    },
    /**
     * Get all the objects in the tile tx & ty
     * */
    getObjects:function(tx, ty)
    {
        if(this.isValideTile(tx, ty))
        {
            return this._objectsMap[tx][ty];
        }
        return [];
    },
    /**
     * Get all the objects in the tile of the position
     * */
    getObjects1:function(x, y)
    {
        var t = this.getTileIndex(cc.p(x, y));
        return this.getObjects(t.x, t.y);
    },
    getAllObjects:function()
    {
        return this._objectsArr;
    },
    getTiles:function(filterFunc)
    {
        var tiles = [];
        var i = -1;
        var j = -1;
        while(++i < this._mapWidth){
            j = -1;
            while(++j < this._mapHeight){
                if(filterFunc == null || filterFunc(this, i, j) !== false){
                    tiles.push(cc.p(i, j));
                }
            }
        }
        return tiles;
    },
    /**
     * Return all the tiles on the row , if returnObjects == true, then return all the objects in these tiles
     * */
    getRow:function(row, returnObject)
    {
        var i = -1;
        var result = [];
        while(++i < this._mapHeight){
            if(returnObject === true) result = result.concat(this.getObjects(row, i));
            else result = result.push(cc.p(row, i));
        }
        return result;
    },
    /**
     * Return all the tiles on the col column, if returnObjects == true, then return all the objects in these tiles
     * */
    getCol:function(col, returnObject)
    {
        var i = -1;
        var result = [];
        while(++i < this._mapWidth){
            if(returnObject === true) result = result.concat(this.getObjects(i, col));
            else result = result.push(cc.p(i, col));
        }
        return result;
    },
    isEmptyTile:function(tx, ty)
    {
        if(!this.isValideTile(tx, ty)) return false;
        var objs = this.getObjects(tx, ty);
        if(objs)
        {
            return objs.length == 0;
        }
        return false;
    },
    _sortByY:function(a, b)
    {
        if(a.y > b.y)
            return -1;
        if(a.y < b.y)
            return 1;
    }
});

lg.TileMap.create = function(id)
{
    var map = new lg.TileMap();
    map.id = id;
    return map;
};
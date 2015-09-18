/**
 * Created by long on 14-2-2.
 */
ALL_DIRECTONS  = ["UP","DOWN","LEFT","RIGHT","LEFT_UP","RIGHT_UP","RIGHT_DOWN","LEFT_DOWN"];
ALL_DIRECTONS0 = ["UP","DOWN","LEFT","RIGHT","LEFT_UP","LEFT_DOWN"];
ALL_DIRECTONS1 = ["UP","DOWN","LEFT","RIGHT","RIGHT_UP","RIGHT_DOWN"];
EIGHT_DIRECTIONS_VALUE  = {"UP":[0,1],"DOWN":[0,-1],"LEFT":[-1,0],"RIGHT":[1,0],"LEFT_UP":[-1,1],"RIGHT_UP":[1,1],"RIGHT_DOWN":[1,-1],"LEFT_DOWN":[-1,-1]};
MAX_IN_TILE = 10;

flax.TileMap = cc.Node.extend({
    isHexagon:false,//if true, the tiles will layout like the bubble safari
    autoLayout:false,
    _allTilesIndex:null,
    _gridCanvas:null,
    _tileWidth:0,
    _tileHeight:0,
    _mapWidth:0,
    _mapHeight:0,
    _objectsMap:null,
    _objectsArr:null,
    _inUpdate:false,
    _offset:null,

    ctor:function()
    {
        this._super();
        this.setAnchorPoint(0, 0);
        this._offset = cc.p();
    },
    init:function(tileWidth, tileHeight, mapWidth, mapHeight, inPixel)
    {
        if(!tileWidth || !tileHeight) throw "Please set tileWdith and tileHeight!"
        this._tileWidth = tileWidth;
        this._tileHeight = tileHeight;
        if(mapWidth && mapHeight) this.setMapSize(mapWidth, mapHeight, inPixel);
    },
    //fix the tile update bug when in JSB
    update:function(delta){
        var i = this._objectsArr ? this._objectsArr.length : 0;
        while(i--){
            var obj = this._objectsArr[i];
            if(obj.autoUpdateTileWhenMove) obj.updateTile();
        }
    },
    getTileSize:function(){
        return {width: this._tileWidth, height: this._tileHeight};
    },
    getMapSizePixel:function()
    {
        var s = cc.size(this._tileWidth*this._mapWidth, this._tileHeight*this._mapHeight);
        if(this.isHexagon) s.width += this._tileWidth*0.5;
        return s;
    },
    setMapSize:function(w, h, inPixel)
    {
//        if(!w) w = cc.visibleRect.width;
//        if(!h) h = cc.visibleRect.height;
        if(inPixel == true){
            w = Math.ceil(w/this._tileWidth);
            h = Math.ceil(h/this._tileHeight);
        }
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
        this.setContentSize(this.getMapSizePixel());
        return result;
    },
    getMapSize:function(){
        return {width:this._mapWidth, height:this._mapHeight};
    },
    /**
     * @deprecated
     * */
    showDebugGrid:function()
    {
        this.showGrid();
    },
    showGrid:function(lineWidth, lineColor){
        if(this._gridCanvas) this._gridCanvas.clear();
        else{
            this._gridCanvas = cc.DrawNode.create();
            this.addChild(this._gridCanvas);
        }
        if(!lineWidth) lineWidth = 1;
        if(!lineColor) lineColor = cc.color(255,0,0,255);
        for(var i = 0; i <= this._mapWidth; i++){
            this._gridCanvas.drawSegment(cc.p(i*this._tileWidth, 0), cc.p(i*this._tileWidth, this._tileHeight*this._mapHeight), lineWidth, lineColor);
        }
        for(var j = 0; j <= this._mapHeight; j++){
            this._gridCanvas.drawSegment(cc.p(0, j*this._tileHeight), cc.p(this._tileWidth*this._mapWidth, j*this._tileHeight), lineWidth, lineColor);
        }
    },

    hideGrid:function()
    {
        if(this._gridCanvas) this._gridCanvas.clear();
    },
    showDebugTile:function(tx, ty, color){
        var pos = this.getTiledPosition(tx, ty);
        if(color == null) color = cc.color(0, 255, 0, 128);
        var s = flax.getScale(this, true);
        flax.drawRect(cc.rect(pos.x - this._tileWidth*s.x/2, pos.y - this._tileHeight*s.y/2, this._tileWidth*s.x, this._tileHeight*s.y),1, color, color);
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
    /**
     * Note: Must be the global position
     * */
    getTileIndex:function(pos, y){
        var x0,y0;
        if(y == null){
            x0 = pos.x;
            y0 = pos.y;
        }else{
            x0 = pos;
            y0 = y;
        }

        var offset = this._offset;
        offset.x = this.getPositionX();
        offset.y = this.getPositionY();
        if(this.parent) offset = this.parent.convertToWorldSpace(offset);

        var scale = flax.getScale(this, true);
        var sx = Math.abs(scale.x);
        var sy = Math.abs(scale.y);

        var tx = Math.floor((x0 - offset.x)/(this._tileWidth*sx));
        var ty = Math.floor((y0 - offset.y)/(this._tileHeight*sy));
        if(this.isHexagon && ty%2 != 0) tx = Math.floor((x0 - offset.x - (this._tileWidth*sx)*0.5)/(this._tileWidth*sx));
        return {x:tx, y:ty};
    },
    getTiledPosition:function(tx, ty){

        var offset = this._offset;
        offset.x = this.getPositionX();
        offset.y = this.getPositionY();
        if(this.parent) offset = this.parent.convertToWorldSpace(offset);

        var scale = flax.getScale(this, true);
        var sx = Math.abs(scale.x);
        var sy = Math.abs(scale.y);

        var x = (tx + 0.5)*this._tileWidth*sx + offset.x;
        var y = (ty + 0.5)*this._tileHeight*sy + offset.y;
        if(this.isHexagon && ty%2 != 0) x += 0.5*this._tileWidth*sx;
        return {x:x, y:y};
    },
    /**
     * All the tiles/objects occupied by the sprite bounds, if returnObjects == true, then return all the objects in these tiles
     * */
    getCoveredTiles:function(sprite, returnObjects)
    {
        var rect = flax.getRect(sprite, true);
        return this.getCoveredTiles1(rect, returnObjects);
    },
    /**
     * All the tiles/objects occupied by the rect bounds, if returnObjects == true, then return all the objects in these tiles
     * */
    getCoveredTiles1:function(rect, returnObjects)
    {
        returnObjects = (returnObjects === true);
        var t = this.getTileIndex(rect.x, rect.y);
        var leftX = t.x;
        var leftY = t.y;
        t = this.getTileIndex(rect.x + rect.width, rect.y + rect.height);
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
                    //todo, the tile maybe has invalide
                    tiles.push({x:i, y:j});
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
        if(tx == null || ty == null) {
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

        //fix the update tile bug when in JSB
        if(!this._inUpdate && cc.sys.isNative) {
            this._inUpdate = true;
            cc.director.getScheduler().scheduleUpdateForTarget(this);
        }

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
        var zIndex0 = (tx + (this._mapHeight - 1 - ty)*this._mapWidth)*MAX_IN_TILE;
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
        //fix the update tile bug when in JSB
        if(this._inUpdate && cc.sys.isNative && this._objectsArr.length == 0) {
            this._inUpdate = false;
            cc.director.getScheduler().unscheduleUpdateForTarget(this);
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
     * Note: Must be the global x and y
     * */
    getObjects1:function(x, y)
    {
        var t = this.getTileIndex(x, y);
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
                    tiles.push({x:i, y:j});
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
            else result = result.push({x:row, y:i});
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
            else result = result.push({x:i, y:col});
        }
        return result;
    },
    __tilesSearched:null,
    __nonRecursive:false,
    /**
     * Find all the objects connected with each other in the tileMap with same property if set
     * @param {sprite|{tx,ty}} sprite sprite or {tx,ty} pair to search
     * @param {string} property if set property, only find the targets with the same property
     * @param {bool} diagonally only valid for none-hexagon tileMap
     * */
     findConnectedObjects:function(sprite, property, diagonally){
        this.__tilesSearched = {};
        var arr = this.findNeighbors(sprite, property, diagonally, null, false);
        var i = arr.indexOf(sprite);
        if(i > -1) arr.splice(i, 1);
        this.__tilesSearched = null;
        return arr;
    },
    /**
     * Find the neighbors around the sprite
     * @param {sprite|{tx,ty}} sprite sprite or {tx,ty} pair to search
     * @param {string} property if set property, only find the targets with the same property
     * @param {bool} diagonally only valid for none-hexagon tileMap
     * @param {string} direction "UP","DOWN","LEFT","RIGHT", if null, return all directions
     * @returnTile {bool} if return tiles instead of objects
     * */
    findNeighbors:function(sprite, property, diagonally, direction, returnTile){
        var directions = this._getAllDirections(sprite, diagonally, direction);
        var recursive = !this.__nonRecursive && (this.__tilesSearched != null);
        var result = [];
        var i = directions.length;
        while(i--){
            var d = EIGHT_DIRECTIONS_VALUE[directions[i]];
            var tx = sprite.tx + d[0];
            var ty = sprite.ty + d[1];
            if(this.__tilesSearched){
                var k = tx+"-"+ty;
                if(this.__tilesSearched[k] === true) continue;
                this.__tilesSearched[k] = true;
            }
            if(!returnTile){
                var arr = this.getObjects(tx, ty);
                var obj = null;
                var searched = false;
                for(var j = 0; j < arr.length; j++){
                    obj = arr[j];
                    if(property == null || property.length == 0 || obj[property] === sprite[property]){
                        result.push(obj);
                        if(!searched && recursive) {
                            result = result.concat(this.findNeighbors(obj, property, diagonally, direction, returnTile));
                            searched = true;
                        }
                    }
                }
            }else{
                //if returnTile = true, recursive have no sense
                result.push({x: tx, y: ty});
            }
        }
        return result;
    },
    /**
     * Find all the separated object groups in the map, some blank tiles will cause such separated groups
     * */
    findSeparatedGroups:function(){
        var groups = [];
        var arr = null;
        this.__tilesSearched = {};
        var hintObjs = this.getAllObjects();
        var all = [];
        var n = hintObjs.length;
        for(i = 0; i < n; i++){
            nb = hintObjs[i];
            if(all.indexOf(nb) > -1) continue;
            arr = this.findNeighbors(nb);
            if(!arr.length && this.__tilesSearched[nb.tx+"-"+nb.ty] !== true) {
                arr= [nb];
                this.__tilesSearched[nb.tx+"-"+nb.ty] = true;
            }
            groups.push(arr);
            all = all.concat(arr);
        }
        this.__tilesSearched = null;
        return groups;
    },
    /**
     * Find the neighbors around the sprite, num meant to how many layers to search
     * @param {sprite|{tx,ty}} sprite  sprite or {tx,ty} pair to start search
     * @param {int} num the layer count to search
     * @param {bool} returnObjects default return tiles, if true, return objects
     * @param {bool} onlyConnected if returnObjects is true, ignore these objects don't connected togethor
     * return an Array contains all layers
     * */
    findSurroundings:function(sprite, num, returnObjects, onlyConnected){
        if(num == null || num < 1) num = 1;
        var circle = [sprite];
        var result = [];
        this.__tilesSearched = {};
        this.__nonRecursive = true;
        while(num--){
            var arr = [];
            for(var i = 0; i < circle.length; i++){
                var t = circle[i];
                if(t.tx === undefined) t = {tx: t.x, ty: t.y};
                arr = arr.concat(this.findNeighbors(t, null, true, null, returnObjects&&onlyConnected ? !returnObjects : true));
            }
            circle = arr;
            if(returnObjects && !onlyConnected){
                var objs = [];
                for(i = 0; i < arr.length; i++){
                    var t = arr[i];
                    objs = objs.concat(this.getObjects(t.x, t.y));
                }
                result.push(objs);
            }else{
                result.push(arr);
            }
        }
        this.__tilesSearched = null;
        this.__nonRecursive = false;
        return result;
    },
    _getAllDirections:function(sprite, diagonally, direction){
        var directions = ALL_DIRECTONS;
        if(this.isHexagon) {
            if(sprite.ty%2 == 0) directions = ALL_DIRECTONS0;
            else directions = ALL_DIRECTONS1;
        }else if(!diagonally){
            directions = directions.slice(0, 4);
        }
        var i = ALL_DIRECTONS.indexOf(direction);
        if(i == -1 || i > 3) return directions;

        var arr = [];
        var d = null;
        for(i = 0; i < directions.length; i++){
            d = directions[i];
           if(d.indexOf(direction) > -1){
                arr.push(d);
           }
        }
        //handle the left and right for hexgon type
        if(this.isHexagon && arr.length == 1) arr.push("UP","DOWN");
        return arr;
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
    tileToIndex:function(tx, ty)
    {
        return ty*this._mapWidth + tx;
    },
    indexToTile:function(i)
    {
        var tx = i%this._mapWidth;
        var ty = Math.floor((i - tx)/this._mapWidth);
        return {x:tx, y:ty};
    },
    getAllTilesIndex:function()
    {
        if(!this._allTilesIndex){
            this._allTilesIndex = [];
            for(var i = 0; i < this._mapWidth*this._mapHeight; i++){
                this._allTilesIndex.push(i);
            }
        }
        return this._allTilesIndex;
    },
    findEmptyTilesIndex:function()
    {
        var allTiles = this.getAllTilesIndex().concat();
        var objs = this._objectsArr;
        var len = objs.length;
        for(var i = 0; i < len; i++){
            if(!allTiles.length) break;
            var obj = objs[i];
            var blocks = this.getCoveredTiles(obj);
            var bLen = blocks.length;
            for(var j = 0; j < bLen; j++){
                var b = blocks[j];
                var ii = allTiles.indexOf(this.tileToIndex(b.x, b.y));
                if(ii > -1) allTiles.splice(ii, 1);
            }
        }
        return allTiles;
    },
    _sortByY:function(a, b)
    {
        if(a.y > b.y)
            return -1;
        if(a.y < b.y)
            return 1;
    }
});

flax.TileMap.create = function(id)
{
    var map = new flax.TileMap(id);
    return map;
};

var _p = flax.TileMap.prototype;
/** @expose */
_p.tileSize;
cc.defineGetterSetter(_p, "tileSize", _p.getTileSize);
/** @expose */
_p.mapSize;
cc.defineGetterSetter(_p, "mapSize", _p.getMapSize);

/**
 * @deprecated
 * */
flax._tileMaps = {};
/**
 * @deprecated
 * */
flax.getTileMap = function(id)
{
    if(typeof flax._tileMaps[id] !== "undefined") return flax._tileMaps[id];
    cc.log("The tileMap: "+id+" hasn't been defined, pls use flax.registerTileMap to define it firstly!");
    return null;
};
/**
 * @deprecated
 * */
flax.registerTileMap = function(tileMap)
{
    flax._tileMaps[tileMap.id] = tileMap;
};
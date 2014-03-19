/**
 * Created by long on 14-2-21.
 */

var lg = lg || {};

lg.TiledImage = cc.SpriteBatchNode.extend({
    tileMap:null,
    tileWidthOffset: -1,
    tileHeightOffset:-1,
    _plistFile:null,
    _taID:null,
    _minWidth:0,
    _minHeight:0,
    _pool:null,

    initWithFile:function(fileImage, capacity)
    {
        this._super(fileImage, capacity);
        this.tileMap = lg.TileMap.create("tile_image_"+lg.randInt(0, 1000));
        return true;
    },
    setTileSource:function(plistFile, assetID)
    {
        if(this._plistFile == plistFile && this._taID == assetID) return;
        this._plistFile = plistFile;
        this._taID = assetID;

        this._pool = lg.ObjectPool.get(plistFile, "lg.Animator");

        var tile = lg.assetsManager.createDisplay(this._plistFile, this._taID);
        var size = tile.getContentSize();
        this.tileMap.setTileSize(size.width + this.tileWidthOffset, size.height + this.tileHeightOffset);

        if(this._minWidth * this._minHeight > 0) {
            if(this._children.length > 0) this._updateTileImg();
            else this._updateSize();
        }
    },
    setMinSize:function(w,h)
    {
        var deltaW = w - this._minWidth;
        var deltaH = h - this._minHeight;
        if(deltaW * deltaH == 0) return;
        this._minWidth = w;
        this._minHeight = h;
        if(this._plistFile) {
            this._updateSize();
        }
    },
//    setPosition:function(pos, yValue)
//    {
//        var oldX = this._position._x;
//        var oldY = this._position._y;
//        var dirty = false;
//        if(yValue === undefined) {
//            dirty = (pos.x != oldX || pos.y != oldY);
//            if(dirty) this._super(pos);
//        }else {
//            dirty = (pos != oldX || yValue != oldY);
//            if(dirty) this._super(pos, yValue);
//        }
//        if(!dirty || !this.autoScroll) return;
//
////        this.tileMap.offsetX = this._position._x;
////        this.tileMap.offsetY = this._position._y;
//
//        var deltaX = this._position._x - oldX;
//        var deltaY = this._position._y - oldY;
//
//        var dtx = Math.ceil(this._position._x/this.tileMap._tileWidth);
//        var dty = Math.ceil(this._position._y/this.tileMap._tileHeight);
//
//        //to add
//        var snx = (deltaX >= 0) ? 1 : -1;
//        var sny = (deltaY >= 0) ? 1 : -1;
//        var i = (deltaX >= 0) ? 0 : this.tileMap._mapWidth - 1;
//        var j = (deltaY >= 0) ? 0 : this.tileMap._mapHeight - 1;
//        var bx = this.tileMap.getTiledPositionX(i - 0.5*snx) + this._position._x;
//        var by = this.tileMap.getTiledPositionY(j - 0.5*sny) + this._position._y;
//
//        //todo
//    },
    _updateTileImg:function()
    {
        var child = null;
        var num = this._children.length;
        var i = -1;
        while(++i < num)
        {
            child = this._children[i];
            child.setPlist(this._plistFile, this._taID);
        }
    },
    _updateSize:function()
    {
        var objs = this.tileMap.setMapSizePixel(this._minWidth, this._minHeight);
        var i;
        var n = objs[0].length;
        if(n > 0) {
            var tile;
            i = -1;
            while(++i < n){
                //remove the tiles
                tile = objs[0][i];
                tile.destroy();
            }
        }
        n = objs[1].length;
        if(n > 0) {
            i = -1;
            while(++i < n){
                this._createTile(objs[1][i][0], objs[1][i][1]);
            }
        }
        this.setContentSize(this.tileMap.getPixelSize());
    },
    _createTile:function(i, j)
    {
        var tile = this._pool.fetch(this._taID, this);
        tile.setAnchorPoint(0.5, 0.5);
        this.tileMap.addObject(tile, i, j);
        this.tileMap.snapToTile(tile, i, j);
//        this.addChild(tile);
        return tile;
    }
});

lg.TiledImage.create = function(plistFile, assetID, minWidth, minHeight)
{
    var ts = new lg.TiledImage();
    var imgFile = plistFile.replace("."+lg.getFileExtension(plistFile), ".png");
    if(ts.initWithFile(imgFile, 10))
    {
        ts.setTileSource(plistFile, assetID);
        if(!isNaN(minWidth)) minWidth = lg.stage.width();
        if(!isNaN(minHeight)) minHeight = lg.stage.height();
        ts.setMinSize(minWidth, minHeight);
        return ts;
    }
    return null;
};
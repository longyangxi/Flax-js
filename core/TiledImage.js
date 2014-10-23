/**
 * Created by long on 14-2-21.
 */

var lg = lg || {};

lg.TiledImage = cc.SpriteBatchNode.extend({
    tileMap:null,
    tileWidthOffset: -1,
    tileHeightOffset:-1,
    _assetsFile:null,
    _taID:null,
    _minWidth:0,
    _minHeight:0,
    _pool:null,

    init:function(fileImage, capacity)
    {
        this._super(fileImage, capacity);
        this.tileMap = lg.TileMap.create("tile_image_"+lg.randInt(0, 1000));
        return true;
    },
    setTileSource:function(assetsFile, assetID)
    {
        if(this._assetsFile == assetsFile && this._taID == assetID) return;
        this._assetsFile = assetsFile;
        this._taID = assetID;

        this._pool = lg.ObjectPool.get(assetsFile, "lg.Animator");

        var tile = lg.assetsManager.createDisplay(this._assetsFile, this._taID);
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
        if(this._assetsFile) {
            this._updateSize();
        }
    },
    _updateTileImg:function()
    {
        var child = null;
        var num = this._children.length;
        var i = -1;
        while(++i < num)
        {
            child = this._children[i];
            child.setSource(this._assetsFile, this._taID);
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

lg.TiledImage.create = function(assetsFile, assetID, minWidth, minHeight)
{
    var ts = new lg.TiledImage();
    var imgFile = cc.path.changeBasename(assetsFile, ".png");
    if(ts.init(imgFile, 10))
    {
        ts.setTileSource(assetsFile, assetID);
        if(!isNaN(minWidth)) minWidth = cc.visibleRect.width;
        if(!isNaN(minHeight)) minHeight = cc.visibleRect.height;
        ts.setMinSize(minWidth, minHeight);
        return ts;
    }
    return null;
};
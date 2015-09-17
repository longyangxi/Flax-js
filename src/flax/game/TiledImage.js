/**
 * Created by long on 14-2-21.
 */
/**
 * Layer.bake maybe a choice for good performance
 * */
flax.TiledImage = cc.SpriteBatchNode.extend({
    tileMap:null,
    tileWidthOffset: 0,
    tileHeightOffset:0,
    assetsFile:null,
    assetID:null,
    _mapWidth:0,
    _mapHeight:0,

    ctor:function(assetsFile, assetID, minWidth, minHeight)
    {
        var imgFile = cc.path.changeBasename(assetsFile, ".png");
        cc.SpriteBatchNode.prototype.ctor.call(this, imgFile);
        this.tileMap = new flax.TileMap();
        this.setTileSource(assetsFile, assetID);
        if(!minWidth) minWidth = cc.visibleRect.width;
        if(!minHeight) minHeight = cc.visibleRect.height;
        this.setSize(minWidth, minHeight);
    },
    setTileSource:function(assetsFile, assetID)
    {
        if(this.assetsFile == assetsFile && this.assetID == assetID) return;
        this.assetsFile = assetsFile;
        this.assetID = assetID;

        var tile = flax.assetsManager.createDisplay(this.assetsFile, this.assetID);
        var size = tile.getContentSize();
        this.tileMap.init(size.width + this.tileWidthOffset, size.height + this.tileHeightOffset);

        if(this._mapWidth * this._mapHeight > 0) {
            if(this.getChildrenCount() > 0){
                this._updateTileImg();
            }
            this._updateSize();
        }
    },
    /**
     * todo, there is issue when randomly change the size
     * */
    setSize:function(w, h)
    {
        if(w == this._mapWidth && h == this._mapHeight) return;
        this._mapWidth = w;
        this._mapHeight = h;
        if(this.assetsFile) {
            this._updateSize();
        }
    },
    _updateTileImg:function()
    {
        var child = null;
        var num = this.getChildrenCount();
        var i = -1;
        while(++i < num)
        {
            child = this.children[i];
            child.setSource(this.assetsFile, this.assetID);
            this.tileMap.snapToTile(child, child.tx, child.ty);
        }
    },
    _updateSize:function()
    {
        var objs = this.tileMap.setMapSize(this._mapWidth, this._mapHeight, true);
        var i;
        var n = objs[0].length;
        if(n > 0) {
            var tile;
            i = -1;
            while(++i < n){
                //remove the tiles
                tile = objs[0][i];
                if(tile.destroy) tile.destroy();
                else tile.removeFromParent();
            }
        }
        n = objs[1].length;
        if(n > 0) {
            i = -1;
            while(++i < n){
                this._createTile(objs[1][i][0], objs[1][i][1]);
            }
        }
        this.setContentSize(this.tileMap.getMapSizePixel());
    },
    _createTile:function(i, j)
    {
        var tile = flax.assetsManager.createDisplay(this.assetsFile, this.assetID, {parent: this}, true);
        tile.setAnchorPoint(0.5, 0.5);
        this.tileMap.snapToTile(tile, i, j, true);
        return tile;
    }
});
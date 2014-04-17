/**
 * Created by long on 14-2-3.
 */

SPACE_CHAR_GAP = 10;

var lg = lg || {};
lg.Label = cc.SpriteBatchNode.extend({
    mlWidth:0.0,
    mlHeight:0.0,
    //font gap, 1.f means the gap between two fonts is zero
    gapScale:1.0,
    str:null,
    fontName:null,
    fontSize:20,
    frames:[],
    chars:[],
    plistFile:null,
    name:null,
    params:null,
    _fontDefine:null,

    getString:function()
    {
        return this.str;
    },
    setString:function(str)
    {
        this.str = ""+str;
        this._updateStr();
    },
    getGapScale:function()
    {
        return this.gapScale;
    },
    setGapScale:function(gap)
    {
        if(gap == this.gapScale) return;
        this.gapScale = gap;
        if(this.str)
        {
            this._updateStr();
        }
    },
    setFontName:function(font)
    {
        if(font == null) return;
        if(this.fontName != null && this.fontName == font) return;
        this.fontName = font;
        this._fontDefine = lg.assetsManager.getFont(this.plistFile, this.fontName);
        this.frames = lg.assetsManager.getFrameNames(this.plistFile, parseInt(this._fontDefine.start), parseInt(this._fontDefine.end));
        this.chars = this._fontDefine.chars;
        this.fontSize = parseInt(this._fontDefine.size);
    },
    _updateStr:function()
    {
        this.removeAllChildren();
        this.mlWidth = 0;
        this.mlHeight = 0;
        for(var i = 0; i < this.str.length ; i++)
        {
            var ch = this.str[i];
            //if it's a break char or other special char, ignore it for now!
            if(ch == "\n")
            {
                continue;
            }
            if(ch == " ")
            {
                this.mlWidth += SPACE_CHAR_GAP;
                continue;
            }
            var charIndex = -1;
            for(var j = 0; j < this.chars.length; j++)
            {
                if(this.chars[j] == ch)
                {
                    charIndex = j;
                    break;
                }
            }
            if(charIndex == -1)
            {
                cc.log("Not found the char: "+ch + " in the fonts: "+ this.fontName);
                continue;
            }

            //create a char sprite
            var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(this.frames[charIndex]));
            sprite.anchorX = this._fontDefine.anchorX;
            sprite.anchorY = this._fontDefine.anchorY;
            // calculate the position of the sprite;
            var size = sprite.getContentSize();
            sprite.x = this.mlWidth;
            sprite.y = 0;
            this.mlWidth += size.width * this.gapScale;
            this.mlHeight = size.height > this.mlHeight ? size.height : this.mlHeight;
            this.addChild(sprite);
        }
        if(this.params){
            //restrain the text within the rectangle
            var rx = this.mlWidth/this.params.width;
            var ry = this.mlHeight/this.params.height;
            var r = Math.max(rx, ry);
            var deltaY = 0;
            if(r > 1){
                this.scale = 1/r;
                deltaY = this.mlHeight*(1 - 1/r)*r;
                this.mlWidth *= this.scale;
                this.mlHeight *= this.scale;

            }
            //enable the center align
            var deltaX = (this.params.width - this.mlWidth)/2;
            var i = this.childrenCount;
            while(i--){
                if(this.params.align == "center") this.children[i].x += deltaX;
                this.children[i].y -= deltaY;
            }
        }
        this.setContentSize(this.mlWidth, this.mlHeight);
    }
});

lg.Label.create = function(plistFile, fontName)
{
    var imgFile = plistFile.replace("."+lg.getFileExtension(plistFile), ".png");
    var lbl = new lg.Label(imgFile, 10);
    lbl.plistFile = plistFile;
    lg.assetsManager.addPlist(plistFile);
    lbl.setFontName(fontName);
    return lbl;
};
/**
 * Created by long on 14-2-3.
 */

SPACE_CHAR_GAP = 10;

var lg = lg || {};
//todo, 1. align mode 2. auto add or remove char
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

    getString:function()
    {
        return this.str;
    },
    setString:function(str)
    {
        this.str = ""+str;
        this._setString(str);
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
            this._setString(str);
        }
    },
    setFontName:function(font)
    {
        if(font == null) return;
        if(this.fontName != null && this.fontName == font) return;
        this.fontName = font;
        var mcCache = lg.assetsManager;
        var fontDefine = mcCache.getFont(this.plistFile, this.fontName);
        this.frames = mcCache.getFrameNames(this.plistFile, parseInt(fontDefine["start"]), parseInt(fontDefine["end"]));
        this.chars = fontDefine["chars"];
        this.fontSize = parseInt(fontDefine["size"]);
    },
    _setString:function(str)
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
            var sprite = cc.Sprite.createWithSpriteFrame(cc.SpriteFrameCache.getInstance().getSpriteFrame(this.frames[charIndex]));
            // calculate the position of the sprite;
            var size = sprite.getContentSize();
            sprite.setPosition(this.mlWidth, 0);
            this.mlWidth += size.width * this.gapScale;
            this.mlHeight = size.height > this.mlHeight ? size.height : this.mlHeight;
            //all the label sprites are anchored on the left-top corner as in Flash
            sprite.setAnchorPoint(0, 1);
            this.addChild(sprite);
        }
        this.setContentSize(this.mlWidth, this.mlHeight);
    }
});

lg.Label.create = function(plistFile, fontName, gapScale)
{
    var lbl = new lg.Label();
    lbl.plistFile = plistFile;
    lbl.gapScale = gapScale === undefined ? 1.0 : gapScale;

    var imgFile = plistFile.replace("."+lg.getFileExtension(plistFile), ".png");
    if(lbl.initWithFile(imgFile, 10))
    {
        lg.assetsManager.addPlist(plistFile);
        lbl.setFontName(fontName);
        return lbl;
    }
    return null;
};
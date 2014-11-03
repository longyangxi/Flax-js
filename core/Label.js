/**
 * Created by long on 14-2-3.
 */

SPACE_CHAR_GAP = 10;

var flax = flax || {};
flax.Label = cc.Sprite.extend({
    mlWidth:0.0,
    mlHeight:0.0,
    //font gap, 1.0 means the gap between two fonts is zero
    gapScale:1.0,
    str:null,
    fontName:null,
    fontSize:20,
    frames:[],
    chars:[],
    assetsFile:null,
    name:null,
    params:null,
    noOpacity:true,
    _charCanvas:null,
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
    tweenInt:function(from, to, time){
        this.setString(from);
        var sign = flax.numberSign(to - from);
        if(sign == 0) return;

        var num = Math.abs(to - from);
        var interval = Math.max(time/num, flax.frameInterval);
        num = Math.round(time/interval);
        sign *= Math.round(Math.abs(to - from)/num);

        this.schedule(function(delta){
            var ci = parseInt(this.str) + sign;
            if(sign > 0 && ci > to) ci = to;
            else if(sign < 0 && ci < to) ci = to;
            this.setString(ci);
        },interval, num + 2);
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
        this._fontDefine = flax.assetsManager.getFont(this.assetsFile, this.fontName);
        if(this._fontDefine == null){
            throw "Can't find the font named: " + this.fontName;
        }
        this.frames = flax.assetsManager.getFrameNames(this.assetsFile, parseInt(this._fontDefine.start), parseInt(this._fontDefine.end));
        this.chars = this._fontDefine.chars;
        this.fontSize = parseInt(this._fontDefine.size);
    },
    _updateStr:function()
    {
        if(this._charCanvas == null) {
            var imgFile = cc.path.changeBasename(this.assetsFile, ".png");
            this._charCanvas = new cc.SpriteBatchNode(imgFile, this.str.length);
            this.addChild(this._charCanvas);
        }
        this._charCanvas.removeAllChildren();

        this.mlWidth = 0;
        this.mlHeight = 0;
        for(i = 0; i < this.str.length ; i++)
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

            sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(this.frames[charIndex]));
            sprite.anchorX = this._fontDefine.anchorX;
            sprite.anchorY = this._fontDefine.anchorY;
            // calculate the position of the sprite;
            var size = sprite.getContentSize();
            sprite.x = this.mlWidth;
            sprite.y = 0;
            this.mlWidth += size.width * this.gapScale;
            this.mlHeight = size.height > this.mlHeight ? size.height : this.mlHeight;
            this._charCanvas.addChild(sprite);
        }
        if(this.params){
            //restrain the text within the rectangle
            var rx = this.mlWidth/this.params.width;
            var ry = this.mlHeight/this.params.height;
            var r = Math.max(rx, ry);
            var deltaY = 0;
            if(r > 1){
                var rscale = 1/r;
                this._charCanvas.scale = rscale;
                deltaY = this.mlHeight*(1 - 1/r)*r;
                this.mlWidth *= rscale;
                this.mlHeight *= rscale;

            }
            //enable the center align
            var deltaX = (this.params.width - this.mlWidth)/2;
            i = this._charCanvas.childrenCount;
            while(i--){
                charChild = this._charCanvas.children[i];
                if(this.params.align == "center") charChild.x += deltaX;
                charChild.y -= deltaY;
            }
        }
        this._charCanvas.setContentSize(this.mlWidth, this.mlHeight);
        this.setContentSize(this.mlWidth, this.mlHeight);
        this.setOpacity(0);
    },
    getRect:function(global)
    {
        global = (global !== false);
        var border = 2;
        var rect = cc.rect(0.5*this.width/this.str.length, -this.params.height, this.width, this.height + border);
        rect.y += (this.params.height - this.height)/2 - border/2;
        if(!global) return rect;
        var w = rect.width;
        var h = rect.height;
        var origin = cc.p(rect.x, rect.y);
        origin = this.convertToWorldSpace(origin);
        return cc.rect(origin.x, origin.y, w, h);
    },
    destroy:function()
    {
        this.removeFromParent();
    }
});

flax.LabelTTF = cc.LabelTTF.extend({
    __isTTF:true,
    tweenInt:function(from, to, time){
        this.setString(from);
        var sign = flax.numberSign(to - from);
        if(sign == 0) return;

        var num = Math.abs(to - from);
        var interval = Math.max(time/num, flax.frameInterval);
        num = Math.round(time/interval);
        sign *= Math.round(Math.abs(to - from)/num);

        this.schedule(function(delta){
            var ci = parseInt(this.getString()) + sign;
            if(sign > 0 && ci > to) ci = to;
            else if(sign < 0 && ci < to) ci = to;
            this.setString(ci);
        },interval, num + 2);
    }
})

flax.Label.create = function(assetsFile, define)
{
    var lbl = null;
    var txtCls = define["class"];
    var bmpFontName = flax.assetsManager.getFont(assetsFile, txtCls);
    //If it is ttf label(has font and the bitmap font is null, other wise use bitmap label
    if(define.font && bmpFontName == null){
        var labelDef = new cc.FontDefinition();
        labelDef.fontName = define.font;
        labelDef.fontSize = define.size;
        labelDef.textAlign = H_ALIGHS.indexOf(define.align);
        labelDef.verticalAlign = cc.VERTICAL_TEXT_ALIGNMENT_CENTER;
        labelDef.fillStyle = cc.hexToColor(define.color);
        labelDef.fontDimensions = true;
        labelDef.boundingWidth = define.width;
        labelDef.boundingHeight = define.height;
        //todo, outline and shadow effect
        lbl = new flax.LabelTTF(flax.getLanguageStr(txtCls) || define.text, labelDef);
    }else{
        lbl = new flax.Label();
        flax.assetsManager.addAssets(assetsFile);
        lbl.assetsFile = assetsFile;
        lbl.params = define;
        lbl.setFontName(txtCls);
        lbl.setAnchorPoint(0, 0);
        lbl.setString(define.text);
    }
    return lbl;
};

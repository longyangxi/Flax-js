/**
 * Created by long on 14-2-3.
 */

flax.Label = cc.Sprite.extend({
    mlWidth:0.0,
    mlHeight:0.0,
    fontName:null,
    fontSize:20,
    frames:[],
    chars:[],
    assetsFile:null,
    name:null,
    params:null,
    _str:null,
    _gap:0,
    _spaceGap:10,
    _charCanvas:null,
    _fontDefine:null,

    getString:function()
    {
        return this._str;
    },
    setString:function(str)
    {
        if(str === this._str) return;
        this._str = ""+str;
        this._updateStr();
    },
    getSpaceGap:function()
    {
       return this._spaceGap;
    },
    setSpaceGap:function(gap)
    {
        if(this._spaceGap == gap)  return;
        this._spaceGap = gap;
        if(this._str && this._str.indexOf(" ") > -1){
            this._updateStr();
        }
    },
    getGap:function()
    {
        return this._gap;
    },
    setGap:function(gap)
    {
        if(gap == this._gap) return;
        this._gap = gap;
        if(this._str)
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
        this.frames = flax.assetsManager.getFrameNames(this.assetsFile, parseInt(this._fontDefine['start']), parseInt(this._fontDefine['end']));
        this.chars = this._fontDefine['chars'];
        this.fontSize = parseInt(this._fontDefine['size']);
    },
    tweenInt:function(from, to, time){
        this.setString(from);
        var sign = flax.numberSign(to - from);
        if(sign == 0) return;

        var num = Math.abs(to - from);
        var interval = Math.max(time/num, flax.frameInterval);
        num = Math.round(time/interval);
        sign *= Math.round(Math.abs(to - from)/num);
        //todo, num + 10 maybe cause bug!
        this.schedule(function(delta){
            var ct = parseInt(this._str);
            var ci = ct + sign;
            if(sign > 0 && ci > to) ci = to;
            else if(sign < 0 && ci < to) ci = to;
            if(ci != ct) this.setString(ci);
        },interval, num + 10);
    },
    _updateStr:function()
    {
        if(this._charCanvas == null) {
            var imgFile = cc.path.changeBasename(this.assetsFile, ".png");
            this._charCanvas = new cc.SpriteBatchNode(imgFile, this._str.length);
            this.addChild(this._charCanvas);
        }
        this._charCanvas.removeAllChildren();

        this.mlWidth = 0;
        this.mlHeight = 0;
        for(i = 0; i < this._str.length ; i++)
        {
            var ch = this._str[i];
            //if it's a break char or other special char, ignore it for now!
            if(ch == "\n")
            {
                continue;
            }
            if(ch == " ")
            {
                this.mlWidth += this._spaceGap;
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

            sprite = new cc.Sprite(cc.spriteFrameCache.getSpriteFrame(this.frames[charIndex]));
            sprite.anchorX = this._fontDefine.anchorX;
            sprite.anchorY = this._fontDefine.anchorY;
            // calculate the position of the sprite;
            var size = sprite.getContentSize();
            sprite.x = this.mlWidth;
            sprite.y = 0;
            this.mlWidth += size.width;
            if(i != this._str.length -1) this.mlWidth += this._gap;
            this.mlHeight = size.height > this.mlHeight ? size.height : this.mlHeight;
            this._charCanvas.addChild(sprite);
        }
        if(this.params){
            //restrain the text within the rectangle
            var rx = this.mlWidth/this.params.textWidth;
            var ry = this.mlHeight/this.params.textHeight;
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
            var deltaX = (this.params.textWidth - this.mlWidth)/2;
            i = this._charCanvas.childrenCount;
            while(i--){
                charChild = this._charCanvas.children[i];
                if(H_ALIGHS[this.params.textAlign] == "center") charChild.x += deltaX;
                else if(H_ALIGHS[this.params.textAlign] == "right") charChild.x += 2*deltaX;
                charChild.y -= deltaY;
            }
        }
        this._charCanvas.setContentSize(this.mlWidth, this.mlHeight);
        this.setContentSize(this.mlWidth, this.mlHeight);
    },
    getRect:function(coordinate)
    {
        if(coordinate == null) coordinate = true;
        var border = 2;
        var rect = cc.rect(0.5*this.width/this._str.length, -this.params.textHeight, this.width, this.height + border);
        rect.y += (this.params.textHeight - this.height)/2 - border/2;
        if(!coordinate) return rect;
        var w = rect.width;
        var h = rect.height;
        var origin = cc.p(rect.x, rect.y);
        origin = this.convertToWorldSpace(origin);
        if(coordinate instanceof cc.Node) origin = coordinate.convertToNodeSpace(origin);
        return cc.rect(origin.x, origin.y, w, h);
    },
    destroy:function()
    {
        this.removeFromParent();
    }
});

var _p = flax.Label.prototype;
/** @expose */
_p.gap;
cc.defineGetterSetter(_p, "gap", _p.getGap, _p.setGap);
/** @expose */
_p.spaceGap;
cc.defineGetterSetter(_p, "spaceGap", _p.getSpaceGap, _p.setSpaceGap);
/** @expose */
_p.text;
cc.defineGetterSetter(_p, "text", _p.getString, _p.setString);

_p = cc.LabelTTF.prototype;
/** @expose */
_p.text;
cc.defineGetterSetter(_p, "text", _p.getString, _p.setString);

flax.Label.create = function(assetsFile, data, define)
{
    //if the plist was exported by the older version, give a tip
    if(data._isText === false){
        throw "The assetsFile: " + assetsFile + " was exported with old version of Flax tool, re-export it to fix the Text issue!";
    }
    //Remove all the \ chars in the text in Web
    if(!cc.sys.isNative) define.text = define.text.split("\\").join("");
    var lbl = null;
    var txtCls = define["class"];
    var bmpFontName = flax.assetsManager.getFont(assetsFile, txtCls);
    //input text
    if(define.input == true){
        if(cc.EditBox == null){
            throw "If you want to use input text, please add module of 'editbox' into project.json!";
        }
        var frames = flax.assetsManager.getFrameNamesOfDisplay(assetsFile, txtCls);
        //todo, the size of the edit box is the background's size, not the text
        if(flax.Scale9Image == null) throw "Please add module of 'gui' or 'ccui'(cocos 3.10 later) into project.json if you want to use EditBox!";
        lbl = new cc.EditBox(cc.size(data.textWidth, data.textHeight), new cc.Scale9Sprite(frames[0]),
            frames[1] ? new cc.Scale9Sprite(frames[1]) : null,
            frames[2] ? new cc.Scale9Sprite(frames[2]) : null);
        lbl.setFontColor(data.fontColor);
        lbl.setFontName(data.font);
        lbl.setFontSize(data.fontSize);
        //the placeholder text will be cleared when begin to edit
        lbl.setPlaceHolder(define.text);
        lbl.setPlaceholderFontName(data.font);
        lbl.setPlaceholderFontSize(data.fontSize);
//        lbl.setPlaceholderFontColor(cc.hexToColor(define.color));
        //set the anchor
        var d = flax.assetsManager.getDisplayDefine(assetsFile, txtCls);
        lbl.setAnchorPoint(d.anchorX, d.anchorY);

//        lbl.setInputFlag(cc.EDITBOX_INPUT_FLAG_PASSWORD);
//        lbl.setMaxLength(20);
//        lbl.setDelegate(this);
    }
    //If it is ttf label(has font and the bitmap font is null, other wise use bitmap label
    else if(data.font && bmpFontName == null){
        //todo, if setFontSize bug occur in JSB, pls don't use cc.FontDefinition to create labelTTF
        var labelDef = new cc.FontDefinition();
        labelDef.fontName = data.font;
        labelDef.fontSize = data.fontSize;
        labelDef.textAlign = data.textAlign;
        labelDef.verticalAlign = cc.VERTICAL_TEXT_ALIGNMENT_CENTER;
        labelDef.fillStyle = data.fontColor;
        labelDef.fontDimensions = true;
        labelDef.boundingWidth = data.textWidth;
        labelDef.boundingHeight = data.textHeight;
        //text, fontName, fontSize, dimensions, hAlignment, vAlignment
        if(txtCls == "null") {
            lbl = new cc.LabelTTF(define.text, labelDef);
        }else if(flax.getLanguageStr){
            lbl = new cc.LabelTTF(flax.getLanguageStr(txtCls) || define.text, labelDef);
        }
        //enable stroke
        //lbl.enableStroke(cc.color(255, 0, 0, 255), 5);
        //enable shadow
        //lbl.enableShadow(cc.color(255,255,255,255),2,5);
    //bitmap font text
    }else{
        lbl = new flax.Label();
        flax.assetsManager.addAssets(assetsFile);
        lbl.assetsFile = assetsFile;
        lbl.params = data;
        lbl.setFontName(txtCls);
        lbl.setAnchorPoint(0, 0);
        lbl.setString(define.text);
    }
    return lbl;
};

flax._fontResources = null;
flax.registerFont = function(name, urls)
{
    if(!name || !urls) return;
    if(typeof urls == "string") urls = [urls];
    if(flax._fontResources == null) flax._fontResources = {};
    flax._fontResources[name] = urls;
};

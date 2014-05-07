/**
 * Created by long on 14-2-14.
 */

var lg = lg || {};

lg.MovieClip = lg.TimeLine.extend({
    autoPlayChildren:false,
    noOpacity:true,
    _namedChildren:null,
    _theRect:null,

    replaceChild:function(childName, assetID)
    {
        var childDefine = this.define.children[childName];
        if(childDefine == null){
            cc.log("There is no child with named: "+childName +"  in MovieClip: "+this.assetID);
            return;
        }
        var child = this._namedChildren[childName];
        if(child)
        {
            child.setPlist(this.plistFile, assetID);
        }else{
            childDefine.class = assetID;
        }
    },
    onNewSheet:function()
    {
//        this.removeAllChildren();
        for(var childName in this._namedChildren){
            this._namedChildren[childName].destroy();
        }
        this._namedChildren = {};
        this.totalFrames = this.define.totalFrames;
        this._theRect = cc.rect(this.define.rect);
        this.setContentSize(this._theRect.width, this._theRect.height);
    },
    onReset:function()
    {
        this._super();
        this.setContentSize(this._theRect.width, this._theRect.height);
        //MovieClip is just a container here, so we don't need a texture for it, and opacity = 0 will not impact the children
        this.opacity = 0;
    },
    doRenderFrame:function(frame)
    {
        var child;
        var childDefine;
        var frameDefine;
        for(var childName in this.define.children)
        {
            childDefine = this.define.children[childName];
            frameDefine = childDefine.frames[frame];
            child = this._namedChildren[childName];
            if(frameDefine == null) {
                if(child) child.visible = false;
            }else {
                if(child == null){
                    //hadle the label text
                    if(childDefine.text != null){
                        child = lg.Label.create(this.plistFile, childDefine.class);
                        child.params = childDefine;
                        child.setString(childDefine.text);
                    }else{
                        child = lg.assetsManager.createDisplay(this.plistFile, childDefine.class, null, true);
                    }
                    child.name = childName;
                    this._namedChildren[childName] = child;
                    if(this.autoPlayChildren) {
                        this.playing ? child.gotoAndPlay(0) : child.gotoAndStop(0);
                    }
                    this[childName] = child;
                    this.onNewChild(child);
                }
                var x = frameDefine[0];
                var y = frameDefine[1];
                var rotation = frameDefine[2];
                var scaleX = frameDefine[3];
                var scaleY = frameDefine[4]
                var opacity = Math.round(255*frameDefine[5]);

                if(x != child.x) child.x = x;
                if(y != child.y) child.y = y;
                if(rotation != child.rotation) child.rotation = rotation;
                if(scaleX != child.scaleX) child.scaleX = scaleX;
                if(scaleY != child.scaleY) child.scaleY = scaleY;
                //todo, movieclip adn progressbar can not set opacity on canvas render mode..., maybe we could override the setOpacity function, but some difficult
                if(child.noOpacity !== true && child.setOpacity && opacity != child.opacity) child.opacity = opacity;
                child.visible = true;
                if(this.autoPlayChildren) {
                    this.playing ? child.play() : child.stop();
                }
                if(child.parent != this){
                    child.removeFromParent(false);
                    this.addChild(child, childDefine.zIndex);
                }else if(child.zIndex != childDefine.zIndex){
                    child.zIndex = childDefine.zIndex;
                }
            }
        }
    },
    stop:function()
    {
        this._super();
        if(this.autoPlayChildren) {
            for(var key in this._namedChildren) {
                var child = this._namedChildren[key];
                if(child instanceof lg.TimeLine) {
                    child.stop();
                }
            }
        }
    },
    play:function()
    {
        this._super();
        if(this.autoPlayChildren) {
            for(var key in this._namedChildren) {
                var child = this._namedChildren[key];
                if(child instanceof lg.TimeLine) {
                    child.play();
                }
            }
        }
    },
    onNewChild:function(child)
    {

    },
    getDefine:function()
    {
        var define = lg.assetsManager.getMc(this.plistFile, this.assetID);
        return define;
    },
    getChildByName:function(name, nest)
    {
        if(nest === undefined) nest = true;
        var child = this._namedChildren[name];
        if(child) return child;
        if(!nest) return null;
        for(var key in this._namedChildren) {
            child = this._namedChildren[key];
            if(child.getChildByName) {
                child = child.getChildByName(name, nest);
                if(child) return child;
            }
        }
    },
    getChildByAssetID:function(id)
    {
        var child = null;
        for(var key in this._namedChildren) {
            child = this._namedChildren[key];
            if(child.assetID == id){
                return child;
            }
        }
        return null;
    },
    getRect:function(global)
    {
        if(this._theRect == null) return null;
        global = (global === true);
        if(!global) return this._theRect;
        var w = this._theRect.width;
        var h = this._theRect.height;
        var origin = cc.p(this._theRect.x, this._theRect.y);
        if(this._scaleX < 0) origin.x = origin.x + w;
        if(this._scaleY < 0) origin.y = origin.y + h;
        origin = this.convertToWorldSpace(origin);
        return cc.rect(origin.x, origin.y, w*Math.abs(this._scaleX), h*Math.abs(this._scaleY));
    },
    getLabelText:function(labelName, ifNest)
    {
        var label = this.getChildByName(labelName, ifNest === undefined ? true : ifNest);
        if(label && (label instanceof lg.Label)) return label.getString();
        return null;
    },
    setLabelText:function(labelName, text, ifNest)
    {
        var label = this.getChildByName(labelName, ifNest === undefined ? true : ifNest);
        if(label && (label instanceof lg.Label)) {
            label.setString(text);
            return true;
        }
        return false;
    },
    onRecycle:function()
    {
        this._super();
        this.autoPlayChildren = false;
    }
});
lg.MovieClip.create = function(plistFile, assetID)
{
    var mc = new lg.MovieClip();
    mc.setPlist(plistFile, assetID);
    mc.clsName = "lg.MovieClip";
    return mc;
};
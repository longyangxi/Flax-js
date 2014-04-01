/**
 * Created by long on 14-2-14.
 */

var lg = lg || {};

lg.MovieClip = lg.TimeLine.extend({
    _namedChildren:null,
    _theRect:null,

    replaceChild:function(childName, assetID)
    {
        var childDefine = this.define.children[childName];
        if(childDefine == null){
            cc.log("There is no child with named: "+childName +"  in MovieClip: "+this.assetID);
            return;
        }
        var child = this._namedChildren.get(childName);
        if(child)
        {
            child.setPlist(this.plistFile, assetID);
        }else{
            childDefine.class = assetID;
        }
    },
    onNewSheet:function()
    {
        this.removeAllChildren();
        this.totalFrames = this.define.totalFrames;
        this._namedChildren = new buckets.Dictionary();
    },
    onReset:function(firstTime)
    {
        this._super(firstTime);
        if(this._theRect) this.setContentSize(this._theRect._size);
        //MovieClip is just a container here, so we don't need a texture for it, and opacity = 0 will not impact the children
        this.setOpacity(0);
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
            child = this._namedChildren.get(childName);
            if(frameDefine == null) {
                if(child) child.setVisible(false);
            }else {
                if(child == null){
                    //hadle the label text
                    if(childDefine["text"] != null){
                        child = lg.Label.create(this.plistFile, childDefine.class, 1.0);
                        child.setString(childDefine["text"]);
                    }else{
                        child = lg.assetsManager.createDisplay(this.plistFile, childDefine.class);
                    }
                    child.name = childName;
                    this.addChild(child, childDefine.zOrder);
                    this._namedChildren.set(childName, child);
                    //todo, this doesn't point to really sub class this
//                    if(this.hasOwnProperty(childName)) this[childName] = child;
                }
                var x = frameDefine[0];
                var y = frameDefine[1];
                var rot = frameDefine[2];
                var scaleX = frameDefine[3];
                var scaleY = frameDefine[4];
                var opacity = Math.round(255*frameDefine[5]);

                if(x != child._position._x || y != child._position._y) child.setPosition(x, y);
                if(rot != child._rotationX) child.setRotation(rot);
                if(scaleX != child._scaleX || scaleY != child._scaleY) child.setScale(scaleX, scaleY);
                if(child["setOpacity"] && opacity != child.getOpacity()) child.setOpacity(opacity);
                child.setVisible(true);
            }
        }
    },
    getDefine:function()
    {
        var define = lg.assetsManager.getMc(this.plistFile, this.assetID);
        if(define) {
            this._theRect = lg.rectClone( define.rect);
        }
        return define;
    },
    getChildByName:function(name, nest)
    {
        if(nest === undefined) nest = true;
        if(this._namedChildren.containsKey(name)) return this._namedChildren.get(name);
        if(!nest) return null;
        var child = null;
        for (var key in this._namedChildren.table) {
            if (this._namedChildren.table.hasOwnProperty(key)) {
                var pair = this._namedChildren.table[key];
                if(pair.value["getChildByName"])
                {
                    child = pair.value.getChildByName(name, nest);
                    if(child) return child;
                }
            }
        }
    },
    getChildByAssetID:function(id)
    {
        var child = null;
        for (var key in this._namedChildren.table) {
            if (this._namedChildren.table.hasOwnProperty(key)) {
                var pair = this._namedChildren.table[key];
                child = pair.value;
                if(child.assetID == id){
                    return child;
                }
            }
        }
        return null;
    },
    getRect:function(global)
    {
        if(this._theRect == null) return null;
        global = (global === true);
        if(!global) return this._theRect;
        var w = this._theRect._size.width;
        var h = this._theRect._size.height;
        var origin = cc.p(this._theRect._origin);
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
    }
});
lg.MovieClip.create = function(plistFile, assetID)
{
    var mc = new lg.MovieClip();
    mc.setPlist(plistFile, assetID);
    mc.clsName = "lg.MovieClip";
    return mc;
};
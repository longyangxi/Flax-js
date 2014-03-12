/**
 * Created by long on 14-2-14.
 */

var lg = lg || {};

lg.MovieClip = lg.TimeLine.extend({
    _namedChildren:null,

    setChild:function(childName, id)
    {
        var childDefine = this.define.children[childName];
        if(childDefine == null){
            cc.log("There is no child with named: "+childName +"  in MovieClip: "+this.assetID);
            return;
        }
        var child = this._namedChildren.get(childName);
        if(child)
        {
            child.setPlist(this.plistFile, id);
        }else{
            childDefine.class = id;
        }
    },
    onNewSheet:function()
    {
        this.removeAllChildren();
        this.totalFrames = this.define.totalFrames;
        this._namedChildren = new buckets.Dictionary();
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
       return lg.assetsManager.getMc(this.plistFile, this.assetID);
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
/**
 * Created by long on 14-2-15.
 */
var LinkFinder = {};
//the lg.TileMap to manage all the objects to link together
LinkFinder.map = null;
//an objects array, the linkage with these objects are unavailable
LinkFinder.blocks = null;
/**
 * Check if tx0,ty0 and tx1,ty1 are linked
 * */
LinkFinder.findLink = function(tx0, ty0, tx1, ty1)
{
    var link = null;
    if(tx0 == tx1 || ty0 == ty1) {
        link = LinkFinder._checkDirectLink(tx0, ty0, tx1, ty1);
    }else{
        link = LinkFinder._checkOneLink(tx0, ty0, tx1, ty1);
    }
    if(link == null)
    {
        link = LinkFinder._checkTwoLink(tx0, ty0, tx1, ty1);
    }
    return link;
};
/**
 * Check if the map is dead, dead means there is no link anymore, then tried to fix it
 * Return a available linked pair, null result means there is no link anymore and can't be fixed
 * */
LinkFinder.findAvailableLink = function(useTween)
{
    var tiles = this.map.getAllObjects();
    var count = tiles.length;
    if(count == 0) return null;
    var f0;
    var f1;
    var link = null;
    var sameTypes = [];
    for(var i = 0; i< count -1; i++)
    {
        f0 = tiles[i];
        if(this.blocks && this.blocks.indexOf(f0) > -1) continue;
        var checkSameType = (sameTypes.length == 0);
        for(var j = i + 1; j < count; j++)
        {
            f1 = tiles[j];
            if(this.blocks && this.blocks.indexOf(f1) > -1) continue;
            if(f1.assetID == f0.assetID) {
                if(LinkFinder.findLink(f0.tx, f0.ty, f1.tx, f1.ty)){
                    return [f0, f1];
                }
                if(checkSameType) sameTypes.push(f1);
            }else if(checkSameType && link == null && LinkFinder.findLink(f0.tx, f0.ty, f1.tx, f1.ty)){
                link = f1;
            }
        }
    }
    var theLink = sameTypes[Math.floor(sameTypes.length*Math.random())];
    var tempPos = theLink.getPosition();
    if(useTween !== false){
        theLink.runAction(cc.MoveTo.create(0.2, link.getPosition()));
        link.runAction(cc.MoveTo.create(0.2, tempPos));
    }else{
        theLink.setPosition(link.getPosition());
        link.setPosition(tempPos);
    }
    return [tiles[0], theLink];
};
LinkFinder._checkDirectLink = function(tx0, ty0, tx1, ty1)
{
    if(tx0 == tx1 && ty0 == ty1) return null;
    if(tx0 == tx1)
    {
        var linked = true;
        var d = (ty1 - ty0 > 0) ? 1 : -1;
        var ty = ty0 + d;
        while(ty != ty1)
        {
            if(!this.map.isEmptyTile(tx0, ty)){
                linked = false;
                break;
            }
            ty += d;
        }
        if(linked) return [new cc.p(tx0, ty0), new cc.p(tx1, ty1)];
    }
    if(ty0 == ty1)
    {
        var linked = true;
        var d = (tx1 - tx0 > 0) ? 1 : -1;
        var tx = tx0 + d;
        while(tx != tx1)
        {
            if(!this.map.isEmptyTile(tx, ty0)){
                linked = false;
                break;
            }
            tx += d;
        }
        if(linked) return [new cc.p(tx0, ty0), new cc.p(tx1, ty1)];
    }
    return null;
};
LinkFinder._checkOneLink = function(tx0, ty0, tx1, ty1)
{
    if(tx0 == tx1 || ty0 == ty1) return null;
    //corner1: tx0, ty1
    if(this.map.isEmptyTile(tx0, ty1)){
        var linked0 = LinkFinder._checkDirectLink(tx0, ty0, tx0, ty1);
        if(linked0) {
            var linked1 = LinkFinder._checkDirectLink(tx0, ty1, tx1, ty1);
            if(linked1) return [new cc.p(tx0, ty0), new cc.p(tx0, ty1), new cc.p(tx1, ty1)];
        }
    }
    //corner2: tx1, ty0
    if(this.map.isEmptyTile(tx1, ty0))
    {
        var linked0 = LinkFinder._checkDirectLink(tx0, ty0, tx1, ty0);
        if(linked0) {
            var linked1 = LinkFinder._checkDirectLink(tx1, ty0, tx1, ty1);
            if(linked1) {
                return [new cc.p(tx0, ty0), new cc.p(tx1, ty0), new cc.p(tx1, ty1)];
            }
        }
    }
    return null;
};
LinkFinder._checkTwoLink = function(tx0, ty0, tx1, ty1)
{
    if(tx0 == tx1 && ty0 == ty1) return null;
    var dx = (tx1 - tx0) >= 0 ? 1 : -1;
    var dy = (ty1 - ty0) >= 0 ? 1 : -1;
    var link = LinkFinder._twoLinkSearch(tx0, ty0, tx1, ty1, dx, dy);
    if(link == null) link = LinkFinder._twoLinkSearch(tx0, ty0, tx1, ty1, -dx, -dy);
    if(link != null) link.unshift(new cc.p(tx0, ty0));
    return link;
};
LinkFinder._twoLinkSearch = function(tx0, ty0, tx1, ty1, dx, dy)
{
    var link = null;
    var tx = tx0 + dx;
    var ty = ty0 + dy;
    var xOver = false;
    var yOver = false;
    while(!xOver || !yOver)
    {
        if(!xOver)
        {
            xOver = !this.map.isEmptyTile(tx, ty0);
            if(!xOver){
                link = LinkFinder._checkOneLink(tx, ty0, tx1, ty1);
                if(link != null) break;
                tx += dx;
            }
        }
        if(!yOver)
        {
            yOver = !this.map.isEmptyTile(tx0, ty);
            if(!yOver){
                link = LinkFinder._checkOneLink(tx0, ty, tx1, ty1);
                if(link != null) break;
                ty += dy;
            }
        }
    }
    return link;
};
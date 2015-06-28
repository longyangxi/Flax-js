/**
 * Created by long on 14-8-19.
 */

flax.__drawNode = null;

flax.createDrawNode = function(parent, zIndex){

    if(flax.__drawNode && flax.__drawNode.parent && !parent) return;

    if(flax.__drawNode == null) {
        flax.__drawNode = cc.DrawNode.create();
    }
    if(flax.currentScene) {
        if(!parent) parent = flax.currentScene;
        if(flax.__drawNode.parent && flax.__drawNode.parent != parent){
            flax.__drawNode.removeFromParent();
            flax.__drawNode.clear();
        }
        if(flax.__drawNode.parent == null) parent.addChild(flax.__drawNode);
        flax.__drawNode.zIndex = zIndex || 99999;
    }
};

flax.clearDraw = function(destroy)
{
    if(flax.__drawNode == null) return;
    flax.__drawNode.clear();
    if(destroy === true) {
        flax.__drawNode.removeFromParent();
        flax.__drawNode = null;
    }
};

flax.drawLine = function(from, to, lineWidth, lineColor)
{
    flax.createDrawNode();
    if(lineWidth == null) lineWidth = 1;
    if(lineColor == null) lineColor = cc.color(255, 0, 0, 255);
    flax.__drawNode.drawSegment(from, to, lineWidth, lineColor);
};
flax.drawRay = function(from, rotation, length, lineWidth, lineColor)
{
    flax.drawLine(from, flax.getPointOnCircle(from, length, rotation), lineWidth, lineColor);
};
flax.drawRect = function(rect, lineWidth, lineColor, fillColor)
{
    flax.createDrawNode();
    if(lineWidth == null) lineWidth = 1;
    if(lineColor == null) lineColor = cc.color(255, 0, 0, 255);
    var dp = cc.pAdd(cc.p(rect.x, rect.y), cc.p(rect.width, rect.height));
    flax.__drawNode.drawRect(cc.p(rect.x, rect.y), dp, fillColor, lineWidth, lineColor);
};
flax.drawStageRect = function()
{
    var w = h = 2;
    flax.drawRect(cc.rect(flax.stageRect.x + w, flax.stageRect.y + h, flax.stageRect.width - 2*w, flax.stageRect.height - 2*h));
}
flax.drawCircle = function(center, radius, lineWidth, lineColor)
{
    flax.createDrawNode();
    if(lineWidth == null) lineWidth = 1;
    if(lineColor == null) lineColor = cc.color(255, 0, 0, 255);
    flax.__drawNode.drawCircle(center, radius, 360, 360, false, lineWidth, lineColor);
};
flax.drawDot = function(center, radius, color)
{
    flax.createDrawNode();
    if(radius == null) radius = 3;
    if(color == null) color = cc.color(255, 0, 0, 255);
    flax.__drawNode.drawDot(center, radius,color);
};
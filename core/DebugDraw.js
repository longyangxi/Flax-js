/**
 * Created by long on 14-8-19.
 */
var flax = flax || {};

flax.drawLine = function(from, to, lineWidth, lineColor)
{
    flax._createDebugNode();
    if(lineWidth == null) lineWidth = 1;
    if(lineColor == null) lineColor = cc.color(255, 0, 0, 255);
    flax.__drawNode.drawSegment(from, to, lineWidth, lineColor);
};
flax.drawRect = function(rect, lineWidth, lineColor, fillColor)
{
    flax._createDebugNode();
    if(lineWidth == null) lineWidth = 1;
    if(lineColor == null) lineColor = cc.color(255, 0, 0, 255);
    var dp = cc.pAdd(cc.p(rect.x, rect.y), cc.p(rect.width, rect.height));
    flax.__drawNode.drawRect(cc.p(rect.x, rect.y), dp, fillColor, lineWidth, lineColor);
};
flax.drawCircle = function(center, radius, lineWidth, lineColor)
{
    flax._createDebugNode();
    if(lineWidth == null) lineWidth = 1;
    if(lineColor == null) lineColor = cc.color(255, 0, 0, 255);
    flax.__drawNode.drawCircle(center, radius, 360, 360, false, lineWidth, lineColor);
};
flax.drawDot = function(center, radius, color)
{
    flax._createDebugNode();
    if(color == null) color = cc.color(255, 0, 0, 255);
    flax.__drawNode.drawDot(center, radius,color);
};

flax._createDebugNode = function(){
    if(flax.__drawNode == null) {
        flax.__drawNode = cc.DrawNode.create();
    }
    if(flax.currentScene) {
        if(flax.__drawNode.parent && flax.__drawNode.parent != flax.currentScene){
            flax.__drawNode.removeFromParent();
            flax.__drawNode.clear();
        }
        if(flax.__drawNode.parent == null) flax.currentScene.addChild(flax.__drawNode, 99999);
    }
}
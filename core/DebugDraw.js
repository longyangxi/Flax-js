/**
 * Created by long on 14-8-19.
 */
var lg = lg || {};

lg.drawLine = function(from, to, lineWidth, lineColor)
{
    lg._createDebugNode();
    if(lineWidth == null) lineWidth = 1;
    if(lineColor == null) lineColor = cc.color(255, 0, 0, 255);
    lg.__drawNode.drawSegment(from, to, lineWidth, lineColor);
};
lg.drawRect = function(rect, lineWidth, lineColor, fillColor)
{
    lg._createDebugNode();
    if(lineWidth == null) lineWidth = 1;
    if(lineColor == null) lineColor = cc.color(255, 0, 0, 255);
    var dp = cc.pAdd(cc.p(rect.x, rect.y), cc.p(rect.width, rect.height));
    lg.__drawNode.drawRect(cc.p(rect.x, rect.y), dp, fillColor, lineWidth, lineColor);
};
lg.drawCircle = function(center, radius, lineWidth, lineColor)
{
    lg._createDebugNode();
    if(lineWidth == null) lineWidth = 1;
    if(lineColor == null) lineColor = cc.color(255, 0, 0, 255);
    lg.__drawNode.drawCircle(center, radius, 360, 360, false, lineWidth, lineColor);
};
lg.drawDot = function(center, radius, color)
{
    lg._createDebugNode();
    if(color == null) color = cc.color(255, 0, 0, 255);
    lg.__drawNode.drawDot(center, radius,color);
};

lg._createDebugNode = function(){
    if(lg.__drawNode == null) {
        lg.__drawNode = cc.DrawNode.create();
    }
    if(lg.currentScene) {
        if(lg.__drawNode.parent && lg.__drawNode.parent != lg.currentScene){
            lg.__drawNode.removeFromParent();
            lg.__drawNode.clear();
        }
        if(lg.__drawNode.parent == null) lg.currentScene.addChild(lg.__drawNode, 99999);
    }
}
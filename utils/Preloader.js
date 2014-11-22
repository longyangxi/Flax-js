/****************************************************************************
 Copyright (c) 2010-2012 cocos2d-x.org
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011      Zynga Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

var flax = flax || {};
flax.Preloader = cc.Scene.extend({
    _interval : null,
    _length : 0,
    _count : 0,
    _label : null,
    _className:"flax.Preloader",
    _logo:null,
    init : function(){
        var self = this;
        var winSize = cc.director.getWinSize();

        //logo
        var centerPos = cc.p(winSize.width / 2, winSize.height / 2);

        //logo
        var loadingImg = cc.game.config.loading;
        if(loadingImg && flax.isImageFile(loadingImg)){
            cc.loader.load(loadingImg, function(){
                self._logo = cc.Sprite.create(loadingImg);
                self._logo.setPosition(centerPos);
                self.addChild(self._logo, 10);
                if(!cc.sys.isNative){
                    self.createLabel(cc.pSub(centerPos, cc.p(0,  self._logo.height/2 + 10)))
                }
                self.logoClick();
            })
        }else{
            self.createLabel(centerPos);
        }
        return true;
    },
    createLabel:function(pos){
        var label = this._label = cc.LabelTTF.create("Loading...", "Arial", 16);
        label.enableStroke(cc.color(51, 51, 51), 2);
        label.setColor(cc.color(255, 255, 255));
        label.setPosition(pos);
        this.addChild(label, 10);
    },
    logoClick:function(){
        //click logo to go
        var logo = this._logo;
        var listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: false,
            onTouchBegan:function(touch, event)
            {
                if(cc.rectContainsPoint(flax.getRect(logo, true), touch.getLocation())){
                    flax.goHomeUrl();
                }
            }
        })
        cc.eventManager.addListener(listener, this._logo);
    },
    onEnter: function () {
        var self = this;
        cc.Node.prototype.onEnter.call(self);
        self.schedule(self._startLoading, 0.3);
    },

    onExit: function () {
        cc.Node.prototype.onExit.call(this);
        if(this._label) this._label.setString("Loaded");
    },

    /**
     * init with resources
     * @param {Array} resources
     * @param {Function|String} cb
     */
    initWithResources: function (resources, cb) {
        if(typeof resources == "string")
            resources = [resources];
        this.resources = resources || [];
        this.cb = cb;
    },
    _startLoading: function () {
        var self = this;
        self.unschedule(self._startLoading);
        var res = self.resources;
        cc.loader.load(res,
            function (result, count, loadedCount) {
                if(self._label == null) return;
                var percent = (loadedCount / count * 100) | 0;
                percent = Math.min(percent, 100);
                self._label.setString("Loading... " + percent + "%");
            }, function () {
                if (self.cb)
                    self.cb();
            });
    }
});
flax.preload = function(res, callBack)
{
    if(res == null || res.length == 0) {
        callBack();
        return;
    }
    var needLoad = false;
    var res1 = [];
    var i = res.length;
    while(i--)
    {
        var r = res[i];
        if(r == null) throw "There is a null resource!"
        if(cc.loader.getRes(r) == null) {
            r = flax._addResVersion(r);
            //in mobile web or jsb, .flax is not good now, so replace it  to .plist and .png
            if(cc.path.extname(r) == ".flax" && (cc.sys.isNative || cc.game.config.useFlaxRes === false)){
                if(cc.sys.isNative) cc.log("***Warning: .flax is not support JSB for now, use .plist + .png insteadly!");
                var plist = cc.path.changeBasename(r,".plist");
                var png = cc.path.changeBasename(r,".png");
                res1.unshift(plist);
                res1.unshift(png);
                if(cc.loader.getRes(png) == null) {
                    needLoad = true;
                }
            }else{
                needLoad = true;
                res1.unshift(r);
            }
        }
    }
    if(needLoad){
        var loaderScene = new flax.Preloader();
        loaderScene.init();
        loaderScene.initWithResources(res1, function(){
            //replace the resource's key with no version string
            var i = res1.length;
            while(i--){
                var res = res1[i];
                var data = cc.loader.getRes(res);
                if(data){
                    var pureUrl = flax._removeResVersion(res);
                    cc.loader.cache[pureUrl] = data;
                    //fixed the bug when opengl
                    if(flax.isImageFile(pureUrl) && cc.sys.capabilities.opengl) cc.textureCache.handleLoadedTexture(pureUrl);
                    cc.loader.release(res);
                }
            }
            callBack();
        });

        cc.director.runScene(loaderScene);
        return loaderScene;
    }else{
        callBack();
    }
}
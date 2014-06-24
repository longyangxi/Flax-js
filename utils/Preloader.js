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

var lg = lg || {};
lg.Preloader = cc.Scene.extend({
    _interval : null,
    _length : 0,
    _count : 0,
    _label : null,
    _className:"lg.Preloader",
    _logo:null,
    init : function(){
        var self = this;
        var winSize = cc.director.getWinSize();

        //logo
        var logoWidth = logoW;
        var logoHeight = logoH;
        var centerPos = cc.p(winSize.width / 2, winSize.height / 2);

        // bg
        var bgLayer = self._bgLayer = cc.LayerColor.create(cc.color(backgroundColor[0], backgroundColor[1], backgroundColor[2], 255));
        bgLayer.setPosition(0, 0);
        self.addChild(bgLayer, 0);

        //logo
        this._logo = cc.Sprite.create(logoSrc);
        this._logo.setPosition(centerPos);
        this._bgLayer.addChild(this._logo, 10);

        //loading percent
        var label = self._label = cc.LabelTTF.create("Loading... 0%", "Arial", 14);
        label.setColor(cc.color(38, 192, 216));
        label.setPosition(cc.pAdd(centerPos, cc.p(0,  logoOnCenter ? 0 : (-logoHeight / 2 - 10))));
        bgLayer.addChild(this._label, 10);

        return true;
    },

    onEnter: function () {
        var self = this;
        cc.Node.prototype.onEnter.call(self);
        self.schedule(self._startLoading, 0.3);
    },

    onExit: function () {
        cc.Node.prototype.onExit.call(this);
        var tmpStr = "Loading... 0%";
        this._label.setString(tmpStr);
    },

    /**
     * init with resources
     * @param {Array} resources
     * @param {Function|String} cb
     */
    initWithResources: function (resources, cb) {
        if(typeof resources == "string") resources = [resources];
        this.resources = resources || [];
        this.cb = cb;
    },

    _startLoading: function () {
        var self = this;
        self.unschedule(self._startLoading);
        var res = self.resources;
        self._length = res.length;
        cc.loader.load(res, function(result, count){ self._count = count; }, function(){
            self.cb();
        });
        self.schedule(self._updatePercent);
    },

    _updatePercent: function () {
        var self = this;
        var count = self._count;
        var length = self._length;
        var percent = (count / length * 100) | 0;
        percent = Math.min(percent, 100);
        self._label.setString("Loading... " + percent + "%");
        if(count >= length) self.unschedule(self._updatePercent);
    }
});

lg.preload = function(res, callBack)
{
    if(res == null || res.length == 0) {
        callBack();
        return;
    }
    var hasLoaded = true;
    var i = -1;
    while(++i < res.length)
    {
        if(lg._resourcesLoaded.indexOf(res[i]) == -1){
            lg._resourcesLoaded.push(res[i]);
            hasLoaded = false;
        }
    }
    if(hasLoaded){
        callBack();
    }else{
        var _cc = cc;
        if(!_cc.loaderScene) {
            _cc.loaderScene = new lg.Preloader();
            _cc.loaderScene.init();
        }
        _cc.loaderScene.initWithResources(res, callBack);

        cc.director.runScene(_cc.loaderScene);
        return _cc.loaderScene;
    }
}
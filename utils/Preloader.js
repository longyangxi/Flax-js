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
        var centerPos = cc.p(winSize.width / 2, winSize.height / 2);

        //logo
        var loadingImg = cc.game.config.loading;
        if(loadingImg){
            this._logo = cc.Sprite.create(loadingImg);
            this._logo.setPosition(centerPos);
            this.addChild(this._logo, 10);
        }

        //loading percent
        if(!cc.sys.isNative){
            var label = self._label = cc.LabelTTF.create("Loading... 0%", "Arial", 14);
            label.setColor(cc.color(38, 192, 216));
            label.setPosition(cc.pAdd(centerPos, cc.p(0,  loadingImg ? (-cc.game.config.loadingHeight / 2 - 10) : 0)));
            this.addChild(this._label, 10);
        }

        return true;
    },

    onEnter: function () {
        var self = this;
        cc.Node.prototype.onEnter.call(self);
        self.schedule(self._startLoading, 0.3);
        //click logo to go
        if(this._logo){
            var listener = cc.EventListener.create({
                event: cc.EventListener.TOUCH_ONE_BY_ONE,
                swallowTouches: false,
                onTouchBegan:function(touch, event)
                {
                    lg.goHomeUrl();
                }
            })
            cc.eventManager.addListener(listener, this._logo);
        }
    },

    onExit: function () {
        cc.Node.prototype.onExit.call(this);
//        var tmpStr = "Loading... 0%";
        var tmpStr = "Loaded";
        if(this._label) this._label.setString(tmpStr);
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
        if(self._label) self.schedule(self._updatePercent);
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
        var loaderScene = new lg.Preloader();
        loaderScene.init();
        loaderScene.initWithResources(res, callBack);

        cc.director.runScene(loaderScene);
        return loaderScene;
    }
}
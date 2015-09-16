
flax._preloader = {
    resources:null,
    _label : null,
    _logo:null,
    _inited:false,
    /**
     * init with resources
     * @param {Array} resources
     * @param {Function|String} cb
     */
    initWithResources: function (resources, cb) {
        this.init();
        if(typeof resources == "string")
            resources = [resources];
        this.resources = resources || [];
        this.cb = cb;
    },
    init : function(){
        if(this._inited) return;
        this._inited = true;

        var self = this;
        var winSize = cc.director.getWinSize();

        if(this instanceof cc.Layer){
            var back = new cc.LayerColor(cc.color(0, 0, 0, 100));
            this.addChild(back, 0);
        }
        //logo
        var centerPos = cc.p(winSize.width / 2, winSize.height / 2);

        //logo
        var loadingImg = cc.game.config["loading"];
        if(loadingImg && flax.isImageFile(loadingImg)){
            cc.loader.load(loadingImg, function(){
                self._logo = new cc.Sprite(loadingImg);
                self._logo.setPosition(centerPos);
                self.addChild(self._logo, 10);
                if(!cc.sys.isNative){
                    var fontSize = 16*(1 + self._logo.width/200);
                    self.createLabel(cc.pSub(centerPos, cc.p(0,  self._logo.height/2 + fontSize*0.6)), fontSize);
                    self.logoClick();
                }
            })
        }else{
            self.createLabel(centerPos);
        }
    },
    createLabel:function(pos, fontSize){
        var label = this._label = new cc.LabelTTF("Loading...", "Arial", fontSize || 18);
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
                    return true;
                }
                return false;
            }
        });
        cc.eventManager.addListener(listener, this._logo);
    },
    onEnter: function () {
        var self = this;
        cc.Node.prototype.onEnter.call(self);
        if(this.resources) self.schedule(self._startLoading, 0.3);
    },
    _startLoading: function () {
        var self = this;
        self.unschedule(self._startLoading);
        var res = self.resources;
        cc.loader.load(res,
            function (result, count, loadedCount) {
                if(self._label == null) return;
                self._showProgress("Loading: ", count, loadedCount);
            }, function () {
                if (self.cb)
                    self.cb();
            });
    },
    _showProgress:function(text, count, loadedCount)
    {
        if(!this._label) return;
        if(loadedCount != null) this._label.setString(text + (loadedCount + 1) + "/" + count);
        else {
//            var percent = (loadedCount / count * 100) | 0;
//            percent = Math.min(percent, 100);
            this._label.setString(text + count + "%");
        }
    }
};

flax.Preloader = cc.Scene.extend(flax._preloader);
flax.ResPreloader = cc.Layer.extend(flax._preloader);
//Avoid to advanced compile mode
window['flax']['Preloader'] = flax.Preloader;
window['flax']['ResPreloader'] = flax.ResPreloader;

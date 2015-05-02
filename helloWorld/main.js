cc.game.onStart = function(){
    if(!cc.sys.isNative && document.getElementById("cocosLoading")) //If referenced loading.js, please remove it
        document.body.removeChild(document.getElementById("cocosLoading"));
    // Pass true to enable retina display, disabled by default to improve performance
    cc.view.enableRetina(false);
    //初始化引擎
    flax.init(cc.ResolutionPolicy.SHOW_ALL);
    //注册场景（参数：场景名字，场景，所需素材）
    flax.registerScene("helloWorld", HelloWorld, res_helloWorld);
    //根据场景名字切换场景
    flax.replaceScene("helloWorld");
};
cc.game.run();
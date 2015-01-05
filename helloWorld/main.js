cc.game.onStart = function(){
    //初始化引擎
    flax.init(cc.ResolutionPolicy.SHOW_ALL);
    //注册场景（参数：场景名字，场景，所需素材）
    flax.registerScene("helloWorld", HelloWorld, res_helloWorld);
    //根据场景名字切换场景
    flax.replaceScene("helloWorld");
};
cc.game.run();
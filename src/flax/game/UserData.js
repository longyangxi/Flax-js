/**
 * Created by long on 14-11-19.
 */
flax.userData = {
//    gold:100,
//    levelStars:[],
//    powerups:[0,0,0,0]
};

flax.fetchUserData = function(defaultValue) {
    if(defaultValue) flax.userData = defaultValue;
    var data = null;
    try{
        data = cc.sys.localStorage.getItem(cc.game.config["gameId"]);
        if(data) data = JSON.parse(data);
    }catch(e){
        cc.log("Fetch UserData Error: "+ e.name);
    }
    if(data) flax.copyProperties(data, flax.userData);
//    else if(defaultValue) flax.userData = defaultValue;
    if(!flax.userData) flax.userData = {};
};

flax.saveUserData =  function() {
    if(!flax.userData) flax.userData = {};
    try{
        cc.sys.localStorage.setItem(cc.game.config["gameId"], JSON.stringify(flax.userData));
    }catch (e){
        cc.log("Save UserData Error: "+ e.name);
    }
};
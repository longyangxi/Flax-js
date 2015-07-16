var fs = require('fs');
var resTpl=fs.readFileSync("resource.tpl", "utf-8");
var HelloWorldTpl=fs.readFileSync("HelloWorld.tpl", "utf-8");
var codeTpl=fs.readFileSync("code.tpl", "utf-8");
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
function filterJsonOrPlist(str, index, array){
    if(str=="flaxAnim.plist")return false;
    if(str.endsWith(".json")||str.endsWith(".plist"))return true;
    return false;
}
function getFilenameNoSuffix(str){
    if(str.endsWith(".json"))return str.substr(0,str.length-5);
    if(str.endsWith(".plist"))return str.substr(0,str.length-6);
    return str;
}
fs.readdir("./res",function(err, files){
    //console.log(files);
    var plistFiles=files.filter(filterJsonOrPlist);
    console.log(plistFiles);
    var res1='',res2='',code='';
    for(var i=0;i<plistFiles.length;i++){
        var animName=getFilenameNoSuffix(plistFiles[i]);
        res1+=',\n'+animName+':"res/'+animName+'.plist",\n';
        res1+=animName+'_png:"res/'+animName+'.png"';
        res2+=',\n'+'res.'+animName+',\n';
        res2+='res.'+animName+'_png';
        code+=codeTpl.replace(new RegExp("#name#","gm"),animName);
    }
    var res=resTpl.replace("#res1#",res1);
    res=res.replace("#res2#",res2);
    console.log(res);
    fs.writeFileSync("./src/resource.js",res,"utf-8");
    var helloWorld=HelloWorldTpl.replace("#code#",code);
    console.log(helloWorld);
    fs.writeFileSync("./src/HelloWorld.js",helloWorld,"utf-8");
})
用法：

1、通过flax工具，将flash目录的swf文件转到res目录后，
2、运行autoUpdate.bat将自动做如下事情：
   2.1 自动遍历res目录的.plist和.json文件。
   2.2 自动修改src/resource.js和src/HelloWorld.js 
上两步通过node autoUpdate.js实现。
   2.3 自动启动web服务器并打开游戏。
这一步cocos run -p web --port 8888

一般如果把cocos项目放到目录，可以不用运行bat文件，直接运行node autoUpdate.js即可。
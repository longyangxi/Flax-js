/**
 * Created by long on 14-8-1.
 */
var lg = lg || {};
lg.ColliderType = {
    rect: "Rect",
    circle: "Circle"
}
lg.Collider = cc.Class.extend({
    name:null,
    owner:null,
    type:lg.ColliderType.rect,
    _center:null,//center point
    _width:0,
    _height:0,
    _rotation:0,
    _localRect:null,
    ctor:function(arr, centerAnchor){
        this.type = arr[0];
        this._center = cc.p(arr[1], arr[2]);
        this._width = arr[3];
        this._height = arr[4];
        this._rotation = arr[5];
        if(centerAnchor === false) {
            this._center.x += this._width/2;
            this._center.y += this._height/2;
        }
        this._localRect = cc.rect(this._center.x - this._width/2, this._center.y - this._height/2, this._width, this._height);
    },
    clone:function(){
        var c = new lg.Collider([this.type,this._center.x, this._center.y, this._width, this._height, this._rotation]);
        c.name = this.name;
        c.owner = this.owner;
        return c;
    },
    /**
     * Enable the physics with the params
     * @param {int} type Box2D.Dynamics.b2Body.b2_dynamicBody,b2_staticBody,b2_kinematicBody
     * */
    setPhysics:function(type, density, friction,restitution, isSensor, fixedRotation, bullet){
        var pos = this.getCenter();
        var size = this.getSize();
        var bodyDef = new Box2D.Dynamics.b2BodyDef();
        if(type === null) type = Box2D.Dynamics.b2Body.b2_dynamicBody;
        bodyDef.type = type;
        bodyDef.fixedRotation = fixedRotation;
        bodyDef.bullet = bullet;
        bodyDef.position.Set(pos.x / PTM_RATIO, pos.y / PTM_RATIO);

        bodyDef.userData = this.owner;
        var body = lg.getPhysicsWorld().CreateBody(bodyDef);

        // Define another box shape for our dynamic body.
        size.width /= PTM_RATIO;
        size.height /= PTM_RATIO;
        var shape =null;
        if(this.type == lg.ColliderType.rect){
            shape = new Box2D.Collision.Shapes.b2PolygonShape();
            shape.SetAsBox(size.width/2, size.height/2);
        }else if(this.type == lg.ColliderType.circle){
            shape = new Box2D.Collision.Shapes.b2CircleShape();
            shape.SetRadius(size.width/2);
        }

        // Define the dynamic body fixture.
        var fixtureDef = new Box2D.Dynamics.b2FixtureDef();
        fixtureDef.shape = shape;
        if(density == null) density = 1.0;
        fixtureDef.density = density;
        if(friction == null) friction = 0;
        fixtureDef.friction = friction;
        if(restitution == null) restitution = 0.3;
        fixtureDef.restitution = restitution;
        fixtureDef.isSensor = isSensor;
        body.CreateFixture(fixtureDef);
    },
    checkCollision:function(collider){
        if(collider.type == this.type && this.type == lg.ColliderType.rect){
            return cc.rectIntersectsRect(this.getRect(true), collider.getRect(true));
        }else if(collider.type == this.type && this.type == lg.ColliderType.circle){
            var pos = this.getCenter(true);
            var pos1 = collider.getCenter(true);
            return cc.pDistance(pos, pos1) <= (this.getSize().width + collider.getSize().width)/2;
        }else if(this.type == lg.ColliderType.rect){
            return this._ifRectCollidCircle(this.getRect(true),collider.getRect(true));
        }else if(this.type == lg.ColliderType.circle){
            return this._ifRectCollidCircle(collider.getRect(true), this.getRect(true));
        }
    },
    containPoint:function(pos){
        pos = this.owner.convertToNodeSpace(pos);
        if(this.type == lg.ColliderType.rect){
            return cc.rectContainsPoint(this._localRect, pos);
        }
        var dis = cc.pDistance(pos, this._center);
        return dis <= this._width/2;
    },
    /**
     * Check if the rectangle collide with the circle
     * toto: to be verified!
     * ref: http://stackoverflow.com/questions/21089959/detecting-collision-of-rectangle-with-circle-in-html5-canvas
     * */
    _ifRectCollidCircle:function(rect, circle){
        //Find the vertical & horizontal (distX/distY) distances between the circle’s center and the rectangle’s center
        var distX = Math.abs((circle.x + circle.width/2) - (rect.x + rect.width/2));
        var distY = Math.abs((circle.y + circle.height/2) - (rect.y + rect.height/2));
        //If the distance is greater than halfCircle + halfRect, then they are too far apart to be colliding
        if (distX > (rect.width/2 + circle.width/2)) return false;
        if (distY > (rect.height/2 + circle.width/2)) return false;
        //If the distance is less than halfRect then they are definitely colliding
        if (distX <= (rect.width/2)) return true;
        if (distY <= (rect.height/2)) return true;
        //Test for collision at rect corner.
        var dx=distX-rect.width/2;
        var dy=distY-rect.height/2;
        return (dx*dx+dy*dy<=(circle.width/2*circle.width/2));
    },
    getRect:function(global){
        global = (global !== false);
        if(!global) return this._localRect;

        var center = this.getCenter(true);
        var size = this.getSize();
        var rect = cc.rect(center.x - size.width/2, center.y - size.height/2, size.width, size.height);
        return rect;
    },
    getCenter:function(global){
        if(global === false) return this._center;
        return this.owner.convertToWorldSpace(this._center);
    },
    /**
     * If the owner or its parent has been scaled, the calculate the real size of the collider
     * */
    getSize:function(){
        var s = lg.getScale(this.owner, true);
        var w = this._width*Math.abs(s.x);
        var h = this._height*Math.abs(s.y);
        return {width:w, height:h};
    },
    debugDraw:function(){
        var rect = this.getRect(true);
        if(this.type == lg.ColliderType.rect){
            lg.drawRect(rect)
        }else{
            var drawNode = cc.DrawNode.create();
            if(lg.currentScene) lg.currentScene.addChild(drawNode, 99999);
            var lineWidth = 1;
            var lineColor = cc.color(255, 0, 0, 255);
            drawNode.drawCircle(this.getCenter(true), rect.width/2, 0, 360, false,lineWidth, lineColor);
        }
    }
});

lg._physicsWorld = null;
lg._physicsRunning = false;
lg.createPhysicsWorld = function(gravity, doSleep){
    var world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(gravity.x, gravity.y), doSleep !== false);
    world.SetContinuousPhysics(true);
    lg._physicsWorld = world;
    return world;
}
lg.getPhysicsWorld = function(){
    if(lg._physicsWorld == null) throw "Pleas use lg.createPhysicsWorld to create the world firstly!";
    return lg._physicsWorld;
}
lg.startPhysicsWorld = function(){
    var world = lg.getPhysicsWorld();
    if(world && lg.currentScene && !lg._physicsRunning){
        lg.currentScene.schedule(lg._updatePhysicsWorld, 1.0/cc.game.config.frameRate);
        lg._physicsRunning = true;
    }
}
lg.stopPhysicsWorld = function(){
    if(lg._physicsRunning && lg.currentScene) {
        lg.currentScene.unschedule(lg._updatePhysicsWorld);
        lg._physicsRunning = false;
    }
}
/**
 * Create physical walls, up/down/left/right
 * todo, bug
 * */
lg.createPhysicalWalls = function(friction, restitution, walls){
    if(walls == null || walls.length == 0) walls = [1,1,1,1];
    var world = lg.getPhysicsWorld();
    var fixDef = new Box2D.Dynamics.b2FixtureDef();
    fixDef.density = 1.0;
    if(friction == null)  friction = 0;
    fixDef.friction = friction;
    if(restitution == null) restitution = 0.3;
    fixDef.restitution = restitution;

    var bodyDef = new Box2D.Dynamics.b2BodyDef();

    var winSize = cc.director.getWinSize();
    //create ground
    bodyDef.type = Box2D.Dynamics.b2Body.b2_staticBody;
    fixDef.shape = new Box2D.Collision.Shapes.b2PolygonShape();
//    fixDef.shape.SetAsBox(0.5*winSize.width/PTM_RATIO, 0.5);
    fixDef.shape.SetAsBox(0.5*winSize.width/PTM_RATIO, 0.5);

    // upper
    if(walls[0]){
        bodyDef.position.Set(0.5*winSize.width / PTM_RATIO, 0);
//        bodyDef.position.Set(100/PTM_RATIO, -5);
        world.CreateBody(bodyDef).CreateFixture(fixDef);
    }
    // bottom
    if(walls[1]){
        bodyDef.position.Set(0.5*winSize.width/PTM_RATIO, -winSize.height / PTM_RATIO);
        world.CreateBody(bodyDef).CreateFixture(fixDef);
    }
    fixDef.shape.SetAsBox(0.5, 0.5*winSize.height / PTM_RATIO);
    // left
    if(walls[2]){
        bodyDef.position.Set(0, -0.5*winSize.height / PTM_RATIO);
        world.CreateBody(bodyDef).CreateFixture(fixDef);
    }
    // right
    if(walls[3]){
        bodyDef.position.Set(winSize.width / PTM_RATIO, -0.5*winSize.height / PTM_RATIO);
        world.CreateBody(bodyDef).CreateFixture(fixDef);
    }
}

lg._updatePhysicsWorld = function(dt){
    //It is recommended that a fixed time step is used with Box2D for stability
    //of the simulation, however, we are using a variable time step here.
    //You need to make an informed choice, the following URL is useful
    //http://gafferongames.com/game-physics/fix-your-timestep/
    var velocityIterations = 8;
    var positionIterations = 1;
    // Instruct the world to perform a single step of simulation. It is
    // generally best to keep the time step and iterations fixed.
    lg._physicsWorld.Step(dt, velocityIterations, positionIterations);
    //Iterate over the bodies in the physics world
    for (var b = lg._physicsWorld.GetBodyList(); b; b = b.GetNext()) {
        var myActor = b.GetUserData();
        if (myActor != null) {
            var pos = b.GetPosition();
            pos.x *= PTM_RATIO;
            pos.y *= PTM_RATIO;
            //todo,bug
            pos = myActor.parent.convertToNodeSpace(pos);
            myActor.x = pos.x;
            myActor.y = pos.y;
            myActor.rotation = -1 * RADIAN_TO_DEGREE*b.GetAngle();
        }
    }
}
lg._debugBox2DNode = null;
/**
 * todo, bug
 * */
lg.debugDrawPhysics = function(){
    if(lg._debugBox2DNode == null){
        lg._debugBox2DNode = new lg.DebugBox2DNode(lg.getPhysicsWorld());
        lg.currentScene.addChild(lg._debugBox2DNode, Number.MAX_VALUE);
    }
}
lg.DebugBox2DNode = cc.Node.extend({
    _refWorld: null,
    ctor: function(world) {
        this._super();
        this._refWorld = world;

        var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
        var debugDraw = new b2DebugDraw();
        debugDraw.SetSprite(document.getElementById("gameCanvas").getContext("2d"));
        var scale = PTM_RATIO * cc.view.getViewPortRect().width / cc.view.getDesignResolutionSize().width
        debugDraw.SetDrawScale(scale);
        debugDraw.SetFillAlpha(0.5);
        debugDraw.SetLineThickness(1.0);
        debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit | b2DebugDraw.e_centerOfMassBit);
        this._refWorld.SetDebugDraw(debugDraw);
    },
    draw: function(ctx) {
        this._super();
        if(this._refWorld) {
            ctx.scale(1, -1);
            ctx.translate(0, ctx.canvas.height);
            this._refWorld.DrawDebugData();
            ctx.scale(1, 1);
            ctx.translate(0, 0);
        };
    }
});
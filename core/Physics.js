/**
 * Created by long on 14-8-1.
 * for box2d
 */
var lg = lg || {};
lg.ColliderType = {
    rect: "Rect",
    circle: "Circle",
    polygon: "Poly"
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
    _polygons:null,
    physicsBody:null,//the physics body if exist
    contact:null,//the contact info if collision happens
    ctor:function(arr, centerAnchor){
        this.type = arr[0];
        this._center = cc.p(arr[1], arr[2]);
        this._width = arr[3];
        this._height = arr[4];
        this._rotation = arr[5];
        this._polygons = arr[6];
        if(this._polygons){
            var arr = [];
            for(var i = 0; i < this._polygons.length - 1; i += 2){
                var pos = cc.p(parseFloat(this._polygons[i]), parseFloat(this._polygons[i + 1]));
                arr.push(pos);
            }
            this._polygons = arr;
        }
        if(centerAnchor === false) {
            this._center.x += this._width/2;
            this._center.y += this._height/2;
        }
        this._localRect = cc.rect(this._center.x - this._width/2, this._center.y - this._height/2, this._width, this._height);
    },
    clone:function(){
        var c = new lg.Collider([this.type,this._center.x, this._center.y, this._width, this._height, this._rotation]);
        if(this._polygons) c._polygons = this._polygons;
        c.name = this.name;
        c.owner = this.owner;
        return c;
    },
    /**
     * Enable the physics with the params
     * @param {int} type Box2D.Dynamics.b2Body.b2_dynamicBody,b2_staticBody,b2_kinematicBody
     * */
    addPhysics:function(type, density, friction,restitution, isSensor, fixedRotation, catBits, maskBits, bullet){
        if(this.physicsBody) return this.physicsBody;
        var pos = this.getCenter();
        var size = this.getSize();
        var bodyDef = new Box2D.Dynamics.b2BodyDef();
        if(type === null) type = Box2D.Dynamics.b2Body.b2_dynamicBody;
        bodyDef.type = type;
        bodyDef.fixedRotation = fixedRotation;
        bodyDef.bullet = bullet;
        bodyDef.position.Set(pos.x / PTM_RATIO, pos.y / PTM_RATIO);
        bodyDef.userData = this;
        var body = lg.getPhysicsWorld().CreateBody(bodyDef);
        body.__rotationOffset = this.owner.rotation;
        body.__isMain = (this.name === "main" || this.name === "base");
        this.physicsBody = body;
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
        }else if(this.type == lg.ColliderType.polygon){
            shape = new Box2D.Collision.Shapes.b2PolygonShape();
            var arr = [];
            for(var i = 0; i < this._polygons.length; i++){
                var p = cc.p(this._polygons[i]);
                p = this.owner.convertToWorldSpace(p);
                p.x -= pos.x;
                p.y -= pos.y;
                p.x /= PTM_RATIO;
                p.y /= PTM_RATIO;
                arr.push(p);
            }
            shape.SetAsArray(arr);
        }

        // Define the dynamic body fixture.
        var fixtureDef = new Box2D.Dynamics.b2FixtureDef();
        fixtureDef.shape = shape;
        if(density == null) density = 0.0;
        fixtureDef.density = density;
        if(friction == null) friction = 0.2;
        fixtureDef.friction = friction;
        if(restitution == null) restitution = 0.0;
        fixtureDef.restitution = restitution;
        fixtureDef.isSensor = isSensor;
        if(catBits == null) catBits = 0x0001;
        if(maskBits == null) maskBits = 0xFFFF;
        fixtureDef.filter.categoryBits = catBits;
        fixtureDef.filter.maskBits = maskBits;
        body.CreateFixture(fixtureDef);
        return this.physicsBody;
    },
    removePhysics:function(){
        if(this.physicsBody && lg._physicsWorld){
            lg.removePhysicsBody(this.physicsBody);
            this.physicsBody = null;
        }
    },
    //todo, with polygon
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
    getOffsetToAnchor:function(){
        var center = this.getCenter(true);
        var anchorPos = lg.getPosition(this.owner, true);
        return cc.p(center.x - anchorPos.x, center.y - anchorPos.y);
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
            var fillColor = cc.color(0, 255, 0, 122);

            if(this.type == lg.ColliderType.circle){
                drawNode.drawCircle(this.getCenter(true), rect.width/2, 0, 360, false,lineWidth, lineColor, fillColor);
            }else{
                var first = null;
                var from = null;
                var to = null;
                for(var i = 0; i < this._polygons.length - 1; i ++){
                    from = cc.p(this._polygons[i]);
                    from = this.owner.convertToWorldSpace(from);
                    if(i == 0) first = cc.p(from);
                    to = cc.p(this._polygons[i + 1]);
                    to = this.owner.convertToWorldSpace(to);
                    drawNode.drawSegment(from, to, lineWidth, lineColor, fillColor)
                }
                drawNode.drawSegment(to, first, lineWidth, lineColor, fillColor)
            }
        }

    }
});
lg.onCollideStart = new signals.Signal();
lg.onCollideEnd = new signals.Signal();
lg.onCollidePre = new signals.Signal();
lg.onCollidePost = new signals.Signal();
lg._physicsWorld = null;
lg._physicsListener = null;
lg._physicsRunning = false;
lg._physicsBodyToRemove = null;
lg.physicsTypeStatic = 0;
lg.physicsTypeKinematic = 1;
lg.physicsTypeDynamic = 2;

lg.createPhysicsWorld = function(gravity, doSleep){
    if(lg._physicsWorld) lg.destroyPhysicsWorld();
    var world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(gravity.x, gravity.y), doSleep !== false);
    world.SetContinuousPhysics(true);
    lg._physicsWorld = world;
    lg._physicsBodyToRemove = [];
    return world;
}
lg.getPhysicsWorld = function(){
    if(lg._physicsWorld == null) throw "Pleas use lg.createPhysicsWorld to create the world firstly!";
    return lg._physicsWorld;
}
lg.startPhysicsWorld = function(){
    var world = lg.getPhysicsWorld();
    if(world && lg.currentScene && !lg._physicsRunning){
        lg._createPhysicsListener();
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
lg.destroyPhysicsWorld = function(){
    if(!lg._physicsWorld) return;
    lg.stopPhysicsWorld();
    for (var b = lg._physicsWorld.GetBodyList(); b; b = b.GetNext()) {
        var c = b.GetUserData();
        if(c ) c.physicsBody = null;
        lg._physicsWorld.DestroyBody(b);
    }
    lg.onCollideStart.removeAll();
    lg.onCollideEnd.removeAll();
    lg.onCollidePre.removeAll();
    lg.onCollidePost.removeAll();

    lg._physicsWorld = null;
    lg._physicsListener = null;
    lg._physicsBodyToRemove = null;
}
lg.removePhysicsBody = function(body){
    var i = lg._physicsBodyToRemove.indexOf(body);
    if(i == -1) lg._physicsBodyToRemove.push(body);
}
/**
 * Cast a ray from point0 to point1, callBack when there is a collid happen
 * @param {function} callBack Callback when collid, function(lg.Collider, point, reflectedPoint, fraction)
 * @param {point} point0 the start point0
 * @param {point} point1 the end point1
 * @param {float} radius if the ray need a size to check collision
 * */
lg.physicsRaycast = function(callBack, point0, point1, radius){
    lg.getPhysicsWorld().RayCast(function(fixture, point, normal, fraction){
        var collider = fixture.GetBody().GetUserData();
        point = cc.pMult(point, PTM_RATIO);

        var l0 = cc.pSub(point1, point);
        var pj = cc.pMult(normal, cc.pDot(l0, normal));
        //the new positon of the ray end point after reflected
        var reflectedPoint = cc.pSub(point1,cc.pMult(pj, 2));
        //the angle of the reflected ray
        var reflectAngle = lg.getAngle(point, reflectedPoint);

        //if the ray has a size, adjust the collision point
        //todo, not correct for some non-flat surface
        if(radius && radius > 0) {
            var inAngle = lg.getAngle(point0, point1);
            radius = radius/Math.sin(Math.abs(reflectAngle/2 - inAngle/2)*Math.PI/180);
            point = cc.pSub(point, lg.getPointOnCircle(cc.p(), radius, inAngle));
            var dist = cc.pDistance(point0, point1);
            fraction = cc.pDistance(point0, point)/dist;
            reflectedPoint = lg.getPointOnCircle(point, dist*(1 - fraction), reflectAngle);
        }

        //collider: the collision target, lg.collider
        //point: the collision point
        //reflectedPoint: the end point after refected
        //fraction: the distance rate from the start point to the collision point of the total ray length
        callBack(collider, point, reflectedPoint, fraction);
    }, cc.pMult(point0, 1/PTM_RATIO), cc.pMult(point1, 1/PTM_RATIO));
}
lg._createPhysicsListener = function(){
    if(lg._physicsListener) return;
    lg._physicsListener = new Box2D.Dynamics.b2ContactListener();
    lg._physicsListener.BeginContact = function (contact) {
        var ca = contact.GetFixtureA().GetBody().GetUserData();
        var cb = contact.GetFixtureB().GetBody().GetUserData();
        if(ca.owner && ca.owner.parent == null) return;
        if(cb.owner && cb.owner.parent == null) return;

        ca.contact = cb.contact = contact;

        //tell you how to fetch the collision point
//        var mainfold = new Box2D.Collision.b2WorldManifold();
//        contact.GetWorldManifold(mainfold);
//        var contactPoint = cc.pMult(mainfold.m_points[0], PTM_RATIO);
//        lg.drawRect(cc.rect(contactPoint.x - 2, contactPoint.y - 2, 4, 4));
//        cc.log(mainfold.m_points.length);

        lg.onCollideStart.dispatch(ca, cb);
        ca.contact = cb.contact = null;
    }
    lg._physicsListener.EndContact = function (contact) {
        var ca = contact.GetFixtureA().GetBody().GetUserData();
        var cb = contact.GetFixtureB().GetBody().GetUserData();
        if(ca.owner && ca.owner.parent == null) return;
        if(cb.owner && cb.owner.parent == null) return;
        ca.contact = cb.contact = contact;
        lg.onCollideEnd.dispatch(ca, cb);
        ca.contact = cb.contact = null;
    }
    lg._physicsListener.PreSolve = function (contact, oldManifold) {
        var ca = contact.GetFixtureA().GetBody().GetUserData();
        var cb = contact.GetFixtureB().GetBody().GetUserData();
        if(ca.owner && ca.owner.parent == null) return;
        if(cb.owner && cb.owner.parent == null) return;
        ca.contact = cb.contact = contact;
        lg.onCollidePre.dispatch(ca, cb);
        ca.contact = cb.contact = null;
    }
    lg._physicsListener.PostSolve = function (contact, impulse) {
        var ca = contact.GetFixtureA().GetBody().GetUserData();
        var cb = contact.GetFixtureB().GetBody().GetUserData();
        if(ca.owner && ca.owner.parent == null) return;
        if(cb.owner && cb.owner.parent == null) return;
        ca.contact = cb.contact = contact;
        lg.onCollidePost.dispatch(ca, cb);
        ca.contact = cb.contact = null;
    }
    lg._physicsWorld.SetContactListener(lg._physicsListener);
}

/**
 * Create physical walls, up/down/left/right
 * lg.createPhysicalWalls(0, 0.8, [1,1,1,1]);
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
    fixDef.shape.SetAsBox(0.5*winSize.width/PTM_RATIO, 0.5);

    // upper
    if(walls[0]){
        bodyDef.position.Set(0.5*winSize.width / PTM_RATIO, winSize.height / PTM_RATIO);
        world.CreateBody(bodyDef).CreateFixture(fixDef);
    }
    // bottom
    if(walls[1]){
        bodyDef.position.Set(0.5*winSize.width / PTM_RATIO, 0);
        world.CreateBody(bodyDef).CreateFixture(fixDef);
    }
    fixDef.shape.SetAsBox(0.5, 0.5*winSize.height / PTM_RATIO);
    // left
    if(walls[2]){
        bodyDef.position.Set(0, 0.5*winSize.height / PTM_RATIO);
        world.CreateBody(bodyDef).CreateFixture(fixDef);
    }
    // right
    if(walls[3]){
        bodyDef.position.Set(winSize.width / PTM_RATIO, 0.5*winSize.height / PTM_RATIO);
        world.CreateBody(bodyDef).CreateFixture(fixDef);
    }
}
//It is recommended that a fixed time step is used with Box2D for stability
//of the simulation, however, we are using a variable time step here.
//You need to make an informed choice, the following URL is useful
//http://gafferongames.com/game-physics/fix-your-timestep/
var velocityIterations = 8;
var positionIterations = 1;
lg._updatePhysicsWorld = function(dt){
    var i = lg._physicsBodyToRemove.length;
    while(i--){
        lg._physicsWorld.DestroyBody(lg._physicsBodyToRemove[i]);
        lg._physicsBodyToRemove.splice(i, 1);
    }
    // Instruct the world to perform a single step of simulation. It is
    // generally best to keep the time step and iterations fixed.
    lg._physicsWorld.Step(dt, velocityIterations, positionIterations);
    //Iterate over the bodies in the physics world
    for (var b = lg._physicsWorld.GetBodyList(); b; b = b.GetNext()) {
        var collider = b.GetUserData();
        if(collider == null) continue;
        var sprite = collider.owner || collider;
        //todo, if bind the mainCollider only?
        if (b.__isMain && sprite != null && sprite.parent) {
//        if (sprite != null && sprite.parent) {
            var pos = cc.p(b.GetPosition());
            pos.x *= PTM_RATIO;
            pos.y *= PTM_RATIO;
            pos = sprite.parent.convertToNodeSpace(pos);
            //fix the anchor offset
            if(collider.getOffsetToAnchor){
                var offset = collider.getOffsetToAnchor();
                pos.x -= offset.x;
                pos.y -= offset.y;
            }
            sprite.x = pos.x;
            sprite.y = pos.y;
            sprite.rotation = -1 * RADIAN_TO_DEGREE*b.GetAngle();
            //fix the rotation offset
            sprite.rotation += b.__rotationOffset;
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
            //todo, bug, if you want to show the debugdraw, denote this line
            ctx.translate(0, ctx.canvas.height);
            this._refWorld.DrawDebugData();
            ctx.scale(1, 1);
            ctx.translate(0, 0);
        };
    }
});
/**
 * Created by long on 14-8-1.
 * for box2d
 */
flax.ColliderType = {
    rect: "Rect",
    circle: "Circle",
    polygon: "Poly"
};
flax.Collider = cc.Class.extend({
    name:null,
    owner:null,
    type:flax.ColliderType.rect,
    physicsBody:null,//the physics body if exist
    physicsFixture:null,//the physics fixture
    physicsContact:null,//the contact info if collision happens
    _center:null,//center point in local space
    _width:0,
    _height:0,
    _rotation:0,
    _localRect:null,
    _polygons:null,
    ctor:function(data, centerAnchor){
        data = data.split(",");
        this.type = data[0];
        this._center = cc.p(parseFloat(data[1]), parseFloat(data[2]));
        this._width = parseFloat(data[3]);
        this._height = parseFloat(data[4]);
        this._rotation = parseFloat(data[5]);
        //polygon data
        if(data.length > 6){
            this._polygons = [];
            var arr = data[6].split("'");
            for(var i = 0; i < arr.length - 1; i += 2){
                var pos = {x:parseFloat(arr[i]), y:parseFloat(arr[i + 1])};
                this._polygons.push(pos);
            }
        }

        if(centerAnchor === false) {
            this._center.x += this._width/2;
            this._center.y += this._height/2;
        }
        this._localRect = cc.rect(this._center.x - this._width/2, this._center.y - this._height/2, this._width, this._height);
    },
    setOwner:function(owner)
    {
        if(this.owner == owner) return;
        this.owner = owner;
        this.owner.retain();
    },
    /**
     * Enable the physics with the params
     * @param {int} type Box2D.Dynamics.b2Body.b2_dynamicBody,b2_staticBody,b2_kinematicBody
     * */
    createPhysics:function(density, friction,restitution, isSensor, catBits, maskBits){
        if(this.physicsFixture) return this.physicsFixture;
        var body = this.physicsBody = this.owner.physicsBody;
        if(body == null) throw "Please CreatePhysics in its owner firstly!";

        var size = this.getSize();
        var centerPos = this.getCenter();
        var bodyPos = flax.getPosition(this.owner, true);

        var shape =null;
        if(this.type == flax.ColliderType.circle){
            shape = new Box2D.Collision.Shapes.b2CircleShape();
            shape.SetRadius(0.5*size.width*flax.getScale(this.owner, true).x/PTM_RATIO);
            var offsetToAnchor = cc.pSub(centerPos, bodyPos);
            shape.SetLocalPosition(cc.pMult(offsetToAnchor, 1/PTM_RATIO));
        }else if(this.type == flax.ColliderType.rect || this.type == flax.ColliderType.polygon){
            //convert the rect to polygon
            if(this.type == flax.ColliderType.rect){
                this._polygons = [cc.p(-0.5*size.width, -0.5*size.height), cc.p(0.5*size.width, - 0.5*size.height), cc.p(0.5*size.width, 0.5*size.height),cc.p(-0.5*size.width, 0.5*size.height)];
                for(var i = 0; i < this._polygons.length; i++){
                    var p = this._polygons[i];
                    p.x += this._center.x;
                    p.y += this._center.y;
                }
            }
            shape = new Box2D.Collision.Shapes.b2PolygonShape();
            var arr = [];
            for(var i = 0; i < this._polygons.length; i++){
                var p = cc.p(this._polygons[i]);
                p = this.owner.convertToWorldSpace(p);
                p.x -= bodyPos.x;
                p.y -= bodyPos.y;
                p.x /= PTM_RATIO;
                p.y /= PTM_RATIO;
                arr.push(p);
            }
            shape.SetAsArray(arr);
        }else{
            throw "The physics type: "+this.type+" is not supported!";
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
        this.physicsFixture = body.CreateFixture(fixtureDef);
        this.physicsFixture.SetUserData(this);
        return this.physicsFixture;
    },
    destroyPhysics:function(){
        if(this.physicsFixture){
            flax.removePhysicsFixture(this.physicsFixture);
            this.physicsFixture = null;
            this.physicsBody = null;
        }
        if(this.owner){
            this.owner.release();
            this.owner = null;
        }
    },
    //todo, with polygon
    checkCollision:function(collider){
        if(collider.type == this.type && this.type == flax.ColliderType.rect){
            return cc.rectIntersectsRect(this.getRect(true), collider.getRect(true));
        }else if(collider.type == this.type && this.type == flax.ColliderType.circle){
            var pos = this.getCenter(true);
            var pos1 = collider.getCenter(true);
            return cc.pDistance(pos, pos1) <= (this.getSize().width + collider.getSize().width)/2;
        }else if(this.type == flax.ColliderType.rect){
            return this._ifRectCollidCircle(this.getRect(true),collider.getRect(true));
        }else if(this.type == flax.ColliderType.circle){
            return this._ifRectCollidCircle(collider.getRect(true), this.getRect(true));
        }
    },
    containPoint:function(pos){
        return this.containsPoint(pos);
    },
    containsPoint:function(pos){
        pos = this.owner.convertToNodeSpace(pos);
        if(this.type == flax.ColliderType.rect){
            return cc.rectContainsPoint(this._localRect, pos);
        }else if(this.type == flax.ColliderType.polygon){
            return this._polyContainsPoint(pos);
        }
        var dis = cc.pDistance(pos, this._center);
        return dis <= this._width/2;
    },
    /**
     * Checks whether the x and y coordinates passed to this function are contained within this polygon
     * @method _polyContainsPoint
     * @param pos {x,y} The X coordinate of the point to test
     * @return {Boolean} Whether the x/y coordinates are within this polygon
     */
    _polyContainsPoint:function(pos)
    {
        var inside = false;
        // use some raycasting to test hits
        // https://github.com/substack/point-in-polygon/blob/master/index.js
        var length = this._polygons.length;

        for(var i = 0, j = length - 1; i < length; j = i++)
        {
            var pi = this._polygons[i],
                pj = this._polygons[j];
            intersect = ((pi.y > pos.y) !== (pj.y > pos.y)) && (pos.x < (pj.x - pi.x) * (pos.y - pi.y) / (pj.y - pi.y) + pi.x);
            if(intersect) inside = !inside;
        }
        return inside;
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
    getRect:function(coordinate){
        if(coordinate == null) coordinate = true;
        if(!coordinate) return this._localRect;

        var center = this.getCenter(coordinate);
        var size = this.getSize(coordinate);
        var rect = cc.rect(center.x - size.width/2, center.y - size.height/2, size.width, size.height);
        return rect;
    },
    getCenter:function(coordinate){
        var center = this.owner.convertToWorldSpace(this._center);
        if(this.owner.parent) {
            if(coordinate === false) center = this.owner.parent.convertToNodeSpace(center);
            else if(coordinate instanceof cc.Node) center = coordinate.convertToNodeSpace(center);
        }
        return center;
    },
    /**
     * If the owner or its parent has been scaled, the calculate the real size of the collider
     * */
    getSize:function(coordinate){
        var s = flax.getScale(this.owner, coordinate);
        var w = this._width*Math.abs(s.x);
        var h = this._height*Math.abs(s.y);
        return {width:w, height:h};
    },
    debugDraw:function(){
        var rect = this.getRect(true);
        if(this.type == flax.ColliderType.rect){
            flax.drawRect(rect)
        }else{
            var drawNode = cc.DrawNode.create();
            if(flax.currentScene) flax.currentScene.addChild(drawNode, 99999);
            var lineWidth = 1;
            var lineColor = cc.color(255, 0, 0, 255);
            var fillColor = cc.color(0, 255, 0, 122);

            if(this.type == flax.ColliderType.circle){
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
flax.onCollideStart = new signals.Signal();
flax.onCollideEnd = new signals.Signal();
flax.onCollidePre = new signals.Signal();
flax.onCollidePost = new signals.Signal();
flax._physicsWorld = null;
flax._physicsListener = null;
flax._physicsRunning = false;
flax._physicsBodyToRemove = null;
flax._physicsFixtureToRemove = null;
flax.physicsTypeStatic = 0;
flax.physicsTypeKinematic = 1;
flax.physicsTypeDynamic = 2;
/**
 * The position of the whole physics world
 * */
flax.physicsWorldPos = cc.p();

flax.createPhysicsWorld = function(gravity, doSleep){
    if(flax._physicsWorld) flax.destroyPhysicsWorld();
    var world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(gravity.x, gravity.y), doSleep === true);
    world.SetContinuousPhysics(true);
    flax.physicsWorldPos = cc.p();
    flax._physicsWorld = world;
    flax._physicsBodyToRemove = [];
    flax._physicsFixtureToRemove = [];
    return world;
};
flax.getPhysicsWorld = function(){
    if(flax._physicsWorld == null) throw "Pleas use flax.createPhysicsWorld to create the world firstly!";
    return flax._physicsWorld;
};
flax.startPhysicsWorld = function(){
    var world = flax.getPhysicsWorld();
    if(world && flax.currentScene && !flax._physicsRunning){
        flax._createPhysicsListener();
        flax.currentScene.schedule(flax._updatePhysicsWorld, 1.0/cc.game.config["frameRate"]);
        flax._physicsRunning = true;
    }
};
flax.stopPhysicsWorld = function(){
    if(flax._physicsRunning && flax.currentScene) {
        flax.currentScene.unschedule(flax._updatePhysicsWorld);
        flax._physicsRunning = false;
    }
};
flax.destroyPhysicsWorld = function(){
    if(!flax._physicsWorld) return;
    flax.stopPhysicsWorld();
    for (var b = flax._physicsWorld.GetBodyList(); b; b = b.GetNext()) {
        var sprite = b.GetUserData();
        if(sprite) sprite._physicsBody = null;
        flax._physicsWorld.DestroyBody(b);
    }
    flax.onCollideStart.removeAll();
    flax.onCollideEnd.removeAll();
    flax.onCollidePre.removeAll();
    flax.onCollidePost.removeAll();

    flax._physicsWorld = null;
    flax._physicsListener = null;
    flax._physicsBodyToRemove = null;
};

flax.removePhysicsBody = function(body){
    var i = flax._physicsBodyToRemove.indexOf(body);
    if(i == -1) flax._physicsBodyToRemove.push(body);
};
flax.removePhysicsFixture = function(fixture){
    var i = flax._physicsFixtureToRemove.indexOf(fixture);
    if(i == -1) flax._physicsFixtureToRemove.push(fixture);
};
/**
 * Cast a ray from point0 to point1, callBack when there is a collid happen
 * @param {function} callBack Callback when collid, function(flax.Collider, reflectedPoint, endPoint, fraction)
 * @param {point} point0 the start point0
 * @param {point} point1 the end point1
 * @param {float} rayRadius if the ray need a size to check collision
 * */
flax.physicsRaycast = function(callBack, point0, point1, rayRadius){
    flax.getPhysicsWorld().RayCast(function(fixture, point, normal, fraction){
        var collider = fixture.GetUserData();
        point = cc.pMult(point, PTM_RATIO);

        var l0 = cc.pSub(point1, point);
        var pj = cc.pMult(normal, cc.pDot(l0, normal));
        //the new positon of the ray end point after reflected
        var endPoint = cc.pSub(point1,cc.pMult(pj, 2));
        //the angle of the reflected ray
        var reflectAngle = flax.getAngle(point, endPoint);

        //if the ray has a size, adjust the collision point
        //todo, not correct for some non-flat surface
        if(rayRadius && rayRadius > 0) {
            var inAngle = flax.getAngle(point0, point1);
            rayRadius = rayRadius/Math.sin(Math.abs(reflectAngle/2 - inAngle/2)*Math.PI/180);
            point = cc.pSub(point, flax.getPointOnCircle(cc.p(), rayRadius, inAngle));
            var dist = cc.pDistance(point0, point1);
            fraction = cc.pDistance(point0, point)/dist;
            endPoint = flax.getPointOnCircle(point, dist*(1 - fraction), reflectAngle);
        }

        //collider: the target collided by thre ray, flax.Collider
        //point: the collision point
        //endPoint: the end point after reflected
        //fraction: the distance rate from the start point to the collision point of the total ray length
        callBack(collider, point, endPoint, fraction);
    }, cc.pMult(point0, 1/PTM_RATIO), cc.pMult(point1, 1/PTM_RATIO));
};

flax.physicsSimulate = function(body, time, step){
    if(!step) step = flax.frameInterval;
    var steps = Math.round(time/step);

    var oldTrans = {pos: body.GetPosition(), rot: body.GetAngle()};
    var dTypes = {};
    var i = 0;
    for (var b = flax._physicsWorld.GetBodyList(); b; b = b.GetNext()) {
        if(b == body) continue;
        var type = b.GetType();
        if(type != flax.physicsTypeStatic){
            b.m_type = flax.physicsTypeStatic;
            b.__tempKey = ++i;
            dTypes[b.__tempKey] = type;
        }
    }

    var path = [];
    for(i = 0; i < steps; i++){
        flax._physicsWorld.Step(step, velocityIterations, positionIterations);
        var pos = body.GetPosition();
        path.push(cc.p(pos.x*PTM_RATIO, pos.y*PTM_RATIO));
    }

    for (var b = flax._physicsWorld.GetBodyList(); b; b = b.GetNext()) {
        if(b.__tempKey){
            b.SetType(dTypes[b.__tempKey]);
            delete b.__tempKey;
        }
    }
    body.SetPositionAndAngle(oldTrans.pos, oldTrans.rot);
    return path;
};
flax._createPhysicsListener = function(){
    if(flax._physicsListener) return;
    flax._physicsListener = new Box2D.Dynamics.b2ContactListener();
    flax._physicsListener.BeginContact = function (contact) {
        var fa = contact.GetFixtureA();
        var fb = contact.GetFixtureB();
        var ca = fa.GetUserData() || fa;
        var cb = fb.GetUserData() || fb;
        if(ca.owner && ca.owner.parent == null) return;
        if(cb.owner && cb.owner.parent == null) return;

        ca.physicsContact = cb.physicsContact = contact;

         //How to fetch the collision point
//        var mainfold = new Box2D.Collision.b2WorldManifold();
//        contact.GetWorldManifold(mainfold);
//        var contactPoint = cc.pMult(mainfold.m_points[0], PTM_RATIO);
//        flax.drawRect(cc.rect(contactPoint.x - 2, contactPoint.y - 2, 4, 4));
//        cc.log(mainfold.m_points.length);

        flax.onCollideStart.dispatch(ca, cb);
        ca.physicsContact = cb.physicsContact = null;
    };
    flax._physicsListener.EndContact = function (contact) {
        var fa = contact.GetFixtureA();
        var fb = contact.GetFixtureB();
        var ca = fa.GetUserData() || fa;
        var cb = fb.GetUserData() || fb;
        if(ca.owner && ca.owner.parent == null) return;
        if(cb.owner && cb.owner.parent == null) return;
        ca.physicsContact = cb.physicsContact = contact;
        flax.onCollideEnd.dispatch(ca, cb);
        ca.physicsContact = cb.physicsContact = null;
    };
    flax._physicsListener.PreSolve = function (contact, oldManifold) {
        var fa = contact.GetFixtureA();
        var fb = contact.GetFixtureB();
        var ca = fa.GetUserData() || fa;
        var cb = fb.GetUserData() || fb;
        if(ca.owner && ca.owner.parent == null) return;
        if(cb.owner && cb.owner.parent == null) return;
        ca.physicsContact = cb.physicsContact = contact;
        flax.onCollidePre.dispatch(ca, cb);
        ca.physicsContact = cb.physicsContact = null;
    };
    flax._physicsListener.PostSolve = function (contact, impulse) {
        var fa = contact.GetFixtureA();
        var fb = contact.GetFixtureB();
        var ca = fa.GetUserData() || fa;
        var cb = fb.GetUserData() || fb;
        if(ca.owner && ca.owner.parent == null) return;
        if(cb.owner && cb.owner.parent == null) return;
        ca.physicsContact = cb.physicsContact = contact;
        flax.onCollidePost.dispatch(ca, cb);
        ca.physicsContact = cb.physicsContact = null;
    };
    flax._physicsWorld.SetContactListener(flax._physicsListener);
};

/**
 * Create physical walls, up/down/left/right
 * flax.createPhysicalWalls(0, 0.8, [1,1,1,1]);
 * */
flax.createPhysicalWalls = function(walls, friction){
    if(walls == null || walls.length == 0) walls = [1,1,1,1];
    var world = flax.getPhysicsWorld();
    var fixDef = new Box2D.Dynamics.b2FixtureDef();
    fixDef.density = 1.0;
    if(friction == null)  friction = 3;
    fixDef.friction = friction;

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
};
//It is recommended that a fixed time step is used with Box2D for stability
//of the simulation, however, we are using a variable time step here.
//You need to make an informed choice, the following URL is useful
//http://gafferongames.com/game-physics/fix-your-timestep/
var velocityIterations = 8;
var positionIterations = 1;
flax._updatePhysicsWorld = function(dt){
    var i = flax._physicsFixtureToRemove.length;
    while(i--){
        var fixture = flax._physicsFixtureToRemove[i];
        var body = fixture.GetBody();
        if(body) body.DestroyFixture(fixture);
        flax._physicsFixtureToRemove.splice(i, 1);
    }

    i = flax._physicsBodyToRemove.length;
    while(i--){
        flax._physicsWorld.DestroyBody(flax._physicsBodyToRemove[i]);
        flax._physicsBodyToRemove.splice(i, 1);
    }
    // Instruct the world to perform a single step of simulation. It is
    // generally best to keep the time step and iterations fixed.
    flax._physicsWorld.Step(dt, velocityIterations, positionIterations);
    //Iterate over the bodies in the physics world
    for (var b = flax._physicsWorld.GetBodyList(); b; b = b.GetNext()) {
        var sprite = b.GetUserData();
        if(sprite == null) continue;
        if (sprite != null && sprite.parent) {
            var pos = cc.p(b.GetPosition());
            pos.x *= PTM_RATIO;
            pos.y *= PTM_RATIO;
            //cal the whole physics world position
            pos = cc.pAdd(pos, flax.physicsWorldPos);
            pos = sprite.parent.convertToNodeSpace(pos);
            sprite.x = pos.x;
            sprite.y = pos.y;
            //ignore rotation
            if(sprite.ignoreBodyRotation === true) continue;
            sprite.rotation = -1 * RADIAN_TO_DEGREE*b.GetAngle();
            //fix the rotation offset
            sprite.rotation += b.__rotationOffset;
        }
    }
};
flax._debugBox2DNode = null;
/**
 * todo, bug
 * */
flax.debugDrawPhysics = function(){
    if(flax._debugBox2DNode == null){
        flax._debugBox2DNode = new flax.DebugBox2DNode(flax.getPhysicsWorld());
        flax.currentScene.addChild(flax._debugBox2DNode, Number.MAX_VALUE);
    }
};
flax.DebugBox2DNode = cc.Node.extend({
    _refWorld: null,
    ctor: function(world) {
        this._super();
        this._refWorld = world;

        var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
        var debugDraw = new b2DebugDraw();
        debugDraw.SetSprite(document.getElementById("gameCanvas").getContext("2d"));
        var scale = PTM_RATIO * cc.view.getViewPortRect().width / cc.view.getDesignResolutionSize().width;
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
//            ctx.translate(0, ctx.canvas.height);
            this._refWorld.DrawDebugData();
            ctx.scale(1, 1);
            ctx.translate(0, 0);
        }
    }
});
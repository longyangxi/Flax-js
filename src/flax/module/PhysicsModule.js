/**
 * Created by long on 15-9-17.
 */

flax.PhysicsModule = {
    _physicsBody:null,
    _physicsToBeSet:null,
    _physicsBodyParam:null,
    _physicsColliders:null,
    onEnter:function()
    {
        if(this._physicsColliders == null) this._physicsColliders = [];
        if(this._physicsBodyParam) {
            this.createPhysics(this._physicsBodyParam.type, this._physicsBodyParam.fixedRotation, this._physicsBodyParam.bullet);
        }
        if(this._physicsToBeSet){
            for(var name in this._physicsToBeSet){
                var collider = this.getCollider(name);
                var param = this._physicsToBeSet[name];
                collider.createPhysics(param.density, param.friction, param.restitution, param.isSensor, param.catBits, param.maskBits);
                delete this._physicsToBeSet[name];
                if(this._physicsColliders.indexOf(collider) == -1) this._physicsColliders.push(collider);
            }
        }
    },
    onExit:function()
    {
        //remove physics
        for(var i = 0; i < this._physicsColliders.length; i++){
            this._physicsColliders[i].destroyPhysics();
        }
        this._physicsColliders = [];

        if(this._physicsBody){
            flax.removePhysicsBody(this._physicsBody);
            this._physicsBody = null;
        }
        this._physicsBodyParam = null;
    },
    getPhysicsBody:function(){
        return this._physicsBody;
    },
    createPhysics:function(type, fixedRotation, bullet){
        if(type == null) type = Box2D.Dynamics.b2Body.b2_dynamicBody;
        this._physicsBodyParam = {type:type, fixedRotation:fixedRotation, bullet:bullet};
        if(!this.parent) return null;
        if(this._physicsBody == null) {
            var def = new Box2D.Dynamics.b2BodyDef();
            def.type = type;
            def.fixedRotation = fixedRotation;
            def.bullet = bullet;
            def.userData = this;
            var pos = flax.getPosition(this, true);
            def.position.Set(pos.x / PTM_RATIO, pos.y / PTM_RATIO);
            this._physicsBody = flax.getPhysicsWorld().CreateBody(def);
            this._physicsBody.__rotationOffset = this.rotation;
        }
        return this._physicsBody;
    },
    destroyPhysics:function(){
        this.removePhysicsShape();
    },
    addPhysicsShape:function(name, density, friction,restitution, isSensor, catBits, maskBits){
        if(this._physicsBody == null) throw "Please createPhysics firstly!";
        var collider = this.getCollider(name);
        if(collider == null) {
            cc.log("There is no collider named: "+name);
            return null;
        }else if(collider.physicsFixture){
            return collider.physicsFixture;
        }
        var param = {density:density,friction:friction,restitution:restitution,isSensor:isSensor,catBits:catBits,maskBits:maskBits};
        if(this.parent) {
            collider.setOwner(this);
            var fixture = collider.createPhysics(density, friction, restitution, isSensor, catBits, maskBits);
            if(this._physicsColliders.indexOf(collider) == -1) this._physicsColliders.push(collider);
            return fixture;
        }
        if(this._physicsToBeSet == null) this._physicsToBeSet = {};
        if(this._physicsToBeSet[name] == null) this._physicsToBeSet[name] = param;
        return null;
    },
    /**
     * Remove the physics of name, if not set name, remove all
     * */
    removePhysicsShape:function(name){
        var i = this._physicsColliders.length;
        while(i--){
            var c = this._physicsColliders[i];
            if(name == null || c.name == name){
                c.destroyPhysics();
                this._physicsColliders.splice(i, 1);
            }
        }
        if(this._physicsColliders.length == 0){
            flax.removePhysicsBody(this._physicsBody);
            this._physicsBody = null;
        }
    }
}
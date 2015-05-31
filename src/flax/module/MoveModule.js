/**
 * Created by long on 15-4-17.
 */

flax.MoveModule = {
    gravityOnMove:null,
    destroyWhenReach:false,
    destroyWhenOutofStage:false,
    moveSpeed:null,
    moveAcc:null,
    restrainRect:null,
    inRandom:false,
    _moveSpeedLen:0,
    _targetPos:null,
    _inMoving:false,
    _callBack:null,
    _callContext:null,

    onEnter:function(){
    },
    onExit:function(){
        this.destroyWhenReach = false;
        this.destroyWhenOutofStage = false;
        this.gravityOnMove = null;
        this.restrainRect = null;
        this.inRandom = false;
        this._inMoving = false;
    },
    /**
     * Move to a new position within duration time
     * Note: If you use cc.moveTo in JSB, the setPosition function in js can not be called, use this instead of
     * */
    moveTo:function(pos, duration, callBack, callContext) {
        this.inRandom = false;
        this._targetPos = pos;
        this._callBack = callBack;
        this._callContext = callContext;
        var dis = cc.pSub(pos, this.getPosition());
        if(cc.pLength(dis) < 1 || !duration || duration <= 0){
            this.scheduleOnce(this._moveOver, 0.01);
            return;
        }
        this.moveSpeed = cc.pMult(dis, 1.0 / duration);
        this._moveSpeedLen = cc.pLength(this.moveSpeed);
        this.resumeMove();
    },
    /**
     * Move to a new position with speed
     * Note: If you use cc.moveTo in JSB, the setPosition function in js can not be called, use this instead of
     * */
    moveToBySpeed:function(pos, speed, callBack, callContext) {
        this.inRandom = false;
        this._targetPos = pos;
        this._callBack = callBack;
        this._callContext = callContext;
        var dis = cc.pSub(pos, this.getPosition());
        var len = cc.pLength(dis);
        if(len < 1){
            this.scheduleOnce(this._moveOver, 0.01);
            return;
        }
        this.moveSpeed = cc.pMult(dis, speed / len);
        this._moveSpeedLen = cc.pLength(this.moveSpeed);
        this.resumeMove();
    },
    /**
     * Just move forward with the speed (and the direction)
     * @speed {Point|Number} speed If its point, then move on x direction on .x speed and y direction on .y speed
     * @direction {Number} direction If speed is a number, then move on this direction(degree angle)
     * */
    moveBySpeed:function(speed, direction)
    {
        this._targetPos = null;
        this._callBack = null;
        this.inRandom = false;

        if(typeof speed === "object"){
            this.moveSpeed = speed;
        }else{
            this.moveSpeed = flax.getPointOnCircle(cc.p(), speed, direction);
        }
        this.resumeMove();
    },
    moveRandomly:function(speed, direction, restrainRect)
    {
        this.restrainRect = restrainRect || flax.stageRect;
        this.moveBySpeed(speed, direction || 360*Math.random());
        this.inRandom = direction == null;
    },
    pauseMove:function()
    {
        if(this._inMoving){
            this.unschedule(this._doMove);
            this._inMoving = false;
        }
    },
    resumeMove:function()
    {
        if(this._inMoving) return;
        this._inMoving = true;
        this.schedule(this._doMove, flax.frameInterval, cc.REPEAT_FOREVER);
    },
    stopMove:function()
    {
        if(this._inMoving){
            this._targetPos = this.moveSpeed = null;
            this._inMoving = false;
            this._callBack = null;
            this.restrainRect = null;
            this.inRandom = false;
            this.unschedule(this._doMove);
        }
    },
    _doMove:function(delta)
    {
        var pos = this.getPosition();
        var dis = this._targetPos ? cc.pDistance(pos, this._targetPos) : Number.maxValue;
        var deltaDis = this._moveSpeedLen*delta;
        if(dis < deltaDis || (this.destroyWhenOutofStage && !cc.rectContainsRect(flax.stageRect, flax.getRect(this, true)))){
            this._moveOver();
            this.stopMove();
        }else{
            var rect = flax.getRect(this, this.parent);
            //when collide with the bounder, bounce back
            if(this.restrainRect){
                var dx = 0;
                var dy = 0;
                if(rect.x < this.restrainRect.x){
                    dx = 1.0;
                }else if(rect.x > this.restrainRect.x + this.restrainRect.width - rect.width) {
                    dx = -1.0;
                }
                if(rect.y < this.restrainRect.y){
                    dy = 1.0;
                }else if(rect.y > this.restrainRect.y + this.restrainRect.height - rect.height) {
                    dy = -1.0;
                }
                if(this.inRandom){
                    if(dx) this.moveSpeed.x = dx*Math.abs(this.moveSpeed.x);
                    if(dy) this.moveSpeed.y = dy*Math.abs(this.moveSpeed.y);
                }else if(dx || dy){
                    //todo
//                    this.moveSpeed = cc.p();
//                    this.stopMove();
                }
            }
            var acc = this.moveAcc;
            if(this.gravityOnMove) acc = cc.pAdd(acc || cc.p(), this.gravityOnMove);
            if(acc) {
                this.moveSpeed = cc.pAdd(this.moveSpeed, cc.pMult(acc, delta));
            }
            this.setPosition(cc.pAdd(pos, cc.pMult(this.moveSpeed, delta)));
        }
    },
    _moveOver:function()
    {
        if(this._targetPos) this.setPosition(this._targetPos);
        if(this._callBack){
            this._callBack.apply(this._callContext || this);
            this._callBack = null;
        }
        if(this.destroyWhenReach){
            this.destroy();
        }
    }
}
/**
 * Created by long on 15-4-17.
 */

flax.MoveModule = {
    gravityOnMove:null,
    destroyWhenReach:false,
    destroyWhenOutofStage:false,
    _moveSpeed:null,
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
        this._inMoving = false;
    },
    /**
     * Move to a new position within duration time
     * Note: If you use cc.moveTo in JSB, the setPosition function in js can not be called, use this instead of
     * */
    moveTo:function(pos, duration, callBack, callContext) {
        this._targetPos = pos;
        this._callBack = callBack;
        this._callContext = callContext;
        var dis = cc.pSub(pos, this.getPosition());
        if(cc.pLength(dis) < 1 || !duration || duration <= 0){
            this.scheduleOnce(this._moveOver, 0.01);
            return;
        }
        this._moveSpeed = cc.pMult(dis, 1.0 / duration);
        this._moveSpeedLen = cc.pLength(this._moveSpeed);
        this.resumeMove();
    },
    /**
     * Move to a new position with speed
     * Note: If you use cc.moveTo in JSB, the setPosition function in js can not be called, use this instead of
     * */
    moveToBySpeed:function(pos, speed, callBack, callContext) {
        this._targetPos = pos;
        this._callBack = callBack;
        this._callContext = callContext;
        var dis = cc.pSub(pos, this.getPosition());
        var len = cc.pLength(dis);
        if(len < 1){
            this.scheduleOnce(this._moveOver, 0.01);
            return;
        }
        this._moveSpeed = cc.pMult(dis, speed / len);
        this._moveSpeedLen = cc.pLength(this._moveSpeed);
        this.resumeMove();
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
        if(this._inMoving || !this._targetPos) return;
        this._inMoving = true;
        this.schedule(this._doMove, flax.frameInterval, cc.REPEAT_FOREVER);
    },
    stopMove:function()
    {
        if(this._inMoving){
            this._targetPos = this._moveSpeed = null;
            this._inMoving = false;
            this._callBack = null;
            this.unschedule(this._doMove);
        }
    },
    _doMove:function(delta)
    {
        var pos = this.getPosition();
        var dis = cc.pDistance(pos, this._targetPos);
        var deltaDis = this._moveSpeedLen*delta;
        if(dis < deltaDis || (this.destroyWhenOutofStage && !cc.rectContainsRect(flax.stageRect, this.getRect(true)))){
            this._moveOver();
            this.stopMove();
        }else{
            if(this.gravityOnMove){
                this._moveSpeed = cc.pAdd(this._moveSpeed, cc.pMult(this.gravityOnMove, delta));
            }
            this.setPosition(cc.pAdd(pos, cc.pMult(this._moveSpeed, delta)));
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
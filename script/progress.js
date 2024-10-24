export class ProgressControl {
    _refListener; // DotNet object 
    _strMethodName;
    //
    _nPercentTotal = 0;
    _nStepMax = 100;
    _nStepCounter = 0;
    _nSegmentStepValue = 0;
    _nSegmentSeed = 0;
    _nSegmentRatio = 1;
    //
    constructor(refListener, strMethodName) {
        this._refListener = refListener;
        this._strMethodName = strMethodName;
    }
    setSegment(nSegment) {
        this._nStepMax = 1;
        this._nStepCounter = 0;
        //
        this._nSegmentSeed = this._nPercentTotal;
        this._nSegmentRatio = nSegment / 100;
    }
    setStepMax(nStepMax) {
        this._nStepMax = nStepMax;
        this._nSegmentStepValue = 100 / nStepMax;
        this._nStepCounter = 0;
    }
    doStep() {
        if (this._nStepCounter < this._nStepMax) {
            this._nStepCounter++;
            let nSegmentPercent = Math.round((this._nStepCounter * this._nSegmentStepValue));
            if (nSegmentPercent > 100)
                nSegmentPercent = 100;
            this._nPercentTotal = this._nSegmentSeed + Math.round(nSegmentPercent * this._nSegmentRatio);
            if (this._nPercentTotal > 100)
                this._nPercentTotal = 100;
            window.requestAnimationFrame((timestamp) => {
                this._refListener.invokeMethodAsync(this._strMethodName, this._nPercentTotal);
            });
        }
    }
    endSegment() {
        this._nStepCounter = this._nStepMax;
        this._nPercentTotal = this._nSegmentSeed + Math.round(100 * this._nSegmentRatio);
        if (this._nPercentTotal > 100)
            this._nPercentTotal = 100;
        //
        window.requestAnimationFrame((timestamp) => {
            this._refListener.invokeMethodAsync(this._strMethodName, this._nPercentTotal);
        });
    }
    done() {
        this._nPercentTotal = 100;
        //
        window.requestAnimationFrame((timestamp) => {
            this._refListener.invokeMethodAsync(this._strMethodName, this._nPercentTotal);
        });
    }
} // class ProgressControl
//# sourceMappingURL=progress.js.map
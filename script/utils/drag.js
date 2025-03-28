var DragStatus;
(function (DragStatus) {
    DragStatus[DragStatus["No"] = 0] = "No";
    DragStatus[DragStatus["Mouse"] = 1] = "Mouse";
    DragStatus[DragStatus["Touch"] = 2] = "Touch";
})(DragStatus || (DragStatus = {}));
class Dragable {
    _hteDragable;
    _hteCaptureZone;
    _hteArea;
    _refListener;
    _rule;
    _bMoving = null;
    _dragStatus = DragStatus.No;
    _ptLastDragPos = new DOMPoint();
    _callbackDragNotify;
    _draggingCssClass = "dragging";
    constructor(hteDragable, hteCaptureZone, hteArea, refListener, rule, callbackDragNotify) {
        this._hteDragable = hteDragable;
        this._hteCaptureZone = hteCaptureZone;
        this._hteArea = hteArea || hteDragable.offsetParent;
        this._refListener = refListener;
        this._rule = rule;
        this._callbackDragNotify = callbackDragNotify;
        this._hteCaptureZone.addEventListener("mousedown", this._onCaptureZoneMouseDown);
        this._hteCaptureZone.addEventListener("touchstart", this._onCaptureZoneTouchStart);
    }
    get element() {
        return this._hteDragable;
    }
    get zone() {
        return this._hteCaptureZone;
    }
    get area() {
        return this._hteArea;
    }
    _ensureView() {
        if (!this._hteArea || !this._drag)
            return;
        const rcBoundsOrig = this._hteArea.getBoundingClientRect();
        const rcThis = this._hteDragable.getBoundingClientRect();
        const rcBounds = new DOMRect();
        rcBounds.x = rcBoundsOrig.left - ((rcThis.width / 100) * this._rule.left);
        rcBounds.y = rcBoundsOrig.top - ((rcThis.height / 100) * this._rule.top);
        rcBounds.width = (rcBoundsOrig.right + ((rcThis.width / 100) * this._rule.right) - rcBounds.left);
        rcBounds.height = (rcBoundsOrig.bottom + ((rcThis.height / 100) * this._rule.bottom)) - rcBounds.top;
        const rcParent = this._hteDragable.offsetParent.getBoundingClientRect();
        let bTopNew = false;
        let bLeftNew = false;
        if (rcThis.bottom > rcBounds.bottom) {
            bTopNew = true;
            rcThis.y = rcBounds.bottom - rcThis.height;
        }
        if (rcThis.top < rcBounds.top) {
            bTopNew = true;
            rcThis.y = rcBounds.top;
        }
        if (rcThis.right > rcBounds.right) {
            bLeftNew = true;
            rcThis.x = rcBounds.right - rcThis.width;
        }
        if (rcThis.left < rcBounds.left) {
            bLeftNew = true;
            rcThis.x = rcBounds.x;
        }
        if (bTopNew || bLeftNew) {
            rcThis.x = rcThis.left - rcParent.left;
            rcThis.y = rcThis.top - rcParent.top;
            if (bLeftNew)
                this._hteDragable.style.left = rcThis.left + "px";
            if (bTopNew)
                this._hteDragable.style.top = rcThis.top + "px";
        }
    }
    _onCaptureZoneMouseDown = (ev) => {
        if (ev.target && ev.target.closest("button")) {
            return;
        }
        if (this._dragStatus === DragStatus.No) {
            ev.preventDefault();
            this._dragStatus = DragStatus.Mouse;
            document.addEventListener("mousemove", this._onMouseMove, { capture: true });
            document.addEventListener("mouseup", this._onMouseUp, { capture: true });
            this._startDrag(ev.clientX, ev.clientY);
        }
    };
    _onCaptureZoneTouchStart = (ev) => {
        if (this._dragStatus === DragStatus.No) {
            this._dragStatus = DragStatus.Touch;
            document.addEventListener("touchmove", this._onTouchMove, { capture: true });
            document.addEventListener("touchend", this._onTouchEnd, { capture: true });
            this._startDrag(ev.touches[0].clientX, ev.touches[0].clientY);
        }
    };
    _onMouseMove = (ev) => {
        if (this._dragStatus === DragStatus.Mouse) {
            ev.preventDefault();
            this._drag(ev.clientX, ev.clientY);
        }
    };
    _onMouseUp = (ev) => {
        if (this._dragStatus === DragStatus.Mouse) {
            ev.preventDefault();
            this._endDrag();
        }
    };
    _onTouchMove = (ev) => {
        if (this._dragStatus === DragStatus.Touch) {
            this._drag(ev.touches[0].clientX, ev.touches[0].clientY);
        }
    };
    _onTouchEnd = (ev) => {
        if (this._dragStatus === DragStatus.Touch) {
            this._endDrag();
        }
    };
    _startDrag(x, y) {
        this._bMoving = false;
        this._hteDragable.classList.add(this._draggingCssClass);
        this._ptLastDragPos.x = x;
        this._ptLastDragPos.y = y;
    }
    _drag(x, y) {
        if (this._bMoving === false) {
            this._bMoving = true;
            const rcElem = this._hteDragable.getBoundingClientRect();
            const rcOffsetParent = this._hteDragable.offsetParent.getBoundingClientRect();
            this._hteDragable.style.transform = "none";
            this._hteDragable.style.left = (rcElem.left - rcOffsetParent.left) + "px";
            this._hteDragable.style.top = (rcElem.top - rcOffsetParent.top) + "px";
            this._callbackDragNotify(true);
        }
        let nNewX = this._ptLastDragPos.x - x;
        let nNewY = this._ptLastDragPos.y - y;
        this._ptLastDragPos.x = x;
        this._ptLastDragPos.y = y;
        this._hteDragable.style.top = (this._hteDragable.offsetTop - nNewY) + "px";
        this._hteDragable.style.left = (this._hteDragable.offsetLeft - nNewX) + "px";
    }
    _endDrag() {
        if (this._dragStatus !== DragStatus.No) {
            switch (this._dragStatus) {
                case DragStatus.Mouse: {
                    document.removeEventListener("mousemove", this._onMouseMove);
                    document.removeEventListener("mouseup", this._onMouseUp);
                    break;
                }
                case DragStatus.Touch: {
                    document.removeEventListener("touchmove", this._onTouchMove);
                    document.removeEventListener("touchend", this._onTouchEnd);
                    break;
                }
            }
            this._hteDragable.classList.remove(this._draggingCssClass);
            this._ensureView();
            this._dragStatus = DragStatus.No;
            if (this._bMoving === true) {
                this._callbackDragNotify(false);
                this._refListener?.invokeMethodAsync("notifyDragEnd", this._hteDragable.style.left, this._hteDragable.style.top);
            }
            this._bMoving = null;
        }
    }
}
const _aDragables = [];
const _aLockingElements = [];
function _findDragable(hteDragable) {
    return _aDragables.find(item => item.element === hteDragable);
}
function _findDragableIndex(hteDragable) {
    return _aDragables.findIndex(item => item.element === hteDragable);
}
function _callbackDragNotify(bNotifyDrag) {
    if (bNotifyDrag) {
        _aLockingElements.forEach(item => item.style.pointerEvents = "none");
    }
    else {
        _aLockingElements.forEach(item => item.style.pointerEvents = "auto");
    }
}
export function regDragable(hteDragable, hteCaptureZone, hteArea = null, refListener, rule = null) {
    const objExisting = _findDragable(hteDragable);
    if (!objExisting) {
        _aDragables.push(new Dragable(hteDragable, hteCaptureZone, hteArea, refListener, rule, _callbackDragNotify));
    }
}
export function unregDragable(hteDragable) {
    const nIndex = _findDragableIndex(hteDragable);
    if (nIndex >= 0) {
        _aDragables.splice(nIndex, 1);
    }
}
export function regDragLocking(hteLockingElement) {
    if (_aLockingElements.indexOf(hteLockingElement) < 0)
        _aLockingElements.push(hteLockingElement);
}
export function unregDragLocking(hteLockingElement) {
    const nIndex = _aLockingElements.indexOf(hteLockingElement);
    if (nIndex >= 0) {
        hteLockingElement.style.pointerEvents = "auto";
        _aLockingElements.splice(nIndex, 1);
    }
}
//# sourceMappingURL=drag.js.map
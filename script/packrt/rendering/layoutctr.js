import { Helper } from "../../helper.js";
import { Position } from "../abstraction.js";
import * as h5penv from "../h5penv.js";
export class PackLayoutCtr {
    _presenter;
    _parent;
    _bIsOpened;
    static _template;
    _hteTarget;
    _layout;
    _layoutSaved;
    _bMaxSize = false;
    _aWidthSetButtons = [];
    _aHeightSetButtons = [];
    _aPositionSetButtons = [];
    constructor(hteTarget) {
        const fragPresenter = PackLayoutCtr.createPresenter();
        this._presenter = fragPresenter.firstElementChild;
        this._presenter.classList.add("packlayout-ctr");
        this._hteTarget = hteTarget;
        this._layout = this.layoutDefault;
        let listButtons = fragPresenter.querySelectorAll("#WidthDefPanel button");
        listButtons.forEach((hteBtn) => {
            hteBtn.onclick = (ev) => { this._onWidthSetClick(hteBtn); };
            this._aWidthSetButtons.push(hteBtn);
        });
        listButtons = fragPresenter.querySelectorAll("#HeightDefPanel button");
        listButtons.forEach((hteBtn) => {
            hteBtn.onclick = (ev) => { this._onHeightSetClick(hteBtn); };
            this._aHeightSetButtons.push(hteBtn);
        });
        const listRadioButtons = fragPresenter.querySelectorAll("#PositionDefPanel input");
        listRadioButtons.forEach((hteBtn) => {
            hteBtn.onclick = (ev) => { this._onPositionSetClick(hteBtn); };
            this._aPositionSetButtons.push(hteBtn);
        });
        const btnClose = fragPresenter.getElementById("CloseBtn");
        btnClose.addEventListener("click", () => {
            this.close();
        });
        window.addEventListener("resize", (ev) => {
            this.ensureView();
        });
        this._bIsOpened = false;
        this._parent = null;
    }
    static createPresenter() {
        if (!this._template) {
            this._template = document.createElement("template");
            this._template.innerHTML = h5penv.getLayoutCtrTemplateHtml();
        }
        return this._template.content.cloneNode(true);
    }
    get presenter() {
        return this._presenter;
    }
    get isOpened() {
        return this._bIsOpened;
    }
    get stateWnd() {
        return this._layout;
    }
    get isMaxSize() {
        return this._bMaxSize;
    }
    get Layout() {
        return this._layout;
    }
    get layoutDefault() {
        return Helper.isExtraSmall ?
            { width: "75%", height: "75%", position: "Center", left: undefined, top: undefined } :
            { width: "75%", height: "75%", position: "Center", left: undefined, top: undefined };
    }
    applyLayout(layout) {
        this._layout = layout;
        this._doLayout();
    }
    applyDefaultLayout() {
        this._layout = this.layoutDefault;
        this._doLayout();
    }
    applyMaxSize() {
        if (!this.isMaxSize) {
            this._bMaxSize = true;
            this._layoutSaved = this._layout;
            this._layout = { width: "100%", height: "100%", position: "TopLeft", left: undefined, top: undefined };
            this._doLayout();
            this.close();
        }
    }
    discardMaxSize(bApply = true) {
        if (this.isMaxSize) {
            this._bMaxSize = false;
            if (bApply) {
                this._layout = this._layoutSaved;
                this._doLayout();
            }
        }
    }
    acceptCustomPosition() {
        this._aPositionSetButtons.forEach(inp => inp.checked = false);
        this._layout.position = "custom";
        this._layout.left = this._hteTarget.style.left;
        this._layout.top = this._hteTarget.style.top;
    }
    ensureView() {
        if (!this._hteTarget.offsetParent)
            return;
        const rcParent = this._hteTarget.offsetParent.getBoundingClientRect();
        const rcThis = this._hteTarget.getBoundingClientRect();
        const nLimitHorz = rcThis.width / 2;
        let bTopNew = false;
        let bLeftNew = false;
        if (rcThis.bottom > rcParent.bottom) {
            rcThis.y = (rcParent.bottom - rcThis.height);
            bTopNew = true;
        }
        if (rcThis.top < rcParent.top) {
            rcThis.y = rcParent.top;
            bTopNew = true;
        }
        if ((rcThis.right - rcParent.right) > nLimitHorz) {
            rcThis.x = rcParent.right - nLimitHorz;
            bLeftNew = true;
        }
        if (rcThis.left < rcParent.left) {
            rcThis.x = rcParent.left;
            bLeftNew = true;
        }
        if (bTopNew) {
            this._hteTarget.style.top = (rcThis.top - rcParent.top) + "px";
        }
        if (bLeftNew) {
            this._hteTarget.style.left = (rcThis.left - rcParent.left) + "px";
        }
        if (rcThis.height > rcParent.height) {
            this._hteTarget.style.maxHeight = (rcParent.height + "px");
        }
        if (bTopNew || bLeftNew) {
            this.acceptCustomPosition();
        }
    }
    open(parent) {
        if (!this.isOpened) {
            this._parent = parent;
            this._parent.appendChild(this._presenter);
            this._bIsOpened = true;
        }
    }
    close() {
        if (this.isOpened) {
            this._parent.removeChild(this._presenter);
            this._parent = null;
            this._bIsOpened = false;
        }
    }
    _raiseLayout() {
        this._hteTarget.dispatchEvent(new Event("layout"));
    }
    _onWidthSetClick(hteBtn) {
        console.log("_onWidthSetClick");
        if (this.isMaxSize) {
            this.discardMaxSize(false);
        }
        this._markButton(hteBtn, this._aWidthSetButtons);
        this._layout.width = hteBtn.value;
        this._doTargetResize(this._layout.width, undefined);
        this._raiseLayout();
    }
    _onHeightSetClick(hteBtn) {
        console.log("_onHeightSetClick");
        this._markButton(hteBtn, this._aHeightSetButtons);
        this._layout.height = hteBtn.value;
        this._doTargetResize(undefined, this._layout.height);
        this._raiseLayout();
    }
    _onPositionSetClick(hteInput) {
        console.log("_onPositionSetClick");
        this._layout.position = hteInput.value;
        this._doRelPos(this._layout.position);
        this._raiseLayout();
    }
    _doTargetResize(width, height) {
        if (width) {
            this._hteTarget.style.width = width;
        }
        if (height) {
            this._hteTarget.style.height = height;
        }
        if (this._layout.position != "custom") {
            this._doRelPos(this._layout.position);
        }
        this.ensureView();
    }
    _doRelPos(strPosInfo) {
        let strLeft = "0";
        let strTop = "0";
        const layout = Helper.parseEnumEnsure(Position, strPosInfo, Position.TopRight);
        switch (layout) {
            case Position.TopLeft: {
                break;
            }
            case Position.TopRight: {
                let nLeft = this._hteTarget.offsetParent.clientWidth - this._hteTarget.offsetWidth;
                strLeft = (nLeft + "px");
                break;
            }
            case Position.Center: {
                let nLeft = (this._hteTarget.offsetParent.clientWidth / 2) - (this._hteTarget.offsetWidth / 2);
                strLeft = (nLeft + "px");
                let nTop = (this._hteTarget.offsetParent.clientHeight / 2) - (this._hteTarget.offsetHeight / 2);
                strTop = (nTop + "px");
                break;
            }
            case Position.BottomLeft: {
                let nTop = this._hteTarget.offsetParent.clientHeight - this._hteTarget.offsetHeight;
                strTop = nTop + "px";
                break;
            }
            case Position.BottomRight: {
                let nLeft = this._hteTarget.offsetParent.clientWidth - this._hteTarget.offsetWidth;
                strLeft = (nLeft + "px");
                let nTop = this._hteTarget.offsetParent.clientHeight - this._hteTarget.offsetHeight;
                strTop = nTop + "px";
                break;
            }
        }
        this._hteTarget.style.left = strLeft;
        this._hteTarget.style.top = strTop;
    }
    _doAbsPosition(left, top) {
        this._hteTarget.style.left = left;
        this._hteTarget.style.top = top;
        this.ensureView();
    }
    _doLayout() {
        const hteWidthSetBtn = this._aWidthSetButtons.find((btn) => btn.value === this._layout.width);
        this._markButton(hteWidthSetBtn, this._aWidthSetButtons);
        this._doTargetResize(this._layout.width, undefined);
        const hteHeightSetBtn = this._aHeightSetButtons.find((btn) => btn.value === this._layout.height);
        this._markButton(hteHeightSetBtn, this._aHeightSetButtons);
        this._doTargetResize(undefined, this._layout.height);
        if (this._layout.position === "custom") {
            const hteInput = this._aPositionSetButtons.find((inp) => inp.checked);
            if (hteInput)
                hteInput.checked = false;
            this._doAbsPosition(this._layout.left, this._layout.top);
        }
        else {
            const hteInput = this._aPositionSetButtons.find((inp) => inp.value === this._layout.position);
            if (hteInput)
                hteInput.checked = true;
            this._doRelPos(this._layout.position);
        }
        this._raiseLayout();
    }
    _markButton(hteBtn, aScope) {
        aScope.forEach((btn) => {
            if (btn.classList.contains("rz-variant-filled")) {
                btn.classList.remove("rz-variant-filled");
                btn.classList.add("rz-variant-outlined");
            }
        });
        if (hteBtn) {
            hteBtn.classList.remove("rz-variant-outlined");
            hteBtn.classList.add("rz-variant-filled");
        }
    }
}
//# sourceMappingURL=layoutctr.js.map
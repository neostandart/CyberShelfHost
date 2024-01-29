import { Layout } from "../../defs.js";
import { Helper } from "../../helper.js";
import { mapLocaleStrings } from "../manager.js";
export class PackLayoutCtr {
    //#region Defs & Vars
    _presenter;
    _parent;
    _bIsOpened;
    static _template;
    _hteTarget;
    _layout;
    _layoutSaved; // before MaxSize
    _bMaxSize = false;
    //#endregion (Defs & Vars)
    // --------------------------------------------------------
    //#region Construction / Initialization
    constructor(hteTarget) {
        const fragPresenter = PackLayoutCtr.createPresenter();
        this._presenter = fragPresenter.firstElementChild;
        //
        this._hteTarget = hteTarget;
        //
        this._layout = this.layoutDefault;
        //
        const listInputs = fragPresenter.querySelectorAll(".input-area input");
        listInputs.forEach((inputItem) => {
            inputItem.addEventListener("change", this._onInputChange.bind(this));
        });
        //
        const btnFill = fragPresenter.getElementById("FillBtn");
        btnFill.addEventListener("click", this._onFillBtn.bind(this));
        //
        const btnClose = fragPresenter.getElementById("CloseBtn");
        btnClose.addEventListener("click", () => {
            this.close();
        });
        //
        this._bIsOpened = false;
        this._parent = null;
    }
    //#endregion (Construction / Initialization)
    // --------------------------------------------------------
    //#region Infrastructure
    static createPresenter() {
        if (!this._template) {
            this._template = document.createElement("template");
            this._template.innerHTML =
                `<div class="packlayout-ctr">

                <div id="Controls">
                    <div id="SizePanel">
                        <div id="WidthGroup" class="sizepanel-clm">
                            <div class="group-caption">${mapLocaleStrings.get("W_width")}</div>
                            <div class="input-area">
                                <div class="sizepanel-field smallest-size">
                                    <input type="radio" id="SizeSelector" name="Width" value="25%">
                                    <label for="SizeSelector">25%</label>
                                </div>
                                <div class="sizepanel-field">
                                    <input type="radio" id="SizeSelector" name="Width" value="50%">
                                    <label for="SizeSelector">50%</label>
                                </div>
                                <div class="sizepanel-field">
                                    <input type="radio" id="SizeSelector" name="Width" value="75%">
                                    <label for="SizeSelector">75%</label>
                                </div>
                                <div class="sizepanel-field">
                                    <input type="radio" id="SizeSelector" name="Width" value="100%">
                                    <label for="SizeSelector">100%</label>
                                </div>
                            </div>
                        </div>

                        <div id="HeightGroup" class="sizepanel-clm">
                            <div class="group-caption">${mapLocaleStrings.get("W_height")}</div>
                            <div class="input-area">
                                <div class="sizepanel-field smallest-size">
                                    <input type="radio" id="SizeSelector" name="Height" value="25%">
                                    <label for="SizeSelector">25%</label>
                                </div>
                                <div class="sizepanel-field">
                                    <input type="radio" id="SizeSelector" name="Height" value="50%">
                                    <label for="SizeSelector">50%</label>
                                </div>
                                <div class="sizepanel-field">
                                    <input type="radio" id="SizeSelector" name="Height" value="75%">
                                    <label for="SizeSelector">75%</label>
                                </div>
                                <div class="sizepanel-field">
                                    <input type="radio" id="SizeSelector" name="Height" value="100%">
                                    <label for="SizeSelector">100%</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="PosPanel">
                        <div class="group-caption">${mapLocaleStrings.get("W_position")}</div>
                        <div class="input-area">
                            <div class="input-box">
                                <input type="radio" name="WndPos" value="TopLeft">
                            </div>
                            <div></div>
                            <div class="input-box">
                                <input type="radio" name="WndPos" value="TopRight">
                            </div>
                            <div></div>
                            <div class="input-box">
                                <input type="radio" name="WndPos" value="Center">
                            </div>
                            <div></div>
                            <div class="input-box">
                                <input type="radio" name="WndPos" value="BottomLeft">
                            </div>
                            <div></div>
                            <div class="input-box">
                                <input type="radio" name="WndPos" value="BottomRight">
                            </div>
                        </div>
                        <button id="FillBtn" type="button" class="btn btn-primary"><i class="fsym">fit_screen</i></button>
                    </div>
                </div>

                <button id="CloseBtn" type="button" class="btn btn-outline-secondary"><i class="fsym">north_west</i></button>
            </div>`;
        }
        //
        return this._template.content.cloneNode(true);
    }
    //#endregion (Infrastructure)
    // --------------------------------------------------------
    //#region Properties
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
    get layoutDefault() {
        return { width: "75%", height: "75%", position: "TopRight", left: undefined, top: undefined };
    }
    //#endregion (Properties)
    //#region Methods
    initLayout(layout) {
        this._layout = layout;
    }
    applyDefaultLayout() {
        this._layout = this.layoutDefault;
        this.applyLayout();
    }
    applyMaxSize() {
        if (!this.isMaxSize) {
            this._bMaxSize = true;
            //
            this._layoutSaved = this._layout;
            this._layout = { width: "100%", height: "100%", position: "TopLeft", left: undefined, top: undefined };
            this.applyLayout();
            //
            this.close();
        }
    }
    discardMaxSize(bApply = true) {
        if (this.isMaxSize) {
            this._bMaxSize = false;
            if (bApply) {
                this._layout = this._layoutSaved;
                this.applyLayout();
            }
        }
    }
    acceptCustomPosition() {
        const listInputs = this._presenter.querySelectorAll("#PosPanel input");
        listInputs.forEach((inputItem) => { inputItem.checked = false; });
        //
        this._layout.position = "custom";
        this._layout.left = this._hteTarget.style.left;
        this._layout.top = this._hteTarget.style.top;
    }
    ensureView() {
        const rcParent = this._hteTarget.offsetParent.getBoundingClientRect();
        const rcThis = this._hteTarget.getBoundingClientRect();
        const nLimitVert = rcThis.height / 2;
        const nLimitHorz = rcThis.width / 2;
        let bTopNew = false;
        let bLeftNew = false;
        // 
        if ((rcThis.bottom - rcParent.bottom) > nLimitVert) {
            rcThis.y = (rcParent.bottom - nLimitVert);
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
        //
        if (bTopNew) {
            this._hteTarget.style.top = (rcThis.top - rcParent.top) + "px";
        }
        if (bLeftNew) {
            this._hteTarget.style.left = (rcThis.left - rcParent.left) + "px";
        }
        //
        if (bTopNew || bLeftNew) {
            this.acceptCustomPosition();
        }
    }
    //
    //
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
    //#endregion (Methods)
    //#region Events
    //#endregion (Events)
    // --------------------------------------------------------
    //#region Handlers
    _onInputChange(ev) {
        const input = ev.currentTarget;
        switch (input.name) {
            case "Width": {
                if (this.isMaxSize) {
                    this.discardMaxSize(false);
                }
                //
                this._layout.width = input.value;
                this._doTargetResize(input.value, undefined);
                break;
            }
            case "Height": {
                if (this.isMaxSize) {
                    this.discardMaxSize(false);
                }
                //
                this._layout.height = input.value;
                this._doTargetResize(undefined, input.value);
                break;
            }
            case "WndPos": {
                this._layout.position = input.value;
                this._doRelPos(input.value);
                break;
            }
        }
        //
        this._raiseLayout();
    }
    _onFillBtn(ev) {
        this.applyMaxSize();
    }
    //#endregion Handlers
    //#region Internals
    _raiseLayout() {
        this._hteTarget.dispatchEvent(new Event("layout"));
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
        //
        const layout = Helper.parseEnumEnsure(Layout, strPosInfo, Layout.TopRight);
        switch (layout) {
            case Layout.TopLeft: {
                break;
            }
            case Layout.TopRight: {
                let nLeft = this._hteTarget.offsetParent.clientWidth - this._hteTarget.offsetWidth;
                strLeft = (nLeft + "px");
                break;
            }
            case Layout.Center: {
                let nLeft = (this._hteTarget.offsetParent.clientWidth / 2) - (this._hteTarget.offsetWidth / 2);
                strLeft = (nLeft + "px");
                let nTop = (this._hteTarget.offsetParent.clientHeight / 2) - (this._hteTarget.offsetHeight / 2);
                strTop = (nTop + "px");
                break;
            }
            case Layout.BottomLeft: {
                let nTop = this._hteTarget.offsetParent.clientHeight - this._hteTarget.offsetHeight;
                strTop = nTop + "px";
                break;
            }
            case Layout.BottomRight: {
                let nLeft = this._hteTarget.offsetParent.clientWidth - this._hteTarget.offsetWidth;
                strLeft = (nLeft + "px");
                let nTop = this._hteTarget.offsetParent.clientHeight - this._hteTarget.offsetHeight;
                strTop = nTop + "px";
                break;
            }
        } // switch
        //
        this._hteTarget.style.left = strLeft;
        this._hteTarget.style.top = strTop;
    }
    _doAbsPos(left, top) {
        this._hteTarget.style.left = left;
        this._hteTarget.style.top = top;
        //
        this.ensureView();
    }
    applyLayout() {
        //
        // Window width
        //
        let input = this._presenter.querySelector(`#WidthGroup input[value="${this._layout.width}"]`);
        if (input) {
            input.checked = true;
        }
        //
        this._doTargetResize(this._layout.width, undefined);
        //
        // Window height
        //
        input = this._presenter.querySelector(`#HeightGroup input[value="${this._layout.width}"]`);
        if (input) {
            input.checked = true;
        }
        //
        this._doTargetResize(undefined, this._layout.height);
        //
        // Window position
        //
        if (this._layout.position === "custom") {
            this._doAbsPos(this._layout.left, this._layout.top);
        }
        else {
            input = this._presenter.querySelector(`#PosPanel input[value="${this._layout.position}"]`);
            if (input) {
                input.checked = true;
            }
            //
            this._doRelPos(this._layout.position);
        }
        //
        this._raiseLayout();
    }
} // class PackLayoutCtr

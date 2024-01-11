import { Dimension, Layout } from "../../defs.js";
import { Helper } from "../../helper.js";
export class PackLayoutCtr {
    //#region Defs & Vars
    _presenter;
    _parent;
    _bIsOpened;
    static _template;
    _hteTarget;
    _stateWnd;
    //#endregion (Defs & Vars)
    // --------------------------------------------------------
    //#region Construction / Initialization
    constructor(hteTarget) {
        const fragPresenter = PackLayoutCtr.createPresenter();
        this._presenter = fragPresenter.firstElementChild;
        //
        this._hteTarget = hteTarget;
        //
        this._stateWnd = { width: undefined, height: undefined, position: undefined };
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
                            <div class="group-caption">ширина</div>
                            <div class="input-area">
                                <div class="sizepanel-field">
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
                            <div class="group-caption">высота</div>
                            <div class="input-area">
                                <div class="sizepanel-field">
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
                        <div class="group-caption">позиция</div>
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
    get IsOpened() {
        return this._bIsOpened;
    }
    get StateWnd() {
        return this._stateWnd;
    }
    //#endregion (Properties)
    //#region Methods
    applyWndState(state = null, bForce = false) {
        if (state) {
            this._stateWnd = state;
        }
        //
        if (this._stateWnd.width) {
            const input = this._presenter.querySelector(`#WidthGroup input[value="${this._stateWnd.width}"]`);
            if (input) {
                input.checked = true;
            }
            //
            if (bForce) {
                this._doTargetResize(Dimension.Width, this._stateWnd.width);
            }
        }
        if (this._stateWnd.height) {
            const input = this._presenter.querySelector(`#HeightGroup input[value="${this._stateWnd.width}"]`);
            if (input) {
                input.checked = true;
            }
            //
            if (bForce) {
                this._doTargetResize(Dimension.Height, this._stateWnd.height);
            }
        }
        if (this._stateWnd.position) {
            if (this._stateWnd.position.indexOf(",") === -1) {
                const input = this._presenter.querySelector(`#PosPanel input[value="${this._stateWnd.position}"]`);
                if (input) {
                    input.checked = true;
                }
            }
            //
            if (bForce) {
                this._doTargetPositioning(this._stateWnd.position);
            }
        }
    }
    open(parent) {
        if (!this.IsOpened) {
            // It is executed before "_parent.appendChild", so "change" events for 
            // input elements will not be raise.
            this.applyWndState();
            //
            this._parent = parent;
            this._parent.appendChild(this._presenter);
            this._bIsOpened = true;
        }
    }
    close() {
        if (this.IsOpened) {
            this._parent.removeChild(this._presenter);
            this._parent = null;
            this._bIsOpened = false;
        }
    }
    //
    resetSizeState() {
        this._stateWnd.width = undefined;
        this._stateWnd.height = undefined;
        //
        const listInputs = this._presenter.querySelectorAll("#SizePanel input");
        listInputs.forEach((inputItem) => { inputItem.checked = false; });
    }
    resetPositionState() {
        this._stateWnd.position = undefined;
        //
        const listInputs = this._presenter.querySelectorAll("#PosPanel input");
        listInputs.forEach((inputItem) => { inputItem.checked = false; });
    }
    //#endregion (Methods)
    //#region Events
    //#endregion (Events)
    // --------------------------------------------------------
    //#region Handlers
    _onInputChange(ev) {
        const input = ev.currentTarget;
        switch (input.name) {
            case "Width":
            case "Height": {
                const vDimension = Helper.parseEnumEnsure(Dimension, input.name, Dimension.Full);
                this._doTargetResize(vDimension, input.value);
                break;
            }
            case "WndPos": {
                //const vLayout: Layout = <Layout>Helper.parseEnumEnsure(Layout, input.value, Layout.TopRight);
                this._doTargetPositioning(input.value);
                break;
            }
        }
    }
    _onFillBtn(ev) {
        this.applyWndState({ width: "100%", height: "100%", position: "TopLeft" }, true);
        this.close();
    }
    //#endregion Handlers
    //#region Internals
    _doTargetResize(vDimension, strValue) {
        switch (vDimension) {
            case Dimension.Width: {
                this._hteTarget.style.width = strValue;
                //
                if (this._stateWnd.position && this._stateWnd.position.indexOf(",") === -1) {
                    this._doTargetPositioning(this._stateWnd.position);
                }
                //
                break;
            }
            case Dimension.Height: {
                this._hteTarget.style.height = strValue;
                //
                if (this._stateWnd.position && this._stateWnd.position.indexOf(",") === -1) {
                    this._doTargetPositioning(this._stateWnd.position);
                }
                //
                break;
            }
        } // switch (vDimension)
    }
    _doTargetPositioning(strPosInfo) {
        let strLeft = "0";
        let strTop = "0";
        //
        let aPosParts = strPosInfo.split(",");
        if (aPosParts.length === 2) {
            strLeft = aPosParts[0] + "px";
            strTop = aPosParts[1] + "px";
        }
        else {
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
        }
        //
        //
        this._stateWnd.position = strPosInfo;
        //
        this._hteTarget.style.left = strLeft;
        this._hteTarget.style.top = strTop;
    }
} // class PackLayoutCtr

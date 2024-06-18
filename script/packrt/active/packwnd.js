import { H5PEnv } from "../h5penv.js";
import { PackagePool } from "./activepack.js";
import { PackLayoutCtr } from "./layoutctr.js";
var DragStatus;
(function (DragStatus) {
    DragStatus[DragStatus["No"] = 0] = "No";
    DragStatus[DragStatus["Mouse"] = 1] = "Mouse";
    DragStatus[DragStatus["Touch"] = 2] = "Touch";
})(DragStatus || (DragStatus = {}));
export class PackageWnd {
    //#region Defs & Vars
    _packkey;
    _presenter;
    _header;
    _capturezone;
    _clientarea;
    _frame;
    _ctrLayout;
    _isMinimized;
    _hteMaxSizeIcon;
    static _template;
    _ptLastDragPos = new DOMPoint();
    _dragStatus = DragStatus.No;
    //#endregion (Defs & Vars)
    // --------------------------------------------------------
    //#region Construction / Initialization
    constructor(packkey) {
        this._packkey = packkey;
        //
        const fragPresenter = PackageWnd.createPresenter();
        this._header = fragPresenter.getElementById("Header");
        //this._capturezone = this._header.querySelector("#DragCaptureZone") as HTMLElement;
        this._capturezone = this._header;
        this._clientarea = fragPresenter.getElementById("ClientArea");
        this._frame = fragPresenter.getElementById("Frame");
        this._presenter = fragPresenter.firstElementChild;
        //
        this._ctrLayout = new PackLayoutCtr(this._presenter);
        //
        this._isMinimized = false;
        //
        this._capturezone.addEventListener("mousedown", this._onCaptureZoneMouseDown);
        this._capturezone.addEventListener("touchstart", this._onCaptureZoneTouchStart);
        //
        const btnLayout = this._header.querySelector("#LayoutBtn");
        btnLayout.addEventListener("click", this._onLayoutClick.bind(this));
        //
        const btnMinimize = this._header.querySelector("#MinimizeBtn");
        btnMinimize.addEventListener("click", (ev) => { this.minimize(); });
        //
        const btnMaxSize = this._header.querySelector("#MaxSizeBtn");
        btnMaxSize.addEventListener("click", (ev) => { this.toggleMaxSize(); });
        this._hteMaxSizeIcon = this._header.querySelector("#MaxSizeBtn i");
        //
        const btnClose = this._header.querySelector("#CloseBtn");
        btnClose.addEventListener("click", this._onCloseClick.bind(this));
        //
        this._presenter.addEventListener("layout", this._onAfterLayout.bind(this));
    }
    //#endregion (Construction / Initialization)
    // --------------------------------------------------------
    //#region Properties
    get presenter() {
        return this._presenter;
    }
    get frame() {
        return this._frame;
    }
    get isMinimized() {
        return this._isMinimized;
    }
    //#endregion (Properties)
    //#region Methods
    async show(html, host) {
        const strSavedLayout = await H5PEnv.UserSettings.invokeMethodAsync('GetPackWndState', this._packkey);
        //
        host.appendChild(this._presenter);
        //
        if (strSavedLayout) {
            const objSavedLayout = JSON.parse(strSavedLayout);
            this._ctrLayout.applyLayout(objSavedLayout);
        }
        else {
            this._ctrLayout.applyDefaultLayout();
        }
        //
        PackageWnd.__raiseTop(this);
        //
        this._presenter.classList.add("visible");
        //
        const iFrameDoc = this._frame.contentWindow && this._frame.contentWindow.document;
        if (!iFrameDoc) {
            throw new Error("The correct iframe element for the H5P content player could not be created.");
        }
        //
        iFrameDoc.write(html);
        iFrameDoc.close();
    }
    minimize() {
        if (!this.isMinimized) {
            this._presenter.classList.add("minimized");
            this._isMinimized = true;
            //
            this._presenter.dispatchEvent(new Event("minimized"));
        }
    }
    restore() {
        if (this.isMinimized) {
            PackageWnd.__raiseTop(this);
            this._presenter.classList.remove("minimized");
            this._isMinimized = false;
            //
            this._ctrLayout.ensureView();
            //
            this._presenter.dispatchEvent(new Event("restored"));
        }
    }
    raiseTop() {
        PackageWnd.__raiseTop(this);
    }
    toggleMaxSize() {
        if (this._ctrLayout.isMaxSize) {
            this._ctrLayout.discardMaxSize();
            this._hteMaxSizeIcon.innerHTML = "fullscreen";
        }
        else {
            this._ctrLayout.applyMaxSize();
            this._hteMaxSizeIcon.innerHTML = "close_fullscreen";
        }
    }
    enablePointerEvents() {
        this._presenter.style.pointerEvents = "auto";
    }
    disablePointerEvents() {
        this._presenter.style.pointerEvents = "none";
    }
    //
    saveLayout() {
        H5PEnv.UserSettings.invokeMethodAsync('SavePackWndState', JSON.stringify(this._ctrLayout.Layout), this._packkey);
    }
    //#endregion (Methods)
    //#region Events
    //#endregion (Events)
    // --------------------------------------------------------
    //#region Drag handlers
    _onCaptureZoneMouseDown = (ev) => {
        PackageWnd.__raiseTop(this);
        //
        if (ev.target && ev.target.closest("button")) {
            return;
        }
        //
        if (this._dragStatus === DragStatus.No) {
            ev.preventDefault();
            //
            this._dragStatus = DragStatus.Mouse;
            //
            document.addEventListener("mousemove", this._onMouseMove);
            document.addEventListener("mouseup", this._onMouseUp);
            // preventing the loss of messages from the iframe
            PackagePool.disablePointerEventsAll();
            //
            this._startDrag(ev.clientX, ev.clientY);
        }
    };
    _onCaptureZoneTouchStart = (ev) => {
        PackageWnd.__raiseTop(this);
        //
        if (this._dragStatus === DragStatus.No) {
            //
            this._dragStatus = DragStatus.Touch;
            //
            document.addEventListener("touchmove", this._onTouchMove);
            document.addEventListener("touchend", this._onTouchEnd);
            //
            this._startDrag(ev.touches[0].clientX, ev.touches[0].clientY);
        }
    };
    //
    _onMouseMove = (ev) => {
        if (this._dragStatus === DragStatus.Mouse) {
            ev.preventDefault();
            this._drag(ev.clientX, ev.clientY);
        }
    };
    _onMouseUp = (ev) => {
        if (this._dragStatus === DragStatus.Mouse) {
            ev.preventDefault();
            //
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
            //
            this._endDrag();
        }
    };
    //#endregion (Drag handlers)
    //#region Common Handlers
    _onLayoutClick(ev) {
        PackageWnd.__raiseTop(this);
        //
        if (this._ctrLayout.isOpened) {
            this._ctrLayout.close();
        }
        else {
            this._ctrLayout.open(this._clientarea);
        }
    }
    _onCloseClick(ev) {
        this._presenter.dispatchEvent(new Event("invokeclose"));
    }
    _onAfterLayout(ev) {
        if (this._ctrLayout.isMaxSize) {
            this._hteMaxSizeIcon.innerHTML = "close_fullscreen";
        }
        else {
            this._hteMaxSizeIcon.innerHTML = "fullscreen";
        }
    }
    //#endregion (Common Handlers)
    //#region Internals
    //
    // Drag operations
    //
    _startDrag(x, y) {
        this._ptLastDragPos.x = x;
        this._ptLastDragPos.y = y;
    }
    _drag(x, y) {
        let nNewX = this._ptLastDragPos.x - x;
        let nNewY = this._ptLastDragPos.y - y;
        //
        this._ptLastDragPos.x = x;
        this._ptLastDragPos.y = y;
        //
        this.presenter.style.top = (this.presenter.offsetTop - nNewY) + "px";
        this.presenter.style.left = (this.presenter.offsetLeft - nNewX) + "px";
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
            //
            // restoring event handling in this window
            PackagePool.enablePointerEventsAll();
            //
            this._ctrLayout.ensureView();
            this._ctrLayout.acceptCustomPosition();
            //
            this._dragStatus = DragStatus.No;
        }
    }
    //#endregion (Internals)
    //#region Statics
    static createPresenter() {
        if (!this._template) {
            this._template = document.createElement("template");
            this._template.innerHTML =
                `<article class="package-wnd">
                <div id="Header">

                    <button id="LayoutBtn" type="button" class="btn btn-outline-light btn-sm">
                        <i class="fsym">view_compact_alt</i>
                    </button>

                    <button id="MinimizeBtn" type="button" class="btn btn-outline-light btn-sm">
                        <i class="fsym">minimize</i>
                    </button>

                    <button id="MaxSizeBtn" type="button" class="btn btn-outline-light btn-sm">
                        <i class="fsym">fullscreen</i>
                    </button>

                    <button id="CloseBtn" type="button" class="btn btn-outline-light btn-sm">
                         <i class="fsym">close</i>
                    </button>
                </div>
                <div id="ClientArea">
                    <iframe id="Frame" src="about:blank"></iframe>
                </div>
            </article>`;
        }
        //
        return this._template.content.cloneNode(true);
    }
    //
    static __wndTop = null;
    static __raiseTop(wnd) {
        if (this.__wndTop !== wnd) {
            PackagePool.raiseToTop(wnd._packkey);
            this.__wndTop = wnd;
        }
    }
} // class PackWnd

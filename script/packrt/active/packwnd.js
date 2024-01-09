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
    _presenter;
    _header;
    _capturezone;
    _clientarea;
    _frame;
    _ctrLayout;
    _isMinimized;
    static _template;
    _ptLastDragPos = new DOMPoint();
    _dragStatus = DragStatus.No;
    //#endregion (Defs & Vars)
    // --------------------------------------------------------
    //#region Construction / Initialization
    constructor() {
        const fragPresenter = PackageWnd.createPresenter();
        this._header = fragPresenter.getElementById("Header");
        this._capturezone = this._header.querySelector("#DragCaptureZone");
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
        btnLayout.addEventListener("click", this._onLayout.bind(this));
        //
        const btnMinimize = this._header.querySelector("#MinimizeBtn");
        btnMinimize.addEventListener("click", (ev) => { this.doMinimize(); });
        //
        const btnClose = this._header.querySelector("#CloseBtn");
        btnClose.addEventListener("click", this._onClose.bind(this));
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
    show(html, host) {
        host.appendChild(this._presenter);
        /* Внимание!
        (по идее) здесь (после "host.appendChild") нужно проверять наличие сохранённого состояния
        окна (PackageWnd) для текущего пользователя, и если оно есть, — вызывать
        this._ctrLayout.applyWndState(сохранённое состояние — класс PackWndState);
        */
        // Пока размещаем открываемое окно в правом верхнем углу родительской области
        this._ctrLayout.applyWndState({ width: "80%", height: "80%", position: "TopRight" }, true);
        PackageWnd.__topMe(this); // открываемое окно должно быть поверх других
        //
        const iFrameDoc = this._frame.contentWindow && this._frame.contentWindow.document;
        if (!iFrameDoc) {
            throw new Error("The correct iframe element for the H5P content player could not be created.");
        }
        //
        iFrameDoc.write(html);
        iFrameDoc.close();
    }
    doMinimize() {
        if (!this.isMinimized) {
            this._presenter.classList.add("minimized");
            this._isMinimized = true;
        }
    }
    restoreView() {
        if (this.isMinimized) {
            PackageWnd.__topMe(this);
            this._presenter.classList.remove("minimized");
            this._isMinimized = false;
        }
    }
    //#endregion (Methods)
    //#region Events
    //#endregion (Events)
    // --------------------------------------------------------
    //#region Drag handlers
    _onCaptureZoneMouseDown = (ev) => {
        PackageWnd.__topMe(this);
        //
        if (this._dragStatus === DragStatus.No) {
            ev.preventDefault();
            //
            this._dragStatus = DragStatus.Mouse;
            //
            document.addEventListener("mousemove", this._onMouseMove);
            document.addEventListener("mouseup", this._onMouseUp);
            // preventing the loss of messages from the iframe
            this._presenter.style.pointerEvents = "none";
            //
            this._startDrag(ev.clientX, ev.clientY);
        }
    };
    _onCaptureZoneTouchStart = (ev) => {
        PackageWnd.__topMe(this);
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
    _onLayout(ev) {
        PackageWnd.__topMe(this);
        //
        if (this._ctrLayout.IsOpened) {
            this._ctrLayout.close();
        }
        else {
            this._ctrLayout.open(this._clientarea);
        }
    }
    _onClose(ev) {
        this._presenter.dispatchEvent(new Event("invokeclose"));
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
            this._presenter.style.pointerEvents = "auto";
            //
            this._dragStatus = DragStatus.No;
            //
            this._ctrLayout.resetPositionState();
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
                    <button id="LayoutBtn">Размер/позиция</button>
                    <div id="DragCaptureZone"></div>

                    <button id="MinimizeBtn">—</button>
                    <button id="CloseBtn"></button>
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
    static __topMe(wnd) {
        if (this.__wndTop !== wnd) {
            this.__wndTop = wnd;
            this.__wndTop._presenter.style.zIndex = PackagePool.getZIndexTop().toString();
        }
    }
} // class PackWnd

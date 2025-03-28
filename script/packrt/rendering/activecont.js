export class ActiveContent {
    _refBookWnd;
    _packId;
    iframe;
    constructor(refBookWnd, packId, iframe) {
        this._refBookWnd = refBookWnd;
        this._packId = packId;
        this.iframe = iframe;
        setTimeout(async () => {
            await this._refBookWnd.invokeMethodAsync("notifyRenderComplete");
        }, 10);
    }
}
//# sourceMappingURL=activecont.js.map
export class FullScreenToggler {
    static _doc;
    static _hteFullScreen = null;
    static _serviceOwner;
    static initialize(serviceOwner, doc) {
        this._serviceOwner = serviceOwner;
        this._doc = doc || document;
        this._doc.addEventListener("fullscreenchange", this._onFullScreenChange.bind(this), false);
        this._doc.addEventListener("fullscreenerror", this._onFullScreenError.bind(this), false);
        this._doc.addEventListener("mozfullscreenchange", this._onFullScreenChange.bind(this), false);
        this._doc.addEventListener("mozfullscreenerror", this._onFullScreenError.bind(this), false);
        this._doc.addEventListener("webkitfullscreenchange", this._onFullScreenChange.bind(this), false);
        this._doc.addEventListener("webkitfullscreenerror", this._onFullScreenError.bind(this), false);
    }
    static isFullScreenEnabled() {
        const doc = this._doc;
        return (doc.fullscreenEnabled || doc.mozFullScreenEnabled || doc.webkitFullscreenEnabled);
    }
    static isFullScreen() {
        return !!this.FullScreenElement;
    }
    static get FullScreenElement() {
        return this._hteFullScreen;
    }
    static doFullScreen(hteFullScreen) {
        if (!hteFullScreen)
            hteFullScreen = this._doc.documentElement;
        if (this._hteFullScreen === hteFullScreen)
            return;
        let hteOld = this._hteFullScreen;
        this._hteFullScreen = hteFullScreen;
        if (hteOld) {
            hteOld.removeEventListener("fullscreenchange", this._onFullScreenChange);
            hteOld.removeEventListener("fullscreenerror", this._onFullScreenError);
        }
        if (this._hteFullScreen) {
            this._hteFullScreen.addEventListener("fullscreenchange", this._onFullScreenChange);
            this._hteFullScreen.addEventListener("fullscreenerror", this._onFullScreenError);
        }
        let fse = this._hteFullScreen;
        let rqs;
        if (fse.requestFullscreen) {
            rqs = fse.requestFullscreen;
        }
        else if (fse.mozRequestFullScreen) {
            rqs = fse.mozRequestFullScreen;
        }
        else if (fse.webkitRequestFullscreen) {
            rqs = fse.webkitRequestFullscreen;
        }
        if (rqs) {
            rqs.call(fse);
        }
    }
    static cancelFullScreen() {
        const doc = this._doc;
        if (doc.cancelFullScreen) {
            doc.cancelFullScreen();
        }
        else if (doc.mozCancelFullScreen) {
            doc.mozCancelFullScreen();
        }
        else if (doc.webkitCancelFullScreen) {
            doc.webkitCancelFullScreen();
        }
        this._hteFullScreen = null;
    }
    static toggle() {
        if (this.isFullScreen()) {
            this.cancelFullScreen();
        }
        else {
            this.doFullScreen();
        }
    }
    static _onFullScreenChange = (ev) => {
        ev.stopPropagation();
        if (this._serviceOwner) {
            this._serviceOwner.invokeMethod('InformStateChanged', this.isFullScreen());
        }
    };
    static _onFullScreenError = (ev) => {
        ev.stopPropagation();
        if (this._serviceOwner) {
            this._serviceOwner.invokeMethod('InformError');
        }
    };
}
//# sourceMappingURL=fullscreen.js.map
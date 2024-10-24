export class BlobDelegate {
    _blob;
    _ourl;
    _usecount;
    constructor(source, mime = undefined) {
        this._blob = (mime) ? new Blob([source], { type: mime }) : new Blob([source]); // Uint8Array | string
        this._usecount = 0;
    }
    getUrl() {
        if (!this._ourl) {
            this._ourl = URL.createObjectURL(this._blob);
            this._usecount = 0;
        }
        //
        this._usecount++;
        return this._ourl;
    }
    releaseUrl() {
        if (this._ourl) {
            this._usecount--;
            if (this._usecount <= 0) {
                URL.revokeObjectURL(this._ourl);
                this._ourl = undefined;
            }
        }
    }
    releaseUrlFore() {
        if (this._ourl) {
            this._usecount = 0;
            URL.revokeObjectURL(this._ourl);
            this._ourl = undefined;
        }
    }
} // lass BlobDelegate
//# sourceMappingURL=file.js.map
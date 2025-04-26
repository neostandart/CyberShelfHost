import { Helper } from "../../_shared/helper.js";
import * as appdb from "../../_shared/appdb.js";
import { PreprocType } from "../abstraction.js";
import { BlobDelegate } from "./file.js";
import * as h5penv from "./h5penv.js";
import { Preprocessor } from "./preproc.js";
export class ActiveLibrary {
    _lib;
    _libfiles;
    _libname;
    _mapDelegates;
    constructor(lib, libfiles) {
        this._lib = lib;
        this._libfiles = libfiles;
        this._libname = `${this._lib.machineName} ${this._lib.majorVersion}.${this._lib.minorVersion}`;
        this._mapDelegates = new Map();
    }
    async initializeAsync() {
    }
    dispose() {
        for (let [key, value] of this._mapDelegates) {
            value.releaseUrlFore();
        }
        this._mapDelegates.clear();
    }
    get token() {
        return this._lib.token;
    }
    get libname() {
        return this._libname;
    }
    getObjectURL(localpath) {
        let delegate = this._mapDelegates.get(localpath);
        if (!delegate) {
            const lfile = this._libfiles.files.find((value) => {
                return value.path === localpath;
            });
            if (!lfile) {
                throw new Error(`ActiveLibrary.getObjectURL: The "${localpath}" file was not found in the "${this.token}" library!`);
            }
            if (lfile.preproc === PreprocType.CssUrl) {
                const strProcessed = Preprocessor.processCssUrl(lfile.text, this, (rawpath) => {
                    const aParts = rawpath.split('?');
                    return aParts[0];
                });
                delegate = new BlobDelegate(strProcessed, Helper.MIMEMap.get(lfile.extension));
            }
            else {
                delegate = new BlobDelegate(lfile.data, Helper.MIMEMap.get(lfile.extension));
            }
            this._mapDelegates.set(localpath, delegate);
        }
        return delegate.getUrl();
    }
    getObjectURLFlex(pathpart) {
        const lfile = this._libfiles.files.find((value) => {
            return value.path.indexOf(pathpart) >= 0;
        });
        return (lfile) ? this.getObjectURL(lfile.path) : "";
    }
    getPreloadedCss() {
        return this.getPreloadedUrl(this.metadata.preloadedCss);
    }
    getPreloadedJs() {
        return this.getPreloadedUrl(this.metadata.preloadedJs);
    }
    getDependencies() {
        return (this.metadata.preloadedDependencies || []).map((item) => ({ machineName: item.machineName, majorVersion: item.majorVersion, minorVersion: item.minorVersion, token: h5penv.makeLibraryToken(item) }));
    }
    get metadata() {
        return this._lib.metadata;
    }
    getPreloadedUrl(aPreloadedInfo) {
        return (aPreloadedInfo) ? aPreloadedInfo.filter((item) => item.render !== false).map((item) => this.getObjectURL(item.path)) : [];
    }
}
export class LibraryPool {
    static _mapLibs = new Map();
    static hasLibrary(libtoken) {
        return this._mapLibs.has(libtoken);
    }
    static async getLibrary(libtoken) {
        let libnest = this._mapLibs.get(libtoken);
        if (!libnest) {
            const storedlib = await appdb.get("libs", libtoken);
            if (!storedlib) {
                throw new Error(`LibraryPool.getLibrary: The "${libtoken}" library was not found!`);
            }
            const libfiles = await appdb.get("libfiles", libtoken);
            const activelib = new ActiveLibrary(storedlib, libfiles);
            libnest = { lib: new ActiveLibrary(storedlib, libfiles), usecount: 0 };
            await libnest.lib.initializeAsync();
            this._mapLibs.set(libtoken, libnest);
        }
        libnest.usecount++;
        return libnest.lib;
    }
    static releaseLibrary(libtoken) {
        let libnest = this._mapLibs.get(libtoken);
        if (libnest) {
            libnest.usecount--;
            if (libnest.usecount <= 0) {
                libnest.lib.dispose();
                this._mapLibs.delete(libtoken);
            }
        }
    }
}
//# sourceMappingURL=activelib.js.map
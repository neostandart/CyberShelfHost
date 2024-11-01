import { Helper } from "../../helper.js";
import * as appdb from "../../appdb.js";
import { BlobDelegate } from "./file.js";
import * as h5penv from "../h5penv.js";
import { Preprocessor } from "./preproc.js";
export class ActiveLibrary {
    //#region Defs & Vars
    _lib;
    _libfiles;
    _libname;
    _mapDelegates;
    //#endregion (Defs & Vars)
    // --------------------------------------------------------
    //#region Construction / Initialization
    constructor(lib, libfiles) {
        this._lib = lib;
        this._libfiles = libfiles;
        //
        this._libname = `${this._lib.machineName} ${this._lib.majorVersion}.${this._lib.minorVersion}`;
        //
        this._mapDelegates = new Map();
    }
    async initializeAsync() {
    }
    dispose() {
        for (let [key, value] of this._mapDelegates) {
            value.releaseUrlFore();
        }
        //
        this._mapDelegates.clear();
    }
    //#endregion (Construction / Initialization)
    // --------------------------------------------------------
    //#region Properties
    get token() {
        return this._lib.token;
    }
    get libname() {
        return this._libname;
    }
    //#endregion (Properties)
    //#region Methods
    getObjectURL(localpath) {
        let delegate = this._mapDelegates.get(localpath);
        if (!delegate) {
            const lfile = this._libfiles.files.find((value) => {
                return value.path === localpath;
            });
            if (!lfile) {
                // throw new Error(`ActiveLibrary.getObjectURL: Файл "${localpath}" не найден в составе библиотеки "${this._lib.token}"!`);
                // в принципе ничего страшного случиться не должно.
                return "";
            }
            if (lfile.needpreproc) {
                const strProcessed = Preprocessor.processUrl(lfile.text, this, (rawpath) => {
                    const aParts = rawpath.split('?');
                    return aParts[0];
                });
                //
                delegate = new BlobDelegate(strProcessed, Helper.MIMEMap.get(lfile.extension));
            }
            else {
                delegate = new BlobDelegate(lfile.data, Helper.MIMEMap.get(lfile.extension));
            }
            //
            this._mapDelegates.set(localpath, delegate);
        }
        //
        return delegate.getUrl();
    }
    getObjectURLFlex(pathpart) {
        const lfile = this._libfiles.files.find((value) => {
            return value.path.indexOf(pathpart) >= 0;
        });
        //
        return (lfile) ? this.getObjectURL(lfile.path) : "";
    }
    getPreloadedCss() {
        return this.getPreloaded(this.metadata.preloadedCss);
    }
    getPreloadedJs() {
        return this.getPreloaded(this.metadata.preloadedJs);
    }
    getDependencyTokens() {
        const aRes = [];
        //
        const aDependenciesInfo = this.metadata.preloadedDependencies;
        if (aDependenciesInfo) {
            for (const item of aDependenciesInfo) {
                aRes.push(h5penv.makeLibraryToken(item));
            }
        }
        //
        return aRes;
    }
    //#endregion (Methods)
    //#region Events
    //#endregion (Events)
    // --------------------------------------------------------
    //#region Internals
    get metadata() {
        return this._lib.metadata;
    }
    getPreloaded(aPreloadedInfo) {
        const aPreloaded = [];
        //
        if (aPreloadedInfo) {
            for (const item of aPreloadedInfo) {
                if (item.path) {
                    let ourl = this.getObjectURL(item.path);
                    aPreloaded.push(ourl);
                }
            }
        }
        //
        return aPreloaded;
    }
} // class ActiveLibrary
export class LibraryPool {
    //#region Defs & Vars
    static _mapLibs = new Map();
    //#endregion (Defs & Vars)
    // --------------------------------------------------------
    //#region Properties
    //#endregion (Properties)
    //#region Methods
    static hasLibrary(libtoken) {
        return this._mapLibs.has(libtoken);
    }
    static async getLibrary(libtoken) {
        let libnest = this._mapLibs.get(libtoken);
        if (!libnest) {
            const storedlib = await appdb.get("libs", libtoken);
            if (!storedlib) {
                throw new Error(`LibraryPool.getLibrary: The library "${libtoken} was not found!"`);
            }
            //
            const libfiles = await appdb.get("libfiles", libtoken);
            const activelib = new ActiveLibrary(storedlib, libfiles);
            libnest = { lib: new ActiveLibrary(storedlib, libfiles), usecount: 0 };
            await libnest.lib.initializeAsync();
            this._mapLibs.set(libtoken, libnest);
        }
        //
        libnest.usecount++;
        //
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
} // class LibraryPool
//# sourceMappingURL=activelib.js.map
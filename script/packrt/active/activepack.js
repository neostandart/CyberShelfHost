import { Helper } from "../../helper.js";
import { AppDB } from "../../appdb.js";
import { PackageCase } from "../packobj/packcase.js";
import { BlobDelegate } from "./file.js";
import { LibraryPool } from "./activelib.js";
import * as H5PEnv from "../h5penv.js";
import { PackageWnd } from "./packwnd.js";
export class ActivePackage {
    _packid;
    _recPack;
    _recContent;
    _libMain;
    _libRuntime;
    _aDependencyLibTokens;
    _mapActiveLibs;
    _mapDelegates;
    _html = "";
    _wnd = undefined;
    _host;
    // --------------------------------------------------------
    /** данная функция гарантирует, что счётчик обращений к библиотеке
     * в рамках одного пакета всегда будет равен 1 (что необходимо
     * для правильного выполнения dispose при закрытии виджета)
     */
    async accessLibrary(libtoken) {
        if (this._mapActiveLibs.has(libtoken))
            return this._mapActiveLibs.get(libtoken);
        //
        const libActive = await LibraryPool.getLibrary(libtoken);
        this._mapActiveLibs.set(libtoken, libActive);
        //
        return libActive;
    }
    async processLibDependencies(libtoken, aDependencyTokens) {
        const libActive = await this.accessLibrary(libtoken);
        const aDependencyTokensCurrent = libActive.getDependencyTokens();
        for (let i = 0; i < aDependencyTokensCurrent.length; i++) {
            const libtokenCurrent = aDependencyTokensCurrent[i];
            if (aDependencyTokens.indexOf(libtokenCurrent) < 0) {
                // the library is not included yet
                await this.processLibDependencies(libtokenCurrent, aDependencyTokens);
            }
        }
        if (aDependencyTokens.indexOf(libtoken) >= 0) {
            throw new Error(`processLibDependencies: Похоже зацикливание! Токен=${libtoken}`);
        }
        aDependencyTokens.push(libtoken);
    }
    // --------------------------------------------------------
    /**
     * Обработка событий от интерактивных H5P элементов
     */
    _onH5PxAPI(ev) {
        if (ev.data && ev.data.statement && ev.data.statement.result) {
            const theResult = ev.data.statement.result;
            if (theResult.completion == true) {
                //console.log("Поле 'completion' равно 'true'.");
            }
            else {
                //console.log("Поле 'completion' не равно 'true'.");
            }
            if (theResult.success == true) {
                //console.log("Поле 'success' равно 'true'.");
            }
            else {
                //console.log("Поле 'success' не равно 'true'.");
            }
            // alert("Задание выполнено!");
        } // if (ev.data.statement.result)
    }
    // --------------------------------------------------------
    //public get key(): string {
    //    return (this._recPack) ? this._recPack.id : "";
    //}
    get Id() {
        return this._packid;
    }
    get name() {
        return (this._recPack) ? this._recPack.name : "";
    }
    get wnd() {
        return this._wnd;
    }
    get html() {
        return this._html;
    }
    //
    getObjectURL(localpath) {
        let delegate = this._mapDelegates.get(localpath);
        if (!delegate) {
            const lfile = this._recContent.files.find((value) => {
                return value.path === localpath;
            });
            if (!lfile) {
                throw new Error(`ActivePackage.getObjectURL: Файл "${localpath}" не найден в составе пакета "${this._recPack.name}"!`);
            }
            delegate = new BlobDelegate(lfile.data, Helper.MIMEMap.get(lfile.extension));
            this._mapDelegates.set(localpath, delegate);
        }
        //
        return delegate.getUrl();
    }
    getObjectURLFlex(pathpart) {
        const lfile = this._recContent.files.find((value) => {
            return value.path.indexOf(pathpart) >= 0;
        });
        //
        return (lfile) ? this.getObjectURL(lfile.path) : "";
    }
    getActiveLibrary(libtoken) {
        return this._mapActiveLibs.get(libtoken);
    }
    getRuntimeLibrary() {
        return this._libRuntime;
    }
    // --------------------------------------------------------
    constructor(packid, host) {
        this._packid = packid;
        this._host = host;
        //
        this._aDependencyLibTokens = [];
        this._mapActiveLibs = new Map();
        //
        this._mapDelegates = new Map();
    }
    async showAsync() {
        this._recPack = await AppDB.get("packages", this._packid);
        if (!this._recPack) {
            throw new Error(`The package with the specified recordKey (${this._packid}) not found!`);
        }
        //
        this._recContent = await AppDB.get("content", this._recPack.id);
        //
        const aPreloaded = this._recPack.metadata.preloadedDependencies;
        //
        const objLibMaiInfo = aPreloaded?.find((preloadedinfo) => { return (preloadedinfo.machineName == this._recPack.metadata.mainLibrary); });
        if (!objLibMaiInfo) {
            throw new Error(`ActivePackage.initializeAsync (${this._recPack.name}): The Main Library (${this._recPack.metadata.mainLibrary}) was not found in the dependencies!`);
        }
        const tokenLibMain = H5PEnv.makeLibraryToken(objLibMaiInfo);
        this._libMain = await this.accessLibrary(tokenLibMain);
        //
        if (aPreloaded) {
            for (let i = 0; i < aPreloaded.length; i++) {
                let libtoken = H5PEnv.makeLibraryToken(aPreloaded[i]);
                if (this._aDependencyLibTokens.indexOf(libtoken) < 0) {
                    await this.processLibDependencies(libtoken, this._aDependencyLibTokens);
                }
            }
        }
        //
        // Checking the Addons
        const addons = H5PEnv.getAddonsForContent(this._recContent.data);
        for (const addoninfo of addons) {
            await this.processLibDependencies(addoninfo.token, this._aDependencyLibTokens);
        }
        //
        this._html = await this.buildAsync();
        //
        this._wnd = new PackageWnd(this._packid);
        PackagePool.regPackage(this._recPack.id, this);
        //
        await this._wnd.show(this._html, this._host);
        //
        this._wnd.frame.contentWindow.ActivePackage = this;
        //
        //
        this._wnd.presenter.addEventListener("invokeclose", () => {
            H5PEnv.DotNet.invokeMethodAsync("CyberShelf", "invokeClosePackage", this.Id);
        });
        this._wnd.presenter.addEventListener("minimized", () => {
            const packcase = new PackageCase(this._recPack);
            H5PEnv.DotNet.invokeMethodAsync("CyberShelf", "informMinimized", packcase);
        });
        this._wnd.presenter.addEventListener("restored", () => {
            const packcase = new PackageCase(this._recPack);
            H5PEnv.DotNet.invokeMethodAsync("CyberShelf", "informRestored", packcase);
        });
        //
        /*
            Grigory. 2023-12-28
            Subscribing to events from the H5P element.
        */
        this._wnd.frame.addEventListener("load", (ev) => {
            const framewnd = this._wnd.frame.contentWindow;
            if (framewnd && framewnd.H5P && framewnd.H5P.externalDispatcher) {
                framewnd.H5P.externalDispatcher.on("xAPI", this._onH5PxAPI.bind(this));
            }
            else {
                console.error("ActivePackage.showAsync: Error initializing the H5P work environment!");
            }
        });
        //
        //PackagePool.regPackage(this._recPack!.key, this);
        //
        const packcase = new PackageCase(this._recPack);
        H5PEnv.DotNet.invokeMethodAsync("CyberShelf", "informOpened", packcase);
    }
    async buildAsync() {
        // The list of dependent libraries has been prepared.
        // now we arrange the files (libraries) in sequence as they are used (url(s) и ourl(s))
        let aCSSRefs = [];
        let aJSRefs = [];
        for (const libtoken of this._aDependencyLibTokens) {
            const libActive = await this.accessLibrary(libtoken);
            const aPreloadedCss = libActive.getPreloadedCss();
            const aPreloadedJs = libActive.getPreloadedJs();
            aCSSRefs.push(...aPreloadedCss);
            aJSRefs.push(...aPreloadedJs);
        }
        aCSSRefs = H5PEnv.getCoreCssPaths().concat(aCSSRefs);
        aJSRefs = H5PEnv.getCoreJsPaths().concat(aJSRefs);
        console.log("Все включаемые файлы подготовлены!");
        const objIntegration = await H5PEnv.prepareIntegration(this._recPack.id, this._recContent.data, "", this._recPack.metadata, this._libMain.libname, aCSSRefs, aJSRefs, false, H5PEnv.getLanguage());
        const model = {
            viewportScale: (H5PEnv.isViewportXSmall() ? "0.9" : "1.0"),
            contentId: this._recPack.id,
            styles: aCSSRefs,
            scripts: aJSRefs,
            integration: objIntegration
        };
        let htmlPage = H5PEnv.buildHTMLPage(model);
        //
        this._libRuntime = Array.from(this._mapActiveLibs.values()).find((item) => {
            return item.libname.startsWith("VMB.Runtime");
        });
        //
        return htmlPage;
    }
    dispose() {
        this._wnd.saveLayout();
        //
        this._host.removeChild(this._wnd.presenter);
        PackagePool.releasePackage(this.Id);
        //
        this._mapActiveLibs.forEach((lib) => {
            LibraryPool.releaseLibrary(lib.token);
        });
        this._mapActiveLibs.clear();
        //
        this._mapDelegates.forEach((delegate) => {
            delegate.releaseUrlFore();
        });
        this._mapDelegates.clear();
        //
        //
        const packcase = new PackageCase(this._recPack);
        H5PEnv.DotNet.invokeMethodAsync("CyberShelf", "informClosed", packcase);
    }
} // class ActivePackage
// ====================================================================
export class PackagePool {
    static _mapPacks = new Map();
    // --------------------------------------------------------
    static regPackage(packid, pack) {
        if (this._mapPacks.has(packid)) {
            throw new Error(`The package with the "${packid}" token has already been registered!`);
        }
        //
        this._mapPacks.set(packid, pack);
    }
    static releasePackage(packid) {
        const pack = this._mapPacks.get(packid);
        if (pack) {
            this._mapPacks.delete(packid);
        }
    }
    static closeAllPackages() {
        return new Promise((resolve, reject) => {
            const aKeys = [];
            const aPackages = this.getAllActivePackages();
            //
            for (const pack of aPackages) {
                aKeys.push(pack.Id);
                pack.dispose();
            }
            //
            resolve(aKeys);
        });
    }
    static getPackage(packid) {
        return this._mapPacks.get(packid);
    }
    static getAllActivePackages() {
        const aRes = [...this._mapPacks.values()];
        return aRes;
    }
    static hasPackage(packid) {
        return this._mapPacks.has(packid);
    }
    static raiseToTop(packid) {
        let packidOld = null;
        for (let [key, value] of this._mapPacks) {
            value.wnd.presenter.style.zIndex = (key === packid) ? "1" : "auto";
        }
    }
    static enablePointerEventsAll() {
        for (let [key, value] of this._mapPacks) {
            value.wnd.enablePointerEvents();
        }
    }
    static disablePointerEventsAll() {
        for (let [key, value] of this._mapPacks) {
            value.wnd.disablePointerEvents();
        }
    }
} // class PackagePool
//# sourceMappingURL=activepack.js.map
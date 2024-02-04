import { Helper } from "../../helper.js";
import { AppDB } from "../../appdb.js";
import { BlobDelegate } from "./file.js";
import { LibraryPool } from "./activelib.js";
import { H5PEnv } from "../h5penv.js";
import { PackageWnd } from "./packwnd.js";
export class ActivePackage {
    //#region Defs & Vars
    _packkey;
    _recPack;
    _recContent;
    _libmain;
    _aDependencyLibTokens;
    _mapActiveLibs;
    _mapDelegates;
    _html = "";
    _wnd = undefined;
    _host;
    //#endregion (Defs & Vars)
    // --------------------------------------------------------
    //#region Construction / Initialization
    constructor(packkey, host) {
        this._packkey = packkey;
        this._host = host;
        //
        this._aDependencyLibTokens = [];
        this._mapActiveLibs = new Map(); // new code
        //
        this._mapDelegates = new Map();
    }
    async showAsync() {
        this._recPack = await AppDB.get("packages", this._packkey);
        if (!this._recPack) {
            throw new Error(`The package with the specified recordKey (${this._packkey}) not found!`);
        }
        //
        this._recContent = await AppDB.get("content", this._recPack.key);
        //
        const aPreloaded = this._recPack.metadata.preloadedDependencies;
        //
        const objLibMaiInfo = aPreloaded?.find((preloadedinfo) => { return (preloadedinfo.machineName == this._recPack.metadata.mainLibrary); });
        if (!objLibMaiInfo) {
            throw new Error(`ActivePackage.initializeAsync (${this._recPack.name}): The Main Library (${this._recPack.metadata.mainLibrary}) was not found in the dependencies!`);
        }
        const tokenLibMain = H5PEnv.makeLibraryToken(objLibMaiInfo);
        this._libmain = await this.accessLibrary(tokenLibMain);
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
        this._wnd = new PackageWnd();
        this._wnd.show(this._html, this._host);
        //
        this._wnd.frame.contentWindow.ActivePackage = this;
        //
        //
        this._wnd.presenter.addEventListener("invokeclose", () => {
            // пока так, но это временно.
            // Решение о закрытии окна контента должно приниматься на уровне общего UI (т.е. Blazor)
            const response = confirm("Are you sure you want to close this content?");
            if (response) {
                this.dispose();
            }
        });
        this._wnd.presenter.addEventListener("minimized", () => {
            const packtoken = AppDB.makeTokenFromRecord(this._recPack);
            window.DotNet.invokeMethodAsync("CyberShelf", "informMinimized", packtoken);
        });
        this._wnd.presenter.addEventListener("restored", () => {
            const packtoken = AppDB.makeTokenFromRecord(this._recPack);
            window.DotNet.invokeMethodAsync("CyberShelf", "informRestored", packtoken);
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
        PackagePool.regPackage(this._recPack.key, this);
        //
        const packtoken = AppDB.makeTokenFromRecord(this._recPack);
        window.DotNet.invokeMethodAsync("CyberShelf", "informOpened", packtoken);
    }
    async buildAsync() {
        // список зависимых библиотек подготовлен.
        // теперь выстраиваем файлы (библиотек) в последовательность 
        // по мере использования (url(s) и ourl(s))
        let aCSSRefs = [];
        let aJSRefs = [];
        for (const libtoken of this._aDependencyLibTokens) {
            const libActive = await this.accessLibrary(libtoken);
            const aPreloadedCss = libActive.getPreloadedCss();
            const aPreloadedJs = libActive.getPreloadedJs();
            aCSSRefs.push(...aPreloadedCss);
            aJSRefs.push(...aPreloadedJs);
        }
        aCSSRefs = H5PEnv.CoreCssPaths.concat(aCSSRefs);
        aJSRefs = H5PEnv.CoreJsPaths.concat(aJSRefs);
        console.log("Все включаемые файлы подготовлены!");
        const objIntegration = H5PEnv.prepareIntegration(this._recPack.key, this._recContent.data, "", this._recPack.metadata, this._libmain.libname, aCSSRefs, aJSRefs, false, null, H5PEnv.language);
        const model = {
            viewportScale: (H5PEnv.isViewportXSmall ? "0.9" : "1.0"),
            contentId: this._recPack.key,
            styles: aCSSRefs,
            scripts: aJSRefs,
            integration: objIntegration
        };
        let htmlPage = H5PEnv.buildHTMLPage(model);
        //
        return htmlPage;
    }
    dispose() {
        this._host.removeChild(this._wnd.presenter);
        PackagePool.releasePackage(this.key);
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
        const packtoken = AppDB.makeTokenFromRecord(this._recPack);
        window.DotNet.invokeMethodAsync("CyberShelf", "informClosed", packtoken);
    }
    //#endregion (Construction / Initialization)
    // --------------------------------------------------------
    //#region Properties
    get key() {
        return (this._recPack) ? this._recPack.key : "";
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
    //#endregion (Properties)
    //#region Methods
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
    //#endregion (Methods)
    //#region Events
    //#endregion (Events)
    // --------------------------------------------------------
    //#region Handlers
    _onH5PxAPI(ev) {
        if (ev.data && ev.data.statement && ev.data.statement.result) {
            const theResult = ev.data.statement.result;
            if (theResult.completion == true) {
                console.log("Поле 'completion' равно 'true'.");
            }
            else {
                console.log("Поле 'completion' не равно 'true'.");
            }
            if (theResult.success == true) {
                console.log("Поле 'success' равно 'true'.");
            }
            else {
                console.log("Поле 'success' не равно 'true'.");
            }
            // alert("Задание выполнено!");
        } // if (ev.data.statement.result)
    }
    //#endregion (Handlers)
    //#region Internals
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
                // библиотека ещё не включена
                await this.processLibDependencies(libtokenCurrent, aDependencyTokens);
            }
        }
        if (aDependencyTokens.indexOf(libtoken) >= 0) {
            throw new Error(`processLibDependencies: Похоже зацикливание! Токен=${libtoken}`);
        }
        aDependencyTokens.push(libtoken);
    }
} // class ActivePackage
// ====================================================================
export class PackagePool {
    //#region Defs & Vars
    static _mapPacks = new Map();
    static _nZIndexTop = 0;
    //#endregion (Defs & Vars)
    // --------------------------------------------------------
    //#region Properties
    //#endregion (Properties)
    //#region Methods
    static regPackage(packkey, pack) {
        if (this._mapPacks.has(packkey)) {
            throw new Error(`The package with the "${packkey}" token has already been registered!`);
        }
        //
        this._mapPacks.set(packkey, pack);
    }
    static releasePackage(packkey) {
        const pack = this._mapPacks.get(packkey);
        if (pack) {
            this._mapPacks.delete(packkey);
        }
        //
        if (this._mapPacks.size === 0) {
            this._nZIndexTop = 0;
        }
    }
    static closeAllPackages() {
        return new Promise((resolve, reject) => {
            const aKeys = [];
            const aPackages = this.getAllActivePackages();
            //
            for (const pack of aPackages) {
                aKeys.push(pack.key);
                pack.dispose();
            }
            //
            resolve(aKeys);
        });
    }
    static getPackage(packkey) {
        return this._mapPacks.get(packkey);
    }
    static getAllActivePackages() {
        const aRes = [...this._mapPacks.values()];
        return aRes;
    }
    static hasPackage(packkey) {
        return this._mapPacks.has(packkey);
    }
    static getZIndexTop() {
        this._nZIndexTop++;
        return this._nZIndexTop;
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

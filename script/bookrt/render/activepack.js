import { Helper } from "../appshare/helper.js";
import * as appdb from "../appdb.js";
import * as h5penv from "./h5penv.js";
import { BlobDelegate } from "./file.js";
import { LibraryPool } from "./activelib.js";
import { decrypt, hasCryptoKey } from "../crypto.js";
export class ActivePack {
    _refBookWnd;
    _packId;
    _iframe;
    _recPack;
    _recContent;
    _libMain;
    _libRuntime;
    _aPreloaded;
    _aDependencyLibTokens;
    _mapActiveLibs;
    _mapDelegates;
    isProtected(rec) {
        return !!rec.iv;
    }
    async accessLibrary(libtoken) {
        if (this._mapActiveLibs.has(libtoken))
            return this._mapActiveLibs.get(libtoken);
        const libActive = await LibraryPool.getLibrary(libtoken);
        this._mapActiveLibs.set(libtoken, libActive);
        return libActive;
    }
    async processLibDependencies(preloadLib, aDependencyTokens) {
        function __actualLibToken(preload, aPreloaded) {
            let exact = aPreloaded.find((item) => item.machineName === preload.machineName &&
                item.majorVersion === preload.majorVersion &&
                item.minorVersion === preload.minorVersion);
            return exact?.token || aPreloaded.find((item) => item.machineName === preload.machineName).token;
        }
        const libtoken = __actualLibToken(preloadLib, this._aPreloaded);
        const libActive = await this.accessLibrary(libtoken);
        const aDependencyTokensCurrent = libActive.getDependencies();
        for (let i = 0; i < aDependencyTokensCurrent.length; i++) {
            const current = aDependencyTokensCurrent[i];
            const libtokenCurrent = __actualLibToken(current, this._aPreloaded);
            if (aDependencyTokens.indexOf(libtokenCurrent) < 0) {
                await this.processLibDependencies(current, aDependencyTokens);
            }
        }
        if (aDependencyTokens.indexOf(libtoken) >= 0) {
            throw new Error(`processLibDependencies: It looks like a loop! Token=${libtoken}`);
        }
        aDependencyTokens.push(libtoken);
    }
    async createContent(strTheContent) {
        let aCSSRefs = [];
        let aJSRefs = [];
        for (const libtoken of this._aDependencyLibTokens) {
            const libActive = await this.accessLibrary(libtoken);
            const aPreloadedCss = libActive.getPreloadedCss();
            const aPreloadedJs = libActive.getPreloadedJs();
            aCSSRefs.push(...aPreloadedCss);
            aJSRefs.push(...aPreloadedJs);
        }
        aCSSRefs = h5penv.getCoreCssPaths().concat(aCSSRefs);
        aJSRefs = h5penv.getCoreJsPaths().concat(aJSRefs);
        const objIntegration = await h5penv.prepareIntegration(this._recPack.id, strTheContent, "", this._recPack.metadata, this._libMain.libname, aCSSRefs, aJSRefs, false, h5penv.getLanguage());
        const model = {
            viewportScale: (h5penv.isViewportXSmall() ? "0.9" : "1.0"),
            contentId: this._recPack.id,
            styles: aCSSRefs,
            scripts: aJSRefs,
            integration: objIntegration
        };
        let htmlPage = h5penv.buildHTMLPage(model);
        this._libRuntime = Array.from(this._mapActiveLibs.values()).find((item) => {
            return item.libname.startsWith("VMB.Runtime");
        });
        return htmlPage;
    }
    async build() {
        try {
            this._recPack = await appdb.get("packs", this._packId);
            if (!this._recPack)
                throw new Error(`The package with "${this._packId}" record key was not found!`);
            this._aPreloaded = (this._recPack.metadata.preloadedDependencies || []).map((item) => ({ machineName: item.machineName, majorVersion: item.majorVersion, minorVersion: item.minorVersion, token: h5penv.makeLibraryToken(item) }));
            const objLibMaiInfo = this._aPreloaded.find((preloadedinfo) => { return (preloadedinfo.machineName == this._recPack.metadata.mainLibrary); });
            if (!objLibMaiInfo)
                throw new Error(`ActivePackage.initializeAsync (${this._recPack.name}): The Main Library (${this._recPack.metadata.mainLibrary}) was not found in the dependencies!`);
            this._recContent = await appdb.get("packcont", this._recPack.id);
            const tokenLibMain = h5penv.makeLibraryToken(objLibMaiInfo);
            this._libMain = await this.accessLibrary(tokenLibMain);
            for (let i = 0; i < this._aPreloaded.length; i++) {
                const preload = this._aPreloaded[i];
                if (this._aDependencyLibTokens.indexOf(preload.token) < 0) {
                    await this.processLibDependencies(preload, this._aDependencyLibTokens);
                }
            }
            let strTheContent;
            if (this.isProtected(this._recContent)) {
                if (hasCryptoKey()) {
                    const decrypted = await decrypt(this._recContent.iv, this._recContent.data);
                    strTheContent = (new TextDecoder()).decode(decrypted);
                }
                else {
                    throw new Error("The current user is not allowed to view protected content!");
                }
            }
            else {
                strTheContent = this._recContent.data;
            }
            const addons = h5penv.getAddonsForContent(strTheContent);
            for (const addoninfo of addons) {
                await this.processLibDependencies(addoninfo, this._aDependencyLibTokens);
            }
            this._iframe.contentWindow.VMB = { isBookRT: true };
            const htmlContent = await this.createContent(strTheContent);
            const iframeDoc = this._iframe.contentWindow.document;
            if (iframeDoc) {
                iframeDoc.write(htmlContent);
                iframeDoc.close();
            }
            else {
                throw new Error("The iframe element with the correct structure was not created.");
            }
            this._iframe.contentWindow.ActivePackage = this;
            this._iframe.addEventListener("load", (ev) => {
                const contwnd = this._iframe.contentWindow;
                if (contwnd && contwnd.H5P && contwnd.H5P.externalDispatcher) {
                    contwnd.H5P.externalDispatcher.on("xAPI", this._onH5PxAPI.bind(this));
                }
                else {
                    console.error("ActivePackage.build: Error initializing the H5P work environment!");
                }
            });
            await this._refBookWnd.invokeMethodAsync("notifyRenderComplete");
        }
        catch (err) {
            await this._refBookWnd.invokeMethodAsync("notifyRenderError", Helper.extractMessage(err));
        }
    }
    getObjectURL(localpath) {
        let delegate = this._mapDelegates.get(localpath);
        if (!delegate) {
            const lfile = this._recContent.files.find((value) => {
                return value.path === localpath;
            });
            if (!lfile) {
                throw new Error(`ActivePackage.getObjectURL: The "${localpath}" file was not found in the "${this._recPack.name}" package!`);
            }
            delegate = new BlobDelegate(lfile.data, Helper.MIMEMap.get(lfile.extension));
            this._mapDelegates.set(localpath, delegate);
        }
        return delegate.getUrl();
    }
    getObjectURLFlex(pathpart) {
        const lfile = this._recContent.files.find((value) => {
            return value.path.indexOf(pathpart) >= 0;
        });
        return (lfile) ? this.getObjectURL(lfile.path) : "";
    }
    _onH5PxAPI(ev) {
        if (ev.data && ev.data.statement && ev.data.statement.result) {
            const theResult = ev.data.statement.result;
            if (theResult.completion == true) {
            }
            else {
            }
            if (theResult.success == true) {
            }
            else {
            }
        }
    }
    getActiveLibrary(libtoken) {
        return this._mapActiveLibs.get(libtoken);
    }
    getRuntimeLibrary() {
        return this._libRuntime;
    }
    constructor(refBookWnd, packId, iframe) {
        this._refBookWnd = refBookWnd;
        this._packId = packId;
        this._iframe = iframe;
        this._aDependencyLibTokens = [];
        this._mapActiveLibs = new Map();
        this._mapDelegates = new Map();
        setTimeout(async () => {
            await this.build();
        }, 10);
    }
    dispose() {
        this._iframe.contentWindow.close();
        this._iframe.remove();
        this._mapActiveLibs.forEach((lib) => { LibraryPool.releaseLibrary(lib.token); });
        this._mapActiveLibs.clear();
        this._mapDelegates.forEach((delegate) => { delegate.releaseUrlFore(); });
        this._mapDelegates.clear();
    }
}
//# sourceMappingURL=activepack.js.map
import * as h5penv from "./h5penv.js";
import { LibraryPool } from "./activelib.js";
import * as appdb from "../../appdb.js";
import { Helper } from "../../helper.js";
export class ActiveContent {
    _refBookWnd;
    _packId;
    _iframe;
    _recPack;
    _recContent;
    _libMain;
    _libRuntime;
    _aDependencyLibTokens;
    _mapActiveLibs;
    _mapDelegates;
    async accessLibrary(libtoken) {
        if (this._mapActiveLibs.has(libtoken))
            return this._mapActiveLibs.get(libtoken);
        const libActive = await LibraryPool.getLibrary(libtoken);
        this._mapActiveLibs.set(libtoken, libActive);
        return libActive;
    }
    async processLibDependencies(libtoken, aDependencyTokens) {
        const libActive = await this.accessLibrary(libtoken);
        const aDependencyTokensCurrent = libActive.getDependencyTokens();
        for (let i = 0; i < aDependencyTokensCurrent.length; i++) {
            const libtokenCurrent = aDependencyTokensCurrent[i];
            if (aDependencyTokens.indexOf(libtokenCurrent) < 0) {
                await this.processLibDependencies(libtokenCurrent, aDependencyTokens);
            }
        }
        if (aDependencyTokens.indexOf(libtoken) >= 0) {
            throw new Error(`processLibDependencies: Похоже зацикливание! Токен=${libtoken}`);
        }
        aDependencyTokens.push(libtoken);
    }
    async createContent() {
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
        const objIntegration = await h5penv.prepareIntegration(this._recPack.id, this._recContent.data, "", this._recPack.metadata, this._libMain.libname, aCSSRefs, aJSRefs, false, h5penv.getLanguage());
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
                throw new Error(`The package with the specified recordKey (${this._packId}) not found!`);
            this._recContent = await appdb.get("packcont", this._recPack.id);
            const aPreloaded = this._recPack.metadata.preloadedDependencies;
            const objLibMaiInfo = aPreloaded?.find((preloadedinfo) => { return (preloadedinfo.machineName == this._recPack.metadata.mainLibrary); });
            if (!objLibMaiInfo)
                throw new Error(`ActivePackage.initializeAsync (${this._recPack.name}): The Main Library (${this._recPack.metadata.mainLibrary}) was not found in the dependencies!`);
            const tokenLibMain = h5penv.makeLibraryToken(objLibMaiInfo);
            this._libMain = await this.accessLibrary(tokenLibMain);
            if (aPreloaded) {
                for (let i = 0; i < aPreloaded.length; i++) {
                    let libtoken = h5penv.makeLibraryToken(aPreloaded[i]);
                    if (this._aDependencyLibTokens.indexOf(libtoken) < 0) {
                        await this.processLibDependencies(libtoken, this._aDependencyLibTokens);
                    }
                }
            }
            const addons = h5penv.getAddonsForContent(this._recContent.data);
            for (const addoninfo of addons) {
                await this.processLibDependencies(addoninfo.token, this._aDependencyLibTokens);
            }
            const htmlContent = await this.createContent();
            const iframeDoc = this._iframe.contentWindow?.document;
            if (iframeDoc) {
                iframeDoc.write(htmlContent);
                iframeDoc.close();
            }
            else {
                throw new Error("The correct iframe element for the H5P content could not be created.");
            }
            await this._refBookWnd.invokeMethodAsync("notifyRenderComplete");
        }
        catch (err) {
            await this._refBookWnd.invokeMethodAsync("notifyRenderError", Helper.extractMessage(err));
        }
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
}
//# sourceMappingURL=activecont.js.map
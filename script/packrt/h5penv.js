import { AppDB } from "../appdb.js";
import { SimpleTranslator } from "./localization/translator.js";
import { Localizer } from "./localization/localizer.js";
import * as pipe from "../pipe.js";
import { Helper } from "../helper.js";
//
export class H5PEnv {
    static _aCoreCss;
    static _aCoreJs;
    static _addons;
    static _localizer;
    static _objStringsDefault;
    static _strPlayerTemplate;
    static _strLayoutCtrTemplate;
    static _objUserSettings;
    //
    //
    static async initializeAsync(objUserSettings) {
        this._objUserSettings = objUserSettings;
        this._aCoreCss = [
            "vendor/h5p/core/styles/h5p.css",
            "vendor/h5p/core/styles/h5p-confirmation-dialog.css",
            "vendor/h5p/core/styles/h5p-core-button.css"
        ];
        this._aCoreJs = [
            "vendor/h5p/core/js/jquery.js",
            "vendor/h5p/core/js/h5p.js",
            "vendor/h5p/core/js/h5p-event-dispatcher.js",
            "vendor/h5p/core/js/h5p-x-api-event.js",
            "vendor/h5p/core/js/h5p-x-api.js",
            "vendor/h5p/core/js/h5p-content-type.js",
            "vendor/h5p/core/js/h5p-confirmation-dialog.js",
            "vendor/h5p/core/js/h5p-action-bar.js",
            "vendor/h5p/core/js/request-queue.js"
        ];
        //
        this._addons = await AppDB.get("_system", "addons") || {};
        //
        // We are preparing localization
        //
        const pathStringsDefault = "assets/h5p-strings/default.json";
        this._objStringsDefault = await pipe.fetchJson(pathStringsDefault);
        //
        let pathStringsEnglish = "assets/h5p-strings/en.json";
        let objStringsEnglish = await pipe.fetchJson(pathStringsEnglish);
        //
        this._localizer = new Localizer(new SimpleTranslator({ client: objStringsEnglish }).t);
        //
        // H5P Player template
        //
        this._strPlayerTemplate = await pipe.fetchTextFile("assets/templates/h5pplayer.txt");
        //
        // LayoutCtr (window) template
        //
        this._strLayoutCtrTemplate = await pipe.fetchTextFile("assets/templates/layoutctr.txt");
    }
    /*
        Что касается Addon(ов). Это отдельные библиотеки, которые могут динамически обрабатывать контент без их явного включения в пакет.
        Например, отображать формулы если в тексте присутствует соответствующая разметка. Аддоны (по идее) устанавливаются отдельно, как
        самостоятельные элементы (но возможно могут включаться и в пакеты ИМХО).
        Видимо надо сделать отдельную возможность устанавливать Аддоны в программу. Возможно ставить их в те же таблицы, что и
        обычные библиотеки, но где-то вести их отдельный список.
        В общем, это отдельная задача, которую надо реализовать.
    
        (из документации H5P)
        https://docs.lumi.education/advanced-usage/addons
    
    */
    static get isViewportXSmall() {
        return window.matchMedia("(max-width: 575px)").matches;
    }
    static get language() {
        return "en"; // пока так.
    }
    static get StringsDefault() {
        return this._objStringsDefault;
    }
    static get Localizer() {
        return this._localizer;
    }
    static get LayoutCtrTemplateHtml() {
        return this._strLayoutCtrTemplate;
    }
    static get UserSettings() {
        return this._objUserSettings;
    }
    //
    //
    static async regAddonLibrary(librec) {
        if (this._addons[librec.machineName]) {
            const existing = this._addons[librec.machineName];
            if (this.compareVersion(librec.version, existing.version) != 1)
                return;
        }
        //
        this._addons[librec.machineName] = { token: librec.token, version: librec.version, addTo: librec.metadata.addTo };
        await AppDB.put("_system", this._addons, "addons");
    }
    static getAddonsForContent(data) {
        const aAddons = [];
        //
        for (const key in this._addons) {
            const addoninfo = this._addons[key];
            for (const typeitem of addoninfo.addTo.content.types) {
                // Grigory. Taken from the "H5P-Nodejs-Library" (Lumi Education) (Thanks to the developers!)
                if (typeitem.text) {
                    // The regex pattern in the metadata is specified like this:
                    // /mypattern/ or /mypattern/g
                    // Because of this we must extract the actual pattern and
                    // the flags and pass them to the constructor of RegExp.
                    const matches = /^\/(.+?)\/([gimy]+)?$/.exec(typeitem.text.regex);
                    if (matches.length < 1) {
                        console.error(`The addon ${addoninfo.token} contains an invalid regexp pattern in the addTo selector: ${typeitem.text.regex}. This will be silently ignored, but the addon will never be used!`);
                        continue;
                    }
                    //
                    if (new RegExp(matches[1], matches[2]).test(data)) {
                        aAddons.push(addoninfo);
                    }
                } // if (typeitem.text)
            }
        }
        //
        return aAddons;
    }
    //
    //
    static get CoreCssPaths() {
        return this._aCoreCss;
    }
    static get CoreJsPaths() {
        return this._aCoreJs;
    }
    static getContentTypeImage(machinename) {
        return "assets/images/svg/library.svg";
    }
    //
    //
    static generateContentId() {
        return Math.random().toString(36).substring(2, 11);
    }
    static getVersionFromObject(metadata) {
        return (metadata.patchVersion) ?
            `${metadata.majorVersion}.${metadata.minorVersion}.${metadata.patchVersion}` :
            `${metadata.majorVersion}.${metadata.minorVersion}`;
    }
    static makeLibraryToken(obj) {
        return `${obj.machineName}-${obj.majorVersion}.${obj.minorVersion}`;
    }
    static compareVersion(ver1, ver2) {
        if (ver1 === ver2)
            return 0;
        //
        const aVer1 = ver1.split(".").map((val) => Number(val));
        const aVer2 = ver2.split(".").map((val) => Number(val));
        //
        let nResult = 0;
        //
        let i = 0;
        for (; i < aVer1.length; i++) {
            if (aVer1[i] == aVer2[i])
                continue;
            //
            if (aVer1[i] > aVer2[i]) {
                nResult = 1;
            }
            else {
                nResult = -1;
            }
            //
            break;
        }
        //
        if (i < aVer2.length) {
            for (; i < aVer2.length; i++) {
                if (aVer2[i] === 0)
                    continue;
                nResult = -1;
                break;
            }
        }
        //
        return nResult;
    }
    //
    //
    //#region (for Integration build)
    static getAjaxEndpoint(user) {
        return ""; // IIntegration.ajaxPath — no longer used.
    }
    static getFinishedEndpoint(user) {
        return "";
    }
    static getContentDataEndpoint(user) {
        return "";
    }
    static getUniqueContentUrl(contentId) {
        return contentId; // So far like this, I'll see later...
    }
    static getPathForIntegration() {
        return ""; // Helper.cutEnd(Environment.pathH5P, "/");
    }
    static prepareIntegration(contentId, jsonContent, contentUrl, // ф. H5P.getPath изменена на работу с Blob, поэтому "contentUrl" не используется.
    objMetadata, mainlib, aLibCssRefs, aLibJsRefs, canFullscreen, user, language) {
        return {
            baseUrl: undefined,
            url: this.getPathForIntegration(),
            postUserStatistics: false,
            ajaxPath: user ? this.getAjaxEndpoint(user) : "",
            ajax: {
                setFinished: user ? this.getFinishedEndpoint(user) : "",
                contentUserData: user ? this.getContentDataEndpoint(user) : ""
            },
            saveFreq: false,
            user: (user) ? {
                name: user ? user.displayName : "",
                mail: user ? user.email : "",
                id: user ? user.id : ""
            } : undefined,
            siteUrl: undefined,
            l10n: {
                H5P: this.Localizer.localize(this.StringsDefault, language, true)
            },
            loadedJs: [], // ?
            loadedCss: [], // ?
            core: {
                scripts: [] /*H5PJet.aCoreJs*/,
                styles: [] /*H5PJet.aCoreCss*/
            },
            libraryConfig: {
                "H5P.MathDisplay": {
                    observers: [
                        { name: 'mutationObserver', params: { cooldown: 500 } },
                        { name: 'domChangedListener' }
                    ],
                    renderer: {
                        mathjax: {
                            src: 'vendor/mathjax/tex-svg.js',
                            config: {
                                extensions: ['tex2jax.js'],
                                showMathMenu: false,
                                jax: ['input/TeX', 'output/HTML-CSS'],
                                tex2jax: {
                                    // Important, otherwise MathJax will be rendered inside CKEditor
                                    ignoreClass: "ckeditor"
                                },
                                messageStyle: 'none'
                            }
                        }
                    }
                }
            },
            contents: {
                [`cid-${contentId}`]: {
                    library: mainlib,
                    jsonContent: jsonContent,
                    fullScreen: canFullscreen ? '1' : '0',
                    exportUrl: undefined,
                    url: this.getUniqueContentUrl(contentId),
                    displayOptions: {
                        frame: false,
                        export: false,
                        embed: false,
                        copyright: false,
                        icon: false
                    },
                    styles: [] /*aLibCssRefs*/ /* Grigory. Для одн. элемента это необязательно */,
                    scripts: [] /*aLibJsRefs*/,
                    contentUrl: contentUrl /* используется в H5P.getPath*/,
                    metadata: {
                        license: objMetadata.license || 'U',
                        title: objMetadata.title || '',
                        defaultLanguage: objMetadata.language || 'en'
                    },
                }
            }
        };
    }
    //#endregion (for Integration build)
    static buildHTMLPage(model) {
        let strStyles = model.styles.map((style) => `\t\t<link rel="stylesheet" href="${style}"/>`).join('\n    ');
        let strScripts = model.scripts.map((script) => `\t\t<script src="${script}"></script>`).join('\n    ');
        let strIntegration = JSON.stringify(model.integration, null, 2);
        let strPlayer = Helper.formatString(this._strPlayerTemplate, model.viewportScale, strStyles, strScripts, strIntegration, model.contentId);
        return strPlayer;
    }
} // class H5PJet

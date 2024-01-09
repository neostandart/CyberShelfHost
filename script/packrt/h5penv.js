import { SimpleTranslator } from "./localization/translator.js";
import { Localizer } from "./localization/localizer.js";
import * as pipe from "../pipe.js";
import { Helper } from "../helper.js";
//
export class H5PEnv {
    static _aCoreCss;
    static _aCoreJs;
    static _localizer;
    static _objStringsDefault;
    static _strPlayerTemplate;
    static async initializeAsync() {
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
        // console.log(this._strPlayerTemplate);
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
    //
    //
    static get CoreCssPaths() {
        return this._aCoreCss;
    }
    static get CoreJsPaths() {
        return this._aCoreJs;
    }
    //
    //
    static generateContentId() {
        return Math.random().toString(36).substring(2, 11);
    }
    static makeLibraryToken(obj) {
        return `${obj.machineName}-${obj.majorVersion}.${obj.minorVersion}`;
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
            user: {
                name: user ? user.displayName : "",
                mail: user ? user.email : "",
                id: user ? user.id : ""
            },
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

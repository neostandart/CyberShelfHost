import { Helper } from "../../helper.js";
import * as appdb from "../../appdb.js";
import { SimpleTranslator } from "../localization/translator.js";
import { Localizer } from "../localization/localizer.js";
import * as pipe from "../../pipe.js";
let _aCoreCss;
let _aCoreJs;
let _addons;
let _localizer;
let _objStringsDefault;
let _strPlayerTemplate;
let _strLayoutCtrTemplate;
export const DotNet = window.DotNet;
let _refBookMan;
export function getBookMan() {
    return _refBookMan;
}
export async function getUserId() {
    return await _refBookMan.invokeMethodAsync("getCurrentUserId");
}
export async function getUser() {
    const userid = await getUserId();
    if (userid) {
        const user = await appdb.get("users", userid);
        return user;
    }
    return null;
}
export function getLanguage() {
    return "en";
}
export function getStringsDefault() {
    return _objStringsDefault;
}
export function isViewportXSmall() {
    return window.matchMedia("(max-width: 575px)").matches;
}
export function getLocalizer() {
    return _localizer;
}
export function getLayoutCtrTemplateHtml() {
    return _strLayoutCtrTemplate;
}
export async function regAddonLibrary(librec) {
    const existing = _addons[librec.machineName];
    if (existing) {
        if (Helper.compareVersion(librec.version, existing.version) != 1)
            return;
    }
    _addons[librec.machineName] = { machineName: librec.machineName, majorVersion: librec.majorVersion, minorVersion: librec.minorVersion, token: librec.token, version: librec.version, addTo: librec.metadata.addTo };
    await appdb.put("_system", _addons, "addons");
}
export function getAddonsForContent(data) {
    const aAddons = [];
    for (const key in _addons) {
        const addoninfo = _addons[key];
        for (const typeitem of addoninfo.addTo.content.types) {
            if (typeitem.text) {
                const matches = /^\/(.+?)\/([gimy]+)?$/.exec(typeitem.text.regex);
                if (matches.length < 1) {
                    console.error(`The addon ${addoninfo.token} contains an invalid regexp pattern in the addTo selector: ${typeitem.text.regex}. This will be silently ignored, but the addon will never be used!`);
                    continue;
                }
                if (new RegExp(matches[1], matches[2]).test(data)) {
                    aAddons.push(addoninfo);
                }
            }
        }
    }
    return aAddons;
}
export function getCoreCssPaths() {
    return _aCoreCss;
}
export function getCoreJsPaths() {
    return _aCoreJs;
}
export function getContentTypeImage(machinename) {
    return "assets/images/etc/library.svg";
}
export function generateContentId() {
    return Math.random().toString(36).substring(2, 11);
}
export function getVersionFromObject(metadata) {
    return (metadata.patchVersion) ?
        `${metadata.majorVersion}.${metadata.minorVersion}.${metadata.patchVersion}` :
        `${metadata.majorVersion}.${metadata.minorVersion}`;
}
export function makeLibraryToken(obj) {
    return `${obj.machineName}-${obj.majorVersion}.${obj.minorVersion}`;
}
export function extractLibraryVersion(obj) {
    return `${obj.majorVersion}.${obj.minorVersion}`;
}
export function getAjaxEndpoint(user) {
    return "";
}
export function getFinishedEndpoint(user) {
    return "";
}
export function getContentDataEndpoint(user) {
    return "";
}
export function getUniqueContentUrl(contentId) {
    return contentId;
}
export function getPathForIntegration() {
    return "";
}
export async function prepareIntegration(contentId, jsonContent, contentUrl, objMetadata, mainlib, aLibCssRefs, aLibJsRefs, canFullscreen, language) {
    const user = await getUser();
    return {
        baseUrl: undefined,
        url: getPathForIntegration(),
        postUserStatistics: false,
        ajaxPath: user ? getAjaxEndpoint(user) : "",
        ajax: {
            setFinished: user ? getFinishedEndpoint(user) : "",
            contentUserData: user ? getContentDataEndpoint(user) : ""
        },
        saveFreq: false,
        user: (user) ? {
            name: user ? user.displayName : "",
            mail: user ? user.email : "",
            id: user ? user.id : ""
        } : undefined,
        siteUrl: undefined,
        l10n: {
            H5P: getLocalizer().localize(getStringsDefault(), language, true)
        },
        loadedJs: [],
        loadedCss: [],
        core: {
            scripts: [],
            styles: []
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
                url: getUniqueContentUrl(contentId),
                displayOptions: {
                    frame: false,
                    export: false,
                    embed: false,
                    copyright: false,
                    icon: false
                },
                styles: [],
                scripts: [],
                contentUrl: contentUrl,
                metadata: {
                    license: objMetadata.license || 'U',
                    title: objMetadata.title || '',
                    defaultLanguage: objMetadata.language || 'en'
                },
            }
        }
    };
}
export function buildHTMLPage(model) {
    let strStyles = model.styles.map((style) => `\t\t<link rel="stylesheet" href="${style}"/>`).join('\n    ');
    let strScripts = model.scripts.map((script) => `\t\t<script src="${script}"></script>`).join('\n    ');
    let strIntegration = JSON.stringify(model.integration, null, 2);
    let strPlayer = Helper.formatString(_strPlayerTemplate, model.viewportScale, strStyles, strScripts, strIntegration, model.contentId);
    return strPlayer;
}
export async function initializeAsync(refBookMan) {
    _refBookMan = refBookMan;
    _aCoreCss = [
        "vendor/h5p/styles/font-open-sans.css",
        "vendor/h5p/styles/h5p.css"
    ];
    _aCoreJs = [
        "vendor/h5p/frame.bundle.js"
    ];
    _addons = await appdb.get("_system", "addons") || {};
    const pathStringsDefault = "assets/h5p-strings/default.json";
    _objStringsDefault = await pipe.fetchJson(pathStringsDefault);
    let pathStringsEnglish = "assets/h5p-strings/en.json";
    let objStringsEnglish = await pipe.fetchJson(pathStringsEnglish);
    _localizer = new Localizer(new SimpleTranslator({ client: objStringsEnglish }).t);
    _strPlayerTemplate = await pipe.fetchTextFile("assets/templates/h5pplayer.txt");
    _strLayoutCtrTemplate = await pipe.fetchTextFile("assets/templates/layoutctr.txt");
}
//# sourceMappingURL=h5penv.js.map
import { Helper } from "../helper.js";
import * as appdb from "../appdb.js";
import * as h5penv from "./render/h5penv.js";
let _cryptoKey = undefined;
export var RawContentKind;
(function (RawContentKind) {
    RawContentKind[RawContentKind["Text"] = 0] = "Text";
    RawContentKind[RawContentKind["Image"] = 1] = "Image";
    RawContentKind[RawContentKind["Sound"] = 2] = "Sound";
    RawContentKind[RawContentKind["Video"] = 3] = "Video";
})(RawContentKind || (RawContentKind = {}));
export function HasCryptoKey() {
    return !!_cryptoKey;
}
export async function importCryptoKey(keydata) {
    const rawKey = Helper.convertBase64ToArrayBuffer(keydata);
    const algparams = "AES-CBC";
    _cryptoKey = await window.crypto.subtle.importKey("raw", rawKey, algparams, true, [
        "encrypt",
        "decrypt"
    ]);
}
export async function discardCryptoKey() {
    _cryptoKey = undefined;
}
export async function decrypt(iv, data) {
    if (!_cryptoKey)
        throw new Error("The decryption key is missing!");
    const algorithm = { name: "AES-CBC", iv };
    return await window.crypto.subtle.decrypt(algorithm, _cryptoKey, data);
}
class KnownNames {
    static PackageMain = "h5p.json";
    static ContentFolder = "content";
    static ContentEntry = "content/content.json";
    static ContentFile = "content.json";
    static LibraryFile = "library.json";
    static UpgradesFile = "upgrades.js";
    static PresaveFile = "presave.js";
    static EditorLibPrefix = "H5PEditor";
}
const CorrectRootFiles = new Set([KnownNames.PackageMain]);
var EntryStatus;
(function (EntryStatus) {
    EntryStatus[EntryStatus["Undef"] = 0] = "Undef";
    EntryStatus[EntryStatus["Ignore"] = 1] = "Ignore";
    EntryStatus[EntryStatus["Directory"] = 2] = "Directory";
    EntryStatus[EntryStatus["RootFile"] = 3] = "RootFile";
    EntryStatus[EntryStatus["ContentPart"] = 4] = "ContentPart";
    EntryStatus[EntryStatus["LibraryPart"] = 5] = "LibraryPart";
})(EntryStatus || (EntryStatus = {}));
function provideZipLibrary() {
    return new Promise((resolve, reject) => {
        let scriptElement = document.createElement("script");
        scriptElement.setAttribute("src", "vendor/zip/zip.min.js");
        document.head.appendChild(scriptElement);
        scriptElement.addEventListener("load", () => {
            const zip = window.zip;
            resolve(zip);
        });
        scriptElement.addEventListener("error", (ev) => {
            reject(Helper.extractMessage(ev));
        });
    });
}
let zip = undefined;
export async function parsePackageFile(filePackage, progress) {
    if (!zip) {
        zip = await provideZipLibrary();
    }
    const result = {
        metadata: {
            title: "",
            extraTitle: "",
            mainLibrary: "",
            language: "",
            defaultLanguage: "",
            embedTypes: [],
            license: "",
            licenseExtras: "",
            preloadedDependencies: [],
            changes: [],
            authors: [],
            authorComments: ""
        },
        content: { packid: "", data: "", files: [], iv: undefined },
        newlibs: new Map()
    };
    const readerBlob = new zip.BlobReader(filePackage);
    const readerZip = new zip.ZipReader(readerBlob);
    const aEntries = await readerZip.getEntries();
    progress.setStepMax(aEntries.length + 3);
    const entryContentFile = aEntries.find((entryItem) => {
        return (entryItem.filename && entryItem.filename.startsWith(KnownNames.ContentEntry));
    });
    if (!entryContentFile) {
        throw new Error(`The "content.json" file was not found in the package!`);
    }
    let strTheContent;
    const strSuffixContent = entryContentFile.filename.substring(KnownNames.ContentEntry.length);
    if (strSuffixContent.length > 0) {
        const iv = Helper.convertBase64ToArrayBuffer(strSuffixContent.split(".", 1)[0].replace("_", "//"));
        let aContentBynary = await fetchBinaryFromEntry(entryContentFile);
        try {
            const decrypted = await decrypt(iv, aContentBynary);
            result.content.data = aContentBynary;
            result.content.iv = iv;
            strTheContent = (new TextDecoder()).decode(decrypted);
        }
        catch (err) {
            let message = Helper.extractMessage(err);
            console.error(message);
        }
    }
    else {
        strTheContent = await fetchTextFromEntry(entryContentFile);
        result.content.data = strTheContent;
    }
    progress.doStep();
    const mapVmbContentEntries = new Map();
    prepareVmbContentMap(strTheContent, mapVmbContentEntries);
    progress.doStep();
    const aInstalledLibs = await appdb.getAll("libs");
    for (let i = 0; i < aEntries.length; i++) {
        const entry = aEntries[i];
        const parsed = parseEntry(entry);
        switch (parsed.status) {
            case EntryStatus.RootFile: {
                if (parsed.filename == KnownNames.PackageMain) {
                    result.metadata = await fetchJSONFromEntry(parsed.entry);
                }
                else {
                    console.error(`Unknown entry in the root of the H5P package (entry: "${entry.filename}"), (package file: "${filePackage.name}").`);
                }
                break;
            }
            case EntryStatus.ContentPart: {
                if (mapVmbContentEntries.has(parsed.localpath)) {
                    mapVmbContentEntries.set(parsed.localpath, parsed.entry);
                }
                else {
                    const lfile = await makeLinkedFile(parsed);
                    result.content.files.push(lfile);
                }
                break;
            }
            case EntryStatus.LibraryPart: {
                const libtoken = parsed.rootParent;
                if (aInstalledLibs.findIndex((value) => { return (value.token == libtoken); }) < 0) {
                    let newlib = result.newlibs.get(libtoken);
                    if (!newlib) {
                        newlib = { token: libtoken, files: [] };
                        result.newlibs.set(libtoken, newlib);
                    }
                    const lfile = await makeLinkedFile(parsed);
                    newlib.files.push(lfile);
                    switch (parsed.filename) {
                        case KnownNames.LibraryFile: {
                            const strMetadata = await fetchTextFromEntry(parsed.entry);
                            newlib.metadata = JSON.parse(strMetadata);
                            newlib.machineName = newlib.metadata.machineName;
                            newlib.majorVersion = newlib.metadata.majorVersion;
                            newlib.minorVersion = newlib.metadata.minorVersion;
                            newlib.version = h5penv.getVersionFromObject(newlib.metadata);
                            if (newlib.metadata.coreApi) {
                                newlib.majorVersionCore = newlib.metadata.coreApi.majorVersion;
                                newlib.minorVersionCore = newlib.metadata.coreApi.minorVersion;
                            }
                            newlib.isAddon = (newlib.metadata.addTo) ? true : false;
                            if (newlib.isAddon) {
                                h5penv.regAddonLibrary(newlib);
                            }
                            break;
                        }
                        case KnownNames.UpgradesFile: {
                            newlib.textUpgrades = await fetchTextFromEntry(parsed.entry);
                            break;
                        }
                        case KnownNames.PresaveFile: {
                            newlib.textPresave = await fetchTextFromEntry(parsed.entry);
                            break;
                        }
                    }
                }
                break;
            }
            case EntryStatus.Ignore: {
                break;
            }
            case EntryStatus.Directory: {
                break;
            }
            case EntryStatus.Undef: {
                console.error(`Unrecognized entry status (entry: "${entry.filename}"), (package file: "${filePackage.name}").`);
                break;
            }
        }
        progress.doStep();
    }
    await readerZip.close();
    for (let pair of mapVmbContentEntries.entries()) {
        var writer = new zip.Uint8ArrayWriter();
        const data = await pair[1].getData(writer);
        const blob = new Blob([data]);
        const readerBlob = new zip.BlobReader(blob);
        const readerZip = new zip.ZipReader(readerBlob);
        const aRawEntries = await readerZip.getEntries();
        for (let i = 0; i < aRawEntries.length; i++) {
            const entry = aRawEntries[i];
            if (entry.directory)
                continue;
            const lfile = await makeVmbLinkedFile(Helper.extractFileName(pair[0]), entry);
            result.content.files.push(lfile);
        }
    }
    progress.endSegment();
    return result;
}
export async function parseLibraryFile(fileLibrary) {
    const newlib = {};
    const aFiles = [];
    const readerBlob = new zip.BlobReader(fileLibrary);
    const readerZip = new zip.ZipReader(readerBlob);
    const aEntries = await readerZip.getEntries();
    for (let i = 0; i < aEntries.length; i++) {
        const entry = aEntries[i];
        const resEntryParse = parseEntry(entry);
        switch (resEntryParse.status) {
            case EntryStatus.LibraryPart: {
                const lfile = await makeLinkedFile(resEntryParse);
                aFiles.push(lfile);
                switch (resEntryParse.filename) {
                    case KnownNames.LibraryFile: {
                        if (newlib.token) {
                            throw new Error("Incorrect structure of the H5P library file. More than one nested directory was found!");
                        }
                        newlib.token = resEntryParse.rootParent;
                        const strMetadata = await fetchTextFromEntry(resEntryParse.entry);
                        newlib.metadata = JSON.parse(strMetadata);
                        newlib.machineName = newlib.metadata.machineName;
                        newlib.majorVersion = newlib.metadata.majorVersion;
                        newlib.minorVersion = newlib.metadata.minorVersion;
                        newlib.version = h5penv.getVersionFromObject(newlib.metadata);
                        if (newlib.metadata.coreApi) {
                            newlib.majorVersionCore = newlib.metadata.coreApi.majorVersion;
                            newlib.minorVersionCore = newlib.metadata.coreApi.minorVersion;
                        }
                        newlib.isAddon = (newlib.metadata.addTo) ? true : false;
                        if (newlib.isAddon) {
                            h5penv.regAddonLibrary(newlib);
                        }
                        break;
                    }
                    case KnownNames.UpgradesFile: {
                        newlib.textUpgrades = await fetchTextFromEntry(resEntryParse.entry);
                        break;
                    }
                    case KnownNames.PresaveFile: {
                        newlib.textPresave = await fetchTextFromEntry(resEntryParse.entry);
                        break;
                    }
                }
                break;
            }
        }
    }
    await readerZip.close();
    return { library: newlib, files: { libtoken: newlib.token, files: aFiles } };
}
function prepareVmbContentMap(content, mapVmbContentEntries) {
    function __processEntry(entry) {
        const objEntry = JSON.parse(entry);
        const objVmbraw = objEntry.vmbraw;
        if (objVmbraw.path) {
            mapVmbContentEntries.set(objVmbraw.path, objEntry);
        }
        else {
            console.error("CyberShelf Parser: Incorrect \"wmbraw \" format!");
        }
    }
    let nPosStart = content.indexOf("\"vmbraw\"");
    let nPosNow = nPosStart;
    while (nPosNow > 0) {
        let bIgnore = false;
        let nOpeningCurlys = 0;
        let nClosingCurlys = 0;
        let charCur = "";
        let charPrev = "";
        for (let i = nPosNow; i < content.length; i++) {
            charPrev = charCur;
            charCur = content[i];
            switch (charCur) {
                case "\"": {
                    if (charPrev !== "\\")
                        bIgnore = !bIgnore;
                    break;
                }
                case "{":
                    if (!bIgnore)
                        nOpeningCurlys++;
                    break;
                case "}":
                    if (!bIgnore)
                        nClosingCurlys++;
                    break;
            }
            if (nClosingCurlys > 0 && nOpeningCurlys === nClosingCurlys) {
                nPosNow = i + 1;
                __processEntry("{" + content.substring(nPosStart, nPosNow) + "}");
                break;
            }
        }
        nPosStart = content.indexOf("\"vmbraw\"", nPosNow);
        nPosNow = nPosStart;
    }
}
function parseEntry(entry) {
    const res = { status: EntryStatus.Undef, entry: entry };
    if (entry.directory) {
        res.status = EntryStatus.Directory;
        res.localpath = res.filename;
    }
    else {
        const aPath = entry.filename.split("/");
        if (aPath.length !== 0) {
            if (aPath.length == 1) {
                res.filename = aPath[0];
                res.localpath = res.filename;
                if (CorrectRootFiles.has(res.filename)) {
                    const nameparts = __getFileNameParts(res.filename);
                    res.name = nameparts[0];
                    res.extension = nameparts[1];
                    res.rootParent = "";
                    res.status = EntryStatus.RootFile;
                }
            }
            else {
                res.filename = aPath[aPath.length - 1];
                res.localpath = aPath.slice(1).join("/");
                const nameparts = __getFileNameParts(res.filename);
                if (nameparts[0].length > 0) {
                    res.name = nameparts[0];
                    res.extension = nameparts[1];
                    res.rootParent = aPath[0];
                    if (res.rootParent == KnownNames.ContentFolder) {
                        res.status = (res.filename == KnownNames.ContentFile) ? EntryStatus.Ignore : EntryStatus.ContentPart;
                    }
                    else {
                        res.status = res.rootParent.startsWith(KnownNames.EditorLibPrefix) ? EntryStatus.Ignore : EntryStatus.LibraryPart;
                    }
                }
            }
        }
    }
    return res;
    function __getFileNameParts(filename) {
        const res = ["", ""];
        const nIndex = filename.lastIndexOf(".");
        if (nIndex <= 0 || nIndex === (filename.length - 1))
            return ["", ""];
        return [filename.substring(0, nIndex), filename.substring(nIndex + 1)];
    }
}
async function fetchTextFromEntry(entry) {
    const writer = new zip.TextWriter();
    await entry.getData(writer);
    return await writer.getData();
}
async function fetchBinaryFromEntry(entry) {
    const writer = new zip.Uint8ArrayWriter();
    await entry.getData(writer);
    return await writer.getData();
}
async function fetchJSONFromEntry(entry) {
    const writer = new zip.TextWriter();
    await entry.getData(writer);
    const text = await writer.getData();
    return JSON.parse(text);
}
async function makeLinkedFile(parse) {
    const lfile = { needpreproc: false };
    lfile.name = parse.name;
    lfile.extension = parse.extension;
    lfile.path = parse.localpath;
    switch (parse.status) {
        case EntryStatus.ContentPart: {
            await __writeData();
            break;
        }
        case EntryStatus.LibraryPart: {
            switch (parse.extension) {
                case "css": {
                    var writerText = new zip.TextWriter();
                    await parse.entry.getData(writerText);
                    const strFileContent = await writerText.getData();
                    if (strFileContent.indexOf("url(") >= 0) {
                        lfile.text = strFileContent;
                        lfile.data = null;
                        lfile.needpreproc = true;
                    }
                    else {
                        const enc = new TextEncoder();
                        lfile.data = enc.encode(strFileContent);
                        lfile.text = null;
                    }
                    break;
                }
                default: {
                    await __writeData();
                    break;
                }
            }
            break;
        }
    }
    return lfile;
    async function __writeData() {
        var writer = new zip.Uint8ArrayWriter();
        await parse.entry.getData(writer);
        lfile.data = await writer.getData();
        lfile.text = null;
    }
}
async function makeVmbLinkedFile(basepath, entry) {
    const lfile = { needpreproc: false };
    lfile.path = basepath + "/" + entry.filename;
    lfile.extension = Helper.extractExtension(entry.filename);
    var writer = new zip.Uint8ArrayWriter();
    await entry.getData(writer);
    lfile.data = await writer.getData();
    lfile.text = null;
    return lfile;
}
//# sourceMappingURL=parser.js.map
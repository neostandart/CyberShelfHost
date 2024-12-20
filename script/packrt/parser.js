/*
    Grigory.
    I have not found a way to connect the zip library to the project.js as a module.
    Therefore, I stupidly load it in the code (see below).
    After downloading, the global variable "zip" is created.
*/
import { Helper } from "../helper.js";
import * as appdb from "../appdb.js";
import * as h5penv from "./h5penv.js";
class KnownNames {
    static PackageMain = "h5p.json";
    static ContentFolder = "content";
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
            authors: [],
            authorComments: ""
        },
        content: { packid: "", data: "", files: [] },
        newlibs: new Map() // Только новые библиотеки!!! Надо бы: newlibs или newLibs
    };
    //
    const readerBlob = new zip.BlobReader(filePackage);
    const readerZip = new zip.ZipReader(readerBlob);
    const aEntries = await readerZip.getEntries();
    // добавляем к количеству вхождений в ZIP файл ещё два шага 
    progress.setStepMax(aEntries.length + 3);
    //
    // Первым делом из архива пакета извлекаем файл контента
    //
    const entryContentMain = aEntries.find((entryItem) => {
        // we are looking for the package content file (in JSON format)
        return (entryItem.filename && entryItem.filename === "content/content.json");
    });
    if (!entryContentMain) {
        // This is an obvious glitch!
        throw new Error(`The "content.json" file was not found in the package!`);
    }
    result.content.data = await fetchTextFromEntry(entryContentMain);
    progress.doStep(); // Additional step 1
    //
    // В JSON файле контента (пакета H5P) мы ищем все элементы с ключом "vmbraw" являющиеся ссылками на
    // ZIP файлы содержащие специализированные данные (контент) в формате виртуального учебника (если такие есть).
    // Далее каждый такой файл будет отдельно распакован и конечные файлы из его состава будут добавлены к общему
    // объёму файлов контента по специально сформированному пути (для последующего их нахождения при отображении контента)
    //
    const mapVmbContentEntries = new Map();
    prepareVmbContentMap(result.content.data, mapVmbContentEntries);
    progress.doStep(); // Additional step 2
    //
    // Начинаем главный цикл по вхождениям в ZIP файл пакета
    //
    const aInstalledLibs = await appdb.getAll("libs");
    for (let i = 0; i < aEntries.length; i++) {
        const entry = aEntries[i];
        const parsed = parseEntry(entry);
        //
        switch (parsed.status) {
            case EntryStatus.RootFile: {
                if (parsed.filename == KnownNames.PackageMain) {
                    result.metadata = await fetchJSONFromEntry(parsed.entry);
                }
                else {
                    console.error(`Unknown entry in the root of the H5P package (entry: "${entry.filename}"), (package file: "${filePackage.name}").`);
                }
                //
                break;
            }
            case EntryStatus.ContentPart: {
                // the file "content/content.json" is ignored here
                if (mapVmbContentEntries.has(parsed.localpath)) {
                    mapVmbContentEntries.set(parsed.localpath, parsed.entry);
                }
                else {
                    const lfile = await makeLinkedFile(parsed);
                    result.content.files.push(lfile);
                }
                //
                break;
            }
            case EntryStatus.LibraryPart: {
                // The library folder name is used as the libtoken
                const libtoken = parsed.rootParent;
                // Убеждаемся что библиотека которой принадлежит этот файл ещё не установлена в систему
                if (aInstalledLibs.findIndex((value) => { return (value.token == libtoken); }) < 0) {
                    // Объект для новой (устанавливаемой) библиотеки уже создан?
                    let newlib = result.newlibs.get(libtoken);
                    if (!newlib) {
                        // ... если нет, то создаём
                        newlib = { token: libtoken, files: [] };
                        result.newlibs.set(libtoken, newlib);
                    }
                    const lfile = await makeLinkedFile(parsed);
                    newlib.files.push(lfile);
                    // we save the texts of some service files for convenience
                    switch (parsed.filename) {
                        case KnownNames.LibraryFile: {
                            //
                            const strMetadata = await fetchTextFromEntry(parsed.entry);
                            newlib.metadata = JSON.parse(strMetadata);
                            //
                            newlib.machineName = newlib.metadata.machineName;
                            newlib.majorVersion = newlib.metadata.majorVersion;
                            newlib.minorVersion = newlib.metadata.minorVersion;
                            newlib.version = h5penv.getVersionFromObject(newlib.metadata);
                            if (newlib.metadata.coreApi) {
                                newlib.majorVersionCore = newlib.metadata.coreApi.majorVersion;
                                newlib.minorVersionCore = newlib.metadata.coreApi.minorVersion;
                            }
                            //
                            newlib.isAddon = (newlib.metadata.addTo) ? true : false;
                            if (newlib.isAddon) {
                                h5penv.regAddonLibrary(newlib);
                            }
                            //
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
                    } // switch (resEntryParse.filename)
                }
                //
                break;
            }
            case EntryStatus.Ignore: {
                // just ignore it
                break;
            }
            case EntryStatus.Directory: {
                // just ignore it
                break;
            }
            case EntryStatus.Undef: {
                console.error(`Unrecognized entry status (entry: "${entry.filename}"), (package file: "${filePackage.name}").`);
                break;
            }
        } // switch (parsed.status)
        progress.doStep();
    } // for (let i = 0; i < aEntries.length; i++)
    await readerZip.close();
    //
    // Installing vmb content files
    //
    for (let pair of mapVmbContentEntries.entries()) {
        var writer = new zip.Uint8ArrayWriter();
        const data = await pair[1].getData(writer);
        const blob = new Blob([data]);
        const readerBlob = new zip.BlobReader(blob);
        const readerZip = new zip.ZipReader(readerBlob);
        //
        const aRawEntries = await readerZip.getEntries();
        for (let i = 0; i < aRawEntries.length; i++) {
            const entry = aRawEntries[i];
            if (entry.directory)
                continue;
            //
            const lfile = await makeVmbLinkedFile(Helper.extractFileName(pair[0]), entry);
            result.content.files.push(lfile);
        } // for
        //
    }
    //
    progress.endSegment();
    //
    return result;
}
//
export async function parseLibraryFile(fileLibrary) {
    const newlib = {};
    const aFiles = [];
    const readerBlob = new zip.BlobReader(fileLibrary);
    const readerZip = new zip.ZipReader(readerBlob);
    const aEntries = await readerZip.getEntries();
    for (let i = 0; i < aEntries.length; i++) {
        const entry = aEntries[i];
        //
        const resEntryParse = parseEntry(entry);
        switch (resEntryParse.status) {
            case EntryStatus.LibraryPart: {
                const lfile = await makeLinkedFile(resEntryParse);
                aFiles.push(lfile);
                //
                // we save the texts of some service files for convenience
                switch (resEntryParse.filename) {
                    case KnownNames.LibraryFile: {
                        if (newlib.token) {
                            throw new Error("Incorrect structure of the H5P library file. More than one nested directory was found!");
                        }
                        //
                        newlib.token = resEntryParse.rootParent;
                        const strMetadata = await fetchTextFromEntry(resEntryParse.entry);
                        newlib.metadata = JSON.parse(strMetadata);
                        //
                        newlib.machineName = newlib.metadata.machineName;
                        newlib.majorVersion = newlib.metadata.majorVersion;
                        newlib.minorVersion = newlib.metadata.minorVersion;
                        newlib.version = h5penv.getVersionFromObject(newlib.metadata);
                        if (newlib.metadata.coreApi) {
                            newlib.majorVersionCore = newlib.metadata.coreApi.majorVersion;
                            newlib.minorVersionCore = newlib.metadata.coreApi.minorVersion;
                        }
                        //
                        newlib.isAddon = (newlib.metadata.addTo) ? true : false;
                        if (newlib.isAddon) {
                            h5penv.regAddonLibrary(newlib);
                        }
                        //
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
                } // switch (resEntryParse.filename)
                break;
            }
        } // switch
    } // for (let i = 0; i < aEntries.length; i++)
    await readerZip.close();
    return { library: newlib, files: { libtoken: newlib.token, files: aFiles } };
}
//
// Vmb Content Process
//
function prepareVmbContentMap(content, mapVmbContentEntries) {
    const objContent = (typeof content === "string") ? JSON.parse(content) : content;
    if (Array.isArray(objContent)) {
        for (let i = 0; i < objContent.length; i++) {
            const item = objContent[i];
            prepareVmbContentMap(item, mapVmbContentEntries);
        }
    }
    else if (objContent instanceof Object) {
        const aKeys = Object.keys(objContent);
        for (let i = 0; i < aKeys.length; i++) {
            const key = aKeys[i];
            if (key === "vmbraw") {
                // we believe that all values of the "path" field (created by the H5P editor) 
                // are unique to the current package.
                const strFilePath = objContent[key]["path"];
                mapVmbContentEntries.set(strFilePath, null);
            }
            else {
                const item = objContent[key];
                if (Array.isArray(item) || item instanceof Object) {
                    prepareVmbContentMap(item, mapVmbContentEntries);
                }
            }
        }
    }
}
//
// Utilities
//
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
        } // if (aPath.length !== 0)
    }
    return res;
    // inline
    function __getFileNameParts(filename) {
        const res = ["", ""];
        const nIndex = filename.lastIndexOf(".");
        if (nIndex <= 0 || nIndex === (filename.length - 1))
            return ["", ""];
        //
        return [filename.substring(0, nIndex), filename.substring(nIndex + 1)];
    }
}
async function fetchTextFromEntry(entry) {
    const writer = new zip.TextWriter();
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
    } // switch (parse.status)
    return lfile;
    // inline
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
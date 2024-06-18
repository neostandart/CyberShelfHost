/*
    Grigory.
    Я не нашёл способа подключить к проекту библиотеку zip.js как модуль
    с поддержкой типизации. Подключаю её в файле "index.html" обычным образом.
    После загрузки "\wwwroot\vendor\zip\zip-fs-full.js", создаётся глобальная
    переменная "zip".
*/
import { AppDB } from "../../appdb.js";
import { H5PEnv } from "../h5penv.js";
import { Helper } from "../../helper.js";
const zip = window.zip;
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
    EntryStatus[EntryStatus["RootFile"] = 1] = "RootFile";
    EntryStatus[EntryStatus["ContentPart"] = 2] = "ContentPart";
    EntryStatus[EntryStatus["LibraryPart"] = 3] = "LibraryPart";
    EntryStatus[EntryStatus["UsedByEditor"] = 4] = "UsedByEditor";
})(EntryStatus || (EntryStatus = {}));
export async function parsePackageFile(filePackage, progress) {
    const result = {
        libs: new Map(),
        package: {
            origfrom: "local",
            filename: filePackage.name,
            filesize: filePackage.size,
            modified: filePackage.lastModified,
            installed: Number(new Date()),
            updated: -1,
            dependencies: [],
            isBroken: false,
            brokeninfo: ""
        },
        content: { files: [] }
    };
    //
    const aInstalledLibs = (await AppDB.getAll("libs"));
    const setAllDependLibs = new Set();
    //
    // new code Vmb Content
    const mapVmbContentEntries = new Map();
    //
    const readerBlob = new zip.BlobReader(filePackage);
    const readerZip = new zip.ZipReader(readerBlob);
    //
    const aEntries = await readerZip.getEntries();
    const entryContentMain = aEntries.find((entryItem) => {
        return (entryItem.filename && entryItem.filename === "content/content.json");
    });
    if (!entryContentMain) {
        // This is an obvious glitch!
        throw new Error(`The "content.json" file was not found in the package!`);
    }
    result.content.data = await fetchTextFromEntry(entryContentMain);
    prepareVmbContentMap(JSON.parse(result.content.data), mapVmbContentEntries);
    // ...
    progress.setStepMax(aEntries.length);
    // A main loop over all entries in the ZIP package
    for (let i = 0; i < aEntries.length; i++) {
        const entry = aEntries[i];
        if (entry.directory)
            continue;
        const resEntryParse = parseEntry(entry);
        if (resEntryParse.status != EntryStatus.Undef) {
            switch (resEntryParse.status) {
                case EntryStatus.RootFile: {
                    if (resEntryParse.filename == KnownNames.PackageMain) {
                        result.package.guid = "";
                        result.package.version = "";
                        //
                        const strMetadata = await fetchTextFromEntry(resEntryParse.entry);
                        result.package.metadata = JSON.parse(strMetadata);
                        //
                        if (result.package.metadata.mainLibrary === "VMBook") {
                            // this is a Virtual Managed Book.
                            // it is necessary to extract the GUID of the book and the version.
                        }
                        else {
                            // this is a standard H5P package.
                        }
                        //
                        result.package.name = result.package.metadata.title;
                        result.package.shortname = result.package.metadata.title;
                    }
                    else {
                        console.error(`Unknown entry in the root of the H5P package (entry: "${entry.filename}"), (package file: "${filePackage.name}").`);
                    }
                    break;
                }
                case EntryStatus.ContentPart: {
                    if (resEntryParse.filename !== KnownNames.ContentFile) {
                        // other file from "content" folder.
                        if (mapVmbContentEntries.has(resEntryParse.localpath)) {
                            mapVmbContentEntries.set(resEntryParse.localpath, resEntryParse.entry);
                            continue;
                        }
                        //
                        const lfile = await makeLinkedFile(resEntryParse);
                        result.content.files.push(lfile);
                    }
                    break;
                }
                case EntryStatus.LibraryPart: {
                    // The library folder name is used as the libtoken
                    const newlib = __fetchNewLibrary(resEntryParse.rootParent);
                    if (newlib) {
                        const lfile = await makeLinkedFile(resEntryParse);
                        newlib.files.push(lfile);
                        //
                        // we save the texts of some service files for convenience
                        switch (resEntryParse.filename) {
                            case KnownNames.LibraryFile: {
                                //
                                const strMetadata = await fetchTextFromEntry(resEntryParse.entry);
                                newlib.metadata = JSON.parse(strMetadata);
                                //
                                newlib.machineName = newlib.metadata.machineName;
                                newlib.majorVersion = newlib.metadata.majorVersion;
                                newlib.minorVersion = newlib.metadata.minorVersion;
                                newlib.version = H5PEnv.getVersionFromObject(newlib.metadata);
                                if (newlib.metadata.coreApi) {
                                    newlib.majorVersionCore = newlib.metadata.coreApi.majorVersion;
                                    newlib.minorVersionCore = newlib.metadata.coreApi.minorVersion;
                                }
                                //
                                newlib.isAddon = (newlib.metadata.addTo) ? true : false;
                                if (newlib.isAddon) {
                                    H5PEnv.regAddonLibrary(newlib);
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
                    }
                    //
                    break;
                }
            } // switch (resEntryParse.status)
        }
        else {
            console.error(`Unrecognized entry status (entry: "${entry.filename}"), (package file: "${filePackage.name}").`);
        }
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
            const lfile = await makeVmbLinkedFile(Helper.extractWithoutExtension(pair[0]), entry);
            result.content.files.push(lfile);
        } // for
        //
        progress.doStep();
    }
    // Preparing a list of dependent libraries from "preloadedDependencies"
    result.package.dependencies = Array.from(setAllDependLibs);
    const aPreloaded = result.package.metadata.preloadedDependencies;
    if (aPreloaded) {
        for (let i = 0; i < aPreloaded.length; i++) {
            let libtoken = H5PEnv.makeLibraryToken(aPreloaded[i]);
            // Grigory. 2024-01-27 (ИМХО) в анализе "preloadedDependencies" вроде как нет смысла,
            // поскольку все библиотеки указанные в этом списке и так включены в H5P файл,
            // где они выявляются при анализе содержимого пакета.
        }
    }
    //
    return result;
    // inline
    function __fetchNewLibrary(libtoken) {
        if (!setAllDependLibs.has(libtoken))
            setAllDependLibs.add(libtoken);
        //
        if (aInstalledLibs.findIndex((value) => {
            return (value.token == libtoken);
        }) >= 0)
            return null;
        //
        let newlib = result.libs.get(libtoken);
        if (!newlib) {
            newlib = { token: libtoken, files: [] };
            result.libs.set(libtoken, newlib);
        }
        //
        return newlib;
    }
}
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
                        newlib.version = H5PEnv.getVersionFromObject(newlib.metadata);
                        if (newlib.metadata.coreApi) {
                            newlib.majorVersionCore = newlib.metadata.coreApi.majorVersion;
                            newlib.minorVersionCore = newlib.metadata.coreApi.minorVersion;
                        }
                        //
                        newlib.isAddon = (newlib.metadata.addTo) ? true : false;
                        if (newlib.isAddon) {
                            H5PEnv.regAddonLibrary(newlib);
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
    //
    //
    await readerZip.close();
    //
    return { library: newlib, files: { libtoken: newlib.token, files: aFiles } };
}
//
// Vmb Content Process
//
function prepareVmbContentMap(objContentDescr, mapVmbContentEntries) {
    if (Array.isArray(objContentDescr)) {
        for (let i = 0; i < objContentDescr.length; i++) {
            const item = objContentDescr[i];
            prepareVmbContentMap(item, mapVmbContentEntries);
        }
    }
    else if (objContentDescr instanceof Object) {
        const aKeys = Object.keys(objContentDescr);
        for (let i = 0; i < aKeys.length; i++) {
            const key = aKeys[i];
            if (key === "vmbraw") {
                // we believe that all values of the "path" field (created by the H5P editor) 
                // are unique to the current package.
                const strFilePath = objContentDescr[key]["path"];
                mapVmbContentEntries.set(strFilePath, null);
            }
            else {
                const item = objContentDescr[key];
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
    //
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
                res.status = (res.rootParent == KnownNames.ContentFolder) ? EntryStatus.ContentPart :
                    (res.rootParent.startsWith(KnownNames.EditorLibPrefix)) ? EntryStatus.UsedByEditor :
                        EntryStatus.LibraryPart;
            }
        }
    } // if (aPath.length !== 0)
    //
    return res;
    //
    // inline
    //
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
    //
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
    //
    var writer = new zip.Uint8ArrayWriter();
    await entry.getData(writer);
    lfile.data = await writer.getData();
    lfile.text = null;
    //
    return lfile;
}

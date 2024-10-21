import { Helper } from "../../helper.js";
import * as H5PEnv from "../h5penv.js";
export class PackageStuff {
    _fileinfo;
    _internals;
    _objPackage;
    _isCorrect = false;
    _strIncorrectMessage = "";
    constructor(fileinfo, internals, instvar, url) {
        try {
            this._fileinfo = fileinfo;
            this._internals = internals;
            //
            const objMainLib = internals.metadata.preloadedDependencies.find((item) => { return item.machineName === internals.metadata.mainLibrary; });
            const strMainLibToken = H5PEnv.makeLibraryToken(objMainLib);
            //
            this._objPackage = {
                id: "",
                origurl: url,
                instvar: instvar, //Helper.convertEnumToString(instvar, InstallVariant),
                //
                suiteid: "",
                //
                name: internals.metadata.title,
                version: undefined,
                //
                fileinfo: fileinfo,
                //
                installed: 0,
                updated: 0,
                //
                libtoken: strMainLibToken,
                metadata: internals.metadata,
                dependencies: [],
                //
                isBroken: false,
                brokeninfo: ""
            };
            //
            // Проверяем наличие у пакета GUID и Версии, если нет, — генерим динамический ID
            let strFromAuthor = this._objPackage.metadata.authorComments;
            if (Helper.hasText(strFromAuthor)) {
                strFromAuthor = strFromAuthor.trim();
                //
                if (strFromAuthor.startsWith("{")) {
                    // считаем что JSON
                    strFromAuthor = strFromAuthor.replaceAll("&quot;", '"');
                    try {
                        const objFromAuthor = JSON.parse(strFromAuthor);
                        if (Helper.hasText(objFromAuthor.id)) {
                            this._objPackage.id = objFromAuthor.id;
                            //
                            // we check the version only if there is an ID
                            if (Helper.hasText(objFromAuthor.version)) {
                                this._objPackage.version = objFromAuthor.version;
                            }
                            else {
                                this._objPackage.version = undefined;
                                //
                                console.log(`CyberShelf. Attention! The "${fileinfo.fullname}" package contains the "authorComments" section, which does not include the "version" field.`);
                            }
                        }
                        else {
                            console.log(`CyberShelf. Attention! The "${fileinfo.fullname}" package contains the "authorComments" section, which does not include the "id" field.`);
                        }
                        //
                    }
                    catch (err) {
                        console.error(`CyberShelf. The "authorComments" section of the "${fileinfo.fullname}" package has incorrect syntax. Error Message: ${err.message}`);
                    }
                }
                else {
                    // другой формат (не JSON)
                }
            }
            if (!Helper.hasText(this._objPackage.id)) {
                this._objPackage.id = "h5p_" + Helper.createDynamicID();
                this._objPackage.version = undefined;
            }
            this._internals.content.packid = this._objPackage.id;
            //
            const aPreloaded = internals.metadata.preloadedDependencies;
            if (Helper.isArray(aPreloaded)) {
                for (let i = 0; i < aPreloaded.length; i++) {
                    let libtoken = H5PEnv.makeLibraryToken(aPreloaded[i]);
                    this._objPackage.dependencies.push(libtoken);
                }
            }
            //
            this._isCorrect = true;
        }
        catch (err) {
            this._strIncorrectMessage = Helper.extractMessage(err);
        }
    } // END constructor
    get isCorrect() {
        return this._isCorrect;
    }
    get incorrectMessage() {
        return this._strIncorrectMessage;
    }
    get fileinfo() {
        return this._fileinfo;
    }
    get newlibs() {
        return this._internals.newlibs;
    }
    get objContent() {
        return this._internals.content;
    }
    get objPackage() {
        return this._objPackage;
    }
    //
    //
    static makePackageInfo(pack) {
        const packinfo = {
            id: pack.id,
            version: pack.version,
            name: pack.name,
            instvar: pack.instvar,
            origurl: pack.origurl,
            suiteid: pack.suiteid,
            //
            filename: pack.fileinfo.fullname,
            filesize: pack.fileinfo.size,
            modified: pack.fileinfo.modified,
            //
            libtoken: pack.libtoken,
            //
            isBroken: pack.isBroken
        };
        //
        return packinfo;
    }
    static isBook(pack) {
        return (pack.id && !pack.id.startsWith("h5p"));
    }
} // class StoredPackageAid

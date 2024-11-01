import { Helper } from "../../helper.js";
import { LearningPackType, } from "../abstraction.js";
import * as h5penv from "../h5penv.js";
import { PackageCase } from "./packcase.js";
export class PackageRaw {
    _fileinfo;
    _internals;
    _objFromAuthor;
    _objPackage;
    _isCorrect = false;
    _strIncorrectMessage = "";
    constructor(fileinfo, internals, delivery, url) {
        try {
            this._fileinfo = fileinfo;
            this._internals = internals;
            //
            const objMainLib = internals.metadata.preloadedDependencies.find((item) => { return item.machineName === internals.metadata.mainLibrary; });
            const strMainLibToken = h5penv.makeLibraryToken(objMainLib);
            //
            this._objPackage = {
                id: undefined,
                origId: undefined,
                name: internals.metadata.title,
                version: "0.0.0",
                //
                packtype: LearningPackType.Regular,
                delivery: delivery,
                origurl: url,
                //
                suiteid: "",
                //
                fileinfo: fileinfo,
                installed: Date.now(),
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
            // We check if the package has a GUID and Version, if not, we generate a dynamic ID
            let strFromAuthor = this._objPackage.metadata.authorComments;
            if (Helper.hasText(strFromAuthor)) {
                strFromAuthor = strFromAuthor.trim();
                if (strFromAuthor.startsWith("{")) {
                    // we consider that JSON
                    strFromAuthor = strFromAuthor.replaceAll("&quot;", '"');
                    try {
                        this._objFromAuthor = JSON.parse(strFromAuthor);
                        if (this._objFromAuthor.id) {
                            this._objPackage.id = this._objFromAuthor.id;
                            this._objPackage.version = this._objFromAuthor.version;
                            //
                            // we check the version only if there is an ID
                            if (!this._objPackage.version) {
                                console.log(`CyberShelf. Attention! The "${fileinfo.fullname}" package contains the "authorComments" section, which does not include the "version" field.`);
                                // in this case, we assume that the version is "0.0.1"
                                this._objPackage.version = "0.0.1";
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
                    // we are not processing another format (not JSON) yet
                }
            }
            if (this._objPackage.id) {
                this._objPackage.packtype = LearningPackType.Book; // in this version, the Learning Pack Type.VMBook is not supported
            }
            else {
                this._objPackage.id = "h5p-" + Helper.createDynamicID();
                this._objPackage.version = undefined;
            }
            this._objPackage.origId = this._objPackage.id;
            this._internals.content.packid = this._objPackage.id;
            //
            const aPreloaded = internals.metadata.preloadedDependencies;
            if (Helper.isArray(aPreloaded)) {
                for (let i = 0; i < aPreloaded.length; i++) {
                    let libtoken = h5penv.makeLibraryToken(aPreloaded[i]);
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
    get isRegular() {
        return this._objPackage.packtype === LearningPackType.Regular;
    }
    get isBook() {
        return this._objPackage.packtype !== LearningPackType.Regular;
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
    get content() {
        return this._internals.content;
    }
    get stored() {
        return this._objPackage;
    }
    //
    makeUniqueName() {
        const now = new Date().toLocaleString();
        this._objPackage.name = `${this._objPackage.name} (${now})`;
    }
    changeId(idNew) {
        this._objPackage.id = idNew;
        if (this._objPackage.packtype === LearningPackType.Regular) {
            this._objPackage.origId = idNew;
        }
        // ! For Books, the "origId" and "his._objFromAuthor.id" does not change. 
    }
    setUpdatedTimestamp(timestamp) {
        this._objPackage.updated = timestamp;
    }
    getCase() {
        return new PackageCase(this._objPackage);
    }
} // class PackageStuff
//# sourceMappingURL=packraw.js.map
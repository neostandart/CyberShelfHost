import { Helper } from "../../helper.js";
import { MCPackType, } from "../abstraction.js";
import * as h5penv from "../render/h5penv.js";
import { BookCase } from "./bookcase.js";
export class PackageRaw {
    _fileinfo;
    _internals;
    _objPackage;
    _isCorrect = false;
    _strIncorrectMessage = "";
    extractId(part) {
        if (!Helper.isString(part))
            return null;
        const res = part.match(/(?<=id=\s*)(\S+)(?=\s*;)/im);
        return (res && res.length > 0) ? res[0] : null;
    }
    extractIsPopup(part) {
        if (!Helper.isString(part))
            return false;
        const res = part.match(/(?<=popup=\s*)(\S+)(?=\s*;)/im);
        const bRes = (res && res.length > 0) ? res[0].toLowerCase() === "true" : false;
        return bRes;
    }
    extractVersion(part) {
        if (Helper.isArray(part)) {
            const latest = part[part.length - 1];
            if (Helper.isString(latest.log)) {
                return latest.log.match(/(?<=version=\s*)(\S+)(?=\s*;)/im)[0] || null;
            }
        }
        return null;
    }
    constructor(fileinfo, internals, delivery, book, serviceUrl) {
        try {
            this._fileinfo = fileinfo;
            this._internals = internals;
            const objMainLib = internals.metadata.preloadedDependencies.find((item) => { return item.machineName === internals.metadata.mainLibrary; });
            const strMainLibToken = h5penv.makeLibraryToken(objMainLib);
            this._objPackage = {
                id: undefined,
                origId: undefined,
                name: internals.metadata.title,
                version: "0.0.0.0",
                isPopup: false,
                packtype: MCPackType.Classic,
                delivery: delivery,
                sourceid: book?.distributorId || "",
                sourceurl: serviceUrl || "",
                suiteid: "",
                fileinfo: fileinfo,
                installed: Date.now(),
                updated: 0,
                libtoken: strMainLibToken,
                metadata: internals.metadata,
                dependencies: [],
                isBroken: false,
                brokeninfo: ""
            };
            if (book) {
                this._objPackage.id = book.id;
                this._objPackage.version = book.version;
                this._objPackage.packtype = MCPackType.Book;
            }
            else {
                let packId = this.extractId(this._objPackage.metadata.authorComments);
                if (packId) {
                    this._objPackage.id = packId;
                    this._objPackage.version = this.extractVersion(this._objPackage.metadata.changes) || this._objPackage.version;
                    this._objPackage.packtype = MCPackType.Book;
                }
                else {
                    this._objPackage.id = "h5p-" + Helper.createDynamicID();
                }
            }
            this._objPackage.isPopup = this.extractIsPopup(this._objPackage.metadata.authorComments);
            this._objPackage.fileinfo.modified = Helper.convertDateToTimestamp(new Date());
            this._objPackage.origId = this._objPackage.id;
            this._internals.content.packid = this._objPackage.id;
            const aPreloaded = internals.metadata.preloadedDependencies;
            if (Helper.isArray(aPreloaded)) {
                for (let i = 0; i < aPreloaded.length; i++) {
                    let libtoken = h5penv.makeLibraryToken(aPreloaded[i]);
                    this._objPackage.dependencies.push(libtoken);
                }
            }
            this._isCorrect = true;
        }
        catch (err) {
            this._strIncorrectMessage = Helper.extractMessage(err);
        }
    }
    get isCorrect() {
        return this._isCorrect;
    }
    get isRegular() {
        return this._objPackage.packtype === MCPackType.Classic;
    }
    get isBook() {
        return this._objPackage.packtype !== MCPackType.Classic;
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
    makeUniqueName() {
        const now = new Date().toLocaleString();
        this._objPackage.name = `${this._objPackage.name} (${now})`;
    }
    changeId(idNew) {
        this._objPackage.id = idNew;
        if (this._objPackage.packtype === MCPackType.Classic) {
            this._objPackage.origId = idNew;
        }
    }
    setUpdatedTimestamp(timestamp) {
        this._objPackage.updated = timestamp;
    }
    getCase() {
        return new BookCase(this._objPackage);
    }
}
//# sourceMappingURL=packraw.js.map
import { LearningPackType } from "../abstraction.js";
export class PackageCase {
    id;
    origId;
    name;
    version;
    packtype;
    delivery;
    origurl;
    suiteid;
    filename;
    filesize;
    modified;
    isBroken;
    constructor(stored) {
        this.id = stored.id;
        this.origId = stored.origId;
        this.name = stored.name;
        this.version = stored.version;
        this.packtype = stored.packtype || LearningPackType.Regular;
        this.delivery = stored.delivery;
        this.origurl = stored.origurl;
        //
        this.suiteid = stored.suiteid;
        //
        this.filename = stored.fileinfo.fullname;
        this.filesize = stored.fileinfo.size;
        this.modified = stored.fileinfo.modified;
        //
        this.isBroken = stored.isBroken;
    }
} // class PackageCase
//# sourceMappingURL=packcase.js.map
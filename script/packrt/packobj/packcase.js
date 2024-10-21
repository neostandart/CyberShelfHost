import { LearningPackType } from "../abstraction.js";
export class PackageCase {
    id;
    name;
    version;
    packtype;
    delivery;
    origurl;
    suiteid;
    filename;
    filesize;
    modified;
    libtoken;
    isBroken;
    constructor(stored) {
        this.id = stored.id;
        this.name = stored.name;
        this.version = stored.version;
        this.packtype = stored.packtype || LearningPackType.SimplePack;
        this.delivery = stored.delivery;
        this.origurl = stored.origurl;
        //
        this.suiteid = stored.suiteid;
        //
        this.filename = stored.fileinfo.fullname;
        this.filesize = stored.fileinfo.size;
        this.modified = stored.fileinfo.modified;
        //
        this.libtoken = stored.libtoken;
        //
        this.isBroken = stored.isBroken;
    }
} // class PackageCase
//# sourceMappingURL=packcase.js.map
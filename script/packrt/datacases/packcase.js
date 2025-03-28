import { ICPackType } from "../abstraction.js";
export class PackageCase {
    id;
    origId;
    name;
    version;
    packtype;
    delivery;
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
        this.packtype = stored.packtype || ICPackType.Regular;
        this.delivery = stored.delivery;
        this.suiteid = stored.suiteid;
        this.filename = stored.fileinfo.fullname;
        this.filesize = stored.fileinfo.size;
        this.modified = stored.fileinfo.modified;
        this.isBroken = stored.isBroken;
    }
}
//# sourceMappingURL=packcase.js.map
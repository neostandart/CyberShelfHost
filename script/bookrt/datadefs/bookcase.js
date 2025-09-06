import { ContentPackType } from "../appshare/abstraction.js";
export class BookCase {
    id;
    origId;
    name;
    version;
    isPopup;
    packtype;
    sourceType;
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
        this.isPopup = stored.isPopup;
        this.packtype = stored.packtype || ContentPackType.Classic;
        this.sourceType = stored.sourceType;
        this.suiteid = stored.suiteid;
        this.filename = stored.fileinfo.fullname;
        this.filesize = stored.fileinfo.size;
        this.modified = stored.fileinfo.modified;
        this.isBroken = stored.isBroken;
    }
}
//# sourceMappingURL=bookcase.js.map
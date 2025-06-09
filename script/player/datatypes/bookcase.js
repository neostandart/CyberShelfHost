import { ContentPackType } from "../abstraction.js";
export class BookCase {
    id;
    origId;
    name;
    version;
    isPopup;
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
        this.isPopup = stored.isPopup;
        this.packtype = stored.packtype || ContentPackType.Classic;
        this.delivery = stored.delivery;
        this.suiteid = stored.suiteid;
        this.filename = stored.fileinfo.fullname;
        this.filesize = stored.fileinfo.size;
        this.modified = stored.fileinfo.modified;
        this.isBroken = stored.isBroken;
    }
}
//# sourceMappingURL=bookcase.js.map
export var PreprocType;
(function (PreprocType) {
    PreprocType[PreprocType["None"] = 0] = "None";
    PreprocType[PreprocType["CssUrl"] = 1] = "CssUrl";
})(PreprocType || (PreprocType = {}));
export var ContentPackType;
(function (ContentPackType) {
    ContentPackType[ContentPackType["Classic"] = 0] = "Classic";
    ContentPackType[ContentPackType["Book"] = 1] = "Book";
    ContentPackType[ContentPackType["VMBook"] = 2] = "VMBook";
})(ContentPackType || (ContentPackType = {}));
export var InstallPhase;
(function (InstallPhase) {
    InstallPhase[InstallPhase["Undef"] = 0] = "Undef";
    InstallPhase[InstallPhase["Start"] = 1] = "Start";
    InstallPhase[InstallPhase["Download"] = 2] = "Download";
    InstallPhase[InstallPhase["Parsing"] = 3] = "Parsing";
    InstallPhase[InstallPhase["Setup"] = 4] = "Setup";
    InstallPhase[InstallPhase["Done"] = 5] = "Done";
    InstallPhase[InstallPhase["Error"] = 6] = "Error";
})(InstallPhase || (InstallPhase = {}));
//# sourceMappingURL=abstraction.js.map
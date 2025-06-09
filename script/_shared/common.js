export var TransDirection;
(function (TransDirection) {
    TransDirection[TransDirection["None"] = 0] = "None";
    TransDirection[TransDirection["Left"] = 1] = "Left";
    TransDirection[TransDirection["Right"] = 2] = "Right";
    TransDirection[TransDirection["Up"] = 3] = "Up";
    TransDirection[TransDirection["Down"] = 4] = "Down";
})(TransDirection || (TransDirection = {}));
export var SortDirection;
(function (SortDirection) {
    SortDirection[SortDirection["Undef"] = 0] = "Undef";
    SortDirection[SortDirection["Ascending"] = 1] = "Ascending";
    SortDirection[SortDirection["Descending"] = 2] = "Descending";
})(SortDirection || (SortDirection = {}));
export var Side;
(function (Side) {
    Side[Side["Top"] = 0] = "Top";
    Side[Side["Left"] = 1] = "Left";
    Side[Side["Right"] = 2] = "Right";
    Side[Side["Bottom"] = 3] = "Bottom";
})(Side || (Side = {}));
export var Dimension;
(function (Dimension) {
    Dimension[Dimension["Full"] = 0] = "Full";
    Dimension[Dimension["Width"] = 1] = "Width";
    Dimension[Dimension["Height"] = 2] = "Height";
})(Dimension || (Dimension = {}));
export var Position;
(function (Position) {
    Position[Position["Custom"] = 0] = "Custom";
    Position[Position["Top"] = 1] = "Top";
    Position[Position["Right"] = 2] = "Right";
    Position[Position["Bottom"] = 3] = "Bottom";
    Position[Position["Left"] = 4] = "Left";
    Position[Position["TopLeft"] = 5] = "TopLeft";
    Position[Position["TopCenter"] = 6] = "TopCenter";
    Position[Position["TopRight"] = 7] = "TopRight";
    Position[Position["Center"] = 8] = "Center";
    Position[Position["CenterLeft"] = 9] = "CenterLeft";
    Position[Position["CenterRight"] = 10] = "CenterRight";
    Position[Position["BottomLeft"] = 11] = "BottomLeft";
    Position[Position["BottomCenter"] = 12] = "BottomCenter";
    Position[Position["BottomRight"] = 13] = "BottomRight";
})(Position || (Position = {}));
export var Orientation;
(function (Orientation) {
    Orientation[Orientation["Landscape"] = 0] = "Landscape";
    Orientation[Orientation["Portrait"] = 1] = "Portrait";
})(Orientation || (Orientation = {}));
export var LayoutAction;
(function (LayoutAction) {
    LayoutAction[LayoutAction["ResizeWidth"] = 0] = "ResizeWidth";
    LayoutAction[LayoutAction["ResizeHeight"] = 1] = "ResizeHeight";
    LayoutAction[LayoutAction["Positioning"] = 2] = "Positioning";
})(LayoutAction || (LayoutAction = {}));
export var DeliveryMethod;
(function (DeliveryMethod) {
    DeliveryMethod[DeliveryMethod["Local"] = 0] = "Local";
    DeliveryMethod[DeliveryMethod["Link"] = 1] = "Link";
    DeliveryMethod[DeliveryMethod["Storage"] = 2] = "Storage";
    DeliveryMethod[DeliveryMethod["Service"] = 3] = "Service";
})(DeliveryMethod || (DeliveryMethod = {}));
//# sourceMappingURL=common.js.map
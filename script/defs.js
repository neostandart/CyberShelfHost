//#region Types
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
export var Layout;
(function (Layout) {
    Layout[Layout["Undef"] = 0] = "Undef";
    Layout[Layout["Top"] = 1] = "Top";
    Layout[Layout["TopLeft"] = 2] = "TopLeft";
    Layout[Layout["TopCenter"] = 3] = "TopCenter";
    Layout[Layout["TopRight"] = 4] = "TopRight";
    Layout[Layout["Center"] = 5] = "Center";
    Layout[Layout["CenterLeft"] = 6] = "CenterLeft";
    Layout[Layout["CenterRight"] = 7] = "CenterRight";
    Layout[Layout["Bottom"] = 8] = "Bottom";
    Layout[Layout["BottomLeft"] = 9] = "BottomLeft";
    Layout[Layout["BottomCenter"] = 10] = "BottomCenter";
    Layout[Layout["BottomRight"] = 11] = "BottomRight";
})(Layout || (Layout = {}));
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
//#endregion (Common types)

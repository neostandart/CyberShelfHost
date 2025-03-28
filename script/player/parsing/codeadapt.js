import { Helper } from "../../_shared/helper.js";
import { PreprocType } from "../abstraction.js";
function checkCssUrl(content) {
    return content.indexOf("url(") >= 0;
}
function setDataContent(content, lfile) {
    lfile.data = Helper.convertStringTo(content);
    lfile.text = null;
    lfile.preproc = PreprocType.None;
}
function setTextContent(content, lfile, preproc) {
    lfile.data = null;
    lfile.text = content;
    lfile.preproc = preproc;
}
function adaptH5P_InteractiveBook(content, lfile) {
    switch (lfile.extension) {
        case "css":
            if (checkCssUrl(content))
                setTextContent(content, lfile, PreprocType.CssUrl);
            else
                setDataContent(content, lfile);
            break;
        case "js":
            if (lfile.name === "h5p-interactive-book") {
                content = content.replace("addHashListener(top)", "addHashListener(window)");
            }
            setDataContent(content, lfile);
            break;
        default:
            setDataContent(content, lfile);
            break;
    }
}
export function processCodeLibFile(content, lfile, lib) {
    switch (true) {
        case lib.token.startsWith("H5P.InteractiveBook"):
            adaptH5P_InteractiveBook(content, lfile);
            break;
        default:
            if (lfile.extension === "css") {
                if (checkCssUrl(content)) {
                    setTextContent(content, lfile, PreprocType.CssUrl);
                }
                else {
                    setDataContent(content, lfile);
                }
            }
            else {
                setDataContent(content, lfile);
            }
            break;
    }
}
//# sourceMappingURL=codeadapt.js.map
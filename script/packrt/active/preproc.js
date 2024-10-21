export class Preprocessor {
    //#region Defs & Vars
    static NOTMATTER_START = ` "'./`;
    static NOTMATTER_END = ` "'/`;
    //#endregion (Defs & Vars)
    // --------------------------------------------------------
    //#region Methods
    static processUrl(strSource, fileprovider, resolvePath = null) {
        const aResult = [];
        const criterionStart = "url(";
        const criterionEnd = ")";
        //
        let nCursor = 0;
        let nIndexNext = -1;
        let nIndexStart = -1;
        let nIndexEnd = -1;
        while ((nIndexStart = strSource.indexOf(criterionStart, nIndexNext)) >= 0) {
            nIndexStart = nIndexStart + criterionStart.length;
            nIndexEnd = strSource.indexOf(criterionEnd, nIndexStart);
            if (nIndexEnd === -1)
                break;
            //
            nIndexNext = nIndexEnd + criterionEnd.length;
            let strMatter = strSource.substring(nIndexStart, nIndexEnd);
            // теперь нужно отбросить кавычки если они есть
            strMatter = __extractMatter(strMatter);
            if (strMatter.startsWith("data") || strMatter.startsWith("http"))
                continue;
            //
            // найден локальный путь к файлу (с высокой вероятностью)
            if (resolvePath) {
                strMatter = resolvePath(strMatter);
            }
            aResult.push(strSource.substring(nCursor, nIndexStart));
            nCursor = nIndexEnd; // поскольку операция выполнена, смещаем курсор
            aResult.push(fileprovider.getObjectURLFlex(strMatter));
            //aResult.push("'" + fileprovider.getObjectURLFlex(strMatter) + "'");
        } // while
        if (nCursor === 0)
            return strSource; // ничего не было сделано
        //
        if (nCursor < strSource.length)
            aResult.push(strSource.substring(nCursor)); // остаток
        //
        return aResult.join('');
        // inline
        function __extractMatter(strEntry) {
            let nMatterStart = 0;
            let nMatterEnd = strEntry.length;
            // поиск с начала вхождения
            for (let i = 0; i < strEntry.length; i++) {
                if (___testMatterStart(strEntry[i])) {
                    nMatterStart = i;
                    break;
                }
            }
            // поиск с конца вхождения
            for (let i = strEntry.length - 1; i >= 0; i--) {
                if (___testMatterEnd(strEntry[i])) {
                    nMatterEnd = i + 1;
                    break;
                }
            }
            if (nMatterStart === 0 && nMatterEnd === strEntry.length)
                return strEntry;
            return strEntry.substring(nMatterStart, nMatterEnd);
            // inline inline :-)
            function ___testMatterStart(strTesting) {
                return (Preprocessor.NOTMATTER_START.indexOf(strTesting) === -1);
            }
            function ___testMatterEnd(strTesting) {
                return (Preprocessor.NOTMATTER_END.indexOf(strTesting) === -1);
            }
        } // function __trimQuotationMarks
    }
} // class Preprocessor
//# sourceMappingURL=preproc.js.map
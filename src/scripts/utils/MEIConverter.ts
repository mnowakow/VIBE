//@ts-ignore
//const $ = H5P.jQuery

/**
* clean mei to make it parsable as document
* @param mei the mei to be cleaned
* @returns cleaned mei
*/
export function cleanMEI(mei: string): string{
 mei = mei.replace(/\xml:id/gi, "id");
 mei = mei.replace(/\n/g, ""); // delete all unnecessary newline
 mei = mei.replace(/\s{2,}/g, ""); // delete all unnecessary whitespaces
 return mei;
}

export function reformatMEI(mei: string): string{
    mei = mei.replace(/\n/g, ""); // delete all unnecessary newline
    mei = mei.replace(/\s{2,}/g, ""); // delete all unnecessary whitespaces
    mei = mei.replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, "\"");
    return mei
}

export function cleanIdAttr(mei: Document): Document{
    mei.querySelectorAll("*").forEach(xi => {
        if (!xi.hasAttribute('xml:id')) return
        const id = xi.getAttribute("xml:id")
        xi.removeAttribute("xml:id")
        xi.setAttribute("id", id)
    })

    return mei
}

/**
 * Converts MEI-String to DOM-conform objec
 * @param mei 
 * @returns MEI as Document
 */
export function meiToDoc(mei: string): Document{
    var meiCopy = (" " + mei).slice(1) //deep copy
    meiCopy = cleanMEI(meiCopy)
    var parser: DOMParser = new DOMParser();
    return parser.parseFromString(meiCopy, "text/xml")
}

export function docToMei(meiDoc: Document): string{
    return new XMLSerializer().serializeToString(restoreXmlIdTags(meiDoc))
}

/**
 * Copys all accid attributes into the note Element, if it has accid Element
 * @param xmlDoc 
 * @returns xmlDoc
 */
export function standardizeAccid(xmlDoc: Document){
    xmlDoc.querySelectorAll("accid").forEach(a => {
        var note = a.closest("note")
        var aAccid =  a.getAttribute("accid")
        if(aAccid !== null) note.setAttribute("accid", aAccid)
        var aAccidGes = a.getAttribute("accid.ges")
        if(aAccidGes !== null) note.setAttribute("accid.ges",aAccidGes)
        a.remove()
    })

    return xmlDoc
}

export function restoreXmlIdTags(xmlDoc: Document){
    var parser: DOMParser = new DOMParser();
    var mei = new XMLSerializer().serializeToString(xmlDoc).replace(/\ id/gi, " xml:id");
    return parser.parseFromString(mei, "text/xml");
}
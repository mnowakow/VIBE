//@ts-ignore
//const $ = H5P.jQuery

/**
* clean mei to make it parsable as document
* @param mei the mei to be cleaned
* @returns cleaned mei
*/
function cleanMEI(mei: string): string{
 mei = mei.replace(/\xml:id/gi, "id");
 mei = mei.replace(/\n/g, ""); // delete all unnecessary newline
 mei = mei.replace(/\s{2,}/g, ""); // delete all unnecessary whitespaces
 return mei;
}

/**
 * Converts MEI to DOM-conform objec
 * @param mei 
 * @returns MEI as Document
 */
export function meiToDoc(mei: string): Document{
    var meiCopy = (" " + mei).slice(1) //deep copy
    meiCopy = cleanMEI(meiCopy)
    var parser: DOMParser = new DOMParser();
    return parser.parseFromString(meiCopy, "text/xml")
}

export function restoreXmlIdTags(xmlDoc: Document){
    var parser: DOMParser = new DOMParser();
    var mei = new XMLSerializer().serializeToString(xmlDoc).replace(/\ id/gi, " xml:id");
    return parser.parseFromString(mei, "text/xml");
}
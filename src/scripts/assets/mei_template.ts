import { constants as c} from "../constants"

class MeiTemplate{
    private xmlDoc: XMLDocument;
    private isEmpty: boolean;

    /**
     * Create templates for MEI-Componets to be inserted 
     * @param xml xml document provided to be altered
     */
    constructor(xml?: XMLDocument){
        this.xmlDoc = xml;
        this.isEmpty = true;
    }

    emptyMEI(): string{
        this.isEmpty = true;
        var mei = document.createElement("mei")
        mei.setAttribute("xmlns", "http://www.music-encoding.org/ns/mei");
        mei.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
        mei.setAttribute("meiversion", "4.0.0")
        mei.appendChild(this.createMeiHead())
        mei.appendChild(this.createMusic())
        
        var meiString = mei.outerHTML;
        meiString = meiString.replace(/def/gi, "Def");
        meiString = meiString.replace(/\grp/gi, "Grp");
        meiString = meiString.replace(/\head/gi, "Head");
        meiString = meiString.replace(/space/gi, "Space");
        
        return meiString;
    }

    createMusic(): Node {
        var newElem = document.createElement("music");
        newElem.appendChild(this.createBody());
        return newElem
    }

    createBody(): Node {
        var newElem = document.createElement("body");
        newElem.appendChild(this.createMDiv());
        return newElem
    }

    createMDiv(): Node {
        var newElem = document.createElement("mdiv");
        newElem.appendChild(this.createScore());
        return newElem
    }

    createScore(): any {
        var newElem = document.createElement("score");
        newElem.appendChild(this.createScoreDef());
        newElem.appendChild(this.createSection());
        return newElem
    }
    createSection(): any {
        var newElem = document.createElement("section");
        newElem.appendChild(this.createMeasure());
        return newElem
    }

    createScoreDef(): Node {
        var newElem = document.createElement("scoreDef");
        newElem.appendChild(this.createStaffGrp());
        return newElem
    }

    createStaffGrp(): Node {
        var newElem = document.createElement("staffGrp");
        newElem.appendChild(this.createStaffDef())
        return newElem
    }

    createStaffDef(n: number = 1, lines: number = 5): Node {
        var newElem = document.createElement("staffDef");
        newElem.setAttribute("n", n.toString());
        newElem.setAttribute("lines", lines.toString());
        return newElem
    }

    createMeiHead(): Node {
        var newElem = document.createElement("meiHead");
        return newElem;
    }

    /**
     * Return Measure to be inserted into new MEI
     * @param n number count of measures in current staff
     */
    createMeasure(n: number = 1, staffCount: number = 1, layerCount: number = 1): Node{
        var newElem = document.createElement("measure");
        newElem.setAttribute("n", n.toString());
        for(let i=0; i<staffCount; i++){
            newElem.appendChild(this.createStaff(i+1, layerCount));
        }        
        return newElem;
    }

    createStaff(n: number = 1, layerCount: number = 1): Node{
        var newElem = document.createElement("staff");
        newElem.setAttribute("n", n.toString());
        newElem.appendChild(this.createLayer(1))
        return newElem;
    }

    createLayer(n: number = 1): Node{
        var newElem = document.createElement("layer");
        newElem.setAttribute("n", n.toString());
        if(this.isEmpty){
            newElem.appendChild(this.createMRest());
        }
        return newElem;
    }

    createMSpace(): any {
        var newElem = document.createElementNS(c._MEINS_, "mSpace");
        return newElem;
    }

    createMRest(): any {
        var newElem = document.createElementNS(c._MEINS_, "mRest");
        return newElem;
    }

    appendToRoot(node: Node){
        if(this.xmlDoc instanceof XMLDocument){
            var refElem = this.xmlDoc.getElementsByTagName("measure").item(0);
            refElem.parentNode.appendChild(node);
        }
    }
    
}

export default MeiTemplate;
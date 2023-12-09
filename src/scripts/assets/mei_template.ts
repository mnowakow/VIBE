import { Unit } from "tone";
import { constants as c} from "../constants"
import { uuidv4 } from "../utils/random";

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
        var mei = document.createElementNS(c._MEINS_, "mei")
        //mei.setAttribute("xmlns", "http://www.music-encoding.org/ns/mei");
        //mei.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
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

    createStaffDef(n: number = 1, lines: number = 5, meterCount: number = 4, meterUnit: number = 4): Node {
        var newElem = document.createElement("staffDef");
        newElem.setAttribute("n", n.toString());
        newElem.setAttribute("lines", lines.toString());
        newElem.setAttribute("meter.count", meterCount.toString())
        newElem.setAttribute("meter.unit", meterUnit.toString())
        newElem.appendChild(this.createClef())
        newElem.appendChild(this.createKeySig())
        return newElem
    }

    createClef(shape: string = "G", line: number = 2): Node{
        var newElem = document.createElement("clef")
        newElem.setAttribute("shape", shape)
        newElem.setAttribute("line", line.toString())
        return newElem 
    }  
    
    createKeySig(mode: string = "major", sig: string = "0"): Node{
        var newElem = document.createElementNS(c._MEINS_, "keySig")
        newElem.setAttribute("mode", mode)
        newElem.setAttribute("sig", sig)
        return newElem
    }

    createMeterSig(count: string, unit: string): Node{
        var newElem = document.createElementNS(c._MEINS_, "meterSig")
        newElem.setAttribute("count", count)
        newElem.setAttribute("unit", unit)
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
        for(let i = 0; i < layerCount; i++){
            newElem.appendChild(this.createLayer(i+1))
        }
        return newElem;
    }

    createLayer(n: number | string = 1 ): Node{
        if(typeof n === "string") n = parseInt(n)
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

    createTempo(mm: string, mmUnit: string, tstamp: string = null, startId: string = null): any{
        var newElement = document.createElementNS(c._MEINS_, "tempo");
        newElement.setAttribute("id", uuidv4())
        newElement.setAttribute("place", "above")
        if(startId === null && tstamp === null){
            throw new Error("Tempo MUST either have timestamp or startId")
        }
        if(tstamp !== null) newElement.setAttribute("tstamp", tstamp)
        if(startId !== null) newElement.setAttribute("startId", startId)
        newElement.setAttribute("mm", mm)
        newElement.setAttribute("mm.unit", mmUnit)
        newElement.setAttribute("midi.bpm", (parseFloat(mm)*parseFloat(mmUnit)).toString())
        newElement.setAttribute("staff", "1")

        var rend = document.createElementNS(c._MEINS_, "rend");
        rend.setAttribute("id", uuidv4())
        rend.setAttribute("fontname", "VerovioText")
        rend.textContent = "__"
        
        newElement.appendChild(rend)
        newElement.textContent = "__ = " + mm

        return newElement
    }

    appendToRoot(node: Node){
        if(this.xmlDoc instanceof XMLDocument){
            var refElem = this.xmlDoc.getElementsByTagName("measure").item(0);
            refElem.parentNode.appendChild(node);
        }
    }
    
}

export default MeiTemplate;
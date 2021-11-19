import {Staff} from '../utils/Types'
import {constants as c} from '../constants';
import {idToClef} from '../utils/mappings'

//@ts-ignore
//const $ = H5P.jQuery;

class MeasureMatrix{

    private matrix: Array<Array<Staff>>
    private cols: number;
    private rows: number;

    constructor(rows: number = null, cols: number = null){
        this.rows = rows;
        this.cols = cols;
        this.matrix = null;
        if(cols !== null && rows !== null){
            // empty matrix
            this.matrix = new Array()
            for(var i = 0; i < cols; i++){
                let col = new Array<Staff>();
                for(var j = 0; j < rows; j++){
                    var staff: Staff = {}
                    col.push(staff)
                }
                this.matrix.push(col);
            }
        }
    }

    populateFromSVG(svg: SVGGElement){
        this.matrix =  new Array<Array<Staff>>();
        this.cols = svg.querySelectorAll(".measure").length;
        this.rows = svg.querySelector(".measure").querySelectorAll(c._STAFF_WITH_CLASSSELECTOR_).length;

        var measures = document.querySelectorAll(".measure")
        for(var i = 0; i < this.cols; i++){
            let col = new Array<Staff>();
            let measure = measures[i]
            let prevMeasure: Element
            if(i==0){
                prevMeasure = measure
            }else{
                prevMeasure = measures[i-1]
            }
            let staves = measure.querySelectorAll(".staff")
            let prevStaves = prevMeasure.querySelectorAll(".staff")
            for(var j = 0; j < this.rows; j++){
                let staff: Staff = {}
                let clefs = prevStaves[j].querySelectorAll(".clef")
                let keysigs = staves[j].querySelectorAll(".keySig")
                let meterSigs = staves[j].querySelectorAll(".meterSig")
                if(clefs.length > 0){
                    let clefIdx: number
                        if(i === 0){
                            clefIdx = 0
                        }else{
                            clefIdx = clefs.length -1
                        }
                    let clefShape = clefs[clefIdx].querySelector("use").getAttribute("xlink:href")
                    if(clefShape.includes("-")){
                        let clefRegex = /^(.*?)-/g
                        clefShape = clefRegex.exec(clefShape)[0]
                        clefShape = clefShape.slice(0, -1)
                    }
                    clefShape = idToClef.get(clefShape);
                    staff.clef = clefShape;
                }else{
                    staff.clef = this.matrix[i-1][j].clef;
                }
                
                if(keysigs.length > 0){
                    let lastIdx = keysigs.length -1
                    let keysigcount = keysigs[lastIdx].querySelectorAll("use").length
                    let keysig = keysigs[lastIdx].querySelector("use").getAttribute("xlink:href") === "#E262" ? "f" : "s"
                    keysig = keysigcount.toString() + keysig
                    staff.keysig = keysig
                }else if(i>0) {
                   staff.keysig = this.matrix[i-1][j].keysig;
                }else{ // First measure, has no accidentials
                    staff.keysig = "0"
                }

                // TO BEI IMPLEMENTED...
                // if(meterSigs.length > 0){
                //     let lastIdx = keysigs.length -1
                //     let meter = meterSigs[lastIdx].getAttribute("meter")
                //     let count = meterSigs[lastIdx].getAttribute("count")
                //     staff.meterSig = {meter: meter, count: count}
                // }else if(i>0) {
                //    staff.meterSig = this.matrix[i-1][j].meterSig;
                // }else{
                //     if(staves[j].querySelector("metersig") === null){
                //         staff.meterSig = null
                //     }else{
                //         staff.meterSig = {meter: staves[j].querySelector("metersig").getAttribute("meter"), count: staves[j].querySelector("metersig").getAttribute("count")}
                //     }
                // }

                col.push(staff)
            }
            this.matrix.push(col)
        }
    }

    populateFromMEI(mei: Document){
        this.matrix =  new Array<Array<Staff>>();
        this.cols = mei.querySelectorAll("measure").length;
        this.rows = mei.querySelector("measure").querySelectorAll("staff").length;

        var measures = mei.querySelectorAll("measure")
        for(var i = 0; i < this.cols; i++){
            let col = new Array<Staff>();
            let measure = measures[i]
            let prevMeasure: Element
            if(i==0){
                prevMeasure = measure
            }else{
                prevMeasure = measures[i-1]
            }
            let staves = measure.querySelectorAll("staff")
            let prevStaves = prevMeasure.querySelectorAll("staff")
            for(var j = 0; j < this.rows; j++){
                let staffDef = mei.querySelector("staffDef[n=\"" + (j+1).toString() + "\"]")
                let staff: Staff = {}
                let clefs = prevStaves[j].querySelectorAll("clef")
                let keysigs = staves[j].querySelectorAll("keySig")
                let meterSigs = staves[j].querySelectorAll("meterSig")
                if(clefs.length > 0){
                    let clefIdx: number
                        if(i === 0){
                            clefIdx = 0
                        }else{
                            clefIdx = clefs.length -1
                        }
                    let clefShape = clefs[clefIdx].getAttribute("shape")
                    clefShape = idToClef.get(clefShape);
                    staff.clef = clefShape;
                }else{
                    if(i>0){
                        staff.clef = this.matrix[i-1][j].clef
                    }else{
                        staff.clef = staffDef.querySelector("clef").getAttribute("shape")
                    }
                }
                
                if(keysigs.length > 0){
                    let lastIdx = keysigs.length -1
                    let keysig = keysigs[lastIdx].getAttribute("sig")
                    staff.keysig = keysig
                }else if(i>0) {
                   staff.keysig = this.matrix[i-1][j].keysig;
                }else{
                    if(staffDef.querySelector("keySig") === null){
                        staff.keysig = "0"
                    }else{
                        staff.keysig = staffDef.querySelector("keySig").getAttribute("sig")
                    }
                }

                if(meterSigs.length > 0){
                    let lastIdx = keysigs.length -1
                    let meter = meterSigs[lastIdx].getAttribute("meter")
                    let count = meterSigs[lastIdx].getAttribute("count")
                    staff.meterSig = {meter: meter, count: count}
                }else if(i>0) {
                   staff.meterSig = this.matrix[i-1][j].meterSig;
                }else{
                    if(staffDef.querySelector("metersig") === null){
                        staff.meterSig = null
                    }else{
                        staff.meterSig = {meter: staffDef.querySelector("metersig").getAttribute("meter"), count: staffDef.querySelector("metersig").getAttribute("count")}
                    }
                }

                col.push(staff)
            }
            this.matrix.push(col)
        }
    }

    addMeasure(n: number = 1){
        for(var i=0; i<n; i++){
            let col = new Array<Staff>();
            for(var j=0; j<this.rows; j++){
                var staff: Staff = {}
                col.push(staff)
            }
            this.matrix.push(col)
        }
        this.cols += n;
    }

    addStaff(n: number = 1){
        for(var i=0; i<this.cols; i++){
            for(var j=0; j<n; j++){
                var staff: Staff = {}
                this.matrix[i].push(staff)
            }
        }
        this.rows += n;
    }

    /**
     * Get StaffType from matrix for [staff][measure]
     * @param row measure index = attribute("n")-1
     * @param col staff index = attribute("n")-1
     * @returns 
     */
    get(row: number | string, col: number | string): Staff{
        if(!isNaN(parseInt(row.toString())) && !isNaN(parseInt(col.toString()))){
            if(typeof row === "string"){
                row = parseInt(row.toString()) - 1 
            }

            if(typeof col === "string"){
                col = parseInt(col.toString()) - 1 
            }

            return this.matrix[row][col]
        }else{
            return null
        }
            
    }

    getDimensions(): {rows: number, cols: number}{
        return {rows: this.rows, cols: this.cols}
    }

}

export default MeasureMatrix;
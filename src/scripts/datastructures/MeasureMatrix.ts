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
                let clefs = i === 0 ? [] : prevStaves[j].querySelectorAll("clef")
                let keysigs = i === 0 ? [] :staves[j].querySelectorAll("keySig")
                let meterSigs = staves[j].querySelectorAll("meterSig")

                let clefIdx: number
                if(clefs.length > 0){
                    if(i === 0){
                        clefIdx = 0
                    }else{
                        clefIdx = clefs.length -1
                    }
                    let clefShape = clefs[clefIdx].getAttribute("shape")
                    staff.clef = clefShape;
                }else{
                    if(i>0){
                        staff.clef = this.matrix[i-1][j].clef
                        staff.clefline = this.matrix[i-1][j].clefline
                        staff.clefdisplacement = this.matrix[i-1][j].clefdisplacement
                    }else{
                        staff.clef = staffDef.querySelector("clef")?.getAttribute("shape") || staffDef.getAttribute("clef.shape")
                        staff.clefline = staffDef.querySelector("clef")?.getAttribute("line") || staffDef.getAttribute("clef.line")
                        staff.clefdisplacement = staffDef.querySelector("clef")?.getAttribute("dis") ? staffDef.querySelector("clef")?.getAttribute("dis") + staffDef.querySelector("clef")?.getAttribute("dis.place") : null
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
                        staff.keysig = staffDef.querySelector("keySig")?.getAttribute("sig") || staffDef.getAttribute("keysig")
                    }
                }

                if(meterSigs.length > 0){
                    let lastIdx = meterSigs.length -1
                    let unit = meterSigs[lastIdx].getAttribute("unit")
                    let count = meterSigs[lastIdx].getAttribute("count")
                    staff.meterSig = {unit: unit, count: count}
                }else if(i>0) {
                   staff.meterSig = this.matrix[i-1][j].meterSig;
                }else{
                    if(staffDef.querySelector("meterSig") !== null){
                        staff.meterSig = {unit: staffDef.querySelector("meterSig").getAttribute("unit"), count: staffDef.querySelector("meterSig").getAttribute("count")}
                    }else if(staffDef.getAttribute("meter.unit") !== null){
                        staff.meterSig = {unit: staffDef.getAttribute("meter.unit"), count: staffDef.getAttribute("meter.count")}
                    }else{
                        staff.meterSig = null
                    }
                }
                col.push(staff)
            }
            this.matrix.push(col)
        }
        //console.log(this.matrix)
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
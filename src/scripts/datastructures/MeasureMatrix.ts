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

    populate(svg: SVGGElement){

        this.matrix =  new Array<Array<Staff>>();
        this.cols = svg.querySelectorAll(".measure").length;
        this.rows = svg.querySelector(".measure").querySelectorAll(c._STAFF_WITH_CLASSSELECTOR_).length;

        var measures = document.querySelectorAll(".measure")
        for(var i = 0; i < this.cols; i++){
            let col = new Array<Staff>();
            let measure = measures[i]
            let staves = measure.querySelectorAll(".staff")
            for(var j = 0; j < this.rows; j++){
                let staff: Staff = {}
                let clefs = staves[j].getElementsByClassName("clef")
                let keysigs = staves[j].getElementsByClassName("keySig")
                if(clefs.length > 0){
                    let lastIdx = clefs.length -1
                    let clefShape = clefs[lastIdx].querySelector("use").getAttribute("xlink:href")
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

    get(row: number, col: number): Staff{
        return this.matrix[row][col]
    }

    getDimensions(): {rows: number, cols: number}{
        return {rows: this.rows, cols: this.cols}
    }

}

export default MeasureMatrix;
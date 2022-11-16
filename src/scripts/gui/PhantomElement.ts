
import { Mouse2MEI } from '../utils/Mouse2MEI';
import * as cq from "../utils/convenienceQueries"
import * as coordinates from "../utils/coordinates"
import { NoteButtonIdToNum } from "../utils/mappings"
import MeasureMatrix from '../datastructures/MeasureMatrix';
import {Staff} from "../utils/Types"

const svgNS = "http://www.w3.org/2000/svg";

class PhantomElement{

    noteR: number
    phantomCanvas: SVGSVGElement;
    noteElement: Element
    containerId: string
    rootSVG: Element
    interactionOverlay: Element
    container: Element


    constructor(elementName: string, containerId: string, options = null, canvas = undefined){
        elementName = elementName.toLowerCase();
        this.setContainerId(containerId)
        this.phantomCanvas = canvas || this.interactionOverlay.querySelector("#phantomCanvas")
        switch(elementName){
        case "note":
            this.makeNewPhantomNote();
            break;
        case "line":
            this.makeNewPhantomLine(options)
            break;
        case "timemarkers":
            //this.makeNewTimeMarkers(options)
            break;
        default:
            console.log("Element", elementName, "is not supported")
            break;
        }
    }

    makeNewPhantomNote(){
        this.removePhantomNote()
        if(this.container.classList.contains("clickmode") && this.interactionOverlay.querySelector("#phantomNote") === null){
            var circle = document.createElementNS(svgNS, "circle")
            this.phantomCanvas.insertBefore(circle, this.phantomCanvas.firstChild);
            circle.setAttribute("id", "phantomNote");
            var r = 5
            circle.setAttribute("r", r.toString());
            circle.setAttribute("fill", "black");
            circle.setAttribute("opacity", "0.5");
            circle.setAttribute("visibility", "hidden")
            this.noteElement = circle
        }
    }

    makeNewPhantomLine(options: {lineY: number, lineX: number}){
        if(options.lineX == undefined || options.lineY == undefined){
            return
        }

        if(this.container.classList.contains("clickmode")){
            new Promise((resolve): void => {
                var line = document.createElementNS(svgNS, "line")
                this.phantomCanvas.insertBefore(line, this.phantomCanvas.firstChild);
                var width = 10
                var x1, x2, y1, y2
                y1 = y2 = options.lineY
                x1 = options.lineX - width
                x2 = options.lineX + width
                line.setAttribute("x1", x1.toString());
                line.setAttribute("x2", x2.toString());
                line.setAttribute("y1", y1.toString());
                line.setAttribute("y2", y2.toString());
                line.classList.add("phantomLine")
                line.setAttribute("visibility", this.phantomCanvas.querySelector("#phantomNote")?.getAttribute("visibility"))
                resolve(true)
            })
        
        }
    }

    /**
     * Draw markers in bar to approximate distances between notes.
     * Division is always based on the selected duration in the toolbar and the time unit.
     * @param options.lastStaffEnteredId Id of the staff where the markes will be drawn
     * @returns 
     */
    makeNewTimeMarkers(options: {lastStaffEnteredId: Element, measureMatrix: MeasureMatrix}){
        if(options.lastStaffEnteredId == undefined) return
        
        var staff = cq.getRootSVG(this.containerId).querySelector("#" + options.lastStaffEnteredId)
        var staffHeight = Array.from(staff.querySelectorAll(".staffLine")).reverse()[0].getBoundingClientRect().bottom - staff.querySelector(".staffLine").getBoundingClientRect().top
        var staffBegin = staff.closest(".measure").getAttribute("n") === "1" ? 
            staff.querySelector(".meterSig").getBoundingClientRect().right :
            staff.getBoundingClientRect().left
        var staffWidth = staff.getBoundingClientRect().right - staffBegin

        var measureN = staff.closest(".measure").getAttribute("n")
        var staffN = staff.getAttribute("n")
        var ratio = parseInt(options.measureMatrix.get(staffN, measureN).meterSig.count) / parseInt(options.measureMatrix.get(staffN, measureN).meterSig.unit)
        var numLines = NoteButtonIdToNum.get(cq.getContainer(this.containerId).querySelector("#noteGroup > .selected")?.id) * ratio
        var cutUnit = staffWidth / numLines
        var linePosX = new Array()
        var linePosY = staff.querySelector(".staffLine").getBoundingClientRect().top
        for(var i = 0; i < numLines; i++){
            linePosX.push(staffBegin + i*cutUnit)
        }
        linePosX.forEach(l => {
            var line = document.createElementNS(svgNS, "line")
            this.phantomCanvas.insertBefore(line, this.phantomCanvas.firstChild);
            var x1, x2, y1, y2
            y1 = linePosY
            y2 = linePosY - staffHeight / 5
            x1 = x2 = l //+ (staffWidth / numLines)
            var coords1 = coordinates.transformToDOMMatrixCoordinates(x1, y1, this.phantomCanvas)
            var coords2 = coordinates.transformToDOMMatrixCoordinates(x2, y2, this.phantomCanvas)
            line.setAttribute("x1", coords1.x.toString());
            line.setAttribute("x2", coords2.x.toString());
            line.setAttribute("y1", coords1.y.toString());
            line.setAttribute("y2", coords2.y.toString());
            line.classList.add("phantomMarker")
            line.setAttribute("visibility", this.phantomCanvas.querySelector("#phantomNote")?.getAttribute("visibility"))
        })

    }

    removePhantomNote(){
        if(this.container.querySelector("#phantomNote") !== null){
            this.container.querySelector("#phantomNote").remove()
        }
    }

    setNoteRadius(r: number){
        this.noteR = r
    }

    setPhantomCanvas(canvas: SVGSVGElement){
        this.phantomCanvas = canvas
        return this
    }

    setContainerId(id: string){
        this.containerId = id
        this.interactionOverlay = cq.getInteractOverlay(id)
        this.rootSVG = cq.getRootSVG(id)
        this.container = document.getElementById(id)
        return this
    }
    
    getNoteElement(){
        return this.noteElement
    }
}
export default PhantomElement;
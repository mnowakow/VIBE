
import { constants as c } from "../constants"
import PhantomElement from "../gui/PhantomElement";
import MusicProcessor from "../MusicProcessor";
import { Mouse2SVG } from "../utils/Mouse2SVG";
import Handler from "./Handler";
import * as coordinates from "../utils/coordinates"
import * as  cq from "../utils/convenienceQueries"
import {Staff} from "../utils/Types"
import MeasureMatrix from "../datastructures/MeasureMatrix";


class PhantomElementHandler implements Handler{
    m2s?: Mouse2SVG;
    musicPlayer?: MusicProcessor;
    currentMEI?: string | Document;

    private phantomLines: Array<PhantomElement>
    private phantomCanvas: SVGSVGElement
    rootBBox: DOMRect;
    phantom: PhantomElement
    private isTrackingMouse: boolean
    private containerId: string
    private vrvSVG: Element
    private interactionOverlay: Element
    private container: Element

    constructor(containerId: string){
        this.setContainerId(containerId)
        this.addCanvas()
        this.phantom = new PhantomElement("note", containerId)
        this.isTrackingMouse = false
    }
    
    
    addCanvas(){
        if(cq.getInteractOverlay(this.containerId).querySelector("#phantomCanvas") !== null) return
        this.rootBBox = this.vrvSVG.getBoundingClientRect()
        var rootWidth = this.rootBBox.width.toString()
        var rootHeigth = this.rootBBox.height.toString()
        
        if(this.phantomCanvas == undefined){
            this.phantomCanvas = document.createElementNS(c._SVGNS_, "svg")
            this.phantomCanvas.setAttribute("id", "phantomCanvas")
        }

        this.interactionOverlay.insertBefore(this.phantomCanvas, this.interactionOverlay.firstChild)
    }

    setListeners() {
        this.interactionOverlay.addEventListener("mousemove", this.trackMouseHandler)
        this.interactionOverlay.querySelectorAll(".notehead rect").forEach(n => n.addEventListener("draggingNote", this.trackMouseHandler))
         // Listener just for staves
        this.interactionOverlay.querySelectorAll(".staffLine").forEach(element => {
            element.addEventListener('click', this.trackMouseHandler)
        })
        this.interactionOverlay.querySelectorAll(".staff").forEach(s => {
            s.addEventListener("currStaffChanged", this.timeMarkerHandler)
        })
        return this
    }

    setPhantomLineListeners(){
        this.interactionOverlay.querySelectorAll(".phantomLine").forEach(element => {
            element.addEventListener('click', this.trackMouseHandler)
        })
    }

    removeListeners() {
        this.interactionOverlay.removeEventListener("mousemove", this.trackMouseHandler)
        this.interactionOverlay.querySelectorAll(".notehead rect").forEach(n => n.removeEventListener("draggingNote", this.trackMouseHandler))
        this.interactionOverlay.querySelectorAll(".staff").forEach(s => {
            s.removeEventListener("currStaffChanged", this.timeMarkerHandler)
        })
        this.interactionOverlay.querySelectorAll(".staffLine").forEach(element => {
            element.removeEventListener('click', this.trackMouseHandler)
            clearInterval(this.trackMouseHandler)
        })
        if(this.phantom){
            this.phantom.removePhantomNote()
            this.phantom = undefined
        }

        return this
    }

    removePhantomLineListeners(){
        this.interactionOverlay.querySelectorAll(".phantomLine").forEach(element => {
            element.removeEventListener('click', this.trackMouseHandler)
        })
    }

    trackMouseHandler = (function handler(e: MouseEvent){
        var that = this
        that.trackMouse(e)
    }).bind(this)


    /**
     * Draw circle under mouse cursor
     * @param e 
     */
    trackMouse(e: MouseEvent){
        if(this.m2s.getLastMouseEnter().staff === null) return
        // var pt = coordinates.transformToDOMMatrixCoordinates(e.clientX, e.clientY, this.interactionOverlay)
        // var relX = pt.x
        // var relY = pt.y
        var definitionScale = cq.getVrvSVG(this.containerId).querySelector("#" + this.m2s.getLastMouseEnter().staff?.getAttribute("refId"))?.closest(".definition-scale")
        if(definitionScale == undefined || definitionScale == null) return

        var pt = coordinates.transformToDOMMatrixCoordinates(e.clientX, e.clientY, this.interactionOverlay)
        var relX = pt.x
        var relY = pt.y

        var dsCoords = coordinates.getDOMMatrixCoordinates(definitionScale, definitionScale.closest(".page"))
        //console.log(relX, dsCoords, definitionScale.getBoundingClientRect())
        if(relX < dsCoords.left || relX > dsCoords.right){
            this.isTrackingMouse = false
            return
        }

        this.isTrackingMouse = true

        var target = e.target as HTMLElement
        target = target.closest("g") as unknown as HTMLElement
        var options = {}

        if(target?.classList.contains("staffLine")){
            options["staffLineId"] = target.id
        }

        var phantomNoteElement = this.phantom.getNoteElement()
        if(phantomNoteElement == undefined){return}
        phantomNoteElement.setAttribute("cx", relX.toString());
        phantomNoteElement.setAttribute("cy", relY.toString());
        phantomNoteElement.setAttribute("r", this.m2s?.getLineDist()?.toString() || "0")
        phantomNoteElement.setAttribute("visibility", phantomNoteElement.getAttribute("visibility") || "visible")
        this.m2s.defineNote(relX, relY, options)
        var newCY = (this.m2s.getNewNoteY())?.toString()
        phantomNoteElement.setAttribute("cy", (newCY || "0"))

        this.removeLines()
        if(this.m2s.getPhantomLines() != undefined){
            this.phantomLines = new Array();
            this.m2s.getPhantomLines().forEach(pl => {
                this.phantomLines.push(new PhantomElement("line", this.containerId, {lineX: relX, lineY: pl}, this.phantomCanvas))
            })
            this.setPhantomLineListeners()
        }
        // if(e.type === "draggingNote"){
        //     console.log(phantomNoteElement, this.phantomLines)
        // }
    }

    removeLines(){
        var lines = this.interactionOverlay.querySelectorAll(".phantomLine")
        this.removePhantomLineListeners()
        if(lines.length > 0){
            lines.forEach(l => {
                l.remove()
            })
        }
        return this
    }

    timeMarkerHandler = (function timeMarkerHandler(e: MouseEvent){
        this.drawMarkers(e)
    }).bind(this)

    drawMarkers(e: MouseEvent){
        this.container.querySelectorAll(".phantomMarker").forEach(pm => pm.remove())
        var pm = new PhantomElement("timeMarkers", 
            this.containerId, 
            {lastStaffEnteredId: (e.target as Element).getAttribute("refId"),
            measureMatrix: this.m2s.getMeasureMatrix()
        })
    }

    resetCanvas(){
        this.setContainerId(this.containerId)
        this.rootBBox = this.vrvSVG.getBoundingClientRect()
    
        this.phantomCanvas = this.interactionOverlay.querySelector("#phantomCanvas")
        
        this.removeListeners()
        this.removePhantomLineListeners()
        this.phantom = new PhantomElement("note", this.containerId)
        this.setListeners()
        this.setPhantomLineListeners()
    }


    setm2s(m2s: Mouse2SVG){
        this.m2s = m2s
        return this
    }

    setContainerId(id: string){
        this.containerId = id
        this.vrvSVG = cq.getVrvSVG(id)
        this.interactionOverlay = cq.getInteractOverlay(id)
        this.container = document.getElementById(id)
        return this
    }

    setPhantomNote(note: PhantomElement = undefined){
        this.phantom = note || new PhantomElement("note", this.containerId)
        return this
    }

    getIsTrackingMouse(){
        return this.isTrackingMouse
    }
}

export default PhantomElementHandler
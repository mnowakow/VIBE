
import { constants as c } from "../constants"
import PhantomElement from "../gui/PhantomElement";
import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import * as coordinates from "../utils/coordinates"
import * as  cq from "../utils/convenienceQueries"
import {Staff} from "../utils/Types"
import MeasureMatrix from "../datastructures/MeasureMatrix";


class PhantomElementHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    private phantomLines: Array<PhantomElement>
    private phantomCanvas: SVGSVGElement
    rootBBox: DOMRect;
    phantom: PhantomElement
    private isTrackingMouse: boolean
    private containerId: string
    private rootSVG: Element
    private interactionOverlay: Element
    private container: Element

    constructor(containerId: string){
        this.setContainerId(containerId)
        this.addCanvas()
        this.phantom = new PhantomElement("note", containerId)
        this.isTrackingMouse = false
    }
    
    
    addCanvas(){
        this.rootBBox = this.rootSVG.getBoundingClientRect()
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
        this.interactionOverlay.querySelectorAll(".staff").forEach(s => {
            s.removeEventListener("currStaffChanged", this.timeMarkerHandler)
        })
        this.interactionOverlay.querySelectorAll(".staffLine").forEach(element => {
            element.removeEventListener('click', this.trackMouseHandler)
            clearInterval(this.trackMouseHandler)
        })
        if(this.phantom != undefined){
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

        var pt = coordinates.transformToDOMMatrixCoordinates(e.clientX, e.clientY, this.interactionOverlay)
        var relX = pt.x
        var relY = pt.y

        var definitionScale = this.rootSVG.querySelector(".definition-scale")
        var dsCoords = coordinates.getDOMMatrixCoordinates(definitionScale, this.rootSVG)
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
        phantomNoteElement.setAttribute("r", this.m2m?.getLineDist()?.toString() || "0")
        phantomNoteElement.setAttribute("visibility", phantomNoteElement.getAttribute("visibility") || "visible")
        this.m2m.defineNote(relX, relY, options)
        var newCY = (this.m2m.getNewNoteY())?.toString()
        phantomNoteElement.setAttribute("cy", (newCY || "0"))

        this.removeLines()
        if(this.m2m.getPhantomLines() != undefined){
            this.phantomLines = new Array();
            this.m2m.getPhantomLines().forEach(pl => {
                this.phantomLines.push(new PhantomElement("line", this.containerId, {lineX: relX, lineY: pl}, this.phantomCanvas))
            })
            this.setPhantomLineListeners()
        }
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
            measureMatrix: this.m2m.getMeasureMatrix()
        })
    }

    resetCanvas(){
        this.setContainerId(this.containerId)
        this.rootBBox = this.rootSVG.getBoundingClientRect()
    
        this.phantomCanvas = this.interactionOverlay.querySelector("#phantomCanvas")
        
        this.removeListeners()
        this.removePhantomLineListeners()
        this.phantom = new PhantomElement("note", this.containerId)
        this.setListeners()
        this.setPhantomLineListeners()
    }


    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
        return this
    }

    setContainerId(id: string){
        this.containerId = id
        this.rootSVG = cq.getRootSVG(id)
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

import { constants as c } from "../constants"
import PhantomElement from "../gui/PhantomElement";
import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import * as coordinates from "../utils/coordinates"


class PhantomElementHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    private phantomLines: Array<PhantomElement>
    private phantomCanvas: SVGSVGElement
    root: HTMLElement;
    rootBBox: DOMRect;
    phantom: PhantomElement
    private isTrackingMouse: boolean

    constructor(){
        this.addCanvas()
        this.phantom = new PhantomElement("note")
        this.isTrackingMouse = false
    }
    
    
    addCanvas(){
        this.root = document.getElementById(c._ROOTSVGID_)
        this.rootBBox = this.root.getBoundingClientRect()
        var rootWidth = this.rootBBox.width.toString()
        var rootHeigth = this.rootBBox.height.toString()
        

        if(this.phantomCanvas == undefined){
            this.phantomCanvas = document.createElementNS(c._SVGNS_, "svg")
            this.phantomCanvas.setAttribute("id", "phantomCanvas")
            //this.phantomCanvas.setAttribute("preserveAspectRatio", "xMinYMin meet")
            //this.phantomCanvas.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
        }

        this.root.insertBefore(this.phantomCanvas, this.root.firstChild)
    }

    setListeners() {
        document.getElementById("rootSVG").addEventListener("mousemove", this.trackMouseHandler)
         // Listener just for staves
        document.querySelectorAll(".staffLine").forEach(element => {
            element.addEventListener('click', this.trackMouseHandler)
        })

        return this
    }

    setPhantomLineListeners(){
        document.querySelectorAll(".phantomLine").forEach(element => {
            element.addEventListener('click', this.trackMouseHandler)
        })
    }

    removeListeners() {
        document.getElementById("rootSVG").removeEventListener("mousemove", this.trackMouseHandler)
        document.querySelectorAll(".staffLine").forEach(element => {
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
        document.querySelectorAll(".phantomLine").forEach(element => {
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

        var root = document.getElementById(c._ROOTSVGID_)

        var pt = coordinates.transformToDOMMatrixCoordinates(e.clientX, e.clientY, root)
        var relX = pt.x
        var relY = pt.y

        var definitionScale = root.querySelector(".definition-scale")
        var dsCoords = coordinates.getDOMMatrixCoordinates(definitionScale, root)
        if(relX < dsCoords.left || relX > dsCoords.right){
            this.isTrackingMouse = false
            return
        }

        this.isTrackingMouse = true

        var target = e.target as HTMLElement;
        var options = {}

        if(target.classList.contains("staffLine")){
            options["staffLineId"] = target.id
        }

        var phantomNoteElement = this.phantom.getNoteElement()
        if(phantomNoteElement == undefined){return}
        phantomNoteElement.setAttribute("cx", relX.toString());
        phantomNoteElement.setAttribute("cy", relY.toString());
        phantomNoteElement.setAttribute("r", this.m2m?.getLineDist()?.toString() || "0")
        phantomNoteElement.setAttribute("visibility", "visible")
        this.m2m.defineNote(relX, relY, options)
        var newCY = (this.m2m.getNewNoteY())?.toString()
        phantomNoteElement.setAttribute("cy", (newCY || "0"))

        this.removeLines()
        if(this.m2m.getPhantomLines() != undefined){
            this.phantomLines = new Array();
            this.m2m.getPhantomLines().forEach(pl => {
                this.phantomLines.push(new PhantomElement("line", {lineX: relX, lineY: pl}, this.phantomCanvas))
            })
            this.setPhantomLineListeners()
        }
    }

    removeLines(){
        var lines = document.querySelectorAll(".phantomLine")
        this.removePhantomLineListeners()
        if(lines.length > 0){
            lines.forEach(l => {
                l.remove()
            })
        }
        return this
    }

    resetCanvas(){

        this.root = document.getElementById(c._ROOTSVGID_)
        this.rootBBox = this.root.getBoundingClientRect()
        var rootWidth = this.rootBBox.width.toString()
        var rootHeigth = this.rootBBox.height.toString()
        
        this.phantomCanvas = document.querySelector("#phantomCanvas")
        //this.phantomCanvas?.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))  

        
        this.removeListeners()
        this.removePhantomLineListeners()
        this.phantom = new PhantomElement("note")
        this.setListeners()
        this.setPhantomLineListeners()
    }


    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
        return this
    }

    setPhantomNote(note: PhantomElement = undefined){
        this.phantom = note || new PhantomElement("note")
        return this
    }

    getIsTrackingMouse(){
        return this.isTrackingMouse
    }
}

export default PhantomElementHandler

import { constants as c } from "../constants"
import PhantomElement from "../gui/PhantomElement";
import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";


class PhantomElementHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    private phantom: Element
    private phantomLines: Array<PhantomElement>
    private phantomCanvas: SVGSVGElement
    root: HTMLElement;
    rootBBox: DOMRect;
    scale: number;

    constructor(){
        this.phantom = document.getElementById("phantomNote")
        this.addCanvas()
    }
    
    
    addCanvas(){
        this.root = document.getElementById(c._ROOTSVGID_)
        this.rootBBox = this.root.getBoundingClientRect()
        var rootWidth = this.rootBBox.width.toString()
        var rootHeigth = this.rootBBox.height.toString()
        

        if(typeof this.phantomCanvas === "undefined"){
            this.phantomCanvas = document.createElementNS(c._SVGNS_, "svg")
            this.phantomCanvas.setAttribute("id", "phantomCanvas")
            this.phantomCanvas.setAttribute("preserveAspectRatio", "xMinYMin meet")
            this.phantomCanvas.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
        }

        this.root.append(this.phantomCanvas)
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
        if(this.phantom !== null){
            this.phantom.remove()
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
        var rootBBox = root.getBoundingClientRect()

        var relX = (e.pageX - window.pageXOffset - rootBBox.x - root.scrollLeft) * this.scale //- window.pageXOffset
        var relY = (e.pageY - window.pageYOffset - rootBBox.y - root.scrollTop) * this.scale //- window.pageYOffset - svgrect.y
        var target = e.target as HTMLElement;
        var options = {}

        if(target.classList.contains("staffLine")){
            options["staffLineId"] = target.id
        }

        this.phantom.setAttribute("cx", relX.toString());
        this.phantom.setAttribute("cy", relY.toString());
        this.phantom.setAttribute("r", this.m2m?.getLineDist()?.toString() || "0")
        //(this.phantom as HTMLElement).style.transform += 'translate(' + [- window.pageXOffset, - window.pageYOffset - svgrect.y] +')'
        this.phantom.setAttribute('transform', 'translate(' + [- window.pageXOffset, - window.pageYOffset - rootBBox.y] +')') // BUT WHY???
        this.phantom.setAttribute("visibility", "visible")
        this.m2m.defineNote(e.pageX, e.pageY, options)
        var newCY = (this.m2m.getNewNoteY())?.toString()
        this.phantom.setAttribute("cy", (newCY || "0"))

        this.removeLines()
        if(typeof this.m2m.getPhantomLines() !== "undefined"){
            this.phantomLines = new Array();
            this.m2m.getPhantomLines().forEach(pl => {
                this.phantomLines.push(new PhantomElement("line", {lineX: relX - window.pageXOffset, lineY: pl - window.pageYOffset - rootBBox.y}, this.phantomCanvas))
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
    }


    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
        return this
    }

    setPhantomNote(note: Element = undefined){
        this.phantom = note || document.getElementById("phantomNote")
        return this
    }

    setScale(scale:number){
        this.scale = scale
        return this
    }

}

export default PhantomElementHandler
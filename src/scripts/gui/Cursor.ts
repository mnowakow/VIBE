import { NoteBBox } from "../utils/Types";
import { constants as c } from "../constants"
import { Mouse2MEI } from "../utils/Mouse2MEI";
import * as cq from "../utils/convenienceQueries"

class Cursor{
    private cursorRect: SVGRectElement;
    private cursor: SVGSVGElement
    private posx: number;
    private posy: number;
    private height: number
    private noteBBoxes: Array<NoteBBox>;
    private measureBBox: NoteBBox;
    private interval: number;
    private m2m: Mouse2MEI

    private nextElement: Element
    private maxOpacity: number = 0
    private isBol: Boolean

    private containerId: string
    private interactionOverlay: Element
    private container: Element
    private rootSVG: Element

    constructor(containerId: string){
        this.setContainerId(containerId)
        if(this.interactionOverlay.querySelector("#cursor") !== null){
            this.interactionOverlay.querySelector("#cursor").remove()
        }
        // this.cursor = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        // var root = document.getElementById(c._ROOTSVGID_)
        // var rootBBox = root.getBoundingClientRect()
        // var rootWidth = rootBBox.width.toString()
        // var rootHeigth = rootBBox.height.toString()
        // this.cursor.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
        //this.cursor = document.getElementById("manipulatorCanvas") as unknown as SVGSVGElement
        this.cursorRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.setClickListener();
    }

    flashStart(){
        var cursorOn = true;
        var speed = 500;
        this.cursorRect.style.opacity = this.maxOpacity.toString();
        this.interval = setInterval(() => {
          if(cursorOn) {
            this.cursorRect.style.opacity = "0"
            cursorOn = false;
          }else {
            this.cursorRect.style.opacity = this.maxOpacity.toString();
            cursorOn = true;
          }
        }, speed) as unknown as number;
    }

    flashStop(){
        clearInterval(this.interval)
        this.cursorRect.style.opacity = "0";
        this.cursorRect.remove();
    }


    setClickListener(){
        this.setContainerId(this.containerId)
        this.interactionOverlay.addEventListener('click', this.clickHandler)
    }

    removeClickListener(){
        this.setContainerId(this.containerId)
        this.interactionOverlay.removeEventListener('click', this.clickHandler)
    }

    clickHandler = (function clickHandler(e: MouseEvent){
        //e.stopPropagation();
        var selectRect = this.container.querySelector("#keyModeSelectRect")
        if(selectRect !== null){
            selectRect.remove()
            this.rootSVG.querySelectorAll(".marked").forEach(m => {
                m.classList.remove("marked")
                this.interactionOverlay.querySelector("#" + m.id).classList.remove("marked")
            })
        }

        var pt = new DOMPoint(e.clientX, e.clientY)
        var rootMatrix = (this.rootSVG as unknown as SVGGraphicsElement).getScreenCTM().inverse()
        var ptX = pt.matrixTransform(rootMatrix).x
        var ptY =  pt.matrixTransform(rootMatrix).y
        var element = this.findScoreTarget(ptX, ptY)
        this.definePosById(element?.id)
    }).bind(this)

    findScoreTarget(x: number, y: number): Element{
        this.posx = x
        this.posy = y 
        var nbb = this.m2m.findScoreTarget(this.posx, this.posy, true, {left: true, right: false}) // only consider left Elements of click position
        if(nbb != undefined && nbb !== null){
            var element = this.rootSVG.querySelector("#" + nbb.id)
        }
        if(element === null || element == undefined) return
        if(element.classList.contains("note") && element.closest(".chord") !== null){
            element = element.closest(".chord")
        }
        this.nextElement = element
        //console.log(this.nextElement)
        return element
    }

    /**
     * Define position of Cursor by ID of Elements. Cursor will then be placed right of the Element
     * @param id 
     */
    definePosById(id: string){
        // debugging 
        this.setContainerId(this.containerId)
        // this.rootSVG.querySelectorAll("*[fill=green]").forEach(fg => {
        //     fg.removeAttribute("fill")
        // })
       //this.rootSVG.querySelector("#" + id)?.setAttribute("fill", "green")
        //

        if(id == undefined) return

        this.flashStop()
        this.cursor = this.interactionOverlay.querySelector("#manipulatorCanvas") as unknown as SVGSVGElement
        this.cursor.insertBefore(this.cursorRect, this.cursor.firstChild)
        var element = this.rootSVG.querySelector("#"+id)
        element = element?.classList.contains("layer") ? element.closest(".staff") : element //special rule for layer (== beginning of measure)

        var elementBBox: DOMRect
        var currLayerY: number
        var currLayer: Element
        var distToElement: number
        var elementHeight: number 
        if(navigator.userAgent.toLowerCase().indexOf("firefox") > -1){
            distToElement =["note", "rest", "chord", "keySig", "clef", "meterSig"].some(e => {
                return element?.classList.contains(e)
            }) ? 40 : 0
        }else{
            distToElement =["note", "rest", "chord", "keySig", "clef", "meterSig"].some(e => {
                return element?.classList.contains(e)
            }) ? element.getBoundingClientRect().width + 10 : 0 
        }

        var ptLayer: DOMPoint
        var parentMatrix = (this.cursor as unknown as SVGGraphicsElement).getScreenCTM().inverse()
        //determine reference boundingbox for further computation of dimensions
        if(element !== null){
            elementBBox = element.getBoundingClientRect()
            currLayer = element.classList.contains("staff") ? element.querySelector(".layer") : element.closest(".layer")//element : element.closest(".layer")
            currLayerY = currLayer?.getBoundingClientRect().y || 0//element.classList.contains("staff") ? element.getBoundingClientRect().y : element.closest(".layer")?.getBoundingClientRect().y || 0
            this.nextElement = element
            this.isBol = false
        }else{
            currLayer = this.rootSVG.querySelector(".layer[n=\"" + (parseInt(id[id.length-1]) + 1).toString() + "\"]")
            currLayerY = currLayer.getBoundingClientRect().y
            elementBBox = this.nextElement.getBoundingClientRect()
            element = this.nextElement as HTMLElement
            distToElement = -distToElement
            this.isBol = true
        }

        ptLayer = new DOMPoint(0, currLayerY)
        currLayerY = ptLayer.matrixTransform(parentMatrix).y

        if(navigator.userAgent.toLowerCase().indexOf("firefox") > -1){
            elementHeight = element.querySelector(".stem")?.getBoundingClientRect().height || element.querySelector("barLine")?.getBoundingClientRect().height || 11
        }else{
            elementHeight = elementBBox.height
        }
        
        //scaled height and width of elemnetBBox 
        var ptLT = new DOMPoint(elementBBox.left, elementBBox.top)
        ptLT = ptLT.matrixTransform(parentMatrix)
        var ptRB = new DOMPoint(elementBBox.right, elementBBox.bottom)
        ptRB = ptRB.matrixTransform(parentMatrix)

        var ptWidth = ptRB.x - ptLT.x
        var ptHeight = ptRB.y - ptLT.y

        var drawChordRect: Boolean
        if(this.container.querySelector("#chordButton")?.classList.contains("selected")){
            drawChordRect = true
        }else{
            drawChordRect = false
        }

        // set width and height
        this.cursorRect.setAttribute("id", "cursor")
        var ptCursor = new DOMPoint(elementBBox.x, elementBBox.y)
        ptCursor = ptCursor.matrixTransform(parentMatrix)
        if(!drawChordRect || navigator.userAgent.toLowerCase().indexOf("firefox") > -1){ // Firefox only gets the normal text cursor for chord mode :(
            this.posx = ptCursor.x + distToElement
            this.posy = ptCursor.y
            this.height = ptHeight + 4
            this.cursorRect.setAttribute("width", "2px");
            this.cursorRect.setAttribute("height", this.height.toString());
            this.maxOpacity = 1
        }else{ // for chord mode
            var padding = 4
            this.posx = ptCursor.x 
            this.posy = currLayerY
            this.cursorRect.setAttribute("width", (ptWidth + padding).toString());
            this.cursorRect.setAttribute("height", (ptHeight + padding).toString());
            this.maxOpacity = 0.5
        }
        this.cursorRect.setAttribute("x", this.posx.toString());        
        this.cursorRect.setAttribute("y", this.posy.toString())
        this.cursorRect.setAttribute("refId", element.classList.contains("staff") ? currLayer.id : element.id)

        this.flashStart();
    }

    isBOL(): Boolean{
        return this.isBol
    }


    ///////// GETTER/ SETTER ////////////

    getNextElement(): Element{
        return this.nextElement
    }

    getPos(): {x: number, y: number}{
        return {x: this.posx, y: this.posy}
    }

    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
    }

    setContainerId(id: string){
        this.containerId = id
        this.container = document.getElementById(id)
        this.interactionOverlay = cq.getInteractOverlay(id)
        this.rootSVG = cq.getRootSVG(id)
        return this
    }
}

export default Cursor;
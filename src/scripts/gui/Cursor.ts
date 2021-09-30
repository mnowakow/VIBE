import { NoteBBox } from "../utils/Types";
import { constants as c } from "../constants"
import { Mouse2MEI } from "../utils/Mouse2MEI";

class Cursor{
    private cursor: SVGRectElement;
    private posx: number;
    private posy: number;
    private height: number
    private noteBBoxes: Array<NoteBBox>;
    private measureBBox: NoteBBox;
    private interval: NodeJS.Timeout;
    private m2m: Mouse2MEI

    private nextElement: Element
    private maxOpacity: number = 0
    private isBol: Boolean

    constructor(){
        if(document.getElementById("cursor") !== null){
            document.getElementById("cursor").remove()
        }
        this.cursor = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.setClickListener();
    }

    flashStart(){
        var cursorOn = true;
        var speed = 500;
        this.cursor.style.opacity = this.maxOpacity.toString();
        this.interval = setInterval(() => {
          if(cursorOn) {
            this.cursor.style.opacity = "0"
            cursorOn = false;
          }else {
            this.cursor.style.opacity = this.maxOpacity.toString();
            cursorOn = true;
          }
        }, speed);
    }

    flashStop(){
        clearInterval(this.interval)
        this.cursor.style.opacity = "0";
        this.cursor.remove();
    }


    setClickListener(){
        document.getElementById(c._ROOTSVGID_).addEventListener('click', this.clickHandler)
    }

    removeClickListener(){
        document.getElementById(c._ROOTSVGID_).removeEventListener('click', this.clickHandler)
    }

    clickHandler = (function clickHandler(evt: MouseEvent){
        evt.stopPropagation();

        var selectRect = document.querySelector("#keyModeSelectRect")
        if(selectRect !== null){
            selectRect.remove()
            document.querySelectorAll(".marked").forEach(m => {
                m.classList.remove("marked")
            })
        }

        var element = this.findScoreTarget(evt.pageX, evt.pageY)
        this.definePosById(element.id)
        
    }).bind(this)

    findScoreTarget(x: number, y: number): Element{
        var svgRect = document.querySelector(c._ROOTSVGID_WITH_IDSELECTOR_).getBoundingClientRect()
        this.posx = x - svgRect.x - window.pageXOffset
        this.posy = y - svgRect.y - window.pageYOffset

        var nbb = this.m2m.findScoreTarget(this.posx, this.posy)
        var element = document.getElementById(nbb.id)
        if(element.classList.contains("note") && element.closest(".chord") !== null){
            element = element.closest(".chord")
        }
        this.nextElement = element
        console.log(this.nextElement)
        return element
    }

    /**
     * Define position of Cursor by ID of Elements. Cursor will then be placed right of the Elements
     * @param id 
     */
    definePosById(id: string){
        this.flashStop()
        var element = document.getElementById(id)
        element = element?.classList.contains("layer") ? element.closest(".staff") : element //special rule for layer (== beginning of measure)
        var svgRect = document.querySelector(c._ROOTSVGID_WITH_IDSELECTOR_).getBoundingClientRect()

        var elementBBox: DOMRect
        var currLayerY: number
        var distToElement = ["note", "rest", "chord", "keySig", "clef", "meterSig"].some(e => {
            return element?.classList.contains(e)
        }) ? element.getBoundingClientRect().width + 6 : 0 
        if(element !== null){
            elementBBox = element.getBoundingClientRect()
            currLayerY = element.classList.contains("staff") ? element.getBoundingClientRect().y : element.closest(".layer")?.getBoundingClientRect().y || 0
            this.nextElement = element
            this.isBol = false
        }else{
            currLayerY = document.querySelector(".layer[n=\"" + (parseInt(id[id.length-1]) + 1).toString() + "\"]").getBoundingClientRect().y
            elementBBox = this.nextElement.getBoundingClientRect()
            distToElement = -distToElement
            this.isBol = true
        }

        var drawChordRect: Boolean
        if(document.getElementById("chordButton").classList.contains("selected")){
            drawChordRect = true
        }else{
            drawChordRect = false
        }

        // set width and height
        this.cursor.setAttribute("id", "cursor")
        if(!drawChordRect){
            this.posx = elementBBox.x + distToElement - svgRect.x //- window.pageXOffset
            this.posy = elementBBox.y - svgRect.y//currLayerY - svgRect.y
            this.height = elementBBox.height + 4
            this.cursor.setAttribute("width", "2px");
            this.cursor.setAttribute("height", this.height.toString());
            this.maxOpacity = 1
        }else{ // for chord mode
            var padding = 4
            this.posx = elementBBox.x - svgRect.x //- window.pageXOffset
            this.posy = currLayerY - svgRect.y //elementBBox.y - svgRect.y - window.pageYOffset
            this.cursor.setAttribute("width", (elementBBox.width + padding).toString());
            this.cursor.setAttribute("height", (elementBBox.height + padding).toString());
            this.maxOpacity = 0.5
        }
        this.cursor.setAttribute("x", this.posx.toString());        
        this.cursor.setAttribute("y", this.posy.toString())

        document.querySelector(c._ROOTSVGID_WITH_IDSELECTOR_).insertBefore(this.cursor, document.querySelector(c._ROOTSVGID_WITH_IDSELECTOR_).firstChild);
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
}

export default Cursor;
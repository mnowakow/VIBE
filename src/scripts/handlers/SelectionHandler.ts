import * as d3 from 'd3';
import { Mouse2MEI } from '../utils/Mouse2MEI';
import Handler from './Handler';
import MusicPlayer from '../MusicPlayer';
import {numToNoteButtonId, numToDotButtonId} from '../utils/mappings'
import { constants as c } from "../constants"
import LabelHandler from './LabelHandler';
import * as coordinates from "../utils/coordinates"

const marked = "marked"

class SelectionHandler implements Handler{

    private canvas;
    private initialX: number;
    private initialY: number;
    m2m: Mouse2MEI;
    private dsa: any
    private selectStartEvent: Event;
    private selectEndEvent: Event;
    private shiftPressed: boolean

    constructor(){

        this.selectStartEvent = new Event("selectStart")
        this.selectEndEvent = new Event("selectEnd")
        this.shiftPressed = false
        this.setKeyListeners()


        this.canvas = d3.select("#rootSVG"); // draw directly in svg
        var dragSelectAction = d3.drag() 
        .on('start', selStart)
        .on('drag', selecting)
        .on('end', selEnd)

        var that = this;
        function selStart(){
            //document.dispatchEvent(that.selectStartEvent)
            //var container = document.getElementById(c._ROOTSVGID_).parentElement
            var pt = new DOMPoint(d3.event.sourceEvent.clientX, d3.event.sourceEvent.clientY)
            var canvasMatrix = (document.getElementById("rootSVG") as unknown as SVGGraphicsElement).getScreenCTM().inverse()
            pt = pt.matrixTransform(canvasMatrix)
            that.initialX = pt.x //d3.event.x
            that.initialY = pt.y //d3.event.y
            if(!document.body.classList.contains("harmonyMode") && !that.shiftPressed){ //!that.harmonyHandler.getGlobal()){
                that.m2m.getNoteBBoxes().forEach(bb => {
                    let note = document.getElementById(bb.id)
                    note.classList.remove(marked)
                })
            }
            that.initRect(that.initialX, that.initialY)
        }

        function selecting(){
            //var container = document.getElementById(c._ROOTSVGID_).parentElement
            var root = document.getElementById(c._ROOTSVGID_)
            //var rootBBox = root.getBoundingClientRect()

            var pt = new DOMPoint(d3.event.sourceEvent.clientX, d3.event.sourceEvent.clientY)
            var canvasMatrix = (document.getElementById("rootSVG") as unknown as SVGGraphicsElement).getScreenCTM().inverse()
            pt = pt.matrixTransform(canvasMatrix)

            const curX = pt.x //d3.event.x + container.scrollLeft 
            const curY = pt.y //d3.event.y + container.scrollTop 

            const newX = curX < that.initialX ? curX : that.initialX;
            const newY = curY < that.initialY ? curY : that.initialY;
            const width = curX < that.initialX ? that.initialX - curX : curX - that.initialX;
            const height = curY < that.initialY ? that.initialY - curY : curY - that.initialY;
      
            that.updateRect(newX, newY, width, height);

            var rect =  document.querySelector("#selectRect");
            var rectBBox = rect.getBoundingClientRect();

            pt = new DOMPoint(rectBBox.x, rectBBox.y)
            var ptRight = new DOMPoint(rectBBox.right, 0)
            var ptBottom = new DOMPoint(0, rectBBox.bottom)
            var rootMatrix = root as unknown as SVGGraphicsElement
            var rectpt = pt.matrixTransform(rootMatrix.getScreenCTM().inverse())
            var rectHeightpt = Math.abs(rectpt.y - ptBottom.matrixTransform(rootMatrix.getScreenCTM().inverse()).y) 
            var rectWidthpt = Math.abs(rectpt.x - ptRight.matrixTransform(rootMatrix.getScreenCTM().inverse()).x)

            var rx = rectpt.x
            var ry = rectpt.y
            var noteBBoxes = that.m2m.getNoteBBoxes();
            noteBBoxes.forEach(bb => {
                var note = document.getElementById(bb.id)
                let stem = note.querySelector(".stem") as HTMLElement
                let accid = note.querySelector(".accid") as HTMLElement
                if( bb.x >= rx && 
                    //bb.x <= rx + rectBBox.width &&
                    bb.x <= rx +  rectWidthpt &&
                    bb.y >= ry &&
                    //bb.y <= ry + rectBBox.height
                    bb.y <= ry + rectHeightpt
                    ){
                        note.classList.add(marked)
                        if(stem !== null) stem.classList.add(marked)
                        var chord = note.closest(".chord")
                        if(chord !== null){
                            //if(!chord.classList.contains(marked)) 
                            let noteArr = Array.from(chord.querySelectorAll(".note"))
                            if(noteArr.every(c => c.classList.contains(marked)) && noteArr.length > 0){
                                chord.classList.add(marked)
                            }
                        }
                    }else if(!that.shiftPressed){
                        note.classList.remove(marked)
                        stem?.classList.remove(marked)
                        accid?.classList.remove(marked)
                        var chord = note.closest(".chord")
                        chord?.classList.remove(marked)
                    }
            })
            
        }

        function selEnd(){
            var selectRect =  document.querySelector("#selectRect")
            if(selectRect !== null && selectRect?.getAttribute("width") !== "0" && selectRect?.getAttribute("height") !== "0" ){
                document.dispatchEvent(that.selectEndEvent)
            }
            selectRect?.remove();
            var firstMarkedNote = document.querySelector(".chord.marked, .note.marked")?.id
            var meiNote = that.m2m.getCurrentMei().getElementById(firstMarkedNote)
            document.querySelectorAll("#noteGroup *, #dotGroup *").forEach(b => b.classList.remove("selected"))
            document.getElementById(numToNoteButtonId.get(meiNote?.getAttribute("dur")))?.classList.add("selected")
            document.getElementById(numToDotButtonId.get(meiNote?.getAttribute("dots")))?.classList.add("selected")
        }
        this.dsa = dragSelectAction
        this.setListeners()
        //this.canvas.call(dragSelectAction);
    }
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;


    initRect (ulx: number, uly: number): void {
        this.canvas.append('rect')
            .attr('x', ulx)
            .attr('y', uly)
            .attr('width', 0)
            .attr('height', 0)
            .attr('id', 'selectRect')
            .attr('stroke', 'black')
            .attr('stroke-width', "1px")
            .attr('fill', 'none')
    }

    updateRect (newX: number, newY: number, currentWidth: number, currentHeight: number): void {
        d3.select('#selectRect')
          .attr('x', newX)
          .attr('y', newY)
          .attr('width', currentWidth)
          .attr('height', currentHeight);
      }

    removeListeners(): void{
        d3.select("#rootSVG").on('mousedown.drag', null)
        this.m2m.getNoteBBoxes().forEach(bb => {
            let note = document.getElementById(bb.id)
            note.classList.remove(marked)
        })
        document.querySelectorAll(".note, .rest").forEach(el => {
            el.removeEventListener("click", this.markedHandler)
        })
        document.removeEventListener("keydown", this.shiftKeyHandler)
        document.removeEventListener("keyup", this.shiftKeyHandler)
    }

    setListeners():void{
        this.canvas.call(this.dsa);
        document.querySelectorAll(".note, .rest, .mRest").forEach(el => {
            el.addEventListener("click", this.markedHandler)
        })
    }

    setKeyListeners(){
        document.addEventListener("keydown", this.shiftKeyHandler)
        document.addEventListener("keyup", this.shiftKeyHandler)
    }

    resetListeners(){
        //this.removeListeners()
        this.setListeners()
    }

    /**
     *  Mark clicked element
     */
    markedHandler = (function markedHandler(e: MouseEvent){ 
        if(!this.shiftPressed){
            console.log("markedhandler")
            Array.from(document.querySelectorAll("." + marked)).forEach(n => {
                n.classList.remove(marked)
            })
        }
        var target = e.target as Element
        target = target.closest(".note, .rest, .mRest") || target
        target.classList.add(marked)
        
        // change the selected durations in the toolbar
        var firstMarkedNote = document.querySelector(".chord.marked, .note.marked, .rest.marked")?.id
        var meiNote = this.m2m.getCurrentMei().getElementById(firstMarkedNote)
        document.querySelectorAll("#noteGroup *, #dotGroup *").forEach(b => b.classList.remove("selected"))
        document.getElementById(numToNoteButtonId.get(meiNote?.getAttribute("dur")))?.classList.add("selected")
        document.getElementById(numToDotButtonId.get(meiNote?.getAttribute("dots")))?.classList.add("selected")
    }).bind(this)
    
    shiftKeyHandler = (function shiftKeyHandler(e: KeyboardEvent){
        if(e.key === "Shift"){
            if(e.type === "keydown"){
                this.shiftPressed = true
            }else if(e.type === "keyup"){
                this.shiftPressed = false
            }
        }
    }).bind(this)


    ///////// GETTER/ SETTER ////////

    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
    }
}

export default SelectionHandler;
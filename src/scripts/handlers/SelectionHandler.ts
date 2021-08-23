import * as d3 from 'd3';
import { Mouse2MEI } from '../utils/Mouse2MEI';
import Handler from './Handler';
import MusicPlayer from '../MusicPlayer';
import {numToNoteButtonId, numToDotButtonId} from '../utils/mappings'
import { select } from 'd3';

const marked = "marked"

class SelectionHandler implements Handler{

    private canvas;
    private initialX: number;
    private initialY: number;
    m2m: Mouse2MEI;
    private dragSelectAction: any


    constructor(){

        this.canvas = d3.select("#rootSVG"); // draw directly in svg
        var dragSelectAction = d3.drag()
        .on('start', selStart)
        .on('drag', selecting)
        .on('end', selEnd)

        var that = this;
        function selStart(){
            that.initialX = d3.event.x
            that.initialY = d3.event.y
            that.m2m.getNoteBBoxes().forEach(bb => {
                let note = document.getElementById(bb.id)
                note.classList.remove(marked)
            })
            that.initRect(that.initialX, that.initialY)
        }

        function selecting(){
            //const currentPt = 
            const curX = d3.event.x
            const curY = d3.event.y
      
            const newX = curX < that.initialX ? curX : that.initialX;
            const newY = curY < that.initialY ? curY : that.initialY;
            const width = curX < that.initialX ? that.initialX - curX : curX - that.initialX;
            const height = curY < that.initialY ? that.initialY - curY : curY - that.initialY;
      
            that.updateRect(newX, newY, width, height);

            var rect =  document.querySelector("#selectRect");
            var rectBBox = rect.getBoundingClientRect();
            var rx = rectBBox.x + window.pageXOffset //accomodate for scrolling
            var ry = rectBBox.y + window.pageYOffset
            var noteBBoxes = that.m2m.getNoteBBoxes();
            noteBBoxes.forEach(bb => {
                var note = document.getElementById(bb.id)
                let stem = note.querySelector(".stem") as HTMLElement
                if( bb.x >= rx && 
                    bb.x <= rx + rectBBox.width &&
                    bb.y >= ry &&
                    bb.y <= ry + rectBBox.height){
                        note.classList.add(marked)
                        if(stem !== null) stem.classList.add(marked)
                        var chord = note.closest(".chord")
                        if(chord !== null){
                            //if(!chord.classList.contains(marked)) 
                            if(Array.from(chord.querySelectorAll(".note")).every(c => c.classList.contains(marked))){
                                chord.classList.add(marked)
                            }
                        }
                    }else{
                        note.classList.remove(marked)
                        if(stem !== null) stem.classList.remove(marked)
                        var chord = note.closest(".chord")
                        if(chord !== null) chord.classList.remove(marked)
                    }
            })
            
        }

        function selEnd(){
            document.querySelector("#selectRect").remove();
            var firstMarkedNote = document.querySelector(".chord.marked, .note.marked")?.id
            var meiNote = that.m2m.getCurrentMei().getElementById(firstMarkedNote)
            document.querySelectorAll("#noteGroup *, #dotGroup *").forEach(b => b.classList.remove("selected"))
            document.getElementById(numToNoteButtonId.get(meiNote?.getAttribute("dur")))?.classList.add("selected")
            document.getElementById(numToDotButtonId.get(meiNote?.getAttribute("dots")))?.classList.add("selected")
        }
        this.dragSelectAction = dragSelectAction
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
    }

    setListeners():void{
        this.canvas.call(this.dragSelectAction);
    }


    ///////// GETTER/ SETTER ////////

    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
    }
}

export default SelectionHandler;
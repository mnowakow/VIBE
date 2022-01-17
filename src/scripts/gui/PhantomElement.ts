import * as d3 from 'd3';
import { line } from 'd3';
import { threadId } from 'worker_threads';
import {constants as c} from '../constants'
import { Mouse2MEI } from '../utils/Mouse2MEI';

const svgNS = "http://www.w3.org/2000/svg";

class PhantomElement{

    noteR: number
    phantomCanvas: SVGSVGElement;
    noteElement: Element

    constructor(elementName: string, options = null, canvas = undefined){
        elementName = elementName.toLowerCase();
        this.phantomCanvas = canvas || document.getElementById("phantomCanvas")
        switch(elementName){
        case "note":
            this.makeNewPhantomNote();
            break;
        case "line":
            this.makeNewPhantomLine(options)
            break;
        default:
            console.log("Element", elementName, "is not supported")
            break;
        }
    }

    makeNewPhantomNote(){
        this.removePhantomNote()
        if(document.body.classList.contains("clickmode") && document.getElementById("phantomNote") === null){
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

        if(document.body.classList.contains("clickmode")){
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
                resolve(true)
            })
        
        }
    }

    removePhantomNote(){
        if(document.getElementById("phantomNote") !== null){
            document.getElementById("phantomNote").remove()
        }
    }

    setNoteRadius(r: number){
        this.noteR = r
    }

    setPhantomCanvas(canvas: SVGSVGElement){
        this.phantomCanvas = canvas
        return this
    }

    getNoteElement(){
        return this.noteElement
    }
}
export default PhantomElement;
import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import { constants as c } from "../constants"
import Handler from "./Handler";
import interact from "interactjs"

class AnnotationChangeHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    private customShapes: Array<Element>
    private updateCallback: () => void;

    constructor(){
        this.update()
    }


    setListeners() {
        interact('.customAnnotShape')
        .resizable({
            // resize from all edges and corners
            edges: { left: true, right: true, bottom: true, top: true },

            listeners: { move: resizeMoveListener },
        })
        .draggable({
            listeners: { move: dragMoveListener },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ]
        })

        function dragMoveListener (event) {
            event.stopImmediatePropagation()
            var target = event.target
            //console.log("DRAG:", event)
            // keep the dragged position in the data-x/data-y attributes
            var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
            var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

            // translate the element
            target.style.transform = 'translate(' + x + 'px, ' + y + 'px)'

            // update the posiion attributes
            target.setAttribute('data-x', x)
            target.setAttribute('data-y', y)
            var targetParent = target.parentElement as Element
            var line = targetParent.querySelector(":scope > .annotLine")
            var lineDragRect = targetParent.querySelector(":scope > .lineDragRect")

            var rectX = (parseFloat(target.getAttribute("x")) + x).toString()
            var rectY = (parseFloat(target.getAttribute("y")) + y).toString()
            if(line!== null){
                line.setAttribute("x2", rectX)
                line.setAttribute("y2", rectY)
            }
            if(lineDragRect !== null){
                lineDragRect.setAttribute("x",  rectX)
                lineDragRect.setAttribute("y",  rectY)
            }

        }

        function resizeMoveListener(event){
            event.stopImmediatePropagation()
            var target = event.target
            var x = (parseFloat(target.getAttribute('data-x')) || 0)
            var y = (parseFloat(target.getAttribute('data-y')) || 0)

            // update the element's style
            target.style.width = event.rect.width + 'px'
            target.style.height = event.rect.height + 'px'

            // translate when resizing from top or left edges
            x += event.deltaRect.left
            y += event.deltaRect.top

            target.style.transform = 'translate(' + x + 'px,' + y + 'px)'

            target.setAttribute('data-x', x)
            target.setAttribute('data-y', y)
            target.textContent = Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height)
            
            var targetParent = target.parentElement as Element
            var line = targetParent.querySelector(".annotLine")
            var lineDragRect = targetParent.querySelector(".lineDragRect")

            var rectX = (parseFloat(target.getAttribute("x")) + x).toString()
            var rectY = (parseFloat(target.getAttribute("y")) + y).toString()
            if(line!== null){
                line.setAttribute("x2", rectX)
                line.setAttribute("y2", rectY)
            }
            if(lineDragRect !== null){
                lineDragRect.setAttribute("x",  rectX)
                lineDragRect.setAttribute("y",  rectY)
            }
        }
    }
    removeListeners(): void {
        // this.customShapes.forEach(cs => {
        //     cs.removeEventListener("click", this.selectHandler)
        // })

        interact(".customAnnotShape").unset()
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners()
    }

    // change to function after implementation
    selectHandler = (function selectHandler(e: MouseEvent){
        var target = e.target as Element
        if(target.tagName === "rect"){
            var bbox = target.getBoundingClientRect()
            this.attachCornerCircle(target, bbox.x, bbox.y)
        }
        //TODO: Circles etc
    }).bind(this)

    update(){
        this.updateCallback
        this.customShapes = Array.from(document.querySelectorAll(".customAnnotShape"))
        this.resetListeners()
    }

    setUpdateCallback(updateCallback: ()=> void){
        this.updateCallback = updateCallback
    }

}

export default AnnotationChangeHandler
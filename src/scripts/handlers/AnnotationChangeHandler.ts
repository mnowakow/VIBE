import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import { constants as c } from "../constants"
import Handler from "./Handler";
import interact from "interactjs"
import { idxNoteMapFClef } from "../utils/mappings";
import { Annotation, Coord } from "../utils/Types";
import { isConstructorDeclaration } from "typescript";

class AnnotationChangeHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    private customShapes: Array<Element>
    private updateCallback: () => void;
    private root: HTMLElement;
    private rootBBox: DOMRect;
    private snapCoords: { obj: Element; x: number; y: number; };
    private annotations: Annotation[];
    private dragedRect: SVGRectElement
    private scale: number

    constructor(){
        this.update()
    }


    setListeners() {
        interact('.customAnnotShape')
        .resizable({
            // resize from all edges and corners
            edges: { left: true, right: true, bottom: true, top: true },

            listeners: { move: this.resizeShapeListener.bind(this) },
        })
        .draggable({
            listeners: { move: this.dragShapeListener.bind(this) },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ]
        })

        interact('.annotText')
        .resizable({
            // resize from all edges and corners
            edges: { left: true, right: true, bottom: true, top: true },

            listeners: { move: this.resizeTextListener.bind(this) },
        })
        .draggable({
            listeners: { move: this.dragTextListener.bind(this) },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ]
        })

        interact(".lineDragRect.x1")
        .draggable({
            listeners: { 
                move: this.dragLineListener.bind(this),
                end:  this.snapToObj.bind(this)
            },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ]
        })

    }

    removeListeners(): void {
        interact(".customAnnotShape, .annotText, .lineDragRect").unset()
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners()
    }

    // SHAPES

    dragShapeListener (event) {
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

        var rectX = (parseFloat(target.getAttribute("x")) + x).toString()
        var rectY = (parseFloat(target.getAttribute("y")) + y).toString()
        if(line!== null){
            line.setAttribute("x1", rectX)
            line.setAttribute("y1", rectY)
        }
    }

    resizeShapeListener(event){
        event.stopImmediatePropagation()
        var target = event.target as HTMLElement
        var x = (parseFloat(target.getAttribute('data-x')) || 0)
        var y = (parseFloat(target.getAttribute('data-y')) || 0)

        // update the element's style
        target.style.width = event.rect.width + 'px'
        target.style.height = event.rect.height + 'px'

        // translate when resizing from top or left edges
        x += event.deltaRect.left
        y += event.deltaRect.top

        target.style.transform = 'translate(' + x + 'px,' + y + 'px)'

        target.setAttribute('data-x', x.toString())
        target.setAttribute('data-y', y.toString())
        //target.textContent = Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height)
        
        var targetParent = target.closest("g")
        var line = targetParent.querySelector(".annotLine")
        var dragRects = targetParent.querySelectorAll(".lineDragRect")

        var rectX = (parseFloat(target.getAttribute("x")) + x).toString()
        var rectY = (parseFloat(target.getAttribute("y")) + y).toString()
        if(line!== null){
            line.setAttribute("x1", rectX)
            line.setAttribute("y1", rectY)
        }

        if(dragRects.length > 0){
            dragRects.forEach(dr => {
                if(dr.classList.contains("x1")){
                    dr.setAttribute("x", rectX)
                    dr.setAttribute("y", rectY)
                }
            });
        }

    }

    // TEXTBOXES
    resizeTextListener(event){
        event.stopImmediatePropagation()
        var target = event.target.querySelector(".annotFO") as HTMLElement
        var x = (parseFloat(target.getAttribute('data-x')) || 0)
        var y = (parseFloat(target.getAttribute('data-y')) || 0)

        // update the element's style
        target.style.width = event.rect.width + 'px'
        target.style.height = event.rect.height + 'px'

        // translate when resizing from top or left edges
        x += event.deltaRect.left
        y += event.deltaRect.top

        target.style.transform = 'translate(' + x + 'px,' + y + 'px)'

        target.setAttribute('data-x', x.toString())
        target.setAttribute('data-y', y.toString())
        
        var targetParent = target.closest("g")
        var line = targetParent.querySelector(".annotLine")
        var dragRects = targetParent.querySelectorAll(".lineDragRect")

        var rectX = (parseFloat(target.getAttribute("x")) + x).toString()
        var rectY = (parseFloat(target.getAttribute("y")) + y).toString()
        if(line!== null){
            line.setAttribute("x2", rectX)
            line.setAttribute("y2", rectY)
        }

        if(dragRects.length > 0){
            dragRects.forEach(dr => {
                if(dr.classList.contains("x2")){
                    dr.setAttribute("x", rectX)
                    dr.setAttribute("y", rectY)
                }
            });
        }
    }

    dragTextListener(event){
        event.stopImmediatePropagation()
        var target = event.target.querySelector(".annotFO") as HTMLElement
        var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
        var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

        // translate the element
        target.style.transform = 'translate(' + x + 'px, ' + y + 'px)'

        // update the posiion attributes
        target.setAttribute('data-x', x)
        target.setAttribute('data-y', y)
        var targetParent = target.closest("g")
        var line = targetParent.querySelector(".annotLine")
        var dragRects = targetParent.querySelectorAll(".lineDragRect")

        var rectX = (parseFloat(target.getAttribute("x")) + x).toString()
        var rectY = (parseFloat(target.getAttribute("y")) + y).toString()
        if(line!== null){
            line.setAttribute("x2", rectX)
            line.setAttribute("y2", rectY)
        }

        if(dragRects.length > 0){
            dragRects.forEach(dr => {
                if(dr.classList.contains("x2")){
                    dr.setAttribute("x", rectX)
                    dr.setAttribute("y", rectY)
                }
            });
        }
    }

    //LINES

    dragLineListener(event){
        event.stopImmediatePropagation()
        var target = event.target as SVGRectElement
        this.dragedRect = target
        // keep the dragged position in the data-x/data-y attributes
        var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
        var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

        // translate the element
        target.style.transform = 'translate(' + x + 'px, ' + y + 'px)'

        // update the posiion attributes
        target.setAttribute('data-x', x)
        target.setAttribute('data-y', y)
        var targetParent = target.closest("g")
        var line = targetParent.querySelector(".annotLine")

        // var rectX = (parseFloat(target.getAttribute("x")) + x).toString()
        // var rectY = (parseFloat(target.getAttribute("y")) + y).toString()

        var rectX = ((target.getBoundingClientRect().x - this.rootBBox.x) * this.scale).toString()
        var rectY = ((target.getBoundingClientRect().y - this.rootBBox.y) * this.scale).toString()

        if(target.classList.contains("x1")){
            line.setAttribute("x1", rectX)
            line.setAttribute("y1", rectY)
            this.highlightNextAttachObject(target)
        }
        
    }

    /**
     * Highlight the next Element where the lineDragRect could attach to
     * @param lineDragRect 
     * @returns 
     */
    highlightNextAttachObject(lineDragRect: SVGRectElement): Element{
        var posx = lineDragRect.getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft
        var posy =  lineDragRect.getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop
        var nextScoreObj = this.m2m.findScoreTarget(posx, posy)
        var nextShapeObj = this.findCustomShapeTarget(posx, posy)
        var possibleCoords = new Array<Coord>()

        var shapeCoord: Coord
        if(nextShapeObj !== null){
            shapeCoord = {
                obj: nextShapeObj,
                x: nextShapeObj.getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft, 
                y: nextShapeObj.getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop
            }
            possibleCoords.push(shapeCoord)
        }

        var measureCoord: Coord = {
            obj: nextScoreObj.parentMeasure,
            x: nextScoreObj.parentMeasure.getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft, 
            y: nextScoreObj.parentMeasure.getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop
        } 
        possibleCoords.push(measureCoord)

        var staffCoord: Coord = {
            obj: nextScoreObj.parentStaff,
            x: nextScoreObj.parentStaff.getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft, 
            y: nextScoreObj.parentStaff.getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop
        } 
        possibleCoords.push(staffCoord)
        
        var noteCoord: Coord = {
            obj: document.getElementById(nextScoreObj.id),
            x: document.getElementById(nextScoreObj.id).getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft,  
            y: document.getElementById(nextScoreObj.id).getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop
        }
        possibleCoords.push(noteCoord)

        var tempDist: number = Math.pow(10, 10)
        var objToHighlight: Element; 
        var objCoord: Coord
        possibleCoords.forEach(coord => {
            var dist = Math.sqrt(Math.abs(coord.x - posx)**2 + Math.abs(coord.y - posy)**2)
            if(dist < tempDist){
                tempDist = dist
                objToHighlight = coord.obj
                objCoord = coord
            }
        })
        this.updateAnnotationIDs(objToHighlight, lineDragRect, objCoord)
        return objToHighlight
    }

    /**
     * Find nearest Custom Shape to given Position (e.g. Mouse)
     * @param posx 
     * @param posy 
     * @returns 
     */
     findCustomShapeTarget(posx: number, posy: number): Element{
        var shapes = Array.from(document.querySelectorAll(".customAnnotShape"))

        var nextShape: Element
        var tempDist: number = Math.pow(10, 10)
        shapes.forEach(s => {
            var dist = Math.sqrt(Math.abs(s.getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - posx)**2 + Math.abs(s.getBoundingClientRect().y - this.rootBBox.y - window.pageXOffset - posy)**2)
            if(dist < tempDist){
                tempDist = dist
                nextShape = s
            }
        })
        if(typeof nextShape === "undefined"){
            return null
        }
        return nextShape
    }

    /**
     * Update Set of saved Annotations and their relations to Shapes or Score
     * @param objToAttach 
     * @param lineDragRect 
     */
     updateAnnotationIDs(objToAttach: Element, lineDragRect: SVGRectElement, objCoord: Coord){
        var line: Element
        var targetx: number
        var targety: number
        var highlightRect: SVGRectElement
        var parentGroup = lineDragRect.closest("g")
        this.annotations.some(annot => {
            if(annot.sourceID = parentGroup.id){
                annot.targetID = objToAttach.id
                targetx = (objToAttach.getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft) * this.scale
                targety = (objToAttach.getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop) * this.scale


                // draw rect for highlighting
                if(parentGroup.querySelector(".highlightAnnotation") === null){
                    highlightRect = document.createElementNS(c._SVGNS_, "rect")
                    parentGroup.insertBefore(highlightRect, parentGroup.firstChild)
                }else{
                    highlightRect = parentGroup.querySelector(".highlightAnnotation")
                }

                var highlightMargin = 0
                highlightRect.classList.add("highlightAnnotation")
                highlightRect.setAttribute("x", (targetx - highlightMargin).toString())
                highlightRect.setAttribute("y", (targety - highlightMargin).toString())
                highlightRect.setAttribute("height", ((objToAttach.getBoundingClientRect().height + 2*highlightMargin) * this.scale).toString())
                highlightRect.setAttribute("width", ((objToAttach.getBoundingClientRect().width + 2*highlightMargin) * this.scale).toString())

                return annot.sourceID === parentGroup.id
            }
        })

        this.snapCoords = {
            obj: line,
            x: targetx,
            y: targety
        }

        document.querySelectorAll("*[fill=green]").forEach(fg => {
            fg.removeAttribute("fill")
        })
        objToAttach.setAttribute("fill", "green")

        // some rules for custom shapes
        if(objToAttach.classList.contains("customAnnotShape")){
            parentGroup.querySelector(".highlightAnnotation").remove()
            // ensure that only one shape is attached
            if(parentGroup.querySelector(".customAnnotShape") !== null){
                var prevShape = parentGroup.querySelector(".customAnnotShape")
                parentGroup.parentElement.appendChild(prevShape)
            }
            parentGroup.insertBefore(objToAttach, parentGroup.firstChild)

            var newAnnot: Annotation = {
                sourceID: objToAttach.id,
                targetID: new Array<string>()
            }

            // get annotated elements into shape info
            var shapeBBox = objToAttach.getBoundingClientRect()
            var shapeX = shapeBBox.x
            var shapeY = shapeBBox.y
            this.m2m.getNoteBBoxes().forEach(bb => {
                if( bb.x >= shapeX && 
                    bb.x <= shapeX + shapeBBox.width &&
                    bb.y >= shapeY &&
                    bb.y <= shapeY + shapeBBox.height){
                        (newAnnot.targetID as Array<string>).push(bb.id)
                    }
            })
            this.annotations.push(newAnnot)
        }
    }

    /**
     * Snap Annotation Pointer to highlighted Object
     */
     snapToObj(){
        this.dragedRect.setAttribute("x", this.snapCoords.x.toString())
        this.dragedRect.setAttribute("y", this.snapCoords.y.toString())
        var line = this.dragedRect.closest("g").querySelector(".annotLine")
        line.setAttribute("x1", this.snapCoords.x.toString())
        line.setAttribute("y1", this.snapCoords.y.toString())

        // clean up after snap
        document.getElementById("annotationCanvas").querySelectorAll("g").forEach(el => {
            var shapeChild = el.querySelector(".customAnnotShape")
            var highlightChild = el.querySelector(".highlightAnnotation")
            if(shapeChild !== null && el.childElementCount === 1){
                el.parentElement.appendChild(shapeChild)
                document.getElementById(el.id).remove()
            }

            if(shapeChild !== null && highlightChild !== null){
                el.parentElement.appendChild(shapeChild)
            }
        })
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
        this.root = document.getElementById(c._ROOTSVGID_)
        this.rootBBox = this.root.getBoundingClientRect()
        this.scale = (document.querySelector("#annotationCanvas") as SVGSVGElement).viewBox.baseVal.width / this.rootBBox.width //scale is needed to make convertions between different sizes of container
        this.customShapes = Array.from(document.querySelectorAll(".customAnnotShape"))
        this.resetListeners()
    }

    setUpdateCallback(updateCallback: ()=> void){
        this.updateCallback = updateCallback
        return this
    }

    setAnnotations(annotations: Array<Annotation>){
        this.annotations = annotations
    }

    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
        return this
    }

}

export default AnnotationChangeHandler
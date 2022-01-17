import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import { constants as c } from "../constants"
import Handler from "./Handler";
import interact from "interactjs"
import { idxNoteMapFClef } from "../utils/mappings";
import { Annotation, Coord } from "../utils/Types";

class AnnotationChangeHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    private customShapes: Array<Element>
    private updateCallback: () => void;
    private root: HTMLElement;
    private rootBBox: DOMRect;
    private rootMatrix: DOMMatrix
    private canvasMatrix: DOMMatrix
    private snapCoords: { obj: Element; x: number; y: number; };
    private annotations: Annotation[];
    private dragedRect: SVGRectElement
    private scale: number

    private shapeListener: Interact.Interactable
    private textListener: Interact.Interactable
    private lineListener: Interact.Interactable

    constructor(){
        this.update()
    }


    setListeners() {
        var that = this

        this.shapeListener = interact('.customAnnotShape')
        .resizable({
            // resize from all edges and corners
            edges: { left: true, right: true, bottom: true, top: true },

            listeners: { 
                move: this.resizeShapeListener.bind(this),
                end(event){
                    document.dispatchEvent(new Event("annotationCanvasChanged"))
                    that.deleteTempDistances()
                }  
            },
        })
        .draggable({
            listeners: { 
                move: this.dragShapeListener.bind(this),
                end(event){
                    document.dispatchEvent(new Event("annotationCanvasChanged"))
                    that.deleteTempDistances()
                } 
            },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ]
        })

        this.textListener = interact('.annotText')
        .resizable({
            // resize from all edges and corners
            edges: { left: true, right: true, bottom: true, top: true },

            listeners: { 
                move: this.resizeTextListener.bind(this),
                end(event){
                    that.deleteTempDistances()
                    document.dispatchEvent(new Event("annotationCanvasChanged"))
                }  
            },
        })
        .draggable({
            listeners: { 
                move: this.dragTextListener.bind(this),
                end(event){
                    document.dispatchEvent(new Event("annotationCanvasChanged"))
                    that.deleteTempDistances()
                }  
            },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ]
        })

        this.lineListener = interact(".lineDragRect.x1")
        .draggable({
            listeners: { 
                move: this.dragLineListener.bind(this),

                end(event){
                    that.snapToObj()
                    document.dispatchEvent(new Event("annotationCanvasChanged"))
                    that.deleteTempDistances()
                }
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
        //interact(".customAnnotShape, .annotText, .lineDragRect").unset()
        this.shapeListener?.unset()
        this.lineListener?.unset()
        this.textListener?.unset()
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners()
    }

    // SHAPES
    dragShapeListener (event) {
        var target = event.target as HTMLElement
        var pt = new DOMPoint(event.clientX, event.clientY)
        this.canvasMatrix = (document.getElementById("annotationCanvas") as unknown as SVGGraphicsElement).getScreenCTM().inverse()
        var edx = pt.matrixTransform(this.canvasMatrix).x
        var edy = pt.matrixTransform(this.canvasMatrix).y

        var ptDist = new DOMPoint(target.getBoundingClientRect().x, event.target.getBoundingClientRect().y)
        var distX = (parseFloat(target.getAttribute('distX'))) || edx - ptDist.matrixTransform(this.canvasMatrix).x 
        var distY = (parseFloat(target.getAttribute('distY'))) || edy - ptDist.matrixTransform(this.canvasMatrix).y 

        target.setAttribute("distX", distX.toString())
        target.setAttribute("distY", distY.toString())

        target.setAttribute("x", (edx - distX).toString())
        target.setAttribute("y", (edy - distY).toString())

        var targetParent = target.parentElement as Element
        var line = targetParent.querySelector(":scope > .annotLine")

        var pt = new DOMPoint(target.getBoundingClientRect().x, target.getBoundingClientRect().y)

        var rectX = pt.matrixTransform(this.canvasMatrix).x.toString() 
        var rectY = pt.matrixTransform(this.canvasMatrix).y.toString() 

        if(line!== null){
            line.setAttribute("x1", rectX)
            line.setAttribute("y1", rectY)
        }
    }

    resizeShapeListener(event){
        var target = event.target as HTMLElement
        this.canvasMatrix = (document.getElementById("annotationCanvas") as unknown as SVGGraphicsElement).getScreenCTM().inverse()

        // update overal dimensions
        var ptTL = new DOMPoint(event.rect.left, event.rect.top)
        var ptRB = new DOMPoint(event.rect.right, event.rect.bottom)
        var ptWidth = Math.abs(ptRB.matrixTransform(this.canvasMatrix).x - ptTL.matrixTransform(this.canvasMatrix).x).toString()
        var ptHeight = Math.abs(ptRB.matrixTransform(this.canvasMatrix).y - ptTL.matrixTransform(this.canvasMatrix).y).toString()
        target.style.width = ptWidth + 'px'
        target.style.height = ptHeight + 'px'

        // translate when resizing from top or left edges
        if(event.edges.top === true || event.edges.left === true){
            var pt = new DOMPoint(event.clientX, event.clientY)
            var edx = pt.matrixTransform(this.canvasMatrix).x
            var edy = pt.matrixTransform(this.canvasMatrix).y

            var ptDist = new DOMPoint(target.getBoundingClientRect().x, event.target.getBoundingClientRect().y)
            var distX = (parseFloat(target.getAttribute('distX'))) || edx - ptDist.matrixTransform(this.canvasMatrix).x 
            var distY = (parseFloat(target.getAttribute('distY'))) || edy - ptDist.matrixTransform(this.canvasMatrix).y 

            target.setAttribute("distX", distX.toString())
            target.setAttribute("distY", distY.toString())

            if(event.edges.left === true) target.setAttribute("x", (edx - distX).toString())

            if(event.edges.top === true) target.setAttribute("y", (edy - distY).toString())
            //target.textContent = Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height)
        }
        
        //update attached line
        var targetParent = target.parentElement
        var line = targetParent?.querySelector(".annotLine")
        var dragRects = targetParent?.querySelectorAll(".lineDragRect")

        var rectX = ptTL.matrixTransform(this.canvasMatrix).x.toString()
        var rectY = ptTL.matrixTransform(this.canvasMatrix).y.toString()
        
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
        var target = event.target.querySelector(".annotFO") as HTMLElement
        this.canvasMatrix = (document.getElementById("annotationCanvas") as unknown as SVGGraphicsElement).getScreenCTM().inverse()

        // update overal dimensions
        var ptTL = new DOMPoint(event.rect.left, event.rect.top)
        var ptRB = new DOMPoint(event.rect.right, event.rect.bottom)
        var ptWidth = Math.abs(ptRB.matrixTransform(this.canvasMatrix).x - ptTL.matrixTransform(this.canvasMatrix).x).toString()
        var ptHeight = Math.abs(ptRB.matrixTransform(this.canvasMatrix).y - ptTL.matrixTransform(this.canvasMatrix).y).toString()
        target.style.width = ptWidth + 'px'
        target.style.height = ptHeight + 'px'

        // translate when resizing from top or left edges
        if(event.edges.top === true || event.edges.left === true){
            var pt = new DOMPoint(event.clientX, event.clientY)
            var edx = pt.matrixTransform(this.canvasMatrix).x
            var edy = pt.matrixTransform(this.canvasMatrix).y

            var ptDist = new DOMPoint(target.getBoundingClientRect().x, event.target.getBoundingClientRect().y)
            var distX = (parseFloat(target.getAttribute('distX'))) || edx - ptDist.matrixTransform(this.canvasMatrix).x 
            var distY = (parseFloat(target.getAttribute('distY'))) || edy - ptDist.matrixTransform(this.canvasMatrix).y 

            target.setAttribute("distX", distX.toString())
            target.setAttribute("distY", distY.toString())

            if(event.edges.left === true) target.setAttribute("x", (edx - distX).toString())

            if(event.edges.top === true) target.setAttribute("y", (edy - distY).toString())
            //target.textContent = Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height)
        }
        
        //update attached line
        var targetParent = target.closest("g")
        var line = targetParent?.querySelector(".annotLine")
        var dragRects = targetParent?.querySelectorAll(".lineDragRect")

        var rectX = ptTL.matrixTransform(this.canvasMatrix).x.toString()
        var rectY = ptTL.matrixTransform(this.canvasMatrix).y.toString()
        
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
        var target = event.target.querySelector(".annotFO")
        this.canvasMatrix = (document.getElementById("annotationCanvas") as unknown as SVGGraphicsElement).getScreenCTM().inverse()
        var pt = new DOMPoint(event.clientX, event.clientY)
        var edx = pt.matrixTransform(this.canvasMatrix).x
        var edy = pt.matrixTransform(this.canvasMatrix).y

        var ptDist = new DOMPoint(target.getBoundingClientRect().x, event.target.getBoundingClientRect().y)
        var distX = (parseFloat(target.getAttribute('distX'))) || edx - ptDist.matrixTransform(this.canvasMatrix).x 
        var distY = (parseFloat(target.getAttribute('distY'))) || edy - ptDist.matrixTransform(this.canvasMatrix).y 

        target.setAttribute("distX", distX.toString())
        target.setAttribute("distY", distY.toString())

        target.setAttribute("x", (edx - distX).toString())
        target.setAttribute("y", (edy - distY).toString())

        var targetParent = target.closest("g")
        var line = targetParent.querySelector(".annotLine")
        var dragRects = targetParent.querySelectorAll(".lineDragRect")

        var pt = new DOMPoint(target.getBoundingClientRect().x, target.getBoundingClientRect().y)

        var rectX = pt.matrixTransform(this.canvasMatrix).x.toString() 
        var rectY = pt.matrixTransform(this.canvasMatrix).y.toString() 

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

        var target = event.target as SVGRectElement
        this.canvasMatrix = (document.getElementById("annotationCanvas") as unknown as SVGGraphicsElement).getScreenCTM().inverse()
        this.dragedRect = target
        var pt = new DOMPoint(event.clientX, event.clientY)
        var edx = pt.matrixTransform(this.canvasMatrix).x
        var edy = pt.matrixTransform(this.canvasMatrix).y

        target.setAttribute("x", edx.toString())
        target.setAttribute("y", edy.toString())

        var targetParent = target.closest("g")
        var line = targetParent.querySelector(".annotLine")

        pt = new DOMPoint(target.getBoundingClientRect().x, target.getBoundingClientRect().y)
        var rectX = pt.matrixTransform(this.canvasMatrix).x.toString() 
        var rectY = pt.matrixTransform(this.canvasMatrix).y.toString() 

        if(target.classList.contains("x1")){
            line.setAttribute("x1", rectX)
            line.setAttribute("y1", rectY)
            this.highlightNextAttachObject(target)
        }

        document.dispatchEvent(new Event("annotChanged"))
    }

    /**
     * Highlight the next Element where the lineDragRect could attach to
     * @param lineDragRect 
     * @returns 
     */
    highlightNextAttachObject(lineDragRect: SVGRectElement): Element{

        var pt = new DOMPoint(lineDragRect.getBoundingClientRect().x, lineDragRect.getBoundingClientRect().y)

        var posx = pt.matrixTransform(this.rootMatrix).x //lineDragRect.getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft
        var posy = pt.matrixTransform(this.rootMatrix).y //lineDragRect.getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop
        
        var nextScoreObj = this.m2m.findScoreTarget(posx, posy)
        var nextShapeObj = this.findCustomShapeTarget(posx, posy)
        var possibleCoords = new Array<Coord>()

        var shapeCoord: Coord
        if(nextShapeObj !== null){
            var shapept = new DOMPoint(nextShapeObj.getBoundingClientRect().x, nextShapeObj.getBoundingClientRect().y)
            shapeCoord = {
                obj: nextShapeObj,
                x: shapept.matrixTransform(this.rootMatrix).x, // nextShapeObj.getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft, 
                y: shapept.matrixTransform(this.rootMatrix).y //nextShapeObj.getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop
            }
            possibleCoords.push(shapeCoord)
        }

        if(nextScoreObj != undefined){
            var measurept = new DOMPoint(nextScoreObj.parentMeasure.getBoundingClientRect().x, nextScoreObj.parentMeasure.getBoundingClientRect().y)
            var measureCoord: Coord = {
                obj: nextScoreObj.parentMeasure,
                x: measurept.matrixTransform(this.rootMatrix).x, //nextScoreObj.parentMeasure.getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft, 
                y: measurept.matrixTransform(this.rootMatrix).y //nextScoreObj.parentMeasure.getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop
            } 
            possibleCoords.push(measureCoord)

            var staffpt = new DOMPoint(nextScoreObj.parentStaff.getBoundingClientRect().x, nextScoreObj.parentStaff.getBoundingClientRect().y)
            var staffCoord: Coord = {
                obj: nextScoreObj.parentStaff,
                x: staffpt.matrixTransform(this.rootMatrix).x, //nextScoreObj.parentStaff.getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft, 
                y: staffpt.matrixTransform(this.rootMatrix).y //,nextScoreObj.parentStaff.getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop
            } 
            possibleCoords.push(staffCoord)
            
            var notept = new DOMPoint(document.getElementById(nextScoreObj.id).getBoundingClientRect().x, document.getElementById(nextScoreObj.id).getBoundingClientRect().y)
            var noteCoord: Coord = {
                obj: document.getElementById(nextScoreObj.id),
                x: notept.matrixTransform(this.rootMatrix).x, //document.getElementById(nextScoreObj.id).getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft,  
                y: notept.matrixTransform(this.rootMatrix).y //document.getElementById(nextScoreObj.id).getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop
            }
            possibleCoords.push(noteCoord)
        }

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
            var pt = new DOMPoint(s.getBoundingClientRect().x, s.getBoundingClientRect().y)
            var spt = pt.matrixTransform(this.rootMatrix)
            var dist = Math.sqrt(Math.abs(spt.x - posx)**2 + Math.abs(spt.y - posy)**2)
            if(dist < tempDist){
                tempDist = dist
                nextShape = s
            }
        })
        if(nextShape == undefined){
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

        var otaBBox = objToAttach.getBoundingClientRect()
        this.annotations.some(annot => {
            if(annot.sourceID = parentGroup.id){
                var pt = new DOMPoint(otaBBox.x, otaBBox.y)
                var ptBottom = new DOMPoint(0, otaBBox.bottom)
                var ptRight = new DOMPoint(otaBBox.right, 0)
                var otapt = pt.matrixTransform(this.canvasMatrix)
                var otaptHeight = Math.abs(otapt.y - ptBottom.matrixTransform(this.canvasMatrix).y)
                var otaptWidth = Math.abs(otapt.x - ptRight.matrixTransform(this.canvasMatrix).x)
                annot.targetID = objToAttach.id
                targetx = otapt.x //(objToAttach.getBoundingClientRect().x - this.rootBBox.x - window.pageXOffset - this.root.scrollLeft) * this.scale
                targety = otapt.y //(objToAttach.getBoundingClientRect().y - this.rootBBox.y - window.pageYOffset - this.root.scrollTop) * this.scale


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
                // highlightRect.setAttribute("height", ((objToAttach.getBoundingClientRect().height + 2*highlightMargin) * this.scale).toString())
                // highlightRect.setAttribute("width", ((objToAttach.getBoundingClientRect().width + 2*highlightMargin) * this.scale).toString())
                highlightRect.setAttribute("height", (otaptHeight + 2*highlightMargin).toString())
                highlightRect.setAttribute("width", (otaptWidth + 2*highlightMargin).toString())

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
     * Delete attributes from Elements which are just used temporarily to resize or drag objects
     */
    deleteTempDistances(){
        document.getElementById("annotationCanvas").querySelectorAll("*[distX], *[distY]").forEach(d => {
            d.removeAttribute("distX")
            d.removeAttribute("distY")
        })
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
        this.rootMatrix = (this.root as unknown as SVGGraphicsElement).getScreenCTM().inverse()
        this.canvasMatrix = (document.getElementById("annotationCanvas") as unknown as SVGGraphicsElement).getScreenCTM().inverse()
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

    setScale(scale: number){
        this.scale = scale
        return this
    }

}

export default AnnotationChangeHandler
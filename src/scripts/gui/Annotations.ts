import Handler from "../handlers/Handler";
import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import { constants as c} from "../constants"
import { NoteBBox } from "../utils/Types";
import AnnotationDragHandler from "../handlers/AnnotationDragHandler";
import { Annotation, Coord } from "../utils/Types";
import { uuidv4 } from "../utils/random";
import AnnotationChangeHandler from "../handlers/AnnotationChangeHandler"
import CustomAnnotationDrawer from "./CustomAnnotationDrawer";

class Annotations implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;
    private canvasG: SVGGElement
    private root: HTMLElement
    private rootBBox: DOMRect
    private annotationDragHandler: AnnotationDragHandler
    private annotations: Annotation[]
    private snapCoords: Coord
    private customAnnotationDrawer: CustomAnnotationDrawer;
    private annotationChangeHandler: AnnotationChangeHandler;

    
    constructor(){
        this.addCanvas()
        this.annotations = new Array();
    }
    
    addCanvas(){
        if(typeof this.canvasG === "undefined"){
            this.canvasG = document.createElementNS(c._SVGNS_, "svg")
            this.canvasG.setAttribute("id", "canvasG")
            this.canvasG.classList.add("back")
        }      
        this.root = document.getElementById(c._ROOTSVGID_)
        if(this.canvasG.classList.contains("back")){
            this.root.insertBefore(this.canvasG, this.root.lastChild.nextSibling)
        }else{
            this.root.insertBefore(this.canvasG, this.root.firstChild)
        }
        this.rootBBox = this.root.getBoundingClientRect()
    }

    setMenuClickHandler(){
        document.getElementById("activateAnnot").addEventListener("click", this.clickHandler)
        return this
    }
    
    setListeners() {

        this.annotationDragHandler = new AnnotationDragHandler()
        this.annotationDragHandler.setSnapToObjCallback(this.snapToObj.bind(this))
        this.annotationDragHandler.sethighlightObjectCallback(this.highlightNextAttachObject.bind(this))
        this.annotationDragHandler.setUpdateCallback(this.resetListeners.bind(this))

        this.customAnnotationDrawer = new CustomAnnotationDrawer()
        this.customAnnotationDrawer.setUpdateCallback(this.resetListeners.bind(this))

        this.annotationChangeHandler = new AnnotationChangeHandler()
        this.annotationChangeHandler.setUpdateCallback(this.resetListeners.bind(this))

        document.getElementById("rootSVG").addEventListener("click", this.createAnnotationHandler)
        var that = this
        document.querySelectorAll(".annotDiv").forEach(ad => {
            ad.addEventListener("click", this.selectHandler)
            ad.addEventListener("dblclick", this.activateEditHandler)
            ad.addEventListener("focus", function(){
                that.musicPlayer.removePlayListener()
            })
    
            ad.addEventListener("blur", function(){
                that.musicPlayer.setPlayListener()
            })

            ad.addEventListener("keydown", this.submitLabelHandler)
        })
        document.querySelectorAll(".customAnnotShape").forEach(cas => {
            cas.addEventListener("dblclick", this.selectHandler)
        })
        
        document.addEventListener("keydown", this.deleteHandler)
        //document.addEventListener("click", this.unselectHandler)
        return this
    }

    removeListeners() {
        document.getElementById("activateAnnot").removeEventListener("click", this.clickHandler)
        this.setMenuClickHandler()
        document.getElementById("rootSVG").removeEventListener("click", this.createAnnotationHandler)
        document.querySelectorAll(".annotDiv").forEach(ad => {
            ad.setAttribute("contenteditable", "false")
            ad.removeEventListener("click", this.selectHandler)
            ad.removeEventListener("dblclick", this.activateEditHandler)
        })
        document.querySelectorAll(".lineDragRect").forEach(ldr => ldr.remove())

        // there can be an annotation instance to draw the canvas before annotation is used 
        if(typeof this.annotationDragHandler !== "undefined"){
            this.annotationDragHandler
                .removeListeners()
                .removeUpdateAnnotationIDsCallback()
        
            this.customAnnotationDrawer
                .removeListeners()

            this.annotationChangeHandler.removeListeners()
        }

        document.querySelectorAll(".customAnnotShape").forEach(cas => {
            cas.removeEventListener("dblclick", this.selectHandler)
        })
        document.removeEventListener("keydown", this.deleteHandler)

        return this
    }

    resetListeners(){
        this.removeListeners();
        this.setListeners()
    }

    setCustomShapeListener(){
        var customShapes = null
    }

    ////HANDLERS////

    clickHandler = (function clickHandler(e: MouseEvent){
        e.preventDefault()
        if(!this.canvasG.classList.contains("front")){
            this.setToFront()
        }else{
            this.setToBack()
        }
    }).bind(this)

    createAnnotationHandler = (function createAnnotationHandler (e: MouseEvent){
        if((e.target as HTMLElement).id !== c._ROOTSVGID_){
            return 
        }

        var selcount = 0
        this.canvasG.querySelectorAll(":scope > .selected").forEach(el => {
            el.classList.remove("selected")
            selcount += 1
        })
        if(selcount > 0){
            return
        }

        var posx = e.pageX - this.rootBBox.x - window.pageXOffset
        var posy = e.pageY - this.rootBBox.y - window.pageYOffset
        var annotationTarget = this.m2m.findScoreTarget(posx, posy)

        var textGroup = document.createElementNS(c._SVGNS_, "g")
        textGroup.setAttribute("id", uuidv4())

        var text = document.createElementNS(c._SVGNS_, "svg")
        text.classList.add("annotText")

        var textForeignObject = document.createElementNS(c._SVGNS_, "foreignObject")
        textForeignObject.classList.add("annotFO")
        var textDiv = document.createElement("div")
        textDiv.setAttribute("contenteditable", "false")
        textDiv.setAttribute("data-text", "New Annotation")
        textDiv.textContent = ""
        textDiv.classList.add("annotDiv")
        text.append(textForeignObject)

        document.body.appendChild(textDiv)

        var rectPadding = 5

        text.setAttribute("x", (posx + rectPadding).toString())
        text.setAttribute("y", (posy).toString())

        textForeignObject.setAttribute("x", "0")
        textForeignObject.setAttribute("y", "0")
        textForeignObject.setAttribute("height", (textDiv.clientHeight + 2*rectPadding).toString())
        textForeignObject.setAttribute("width", (100+2*rectPadding).toString())

        var line = document.createElementNS(c._SVGNS_, "line")
        line.classList.add("annotLine")
        line.setAttribute("x1", text.x.baseVal.valueAsString)
        line.setAttribute("y1", text.y.baseVal.valueAsString)
        line.setAttribute("x2", (annotationTarget.x - this.rootBBox.x - window.pageXOffset).toString())
        line.setAttribute("y2", (annotationTarget.y - this.rootBBox.y - window.pageYOffset).toString())
        line.classList.add("annotLine")

        textForeignObject.append(textDiv)
        textGroup.appendChild(text)
        textGroup.appendChild(line)

        var newAnnot: Annotation = {
            sourceID: textGroup.id,
            targetID: annotationTarget.id,
            // relativePos: {
            //     x: textGroup.getBoundingClientRect().x - annotationTarget.getBoundingClientRect().x, 
            //     y: textGroup.getBoundingClientRect().y - annotationTarget.getBoundingClientRect().y
            // }
        }

        this.annotations.push(newAnnot)
        
       this.canvasG.appendChild(textGroup)
       this.deactivateEdit()
       this.resetListeners()
    }).bind(this)

    selectHandler = (function selectHandler(e: MouseEvent){
        var t = e.target as Element

        if(t.classList.contains("annotDiv")){
            t = t.tagName === "svg" ? t : t.closest("svg") as Element
            //Add A selection Rect to line target
            document.querySelectorAll(".lineDragRect").forEach(ldr => ldr.remove())
            var line = t.closest("g").querySelector(".annotLine") as SVGLineElement
            var lineDragRect = document.createElementNS(c._SVGNS_, "rect")
            t.closest("g").appendChild(lineDragRect)
            lineDragRect.classList.add("lineDragRect")
            lineDragRect.setAttribute("x", line.x2.baseVal.valueAsString)
            lineDragRect.setAttribute("y", line.y2.baseVal.valueAsString)
            this.annotationDragHandler.initDragRects()
        }

        t.classList.add("selected")

    }).bind(this)

    unselectHandler = (function unselectHandler(e: MouseEvent){
        this.canvasG.querySelectorAll(":scope > .selected").forEach(el => {
            el.classList.remove("selected")
        })
    }).bind(this)

    /**
     * Set Contenteditable True when doubleclicked
     * @param e Doubleclick
     */
    activateEditHandler = (function activateEditHandler(e: MouseEvent){
        this.annotationDragHandler.removeListeners()
        var target = e.target as HTMLElement
        target.setAttribute("contenteditable", "true")

        target.focus()
    }).bind(this)

    deactivateEdit(){
        document.querySelectorAll(".annotDiv").forEach(ad => {
            ad.setAttribute("contenteditable", "false")
            ad.removeEventListener("dblclick", this.activateEditHandler)
        })
        this.annotationDragHandler = new AnnotationDragHandler()
    }

    /**
     * Delete all selected elements by pressing delete
     * @param e Keyboardevent (code = Delete)
     */
    deleteHandler = (function deleteHandler(e: KeyboardEvent){
        if(e.code === "Delete" && document.body.classList.contains("annotMode")){
            document.querySelectorAll(".annotText.selected, .customAnnotShape.selected").forEach(el => {
                if(el.closest("g") !== null){
                    el.closest("g").remove()
                }else{
                    el.remove();
                }
            })
        }
    }).bind(this)

    submitLabelHandler = (function submitHandler(e: KeyboardEvent){
        var target = e.target as HTMLElement
        if((e.key === "Enter" || e.key === "Escape")){
            target.blur()
        }
    }).bind(this)

    update(){
        this.addCanvas()
        if(this.canvasG.classList.contains("back")){
            this.removeListeners()
        }else{
            this.resetListeners()
        }
    }

    /////////// UTILITIES //////////////

    /**
     * Put CanvasG to Front for editing
     * @returns 
     */
    setToFront(){
        this.canvasG.classList.remove("back")
        this.canvasG.classList.add("front")
        this.root.insertBefore(this.canvasG, this.root.lastChild.nextSibling)
        this.setListeners()
        document.body.classList.add("annotMode")

        return this
    }

    /**
     * Set CanvasG to Back, when in different mode
     * @returns 
     */
    setToBack(){
        this.canvasG.classList.remove("front")
        this.canvasG.classList.add("back")
        this.root.insertBefore(this.canvasG, this.root.firstChild)
        this.removeListeners()
        document.body.classList.remove("annotMode")

        return this
    }

    /**
     * Find Score Element nearest to given Position (e.g. Mouse)
     * @param posx 
     * @param posy 
     * @returns 
     */
    findScoreTarget(posx: number, posy: number): NoteBBox{
        var notes = this.m2m.getNoteBBoxes()
        var nextNote: NoteBBox
        var tempDist: number = Math.pow(10, 10)
        notes.forEach(n => {
            var dist = Math.sqrt(Math.abs(n.x - this.rootBBox.x - window.pageXOffset - posx)**2 + Math.abs(n.y - this.rootBBox.y - window.pageYOffset - posy)**2)
            if(dist < tempDist){
                tempDist = dist
                nextNote = n
            }
        })
        return nextNote
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
     * 
     * @param lineDragRect 
     * @returns Element to Highlight
     */
    highlightNextAttachObject(lineDragRect: SVGRectElement): Element{
        var posx = lineDragRect.x.baseVal.value
        var posy =  lineDragRect.y.baseVal.value
        var nextScoreObj = this.m2m.findScoreTarget(posx, posy)
        var nextShapeObj = this.findCustomShapeTarget(posx, posy)
        var possibleCoords = new Array<Coord>()

        var shapeCoord: Coord
        if(nextShapeObj !== null){
            shapeCoord = {
                obj: nextShapeObj,
                x: nextShapeObj.getBoundingClientRect().x - this.rootBBox.x, 
                y: nextShapeObj.getBoundingClientRect().y - this.rootBBox.y
            }
            possibleCoords.push(shapeCoord)
        }

        var measureCoord: Coord = {
            obj: nextScoreObj.parentMeasure,
            x: nextScoreObj.parentMeasure.getBoundingClientRect().x - this.rootBBox.x, 
            y: nextScoreObj.parentMeasure.getBoundingClientRect().y - this.rootBBox.y
        } 
        possibleCoords.push(measureCoord)

        var staffCoord: Coord = {
            obj: nextScoreObj.parentStaff,
            x: nextScoreObj.parentStaff.getBoundingClientRect().x - this.rootBBox.x, 
            y: nextScoreObj.parentStaff.getBoundingClientRect().y - this.rootBBox.y
        } 
        possibleCoords.push(staffCoord)
        
        var noteCoord: Coord = {
            obj: document.getElementById(nextScoreObj.id),
            x: document.getElementById(nextScoreObj.id).getBoundingClientRect().x - this.rootBBox.x, 
            y: document.getElementById(nextScoreObj.id).getBoundingClientRect().y - this.rootBBox.y 
        }
        possibleCoords.push(noteCoord)

        var tempDist: number = Math.pow(10, 10)
        var objToHighlight: Element; 
        possibleCoords.forEach(coord => {
            var dist = Math.sqrt(Math.abs(coord.x - posx)**2 + Math.abs(coord.y - posy)**2)
            if(dist < tempDist){
                tempDist = dist
                objToHighlight = coord.obj
            }
        })
        this.updateAnnotationIDs(objToHighlight, lineDragRect)
        return objToHighlight
    }

    /**
     * Update Set of saved Annotations and their relations to Shapes or Score
     * @param objToAttach 
     * @param lineDragRect 
     */
    updateAnnotationIDs(objToAttach: Element, lineDragRect: SVGRectElement){
        var line: Element
        var targetx: number
        var targety: number
        var highlightRect: SVGRectElement
        var parentGroup = lineDragRect.closest("g")
        this.annotations.some(annot => {
            if(annot.sourceID = parentGroup.id){
                annot.targetID = objToAttach.id
                targetx = objToAttach.getBoundingClientRect().x - this.rootBBox.x
                targety = objToAttach.getBoundingClientRect().y - this.rootBBox.y
                line = document.getElementById(annot.sourceID).querySelector(".annotLine")


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
                highlightRect.setAttribute("height", (objToAttach.getBoundingClientRect().height + 2*highlightMargin).toString())
                highlightRect.setAttribute("width", (objToAttach.getBoundingClientRect().width + 2*highlightMargin).toString())

                return annot.sourceID === parentGroup.id
            }
        })

        this.snapCoords = {
            obj: line,
            x: targetx,
            y: targety
        }

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
     * @param line Dragged Line
     */
    snapToObj(line: SVGLineElement){
        line.setAttribute("x2", this.snapCoords.x.toString())
        line.setAttribute("y2", this.snapCoords.y.toString())
        var lineDragRect = line.closest("svg").querySelector(".lineDragRect") as SVGRectElement
        lineDragRect.setAttribute("x", this.snapCoords.x.toString())
        lineDragRect.setAttribute("y", this.snapCoords.y.toString())

        // clean up after snap
        this.canvasG.querySelectorAll("g").forEach(el => {
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

    
    updatePositions(){
        console.log(this.annotations)
        this.annotations.forEach(a => {
            var source = document.getElementById(a.sourceID)
            if(typeof a.targetID === "string"){
                var target = document.getElementById(a.targetID)
                var targetRect = target.getBoundingClientRect()
                Array.from(source.children).forEach(c => {
                    c.setAttribute("x", targetRect.x.toString())
                    c.setAttribute("y", targetRect.y.toString())
                })
                
            }
        })
    }

    ////////// GETTER/ SETTER////////////

    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
        return this
    }

    setMusicPlayer(musicPlayer: MusicPlayer){
        this.musicPlayer = musicPlayer
        return this
    }

    getCanvasGroup(): SVGGElement{
        return this.canvasG
    }
    
}

export default Annotations
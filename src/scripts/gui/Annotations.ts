import Handler from "../handlers/Handler";
import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import { constants as c} from "../constants"
import { NoteBBox } from "../utils/Types";
import { Annotation, Coord } from "../utils/Types";
import { uuidv4 } from "../utils/random";
import AnnotationChangeHandler from "../handlers/AnnotationChangeHandler"
import CustomAnnotationShapeDrawer from "../handlers/CustomAnnotationShapeDrawer";

class Annotations implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;
    private annotationCanvas: SVGGElement
    private root: HTMLElement
    private rootBBox: DOMRect
    private annotations: Annotation[]
    private snapCoords: Coord
    private customAnnotationDrawer: CustomAnnotationShapeDrawer;
    private annotationChangeHandler: AnnotationChangeHandler;

    x
    constructor(){
        this.addCanvas()
        this.annotations = new Array();
    }
    
    addCanvas(){
        if(typeof this.annotationCanvas === "undefined"){
            this.annotationCanvas = document.createElementNS(c._SVGNS_, "svg")
            this.annotationCanvas.setAttribute("id", "annotationCanvas")
            this.annotationCanvas.classList.add("back")
        }      
        this.root = document.getElementById(c._ROOTSVGID_)
        if(this.annotationCanvas.classList.contains("back")){
            this.root.insertBefore(this.annotationCanvas, this.root.lastChild.nextSibling)
        }else{
            this.root.insertBefore(this.annotationCanvas, this.root.firstChild)
        }
        this.rootBBox = this.root.getBoundingClientRect()
    }

    setMenuClickHandler(){
        document.getElementById("activateAnnot").addEventListener("click", this.clickHandler)
        return this
    }
    
    setListeners() {

        this.customAnnotationDrawer = new CustomAnnotationShapeDrawer()
        this.customAnnotationDrawer.setUpdateCallback(this.resetListeners.bind(this))

        this.annotationChangeHandler = new AnnotationChangeHandler()
        this.annotationChangeHandler
            .setUpdateCallback(this.resetListeners.bind(this))
            .setM2M(this.m2m)
            .setAnnotations(this.annotations)

        document.getElementById(c._ROOTSVGID_).addEventListener("click", this.createAnnotationHandler)
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
        return this
    }

    removeListeners() {
        document.getElementById("activateAnnot").removeEventListener("click", this.clickHandler)
        this.setMenuClickHandler()
        document.getElementById(c._ROOTSVGID_).removeEventListener("click", this.createAnnotationHandler)
        document.querySelectorAll(".annotDiv").forEach(ad => {
            ad.setAttribute("contenteditable", "false")
            ad.removeEventListener("click", this.selectHandler)
            ad.removeEventListener("dblclick", this.activateEditHandler)
        })
        document.querySelectorAll(".lineDragRect").forEach(ldr => ldr.remove())

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
        if(!this.annotationCanvas.classList.contains("front")){
            this.setToFront()
        }else{
            this.setToBack()
        }
    }).bind(this)

    createAnnotationHandler = (function createAnnotationHandler (e: MouseEvent){
       var selectedAnnotations = document.getElementById("annotationCanvas").querySelectorAll(".annotText.selected")
       if(selectedAnnotations.length === 0){
           this.createAnnotation(e)
       }else{
           selectedAnnotations.forEach(sa => {
               sa.classList.remove("selected")
           })
       }
    }).bind(this)

    /**
     * Create a new annotation Instance
     * @param e 
     * @returns 
     */
    createAnnotation(e: MouseEvent){
        if((e.target as HTMLElement).id !== c._ROOTSVGID_){
            return 
        }

        var selcount = 0
        this.annotationCanvas.querySelectorAll(":scope > .selected").forEach(el => {
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

        text.setAttribute("x", "0")
        text.setAttribute("y", "0")

        textForeignObject.setAttribute("x", (posx + rectPadding).toString())
        textForeignObject.setAttribute("y", (posy).toString())
        textForeignObject.setAttribute("height", (textDiv.clientHeight + 2*rectPadding).toString())
        textForeignObject.setAttribute("width", (100+2*rectPadding).toString())

        var line = document.createElementNS(c._SVGNS_, "line")
        line.classList.add("annotLine")
        line.setAttribute("x1", textForeignObject.x.baseVal.valueAsString)
        line.setAttribute("y1", textForeignObject.y.baseVal.valueAsString)
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
        
       this.annotationCanvas.appendChild(textGroup)
       this.deactivateEdit()
       this.resetListeners()
    }

    selectHandler = (function selectHandler(e: MouseEvent){
        this.select(e)
    }).bind(this)

    /**
     * Mark an annotation as selected.
     * @param e 
     */
    select(e: MouseEvent){
        e.stopPropagation() //do not trigger other events
        var t = e.target as Element
        if(t.classList.contains("annotDiv")){
            t = t.tagName === "svg" ? t : t.closest("svg") as Element
            //Add A selection Rect to line target
            document.querySelectorAll(".lineDragRect").forEach(ldr => ldr.remove())
            var line = t.closest("g").querySelector(".annotLine") as SVGLineElement
            //Rect attacted to x2 target
            var lineDragRect = document.createElementNS(c._SVGNS_, "rect")
            t.closest("g").appendChild(lineDragRect)
            lineDragRect.classList.add("lineDragRect")
            lineDragRect.classList.add("x2")
            lineDragRect.setAttribute("x", line.x2.baseVal.valueAsString)
            lineDragRect.setAttribute("y", line.y2.baseVal.valueAsString)

            //Rect attacted to x1 target
            lineDragRect = document.createElementNS(c._SVGNS_, "rect")
            t.closest("g").appendChild(lineDragRect)
            lineDragRect.classList.add("lineDragRect")
            lineDragRect.classList.add("x1")
            lineDragRect.setAttribute("x", line.x1.baseVal.valueAsString)
            lineDragRect.setAttribute("y", line.y1.baseVal.valueAsString)

            //this.AnnotationLineHandler.initDragRects()
        }
        t.classList.add("selected")
    }

    /**
     * Set Contenteditable True when doubleclicked
     * @param e Doubleclick
     */
    activateEditHandler = (function activateEditHandler(e: MouseEvent){
        var target = e.target as HTMLElement
        target.setAttribute("contenteditable", "true")

        target.focus()
    }).bind(this)

    deactivateEdit(){
        document.querySelectorAll(".annotDiv").forEach(ad => {
            ad.setAttribute("contenteditable", "false")
            ad.removeEventListener("dblclick", this.activateEditHandler)
        })
    }

    /**
     * Delete all selected elements by pressing delete. Except: When any Elements are in Editable mode
     * @param e Keyboardevent (code = Delete)
     */
    deleteHandler = (function deleteHandler(e: KeyboardEvent){
        var isValidKey = ["Delete", "Backspace"].some(code => e.code === code)
        var isInAnnotMode = document.body.classList.contains("annotMode")
        var hasEditableElement = document.querySelectorAll("*[contenteditable=true]").length > 0

        if(isValidKey && isInAnnotMode && !hasEditableElement){
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
        if(this.annotationCanvas.classList.contains("back")){
            this.removeListeners()
        }else{
            this.resetListeners()
        }
    }

    /////////// UTILITIES //////////////

    /**
     * Put annotationCanvas to Front for editing
     * @returns 
     */
    setToFront(){
        this.annotationCanvas.classList.remove("back")
        this.annotationCanvas.classList.add("front")
        this.root.insertBefore(this.annotationCanvas, this.root.lastChild.nextSibling)
        this.setListeners()
        document.body.classList.add("annotMode")

        return this
    }

    /**
     * Set annotationCanvas to Back, when in different mode
     * @returns 
     */
    setToBack(){
        this.annotationCanvas.classList.remove("front")
        this.annotationCanvas.classList.add("back")
        this.root.insertBefore(this.annotationCanvas, this.root.firstChild)
        this.removeListeners()
        document.body.classList.remove("annotMode")

        return this
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

    getAnnotationCanvas(): SVGGElement{
        return this.annotationCanvas
    }
    
}

export default Annotations
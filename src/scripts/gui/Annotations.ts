import Handler from "../handlers/Handler";
import MusicPlayer from "../MusicPlayer";
import { Mouse2SVG } from "../utils/Mouse2SVG";
import { constants as c} from "../constants"
import { NoteBBox } from "../utils/Types";
import { Annotation, Coord } from "../utils/Types";
import { uuidv4 } from "../utils/random";
import AnnotationChangeHandler from "../handlers/AnnotationChangeHandler"
import CustomAnnotationShapeDrawer from "../handlers/CustomAnnotationShapeDrawer";
import LabelHandler from "../handlers/LabelHandler";
import * as cq from "../utils/convenienceQueries"
import * as coordinates from "../utils/coordinates"

class Annotations implements Handler{
    m2s?: Mouse2SVG;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;
    private annotationCanvas: SVGSVGElement
    private rootBBox: DOMRect
    private annotations: Annotation[]
    private snapCoords: Coord
    private customAnnotationDrawer: CustomAnnotationShapeDrawer;
    private annotationChangeHandler: AnnotationChangeHandler;
    private undoStacks: Array<Array<Element>>;
    private redoStacks: Array<Array<Element>>;
    private annotList: Element
    private harmonyLabelHandler: LabelHandler;
    private containerId: string
    private container: Element
    private vrvSVG: Element
    private interactionOverlay: Element

    constructor(containerId: string){
        this.setContainerId(containerId)
        this.addCanvas()
        this.annotations = new Array();
    }
    
    addCanvas(){
        this.interactionOverlay = cq.getInteractOverlay(this.containerId)
        this.rootBBox = this.interactionOverlay.getBoundingClientRect() //this.vrvSVG.getBoundingClientRect()
        var rootWidth = this.rootBBox.width.toString()
        var rootHeigth = this.rootBBox.height.toString()
        var vb = this.interactionOverlay.getAttribute("viewBox") //this.vrvSVG.getAttribute("viewBox")
        
        if(this.annotationCanvas == undefined){
            this.annotationCanvas = document.createElementNS(c._SVGNS_, "svg")
            this.annotationCanvas.setAttribute("id", "annotationCanvas")
            this.annotationCanvas.classList.add("canvas")
            //this.annotationCanvas.classList.add("back")
            //this.annotationCanvas.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
            
        }
        this.annotationCanvas.setAttribute("viewBox", vb)
        
        if(this.annotationCanvas.classList.contains("front")){
            this.interactionOverlay.insertBefore(this.annotationCanvas, this.interactionOverlay.lastChild.nextSibling)
        }else{
            this.interactionOverlay.insertBefore(this.annotationCanvas, this.interactionOverlay.firstChild)
        }
    }

    setMenuClickHandler(){
       //this.container.querySelector("#activateAnnot")?.addEventListener("click", this.clickHandler)
        return this
    }

    setListeners(){
        this.resetTextListeners()
        this.customAnnotationDrawer = new CustomAnnotationShapeDrawer(this.containerId)
        this.customAnnotationDrawer.setUpdateCallback(this.resetTextListeners.bind(this))
        var harmonyButton = this.container.querySelector("#harmonyAnnotButton")
        var that = this 
        this.container.querySelectorAll("#staticTextButton, #linkedAnnotButton").forEach(b => {
            b.addEventListener("click", function(){
                that.setToFront()
                that.resetTextListeners()
                b.dispatchEvent(new Event("annotationButtonClicked"))
            })
        })

        harmonyButton.addEventListener("click", function(){
                that.removeTextListeners()
                harmonyButton.dispatchEvent(new Event("annotationButtonClicked"))
        })
    }

    removeListeners(){
        this.removeTextListeners()
    }
    
    setTextListeners() {
        // this.customAnnotationDrawer = new CustomAnnotationShapeDrawer(this.containerId)
        // this.customAnnotationDrawer.setUpdateCallback(this.resetTextListeners.bind(this))

        this.annotationChangeHandler = this.annotationChangeHandler || new AnnotationChangeHandler(this.containerId)
        this.annotationChangeHandler
            .setUpdateCallback(this.resetTextListeners.bind(this))
            .setm2s(this.m2s)
            .setAnnotations(this.annotations)
            .update()
            .resetListeners()

        this.interactionOverlay.addEventListener("dblclick", this.createAnnotationHandler)
        var that = this
        this.interactionOverlay.querySelectorAll(".annotDiv").forEach(ad => {
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
        this.interactionOverlay.querySelectorAll(".customAnnotShape").forEach(cas => {
            cas.addEventListener("dblclick", this.selectHandler)
        })
        
        document.addEventListener("keydown", this.deleteHandler)

        document.addEventListener("annotationCanvasChanged", this.updateUndoStacks, true)
        //document.addEventListener("annotationCanvasChanged", this.updateRedoStacks)

        return this
    }

    removeTextListeners() {
        //this.container.querySelector("#activateAnnot").removeEventListener("click", this.clickHandler)
        this.setMenuClickHandler()
        this.interactionOverlay.removeEventListener("dblclick", this.createAnnotationHandler)
        this.interactionOverlay.querySelectorAll(".annotDiv").forEach(ad => {
            ad.closest("svg")?.classList.remove("selected")
            ad.setAttribute("contenteditable", "false")
            ad.removeEventListener("click", this.selectHandler)
            ad.removeEventListener("dblclick", this.activateEditHandler)
        })
        this.interactionOverlay.querySelectorAll(".lineDragRect").forEach(ldr => ldr.remove())

        this.interactionOverlay.querySelectorAll(".customAnnotShape").forEach(cas => {
            cas.removeEventListener("dblclick", this.selectHandler)
        })
        document.removeEventListener("keydown", this.deleteHandler)
        this.customAnnotationDrawer?.removeListeners()
        
        // interaction with all the annotations should always be possible
        //this.annotationChangeHandler?.removeListeners()

        return this
    }

    resetTextListeners(){
        this.removeTextListeners();
        this.setTextListeners()
    }

    resetListeners(){
        this.resetTextListeners()
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
        var t = e.target as Element
        if(t.closest(".vseContainer")?.classList.contains("clickmode")) return // creation should only be possible when annotation tab is on
       var selectedAnnotations = this.interactionOverlay.querySelectorAll("#annotationCanvas .selected")
       if(selectedAnnotations.length === 0){
           this.createAnnotation(e)
       }else{
           selectedAnnotations.forEach(sa => {
               sa.classList.remove("selected")
           })
       }
    }).bind(this)


    /**
     * Select a specific annotation methon based on selected button
     * @param e 
     */
    createAnnotation(e: MouseEvent){
        var selectedButton = this.container.querySelector("#annotGroupKM > .selected")?.id
        if(selectedButton === null) return
        switch(selectedButton){
            case "linkedAnnotButton":
                this.createTextAnnotation(e, selectedButton)
                break;
            case "staticTextButton":
                this.createTextAnnotation(e, selectedButton)
                break;
            case "harmonyAnnotButton":
                //this.createHarmonyAnnot(e)
                console.log(selectedButton, "Please implement me o(；△；)o")
                break;
            default:
                console.log("There is no implementation at all")
        }
    }

    /**
     * Create a new linked annotation Instance
     * @param e 
     * @returns 
     */
    createTextAnnotation(e: MouseEvent, textButtonId: string){
        if((e.target as HTMLElement).id !== this.interactionOverlay.id){
            return 
        }
        this.setToFront()
        var selcount = 0
        this.annotationCanvas.querySelectorAll(":scope > .selected").forEach(el => {
            el.classList.remove("selected")
            selcount += 1
        })
        if(selcount > 0){
            return
        }

        var isLinked = false;
        var isStaticText = false
        switch(textButtonId){
            case "linkedAnnotButton":
                isLinked = true;
                break;
            case "staticTextButton":
                isStaticText = true;
                break;
        }

        var pt = coordinates.transformToDOMMatrixCoordinates(e.clientX, e.clientY, cq.getInteractOverlay(this.containerId))
    
        var posx = pt.x //matrixTransform(rootMatrix).x //e.pageX - this.rootBBox.x - window.pageXOffset
        var posy = pt.y //matrixTransform(rootMatrix).y //e.pageY - this.rootBBox.y - window.pageYOffset
        var annotationTarget = this.m2s.findScoreTarget(posx, posy, false)

        var textGroup = document.createElementNS(c._SVGNS_, "g")
        textGroup.setAttribute("id", uuidv4())
        textGroup.setAttribute("targetId", annotationTarget.id)

        var text = document.createElementNS(c._SVGNS_, "svg")
    
        if(isLinked) text.classList.add("annotLinkedText")
        else if(isStaticText) text.classList.add("annotStaticText")

        var textForeignObject = document.createElementNS(c._SVGNS_, "foreignObject")
        textForeignObject.classList.add("annotFO")
        
        var textDiv = document.createElement("div")
        textDiv.setAttribute("contenteditable", "false")
        textDiv.setAttribute("data-text", "New Annotation")
        textDiv.textContent = ""
        textDiv.classList.add("annotDiv")
        text.append(textForeignObject)

        this.container.appendChild(textDiv)

        var rectPadding = 5

        // text.setAttribute("x", "0")
        // text.setAttribute("y", "0")

        textForeignObject.setAttribute("x", (posx + rectPadding).toString())
        textForeignObject.setAttribute("y", posy.toString())
        textForeignObject.setAttribute("height", (50+ 2*rectPadding + 10 ).toString())
        textForeignObject.setAttribute("width", (50+2*rectPadding+50).toString())

        if(isLinked){
            var line = document.createElementNS(c._SVGNS_, "line")
            line.classList.add("annotLine")
            line.setAttribute("x2", textForeignObject.x.baseVal.valueAsString)
            line.setAttribute("y2", textForeignObject.y.baseVal.valueAsString)
            line.setAttribute("x1", annotationTarget.x.toString()) //(annotationTarget.x - this.rootBBox.x - window.pageXOffset).toString())
            line.setAttribute("y1", annotationTarget.y.toString()) //(annotationTarget.y - this.rootBBox.y - window.pageYOffset).toString())
            line.classList.add("annotLine")
            textGroup.appendChild(line)
        }

        textForeignObject.append(textDiv)
        textGroup.appendChild(text)

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
        this.resetTextListeners()

        this.interactionOverlay.dispatchEvent(new Event("annotChanged"))
        this.interactionOverlay.dispatchEvent(new Event("annotationCanvasChanged"))

    }

    selectHandler = (function selectHandler(e: MouseEvent){
        this.select(e)
    }).bind(this)

    updateUndoStacks = (function updateUndoStacks(e: Event){
        if(!cq.hasActiveElement(this.containerId)){return}
        var canvasClone = this.interactionOverlay.querySelector("#annotationCanvas").cloneNode(true) as Element
        var listClone = this.container.querySelector("#annotList").cloneNode(true) as Element
        this.annotList = this.container.querySelector("#annotList")
        this.undoStacks.push([canvasClone, listClone])
        this.annotationCanvas = this.interactionOverlay.querySelector("#annotationCanvas")
    }).bind(this)

    updateRedoStacks = (function updateRedoStacks(e: Event){
        if(!cq.hasActiveElement(this.containerId)){return}
        this.redoStacks.push([this.annotationCanvas, this.annotList])
        this.annotationCanvas = this.undoStacks[0][0]
        this.annotList = this.undoStacks[0][1]
    }).bind(this)

    /**
     * Mark an annotation as selected.
     * @param e 
     */
    select(e: MouseEvent){
        e.stopPropagation() //do not trigger other events
        var t = e.target as Element
        if(t.classList.contains("annotDiv") && t.closest(".annotLinkedText") !== null){ // only apply for linked texts
            //Add A selection Rect to line target
            this.interactionOverlay.querySelectorAll(".lineDragRect").forEach(ldr => ldr.remove())
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

        t?.closest("svg")?.classList?.add("selected")
        this.annotationChangeHandler.resetListeners()
    }

    /**
     * Set Contenteditable True when doubleclicked
     * @param e Doubleclick
     */
    activateEditHandler = (function activateEditHandler(e: MouseEvent){
        var target = e.target as HTMLElement
        target.setAttribute("contenteditable", "true")

        target.focus()
        this.annotationChangeHandler.removeListeners()
    }).bind(this)

    deactivateEdit(){
        this.interactionOverlay.querySelectorAll(".annotDiv").forEach(ad => {
            ad.setAttribute("contenteditable", "false")
            ad.removeEventListener("dblclick", this.activateEditHandler)
        })
        this.annotationChangeHandler.removeListeners()
    }

    /**
     * Delete all selected elements by pressing delete. Except: When any Elements are in Editable mode
     * @param e Keyboardevent (code = Delete)
     */
    deleteHandler = (function deleteHandler(e: KeyboardEvent){
        if(!cq.hasActiveElement(this.containerId)){return}
        var isValidKey = ["Delete", "Backspace"].some(code => e.code === code)
        //var isInAnnotMode = this.container.classList.contains("annotMode")
        var hasEditableElement = this.interactionOverlay.querySelectorAll(".selected [contenteditable=true]").length > 0
        var listHasFocus = Array.from(this.container.querySelectorAll("#annotList > *")).some(le => le === document.activeElement)

        //if(isValidKey && isInAnnotMode && !hasEditableElement && !listHasFocus){
        if(isValidKey && !hasEditableElement && !listHasFocus){
            this.interactionOverlay.querySelectorAll("#annotationCanvas .selected").forEach(el => {
                if(el.closest("g") !== null){
                    el.closest("g").remove()
                }else{
                    el.remove();
                }
            })
            this.interactionOverlay.dispatchEvent(new Event("annotChanged"))
            this.interactionOverlay.dispatchEvent(new Event("annotationCanvasChanged"))
        }
    }).bind(this)

    submitLabelHandler = (function submitHandler(e: KeyboardEvent){
        var target = e.target as HTMLElement
        if((e.key === "Enter" || e.key === "Escape")){
            target.blur()
            this.interactionOverlay.dispatchEvent(new Event("annotChanged"))
            this.interactionOverlay.dispatchEvent(new Event("annotationCanvasChanged"))
        }
    }).bind(this)

    updateCanvas(){
        this.addCanvas()
        this.annotationChangeHandler?.update()
        if(this.annotationCanvas.classList.contains("back")){
            this.removeListeners()
        }else{
            this.resetTextListeners()
        }
    }

    updateAnnotationList(annotionCanvs: SVGSVGElement){
        //TODO: Aktuallsieren des Datenmodells aus den Informarionen in der SVG: übersetzen der SVG in Annotation-Objekte
        var that = this
        this.annotationCanvas = annotionCanvs
        this.annotationCanvas.querySelectorAll(":scope > g").forEach(g => {
            var a: Annotation = {
                sourceID: g.id,
                targetID: g.getAttribute("targetId")
            }                     
            that.annotations.push(a)
        })
        this.interactionOverlay.dispatchEvent(new Event("annotChanged"))
        this.resetTextListeners()
    }

    /////////// UTILITIES //////////////

    /**
     * Put annotationCanvas to Front for editing
     * @returns 
     */
    setToFront(): Annotations{
        if( this.annotationCanvas.classList.contains("front")){return this}
        this.annotationCanvas.classList.remove("back")
        this.annotationCanvas.classList.add("front")
        this.interactionOverlay.insertBefore(this.getAnnotationCanvas(), this.interactionOverlay.lastChild.nextSibling)
        this.setListeners()
        this.container.classList.forEach(c => {
            if(c.toLowerCase().includes("mode")){ // ensure to only allow one mode when switching to annotMode
                this.container.classList.remove(c)
            }
        })
        this.container.classList.add("annotMode")

        return this
    }

    /**
     * Set annotationCanvas to Back, when in different mode
     * @returns 
     */
    setToBack(){
        // if( this.annotationCanvas.classList.contains("back")){return}
        // this.annotationCanvas.classList.remove("front")
        // this.annotationCanvas.classList.add("back")
        // if((this.getAnnotationCanvas() !== (this.interactionOverlay.firstChild as SVGSVGElement) && this.getAnnotationCanvas() !== null)){
        //     this.interactionOverlay.insertBefore(this.getAnnotationCanvas(), this.interactionOverlay.firstChild)
        // }
        // this.removeListeners()
        // this.container.classList.remove("annotMode")

        return this
    }
    ////////// GETTER/ SETTER////////////

    setm2s(m2s: Mouse2SVG){
        this.m2s = m2s
        return this
    }

    setMusicPlayer(musicPlayer: MusicPlayer){
        this.musicPlayer = musicPlayer
        return this
    }

    getAnnotationCanvas(): SVGSVGElement{
        return this.interactionOverlay.querySelector("#annotationCanvas") || this.annotationCanvas
    }

    setAnnotationCanvas(annotationCanvas: SVGSVGElement){
        this.updateAnnotationList(annotationCanvas)
    }

    getAnnotationChangeHandler(): AnnotationChangeHandler{
        return this.annotationChangeHandler
    }

    setUndoStacks(arr: Array<Array<Element>>){
        if(arr[0] == undefined || this.undoStacks == undefined){
            this.undoStacks = arr
            var canvasClone = this.interactionOverlay.querySelector("#annotationCanvas").cloneNode(true) as Element
            var listClone = this.container.querySelector("#annotList").cloneNode(true) as Element
            this.undoStacks.push([canvasClone, listClone])
            //this.annotationCanvas = document.getElementById("annotationCanvas") as unknown as SVGSVGElement
        }
        return this
    }

    setContainerId(id: string){
        this.containerId = id
        this.container = document.getElementById(id)
        this.vrvSVG = cq.getVrvSVG(id)
        this.interactionOverlay = cq.getInteractOverlay(id)
        return this
    }
    
}

export default Annotations
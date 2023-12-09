import Handler from "../handlers/Handler";
import MusicProcessor from "../MusicProcessor";
import { Mouse2SVG } from "../utils/Mouse2SVG";
import { constants as c } from "../constants"
import { NoteBBox } from "../utils/Types";
import { Annotation, Coord } from "../utils/Types";
import { uuidv4 } from "../utils/random";
import AnnotationChangeHandler from "../handlers/AnnotationChangeHandler"
import CustomAnnotationShapeDrawer from "../handlers/CustomAnnotationShapeDrawer";
import LabelHandler from "../handlers/LabelHandler";
import * as cq from "../utils/convenienceQueries"
import * as coordinates from "../utils/coordinates"

class Annotations implements Handler {
    m2s?: Mouse2SVG;
    musicPlayer?: MusicProcessor;
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

    constructor(containerId: string) {
        this.setContainerId(containerId)
        this.addCanvas()
        this.annotations = new Array();
    }

    addCanvas() {
        //cq.getInteractOverlay(this.containerId) = cq.getInteractOverlay(this.containerId)
        this.rootBBox = cq.getInteractOverlay(this.containerId).getBoundingClientRect() //this.vrvSVG.getBoundingClientRect()
        var rootWidth = this.rootBBox.width.toString()
        var rootHeigth = this.rootBBox.height.toString()
        var vb = cq.getInteractOverlay(this.containerId).getAttribute("viewBox") //this.vrvSVG.getAttribute("viewBox")

        this.annotationCanvas =  cq.getInteractOverlay(this.containerId)?.querySelector("#annotationCanvas")
        if (!this.annotationCanvas) {
            this.annotationCanvas = document.createElementNS(c._SVGNS_, "svg")
            this.annotationCanvas.setAttribute("id", "annotationCanvas")
            this.annotationCanvas.classList.add("canvas")
            //this.annotationCanvas.classList.add("back")
            //this.annotationCanvas.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))

        }
        //this.annotationCanvas.setAttribute("viewBox", vb)

        // if (this.annotationCanvas.classList.contains("front")) {
        cq.getInteractOverlay(this.containerId).insertBefore(this.annotationCanvas, cq.getInteractOverlay(this.containerId).lastChild.nextSibling)
        // } 
        // else {
        //     cq.getInteractOverlay(this.containerId).insertBefore(this.annotationCanvas, cq.getInteractOverlay(this.containerId).firstChild)
        // }

        this.updateLinkedTexts()
        return this
    }

    setMenuClickHandler() {
        //this.container.querySelector("#activateAnnot")?.addEventListener("click", this.clickHandler)
        return this
    }

    setListeners() {
        this.resetTextListeners()
        // this.customAnnotationDrawer = new CustomAnnotationShapeDrawer(this.containerId)
        // this.customAnnotationDrawer.setUpdateCallback(this.resetTextListeners.bind(this))
        var harmonyButton = cq.getContainer(this.containerId).querySelector("#harmonyAnnotButton")
        var that = this
        cq.getContainer(this.containerId).querySelectorAll(".annotText").forEach(b => {
            b.addEventListener("click", this.clickAnnotTextHandler)
        })
        harmonyButton?.addEventListener("click", this.clickHarmonyBtnHandler)
        return this
    }

    clickHarmonyBtnHandler = (function clickHarmonyBtnHandler(e: MouseEvent){
        //e.preventDefault()
        this.removeTextListeners()
        e.target.dispatchEvent(new Event("annotationButtonClicked"))
    }).bind(this)

    clickAnnotTextHandler = (function clickAnnotTextHandler(e: MouseEvent){
        //e.preventDefault()
        this.resetTextListeners()
        e.target.dispatchEvent(new Event("annotationButtonClicked"))
    }).bind(this)

    removeListeners() {
        this.removeTextListeners()
        var harmonyButton = cq.getContainer(this.containerId).querySelector("#harmonyAnnotButton")
        cq.getContainer(this.containerId).querySelectorAll(".annotText").forEach(b => { 
            b.removeEventListener("click", this.clickAnnotTextHandler)
        })
        harmonyButton?.removeEventListener("click", this.clickHarmonyBtnHandler)
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

        cq.getInteractOverlay(this.containerId).addEventListener("dblclick", this.createAnnotationHandler)
        var that = this
        cq.getInteractOverlay(this.containerId).querySelectorAll(".annotDiv").forEach(ad => {
            ad.addEventListener("click", this.selectHandler)
            ad.addEventListener("dblclick", this.activateEditHandler)
            ad.addEventListener("focus", function () {
                that.musicPlayer?.removePlayListener()
            })

            ad.addEventListener("blur", function () {
                ad.closest("svg").classList.remove("selected")
                ad.setAttribute("contenteditable", "false")
                cq.getInteractOverlay(that.containerId).querySelectorAll(`#${ad.closest("g").id} .lineDragRect`).forEach(ldr => ldr.remove())
                that.musicPlayer?.setPlayListener()
            })

            ad.addEventListener("mouseenter", function () {
                cq.getContainer(that.containerId).classList.add("annotMode")
            })

            ad.addEventListener("mouseleave", function () {
                cq.getContainer(that.containerId).classList.remove("annotMode")
            })

            ad.addEventListener("keydown", this.submitLabelHandler)
        })
        cq.getInteractOverlay(this.containerId).querySelectorAll(".customAnnotShape").forEach(cas => {
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
        cq.getInteractOverlay(this.containerId).removeEventListener("dblclick", this.createAnnotationHandler)
        cq.getInteractOverlay(this.containerId).querySelectorAll(".annotDiv").forEach(ad => {
            ad.closest("svg")?.classList.remove("selected")
            ad.setAttribute("contenteditable", "false")
            ad.removeEventListener("click", this.selectHandler)
            ad.removeEventListener("dblclick", this.activateEditHandler)
        })
        //cq.getInteractOverlay(this.containerId).querySelectorAll(".lineDragRect").forEach(ldr => ldr.remove())

        cq.getInteractOverlay(this.containerId).querySelectorAll(".customAnnotShape").forEach(cas => {
            cas.removeEventListener("dblclick", this.selectHandler)
        })
        document.removeEventListener("keydown", this.deleteHandler)
        this.customAnnotationDrawer?.removeListeners()

        // interaction with all the annotations should always be possible
        //this.annotationChangeHandler?.removeListeners()

        return this
    }

    resetTextListeners() {
        this.removeTextListeners();
        this.setTextListeners()
    }

    resetListeners() {
        //this.resetTextListeners()
        this.removeListeners()
        this.setListeners()
    }

    setCustomShapeListener() {
        var customShapes = null
    }

    ////HANDLERS////

    clickHandler = (function clickHandler(e: MouseEvent) {
        //e.preventDefault()
        // if (!this.annotationCanvas.classList.contains("front")) {
        //     this.setToFront()
        // } else {
        //     this.setToBack()
        // }
    }).bind(this)

    createAnnotationHandler = (function createAnnotationHandler(e: MouseEvent) {
        var t = e.target as Element
        if (t.closest(".vibeContainer")?.classList.contains("clickmode")) return // creation should only be possible when annotation tab is on
        var selectedAnnotations = cq.getInteractOverlay(this.containerId).querySelectorAll("#annotationCanvas .selected")
        if (selectedAnnotations.length === 0) {
            this.createAnnotation(e)
        } else {
            selectedAnnotations.forEach(sa => {
                sa.classList.remove("selected")
            })
        }
    }).bind(this)


    /**
     * Select a specific annotation methon based on selected button
     * @param e 
     */
    createAnnotation(e: MouseEvent) {
        var selectedButton = this.container.querySelector("#annotGroupKM > .selected")?.id
        if (selectedButton === null) return
        switch (selectedButton) {
            case "linkedAnnotButton":
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
    createTextAnnotation(e: MouseEvent, textButtonId: string) {
        if ((e.target as HTMLElement).id !== cq.getInteractOverlay(this.containerId).id) {
            return
        }
        //this.setToFront()
        var selcount = 0
        this.annotationCanvas.querySelectorAll(":scope > .selected").forEach(el => {
            el.classList.remove("selected")
            selcount += 1
        })
        if (selcount > 0) {
            return
        }

        var isLinked = false;
        var isStaticText = false
        switch (textButtonId) {
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

        if (isLinked) text.classList.add("annotLinkedText")
        else if (isStaticText) text.classList.add("annotStaticText")
        text.classList.add("annotText")

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

        var foX = (posx + rectPadding).toString()
        var foY = posy.toString()
        var foH = (50 + 2 * rectPadding + 10).toString()
        var foW = (50 + 2 * rectPadding + 50).toString()

        textForeignObject.setAttribute("x", foX)
        textForeignObject.setAttribute("y", foY)
        textForeignObject.setAttribute("height", foH)
        textForeignObject.setAttribute("width", foW)

        if (isLinked) {
            var line = document.createElementNS(c._SVGNS_, "line")
            line.classList.add("annotLine")

            const lX2 = textForeignObject.x.baseVal.valueAsString
            const lY2 = textForeignObject.y.baseVal.valueAsString
            const lX1 = annotationTarget.x.toString()
            const lY1 = annotationTarget.y.toString()

            line.setAttribute("x2", lX2)
            line.setAttribute("y2", lY2)
            line.setAttribute("x1", lX1)
            line.setAttribute("y1", lY1)

            const xDiff = parseFloat(lX1) - parseFloat(lX2)
            const yDiff = parseFloat(lY1) - parseFloat(lY2)
            line.setAttribute("x-diff", xDiff.toString())
            line.setAttribute("y-diff", yDiff.toString())

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

        cq.getInteractOverlay(this.containerId).dispatchEvent(new Event("annotChanged"))
        cq.getInteractOverlay(this.containerId).dispatchEvent(new Event("annotationCanvasChanged"))

    }

    selectHandler = (function selectHandler(e: MouseEvent) {
        this.select(e)
    }).bind(this)

    updateUndoStacks = (function updateUndoStacks(e: Event) {
        if (!cq.hasActiveElement(this.containerId)) { return }
        var canvasClone = cq.getInteractOverlay(this.containerId).querySelector("#annotationCanvas").cloneNode(true) as Element
        var listClone = this.container.querySelector("#annotList").cloneNode(true) as Element
        this.annotList = this.container.querySelector("#annotList")
        this.undoStacks.push([canvasClone, listClone])
        this.annotationCanvas = cq.getInteractOverlay(this.containerId).querySelector("#annotationCanvas")
    }).bind(this)

    updateRedoStacks = (function updateRedoStacks(e: Event) {
        if (!cq.hasActiveElement(this.containerId)) { return }
        this.redoStacks.push([this.annotationCanvas, this.annotList])
        this.annotationCanvas = this.undoStacks[0][0]
        this.annotList = this.undoStacks[0][1]
    }).bind(this)


    /**
     * Mark an annotation as selected.
     * @param e 
     */
    select(e: MouseEvent) {
        //e.stopPropagation() //do not trigger other events
        var t = e.target as Element
        const cursorElement = document.elementFromPoint(e.clientX, e.clientY);
        const cursorStyle = window.getComputedStyle(cursorElement).getPropertyValue('cursor');
        // console.log("cursorStyle", cursorStyle)
        // console.log(t, t.closest("svg"))

        //if(!t.closest("svg")?.classList.contains("selected") && t.getAttribute("contenteditable") === "false") return

        //t.setAttribute("contenteditable", "false")
        if (t.classList.contains("annotDiv") && t.closest(".annotLinkedText") !== null) { // only apply for linked texts
            //Add A selection Rect to line target
            cq.getInteractOverlay(this.containerId).querySelectorAll(".lineDragRect").forEach(ldr => ldr.remove())
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

        t.closest("svg")?.classList.add("selected")
        this.annotationChangeHandler.resetListeners()
    }

    /**
     * Set Contenteditable True when doubleclicked
     * @param e Doubleclick
     */
    activateEditHandler = (function activateEditHandler(e: MouseEvent) {
        var target = e.target as HTMLElement
        target.setAttribute("contenteditable", "true")
        target.focus()
        console.log("activeElement", document.activeElement)
        this.annotationChangeHandler.removeListeners()
    }).bind(this)

    deactivateEdit() {
        cq.getInteractOverlay(this.containerId).querySelectorAll(".annotDiv").forEach(ad => {
            ad.setAttribute("contenteditable", "false")
            ad.removeEventListener("dblclick", this.activateEditHandler)
        })
        this.annotationChangeHandler.removeListeners()
    }

    /**
     * Delete all selected elements by pressing delete. Except: When any Elements are in Editable mode
     * @param e Keyboardevent (code = Delete)
     */
    deleteHandler = (function deleteHandler(e: KeyboardEvent) {
        if (!cq.hasActiveElement(this.containerId)) { return }
        var isValidKey = ["Delete", "Backspace"].some(code => e.code === code)
        //var isInAnnotMode = this.container.classList.contains("annotMode")
        var hasEditableElement = cq.getInteractOverlay(this.containerId).querySelectorAll(".selected [contenteditable=true]").length > 0
        var listHasFocus = Array.from(this.container.querySelectorAll("#annotList > *")).some(le => le === document.activeElement)

        //if(isValidKey && isInAnnotMode && !hasEditableElement && !listHasFocus){
        if (isValidKey && !hasEditableElement && !listHasFocus) {
            cq.getInteractOverlay(this.containerId).querySelectorAll("#annotationCanvas .selected").forEach(el => {
                if (el.closest("g") !== null) {
                    el.closest("g").remove()
                } else {
                    el.remove();
                }
            })
            cq.getInteractOverlay(this.containerId).dispatchEvent(new Event("annotChanged"))
            cq.getInteractOverlay(this.containerId).dispatchEvent(new Event("annotationCanvasChanged"))
        }
    }).bind(this)

    submitLabelHandler = (function submitHandler(e: KeyboardEvent) {
        var target = e.target as HTMLElement
        if ((e.key === "Enter" || e.key === "Escape")) {
            target.blur()
            cq.getInteractOverlay(this.containerId).dispatchEvent(new Event("annotChanged"))
            cq.getInteractOverlay(this.containerId).dispatchEvent(new Event("annotationCanvasChanged"))
        }
    }).bind(this)

    updateCanvas() {
        this.addCanvas()
        this.annotationChangeHandler?.update()
        this.resetListeners()
        cq.getInteractOverlay(this.containerId).dispatchEvent(new Event("annotationCanvasChanged"))

    }

    updateAnnotationList(annotionCanvs: SVGSVGElement) {
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
        cq.getInteractOverlay(this.containerId).dispatchEvent(new Event("annotChanged"))
        this.resetTextListeners()
    }

    updateLinkedTexts() {
        this.annotations?.forEach(a => {
            //0. Distance between annotId and targetId is saved in the line attributes x-diff and y-diff
            //1. set Line x2/y2 to x/y of targetId
            //2. set x/y of annotBox to targetx + x-diff/ targetY + y-diff
            //3. if dragRects present, then update them as well

            const source = cq.getInteractOverlay(this.containerId).querySelector(`#${a.sourceID}`)
            if (!source?.querySelector(".annotLinkedText")) return
            if(!a.targetID){
                a.targetID = source.getAttribute("targetid")
            }
            const target = cq.getContainer(this.containerId).querySelector(`#${a.targetID}`)
            if (!target) return
            var foreignObject = source.querySelector(".annotFO")
            const targetBbox = target.getBoundingClientRect()
            const targetPt = coordinates.transformToDOMMatrixCoordinates(targetBbox.x, targetBbox.y, cq.getInteractOverlay(this.containerId).querySelector("#annotationCanvas"))
            var line = source.querySelector("line")
            const xSource = targetPt.x + parseFloat(line.getAttribute("x-diff"))
            const ySource = targetPt.y + parseFloat(line.getAttribute("y-diff"))
            line.setAttribute("x1", (targetPt.x).toString())
            line.setAttribute("y1", (targetPt.y).toString())
            line.setAttribute("x2", xSource.toString())
            line.setAttribute("y2", ySource.toString())
            foreignObject.setAttribute("x", xSource.toString())
            foreignObject.setAttribute("y", ySource.toString())

            source.querySelectorAll(".lineDragRect").forEach(ldr => {
                if (ldr.classList.contains("x2")) {
                    ldr.setAttribute("x", xSource.toString())
                    ldr.setAttribute("y", ySource.toString())
                } else if (ldr.classList.contains("x1")) {
                    ldr.setAttribute("x", line.getAttribute("x1"))
                    ldr.setAttribute("y", line.getAttribute("y1"))
                }
            })
        })
    }

    /////////// UTILITIES //////////////

    /**
     * Put annotationCanvas to Front for editing
     * @returns 
     */
    // setToFront(): Annotations {
    //     if (this.annotationCanvas.classList.contains("front")) { return this }
    //     this.annotationCanvas.classList.remove("back")
    //     this.annotationCanvas.classList.add("front")
    //     cq.getInteractOverlay(this.containerId).insertBefore(this.getAnnotationCanvas(), cq.getInteractOverlay(this.containerId).lastChild.nextSibling)
    //     this.setListeners()
    //     this.container.classList.forEach(c => {
    //         if (c.toLowerCase().includes("mode")) { // ensure to only allow one mode when switching to annotMode
    //             this.container.classList.remove(c)
    //         }
    //     })
    //     this.container.classList.add("annotMode")

    //     return this
    // }

    // /**
    //  * Set annotationCanvas to Back, when in different mode
    //  * @returns 
    //  */
    // setToBack() {
    //     // if( this.annotationCanvas.classList.contains("back")){return}
    //     // this.annotationCanvas.classList.remove("front")
    //     // this.annotationCanvas.classList.add("back")
    //     // if((this.getAnnotationCanvas() !== (cq.getInteractOverlay(this.containerId).firstChild as SVGSVGElement) && this.getAnnotationCanvas() !== null)){
    //     //     cq.getInteractOverlay(this.containerId).insertBefore(this.getAnnotationCanvas(), cq.getInteractOverlay(this.containerId).firstChild)
    //     // }
    //     // this.removeListeners()
    //     // this.container.classList.remove("annotMode")

    //     return this
    // }
    ////////// GETTER/ SETTER////////////

    setm2s(m2s: Mouse2SVG) {
        this.m2s = m2s
        return this
    }

    setMusicProcessor(musicPlayer: MusicProcessor) {
        this.musicPlayer = musicPlayer
        return this
    }

    getAnnotationCanvas(): SVGSVGElement {
        return cq.getInteractOverlay(this.containerId).querySelector("#annotationCanvas") || this.annotationCanvas
    }

    setAnnotationCanvas(annotationCanvas: SVGSVGElement) {
        this.updateAnnotationList(annotationCanvas)
        return this
    }

    getAnnotationChangeHandler(): AnnotationChangeHandler {
        return this.annotationChangeHandler
    }

    setUndoStacks(arr: Array<Array<Element>>) {
        if (arr[0] == undefined || this.undoStacks == undefined) {
            this.undoStacks = arr
            var canvasClone = cq.getInteractOverlay(this.containerId).querySelector("#annotationCanvas").cloneNode(true) as Element
            var listClone = this.container.querySelector("#annotList").cloneNode(true) as Element
            this.undoStacks.push([canvasClone, listClone])
            //this.annotationCanvas = document.getElementById("annotationCanvas") as unknown as SVGSVGElement
        }
        return this
    }

    setContainerId(id: string) {
        this.containerId = id
        this.container = document.getElementById(id)
        this.vrvSVG = cq.getVrvSVG(id)
        this.interactionOverlay = cq.getInteractOverlay(this.containerId)
        return this
    }

}

export default Annotations
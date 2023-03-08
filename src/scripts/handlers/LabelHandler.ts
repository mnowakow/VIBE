import * as meiConverter from "../utils/MEIConverter"
import * as meiOperation from "../utils/MEIOperations"
import * as coordinates from "../utils/coordinates"
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import { constants as c } from "../constants"
import { uuidv4 } from "../utils/random";
import HarmonyLabel from "../gui/HarmonyLabel";
import TempoLabel from "../gui/TempoLabel"
import MusicPlayer from "../MusicPlayer";
import Label from '../gui/Label'
import * as cq from "../utils/convenienceQueries"

const labelClasses = ["harm", "tempo", "note", "chord", "fb"]
const labelSelectors = "." + labelClasses.join(",.")

class LabelHandler implements Handler {
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer
    currentMEI?: Document;

    private labelCanvas: SVGElement
    private rootBBox: DOMRect
    private labels: Map<string, Label>
    private isGlobal: boolean
    private elementId: string
    private containerId: string
    private container: Element
    private rootSVG: Element
    private interactionOverlay: Element

    private loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>

    constructor(containerId: string) {
        this.setContainerId(containerId)
        this.addCanvas()
    }

    /**
     * Set own canvas for manipulating labels
     */
    addCanvas() {
        this.rootBBox = this.interactionOverlay.getBoundingClientRect()
        var rootWidth = this.rootBBox.width.toString()
        var rootHeigth = this.rootBBox.height.toString()
        var vb = this.interactionOverlay.getAttribute("viewBox")

        if (this.labelCanvas == undefined) {
            this.labelCanvas = document.createElementNS(c._SVGNS_, "svg")
            this.labelCanvas.setAttribute("id", "labelCanvas")
            this.labelCanvas.classList.add("canvas")
            //this.labelCanvas.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
        }
        this.labelCanvas.setAttribute("viewBox", vb)
        this.interactionOverlay.insertBefore(this.labelCanvas, this.interactionOverlay.firstChild)

        return this
    }

    /**
     * Create label instances for elements already present in the score.
     */
    initLabels() {
        this.labels = new Map()
        this.rootSVG.querySelectorAll(labelSelectors).forEach(el => {
            var className = labelClasses.filter(l => this.rootSVG.querySelector("#" + el.id).classList.contains(l))[0]
            var inputString: string
            switch (className) {
                case "harm":
                    inputString = Array.from(this.rootSVG.querySelector("#" + el.id).querySelectorAll(".text")).filter(el => el.textContent !== null)[0]?.textContent.trim()
                    this.labels.set(el.id, new HarmonyLabel(inputString, el.id, this.currentMEI))
                    break;
                case "tempo":
                    inputString = Array.from(this.rootSVG.querySelector("#" + el.id).querySelectorAll(".text")).filter(e => /\d+/.test(e.textContent))[0]?.textContent.match(/\d+/).join("") || ""
                    this.labels.set(el.id, new TempoLabel(inputString, el.id, this.currentMEI))
                    break;
            }
        })
    }

    setListeners(): LabelHandler {
        document.querySelectorAll(".sylTextRect").forEach(s => {
            s.remove()
        })

        // isGlobal = false: Editor is not in harmony mode
        if (!this.isGlobal) {
            this.interactionOverlay.addEventListener("click", this.setHarmonyLabelHandlerClick, true)
            this.interactionOverlay.addEventListener("mousemove", this.activateHarmonyHighlight)
            this.interactionOverlay.addEventListener("keydown", this.closeModifyWindowHandler, true)
        }

        this.interactionOverlay.addEventListener("click", this.closeModifyWindowHandler)
        document.addEventListener("keydown", this.setHarmonyLabelHandlerKey)
        this.interactionOverlay.querySelectorAll(labelSelectors).forEach(h => {
            h.addEventListener("mouseover", this.deactivateHarmonyHighlight)
            h.addEventListener("mouseleave", this.activateHarmonyHighlight)
            h.addEventListener("dblclick", this.modifyLabelHandler)
        })

        this.interactionOverlay.querySelectorAll(".harm, .label, .manipulator").forEach(h => h.addEventListener("click", (e) => e.stopImmediatePropagation())) // prevent inseerting notes, wenn cursor is over a harm symbol

        return this
    }

    removeListeners(): LabelHandler {
        this.interactionOverlay.removeEventListener("click", this.closeModifyWindowHandler)
        this.interactionOverlay.removeEventListener("click", this.setHarmonyLabelHandlerClick)
        document.removeEventListener("keydown", this.setHarmonyLabelHandlerKey)
        this.interactionOverlay.removeEventListener("mousemove", this.activateHarmonyHighlight)
        this.interactionOverlay.removeEventListener("keydown", this.closeModifyWindowHandler)
        this.interactionOverlay.querySelectorAll(labelSelectors).forEach(h => {
            h.removeEventListener("mouseenter", this.deactivateHarmonyHighlight)
            h.removeEventListener("mouseleave", this.activateHarmonyHighlight)
            h.removeEventListener("dblclick", this.modifyLabelHandler)
        })

        return this
    }

    setHarmonyLabelHandlerClick = (function setHarmonyLabelHandler(e: MouseEvent) {
        if (this.container.classList.contains("harmonyMode")) {
            this.harmonyLabelHandler(e)
        }
    }).bind(this)

    setTempoLabelHandlerClick = (function setTempoLabelHandlerClick(e: MouseEvent) {
        this.tempoLabelHandler(e)
    }).bind(this)

    setHarmonyLabelHandlerKey = (function setHarmonyLabelHandler(e: KeyboardEvent) {
        if (!cq.hasActiveElement(this.containerId)) return
        var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        var ctrl = e.ctrlKey
        if (isMac) {
            ctrl = e.metaKey
        }
        if (ctrl) {
            if (e.key === "k" && Array.from(this.rootSVG.querySelectorAll(".note, .chord, .rest, .mrest")).some(el => (el as Element).classList.contains("marked"))) {
                e.preventDefault()
                this.harmonyLabelHandler(e)
            }
        }
    }).bind(this)

    // HARMONY LABELS

    /**
     * Open Inputbox for (first) selected Note
     */
    harmonyLabelHandler(e: Event) {
        var nextNote = this.rootSVG.querySelector(".note.marked, .chord.marked")
        if (nextNote === null) { return }
        var nextNoteBBox = nextNote.getBoundingClientRect()
        var staffBBox = nextNote.closest(".staff").getBoundingClientRect()

        var canvasMatrix = (this.labelCanvas as unknown as SVGGraphicsElement).getScreenCTM().inverse()
        var ptNoteLT = new DOMPoint(nextNoteBBox.left, nextNoteBBox.top)
        ptNoteLT = ptNoteLT.matrixTransform(canvasMatrix)

        var ptNoteRB = new DOMPoint(nextNoteBBox.right, nextNoteBBox.bottom)
        ptNoteRB = ptNoteRB.matrixTransform(canvasMatrix)

        var ptNoteWidth = Math.abs(ptNoteRB.x - ptNoteLT.x)
        var ptNoteHeight = Math.abs(ptNoteRB.y - ptNoteLT.y)

        var ptStaffLT = new DOMPoint(staffBBox.left, staffBBox.top)
        ptStaffLT = ptStaffLT.matrixTransform(canvasMatrix)

        var ptStaffRB = new DOMPoint(staffBBox.right, staffBBox.bottom)
        ptStaffRB = ptStaffRB.matrixTransform(canvasMatrix)

        var ptStaffWidth = Math.abs(ptStaffRB.x - ptStaffLT.x)
        var ptStaffHeight = Math.abs(ptStaffRB.y - ptStaffLT.y)

        var posx = ptNoteLT.x - ptNoteWidth / 2 //nextNoteBBox.left - nextNoteBBox.width/2 - window.scrollX - rootBBox.x - root.scrollLeft
        var posy = ptStaffRB.y //staffBBox.bottom - window.scrollY - rootBBox.y - root.scrollLeft

        var tstamp = meiOperation.getElementTimestampById(nextNote.id, this.currentMEI)
        var existsTstamp = Array.from(this.currentMEI.getElementById(nextNote.id).closest("measure").querySelectorAll("harm")).some(h => {
            if (h.getAttribute("tstamp") !== null) {
                return parseFloat(h.getAttribute("tstamp")) === tstamp
            } else {
                return false
            }
        })
        var hasStartId = this.currentMEI.querySelector("harm[startid=\"" + nextNote.id + "\"]") !== null
        var isEmptyLabelCanvas = !this.labelCanvas.hasChildNodes()

        if (!hasStartId && isEmptyLabelCanvas && !existsTstamp) {
            this.createInputBox(posx, posy, nextNote.id, "harm")
        } else if (!isEmptyLabelCanvas) {
            this.closeModifyWindow()
        }
    }


    setLabel(labelString: string, bboxId: string): Label {
        var className = labelClasses.filter(l => this.rootSVG.querySelector("#" + bboxId).classList.contains(l))[0]
        var label: Label
        switch (className) {
            case "note":
            case "chord":
            case "harm":
                label = new HarmonyLabel(labelString, bboxId, this.currentMEI)
                break;
            case "tempo":
                label = new TempoLabel(labelString, bboxId, this.currentMEI)
                break;
            default:
                return
        }
        if (this.labels.get(label.getElement().id) == undefined) {
            this.labels.set(label.getElement().id, label)
        }

        return label
    }

    activateHarmonyHighlight = (function highlightNextHarmonyHandler(e: MouseEvent) {
        if (e.type === "mouseleave" && !this.isGlobal) {
            this.interactionOverlay.addEventListener("mousemove", this.activateHarmonyHighlight)
        }
        if (!this.isGlobal) {
            this.highlightNextHarmony(e)
        }
    }).bind(this)

    deactivateHarmonyHighlight = (function deactivateHighlight(e: MouseEvent) {
        // document.querySelectorAll(".marked").forEach(m => {
        //     m.classList.remove("marked")
        // })
        this.interactionOverlay.removeEventListener("mousemove", this.activateHarmonyHighlight)
    }).bind(this)

    highlightNextHarmony(e: MouseEvent, active = true) {
        if (!active) { return }

        var pt = new DOMPoint(e.clientX, e.clientY)
        var rootMatrix = (this.labelCanvas as unknown as SVGGraphicsElement).getScreenCTM().inverse()
        pt = pt.matrixTransform(rootMatrix)
        var posx = pt.x
        var posy = pt.y

        var nextNoteBBox = this.m2m.findScoreTarget(posx, posy)
        if (nextNoteBBox == undefined) { return }

        var el = this.rootSVG.querySelector("#" + nextNoteBBox.id)

        if (el.closest(".chord") !== null) {
            el = el.closest(".chord")
        }

        if (!el.classList.contains("marked")) {
            this.rootSVG.querySelectorAll(".marked").forEach(m => {
                m.classList.remove("marked")
                this.interactionOverlay.querySelector("[refId=" + m.id + "]")?.classList.remove("marked")
            })
            el.classList.add("marked")
        }
    }


    modifyLabelHandler = (function modifyLabelHandler(e: MouseEvent) {
        e.stopImmediatePropagation()
        this.rootSVG.querySelectorAll(".marked").forEach(m => {
            m.classList.remove("marked")
            this.interactionOverlay.querySelector("*[refId=" + m.id + "]")?.classList.remove("marked")
        })
        this.modifyLabel(e)
    }).bind(this)

    /**
     * modify existing label
     * @param e 
     * @returns 
     */
    modifyLabel(e: MouseEvent) {
        this.closeModifyWindow()
        var target = e.target as Element
        if (target.id === "") {
            var refId = target.closest("[refId]")?.getAttribute("refId")
            if (refId === null) return
            target = this.rootSVG.querySelector("#" + refId)?.closest(".harm")
        }
        target = target.closest(labelSelectors)
        target.setAttribute("visibility", "hidden")
        var targetBBox = target.getBoundingClientRect()

        var pt = new DOMPoint(targetBBox.x, targetBBox.y)
        var rootMatrix = (this.labelCanvas as unknown as SVGGraphicsElement).getScreenCTM().inverse()
        pt = pt.matrixTransform(rootMatrix)

        var posx = pt.x - 5 //targetBBox.x - window.scrollX - rootBBox.left - root.scrollLeft //coordinates.adjustToPage(e.pageX, "x")
        var posy = pt.y - 5  //targetBBox.y - window.scrollY - rootBBox.top - root.scrollTop //coordinates.adjustToPage(e.pageY, "y")


        // prevent double input boxes for same Element
        this.elementId = target.id
        if (this.container.querySelector("*[refElementId=\"" + target.id + "\"]") !== null) {
            return
        }
        var className = labelClasses.filter(l => target.classList.contains(l))[0] //assume only one output, therefore alway return idx 0  
        this.createInputBox(posx, posy, target.id, className)
    }

    /**
     * Wrapper function for submitlabel()
     */
    submitLabelHandler = (function submitHandler(e: KeyboardEvent) {
        if (!cq.hasActiveElement(this.containerId)) return
        if (e.key === "Enter" && this.labelCanvas.hasChildNodes()) {
            e.target.removeEventListener("keydown", this.submitLabelHandler)
            this.submitLabel()
        }
    }).bind(this)

    typeLabelHandler = (function (e: KeyboardEvent) {
        if (!cq.hasActiveElement(this.containerId)) return
        var t = (e.target as HTMLElement)
        var parent = t.parentElement
        var tWidth = t.getBoundingClientRect().width.toString()
        var tHeigth = t.getBoundingClientRect().height.toString()
        parent.setAttribute("width", tWidth)
        parent.setAttribute("height", tHeigth)
    }).bind(this)


    closeModifyWindowHandler = (function closeModifyWindow(e: Event) {
        if (e instanceof KeyboardEvent) {
            if (e.key === "Escape") {
                this.closeModifyWindow()
            }
        } else if (e instanceof MouseEvent && !(e.target as HTMLElement).classList.contains("labelFO")) {
            this.closeModifyWindow()
        }
    }).bind(this)

    /**
     * Close the modifier Window and make the hidden Element visible again
     */
    closeModifyWindow() {
        try{
            Array.from(this.labelCanvas.children).forEach(c => {
                c?.remove()
            })
        }catch{}

        // clean MEI from empty harm Elements
        this.currentMEI.querySelectorAll(labelClasses.join(",")).forEach(h => {
            if (h.id === "") return
            this.container.querySelector("#" + h.id)?.setAttribute("visibility", "visible")
        })
    }

    /**
     * Save label information in current MEI
     */
    submitLabel() {
        var labelDiv = this.labelCanvas.getElementsByClassName("labelDiv")[0]
        var text = labelDiv.textContent
        var refElementClass = labelClasses.filter(l => this.container.querySelector("#" + labelDiv.closest("g").getAttribute("refElementId")).classList.contains(l))[0] // assume only one result
        var label = this.labels.get(labelDiv.closest("g").getAttribute("refElementId"))
        if (refElementClass === "harm") { // change existing harm
            let harmLabel = label as HarmonyLabel
            harmLabel.modifyLabel(text)
            //this.currentMEI.getElementById(harmLabel.getElement().id).replaceWith(harmLabel.getElement())
        } else if (["note", "chord"].some(cn => refElementClass === cn)) { //create new harm
            let harmLabel = this.setLabel(labelDiv.textContent, labelDiv.closest("g").getAttribute("refElementId")) as HarmonyLabel
            this.currentMEI.getElementById(harmLabel.getStartId()).closest("measure").append(harmLabel.getElement())
        } else if (refElementClass === "tempo") { // change existing tempo
            var tempoLabel = label as TempoLabel
            tempoLabel.modifyLabel(text)
        }

        this.closeModifyWindow()
        meiOperation.cleanUp(this.currentMEI)
        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
        this.loadDataCallback("", mei, false).then(() => {
            this.reset()
        })
    }

    createInputBox(posx: number, posy: number, targetId: string, targetClass: string) {
        var textGroup = document.createElementNS(c._SVGNS_, "g")
        textGroup.setAttribute("id", uuidv4())
        textGroup.setAttribute("refElementId", targetId)

        var text = document.createElementNS(c._SVGNS_, "svg")
        text.classList.add("labelText")

        var textForeignObject = document.createElementNS(c._SVGNS_, "foreignObject")
        textForeignObject.classList.add("labelFO")
        var textDiv = document.createElement("div")
        textDiv.setAttribute("contenteditable", "true")

        switch (targetClass) {
            case "harm":
                textDiv.textContent = this.labels.get(targetId)?.getInput() || ""
                break;
            case "tempo":
                textDiv.textContent = Array.from(this.container.querySelector("#" + targetId).querySelectorAll(".text")).filter(el => /\d+/.test(el.textContent))[0].textContent.match(/\d+/).join("") || ""
                break;
            default:
                return
        }

        textDiv.classList.add("labelDiv")
        text.append(textForeignObject)

        this.container.appendChild(textDiv)

        var rectPadding = 5

        text.setAttribute("x", (posx + rectPadding).toString())
        text.setAttribute("y", (posy).toString())

        textForeignObject.setAttribute("x", "0")
        textForeignObject.setAttribute("y", "0")
        textForeignObject.setAttribute("height", (textDiv.clientHeight + 2 * rectPadding).toString())
        textForeignObject.setAttribute("width", (textDiv.clientHeight + 2 * rectPadding).toString())

        this.labelCanvas.appendChild(textGroup)
        textGroup.appendChild(text)
        textForeignObject.appendChild(textDiv)

        // Special Listeners while Editing Harmonies
        var that = this
        textDiv.addEventListener("focus", function () {
            that.removeListeners()
            that.musicPlayer.removePlayListener()
        })

        textDiv.addEventListener("blur", function () {
            textDiv.dispatchEvent(new KeyboardEvent("keydown", {"key": "Enter"})) // trigger submitLabel when bluring
            that.setListeners()
            that.musicPlayer.setPlayListener()
        })

        textDiv.addEventListener("keydown", this.submitLabelHandler)
        textDiv.addEventListener("keydown", this.typeLabelHandler)

        textDiv.focus()
    }

    getTimestamp(note: Element) {
        var layer = note.closest("layer")
        var elements = Array.from(layer.querySelectorAll("*[dur]"))
        elements = elements.filter((v, i) => i <= elements.indexOf(note))
        var tstamp: number = 0
        elements.forEach(e => {
            var dur = parseInt(e.getAttribute("dur"))
            tstamp += 4 / dur
            var dots = e.getAttribute("dots")
            var add = dur
            if (dots !== null) {
                for (var i = 0; i < parseInt(dots); i++) {
                    add = add / 2
                    tstamp += add
                }
            }
        })
        return tstamp
    }

    reset() {
        this.setContainerId(this.containerId)
        this.addCanvas()
        this.initLabels()
        this.removeListeners()
        this.setListeners()
        return this
    }

    setM2M(m2m: Mouse2MEI) {
        this.m2m = m2m
        return this
    }

    setCurrentMEI(mei: Document) {
        this.currentMEI = mei
        return this
    }

    setMusicPlayer(musicPlayer: MusicPlayer) {
        this.musicPlayer = musicPlayer
        return this
    }

    setGlobal(global: boolean) {
        this.isGlobal = global
        return this
    }

    getGlobal() {
        return this.isGlobal
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>) {
        this.loadDataCallback = loadDataCallback
        return this
    }

    setContainerId(id: string) {
        this.containerId = id
        this.container = document.getElementById(id)
        this.rootSVG = cq.getRootSVG(id)
        this.interactionOverlay = cq.getInteractOverlay(id)
        return this
    }

}

export default LabelHandler
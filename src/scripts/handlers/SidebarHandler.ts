import MusicPlayer from "../MusicPlayer";
import { Mouse2SVG } from "../utils/Mouse2SVG";
import Handler from "./Handler";
import { keyIdToSig, clefToLine, unicodeToTimesig } from "../utils/mappings"
import { constants as c } from "../constants"
import * as meiConverter from "../utils/MEIConverter"
import * as meiOperation from "../utils/MEIOperations"
import * as coordinates from "../utils/coordinates"
import * as cq from "../utils/convenienceQueries"
import MeiTemplate from "../assets/mei_template"
import interact from "interactjs"
import { reduceEachTrailingCommentRange } from "typescript";
import { Interval } from "tone/build/esm/core/type/Units";

/**
 * Handles all Events when interacting with the sidebar.
 * There is only one instance necessary.
 * Every change that results from a sidebar interaction is returned by a meiOperation
 */
class SidebarHandler implements Handler {

    m2s?: Mouse2SVG;
    musicPlayer?: MusicPlayer;
    currentMEI?: Document;
    loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>;
    containerId: string;
    container: Element
    interactionOverlay: Element
    vrvSVG: Element
    sidebarContainer: Element
    resizeListener: Interact.Interactable
    dropInterval: NodeJS.Timer

    constructor() {
        //this.setListeners()
        document.addEventListener("dragover", (e) => {
            e.preventDefault()
        })
    }

    setListeners() {
        this.setSelectListeners()
        //this.setChangeMeterListeners()

        // Controll dpossible drag and drop zones on screen
        var that = this
        var dragTarget = this.interactionOverlay.querySelector("#scoreRects") //document.getElementById("vrvSVG")
        this.interactionOverlay.addEventListener("dragleave", function (event) {
            event.preventDefault()
            event.stopPropagation()
            if (event.target === dragTarget) {
                that.removeSelectListeners()
            }
        }, false)


        this.interactionOverlay.addEventListener("dragenter", function (event) {
            event.preventDefault()
            event.stopPropagation()
            if (Array.from(dragTarget.querySelectorAll("*")).every(c => c !== event.target)) {
                that.setSelectListeners()
            }
        }, false)

        this.resizeListener  = interact("#" + this.containerId + " #sidebarContainer")
        .resizable({
            edges: { left: false, right: true, bottom: false, top: false },
            listeners: {
                move: this.resizeSidebarFunction,
                end(e){
                    var target = e.target as HTMLElement
                    target.style.transition = "0.5s"
                    target.parentElement.querySelectorAll(":scope > div:not(#sidebarContainer)").forEach(d => {
                        var ds = d as HTMLElement
                        ds.style.transition = "0.5s"
                    })
                }
            }
        })

        return this
    }

    removeListeners() {
        this.removeSelectListeners()

        //this.resizeListener?.unset()
        return this
    }

    removeSelectListeners() {
        this.container.querySelectorAll("*[id*=keyList] > *").forEach(k => {
            if (k.tagName === "A") {
                k.removeEventListener("dblclick", this.keySigSelectHandler)
                k.removeEventListener("click", this.keyChangeHandler)
            }
        })

        this.container.querySelectorAll("*[id*=clefList] > *").forEach(k => {
            if (k.tagName === "A") {
                k.removeEventListener("click", this.clefChangeHandler)
            }
        })
        document.removeEventListener("dragover", (e) => {
            e.preventDefault()
        })
        this.container.querySelectorAll("#sidebarList a, #timeDiv").forEach(sa => {
            sa.removeEventListener("drag", this.findDropTargetFunction)
            sa.removeEventListener("dragend", this.dropOnTargetFunction)
        })

        this.container.querySelectorAll("#timeUnit, #timeCount").forEach(t => {
            t.removeEventListener("change", this.changeTimeHandler)
        })

        return this
    }

    resetListeners() {
        this.removeListeners()
        this.setListeners()
    }

    setSelectListeners() {
        this.container.querySelectorAll("*[id*=keyList] > *").forEach(k => {
            if (k.tagName === "A") {
                k.addEventListener("dblclick", this.keySigSelectHandler)
                k.addEventListener("click", this.keyChangeHandler)
            }
        })

        this.container.querySelectorAll("*[id*=clefList] > *").forEach(k => {
            if (k.tagName === "A") {
                k.addEventListener("click", this.clefChangeHandler)
            }
        })

        this.container.querySelectorAll("#sidebarList a, #timeDiv, #tempoDiv").forEach(sa => {
            sa.addEventListener("drag", this.findDropTargetFunction)
            sa.addEventListener("dragend", this.dropOnTargetFunction)
        })

        this.container.querySelectorAll("#timeUnit, #timeCount").forEach(t => {
            t.addEventListener("change", this.changeTimeHandler)
        })

        return this
    }

    /**
     * Make Score Elements Clickable (and mark them), which are important for functions in the sidebar
     * Has to be called externally, when new Score is Loaded
     * @returns this
     */
    makeScoreElementsClickable() {
        var that = this
        // Clefs are clickable and will be filled red (see css)
        cq.getInteractOverlay(this.containerId).querySelectorAll(".clef, .keySig, .meterSig").forEach(c => {
            //this.interactionOverlay.querySelectorAll(".clef, .keySig, .meterSig").forEach(c => {
            //this.interactionOverlay.querySelectorAll("*").forEach(c => {
            c.addEventListener("click", function (e) {
                if (c.classList.contains("marked")) {
                    c.classList.remove("marked")
                    that.getElementInSVG(c.getAttribute("refId"))?.classList.remove("marked")
                } else {
                    c.classList.add("marked")
                    that.getElementInSVG(c.getAttribute("refId"))?.classList.add("marked")
                    that.changeSelectedElementInSidebar(c)
                }
            })
        })

        return this
    }

    /**
     * Change Values in Sidebar to match the selected element in the score.
     * Currently only for time 
     * @param element 
     */
    changeSelectedElementInSidebar(element: Element) {
        if (!element.classList.contains("meterSig")) return

        var baseEl = this.vrvSVG.querySelector("#" + element.getAttribute("refId"))
        var tempY: string
        var count: string = ""
        var unit: string = ""
        baseEl.querySelectorAll("use").forEach(u => {
            var num = unicodeToTimesig.get(u.getAttribute("href").slice(1, 5))

            if (count === "") {
                count = num
            }
            else if (u.getAttribute("y") === tempY && count !== "") {
                count += num
            } else if (u.getAttribute("y") === tempY && unit !== "") {
                unit += num
            } else {
                unit = num
            }
            tempY = u.getAttribute("y")
        });

        (this.container.querySelector("#timeCount") as any).value = count;
        (this.container.querySelector("#timeUnit") as any).value = unit;
    }

    changeTimeHandler = (function changeTimeHandler(e: MouseEvent) {
        e.preventDefault()
        this.setTimeForSelectedElements(e)
    }).bind(this)

    setTimeForSelectedElements(e: MouseEvent) {
        var target = e.target as Element
        var changeCount = false
        var changeUnit = false

        if (target.id.includes("Count")) {
            changeCount = true
        }
        if (target.id.includes("Unit")) {
            changeUnit = true
        }

        var count = (this.container.querySelector("#timeCount") as any).value
        var unit = (this.container.querySelector("#timeUnit") as any).value

        var markedTimes = Array.from(this.vrvSVG.querySelectorAll(".meterSig.marked"))
        var reload = false
        markedTimes.forEach(mt => {
            var meiMt = this.currentMEI.getElementById(mt.id)
            var isInStaffDef = this.currentMEI.querySelector("#" + mt.id) === null
            if (isInStaffDef) {
                //var myRownum = parseInt(mt.closest(".staff").getAttribute("n")) - 1
                //var rowNums = new Array()
                this.currentMEI.querySelector("measure").querySelectorAll("staff").forEach(s => {
                    var rowNum = parseInt(s.getAttribute("n")) - 1
                    var targetMeterSigDef = this.currentMEI.querySelectorAll("staffDef")[rowNum]
                    if (targetMeterSigDef.getAttribute("meter.count") !== count && changeCount) {
                        targetMeterSigDef.setAttribute("meter.count", count)
                        reload = true
                    }
                    if (targetMeterSigDef.getAttribute("meter.unit") !== unit && changeUnit) {
                        targetMeterSigDef.setAttribute("meter.unit", unit)
                        reload = true
                    }
                })
            } else {
                this.currentMEI.querySelector("#" + mt.id).setAttribute("count", count)
                this.currentMEI.querySelector("#" + mt.id).setAttribute("unit", unit)
                var siblingLayers = meiMt.closest("measure")?.querySelectorAll("layer")
                var myLayer = meiMt.closest("layer")
                siblingLayers.forEach(sl => {
                    if (sl.id !== myLayer.id) {
                        var ms = sl.querySelector("meterSig")
                        if (ms === null) {
                            ms = new MeiTemplate().createMeterSig(count, unit) as Element
                            sl.firstElementChild.prepend(ms)
                        } else {
                            ms.setAttribute("count", count)
                            ms.setAttribute("unit", unit)
                        }
                    }
                })
                reload = true
            }
        })

        if (reload) {
            meiOperation.cleanUp(this.currentMEI)
            this.loadDataCallback("", meiConverter.restoreXmlIdTags(this.currentMEI), false)
        }
    }

    keySigSelectHandler = (function keySigSelectHandler(e: MouseEvent) {
        e.preventDefault()
        this.setKeyGlobal(e)
    }).bind(this)

    // changeParameters by interacting with sidebar
    setKeyGlobal(e: MouseEvent) {
        var target = e.target as Element
        this.currentMEI.querySelectorAll("staffDef > keySig").forEach(s => {
            s.setAttribute("sig", keyIdToSig.get(target.id))
        })
        var mei = meiOperation.adjustAccids(this.currentMEI)
        meiOperation.cleanUp(mei)
        mei = meiConverter.restoreXmlIdTags(mei)
        this.loadDataCallback("", mei, false)

        return this
    }

    keyChangeHandler = (function keyChangeHandler(e: MouseEvent) {
        e.preventDefault()
        this.setKeyLocal(e)
    }).bind(this)

    setKeyLocal(e: MouseEvent) {
        var target = e.target as Element
        var markedClefs = Array.from(this.vrvSVG.querySelectorAll(".keySig.marked"))
        var reload = false
        markedClefs.forEach(mc => {
            var isInStaffDef = this.currentMEI.querySelector("#" + mc.id) === null
            if (isInStaffDef) {
                var rowNum = parseInt(mc.closest(".staff").getAttribute("n")) - 1
                var targetKeySigDef = this.currentMEI.querySelectorAll("staffDef > keySig")[rowNum]
                if (targetKeySigDef.getAttribute("sig") !== keyIdToSig.get(target.id)) {
                    targetKeySigDef.setAttribute("sig", keyIdToSig.get(target.id))
                    reload = true
                }
            } else {
                this.currentMEI.querySelector("#" + mc.id).setAttribute("sig", keyIdToSig.get(target.id))
                reload = true
            }
        })
        if (reload) {
            meiOperation.cleanUp(this.currentMEI)
            this.loadDataCallback("", meiConverter.restoreXmlIdTags(this.currentMEI), false)
        }
    }

    /**
     * If Meter is already present in MEI, load it in input for time signature
     * @returns 
     */
    loadMeter() {
        var staffDef = this.currentMEI.querySelector("staffDef")
        if (staffDef !== null) {
            var hasMeter = staffDef.getAttribute("meter.count") !== null && staffDef.getAttribute("meter.unit") !== null
            if (hasMeter) {
                this.container.querySelector("#timeCount").setAttribute("value", staffDef.getAttribute("meter.count"))
                this.container.querySelector("#timeUnit").setAttribute("value", staffDef.getAttribute("meter.unit"))
            }
        }
        return this
    }

    /**
     * Listen on Change when input is changed for Time Signatures
     */
    setChangeMeterListeners() {
        this.container.querySelector("#timeCount").addEventListener("change", this.changeMeterHandler)
        this.container.querySelector("#timeUnit").addEventListener("change", this.changeMeterHandler)
    }

    /**
     * Handler for changing Time Signatures (+ Loading)
     */
    changeMeterHandler = (function changeMeter(e: Event) {
        var mei = meiOperation.changeMeter(this.currentMEI)
        if (mei !== null) {
            mei = meiConverter.restoreXmlIdTags(mei)
            this.loadDataCallback("", mei, false)
        }
    }).bind(this)

    clefChangeHandler = (function clefChangeHandler(e: MouseEvent) {
        e.preventDefault()
        this.setClef(e)
    }).bind(this)

    /**
     * Set Clefshape for all marked clefelements
     * @param e MouseEvent
     */
    setClef(e: MouseEvent) {
        var target = e.target as Element
        var markedClefs = Array.from(this.vrvSVG.querySelectorAll(".clef.marked"))
        var reload = false
        markedClefs.forEach(mc => {
            var isInStaffDef = this.currentMEI.querySelector("#" + mc.id) === null
            if (isInStaffDef) {
                var rowNum = parseInt(mc.closest(".staff").getAttribute("n")) - 1
                var targetClefDef = this.currentMEI.querySelectorAll("staffDef > clef")[rowNum]
                if (targetClefDef.getAttribute("shape") !== target.id.charAt(0)) {
                    targetClefDef.setAttribute("shape", target.id.charAt(0))
                    targetClefDef.setAttribute("line", clefToLine.get(target.id.charAt(0)))
                    reload = true
                }
            } else {
                this.currentMEI.querySelector("#" + mc.id).setAttribute("shape", target.id.charAt(0))
                this.currentMEI.querySelector("#" + mc.id).setAttribute("line", clefToLine.get(target.id.charAt(0)))
                reload = true
            }
        })

        if (reload) {
            meiOperation.cleanUp(this.currentMEI)
            this.loadDataCallback("", meiConverter.restoreXmlIdTags(this.currentMEI), false)
        }
    }

    resizeSidebar(e){
        var that = this
        var target = e.target as HTMLElement
        target.style.transition = "0s"
        target.style.width = e.clientX.toString() + "px"
        target.parentElement.querySelectorAll(":scope > div:not(#sidebarContainer)").forEach(d => {
            var ds = d as HTMLElement
            ds.style.transition = "0s"
            ds.style.marginLeft = (target.getBoundingClientRect().right).toString() + "px"
            ds.style.width = (that.container.getBoundingClientRect().right - target.getBoundingClientRect().right).toString() + "px"
        })
    }
    private resizeSidebarFunction = this.resizeSidebar.bind(this)

    /**
     * Find next possible element to drop element from sidebar on
     * @param e 
     */s
    findDropTarget(e: MouseEvent) {
        /** TODO: dropflags müssen auch in scoreRects eigegeben werden */
        e.preventDefault()
        var pt = coordinates.transformToDOMMatrixCoordinates(e.clientX, e.clientY, this.interactionOverlay)
        var posx = pt.x
        var posy = pt.y

        var eventTarget = e.target as Element
        var eventTargetParent = eventTarget.parentElement
        var eventTargetIsClef = eventTargetParent.id.toLowerCase().includes("clef")
        var eventTargetIsKey = eventTargetParent.id.toLowerCase().includes("key")
        var eventTargetIsTime = eventTarget.id.toLocaleLowerCase().includes("time")
        var eventTargetIsTempo = eventTarget.id.toLocaleLowerCase().includes("tempo")
        var dropTargets: Array<Element> //NodeListOf<Element>
        var dropFlag: string

        if (eventTargetIsClef) {
            dropTargets = Array.from(this.vrvSVG.querySelectorAll(".clef, .barLine > path"))
            dropFlag = "dropClef"
        } else if (eventTargetIsKey) {
            dropTargets = Array.from(this.vrvSVG.querySelectorAll(".keySig, .barLine > path, .clef"))
            dropFlag = "dropKey"
        } else if (eventTargetIsTime) {
            dropTargets = Array.from(this.vrvSVG.querySelectorAll(".meterSig, .barLine > path, .clef"))
            dropFlag = "dropTime"
        } else if (eventTargetIsTempo) {
            dropTargets = Array.from(this.vrvSVG.querySelectorAll(".note, .chord, .rest, .mRest"))
            dropFlag = "dropTempo"
        }
        else {
            return
        }

        dropTargets.push(this.container.querySelector("#sidebarContainer"))
        dropTargets.push(this.container.querySelector("#btnToolbar"))
        dropTargets.push(this.container.querySelector("#customToolbar"))

        var tempDist = Math.pow(10, 10)
        dropTargets.forEach(dt => {
            var interacationElement = this.interactionOverlay.querySelector("[refId=" + dt.id + "]") || this.container.querySelector("#" + dt.id)
            var blbbox = interacationElement.getBoundingClientRect()
            var ptdt = coordinates.getDOMMatrixCoordinates(blbbox, this.interactionOverlay)
            var bbx = ptdt.left
            var bby = ptdt.top
            var dist = Math.sqrt(Math.abs(bbx - posx) ** 2 + Math.abs(bby - posy) ** 2)
            if (dist < tempDist) {
                dropTargets.forEach(_dt => {
                    _dt.classList.remove(dropFlag)
                    this.getElementInInteractOverlay(_dt.id)?.classList.remove(dropFlag)
                })
                tempDist = dist
                dt.classList.add(dropFlag)
                this.getElementInInteractOverlay(dt.id)?.classList.add(dropFlag)

            }
        })
    }

    findDropTargetFunction = (function findBarline(e: MouseEvent) {
        e.target.removeEventListener("drag", this.findDropTargetFunction)
        clearInterval(this.dropInterval)
        this.dropInterval = setInterval(this.findDropTarget(e), 50)
    }).bind(this)

    /**
     * Determine action on drop elemnt from sidebar on score
     * @param e 
     */
    dropOnTarget(e: MouseEvent) {
        e.preventDefault()
        var selectedElement = this.getElementInSVG(this.interactionOverlay.querySelector(".dropClef, .dropKey, .dropTime, .dropTempo")?.getAttribute("refId"))
        var t = e.target as Element
        var mei: Document

        var isFirstClef = Array.from(this.vrvSVG.querySelectorAll(".measure[n=\"1\"] .clef")).some(mc => mc?.id === selectedElement?.id)
        var isFirstKey = Array.from(this.vrvSVG.querySelectorAll(".measure[n=\"1\"] .keySig")).some(mc => mc?.id === selectedElement?.id)
        var isFirstMeter = Array.from(this.vrvSVG.querySelectorAll(".measure[n=\"1\"] .meterSig")).some(mc => mc?.id === selectedElement?.id)

        if (selectedElement?.classList.contains("dropClef")) {
            if (isFirstClef) {
                mei = meiOperation.replaceClefinScoreDef(selectedElement, t.id, this.currentMEI)
            } else {
                mei = meiOperation.insertClef(selectedElement, t.id, this.currentMEI)
            }
        } else if (selectedElement?.classList.contains("dropKey")) {

            if (isFirstKey || isFirstClef) {
                mei = meiOperation.replaceKeyInScoreDef(selectedElement, t.id, this.currentMEI)
            } else {
                mei = meiOperation.insertKey(selectedElement, t.id, this.currentMEI)
            }
        } else if (selectedElement?.classList.contains("dropTime")) {
            if (isFirstMeter || isFirstClef) {
                mei = meiOperation.replaceMeterInScoreDef(selectedElement, this.currentMEI)
            } else {
                mei = meiOperation.insertMeter(selectedElement, this.currentMEI)
            }
        } else if (selectedElement?.classList.contains("dropTempo")) {
            mei = meiOperation.insertTempo(selectedElement, this.currentMEI)
        }
        else {
            return
        }

        this.loadDataCallback("", mei, false)
    }

    dropOnTargetFunction = (function dropOnBarline(e: MouseEvent) {
        this.dropOnTarget(e)
    }).bind(this)


    getElementInSVG(id: string): Element {
        if (id === "") return
        return this.vrvSVG.querySelector("#" + id)
    }

    getElementInInteractOverlay(id: string): Element {
        if (id === "") return
        return this.interactionOverlay.querySelector("*[refId=\"" + id + "\"]")
    }


    //////// GETTER / SETTER /////////////

    setCurrentMei(mei: Document) {
        this.currentMEI = mei
        return this
    }

    setm2s(m2s: Mouse2SVG) {
        this.m2s = m2s
        return this
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>) {
        this.loadDataCallback = loadDataCallback
        return this
    }

    setContainerId(containerId: string) {
        this.containerId = containerId
        this.vrvSVG = cq.getVrvSVG(containerId)
        this.interactionOverlay = cq.getInteractOverlay(containerId)
        this.container = document.getElementById(containerId)
        this.sidebarContainer = this.container.querySelector("#sidebarContainer")
        return this
    }


}

export default SidebarHandler
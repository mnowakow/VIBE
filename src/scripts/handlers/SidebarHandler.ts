import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import { keyIdToSig, clefToLine } from "../utils/mappings"
import { constants as c } from "../constants"
import * as meiConverter from "../utils/MEIConverter"
import * as meiOperation from "../utils/MEIOperations"
import * as coordinates from "../utils/coordinates"
import * as cq from "../utils/convenienceQueries"

/**
 * Handles all Events when interacting with the sidebar.
 * There is only one instance necessary.
 * Every change that results from a sidebar interaction is returned by a meiOperation
 */
class SidebarHandler implements Handler{
    
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: Document;
    loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>;
    containerId: string;
    container: Element
    interactionOverlay: Element
    rootSVG: Element

    constructor(){
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
        var dragTarget = this.interactionOverlay.querySelector("#scoreRects") //document.getElementById("rootSVG")
       this.interactionOverlay.addEventListener("dragleave", function(event){
            event.preventDefault()
            event.stopPropagation()
            if(event.target === dragTarget){
                that.removeSelectListeners()
            }
        }, false)
    

       this.interactionOverlay.addEventListener("dragenter", function(event){
            event.preventDefault()
            event.stopPropagation()
            if(Array.from(dragTarget.querySelectorAll("*")).every(c => c !== event.target)){
                that.setSelectListeners()
            }
        }, false)

        return this
    }

    removeListeners() {
        this.removeSelectListeners()
        return this
    }

    removeSelectListeners(){
       this.container.querySelectorAll("*[id*=keyList] > *").forEach(k => {
            if(k.tagName === "A"){
                k.removeEventListener("dblclick", this.keySigSelectHandler)
            }
        })

        this.container.querySelectorAll("*[id*=clefList] > *").forEach(k => {
            if(k.tagName === "A"){
                k.removeEventListener("dblclick", this.clefSelectHandler)
            }
        })
        document.removeEventListener("dragover", (e) => {
            e.preventDefault()
        })
        this.container.querySelectorAll("#sidebarList a, #timeDiv").forEach(sa => {
            sa.removeEventListener("drag", this.findDropTargetFunction)
            sa.removeEventListener("dragend", this.dropOnTargetFunction)
        })

        return this
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners() 
    }

    setSelectListeners(){
        this.container.querySelectorAll("*[id*=keyList] > *").forEach(k => {
            if(k.tagName === "A"){
                k.addEventListener("dblclick", this.keySigSelectHandler)
            }
        })

        this.container.querySelectorAll("*[id*=clefList] > *").forEach(k => {
            if(k.tagName === "A"){
                k.addEventListener("dblclick", this.clefSelectHandler)
            }
        })

        this.container.querySelectorAll("#sidebarList a, #timeDiv, #tempoDiv").forEach(sa => {
            sa.addEventListener("drag", this.findDropTargetFunction)
            sa.addEventListener("dragend", this.dropOnTargetFunction)
        })

        return this
    }

    /**
     * Make Score Elements Clickable (and mark them), which are important for functions in the sidebar
     * Has to be called externally, when new Score is Loaded
     * @returns this
     */
    makeScoreElementsClickable(){
        var that = this
        // Clefs are clickable and will be filled red (see css)
        this.interactionOverlay.querySelectorAll(".clef, .keySig").forEach(c => {
            c.addEventListener("click", function(){
                if(c.classList.contains("marked")){
                    c.classList.remove("marked")
                    that.getElementInSVG(c.getAttribute("refId"))?.classList.remove("marked")
                }else{
                    c.classList.add("marked")
                    that.getElementInSVG(c.getAttribute("refId"))?.classList.add("marked")
                }
            })
        })

        return this
    }

    keySigSelectHandler = (function handler(e: MouseEvent){
        e.preventDefault()
        this.setKeyGlobal(e)
    }).bind(this)

    // changeParameters by interacting with sidebar
    setKeyGlobal(e: MouseEvent){
        var target = e.target as Element
        this.currentMEI.querySelectorAll("staffDef > keySig").forEach(s => {
            s.setAttribute("sig", keyIdToSig.get(target.id))
        })

        var mei = meiOperation.adjustAccids(this.currentMEI)
        mei = meiConverter.restoreXmlIdTags(mei)
        this.loadDataCallback("", mei, false, c._TARGETDIVID_)

        return this
    }

    /**
     * If Meter is already present in MEI, load it in input for time signature
     * @returns 
     */
    loadMeter(){
        var staffDef = this.currentMEI.querySelector("staffDef")
        if(staffDef !== null){
            var hasMeter = staffDef.getAttribute("meter.count") !== null && staffDef.getAttribute("meter.unit") !== null
            if(hasMeter){
                this.container.querySelector("#timeCount").setAttribute("value", staffDef.getAttribute("meter.count"))
                this.container.querySelector("#timeUnit").setAttribute("value", staffDef.getAttribute("meter.unit"))
            }
        }
        return this
    }

    /**
     * Listen on Change when input is changed for Time Signatures
     */
    setChangeMeterListeners(){
        this.container.querySelector("#timeCount").addEventListener("change", this.changeMeterHandler)
        this.container.querySelector("#timeUnit").addEventListener("change", this.changeMeterHandler)
    }

    /**
     * Handler for changing Time Signatures (+ Loading)
     */
    changeMeterHandler = (function changeMeter(e: Event){
        var mei = meiOperation.changeMeter(this.currentMEI)
        if(mei !== null){
            mei = meiConverter.restoreXmlIdTags(mei)
            this.loadDataCallback("", mei, false, c._TARGETDIVID_)
        }
    }).bind(this)

    clefSelectHandler = (function handler(e: MouseEvent){
        e.preventDefault()
        this.setClefGlobal(e)
    }).bind(this)

    /**
     * Set Clefshape for all marked clefelements
     * @param e MouseEvent
     */
    setClefGlobal(e: MouseEvent){
        var target = e.target as Element
        var markedClefs = Array.from(this.rootSVG.querySelectorAll(".clef.marked"))
        var reload = false
        markedClefs.forEach(mc => {
            var rowNum = parseInt(mc.closest(".staff").getAttribute("n")) - 1
            var targetClefDef = this.currentMEI.querySelectorAll("staffDef > clef")[rowNum]
            if(targetClefDef.getAttribute("shape") !== target.id.charAt(0)){
                targetClefDef.setAttribute("shape", target.id.charAt(0))
                targetClefDef.setAttribute("line", clefToLine.get(target.id.charAt(0)))
                reload = true
            }
        })
        
        if(reload){
            this.loadDataCallback("", meiConverter.restoreXmlIdTags(this.currentMEI), false, c._TARGETDIVID_)
        }
    }

    /**
     * Find next possible element to drop element from sidebar on
     * @param e 
     */
    findDropTarget(e: MouseEvent){
        /** TODO: dropflags müssen auch in scoreRects eigegeben werden */
        e.preventDefault()
        var pt = coordinates.transformToDOMMatrixCoordinates(e.pageX, e.pageY, this.rootSVG)
        var posx = pt.x
        var posy = pt.y

        var eventTarget = e.target as Element
        var eventTargetParent = eventTarget.parentElement
        var eventTargetIsClef = eventTargetParent.id.toLowerCase().includes("clef")
        var eventTargetIsKey = eventTargetParent.id.toLowerCase().includes("key")
        var eventTargetIsTime = eventTarget.id.toLocaleLowerCase().includes("time")
        var eventTargetIsTempo = eventTarget.id.toLocaleLowerCase().includes("tempo")
        var dropTargets: NodeListOf<Element>
        var dropFlag: string

        if(eventTargetIsClef){
            dropTargets = this.rootSVG.querySelectorAll(".clef, .barLine > path")
            dropFlag = "dropClef"
        }else if(eventTargetIsKey){
            dropTargets = this.rootSVG.querySelectorAll(".keySig, .barLine > path, .clef")
            dropFlag = "dropKey"
        }else if(eventTargetIsTime){
            dropTargets = this.rootSVG.querySelectorAll(".meterSig, .barLine > path, .clef")
            dropFlag = "dropTime"
        }else if(eventTargetIsTempo){
            dropTargets = this.rootSVG.querySelectorAll(".note, .chord, .rest, .mRest")
            dropFlag = "dropTempo"
        }
        else{
            return
        }

        var tempDist = Math.pow(10, 10)
        dropTargets.forEach(dt => {
            var blbbox = dt.getBoundingClientRect()
            var ptdt = coordinates.getDOMMatrixCoordinates(blbbox, this.rootSVG)
            var bbx  = ptdt.left
            var bby  = ptdt.top
            var dist = Math.sqrt(Math.abs(bbx - posx)**2 + Math.abs(bby - posy)**2)
            if(dist < tempDist){
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

    findDropTargetFunction =(function findBarline(e: MouseEvent){
        this.findDropTarget(e)
    }).bind(this)

    /**
     * Determine action on drop elemnt from sidebar on score
     * @param e 
     */
    dropOnTarget(e: MouseEvent){
        e.preventDefault()
        var selectedElement = this.getElementInSVG(this.interactionOverlay.querySelector(".dropClef, .dropKey, .dropTime, .dropTempo")?.getAttribute("refId"))
        var t = e.target as Element
        var mei: Document

        var isFirstClef = Array.from(this.rootSVG.querySelectorAll(".measure[n=\"1\"] .clef")).some(mc => mc?.id === selectedElement?.id)
        var isFirstKey = Array.from(this.rootSVG.querySelectorAll(".measure[n=\"1\"] .keySig")).some(mc => mc?.id === selectedElement?.id)
        var isFirstMeter = Array.from(this.rootSVG.querySelectorAll(".measure[n=\"1\"] .meterSig")).some(mc => mc?.id === selectedElement?.id)

        if(selectedElement?.classList.contains("dropClef")){
            if(isFirstClef){
                mei = meiOperation.replaceClefinScoreDef(selectedElement, t.id, this.currentMEI)
            }else{
                mei = meiOperation.insertClef(selectedElement, t.id, this.currentMEI)
            }
        }else if(selectedElement?.classList.contains("dropKey")){
            
            if(isFirstKey || isFirstClef){
                mei = meiOperation.replaceKeyInScoreDef(selectedElement, t.id, this.currentMEI)
            }else{
                mei = meiOperation.insertKey(selectedElement, t.id, this.currentMEI)
            }
        }else if(selectedElement?.classList.contains("dropTime")){
            if(isFirstMeter || isFirstClef){
                mei = meiOperation.replaceMeterInScoreDef(selectedElement, this.currentMEI)
            }else{
                mei = meiOperation.insertMeter(selectedElement, this.currentMEI)
            }
        }else if(selectedElement?.classList.contains("dropTempo")){
            mei = meiOperation.insertTempo(selectedElement, this.currentMEI)
        }
        else{
            return
        }

        this.loadDataCallback("", mei, false, c._TARGETDIVID_)
    }

    dropOnTargetFunction =(function dropOnBarline(e: MouseEvent){
        this.dropOnTarget(e)
    }).bind(this)


    getElementInSVG(id: string): Element{
        if(id === "") return
        return this.rootSVG.querySelector("#"+id)
    }

    getElementInInteractOverlay(id: string): Element{
        if(id === "") return
        return this.interactionOverlay.querySelector("*[refId=\"" + id +"\"]")
    }


    //////// GETTER / SETTER /////////////

    setCurrentMei(mei: Document){
        this.currentMEI = mei
        return this
    }

    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
        return this
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>){
        this.loadDataCallback = loadDataCallback
        return this
    }

    setContainerId(containerId: string) {
        this.containerId = containerId
        this.rootSVG = cq.getRootSVG(containerId)
        this.interactionOverlay = cq.getInteractOverlay(containerId)
        this.container = document.getElementById(containerId)
        return this
    }

    
}

export default SidebarHandler
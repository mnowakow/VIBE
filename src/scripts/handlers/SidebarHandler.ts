import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import { keyIdToSig, clefToLine } from "../utils/mappings"
import { constants as c } from "../constants"
import * as meiConverter from "../utils/MEIConverter"
import * as meiOperation from "../utils/MEIOperations"
import { select } from "d3";

/**
 * Handles all Events when interacting with the sidebar.
 * There is only one instance necessary.
 * Every change that result from a sidebar interaction is returned by a meiOperation
 */
class SidebarHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: Document;
    loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>;

    constructor(){
        this.setListeners()
    }

    setListeners() {
        this.setKeySigSelectListeners()
        this.setClefSelectListeners()
        this.setChangeMeterListeners()
        return this
    }

    removeListeners() {
        document.querySelectorAll("*[id*=keyList] > *").forEach(k => {
            if(k.tagName === "A"){
                k.removeEventListener("click", this.keySigSelectHandler)
            }
        })

        document.querySelectorAll("*[id*=clefList] > *").forEach(k => {
            if(k.tagName === "A"){
                k.removeEventListener("click", this.clefSelectHandler)
            }
        })

        document.removeEventListener("dragover", (e) => {
            e.preventDefault()
        })
        document.querySelectorAll("#sidebarList a").forEach(sa => {
            sa.removeEventListener("drag", this.findDropTargetFunction)
            sa.removeEventListener("dragend", this.dropOnTargetFunction)
        })
        return this
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners() 
    }


    setKeySigSelectListeners(){
        document.querySelectorAll("*[id*=keyList] > *").forEach(k => {
            if(k.tagName === "A"){
                k.addEventListener("click", this.keySigSelectHandler)
            }
        })
        return this
    }

    setClefSelectListeners(){
        document.querySelectorAll("*[id*=clefList] > *").forEach(k => {
            if(k.tagName === "A"){
                k.addEventListener("click", this.clefSelectHandler)
            }
        })

        document.addEventListener("dragover", (e) => {
            e.preventDefault()
        })
        document.querySelectorAll("#sidebarList a").forEach(sa => {
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
        // Clefs are clickable and will be filled red (see css)
        document.querySelectorAll(".clef").forEach(c => {
            c.addEventListener("click", function(){
                if(c.classList.contains("marked")){
                    c.classList.remove("marked")
                }else{
                    c.classList.add("marked")
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
                document.getElementById("timeCount").setAttribute("value", staffDef.getAttribute("meter.count"))
                document.getElementById("timeUnit").setAttribute("value", staffDef.getAttribute("meter.unit"))
            }
        }
        return this
    }

    /**
     * Listen on Change when input is changed for Time Signatures
     */
    setChangeMeterListeners(){
        document.getElementById("timeCount").addEventListener("change", this.changeMeterHandler)
        document.getElementById("timeUnit").addEventListener("change", this.changeMeterHandler)
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
        var markedClefs = Array.from(document.querySelectorAll(".clef.marked"))
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
     * Find next possible eleent to drop element from sidebar on
     * @param e 
     */
    findDropTarget(e: MouseEvent){
        e.preventDefault()
        var root = document.getElementById(c._ROOTSVGID_)
        var rootBBox = root.getBoundingClientRect()
        var posx = (e.pageX - window.pageXOffset - rootBBox.x - root.scrollLeft)
        var posy = (e.pageY - window.pageYOffset - rootBBox.y - root.scrollTop)

        var eventTarget = e.target as Element
        var eventTargetParent = eventTarget.parentElement
        var eventTargetIsClef = eventTargetParent.id.toLowerCase().includes("clef")
        var eventTargetIsKey = eventTargetParent.id.toLowerCase().includes("key")
        var dropTargets: NodeListOf<Element>
        var dropFlag: string

        if(eventTargetIsClef){
            dropTargets = document.querySelectorAll(".clef, .barLine > path")
            dropFlag = "dropClef"
        }else if(eventTargetIsKey){
            dropTargets = document.querySelectorAll(".keySig, .barLine > path, .clef")
            dropFlag = "dropKey"
        }
        else{
            return
        }

        var tempDist = Math.pow(10, 10)
        dropTargets.forEach(dt => {
            var blbbox = dt.getBoundingClientRect()
            var dist = Math.sqrt(Math.abs(blbbox.x - posx)**2 + Math.abs(blbbox.y - posy)**2)
            if(dist < tempDist){
                dropTargets.forEach(_dt => {
                    _dt.removeAttribute("fill")
                    _dt.removeAttribute("color")
                    _dt.classList.remove(dropFlag)
                })
                tempDist = dist
                dt.setAttribute("fill", "orange")
                dt.setAttribute("color", "orange")
                dt.classList.add(dropFlag)
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
        var selectedElement = document.querySelector(".dropClef, .dropKey") 
        var t = e.target as Element
        var mei: Document

        console.log("SELECTED ELEMENT:", selectedElement)
        var isFirstClef = document.querySelector(".measure[n=\"1\"] .clef").id === selectedElement.id
        var isFirstKey = Array.from(document.querySelectorAll(".measure[n=\"1\"] .keySig")).some(mc => mc.id === selectedElement.id)
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
        }else{
            return
        }


        this.loadDataCallback("", mei, false, c._TARGETDIVID_)
    }

    dropOnTargetFunction =(function dropOnBarline(e: MouseEvent){
        this.dropOnTarget(e)
    }).bind(this)


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

    
}

export default SidebarHandler
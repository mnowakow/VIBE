import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import { keyIdToSig } from "../utils/mappings"
import { constants as c } from "../constants"
import * as meiConverter from "../utils/MEIConverter"
import * as meiOperation from "../utils/MEIOperations"

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

    removeListeners(): void {
        console.log(this, "RemoveListener not Implementds")
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
                var line: string
                switch(target.id.charAt(0)){
                    case "G":
                        line = "2"
                        break;
                    case "C":
                        line = "3"
                        break;
                    case "F":
                        line = "4"
                        break;
                }
                targetClefDef.setAttribute("line", line)
                reload = true
            }
        })
        
        if(reload){
            this.loadDataCallback("", meiConverter.restoreXmlIdTags(this.currentMEI), false, c._TARGETDIVID_)
        }
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

    
}

export default SidebarHandler
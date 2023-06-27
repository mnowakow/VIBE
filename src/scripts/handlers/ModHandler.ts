import MusicPlayer from "../MusicPlayer";
import { Mouse2SVG } from "../utils/Mouse2SVG";
import Handler from "./Handler";
import { constants as c} from "../constants"
import { uuidv4 } from "../utils/random";
import * as meiConverter from "../utils/MEIConverter"
import * as meiOperation from "../utils/MEIOperations"
import { noteToB } from "../utils/mappings";
import * as cq from "../utils/convenienceQueries"

const modSelector = ".slur, .tie, .accid"

/**
 * Handler for all options which could modulate the given score. These functions are related to all buttons in the sidebar and toolbar
 */
class ModHandler implements Handler{

    m2s?: Mouse2SVG;
    musicPlayer?: MusicPlayer;
    currentMEI?: Document;

    private tieNotesButton: Element
    private organizeBeamsButton: Element
    private alterUpButton: Element
    private alterDownButton: Element
    private alterNeutralButton: Element
    private alterDDownButton: Element
    private alterDUpButton: Element
    private alterButtons: Array<Element>
    private loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>;
    containerId: string;
    interactionOverlay: Element
    container: Element
    vrvSVG: Element
  
    constructor(containerId){
        this.setContainerId(containerId)
        this.tieNotesButton = this.container.querySelector("#tieNotes")
        this.organizeBeamsButton = this.container.querySelector("#organizeBeams")
        var a = this.alterUpButton = this.container.querySelector("#alterUp")
        var b = this.alterDownButton = this.container.querySelector("#alterDown")
        var c = this.alterNeutralButton = this.container.querySelector("#alterNeutral")
        var d = this.alterDUpButton = this.container.querySelector("#alterDUp")
        var e = this.alterDDownButton = this.container.querySelector("#alterDDown")
        this.alterButtons = [a, b, c, d, e]

    }

    setListeners(){
       this.tieNotesButton.addEventListener("click", this.connectNotesFunction)
       this.organizeBeamsButton.addEventListener("click", this.organizeBeamsFunction)
       this.alterButtons.forEach(ab => {
           ab.addEventListener("click", this.alterFunction)
       })
       this.makeScoreElementsClickable()
    }


    removeListeners(){
        this.tieNotesButton.removeEventListener("click", this.connectNotesFunction)
        this.organizeBeamsButton.removeEventListener("click", this.organizeBeamsFunction)  
        this.alterButtons.forEach(ab => {
            ab.removeEventListener("click", this.alterFunction)
        })  
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners()
        return this
    }


    /** Wrapperfunction for Eventslistener */
    connectNotesFunction = (function connectNotesFunction(e: MouseEvent){
        e.preventDefault()
        this.connectNotes(e)
    }).bind(this)

    /** Wrapperfunction for Eventslistener */
    organizeBeamsFunction = (function organizeBeamsFunction(e: MouseEvent){
        e.preventDefault()
        this.organizeBeams(e)
    }).bind(this)

    alterFunction = (function alterFunction(e: MouseEvent){
        e.preventDefault()
        e.stopPropagation()
        this.alterNotes(e)
    }).bind(this)

    /**
     * Make slur or tie for 2 or more elements when tie button is clicked
     * Tie, only when there are two selected elemets which are the same pitch
     * Delete otherwise
     * @param e 
     */
    connectNotes(e: MouseEvent){
        var markedElements = Array.from(this.vrvSVG.querySelectorAll(".note.marked"))
        markedElements = markedElements.filter(me => me.closest(".layer").getAttribute("n") === markedElements[0].closest(".layer").getAttribute("n"))
        if(markedElements.length <= 1){return}
        var makeSlur = markedElements.length > 2
        //if(!makeSlur && markedElements.length > 1){ // assert only 2 items
            var leftId = markedElements[0].id
            var rightId = markedElements.reverse()[0].id
            var leftMeiElement = this.currentMEI.getElementById(leftId)
            var rightMeiElement = this.currentMEI.getElementById(rightId)
            var leftpname = leftMeiElement.getAttribute("pname")
            var leftoct = leftMeiElement.getAttribute("oct")
            var leftAccid = leftMeiElement.getAttribute("accid") || leftMeiElement.getAttribute("accid.ges")
            var rightpname = rightMeiElement.getAttribute("pname")
            var rightoct = rightMeiElement.getAttribute("oct")
            var rightAccid = rightMeiElement.getAttribute("accid") || rightMeiElement.getAttribute("accid.ges")
            if(!(leftpname === rightpname && leftoct === rightoct && leftAccid === rightAccid)){
                makeSlur = true
            }
        //}
        var connections = this.currentMEI.querySelectorAll("tie, slur")
        var deleted = false
        connections.forEach(c => {
            var sid = c.getAttribute("startid").replace("#", "")
            var eid = c.getAttribute("endid").replace("#", "")
            if(sid === leftId &&  eid === rightId){
                c.remove()
                deleted = true
            }
        })
       if(!deleted){
            var tieElement: Element
            if(makeSlur){
                tieElement = this.currentMEI.createElementNS(c._MEINS_, "slur")
            }else{
                tieElement = this.currentMEI.createElementNS(c._MEINS_, "tie")
            }
            tieElement.setAttribute("startid", "#" + leftId)
            tieElement.setAttribute("endid", "#" + rightId)
            tieElement.setAttribute("id", uuidv4())
            this.currentMEI.getElementById(leftId).closest("measure").append(tieElement)
        }
        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
        this.loadDataCallback("", mei, false)
    }

    /**
     * Pack selected elements in own beam element. Only for dur > 4
     * @param e 
     */
    organizeBeams(e: MouseEvent){
        var markedElements = Array.from(this.vrvSVG.querySelectorAll(".marked")) // (".note.marked, .chord.marked"))
        markedElements = markedElements.filter(me => {
            var isInLayer = me.closest(".layer").getAttribute("n") === markedElements[0].closest(".layer").getAttribute("n")
            var hasDur = this.currentMEI.getElementById(me.id) !== null ? this.currentMEI.getElementById(me.id).getAttribute("dur") !== null : false
            return isInLayer && hasDur
        })
        if(markedElements.length === 0){return}
        
        var haveRightDur = markedElements.filter(me => {
            var dur = this.currentMEI.getElementById(me.id)?.getAttribute("dur")
            return parseInt(dur) > 4
        }).length >= 2

        if(haveRightDur){
            var firstMeiElement= this.currentMEI.getElementById(markedElements[0].id)
            var newBeam = this.currentMEI.createElementNS(c._MEINS_, "beam")
            var oldBeam = firstMeiElement.closest("beam")
            firstMeiElement.parentElement.insertBefore(newBeam, firstMeiElement)
            markedElements.forEach(me => {
                newBeam.append(this.currentMEI.getElementById(me.id))
            })
            if(oldBeam !== null && oldBeam.childElementCount > 1){
                var beamCandidates = new Array<Element>()
                var bc: Element
                oldBeam.querySelectorAll(":scope > *").forEach(cn => {
                    if(cn.tagName.toLowerCase() === "beam"){
                        if(beamCandidates.length > 0){
                            if(beamCandidates.length === 1){
                                bc = beamCandidates[0]
                            }else if(beamCandidates.length > 1){
                                bc = this.currentMEI.createElementNS(c._MEINS_, "beam")
                                beamCandidates.forEach(b => bc.append(b))
                            }
                            oldBeam.parentElement.insertBefore(bc, oldBeam)
                            beamCandidates = new Array<Element>()
                        }
                        oldBeam.parentElement.insertBefore(cn, oldBeam)
                    }else{
                        beamCandidates.push(cn)
                    }
                })

                if(beamCandidates.length > 0){ // if array is still full after loop
                    if(beamCandidates.length === 1){
                        bc = beamCandidates[0]
                    }else if(beamCandidates.length > 1){
                        bc = this.currentMEI.createElementNS(c._MEINS_, "beam")
                        beamCandidates.forEach(b => bc.append(b))
                    }
                    oldBeam.parentElement.insertBefore(bc, oldBeam)
                }
            }else if(oldBeam?.childElementCount === 1){
                if(oldBeam.firstElementChild.tagName.toLowerCase() === "beam"){
                    Array.from(oldBeam.firstElementChild.children).forEach(c => {
                        oldBeam.parentElement.insertBefore(c, oldBeam)
                    })
                }else{
                    oldBeam.parentElement.insertBefore(oldBeam.firstElementChild, oldBeam)
                }
                oldBeam.remove()
            }
            
            meiOperation.cleanUp(this.currentMEI)
            var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
            this.loadDataCallback("", mei, false)
        }
    } 

    /**
     * Alter Notes (accid) according to button.
     * @param e 
     * @returns 
     */
    alterNotes(e: MouseEvent){
        var target = e.target as Element
        var accidSig: string

        switch(target.id){
            case "alterUp":
                accidSig = "s"
                break;
            case "alterDown":
                accidSig = "f"
                break;
            case "alterDUp":
                accidSig = "ss"
                break;
            case "alterDDown":
                accidSig = "ff"
                break;
            case "alterNeutral":
                accidSig = "n"
                break;
            default:
                console.error(target.id, "No such option for accid alteration")
                return
        }

        this.vrvSVG.querySelectorAll(".note.marked").forEach(nm => {
            var meiElement = this.currentMEI.getElementById(nm.id)
            meiElement.setAttribute("accid", accidSig)
            meiElement.removeAttribute("accid.ges")
        })

        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
        meiOperation.adjustAccids(mei)
        this.loadDataCallback("", mei, false)
    }

    /**
     * Make Score Elements Clickable (and mark them), which are important for functions in the modulation toolbar group
     * @returns this
     */
     makeScoreElementsClickable(){
        var that = this
        cq.getInteractOverlay(this.containerId).querySelectorAll(modSelector).forEach(c => {
            c.addEventListener("click", function(e: MouseEvent){
                e.preventDefault()
                e.stopImmediatePropagation()
                that.vrvSVG.querySelectorAll(modSelector).forEach(c => c.classList.remove("marked"))
                var originSVG = that.vrvSVG.querySelector("#" + this.getAttribute("refId"))
                if(originSVG.classList.contains("marked")){
                    originSVG.classList.remove("marked")
                }else{
                    originSVG.classList.add("marked")
                }
            })
        })
     }

    //GETTER/ SETTER
    setCurrentMEI(mei: Document){
        this.currentMEI = mei
        return this
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>){
        this.loadDataCallback = loadDataCallback
        return this
    }

    setContainerId(containerId: string) {
        this.containerId = containerId
        this.interactionOverlay = cq.getInteractOverlay(containerId)
        this.vrvSVG = cq.getVrvSVG(containerId)
        this.container = document.getElementById(containerId)
        return this
    }

}

export default ModHandler
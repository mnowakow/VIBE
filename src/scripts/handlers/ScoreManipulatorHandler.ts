import ScoreManipulator from "../gui/ScoreManipulator";
import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import {constants as c } from '../constants'
import * as meiOperation from '../utils/MEIOperations'
import * as meiConverter from '../utils/MEIConverter'
import * as cq from "../utils/convenienceQueries"
import { threadId } from "worker_threads";

const manipSelector = ".manipulator"

/**
 * Handler for all options which could modulate the given score from within the score. These functions are related to all seen inside a score
 */
class ScoreManipulatorHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;
    private containerId: string
    private interactionOverlay: Element

    private sm: ScoreManipulator;
    loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>;
    manipulatorCanvas: SVGSVGElement;
    private manipulateEvent: Event

    constructor(){
        this.sm = new ScoreManipulator()
        this.manipulateEvent = new Event("manipulated")
    }

    addCanvas(){
        var rootBBox = cq.getRootSVG(this.containerId).getBoundingClientRect()
        var rootWidth = rootBBox.width.toString()
        var rootHeigth = rootBBox.height.toString()

        this.manipulatorCanvas = document.createElementNS(c._SVGNS_, "svg")
        this.manipulatorCanvas.setAttribute("id", "manipulatorCanvas")
        this.manipulatorCanvas.classList.add("canvas")
        this.manipulatorCanvas.setAttribute("preserveAspectRatio", "xMinYMin meet")
        this.manipulatorCanvas.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
        this.manipulatorCanvas.insertAdjacentElement("beforebegin", this.interactionOverlay.querySelector("#scoreRects"))
        this.interactionOverlay.append(this.manipulatorCanvas)
    }

    drawElements(){
        this.addCanvas()
        this.sm.drawMeasureAdder()
        this.sm.drawMeasureRemover()
        this.sm.drawStaffManipulators()
        this.setListeners()
    }

    removeElements(){
        //this.removeListeners()
       this.interactionOverlay.querySelectorAll(manipSelector).forEach(m => {
            m.remove()
        })
    }

    setListeners() {
        var that = this
        this.removeListeners()
        this.interactionOverlay.querySelector("#measureAdder").addEventListener("click", this.addMeasure, true)
        this.interactionOverlay.querySelector("#measureRemover").addEventListener("click", this.removeMeasure, true)
        this.interactionOverlay.querySelectorAll(".addStaff").forEach(as => {
            as.addEventListener("click", that.addStaff, true)
        })

       this.interactionOverlay.querySelectorAll(".removeStaff").forEach(as => {
            as.addEventListener("click", that.removeStaff, true)
        })
    }

    removeListeners(){
        var that = this
        this.interactionOverlay.querySelector("#measureAdder")?.removeEventListener("click", this.addMeasure)
        this.interactionOverlay.querySelector("#measureRemover")?.removeEventListener("click", this.removeMeasure)
        this.interactionOverlay.querySelectorAll(".addStaff").forEach(as => {
            as.removeEventListener("click", that.addStaff)
        })

        this.interactionOverlay.querySelectorAll(".removeStaff").forEach(as => {
            as.removeEventListener("click", that.removeStaff)
        })
    }

    addMeasure = (function handler(e: MouseEvent){
        e.target.dispatchEvent(this.manipulateEvent)
        e.preventDefault()
        e.stopPropagation()
        meiOperation.addMeasure(this.currentMEI as Document)
        this.loadDataCallback("", meiConverter.restoreXmlIdTags(this.currentMEI), false, c._TARGETDIVID_)
    }).bind(this)

    removeMeasure = (function handler(e: MouseEvent){
        e.target.dispatchEvent(this.manipulateEvent)
        e.preventDefault()
        e.stopPropagation()
        meiOperation.removeMeasure(this.currentMEI as Document)
        this.loadDataCallback("", meiConverter.restoreXmlIdTags(this.currentMEI), false, c._TARGETDIVID_)
    }).bind(this)

    addStaff = (function handler(e: MouseEvent){
        var target = (e.target as Element).closest(".manipulator")
        target.dispatchEvent(this.manipulateEvent)
        e.preventDefault()
        e.stopPropagation()
        var relpos = target.classList.contains("below") ? "below" : "above"
        meiOperation.addStaff(this.currentMEI as Document, document.getElementById(target.getAttribute("refId")), relpos)
        this.musicPlayer.resetInstruments()
        this.loadDataCallback("", meiConverter.restoreXmlIdTags(this.currentMEI), false, c._TARGETDIVID_)
      
    }).bind(this)

    removeStaff = (function handler(e: MouseEvent){
        var target = (e.target as Element).closest(".manipulator")
        target.dispatchEvent(this.manipulateEvent)
        e.preventDefault()
        e.stopPropagation()
        var relpos = target.classList.contains("below") ? "below" : "above"
        meiOperation.removeStaff(this.currentMEI as Document, document.getElementById(target.getAttribute("refId")), relpos)
        this.musicPlayer.resetInstruments()
        this.loadDataCallback("", meiConverter.restoreXmlIdTags(this.currentMEI), false, c._TARGETDIVID_)
        e.target.dispatchEvent(this.manipulateEvent)
    }).bind(this)


    removeFunction = (function handler(){
        this.removeElements()
    }).bind(this)

    drawFunction = (function handler(e: TransitionEvent){
        var that = this
        setTimeout(function(){
            that.drawElements()
        }, 500)
        //this.drawElements()
    }).bind(this)

    //SETTER////

    setMEI(mei:Document){
        this.currentMEI = mei
        this.sm.setMEI(mei)
        return this
    }

    setMusicPlayer(mp: MusicPlayer){
        this.musicPlayer = mp
        return this
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>){
        this.loadDataCallback = loadDataCallback
        return this
    }

    setContainerId(containerId: string) {
        this.containerId = containerId
        this.interactionOverlay = cq.getInteractOverlay(containerId)
        this.sm.setContainerId(this.containerId)
        return this
    }
}

export default ScoreManipulatorHandler
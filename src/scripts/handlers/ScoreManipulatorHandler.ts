import ScoreManipulator from "../gui/ScoreManipulator";
import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import {constants as c } from '../constants'
import * as meiOperation from '../utils/MEIOperations'
import * as meiConverter from '../utils/MEIConverter'

const manipSelector = ".manipulator"

/**
 * Handler for all options which could modulate the given score from within the score. These functions are related to all seen inside a score
 */
class ScoreManipulatorHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    private sm: ScoreManipulator;
    loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>;
    manipulatorCanvas: SVGSVGElement;
    private manipulateEvent: Event

    constructor(){
        this.sm = new ScoreManipulator()
        this.manipulateEvent = new Event("manipulated")
    }

    addCanvas(){
        var rootBBox = document.getElementById(c._ROOTSVGID_).getBoundingClientRect()
        var rootWidth = rootBBox.width.toString()
        var rootHeigth = rootBBox.height.toString()

        this.manipulatorCanvas = document.createElementNS(c._SVGNS_, "svg")
        this.manipulatorCanvas.setAttribute("id", "manipulatorCanvas")
        this.manipulatorCanvas.classList.add("canvas")
        this.manipulatorCanvas.setAttribute("preserveAspectRatio", "xMinYMin meet")
        this.manipulatorCanvas.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
        document.getElementById(c._ROOTSVGID_).append(this.manipulatorCanvas)
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
        document.querySelectorAll(manipSelector).forEach(m => {
            m.remove()
        })
    }

    setListeners() {
        var that = this
        this.removeListeners()
        document.getElementById("measureAdder").addEventListener("click", this.addMeasure)
        document.getElementById("measureRemover").addEventListener("click", this.removeMeasure)
        document.querySelectorAll(".addStaff").forEach(as => {
            as.addEventListener("click", that.addStaff)
        })

        document.querySelectorAll(".removeStaff").forEach(as => {
            as.addEventListener("click", that.removeStaff)
        })
        //document.getElementById("toggleSidebar").addEventListener("click", this.removeFunction)
        //document.getElementById("toggleSidebar").addEventListener("click", this.drawFunction)
    }

    removeListeners() {
        var that = this
        document.getElementById("measureAdder")?.removeEventListener("click", this.addMeasure)
        document.getElementById("measureRemover")?.removeEventListener("click", this.removeMeasure)
        document.querySelectorAll(".addStaff").forEach(as => {
            as.removeEventListener("click", that.addStaff)
        })

        document.querySelectorAll(".removeStaff").forEach(as => {
            as.removeEventListener("click", that.removeStaff)
        })
        //document.getElementById("toggleSidebar")?.removeEventListener("click", this.removeFunction)
        //document.getElementById("toggleSidebar")?.removeEventListener("click", this.drawFunction)
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
}

export default ScoreManipulatorHandler
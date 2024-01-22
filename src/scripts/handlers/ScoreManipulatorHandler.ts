import ScoreManipulator from "../gui/ScoreManipulator";
import MusicProcessor from "../MusicProcessor";
import { Mouse2SVG } from "../utils/Mouse2SVG";
import Handler from "./Handler";
import { constants as c } from '../constants'
import * as meiOperation from '../utils/MEIOperations'
import * as meiConverter from '../utils/MEIConverter'
import * as cq from "../utils/convenienceQueries"
import { isJSDocThisTag } from "typescript";
import MeiTemplate from "../assets/mei_template";
import ScoreGraph from "../datastructures/ScoreGraph";

const manipSelector = ".manipulator"
const canvasId = "manipulatorCanvas"

/**
 * Handler for all options which could change the given score with methods which are not bound to the toolsbars.
 * These functions are related to all elements seen inside a score. (Adding Staves, Measures and Layers)
 */
class ScoreManipulatorHandler implements Handler {
    m2s?: Mouse2SVG;
    musicPlayer?: MusicProcessor;
    currentMEI?: Document;
    private scoreGraph: ScoreGraph
    private containerId: string
    private interactionOverlay: Element
    private cacheLayers = {}

    private sm: ScoreManipulator;
    loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>;
    manipulatorCanvas: SVGSVGElement;
    private manipulateEvent: Event

    constructor() {
        this.sm = new ScoreManipulator()
        this.manipulateEvent = new Event("manipulated")
    }

    addCanvas() {
        var rootBBox = cq.getVrvSVG(this.containerId).firstElementChild.getBoundingClientRect()
        var rootWidth = rootBBox.width.toString()
        var rootHeigth = rootBBox.height.toString()

        this.manipulatorCanvas = document.createElementNS(c._SVGNS_, "svg")
        this.manipulatorCanvas.setAttribute("id", canvasId)
        this.manipulatorCanvas.classList.add("canvas")
        //this.manipulatorCanvas.setAttribute("preserveAspectRatio", "xMinYMin meet")
        //this.manipulatorCanvas.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
        this.interactionOverlay.querySelector("#" + canvasId)?.remove()
        this.manipulatorCanvas.insertAdjacentElement("beforebegin", this.interactionOverlay.querySelector("#scoreRects"))
        this.interactionOverlay.append(this.manipulatorCanvas)
    }

    drawElements() {
        this.addCanvas()
        this.sm.drawMeasureManipulators()
        this.sm.drawStaffManipulators()
        this.sm.drawVoiceSelectors()
        this.setListeners()
        return this
    }

    removeElements() {
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

        this.interactionOverlay.querySelectorAll(".voiceBtn").forEach(vb => {
            vb.addEventListener("click", that.selectVoiceHandler, true)
        })
        // if(!this.interactionOverlay.querySelector(".voiceBtn.selected")){
        //     (this.interactionOverlay.querySelector(".voiceBtn") as HTMLElement).click()
            
        // }
    }

    removeListeners() {
        var that = this
        this.interactionOverlay.querySelector("#measureAdder")?.removeEventListener("click", this.addMeasure)
        this.interactionOverlay.querySelector("#measureRemover")?.removeEventListener("click", this.removeMeasure)
        this.interactionOverlay.querySelectorAll(".addStaff").forEach(as => {
            as.removeEventListener("click", that.addStaff)
        })

        this.interactionOverlay.querySelectorAll(".removeStaff").forEach(as => {
            as.removeEventListener("click", that.removeStaff)
        })

        this.interactionOverlay.querySelectorAll(".voiceBtn").forEach(vb => {
            vb.removeEventListener("click", that.selectVoiceHandler)
        })
    }

    addMeasure = (function addMeasure(e: MouseEvent) {
        e.target.dispatchEvent(this.manipulateEvent)
        e.preventDefault()
        e.stopPropagation()
        meiOperation.addMeasure(this.currentMEI as Document)
        var that = this
        this.loadDataCallback("last", meiConverter.restoreXmlIdTags(this.currentMEI), false).then(() => {
           that.setActiveLayers()
        })
    }).bind(this)

    removeMeasure = (function removeMeasure(e: MouseEvent) {
        e.target.dispatchEvent(this.manipulateEvent)
        e.preventDefault()
        e.stopPropagation()
        meiOperation.removeMeasure(this.currentMEI as Document)
        this.loadDataCallback("last", meiConverter.restoreXmlIdTags(this.currentMEI), false)
    }).bind(this)

    addStaff = (function addStaff(e: MouseEvent) {
        var target = (e.target as Element).closest(".manipulator")
        target.dispatchEvent(this.manipulateEvent)
        e.preventDefault()
        e.stopPropagation()
        var relpos = target.classList.contains("below") ? "below" : "above"
        meiOperation.addStaff(this.currentMEI as Document, document.getElementById(target.getAttribute("refId")), relpos)
        this.musicPlayer.resetMidiInstruments()
        var that = this
        this.loadDataCallback("1", meiConverter.restoreXmlIdTags(this.currentMEI), false).then(() => {
            that.setActiveLayers()
        })

    }).bind(this)

    removeStaff = (function removeStaff(e: MouseEvent) {
        var target = (e.target as Element).closest(".manipulator")
        target.dispatchEvent(this.manipulateEvent)
        e.preventDefault()
        e.stopPropagation()
        var relpos = target.classList.contains("below") ? "below" : "above"
        meiOperation.removeStaff(this.currentMEI as Document, document.getElementById(target.getAttribute("refId")), relpos)
        this.musicPlayer.resetMidiInstruments()
        this.loadDataCallback("1", meiConverter.restoreXmlIdTags(this.currentMEI), false)
        e.target.dispatchEvent(this.manipulateEvent)
    }).bind(this)


    removeFunction = (function removeElementsFunction() {
        this.removeElements()
    }).bind(this)

    selectVoiceHandler = (function selectVoiceHandler(e) {
        this.selectVoice(e)
    }).bind(this)

    /**
     * Logic for behaviour if when a voice btn is selected:
     * Creating new layer, deactivating and reactivating layers.
     * Afterwards the MEI will be rendered anew.
     * @param e 
     */
    selectVoice(e: MouseEvent) {
        var t = (e.target as HTMLElement).closest(".voiceBtn")
        var staffN = t.getAttribute("staffN")
        var btnN = t.getAttribute("btnN")

        // change between selected and inactive button
        if(t.classList.contains("selected")){
            t.classList.remove("selected"); 
            t.classList.add("inactive");
        }else if(t.classList.contains("inactive")){
            t.classList.remove("inactive"); 
            t.classList.add("selected");
        }


        var that = this
        //In this case there is no existing layer for the selected voice
        if(!this.currentMEI.querySelector(`staff[n='${staffN}'] layer[n='${btnN}']`) && !this.cacheLayers[staffN + btnN]){
            meiOperation.addLayerForStaff(this.currentMEI, staffN, btnN)
            this.loadDataCallback("1", meiConverter.restoreXmlIdTags(this.currentMEI), false).then(() =>{
                that.setActiveLayerClass(staffN, btnN)
            })
        }else{
             // if the button is really inactive, cache the layer for this layer and staff
            if(t.classList.contains("inactive")){
                this.cacheLayers[staffN + btnN] = this.currentMEI.querySelectorAll(`staff[n='${staffN}'] layer[n='${btnN}']`)
                console.log(this.cacheLayers)
                this.currentMEI.querySelectorAll(`staff[n='${staffN}'] layer[n='${btnN}']`).forEach(el => el.remove())
            }else if(this.cacheLayers[staffN + btnN]){ // bring the layers back to life
                this.currentMEI.querySelectorAll(`staff[n='${staffN}']`).forEach((staff, i) => {
                    if(this.cacheLayers[staffN + btnN][i]){
                        staff.insertBefore(this.cacheLayers[staffN + btnN][i], staff.querySelector(`layer[n='${(parseInt(btnN) + 1).toString()}']`))
                    }else{
                        staff.append(new MeiTemplate().createLayer(btnN))
                    }
                })
                delete this.cacheLayers[staffN + btnN]
            }
            this.loadDataCallback("", meiConverter.restoreXmlIdTags(this.currentMEI), false).then(() =>{
                that.setActiveLayerClass(staffN, btnN)
            })
        }
    }

    setActiveLayerClass(staffN: string, btnN: string){
        this.interactionOverlay.querySelectorAll(`.voiceBtn[staffN='${staffN}'].selected`).forEach(vb => vb.classList.remove("selected"))
        this.interactionOverlay.querySelectorAll(`.voiceBtn:not(.inactive)[staffN='${staffN}'][btnN='${btnN}']`).forEach(vb => vb.classList.add("selected"))
        
        cq.getContainer(this.containerId).querySelectorAll(`.staff[n='${staffN}'] > .activeLayer`).forEach(layer => layer.classList.remove("activeLayer"))
        cq.getContainer(this.containerId).querySelectorAll(`.staff[n='${staffN}'] > .layer[n='${btnN}']`).forEach(layer => {
            layer.classList.add("activeLayer")
        })
        return this
    }

    setActiveLayers(){
        cq.getContainer(this.containerId).querySelectorAll(".activeLayer").forEach(al => {
            var staffN = al.closest(".staff").getAttribute("n")
            this.setActiveLayerClass(staffN, al.getAttribute("n"))
        })
        cq.getContainer(this.containerId).querySelectorAll("#vrvSVG .staff:not(:has(.activeLayer))").forEach(staff => {
            this.setActiveLayerClass(staff.getAttribute("n"), "1")
        })

        var activeNotes = Array.from(cq.getContainer(this.containerId).querySelectorAll(".activeLayer > .note")).reverse()
        var hasNotes = activeNotes.length > 0
        var lastNode = cq.getContainer(this.containerId).querySelector(".activeLayer > :is(.rest, .mRest")
            if(hasNotes){
                lastNode = activeNotes[0]
            }
        this.scoreGraph.setCurrentNodeById(lastNode.id)
    }

    //SETTER////

    setMEI(mei: Document) {
        this.currentMEI = mei
        this.sm.setMEI(mei)
        return this
    }

    setm2s(m2s: Mouse2SVG){
        this.m2s = m2s
        return this
    }

    setMusicProcessor(mp: MusicProcessor) {
        this.musicPlayer = mp
        return this
    }

    setScoreGraph(sg: ScoreGraph){
        this.scoreGraph = sg
        return this
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>) {
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
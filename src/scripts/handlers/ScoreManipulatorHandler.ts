import ScoreManipulator from "../gui/ScoreManipulator";
import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import {constants as c } from '../constants'
import * as meiOperation from '../utils/MEIOperations'
import * as meiConverter from '../utils/MEIConverter'

const manipSelector = ".manipulator"

class ScoreManipulatorHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    private sm: ScoreManipulator;
    loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>;

    constructor(){
        this.sm = new ScoreManipulator()
    }

    drawElements(){
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
        document.getElementById("toggleSidebar").addEventListener("click", this.removeFunction)
        document.getElementById("toggleSidebar").addEventListener("click", this.drawFunction)
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
        document.getElementById("toggleSidebar")?.removeEventListener("click", this.removeFunction)
        document.getElementById("toggleSidebar")?.removeEventListener("click", this.drawFunction)
    }

    addMeasure = (function handler(e: MouseEvent){
        meiOperation.addMeasure(this.currentMEI as Document)
        this.loadDataCallback("", meiConverter.restorepXmlIdTags(this.currentMEI), false, c._TARGETDIVID_)
    }).bind(this)

    removeMeasure = (function handler(e: MouseEvent){
        meiOperation.removeMeasure(this.currentMEI as Document)
        this.loadDataCallback("", meiConverter.restorepXmlIdTags(this.currentMEI), false, c._TARGETDIVID_)
    }).bind(this)

    addStaff = (function handler(e: MouseEvent){
        var target = e.target as Element
        var relpos = target.classList.contains("below") ? "below" : "above"
        meiOperation.addStaff(this.currentMEI as Document, target.closest(".staff"), relpos)
        this.musicPlayer.resetInstruments()
        this.loadDataCallback("", meiConverter.restorepXmlIdTags(this.currentMEI), false, c._TARGETDIVID_)
    }).bind(this)

    removeStaff = (function handler(e: MouseEvent){
        var target = e.target as Element
        var relpos = target.classList.contains("below") ? "below" : "above"
        meiOperation.removeStaff(this.currentMEI as Document, target.closest(".staff"), relpos)
        this.musicPlayer.resetInstruments()
        this.loadDataCallback("", meiConverter.restorepXmlIdTags(this.currentMEI), false, c._TARGETDIVID_)
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
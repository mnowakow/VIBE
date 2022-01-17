import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import ScoreManipulatorHandler from "./ScoreManipulatorHandler";
import { constants as c } from "../constants"
import Annotations from "../gui/Annotations";
import InsertModeHandler from "./InsertModeHandler";


class WindowHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;
    annotations: Annotations;
    scale: number
    loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>;
    scaleCallback: (scale: number) => void;
    insertModeHandler: InsertModeHandler;

    setListeners(){
        window.addEventListener("scroll", this.update)
        window.addEventListener("resize", this.update)
        window.addEventListener("deviceorientation", this.update)
        document.getElementById("sidebarContainer").addEventListener("transitionend", this.update)

        // document.getElementById(c._ROOTSVGID_).parentElement.addEventListener("scroll", this.update)
        // document.getElementById(c._ROOTSVGID_).parentElement.addEventListener("resize", this.update)
        // document.getElementById(c._ROOTSVGID_).parentElement.addEventListener("deviceorientation", this.update)
        document.getElementById(c._ROOTSVGID_).addEventListener("scroll", this.update)
        document.getElementById(c._ROOTSVGID_).addEventListener("resize", this.update)
        document.getElementById(c._ROOTSVGID_).addEventListener("deviceorientation", this.update)

        // document.body.forEach(el => {
        //     el.addEventListener("fullscreenchange", this.update)
        // })

        document.addEventListener("fullscreenchange", this.update)

        return this
    }

    removeListeners() {
        window.removeEventListener("scroll", this.update)
        window.removeEventListener("resize", this.update)
        window.removeEventListener("deviceorientation", this.update)
        document.getElementById("sidebarContainer").removeEventListener("transitionend", this.update)

        // document.getElementById(c._ROOTSVGID_).parentElement.removeEventListener("scroll", this.update)
        // document.getElementById(c._ROOTSVGID_).parentElement.removeEventListener("resize", this.update)
        // document.getElementById(c._ROOTSVGID_).parentElement.removeEventListener("deviceorientation", this.update)

        document.getElementById(c._ROOTSVGID_).removeEventListener("scroll", this.update)
        document.getElementById(c._ROOTSVGID_).removeEventListener("resize", this.update)
        document.getElementById(c._ROOTSVGID_).removeEventListener("deviceorientation", this.update)

        // document.querySelectorAll("*").forEach(el => {
        //     el.removeEventListener("fullscreenchange", this.update)
        // })
        document.removeEventListener("fullscreenchange", this.update)

        return this
    }

    update = (function update(e: Event){
        var that = this
        window.clearTimeout(isScrolling)

        var isScrolling = setTimeout(function(){
            that.m2m?.update()
            that.annotations?.update()
            that.insertModeHandler?.getPhantomNoteHandler()?.resetCanvas()
        }, 500)  
    }).bind(this)

    scoreChangedHandler = (function scoreChangedHandler(e: Event){
        console.log(e)
    }).bind(this)

    resetListeners(){
        this
            .removeListeners()
            .setListeners()

        return this
    }

    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
        return this
    }

    setAnnotations(annotations: Annotations){
        this.annotations = annotations
        return this
    }

    setCurrentMEI(mei: Document){
        this.currentMEI = mei
        return this
    }

    setScale(scale: number){
        this.scale = scale
        return this
    }

    setInsertModeHandler(imh: InsertModeHandler){
        this.insertModeHandler = imh
        return this
    }

    setScaleCallback(scaleCallback: (scale: number) => void){
        this.scaleCallback = scaleCallback
        return this
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>){
        this.loadDataCallback = loadDataCallback
        return this
      }

    // setSMHandler(smHandler: ScoreManipulatorHandler){
    //     this.smHandler = smHandler
    //     return this
    // }
    
}

export default WindowHandler
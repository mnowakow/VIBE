import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import Annotations from "../gui/Annotations";
import InsertModeHandler from "./InsertModeHandler";
import * as cq from "../utils/convenienceQueries"
import * as meiConverter from "../utils/MEIConverter"
import VerovioWrapper from "../utils/VerovioWrapper";
import { loaded } from "tone";
import { isWhiteSpaceLike } from "typescript";


class WindowHandler implements Handler{

    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;
    annotations: Annotations;
    loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>;
    insertModeHandler: InsertModeHandler;
    containerId: string;
    container: Element;
    eventContainer: Element
    rootSVG: Element
    interactionOverlay: Element
    w: Window
    verovioWrapper: VerovioWrapper
    ctrlPressed: Boolean
    x: number
    y: number
    divScrolls: Map<string, {sl: number, st: number}>

    constructor(){
        this.ctrlPressed = false
        this.w = window
        while(this.w !== this.w.parent){
            this.w = this.w.parent
        }
    }

    svgReloadCallback: () => void

    setListeners(){
        this.eventContainer = this.container
        window.addEventListener("scroll", this.updateFunction)
        //window.addEventListener("resize", this.update)
        this.w.addEventListener("resize", this.reloadSVGFunction)
        this.w.addEventListener("deviceorientation", this.updateFunction)
        this.eventContainer.querySelector("#sidebarContainer").addEventListener("transitionend", this.updateFunction)
        this.eventContainer.querySelector("#sidebarContainer").addEventListener("transitionend", this.reloadSVGFunction)
        this.eventContainer.querySelector("#sidebarContainer").addEventListener("resizemove", this.updateFunction)
        this.eventContainer.querySelector("#sidebarContainer").addEventListener("resizemove", this.reloadSVGFunction)
        this.rootSVG.addEventListener("scroll", this.updateFunction)
        //this.rootSVG.addEventListener("resize", this.update)
        this.rootSVG.addEventListener("deviceorientation", this.updateFunction)

        document.addEventListener("fullscreenchange", this.updateFunction)
        this.eventContainer.addEventListener("wheel", this.wheelZoomFunction)
        this.eventContainer.querySelectorAll("#zoomGroup > button").forEach(b => b.addEventListener("click", this.clickZoomFunction))
        document.addEventListener("keydown", this.toggleCTRLFunction)
        document.addEventListener("keyup", this.toggleCTRLFunction)
        this.eventContainer.addEventListener("loadingStart", this.cacheContainerAttrFunction)
        this.eventContainer.addEventListener("loadingEnd", this.loadContainerAttrFunction)

        return this
    }

    removeListeners() {
        window.removeEventListener("scroll", this.updateFunction)
        this.w.removeEventListener("resize", this.updateFunction)
        this.w.removeEventListener("resize", this.reloadSVGFunction)
        this.w.removeEventListener("deviceorientation", this.updateFunction)
        this.eventContainer?.querySelector("#sidebarContainer").removeEventListener("transitionend",this.updateFunction)
        this.eventContainer?.querySelector("#sidebarContainer").removeEventListener("transitionend", this.reloadSVGFunction)
        this.eventContainer?.querySelector("#sidebarContainer").removeEventListener("resizemove",this.updateFunction)
        this.eventContainer?.querySelector("#sidebarContainer").removeEventListener("resizemove", this.reloadSVGFunction)
        this.rootSVG.removeEventListener("scroll", this.updateFunction)
        //this.rootSVG.removeEventListener("resize", this.update)
        this.rootSVG.removeEventListener("deviceorientation", this.updateFunction)

        document.removeEventListener("fullscreenchange", this.updateFunction)
        this.eventContainer?.removeEventListener("wheel",this.wheelZoomFunction)
        this.eventContainer?.querySelectorAll("#zoomGroup > button").forEach(b => b.removeEventListener("click", this.clickZoomFunction))
        document.removeEventListener("keydown", this.toggleCTRLFunction)
        document.removeEventListener("keyup", this.toggleCTRLFunction)
        this.eventContainer?.removeEventListener("loadingStart", this.cacheContainerAttrFunction)
        this.eventContainer?.removeEventListener("loadingEnd", this.loadContainerAttrFunction)

        return this
    }

    /**
     * Update all elements that are affected by a window size change
     */
    private scrollingTimer = new Array()
    update(e: Event){
        // special rule for transition events since so much with different propertynames are fired
        if(e instanceof TransitionEvent){
            if(!e.propertyName.includes("width")) return
        }
        var that = this
        this.scrollingTimer?.forEach(s => clearTimeout(s))

        this.scrollingTimer.push(
            setTimeout(function(){
                that.updateXY()
                that.m2m?.update()
                that.annotations?.updateCanvas()
                that.insertModeHandler?.getPhantomNoteHandler()?.resetCanvas()
                that.scrollingTimer = new Array()
            }, 500)
        )
    }
    private updateFunction = this.update.bind(this)

    /**
     * Reload svg when registered events ended
     */
    private reloadTimer = new Array()
    reloadSVG(e: Event){
        var t = e.target as HTMLElement
        var that = this
        this.reloadTimer?.forEach(r => clearTimeout(r))
        if(t.id === "sidebarContainer" && !((e as TransitionEvent).propertyName.includes("width"))){
            // Timeout is needed to ensure, that transition has been completed and in eventphase 0
            // Must be a slighty longer than transitiontime
            this.reloadTimer.push(
                setTimeout(function(){
                    that.updateXY()
                    var mei = meiConverter.restoreXmlIdTags(that.currentMEI as Document)
                    that.loadDataCallback("", mei, false)
                    that.reloadTimer = new Array()
                }, (e as TransitionEvent).elapsedTime * 1000 + 10)
            )
        }else if(e.type === "resize" || e.type === "resizemove"){
            this.reloadTimer.push(
                setTimeout(function(){
                    that.updateXY()
                    var mei = meiConverter.restoreXmlIdTags(that.currentMEI as Document)
                    that.loadDataCallback("", mei, false)
                    that.reloadTimer = new Array()
                }, 500)
            )
        }
    }
    private reloadSVGFunction = this.reloadSVG.bind(this)


    /**
     * Toggle ctrl or meta button. Is used to activte zoom function
     * @param e 
     */
    toggleCTRL(e: KeyboardEvent){
        if(e.key === "Meta" || e.key === "Control"){
            if(e.type === "keydown"){
                this.ctrlPressed = true
            }else{
                this.ctrlPressed = false
            }
        }
    }
    private toggleCTRLFunction = this.toggleCTRL.bind(this)

    private deltaTemp = 1
    private zoomTimer = new Array()

    /**
     * Zoom according to movement of mouse wheel (also applies to two finger scroll gesture on trackpad).
     * Can only be executed when container is active Element and when ctrl/meta is pressed.
     * The scale is accumulated with every call of this method.
     * @param e 
     * @returns 
     */
    wheelZoom(e: WheelEvent){
        this.updateXY()
        if(!cq.hasActiveElement(this.containerId)) return
        if(!this.ctrlPressed) return
        e.preventDefault()
        this.deltaTemp = this.deltaTemp + e.deltaY / 1000
        this.zoomSVG(this.deltaTemp)
    }
    private wheelZoomFunction = this.wheelZoom.bind(this)

    /**
     * Zoom when Zoombuttons are clicked (In div #zoomGroup).
     * 
     * @param e 
     */
    clickZoom(e: MouseEvent){
        var t = e.target as HTMLElement
        if(t.id === "zoomInBtn"){
            this.deltaTemp = this.deltaTemp + 200 / 1000
        }else if(t.id === "zoomOutBtn"){
            this.deltaTemp = this.deltaTemp - 200 / 1000
        }
        this.zoomSVG(this.deltaTemp)
    }
    private clickZoomFunction = this.clickZoom.bind(this)

    /**
     * General zoom logic for all top level svgs (interactionOverlay + rootSVG (= rendered score by verovio))
     * @param delta 
     */
    zoomSVG(delta: number){
        var that = this
        var container = document.getElementById(this.containerId)
        container.querySelectorAll("#svg_output [preserveAspectRatio]").forEach(vb => vb.removeAttribute("preserveAspectRatio"))
        
        // ensure that with every call of all obsolete timeouts are deleted so that only one is left to be executed
        this.zoomTimer?.forEach(zt => clearTimeout(zt))
        container.querySelectorAll("#svg_output > [viewBox]").forEach(vb =>{
            vb.setAttribute("transform", "scale(" + delta.toString() +")");
            (vb as HTMLElement).style.transform = "scale(" + delta.toString() +")"
        })
        this.zoomTimer.push(setTimeout(function(){
            // that.deltaTemp = 1
            var mei = meiConverter.restoreXmlIdTags(that.currentMEI as Document)
            that.loadDataCallback("", mei, false)
            that.zoomTimer = new Array()
        }, 300))
    }

    /**
     * Cache container attributes that need to be loaded after the score is loaded.
     * - Scorllpositions of the containers
     * 
     * Listens to "loadStart" Event in Core class
     * @param e Event
     */
    cacheContainerAttr(e: Event){
        this.divScrolls = new Map()
        var container = document.getElementById(this.containerId)
        container.querySelectorAll(":scope div").forEach(d => {
            this.divScrolls.set(d.id, {sl: d.scrollLeft, st: d.scrollTop})
        })
    }
    private cacheContainerAttrFunction = this.cacheContainerAttr.bind(this)

    /**
     * Load all container attributes saved in @function cacheContainerAttr after score is loaded.
     * Listens to "loadEnd" Event in Core class
     * @param e Event
     * @returns 
     */
    loadContainerAttr(e: Event){
        if(this.divScrolls == undefined) return
        for (const [key, value] of this.divScrolls.entries()){
            document.getElementById(key)?.scrollTo(value.sl, value.st)
        } 
    }
    private loadContainerAttrFunction = this.loadContainerAttr.bind(this)

    /**
     * Set X and Y coordinates of the current boundingbox of the of the VerovioScore (#rootSVG)
     */
    updateXY(){
        var bb = document.getElementById(this.containerId)?.querySelector("#rootSVG").getBoundingClientRect()
        this.x = bb.x
        this.y = bb.y
    }

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

    setContainerId(containerId: string) {
        this.containerId = containerId
        this.container = document.getElementById(this.containerId)
        this.interactionOverlay = cq.getInteractOverlay(this.containerId)
        this.rootSVG = cq.getRootSVG(this.containerId)
        return this
    }

    setInsertModeHandler(imh: InsertModeHandler){
        this.insertModeHandler = imh
        return this
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>){
        this.loadDataCallback = loadDataCallback
        return this
    }

    setSVGReloadCallback(svgReloadCallback: () => Promise<boolean>){
        this.svgReloadCallback = svgReloadCallback
        return this
    }

    getX(){
        return this.x
    }

    getY(){
        return this.y
    }

    // setSMHandler(smHandler: ScoreManipulatorHandler){
    //     this.smHandler = smHandler
    //     return this
    // }

}

export default WindowHandler
import * as meiOperation from "../utils/MEIOperations"
import * as meiConverter from "../utils/MEIConverter"
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import { NoteBBox } from "../utils/Types";
import { constants as c } from "../constants"
import { uuidv4 } from "../utils/random";
import HarmonyLabel from "../gui/HarmonyLabel";
import MusicPlayer from "../MusicPlayer";
import * as coordinates from "../utils/coordinates"

class HarmonyHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer
    currentMEI?: Document;

    private harmonyCanvas: SVGElement
    private root: Element
    private harmonyElements: Map<string, HarmonyLabel>

    private loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>

    constructor(){
        this.addCanvas()
        this.harmonyElements = new Map()
    }

    addCanvas(){
        if(typeof this.harmonyCanvas === "undefined"){
            this.harmonyCanvas = document.createElementNS(c._SVGNS_, "svg")
            this.harmonyCanvas.setAttribute("id", "harmonyCanvas")
        }
        this.root = document.getElementById(c._ROOTSVGID_)
        this.root.insertBefore(this.harmonyCanvas, this.root.firstChild)
    }

    setListeners(): HarmonyHandler {
        document.querySelectorAll(".sylTextRect").forEach(s => {
            s.remove()
        })

        document.getElementById(c._ROOTSVGID_).addEventListener("click", this.setHarmonyLabelHandlerClick, false)
        document.getElementById(c._ROOTSVGID_).addEventListener("keydown", this.setHarmonyLabelHandlerKey, false)
        document.getElementById(c._ROOTSVGID_).addEventListener("mousemove", this.highlightNextHarmonyHandler)
        document.getElementById(c._ROOTSVGID_).addEventListener("keydown", this.closeModifyWindowHandler, true)
        document.querySelectorAll(".harm").forEach(h => {
            h.addEventListener("dblclick", this.modifyLabelHandler)
        })
        
        return this
    }

    removeListeners(): HarmonyHandler {
        document.getElementById(c._ROOTSVGID_).removeEventListener("click", this.setHarmonyLabelHandlerClick)
        document.getElementById(c._ROOTSVGID_).removeEventListener("keydown", this.setHarmonyLabelHandlerKey, false)
        document.getElementById(c._ROOTSVGID_).removeEventListener("mousemove", this.highlightNextHarmonyHandler)
        document.getElementById(c._ROOTSVGID_).removeEventListener("keydown", this.closeModifyWindowHandler)
        document.querySelectorAll(".harm").forEach(h => {
            h.removeEventListener("dblclick", this.modifyLabelHandler)
        })

        return this
    }

    setHarmonyLabelHandlerClick = (function setHarmonyLabelHandler(e: MouseEvent){
       if(document.body.classList.contains("harmonyMode")){
           this.harmonyLabelHandler(e)
       }
    }).bind(this)

    setHarmonyLabelHandlerKey = (function setHarmonyLabelHandler(e: KeyboardEvent){
        if(e.ctrlKey || e.metaKey){
            if(e.key === "k" && Array.from(document.querySelectorAll(".note, .chord, .rest, .mrest")).some(el => el.classList.contains("marked"))){
                this.harmonyLabelHandler(e)
            }
        }
     }).bind(this)

    harmonyLabelHandler(e: Event){

        if(e instanceof MouseEvent){
            var posx = coordinates.adjustToPage(e.pageX, "x")
            var posy = coordinates.adjustToPage(e.pageY, "y")
            
            var nextNoteBBox = this.m2m.findScoreTarget(posx, posy)

            if(this.currentMEI.querySelector("harm[startid=\"" + nextNoteBBox.id + "\"]") === null && !this.harmonyCanvas.hasChildNodes()){
                this.createInputBox(posx, posy, nextNoteBBox.id) 
            }else if(this.harmonyCanvas.hasChildNodes()){
                this.closeModifyWindow()
            }
        }else if(e instanceof KeyboardEvent){
            
        }
    }

    setHarmonyLabel(label: string, bboxId: string){
        var harmonyLabel = new HarmonyLabel(label,bboxId, this.currentMEI) // TODO: Make Dynamically
        this.harmonyElements.set(harmonyLabel.getHarmElement().id, harmonyLabel)

        var measure = this.currentMEI.getElementById(bboxId).closest("measure")
        measure.appendChild(harmonyLabel.getHarmElement())

        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)

        this.loadDataCallback("", mei, false, c._TARGETDIVID_).then(() => {
            this.reset()
        })
    }

    highlightNextHarmonyHandler = (function highlightNextHarmonyHandler(e: MouseEvent){
        this.highlightNextHarmony(e)
    }).bind(this)

    highlightNextHarmony(e: MouseEvent){
        var posx = coordinates.adjustToPage(e.pageX, "x")
        var posy = coordinates.adjustToPage(e.pageY, "y")

        var nextNoteBBox = this.m2m.findScoreTarget(posx, posy)
        var el = document.getElementById(nextNoteBBox.id)
        
        if(el.closest(".chord") !== null){
            el = el.closest(".chord")
        }
        
        if(!el.classList.contains("marked")){
            document.querySelectorAll(".marked").forEach(m => {
                m.classList.remove("marked")
            })
            el.classList.add("marked")
        }
    }

    modifyLabelHandler = (function modifyLabelHandler(e: MouseEvent){
        this.modifyLabel(e)
    }).bind(this)


    modifyLabel(e: MouseEvent){
        var target = e.target as Element
        target = target.closest(".harm")
        var posx = coordinates.adjustToPage(e.pageX, "x")
        var posy = coordinates.adjustToPage(e.pageY, "y")

        if(document.querySelector("*[refHarmId=\"" + target.id + "\"]") !== null){
            return
        }

        this.createInputBox(posx, posy, target.id)
    }

    submitLabelHandler = (function submitHandler(e: KeyboardEvent){
        if(e.key === "Enter" && this.harmonyCanvas.hasChildNodes()){
            this.submitLabel()
        }
    }).bind(this)

    closeModifyWindowHandler = (function closeModifyWindow(e: KeyboardEvent){
        if(e.key === "Escape"){
            this.closeModifyWindow()
        }
    }).bind(this)

    closeModifyWindow(){
        Array.from(this.harmonyCanvas.children).forEach(c => {
            c.remove()
        })
        // clean MEI from empty harm Elements
        this.currentMEI.querySelectorAll("harm").forEach(h => {
            if(h.childElementCount > 0){
                if(h.firstElementChild.childElementCount === 0){
                    h.remove()
                }
            }else if(h.textContent.length === 0){
                h.remove()
            }
        })
    }
        
    submitLabel(){
        var harmonyDiv = this.harmonyCanvas.getElementsByClassName("harmonyDiv")[0]
        var text = harmonyDiv.textContent
        var harmLabel = this.harmonyElements.get(harmonyDiv.closest("g").getAttribute("refHarmId"))
        if(typeof harmLabel !== "undefined"){
            harmLabel.modifyLabel(text)
            var currentHarm = this.currentMEI.getElementById(harmLabel.getHarmElement().id)
            currentHarm.parentElement.replaceChild(harmLabel.getHarmElement(), currentHarm)
        }else{
            this.setHarmonyLabel(harmonyDiv.textContent, harmonyDiv.closest("g").getAttribute("refHarmId"))
        }

        this.closeModifyWindow()
        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
        this.loadDataCallback("", mei, false, c._TARGETDIVID_).then(() => {
            this.reset()
        })
    }

    createInputBox(posx: number, posy: number, targetId: string){

        var textGroup = document.createElementNS(c._SVGNS_, "g")
        textGroup.setAttribute("id", uuidv4())
        textGroup.setAttribute("refHarmId", targetId)

        var text = document.createElementNS(c._SVGNS_, "svg")
        text.classList.add("harmonyText")

        var textForeignObject = document.createElementNS(c._SVGNS_, "foreignObject")
        textForeignObject.classList.add("harmonyFO")
        var textDiv = document.createElement("div")
        textDiv.setAttribute("contenteditable", "true")
        textDiv.textContent = typeof this.harmonyElements.get(targetId) !== "undefined" ? this.harmonyElements.get(targetId).getInputString() : ""
        textDiv.classList.add("harmonyDiv")
        text.append(textForeignObject)

        document.body.appendChild(textDiv)

        var rectPadding = 5

        text.setAttribute("x", (posx + rectPadding).toString())
        text.setAttribute("y", (posy).toString())

        textForeignObject.setAttribute("x", "0")
        textForeignObject.setAttribute("y", "0")
        textForeignObject.setAttribute("height", (textDiv.clientHeight + 2*rectPadding).toString())
        textForeignObject.setAttribute("width", (100+2*rectPadding).toString())

        this.harmonyCanvas.appendChild(textGroup)
        textGroup.appendChild(text)
        textForeignObject.appendChild(textDiv)

        // Special Listeners while Editing Harmonies
        var that = this
        textDiv.addEventListener("focus", function(){
                that.removeListeners()
                that.musicPlayer.removePlayListener()
            })
    
        textDiv.addEventListener("blur", function(){
            that.setListeners()
            that.musicPlayer.setPlayListener()
        })

        textDiv.addEventListener("keydown", this.submitLabelHandler)

        textDiv.focus()
    }

    reset(){
        this.setListeners()
        this.addCanvas()
    }

    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
        return this
    }

    setCurrentMEI(mei: Document){
        this.currentMEI = mei
        return this
    }

    setMusicPlayer(musicPlayer: MusicPlayer){
        this.musicPlayer = musicPlayer
        return this
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>){
        this.loadDataCallback = loadDataCallback
        return this
      }

}

export default HarmonyHandler
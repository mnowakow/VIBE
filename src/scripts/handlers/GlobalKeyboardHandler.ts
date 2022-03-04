import Handler from "./Handler";
import * as meiOperation from "../utils/MEIOperations"
import * as meiConverter from "../utils/MEIConverter"
import { constants as c} from "../constants"
import MusicPlayer from "../MusicPlayer";
import ScoreGraph from "../datastructures/ScoreGraph";
import LabelHandler from "./LabelHandler";
import * as cq from "../utils/convenienceQueries"


const marked = "marked"

class GlobalKeyboardHandler implements Handler{

    private undoCallback: () => Promise<any>
    private redoCallback: () => Promise<any>
    private loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>;

    currentMEI: Document
    musicPlayer: MusicPlayer

    scoreGraph: ScoreGraph
    copiedIds: Array<string>

    containerId: string
    container: Element

    harmonyHandlerCallback: (e: KeyboardEvent) => void

    constructor(containerId: string){
        this.containerId = containerId
        this.container = document.getElementById(containerId)
        this.setListeners();
    }

    setListeners(){
        document.addEventListener("keydown", this.keydownHandler)
        //document.addEventListener("keydown", this.prolongHandler)
    }

    removeListeners(){
        document.removeEventListener("keydown", this.keydownHandler)
        //document.removeEventListener("keydown", this.prolongHandler)
    }

    keydownHandler = (function keydownHandler(e: KeyboardEvent){
        if(this.hasContainerFocus()){
            if(e.key == undefined){
                return
            }
            if(e.ctrlKey || e.metaKey){
                if(e.key === "z"){ this.undoHandler(e)}
                if(e.key === "y"){ this.redoHandler(e)}
                if(e.key === "a"){ this.selectAllHandler(e)}
                if(e.key === "c"){ this.copyHandler(e)}
                if(e.key === "v"){ this.pasteHandler(e)}
                // if(e.key === "k" && Array.from(document.querySelectorAll(".note, .chord, .rest, .mrest")).some(el => el.classList.contains(marked))){
                //      this.handleHarmony(e)
                // }
            }else if(e.key.includes("Arrow")){
                //document.removeEventListener("keydown", this.keydownHandler)
                this.transposeHandler(e)
            }else if(e.key === "Escape"){
                this.resetHandler(e)
            }
        }
    }).bind(this)

    prolongHandler = (function prolongHandler(e: KeyboardEvent){
        if(this.hasContainerFocus()){
            if(e.code === "Semicolon"){ // Deutsch: Ä
                this.reduceDur()
            }else if(e.code === "Quote"){ // Deutsch: Ö
                this.prolongDur()
            }
        }
    }).bind(this)

    undoHandler(e: KeyboardEvent): void{
        if(!this.hasContainerFocus()) return
        e.stopImmediatePropagation()
        this.undoCallback()
        //document.removeEventListener("keydown", this.keydownHandler)
    }

    redoHandler(e: KeyboardEvent): void{
        if(!this.hasContainerFocus())return
        e.stopImmediatePropagation()
        this.redoCallback()
        //document.removeEventListener("keydown", this.keydownHandler)     
    }

    selectAllHandler(e: KeyboardEvent){
        if(!this.hasContainerFocus()) return
        e.preventDefault()
        cq.getRootSVG(this.containerId).querySelectorAll(".note").forEach(note => {
            let stem = note.querySelector(".stem") as HTMLElement
            note.classList.add(marked)
            if(stem !== null){
                stem.classList.add(marked)
            }
            var chord = note.closest(".chord")
            if(chord !== null){
                if(!chord.classList.contains(marked)) chord.classList.add(marked)
            }
        })
    }

    /**
     * Copy marked Elements
     * @param e 
     */
    copyHandler(e: KeyboardEvent){
        if(!this.hasContainerFocus()) return
        e.preventDefault()
        this.copiedIds = new Array()
        document.querySelectorAll(".marked").forEach(m => {
            this.copiedIds.push(m.id)
        })
        this.copiedIds.filter(n => n) //undefined and null Elements will be excluded
    }

    /**
     * paste marked Elements
     * @param e 
     */
    pasteHandler(e: KeyboardEvent){
        //if(!this.hasContainerFocus()) return
        //e.preventDefault()
        console.log("pasteHandler")
        var pastePosition = this.container.querySelector(".chord.marked, .note.marked, .rest.marked, .mRest.marked")?.id || this.container.querySelector("#cursor")?.getAttribute("refId")
        if(this.copiedIds != undefined && pastePosition != undefined){
            var lastId = meiOperation.paste(this.copiedIds, pastePosition, this.currentMEI)
            var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
            this.loadDataCallback("", mei, false, c._TARGETDIVID_).then(mei => {
                //Tell everyone that a past just occured to readjust certain elements e.g.
                var pastedEvent = new CustomEvent("pasted", {detail: lastId})
                document.dispatchEvent(pastedEvent)
            })
        }    
    }

    resetHandler(e: KeyboardEvent){
        if(!this.hasContainerFocus()) return
        e.preventDefault()
        this.container.querySelectorAll(".marked").forEach(el => {
            el.classList.remove(marked)
        })
        this.musicPlayer.rewind()
    }

    transposeHandler(e: KeyboardEvent){
        if(!this.hasContainerFocus()) return
        //e.preventDefault()
        if(document.querySelectorAll(".note.marked").length === 0){return}

        var mei: Document
        switch(e.key){
            case "ArrowUp":
                mei = meiOperation.transposeByStep(this.currentMEI, "up")
                break;
            case "ArrowDown":
                mei = meiOperation.transposeByStep(this.currentMEI, "down")
                break;
            default:
                console.log(this, "Sorry, wrong turn")
        }
        if(mei != undefined){
            mei = meiConverter.restoreXmlIdTags(mei)
            this.loadDataCallback("", mei, false, c._TARGETDIVID_)
        }
    }

    handleHarmony(e: KeyboardEvent){
        if(!this.hasContainerFocus()) return
        this.harmonyHandlerCallback(e)
    }

    // Helpers
    reduceDur(){
        var additionalElements = new Array<Element>();
        additionalElements.push(document.getElementById(this.scoreGraph.nextRight().getId()))
        //meiOperation.changeDuration(this.currentMEI, "reduce", additionalElements)
        meiOperation.changeDuration(this.currentMEI, additionalElements)
        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
        this.loadDataCallback("", mei, false, c._TARGETDIVID_)
    }

    prolongDur(){
        var additionalElements = new Array<Element>();
        additionalElements.push(document.getElementById(this.scoreGraph.nextRight().getId()))
        //meiOperation.changeDuration(this.currentMEI, "prolong", additionalElements)
        meiOperation.changeDuration(this.currentMEI, additionalElements)
        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
        this.loadDataCallback("", mei, false, c._TARGETDIVID_)
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners()
        return this
    }

    hasContainerFocus(){
        return this.container.classList.contains("activeContainer")
    }

    /////// GETTER/ SETTER ///////
    setUndoCallback(undoCallback: () => Promise<any>){
        this.undoCallback = undoCallback
        return this
    }

    setRedoCallback(redoCallback: () => Promise<any>){
        this.redoCallback = redoCallback
        return this
    }

    setCurrentMei(mei: Document){
        this.currentMEI = mei
        return this
    }

    setMusicPlayer(musicPlayer: MusicPlayer){
        this.musicPlayer = musicPlayer
        return this
    }

    setScoreGraph(scoreGraph: ScoreGraph) {
       this.scoreGraph = scoreGraph
       return this
    }

    setHarmonyHandlerCallback(harmonyHandlerCallback: (e: KeyboardEvent) => void){
        this.harmonyHandlerCallback = harmonyHandlerCallback
        return this
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>){
        this.loadDataCallback = loadDataCallback
        return this
    }

    setContainerId(containerId: string) {
        this.containerId = containerId
        return this
    }
}

export default GlobalKeyboardHandler
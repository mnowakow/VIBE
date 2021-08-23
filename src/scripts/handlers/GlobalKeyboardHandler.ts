import Handler from "./Handler";
import * as meiOperation from "../utils/MEIOperations"
import * as meiConverter from "../utils/MEIConverter"
import { constants as c} from "../constants"
import MusicPlayer from "../MusicPlayer";
import ScoreGraph from "../datastructures/ScoreGraph";
import { runInThisContext } from "vm";

const marked = "marked"

class GlobalKeyboardHandler implements Handler{

    private undoCallback: () => Promise<any>
    private redoCallback: () => Promise<any>
    private loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>;

    currentMEI: Document
    musicPlayer: MusicPlayer

    scoreGraph: ScoreGraph
    copiedIds: Array<string>

    constructor(){
        this.setListeners();
    }

    setListeners(){
        document.addEventListener("keydown", this.keydownHandler)
        document.addEventListener("keydown", this.changeHandler)
    }

    removeListeners(){
        document.removeEventListener("keydown", this.keydownHandler)
        document.removeEventListener("keydown", this.changeHandler)
    }

    keydownHandler = (function keydownHandler(e: KeyboardEvent){
        if(typeof e.key === "undefined"){
            return
        }
        if(e.ctrlKey || e.metaKey){
            if(e.key === "z"){ this.undoHandler(e)}
            if(e.key === "y"){ this.redoHandler(e)}
            if(e.key === "a"){ this.selectAllHandler(e)}
            if(e.key === "c"){ this.copyHandler(e)}
            if(e.key === "v"){ this.pasteHandler(e)}
        }else if(e.key.includes("Arrow")){
            document.removeEventListener("keydown", this.keydownHandler)
            this.transposeHandler(e)
        }else if(e.key === "Escape"){
            this.resetHandler(e)
        }
    }).bind(this)

    changeHandler = (function handler(e: KeyboardEvent){
        if(e.code === "Semicolon"){
            this.reduceDur()
        }else if(e.code === "Quote"){
            this.prolongDur()
        }
    }).bind(this)

    undoHandler(e: KeyboardEvent): void{
        e.stopImmediatePropagation()
        console.log("Pushed undo")
        this.undoCallback()
        document.removeEventListener("keydown", this.keydownHandler)
    }

    redoHandler(e: KeyboardEvent): void{
        e.stopImmediatePropagation()
        console.log("Pushed redo")
        this.redoCallback()
        document.removeEventListener("keydown", this.keydownHandler)       
    }

    selectAllHandler(e: KeyboardEvent){
        e.preventDefault()
        document.querySelectorAll(".note").forEach(note => {
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
        e.preventDefault()
        this.copiedIds = new Array()
        document.querySelectorAll(".marked").forEach(m => {
            this.copiedIds.push(m.id)
        })
    }

    /**
     * paste marked Elements
     * @param e 
     */
    pasteHandler(e: KeyboardEvent){
        e.preventDefault()
        var pastePosition = document.querySelector(".chord.marked, .note.marked")?.id
        if(this.copiedIds != undefined && pastePosition != undefined){
            meiOperation.paste(this.copiedIds, pastePosition, this.currentMEI)
            var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
            this.loadDataCallback("", mei, false, c._TARGETDIVID_)
        }    
    }

    resetHandler(e: KeyboardEvent){
        e.preventDefault()
        document.querySelectorAll(".marked").forEach(el => {
            el.classList.remove(marked)
        })
        this.musicPlayer.rewind()
    }

    transposeHandler(e: KeyboardEvent){
        e.preventDefault()
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
        mei = meiConverter.restoreXmlIdTags(mei)
        this.loadDataCallback("", mei, false, c._TARGETDIVID_)
    }

    reduceDur(){
        var additionalElements = new Array<Element>();
        additionalElements.push(document.getElementById(this.scoreGraph.nextRight().getId()))
        meiOperation.changeDuration(this.currentMEI, "reduce", additionalElements)
        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
        this.loadDataCallback("", mei, false, c._TARGETDIVID_)
    }

    prolongDur(){
        var additionalElements = new Array<Element>();
        additionalElements.push(document.getElementById(this.scoreGraph.nextRight().getId()))
        meiOperation.changeDuration(this.currentMEI, "prolong", additionalElements)
        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
        this.loadDataCallback("", mei, false, c._TARGETDIVID_)
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners()
        return this
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

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>){
        this.loadDataCallback = loadDataCallback
        return this
      }
}

export default GlobalKeyboardHandler
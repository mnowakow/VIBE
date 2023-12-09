import Handler from "./Handler";
import * as meiOperation from "../utils/MEIOperations"
import * as meiConverter from "../utils/MEIConverter"
import { constants as c } from "../constants"
import MusicProcessor from "../MusicProcessor";
import ScoreGraph from "../datastructures/ScoreGraph";
import LabelHandler from "./LabelHandler";
import * as cq from "../utils/convenienceQueries"
import { isJSDocThisTag } from "typescript";

const marked = "marked"
const lastAdded = "lastAdded"
const editStates = [marked, lastAdded]
const editStateSelector = "." + editStates.join(",.")
const noteEditStateSelector = editStateSelector.replace(".", ".note.")


class GlobalKeyboardHandler implements Handler {

    private undoCallback: () => Promise<any>
    private redoCallback: () => Promise<any>
    private loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>;

    currentMEI: Document
    musicPlayer: MusicProcessor

    scoreGraph: ScoreGraph
    copiedIds: Array<string>

    containerId: string
    container: Element

    lastInsertedNoteId: string

    harmonyHandlerCallback: (e: KeyboardEvent) => void

    constructor(containerId: string) {
        this.containerId = containerId
        this.container = document.getElementById(containerId)
        this.setListeners();
    }

    setListeners() {
        document.addEventListener("keydown", this.keydownHandler)
        //document.addEventListener("keydown", this.prolongHandler)
        window.addEventListener("keydown", this.preventScroll, false)
    }

    removeListeners() {
        document.removeEventListener("keydown", this.keydownHandler)
        //document.removeEventListener("keydown", this.prolongHandler)
        window.removeEventListener("keydown", this.preventScroll, false)
    }

    preventScroll = function(e: KeyboardEvent) {
        if(this.hasEditableOpen()) return
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
            e.preventDefault();
        }
    }.bind(this)

    private tempKey: string
    private keyTimeOuts: Array<NodeJS.Timeout>
    keydownHandler = (function keydownHandler(e: KeyboardEvent) {
        if(e.code === "Space") return
        if (this.hasContainerFocus()) {
            if (e.key == undefined) {
                return
            }
            if(this.hasEditableOpen()) return 

            var that = this
            var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            var ctrl = e.ctrlKey
            if(isMac){
                ctrl = e.metaKey
            }

            if (ctrl) {
                if (e.key === "z") { this.undoHandler(e) }
                if (e.key === "y") { this.redoHandler(e) }
                if (e.key === "a") { this.selectAllHandler(e) }
                if (e.key === "c") { this.copyHandler(e) }
                if (e.key === "v") { this.pasteHandler(e) }
                // if(e.key === "k" && Array.from(document.querySelectorAll(".note, .chord, .rest, .mrest")).some(el => el.classList.contains(marked))){
                //      this.handleHarmony(e)
                // }
            }else if (e.key.includes("Arrow")) {
                //document.removeEventListener("keydown", this.keydownHandler)
                this.transposeHandler(e)
            } else if (e.key === "Escape") {
                this.resetHandler(e)
            }else if(e.key.match(/F\d/) !== null){ // interact with F-Keys
                this.changeTab(e.key)
            }else if(e.key.match(/^\d+$/) !== null){ // interaction with numbers
                this.changeCustomBtn(e.key)
            }else if(e.shiftKey){
                if(e.key !== "Shift" && cq.getContainer(this.containerId).classList.contains("clickMode")){ // may only be used during Notation Tab is open
                    // wait for a double keydown and cache input information
                    if(this.tempKey == undefined){
                        this.tempKey = e.key
                    }else{
                        this.tempKey += e.key
                    }
                    if(this.keyTimeOuts == undefined) this.keyTimeOuts = new Array()
                    this.keyTimeOuts.forEach(to => { // get sure to just execute latest timeout
                        clearTimeout(to)
                    });
                    var to = setTimeout(function(){
                        if(["B", "BB", "'", "''", "N", "T", "_"].some(k => that.tempKey === k)){
                            that.changeCustomBtn(that.tempKey) 
                        }
                        that.tempKey = undefined
                        that.keyTimeOuts.forEach(to => {
                            clearTimeout(to)
                        });
                        that.keyTimeOuts = undefined
                    },100)
                    this.keyTimeOuts.push(to)
                }
            }
        }
    }).bind(this)

    prolongHandler = (function prolongHandler(e: KeyboardEvent) {
        if (this.hasContainerFocus()) {
            if (e.code === "Semicolon") { // Deutsch: Ä
                this.reduceDur()
            } else if (e.code === "Quote") { // Deutsch: Ö
                this.prolongDur()
            }
        }
    }).bind(this)

    undoHandler(e: KeyboardEvent): void {
        e.preventDefault()
        if (!this.hasContainerFocus()) return
        e.stopImmediatePropagation()
        this.undoCallback()
        //document.removeEventListener("keydown", this.keydownHandler)
    }

    redoHandler(e: KeyboardEvent): void {
        e.preventDefault()
        if (!this.hasContainerFocus()) return
        e.stopImmediatePropagation()
        this.redoCallback()
        //document.removeEventListener("keydown", this.keydownHandler)     
    }

    selectAllHandler(e: KeyboardEvent) {
        if (!this.hasContainerFocus()) return
        e.preventDefault()
        cq.getVrvSVG(this.containerId).querySelectorAll(".note").forEach(note => {
            let stem = note.querySelector(".stem") as HTMLElement
            note.classList.add(marked)
            if (stem !== null) {
                stem.classList.add(marked)
            }
            var chord = note.closest(".chord")
            if (chord !== null) {
                if (!chord.classList.contains(marked)) chord.classList.add(marked)
            }
        })
    }

    /**
     * Copy marked Elements only in active Layer (only monophonic copies are possible right now)
     * @param e 
     */
    copyHandler(e: KeyboardEvent) {
        if (!this.hasContainerFocus()) return
        e.preventDefault()
        this.copiedIds = new Array()
        cq.getContainer(this.containerId).querySelectorAll(".activeLayer .marked").forEach(m => {
            this.copiedIds.push(m.id)
        })
        this.copiedIds.filter(n => n) //undefined and null Elements will be excluded
        console.log("Copied", this.copiedIds)
    }

    /**
     * paste marked Elements
     * @param e 
     */
    pasteHandler(e: KeyboardEvent) {
        //if(!this.hasContainerFocus()) return
        //e.preventDefault()
        const pastePosition = this.container.querySelector(".chord.marked, .note.marked, .rest.marked, .mRest.marked")?.id || this.container.querySelector("#cursor")?.getAttribute("refId")
        if (this.copiedIds && pastePosition) {
            const pasteResult = meiOperation.paste(this.copiedIds, pastePosition, this.currentMEI)
            this.currentMEI = pasteResult[0]
            const lastId = pasteResult[1]
            const mei = meiConverter.restoreXmlIdTags(this.currentMEI)
            this.loadDataCallback("", mei, false).then(mei => {
                //Tell everyone that a past just occured to readjust certain elements e.g.
                const pastedEvent = new CustomEvent("pasted", { detail: lastId })
                document.dispatchEvent(pastedEvent)
            })
        }
    }
    resetHandler(e: KeyboardEvent) {
        if (!this.hasContainerFocus()) return
        e.preventDefault()
        this.container.querySelectorAll(editStateSelector).forEach(el => {
            editStates.forEach(es => {
                el.classList.remove(es)
            })

        })
        this.musicPlayer.rewindMidi()
        this.resetLastInsertedNoteId()
        this.container.querySelectorAll("#modGroup *").forEach(mg => mg.classList.remove("selected"))
    }

    transposeHandler(e: KeyboardEvent) {
        if (!this.hasContainerFocus()) return
        if (["annotMode", "harmonyMode"].some(cn => this.container.classList.contains(cn))) return
        //e.preventDefault()
        if (document.querySelectorAll(noteEditStateSelector).length === 0) { return }

        var mei: Document
        switch (e.key) {
            case "ArrowUp":
                mei = meiOperation.transposeByStep(this.currentMEI, "up")
                break;
            case "ArrowDown":
                mei = meiOperation.transposeByStep(this.currentMEI, "down")
                break;
            default:
                //console.log(this, "Sorry, wrong turn")
        }
        if (mei != undefined) {
            if(cq.getContainer(this.containerId).querySelector(".marked") !== null) this.resetLastInsertedNoteId()
            mei = meiConverter.restoreXmlIdTags(mei)
            this.loadDataCallback("", mei, false)
        }
    }

    /**
     * Change tab according to F-Key. The mapping is based on the displayed order
     * @param fkey 
     */
    changeTab(fkey: string){
        var cont =  cq.getContainer(this.containerId)
        var target: string
        switch(fkey){
            case "F1":
                target = "notationTabBtn"
                break;
            case "F2":
                target = "annotationTabBtn"
                break;
            case "F3":
                target = "articulationTabBtn"
                break;
            default:
                console.log("There is no Tab to be selected for KEY " + fkey)
        }
        try{
            cont.querySelector("#" + target).dispatchEvent(new MouseEvent("click"))
        }catch(error){
            console.log(this.constructor.name, " has no implementation for " + target)
        }
    }

    /**
     * Change to the button in custom tool bar based on the key input.
     * In the case of numbers: mapping is based on the displayed order. Everything else is mapped by key combinations
     * @param key 
     */
    changeCustomBtn(key: string){
        if(key.match(/^\d+$/) !== null){
            var i = parseInt(key)
            i = i === 0 ? 9 : i-1
            var btn = cq.getContainer(this.containerId).querySelectorAll("#customToolbar button.btn")
            btn[i]?.dispatchEvent(new MouseEvent("click"))
        }else{ 
            var id = ""
            switch(key){
                case "B": //b
                    id = "alterDown"
                    break;
                case "'": //#
                    id = "alterUp"
                    break;
                case "BB": //bb
                    id = "alterDDown"
                    break;
                case "''": //x
                    id = "alterDUp"
                    break;
                case "N": //neutral
                    id = "alterNeutral"
                    break;
                case "T": //tie /slur
                    id = "tieNotes"
                    break;
                case "_": //beam
                    id = "organizeBeams"
                    break;
            }
            cq.getContainer(this.containerId).querySelector("#" + id)?.dispatchEvent(new MouseEvent("click"))
        }
    }

    handleHarmony(e: KeyboardEvent) {
        if (!this.hasContainerFocus()) return
        this.harmonyHandlerCallback(e)
    }

    // Helpers
    reduceDur() {
        var additionalElements = new Array<Element>();
        additionalElements.push(document.getElementById(this.scoreGraph.nextRight().getId()))
        //meiOperation.changeDuration(this.currentMEI, "reduce", additionalElements)
        meiOperation.changeDurationsInLayer(this.currentMEI, additionalElements)
        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
        this.loadDataCallback("", mei, false)
    }

    prolongDur() {
        var additionalElements = new Array<Element>();
        additionalElements.push(document.getElementById(this.scoreGraph.nextRight().getId()))
        //meiOperation.changeDuration(this.currentMEI, "prolong", additionalElements)
        meiOperation.changeDurationsInLayer(this.currentMEI, additionalElements)
        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
        this.loadDataCallback("", mei, false)
    }

    resetListeners() {
        this.removeListeners()
        this.setListeners()
        return this
    }

    hasContainerFocus() {
        return this.container.classList.contains("activeContainer")
    }

    hasEditableOpen(){
        if(!document.getElementById(this.containerId)) return false
        return document.getElementById(this.containerId).querySelector(".canvas *[contenteditable=true]") !== null
    }

    /////// GETTER/ SETTER ///////
    setUndoCallback(undoCallback: () => Promise<any>) {
        this.undoCallback = undoCallback
        return this
    }

    setRedoCallback(redoCallback: () => Promise<any>) {
        this.redoCallback = redoCallback
        return this
    }

    setCurrentMei(mei: Document) {
        this.currentMEI = mei
        return this
    }

    setMusicProcessor(musicPlayer: MusicProcessor) {
        this.musicPlayer = musicPlayer
        return this
    }

    setScoreGraph(scoreGraph: ScoreGraph) {
        this.scoreGraph = scoreGraph
        return this
    }

    resetLastInsertedNoteId() {}

    setHarmonyHandlerCallback(harmonyHandlerCallback: (e: KeyboardEvent) => void) {
        this.harmonyHandlerCallback = harmonyHandlerCallback
        return this
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>) {
        this.loadDataCallback = loadDataCallback
        return this
    }

    setContainerId(containerId: string) {
        this.containerId = containerId
        return this
    }

    resetLastInsertedNoteCallback(resetLastInsertedNoteId: () => void) {
        this.resetLastInsertedNoteId = resetLastInsertedNoteId
        return this
    }
}

export default GlobalKeyboardHandler
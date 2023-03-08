import ScoreGraph from "../datastructures/ScoreGraph";
import MusicPlayer from "../MusicPlayer";
import { keyCodeNoteMap, keysigToNotes, octToNum } from "../utils/mappings";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import { uuidv4 } from "../utils/random";
import { NewNote } from "../utils/Types";
import { constants as c } from "../constants"
import Handler from "./Handler";
import * as cq from "../utils/convenienceQueries"
import * as meiOperation from "../utils/MEIOperations"
import ScoreNode from "../datastructures/ScoreNode";

const marked = "marked"

class KeyModeHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    scoreGraph: ScoreGraph

    selectRect: SVGRectElement
    startSelect: DOMRect

    insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>;
    deleteCallback: (notes: Array<Element>) => Promise<any>;

    containerId: string
    container: Element
    rootSVG: Element
    interactionOverlay: Element

    private shiftDown: Boolean


    constructor(containerId: string){
      this.setContainerId(containerId)
    }

  setListeners() {
    document.addEventListener("keydown", this.pressedHandler)
    document.addEventListener("keyup", this.pressedHandler)
    document.addEventListener('keydown', this.noteInputHandler);
    document.addEventListener('keydown', this.keyInputHandler);
    document.addEventListener("pasted", this.pastedHandler);
  }

  removeListeners() {
    document.removeEventListener("keydown", this.pressedHandler)
    document.removeEventListener("keyup", this.pressedHandler)
    document.removeEventListener('keydown', this.noteInputHandler);
    document.removeEventListener('keydown', this.keyInputHandler);
    document.removeEventListener("pasted", this.pastedHandler);
  }

  resetListeners(){
      this.removeListeners()
      this.setListeners()
  }

  /**
   * Event handler for inserting Notes
   */
  noteInputHandler = (function noteInputHandler (e: KeyboardEvent): void {
    this.noteInput(e)
  }).bind(this)

  noteInput(e: KeyboardEvent){
    if(this.container.querySelector("[contenteditable=true]")) return 
    var currentNode = this.scoreGraph.getCurrentNode()
    if(!cq.hasActiveElement(this.containerId)) return
    if(this.musicPlayer.getIsPlaying() === true){return} // getIsPlaying could also be undefined
    if(keyCodeNoteMap.has(e.code)){
      e.preventDefault()
      var pname = keyCodeNoteMap.get(e.code)
      var oct = octToNum.get(this.container.querySelector("#octaveGroupKM .selected")?.id) || "4"
      const newNote: NewNote = this.createNewNote(pname, oct, null)
      if(newNote == undefined) return

      var noteExists: Boolean = false
      var noteToDelete: Element
      if(document.getElementById(currentNode.getId()).closest(".chord") !== null){
        var chordNotes = Array.from(document.getElementById(currentNode.getId()).closest(".chord").querySelectorAll(".note"))
        chordNotes.forEach((n: Element) => {
          var meiNote = this.m2m.getCurrentMei().getElementById(n.id)
          var sameOct = meiNote.getAttribute("oct") === newNote.oct 
          var samePname = meiNote.getAttribute("pname") === newNote.pname
          if(sameOct && samePname){
            noteExists = true
            noteToDelete = n
          }
        })
      }

      
      if(!noteExists){
        // check if new note should replace a rest
        if(this.scoreGraph.getCurrentNode().getDocElement().classList.contains("rest")){
          newNote.relPosX = "left";
          newNote.nearestNoteId = this.scoreGraph.getCurrentNode().getId()
          //newNote.id = this.scoreGraph.getCurrentNode().getId()
        }else if(!this.scoreGraph.getCurrentNode()?.getDocElement().classList.contains("mRest") && this.scoreGraph.getCurrentNode()?.getRight() == null && newNote.chordElement == undefined){
          //check if new Measure must be created 
          meiOperation.addMeasure(this.m2m.getCurrentMei())
          var currentStaff = this.m2m.getCurrentMei().getElementById(newNote.staffId)
          var staffN = currentStaff.getAttribute("n")
          newNote.staffId = currentStaff.closest("measure").nextElementSibling.querySelector("staff[n=\"" + staffN + "\"]").id
          newNote.relPosX = "left"
          newNote.nearestNoteId = this.m2m.getCurrentMei().querySelector("#" + newNote.staffId).querySelector("mRest").id
        }else {
          //or if ne note must be in new measure
          var oldStaffId = newNote.staffId
          newNote.staffId = this.m2m.getCurrentMei().getElementById(this.scoreGraph.getCurrentNode()?.getRight()?.getId())?.closest("staff").id || newNote.staffId
          
          if(oldStaffId !== newNote.staffId){
            newNote.relPosX = "left"
            newNote.nearestNoteId = this.scoreGraph.getCurrentNode().getRight().getId()
          }
        }
        this.insertCallback(newNote, true).then(() => {
          //this.m2m.update();
          this.resetListeners()
          var currentTargetId;
          if(newNote.chordElement != undefined){
            currentTargetId = this.rootSVG.querySelector("#" + newNote.chordElement.id).closest(".chord").id // new chord with own ID is created, if note is added
          }else{
            currentTargetId = newNote.id
          }
          this.scoreGraph.setCurrentNodeById(currentTargetId)
          this.musicPlayer.generateTone(newNote)
        }).catch(() => {
          //alert("your bar is too small")
        })
      }else{
        this.deleteCallback([noteToDelete]).then(() => {
          //this.m2m.update();
          this.resetListeners()
          this.scoreGraph.setCurrentNodeById(newNote.chordElement?.id)
        })
      }
    }
  }

  pressedHandler = (function pressedHandler(e: KeyboardEvent){
    this.assignKeys(e)
  }).bind(this)

  assignKeys(e: KeyboardEvent){
    var b = false
    if(e.type === "keydown"){
      b = true
    }else if(e.type === "keyup"){
      b = false
    }
    switch(e.key){
      case "Shift":
        this.shiftDown = b
        break;
    }
  }

  /**
   * create a newNote
   * @param pname pitch name
   * @param oct octave
   * @param options 
   * @returns 
   */
  createNewNote(pname: string, oct: string, options): NewNote{
    //get relevant staffinfo
    var nearestNodeId = this.scoreGraph.getCurrentNode()?.getId()
    if(nearestNodeId == undefined) return
    var closestStaff = this.m2m.getCurrentMei().getElementById(nearestNodeId)?.closest("staff") || this.m2m.getCurrentMei().querySelector("measure > staff") //asume first measure first staff
    var closestMeasure = closestStaff.closest("measure")
    var closestStaffIdx = parseInt(closestStaff.getAttribute("n")) - 1
    var closestMeasureIdx = parseInt(closestMeasure.getAttribute("n")) - 1

    var keysig = this.m2m.getMeasureMatrix().get(closestMeasureIdx, closestStaffIdx).keysig
    var accids: string[]
    var accid: string
    if(keysig == undefined){
        accids = keysigToNotes.get(keysig)
        accids = accids.filter((s:string) => {return s === pname})
        if(accids.length === 1){
            accid = keysig.charAt(1)
        }
    }

    var targetChord: Element
    //if(this.container.querySelector("#chordButton")?.classList.contains("selected")){
    if(this.shiftDown){
      targetChord = this.rootSVG.querySelector("#"+nearestNodeId)
      if(targetChord?.closest(".chord") !== null){
        targetChord = targetChord.closest(".chord")
      }
    }
    
    this.setContainerId(this.containerId)
    var newNote: NewNote = {
        pname: pname,
        id: uuidv4(),
        dur: this.m2m.getDurationNewNote(),
        dots: this.m2m.getDotsNewNote(),
        oct: oct,
        keysig: keysig,
        accid: accid,
        nearestNoteId: nearestNodeId,
        relPosX: "right",
        staffId: this.rootSVG.querySelector("#" + nearestNodeId).closest(".staff").id,
        chordElement: targetChord,
        rest: this.container.querySelector("#pauseNote").classList.contains("selected")
    }

    return newNote
}

  /**
   * Event Handler for any Keyboard input (except inserting)
   */
  keyInputHandler = (function keyInputHandler(e: KeyboardEvent){
    if(!cq.hasActiveElement(this.containerId)) return
    if(e.ctrlKey || e.metaKey) return //prevent confusion with global keyboard functionalities
    if(this.interactionOverlay.querySelector("div[contenteditable=true]") !== null) return // prevent navigating in scrore, when label editor is open
    if(this.scoreGraph.getCurrentNode() == undefined) return

    if(e.shiftKey && e.key.includes("Arrow")){
      e.preventDefault()
      this.navigateSelection(e.key)
    }else if(e.key.includes("Arrow")){
      e.preventDefault()
      this.endSelection()
      this.navigateCursor(e.key)
    }else if(["Delete", "Backspace"].indexOf(e.key) > -1){
      e.preventDefault()
      //this.deleteByKey(e.key)
    }
  }).bind(this)

  /**
   * Navigate through Scoregraph with Arrow Keys
   * @param direction Key Code for Arrows
   */
  navigateCursor(direction: string){
    var prevNode = this.scoreGraph.getCurrentNode()
    switch(direction){
      case "ArrowLeft":
        document.querySelectorAll(".lastAdded")?.forEach(la => la.classList.remove("lastAdded"))
        this.scoreGraph.nextLeft()
        break;
      case "ArrowRight":
        document.querySelectorAll(".lastAdded")?.forEach(la => la.classList.remove("lastAdded"))
        this.scoreGraph.nextRight()
        break;
      default:
        return
    }

      if(this.scoreGraph.getCurrentNode() == undefined) return
      this.container.querySelectorAll(".marked").forEach(m => m.classList.remove("marked"))
      this.container.querySelector("#" + prevNode.getId())?.classList.remove("lastAdded")
      var currEl = this.container.querySelector("#" + this.scoreGraph.getCurrentNode().getId())
      currEl.classList.add("marked")
      if(currEl.closest(".chord") !== null){
        currEl.querySelectorAll(".note, .notehead").forEach(n => n.classList.add("marked"))
      }
  }

  /**
   * End selection in Keyboardmode
   */
  endSelection(){
    this.startSelect = undefined
    if(this.selectRect !== null && typeof this.selectRect !== "undefined"){
      this.selectRect.remove()
      this.rootSVG.querySelectorAll(".marked").forEach(m => {
        m.classList.remove("marked")
      })
    }
    this.selectRect = undefined
  }

  /**
   * 
   * @param elementId Id of the current Element to be set in the ScoreGrap
   */
  setCurrentNodeScoreGraph(elementId: string = null){
    // if(this.scoreGraph.getCurrentNode() == undefined || elementId === null){
    //   var nextEl = this.cursor.getNextElement()
    //   if(nextEl == undefined) return
    //   if(nextEl.classList.contains("staff")){
    //     nextEl = nextEl.querySelector(".layer")
    //   }
    //   this.scoreGraph.setCurrentNodeById(nextEl.id)
    // }else if(elementId !== null){
    //   this.scoreGraph.setCurrentNodeById(elementId)
    // }
    this.scoreGraph.setCurrentNodeById(elementId)
    return this
  }

  /**
   * Set Cursor to new position after pasting
   */
  pastedHandler = (function pastedHandler(e: CustomEvent){
    console.log("PASTED ", e)
    this.scoreGraph.setCurrentNodeById(e.detail)
    this.cursor.definePosById(this.scoreGraph.getCurrentNode()?.getId())
  }).bind(this)

  /**
   * Delete next element depending on Keyboad input (Backspace: left, Delete: right)
   * @param key "Backspace" or "Delete"
   */
  deleteByKey(key: string){
    var elementToDelete: Element
    var currNodeId: string
    var isFocusedChord = this.container.querySelector("#chordButton")?.classList.contains("selected") ? true : false
    if(isFocusedChord){key = "Backspace"}
    switch(key){
      case "Delete":
        //elementToDelete = this.rootSVG.querySelector("#" + this.scoreGraph.getCurrentNode().getRight().getId())
        //break;
      case "Backspace":
        elementToDelete = this.rootSVG.querySelector("#" + this.scoreGraph.getCurrentNode().getId())
        
        if(this.scoreGraph.getCurrentNode().isLayer()){
          elementToDelete = this.rootSVG.querySelector("#" + this.scoreGraph.getCurrentNode().getLeft().getId())
          this.navigateCursor("ArrowLeft")
        }
        
        if(!this.scoreGraph.getCurrentNode().getLeft()?.isBOL()){
          this.navigateCursor("ArrowLeft")
        }else{
          this.navigateCursor("ArrowRight")
        }
        break;
    }

    currNodeId = this.scoreGraph.getCurrentNode().getId()
    // if(this.rootSVG.querySelector(".marked") === null){
    //   this.deleteCallback([elementToDelete]).then(() => {
    //     this.m2m.update();
    //     this.resetListeners()
    //     this.cursor.definePosById(currNodeId)
    //   })
    // }
  }

  ///// GETTER / SETTER////////////////

  setM2M(m2m: Mouse2MEI){
    this.m2m = m2m
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

  setCurrentMEI(mei: Document){
    this.currentMEI = mei
    return this
  }

  setContainerId(id: string){
    this.containerId = id
    this.rootSVG = cq.getRootSVG(id)
    this.interactionOverlay = cq.getInteractOverlay(id)
    this.container = document.getElementById(id)
    return this
  }

  setInsertCallback(insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>){
    this.insertCallback = insertCallback
    return this
  }

  setDeleteCallback(deleteCallback: (notes: Array<Element>) => Promise<any>){
    this.deleteCallback = deleteCallback
    return this
  }

}

export default KeyModeHandler
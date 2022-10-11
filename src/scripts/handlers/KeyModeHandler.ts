import ScoreGraph from "../datastructures/ScoreGraph";
import Cursor from "../gui/Cursor";
import MusicPlayer from "../MusicPlayer";
import { keyCodeNoteMap, keysigToNotes, octToNum } from "../utils/mappings";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import { uuidv4 } from "../utils/random";
import { NewNote } from "../utils/Types";
import { constants as c } from "../constants"
import Handler from "./Handler";
import * as cq from "../utils/convenienceQueries"

const marked = "marked"

class KeyModeHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    scoreGraph: ScoreGraph
    cursor: Cursor

    selectRect: SVGRectElement
    startSelect: DOMRect

    insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>;
    deleteCallback: (notes: Array<Element>) => Promise<any>;

    containerId: string
    container: Element
    rootSVG: Element
    interactionOverlay: Element


    constructor(containerId: string){
      this.setContainerId(containerId)
      this.cursor = new Cursor(containerId)
    }

  setListeners() {
    document.addEventListener('keydown', this.keyModeHandler);
    document.addEventListener('keydown', this.keyInputHandler);
    document.addEventListener("pasted", this.pastedHandler);

    this.cursor.setClickListener()
  }

  removeListeners() {
    document.removeEventListener('keydown', this.keyModeHandler);
    document.removeEventListener('keydown', this.keyInputHandler);
    document.removeEventListener("pasted", this.pastedHandler);

    this.cursor.flashStop()
    this.cursor.removeClickListener()
  }

  resetListeners(){
      this.removeListeners()
      this.setListeners()
  }

  /**
   * Event handler for inserting Notes
   */
  keyModeHandler = (function keyModeHandler (e: KeyboardEvent): void {
    if(!cq.hasActiveElement(this.containerId)) return
    if(this.musicPlayer.getIsPlaying() === true){return} // getIsPlaying could also be undefined
    if(keyCodeNoteMap.has(e.code) && typeof this.cursor != undefined){
      e.preventDefault()
      var pname = keyCodeNoteMap.get(e.code)
      var oct = octToNum.get(this.container.querySelector("#octaveGroupKM .selected")?.id) || "4"
      const newNote: NewNote = this.createNewNote(pname, oct, null)
      if(newNote == undefined) return

      var noteExists: Boolean = false
      var noteToDelete: Element
      if(this.cursor.nextElement.classList.contains("chord")){
        var chordNotes = Array.from(this.cursor.nextElement.querySelectorAll(".note"))
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
        var replace = (this.container.querySelector("#insertToggle") as HTMLInputElement).checked
        this.insertCallback(newNote, replace).then(() => {
          this.m2m.update();
          this.resetListeners()
          var currentTargetId;
          if(newNote.chordElement != undefined){
            currentTargetId = this.rootSVG.querySelector("#" + newNote.chordElement.id).closest(".chord").id // new chord with own ID is created, if note is added
          }else{
            currentTargetId = newNote.id
          }
          this.scoreGraph.setCurrentNodeById(currentTargetId)
          if(this.scoreGraph.getCurrentNode() != undefined){
            this.cursor.definePosById(this.scoreGraph.getCurrentNode().getId())
          }
          this.musicPlayer.generateTone(newNote)
        }).catch(() => {
          //alert("your bar is too small")
        })
      }else{
        this.deleteCallback([noteToDelete]).then(() => {
          this.m2m.update();
          this.resetListeners()
          this.scoreGraph.setCurrentNodeById(newNote.chordElement.id)
          this.cursor.definePosById(this.scoreGraph.getCurrentNode()?.getId())
        })
      }

    }
  }).bind(this)

  /**
   * create a newNote
   * @param pname pitch name
   * @param oct octave
   * @param options 
   * @returns 
   */
  createNewNote(pname: string, oct: string, options): NewNote{
    //get relevant staffinfo
    this.setCurrentNodeScoreGraph()
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
    if(this.container.querySelector("#chordButton").classList.contains("selected")){
      targetChord = this.rootSVG.querySelector("#"+nearestNodeId)
      if(targetChord?.closest(".chord") !== null){
        targetChord = targetChord.closest(".chord")
      }
    }
    
    var relPosX = this.cursor.isBOL() ? "left" : "right"
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
        relPosX: relPosX,
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

    //this.setCurrentNodeScoreGraph()
    if(this.scoreGraph.getCurrentNode() == undefined){
      this.scoreGraph?.setCurrentNodeById(this.cursor?.getNextElement().id)
    }

    if(e.shiftKey && e.key.includes("Arrow")){
      e.preventDefault()
      this.navigateSelection(e.key)
    }else if(e.key.includes("Arrow")){
      e.preventDefault()
      this.endSelection()
      this.navigateCursor(e.key)
    }else if(["Delete", "Backspace"].indexOf(e.key) > -1){
      e.preventDefault()
      this.deleteByKey(e.key)
    }
  }).bind(this)

  /**
   * Navigate through Scoregraph with Arrow Keys
   * @param direction Key Code for Arrows
   */
  navigateCursor(direction: string){
   
    var container = document.getElementById(this.containerId)
    var cbs = container.querySelector("#chordButton").classList.contains("selected")
    if(cbs){
      this.scoreGraph.nextClass(["chord", "note"], direction)
    }else{
      switch(direction){
        case "ArrowLeft":
          this.scoreGraph.nextLeft()
          break;
        case "ArrowRight":
          this.scoreGraph.nextRight()
          break;
        case "ArrowUp":
          this.scoreGraph.nextUp()
          break;
        case "ArrowDown":
          this.scoreGraph.nextDown()
          break;
      }
    }

      if(this.scoreGraph.getCurrentNode() == undefined) return

      this.cursor.definePosById(this.scoreGraph.getCurrentNode().getId())
      if(this.scoreGraph.getCurrentNode().getId().indexOf("BOL") === -1){
        this.setCurrentNodeScoreGraph(this.scoreGraph.getCurrentNode().getId())
      }
  }


  // navigateSelection(direction: string){
  //   if(typeof this.startSelect === "undefined"){
  //     this.startSelect = document.getElementById(this.scoreGraph.getCurrentNode().getId()).getBoundingClientRect()
  //   }
  //   this.navigateCursor(direction)
  //   if(this.selectRect == undefined){
  //     this.selectRect = document.createElementNS(c._SVGNS_, "rect")
  //     this.selectRect.setAttribute("id", "keyModeSelectRect")
  //     document.getElementById("canvasG").appendChild(this.selectRect)
  //   }

  //   var cursorPos = this.cursor.getPos() //document.getElementById("cursor").getBoundingClientRect()

  //   var startSelectX = coord.adjustToPage(this.startSelect.left, "x")
  //   var cursorX = cursorPos.x 
  //   var startSelectY = coord.adjustToPage(this.startSelect.top, "y") + window.pageYOffset
  //   var cursorY = cursorPos.y //+ window.pageYOffset

  //   if(cursorX < startSelectX){ // draw rect to right
  //     this.selectRect.setAttribute("x", cursorX.toString())
  //     this.selectRect.setAttribute("width",  Math.abs(cursorX - startSelectX).toString())
  //   }else{ // else right
  //     this.selectRect.setAttribute("x", startSelectX.toString())
  //     this.selectRect.setAttribute("width",  Math.abs(coord.adjustToPage(this.startSelect.left, "x") - cursorX).toString())
  //   }

  //   if(cursorY < startSelectY){ // draw rect to top
  //     this.selectRect.setAttribute("y", cursorY.toString())
  //     //this.selectRect.setAttribute("height", Math.abs(cursorPos.y - coord.adjustToPage(this.startSelect.top, "y")).toString())
  //     this.selectRect.setAttribute("height", Math.abs(cursorY - startSelectY).toString())
  //     //console.log(cursorY, startSelectY,  this.selectRect.getAttribute("height"))
  //   }else{ // else bottom
  //     this.selectRect.setAttribute("y", startSelectY.toString())
  //     this.selectRect.setAttribute("height",  Math.abs(coord.adjustToPage(this.startSelect.bottom, "y") - cursorY).toString())
  //     //this.selectRect.setAttribute("height",  Math.abs(coord.adjustToPage(this.startSelect.top, "y") - coord.adjustToPage(cursorPos.y, "y")).toString())
  //     //console.log(cursorY, startSelectY, this.selectRect.getAttribute("height"))
  //   }

  //   var rectBBox = this.selectRect.getBoundingClientRect()
  //   var rx = rectBBox.x + window.pageXOffset //accomodate for scrolling
  //   var ry = rectBBox.y + window.pageYOffset
  //   this.m2m.getNoteBBoxes().forEach(bb => {
  //     var note = document.getElementById(bb.id)
  //     let stem = note.querySelector(".stem") as HTMLElement
  //     if( bb.x >= rx && 
  //         bb.x <= rx + rectBBox.width &&
  //         bb.y >= ry &&
  //         bb.y <= ry + rectBBox.height) {
  //             note.classList.add(marked)
  //             if(stem !== null) stem.classList.add(marked)
  //             var chord = note.closest(".chord")
  //             if(chord !== null){
  //                 if(!chord.classList.contains(marked)) chord.classList.add(marked)
  //             }
  //         }else{
  //             note.classList.remove(marked)
  //             if(stem !== null) stem.classList.remove(marked)
  //             var chord = note.closest(".chord")
  //             if(chord !== null) chord.classList.remove(marked)
  //         }
  //   })
  // }

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
    if(this.scoreGraph.getCurrentNode() == undefined || elementId === null){
      var nextEl = this.cursor.getNextElement()
      if(nextEl == undefined) return
      if(nextEl.classList.contains("staff")){
        nextEl = nextEl.querySelector(".layer")
      }
      this.scoreGraph.setCurrentNodeById(nextEl.id)
    }else if(elementId !== null){
      this.scoreGraph.setCurrentNodeById(elementId)
    }

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
    var isFocusedChord = this.container.querySelector("#chordButton").classList.contains("selected") ? true : false
    if(isFocusedChord){key = "Backspace"}
    switch(key){
      case "Delete":
        elementToDelete = this.rootSVG.querySelector("#" + this.scoreGraph.getCurrentNode().getRight().getId())
        break;
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
    if(this.rootSVG.querySelector(".marked") === null){
      this.deleteCallback([elementToDelete]).then(() => {
        this.m2m.update();
        this.resetListeners()
        this.cursor.definePosById(currNodeId)
      })
    }
  }

  ///// GETTER / SETTER////////////////

  setM2M(m2m: Mouse2MEI){
    this.m2m = m2m
    this.cursor.setM2M(m2m)
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
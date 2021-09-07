import ScoreGraph from "../datastructures/ScoreGraph";
import Cursor from "../gui/Cursor";
import MusicPlayer from "../MusicPlayer";
import { keyCodeNoteMap, keysigToNotes, octToNum } from "../utils/mappings";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import { uuidv4 } from "../utils/random";
import { NewNote } from "../utils/Types";
import { constants as c } from "../constants"
import Handler from "./Handler";
import * as coord from "../utils/coordinates"


const marked = "marked"

class KeyModeHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    scoreGraph: ScoreGraph
    cursor: Cursor

    selectRect: SVGRectElement
    startSelect: DOMRect

    insertCallback: (newNote: NewNote) => Promise<any>;
    deleteCallback: (notes: Array<Element>) => Promise<any>;


    constructor(){
        this.cursor = new Cursor()
    }

  setListeners() {
    document.addEventListener('keydown', this.keyInsertHandler)
    document.addEventListener('keydown', this.keyInputHandler)

    this.cursor.setClickListener()
  }

  removeListeners() {
    document.removeEventListener('keydown', this.keyInsertHandler)
    document.removeEventListener('keydown', this.keyInputHandler)

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
  keyInsertHandler = (function keyInsertHandler (evt: KeyboardEvent): void {
    if(keyCodeNoteMap.has(evt.code) && typeof this.cursor !== "undefined"){
      evt.preventDefault()
      var pname = keyCodeNoteMap.get(evt.code)
      var oct = octToNum.get(document.querySelector("#octaveGroupTM .selected")?.id) || "4"
      const newNote: NewNote = this.createNewNote(pname, oct, null)

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
        this.insertCallback(newNote).then(() => {
          this.m2m.update();
          this.resetListeners()
          var currentTargetId;
          if(typeof newNote.chordElement !== "undefined"){
            currentTargetId = document.getElementById(newNote.chordElement.id).closest(".chord").id // new chord with own ID is created, if note is added
          }else{
            currentTargetId = newNote.id
          }
          this.scoreGraph.setCurrentNodeById(currentTargetId)
          this.cursor.definePosById(this.scoreGraph.getCurrentNode().getId())
        })
        this.musicPlayer.generateTone(newNote)
      }else{
        this.deleteCallback([noteToDelete]).then(() => {
          this.m2m.update();
          this.resetListeners()
          this.scoreGraph.setCurrentNodeById(newNote.chordElement.id)
          this.cursor.definePosById(this.scoreGraph.getCurrentNode().getId())
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
    var nearestNodeId = this.scoreGraph.getCurrentNode().getId()
    var closestStaff = this.m2m.getCurrentMei().getElementById(nearestNodeId).closest("staff")
    var closestMeasure = closestStaff.closest("measure")
    var closestStaffIdx = parseInt(closestStaff.getAttribute("n")) - 1
    var closestMeasureIdx = parseInt(closestMeasure.getAttribute("n")) - 1

    var keysig = this.m2m.getMeasureMatrix().get(closestMeasureIdx, closestStaffIdx).keysig
    var accid
    if(typeof keysig !== "undefined"){
        accid = keysigToNotes.get(keysig)
        accid = accid.filter((s:string) => {return s === pname})
        if(accid.length === 1){
            accid = keysig.charAt(1)
        }
    }

    var targetChord: Element
    if(document.getElementById("chordButton").classList.contains("selected")){
      targetChord = document.getElementById(nearestNodeId)
      if(targetChord.closest(".chord") !== null){
        targetChord = targetChord.closest(".chord")
      }
    }
    
    var relPosX = this.cursor.isBOL() ? "left" : "right"

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
        staffId: document.getElementById(nearestNodeId).closest(".staff").id,
        chordElement: targetChord,
        rest: document.getElementById("pauseNote").classList.contains("selected")
    }
    console.log(newNote)
    return newNote
}

  /**
   * Event Handler for any Keyboard input (except inserting)
   */
  keyInputHandler = (function keyInputHandler(e: KeyboardEvent){
    //this.setCurrentNodeScoreGraph()
    if(typeof this.scoreGraph.getCurrentNode() === "undefined"){
      this.scoreGraph.setCurrentNodeById(this.cursor.getNextElement().id)
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
      this.cursor.definePosById(this.scoreGraph.getCurrentNode().getId())
      if(this.scoreGraph.getCurrentNode().getId().indexOf("BOL") === -1){
        this.setCurrentNodeScoreGraph(this.scoreGraph.getCurrentNode().getId())
      }
  }


  navigateSelection(direction: string){
    if(typeof this.startSelect === "undefined"){
      this.startSelect = document.getElementById(this.scoreGraph.getCurrentNode().getId()).getBoundingClientRect()
    }
    this.navigateCursor(direction)
    if(typeof this.selectRect === "undefined"){
      this.selectRect = document.createElementNS(c._SVGNS_, "rect")
      this.selectRect.setAttribute("id", "keyModeSelectRect")
      document.getElementById("canvasG").appendChild(this.selectRect)
    }

    var cursorPos = this.cursor.getPos() //document.getElementById("cursor").getBoundingClientRect()

    var startSelectX = coord.adjustToPage(this.startSelect.left, "x")
    var cursorX = cursorPos.x 
    var startSelectY = coord.adjustToPage(this.startSelect.top, "y") + window.pageYOffset
    var cursorY = cursorPos.y //+ window.pageYOffset

    if(cursorX < startSelectX){ // draw rect to right
      this.selectRect.setAttribute("x", cursorX.toString())
      this.selectRect.setAttribute("width",  Math.abs(cursorX - startSelectX).toString())
    }else{ // else right
      this.selectRect.setAttribute("x", startSelectX.toString())
      this.selectRect.setAttribute("width",  Math.abs(coord.adjustToPage(this.startSelect.left, "x") - cursorX).toString())
    }

    if(cursorY < startSelectY){ // draw rect to top
      this.selectRect.setAttribute("y", cursorY.toString())
      //this.selectRect.setAttribute("height", Math.abs(cursorPos.y - coord.adjustToPage(this.startSelect.top, "y")).toString())
      this.selectRect.setAttribute("height", Math.abs(cursorY - startSelectY).toString())
      console.log(cursorY, startSelectY,  this.selectRect.getAttribute("height"))
    }else{ // else bottom
      this.selectRect.setAttribute("y", startSelectY.toString())
      this.selectRect.setAttribute("height",  Math.abs(coord.adjustToPage(this.startSelect.bottom, "y") - cursorY).toString())
      //this.selectRect.setAttribute("height",  Math.abs(coord.adjustToPage(this.startSelect.top, "y") - coord.adjustToPage(cursorPos.y, "y")).toString())
      console.log(cursorY, startSelectY, this.selectRect.getAttribute("height"))
    }

    var rectBBox = this.selectRect.getBoundingClientRect()
    var rx = rectBBox.x + window.pageXOffset //accomodate for scrolling
    var ry = rectBBox.y + window.pageYOffset
    this.m2m.getNoteBBoxes().forEach(bb => {
      var note = document.getElementById(bb.id)
      let stem = note.querySelector(".stem") as HTMLElement
      if( bb.x >= rx && 
          bb.x <= rx + rectBBox.width &&
          bb.y >= ry &&
          bb.y <= ry + rectBBox.height) {
              note.classList.add(marked)
              if(stem !== null) stem.classList.add(marked)
              var chord = note.closest(".chord")
              if(chord !== null){
                  if(!chord.classList.contains(marked)) chord.classList.add(marked)
              }
          }else{
              note.classList.remove(marked)
              if(stem !== null) stem.classList.remove(marked)
              var chord = note.closest(".chord")
              if(chord !== null) chord.classList.remove(marked)
          }
    })
  }

  /**
   * End selection in Keyboardmode
   */
  endSelection(){
    this.startSelect = undefined
    if(this.selectRect !== null && typeof this.selectRect !== "undefined"){
      this.selectRect.remove()
      document.querySelectorAll(".marked").forEach(m => {
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
    if(typeof this.scoreGraph.getCurrentNode() === "undefined" || elementId === null){
      var nextEl = this.cursor.getNextElement()
      if(nextEl.classList.contains("staff")){
        nextEl = nextEl.querySelector(".layer:empty")
      }
      this.scoreGraph.setCurrentNodeById(nextEl.id)
    }else if(elementId !== null){
      this.scoreGraph.setCurrentNodeById(elementId)
    }
  }

  /**
   * Delete next element depending on Keyboad input (Backspace: left, Delete: richt)
   * @param key "Backspace" or "Delete"
   */
  deleteByKey(key: string){
    var elementToDelete: Element
    var currNodeId: string
    var isFocusedChord = document.getElementById("chordButton").classList.contains("selected") ? true : false
    if(isFocusedChord){key = "Backspace"}
    switch(key){
      case "Delete":
        elementToDelete = document.getElementById(this.scoreGraph.getCurrentNode().getRight().getId())
        break;
      case "Backspace":
        elementToDelete = document.getElementById(this.scoreGraph.getCurrentNode().getId())
        if(!this.scoreGraph.getCurrentNode().getLeft().isBOL()){
          this.navigateCursor("ArrowLeft")
        }else{
          this.navigateCursor("ArrowRight")
        }
        break;
    }

    currNodeId = this.scoreGraph.getCurrentNode().getId()
    if(document.querySelector(".marked") === null){
      this.deleteCallback([elementToDelete]).then(() => {-
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

  setInsertCallback(insertCallback: (newNote: NewNote) => Promise<any>){
    this.insertCallback = insertCallback
    return this
  }

  setDeleteCallback(deleteCallback: (notes: Array<Element>) => Promise<any>){
    this.deleteCallback = deleteCallback
    return this
  }

}

export default KeyModeHandler
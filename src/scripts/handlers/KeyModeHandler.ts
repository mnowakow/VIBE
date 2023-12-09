import ScoreGraph from "../datastructures/ScoreGraph";
import MusicProcessor from "../MusicProcessor";
import { keyCodeNoteMap, keysigToNotes, octToNum, midiToNote } from "../utils/mappings";
import { Mouse2SVG } from "../utils/Mouse2SVG";
import { uuidv4 } from "../utils/random";
import { NewNote } from "../utils/Types";
import { constants as c } from "../constants"
import Handler from "./Handler";
import * as cq from "../utils/convenienceQueries"
import * as meiOperation from "../utils/MEIOperations"
import ScoreNode from "../datastructures/ScoreNode";

const marked = "marked"


class KeyModeHandler implements Handler {
  m2s?: Mouse2SVG;
  musicPlayer?: MusicProcessor;
  currentMEI?: string | Document;

  scoreGraph: ScoreGraph

  selectRect: SVGRectElement
  startSelect: DOMRect

  insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>;
  deleteCallback: (notes: Array<Element>) => Promise<any>;

  containerId: string
  container: Element
  vrvSVG: Element
  interactionOverlay: Element

  private shiftDown: Boolean


  constructor(containerId: string) {
    this.setContainerId(containerId)
  }

  setListeners() {
    document.addEventListener("keydown", this.pressedHandler)
    document.addEventListener("keyup", this.pressedHandler)
    document.addEventListener('keydown', this.noteInputHandler);
    document.addEventListener('keydown', this.keyInputHandler);
    document.addEventListener("pasted", this.pastedHandler);
    document.addEventListener("midiin", this.midiHandler)
  }

  removeListeners() {
    document.removeEventListener("keydown", this.pressedHandler)
    document.removeEventListener("keyup", this.pressedHandler)
    document.removeEventListener('keydown', this.noteInputHandler);
    document.removeEventListener('keydown', this.keyInputHandler);
    document.removeEventListener("pasted", this.pastedHandler);
    document.removeEventListener("midiin", this.midiHandler)
  }

  resetListeners() {
    this.removeListeners()
    this.setListeners()
  }

  /**
   * Event handler for inserting Notes
   */
  noteInputHandler = (function noteInputHandler(e: KeyboardEvent): void {
    this.noteInput(e)
  }).bind(this)

  noteInput(e: KeyboardEvent) {
    if (e.shiftKey || e.metaKey) return
    if (this.container.querySelector("[contenteditable=true]")) return
    var currentNode = this.scoreGraph.getCurrentNode()
    if (document.getElementById(currentNode.getId()) === null) return
    if (!cq.hasActiveElement(this.containerId)) return
    if (this.musicPlayer.getIsPlaying() === true) { return } // getIsPlaying could also be undefined
    if (keyCodeNoteMap.has(e.code)) {
      e.preventDefault()
      var pname = keyCodeNoteMap.get(e.code)
      var oct = octToNum.get(this.container.querySelector("#octaveGroupKM .selected")?.id) || "4"
      const newNote: NewNote = this.createNewNote(pname, oct, null)
      if (!newNote) return
      this.processNewNote(newNote)
    }
  }

  processNewNote(newNote: NewNote) {
    var currentNode = this.scoreGraph.getCurrentNode()
    var noteExists: Boolean = false
    var noteToDelete: Element
    if (document.getElementById(currentNode.getId()).closest(".chord") !== null) {
      var chordNotes = Array.from(document.getElementById(currentNode.getId()).closest(".chord").querySelectorAll(".note"))
      chordNotes.forEach((n: Element) => {
        var meiNote = this.m2s.getCurrentMei().getElementById(n.id)
        var sameOct = meiNote.getAttribute("oct") === newNote.oct
        var samePname = meiNote.getAttribute("pname") === newNote.pname
        if (sameOct && samePname) {
          noteExists = true
          noteToDelete = n
        }
      })
    }

    if (!noteExists) {
      var currentStaff = this.m2s.getCurrentMei().getElementById(newNote.staffId)
      // check if new note should replace a rest
      if (this.scoreGraph.getCurrentNode().getDocElement().classList.contains("rest")) {
        newNote.relPosX = "left";
        newNote.nearestNoteId = this.scoreGraph.getCurrentNode().getId()
      } else if (!this.scoreGraph.getCurrentNode()?.getDocElement().classList.contains("mRest") && this.scoreGraph.lookUp(["note", "rest", "mRest"], "right") == null && newNote.chordElement == undefined) {
        //check if new Measure must be created 
        meiOperation.addMeasure(this.m2s.getCurrentMei())
        var staffN = currentStaff.getAttribute("n")
        var layerN = this.m2s.getCurrentMei().getElementById(newNote.layerId).getAttribute("n")
        newNote.staffId = currentStaff.closest("measure").nextElementSibling.querySelector(`staff[n='${staffN}']`).id
        newNote.layerId = currentStaff.closest("measure").nextElementSibling.querySelector(`staff[n='${staffN}'] layer[n='${layerN}']`).id
        newNote.relPosX = "left"
        newNote.nearestNoteId = this.m2s.getCurrentMei().querySelector("#" + newNote.staffId).querySelector("mRest").id
      } else {
        //or if ne note must be rendered into the next bar
        var oldStaffId = newNote.staffId
        if (this.m2s.getCurrentMei().querySelector("#" + newNote.nearestNoteId) === null) return
        if (this.m2s.getCurrentMei().querySelector("#" + newNote.nearestNoteId).tagName !== "mRest") {
          newNote.staffId = this.m2s.getCurrentMei().getElementById(this.scoreGraph.getNextClass(["note", "rest", "mRest"], "right")?.getId())?.closest("staff").id || newNote.staffId
          newNote.layerId = this.m2s.getCurrentMei().getElementById(this.scoreGraph.getNextClass(["note", "rest", "mRest"], "right")?.getId())?.closest("layer").id || newNote.layerId
        }

        if (oldStaffId !== newNote.staffId) {
          newNote.relPosX = "left"
          newNote.nearestNoteId = this.scoreGraph.getCurrentNode()?.getId()
        }
      }
      this.insertCallback(newNote, true).then(() => {
        //this.m2s.update();
        this.resetListeners()
        var currentTargetId;
        if (newNote.chordElement != undefined) {
          currentTargetId = this.vrvSVG.querySelector("#" + newNote.chordElement.id).closest(".chord").id // new chord with own ID is created, if note is added
        } else {
          currentTargetId = newNote.id
        }
        this.scoreGraph.setCurrentNodeById(currentTargetId)
        this.musicPlayer.generateTone(newNote)
      }).catch(() => {
        //alert("your bar is too small")
      })
    } else {
      this.deleteCallback([noteToDelete]).then(() => {
        //this.m2s.update();
        this.resetListeners()
        this.scoreGraph.setCurrentNodeById(newNote.chordElement?.id)
      })
    }

  }


  midiHandler = (function midiHandler(e: CustomEvent) {
    e.preventDefault()
    this.midiInput(e.detail)
  }).bind(this)

  midiInput(midiArray: Array<number>) {
    var [_, midiNum, velocity] = midiArray
    var noteName = midiToNote.get(midiNum)
    if (noteName == undefined) return
    if (velocity === 0) return

    var pname = noteName.slice(0, 1)
    var accid = noteName.length === 3 ? noteName.slice(1, 2) : undefined
    var oct = noteName.match(/\d/g)[0].toString()

    var newNote = this.createNewNote(pname, oct, {accid: accid})
    if(newNote == undefined) return
    this.processNewNote(newNote)
  }

  pressedHandler = (function pressedHandler(e: KeyboardEvent) {
    this.assignKeys(e)
  }).bind(this)

  assignKeys(e: KeyboardEvent) {
    var b = false
    if (e.type === "keydown") {
      b = true
    } else if (e.type === "keyup") {
      b = false
    }
    switch (e.key) {
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
  createNewNote(pname: string, oct: string, options): NewNote {
    //get relevant staffinfo
    var nearestNodeId = this.scoreGraph.getCurrentNode()?.getId()
    if (nearestNodeId == undefined) return
    var closestStaff = this.m2s.getCurrentMei().getElementById(nearestNodeId)?.closest("staff") || this.m2s.getCurrentMei().querySelector("measure > staff") //asume first measure first staff
    var closestMeasure = closestStaff.closest("measure")
    var closestStaffIdx = parseInt(closestStaff.getAttribute("n")) - 1
    var closestMeasureIdx = parseInt(closestMeasure.getAttribute("n")) - 1

    var keysig = this.m2s.getMeasureMatrix().get(closestMeasureIdx, closestStaffIdx).keysig
    var accids = keysigToNotes.get(keysig)
    var accid: string
    if (options === null) {
      accids = accids.filter((s: string) => { return s === pname })
      if (accids.length === 1) {
        accid = keysig.charAt(1)
      }
    } else if (options?.accid) {
      accid = options.accid
      //should the note be enharmonically swapped?
      //midi inputs are only given as sharps
      var increment = pname === "g" ? -6 : 1 //- 6 is for jumping back to a; oct stays the same
      if(keysig.includes("f") && accids.includes(String.fromCharCode(pname.charCodeAt(0) + increment))){
        accid = "f"
        pname = String.fromCharCode(pname.charCodeAt(0) + increment)
      }
    
    }

    var targetChord: Element
    //if(this.container.querySelector("#chordButton")?.classList.contains("selected")){
    if (this.shiftDown) {
      targetChord = this.vrvSVG.querySelector("#" + nearestNodeId)
      if (targetChord?.closest(".chord") !== null) {
        targetChord = targetChord.closest(".chord")
      }
    }

    this.setContainerId(this.containerId)
    var newNote: NewNote = {
      pname: pname,
      id: uuidv4(),
      dur: this.m2s.getDurationNewNote(),
      dots: this.m2s.getDotsNewNote(),
      oct: oct,
      keysig: keysig,
      accid: accid,
      nearestNoteId: nearestNodeId,
      relPosX: "right",
      staffId: this.vrvSVG.querySelector("#" + nearestNodeId)?.closest(".staff").id,
      layerId: this.container.querySelector(`#${this.vrvSVG.querySelector("#" + nearestNodeId)?.closest(".staff").id} .activeLayer`)?.id,
      chordElement: targetChord,
      rest: this.container.querySelector("#pauseNote")?.classList.contains("selected")
    }

    return newNote
  }

  /**
   * Event Handler for any Keyboard input (except inserting)
   */
  keyInputHandler = (function keyInputHandler(e: KeyboardEvent) {
    
    if (!cq.hasActiveElement(this.containerId)) return
    if (e.ctrlKey || e.metaKey) return //prevent confusion with global keyboard functionalities
    if (this.interactionOverlay.querySelector("div[contenteditable=true]") !== null) return // prevent navigating in scrore, when label editor is open
    if (this.scoreGraph.getCurrentNode() == undefined) return


    if (e.shiftKey && e.key.includes("Arrow")) {
      e.preventDefault()
      this.navigateSelection(e.key)
    } else if (e.key.includes("Arrow")) {
      e.preventDefault()
      this.endSelection()
      this.navigateCursor(e.key)
    } else if (["Delete", "Backspace"].indexOf(e.key) > -1) {
      e.preventDefault()
      //this.deleteByKey(e.key)
    }
  }).bind(this)

  /**
   * Navigate through Scoregraph with Arrow Keys
   * @param direction Key Code for Arrows
   */
  navigateCursor(direction: string) {
    var prevNode = this.scoreGraph.getCurrentNode()
    switch (direction) {
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

    if (this.scoreGraph.getCurrentNode() == undefined) return
    this.container.querySelectorAll(".marked").forEach(m => m.classList.remove("marked"))
    this.container.querySelector("#" + prevNode.getId())?.classList.remove("lastAdded")
    var currEl = this.container.querySelector("#" + this.scoreGraph.getCurrentNode().getId())
    currEl.classList.add("marked")
    if (currEl.closest(".chord") !== null) {
      currEl.querySelectorAll(".note, .notehead").forEach(n => n.classList.add("marked"))
    }
  }

  /**
   * End selection in Keyboardmode
   */
  endSelection() {
    this.startSelect = undefined
    if (this.selectRect !== null && typeof this.selectRect !== "undefined") {
      this.selectRect.remove()
      this.vrvSVG.querySelectorAll(".marked").forEach(m => {
        m.classList.remove("marked")
      })
    }
    this.selectRect = undefined
  }

  /**
   * 
   * @param elementId Id of the current Element to be set in the ScoreGrap
   */
  setCurrentNodeScoreGraph(elementId: string = null) {
    this.scoreGraph.setCurrentNodeById(elementId)
    return this
  }

  /**
   * Set Cursor to new position after pasting
   */
  pastedHandler = (function pastedHandler(e: CustomEvent) {
    console.log("PASTED ", e)
    this.scoreGraph.setCurrentNodeById(e.detail)
    //this.cursor.definePosById(this.scoreGraph.getCurrentNode()?.getId())
  }).bind(this)

  /**
   * Delete next element depending on Keyboad input (Backspace: left, Delete: right)
   * @param key "Backspace" or "Delete"
   */
  deleteByKey(key: string) {
    var elementToDelete: Element
    var currNodeId: string
    var isFocusedChord = this.container.querySelector("#chordButton")?.classList.contains("selected") ? true : false
    if (isFocusedChord) { key = "Backspace" }
    switch (key) {
      case "Delete":
      //elementToDelete = this.vrvSVG.querySelector("#" + this.scoreGraph.getCurrentNode().getRight().getId())
      //break;
      case "Backspace":
        elementToDelete = this.vrvSVG.querySelector("#" + this.scoreGraph.getCurrentNode().getId())

        if (this.scoreGraph.getCurrentNode().isLayer()) {
          elementToDelete = this.vrvSVG.querySelector("#" + this.scoreGraph.getCurrentNode().getLeft().getId())
          this.navigateCursor("ArrowLeft")
        }

        if (!this.scoreGraph.getCurrentNode().getLeft()?.isBOL()) {
          this.navigateCursor("ArrowLeft")
        } else {
          this.navigateCursor("ArrowRight")
        }
        break;
    }

    currNodeId = this.scoreGraph.getCurrentNode().getId()
  }

  ///// GETTER / SETTER////////////////

  setm2s(m2s: Mouse2SVG) {
    this.m2s = m2s
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

  setCurrentMEI(mei: Document) {
    this.currentMEI = mei
    return this
  }

  setContainerId(id: string) {
    this.containerId = id
    this.vrvSVG = cq.getVrvSVG(id)
    this.interactionOverlay = cq.getInteractOverlay(id)
    this.container = document.getElementById(id)
    return this
  }

  setInsertCallback(insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>) {
    this.insertCallback = insertCallback
    return this
  }

  setDeleteCallback(deleteCallback: (notes: Array<Element>) => Promise<any>) {
    this.deleteCallback = deleteCallback
    return this
  }

}

export default KeyModeHandler
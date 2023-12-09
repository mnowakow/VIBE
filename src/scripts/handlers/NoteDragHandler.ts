import { Attributes, EditorAction, NewNote } from '../utils/Types'
import { constants as c } from '../constants';
import MeasureMatrix from '../datastructures/MeasureMatrix'
import MusicProcessor from '../MusicProcessor';
import DeleteHandler from './DeleteHandler';
import Handler from './Handler';
import { Mouse2SVG } from '../utils/Mouse2SVG';
import * as coordinates from "../utils/coordinates"
import * as cq from "../utils/convenienceQueries"
import interact from "interactjs"
import { uuidv4 } from '../utils/random';

/**
 * Class that handles insert mode, events, and actions.
 */
class NoteDragHandler implements Handler {
  private containerId: string

  musicPlayer: MusicProcessor;
  m2s?: Mouse2SVG;
  currentMEI: Document


  private noteDragEvent: MouseEvent
  private noteDragListener: Interact.Interactable
  loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>;
  private newNote: NewNote
  insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>;


  constructor(containerId: string) {
    this.setContainerId(containerId)
  }


  setListeners() {
    var that = this
    this.noteDragListener = interact("#" + this.containerId + " #interactionOverlay .notehead rect")
      .draggable({
        startAxis: "y",
        lockAxis: "y",
        listeners: {
          move: this.dragNote.bind(this),
          end(event) {
            that.deleteTempDistances()
            that.insertCallback(that.newNote, true)
          }
        },
        modifiers: [
          interact.modifiers.restrictRect({
            endOnly: true
          })
        ]
      })
  }

  removeListeners(): void {
    this.noteDragListener?.unset()
  }

  resetListeners() {
    this.removeListeners()
    this.setListeners()
    return this
  }

  deleteTempDistances() {
    cq.getInteractOverlay(this.containerId)?.querySelectorAll("*[distY]").forEach(d => {
      d.removeAttribute("distY")
      d.classList.remove("moving")
    })
  }

  dragNote(e: MouseEvent): void {
    var noteHeadBBox = e.target as Element
    this.noteDragEvent = new MouseEvent("draggingNote", e)
    noteHeadBBox.dispatchEvent(this.noteDragEvent)
    var refNote = cq.getVrvSVG(this.containerId).querySelector("#" + noteHeadBBox.parentElement.getAttribute("refId")).closest(".note")
    var note = cq.getInteractOverlay(this.containerId).querySelector("*[refId=\"" + refNote.id + "\"] rect")

    if (!noteHeadBBox.classList.contains("moving")) noteHeadBBox.classList.add("moving")
    var headPos = this.newPos(noteHeadBBox, e)
    this.m2s.defineNote(headPos.x, headPos.y, {})
    this.newNote = this.m2s.getNewNote()
    if (refNote.closest(".chord") !== null) {
      this.newNote.chordElement = refNote.closest(".chord")
      this.currentMEI.querySelector("#" + refNote.id)?.remove()
    }
  }


  newPos(target: Element, e: MouseEvent) {
    var pt = coordinates.transformToDOMMatrixCoordinates(e.clientX, e.clientY, target.closest("*[viewBox]"))
    var edy = pt.y

    var ptDist = coordinates.transformToDOMMatrixCoordinates(target.getBoundingClientRect().x, target.getBoundingClientRect().y, target.closest("*[viewBox]"))
    var distY = (parseFloat(target.getAttribute('distY'))) || edy - ptDist.y

    target.setAttribute("distY", distY.toString())
    target.setAttribute("y", (edy - distY).toString())

    return { x: pt.x, y: pt.y }
  }

  //////////////// GETTER/ SETTER ////////////

  setMusicProcessor(musicPlayer: MusicProcessor) {
    this.musicPlayer = musicPlayer
    return this
  }

  setCurrentMEI(xmlDoc: Document) {
    this.currentMEI = xmlDoc
    return this
  }

  setm2s(m2s: Mouse2SVG) {
    this.m2s = m2s
    return this
  }

  setInsertCallback(insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>) {
    this.insertCallback = insertCallback
    return this
  }

  setContainerId(id: string) {
    this.containerId = id
    return this
  }
}

export default NoteDragHandler;

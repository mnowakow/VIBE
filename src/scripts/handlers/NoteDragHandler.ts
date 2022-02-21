import { Attributes, EditorAction, NewNote } from '../utils/Types'
import { constants as c } from '../constants';
import MeasureMatrix from '../datastructures/MeasureMatrix'
import * as d3 from 'd3';
import MusicPlayer from '../MusicPlayer';
import DeleteHandler from './DeleteHandler';
import Handler from './Handler';
import { Mouse2MEI } from '../utils/Mouse2MEI';
import * as coordinates from "../utils/coordinates"

//@ts-ignore
//const $ = H5P.jQuery;

/**
 * Class that handles insert mode, events, and actions.
 */
class NoteDragHandler implements Handler{
  private dragStartCoords: {x:number, y:number}
  private dx: number;
  private dy: number;
  private notes;
  private draggedElement: SVGSVGElement;
  private draggedUseChild: Element
  musicPlayer: MusicPlayer;
  m2m?: Mouse2MEI;
  currentMEI: Document
  private wasDragged: boolean = false;
  private oldNote: Array<string>

  private noteDraggedEvent: Event

  private editCallback: (action: EditorAction) => Promise<any>
  private elementAttrCallback: (id: string) => Attributes

  private deleteHandler: DeleteHandler


  constructor(){
    this.dragInit();
    this.noteDraggedEvent = new Event("noteDragged")
  }


  setListeners() {

  }

  removeListeners(): void {
   
  }

  resetListeners(){
    this.removeListeners()
    this.setListeners()
  }
  

  /**
   * Initialize the dragging action and handler for selected elements.
   */
  dragInit (): void {
    // Adding listeners
    
    const dragBehaviour = d3.drag()
      .on('start', dragStarted.bind(this))
      .on('drag', this.dragging.bind(this))
      .on('end', this.dragEnded.bind(this));

    this.notes = d3.selectAll(c._NOTE_WITH_CLASSSELECTOR_); 
    this.draggedElement = null;
    this.notes.call(dragBehaviour);

      // Drag effects
    function dragStarted (): void {        
      this.draggedElement =  d3.event.sourceEvent.currentTarget
      this.dragStartCoords = [d3.event.x, d3.event.y]//coordinates.transformToDOMMatrixCoordinates(d3.event.sourceEvent.clientX, d3.event.sourceEvent.clientY, document.getElementById(c._ROOTSVGID_))
      this.dx = 0; //this.dragStartCoords[0]
      this.dy = 0; //this.dragStartCoords[1]
    }
  }

  dragging(): void{
    this.dx = d3.event.x
    this.dy = d3.event.y
    var coords = coordinates.transformToDOMMatrixCoordinates(d3.event.sourceEvent.clientX, d3.event.sourceEvent.clientY, document.getElementById(c._ROOTSVGID_))


    var diffY = Math.abs(this.dy - this.dragStartCoords[1])
    if(diffY > 15){
      this.wasDragged = true;
    }

    //snap while dragging
    this.m2m.defineNote(coords.x, coords.y, {})
    var newNote = [this.m2m.getNewNote().pname, this.m2m.getNewNote().oct]
    if(this.oldNote == undefined){
      this.oldNote = newNote
    }

    const relativeY = d3.event.y - this.dragStartCoords[1] //d3.event.y - this.dragStartCoords[1]
    const relativeX = 0//d3.event.x - this.dragStartCoords[0];
  
    var shiftY = 10
    shiftY = relativeY < 0 ? -shiftY : shiftY
    if(!this.oldNote.every((v, i) => v === newNote[i])){
      this.draggedElement.setAttribute('transform', 'translate(' + [relativeX, relativeY + shiftY] + ')')
      this.oldNote = newNote
    }
  }

  dragEnded (): void {
    if(this.wasDragged){
      this.notes.on("drag", null);
      this.wasDragged = false;

      this.draggedElement.dispatchEvent(this.noteDraggedEvent)

      document.getElementById(this.draggedElement.id).classList.remove(this.deleteHandler.getDeleteFlag()) //remove flag to delete after dragging
      const action: EditorAction = {
        action: "drag",
        param: { elementId: this.draggedElement.id,
          x: this.dx,
          y: this.dy
        }
      }
      this.editCallback(action).then(() => {

        var attr = this.elementAttrCallback(this.draggedElement.id);
        var svg = document.querySelector(c._ROOTSVGID_WITH_IDSELECTOR_) as SVGGElement
        var mm = new MeasureMatrix();
        //mm.populateFromSVG(svg)
        mm.populateFromMEI(this.currentMEI)
        var staff = this.currentMEI.getElementById(this.draggedElement.id).closest("staff")
        var measure = staff.closest("measure")
        var staffIdx = parseInt(staff.getAttribute("n")) - 1
        var measureIdx = parseInt(measure.getAttribute("n")) - 1
        var dur = this.currentMEI.getElementById(this.draggedElement.id).closest("chord") !== null ? this.currentMEI.getElementById(this.draggedElement.id).closest("chord").getAttribute("dur") : attr.dur
        
        let newNote: NewNote = {
          pname: attr.pname,
          oct: attr.oct.toString(),
          dur: dur,
          keysig: mm.get(measureIdx, staffIdx).keysig,
          rest: false,
        }

        this.musicPlayer.generateTone(newNote)
      });
    }
  }

  //////////////// GETTER/ SETTER ////////////

  setMusicPlayer(musicPlayer: MusicPlayer){
    this.musicPlayer = musicPlayer
    return this
  }

  setCurrentMEI(xmlDoc: Document){
    this.currentMEI = xmlDoc
    return this
  }

  setM2M(m2m: Mouse2MEI){
    this.m2m = m2m
    return this
  }

  setDeleteHandler(deleteHandler: DeleteHandler){
    this.deleteHandler = deleteHandler
    return this
  }
  
  setEditCallback(editCallback: (action: EditorAction) => Promise<any>){
    this.editCallback = editCallback
    return this
  }

  setElementAttrCallback(elementAttrCallback: (id: string) => Attributes ){
    this.elementAttrCallback = elementAttrCallback
    return this
  }
}

export default NoteDragHandler;

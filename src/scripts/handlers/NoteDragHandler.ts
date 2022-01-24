import { Attributes, EditorAction, NewNote } from '../utils/Types'
import { constants as c } from '../constants';
import MeasureMatrix from '../datastructures/MeasureMatrix'
import * as d3 from 'd3';
import MusicPlayer from '../MusicPlayer';
import DeleteHandler from './DeleteHandler';
import Handler from './Handler';
import { Mouse2MEI } from '../utils/Mouse2MEI';

//@ts-ignore
//const $ = H5P.jQuery;

/**
 * Class that handles insert mode, events, and actions.
 */
class NoteDragHandler implements Handler{
  private dragStartCoords: Array<number>;
  private dx: number;
  private dy: number;
  private notes;
  private draggedElement: SVGSVGElement;
  musicPlayer: MusicPlayer;
  m2m?: Mouse2MEI;
  currentMEI: Document
  private wasDragged: boolean = false;

  private editCallback: (action: EditorAction) => Promise<any>
  private elementAttrCallback: (id: string) => Attributes

  private deleteHandler: DeleteHandler

  constructor(){
    this.dragInit();
  }


  setListeners() {
    throw new Error('Method not implemented.');
  }
  removeListeners(): void {
    throw new Error('Method not implemented.');
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
    this.dragStartCoords = new Array(this.notes.size());
    this.draggedElement = null;
    this.notes.call(dragBehaviour);

      // Drag effects
    function dragStarted (): void {        
      this.draggedElement =  d3.event.sourceEvent.currentTarget;
      this.dragStartCoords = [d3.event.x, d3.event.y];
      this.dx = 0; //this.dragStartCoords[0]
      this.dy = 0; //this.dragStartCoords[1]
    }
  }

  dragging(): void{
    this.dx = d3.event.x
    this.dy = d3.event.y

    const relativeY = d3.event.y - this.dragStartCoords[1];
    const relativeX = 0//d3.event.x - this.dragStartCoords[0];

    this.draggedElement.setAttribute('transform', 'translate(' + [relativeX, relativeY] + ')')

    var diffY = Math.abs(this.dy - this.dragStartCoords[1])
    if(diffY > 15){
      this.wasDragged = true;
    }
  }

  dragEnded (): void {
    if(this.wasDragged){
      this.notes.on("drag", null);
      this.wasDragged = false;
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

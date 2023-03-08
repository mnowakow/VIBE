import { Attributes, EditorAction, NewNote } from '../utils/Types'
import { constants as c } from '../constants';
import MeasureMatrix from '../datastructures/MeasureMatrix'
import * as d3 from 'd3';
import MusicPlayer from '../MusicPlayer';
import DeleteHandler from './DeleteHandler';
import Handler from './Handler';
import { Mouse2MEI } from '../utils/Mouse2MEI';
import * as coordinates from "../utils/coordinates"
import * as cq from "../utils/convenienceQueries"

//@ts-ignore
//const $ = H5P.jQuery;

/**
 * @deprecated
 * Class that handles insert mode, events, and actions.
 */
class NoteDragHandler implements Handler{
  private containerId: string;
  private container : Element
  private interactionOverlay: Element
  private rootSVG: Element
  private dragStartCoords: {x:number, y:number}
  private dx: number;
  private dy: number;
  private notes;
  private draggedOverlayElement: Element;
  private draggedRootSVGElement: Element
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
  private scaleY: number
  private scaleX: number


  constructor(containerId: string){
    this.setContainerId(containerId)
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

    this.notes = document.querySelectorAll(".note, .notehead") //d3.select("#" + this.containerId).selectAll(".note, .notehead"); 
    this.draggedOverlayElement = null;
    this.notes.call(dragBehaviour);

      // Drag effects
    function dragStarted (): void {      
      this.draggedOverlayElement =  d3.event.sourceEvent.currentTarget
      this.draggedRootSVGElement = this.rootSVG.querySelector("#" + this.draggedOverlayElement.getAttribute("refId"))?.closest(".note")
      this.dragStartCoords = [d3.event.x, d3.event.y]//coordinates.transformToDOMMatrixCoordinates(d3.event.sourceEvent.clientX, d3.event.sourceEvent.clientY, document.getElementById(c._ROOTSVGID_))
      this.dx = 0; //this.dragStartCoords[0]
      this.dy = 0; //this.dragStartCoords[1]
    }
  }

  dragging(): void{
    if(this.draggedOverlayElement === null || this.draggedRootSVGElement === null) return
    this.dx = d3.event.x
    this.dy = d3.event.y
    var overlayCoords = coordinates.transformToDOMMatrixCoordinates(d3.event.sourceEvent.clientX, d3.event.sourceEvent.clientY, this.interactionOverlay)

    var diffY = Math.abs(this.dy - this.dragStartCoords[1])
    if(diffY > 15){
      this.wasDragged = true;
    }

    //snap while dragging
    this.m2m.defineNote(overlayCoords.x, overlayCoords.y, {})
    var newNote = [this.m2m.getNewNote().pname, this.m2m.getNewNote().oct]
    if(this.oldNote == undefined){
      this.oldNote = newNote
    }

    const relativeY = d3.event.y - this.dragStartCoords[1] //d3.event.y - this.dragStartCoords[1]
    const relativeX = 0//d3.event.x - this.dragStartCoords[0];

    //overlay and defscale have completely different viewbox dimensions
    var defScaleVBox = (this.rootSVG.querySelector(".definition-scale") as SVGSVGElement).viewBox.baseVal
    var overlayVBox = (this.interactionOverlay as SVGSVGElement).viewBox.baseVal
    this.scaleX = defScaleVBox.width/ overlayVBox.width
    this.scaleY = defScaleVBox.height/ overlayVBox.height
    
  
    var shiftY = 10
    shiftY = relativeY < 0 ? -shiftY : shiftY
    if(!this.oldNote.every((v, i) => v === newNote[i])){
      this.draggedOverlayElement.setAttribute('transform', 'translate(' + [relativeX, relativeY + shiftY] + ')')
      this.draggedRootSVGElement.setAttribute('transform', 'translate(' + [relativeX * this.scaleX, (relativeY + shiftY) * this.scaleY] + ')')
      this.oldNote = newNote
    }
  }

  dragEnded (): void {
    if(this.draggedOverlayElement === null || this.draggedRootSVGElement === null) return
    if(this.wasDragged){
      this.notes.on("drag", null);
      this.wasDragged = false;

      this.draggedOverlayElement.dispatchEvent(this.noteDraggedEvent)

      this.container.querySelector("#" + this.draggedRootSVGElement.id).classList.remove(this.deleteHandler.getDeleteFlag()) //remove flag to delete after dragging
      const action: EditorAction = {
        action: "drag",
        param: { elementId: this.draggedRootSVGElement.id,
          //x: this.dx,
          //y: this.dy
        }
      }
      this.editCallback(action).then(() => {

        var attr = this.elementAttrCallback(this.draggedRootSVGElement.id);
        var mm = new MeasureMatrix();
        //mm.populateFromSVG(svg)
        mm.populateFromMEI(this.currentMEI)
        var staff = this.currentMEI.getElementById(this.draggedRootSVGElement.id).closest("staff")
        var measure = staff.closest("measure")
        var staffIdx = parseInt(staff.getAttribute("n")) - 1
        var measureIdx = parseInt(measure.getAttribute("n")) - 1
        var dur = this.currentMEI.getElementById(this.draggedRootSVGElement.id).closest("chord") !== null ? this.currentMEI.getElementById(this.draggedRootSVGElement.id).closest("chord").getAttribute("dur") : attr.dur
        
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

  setContainerId(id: string) {
    this.containerId = id
    this.container = document.getElementById(id)
    this.interactionOverlay = cq.getInteractOverlay(id)
    this.rootSVG = cq.getRootSVG(id)
    return this
  }
}

export default NoteDragHandler;

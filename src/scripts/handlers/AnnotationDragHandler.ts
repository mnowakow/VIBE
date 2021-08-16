import * as d3 from 'd3';
import MusicPlayer from '../MusicPlayer';
import Handler from './Handler';
import { Mouse2MEI } from '../utils/Mouse2MEI';
import { constants as c } from '../constants'
import { Annotation, NoteBBox } from '../utils/Types';

//@ts-ignore
//const $ = H5P.jQuery;

/**
 * Class that handles insert mode, events, and actions.
 */
class AnnotationDragHandler implements Handler{
  private dragStartCoords: Array<number>;
  private dx: number;
  private dy: number;
  private annotations;
  private lines;
  private customShapes;
  private draggedAnnot: SVGSVGElement;
  private draggedLine: SVGRectElement;
  private draggedShape: SVGElement;
  private attachedLine: SVGLineElement;
  private dragAnnotBehaviour; 
  private dragLineBehaviour; 
  private dragShapeBehaviour;
  musicPlayer: MusicPlayer;
  m2m?: Mouse2MEI;

  private snapToObjCallback: (attachedLine: SVGLineElement) => void
  private highlightObjectCallback: (lineDragRect: SVGRectElement) => Element
  private updateCallback: () => void

  constructor(){
    this.initDragRects()
    this.initAnnots()
    //this.initCustomShapes()
  }

  setListeners() {
    if(typeof this.customShapes !== "undefined"){
      this.customShapes.call(this.dragShapeBehaviour)
    }
    
    if(typeof this.annotations !== "undefined"){
      this.annotations.call(this.dragAnnotBehaviour);
      this.lines.call(this.dragLineBehaviour);
    }
    
    return this
  }

  removeListeners(){

    if(typeof this.customShapes !== "undefined"){
      this.customShapes.on(".drag", null);
    }
    
    if(typeof this.annotations !== "undefined"){
      this.annotations.on(".drag", null);
      this.lines.on(".drag", null);
    }

    return this
  }

  resetListeners(){
    this.removeListeners()
    this.setListeners()
  }

  dragStarted (): void {        
    this.draggedAnnot = d3.event.sourceEvent.currentTarget;
    this.draggedLine = d3.event.sourceEvent.currentTarget;
    this.draggedShape = d3.event.sourceEvent.currentTarget;

    try{
      this.attachedLine = this.draggedAnnot.closest("g").getElementsByTagName("line")[0]
    }catch{
      this.attachedLine = undefined
    }
    this.dragStartCoords = [d3.event.x, d3.event.y];
    this.dx = this.dragStartCoords[0]
    this.dy = this.dragStartCoords[1]
  }


  ////////// ANNOTS //////////

  initAnnots(){
    this.dragAnnotBehaviour = d3.drag()
      .on('start', this.dragStarted.bind(this))
      .on('drag', this.draggingAnnot.bind(this))
      .on('end', this.dragAnnotEnded.bind(this));

    this.annotations = d3.selectAll(".annotText"); 
    this.dragStartCoords = new Array(this.annotations.size());
    this.draggedAnnot = null;
    this.resetListeners()
  }

  draggingAnnot(): void{
    this.dx = d3.event.x
    this.dy = d3.event.y

    this.draggedAnnot.setAttribute("x", (this.dx).toString())
    this.draggedAnnot.setAttribute("y", (this.dy).toString())

    this.attachedLine.setAttribute("x1", this.draggedAnnot.getAttribute("x"))
    this.attachedLine.setAttribute("y1", this.draggedAnnot.getAttribute("y"))
  }

  dragAnnotEnded (): void {
    
  }


  //////////// LINE ////////////////////

  initDragRects(){
    this.dragLineBehaviour = d3.drag()
      .on('start', this.dragStarted.bind(this))
      .on('drag', this.draggingLine.bind(this))
      .on('end', this.dragLineEnded.bind(this));

    this.lines = d3.selectAll(".lineDragRect")
    this.dragStartCoords = new Array(this.lines.size());
    this.draggedLine = null;
    this.resetListeners()
  }

  draggingLine(){
    this.dx = d3.event.x
    this.dy = d3.event.y

    this.draggedLine.setAttribute("x", (this.dx).toString())
    this.draggedLine.setAttribute("y", (this.dy).toString())

    this.attachedLine.setAttribute("x2", this.draggedLine.getAttribute("x"))
    this.attachedLine.setAttribute("y2", this.draggedLine.getAttribute("y"))
    this.highlightObjectCallback(this.draggedLine)
  }

  dragLineEnded(){
    this.snapToObjCallback(this.attachedLine)
  }

  //////////// CALLBACKS ////////////
  setSnapToObjCallback(snapToObj: (attachedLine: SVGLineElement) => void){
    this.snapToObjCallback = snapToObj
    return this
  }

  removeUpdateAnnotationIDsCallback(){
    this.snapToObjCallback = undefined
    return this
  }

  sethighlightObjectCallback(highlightObjectCallback: (lineDragRect: SVGRectElement) => Element){
    this.highlightObjectCallback = highlightObjectCallback
  }

  setUpdateCallback(updateCallback: () => void){
    this.updateCallback = updateCallback
  }
}

export default AnnotationDragHandler

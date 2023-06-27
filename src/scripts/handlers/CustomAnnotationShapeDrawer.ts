import * as d3 from 'd3';
import Handler from "./Handler";
import MusicPlayer from "../MusicPlayer";
import { Mouse2SVG } from "../utils/Mouse2SVG";
import {uuidv4} from '../utils/random'
import { constants as c } from "../constants"
import * as coordinates from "../utils/coordinates"
import * as cq from "../utils/convenienceQueries"
import { textSpanIntersectsWithTextSpan } from 'typescript';

class CustomAnnotationShapeDrawer implements Handler{
    m2s?: Mouse2SVG;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    private canvas;
    private initialX: number;
    private initialY: number;
    private dragBehaviour
    private dragged: boolean
    private shapeID: string
    private shape: HTMLElement
    private shapes: Array<HTMLElement>

    private containerId: string
    private container: Element
    private interactionOverlay: Element
    private vrvSVG: Element

    private updateCallback: () => void

    constructor(containerId){
        this.setContainerId(containerId)
        this.shapes = new Array()
        this.shapeID = ""
        this.dragged = false
        this.canvas = d3.select("#"+this.containerId+ " #interactionOverlay"); // draw directly in svg
        this.dragBehaviour = d3.drag()
            .on('start', drawStart)
            .on('drag', this.drawing.bind(this))
            .on('end', this.drawEnd.bind(this))

        var that = this;
        function drawStart(){
            var pt = coordinates.transformToDOMMatrixCoordinates(d3.event.sourceEvent.clientX, d3.event.sourceEvent.clientY, that.interactionOverlay)
            that.initialX = pt.x //d3.event.x
            that.initialY = pt.y //d3.event.y
            if(d3.event.sourceEvent.srcElement.id === that.interactionOverlay.id){
                that.initRect(that.initialX, that.initialY)
                //that.initCircle(that.initialX, that.initialY)
            }
        }
        this.setListeners()
    }

    drawing(){
        var pt = coordinates.transformToDOMMatrixCoordinates(d3.event.sourceEvent.clientX, d3.event.sourceEvent.clientY, this.interactionOverlay)
        const curX = pt.x //d3.event.x
        const curY = pt.y //d3.event.y

        if(this.shape == undefined){return}
        
        if(Math.abs(curX - this.initialX) > 20 || Math.abs(curY - this.initialY) > 20){
            this.dragged = true
            const newX = curX < this.initialX ? curX : this.initialX;
            const newY = curY < this.initialY ? curY : this.initialY;
            const width = curX < this.initialX ? this.initialX - curX : curX - this.initialX;
            const height = curY < this.initialY ? this.initialY - curY : curY - this.initialY;
    
            this.updateRect(newX, newY, width, height);
            //this.updateCircle(newX, newY, width, height);
        }   
    }

    drawEnd(){
        if(this.shapeID === "") return
        if(!this.dragged){
            var elToRemove = this.interactionOverlay.querySelector("#" + this.shapeID)
            if(elToRemove !== null){elToRemove.remove()}
        }else{
            var annotCanvas = this.interactionOverlay.querySelector("#annotationCanvas")
            var pt = coordinates.getDOMMatrixCoordinates(this.shape, annotCanvas)
            this.interactionOverlay.querySelector("#annotationCanvas").appendChild(this.shape)
            this.shape.setAttribute("x", pt.left.toString())
            this.shape.setAttribute("y", pt.top.toString())
            this.shape.setAttribute("width", pt.width.toString())
            this.shape.setAttribute("height", pt.height.toString())

            this.shapes.push(this.shape.cloneNode(true) as HTMLElement)
        }
       
        this.shape = undefined
        this.updateCallback()
    }


    initRect (ulx: number, uly: number): void {
        this.shapeID = uuidv4()
        this.canvas.append('rect')
            .attr('x', ulx)
            .attr('y', uly)
            .attr('width', 0)
            .attr('height', 0)
            .attr("class", "customAnnotShape")
            .attr("id", this.shapeID)
        this.shape = document.getElementById(this.shapeID)
    }

    initCircle (cx: number, cy: number): void {
        this.shapeID = uuidv4()
        this.canvas.append('ellipse')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('rx', 0)
            .attr('ry', 0)
            .attr("class", "customAnnotShape")
            .attr("id", this.shapeID)
        this.shape = document.getElementById(this.shapeID)
    }

    updateRect (newX: number, newY: number, currentWidth: number, currentHeight: number): void {
        this.shape.setAttribute('x', newX.toString())
        this.shape.setAttribute('y', newY.toString())
        this.shape.setAttribute('width', currentWidth.toString())
        this.shape.setAttribute('height', currentHeight.toString())
    }

    updateCircle (newX: number, newY: number, currentWidth: number, currentHeight: number): void {
        this.shape.setAttribute('cx', newX.toString())
        this.shape.setAttribute('cy', newY.toString())
        this.shape.setAttribute('rx', currentWidth.toString())
        this.shape.setAttribute('ry', currentHeight.toString())
    }

    removeListeners(): void{
        d3.select("#"+this.containerId+ " #interactionOverlay").on('mousedown.drag', null)
    }

    setListeners():void{
        this.canvas.call(this.dragBehaviour);
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners()
    }



    ///////// GETTER/ SETTER ////////

    setm2s(m2s: Mouse2SVG){
        this.m2s = m2s
    }

    setContainerId(id: string){
        this.containerId = id
        this.container = document.getElementById(id)
        this.interactionOverlay = cq.getInteractOverlay(id)
        this.vrvSVG = cq.getVrvSVG(id)
    }

    getShapes(): Array<HTMLElement>{
        return this.shapes
    }


    //////////// CALLBACKS /////////////
    setUpdateCallback(updateCallback: () => void){
        this.updateCallback = updateCallback
    }

}

export default CustomAnnotationShapeDrawer
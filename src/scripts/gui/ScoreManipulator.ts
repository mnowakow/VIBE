import {constants as c} from '../constants';
import * as meiOperation from '../utils/MEIOperations'
import * as cq from "../utils/convenienceQueries"

const manipFlag = "manipulator"

/**
 * Class for all manipulators (Buttons, Lists, etc) directly visible in the score
 */
class ScoreManipulator{

    private lastBline: Element
    private mei: Document
    private staffManipulatorX: number
    private staffManipilatorY: number
    private containerId: string
    private container: Element
    private vrvSVG: SVGSVGElement
    private interactionOverlay: Element

    constructor(){
        
    }

    /**
     * 
     * @param id Id for Elment
     * @param classNames 
     * @param sign Plus or Minus sign
     * @param posX 
     * @param posY 
     * @param size 
     * @param targetParent Parent to attach element to 
     * @param refId 
     * @returns 
     */
    drawButton(id: string = null, classNames: string = null, sign: string, posX: number, posY: number, size: number, targetParent: Element, refId: string){
        
        var newSVG = document.createElementNS(c._SVGNS_, "svg")
        if(id !== null) newSVG.setAttribute("id", id)
        if(Array.from(this.interactionOverlay.querySelectorAll("maniplationCanvas *")).some(el => el.id === id)){return}
        
        newSVG.classList.add(manipFlag)
        newSVG.setAttribute("x", posX.toString())
        newSVG.setAttribute("y", posY.toString())
        newSVG.setAttribute("height", size.toString())
        newSVG.setAttribute("width", size.toString())

        if(classNames !== null){
            var cn = classNames.split(" ")
            cn.forEach(c => {
                newSVG.classList.add(c)
            })
        }

        var circle = document.createElementNS(c._SVGNS_, "circle")
        circle.setAttribute("id", "manipulationButton")
        circle.setAttribute("cx", "50%")
        circle.setAttribute("cy", "50%")
        circle.setAttribute("r", "40%")
        newSVG.append(circle)

        if(sign === "-" || sign === "+"){
            var horizonal = document.createElementNS(c._SVGNS_, "line")
            horizonal.classList.add("signElement")
            horizonal.setAttribute("x1", "20%")
            horizonal.setAttribute("y1", "50%")
            horizonal.setAttribute("x2", "80%")
            horizonal.setAttribute("y2", "50%")
            newSVG.append(horizonal)
        }

        if(sign === "+"){
            var vertical = horizonal.cloneNode(true) as Element
            vertical.setAttribute("transform", "rotate(90)")
            vertical.setAttribute("transform-origin", "center")
            newSVG.append(vertical)
        }

        newSVG.setAttribute("refId", refId)
        this.interactionOverlay.querySelector("#manipulatorCanvas")?.appendChild(newSVG)
    }

    drawMeasureAdder(){
        this.lastBline = Array.from(this.vrvSVG.querySelectorAll(".barLine")).reverse()[0].querySelector("path") 
        var lastBlineRect = this.lastBline.getBoundingClientRect()
        var rootBBox = this.vrvSVG.getBoundingClientRect()

        var blineTop = lastBlineRect.top - rootBBox.y
        //var blineRight = lastBlineRect.right + rootBBox.height*0.001 - rootBBox.x
        var blineRight = lastBlineRect.right - rootBBox.x

        var containerSize = lastBlineRect.height * 0.4

        this.drawButton("measureAdder", null, "+", blineRight, blineTop, containerSize, this.lastBline.closest("svg").parentElement, "Add Measure")
    }

    drawMeasureRemover(){
        this.lastBline = Array.from(document.getElementById(this.containerId)?.querySelectorAll(".barLine")).reverse()[0].querySelector("path") 
        var lastBlineRect = this.lastBline.getBoundingClientRect()
        var lastBlineRect = this.lastBline.getBoundingClientRect()
        var rootBBox = this.vrvSVG.getBoundingClientRect()

        var blineTop = lastBlineRect.top - rootBBox.y + lastBlineRect.height / 2
        var blineRight = lastBlineRect.right - rootBBox.x  

        var containerSize = lastBlineRect.height * 0.4

        this.drawButton("measureRemover", null, "-", blineRight, blineTop, containerSize, this.lastBline.closest("svg").parentElement, "Remove Measure")
    }

    drawStaffManipulators(){
        this.vrvSVG.querySelector(".measure").querySelectorAll(".staff").forEach(s => {
            var rootBBox = this.vrvSVG.getBoundingClientRect()

            var refStaffCoords = this.getStaffManipulatorCoords(s)
            var refStaffX = refStaffCoords.x
            var refStaffYTop = refStaffCoords.yTop
            var refStaffYBottom = refStaffCoords.yBottom
            var refStaffWidth = refStaffCoords.width
            var refStaffHeight = refStaffCoords.height


            var posX = refStaffX - refStaffWidth * 0.5 - rootBBox.x
            var topY = refStaffYTop - refStaffHeight * 0.2 - rootBBox.y

            var containerSize = refStaffHeight / 4 
            this.drawButton(null, "addStaff above", "+", posX, topY, containerSize, this.vrvSVG, s.id)
            if(parseInt(s.getAttribute("n")) > 1){
                posX = refStaffX - rootBBox.x
                this.drawButton(null, "removeStaff above", "-", posX, topY, containerSize, this.vrvSVG, s.id)
            }

            posX = refStaffX - refStaffWidth * 0.5 - rootBBox.x
            var bottomY = refStaffYBottom - rootBBox.y

            var containerSize = (refStaffHeight / 4)
            this.drawButton(null, "addStaff below", "+", posX, bottomY, containerSize, this.vrvSVG, s.id)
            var staffCount =  s.parentElement.querySelectorAll(".staff")
            if(parseInt(s.getAttribute("n")) !== staffCount.length){
                posX = refStaffX - rootBBox.x
                this.drawButton(null, "removeStaff below", "-", posX, bottomY, containerSize, this.vrvSVG, s.id)
            }
        })
    }

    /**
     * Get Coords for staf manipulators, since some browsers (Firefox) have problems with bounding boxes
     * @param referenceStaff Staff beside which the staff manipulator should be placed
     * @returns 
     */
    getStaffManipulatorCoords(referenceStaff: Element){
        var x: number
        var yTop: number
        var yBottom: number
        var bbox: DOMRect
        var width: number
        var height: number
        if(navigator.userAgent.toLowerCase().indexOf("firefox") != -1){
            bbox = referenceStaff.querySelector(".staffLine").getBoundingClientRect()
            x = bbox.left
            yTop = bbox.top
            yBottom = Array.from(referenceStaff.querySelectorAll(".staffLine")).reverse()[0].getBoundingClientRect().bottom
        }else{
            bbox = referenceStaff.querySelector(".clef").getBoundingClientRect()
            x = bbox.left
            yTop = bbox.top
            yBottom =  bbox.bottom
        }
        height = referenceStaff.querySelector(".clef").getBoundingClientRect().height
        width = referenceStaff.querySelector(".clef").getBoundingClientRect().width

        return{x: x, yTop: yTop, yBottom: yBottom, width: width, height: height}
    }

    setMEI(mei: Document){
        this.mei = mei
        return this
    }

    setContainerId(id: string){
        this.containerId = id
        this.container = document.getElementById(id)
        this.interactionOverlay = cq.getInteractOverlay(this.containerId)
        this.vrvSVG = cq.getVrvSVG(this.containerId) as unknown as SVGSVGElement
        return this
    }
}

export default ScoreManipulator
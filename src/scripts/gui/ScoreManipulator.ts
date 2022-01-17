import { stackOffsetNone } from 'd3';
import { parse } from 'path';
import {constants as c} from '../constants';
import * as meiOperation from '../utils/MEIOperations'

const manipFlag = "manipulator"

/**
 * Class for all manipulators (Buttons, Lists, etc) directly visible in the score
 */
class ScoreManipulator{

    private lastBline: HTMLElement
    private mei: Document
    private staffManipulatorX: number
    private staffManipilatorY: number

    constructor(){
        
    }

    drawButton(id: string = null, classNames: string = null, sign: string, posX: number, posY: number, size: number, targetParent: Element, refId: string, tooltip = null){
        

        size = targetParent.getBoundingClientRect().height * 0.01
        var newSVG = document.createElementNS(c._SVGNS_, "svg")
        //newSVG.setAttribute("viewBox", [posX.toString(), posY.toString(), size.toString(), size.toString()].join(" "))
        if(id !== null) newSVG.setAttribute("id", id)
        if(document.getElementById(newSVG.id)){return}
        
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

        if(tooltip !== null){
            var foreign = document.createElementNS(c._SVGNS_, "foreignObject")
            var body = document.createElement("body")
            foreign.append(body)
            tooltip = document.createElement("span")
            tooltip.classList.add("tooltiptext")
            tooltip.textContent = "Delete measure"

            body.append(tooltip)
            newSVG.append(foreign)
        }

        newSVG.setAttribute("refId", refId)
        document.getElementById("manipulatorCanvas")?.appendChild(newSVG)
    }

    drawMeasureAdder(){
        this.lastBline = Array.from(document.querySelectorAll(".barLine")).reverse()[0] as HTMLElement
        var lastBlineRect = this.lastBline.getBoundingClientRect()
        var root = document.getElementById(c._ROOTSVGID_) as HTMLElement
        var rootBBox = root.getBoundingClientRect()

        var rootMatrix = (root as unknown as SVGGraphicsElement).getScreenCTM().inverse()

        var ptRootLT = new DOMPoint(rootBBox.left, rootBBox.top)
        ptRootLT = ptRootLT.matrixTransform(rootMatrix)
        var ptRootRB = new DOMPoint(rootBBox.right, rootBBox.bottom)
        ptRootRB = ptRootRB.matrixTransform(rootMatrix)

        var ptRootWidth = Math.abs(ptRootRB.x - ptRootLT.x)
        var ptRootHeight= Math.abs(ptRootRB.y - ptRootLT.y)
        
        var ptBlineLT = new DOMPoint(lastBlineRect.left, lastBlineRect.top)
        ptBlineLT = ptBlineLT.matrixTransform(rootMatrix)
        var ptBlineRB = new DOMPoint(lastBlineRect.right, lastBlineRect.bottom)
        ptBlineRB = ptBlineRB.matrixTransform(rootMatrix)

        var ptBlineWidth = Math.abs(ptBlineRB.x - ptBlineLT.x)
        var ptBlineHeight= Math.abs(ptBlineRB.y - ptBlineLT.y)

        var blineTop = ptBlineLT.y //lastBlineRect.top - rootBBox.y - root.scrollTop
        var blineRight = ptBlineRB.x + ptRootHeight*0.007 //lastBlineRect.right + rootBBox.height*0.007 - rootBBox.x + root.scrollLeft

        var containerSize = ptBlineHeight * 0.1 //(lastBlineRect.height * 0.1)

        this.drawButton("measureAdder", null, "+", blineRight, blineTop, containerSize, this.lastBline.closest("svg").parentElement, "Add Measure")
    }

    drawMeasureRemover(){
        this.lastBline = Array.from(document.querySelectorAll(".barLine")).reverse()[0] as HTMLElement
        var lastBlineRect = this.lastBline.getBoundingClientRect()
        var root = document.getElementById(c._ROOTSVGID_)
        var rootBBox = root.getBoundingClientRect()

        var rootMatrix = (root as unknown as SVGGraphicsElement).getScreenCTM().inverse()

        var ptRootLT = new DOMPoint(rootBBox.left, rootBBox.top)
        ptRootLT = ptRootLT.matrixTransform(rootMatrix)
        var ptRootRB = new DOMPoint(rootBBox.right, rootBBox.bottom)
        ptRootRB = ptRootRB.matrixTransform(rootMatrix)

        var ptRootWidth = Math.abs(ptRootRB.x - ptRootLT.x)
        var ptRootHeight= Math.abs(ptRootRB.y - ptRootLT.y)
        
        var ptBlineLT = new DOMPoint(lastBlineRect.left, lastBlineRect.top)
        ptBlineLT = ptBlineLT.matrixTransform(rootMatrix)
        var ptBlineRB = new DOMPoint(lastBlineRect.right, lastBlineRect.bottom)
        ptBlineRB = ptBlineRB.matrixTransform(rootMatrix)

        var ptBlineWidth = Math.abs(ptBlineRB.x - ptBlineLT.x)
        var ptBlineHeight= Math.abs(ptBlineRB.y - ptBlineLT.y)

        // var blineTop = lastBlineRect.top + rootBBox.height*0.01 - rootBBox.y + root.scrollTop 
        // var blineRight = lastBlineRect.right + rootBBox.height*0.007 - rootBBox.x + root.scrollLeft 

        var blineTop = ptBlineLT.y + ptRootHeight * 0.01
        var blineRight = ptBlineRB.x + ptRootHeight*0.007

        var containerSize = ptBlineHeight * 0.1 //(lastBlineRect.height * 0.1)

        this.drawButton("measureRemover", null, "-", blineRight, blineTop, containerSize, this.lastBline.closest("svg").parentElement, "Remove Measure")
    }

    drawStaffManipulators(){
        document.querySelector(".measure").querySelectorAll(".staff").forEach(s => {
            //var clefBBox = s.querySelector(".clef").getBoundingClientRect()
            var rootSVG = document.getElementById(c._ROOTSVGID_)
            var rootBBox = rootSVG.getBoundingClientRect()

            var refStaffCoords = this.getStaffManipulatorCoords(s)
            var refStaffX = refStaffCoords.x
            var refStaffYTop = refStaffCoords.yTop
            var refStaffYBottom = refStaffCoords.yBottom
            var refStaffWidth = refStaffCoords.width
            var refStaffHeight = refStaffCoords.height

            var posX = refStaffX - rootBBox.x  //-  staffBBox.x
            var topY = refStaffYTop - rootBBox.height*0.01 - rootBBox.y //- staffBBox.y

            var containerSize = ((refStaffWidth) * 0.1)
            this.drawButton(null, "addStaff above", "+", posX, topY, containerSize, rootSVG, s.id, "Add Staff Above")
            if(parseInt(s.getAttribute("n")) > 1){
                posX = refStaffX + rootBBox.height*0.01 - rootBBox.x 
                this.drawButton(null, "removeStaff above", "-", posX, topY, containerSize, rootSVG, s.id, "Remove Staff Above")
            }

            posX = refStaffX - rootBBox.x //- staffBBox.x
            var bottomY = refStaffYBottom + 2 - rootBBox.y  //- staffBBox.y

            var containerSize = (refStaffHeight * 0.1)
            this.drawButton(null, "addStaff below", "+", posX, bottomY, containerSize, rootSVG, s.id, "Add Staff Below")
            var staffCount =  s.parentElement.querySelectorAll(".staff")
            if(parseInt(s.getAttribute("n")) !== staffCount.length){
                posX = refStaffX + rootBBox.height*0.01 - rootBBox.x 
                this.drawButton(null, "removeStaff below", "-", posX, bottomY, containerSize, rootSVG, s.id, "Remove Staff Below")
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
}

export default ScoreManipulator
import { stackOffsetNone } from 'd3';
import { parse } from 'path';
import { createClassExpression } from 'typescript';
import {constants as c} from '../constants';
import * as meiOperation from '../utils/MEIOperations'

const manipFlag = "manipulator"

class ScoreManipulator{

    private lastBline: Element
    private mei: Document
    constructor(){}

    drawButton(id: string = null, classNames: string = null, sign: string, posX: number, posY: number, size: number, targetParent: Element, tooltip = null){

        var newSVG = document.createElementNS(c._SVGNS_, "svg")
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

        targetParent.appendChild(newSVG)
    }

    drawMeasureAdder(){
        this.lastBline = Array.from(document.querySelectorAll(".barLineAttr")).reverse()[0]
        var lastBlineRect = this.lastBline.getBoundingClientRect()
        var rootBBox = document.getElementById(c._ROOTSVGID_).getBoundingClientRect()
        var blineMid = lastBlineRect.bottom - lastBlineRect.top - window.scrollY - rootBBox.y
        var blineRight = lastBlineRect.right + 5 - window.scrollX - rootBBox.x

        var containerSize = (lastBlineRect.height * 0.1)

        this.drawButton("measureAdder", null, "+", blineRight, blineMid, containerSize, this.lastBline.closest("svg").parentElement, "Add Measure")
    }

    drawMeasureRemover(){
        this.lastBline = Array.from(document.querySelectorAll(".barLineAttr")).reverse()[0]
        var lastBlineRect = this.lastBline.getBoundingClientRect()
        var rootBBox = document.getElementById(c._ROOTSVGID_).getBoundingClientRect()
        var blineMid = lastBlineRect.bottom - lastBlineRect.top + 40 - window.scrollY - rootBBox.y
        var blineRight = lastBlineRect.right + 5 - window.scrollX - rootBBox.x

        var containerSize = (lastBlineRect.height * 0.1)

        this.drawButton("measureRemover", null, "-", blineRight, blineMid, containerSize, this.lastBline.closest("svg").parentElement, "Remove Measure")
    }

    drawStaffManipulators(){
        document.querySelector(".measure").querySelectorAll(".staff").forEach(s => {
            var staffBBox = s.getBoundingClientRect()
            var rootBBox = document.getElementById(c._ROOTSVGID_).getBoundingClientRect()
            var posX = staffBBox.left + 10 - window.scrollX - rootBBox.x -  staffBBox.x
            var topY = staffBBox.top - 2 - window.scrollY - rootBBox.y - staffBBox.y

            var containerSize = staffBBox.width//((staffBBox.width*2) * 0.1)
            this.drawButton(null, "addStaff above", "+", posX, topY, containerSize, s, "Add Staff Above")
            if(parseInt(s.getAttribute("n")) > 1){
                posX = staffBBox.left + 30 - window.scrollX - rootBBox.x
                this.drawButton(null, "removeStaff above", "-", posX, topY, containerSize, s, "Remove Staff Above")
            }

            posX = staffBBox.left + 10 - window.scrollX - rootBBox.x - staffBBox.x
            var bottomY = staffBBox.bottom + 2 - window.scrollY - rootBBox.y - staffBBox.y

            var containerSize = (staffBBox.height * 0.1)
            this.drawButton(null, "addStaff below", "+", posX, topY, containerSize, s, "Add Staff Below")
            var staffCount =  s.parentElement.querySelectorAll(".staff")
            if(parseInt(s.getAttribute("n")) !== staffCount.length){
                posX = staffBBox.left + 30 - window.scrollX - rootBBox.x
                this.drawButton(null, "removeStaff below", "-", posX, bottomY, containerSize, s, "Remove Staff Below")
            }
        })
    }

    // drawStaffRemover(){
    //     this.lastBline = Array.from(document.querySelectorAll(".barLineAttr")).reverse()[0]
    //     var lastBlineRect = this.lastBline.getBoundingClientRect()
    //     var rootBBox = document.getElementById(c._ROOTSVGID_).getBoundingClientRect()
    //     var blineMid = lastBlineRect.bottom - lastBlineRect.top + 40 - window.scrollY - rootBBox.y
    //     var blineRight = lastBlineRect.right + 5 - window.scrollX - rootBBox.x

    //     var containerSize = (lastBlineRect.height * 0.1)

    //     this.drawButton("-", blineRight, blineMid, containerSize, this.lastBline.closest("svg").parentElement, "Remove Staff")
    // }


    setMEI(mei: Document){
        this.mei = mei
    }
}

export default ScoreManipulator
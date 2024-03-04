import { constants as c } from '../constants';
import { NoteBBox, StaffLineBBox, NewNote, Staff } from './Types';
import { uuidv4 } from './random';
import { idxNoteMapGClef, 
    idxNotePhantomMapBelowG, 
    idxNotePhantomMapAboveG,
    idxNoteMapGClefOctUp,
    idxNoteMapGClefOctDown,
    idxNotePhantomMapBelowGOctUp,
    idxNotePhantomMapAboveGOctDown,
    idxNoteMapFClef, 
    idxNotePhantomMapBelowF, 
    idxNotePhantomMapAboveF,
    idxNoteMapFClefOctUp,
    idxNoteMapFClefOctDown,
    idxNotePhantomMapBelowGOctDown,
    idxNotePhantomMapBelowFOctDown,
    idxNotePhantomMapAboveFOctUp,
    idxNotePhantomMapBelowFOctUp,
    idxNotePhantomMapAboveFOctDown,
    idxNoteMapCClefAlto, 
    idxNotePhantomMapBelowCAlto, 
    idxNotePhantomMapAboveCAlto, 
    idxNoteMapCClefSoprano, 
    idxNotePhantomMapBelowCSoprano, 
    idxNotePhantomMapAboveCSoprano, 
    idxNoteMapCClefMezzo, 
    idxNotePhantomMapBelowCMezzo, 
    idxNotePhantomMapAboveCMezzo, 
    idxNoteMapCClefTenor, 
    idxNotePhantomMapBelowCTenor, 
    idxNotePhantomMapAboveCTenor, 
    idxNoteMapCClefBariton, 
    idxNotePhantomMapBelowCBariton, 
    idxNotePhantomMapAboveCBariton, 
    keysigToNotes, 
    accidButtonToAttr, 
    clefToLine,
    idxNotePhantomMapAboveGOctUp,
    articButtonToAttr} from './mappings';
import MeasureMatrix from '../datastructures/MeasureMatrix'
import * as meiOperation from "./MEIOperations"
import * as coordinates from "./coordinates"
import * as cq from "./convenienceQueries"

export class Mouse2SVG {

    private noteBBoxes: Array<NoteBBox>;
    private staffLineBBoxes: Array<StaffLineBBox>;
    private phantomStaffLinesAbove: Array<{ y: number }>;
    private phantomStaffLinesBelow: Array<{ y: number }>;
    private currentMEI: Document
    private lastSystemMouseEnter: Element = null;
    private lastStaffMouseEnter: Element = null;
    private lastMeasureMouseEnter: Element = null;
    private lastLayerMouseEnter: Element = null;
    private measureMatrix: MeasureMatrix;
    private containerId: string
    private vrvSVG: Element
    private interactionOverlay: Element
    private container: Element

    public newNote: NewNote;
    private noteNewDur: string = "4"
    private noteNewDots: string
    private notePname: string

    private newNoteY: number;
    private phantomLines: Array<number>
    private lineDist: number

    updateOverlayCallback: () => void

    constructor() {
        this.noteBBoxes = new Array();
        this.staffLineBBoxes = new Array();

        this.measureMatrix = new MeasureMatrix();
        //this.setMouseEnterElementListeners();
        //this.findBBoxes();
    }


    /**
     * Set Flags for current focused measure, staff, system and layer when mouse moves.
     * @returns 
     */
    setMouseEnterElementListeners() {
        var that = this;
        var mouseEventName = "mouseover"
        var enteredFlag = "lastEntered"
        var activeContainerFlag = "activeContainer"
        this.container.addEventListener("mouseenter", function (e) {
            Array.from(document.getElementsByClassName("vibe-container")).forEach(ac => {
                if (ac === that.container) {
                    if (!that.container.classList.contains(activeContainerFlag)) {
                        that.container.classList.add(activeContainerFlag)
                    }
                } else {
                    ac.classList.remove(activeContainerFlag)
                }
            })
        })
        this.container.addEventListener("mouseleave", function (e) {
            Array.from(document.getElementsByClassName("vibe-container")).forEach(ac => {
                if (ac === that.container) {
                    ac.classList.remove(activeContainerFlag)
                } 
            })
        })

        this.interactionOverlay.querySelectorAll(".system").forEach(sy => {
            sy.addEventListener(mouseEventName, function (e) {
                e.preventDefault()
                var target = e.target as HTMLElement
                that.lastSystemMouseEnter = target.closest(".system")
                if (!that.lastSystemMouseEnter.classList.contains(enteredFlag)) {
                    cq.getInteractOverlay(that.containerId).querySelectorAll(".system").forEach(s => {
                        s.classList.remove(enteredFlag)
                    })
                    that.lastSystemMouseEnter.classList.add(enteredFlag)
                }
            })
        })

        this.interactionOverlay.querySelectorAll(".staff").forEach(staff => {
            staff.addEventListener(mouseEventName, function (e) {
                e.preventDefault()
                var target = e.target as HTMLElement
                that.lastStaffMouseEnter = target.closest(".staff")
                that.lastStaffMouseEnter?.dispatchEvent(new Event("currStaffChanged"))
                if (!that.lastStaffMouseEnter.classList.contains(enteredFlag)) {
                    cq.getInteractOverlay(that.containerId).querySelectorAll(".staff").forEach(s => {
                        s.classList.remove(enteredFlag)
                        that.getElementinVrvSVG(s.getAttribute("refId")).classList.remove(enteredFlag)
                    })
                    that.container.querySelectorAll(".onChord").forEach(oc => oc.classList.remove("onChord")) // reset onChord, so that only chords in the same staff are set
                    that.lastStaffMouseEnter.classList.add(enteredFlag)
                    that.getElementinVrvSVG(that.lastStaffMouseEnter.getAttribute("refId")).classList.add(enteredFlag)
                }
            })
        });

        this.interactionOverlay.querySelectorAll(".measure").forEach(measure => {
            measure.addEventListener(mouseEventName, function (e) {
                e.preventDefault()
                var target = e.target as HTMLElement
                that.lastMeasureMouseEnter = target.closest(".measure")
                if (!that.lastMeasureMouseEnter.classList.contains(enteredFlag)) {
                    cq.getInteractOverlay(that.containerId).querySelectorAll(".measure").forEach(m => {
                        m.classList.remove(enteredFlag)
                    })
                    that.lastMeasureMouseEnter.classList.add(enteredFlag)
                    //that.vrvSVG.querySelector("#"+that.lastMeasureMouseEnter.id).classList.add(enteredFlag)
                }
            })
        });

        //this.interactionOverlay.querySelectorAll(".layer.activeLayer").forEach(layer => {
        this.container.querySelectorAll(".layer.activeLayer").forEach(layer => {
            layer.addEventListener(mouseEventName, function (e) {
                e.preventDefault()
                var target = e.target as HTMLElement
                that.lastLayerMouseEnter = target.closest(".layer")
                if (!that.lastLayerMouseEnter.classList.contains(enteredFlag)) {
                    cq.getInteractOverlay(that.containerId).querySelectorAll(".layer").forEach(l => {
                        l.classList.remove(enteredFlag)
                    })
                    that.lastLayerMouseEnter.classList.add(enteredFlag)
                }
                console.log(that.lastLayerMouseEnter)
            })
        });

        return this
    }

    setMouseEnterElements(refElement: Element): void {
        this.lastSystemMouseEnter = this.getElementInInteractOverlay(refElement.closest(".system")?.id)
        this.lastMeasureMouseEnter = this.getElementInInteractOverlay(refElement.closest(".measure")?.id) || this.getElementInInteractOverlay(refElement.querySelector(".measure")?.id)
        this.lastStaffMouseEnter = this.getElementInInteractOverlay(refElement.closest(".staff")?.id) || this.getElementInInteractOverlay(refElement.querySelector(".staff")?.id)
        this.lastLayerMouseEnter = this.getElementInInteractOverlay(refElement.closest(".layer")?.id) || this.getElementInInteractOverlay(refElement.querySelector(".layer")?.id)

        //this.update()
    }

    getMouseEnterElementByName(name: string): Element {
        let e: Element;
        switch (name) {
            case "system":
                e = this.lastSystemMouseEnter;
                break;
            case "staff":
                e = this.lastStaffMouseEnter;
                break;
            case "measure":
                e = this.lastMeasureMouseEnter;
                break;
            case "layer":
                e = this.lastLayerMouseEnter;
                break;
            default:
                e = null;
        }

        return e
    }

    findBBoxes() {
        var notes = this.vrvSVG.querySelectorAll(".note, .rest, .mRest, .notehead");
        var root = this.vrvSVG
        Array.from(notes).forEach(element => {
            var interactionElement = this.interactionOverlay.querySelector("[refId=" + element.id + "]")
            if (interactionElement === null) return
            var relpt = coordinates.getDOMMatrixCoordinates(interactionElement, this.interactionOverlay)

            let bb: NoteBBox = {
                id: element.id,
                parentStaff: element.closest(".staff"),
                parentLayer: element.closest(".layer"),
                parentMeasure: element.closest(".measure"),
                x: relpt.right, //relpt.x,
                y: relpt.y
            }
            this.noteBBoxes.push(bb);
        })

        this.measureMatrix.populateFromMEI(this.currentMEI)
        var staves = this.currentMEI.querySelectorAll("staff") //cq.getVrvSVG(this.containerId).querySelectorAll(".staff")
        Array.from(staves).forEach(element => {
            const g = cq.getVrvSVG(this.containerId).querySelectorAll("#" + element.id + " > path")
            const staff = element;
            const idxStaff = parseInt(element.getAttribute("n")) - 1
            const closestMeasure = element.closest("measure");
            const idxParentMeasure = parseInt(closestMeasure.getAttribute("n")) - 1
            const clefShape = this.measureMatrix.get(idxParentMeasure, idxStaff).clef;
            const clefline = this.measureMatrix.get(idxParentMeasure, idxStaff).clefline
            const clefDisplacement = this.measureMatrix.get(idxParentMeasure, idxStaff).clefdisplacement
            Array.from(g).forEach((staffLine, idx) => {
                if (staffLine.id === "") {
                    staffLine.id = uuidv4()
                }
                staffLine.classList.add("staffLine");
                staffLine.classList.add("Clef" + clefShape + clefline + clefDisplacement)
                var map = null;
                switch (clefShape) {
                    case "G":
                        switch(clefDisplacement){
                            case "8below":
                                map = idxNoteMapGClefOctDown;
                                break;
                            case "8above":
                                map = idxNoteMapGClefOctUp;
                                break;
                            case null:
                                map = idxNoteMapGClef;
                                break;
                        }
                        break;
                    case "F":
                        switch(clefDisplacement){
                            case "8below":
                                map = idxNoteMapFClefOctDown;
                                break;
                            case "8above":
                                map = idxNoteMapFClefOctUp;
                                break;
                            case null:
                                map = idxNoteMapFClef;
                                break;
                        }
                        break;
                    case "C":
                        switch(clefline){
                            case "1":
                                map = idxNoteMapCClefSoprano
                                break;
                            case "2":
                                map = idxNoteMapCClefMezzo
                                break;
                            case "3":
                                map = idxNoteMapCClefAlto
                                break;
                            case "4":
                                map = idxNoteMapCClefTenor
                                break;
                            case "5":
                                map = idxNoteMapCClefBariton
                                break;

                        }
                        break;
                    default:
                        console.error("No Clef found")
                        break;
                }
                staffLine.classList.add(map.get(idx * 2))
                staffLine.classList.add("Clef" + clefShape)
            
                var relpt = coordinates.getDOMMatrixCoordinates(staffLine, cq.getInteractOverlay(this.containerId))//this.vrvSVG)
                let bb: StaffLineBBox = {
                    id: staffLine.parentElement.id,
                    y: relpt.y, 
                    staffIdx: idx * 2,
                    classList: staffLine.classList
                }
                this.staffLineBBoxes.push(bb)

            })
        })
    }

    /**
     * Create Phantom Lines to detect clicks above and under the system
     */
    createPhantomLines(upperStaffBound: number, lowerStaffBound: number): void {
        this.phantomStaffLinesAbove = new Array();
        this.phantomStaffLinesBelow = new Array();
        var diffY = Math.abs(this.staffLineBBoxes[0].y - this.staffLineBBoxes[1].y)
        //Above System
        for (var i = 0; i < 9; i++) {
            if (i === 0) {
                this.phantomStaffLinesAbove.push({ y: this.staffLineBBoxes[upperStaffBound].y - diffY })
            } else {
                this.phantomStaffLinesAbove.push({ y: this.phantomStaffLinesAbove[i - 1].y - diffY })
            }
        }

        //Below System
        for (var i = 0; i < 12; i++) {
            if (i === 0) {
                this.phantomStaffLinesBelow.push({ y: this.staffLineBBoxes[lowerStaffBound].y + diffY })
            } else {
                this.phantomStaffLinesBelow.push({ y: this.phantomStaffLinesBelow[i - 1].y + diffY })
            }
        }

    }

    /**
     * Define New Note at coordinates
     * 1. Check if left of Note
     * 2. Check position between staves
     * 3. update
     * 
     * @param x client Coordinate
     * @param y client Coordinate
     */
    defineNote(x: number, y: number, options: { staffLineId?: string, targetChord?: Element }): void {

        let staffIsEmpty: Boolean = true
        let isLeftOfNote: Boolean
        //let isRightOfNote: Boolean
        let currentNearestNote: NoteBBox = null;
        let diffNote: number = null;
        let leftRightPos: string;

        let allIDs: Array<string> = Array.from(this.vrvSVG.querySelectorAll(".staff")).map(s => s.getAttribute("id"))
        if (this.lastStaffMouseEnter === null) { return }
        let staffIdx = allIDs.indexOf(this.lastStaffMouseEnter?.getAttribute("refId"))
        let upperStaffBound = staffIdx * 5 + 0;
        let lowerStaffBound = staffIdx * 5 + 4;

        let aboveSystem: boolean = (y < this.staffLineBBoxes[upperStaffBound]?.y) ? true : false;
        let belowSystem: boolean = (y > this.staffLineBBoxes[lowerStaffBound]?.y) ? true : false;
        let isInSystem: boolean = !aboveSystem && !belowSystem;

        //this will cause that the duration of the chord will not be applied on inserted note
        let isRestChord = false
        if (options.targetChord != undefined) {
            isRestChord = options.targetChord.classList.contains("rest")
        }
        options.targetChord = isRestChord ? undefined : options.targetChord

        this.getElementinVrvSVG(this.lastStaffMouseEnter?.getAttribute("refId"))?.querySelectorAll(".layer").forEach(l => {
            if (l.hasChildNodes()) {
                staffIsEmpty = false
            }
        })

        // var currentStaffClef: string
        // var entries = this.getElementinVrvSVG(this.lastStaffMouseEnter?.getAttribute("refId"))?.querySelector(".staffLine")?.classList?.entries()
        // if([null, undefined].some(n => entries == n)) return
        // for (const [key, value] of entries) {
        //     if (value.includes("Clef")) {
        //         currentStaffClef = value
        //         break;
        //     }
        // }
        const col = this.getElementinVrvSVG(this.lastStaffMouseEnter?.getAttribute("refId"))?.getAttribute("n")
        const row = this.getElementinVrvSVG(this.lastStaffMouseEnter?.getAttribute("refId"))?.closest(".measure").getAttribute("n")
        const currentStaff = this.measureMatrix.get(row, col)

        // Define relative position for click insert
        // position should also consider right border of bounding box. Position should be 
        if (!staffIsEmpty) {
            let nbb = []
            this.noteBBoxes.forEach(bb => {
                //console.log(bb.parentStaff.id === this.lastStaffMouseEnter?.getAttribute("refId"), Array.from(this.container.querySelectorAll(".activeLayer")).some(l => bb.parentLayer.id === l.id), Array.from(this.container.querySelectorAll(".activeLayer")), bb.parentLayer)
                if (bb.parentStaff.id === this.lastStaffMouseEnter?.getAttribute("refId") && Array.from(this.container.querySelectorAll(".activeLayer")).some(l => bb.parentLayer.id === l.id)){
                    nbb.push(bb)
                }
            });
            nbb.forEach(bb => {
                let zerocrossing = x - bb.x
                let tempDiff = Math.sqrt(Math.abs(x - bb.x) ** 2 + Math.abs(y - bb.y) ** 2)
                if ((diffNote === null || Math.abs(tempDiff) < Math.abs(diffNote))) {
                    diffNote = tempDiff;
                    currentNearestNote = bb;
                    isLeftOfNote = zerocrossing <= 0 ? true : false;
                }
            })
            leftRightPos = isLeftOfNote ? "left" : "right"
        }
        if (isRestChord) {
            leftRightPos = "left"
        }

        let currentNearestStaffLine: StaffLineBBox = null;
        let currentNearestLineIdx: number = null;
        let isOverStaff: Boolean;
        //let isUnderStaff: Boolean;
        let diffStaff: number = null;
        let pname: string;
        let oct: string;
        let noteDefinition: Array<string> = new Array();
        let nextPitchIdx: number;

        if (!isInSystem) { //Phantom Line Stuff
            this.phantomLines = new Array()
            let currentNearestY: number
            this.createPhantomLines(upperStaffBound, lowerStaffBound)
            let lineArr = aboveSystem ? this.phantomStaffLinesAbove : this.phantomStaffLinesBelow
            let aboveMap: Map<number, string>
            let belowMap: Map<number, string>
            // switch (currentStaffClef) {
            //     case "ClefG2":
            //         aboveMap = idxNotePhantomMapAboveG
            //         belowMap = idxNotePhantomMapBelowG
            //         break;
            //     case "ClefF4":
            //         aboveMap = idxNotePhantomMapAboveF
            //         belowMap = idxNotePhantomMapBelowF
            //         break;
            //     case "ClefC1":
            //         aboveMap = idxNotePhantomMapAboveCSoprano
            //         belowMap = idxNotePhantomMapBelowCSoprano
            //         break;
            //     case "ClefC2":
            //         aboveMap = idxNotePhantomMapAboveCMezzo
            //         belowMap = idxNotePhantomMapBelowCMezzo
            //         break;
            //     case "ClefC3":
            //         aboveMap = idxNotePhantomMapAboveCAlto
            //         belowMap = idxNotePhantomMapBelowCAlto
            //         break;
            //     case "ClefC4":
            //         aboveMap = idxNotePhantomMapAboveCTenor
            //         belowMap = idxNotePhantomMapBelowCTenor
            //         break;
            //     case "ClefC5":
            //         aboveMap = idxNotePhantomMapAboveCBariton
            //         belowMap = idxNotePhantomMapBelowCBariton
            //         break;
            //     default:
            //         console.log("NO CLEF FOUND")

            // }

            if(currentStaff.clef === "G"){
                switch(currentStaff.clefdisplacement){
                    case null:
                        aboveMap = idxNotePhantomMapAboveG
                        belowMap = idxNotePhantomMapBelowG
                        break;
                    case "8above":
                        aboveMap = idxNotePhantomMapAboveGOctUp
                        belowMap = idxNotePhantomMapBelowGOctUp
                        break;
                    case "8below":
                        aboveMap = idxNotePhantomMapAboveGOctDown
                        belowMap = idxNotePhantomMapBelowGOctDown
                        break;
                }
            }else if(currentStaff.clef === "F"){
                switch(currentStaff.clefdisplacement){
                    case null:
                        aboveMap = idxNotePhantomMapAboveF
                        belowMap = idxNotePhantomMapBelowF
                        break;
                    case "8above":
                        aboveMap = idxNotePhantomMapAboveFOctUp
                        belowMap = idxNotePhantomMapBelowFOctUp
                        break;
                    case "8below":
                        aboveMap = idxNotePhantomMapAboveFOctDown
                        belowMap = idxNotePhantomMapBelowFOctDown
                        break;
                }
            }else if(currentStaff.clef === "C"){
                switch(currentStaff.clefline){
                    case "1":
                        aboveMap = idxNotePhantomMapAboveCSoprano
                        belowMap = idxNotePhantomMapBelowCSoprano
                        break;
                    case "2":
                        aboveMap = idxNotePhantomMapAboveCMezzo
                        belowMap = idxNotePhantomMapBelowCMezzo
                        break;
                    case "3":
                        aboveMap = idxNotePhantomMapAboveCAlto
                        belowMap = idxNotePhantomMapBelowCAlto
                        break;
                    case "4":
                        aboveMap = idxNotePhantomMapAboveCTenor
                        belowMap = idxNotePhantomMapBelowCTenor
                        break;
                    case "5":
                        aboveMap = idxNotePhantomMapAboveCBariton
                        belowMap = idxNotePhantomMapBelowCBariton
                        break;
                }
            }
            let map = aboveSystem ? aboveMap : belowMap;
            let mappingidx = 0
            lineArr.forEach((line, idx) => {
                let tempDiff = y - line.y
                mappingidx++
                if (diffStaff === null || Math.abs(tempDiff) < Math.abs(diffStaff)) {
                    this.phantomLines.push(line.y)
                    //if(idx%2 !== 0){return} // take only Elements which are actually lines! (every second one)
                    currentNearestY = line.y
                    diffStaff = tempDiff
                    currentNearestLineIdx = idx + mappingidx
                    isOverStaff = tempDiff <= 0 ? true : false;
                }
            })

            // prepare center coordinate (Y) for snapping
            let lineDist = Math.abs(lineArr[0].y - lineArr[1].y)
            this.lineDist = lineDist / 2
            lineDist = isOverStaff ? -lineDist : lineDist
            if (Math.abs(currentNearestY - y) < Math.abs(lineDist / 2 + currentNearestY - y)) { // line pos < middleline pos
                this.newNoteY = currentNearestY
                nextPitchIdx = currentNearestLineIdx
            } else {
                if (aboveSystem) {
                    nextPitchIdx = isOverStaff ? currentNearestLineIdx + 1 : currentNearestLineIdx - 1
                } else {
                    nextPitchIdx = isOverStaff ? currentNearestLineIdx - 1 : currentNearestLineIdx + 1
                }
                this.newNoteY = currentNearestY + lineDist / 2
            }

            if (map.get(nextPitchIdx) == undefined) { return } // cursor is outside of score

            pname = map.get(nextPitchIdx).charAt(0)
            oct = map.get(nextPitchIdx).charAt(1)

        } else {
            // Decide if Staffline is given or not
            this.phantomLines = undefined
            if (options.staffLineId == undefined) {
                let sbb = []
                this.staffLineBBoxes.forEach(bb => { if (bb.id === this.lastStaffMouseEnter?.getAttribute("refId")) sbb.push(bb) });
                sbb.forEach(bb => {
                    let tempDiff = y - bb.y
                    if (diffStaff === null || Math.abs(tempDiff) < Math.abs(diffStaff)) {
                        diffStaff = tempDiff;
                        currentNearestStaffLine = bb;
                        isOverStaff = tempDiff <= 0 ? true : false;
                        //isUnderStaff = tempDiff > 0 ? true : false;
                    }
                })

                // prepare center coordinate (Y) for snapping
                if (sbb[0] == undefined || sbb[1] == undefined) { return }
                let lineDist = Math.abs(sbb[0].y - sbb[1].y)
                this.lineDist = lineDist / 2
                lineDist = isOverStaff ? -lineDist : lineDist
                if (Math.abs(currentNearestStaffLine.y - y) < Math.abs(lineDist / 2 + currentNearestStaffLine.y - y)) { // line pos < middleline pos
                    this.newNoteY = currentNearestStaffLine.y // on line
                    nextPitchIdx = currentNearestStaffLine.staffIdx
                } else {
                    this.newNoteY = currentNearestStaffLine.y + lineDist / 2 // between lines
                    nextPitchIdx = isOverStaff ? currentNearestStaffLine.staffIdx - 1 : currentNearestStaffLine.staffIdx + 1
                }

                let map = null
                if (currentNearestStaffLine.classList.contains("ClefG")) { 
                    map = idxNoteMapGClef 
                    if (currentNearestStaffLine.classList.contains("ClefG28above")) { map = idxNoteMapGClefOctUp }
                    else if (currentNearestStaffLine.classList.contains("ClefG28below")) { map = idxNoteMapGClefOctDown }
                }

                else if (currentNearestStaffLine.classList.contains("ClefF")) { 
                    map = idxNoteMapFClef 
                    if (currentNearestStaffLine.classList.contains("ClefF48above")) { map = idxNoteMapFClefOctUp }
                    else if (currentNearestStaffLine.classList.contains("ClefF48below")) { map = idxNoteMapFClefOctDown }
                }
                else if(currentNearestStaffLine.classList.contains("ClefC")){
                    if (Array.from(currentNearestStaffLine.classList).some(c => c.includes("ClefC1"))) { map = idxNoteMapCClefSoprano }
                    else if (Array.from(currentNearestStaffLine.classList).some(c => c.includes("ClefC2"))) { map = idxNoteMapCClefMezzo }
                    else if (Array.from(currentNearestStaffLine.classList).some(c => c.includes("ClefC3"))) { map = idxNoteMapCClefAlto }
                    else if (Array.from(currentNearestStaffLine.classList).some(c => c.includes("ClefC4"))) { map = idxNoteMapCClefTenor }
                    else if (Array.from(currentNearestStaffLine.classList).some(c => c.includes("ClefC5"))) { map = idxNoteMapCClefBariton }
                }
                else { throw new Error("No Note to Clef Mapping found") }

                if (map.get(nextPitchIdx) == undefined) { return }

                pname = map.get(nextPitchIdx).charAt(0)
                oct = map.get(nextPitchIdx).charAt(1)

            } else {
                let pitch: string[]
                try {
                    pitch = cq.getInteractOverlay(this.containerId).querySelector("#" + options.staffLineId).getAttribute("class").split(" ")
                } catch {
                    return
                }
                let p: string[] = pitch.filter(function (obj) {
                    let isPname = obj.charAt(0) === obj.charAt(0).toLowerCase(); // noch regexe?
                    let isOct = !isNaN(parseInt(obj.charAt(1)));
                    let length = obj.length === 2;
                    return isPname && isOct && length
                })
                pname = p[0].charAt(0)
                oct = p[0].charAt(1)
                this.newNoteY = this.staffLineBBoxes.filter(function (bb) {
                    return bb.classList === cq.getInteractOverlay(this.containerId).querySelector("#" + options.staffLineId).classList
                })[0].y // assert that length is 1 (all classlists are unique for )
            }
        }

        //get relevant staffinfo
        //var closestStaff = this.currentMEI.getElementById(currentNearestNote.id).closest("staff")
        var closestStaff = this.currentMEI.getElementById(this.lastStaffMouseEnter?.getAttribute("refId"))
        var closestMeasure = closestStaff.closest("measure")
        var closestStaffIdx = parseInt(closestStaff.getAttribute("n")) - 1
        var closestMeasureIdx = parseInt(closestMeasure.getAttribute("n")) - 1
        var nearestNoteId = (currentNearestNote !== null) ? currentNearestNote.id : null
        if (nearestNoteId !== null) { // ensure note id to be in new note
            nearestNoteId = this.vrvSVG.querySelector("#" + nearestNoteId).classList.contains("notehead") ? this.vrvSVG.querySelector("#" + nearestNoteId).closest(".note").id : nearestNoteId
        }

        var keysig = this.measureMatrix.get(closestMeasureIdx, closestStaffIdx).keysig
        var accid
        if(this.container.querySelector(".alterBtn.selected") !== null){
            accid = accidButtonToAttr.get(this.container.querySelector(".alterBtn.selected").id)
        }else if (keysig != undefined) {
            accid = keysigToNotes.get(keysig)
            accid = accid.filter((s: string) => { return s === pname })
            if (accid.length === 1) {
                accid = keysig.charAt(1)
            }
        }

        var artic = articButtonToAttr.get(this.container.querySelector("#articGroup > .selected")?.id)

        var newNote: NewNote = {
            id: uuidv4(),
            pname: pname,
            dur: this.getDurationNewNote(),
            dots: this.getDotsNewNote(),
            oct: oct,
            keysig: keysig,
            accid: accid,
            artic: artic, 
            nearestNoteId: nearestNoteId,
            relPosX: leftRightPos,
            staffId: this.lastStaffMouseEnter?.getAttribute("refId"),
            layerId: this.container.querySelector(`#${this.lastStaffMouseEnter?.getAttribute("refId")} .activeLayer`)?.id,
            chordElement: options.targetChord,
            rest: this.container.querySelector("#pauseNote")?.classList.contains("selected")
        }
        this.newNote = newNote
    }

    /**
     * Find Score Element nearest to given Position (e.g. Mouse)
     * @param posX should be already transformed DOMPoint
     * @param posY should be already transformed DOMPoint
     * @param checkStaff check if vertical distance in the staff should be considered 
     * (for example: should be false, when check position for Annotations, should be true when placing notes in different staves)
     * @param orientation only consider elements which are left or right of given coordinates
     * @returns 
     */
    findScoreTarget(posX: number, posY: number, checkStaff = true, orientation: {left: boolean, right: boolean} = null, blackList: Array<string> = null): NoteBBox {

        if(!orientation) orientation = { left: true, right: true } 
        var notes: NoteBBox[] = this.getNoteBBoxes()
        var nextNote: NoteBBox
        var tempDist: number = Math.pow(10, 10)
        var i = 0
        notes.forEach(n => {
            if(blackList){
                var blackListFilter = Array.from(this.getElementinVrvSVG(n.id).classList).filter(element => blackList.includes(element))
                if(blackListFilter.length > 0) return 
            }
            var x: number
            var y: number
            if (this.getElementinVrvSVG(n.id)?.closest(".chord") && navigator.userAgent.toLowerCase().indexOf("firefox") > -1) { // special rule for firefox browsers
                x = this.getElementinVrvSVG(n.id)?.closest(".chord").getBoundingClientRect().x
                y = this.getElementinVrvSVG(n.id)?.closest(".chord").getBoundingClientRect().y
            } else {
                x = n.x
                y = n.y
            }

            //filter for left and right elements
            if(this.vrvSVG.querySelector("#" + n.id) === null) return
            if (!this.vrvSVG.querySelector("#" + n.id).classList.contains("mRest")) { //mRest are excluded from this rule
                if (!orientation.left) {
                    if (x < posX) return //exclude left elements
                } else if (!orientation.right ) {
                    if (x > posX) return // exclude right elements
                }
            }

            var dist = Math.abs(x - posX)
            var staffCondition = n.parentStaff === this.getElementinVrvSVG(this.lastStaffMouseEnter?.getAttribute("refId"))
            staffCondition &&= Array.from(this.container.querySelectorAll(".activeLayer")).some(l => n.parentLayer === l)
            if (!checkStaff) {
                staffCondition = true
                dist = Math.sqrt(Math.abs(x - posX) ** 2 + Math.abs(y - posY) ** 2)
            }
            if (dist < tempDist && staffCondition) { // define next note in staff bounds
                tempDist = dist
                nextNote = n
            }
            // var l = {x: x, posX: posX, dist: dist, tempDist: tempDist, nextNote: nextNote.id}
            // console.log(i, l)
            // i++
        })
        return nextNote
    }

    /**
     * change to current VOice to interact with.
     * createLayer if not does not exist
     * @param staffN 
     * @param voiceN 
     */
    changeLayer(staffN: string, voiceN: string){
        if(!this.currentMEI.querySelector(`staff[n='${staffN}'] layer[n='${voiceN}']`)){
            meiOperation.addLayerForStaff(this.currentMEI, staffN, voiceN)
        }
    }


    ///// GETTER/ SETTER ///////

    getLastMouseEnter(){
        return {layer: this.lastLayerMouseEnter,staff: this.lastStaffMouseEnter, measure: this.lastMeasureMouseEnter, system: this.lastSystemMouseEnter}
    }

    getNewNote(): NewNote {
        return this.newNote;
    }

    getNewNoteY(): number {
        return this.newNoteY
    }

    getPhantomLines(): Array<number> {
        return this.phantomLines
    }

    getNoteBBoxes(): Array<NoteBBox> {
        return this.noteBBoxes;
    }

    getStaffLineBBoxes(): Array<StaffLineBBox> {
        return this.staffLineBBoxes
    }

    setPnameNewNote(name: string) {
        this.notePname = name
    }

    setDurationNewNote(dur: number | string) {
        this.noteNewDur = dur.toString()
    }

    /**
     * Change note, chord or rest to given duration
     * @param dur 
     * @returns 
     */
    setMarkedNoteDurations(dur: number | string): Boolean {
        var retVal = false
        var markedElements = this.vrvSVG.querySelectorAll(".note.marked, .rest.marked")
        markedElements.forEach(m => {
            var currMeiClone = this.currentMEI.cloneNode(true) as Document
            var meiElement = this.currentMEI.getElementById(m.id)
            var oldMeiElement: Element = meiElement.cloneNode(true) as Element
            var newMeiElement: Element

            if (meiElement.closest("chord") !== null) {
                oldMeiElement = meiElement.closest("chord").cloneNode(true) as Element
                meiElement.closest("chord").setAttribute("dur", dur.toString())
                newMeiElement = meiElement.closest("chord")
            } else {
                oldMeiElement = meiElement.cloneNode(true) as Element
                meiElement.setAttribute("dur", dur.toString())
                newMeiElement = meiElement
            }

            oldMeiElement.replaceWith(newMeiElement)
            this.currentMEI = meiOperation.fillWithRests(newMeiElement, oldMeiElement, this.currentMEI)
            //if(this.currentMEI.querySelectorAll(".changed").length ===  0){
            var additionalElements = Array.from(newMeiElement.closest("layer").querySelectorAll("*[dur]"))
            additionalElements = additionalElements.filter((v, i) => i > additionalElements.indexOf(newMeiElement))
            //this.currentMEI = meiOperation.changeDuration(this.currentMEI, "reduce", additionalElements)
            //additionalElements.unshift(oldMeiElement) // we need this information to determine the new duration of an element that has to be shortened
            this.currentMEI = meiOperation.changeDurationsInLayer(this.currentMEI, additionalElements, newMeiElement) //this.currentMEI = meiOperation.changeDuration(this.currentMEI, additionalElements)
            //}
            this.currentMEI.querySelectorAll(".changed").forEach(c => c.classList.remove("changed"))

            //check if following events (notes, chords, rests) should be replaced 
            if (meiOperation.elementIsOverfilling(meiElement, currMeiClone)) {
                this.currentMEI = currMeiClone
            } else {
                retVal = true
            }
        })

        return retVal
    }

    /**
     * Change number of dots for note, chord or rest 
     * @param dots 
     * @returns 
     */
    setMarkedNoteDots(dots: number | string): Boolean {
        var retVal = false
        var markedElements = this.vrvSVG.querySelectorAll(".note.marked, .rest.marked")
        markedElements.forEach(m => {
            var currMeiClone = this.currentMEI.cloneNode(true) as Document
            var meiElement = this.currentMEI.getElementById(m.id)
            var oldMeiElement: Element = meiElement.cloneNode(true) as Element
            var newMeiElement: Element

            if (meiElement.closest("chord") !== null) {
                oldMeiElement = meiElement.closest("chord").cloneNode(true) as Element
                meiElement.closest("chord").setAttribute("dots", dots.toString())
                newMeiElement = meiElement.closest("chord")
            } else {
                oldMeiElement = meiElement.cloneNode(true) as Element
                meiElement.setAttribute("dots", dots.toString())
                newMeiElement = meiElement
            }

            oldMeiElement.replaceWith(newMeiElement)
            this.currentMEI = meiOperation.fillWithRests(newMeiElement, oldMeiElement, this.currentMEI)
            //if(this.currentMEI.querySelectorAll(".changed").length ===  0){
            var additionalElements = Array.from(newMeiElement.closest("layer").querySelectorAll("*[dur]"))
            additionalElements = additionalElements.filter((v, i) => i > additionalElements.indexOf(newMeiElement))
            //this.currentMEI = meiOperation.changeDuration(this.currentMEI, "reduce", additionalElements)
            //additionalElements.unshift(oldMeiElement) // we need this information to determine the new duration of an element that has to be shortened
            this.currentMEI = meiOperation.changeDurationsInLayer(this.currentMEI, additionalElements, newMeiElement, meiOperation.getAbsoluteRatio(newMeiElement) - meiOperation.getAbsoluteRatio(oldMeiElement)) //this.currentMEI = meiOperation.changeDuration(this.currentMEI, additionalElements)
            //}
            this.currentMEI.querySelectorAll(".changed").forEach(c => c.classList.remove("changed"))

            if (meiOperation.elementIsOverfilling(meiElement, currMeiClone)) {
                this.currentMEI = currMeiClone
            } else {
                retVal = true
            }
        })

        return retVal
    }

    getElementinVrvSVG(id: string): Element {
        if (id !== "" && id !== null) {
            return this.vrvSVG.querySelector("#" + id)
        }
        return
    }

    getElementInInteractOverlay(id: string): Element {
        if (id !== "" && id !== null) {
            return this.interactionOverlay.querySelector("#" + id)
        }
        return
    }

    setDotsNewNote(dots: number | string) {
        this.noteNewDots = dots.toString();
    }

    setCurrentMEI(xmlDoc: Document) {
        this.currentMEI = xmlDoc
        if (this.noteBBoxes?.length === 0) {
            this.findBBoxes()
        }
        return this
    }

    setContainerId(id: string) {
        this.containerId = id
        this.interactionOverlay = cq.getInteractOverlay(id)
        this.vrvSVG = cq.getVrvSVG(id)
        this.container = document.getElementById(id)
        return this
    }

    getCurrentMei(): Document {
        return this.currentMEI
    }

    getMeasureMatrix(): MeasureMatrix {
        return this.measureMatrix
    }

    getDurationNewNote(): string {
        var dur: number
        var selEl = this.container.querySelector("#noteGroup .selected")
        if (selEl === null) {
            return "4"
        }

        switch (selEl.id) {
            case "breveNote":
                dur = 0.5
                break;
            case "fullNote":
                dur = 1
                break;
            case "halfNote":
                dur = 2
                break;
            case "quarterNote":
                dur = 4
                break;
            case "eigthNote":
                dur = 8
                break;
            case "sixteenthNote":
                dur = 16
                break;
            case "thirtysecondNote":
                dur = 32
                break;
        }
        return dur.toString() //this.noteNewDur
    }

    getDotsNewNote(): string {
        var dots: string
        var selEl = this.container.querySelector("#dotGroup .selected")
        if (selEl === null) {
            return "0"
        }
        switch (selEl.id) {
            case "oneDot":
                dots = "1"
                break;
            case "twoDot":
                dots = "2"
                break;
        }

        return dots
    }

    getLineDist() {
        return this.lineDist
    }

    update() {
        this.noteBBoxes.length = 0;
        this.staffLineBBoxes.length = 0;
        //this.updateOverlayCallback()
        this.findBBoxes();
        this.setMouseEnterElementListeners();
        return this
    }

    setUpdateOverlayCallback(updateOverlayCallback: () => Promise<boolean>) {
        this.updateOverlayCallback = updateOverlayCallback
        return this
    }

}
import { constants as c } from '../constants';
import { NoteBBox, StaffLineBBox, NewNote, Staff } from './Types';
import { uuidv4 } from './random';
import {idxNoteMapGClef, idxNoteMapFClef, idxNotePhantomMapBelowG, idxNotePhantomMapAboveG, idxNotePhantomMapBelowF, idxNotePhantomMapAboveF,idxNotePhantomMapBelowC, idxNotePhantomMapAboveC, keysigToNotes, idxNoteMapCClef } from './mappings';
import MeasureMatrix from '../datastructures/MeasureMatrix'
import * as meiOperation from "../utils/MEIOperations"


//@ts-ignore
//const $ = H5P.jQuery;

export class Mouse2MEI{

    private noteBBoxes: Array<NoteBBox>;
    private staffLineBBoxes: Array<StaffLineBBox>;
    private phantomStaffLinesAbove: Array<{y: number}>;
    private phantomStaffLinesBelow: Array<{y: number}>;
    private currentMEI: Document
    private lastSystemMouseEnter: Element = null;
    private lastStaffMouseEnter: Element = null;
    private lastMeasureMouseEnter: Element = null;
    private lastLayerMouseEnter: Element = null;
    private measureMatrix: MeasureMatrix;
    
    public newNote: NewNote;
    private noteNewDur: string = "4"
    private noteNewDots: string
    private notePname: string

    private newNoteY: number;
    private phantomLines: Array<number>
    private lineDist: number

    constructor(){
        this.noteBBoxes = new Array();
        this.staffLineBBoxes = new Array();

        this.measureMatrix = new MeasureMatrix();
        this.setMouseEnterElementListeners();
        this.findBBoxes();
    }

    /*
    removeListeners(){
        var g: HTMLCollectionOf<SVGGElement> = $(c._ROOTSVGID_WITH_IDSELECTOR_) as HTMLCollectionOf<SVGGElement>;
            Array.from(g).forEach(element => {
                element

    }*/

   setMouseEnterElementListeners(): void{     
       var that = this;

        document.querySelectorAll(".system").forEach(sy => {
            sy.addEventListener("mouseenter", function(evt){
                var target = evt.target as HTMLElement
                that.lastSystemMouseEnter = target.closest(".system")
            })
        });

        document.querySelectorAll(".staff").forEach(staff => {
            staff.addEventListener("mouseenter", function(evt){
                var target = evt.target as HTMLElement
                that.lastStaffMouseEnter = target.closest(".staff")
            })
        });

        document.querySelectorAll(".measure").forEach(measure => {
            measure.addEventListener("mouseenter", function(evt){
                var target = evt.target as HTMLElement
                that.lastMeasureMouseEnter = target.closest(".measure")
            })
        });

        document.querySelectorAll(".layer").forEach(layer => {
            layer.addEventListener("mouseenter", function(evt){
                var target = evt.target as HTMLElement
                that.lastLayerMouseEnter = target.closest(".layer")
            })
        });

    }

    setMouseEnterElements(refElement: Element): void{
        this.lastSystemMouseEnter = refElement.closest(".system")
        this.lastMeasureMouseEnter = refElement.closest(".measure") || refElement.querySelector(".measure")
        this.lastStaffMouseEnter = refElement.closest(".staff") || refElement.querySelector(".staff")
        this.lastLayerMouseEnter = refElement.closest(".layer") || refElement.querySelector(".layer")
        
        this.update()
    }

    getMouseEnterElementByName(name: string): Element{
        let e: Element;
        switch(name){
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

    findBBoxes(){
        var notes = document.querySelectorAll(".note, .rest, .mRest") ;
        var root = document.getElementById(c._ROOTSVGID_)
        var rootBBox = root.getBoundingClientRect()
        Array.from(notes).forEach(element => {
            let bb: NoteBBox = {
                id: element.id,
                parentStaff: element.closest(".staff"),
                parentLayer: element.closest(".layer"),
                parentMeasure: element.closest(".measure"),
                x: element.getBoundingClientRect().x + window.pageXOffset,
                y: element.getBoundingClientRect().y + window.pageYOffset
            }
            this.noteBBoxes.push(bb);
        })


        this.measureMatrix.populateFromSVG(document.querySelector(c._ROOTSVGID_WITH_IDSELECTOR_));
        var staves = document.querySelectorAll(c._STAFF_WITH_CLASSSELECTOR_)
        Array.from(staves).forEach(element => {
            let g = document.querySelectorAll("#" + element.id + " > path")
            let staff = element;
            let idxStaff = parseInt(element.getAttribute("n")) - 1
            let closestMeasure = element.closest(".measure");
            let idxParentMeasure = parseInt(closestMeasure.getAttribute("n")) - 1
            let clefShape = this.measureMatrix.get(idxParentMeasure, idxStaff).clef;
            Array.from(g).forEach((staffLine, idx) => {
                staffLine.id = uuidv4();
                staffLine.classList.add("staffLine");
                staffLine.classList.add("Clef" + clefShape)       
                var map = null;
                switch(clefShape){
                    case "G":
                        map = idxNoteMapGClef;
                        break;
                    case "F":
                        map = idxNoteMapFClef
                        break;
                    case "C":
                        map = idxNoteMapCClef
                        break;
                    default:
                        console.error("No Clef found")
                        break;
                }
                staffLine.classList.add(map.get(idx*2))
                staffLine.classList.add("Clef" + clefShape)
                let bb: StaffLineBBox = {
                    id: staffLine.parentElement.id,
                    y: staffLine.getBoundingClientRect().y + window.pageYOffset,
                    staffIdx: idx*2,
                    classList: staffLine.classList
                }
                this.staffLineBBoxes.push(bb)
                
            })
        })

        //console.log(this.staffLineBBoxes)
    }

    /**
     * Create Phantom Lines to detect clicks above and under the system
     */
    createPhantomLines(upperStaffBound: number, lowerStaffBound: number): void{
        this.phantomStaffLinesAbove = new Array();
        this.phantomStaffLinesBelow = new Array();
        var diffY = Math.abs(this.staffLineBBoxes[0].y - this.staffLineBBoxes[1].y)
        //Above System
        for(var i=0; i<9; i++){
            if(i === 0){
                this.phantomStaffLinesAbove.push({y: this.staffLineBBoxes[upperStaffBound].y - diffY})     
            }else{
                this.phantomStaffLinesAbove.push({y: this.phantomStaffLinesAbove[i-1].y - diffY})
            }
        }

        //Below System
        for(var i=0; i<12; i++){
            if(i === 0){
                this.phantomStaffLinesBelow.push({y: this.staffLineBBoxes[lowerStaffBound].y + diffY})     
            }else{
                this.phantomStaffLinesBelow.push({y: this.phantomStaffLinesBelow[i-1].y + diffY})
            }
        }

    }

    /**
     * Define New Note at coordinates
     * 1. Check if left of Note
     * 2. Check position between staves
     * 3. update
     * 
     * @param x page Coordinate
     * @param y page Coordinate
     */
    defineNote(x: number, y: number, options: {staffLineId?: string, targetChord?: Element}): void{

        let staffIsEmpty: Boolean = true
        let isLeftOfNote: Boolean
        //let isRightOfNote: Boolean
        let currentNearestNote: NoteBBox = null;
        let diffNote: number = null;
        let leftRightPos: string;

        let allIDs: Array<string> = Array.from(document.querySelectorAll(".staff")).map(s => s.id)
        if(this.lastStaffMouseEnter === null){return}
        let staffIdx = allIDs.indexOf(this.lastStaffMouseEnter?.id)
        let upperStaffBound = staffIdx * 5 + 0;
        let lowerStaffBound = staffIdx * 5 + 4;

        let aboveSystem: boolean =  (y < this.staffLineBBoxes[upperStaffBound]?.y) ? true : false;
        let belowSystem: boolean = (y > this.staffLineBBoxes[lowerStaffBound]?.y) ? true: false;
        let isInSystem: boolean = !aboveSystem && !belowSystem;

        this.lastStaffMouseEnter.querySelectorAll(".layer").forEach(l => {
            if(l.hasChildNodes()){
                staffIsEmpty = false
            }
        })

        var currentStaffClef: string
        for(const [key, value] of this.lastStaffMouseEnter.querySelector(".staffLine").classList.entries()){
            if(value.indexOf("Clef") !== -1){
                currentStaffClef = value
                break;
            }
        }

        // Define relative position for click insert
        if(!staffIsEmpty){
            let nbb = []
            this.noteBBoxes.forEach(bb => {
                if(bb.parentStaff.id === this.lastStaffMouseEnter.id){
                    nbb.push(bb)
                }
            });
            nbb.forEach(bb => {
                let zerocrossing = x - bb.x 
                let tempDiff = Math.sqrt(Math.abs(x - bb.x)**2 + Math.abs(y-bb.y)**2)
                if(diffNote === null || Math.abs(tempDiff) < Math.abs(diffNote)){
                    diffNote = tempDiff;
                    currentNearestNote = bb;
                    isLeftOfNote = zerocrossing <= 0 ? true : false;
                    //isRightOfNote = tempDiff > 0 ? true : false;
                }
            })
            leftRightPos = isLeftOfNote ? "left" : "right"
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

        if(!isInSystem){ //Phantom Line Stuff
            this.phantomLines = new Array()
            let currentNearestY: number
            this.createPhantomLines(upperStaffBound, lowerStaffBound)
            let lineArr = aboveSystem? this.phantomStaffLinesAbove : this.phantomStaffLinesBelow
            let aboveMap: Map<number, string>
            let belowMap: Map<number, string>
            switch(currentStaffClef){
                case "ClefG":
                    aboveMap = idxNotePhantomMapAboveG
                    belowMap = idxNotePhantomMapBelowG
                    break;
                case "ClefF":
                    aboveMap = idxNotePhantomMapAboveF
                    belowMap = idxNotePhantomMapBelowF
                    break;
                case "ClefC":
                    aboveMap = idxNotePhantomMapAboveF
                    belowMap = idxNotePhantomMapBelowF
                    break;
                default:
                    console.log("NO CLEF FOUND")
                    
            }
            let map = aboveSystem ? aboveMap : belowMap;
            let mappingidx = 0
            lineArr.forEach((line, idx) => {
                let tempDiff = y - line.y
                mappingidx++
                if(diffStaff === null || Math.abs(tempDiff) < Math.abs(diffStaff)){
                    this.phantomLines.push(line.y)
                    //if(idx%2 !== 0){return} // take only Elements which are actually lines! (every second one)
                    currentNearestY = line.y
                    diffStaff = tempDiff
                    currentNearestLineIdx = idx+mappingidx
                    isOverStaff = tempDiff <= 0 ? true : false;
                }
            })
        
            // prepare center coordinate (Y) for snapping
            let lineDist = Math.abs(lineArr[0].y - lineArr[1].y)
            this.lineDist = lineDist/2
            lineDist = isOverStaff ? -lineDist : lineDist
            if( Math.abs(currentNearestY - y) < Math.abs(lineDist/2 + currentNearestY - y)){ // line pos < middleline pos
                this.newNoteY = currentNearestY
                nextPitchIdx = currentNearestLineIdx
            }else{
                if(aboveSystem){
                    nextPitchIdx = isOverStaff ? currentNearestLineIdx + 1 : currentNearestLineIdx - 1 
                }else{
                    nextPitchIdx = isOverStaff ? currentNearestLineIdx - 1 : currentNearestLineIdx + 1 
                }
                this.newNoteY = currentNearestY + lineDist/2
            }

            if(typeof map.get(nextPitchIdx) === "undefined"){return} // cursor is outside of score
            
            pname = map.get(nextPitchIdx).charAt(0)
            oct = map.get(nextPitchIdx).charAt(1)
            
        }else{
            // Decide if Staffline is given or not
            this.phantomLines = undefined
            if(typeof options.staffLineId === "undefined"){
                let sbb = []
                this.staffLineBBoxes.forEach(bb => {if(bb.id === this.lastStaffMouseEnter.id) sbb.push(bb)});
                sbb.forEach(bb => {
                    let tempDiff = y - bb.y
                    if(diffStaff === null || Math.abs(tempDiff) < Math.abs(diffStaff)){
                        diffStaff = tempDiff;
                        currentNearestStaffLine= bb;
                        isOverStaff = tempDiff <= 0 ? true : false;
                        //isUnderStaff = tempDiff > 0 ? true : false;
                    }
                })
        
                // prepare center coordinate (Y) for snapping
                if(sbb[0] == undefined || sbb[1] == undefined){return}
                let lineDist = Math.abs(sbb[0].y - sbb[1].y)
                this.lineDist = lineDist/2
                lineDist = isOverStaff ? -lineDist : lineDist
                if( Math.abs(currentNearestStaffLine.y - y) < Math.abs(lineDist/2 + currentNearestStaffLine.y - y)){ // line pos < middleline pos
                    this.newNoteY = currentNearestStaffLine.y // on line
                    nextPitchIdx = currentNearestStaffLine.staffIdx
                }else{
                    this.newNoteY = currentNearestStaffLine.y + lineDist/2 // between lines
                    nextPitchIdx = isOverStaff ? currentNearestStaffLine.staffIdx - 1 : currentNearestStaffLine.staffIdx + 1
                }

                let map = null
                if(currentNearestStaffLine.classList.contains("ClefG")){map = idxNoteMapGClef} 
                else if(currentNearestStaffLine.classList.contains("ClefF")){map = idxNoteMapFClef}
                else if(currentNearestStaffLine.classList.contains("ClefC")){map = idxNoteMapCClef}
                else{throw new Error("No Note to Clef Mapping found")}
                
                pname = map.get(nextPitchIdx).charAt(0)
                oct = map.get(nextPitchIdx).charAt(1)
                
            }else{
                let pitch: string[] = document.getElementById(options.staffLineId).getAttribute("class").split(" ")
                let p: string[] = pitch.filter(function(obj){
                    let isPname = obj.charAt(0) === obj.charAt(0).toLowerCase(); // noch regexe?
                    let isOct = !isNaN(parseInt(obj.charAt(1)));
                    let length = obj.length === 2;
                    return isPname && isOct && length
                })
                pname = p[0].charAt(0)
                oct = p[0].charAt(1)
                this.newNoteY = this.staffLineBBoxes.filter(function(bb){
                    return bb.classList === document.getElementById(options.staffLineId).classList
                })[0].y // assert that length is 1 (all classlists are unique for )
            }
        }

        //get relevant staffinfo
        //var closestStaff = this.currentMEI.getElementById(currentNearestNote.id).closest("staff")
        var closestStaff = this.currentMEI.getElementById(this.lastStaffMouseEnter.id)
        var closestMeasure = closestStaff.closest("measure")
        var closestStaffIdx = parseInt(closestStaff.getAttribute("n")) - 1
        var closestMeasureIdx = parseInt(closestMeasure.getAttribute("n")) - 1
        var nearestNoteId = (currentNearestNote !== null) ? currentNearestNote.id : null

        var keysig = this.measureMatrix.get(closestMeasureIdx, closestStaffIdx).keysig
        var accid
        if(typeof keysig !== "undefined"){
            accid = keysigToNotes.get(keysig)
            accid = accid.filter((s:string) => {return s === pname})
            if(accid.length === 1){
                accid = keysig.charAt(1)
            }
        }
        
        var newNote: NewNote = {
            id: uuidv4(),
            pname: pname,
            dur: this.noteNewDur,
            dots: this.noteNewDots,
            oct: oct,
            keysig: keysig,
            accid: accid,
            nearestNoteId: nearestNoteId,
            relPosX: leftRightPos,
            staffId: this.lastStaffMouseEnter.id,
            chordElement: options.targetChord,
            rest: document.getElementById("pauseNote").classList.contains("selected")
        }
        
        this.newNote = newNote
    }

    /**
     * Find Score Element nearest to given Position (e.g. Mouse)
     * @param posx 
     * @param posy 
     * @returns 
     */
     findScoreTarget(posx: number, posy: number): NoteBBox{
        var notes = this.getNoteBBoxes()
        var nextNote: NoteBBox
        var tempDist: number = Math.pow(10, 10)
        var rootBBox = document.getElementById(c._ROOTSVGID_).getBoundingClientRect()
        notes.forEach(n => {
            var x: number
            var y: number
            if(document.getElementById(n.id).closest(".chord") && navigator.userAgent.toLowerCase().indexOf("firefox") > -1){ // special rule for firefox browsers
                x = document.getElementById(n.id).closest(".chord").getBoundingClientRect().x
                y = document.getElementById(n.id).closest(".chord").getBoundingClientRect().y
            }else{
                x = n.x
                y = n.y
            }
            var dist = Math.sqrt(Math.abs(x - rootBBox.x - window.pageXOffset - posx)**2 + Math.abs(y - rootBBox.y - window.pageYOffset - posy)**2)
            if(dist < tempDist){
                tempDist = dist
                nextNote = n
            }
        })
        return nextNote
    }

    

    ///// GETTER/ SETTER ///////

    getNewNote(): NewNote{
        return this.newNote;
    }

    getNewNoteY():number {
        return this.newNoteY
    }

    getPhantomLines(): Array<number>{
        return this.phantomLines
    }

    getNoteBBoxes(): Array<NoteBBox>{
        return this.noteBBoxes;
    }

    getStaffLineBBoxes(): Array<StaffLineBBox>{
        return this.staffLineBBoxes
    }

    setPnameNewNote(name: string){
        this.notePname = name
    }

    setDurationNewNote(dur: number | string){
        this.noteNewDur = dur.toString()
    }

    setMarkedNoteDurations(dur: number | string): Boolean{
        var retVal = false
        var markedElements =  document.querySelectorAll(".note.marked, .rest.marked")
        markedElements.forEach(m => {
            var meiElement = this.currentMEI.getElementById(m.id)
            meiElement.setAttribute("dur", dur.toString())
            if(meiElement.closest("chord") !== null){
                meiElement.closest("chord").setAttribute("dur", dur.toString())
            }
            retVal = true
        })
        // let isReplace = true
        // let inserToggleBtn = document.getElementById("insertToggle")
        // if(inserToggleBtn){
        //     isReplace = inserToggleBtn.nextElementSibling.textContent === "Replace"
        // }
        // if(isReplace && markedElements.length === 1 && reduce){
        //     let meiElement = this.currentMEI.getElementById(markedElements[0].id)
        //     let ms = Array.from(meiElement.closest("layer").querySelectorAll("note:not(chord note), chord, rest, mRest")) as Element[]
        //     let measureSiblings = ms.filter((v, i) => i > ms.indexOf(meiElement))
        //     meiOperation.changeDuration(this.currentMEI, "reduce", measureSiblings, meiElement)
        // }else{
        //     // Do something with prolong
        // }

        return retVal
    }

    setMarkedNoteDots(dots: number | string): Boolean{
        var retVal = false
        var markedElements =  document.querySelectorAll(".note.marked, .rest.marked")
        markedElements.forEach(m => {
            var meiElement = this.currentMEI.getElementById(m.id)
            meiElement.setAttribute("dots", dots.toString())
            if(meiElement.closest("chord") !== null){
                meiElement.closest("chord").setAttribute("dots", dots.toString())
            }
            retVal = true
        })

        return retVal
    }

    setDotsNewNote(dots: number | string){
        this.noteNewDots = dots.toString();
    }

    setCurrentMEI(xmlDoc: Document){
        this.currentMEI = xmlDoc
    }

    getCurrentMei(): Document{ 
        return this.currentMEI
    }

    getMeasureMatrix(): MeasureMatrix{
        return this.measureMatrix
    }

    getDurationNewNote(): string{
        return this.noteNewDur
    }

    getDotsNewNote(): string{
        return this.noteNewDots
    }

    getLineDist(){
        return this.lineDist
    }

    update(){
        this.noteBBoxes.length = 0;
        this.staffLineBBoxes.length = 0;
        this.setMouseEnterElementListeners();
        this.findBBoxes();
    }
}
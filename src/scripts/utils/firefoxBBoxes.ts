import * as coordinates from "./coordinates"
const allowedClasses = ["chord", "note", "notehead", "staff", "rest", "mRest", "clef", "meterSig", "keySig", "stem"]

/**
 * Compute new bounding box coordinates for relevant elements. And attach new translate function to element
 * @param element can be either element in #vrvSVG .definition-scale or #interactionOverlay #scoreRects
 * @returns 
 */
export function adjustBBox(element: Element): void{
    var elClass: string
    if(!allowedClasses.some(ac => {
        if(element.classList.contains(ac)){
            elClass = ac
            return true
        }
    })){
        return
    }
    //target = element in #scoreRects
    var target: HTMLElement
    //source = element in #vrvSVG
    var source: HTMLElement
    if(element.getAttribute("refId") === null){
        target = document.querySelector("[refId=" + element.id + "]")?.querySelector("rect") as unknown as HTMLElement
        source = element as HTMLElement
    }else{
        target = element.querySelector("rect") as unknown as HTMLElement
        source = document.getElementById(element.getAttribute("refId"))
    }
    if(source === null || target === null){
        throw new Error("Referenced Element is null. BBox can't be computed for" + element.toString())
    }

    switch(elClass){
        case "clef":
        case "keySig":
            simpleTranslate(source, target)
            break;
        case "mRest":
            simpleTranslate(source, target)
            halfWidth(target)
            break;
        case "rest":
            simpleTranslate(source, target)
            adjustHightToLowestStaffLine(source, target)
            halfWidth(target)
            break;
        case "meterSig":
            simpleTranslate(source, target)
            adjustHightToLowestStaffLine(source, target)
            break;
        case "staff":
            adjustHightToLowestStaffLine(source, target)
            adjustWidthToBarLine(source, target)
            break;
        case "note":
            translateNotehead(source, target)
            adjustToBetweenStemNoteheadBounds(source, target)
            break;
        case "chord":
            simpleTranslate(source, target)
            adjustToBetweenStemNoteheadBounds(source, target)
            break;
        case "stem":
            nullifyBBox(target)
            break;
    }
}

function simpleTranslate(source: HTMLElement, target: HTMLElement): void{
    var useElement = source.querySelector("use") || source.querySelector("rect")
    var translateY = - parseFloat(useElement.getAttribute("y"))
    var translateX = - parseFloat(useElement.getAttribute("x"))
    target.setAttribute("transform", "translate(" + translateX.toString() +  "," + translateY.toString()+ ")")
}

function adjustHightToLowestStaffLine(source: HTMLElement, target: HTMLElement): void{
    var closestStaff: HTMLElement
    if(source.classList.contains("staff")){
        closestStaff = source
    }else{
        closestStaff = source.closest(".staff")
    }

    var lowestStaffLine = Array.from(closestStaff.querySelectorAll(":scope > path")).reverse()[0]
    var coordsStaffline = coordinates.getDOMMatrixCoordinates(lowestStaffLine, source.closest("#vrvSVG"))
    var coordsTarget = coordinates.getDOMMatrixCoordinates(target, target.closest("#interactionOverlay"))
    var targetHeight = coordsStaffline.y - coordsTarget.y
    target.setAttribute("height", targetHeight.toString())
}

function adjustWidthToBarLine(source: HTMLElement, target: HTMLElement): void{
    var closestMeasure = source.closest(".measure")
    var barline = closestMeasure.querySelector(".barLine")
    var coordsBarline = coordinates.getDOMMatrixCoordinates(barline, source.closest("#vrvSVG"))
    var coordsTarget = coordinates.getDOMMatrixCoordinates(target, target.closest("#interactionOverlay"))
    var targetWidth = coordsBarline.x - coordsTarget.x
    target.setAttribute("width", targetWidth.toString())
}

function translateNotehead(source: HTMLElement, target: HTMLElement): void{
    var noteHeadSource = source.querySelector(".notehead") as HTMLElement
    var noteHeadTarget = target.closest("#interactionOverlay").querySelector("[refId=" + noteHeadSource.id  + "]") as HTMLElement
    simpleTranslate(noteHeadSource, noteHeadTarget)
}

function adjustToBetweenStemNoteheadBounds(source: HTMLElement, target:HTMLElement): void{
    if(source.classList.contains("chord")){
        var noteHeadSource = Array.from(source.querySelectorAll(".notehead")).reverse()[0]
    }else{
        noteHeadSource = source.querySelector(".notehead") as HTMLElement
    }
    var noteHeadTarget = target.closest("#interactionOverlay").querySelector("[refId=" + noteHeadSource.id  + "]") as HTMLElement
    var coordsNoteHead = coordinates.getDOMMatrixCoordinates(noteHeadTarget, target.closest("#interactionOverlay"))

    var upperBoundSource = source.querySelector(".stem") as HTMLElement 
        || source.closest(".chord")?.querySelector(".stem") 
        || source.closest(".chord")?.querySelector(".notehead")
        || source.querySelector(".notehead")
    var upperBoundTarget = target.closest("#interactionOverlay").querySelector("[refId=" + upperBoundSource.id  + "]") as HTMLElement
    var coordsUpperBound = coordinates.getDOMMatrixCoordinates(upperBoundTarget, target.closest("#interactionOverlay"))

    var targetWidth: number
    targetWidth = parseFloat(target.closest("#interactionOverlay").querySelector(".barLine rect").getAttribute("width")) * 2 // very crude heuristic
    
    noteHeadTarget.querySelector("rect").setAttribute("width", targetWidth.toString())
    target.setAttribute("width", targetWidth.toString())
    target.setAttribute("x", coordsNoteHead.x.toString())
    target.setAttribute("y", coordsUpperBound.y.toString())

    var noteHeadHeight: number 
    noteHeadHeight = parseFloat(target.closest("#interactionOverlay").querySelector(".barLine rect").getAttribute("width")) * 2 // very crude heuristic
    noteHeadTarget.querySelector("rect").setAttribute("height", noteHeadHeight.toString())
    coordsNoteHead = coordinates.getDOMMatrixCoordinates(noteHeadTarget, target.closest("#interactionOverlay"))
    
    if(source.querySelector(".stem") !== null){
        adjustHightToLowestStaffLine(source, target)
    }
}

function nullifyBBox(target: HTMLElement): void{
    target.setAttribute("width", "1")
    target.setAttribute("height", "1")
}

function halfWidth(target: HTMLElement): void{
    var w = parseFloat(target.getAttribute("width")) / 2
    target.setAttribute("width", w.toString())
}

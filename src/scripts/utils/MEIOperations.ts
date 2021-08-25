import * as meiConverter from './MEIConverter'
import { uuidv4 } from './random'
import { constants as c} from '../constants'
import { NewChord, NewNote } from './Types'
import { keysigToNotes, nextStepUp, nextStepDown } from './mappings'
import MeiTemplate from '../assets/mei_template'
import { xml } from 'd3'

const countableNoteUnitSelector: string =  
":scope > note:not([grace])," +
":scope > chord," +
":scope > beam > chord," +
":scope > beam > note:not([grace])," +
":scope > rest"

//@ts-ignore
//const $ = H5P.jQuery

////// DELETE //////
export function removeFromMEI(notes: Array<Element>, currentMEI: Document): Promise<Document> {
  return new Promise<Document>((resolve): void => {

    notes.forEach(note => {
      if(currentMEI.getElementById(note.id) !== null){
        //do not remove completely, replace with rest
        //currentMEI.getElementById(note.id).remove()
        if(!note.classList.contains("rest")){
          replaceWithRest(note, currentMEI)
        }else{
          currentMEI.getElementById(note.id).remove() // possibility to remove rests entirely
        }
      }
    })
    //removeEmptyElements(currentMEI)
    // For now: No Shifts (22.07.2021)
    // if($(".measure").length > 1){
    //   checkDeleteShifts(currentMEI);
    // }
    cleanUp(currentMEI)
    //fillWithRests(currentMEI)
  
    // Warum ist das ein Problem?
    currentMEI = meiConverter.restoreXmlIdTags(currentMEI)
    resolve(currentMEI)
  })
}

function checkDeleteShifts(xmlDoc: Document): void {
  var meterRatio = getMeterRatioGlobal(xmlDoc)
  var shifters: Array<Element> = new Array;
  var elements = xmlDoc.getElementsByTagName("layer");
  Array.from(elements).forEach(layer => {
    var actualMeterFill = getAbsoluteRatio(layer);
    var layerLevel = layer.getAttribute("n");
    var staffLevel = layer.closest("staff").getAttribute("n")
    var nextSibling = layer.closest("measure").nextElementSibling
    if(actualMeterFill<meterRatio && nextSibling !== null){
      let hasStaff = nextSibling.querySelector("staff[n$='"+ staffLevel +"'") !== null ? true : false
      let hasLayer = nextSibling.querySelector("layer[n$='"+ layerLevel +"'") !== null ? true : false
      if(hasStaff && hasLayer){
        nextSibling = nextSibling.querySelector("staff[n$='"+ staffLevel +"'").querySelector("layer[n$='"+ layerLevel +"'")
        Array.from(nextSibling.querySelectorAll(countableNoteUnitSelector)).forEach(node => {
          if(actualMeterFill<meterRatio){
            shifters.push(node)
          }
          actualMeterFill += 1/parseInt(node.getAttribute("dur"))
        })
      }
    }
    if(shifters.length > 0){
      doShiftLeft(shifters, meterRatio)
      shifters.length = 0;
      checkDeleteShifts(xmlDoc)
    }
  })
}

function getMeterRatioGlobal(xmlDoc: Document): number{
  var staffDef: Element = xmlDoc.getElementsByTagName("staffDef").item(0)
  var meterRatio: number = null
  //Do I know the meter?
  if(staffDef.getAttribute(c._METERCOUNT_) !== null && staffDef.getAttribute(c._METERUNIT_) !== null){
    meterRatio = parseInt(staffDef.getAttribute(c._METERCOUNT_)) / parseInt(staffDef.getAttribute(c._METERUNIT_))
  }else{
    meterRatio = extrapolateMeter(xmlDoc)
  }

  return meterRatio
}

//////// INSERT ////////// 
  /**
 * Update Mei according to action}
 * @param newNote Information where to put new Note
 * @param mei 
 */
export function addToMEI(newElement: NewNote | NewChord, currentMEI: Document): Document{//Promise<Document> {
  //return new Promise<Document>((resolve): void => {
    var newElem: Element
    if(newElement.hasOwnProperty("pname")){
      var newNote = newElement as NewNote
      if(newNote.rest){
        newElem = currentMEI.createElement("rest")
      }else{
        newElem = currentMEI.createElement("note");
        newElem.setAttribute("pname", newNote.pname);
        newElem.setAttribute("oct", newNote.oct);
        if(typeof newNote.accid !== "undefined"){
          newElem.setAttribute("accid.ges", newNote.accid)
        }
      }
      newElem.setAttribute("dur", newNote.dur);

      if(typeof newNote.dots !== "undefined"){
        newElem.setAttribute("dots", newNote.dots)
      }
      if(typeof newNote.id !== "undefined" && newNote.id !== null){
        newElem.setAttribute("id", newNote.id)
      }

      //Do sthm with chords
      if(typeof newNote.chordElement !== "undefined" && !newNote.rest){
        var chord: Element
        var meiChordEl = currentMEI.getElementById(newNote.chordElement.id)
        if(newNote.chordElement.classList.contains("chord")){
          chord = meiChordEl
          chord.appendChild(newElem)
        }else{
          chord = document.createElement("chord")
          chord.setAttribute("id", uuidv4())
          chord.setAttribute("dur", meiChordEl.getAttribute("dur"));
            if(meiChordEl.getAttribute("dots") !== null){
              chord.setAttribute("dots", meiChordEl.getAttribute("dots"))
            }
          chord.appendChild(newElem)
          meiChordEl.parentElement.insertBefore(chord, meiChordEl)
          chord.appendChild(meiChordEl)
        }

        chord.childNodes.forEach((n: Element) => {
          n.removeAttribute("dur")
          n.removeAttribute("dots")
        });
        
      }else if(newNote.nearestNoteId !== null){
        var sibling: HTMLElement = currentMEI.getElementById(newNote.nearestNoteId);
        var parentLayer = sibling.closest("layer")
        var trueParent = sibling.parentElement
        var isTrueSibling = parentLayer == trueParent
        var trueSibling: HTMLElement = sibling;
        if(!isTrueSibling){
            var currParent: HTMLElement = trueParent;
            while(!isTrueSibling){
              isTrueSibling = (trueSibling.tagName === "note" && trueSibling.closest("chord") === null) || trueSibling.closest("chord") === trueSibling //parentLayer == currParent.parentElement 
              if(!isTrueSibling){
                trueSibling = currParent;
                currParent = currParent.parentElement;
              }
            }
        }
        if(newNote.relPosX === "left"){
          trueSibling.parentElement.insertBefore(newElem, trueSibling)
        }else{
          trueSibling.parentElement.insertBefore(newElem, trueSibling.nextSibling)
        }
      
        // For now: No Shifts (22.07.2021)
        // if($(".measure").length > 1){
        //   checkInsertShifts(currentMEI);
        // }

      }else{
        currentMEI.getElementById(newNote.staffId).querySelector("layer").appendChild(newElem)
      }
    }else{ // is newChord
      //TODO
      var newChord = newElement as NewChord
      newElem = convertToElement(newChord, currentMEI)
      if(newChord.relPosX === "left"){
        currentMEI.getElementById(newChord.nearestNoteId).parentElement.insertBefore(newElem, currentMEI.getElementById(newChord.nearestNoteId))
      }else{
        currentMEI.getElementById(newChord.nearestNoteId).parentElement.insertBefore(newElem, currentMEI.getElementById(newChord.nearestNoteId).nextSibling)
      }
    }

    cleanUp(currentMEI)
    // Warum ist das ein Problem?
    currentMEI = meiConverter.restoreXmlIdTags(currentMEI)
    return currentMEI
    //resolve(currentMEI)
  //})
}


  /**
   * Check if notes have to be shifted after insertion
   * @param xmlDoc 
   */
function checkInsertShifts(xmlDoc: Document) {
  var staffDef: Element = xmlDoc.getElementsByTagName("staffDef").item(0)
  var meterRatio: number = parseInt(staffDef.getAttribute(c._METERCOUNT_)) / parseInt(staffDef.getAttribute(c._METERUNIT_))
  if(staffDef.getAttribute(c._METERCOUNT_) !== null && staffDef.getAttribute(c._METERUNIT_) !== null){
    meterRatio = parseInt(staffDef.getAttribute(c._METERCOUNT_)) / parseInt(staffDef.getAttribute(c._METERUNIT_))
  }else{
    meterRatio = extrapolateMeter(xmlDoc)
  }
  var shifters: Array<Element> = new Array;
  var elements = xmlDoc.getElementsByTagName("layer");
  Array.from(elements).forEach(layer => {
    var i = 0;
    var layerChildern = layer.querySelectorAll(countableNoteUnitSelector)
    Array.from(layerChildern).forEach(node => {
      i += getAbsoluteRatio(node)//1/parseInt(node.getAttribute("dur"))
      if(i>meterRatio){
        shifters.push(node)
      }
    })
    if(shifters.length > 0){
      doShiftRight(shifters, meterRatio, layer)
      shifters.length = 0;
      checkInsertShifts(xmlDoc)
    }
  })
}

/**
 * Shift all Elements to the right (according to measure borders)
 * @param arr Array of Elements to be shifted
 * @param meterRatio 
 * @param currentLayer 
 */
function doShiftRight(arr: Array<Element>, meterRatio: number, currentLayer: Element) {
  arr.forEach((element, elementIdx) => {
    var parentMeasure = element.closest("measure");
    var parentMeasureSibling: Element = null;
    parentMeasureSibling = parentMeasure.nextElementSibling
    if(parentMeasureSibling === null){
      parentMeasureSibling = parentMeasure.parentElement.appendChild(createEmptyCopy(parentMeasure))
    }
    var layerLevel = element.closest("layer").getAttribute("n");
    var staffLevel = element.closest("staff").getAttribute("n")
    var targetStaff = parentMeasureSibling.querySelector("staff[n$='"+ staffLevel +"'")
    var targetLayer: Element
    if(targetStaff.querySelector("layer[n$='"+ layerLevel +"'") !== null){
      targetLayer = targetStaff.querySelector("layer[n$='"+ layerLevel +"'")
    }else{
      targetLayer = document.createElement("layer")
      targetLayer.setAttribute("id", "layer-" + uuidv4())
      targetLayer.setAttribute("n", layerLevel)
      targetStaff.appendChild(targetLayer)
    }
    var absLayerRatio: number = getAbsoluteRatio(currentLayer);
    var elementRatio = getAbsoluteRatio(element)

    var chunkDurRight = absLayerRatio - meterRatio
    var chunkDurLeft = elementRatio - chunkDurRight
    if(chunkDurRight > elementRatio){
      chunkDurRight = elementRatio
      chunkDurLeft = 0
    }
    
    //check if note must be split
    if((absLayerRatio + elementRatio)  > meterRatio && chunkDurRight*chunkDurLeft !== 0){
      //check for dots
      if(Number.isInteger(1/chunkDurLeft) && Number.isInteger(1/chunkDurRight)){
        element.removeAttribute("dots")
        var splitRightElement = element.cloneNode(true) as Element;
        splitRightElement.setAttribute("id", uuidv4())
        splitRightElement.setAttribute("dur", (Math.abs(1/chunkDurRight)).toString())
        var beforeElement = elementIdx === 0 ? targetLayer.firstChild : targetLayer.children.item(elementIdx)
        targetLayer.insertBefore(splitRightElement, beforeElement)
        //change already existing element
        element.setAttribute("dur", (Math.abs(1/chunkDurLeft)).toString())
      }else{
        var dottedElements = splitDottedNote(element, chunkDurLeft, chunkDurRight)
        dottedElements.left.forEach(lel => currentLayer.appendChild(lel))
        var beforeElement = elementIdx === 0 ? targetLayer.firstChild : targetLayer.children.item(elementIdx)
        dottedElements.right.forEach(rel => {
          rel.setAttribute("id", uuidv4())
          if(rel.tagName === "chord"){
            rel.querySelectorAll("note").forEach(rl => {
              rl.setAttribute("id", uuidv4())
            })
          }
          targetLayer.insertBefore(rel, beforeElement)
        })
        element.remove()
      }
    }else{
      var beforeElement = elementIdx === 0 ? targetLayer.firstChild : targetLayer.children.item(elementIdx)
      targetLayer.insertBefore(element, beforeElement)
    }
  })
}

function createEmptyCopy(element: Element): Element{
  let copy = element.cloneNode(true) as Element
  let childrenToDelete = Array.from(copy.querySelectorAll("layer > *, measure > slur"))
  childrenToDelete.forEach(child => {
      child.parentNode.removeChild(child)
  })
  //set new ids for everything
  copy.setAttribute("id", uuidv4())
  copy.setAttribute("n", (parseInt(element.getAttribute("n")) + 1).toString())
  let allElements = copy.querySelectorAll("*")
  allElements.forEach(e => e.setAttribute("id", uuidv4()))

  return copy
}



///// GENERAL OPERATIONS /////

function getAbsoluteRatio(el: Element): number{
  var i = 0;
  var arr: Array<Element>;

  if(el.tagName !== "layer"){ //if single Element is given, eg. chord, note
    arr = [el]
  }else{
    arr = Array.from(el.querySelectorAll(countableNoteUnitSelector))
  }

  arr.forEach(node => {
    i += 1/parseInt(node.getAttribute("dur"))
    let baseDur: number = parseInt(node.getAttribute("dur"));
    if(node.getAttribute("dots")!== null){
      let dots = parseInt(node.getAttribute("dots"))
      i += (dots * 2 - 1) / (baseDur * 2 * dots);
    }
  })
  return i;
}

/**
 * Shift Elements to left (according to measure borders)
 * @param arr Array of Elements to shift
 * @param meterRatio meterRatio of the piece
 */
function doShiftLeft(arr: Array<Element>, meterRatio: number){
  arr.forEach(element => {
    var parentMeasure = element.closest("measure")
    var parentMeasureSibling = parentMeasure.previousElementSibling;
    var layerLevel = element.closest("layer").getAttribute("n");
    var targetLayer = parentMeasureSibling.querySelector("layer[n$='"+ layerLevel +"'") // should be <layer>
    var absLayerRatio: number = getAbsoluteRatio(targetLayer);
    var elementRatio = getAbsoluteRatio(element)
    //check if note must be split
    if((absLayerRatio + elementRatio)  > meterRatio){
      var chunkDurLeft = meterRatio-absLayerRatio
      var chunkDurRight = elementRatio-chunkDurLeft

      //check for dots
      if(Number.isInteger(1/chunkDurLeft) && Number.isInteger(1/chunkDurRight)){
        element.removeAttribute("dots")
        var splitLeftElement = element.cloneNode(true) as Element;
        splitLeftElement.setAttribute("id", uuidv4())
        splitLeftElement.setAttribute("dur", (Math.abs(1/chunkDurLeft)).toString())
        targetLayer.appendChild(splitLeftElement)
        //change already existing element
        element.setAttribute("dur", (Math.abs(1/chunkDurRight)).toString())
      }else{
        var elements = splitDottedNote(element, chunkDurLeft, chunkDurRight)
        elements.left.forEach(lel => {
          lel.setAttribute("id", uuidv4())
          if(lel.tagName === "chord"){
            lel.querySelectorAll("note").forEach(ll => {
              ll.setAttribute("id", uuidv4())
            })
          }
          targetLayer.appendChild(lel)
        })
        elements.right.forEach(rel => element.parentElement.insertBefore(rel, element))
        element.remove()
      }
        
    }else{
      targetLayer.appendChild(element)
      //is current Layer empty and should be deleted? if split occured this should not be the case
      var parentLayer = parentMeasure.querySelector("layer[n$='"+ layerLevel +"'") // should always be <layer>
      // if(parentLayer.childNodes.length === 0){
      //    parentMeasure.remove();
      // }
    }
  })
}

/**
 * Operations to split dotted notes
 * @param note reference note elements
 * @param chunkLeftDur calculated ratio left
 * @param chunkRightDur calculated ratio right
 * @returns collection of right ans left elements
 */
function splitDottedNote(note: Element, chunkLeftDur: number, chunkRightDur: number): {left: Array<Element>, right: Array<Element>}{

  let gcdLeft = gcd(chunkLeftDur)
  let gcdRight = gcd(chunkRightDur)

  let countLeftSubNotes = findDotsRecursive(chunkLeftDur, gcdLeft) //return z.B.: [8, 16]
  let countRightSubNotes = findDotsRecursive(chunkRightDur, gcdRight) //return z.B. [2, 8, 16]

  let newLeftElement = createElementsFromSubNotes(note, countLeftSubNotes)
  let newRightElement = createElementsFromSubNotes(note, countRightSubNotes)

  return {left: newLeftElement, right: newRightElement}
}

/**
 * Create actual XML Elements from sequence of dotted notes
 * @param note 
 * @param subNoteDurs 
 * @returns 
 */
function createElementsFromSubNotes(note: Element, subNoteDurs: Array<number>): Array<Element>{
  let newElements = new Array<Element>()
  //find sliceBoundaries in array
  let arraySliceIdx = new Array<number>();
  for(var i=0; i<subNoteDurs.length; i++ ){
    if(i>0){
      if(subNoteDurs[i] !== subNoteDurs[i-1]*2){
        arraySliceIdx.push(i)
      }
    }
  }

  //find actual slices 
  let durSlices = new Array<Array<number>>()
  for(var i=0; i<arraySliceIdx.length+1; i++ ){
    if(i === 0){
      durSlices.push(subNoteDurs.slice(0, arraySliceIdx[i]))
    }else if(i === arraySliceIdx.length){
      durSlices.push(subNoteDurs.slice(arraySliceIdx[i-1]))
    }else{
      durSlices.push(subNoteDurs.slice(arraySliceIdx[i-1], arraySliceIdx[i]))
    }
  }

  //create notes
  let createArr = durSlices.length > 0 ? durSlices : [subNoteDurs]
  createArr.forEach(durs => {
    let newElement = note.cloneNode(true) as Element
    newElement.removeAttribute("dots") //eventual dots could be in original note value
    newElement.setAttribute("dur", Math.abs(durs[0]).toString())
    let dots = 0;
    durs.forEach((dur, i) => {
      if(i>0){dots += 1}
    })
    if(dots > 0){newElement.setAttribute("dots", dots.toString())}
    newElements.push(newElement)
  })

  return newElements
}

/**
 * Compute greatest integer divisor
 * @param chunkDur Duration of given Chunk
 * @returns 
 */
function gcd(chunkDur: number): number{
  var largestModulo = null;
  var baseValue = 1;
  var mod = 0
  while(largestModulo === null){
    mod = chunkDur % baseValue
    if(mod === 0){
      largestModulo = baseValue
    }
    baseValue = baseValue/2
  }
  return largestModulo;
}

/**
 * Splits duration of given chunk into possible dotted sequences
 * @param chunk 
 * @param smallestUnit = greatest integer divisor
 * @returns 
 */
function findDotsRecursive(chunk: number, smallestUnit: number): Array<number>{
  var arr = new Array<number>();
  var sliceChunk = chunk/smallestUnit;
  if(Math.floor(sliceChunk) > 1){
    arr = arr.concat(findDotsRecursive(chunk, smallestUnit*2))
  }else if(Math.floor(sliceChunk) < 1){
    arr = arr.concat(findDotsRecursive(chunk, smallestUnit/2))
  }else if(!Number.isInteger(sliceChunk)){
    arr.push(1/1/smallestUnit)
    arr = arr.concat(findDotsRecursive(chunk-smallestUnit, smallestUnit))
  }else{
    arr.push(1/1/smallestUnit)
  }
  return arr //.sort((a,b) => a-b)
}

/**
 * Extrapolates meter, if is not given in scoreDef. Iterates through each staff to get the mostly found ratio
 * @param xmlDoc 
 * @returns meter ratio
 */
export function extrapolateMeter(xmlDoc: Document): number {
  var ratioMap = new Map<number, number>();

  var xmlCopy = xmlDoc.cloneNode(true) as Document;
  var layers = Array.from(xmlCopy.querySelectorAll("layer"))
  var mostlyUsedRatio = 0;
  layers.forEach(layer => {
    
    if(layer.childElementCount === 0){
      return
    }

    //strip all unnecessary elements: garce notes, beams 
    //which do not contribute to count of measure duration
    var beams = Array.from(layer.querySelectorAll("beam"))
    beams.forEach(beam => {
      Array.from(beam.children).forEach(c => { //copy notes/ chords outside of beam first, before removing
        beam.parentElement.append(c)
      })
      xmlCopy.getElementById(beam.id).remove();
    })

    var graceNotes = Array.from(layer.querySelectorAll("[grace]"))
    graceNotes.forEach(g => {
      xmlCopy.getElementById(g.id).remove()
    })
    ///////////////
    
    var childElements = Array.from(layer.children);
    var ratio = 0;
    childElements.forEach(element => {
      ratio += getAbsoluteRatio(element)
    });

    if(!ratioMap.has(ratio)){
      ratioMap.set(ratio, 1)
    }else{
      ratioMap.set(ratio, ratioMap.get(ratio) + 1)
    }
    
    var prevItCount = 0;
    for(const [key, value] of ratioMap.entries()){
      if(value > prevItCount){
        prevItCount = value
        mostlyUsedRatio = key
      }
    }
    
  })
  return mostlyUsedRatio;
}

/**
 * Adjust all accids according to key signature
 * e.g. after changing global Key
 * @param xmlDoc 
 * @returns 
 */
export function adjustAccids(xmlDoc: Document): Document{

  var keySigElements = Array.from(xmlDoc.querySelectorAll("staffDef > keySig"))
  keySigElements.forEach((ks, idx) => {
    var keySymbol = ks.getAttribute("sig").charAt(1)
    var sig = keysigToNotes.get(ks.getAttribute("sig"))
    var n = idx + 1
    xmlDoc.querySelectorAll("staff[n=\"" + n + "\"] * note").forEach(note => {
      
      var accid = note.getAttribute("accid")
      var accidGes = note.getAttribute("accid.ges")
      var pname = note.getAttribute("pname")

      if(sig.includes(pname)){
        if(accid === keySymbol){
          note.setAttribute("accid.ges", accid)
          note.removeAttribute("accid")
        }
        if(accid === null && accidGes === null){
          note.setAttribute("accid", "n")
        }
      }else if(accid === "n"){
        note.removeAttribute("accid")
        note.removeAttribute("accidGes")
      }else if(accidGes !== null){
        note.removeAttribute("accidGes")
        note.setAttribute("accid", accidGes)
      }
      hideAccid(note)
    })
  })

  return xmlDoc
}

/**
 * Hides Accid, if measure already has accid in notes before
 * @param note given note from MEI
 */
function hideAccid(note: Element){
  var root = note.closest("mei")
  var accid = note.getAttribute("accid")
  var noteid = note.getAttribute("id")
  if(root !== null){ // && document.getElementById(noteid).classList.contains("marked")){
    var pname = note.getAttribute("pname")
    var currentLayer = note.closest("layer")
    var layerNotes = currentLayer.querySelectorAll("note")
    var hasAccidBefore = false
    for(var i = 0; i < layerNotes.length; i++){
      var currentNote = layerNotes[i]
      if(currentNote === note){
        break
      }
      var currPname = currentNote.getAttribute("pname")
      var currAccid = currentNote.getAttribute("accid")
      var currAccidGes = currentNote.getAttribute("accid.ges")
      if(pname === currPname && (currAccid === accid || currAccidGes === accid) && accid !== null){
        hasAccidBefore = true
      }
      
      if(pname === currPname && (currAccid !== accid || currAccidGes !== accid) && accid !== null){
        hasAccidBefore = false
      }
      
      if(pname === currPname && accid === null && hasAccidBefore){
        hasAccidBefore = false
        note.setAttribute("accid", "n")
      }
    }
    if(hasAccidBefore){
      note.removeAttribute("accid")
      note.setAttribute("accid.ges", accid)
    }
  }
}

/**
 * Transpose marked notes according to direcion (up or down)
 * @param xmlDoc 
 * @param direction 
 * @returns 
 */
export function transposeByStep(xmlDoc: Document, direction: string): Document{
  document.querySelectorAll(".note.marked").forEach(nm => {
    var noteMEI = xmlDoc.getElementById(nm.id)
    var pname = noteMEI.getAttribute("pname")
    var oct = parseInt(noteMEI.getAttribute("oct"))
    var accid = noteMEI.getAttribute("accid") || noteMEI.getAttribute("accid.ges")
    if(accid === null || typeof accid == "undefined" || accid === "n"){
      accid = ""
    }
    
    var nextNote: string
    if(direction === "up"){
      nextNote = nextStepUp.get(pname + accid)
    }else if(direction === "down"){
      nextNote = nextStepDown.get(pname + accid)
    }

    noteMEI.setAttribute("pname", nextNote.charAt(0))
    if(nextNote.charAt(1) !== ""){
      noteMEI.setAttribute("accid", nextNote.charAt(1))
    }else{
      noteMEI.removeAttribute("accid")
      noteMEI.removeAttribute("accid.ges")
    }

    //Change Octave
    if( ["c", "bs"].includes(pname + accid) && nextNote === "b"){
      noteMEI.setAttribute("oct", (oct-1).toString())
    }
    if(["b", "cf"].includes(pname + accid) && nextNote === "c"){
      noteMEI.setAttribute("oct", (oct+1).toString())
    }
  })

  return adjustAccids(xmlDoc)
}

/**
 * Change Meter according to #timeUnit and #timeCount in side bar option. 
 * @param xmlDoc 
 * @returns changed mei; null, if input has no valid values
 */
export function changeMeter(xmlDoc: Document): Document {
    var timeCount = document.getElementById("timeCount")
    var timeUnit = document.getElementById("timeUnit")

    //@ts-ignore
    var timeCountValue = timeCount.value //getAttribute("value")
    //@ts-ignore
    var timeUnitValue = timeUnit.value //getAttribute("value")

    if(timeCountValue !== null && timeUnitValue !== null){
      timeCountValue = timeCountValue.trim()
      timeUnitValue = timeUnitValue.trim()

      if(!isNaN(parseInt(timeCountValue)) &&  !isNaN(parseInt(timeUnitValue))) {
        var oldMeterRatio = getMeterRatioGlobal(xmlDoc)
        xmlDoc.querySelectorAll("staffDef").forEach(sd => {
          sd.setAttribute("meter.count", timeCountValue)
          sd.setAttribute("meter.unit", timeUnitValue)
        })

        // adjust noteposition 
        var newMeterRatio = getMeterRatioGlobal(xmlDoc)
        if(oldMeterRatio > newMeterRatio){
          checkInsertShifts(xmlDoc)
        }else if(oldMeterRatio < newMeterRatio){
          checkDeleteShifts(xmlDoc)
        }
        if(oldMeterRatio !== newMeterRatio){
          return xmlDoc
        }
      }
    }

    return xmlDoc //null  
}

/**
 * disable features if necesseray (only supposed to be used for debugging)
 * @param features Array of TagNames and AttributeNames which have to be disabled (deleted)
 * @param xmlDoc mei
 * @returns 
 */
export function disableFeatures(features: Array<string>, xmlDoc: Document){
  features.forEach(f => {
    
    var elements = Array.from(xmlDoc.getElementsByTagName(f))
    elements.forEach(e => {
      let parent = e.parentElement
      e.remove()
      if(parent.childElementCount === 0){
        parent.remove()
      }
    })

    elements = Array.from(xmlDoc.querySelectorAll("*[" + f +"]"))
    elements.forEach(e => {
      let parent = e.parentElement
      e.remove()
      if(parent.childElementCount === 0){
        parent.remove()
      }
    })

  })

  return xmlDoc
}

/**
 * Fill Empty Space with rest
 * @param xmlDoc 
 */
function fillWithRests(xmlDoc: Document){
  var staffDef = xmlDoc.getElementsByTagName("staffDef").item(0)
  var meterCount: string
  var meterUnit: string
  var meterRatio: number
  if(staffDef.getAttribute(c._METERCOUNT_) !== null && staffDef.getAttribute(c._METERUNIT_) !== null){
    meterCount = staffDef.getAttribute(c._METERCOUNT_)
    meterUnit = staffDef.getAttribute(c._METERUNIT_)
    meterRatio= parseInt(meterCount) / parseInt(meterUnit)
  }else{
    var meterRatio = getMeterRatioGlobal(xmlDoc)
    meterCount = (meterRatio*4).toString()
    meterUnit = "4"
  }

  xmlDoc.querySelectorAll("measure").forEach(m =>{
    m.querySelectorAll("staff").forEach(s => {
      s.querySelectorAll("layer").forEach((l, idx) => {
        //mRest for empty Layer
        if(l.childElementCount === 0){
          if(idx === 0){
            var restEl = document.createElementNS(c._MEINS_, "mRest")
            l.appendChild(restEl)
          }else{ // remove 1+ empty layer
            l.remove()
          }
        }else{
          var actualMeterFill = getAbsoluteRatio(l)
          var ratioDiff = Math.abs(actualMeterFill-meterRatio)
          var smallestValue = gcd(ratioDiff)
          //var restDurs = findDotsRecursive(ratioDiff, gcd(ratioDiff))
          if(Number.isInteger(ratioDiff/smallestValue) && ratioDiff > 0){
            var leftRatio = ratioDiff
            var durArr = new Array<number>()
            while(!Number.isInteger(1/leftRatio)){
              var leftRatio = ratioDiff-smallestValue
              durArr.push(1/smallestValue)
            }
            durArr.push(1/leftRatio)
            durArr = durArr.reverse()
            durArr.forEach(dur => {
              var newRest = xmlDoc.createElementNS(c._MEINS_, "rest")
              newRest.setAttribute("dur", dur.toString())
              l.appendChild(newRest)
            })
          }

          //console.log(document.getElementById(l.id), ratioDiff, gcd(ratioDiff), durArr)
        }
      })
    })
    
  })
}

/**
 * Replace given id with rest
 * @param element element from svg 
 * @param xmlDoc 
 */

function replaceWithRest(element: Element, xmlDoc: Document){
  var elmei: Element = xmlDoc.getElementById(element.id)
  //var closestChord: Element = xmlDoc.getElementById(element.id).closest("chord")
  //if(closestChord !== null){elmei = closestChord}
  var dur = elmei.getAttribute("dur")
  var dots = elmei.getAttribute("dots")
  var newRest = xmlDoc.createElementNS(c._MEINS_, "rest")
  newRest.setAttribute("dur", dur)
  if(dots !== null){newRest.setAttribute("dots", dots)}
  elmei.parentElement.insertBefore(newRest, elmei)
  elmei.remove()
}

export function changeDuration(xmlDoc: Document, mode: string, additionalElements: Array<Element> = new Array()){
  var changedFlag = "changed"
  var multiplier: number
  switch(mode){
    case "reduce":
      multiplier = 2
      break;
    case "prolong":
      multiplier = 1/2
      break;
    default:
      console.error(mode, "No such operation")
      return
  }
  var elements: Array<Element> = new Array();
  elements = Array.from(document.querySelectorAll(".note.marked"))
  elements = elements.concat(additionalElements)

  elements.forEach(el => {
    var elmei = xmlDoc.getElementById(el.id) as Element
    var chord = elmei.closest("chord")
    //Dur is attribute of chord and all notes will be changed accordingly
    if(chord !== null){
      if(chord.classList.contains(changedFlag)){
        return
      }else{
        elmei = chord
        elmei.classList.add(changedFlag)
      }
    }
    var dur = parseInt(elmei.getAttribute("dur"))
    if(dur > 0){
      dur = dur*multiplier
      elmei.setAttribute("dur", dur.toString())

      if(mode === "reduce"){
        var layerRatio = getAbsoluteRatio(elmei.closest("layer")) // find measure border
        var globalRatio = getMeterRatioGlobal(xmlDoc)
        if(layerRatio < globalRatio){
          var newRest = xmlDoc.createElementNS(c._MEINS_, "rest")
          if(globalRatio - layerRatio < (1/dur)){
            dur = 1/(globalRatio - layerRatio)
          }
          newRest.setAttribute("dur", dur.toString())
          elmei.parentElement.insertBefore(newRest, elmei.nextElementSibling)
        }
      }else if(mode === "prolong"){ // overwrite next siblings in layer
        var remainDur = 1/(dur*2)
        while(remainDur > 0){

          var hasNextSibling = elmei?.nextElementSibling != undefined || elmei.closest("beam")?.nextElementSibling != undefined
          if(hasNextSibling){ // no siblings, if end of layer or last element in beam
            var sibling = elmei.nextElementSibling
            if(sibling !== null){
              sibling = elmei.nextElementSibling.tagName === "beam" ? elmei.nextElementSibling.firstElementChild : elmei.nextElementSibling
            }else{
              sibling = elmei.closest("beam") !== null ? elmei.closest("beam").nextElementSibling : sibling
            }
            var nextDur = 1/parseInt(sibling.getAttribute("dur"))
            remainDur = remainDur - nextDur
            if(remainDur < 0){
              sibling.setAttribute("dur", (1/Math.abs(remainDur)).toString())
            }else{
              sibling.remove()
            }
          }else{
            remainDur = 0
          }
        }
      }
    }
  })
  //clean up after changing durations
  xmlDoc.querySelectorAll(".changed").forEach(c => c.classList.remove(changedFlag))
  cleanUp(xmlDoc)
}


/**
 * Clean up mei after changing values
 * @param xmlDoc 
 */
export function cleanUp(xmlDoc: Document){
  reorganizeBeams(xmlDoc)
  removeEmptyElements(xmlDoc)
  //fillWithRests(xmlDoc)
  adjustRests(xmlDoc)
}

function reorganizeBeams(xmlDoc: Document){
  // if beams have elements, which shouldn be there
  xmlDoc.querySelectorAll("beam").forEach(b => {
    var beamNotes = Array.from(b.children)
    if(!beamNotes.every(c => parseInt(c.getAttribute("dur")) >= 8) && beamNotes.length > 0){
      beamNotes.forEach(n => {
        if(parseInt(n.getAttribute("dur")) >= 8){
          if(n.previousElementSibling !== null){
            if(n.previousElementSibling.tagName === "beam"){ // check for previous beams to merge with
              n.previousElementSibling.appendChild(n)
            }
          }else{// else make new beam
            var newBeam = xmlDoc.createElementNS(c._MEINS_, "beam")
            newBeam.setAttribute("id", uuidv4())
            n.parentElement.insertBefore(newBeam, n)
            newBeam.append(n)
          }
        }
      })
      //set all inner elements outseide of old beam
      b.outerHTML = b.innerHTML
    }
  })
}

/**
 * After shifting and removing notes, some elements could be empty
 * @param xmlDoc 
 */
 function removeEmptyElements(xmlDoc: Document) {

  Array.from(xmlDoc.querySelectorAll("beam")).forEach(b => {
    if(b.childElementCount === 0){
      xmlDoc.getElementById(b.id).remove()
    }
    if(b.childElementCount === 1){
      //b.parentElement.insertBefore(b, b.firstChild)
      //b.remove()
      b.outerHTML = b.innerHTML
    }
    var bArr = Array.from(b.children)
    if(bArr.every(c => c.tagName === "rest") && bArr.length > 0){
      // Array.from(b.children).forEach(c => {
      //   b.parentElement.insertBefore(c, b)
      // })
      // b.remove()
      b.outerHTML = b.innerHTML
    }
  })

  Array.from(xmlDoc.querySelectorAll("chord")).forEach(c => {
    if(c.childElementCount === 0){xmlDoc.getElementById(c.id).remove()}
  })

  // Array.from(xmlDoc.querySelectorAll("measure")).forEach(m => {
  //   if(m.querySelectorAll("note, chord").length === 0){
  //     xmlDoc.getElementById(m.id).remove()
  //   }
  // })
}

/**
 * Apply some additional rules for rests, Elements where added
 * @param xmlDoc 
 */
 function adjustRests(xmlDoc: Document){
  //layers can just have mRest as only child
  xmlDoc.querySelectorAll("layer").forEach(l =>{
    Array.from(l.children).forEach(cn => {
      if(cn.tagName === "mRest" && l.childElementCount > 1){
        cn.remove()
      }
    })
  })
}

export function addMeasure(xmlDoc: Document){
  var lastMeasure = Array.from(xmlDoc.querySelectorAll("measure")).reverse()[0]
  var staffCounts: number[] = Array.from(lastMeasure.querySelectorAll("staff")).map(s => {return parseInt(s.getAttribute("n"))})
  var staffCount = Math.max.apply(Math, staffCounts)
  var layerCounts: number[] = Array.from(lastMeasure.querySelectorAll("layer")).map(s => {return parseInt(s.getAttribute("n"))})
  var layerCount = Math.max.apply(Math, layerCounts)
  var newMeasure: Element = new MeiTemplate().createMeasure(1, staffCount, layerCount) as Element
  newMeasure.setAttribute("id", uuidv4())
  lastMeasure.parentElement.append(newMeasure)
  var i = 1
  xmlDoc.querySelectorAll("measure").forEach(m => {
    m.setAttribute("n", i.toString())
    i++
  })
  cleanUp(xmlDoc)
}

export function removeMeasure(xmlDoc: Document){
  var measures = Array.from(xmlDoc.querySelectorAll("measure")).reverse()
  if(measures.length > 1){
    measures[0].remove()
}else{
  measures[0].querySelectorAll("layer").forEach(l => {
    l.innerHTML = ""
    l.appendChild(xmlDoc.createElement("mRest"))
  })
}
  cleanUp(xmlDoc)
}

export function addStaff(xmlDoc:Document, referenceStaff: Element, relPos: string){
  var staffNum = referenceStaff.getAttribute("n")
  var refn: string
  var refElement: Element
  xmlDoc.querySelectorAll("staff[n=\"" + staffNum +"\"]").forEach(s =>{
    var newStaff = new MeiTemplate().createStaff(1, 1) as Element
    switch(relPos){
      case "above":
        refElement = s
        break;
      case "below":
        refElement = s.nextElementSibling || s
        break;
      default:
        console.error(relPos, " was never an option")
    }
    if(relPos === "below" && refElement === s){ // => new staff at the end
      s.parentElement.append(newStaff)
    }else{
      s.parentElement.insertBefore(newStaff, refElement)
    }

    refn = refElement?.getAttribute("n") || staffNum // s.getAttribute("n")
  })

  //new StaffDef
  var refStaffDef = xmlDoc.querySelector("staffDef[n=\""+refn+"\"]")
  var refCopy = refStaffDef.cloneNode(true) as Document
  refCopy.querySelectorAll("*[id]").forEach(i => {
    i.removeAttribute("id")
  })
  refStaffDef.parentElement.insertBefore(refCopy, refStaffDef)


  xmlDoc.querySelectorAll("measure").forEach(m => {
    var i = 1
    m.querySelectorAll("staff").forEach(s => {
      s.setAttribute("n", i.toString())
      i++
    }) 
  })
  var i = 1
  xmlDoc.querySelectorAll("staffDef").forEach(sd => {
    sd.setAttribute("n", i.toString())
    i++
  })
  cleanUp(xmlDoc)
}

export function removeStaff(xmlDoc:Document, referenceStaff: Element, relPos:string){
  var staff = xmlDoc.getElementById(referenceStaff.id)
  var staffNum = staff.getAttribute("n")
  var refn: string
  xmlDoc.querySelectorAll("staff[n=\"" + staffNum +"\"]").forEach(s =>{
    switch(relPos){
      case "above":
        refn = s.previousElementSibling.getAttribute("n")
        s.previousElementSibling.remove()
        break;
      case "below":
        refn = s.nextElementSibling.getAttribute("n")
        s.nextElementSibling.remove()
        break;
      default:
        console.error(relPos, " was never an option")
    }
  })

  xmlDoc.querySelector("staffDef[n=\""+refn+"\"]").remove()

  xmlDoc.querySelectorAll("measure").forEach(m => {
    var i = 1
    m.querySelectorAll("staff").forEach(s => {
      s.setAttribute("n", i.toString())
      i++
    })
  })
  var i = 1
  xmlDoc.querySelectorAll("staffDef").forEach(sd => {
    sd.setAttribute("n", i.toString())
    i++
  })
  cleanUp(xmlDoc)
}

/**
 * Paste copied ids. First position to which the Elements are copied is the Element according to the refId (= RefElement).
 * If multiple staffs are copied, overhanging staffs will be pasted to the staffs below the staff of the RefElement, if definedstaffs exist. 
 * Else these copiedId will be not pasted.
 * @param ids 
 * @param refId 
 */
export function paste(ids: Array<string>, refId: string, xmlDoc: Document){
    //ordered by staff
    var meiElements = new Array<Array<Element>>()
    ids.forEach(id => {
      var el = xmlDoc.getElementById(id)
      if(["CHORD", "NOTE"].includes(el?.tagName.toUpperCase())){
        if(!(el.tagName.toUpperCase() === "NOTE" && el.closest("chord") !== null)){
          var staff = el.closest("staff")
          var num = parseInt(staff.getAttribute("n")) - 1
          if(meiElements[num] == undefined){
            meiElements[num] = new Array()
          }
          var cel = el.cloneNode(true) as Element
          cel.setAttribute("id", uuidv4())
          meiElements[num].push(cel)
        }
      }
    })

    var refElement = xmlDoc.getElementById(refId) as Element
    refElement = refElement.closest("chord") || refElement
    var refStaff = refElement.closest("staff")
    var refLayer = refElement.closest("layer")
    var refMeasure = refElement.closest("measure")
    var currentMeasure: Element

    meiElements.forEach((staff,staffIdx) => {
      currentMeasure = refElement.closest("measure")
      let anyNew
      staff.forEach((element,elementIdx) => {
        if(element.tagName.toUpperCase() === "NOTE"){
          var newNote = convertToNewNote(element)
          newNote.nearestNoteId = refElement.id
          newNote.relPosX =  "right"
          anyNew = newNote
        }else if(element.tagName.toUpperCase() === "CHORD"){
          var newChord = convertToNewChord(element)
          newChord.nearestNoteId = refElement.id
          newChord.relPosX =  "right"
          anyNew = newChord
        }

        addToMEI(anyNew, xmlDoc) 
        refElement = element
      })
    })
}


function convertToNewNote(element: Element): NewNote{

  var newNote: NewNote = {
    id: element.id,
    pname: element.getAttribute("pname"),
    dur: element.getAttribute("dur"),
    dots: element.getAttribute("dots"),
    oct: element.getAttribute("oct"),
    accid: element.getAttribute("accid.ges") || element.getAttribute("accid"),
    rest: element.classList.contains("rest") ? true : false
  }
  return newNote
}

function convertToElement(n: NewNote | NewChord, xmlDoc: Document): Element{
  var nn
  var newElement: Element
  if(n.hasOwnProperty("pname")){
    nn = n as NewNote
    newElement = xmlDoc.createElement("note")
    newElement.setAttribute("pname", nn.pname)
    newElement.setAttribute("oct", nn.oct)
    newElement.setAttribute("accid", nn.accid)
  }else{
    nn = n as NewChord
    newElement = xmlDoc.createElement("chord")
    nn.noteElements.forEach(ne => {
      newElement.append(convertToElement(ne, xmlDoc))
    });
  }
  newElement.setAttribute("id", uuidv4())
  newElement.setAttribute("dur", nn.dur)
  newElement.setAttribute("dots", nn.dots)

  return newElement
}

function convertToNewChord(element: Element): NewChord{

  var newNotes = Array.from(element.querySelectorAll("note")).map(n => {
    return convertToNewNote(n)
  })

  var newChord: NewChord = {
    id: uuidv4(),
    dur: element.getAttribute("dur"),
    dots: element.getAttribute("dots"),
    noteElements: newNotes
  }

  return newChord
}
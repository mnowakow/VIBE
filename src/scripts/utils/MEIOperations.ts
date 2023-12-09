import * as meiConverter from './MEIConverter'
import { uuidv4 } from './random'
import { constants as c } from '../constants'
import { NewChord, NewNote, NewClef } from './Types'
import { keysigToNotes, nextStepUp, nextStepDown, clefToLine, keyIdToSig, midiToNote } from './mappings'
import MeiTemplate from '../assets/mei_template'
import ScoreGraph from '../datastructures/ScoreGraph'
import MeasureMatrix from '../datastructures/MeasureMatrix'
import HarmonyLabel from '../gui/HarmonyLabel'
import * as coordinates from './coordinates'

/**
 * This script is a collection of functions which help to manipulate the underlying MEI, so that it can be renderd anew.
 * E.g.: Add and remove notes, process beams and slurs, cleanup empty elements, etc.
 * 
 * Some extract features from the MEI which are not apparent in the MEI itself, like processing ratios and relationsships between notes.
 * 
 */

const countableNoteUnitSelector: string =
  ":scope > *[dur]:not([grace])"

const overfillMeasure = false

const siblingNames = ["note", "chord", "clef", "beam"]



////// DELETE //////
/**
 * Remove Elements from MEI. 
 * Some Elements (such as accid...) could are not represeented as elements in the current MEI.
 * These have to be found in the parent element which have these as an attribute.
 * @param scoreElements Array of Elements which are marked in the SVG Representation (notes, chords, slur, tie, accid etc..)
 * @param currentMEI 
 * @returns 
 */
export function removeFromMEI(scoreElements: Array<Element>, currentMEI: Document): Promise<Document> {
  return new Promise<Document>((resolve): void => {

    scoreElements.forEach(se => {
      if (currentMEI.getElementById(se?.id) !== null) { // this only applies for <note> and <rest>
        //do not remove completely, replace with rest
        //currentMEI.getElementById(note.id).remove()
        if (["note", "chord"].some(s => se.classList.contains(s))) {
          replaceWithRest(se, currentMEI)
        } else {
          currentMEI.getElementById(se.id).remove() // possibility to remove rests entirely
        }

        // remove all tie/ harms etc when startid is no more a note or is deleted
        //currentMEI.querySelectorAll("tie").forEach(t => {
        currentMEI.querySelectorAll("[startid]").forEach(t => {
          if (t.getAttribute("startid").includes(se.id)) {
            if (currentMEI.getElementById(se.id) === null) {
              currentMEI.querySelector(t.getAttribute("endid"))?.remove()
            }
            t.remove()
          }
        })

      } else {
        //may be some of the following: accid
        var closestNote = currentMEI.getElementById(se?.closest(".note")?.id)
        if (closestNote !== null) {
          //console.log("removing ", se)
          var attrName = se.classList.item(0).toLowerCase()
          closestNote.removeAttribute(attrName)
          if (attrName === "accid") {
            closestNote.removeAttribute("accid.ges")
          }
        } else if (se.closest(".tuplet") !== null) {
          var tuplet = currentMEI.querySelector("#" + se.closest(".tuplet").id)
          if (tuplet !== null) tuplet.outerHTML = tuplet.innerHTML //the element could be gone in current mei, but se is still present
        }
      }
    })

    cleanUp(currentMEI)
    currentMEI = meiConverter.restoreXmlIdTags(currentMEI)
    resolve(currentMEI)
  })
}

function checkDeleteShifts(currentMEI: Document): void {
  var meterRatio = getMeterRatioGlobal(currentMEI)
  var shifters: Array<Element> = new Array;
  var elements = currentMEI.getElementsByTagName("layer");
  Array.from(elements).forEach(layer => {
    var actualMeterFill = getAbsoluteRatio(layer);
    var layerLevel = layer.getAttribute("n");
    var staffLevel = layer.closest("staff").getAttribute("n")
    var nextSibling = layer.closest("measure").nextElementSibling
    if (actualMeterFill < meterRatio && nextSibling !== null) {
      let hasStaff = nextSibling.querySelector("staff[n$='" + staffLevel + "'") !== null ? true : false
      let hasLayer = nextSibling.querySelector("layer[n$='" + layerLevel + "'") !== null ? true : false
      if (hasStaff && hasLayer) {
        nextSibling = nextSibling.querySelector("staff[n$='" + staffLevel + "'").querySelector("layer[n$='" + layerLevel + "'")
        Array.from(nextSibling.querySelectorAll(countableNoteUnitSelector)).forEach(node => {
          if (actualMeterFill < meterRatio) {
            shifters.push(node)
          }
          actualMeterFill += 1 / parseInt(node.getAttribute("dur"))
        })
      }
    }
    if (shifters.length > 0) {
      doShiftLeft(shifters, meterRatio)
      shifters.length = 0;
      checkDeleteShifts(currentMEI)
    }
  })
}

function getMeterRatioGlobal(currentMEI: Document): number {
  var staffDef: Element = currentMEI.getElementsByTagName("staffDef").item(0)
  var meterRatio: number = null
  //Do I know the meter?
  if (staffDef.getAttribute(c._METERCOUNT_) !== null && staffDef.getAttribute(c._METERUNIT_) !== null) {
    meterRatio = parseInt(staffDef.getAttribute(c._METERCOUNT_)) / parseInt(staffDef.getAttribute(c._METERUNIT_))
  } else {
    meterRatio = extrapolateMeter(currentMEI)
  }

  return meterRatio
}

/**
 * 
 * @param currentMEI  
 * @param refElement Must be a staff-Element at most
 */
export function getMeterRatioLocal(currentMEI: Document, refElement: Element): number {
  var staffElement: Element
  if (refElement.tagName !== "staff") {
    if (refElement.closest("staff") === null) {
      staffElement = currentMEI.getElementById(refElement.id)?.closest("staff") || currentMEI.getElementById(refElement.parentElement.id)?.closest("staff")
    } else {
      staffElement = refElement.closest("staff")
    }
  } else {
    staffElement = refElement
  }

  if (staffElement === null || staffElement == undefined) {
    throw new Error("RefElement must be a staff-Element at most")
  }

  var mm = new MeasureMatrix()
  mm.populateFromMEI(currentMEI as Document)
  var measureIdx = staffElement.closest("measure").getAttribute("n")
  var staffIdx = staffElement.getAttribute("n")
  var mmStaff = mm.get(measureIdx, staffIdx)
  return parseInt(mmStaff.meterSig.count) / parseInt(mmStaff.meterSig.unit)
}

//////// INSERT ////////// 
/**
 * Insert given sound event into MEI
 * @param newSound NewNote or NewChord to be inserted 
 * @param currentMEI MEI as Document
 * @param replace Switching to replaceMode (default: False)
 * @param scoreGraph 
 * @returns mei
 */
export function addToMEI(newSound: NewNote | NewChord, currentMEI: Document, replace: Boolean = false, scoreGraph: ScoreGraph = null): Document {//Promise<Document> {
  //return new Promise<Document>((resolve): void => {
  var currMeiClone = currentMEI.cloneNode(true)
  var newElem: Element
  var nearestNoteIsSameDurRest: Boolean = false
  if (newSound.hasOwnProperty("pname")) {
    if (!newSound.nearestNoteId) return currentMEI
    var newNote = newSound as NewNote
    if (newNote.rest) {
      newElem = currentMEI.createElement("rest")
    } else {
      newElem = currentMEI.createElement("note");
      newElem.setAttribute("pname", newNote.pname);
      newElem.setAttribute("oct", newNote.oct);
      if (newNote.accid != undefined) {
        newElem.setAttribute("accid.ges", newNote.accid)
      }
    }
    newElem.setAttribute("dur", newNote.dur);

    if (newNote.dots != undefined) {
      newElem.setAttribute("dots", newNote.dots)
    }
    if (newNote.id != undefined && newNote.id !== null) {
      newElem.setAttribute("id", newNote.id)
    }

    //break up an cache beams for easier processing
    //later all the beams will be reastablished
    var beams = new Array<Element>()
    currentMEI.querySelector("#" + newNote.nearestNoteId).closest("layer").querySelectorAll("beam").forEach(b => {
      beams.push(b.cloneNode(true) as Element)
      Array.from(b.children).forEach(e => {
        b.parentElement.insertBefore(e, b)
      })
      b.remove()
    })

    //Do sthm with chords
    if (newNote.chordElement != undefined && !newNote.rest) {
      var chord: Element
      var meiChordEl = currentMEI.getElementById(newNote.chordElement.id)
      if (newNote.chordElement.classList.contains("chord") || newNote.chordElement.tagName === "chord") {
        chord = meiChordEl
        chord.appendChild(newElem)
      } else {
        chord = document.createElement("chord")
        chord.setAttribute("id", uuidv4())
        chord.setAttribute("dur", meiChordEl.getAttribute("dur"));
        if (meiChordEl.getAttribute("dots") !== null) {
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

      // check for existing ties within the chord and make one for the new element as well
      currentMEI.querySelectorAll("tie").forEach(t => {
        if (Array.from(chord.querySelectorAll("note")).some(n => t.getAttribute("startid") === "#" + n.id)) {
          if (!currentMEI.querySelector("tie[startid='#" + newNote.id + "']")) { // just make the tie once (since this can be called twice in recursion)
            var addToChord = { ...newNote }
            addToChord.id = uuidv4()
            var tieEnd = currentMEI.querySelector(t.getAttribute("endid"))
            tieEnd = tieEnd.closest("chord") || tieEnd
            addToChord.chordElement = tieEnd
            addToMEI(addToChord, currentMEI, replace)
            connectNotes(currentMEI.querySelector("#" + newNote.id), currentMEI.querySelector("#" + addToChord.id), "tie")
          }
        }
      })

    } else if (newNote.nearestNoteId !== null) {
      var sibling: HTMLElement = currentMEI.getElementById(newNote.nearestNoteId);
      if (sibling === null) return
      nearestNoteIsSameDurRest = sibling.tagName === "rest" && sibling.getAttribute("dur") === newElem.getAttribute("dur") && sibling.getAttribute("dots") === newElem.getAttribute("dots")
      //special rule for first element in layer
      if (sibling.tagName === "layer") {
        if (scoreGraph !== null) {
          sibling = currentMEI.getElementById(scoreGraph.getCurrentNode().getRight().getId())?.parentElement
        }
        var firstChild = sibling.firstChild as Element
        sibling.insertBefore(newElem, firstChild)
        if (replace) {
          changeDurationsInLayer(currentMEI, [firstChild], newElem)
        }

      } else {
        var parentLayer = sibling.closest("layer")
        var trueParent = sibling.parentElement
        var isTrueSibling = parentLayer == trueParent
        var trueSibling: HTMLElement = sibling;
        if (!isTrueSibling) {
          var currParent: HTMLElement = trueParent;
          while (!isTrueSibling) {
            trueSibling = currParent;
            currParent = currParent?.parentElement;
            isTrueSibling = currParent.tagName === "layer"
          }
        }

        if (replace) {
          let ms = Array.from(trueSibling.parentElement.querySelectorAll("note:not(chord note), chord, rest, mRest")) as Element[]

          if (newNote.relPosX === "left") {
            var measureSiblings = ms.filter((_, i) => i >= ms.indexOf(trueSibling))
            trueSibling.parentElement.insertBefore(newElem, trueSibling)
            changeDurationsInLayer(currentMEI, measureSiblings, newElem)
          } else {
            if (["clef"].every(el => trueSibling.nextElementSibling?.tagName !== el) && trueSibling.nextElementSibling !== null) {

              var measureSiblings = ms.filter((_, i) => i >= ms.indexOf(trueSibling.nextElementSibling))
              trueSibling.parentElement.insertBefore(newElem, trueSibling.nextElementSibling)

              changeDurationsInLayer(currentMEI, measureSiblings, newElem)
            } else {
              trueSibling.parentElement.insertBefore(newElem, trueSibling.nextElementSibling)
            }
          }
        } else {
          if (newNote.relPosX === "left") {
            trueSibling.parentElement.insertBefore(newElem, trueSibling)
          } else {
            trueSibling.parentElement.insertBefore(newElem, trueSibling.nextElementSibling)
          }
        }
      }

    } else {
      currentMEI.getElementById(newNote.staffId).querySelector("layer").appendChild(newElem)
    }
  } else { // is newChord
    //TODO
    var newChord = newSound as NewChord
    newElem = convertToElement(newChord, currentMEI)
    var nearestElem = currentMEI.getElementById(newChord.nearestNoteId)
    // if (nearestElem?.tagName === "layer") {
    //   nearestElem.insertBefore(newElem, nearestElem.firstChild)
    var sibling: HTMLElement = currentMEI.getElementById(newChord.nearestNoteId);
    if (!sibling) return
    var parentLayer = sibling.closest("layer")
    var trueParent = sibling.parentElement
    var isTrueSibling = parentLayer == trueParent
    var trueSibling: HTMLElement = sibling;
    if (!isTrueSibling) {
      var currParent: HTMLElement = trueParent;
      while (!isTrueSibling) {
        trueSibling = currParent;
        currParent = currParent?.parentElement;
        isTrueSibling = currParent.tagName === "layer"
      }
    }

    if (replace) {
      let ms = Array.from(trueSibling.parentElement.querySelectorAll("note:not(chord note), chord, rest, mRest")) as Element[]

      if (newChord.relPosX === "left") {
        var measureSiblings = ms.filter((_, i) => i >= ms.indexOf(trueSibling))
        trueSibling.parentElement.insertBefore(newElem, trueSibling)
        changeDurationsInLayer(currentMEI, measureSiblings, newElem)
      } else {
        if (["clef"].every(el => trueSibling.nextElementSibling?.tagName !== el) && trueSibling.nextElementSibling !== null) {

          var measureSiblings = ms.filter((_, i) => i >= ms.indexOf(trueSibling.nextElementSibling))
          trueSibling.parentElement.insertBefore(newElem, trueSibling.nextElementSibling)

          changeDurationsInLayer(currentMEI, measureSiblings, newElem)
        } else {
          trueSibling.parentElement.insertBefore(newElem, trueSibling.nextElementSibling)
        }
      }
    } else if (newChord.relPosX === "left") {
      nearestElem.parentElement.insertBefore(newElem, currentMEI.getElementById(newChord.nearestNoteId))
    } else {
      nearestElem.parentElement.insertBefore(newElem, currentMEI.getElementById(newChord.nearestNoteId).nextSibling)
    }
  }

  // if measure overfills tie note to next measure
  var currentLayer = newElem.closest("layer")
  currentMEI = tieToNextMeasure(currentMEI, newElem, currMeiClone, replace, newSound)

  newElem = currentMEI.querySelector("#" + newElem.id)
  fillLayerWithRests(currentLayer, currentMEI)

  //reestablish beams
  beams?.forEach(b => {
    var first: Element
    var last: Element
    Array.from(b.children).forEach(bc => {
      var existingChild = currentMEI.querySelector("#" + bc.id)
      if (existingChild !== null) {
        if (first == undefined) {
          first = bc
        } else {
          last = bc
        }
      } else if (!first) {
        first = newElem
      }
    })
    if (!last) {
      last = newElem
    }

    if (first && last) {
      var newBeam = currentMEI.createElement("beam")
      newBeam.id = b.id
      var beamElements = currentMEI.querySelectorAll("#" + first.id + ", #" + first.id + "~ *:not(#" + last.id + "~ *)") // all elements in between first and last
      beamElements[0].insertAdjacentElement("beforebegin", newBeam)
      beamElements.forEach(be => {
        newBeam.append(be)
      })
    }
  })

  cleanUp(currentMEI)
  adjustAccids(currentMEI)
  currentMEI = meiConverter.restoreXmlIdTags(currentMEI)
  return currentMEI
}


/**
 * 
 * @param currentMEI MEI to be changed
 * @param newElem Element to tie to next measure
 * @param currMeiClone clone of the original MEI to compute ratios before anything was changed
 * @param replace replace flag, if addToMEI must be called again
 * @param newSound change parameters of newSound if it has to be shifted to the right
 */
function tieToNextMeasure(currentMEI: Document, newElem: Element, currMeiClone: Node, replace: Boolean, newSound: any) {
  var currentLayer = newElem.closest("layer")
  if (!overfillMeasure) {
    var newMeasureRatio = getAbsoluteRatio(newElem.closest("layer"))
    var measureRatio = getMeterRatioLocal(currMeiClone as Document, newElem)
    if (newMeasureRatio > measureRatio) {
      // Decide if next measure should be created and what should be added
      var lastElement = Array.from(currentLayer.querySelectorAll(":scope > :is(note, chord)")).reverse()[0]
      var lastElementRatio = getAbsoluteRatio(lastElement)
      var measureOverhead = newMeasureRatio - measureRatio
      var newRatio = lastElementRatio - measureOverhead
      if (newRatio > 0) {
        changeDur(lastElement, newRatio)
        // create new Element and if needed, new measure
        var splittedElement = lastElement.tagName === "note" ? convertToNewNote(lastElement) : convertToNewChord(lastElement)
        splittedElement.id = uuidv4()
        var newDur = ratioToDur(measureOverhead)
        splittedElement.dur = newDur[0].toString()
        splittedElement.dots = newDur[1].toString()
        if (currentLayer.closest("measure") === currentLayer.closest("section").lastElementChild) {
          addMeasure(currentMEI)
        }
        var newLayer = currentMEI.querySelector("measure[n='" + (parseInt(currentLayer.closest("measure").getAttribute("n")) + 1).toString() + "'] layer[n='" + currentLayer.getAttribute("n") + "']")
        splittedElement.nearestNoteId = newLayer.id
        splittedElement.staffId = newLayer.closest("staff").id
        splittedElement.relPosX = "left"
        addToMEI(splittedElement, currentMEI, replace)
        connectNotes(lastElement, currentMEI.querySelector("#" + splittedElement.id), "tie")
      } else if (newRatio == 0 && measureOverhead > 0) { // if the measure is perfectly fine and there should be no tie, modify the newsound (push it one position to the right) and compute again
        currentMEI = currMeiClone as Document
        if (currentLayer.closest("measure").nextElementSibling === null) { // add measure if there is none to extend into
          addMeasure(currentMEI)
        }
        if (newSound) {
          var cl = currentMEI.getElementById(currentLayer.id)
          newSound.nearestNoteId = cl.closest("measure").nextElementSibling.querySelector("staff[n='" + cl.closest("staff").getAttribute("n") + "'] layer[n='" + cl.getAttribute("n") + "'] :is(chord, note, rest, mRest)")?.id
          newSound.relPosX = "left"
          if (newSound.nearestNoteId !== null) {
            currentMEI = addToMEI(newSound, currentMEI, replace)
          }
        }
      }
    }
  }
  return currentMEI
}


/**
 * Check if notes have to be shifted after insertion
 * @param currentMEI  
 */
function checkInsertShifts(currentMEI: Document) {
  var staffDef: Element = currentMEI.getElementsByTagName("staffDef").item(0)
  var meterRatio: number = parseInt(staffDef.getAttribute(c._METERCOUNT_)) / parseInt(staffDef.getAttribute(c._METERUNIT_))
  if (staffDef.getAttribute(c._METERCOUNT_) !== null && staffDef.getAttribute(c._METERUNIT_) !== null) {
    meterRatio = parseInt(staffDef.getAttribute(c._METERCOUNT_)) / parseInt(staffDef.getAttribute(c._METERUNIT_))
  } else {
    meterRatio = extrapolateMeter(currentMEI)
  }
  var shifters: Array<Element> = new Array;
  var elements = currentMEI.getElementsByTagName("layer");
  Array.from(elements).forEach(layer => {
    var i = 0;
    var layerChildern = layer.querySelectorAll(countableNoteUnitSelector)
    Array.from(layerChildern).forEach(node => {
      i += getAbsoluteRatio(node)//1/parseInt(node.getAttribute("dur"))
      if (i > meterRatio) {
        shifters.push(node)
      }
    })
    if (shifters.length > 0) {
      doShiftRight(shifters, meterRatio, layer)
      shifters.length = 0;
      checkInsertShifts(currentMEI)
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
    if (parentMeasureSibling === null) {
      parentMeasureSibling = parentMeasure.parentElement.appendChild(createEmptyCopy(parentMeasure))
    }
    var layerLevel = element.closest("layer").getAttribute("n");
    var staffLevel = element.closest("staff").getAttribute("n")
    var targetStaff = parentMeasureSibling.querySelector("staff[n$='" + staffLevel + "'")
    var targetLayer: Element
    if (targetStaff.querySelector("layer[n$='" + layerLevel + "'") !== null) {
      targetLayer = targetStaff.querySelector("layer[n$='" + layerLevel + "'")
    } else {
      targetLayer = document.createElement("layer")
      targetLayer.setAttribute("id", "layer-" + uuidv4())
      targetLayer.setAttribute("n", layerLevel)
      targetStaff.appendChild(targetLayer)
    }
    var absLayerRatio: number = getAbsoluteRatio(currentLayer);
    var elementRatio = getAbsoluteRatio(element)

    var chunkDurRight = absLayerRatio - meterRatio
    var chunkDurLeft = elementRatio - chunkDurRight
    if (chunkDurRight > elementRatio) {
      chunkDurRight = elementRatio
      chunkDurLeft = 0
    }

    //check if note must be split
    if ((absLayerRatio + elementRatio) > meterRatio && chunkDurRight * chunkDurLeft !== 0) {
      //check for dots
      if (Number.isInteger(1 / chunkDurLeft) && Number.isInteger(1 / chunkDurRight)) {
        element.removeAttribute("dots")
        var splitRightElement = element.cloneNode(true) as Element;
        splitRightElement.setAttribute("id", uuidv4())
        splitRightElement.setAttribute("dur", (Math.abs(1 / chunkDurRight)).toString())
        var beforeElement = elementIdx === 0 ? targetLayer.firstChild : targetLayer.children.item(elementIdx)
        targetLayer.insertBefore(splitRightElement, beforeElement)
        //change already existing element
        element.setAttribute("dur", (Math.abs(1 / chunkDurLeft)).toString())
      } else {
        var dottedElements = splitDottedNote(element, chunkDurLeft, chunkDurRight)
        dottedElements.left.forEach(lel => currentLayer.appendChild(lel))
        var beforeElement = elementIdx === 0 ? targetLayer.firstChild : targetLayer.children.item(elementIdx)
        dottedElements.right.forEach(rel => {
          rel.setAttribute("id", uuidv4())
          if (rel.tagName === "chord") {
            rel.querySelectorAll("note").forEach(rl => {
              rl.setAttribute("id", uuidv4())
            })
          }
          targetLayer.insertBefore(rel, beforeElement)
        })
        element.remove()
      }
    } else {
      var beforeElement = elementIdx === 0 ? targetLayer.firstChild : targetLayer.children.item(elementIdx)
      targetLayer.insertBefore(element, beforeElement)
    }
  })
}

function createEmptyCopy(element: Element): Element {
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

export function connectNotes(left: Element, right: Element, connectionShape: "tie" | "slur") {
  var leftpname = left.getAttribute("pname")
  var leftoct = left.getAttribute("oct")
  var leftAccid = left.getAttribute("accid") || left.getAttribute("accid.ges")
  var rightpname = right.getAttribute("pname")
  var rightoct = right.getAttribute("oct")
  var rightAccid = right.getAttribute("accid") || right.getAttribute("accid.ges")
  if (!(leftpname === rightpname && leftoct === rightoct && leftAccid === rightAccid)) {
    connectionShape = "slur"
  }
  var currentMEI = left.getRootNode() as Document
  var connections = currentMEI.querySelectorAll("tie, slur")
  var deleted = false
  connections.forEach(c => {
    var sid = c.getAttribute("startid").replace("#", "")
    var eid = c.getAttribute("endid").replace("#", "")
    if (sid === left.id && eid === right.id) {
      c.remove()
      deleted = true
    }
  })
  if (!deleted) {
    var tieElement: Element = currentMEI.createElementNS(c._MEINS_, connectionShape)
    tieElement.setAttribute("startid", "#" + left.id)
    tieElement.setAttribute("endid", "#" + right.id)
    tieElement.setAttribute("id", uuidv4())
    currentMEI.getElementById(left.id).closest("measure").append(tieElement)
  }
}


///// GENERAL OPERATIONS /////

export function getAbsoluteRatio(el: Element): number {
  var i = 0;
  var arr: Array<Element>;

  if (el === null) {
    return 0
  }

  if (el.tagName !== "layer") { //if single Element is given, eg. chord, note
    arr = [el]
  } else {
    arr = Array.from(el.querySelectorAll(countableNoteUnitSelector))
  }

  arr.forEach(node => {
    i += 1 / parseInt(node.getAttribute("dur"))
    let baseDur: number = parseInt(node.getAttribute("dur"));
    if (node.getAttribute("dots") !== null) {
      let dots = parseInt(node.getAttribute("dots"))
      i += dots == 0 ? 0 : (dots * 2 - 1) / (baseDur * 2 * dots);
    }
  })

  return i;
}

function ratioToDur(ratio: number): Array<number> {
  var dur: number
  var dots: number = 0

  //1. next smallest ratio of basedur
  var basedur = 1
  while (basedur > ratio) {
    basedur = basedur / 2
  }
  dur = 1 / basedur
  ratio -= basedur

  if (ratio > 0) {
    if (ratio > dur / 2) {
      dots = 2
    } else {
      dots = 1
    }
  }

  return [dur, dots]
}

/**
 * Shift Elements to left (according to measure borders)
 * @param arr Array of Elements to shift
 * @param meterRatio meterRatio of the piece
 */
function doShiftLeft(arr: Array<Element>, meterRatio: number) {
  arr.forEach(element => {
    var parentMeasure = element.closest("measure")
    var parentMeasureSibling = parentMeasure.previousElementSibling;
    var layerLevel = element.closest("layer").getAttribute("n");
    var targetLayer = parentMeasureSibling.querySelector("layer[n$='" + layerLevel + "'") // should be <layer>
    var absLayerRatio: number = getAbsoluteRatio(targetLayer);
    var elementRatio = getAbsoluteRatio(element)
    //check if note must be split
    if ((absLayerRatio + elementRatio) > meterRatio) {
      var chunkDurLeft = meterRatio - absLayerRatio
      var chunkDurRight = elementRatio - chunkDurLeft

      //check for dots
      if (Number.isInteger(1 / chunkDurLeft) && Number.isInteger(1 / chunkDurRight)) {
        element.removeAttribute("dots")
        var splitLeftElement = element.cloneNode(true) as Element;
        splitLeftElement.setAttribute("id", uuidv4())
        splitLeftElement.setAttribute("dur", (Math.abs(1 / chunkDurLeft)).toString())
        targetLayer.appendChild(splitLeftElement)
        //change already existing element
        element.setAttribute("dur", (Math.abs(1 / chunkDurRight)).toString())
      } else {
        var elements = splitDottedNote(element, chunkDurLeft, chunkDurRight)
        elements.left.forEach(lel => {
          lel.setAttribute("id", uuidv4())
          if (lel.tagName === "chord") {
            lel.querySelectorAll("note").forEach(ll => {
              ll.setAttribute("id", uuidv4())
            })
          }
          targetLayer.appendChild(lel)
        })
        elements.right.forEach(rel => element.parentElement.insertBefore(rel, element))
        element.remove()
      }

    } else {
      targetLayer.appendChild(element)
      //is current Layer empty and should be deleted? if split occured this should not be the case
      var parentLayer = parentMeasure.querySelector("layer[n$='" + layerLevel + "'") // should always be <layer>
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
function splitDottedNote(note: Element, chunkLeftDur: number, chunkRightDur: number): { left: Array<Element>, right: Array<Element> } {

  let gcdLeft = gcd(chunkLeftDur)
  let gcdRight = gcd(chunkRightDur)

  let countLeftSubNotes = findDotsRecursive(chunkLeftDur, gcdLeft) //return z.B.: [8, 16]
  let countRightSubNotes = findDotsRecursive(chunkRightDur, gcdRight) //return z.B. [2, 8, 16]

  let newLeftElement = createElementsFromSubNotes(note, countLeftSubNotes)
  let newRightElement = createElementsFromSubNotes(note, countRightSubNotes)

  return { left: newLeftElement, right: newRightElement }
}

/**
 * Create actual XML Elements from sequence of dotted notes
 * @param note 
 * @param subNoteDurs 
 * @returns 
 */
function createElementsFromSubNotes(note: Element, subNoteDurs: Array<number>): Array<Element> {
  let newElements = new Array<Element>()
  //find sliceBoundaries in array
  let arraySliceIdx = new Array<number>();
  for (var i = 0; i < subNoteDurs.length; i++) {
    if (i > 0) {
      if (subNoteDurs[i] !== subNoteDurs[i - 1] * 2) {
        arraySliceIdx.push(i)
      }
    }
  }

  //find actual slices 
  let durSlices = new Array<Array<number>>()
  for (var i = 0; i < arraySliceIdx.length + 1; i++) {
    if (i === 0) {
      durSlices.push(subNoteDurs.slice(0, arraySliceIdx[i]))
    } else if (i === arraySliceIdx.length) {
      durSlices.push(subNoteDurs.slice(arraySliceIdx[i - 1]))
    } else {
      durSlices.push(subNoteDurs.slice(arraySliceIdx[i - 1], arraySliceIdx[i]))
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
      if (i > 0) { dots += 1 }
    })
    if (dots > 0) { newElement.setAttribute("dots", dots.toString()) }
    newElements.push(newElement)
  })

  return newElements
}

/**
 * Compute greatest integer divisor
 * @param chunkDur Duration of given Chunk
 * @returns 
 */
function gcd(chunkDur: number): number {
  var largestModulo = null;
  var baseValue = 1;
  var mod = 0
  while (largestModulo === null) {
    mod = chunkDur % baseValue
    if (mod === 0) {
      largestModulo = baseValue
    }
    baseValue = baseValue / 2
  }
  return largestModulo;
}

/**
 * Splits duration of given chunk into possible dotted sequences
 * @param chunk 
 * @param smallestUnit = greatest integer divisor
 * @returns 
 */
function findDotsRecursive(chunk: number, smallestUnit: number): Array<number> {
  var arr = new Array<number>();
  var sliceChunk = chunk / smallestUnit;
  if (Math.floor(sliceChunk) > 1) {
    arr = arr.concat(findDotsRecursive(chunk, smallestUnit * 2))
  } else if (Math.floor(sliceChunk) < 1) {
    arr = arr.concat(findDotsRecursive(chunk, smallestUnit / 2))
  } else if (!Number.isInteger(sliceChunk)) {
    arr.push(1 / 1 / smallestUnit)
    arr = arr.concat(findDotsRecursive(chunk - smallestUnit, smallestUnit))
  } else {
    arr.push(1 / 1 / smallestUnit)
  }
  return arr //.sort((a,b) => a-b)
}

/**
 * Extrapolates meter, if is not given in scoreDef. Iterates through each staff to get the mostly found ratio
 * @param currentMEI  
 * @returns meter ratio
 */
export function extrapolateMeter(currentMEI: Document): number {
  var ratioMap = new Map<number, number>();

  var xmlCopy = currentMEI.cloneNode(true) as Document;
  var layers = Array.from(xmlCopy.querySelectorAll("layer"))
  var mostlyUsedRatio = 0;
  layers.forEach(layer => {

    if (layer.childElementCount === 0) {
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

    var childElements = Array.from(layer.children);
    var ratio = 0;
    childElements.forEach(element => {
      ratio += getAbsoluteRatio(element)
    });

    if (!ratioMap.has(ratio)) {
      ratioMap.set(ratio, 1)
    } else {
      ratioMap.set(ratio, ratioMap.get(ratio) + 1)
    }

    var prevItCount = 0;
    for (const [key, value] of ratioMap.entries()) {
      if (value > prevItCount) {
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
 * @param currentMEI  
 * @returns 
 */
export function adjustAccids(currentMEI: Document): Document {

  var measureMatrix = new MeasureMatrix()
  measureMatrix.populateFromMEI(currentMEI)
  var prevAccidMap = new Map<string, string>() // key: pname+oct
  var currentLayer = "1"
  var currentStaff = "1"
  var currentMeasure = "1"

  currentMEI.querySelectorAll("note").forEach(note => {
    var layerN = note.closest("layer").getAttribute("n")
    var staffN = note.closest("staff").getAttribute("n")
    var measureN = note.closest("measure").getAttribute("n")

    if (layerN !== currentLayer || staffN !== currentStaff || measureN !== currentMeasure) {
      prevAccidMap = new Map<string, string>() // key: pname+oct
      currentLayer = layerN
      currentStaff = staffN
      currentMeasure = measureN
    }

    var sig = measureMatrix.get(measureN, staffN).keysig
    var sigSymbol = sig.charAt(1)
    var signedNotes = keysigToNotes.get(sig)
    var accid = note.getAttribute("accid") || note.getAttribute("accid.ges")
    accid = accid === "n" || accid === "" ? null : accid

    // remove all accids so I don't have to look it up several times
    note.removeAttribute("accid")
    note.removeAttribute("accid.ges")

    var pname = note.getAttribute("pname")
    var oct = note.getAttribute("oct")
    var mapKey = pname + oct
    var noteInKey = signedNotes.some(sn => sn === pname)

    if (accid === null) { // "I have no accid"
      accid = "n"
      if (prevAccidMap.has(mapKey)) { // "does someone before me has any accid?"
        if (prevAccidMap.get(mapKey) === "n") {
          prevAccidMap.delete(mapKey)
        } else {
          note.setAttribute("accid", accid)
          prevAccidMap.set(mapKey, accid)
        }
      } else if (noteInKey) {
        note.setAttribute("accid", accid)
        prevAccidMap.set(mapKey, accid)
      }
    } else { // "I have accid" 
      if (prevAccidMap.has(mapKey)) {
        if (prevAccidMap.get(mapKey) === accid) {
          note.setAttribute("accid.ges", accid)
          prevAccidMap.set(mapKey, accid)
        } else {
          note.setAttribute("accid", accid)
          prevAccidMap.set(mapKey, accid)
        }
      } else {
        if (noteInKey) {
          if (sigSymbol === accid) {
            if (prevAccidMap.has(mapKey)) {
              if (prevAccidMap.get(mapKey) === accid) {
                note.setAttribute("accid.ges", accid)
                prevAccidMap.set(mapKey, accid)
              } else {
                note.setAttribute("accid", accid)
                prevAccidMap.set(mapKey, accid)
              }
            } else {
              if (sigSymbol === accid) {
                note.setAttribute("accid.ges", accid)
                prevAccidMap.set(mapKey, accid)
              } else {
                note.setAttribute("accid", accid)
                prevAccidMap.set(mapKey, accid)
              }
            }
          } else {
            note.setAttribute("accid", accid)
            prevAccidMap.set(mapKey, accid)
          }
        } else {
          note.setAttribute("accid", accid)
          prevAccidMap.set(mapKey, accid)
        }
      }
    }
  })
  return currentMEI
}

/**
 * Merge all scoreDefs in sections in the respective layers, e.g. when importing a file.
 * This is important since MeasureMartrix only handles signature elements (keySig, meterSig, clef) in layers
 * @param currentMEI 
 */
export function mergeSectionScoreDefToLayer(currentMEI: string | Document) {
  var mei: Document
  if (typeof currentMEI === "string") {
    mei = new DOMParser().parseFromString(currentMEI as string, "text/xml")
  } else {
    mei = currentMEI
  }
  mei.querySelectorAll("section").forEach(sec => {
    var secChildren = sec.querySelectorAll(":scope > *")
    secChildren.forEach((e, i) => {
      if (e.tagName === "scoreDef") {
        secChildren[i + 1].querySelectorAll("layer").forEach(layer => {
          e.querySelectorAll(":scope > *").forEach(sig => {
            var newElem = sig.cloneNode(true)
            layer.prepend(newElem)
          })
        })
      }
    })
    sec.querySelectorAll(":scope > scoreDef").forEach(sd => sd.remove())
  })

  return mei
}

export function mergeArticToParent(currentMEI: Document) {
  currentMEI.querySelectorAll("artic").forEach(a => {
    a.parentElement.setAttribute("artic", a.getAttribute("artic"))
    a.remove()
  })
  return currentMEI
}

/**
 * Transpose marked notes according to direcion (up or down)
 * @param currentMEI  
 * @param direction 
 * @returns 
 */
export function transposeByStep(currentMEI: Document, direction: string): Document {
  //document.querySelectorAll(".activeContainer #vrvSVG :is(.note.marked, .note.lastAdded)").forEach(nm => {
  document.querySelectorAll(".activeContainer :is(.note.marked, .note.lastAdded)").forEach(nm => {
    if (nm.id === null || nm.id == undefined || nm.id === "") return // make shure that only the id is taken from the verovio svg so that the element will only be effected once
    var id = nm.id
    var noteMEI = currentMEI.getElementById(id)
    var pname = noteMEI.getAttribute("pname")
    var oct = parseInt(noteMEI.getAttribute("oct"))
    var accid = noteMEI.getAttribute("accid") || noteMEI.getAttribute("accid.ges")
    if (accid === null || typeof accid == "undefined" || accid === "n") {
      accid = ""
    }

    var nextNote: string
    if (direction === "up") {
      nextNote = nextStepUp.get(pname + accid)
    } else if (direction === "down") {
      nextNote = nextStepDown.get(pname + accid)
    }

    noteMEI.setAttribute("pname", nextNote.charAt(0))
    if (nextNote.charAt(1) !== "") {
      noteMEI.setAttribute("accid", nextNote.charAt(1))
    } else {
      noteMEI.removeAttribute("accid")
      noteMEI.removeAttribute("accid.ges")
    }

    //Change Octave
    if (["c", "cf"].includes(pname + accid) && direction === "down") {
      noteMEI.setAttribute("oct", (oct - 1).toString())
    }
    if (["b", "bs"].includes(pname + accid) && direction === "up") {
      noteMEI.setAttribute("oct", (oct + 1).toString())
    }
  })
  return adjustAccids(currentMEI)
}

/**
 * Change Meter according to #timeUnit and #timeCount in side bar option. 
 * @param currentMEI  
 * @returns changed mei; null, if input has no valid values
 */
export function changeMeter(currentMEI: Document): Document {
  var timeCount = document.querySelector(".activeElement #timeCount")
  var timeUnit = document.querySelector(".activeElement #timeUnit")

  //@ts-ignore
  var timeCountValue = timeCount.value //getAttribute("value")
  //@ts-ignore
  var timeUnitValue = timeUnit.value //getAttribute("value")

  if (timeCountValue !== null && timeUnitValue !== null) {
    timeCountValue = timeCountValue.trim()
    timeUnitValue = timeUnitValue.trim()

    if (!isNaN(parseInt(timeCountValue)) && !isNaN(parseInt(timeUnitValue))) {
      var oldMeterRatio = getMeterRatioGlobal(currentMEI)
      currentMEI.querySelectorAll("staffDef").forEach(sd => {
        sd.setAttribute("meter.count", timeCountValue)
        sd.setAttribute("meter.unit", timeUnitValue)
      })

      // adjust noteposition 
      var newMeterRatio = getMeterRatioGlobal(currentMEI)
      if (oldMeterRatio > newMeterRatio) {
        checkInsertShifts(currentMEI)
      } else if (oldMeterRatio < newMeterRatio) {
        checkDeleteShifts(currentMEI)
      }
      if (oldMeterRatio !== newMeterRatio) {
        return currentMEI
      }
    }
  }

  return currentMEI  //null  
}

/**
 * disable features if necesseray (only supposed to be used for debugging)
 * @param features Array of TagNames and AttributeNames which have to be disabled (deleted)
 * @param currentMEI  mei
 * @returns 
 */
export function disableFeatures(features: Array<string>, currentMEI: Document) {
  //console.log("Features disabled:", features)
  features.forEach(f => {

    var elements = Array.from(currentMEI.getElementsByTagName(f))
    elements.forEach(e => {
      let parent = e.parentElement
      e.remove()
      if (parent.childElementCount === 0) {
        parent.remove()
      }
    })

    elements = Array.from(currentMEI.querySelectorAll("*[" + f + "]"))
    elements.forEach(e => {
      let parent = e.parentElement
      e.remove()
      if (parent.childElementCount === 0) {
        parent.remove()
      }
    })

  })

  return currentMEI
}

/**
 * When a note is shortened, fill old remaining duration with rests
 * @param newElement 
 * @param oldElement 
 * @param currentMEI  
 */
export function fillWithRests(newElement: Element, oldElement: Element, currentMEI: Document): Document {
  var newRatio = getAbsoluteRatio(newElement)
  var oldRatio = getAbsoluteRatio(oldElement)
  if (newRatio < oldRatio) {
    var remainRatio = oldRatio - newRatio
    var smallestUnit = gcd(remainRatio)
    var restDur = ratioToDur(smallestUnit)[0]
    var restCount = remainRatio / smallestUnit

    newElement.classList.add("changed")
    for (var i = 0; i < restCount; i++) {
      var rest = createNewRestElement(restDur)
      currentMEI.getElementById(newElement.id).parentElement.insertBefore(rest, newElement.nextElementSibling)
    }

  }

  return currentMEI
}

export function fillLayerWithRests(layer: Element, currentMEI: Document) {
  var targetDur = getMeterRatioLocal(currentMEI, layer)
  var currentDur = getAbsoluteRatio(layer)
  if (currentDur < targetDur) {
    var remainRatio = targetDur - currentDur
    var smallestUnit = gcd(remainRatio)
    var restDur = ratioToDur(smallestUnit)[0]
    var restCount = remainRatio / smallestUnit

    for (var i = 0; i < restCount; i++) {
      var rest = createNewRestElement(restDur)
      Array.from(layer.querySelectorAll("note, chord, rest")).reverse()[0].insertAdjacentElement("afterend", rest)
    }
  }
}


/**
 * Fill Empty Space with rest
 * @deprecated
 * @param currentMEI  
 */
function _fillWithRests(currentMEI: Document) {
  var staffDef = currentMEI.getElementsByTagName("staffDef").item(0)
  var meterCount: string
  var meterUnit: string
  var meterRatio: number
  if (staffDef.getAttribute(c._METERCOUNT_) !== null && staffDef.getAttribute(c._METERUNIT_) !== null) {
    meterCount = staffDef.getAttribute(c._METERCOUNT_)
    meterUnit = staffDef.getAttribute(c._METERUNIT_)
    meterRatio = parseInt(meterCount) / parseInt(meterUnit)
  } else {
    var meterRatio = getMeterRatioGlobal(currentMEI)
    meterCount = (meterRatio * 4).toString()
    meterUnit = "4"
  }

  currentMEI.querySelectorAll("measure").forEach(m => {
    m.querySelectorAll("staff").forEach(s => {
      s.querySelectorAll("layer").forEach((l, idx) => {
        //mRest for empty Layer
        if (l.childElementCount === 0) {
          if (idx === 0) {
            var restEl = document.createElementNS(c._MEINS_, "mRest")
            l.appendChild(restEl)
          } else { // remove 1+ empty layer
            l.remove()
          }
        } else {
          var actualMeterFill = getAbsoluteRatio(l)
          var ratioDiff = Math.abs(actualMeterFill - meterRatio)
          var smallestValue = gcd(ratioDiff)
          //var restDurs = findDotsRecursive(ratioDiff, gcd(ratioDiff))
          if (Number.isInteger(ratioDiff / smallestValue) && ratioDiff > 0) {
            var leftRatio = ratioDiff
            var durArr = new Array<number>()
            while (!Number.isInteger(1 / leftRatio)) {
              var leftRatio = ratioDiff - smallestValue
              durArr.push(1 / smallestValue)
            }
            durArr.push(1 / leftRatio)
            durArr = durArr.reverse()
            durArr.forEach(dur => {
              var newRest = currentMEI.createElementNS(c._MEINS_, "rest")
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
 * @param currentMEI  
 */

function replaceWithRest(element: Element, currentMEI: Document) {
  var elmei: Element = currentMEI.getElementById(element.id)
  //var closestChord: Element = currentMEI .getElementById(element.id).closest("chord")
  //if(closestChord !== null){elmei = closestChord}
  var dur = elmei.getAttribute("dur")
  var dots = elmei.getAttribute("dots")
  var newRest = currentMEI.createElementNS(c._MEINS_, "rest")
  newRest.setAttribute("dur", dur)
  if (dots !== null) { newRest.setAttribute("dots", dots) }
  elmei.parentElement.insertBefore(newRest, elmei)
  elmei.remove()
}

function addRatios(elements: Element[]): number {
  var r = 0
  elements.forEach((v, i) => {
    //if(i > 0){
    r += getAbsoluteRatio(v)
    //}
  })
  return r
}

/**
 * 
 * @param currentMEI current used MEI to be changed
 * @param additionalElements elements which duration has to be changed which occur after the refElement in the same layer
 * @param refElement actual current Element which will be changed in duration
 * @param remainRatio remaining ratio of the current layer
 * @param meiToReset MEI which can be used to reset the whole process
 * @returns 
 */
export function changeDurationsInLayer(currentMEI: Document, additionalElements: Array<Element> = new Array(), refElement: Element = null, remainRatio: number = null, meiToReset: Document = null): Document {
  var meiCopy = meiToReset || currentMEI.cloneNode(true) as Document

  let ms = Array.from(refElement.parentElement.querySelectorAll("note:not(chord note), chord, rest")) as Element[] // querySelectorAll("note:not(chord note), chord, beam, rest")
  var measureSiblings = ms.filter((_, i) => i <= ms.indexOf(refElement))

  var ratioUpTpRef = addRatios(measureSiblings)
  var refElementRatio = getAbsoluteRatio(refElement)
  var remainBarRatio = getMeterRatioLocal(currentMEI, refElement) - ratioUpTpRef

  if (getAbsoluteRatio(refElement.parentElement) === getMeterRatioLocal(currentMEI, refElement)) { // bar has right size, 
    return currentMEI
  }

  if (additionalElements.length > 0) {
    var nextNote = additionalElements.shift()
    var nnRatio = getAbsoluteRatio(nextNote)
    remainRatio = remainRatio || refElementRatio
    var currEl: Element
    var harm: Element

    if (remainRatio < nnRatio) {
      var diffRatio = nnRatio - remainRatio
      var nextNoteMEI = currentMEI.getElementById(nextNote.id)
      changeDur(nextNoteMEI, diffRatio)
      harm = currentMEI.querySelector('harm[startid="' + nextNote.id + '"]')
      if (harm !== null) {
        harm.setAttribute("startid", refElement.id)
      }
    } else if (remainRatio === nnRatio) {
      currEl = currentMEI.getElementById(nextNote.id)
      harm = currentMEI.querySelector('harm[startid="' + nextNote.id + '"]')
      //if(currEl.tagName === "rest" && harm !== null){
      if (harm !== null) {
        harm.setAttribute("startid", refElement.id)
      }
      currEl.remove()

    } else {
      currEl = currentMEI.getElementById(nextNote.id)
      harm = currentMEI.querySelector('harm[startid="' + nextNote.id + '"]')
      //if(currEl.tagName === "rest" && harm !== null){
      if (harm !== null) {
        harm.setAttribute("startid", refElement.id)
      }
      remainRatio = remainRatio - nnRatio
      currEl.remove()
      changeDurationsInLayer(currentMEI, additionalElements, refElement, remainRatio, meiCopy)
    }
  } else {
    currentMEI = tieToNextMeasure(currentMEI, refElement, currentMEI.cloneNode(true), true, null)
  }

  cleanUp(currentMEI)
  return currentMEI
}

/**
 * Change duration attributes for given Element for the given ratio.
 * Will also change dot attribute if necessary
 * @param element 
 * @param ratio 
 */
export function changeDur(element: Element, ratio: number) {
  var dur = ratioToDur(ratio)
  element.setAttribute("dur", dur.shift().toString())
  if (dur.length > 0) {
    element.setAttribute("dots", dur.shift().toString())
  }
}

/**
 * Check if elment is overfilling the current layer element. Must provide previous MEI for reference.
 * Violate rule: true; follow rules: false
 * @param element 
 * @param currMeiClone 
 * @returns 
 */
export function elementIsOverfilling(element: Element, currMeiClone: Document): Boolean {
  if (!overfillMeasure) {
    var newMeasureRatio = getAbsoluteRatio(element.closest("layer"))
    var localRatio = getMeterRatioLocal(currMeiClone, element)
    if (newMeasureRatio > localRatio) { //getMeterRatioGlobal(currMeiClone)){
      return true
    }
  }
  return false
}


/**
 * Clean up mei after changing values
 * @param currentMEI  
 */
export function cleanUp(currentMEI: Document) {
  deleteDefSequences(currentMEI)
  reorganizeBeams(currentMEI)
  removeEmptyElements(currentMEI)
  adjustRests(currentMEI)
  redistributeHarms(currentMEI)
  reformatBreve(currentMEI)
}


/**
 * Delete all redundant definition sequences in staffDefs and layers
 * @param currentMEI  
 */
function deleteDefSequences(currentMEI: Document) {
  var staffCount = currentMEI.querySelectorAll("staffDef").length
  for (var i = 0; i < staffCount; i++) {
    var n = (i + 1).toString()
    var prevElement = null
    var prevShape = null
    var prevLine = null
    currentMEI.querySelectorAll("staffDef[n=\"" + n + "\"] clef, staff[n=\"" + n + "\"] clef").forEach(clefElement => {
      var shape = clefElement.getAttribute("shape")
      var line = clefElement.getAttribute("line")
      if (prevElement != null) {
        prevShape = prevElement.getAttribute("shape")
        prevLine = prevElement.getAttribute("line")
        if (prevShape === shape && prevLine === line) {
          clefElement.remove()
        } else {
          prevElement = clefElement
        }
      } else {
        prevElement = clefElement
      }
    })

    prevElement = null
    var prevSig = null
    currentMEI.querySelectorAll("staffDef[n=\"" + n + "\"] keySig, staff[n=\"" + n + "\"] keySig").forEach(sigElement => {
      var sig = sigElement.getAttribute("sig")
      if (prevElement != null) {
        prevSig = prevElement.getAttribute("sig")
        if (prevSig === sig) {
          sigElement.remove()
        } else {
          prevElement = sigElement
        }
      } else {
        prevElement = sigElement
      }
    })

    prevElement = null
    currentMEI.querySelectorAll("staffDef[n=\"" + n + "\"] meterSig, staff[n=\"" + n + "\"] meterSig").forEach(meterElement => {
      var count = meterElement.getAttribute("count")
      var unit = meterElement.getAttribute("unit")
      if (prevElement != null) {
        var lastCount = prevElement.getAttribute("count")
        var lastUnit = prevElement.getAttribute("unit")
        if (lastCount === count && lastUnit === unit) {
          meterElement.remove()
        } else {
          prevElement = meterElement
        }
      } else {
        prevElement = meterElement
      }
    })
  }
}

function reorganizeBeams(currentMEI: Document) {
  // if beams have elements, which shouldn be there
  currentMEI.querySelectorAll("beam").forEach(b => {
    var beamNotes = Array.from(b.children)
    if (!beamNotes.every(c => parseInt(c.getAttribute("dur")) >= 8) && beamNotes.length > 0) {
      beamNotes.forEach(n => {
        if (parseInt(n.getAttribute("dur")) >= 8) {
          if (n.previousElementSibling !== null) {
            if (n.previousElementSibling.tagName === "beam") { // check for previous beams to merge with
              n.previousElementSibling.appendChild(n)
            }
          } else {// else make new beam
            var newBeam = currentMEI.createElementNS(c._MEINS_, "beam")
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
 * After manipulating elements in the score, some elements could be empty
 * @param currentMEI  
 */
function removeEmptyElements(currentMEI: Document) {

  Array.from(currentMEI.querySelectorAll("beam")).forEach(b => {
    if (b.childElementCount === 0) {
      currentMEI.getElementById(b.id)?.remove()
    }
    if (b.childElementCount === 1) {
      //b.parentElement.insertBefore(b, b.firstChild)
      //b.remove()
      b.outerHTML = b.innerHTML
    }
    var bArr = Array.from(b.children)
    if (bArr.every(c => c.tagName === "rest") && bArr.length > 0) {
      // Array.from(b.children).forEach(c => {
      //   b.parentElement.insertBefore(c, b)
      // })
      // b.remove()
      b.outerHTML = b.innerHTML
    }

    // Avoids that unvalid rests will be displayed as double full notes
    Array.from(currentMEI.querySelectorAll("rest")).forEach(r => {
      if (r.getAttribute("dur") === "0" || r.getAttribute("dur") === null) {
        r.removeAttribute("dur")
        r.removeAttribute("dots")
        r.outerHTML = r.outerHTML.replace("rest>", "mRest>")
      }
    })

    Array.from(currentMEI.querySelectorAll("*[xmlns]")).forEach(x => {
      var attr = x.getAttribute("xmlns")
      if (attr === "" || attr === null || attr == undefined) {
        x.removeAttribute("xmlns")
      }
    })

  })

  // allow no empty and rest-note element chord elements
  Array.from(currentMEI.querySelectorAll("chord")).forEach(c => {
    if (c.childElementCount === 0) { currentMEI.getElementById(c.id).remove() }
    else if (c.childElementCount === 1) { c.outerHTML = c.innerHTML }
    else if (c.childElementCount === 2 && c.querySelector("rest") !== null && c.querySelector("note") !== null) {
      c.querySelector("note").setAttribute("dur", c.getAttribute("dur"))
      c.querySelector("rest").remove()
      c.outerHTML = c.innerHTML
    }
  })

  // Empty harms could be somewhere
  Array.from(currentMEI.querySelectorAll("harm")).forEach(h => {
    if (h.childElementCount > 0) {
      if (h.firstElementChild.childElementCount === 0) h.remove()
    } else if (h.textContent === "") {
      h.remove()
    }

  })

  // remove all xmlns since they are someties empty and also are not parsable sometimes
  Array.from(currentMEI.querySelectorAll("*")).forEach(el => {
    if (el.tagName.toLowerCase() === "xml") return
    el.removeAttribute("xmlns")
  })



  // Array.from(currentMEI .querySelectorAll("measure")).forEach(m => {
  //   if(m.querySelectorAll("note, chord").length === 0){
  //     currentMEI .getElementById(m.id).remove()
  //   }
  // })
}

/**
 * Apply some additional rules for rests, Elements where added
 * @param currentMEI  
 */
function adjustRests(currentMEI: Document) {
  //mRest and any Element with dur attribute are not allowed in the same layer
  currentMEI.querySelectorAll("layer").forEach(l => {
    var hasAnyDurAttributes = l.querySelectorAll("*[dur]").length > 0
    var hasTags = l.querySelectorAll("clef, keySig").length > 0
    var hasMrest = l.querySelectorAll("mRest").length > 0
    if (l.children.length === 0 || (hasTags && !hasAnyDurAttributes && !hasMrest)) {
      //no layer should be empty, has at least an mRest (therefore: mRests are virtually not deletable)
      var newMrest = new MeiTemplate().createMRest()
      l.append(newMrest)
    } else {
      Array.from(l.children).forEach(cn => {
        if (cn.tagName === "mRest" && hasAnyDurAttributes) {
          cn.remove()
        }
      })
    }
  })
}

/**
 * Give harm new start id if related note was included in chord during process
 * @param currentMEI 
 */
function redistributeHarms(currentMEI: Document) {
  currentMEI.querySelectorAll("harm").forEach(h => {
    var startid = h.getAttribute("startid")
    if (startid !== null) {
      var note = currentMEI.getElementById(startid)
      if (note?.parentElement.tagName === "chord") h.setAttribute("startid", note.parentElement.id)
    }
  })
}

/**
 * Remove tie from all layers if length of layer exceeds global Ratio
 * @param currentMEI  
 */
function removeTiesFromDoc(currentMEI: Document) {
  var globalRatio = getMeterRatioGlobal(currentMEI)
  currentMEI.querySelectorAll("layer").forEach(l => {
    var layerRatio = getAbsoluteRatio(l)
    if (layerRatio > globalRatio) {
      var m = l.closest("measure")
      m.querySelectorAll("tie").forEach(t => {
        l.querySelector(t.getAttribute("endid"))?.remove()
        t.remove()
      })
    }
  })
}

function reformatBreve(currentMEI: Document) {
  currentMEI.querySelectorAll("[dur='0.5']").forEach(d => d.setAttribute("dur", "breve"))
}

export function addMeasure(currentMEI: Document) {
  var lastMeasure = Array.from(currentMEI.querySelectorAll("measure")).reverse()[0]
  var staffCounts: number[] = Array.from(lastMeasure.querySelectorAll("staff")).map(s => { return parseInt(s.getAttribute("n")) })
  var staffCount = Math.max.apply(Math, staffCounts)
  var layerCounts: number[] = Array.from(lastMeasure.querySelectorAll("layer")).map(s => { return parseInt(s.getAttribute("n")) })
  var layerCount = Math.max.apply(Math, layerCounts)
  var newMeasure: Element = new MeiTemplate().createMeasure(1, staffCount, layerCount) as Element
  lastMeasure.parentElement.append(newMeasure)
  var i = 1
  currentMEI.querySelectorAll("measure").forEach(m => {
    m.setAttribute("n", i.toString())
    i++
  })
  newMeasure.setAttribute("id", uuidv4())
  newMeasure.querySelectorAll("*").forEach(el => {
    if (el.id === null || el.id === "") {
      el.setAttribute("id", uuidv4())
    }
  })
  cleanUp(currentMEI)
}

export function removeMeasure(currentMEI: Document) {
  var measures = Array.from(currentMEI.querySelectorAll("measure")).reverse()
  if (measures.length > 1) {
    measures[0].remove()
  } else {
    measures[0].querySelectorAll("layer").forEach(l => {
      l.innerHTML = ""
      l.appendChild(currentMEI.createElement("mRest"))
    })
  }
  cleanUp(currentMEI)
}

export function addStaff(currentMEI: Document, referenceStaff: Element, relPos: string) {
  var staffNum = referenceStaff.getAttribute("n")
  var refn: string
  var refElement: Element
  currentMEI.querySelectorAll("staff[n=\"" + staffNum + "\"]").forEach(s => {
    var layers = s.querySelectorAll("layer")
    var newStaff = new MeiTemplate().createStaff(1, 1) as Element
    switch (relPos) {
      case "above":
        refElement = s
        break;
      case "below":
        refElement = s.nextElementSibling || s
        break;
      default:
        console.error(relPos, " was never an option")
    }
    if (relPos === "below" && refElement === s) { // => new staff at the end
      s.parentElement.append(newStaff)
    } else {
      s.parentElement.insertBefore(newStaff, refElement)
    }

    //copy elements from the current Staff that have to appear in new staff
    var newLayer = newStaff.querySelector("layer")
    var copyMeter = s.querySelector("meterSig")?.cloneNode(true)
    if (copyMeter) {
      newLayer.insertBefore(copyMeter, newLayer.firstChild)
    }

    refn = refElement?.getAttribute("n") || staffNum // s.getAttribute("n")
  })

  //new StaffDef
  var refStaffDef = currentMEI.querySelector("staffDef[n=\"" + refn + "\"]")
  var refCopy = refStaffDef.cloneNode(true) as Document
  refCopy.querySelectorAll("*[id]").forEach(i => {
    i.removeAttribute("id")
  })
  refStaffDef.parentElement.insertBefore(refCopy, refStaffDef)


  currentMEI.querySelectorAll("measure").forEach(m => {
    var i = 1
    m.querySelectorAll("staff").forEach(s => {
      s.setAttribute("n", i.toString())
      i++
    })
  })
  var i = 1
  currentMEI.querySelectorAll("staffDef").forEach(sd => {
    sd.setAttribute("n", i.toString())
    i++
  })
  cleanUp(currentMEI)
}

export function removeStaff(currentMEI: Document, referenceStaff: Element, relPos: string) {
  var staff = currentMEI.getElementById(referenceStaff.id)
  var staffNum = staff.getAttribute("n")
  var refn: string
  currentMEI.querySelectorAll("staff[n=\"" + staffNum + "\"]").forEach(s => {
    switch (relPos) {
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

  currentMEI.querySelector("staffDef[n=\"" + refn + "\"]").remove()

  currentMEI.querySelectorAll("measure").forEach(m => {
    var i = 1
    m.querySelectorAll("staff").forEach(s => {
      s.setAttribute("n", i.toString())
      i++
    })
  })
  var i = 1
  currentMEI.querySelectorAll("staffDef").forEach(sd => {
    sd.setAttribute("n", i.toString())
    i++
  })
  cleanUp(currentMEI)
}


export function addLayerForStaff(currentMEI: Document, staffN: string, layerN: string) {
  currentMEI.querySelectorAll(`staff[n='${staffN}']`).forEach(staff => {
    staff.append(new MeiTemplate().createLayer(layerN))
  })
}

/**
 * Create a tuplet out of given Elements.
 * Tuplet duration and kind will be derived from number and attributes of the given notes.
 * E.g.: Selecting 3 Notes will make a triplet, 4 Notes will make a quadruplet, etc. The after the tuplet the missing durations will be added as rests
 * @param meiElements 
 */
export function createTuplet(meiElements: Array<Element>, currentMEI: Document) {
  meiElements = meiElements.filter(me => {
    if (me != undefined) {
      return me.getAttribute("dur") !== null
    }
    return
  })
  console.log("create tuplets:", meiElements)
  var arrCopy = [...meiElements]
  var minDurElement = arrCopy.sort((a, b) => parseFloat(b.getAttribute("dur")) - parseFloat(a.getAttribute("dur")))[0]
  var ratioTotal = 0
  meiElements.forEach(me => ratioTotal += getAbsoluteRatio(me))
  var ratioMinElement = getAbsoluteRatio(minDurElement)
  var numMinNotes = (ratioTotal / ratioMinElement)
  var numTarget = numMinNotes - 1
  var ratio = numTarget * getAbsoluteRatio(minDurElement)
  var [dur, dots] = ratioToDur(ratio)

  var tuplet = currentMEI.createElement("tuplet")
  tuplet.setAttribute("dur", dur.toString())
  if (dots > 0) {
    tuplet.setAttribute("dots.ges", dots.toString())
  }
  tuplet.setAttribute("num", numMinNotes.toString())
  tuplet.setAttribute("numbase", numTarget.toString())
  currentMEI.querySelector("#" + meiElements[0].id).insertAdjacentElement("beforebegin", tuplet)
  meiElements.forEach(me => tuplet.append(me))

  // fill missing values with rest
  var [durRest, dotsRest] = ratioToDur((numMinNotes * getAbsoluteRatio(minDurElement)) - ratio)
  if (ratio < 1) {
    if (durRest > 0) {
      var rest = currentMEI.createElement("rest")
      rest.setAttribute("id", uuidv4())
      rest.setAttribute("dur", durRest.toString())
      if (dotsRest > 0) {
        rest.setAttribute("dots", dotsRest.toString())
      }
      tuplet.insertAdjacentElement("afterend", rest)
    }
  }
}

/**
 * Paste copied ids. First position to which the Elements are copied is the Element according to the refId (= RefElement).
 * If multiple staffs are copied, overhanging staffs will be pasted to the staffs below the staff of the RefElement, if definedstaffs exist. 
 * Else these copiedId will be not pasted.
 * @param ids Array of Element IDs to be pasted
 * @param pastePosition 
 */
export function paste(ids: Array<string>, pastePosition: string, currentMEI: Document): Array<any> {
  //ordered by staff
  var meiElements = new Array<Array<Element>>()
  ids.forEach(id => {
    var el = currentMEI.getElementById(id)
    //order copiable elements by staff
    if (["CHORD", "NOTE", "REST"].includes(el?.tagName.toUpperCase())) {
      if (!(el.tagName.toUpperCase() === "NOTE" && el.closest("chord") !== null)) {
        var staff = el.closest("staff")
        var num = parseInt(staff.getAttribute("n")) - 1
        if (meiElements[num] == undefined) {
          meiElements[num] = new Array()
        }
        var cel = el.cloneNode(true) as Element
        cel.setAttribute("id", uuidv4())
        meiElements[num].push(cel)
      }
    }
  })

  var refElement = currentMEI.getElementById(pastePosition) as Element
  refElement = refElement?.closest("chord") || refElement
  var refStaff = refElement?.closest("staff")
  var refLayer = refElement?.closest("layer")
  var refMeasure = refElement?.closest("measure")
  var currentMeasure: Element
  var anyNew

  //console.log(...meiElements)

  meiElements.forEach((staff, staffIdx) => {
    if (!refElement) return
    currentMeasure = refElement.closest("measure")
    staff.forEach((element, elementIdx) => {
      if (["NOTE", "REST"].includes(element.tagName.toUpperCase())) {
        const newNote = convertToNewNote(element)
        newNote.nearestNoteId = refElement.id
        newNote.relPosX = elementIdx === 0 ? "left" : "right" // make sure to replace the element on the pasteposition
        anyNew = newNote
      } else if (element.tagName.toUpperCase() === "CHORD") {
        const newChord = convertToNewChord(element)
        newChord.nearestNoteId = refElement.id
        newChord.relPosX = elementIdx === 0 ? "left" : "right" // make sure to replace the element on the pasteposition
        anyNew = newChord
        var elementArr = Array.from(element.querySelectorAll("note"))
      }
      const replace = (document.querySelector(".activeContainer")?.querySelector("#insertToggle") as HTMLInputElement)?.checked || true
      currentMEI = addToMEI(anyNew, meiConverter.cleanIdAttr(currentMEI), replace)

      refElement = convertToElement(anyNew, currentMEI) //element
    })

    //when changing next staff, refElement musst be staff + 1
    var targetStaffN = (parseInt(currentMEI.getElementById(refElement.id)?.closest("staff")?.getAttribute("n")) + 1)?.toString()
    var refLayerN = currentMEI.getElementById(refElement.id)?.closest("layer")?.getAttribute("n")
    var refMeasureN = currentMEI.getElementById(refElement.id)?.closest("measure")?.getAttribute("n")
    refElement = currentMEI.querySelector("measure[n=\"" + refMeasureN + "\"] > staff[n=\"" + targetStaffN + "\"] > layer[n=\"" + refLayerN + "\"]")

  })

  //Element gets replaced in all other modes except keymode/textmode
  if (!document.querySelector(".activeContainer").classList.contains("textmode") && currentMEI.getElementById(pastePosition)?.tagName !== "LAYER") {
    removeFromMEI([currentMEI.getElementById(pastePosition)], currentMEI)
  }

  return [currentMEI, anyNew?.id]
}

/**
 * Replace clef in main/ first score definition
 * @param targetid 
 * @param newClef 
 * @param currentMEI 
 * @returns 
 */
export function replaceClefinScoreDef(target: Element, newClef: string, currentMEI: Document): Document {
  const staffN = document.querySelector(".activeContainer #vrvSVG #" + target.id).closest(".staff").getAttribute("n")
  const staffDefClef = currentMEI.querySelector("staffDef[n=\"" + staffN + "\"] > clef")

  const shape = newClef.charAt(0)
  var line = clefToLine.get(newClef.charAt(0))
  if(shape === "C"){ // get line depending on id of the cclef
    line = clefToLine.get(newClef.match(/CClef(.*)/)[1])
  }

  const disPlace = newClef.includes("OctDown") ? "below" : newClef.includes("OctUp") ? "above" : null

  if (staffDefClef) {
    staffDefClef.setAttribute("shape", shape)
    staffDefClef.setAttribute("line", line)
    if(disPlace){
      staffDefClef.setAttribute("dis", "8")
      staffDefClef.setAttribute("dis.place", disPlace)
    }else{
      staffDefClef.removeAttribute("dis")
      staffDefClef.removeAttribute("dis.place")
    }
  } else {
    const staffDef = currentMEI.querySelector("staffDef[n=\"" + staffN + "\"]")
    staffDef?.setAttribute("clef.shape", shape)
    staffDef?.setAttribute("clef.line", line)
    if(disPlace){
      staffDef?.setAttribute("clef.dis", "8")
      staffDef?.setAttribute("clef.dis.place", disPlace)
    }else{
      staffDef?.removeAttribute("clef.dis")
      staffDef?.removeAttribute("clef.dis.place")
    }
  }
  cleanUp(currentMEI)
  currentMEI = meiConverter.restoreXmlIdTags(currentMEI)
  return currentMEI
}

/**
 * Layer to which a new clef object has to be inserted
 * @param targetid Usually a barline before which new clef should stand
 * @param newClef Name of new Clef to be inserted
 */
export function insertClef(target: Element, newClef: string, currentMEI: Document): Document {
  var targetStaffId = target.closest(".measure").querySelector(".staff[n=\"" + target.getAttribute("n") + "\"]")?.id || target.closest(".staff")?.id
  var targetLayerId = currentMEI.getElementById(targetStaffId).querySelector("layer").id
  currentMEI.getElementById(targetLayerId).querySelectorAll("clef").forEach(c => c.remove())

  const shape = newClef.charAt(0)
  var line = clefToLine.get(newClef.charAt(0))
  if(shape === "C"){ // get line depending on id of the cclef
    line = clefToLine.get(newClef.match(/CClef(.*)/)[1])
  }
  var disPlace = newClef.includes("OctDown") ? "below" : newClef.includes("OctUp") ? "above" : null

  var clefElement = currentMEI.createElement("clef")
  clefElement.setAttribute("id", uuidv4())
  clefElement.setAttribute("shape", shape)
  clefElement.setAttribute("line", line)
  if(disPlace){
    clefElement.setAttribute("dis", "8")
    clefElement.setAttribute("dis.place", disPlace)
  }

  currentMEI.getElementById(targetLayerId).append(clefElement)
  cleanUp(currentMEI)
  currentMEI = meiConverter.restoreXmlIdTags(currentMEI)

  return currentMEI
}

function findAttributeRecursive(element: Element, attributeName: string, currentValue: string = null): string {
  var value = currentValue || element.getAttribute(attributeName)
  if (value === null) {
    Array.from(element.children).forEach(c => {
      if (value !== null) return
      value = findAttributeRecursive(c, attributeName, value)
    })
  }
  console.log(element, value)
  return value
}

/**
 * If Key is already defined in scoreDef, replace values
 * @param target 
 * @param newSig 
 * @param currentMEI 
 * @returns 
 */
export function replaceKeyInScoreDef(target: Element, newSig: string, currentMEI: Document): Document {
  var staffN = document.querySelector(".activeContainer #vrvSVG #" + target.id).closest(".staff").getAttribute("n")
  var staffDefSig = currentMEI.querySelector("staffDef[n=\"" + staffN + "\"] > keySig")
  if (staffDefSig !== null) {
    staffDefSig.setAttribute("sig", keyIdToSig.get(newSig))
  } else {
    var newSigElement = new MeiTemplate().createKeySig("major", keyIdToSig.get(newSig))
    currentMEI.querySelector("staffDef[n=\"" + staffN + "\"]")?.append(newSigElement)
  }
  adjustAccids(currentMEI)
  cleanUp(currentMEI)
  currentMEI = meiConverter.restoreXmlIdTags(currentMEI)
  return currentMEI
}

/**
 * Create a whole new Sig Element and Insert to MEI at given target
 * @param target 
 * @param newSig 
 * @param currentMEI 
 * @returns 
 */
export function insertKey(target: Element, newSig: string, currentMEI: Document): Document {
  console.log("insertKey", target, newSig)
  var targetStaff = target.closest(".measure").querySelector(".staff[n=\"" + target.getAttribute("n") + "\"]") || target.closest(".staff")
  var staffN = targetStaff.getAttribute("n")
  var parentMeasure = currentMEI.getElementById(targetStaff.id).closest("measure")
  var pmn = parseInt(parentMeasure.getAttribute("n")) + 1
  var targetLayerId = parentMeasure.parentElement.querySelector("measure[n=\"" + pmn.toString() + "\"] > staff[n=\"" + staffN + "\"] > layer")?.id
  currentMEI.getElementById(targetLayerId).querySelectorAll("keySig")?.forEach(c => c.remove())

  var newSigElement = new MeiTemplate().createKeySig("major", keyIdToSig.get(newSig))
  currentMEI.getElementById(targetLayerId).insertBefore(newSigElement, currentMEI.getElementById(targetLayerId).firstElementChild)
  adjustAccids(currentMEI)
  cleanUp(currentMEI)
  currentMEI = meiConverter.restoreXmlIdTags(currentMEI)

  return currentMEI
}

export function replaceMeterInScoreDef(target: Element, currentMEI: Document): Document {
  var staffN = document.querySelector(".activeContainer #vrvSVG #" + target.id).closest(".staff").getAttribute("n")
  var staffDefMeter = currentMEI.querySelector("staffDef[n=\"" + staffN + "\"]")

  var count = (document.querySelector(".activeContainer #timeCount") as HTMLSelectElement).value
  var unit = (document.querySelector(".activeContainer #timeUnit") as HTMLSelectElement).value
  staffDefMeter.setAttribute("meter.count", count)
  staffDefMeter.setAttribute("meter.unit", unit)
  cleanUp(currentMEI)
  currentMEI = meiConverter.restoreXmlIdTags(currentMEI)
  return currentMEI
}

export function insertMeter(target: Element, currentMEI: Document): Document {
  var targetStaff = target.closest(".measure").querySelector(".staff[n=\"" + target.getAttribute("n") + "\"]") || target.closest(".staff")
  var parentMeasure = currentMEI.getElementById(targetStaff.id).closest("measure")
  var pmn = parseInt(parentMeasure.getAttribute("n")) + 1
  var targetLayers = parentMeasure.parentElement.querySelectorAll("measure[n=\"" + pmn.toString() + "\"] layer")
  targetLayers.forEach(tl => {
    currentMEI.getElementById(tl.id).querySelectorAll("meterSig")?.forEach(c => c.remove())
  })


  var count = (document.querySelector(".activeContainer #selectTime #timeCount") as HTMLSelectElement).value
  var unit = (document.querySelector(".activeContainer #selectTime #timeUnit") as HTMLSelectElement).value

  // change for all layers in given measure
  targetLayers.forEach(tl => {
    let newMeterElement = new MeiTemplate().createMeterSig(count, unit) // must be in loop, otherwise same reference gets reassigned every time
    currentMEI.getElementById(tl.id).insertBefore(newMeterElement, currentMEI.getElementById(tl.id).firstElementChild)
  })

  cleanUp(currentMEI)
  currentMEI = meiConverter.restoreXmlIdTags(currentMEI)

  return currentMEI
}

export function insertTempo(target: Element, currentMEI: Document): Document {
  var measure = currentMEI.getElementById(target.id).closest("measure")
  var existingTempo = measure.querySelectorAll("tempo")
  var sameTempos = Array.from(existingTempo).filter(et => {
    var hasSameTimeStamp = parseFloat(et.getAttribute("timeStamp")) === getElementTimestampById(target.id, currentMEI)
    var hasSameStartId = et.getAttribute("startId") === target.id
    return hasSameTimeStamp || hasSameStartId
  })

  var mmUnit = (document.querySelector(".activeContainer #selectTempo #timeCount") as HTMLSelectElement).value
  var mm = (document.querySelector(".activeContainer #selectTempo #timeUnit") as HTMLSelectElement).value

  measure.appendChild(new MeiTemplate().createTempo(mm, mmUnit, getElementTimestampById(target.id, currentMEI).toString(), target.id))
  sameTempos.forEach(st => st.remove())

  cleanUp(currentMEI)
  currentMEI = meiConverter.restoreXmlIdTags(currentMEI)

  return currentMEI
}

/**
 * Gets timestamp of element. Computes it, if no such attribute is present for the element
 * @param id 
 * @param currentMEI 
 * @returns 
 */
export function getElementTimestampById(id: string, currentMEI: Document): number {
  var element = currentMEI.getElementById(id)
  var timestamp = element.getAttribute("tstamp")
  if (timestamp === null) {
    var parentLayer = element.closest("layer")
    var count = 0
    var units = parentLayer.querySelectorAll(countableNoteUnitSelector)
    for (var i = 0; i < units.length; i++) {
      if (units[i].getAttribute("dur") !== null) {
        if (units[i].id === id) {
          var fraction = 4
          if (currentMEI.querySelector("meterSig") !== null) {
            fraction = parseInt(currentMEI.querySelector("meterSig").getAttribute("unit"))
          }
          timestamp = (count * fraction + 1).toString() // add 1 to accomodate for shift ratio sum
          break
        }
        count += getAbsoluteRatio(units[i])
      }
    }

  }
  return parseFloat(timestamp)
}

/**
 * Get Timestamp in specific layer
 * @param note 
 * @returns 
 */
export function getTimestamp(note: Element) {
  var layer = note.closest("layer")
  var elements = Array.from(layer.querySelectorAll("*[dur]"))
  elements = elements.filter((v, i) => i <= elements.indexOf(note))
  var tstamp = 0
  elements.forEach(e => {
    var dur = parseInt(e.getAttribute("dur"))
    tstamp += 4 / dur
    var dots = e.getAttribute("dots")
    var add = dur
    if (dots !== null) {
      for (var i = 0; i < parseInt(dots); i++) {
        add = add / 2
        tstamp += add
      }
    }
  })
  return tstamp
}

export function setArticulation(currentMEI: Document, artic: string) {
  document.querySelectorAll(".activeContainer #vrvSVG :is(.chord.marked, .note.marked, .note.lastAdded").forEach(note => {
    var meiElement = currentMEI.querySelector("#" + note.id)
    if (meiElement === null) return
    if (meiElement.tagName !== "note") return
    if (meiElement.tagName === "note" && meiElement.parentElement.tagName === "chord") {
      meiElement = meiElement.parentElement
    }
    if (meiElement.getAttribute("artic") === null || meiElement.getAttribute("artic") !== artic) {
      meiElement.setAttribute("artic", artic)
    } else {
      meiElement.removeAttribute("artic")
    }
  })
  return currentMEI
}





//PRIVATE

function convertToNewNote(element: Element): NewNote {

  var newNote: NewNote = {
    id: uuidv4(),
    pname: element.getAttribute("pname"),
    dur: element.getAttribute("dur"),
    dots: element.getAttribute("dots"),
    oct: element.getAttribute("oct"),
    accid: element.getAttribute("accid") || element.getAttribute("accid.ges"),
    rest: element.tagName.toUpperCase() === "REST" ? true : false
  }
  return newNote
}

function convertToElement(n: NewNote | NewChord, currentMEI: Document): Element {
  var nn: any
  var newElement: Element
  if (n.hasOwnProperty("pname")) {
    nn = n as NewNote
    newElement = currentMEI.createElement("note")
    newElement.setAttribute("pname", nn.pname)
    newElement.setAttribute("oct", nn.oct)
    newElement.setAttribute("accid", nn.accid)
  } else {
    nn = n as NewChord
    newElement = currentMEI.createElement("chord")
    nn.noteElements.forEach(ne => {
      newElement.append(convertToElement(ne, currentMEI))
    });
  }
  newElement.setAttribute("id", nn.id)
  newElement.setAttribute("dur", nn.dur)
  newElement.setAttribute("dots", nn.dots)

  return newElement
}

function convertToNewChord(element: Element): NewChord {

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

function createNewRestElement(dur: number, dots: number = undefined): Element {
  var newElem = document.createElementNS(c._MEINS_, "rest");
  newElem.setAttribute("dur", dur.toString())
  if (dots != undefined) newElem.setAttribute("dots", dots.toString())
  newElem.setAttribute("id", uuidv4())
  return newElem
}





import MusicProcessor from "../MusicProcessor";
import { Mouse2SVG } from "../utils/Mouse2SVG";
import Handler from "./Handler";
import * as coordinates from "../utils/coordinates";
import { constants as c } from '../constants'
import Annotations from "../gui/Annotations";
import { NewNote } from "../utils/Types";
import Cursor from "../gui/Cursor";
import PhantomElementHandler from "./PhantomElementHandler";
import * as cq from "../utils/convenienceQueries"
import { numToNoteButtonId, numToDotButtonId, attrToAccidButtonId } from '../utils/mappings'
import ScoreGraph from "../datastructures/ScoreGraph";

const marked = "marked"


class ClickModeHandler implements Handler {
    m2s?: Mouse2SVG;
    musicPlayer?: MusicProcessor;
    currentMEI?: string | Document;
    annotations: Annotations;
    private phantomElementHandler: PhantomElementHandler
    insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>;
    deleteCallback: (notes: Array<Element>) => Promise<any>;

    private containerId: string
    private vrvSVG: Element
    private interactionOverlay: Element
    private container: Element
    private scoreGraph: ScoreGraph

    private currentElementToHighlight: Element

    private isSelecting = false
    private selectStartX: number
    private selectStartY: number
    private selectDist = 0
    private dragOnce = false

    private initialSelectX: number;
    private initialSelectY: number;

    private shiftPressed = false

    private selectEndEvent = new Event("selectEnd")

    setListeners() {

        // Insert Notation Listeners
        this.interactionOverlay.addEventListener("mouseup", this.insertNoteHandler)
        this.interactionOverlay.addEventListener("mousemove", this.mouseOverChordHandler)
        this.interactionOverlay.querySelectorAll("#scoreRects > *").forEach(sr => {
            if (["clef", "meterSig", "keySig", "rest", "notehead", "harm",].some(c => sr.classList.contains(c))) {
                sr.addEventListener("mouseover", this.hideCursor)
            } else {
                sr.addEventListener("mouseover", this.showCursor)
            }
        })

        //Selection Listeners
        this.interactionOverlay.addEventListener("mousedown", this.selStartHandler)
        this.interactionOverlay.addEventListener("mousemove", this.selectingHandler)
        this.interactionOverlay.addEventListener("mousemove", this.getSelectCoordsHandler)
        this.interactionOverlay.addEventListener("mouseup", this.selEndHandler)
        this.interactionOverlay.querySelectorAll(".notehead, .rest").forEach(el => el.addEventListener("click", this.clickSelectHandler))


        //shiftkey for special function
        document.addEventListener("keydown", this.shiftKeyHandler)
        document.addEventListener("keyup", this.shiftKeyHandler)

        //hide or show cursor based on position
        this.interactionOverlay.querySelectorAll("#manipulatorCanvas *, #annotationCanvas *").forEach(sr => {
            sr.addEventListener("mouseover", this.hideCursor)
            sr.addEventListener("mouseleave", this.showCursor)
        })

        // Listener just for staves
        var staves = this.interactionOverlay.querySelectorAll(".staffLine")
        Array.from(staves).forEach(element => {
            element.addEventListener('mouseup', this.insertNoteHandler)
        })
    }

    removeListeners() {
        this.interactionOverlay.removeEventListener("mousedown", this.selStartHandler)
        this.interactionOverlay.removeEventListener("mousemove", this.selectingHandler)
        this.interactionOverlay.removeEventListener("mousemove", this.getSelectCoordsHandler)
        this.interactionOverlay.removeEventListener("mouseup", this.selEndHandler)

        this.interactionOverlay.querySelectorAll(".notehead, .rest").forEach(el => el.removeEventListener("click", this.clickSelectHandler))

        this.interactionOverlay.removeEventListener("mouseup", this.insertNoteHandler)
        this.interactionOverlay.removeEventListener("mousemove", this.mouseOverChordHandler)
        if (this.annotations != undefined) {
            var highLightElements: NodeListOf<Element> = this.annotations.getAnnotationCanvas().querySelectorAll(".highlightChord")
            Array.from(highLightElements).forEach(el => {
                el.remove()
            })
        }

        document.removeEventListener("keydown", this.shiftKeyHandler)
        document.removeEventListener("keyup", this.shiftKeyHandler)

        this.container.querySelectorAll(".highlighted").forEach((c: Element) => {
            c.classList.remove("highlighted")
        })

        this.interactionOverlay.querySelectorAll("#scoreRects > *").forEach(sr => {
            if (["clef", "meterSig", "keySig", "rest", "notehead", "harm"].some(c => sr.classList.contains(c))) {
                sr.removeEventListener("mouseover", this.hideCursor)
            } else {
                sr.removeEventListener("mouseover", this.showCursor)
            }
        })

        // Listener just for staves
        var staves = this.interactionOverlay.querySelectorAll(".staffLine")
        Array.from(staves).forEach(element => {
            element.removeEventListener('mouseup', this.insertNoteHandler)
        })
    }

    resetListeners() {
        this.removeListeners()
        this.setListeners()
    }

    /**
     * Event handler for inserting Notes
     */
    insertNoteHandler = (function insertNoteHandler(e: MouseEvent): void {
        this.insertNote(e)
    }).bind(this)

    /**
     * Insert a note when mouseup is fires based on mouse position.
     * @param e 
     * @returns 
     */
    insertNote(e: MouseEvent) {
        // when mouseup is fired, selEndHandler and insertNotehandler are alled. 
        // The isSelecting flag is set to true as soon as a selection startet, only after that an insertion of a note should be possible
        if (this.isSelecting) {
            this.isSelecting = false
            return
        }
        var t = (e.target as Element)
        if (cq.getContainer(this.containerId).querySelectorAll(`.${marked}`).length > 1 && !this.shiftPressed) {
            cq.getContainer(this.containerId).querySelectorAll(`.${marked}`).forEach(m => m.classList.remove(marked))
            return // when more than one element is marked is likely to remove marked status of all notes
        }
        if (cq.getContainer(this.containerId).classList.contains("annotMode")) return // prevent selecting when resizing annotation objects
        if (cq.getContainer(this.containerId).querySelector("#phantomNote").getAttribute("visibility") === "hidden") return //the cursor is possibly somewhere where no note input is possible
        if (cq.getContainer(this.containerId).querySelector("[contenteditable=true]")) return

        e.preventDefault()

        // when mouse is over other interactable elements discard this event
        if (["clef", "meterSig", "keySig", "rest", "notehead", "manipulator"].some(c => {
            let parentCondition = t.parentElement.classList.contains(c)
            let layerCondition = false
            if (!t.closest(".activeLayer")) {
                layerCondition = true
            }
            return parentCondition && layerCondition
        })) {
            this.hideCursor()
            return
        }
        if (!this.phantomElementHandler.getIsTrackingMouse()) { return }
        if (this.musicPlayer.getIsPlaying() === true) { return } // getIsPlaying could also be undefined


        // Define position of mouse and which note to set
        var pospt = coordinates.transformToDOMMatrixCoordinates(e.clientX, e.clientY, this.vrvSVG)
        var posx = pospt.x
        var posy = pospt.y
        var target = e.target as HTMLElement;
        var options = {}

        if (target.classList.contains("staffLine")) {
            options["staffLineId"] = target.id
        }
        if (this.interactionOverlay.querySelector("#phantomNote")?.classList.contains("onChord")) {
            options["targetChord"] = this.findScoreTarget(posx, posy)
        }

        //this.m2s.defineNote(e.pageX, e.pageY, options);
        this.m2s.defineNote(posx, posy, options);

        var newNote: NewNote = this.m2s.getNewNote()
        if (newNote == undefined) return //Eingabemaske in Chrome: zusätzliche Notenlinien in Noteneditor #10
        var meiDoc = this.m2s.getCurrentMei()
        var pitchExists: Boolean = false

        // do not insert same note more than once in chord
        if (newNote.chordElement) {
            var chordEl = meiDoc.getElementById(newNote.chordElement.id)
            if (chordEl.getAttribute("pname") === newNote.pname && chordEl.getAttribute("oct") === newNote.oct) {
                pitchExists = true
            } else {
                for (let c of chordEl.children) {
                    if (c.getAttribute("pname") === newNote.pname && c.getAttribute("oct") === newNote.oct) {
                        pitchExists = true
                        break
                    }
                }
            }
        }

        if (!pitchExists) {
            var replace = true //(this.container.querySelector("#insertToggle") as HTMLInputElement).checked && newNote.chordElement == undefined
            this.insertCallback(this.m2s.getNewNote(), replace).then(() => {
                this.musicPlayer.generateTone(this.m2s.getNewNote())
            }).catch(() => {
                //alert("Your bar is to small")
            })
        }
    }

    /**
     * Hide the phantom element for the cursor.
     */
    hideCursor = function () {
        if (this.interactionOverlay.querySelector(".moving")) return
        this.container.querySelectorAll("#phantomCanvas > *").forEach(ph => {
            ph.setAttribute("visibility", "hidden")
        }) // make phantoms invisible
    }.bind(this)

    /**
     * Show phantom element for cursor.
     */
    showCursor = function () {
        this.container.querySelectorAll("#phantomCanvas > *").forEach(ph => ph.setAttribute("visibility", "visible")) // make phantoms invisible
    }.bind(this)


    /**
     * Handler for {@link mouseOverChord}
     */
    mouseOverChordHandler = (function mouseOverHandler(e: MouseEvent): void {
        this.mouseOverChord(e)
    }).bind(this)

    /**
     * Check if mouse is over a chord to snap cursor and define new note within a chord elemnt
     */
    mouseOverChord(e: MouseEvent) {
        if (!this.phantomElementHandler.getIsTrackingMouse()) { return }
        var coords = coordinates.transformToDOMMatrixCoordinates(e.clientX, e.clientY, this.interactionOverlay)
        var posx = coords.x
        var posy = coords.y

        var elementToHighlight: Element = this.findScoreTarget(posx, posy)
        if (elementToHighlight == undefined || elementToHighlight.closest(".mRest") !== null || elementToHighlight.closest(".rest") !== null) { return }
        //if (this.currentElementToHighlight !== elementToHighlight) {
        //update focussed layer if element and layer do not match
        if (elementToHighlight.closest(".layer").id !== this.m2s.getMouseEnterElementByName("layer")?.id && this.m2s.getMouseEnterElementByName("layer") !== null) {
            this.m2s.setMouseEnterElements(elementToHighlight)
        }

        //snap note to closest Chord
        var phantom = this.interactionOverlay.querySelector("#phantomNote")
        var cx = parseFloat(phantom.getAttribute("cx"))

        var bboxElement = this.interactionOverlay.querySelector("[refId=" + elementToHighlight.id + "]")
        var ptLeft = new DOMPoint(bboxElement.getBoundingClientRect().left, 0)
        var ptRight = new DOMPoint(bboxElement.getBoundingClientRect().right, 0)
        var vrvSVG = this.interactionOverlay
        var left = ptLeft.matrixTransform((vrvSVG as any).getScreenCTM().inverse()).x
        var right = ptRight.matrixTransform((vrvSVG as any).getScreenCTM().inverse()).x

        //snap only when within boundaries of target Chord
        if (cx > left && cx < right) {
            var snapTarget: Element
            var snapTargetBBox: DOMRect
            var phantomSnapX: number
            var targetwidth: number
            var snapCoord: number

            snapTarget = bboxElement
            snapTargetBBox = snapTarget.getBoundingClientRect()
            snapCoord = snapTargetBBox.x + snapTargetBBox.width / 2

            let snappt = new DOMPoint(snapCoord, 0)
            phantomSnapX = snappt.matrixTransform((vrvSVG as any).getScreenCTM().inverse()).x

            // if (elementToHighlight.querySelector(".chord") !== null) {
            //     console.log(phantomSnapX)
            // }
            phantom.setAttribute("cx", phantomSnapX.toString())
            if (!phantom.classList.contains("onChord")) {
                phantom.classList.add("onChord")
                phantom.classList.add("l" + elementToHighlight.closest(".layer").getAttribute("n"))

                if (!elementToHighlight.classList.contains("chord")) {
                    elementToHighlight.classList.add("highlighted")
                } else {
                    elementToHighlight.querySelectorAll(".note").forEach((c: Element) => {
                        c.classList.add("highlighted")
                    })
                }
            }
        } else {
            for (const [key, value] of phantom.classList.entries()) {
                if (value.indexOf("l") === 0) {
                    phantom.classList.remove(value)
                }
            }
            phantom.classList.remove("onChord")
            phantom.setAttribute("fill", "black")
            this.container.querySelectorAll(".highlighted").forEach(h => {
                h.classList.remove("highlighted")
            })
        }

        this.currentElementToHighlight = elementToHighlight
        //}
    }

    /**
         * Find Score Element nearest to given Position (e.g. Mouse)
         * @param posx client position
         * @param posy client position
         * @returns 
         */
    findScoreTarget(posx: number, posy: number): Element {
        const nextNote = this.m2s.findScoreTarget(posx, posy)
        if (nextNote) {
            var el = this.vrvSVG.querySelector("#" + nextNote.id)?.closest(".chord") || this.vrvSVG.querySelector("#" + nextNote.id)
            if (el.classList.contains("notehead")) {
                el = el.parentElement
            }
            return el
        }
        return
    }


    // SELECTION STUFF

    clickSelectHandler = (function clickSelectHandler(e: MouseEvent) {
        this.clickSelect(e)
    }).bind(this)

    clickSelect(e: MouseEvent) {
        if (!this.shiftPressed) {
            cq.getVrvSVG(this.containerId).querySelectorAll(".marked").forEach(m => m.classList.remove(marked))
        }
        const t = e.target as HTMLElement
        const notehead = cq.getVrvSVG(this.containerId).querySelector(`#${t.parentElement.getAttribute("refId")}`)
        notehead?.classList.add(marked)
        const note = notehead.closest(".note")
        if(note){
            note.classList.add(marked)
            this.scoreGraph.setCurrentNodeById(note.id)
        }
    }

    /**
     * Initialize start coordinates of selecting rectangle.
     * {@link getSelectCoordsHandler} will compute distances on dragging the mouse to decide on initialisation of selection.
     */
    selStartHandler = (function selStartHandler(e: MouseEvent) {
        this.selectStartX = this.selectStartX || e.clientX
        this.selectStartY = this.selectStartY || e.clientY
    }).bind(this)

    selStart(e: MouseEvent) {
        e.preventDefault()
        if (!this.isSelecting) return

        if (cq.getContainer(this.containerId).classList.contains("annotMode")) {
            this.selEnd(e)
            return
        }

        //var pt = coordinates.transformToDOMMatrixCoordinates(d3.event.sourceEvent.clientX, d3.event.sourceEvent.clientY, cq.getInteractOverlay(this.containerId))
        var pt = coordinates.transformToDOMMatrixCoordinates(e.clientX, e.clientY, cq.getInteractOverlay(this.containerId))
        this.initialSelectX = pt.x //d3.event.x
        this.initialSelectY = pt.y //d3.event.y

        if (!document.getElementById(this.containerId).classList.contains("harmonyMode") && !this.shiftPressed) { //!this.harmonyHandler.getGlobal()){
            this.m2s.getNoteBBoxes().forEach(bb => {
                let note = this.vrvSVG.querySelector("#" + bb.id)
                note.classList.remove(marked)
            })
        }
        this.initRect(this.initialSelectX, this.initialSelectY)
        this.isSelecting = true
    }

    selectingHandler = (function selectingHandler(e: MouseEvent) {
        this.selecting(e)
    }).bind(this)

    selecting(e: MouseEvent) {
        e.preventDefault()
        if (document.getElementById(this.containerId).classList.contains("annotMode")) return // prevent selecting when resizing annotation objects
        if (!this.isSelecting) return

        const pt = coordinates.transformToDOMMatrixCoordinates(e.clientX, e.clientY, cq.getInteractOverlay(this.containerId))
        const curX = pt.x
        const curY = pt.y

        const newX = curX < this.initialSelectX ? curX : this.initialSelectX;
        const newY = curY < this.initialSelectY ? curY : this.initialSelectY;
        const width = curX < this.initialSelectX ? this.initialSelectX - curX : curX - this.initialSelectX;
        const height = curY < this.initialSelectY ? this.initialSelectY - curY : curY - this.initialSelectY;

        this.updateRect(newX, newY, width, height);

        const rect = this.interactionOverlay.querySelector("#selectRect");
        const rectpt = coordinates.getDOMMatrixCoordinates(rect, this.vrvSVG)
        const rectHeightpt = rectpt.height
        const rectWidthpt = rectpt.width

        const rx = rectpt.x
        const ry = rectpt.y
        const noteBBoxes = this.m2s.getNoteBBoxes();
        noteBBoxes.forEach(bb => {
            const note = cq.getVrvSVG(this.containerId).querySelector("#" + bb.id)
            const stem = note.querySelector(".stem") as HTMLElement
            const accid = note.querySelector(".accid") as HTMLElement
            if (bb.x >= rx &&
                //bb.x <= rx + rectBBox.width &&
                bb.x <= rx + rectWidthpt &&
                bb.y >= ry &&
                //bb.y <= ry + rectBBox.height
                bb.y <= ry + rectHeightpt
            ) {
                note.classList.add(marked)
                if (stem !== null) stem.classList.add(marked)
                const chord = note.closest(".chord")
                if (chord !== null) {
                    //if(!chord.classList.contains(marked)) 
                    const noteArr = Array.from(chord.querySelectorAll(".note"))
                    if (noteArr.every(c => c.classList.contains(marked)) && noteArr.length > 0) {
                        chord.classList.add(marked)
                    }
                }
            } else if (!this.shiftPressed) {
                note.classList.remove(marked)
                stem?.classList.remove(marked)
                accid?.classList.remove(marked)
                const chord = note.closest(".chord")
                chord?.classList.remove(marked)
            }
        })

    }

    /**
     * Handler for {@link selEnd}.
     */
    selEndHandler = (function selEndHandler(e: MouseEvent) {
        this.selEnd(e)
    }).bind(this)

    /**
     * Ends selection. Resets all flags and delets selectRect
     * @param e 
     * @returns 
     */
    selEnd(e: MouseEvent) {
        e.preventDefault()
        this.dragOnce = false
        this.selectStartX = undefined
        this.selectStartY = undefined
        this.selectDist = 0
        this.isSelecting = false
        if (document.getElementById(this.containerId).classList.contains("annotMode")) return // prevent selecting when resizing annotation objects
        var selectRect = cq.getInteractOverlay(this.containerId).querySelector("#selectRect");
        if (selectRect !== null && selectRect?.getAttribute("width") !== "0" && selectRect?.getAttribute("height") !== "0") {
            document.dispatchEvent(this.selectEndEvent)
        }
        selectRect?.remove();
        var firstMarkedNote = this.vrvSVG.querySelector(".chord.marked, .note.marked, .rest.marked")?.id
        var meiNote = this.m2s.getCurrentMei().getElementById(firstMarkedNote)
        document.getElementById(this.containerId)?.querySelectorAll(".lastAdded")?.forEach(la => la.classList.remove("lastAdded"))

        if (firstMarkedNote?.length > 0) {
            document.getElementById(this.containerId)?.querySelectorAll("#noteGroup *, #dotGroup *, #modGroup *, #articGroup *").forEach(b => b.classList.remove("selected"))

            //select buttons for given note state
            var modBtnId = this.container.querySelector("#customToolbar #articGroup") !== null ? "artic" : "accid"
            document.getElementById(this.containerId)?.querySelector("#" + attrToAccidButtonId.get(meiNote?.getAttribute(modBtnId)))?.classList.add("selected")
            if (meiNote?.closest("chord") !== null) {
                meiNote = meiNote.closest("chord")
            }
            document.getElementById(this.containerId)?.querySelector("#" + numToNoteButtonId.get(meiNote?.getAttribute("dur")))?.classList.add("selected")
            document.getElementById(this.containerId)?.querySelector("#" + numToDotButtonId.get(meiNote?.getAttribute("dots")))?.classList.add("selected")
        }
    }

    /**
     * Initialize selectRect.
     * @param x start x
     * @param y start y
     */
    initRect(x: number, y: number): void {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x.toString());
        rect.setAttribute("y", y.toString());
        rect.setAttribute("width", "0");
        rect.setAttribute("height", "0");
        rect.setAttribute("id", "selectRect");
        rect.setAttribute("stroke", "black");
        rect.setAttribute("stroke-width", "1px");
        rect.setAttribute("fill", "none");
        this.interactionOverlay.appendChild(rect);
    }

    /**
     * Update size of selectRect.
     * @param newX x posiiton of mouse cursor
     * @param newY y position of mouse cursor
     * @param currentWidth 
     * @param currentHeight 
     */
    updateRect(newX: number, newY: number, currentWidth: number, currentHeight: number): void {
        const rect = this.interactionOverlay.querySelector("#selectRect") as SVGRectElement;
        rect.setAttribute("x", newX.toString());
        rect.setAttribute("y", newY.toString());
        rect.setAttribute("width", currentWidth.toString());
        rect.setAttribute("height", currentHeight.toString());
    }

    /**
     * Handler for {@link getSelectCoords}
     */
    getSelectCoordsHandler = (function getSelectCoordsHandler(e: MouseEvent) {
        this.getSelectCoords(e)
    }).bind(this)

    /**
     * Compute coordinates to determine if a selection should be initialized.
     * Starts selection once if distance > 10. 
     * This is important to distinguish between inserting a note, drawing the selectRect and selecting one element by click.
     * @param e MouseEvent
     */
    getSelectCoords(e: MouseEvent) {
        this.selectDist = Math.sqrt(Math.abs(e.clientX - this.selectStartX) ** 2 + Math.abs(e.clientY - this.selectStartY) ** 2)
        if (this.selectDist > 10) {
            this.isSelecting = true
            if (!this.dragOnce) {
                this.dragOnce = true
                this.selStart(e)
            }
        }
    }


    /**
     * Handle shift presses and set shiftPressed flag.
     */
    shiftKeyHandler = (function shiftKeyHandler(e: KeyboardEvent) {
        //e.preventDefault()
        if (e.key === "Shift") {
            if (e.type === "keydown") {
                this.shiftPressed = true
            }
            if (e.type === "keyup") {
                this.shiftPressed = false
            }
        }
    }).bind(this)



    ///// GETTER / SETTER////////////////

    setm2s(m2s: Mouse2SVG) {
        this.m2s = m2s
        return this
    }

    setMusicProcessor(musicPlayer: MusicProcessor) {
        this.musicPlayer = musicPlayer
        return this
    }

    setScoreGraph(sg: ScoreGraph){
        this.scoreGraph = sg
        return this
    }

    setContainerId(id: string) {
        this.containerId = id
        this.vrvSVG = cq.getVrvSVG(id)
        this.interactionOverlay = cq.getInteractOverlay(id)
        this.container = document.getElementById(id)
        return this
    }


    setAnnotations(annotations: Annotations) {
        this.annotations = annotations
        return this
    }

    setInsertCallback(insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>) {
        this.insertCallback = insertCallback
        return this
    }

    setDeleteCallback(deleteCallback: (notes: Array<Element>) => Promise<any>) {
        this.deleteCallback = deleteCallback
        return this
    }

    setPhantomCursor(peh: PhantomElementHandler) {
        this.phantomElementHandler = peh

        return this
    }

}

export default ClickModeHandler
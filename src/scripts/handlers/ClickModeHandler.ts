import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import { constants as c } from '../constants'
import Annotations from "../gui/Annotations";
import { NewNote } from "../utils/Types";

//@ts-ignore
//const $ = H5P.jQuery;

class ClickModeHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;
    annotations: Annotations;
    insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>;
    deleteCallback: (notes: Array<Element>) => Promise<any>;

    setListeners(){
        // Listenere for whole SVG (maybe just layer?)
        var svg = document.querySelectorAll(c._ROOTSVGID_WITH_IDSELECTOR_)
        Array.from(svg).forEach(element => {
            if (!["manipulator"].some(cn => element.classList.contains(cn))){
                element.addEventListener('click', this.clickHandler)
                element.addEventListener("mousemove", this.mouseOverChordHandler)
            }
        });


        // Listener just for staves
        var staves = document.querySelectorAll(".staffLine")
        Array.from(staves).forEach(element => {
            element.addEventListener('click', this.clickHandler)
        })
    }

    removeListeners(){
        var svg = document.querySelectorAll(c._ROOTSVGID_WITH_IDSELECTOR_)
        Array.from(svg).forEach(element => {
            element.removeEventListener('click', this.clickHandler)
            element.removeEventListener("mousemove", this.mouseOverChordHandler)
            if(typeof this.annotations !== "undefined"){
            var highLightElements: NodeListOf<Element> = this.annotations.getCanvasGroup().querySelectorAll(".highlightChord")
            Array.from(highLightElements).forEach(el => {
                el.remove()
            })
            }
        });

        document.querySelectorAll(".highlighted").forEach((c: Element) => {
            c.classList.remove("highlighted")
        })


        // Listener just for staves
        var staves = document.querySelectorAll(".staffLine")
        Array.from(staves).forEach(element => {
            element.removeEventListener('click', this.clickHandler)          
        })
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners()
    }

    /**
     * Event handler for inserting Notes
     */
    clickHandler = (function clickHandler (evt: MouseEvent): void{

        var posx = evt.offsetX
        var posy = evt.offsetY
        var target = evt.target as HTMLElement;
        var options = {}

        if(target.classList.contains("staffLine")){
            options["staffLineId"] = target.id
        }
        if(document.getElementById("phantomNote")?.classList.contains("onChord")){
            options["targetChord"] = this.findScoreTarget(posx, posy)
        }
        this.m2m.defineNote(evt.pageX, evt.pageY, options);
        //this.removeListeners();

        var newNote: NewNote = this.m2m.getNewNote()
        var meiDoc = this.m2m.getCurrentMei()
        var pitchExists: Boolean = false

        // do not insert same note more than once in chord
        if(typeof newNote.chordElement !== "undefined"){
            var chordEl = meiDoc.getElementById(newNote.chordElement.id)
            if(chordEl.getAttribute("pname") === newNote.pname && chordEl.getAttribute("oct") === newNote.oct){
                pitchExists = true
            }else{
                for(let c of chordEl.children){
                    if(c.getAttribute("pname") === newNote.pname && c.getAttribute("oct") === newNote.oct){
                    pitchExists = true
                    break
                    }
                }
            }
        }

        if(!pitchExists){
            var replace = document.getElementById("keyInsertDropdown").textContent.toLowerCase() === "replace" && newNote.chordElement == undefined ? true : false
            this.insertCallback(this.m2m.getNewNote(), replace)
            this.musicPlayer.generateTone(this.m2m.getNewNote())
        }
    }).bind(this)


    mouseOverChordHandler = (function mouseOverHandler (evt: MouseEvent): void{
        var root = document.getElementById(c._ROOTSVGID_)
        var rootBBox = root.getBoundingClientRect()    
        var posx = evt.offsetX
        var posy = evt.offsetY

        var elementToHighlight: Element = this.findScoreTarget(posx, posy)
        if(typeof this.prevElementToHighlight === "undefined" || this.currentElementToHighlight !== elementToHighlight){
        
            // in css: elements get highlight color according to layer
            document.querySelectorAll(".highlighted").forEach(h => {
                h.classList.remove("highlighted")
            })
            if(!elementToHighlight.classList.contains("chord")){
                elementToHighlight.classList.add("highlighted")
            }else{
                elementToHighlight.querySelectorAll(".note").forEach((c: Element) => {
                c.classList.add("highlighted")
                })
            }

            //update focussed layer if element and layer do not match
            if(elementToHighlight.closest(".layer").id !== this.m2m.getMouseEnterElementByName("layer")?.id && this.m2m.getMouseEnterElementByName("layer") !== null){
                this.m2m.setMouseEnterElements(elementToHighlight)
            }

            //snap note to closest Chord
            var phantom = document.getElementById("phantomNote")
            var cx = parseFloat(phantom.getAttribute("cx"))
            var left = elementToHighlight.getBoundingClientRect().left - window.scrollX - rootBBox.x - root.scrollLeft
            var right = elementToHighlight.getBoundingClientRect().right - window.scrollX - rootBBox.x - root.scrollLeft

            //snap only when within boundaries of target Chord
            if(cx > left && cx < right){
                var snapTarget = elementToHighlight.querySelector(".noteHead")|| elementToHighlight
                var snapTargetBBox = snapTarget.getBoundingClientRect()
                var phantomSnapX = snapTargetBBox.x + snapTargetBBox.width/2 - window.scrollX - rootBBox.x - root.scrollLeft
                phantom.setAttribute("cx", phantomSnapX.toString())
                if(!phantom.classList.contains("onChord")){
                    phantom.classList.add("onChord")
                    phantom.classList.add("l" + elementToHighlight.closest(".layer").getAttribute("n"))
                }
            }else{
                for(const [key, value] of phantom.classList.entries()){
                    if(value.indexOf("l") === 0){
                        phantom.classList.remove(value)
                    }
                }
                phantom.classList.remove("onChord")
                phantom.setAttribute("fill", "black")
            }

            //MaNo: 6.9.2021: Chords will be detected by vertical snapping, not by highlighting box
            // var highLightRects: NodeListOf<Element> = this.annotations.getCanvasGroup().querySelectorAll(".highlightChord")
            // Array.from(highLightRects).forEach(el => {
            //     el.remove()
            // })

            // var ebb: DOMRect = elementToHighlight.getBoundingClientRect()

            // var highlightRect: SVGElement = document.createElementNS(c._SVGNS_, "rect")
            // var margin = 5
            // highlightRect.setAttribute("x", (ebb.x - rootBBox.x - margin).toString())
            // highlightRect.setAttribute("y", (ebb.y - rootBBox.y - 10*margin).toString())
            // highlightRect.setAttribute("height", (ebb.height + 20*margin).toString())
            // highlightRect.setAttribute("width", (ebb.width + 2*margin).toString())
            // highlightRect.classList.add("highlightChord")
            // this.annotations.getCanvasGroup().appendChild(highlightRect)
            // //highlightRect.addEventListener("click", this.clickHandler)
            
            this.currentElementToHighlight = elementToHighlight
        }
        
    }).bind(this)

    /**
         * Find Score Element nearest to given Position (e.g. Mouse)
         * @param posx 
         * @param posy 
         * @returns 
         */
    findScoreTarget(posx: number, posy: number): Element{
        var nextNote = this.m2m.findScoreTarget(posx, posy)
        var el = document.getElementById(nextNote.id).closest(".chord") || document.getElementById(nextNote.id)
        return el
    }


    ///// GETTER / SETTER////////////////

    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
        return this
      }
    
      setMusicPlayer(musicPlayer: MusicPlayer){
        this.musicPlayer = musicPlayer
        return this
      }


      setAnnotations(annotations: Annotations){
          this.annotations = annotations
          return this
      }
    
      setInsertCallback(insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>){
        this.insertCallback = insertCallback
        return this
      }
    
      setDeleteCallback(deleteCallback: (notes: Array<Element>) => Promise<any>){
        this.deleteCallback = deleteCallback
        return this
      }

}

export default ClickModeHandler
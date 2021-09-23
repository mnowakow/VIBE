import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import { constants as c} from "../constants"
import { uuidv4 } from "../utils/random";
import * as meiConverter from "../utils/MEIConverter"

class ModHandler implements Handler{

    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: Document;

    private tieNotesButton: Element
    private organizeBeamsButton: Element
    private loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>;
  
    constructor(){
        this.tieNotesButton = document.getElementById("tieNotes")
        this.organizeBeamsButton = document.getElementById("organizeBeams")
    }

    setListeners(){
       this.tieNotesButton.addEventListener("click", function(e){
           this.connectNotes(e)
       }.bind(this))

       this.organizeBeamsButton.addEventListener("click", function(e){
           this.organizeBeams(e)
       }.bind(this))
    }


    removeListeners(){
    
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners()
        return this
    }

    /**
     * Make slur or tie for 2 or more elements when tie button is clicked
     * Tie, only when there are two selected elemets which are the same pitch
     * @param e 
     */
    connectNotes(e: MouseEvent){
        var markedElements = Array.from(document.querySelectorAll(".note.marked"))
        markedElements = markedElements.filter(me => me.closest(".layer").getAttribute("n") === markedElements[0].closest(".layer").getAttribute("n"))
        if(markedElements.length === 0){return}
        var makeSlur = markedElements.length > 2
        if(!makeSlur && markedElements.length > 1){ // assert only 2 items
            var leftMeiElement = this.currentMEI.getElementById(markedElements[0].id)
            var rightMeiElement = this.currentMEI.getElementById(markedElements[1].id)
            var leftpname = leftMeiElement.getAttribute("pname")
            var leftoct = leftMeiElement.getAttribute("oct")
            var leftAccid = leftMeiElement.getAttribute("accid") || leftMeiElement.getAttribute("accid.ges")
            var rightpname = rightMeiElement.getAttribute("pname")
            var rightoct = rightMeiElement.getAttribute("oct")
            var rightAccid = rightMeiElement.getAttribute("accid") || rightMeiElement.getAttribute("accid.ges")
            if(!(leftpname === rightpname && leftoct === rightoct && leftAccid === rightAccid)){
                makeSlur = true
            }
        }
        var tieElement: Element
        if(makeSlur){
            tieElement = this.currentMEI.createElementNS(c._MEINS_, "slur")
        }else{
            tieElement = this.currentMEI.createElementNS(c._MEINS_, "tie")
        }
        tieElement.setAttribute("startid", "#" + markedElements[0].id)
        tieElement.setAttribute("endid", "#" + markedElements[markedElements.length-1].id)
        tieElement.setAttribute("id", uuidv4())
        this.currentMEI.getElementById(markedElements[0].id).closest("measure").append(tieElement)
        var mei = meiConverter.restoreXmlIdTags(this.currentMEI)
        this.loadDataCallback("", mei, false, c._TARGETDIVID_)
    }

    /**
     * Pack selected elements in own beam element. Only for dur = 8, 16, 32 etc.
     * @param e 
     */
    organizeBeams(e: MouseEvent){

    }

    setCurrentMEI(mei: Document){
        this.currentMEI = mei
        return this
    }

    setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>){
        this.loadDataCallback = loadDataCallback
        return this
      }

}

export default ModHandler
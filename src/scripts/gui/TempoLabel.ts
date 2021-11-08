import { uuidv4 } from "../utils/random"
import { constants as c } from "../constants"
import Label from './Label'
import { moveMessagePortToContext } from "worker_threads"

class TempoLabel implements Label{

    private tempoNumber: string

    inputString: string
    startid: string
    currentMEI: Document
    element: Element

    constructor(inputString: string, startid: string, mei: Document){
        this.startid = startid
        this.currentMEI = mei
        this.inputString = inputString
        this.element = this.currentMEI.getElementById(startid)

        if(this.element.tagName === "note"){
            this.checkFormat(inputString)        
            this.createElement(inputString)
        }
    }

    checkFormat(inputString: string){
        this.tempoNumber = inputString.match(/\d+/).join("")
    }
    
    modifyLabel(inputString: string){
        this.checkFormat(inputString)
        this.inputString = inputString
        if(this.tempoNumber !== null && this.tempoNumber !== ""){
            this.element.setAttribute("mm", this.tempoNumber)
            var bpm = parseInt(this.tempoNumber) * parseInt(this.element.getAttribute("mm.unit"))
            this.element.setAttribute("midi.bpm", bpm.toString())
            // assume TEXT_NODE after rend element
            this.element.querySelector("rend").nextSibling.textContent = " = " + this.tempoNumber
        }
    }

    createElement(inputString: string){
        if(typeof this.element === "undefined"){
            this.element = this.currentMEI.createElement("tempo")
            this.element.setAttribute("id", uuidv4())
        }
        Array.from(this.element.children).forEach(c => {
            c.remove()
        })

        this.setStartId(this.startid)
    }
    


    ///////// HARMONY HANDLER STUFF ////////////////

    /**
     * Has to be set by HarmonyHandler
     * @param el 
     */
    setStartId(startId: string){
        this.element.setAttribute("startid", startId)
        return this
    }


    ////////////// GETTER/ SETTERT ////////////
    getElement(){
        return this.element
    }

    getInput(){
        return this.inputString
    }

    setCurrentMEI(mei: Document){
        this.currentMEI = mei
        return this
    }

}

export default TempoLabel
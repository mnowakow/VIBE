import { uuidv4 } from "../utils/random"
import { constants as c } from "../constants"
import Label from "./Label"


class HarmonyLabel implements Label{

    private isBassoContinuo: Boolean = false
    private isText: Boolean = false

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
        this.isBassoContinuo = false
        this.isText = false
        var letters = /[Aa]|[C-Zc-z]+$/ // b is allowed character in bc
        if(inputString.match(letters)){
            this.isText = true
        }else{
            this.isBassoContinuo = true
        }
    }
    
    /**
     * Change text of already existing label
     * @param inputString 
     */
    modifyLabel(inputString: string){
        this.checkFormat(inputString)
        this.parseInput(inputString)
       
    }

    createElement(inputString: string){
        
        this.element = this.currentMEI.createElement("harm")
        this.element.setAttribute("id", uuidv4())
        
        Array.from(this.element.children).forEach(c => {
            c.remove()
        })
        this.parseInput(inputString)
        this.setStartId()
    }

    parseInput(inputString){
        if(this.isBassoContinuo){
            this.parseFB(inputString)
        }
        if(this.isText){
            this.parseText(inputString)
        }
    }

    parseText(inputString: string){

        inputString = inputString.replace("b", "♭")
        inputString = inputString.replace("#", "♯")
        inputString = inputString.replace("|", "♮")
        this.element.textContent = inputString
    }

    
    parseFB(inputString: string){
        var splitArray: Array<string> = inputString.split(" ")
        splitArray = splitArray.filter(s => s !== "")
        var fb = this.currentMEI.createElementNS(c._MEINS_, "fb")
        this.element.textContent = ""
        this.element.appendChild(fb)

        splitArray.forEach(sa => {
            var f = this.currentMEI.createElementNS(c._MEINS_, "f")
            sa = sa.replace("b", "♭")
            sa = sa.replace("#", "♯")
            sa = sa.replace("|", "♮")
            f.textContent = sa
            fb.appendChild(f)
        }) 
    }


    ///////// HARMONY HANDLER STUFF ////////////////

    /**
     * Has to be set by HarmonyHandler
     * @param el 
     */
    setStartId(startId: string = this.startid){
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

    getStartId(){
        return this.startid
    }

    setCurrentMEI(mei: Document){
        this.currentMEI = mei
        return this
    }
}

export default HarmonyLabel
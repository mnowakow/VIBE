import { uuidv4 } from "../utils/random"
import { constants as c } from "../constants"


class HarmonyLabel{

    private isBassoContinuo: Boolean = false
    private isText: Boolean = false

    private harmElement: Element
    private inputString: string
    private startid: string

    private currentMEI: Document

    constructor(inputString: string, startid: string, mei: Document){
        this.startid = startid
        this.currentMEI = mei
        this.inputString = inputString

        this.checkFormat(inputString)        
        this.createLabel(inputString)
        
    }

    checkFormat(inputString: string){
        var letters = /[Aa]|[C-Zc-z]+$/ // b is allowed character in bc
        if(inputString.match(letters)){
            this.isText = true
        }else{
            this.isBassoContinuo = true
        }
    }
    
    modifyLabel(inputString: string){
        this.checkFormat(inputString)
        this.inputString = inputString
        this.createLabel(inputString)
    }

    createLabel(inputString: string){
        if(typeof this.harmElement === "undefined"){
            this.harmElement = this.currentMEI.createElement("harm")
            this.harmElement.setAttribute("id", uuidv4())
        }
        Array.from(this.harmElement.children).forEach(c => {
            c.remove()
        })
        if(this.isBassoContinuo){
            this.parseFB(inputString)
        }
        if(this.isText){
            this.parseText(inputString)
        }

        this.setStartId(this.startid)
    }

    parseText(inputString: string){
        this.harmElement.textContent = inputString
    }

    
    parseFB(inputString: string){
        var splitArray: Array<string> = inputString.split(" ")
        splitArray = splitArray.filter(s => s !== "")
        var fb = this.currentMEI.createElementNS(c._MEINS_, "fb")
        this.harmElement.appendChild(fb)

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
    setStartId(startId: string){
        this.harmElement.setAttribute("startid", startId)
        return this
    }


    ////////////// GETTER/ SETTERT ////////////
    getHarmElement(){
        return this.harmElement
    }

    getInputString(){
        return this.inputString
    }

    setCurrentMEI(mei: Document){
        this.currentMEI = mei
        return this
    }
}

export default HarmonyLabel
import Evaluation from "./Evaluation";
import { constants as c } from "../constants"

class SimpleSubmit extends Evaluation{

    constructor(){
        super()
        this.setListeners()
    }

    setListeners(){
        document.getElementById("submitScore").addEventListener("click", this.submit)
    }

    submit = (function submit(e: MouseEvent){
        console.log("LOG: Submitted Task")
        var svg = document.getElementById(c._ROOTSVGID_)
        this.sendXAPI("submitted", svg)
    }).bind(this)
}

export default SimpleSubmit
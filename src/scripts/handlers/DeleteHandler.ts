import { constants as c } from '../constants';
import Core from '../Core';
import Handler from './Handler';

const action = "mousedown"

class DeleteHandler implements Handler{

    private selectedElements: Array<Element>;
    private deleteFlag:string = "marked"

    private deleteCallback: (items: Array<Element>) => Promise<any> 

    constructor(){
    }

    setListeners(){
        // Listenere for whole SVG (maybe just layer?)
        var notes = document.querySelectorAll(c._NOTE_WITH_CLASSSELECTOR_)
        Array.from(notes).forEach(element => {
            element.addEventListener(action , this.clickHandler)
        });
        document.addEventListener("keyup", this.backSpaceHandler) 
    }
    
    removeListeners(){
        var notes = document.querySelectorAll(c._NOTE_WITH_CLASSSELECTOR_)
        Array.from(notes).forEach(element => {
            element.removeEventListener(action, this.clickHandler)
        });
        document.removeEventListener("keyup", this.backSpaceHandler)
    }

    clickHandler = (function clickHandler(evt: MouseEvent){
        var target = evt.target as SVGSVGElement
        target = target.closest(".note")
        let stem = target.querySelector(".stem") as HTMLElement 
        if(!target.classList.contains(this.deleteFlag)){
            target.classList.add(this.deleteFlag)
            if(stem !== null){
                stem.classList.add(this.deleteFlag)
            }
        }else{
            target.classList.remove(this.deleteFlag)
            if(stem !== null){
                stem.classList.remove(this.deleteFlag)
            }
        }      
      
    }).bind(this)

    /**
     * Delete all Elements which are marked
     */
    backSpaceHandler = (function backSpaceHandler(e: KeyboardEvent){
        Array.from(document.querySelectorAll("." + this.deleteFlag)).forEach(el => this.selectedElements.push(el))
        if((e.code === "Backspace" || e.code === "Delete") && this.selectedElements.length > 0 && document.querySelectorAll(".harmonyDiv").length === 0){
            this.deleteCallback(this.selectedElements).then(() => {
                this.selectedElements.length = 0
            }) 
        }
    }).bind(this)

    update(){
        this.selectedElements = new Array;
        this.removeListeners();
        this.setListeners();
        return this
    }

    /////////// GETTER/ SETTER ////////////
    setDeleteCallback(deleteCallback: (items: Array<Element>) => Promise<any>){
        this.deleteCallback = deleteCallback
        return this
    }

    getDeleteFlag(){
        return this.deleteFlag
    }
}
export default DeleteHandler;
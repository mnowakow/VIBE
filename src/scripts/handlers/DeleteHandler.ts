import { constants as c } from '../constants';
import Core from '../Core';
import Handler from './Handler';
import * as cq from "../utils/convenienceQueries"

const action = "mousedown"

class DeleteHandler implements Handler{

    private selectedElements: Array<Element>;
    private deleteFlag:string = "marked"

    private deleteCallback: (items: Array<Element>) => Promise<any> 
    containerId: string;
    container: Element
    rootSVG: Element
    interactionOverlay: Element

    constructor(containerId){
        this.setContainerId(containerId)
    }

    setListeners(){
        // Listenere for whole SVG (maybe just layer?)
        var notes = this.rootSVG.querySelectorAll(".note")
        Array.from(notes).forEach(element => {
            element.addEventListener(action , this.clickHandler)
        });
        document.addEventListener("keyup", this.backSpaceHandler) 
    }
    
    removeListeners(){
        var notes = this.rootSVG.querySelectorAll(".note")
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
        if(!cq.hasActiveElement(this.containerId)) return
        if(e.code !== "Backspace") return
        var hasRests = false
        var hasNotes = false
        if(cq.getRootSVG(this.containerId).querySelectorAll("." + this.deleteFlag + ".rest").length > 0){hasRests = true}
        if(cq.getRootSVG(this.containerId).querySelectorAll("." + this.deleteFlag + ":not(.rest)").length > 0){hasNotes = true}
        Array.from(cq.getRootSVG(this.containerId).querySelectorAll("." + this.deleteFlag)).forEach(el => {
            if(hasNotes && hasRests){
                if(!el.classList.contains("rest")){
                    this.selectedElements.push(el)
                }
            }else{
                this.selectedElements.push(el)
            }
        })
        
        if((e.code === "Backspace" || e.code === "Delete") && this.selectedElements.length > 0 && this.container.querySelectorAll(".harmonyDiv").length === 0){
            this.deleteCallback(this.selectedElements).then(() => {
                this.selectedElements.length = 0
            }) 
        }
    }).bind(this)

    update(){
        this.selectedElements = new Array;
        this.setContainerId(this.containerId)
        this.removeListeners();
        this.setListeners();
        return this
    }

    /////////// GETTER/ SETTER ////////////
    setDeleteCallback(deleteCallback: (items: Array<Element>) => Promise<any>){
        this.deleteCallback = deleteCallback
        return this
    }

    setContainerId(containerId: string) {
        this.containerId = containerId
        this.container = cq.getContainer(containerId)
        this.rootSVG = cq.getRootSVG(containerId)
        this.interactionOverlay = cq.getInteractOverlay(containerId)
        return this
    }

    getDeleteFlag(){
        return this.deleteFlag
    }
}
export default DeleteHandler;
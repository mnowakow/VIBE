import { constants as c } from '../constants';
import Core from '../Core';
import Handler from './Handler';
import * as cq from "../utils/convenienceQueries"

const action = "mousedown"

class DeleteHandler implements Handler{

    private selectedElements: Array<Element>;
    private primaryDeleteFlag:string = "marked"
    private secondaryDeleteFlag:string = "lastAdded"


    private deleteCallback: (items: Array<Element>) => Promise<any> 
    containerId: string;
    container: Element
    vrvSVG: Element
    interactionOverlay: Element

    constructor(containerId){
        this.setContainerId(containerId)
    }

    setListeners(){
        // Listenere for whole SVG (maybe just layer?)
        var notes = this.vrvSVG.querySelectorAll(".note")
        Array.from(notes).forEach(element => {
            element.addEventListener(action , this.clickHandler)
        });
        document.addEventListener("keyup", this.backSpaceHandler) 
    }
    
    removeListeners(){
        var notes = this.vrvSVG.querySelectorAll(".note")
        Array.from(notes).forEach(element => {
            element.removeEventListener(action, this.clickHandler)
        });
        document.removeEventListener("keyup", this.backSpaceHandler)
    }

    clickHandler = (function clickHandler(e: MouseEvent){
        var target = e.target as SVGSVGElement
        target = target.closest(".note")
        let stem = target.querySelector(".stem") as HTMLElement 
        if(!target.classList.contains(this.primaryDeleteFlag)){
            target.classList.add(this.primaryDeleteFlag)
            if(stem !== null){
                stem.classList.add(this.primaryDeleteFlag)
            }
        }else{
            target.classList.remove(this.primaryDeleteFlag)
            if(stem !== null){
                stem.classList.remove(this.primaryDeleteFlag)
            }
        }      
      
    }).bind(this)

    /**
     * Delete all Elements which are marked
     */
    backSpaceHandler = (function backSpaceHandler(e: KeyboardEvent){
        if(!cq.hasActiveElement(this.containerId)) return
        if(cq.getContainer(this.containerId).querySelector("[contenteditable=\"true\"]")) return
        if(e.code !== "Backspace") return
        var hasRests = false
        var hasNotes = false
        if(cq.getVrvSVG(this.containerId).querySelectorAll("." + this.primaryDeleteFlag + ".rest, ." + this.secondaryDeleteFlag + ".rest").length > 0){hasRests = true}
        if(cq.getVrvSVG(this.containerId).querySelectorAll("." + this.primaryDeleteFlag + ":not(.rest), ." + this.secondaryDeleteFlag + ":not(.rest)").length > 0){hasNotes = true}
        Array.from(cq.getVrvSVG(this.containerId).querySelectorAll("." + this.primaryDeleteFlag + ", ." + this.secondaryDeleteFlag)).forEach(el => {
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
                cq.getVrvSVG(this.containerId).querySelectorAll("." + this.primaryDeleteFlag + ", ." + this.secondaryDeleteFlag).forEach(el => {
                    el.classList.remove(this.primaryDeleteFlag)
                    el.classList.remove(this.secondaryDeleteFlag)
                })
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
        this.vrvSVG = cq.getVrvSVG(containerId)
        this.interactionOverlay = cq.getInteractOverlay(containerId)
        return this
    }

    getDeleteFlag(){
        return this.primaryDeleteFlag
    }
}
export default DeleteHandler;
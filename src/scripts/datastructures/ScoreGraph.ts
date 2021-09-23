import { noteToB } from "../utils/mappings"
import ScoreNode from "./ScoreNode"

const meiNodeSelector = "note, rest, mRest, chord, layer"
const documentNodeSelector = ".clef, .meterSig, .keySig"

class ScoreGraph{

    private graph: Map<string, ScoreNode>
    private currentNode: ScoreNode
    private midiTimes: Map<number, Array<Element>>

    constructor(xmlDoc: Document, miditimes: Map<number, Array<Element>>){
        this.populate(xmlDoc, miditimes)
    }

    /**
     * Populate scoreGraoh according to mei
     * Add midi timeCode
     * @param xmlDoc 
     * @param miditimes 
     */
    private populate(xmlDoc: Document, miditimes: Map<number, Array<Element>>){
        this.graph = new Map()
        this.midiTimes = miditimes
        xmlDoc.querySelectorAll(meiNodeSelector).forEach(e => {
            if((e.tagName === "note" && e.closest("chord") !== null)){ // || (e.tagName === "layer" && e.children.length > 0)){
                return
            }
            this.graph.set(e.id, new ScoreNode(e.id))
        })
        document.querySelectorAll(documentNodeSelector).forEach(e => {
            this.graph.set(e.id, new ScoreNode(e.id))
        })

        var layerCount = 0
        xmlDoc.querySelectorAll("layer").forEach(l => {
            if(parseInt(l.getAttribute("n")) > layerCount){
                layerCount = parseInt(l.getAttribute("n"))
            }
        })

        // Assign left/right nodes
        var layerArray: Array<Element>
        for(var i = 0; i < layerCount; i++ ){
            layerArray = Array.from(xmlDoc.querySelectorAll("layer[n=\"" + (i+1).toString() + "\"]"))
            var elements = new Array<Element>()
            layerArray.forEach(l => {
                let staff = document.getElementById(l.id).closest(".measure").querySelector(".staff[n='" + l.closest("staff").getAttribute("n") + "']")
                let clef = staff.querySelector(".clef")
                let meterSig = staff.querySelector(".meterSig")
                let keySig = staff.querySelector(".keySig")

                elements.push(l)
                if(clef !== null) elements.push(clef)
                if(meterSig !== null) elements.push(meterSig)
                if(keySig !== null) elements.push(keySig)
                l.querySelectorAll(meiNodeSelector).forEach(c => {
                    if(c.tagName === "note" && c.closest("chord") !== null){
                        return
                    }
                    elements.push(c)
                })
            })
            
            elements.forEach((el, idx) => {
                var currentNode = this.graph.get(el.id)
                var prevSibling: ScoreNode = idx === 0 ? null : this.graph.get(elements[idx-1].id)
                var nextSibling: ScoreNode = idx === elements.length-1 ? null : this.graph.get(elements[idx+1].id)

                if(idx > 0){
                    currentNode.setLeft(prevSibling)
                }else{ // empty Node at beginning of Layer
                    this.graph.set("BOL" + i.toString(), new ScoreNode("BOL" + i.toString()))
                    this.graph.get("BOL" + i.toString()).setLeft(null)
                    this.graph.get("BOL" + i.toString()).setUp(null)
                    this.graph.get("BOL" + i.toString()).setDown(null)
                    this.graph.get("BOL" + i.toString()).setRight(currentNode)
                    currentNode.setLeft(this.graph.get("BOL" + i.toString()))
                }
                currentNode.setRight(nextSibling)
            })
                
        }

        //Assign up/down nodes
        if(typeof this.midiTimes !== "undefined"){
            // miditimes contain svg Elements (not mei Elements!!!)
            // first: direct up/down references
            for(const [key, value] of this.midiTimes.entries()){
                var originArr: Array<Element> = value
                var arr = new Array<Element>()
                originArr.forEach(el => {
                    var chord = el.closest(".chord")
                    if(chord !== null && arr.indexOf(chord) === -1){
                        arr.push(chord)
                    }else if(chord === null){
                        arr.push(el)
                    }
                })
                arr.forEach((note, idx) => {
                    var current = note

                    var upSibling: ScoreNode = idx === 0 ? null : this.graph.get(arr[idx-1].id)
                    var downSibling: ScoreNode = idx === arr.length-1 ? null : this.graph.get(arr[idx+1].id)

                    var currentNode = this.graph.get(current.id)

                    if(typeof currentNode.getTimeCode() === "undefined"){
                        currentNode.setTimeCode(key)
                    }
                
                    currentNode.setUp(upSibling)
                    currentNode.setDown(downSibling)
                })
            }
        }

        //extra iteration for Beginning of Layer
        var currBol: ScoreNode = null
        var prevBol: ScoreNode = null
        for(const [key, value] of this.graph.entries()){
            if(key.indexOf("BOL") !== -1){
                currBol = value
                var bolIdx  = key[key.length-1]
                if(bolIdx !== "0"){
                    currBol.setUp(prevBol)
                    if(prevBol !== null){
                        prevBol.setDown(currBol)
                    }
                }
                prevBol = value
            }
        }

        //if there are no direct up/down references, assign closest references
        for(const [key, value] of this.graph.entries()){
            var currentNode = value
            var leftNode = currentNode.getLeft()
            var rightNode = currentNode.getRight()

            if(currentNode.getUp() == undefined){
                currentNode.setUp(null)
            }

            if(currentNode.getDown() == undefined){
                currentNode.setDown(null)
            }

            // Get closest Node for UP reference
            //check left
            var closestTimeUp: number = 10**10
            var upSet: ScoreNode = null
            if(this.targetNodeIsLeftOrRight(currentNode, currentNode.getUp()) && leftNode !== null){
                if(leftNode.getUp() !== null && typeof leftNode.getDown() !== "undefined"){
                    closestTimeUp = currentNode.getTimeCode() - leftNode.getUp().getTimeCode()
                    upSet = leftNode.getUp()
                }
            }

            //check right
            if(this.targetNodeIsLeftOrRight(currentNode, currentNode.getUp()) && rightNode !== null){
                if(rightNode.getUp() !== null && typeof rightNode.getDown() !== "undefined"){
                    if((rightNode.getUp().getTimeCode() - currentNode.getTimeCode()) < closestTimeUp){
                       upSet = rightNode.getUp()
                    }
                }
            }
            if(upSet !== null && upSet !== currentNode && !this.targetNodeIsLeftOrRight(currentNode, upSet)){
                currentNode.setUp(upSet)
            }

            // Get closest Node for DOWN reference
            // check left
            var closestTimeDown: number = 10**10
            var downSet: ScoreNode = null
            if(this.targetNodeIsLeftOrRight(currentNode, currentNode.getDown()) && leftNode !== null){
                if(leftNode.getDown() !== null && typeof leftNode.getDown() !== "undefined"){
                    closestTimeDown = currentNode.getTimeCode() - leftNode.getDown().getTimeCode()
                    downSet = leftNode.getDown()
                }
            }

            // check right
            if(this.targetNodeIsLeftOrRight(currentNode, currentNode.getDown()) && rightNode !== null){
                if(rightNode.getDown() !== null && typeof rightNode.getDown() !== "undefined"){
                    if((rightNode.getDown().getTimeCode() - currentNode.getTimeCode()) < closestTimeDown){
                        downSet = rightNode.getDown()
                    }
                }
            }
            if(downSet !== null && downSet !== currentNode && !this.targetNodeIsLeftOrRight(currentNode, downSet)){
                currentNode.setDown(downSet)
            }
        }

        // for(const[key, value] of this.graph.entries()){
        //     console.log(document.getElementById(key))
        // }
       
    }

    targetNodeIsLeftOrRight(startNode: ScoreNode, targetNode: ScoreNode): Boolean{
        return this.targetIsNodeRight(startNode, targetNode) || this.targetIsNodeLeft(startNode, targetNode) 
    }

    targetIsNodeLeft(startNode: ScoreNode, targetNode: ScoreNode){
        var tempNode: ScoreNode = startNode
        var isLeft: Boolean = false
        while(tempNode !== null){
            if(tempNode !== null){
                tempNode = tempNode.getLeft()
            }
            if(tempNode === targetNode){
                isLeft = true
            }
        }
        return isLeft
    }

    targetIsNodeRight(startNode: ScoreNode, targetNode: ScoreNode){
        var tempNode: ScoreNode = startNode
        var isRight: Boolean = false
        while(tempNode !== null){
            if(tempNode !== null){
                tempNode = tempNode.getRight()
            }
            if(tempNode === targetNode){
                isRight = true
            }
        }
        return isRight
    }

    flatten(){
        //TODO
    }

    getCurrentNode(){
        return this.currentNode
    }

    setCurrentNodeById(id: string){
        this.currentNode = this.graph.get(id)
    }

    nextUp(){
        if(this.currentNode.getUp() !== null){
            this.currentNode = this.currentNode.getUp()
        }
        return this.currentNode
    }

    nextDown(){
        if(this.currentNode.getDown() !== null){
            this.currentNode = this.currentNode.getDown()
        }
        return this.currentNode
    }

    nextRight(){
        if(this.currentNode.getRight() !== null){
            this.currentNode = this.currentNode.getRight()
        }
        return this.currentNode
    }

    nextLeft(){
        if(this.currentNode.getLeft() !== null){
            this.currentNode = this.currentNode.getLeft()
        }
        return this.currentNode
    }

    //Check if ScoreGraph is at beginning of layer
    isBOL(): Boolean{
        return this.currentNode.getLeft() === null && this.currentNode.getId().indexOf("BOL") !== -1
    }

}

export default ScoreGraph
import { noteToB } from "../utils/mappings"
import ScoreNode from "./ScoreNode"
import { constants as c } from "../constants"
import * as cq from "../utils/convenienceQueries"
import { isJSDocDeprecatedTag } from "typescript"

const meiNodeSelector = "note, rest, mRest, chord, layer"
const documentNodeSelector = ".clef, .meterSig, .keySig, .note, .rest, .mRest, .chord" //, .layer"
const documentNodeSelector2 = ".clef, .meterSig, .keySig, .layer .note, .layer .rest, .layer .mRest, .layer .chord" //, :scope > .layer"

class ScoreGraph {

    private graph: Map<string, ScoreNode>
    private currentNode: ScoreNode
    private midiTimes: Map<number, Array<Element>>
    private containerId: string
    private container: Element
    private interactionOverlay: Element
    private vrvSVG: Element

    constructor(xmlDoc: Document, containerId: string, miditimes: Map<number, Array<Element>>) {
        this.containerId = containerId
        this.container = document.getElementById(containerId)
        this.vrvSVG = cq.getVrvSVG(containerId)
        this.interactionOverlay = cq.getInteractOverlay(containerId)
        this.populate(xmlDoc)
    }

     /**
      * Populate scoreGraoh according to mei
      * Determine left and right relations between elements (up and down won't be considered anymore since the keyboard interaction (arrowup/arrowdown) always should result in a transposition)
     */
    private populate(xmlDoc: Document) {
        this.graph = new Map()
        
        interface GroupedLayers{
            [staffn: string]: {
                [layern: string]: Array<Element>
            }
        }

        interface GroupedStaffDefs{
            [staffn: string]: Array<Element>
        }

        //Collect all layers grouped by staff and layer index.
        var groupedLayers: GroupedLayers = {}
        xmlDoc.querySelectorAll("staff").forEach(s => 
            s.querySelectorAll("layer").forEach(l => {
                const sn = s.getAttribute("n")
                const ln = l.getAttribute("n")
                if(!groupedLayers[sn]){
                    groupedLayers[sn] = {}
                }
                if(!groupedLayers[sn][ln]){
                    groupedLayers[sn][ln] = new Array()
                }
                groupedLayers[sn][ln].push(l)
            })
        )

        //Collect Clef, meter and key to beginning of Graph
        //Elements must be parsed from rendered svg
        var groupedStaffDefs: GroupedStaffDefs = {}
        cq.getContainer(this.containerId).querySelectorAll("#vrvSVG .measure[n='1'] .staff").forEach(sd => {
            const n = sd.getAttribute("n")
            if(!groupedStaffDefs[n]){
                groupedStaffDefs[n] = new Array()
            }
            const clef = sd.querySelector(".clef")
            if(clef) groupedStaffDefs[n].push(clef)
            const keySig = sd.querySelector(".keySig")
            if(keySig) groupedStaffDefs[n].push(keySig)
            const meterSig = sd.querySelector(".meterSig")
            if(meterSig) groupedStaffDefs[n].push(meterSig)
        })

        //iterate through all layers to add and connect score nodes
        var prevNode: ScoreNode
        for(const sn in groupedLayers){
            for(const ln in groupedLayers[sn]){
                const staffDef = groupedStaffDefs[sn]
                var lastStaffDefId: string
                if(staffDef){
                    staffDef.forEach(sd => {
                        lastStaffDefId = sd.id
                        this.graph.set(sd.id, new ScoreNode(sd.id))
                        const currentNode = this.graph.get(sd.id)
                        if(prevNode){
                            prevNode.setRight(currentNode)
                            currentNode.setLeft(prevNode)
                        }
                        prevNode = currentNode
                    })
                }
                prevNode = null
                const layer = groupedLayers[sn][ln]
                layer.forEach((l, layerIdx) => {
                    l.querySelectorAll(":scope > note, rest, mRest, chord, keySig, clef, meterSig").forEach((el, elementIdx) => {
                        this.graph.set(el.id, new ScoreNode(el.id))
                        const currentNode = this.graph.get(el.id)
                        if(prevNode){
                            prevNode.setRight(currentNode)
                            currentNode.setLeft(prevNode)
                        }else{
                            currentNode.setLeft(this.graph.get(lastStaffDefId))
                            if(layerIdx === 0 && elementIdx === 0){
                                this.graph.get(lastStaffDefId)?.setRight(currentNode)
                            }
                        }
                        
                        prevNode = currentNode
                    })
                })      
            }
        }

        console.log("ScoreGraph", this.graph)
    }



    /**
     * @deprecated
     * Populate scoreGraoh according to mei
     * Add midi timeCode
     * @param xmlDoc 
     * @param miditimes 
     */
    private populate_old(xmlDoc: Document, miditimes: Map<number, Array<Element>>) {
        this.graph = new Map()
        this.midiTimes = miditimes

        xmlDoc.querySelectorAll(meiNodeSelector).forEach(e => {
            if ((e.tagName === "note" && e.closest("chord") !== null)) { // || (e.tagName === "layer" && e.children.length > 0)){
                return
            }
            this.graph.set(e.id, new ScoreNode(e.id))
        })
        cq.getVrvSVG(this.containerId).querySelectorAll(documentNodeSelector).forEach(e => {
            if ((e.classList.contains("note") && e.closest(".chord") !== null)) {
                return
            }
            this.graph.set(e.id, new ScoreNode(e.id))
        })

        var layerCount = 0
        xmlDoc.querySelectorAll("layer").forEach(l => {
            if (parseInt(l.getAttribute("n")) > layerCount) {
                layerCount = parseInt(l.getAttribute("n"))
            }
        })

        var staffCount = 0
        xmlDoc.querySelectorAll("staff").forEach(l => {
            if (parseInt(l.getAttribute("n")) > staffCount) {
                staffCount = parseInt(l.getAttribute("n"))
            }
        })

        // Assign left/right nodes
        var layerArray: Array<Element>
        for (var s = 0; s < staffCount; s++) {
            for (var i = 0; i < layerCount; i++) {
                layerArray = Array.from(xmlDoc.querySelectorAll("staff[n=\"" + (s + 1).toString() + "\"] > layer[n=\"" + (i + 1).toString() + "\"]"))
                var elements = new Array<Element>()
                layerArray.forEach(l => {
                    if (cq.getVrvSVG(this.containerId).querySelector("#" + l.id) === null) return
                    let staff = cq.getVrvSVG(this.containerId).querySelector("#" + l.id).closest(".measure").querySelector(".staff[n='" + l.closest("staff").getAttribute("n") + "']")
                    var documentNodes = Array.from(staff.querySelectorAll(documentNodeSelector2))
                    var documentNodes = documentNodes.filter(dn => {
                        if (!dn.classList.contains("note")) {
                            return dn
                        }
                        if (dn.classList.contains("note")) {
                            if (dn.closest(".chord") === null) {
                                return dn
                            }
                        }
                    })
                    elements.push(...documentNodes)


                    elements.forEach((el, idx) => {

                        var currentNode = this.graph.get(el.id)
                        var prevSibling: ScoreNode = idx === 0 ? null : this.graph.get(elements[idx - 1].id)
                        var nextSibling: ScoreNode = idx === elements.length - 1 ? null : this.graph.get(elements[idx + 1].id)


                        if (idx > 0) {
                            currentNode.setLeft(prevSibling)
                        } else { // empty Node at beginning of Layer
                            this.graph.set("BOL" + i.toString(), new ScoreNode("BOL" + i.toString()))
                            this.graph.get("BOL" + i.toString()).setLeft(null)
                            this.graph.get("BOL" + i.toString()).setUp(null)
                            this.graph.get("BOL" + i.toString()).setDown(null)
                            this.graph.get("BOL" + i.toString()).setRight(currentNode)
                            currentNode.setLeft(this.graph.get("BOL" + i.toString()))
                        }
                        currentNode.setRight(nextSibling)
                    })
                })

            }
        }

        //Assign up/down nodes
        if (this.midiTimes) {
            // miditimes contain svg Elements (not mei Elements!!!)
            // first: direct up/down references
            for (const [key, value] of this.midiTimes.entries()) {
                var originArr: Array<Element> = value
                var arr = new Array<Element>()
                originArr.forEach(el => {
                    var chord = el.closest(".chord")
                    if (chord !== null && arr.indexOf(chord) === -1) {
                        arr.push(chord)
                    } else if (chord === null) {
                        arr.push(el)
                    }
                })
                arr.forEach((note, idx) => {
                    var current = note

                    var upSibling: ScoreNode = idx === 0 ? null : this.graph.get(arr[idx - 1].id)
                    var downSibling: ScoreNode = idx === arr.length - 1 ? null : this.graph.get(arr[idx + 1].id)

                    var currentNode = this.graph.get(current.id)

                    if (typeof currentNode.getTimeCode() === "undefined") {
                        currentNode.setTimeCode(key)
                    }

                    currentNode.setUp(upSibling)
                    currentNode.setDown(downSibling)
                })
            }
        }

        //DEAL WITH MRESTS
        var staves = cq.getVrvSVG(this.containerId).querySelectorAll(".staff")
        for (var i = 0; i < staves.length - 1; i++) {
            var staffElements = staves[i].querySelectorAll(documentNodeSelector)
            var emptyElements = staves[i + 1].querySelectorAll(".clef, .meterSig, .keySig, .mRest, .layer")
            staffElements.forEach((se, idx) => {
                var gn = this.graph.get(se.id)
                if (gn?.getDown() === null || gn?.getDown() == undefined) {
                    var tempIdx = idx
                    if (idx >= emptyElements.length) {
                        tempIdx = emptyElements.length - 1
                    }
                    var gnEmpty = this.graph.get(emptyElements[tempIdx].id)
                    if (gnEmpty?.getUp() === null || gnEmpty?.getUp() == undefined) {
                        gn?.setDown(gnEmpty)
                        gnEmpty?.setUp(gn)
                    }
                }
            })
        }

        //extra iteration for Beginning of Layer
        var currBol: ScoreNode = null
        var prevBol: ScoreNode = null
        for (const [key, value] of this.graph.entries()) {
            if (key.indexOf("BOL") !== -1) {
                currBol = value
                var bolIdx = key[key.length - 1]
                if (bolIdx !== "0") {
                    currBol.setUp(prevBol)
                    if (prevBol !== null) {
                        prevBol.setDown(currBol)
                    }
                }
                prevBol = value
            }
        }

        //if there are no direct up/down references, assign closest references
        for (const [key, value] of this.graph.entries()) {
            var currentNode = value
            var leftNode = currentNode.getLeft()
            var rightNode = currentNode.getRight()

            if (currentNode.getUp() == undefined) {
                currentNode.setUp(null)
            }

            if (currentNode.getDown() == undefined) {
                currentNode.setDown(null)
            }

            // Get closest Node for UP reference
            //check left
            var closestTimeUp: number = 10 ** 10
            var upSet: ScoreNode = null
            if (this.targetNodeIsLeftOrRight(currentNode, currentNode.getUp()) && leftNode !== null) {
                if (leftNode.getUp() !== null && typeof leftNode.getDown() !== "undefined") {
                    closestTimeUp = currentNode?.getTimeCode() - leftNode?.getUp()?.getTimeCode() || 0
                    upSet = leftNode?.getUp()
                }
            }

            //check right
            if (this.targetNodeIsLeftOrRight(currentNode, currentNode.getUp()) && rightNode !== null) {
                if (rightNode.getUp() !== null && typeof rightNode.getDown() !== "undefined") {
                    if ((rightNode.getUp()?.getTimeCode() - currentNode?.getTimeCode()) < closestTimeUp) {
                        upSet = rightNode?.getUp()
                    }
                }
            }
            if (upSet !== null && upSet !== currentNode && !this.targetNodeIsLeftOrRight(currentNode, upSet)) {
                currentNode.setUp(upSet)
            }

            // Get closest Node for DOWN reference
            // check left
            var closestTimeDown: number = 10 ** 10
            var downSet: ScoreNode = null
            if (this.targetNodeIsLeftOrRight(currentNode, currentNode.getDown()) && leftNode !== null) {
                if (leftNode.getDown() !== null && typeof leftNode.getDown() !== "undefined") {
                    closestTimeDown = currentNode?.getTimeCode() - leftNode?.getDown()?.getTimeCode() || 0
                    downSet = leftNode.getDown()
                }
            }

            // check right
            if (this.targetNodeIsLeftOrRight(currentNode, currentNode.getDown()) && rightNode !== null) {
                if (rightNode.getDown() !== null && rightNode.getDown() != undefined) {
                    if ((rightNode.getDown().getTimeCode() - currentNode.getTimeCode()) < closestTimeDown) {
                        downSet = rightNode.getDown()
                    }
                }
            }
            if (downSet !== null && downSet !== currentNode && !this.targetNodeIsLeftOrRight(currentNode, downSet)) {
                currentNode.setDown(downSet)
            }
        }
    }

    targetNodeIsLeftOrRight(startNode: ScoreNode, targetNode: ScoreNode): Boolean {
        return this.targetIsNodeRight(startNode, targetNode) || this.targetIsNodeLeft(startNode, targetNode)
    }

    targetIsNodeLeft(startNode: ScoreNode, targetNode: ScoreNode) {
        var tempNode: ScoreNode = startNode
        var isLeft: Boolean = false
        while (tempNode !== null) {
            if (tempNode !== null) {
                if (tempNode == undefined) {
                    return isLeft
                }
                tempNode = tempNode.getLeft()
            }
            if (tempNode === targetNode) {
                isLeft = true
            }
        }
        return isLeft
    }

    targetIsNodeRight(startNode: ScoreNode, targetNode: ScoreNode) {
        var tempNode: ScoreNode = startNode
        var isRight: Boolean = false
        while (tempNode !== null) {
            if (tempNode !== null) {
                if (tempNode == undefined) {
                    return isRight
                }
                tempNode = tempNode.getRight()
            }
            if (tempNode === targetNode) {
                isRight = true
            }
        }
        return isRight
    }

    getCurrentNode() {
        return this.currentNode
    }

    setCurrentNodeById(id: string) {
        if (id == undefined) return
        var lastNode = this.currentNode
        this.currentNode = this.graph.get(id) || this.graph.get(document.getElementById(id)?.closest(".chord")?.id) || lastNode
        if (this.currentNode == undefined) {
            console.log(lastNode)
            throw new Error("CurrentNode undefined although id is given: " + id)
        }
    }

    setContainerId(containerId: string) {
        this.containerId = containerId
    }

    nextUp() {
        if (this.currentNode != undefined && this.currentNode?.getUp() !== null) {
            this.currentNode = this.currentNode.getUp()
        }
        return this.currentNode
    }

    nextDown() {
        if (this.currentNode != undefined && this.currentNode?.getDown() !== null) {
            this.currentNode = this.currentNode.getDown()
        }
        return this.currentNode
    }

    nextRight() {
        if (this.currentNode != undefined && this.currentNode?.getRight() !== null) {
            this.currentNode = this.currentNode.getRight()
        }
        return this.currentNode
    }

    nextLeft() {
        if (this.currentNode != undefined && this.currentNode?.getLeft() !== null) {
            this.currentNode = this.currentNode.getLeft()
        }
        return this.currentNode
    }

    nextMeasureRight() {
        while (this.getCurrentNode().getRight().getDocElement().closest(".measure").id ===
            this.getCurrentNode().getDocElement().closest(".measure").id) {
            this.nextRight()
        }
        return this.currentNode
    }

    nextMeasureLeft() {
        while (this.getCurrentNode().getLeft().getDocElement().closest(".measure").id ===
            this.getCurrentNode().getDocElement().closest(".measure").id) {
            this.nextLeft()
        }
        return this.currentNode
    }

    /**
     * Go to next Element with given classname. 
     * Whatever comes first according to the classNames array.
     * @param classNames 
     * @param direction 
     * @returns 
     */
    getNextClass(classNames: string | string[], direction: string) {
        if (typeof classNames === "string") classNames = [classNames]
        var currentId = this.currentNode?.getId()
        if ([null, undefined].some(id => id == currentId)) return
        var nextIsNull = false
        do {
            switch (direction) {
                case "ArrowLeft":
                case "left":
                    this.nextLeft()
                    break;
                case "ArrowRight":
                case "right":
                    this.nextRight()
                    break;
                case "ArrowUp":
                case "up":
                    this.nextUp()
                    break;
                case "ArrowDown":
                case "down":
                    this.nextDown()
                    break;
                default:
                    console.error(direction + " is not allowed. Use left, right, up or down")
                    return
            }
            nextIsNull = [null, undefined].some(n => this.currentNode == n)
        } while (!classNames.some(cn => this.currentNode?.getDocElement()?.classList.contains(cn)) && !nextIsNull)

        if (nextIsNull) {
            this.setCurrentNodeById(currentId)
        }
        return this.currentNode
    }

    /**
     * Find node based on class Names. Will not change state and pointers of the graph.
     * To change this.currentNode, use getNextClass instead.
     * @param classNames 
     * @param direction 
     * @returns 
     */
    lookUp(classNames: string | string[], direction: string): ScoreNode {
        if (typeof classNames === "string") classNames = [classNames]
        var currentId = this.currentNode?.getId()
        if ([null, undefined].some(id => id == currentId)) return
        var isNull = false
        var node = this.currentNode
        do {
            switch (direction) {
                case "ArrowLeft":
                case "left":
                    node = node.getLeft()
                    break;
                case "ArrowRight":
                case "right":
                    node = node.getRight()
                    break;
                case "ArrowUp":
                case "up":
                    node = node.getUp()
                    break;
                case "ArrowDown":
                case "down":
                    node = node.getDown()
                    break;
                default:
                    console.error(direction + " is not allowed. Use left, right, up or down")
                    return
            }
            isNull = [null, undefined].some(n => node == n)
        } while (!classNames.some(cn => node?.getDocElement()?.classList.contains(cn)) && !isNull)

        return node
    }

    //Check if ScoreGraph is at beginning of layer
    isBOL(): Boolean {
        return this.currentNode.getLeft() === null && this.currentNode.getId().indexOf("BOL") !== -1
    }

}

export default ScoreGraph
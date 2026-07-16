import ScoreNode from "./ScoreNode"
import * as cq from "../utils/convenienceQueries"

type Direction = "left" | "right" | "up" | "down"

const directionAliases: Record<string, Direction> = {
    "ArrowLeft": "left",
    "ArrowRight": "right",
    "ArrowUp": "up",
    "ArrowDown": "down",
}

/**
 * A graph-based navigation model for musical score elements.
 * 
 * Instead of relying on DOM traversal, ScoreGraph builds an explicit
 * linked structure where each node (note, rest, chord, clef, etc.)
 * knows its left/right neighbors. This decouples navigation logic
 * from the rendering layer and makes keyboard-based score interaction
 * predictable regardless of visual layout.
 */
class ScoreGraph {

    private graph: Map<string, ScoreNode>
    private currentNode: ScoreNode
    private containerId: string

    constructor(xmlDoc: Document, containerId: string) {
        this.containerId = containerId
        this.populate(xmlDoc)
    }

    /**
     * Populate the graph from MEI data.
     * Determines left/right relations between elements grouped by staff and layer.
     * Up/down navigation is intentionally omitted here, as arrow-up/arrow-down
     * triggers transposition rather than cross-staff movement.
     */
    private populate(xmlDoc: Document): void {
        this.graph = new Map()

        const groupedLayers = this.collectLayersByStaff(xmlDoc)
        const groupedStaffDefs = this.collectStaffDefs()

        let prevNode: ScoreNode | null = null

        for (const staffN in groupedLayers) {
            for (const layerN in groupedLayers[staffN]) {
                const staffDefs = groupedStaffDefs[staffN]
                let lastStaffDefId: string | null = null

                if (staffDefs) {
                    for (const sd of staffDefs) {
                        lastStaffDefId = sd.id
                        const node = new ScoreNode(sd.id)
                        this.graph.set(sd.id, node)
                        if (prevNode) {
                            prevNode.setRight(node)
                            node.setLeft(prevNode)
                        }
                        prevNode = node
                    }
                }

                prevNode = null
                const layers = groupedLayers[staffN][layerN]

                layers.forEach((layer, layerIdx) => {
                    const elements = layer.querySelectorAll(
                        ":scope > note, rest, mRest, chord, keySig, clef, meterSig"
                    )
                    elements.forEach((el, elementIdx) => {
                        const node = new ScoreNode(el.id)
                        this.graph.set(el.id, node)

                        if (prevNode) {
                            prevNode.setRight(node)
                            node.setLeft(prevNode)
                        } else if (lastStaffDefId) {
                            node.setLeft(this.graph.get(lastStaffDefId))
                            if (layerIdx === 0 && elementIdx === 0) {
                                this.graph.get(lastStaffDefId)?.setRight(node)
                            }
                        }

                        prevNode = node
                    })
                })
            }
        }
    }

    /**
     * Groups all MEI layer elements by their parent staff number and layer number.
     */
    private collectLayersByStaff(xmlDoc: Document): Record<string, Record<string, Element[]>> {
        const grouped: Record<string, Record<string, Element[]>> = {}

        xmlDoc.querySelectorAll("staff").forEach(staff => {
            staff.querySelectorAll("layer").forEach(layer => {
                const staffN = staff.getAttribute("n")
                const layerN = layer.getAttribute("n")
                if (!grouped[staffN]) grouped[staffN] = {}
                if (!grouped[staffN][layerN]) grouped[staffN][layerN] = []
                grouped[staffN][layerN].push(layer)
            })
        })

        return grouped
    }

    /**
     * Collects clef, key signature, and meter signature elements
     * from the first rendered measure, grouped by staff number.
     */
    private collectStaffDefs(): Record<string, Element[]> {
        const grouped: Record<string, Element[]> = {}
        const container = cq.getContainer(this.containerId)

        container.querySelectorAll("#vrvSVG .measure[n='1'] .staff").forEach(staff => {
            const n = staff.getAttribute("n")
            if (!grouped[n]) grouped[n] = []

            const clef = staff.querySelector(".clef")
            if (clef) grouped[n].push(clef)

            const keySig = staff.querySelector(".keySig")
            if (keySig) grouped[n].push(keySig)

            const meterSig = staff.querySelector(".meterSig")
            if (meterSig) grouped[n].push(meterSig)
        })

        return grouped
    }

    // --- Navigation ---

    getCurrentNode(): ScoreNode {
        return this.currentNode
    }

    setCurrentNodeById(id: string): void {
        if (id == undefined) return
        const lastNode = this.currentNode
        this.currentNode =
            this.graph.get(id)
            || this.graph.get(document.getElementById(id)?.closest(".chord")?.id)
            || lastNode

        if (this.currentNode == undefined) {
            throw new Error("CurrentNode undefined although id is given: " + id)
        }
    }

    setContainerId(containerId: string): void {
        this.containerId = containerId
    }

    /**
     * Move to an adjacent node in the given direction.
     * Returns the (possibly unchanged) current node.
     */
    private step(direction: Direction): ScoreNode {
        const neighbor = this.getNeighbor(this.currentNode, direction)
        if (neighbor) {
            this.currentNode = neighbor
        }
        return this.currentNode
    }

    private getNeighbor(node: ScoreNode, direction: Direction): ScoreNode | null {
        if (!node) return null
        switch (direction) {
            case "left": return node.getLeft()
            case "right": return node.getRight()
            case "up": return node.getUp()
            case "down": return node.getDown()
        }
    }

    nextUp(): ScoreNode { return this.step("up") }
    nextDown(): ScoreNode { return this.step("down") }
    nextRight(): ScoreNode { return this.step("right") }
    nextLeft(): ScoreNode { return this.step("left") }

    nextMeasureRight(): ScoreNode {
        const currentMeasureId = this.getCurrentNode().getDocElement()?.closest(".measure")?.id
        while (this.currentNode.getRight()
            && this.currentNode.getRight().getDocElement()?.closest(".measure")?.id === currentMeasureId) {
            this.nextRight()
        }
        return this.currentNode
    }

    nextMeasureLeft(): ScoreNode {
        const currentMeasureId = this.getCurrentNode().getDocElement()?.closest(".measure")?.id
        while (this.currentNode.getLeft()
            && this.currentNode.getLeft().getDocElement()?.closest(".measure")?.id === currentMeasureId) {
            this.nextLeft()
        }
        return this.currentNode
    }

    /**
     * Traverse the graph in the given direction until a node matching
     * one of the class names is found. Updates currentNode.
     * Falls back to the starting node if no match is found.
     */
    getNextClass(classNames: string | string[], direction: string): ScoreNode | undefined {
        const resolved = this.resolveDirection(direction)
        if (!resolved) return

        const startId = this.currentNode?.getId()
        if (startId == null) return

        const result = this.traverse(this.currentNode, resolved, this.toArray(classNames))

        if (result) {
            this.currentNode = result
        } else {
            this.setCurrentNodeById(startId)
        }
        return this.currentNode
    }

    /**
     * Traverse the graph in the given direction until a node matching
     * one of the class names is found. Does NOT change currentNode.
     * Use getNextClass if you want to update the cursor position.
     */
    lookUp(classNames: string | string[], direction: string): ScoreNode | null {
        const resolved = this.resolveDirection(direction)
        if (!resolved) return null

        if (this.currentNode?.getId() == null) return null

        return this.traverse(this.currentNode, resolved, this.toArray(classNames))
    }

    isBOL(): boolean {
        return this.currentNode.getLeft() === null
            && this.currentNode.getId().indexOf("BOL") !== -1
    }

    // --- Private helpers ---

    /**
     * Core traversal: walk from startNode in the given direction,
     * return the first node whose DOM element matches any of the class names.
     * Returns null if the end of the chain is reached without a match.
     */
    private traverse(startNode: ScoreNode, direction: Direction, classNames: string[]): ScoreNode | null {
        let node = this.getNeighbor(startNode, direction)

        while (node) {
            if (classNames.some(cn => node.getDocElement()?.classList.contains(cn))) {
                return node
            }
            node = this.getNeighbor(node, direction)
        }

        return null
    }

    private resolveDirection(input: string): Direction | null {
        const direction = directionAliases[input] ?? input
        if (!["left", "right", "up", "down"].includes(direction)) {
            console.error(direction + " is not allowed. Use left, right, up or down")
            return null
        }
        return direction as Direction
    }

    private toArray(classNames: string | string[]): string[] {
        return typeof classNames === "string" ? [classNames] : classNames
    }
}

export default ScoreGraph
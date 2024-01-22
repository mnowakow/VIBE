/**
 * Class to edit the rendered svg.
 * E.g. Cache and Load Information from previous version of the SVG; Copy information form MEI to SVG (and vice versa); Edit DOM structure of Elements
 */

import * as cq from "../utils/convenienceQueries"
import * as meiOperation from "./MEIOperations"
import * as coords from "../utils/coordinates"
import { uuidv4 } from "./random"
import { constants as c } from "../constants"

class SVGEditor {

    private classListMap: Map<string, Array<string>>
    private scaleListMap: Map<string, string>
    private styleListMap: Map<string, string>
    private allowedMeiClasses = ["marked"]
    private containerId: string
    private container: Element
    private x: number
    private y: number

    constructor() {
        this.x = 0
        this.y = 0
    }

    /**
     * Fill SVG in Dom with relevant mei Information
     * @param mei Document from MEI
     */
    fillSVG(mei: Document) {
        this.fillSystemCounts(mei)
        this.countBarlines()
        return this
    }

    /**
     * Fill measure, staff and layer with n attributes from MEI
     * @param mei Document from MEI 
     */
    fillSystemCounts(mei: Document) {
        var that = this
        var elements = Array.from(mei.querySelectorAll("measure, staff, layer"))
        elements.forEach(e => {
            if (e.id !== "") {
                var svgElement = that.container.querySelector("#" + e.id)
                if (svgElement === null || e.getAttribute("n") === null) {
                    return
                }
                svgElement.setAttribute("n", e.getAttribute("n"))
            }
        })
        return this
    }

    cacheClasses() {
        //var svg = document.querySelector("#"+this.containerId + " #vrvSVG")
        var svg = document.querySelector("#" + this.containerId)
        if (!svg ) return this
        
        this.classListMap = new Map();
        var hasLastAdded: boolean = !!svg.querySelector(".lastAdded")
        svg.querySelectorAll("*").forEach(el => {
            //if(el.tagName.toLowerCase() === "g" && el.getAttribute("id") !== null){
            if(el.tagName.toLocaleLowerCase() !== "g" && !el.getAttribute("id")) return
            if(hasLastAdded){
                if(el.classList.contains("marked")){
                    el.classList.remove("marked")
                }
                // if(el.classList.contains("lastAdded")){
                //     el.classList.replace("lastAdded", "marked")
                // }
            }
    
            if (el.getAttribute("id") && !el.classList.contains("lastAdded")) {
                if (!this.classListMap.has(el.id)) {
                    this.classListMap.set(el.id, new Array())
                }
                var classes = el.getAttribute("class")?.split(" ")
                classes?.forEach(c => {
                    if (!this.classListMap.get(el.id).includes(c)) {
                        this.classListMap.get(el.id).push(c.slice())
                    }
                })
            }
        })
        return this
    }

    cacheStyles(){
        //var svg = document.querySelector("#"+this.containerId + " #vrvSVG")
        var svg = document.querySelector("#" + this.containerId)
        if (svg === null) {
            return this
        }

        this.styleListMap = new Map();
        svg.querySelectorAll("[style]").forEach(el => {
            if (el.getAttribute("id")) {
                const styles = el.getAttribute("style")
                if (!this.styleListMap.has(el.id)) {
                    this.styleListMap.set(el.id, "")
                }
                this.styleListMap.set(el.id, styles)
            }
        })
        return this
    }

    loadStyles(){
        if (this.styleListMap == undefined) {
            return this
        }

        for (const [key, value] of this.styleListMap.entries()) {
            var el = this.container.querySelector("#" + key)
            if (el) {
               el.setAttribute("style", value)
            }
        }
        return this
    }

    cacheScales() {
        var svg = document.querySelector("#" + this.containerId)
        if (svg === null) {
            return this
        }

        this.scaleListMap = new Map();
        svg.querySelectorAll("[transform]").forEach(el => {
            if (el.getAttribute("id") !== null) {
                var tattr = el.getAttribute("transform")
                if (tattr.includes("scale")) {
                    if (!this.scaleListMap.has(el.id)) {
                        this.scaleListMap.set(el.id, tattr)
                    }
                }
            }
        })
        return this
    }

    copyClassesFromMei(mei: Document) {
        if (this.classListMap == undefined) {
            return this
        }
        mei.querySelectorAll("score  *").forEach(el => {
            if (el.hasAttribute("class")) {
                var id = el.getAttribute("id") || el.getAttribute("xml:id")
                if (!this.classListMap.has(id)) {
                    this.classListMap.set(id, new Array())
                }
                var classes = el.getAttribute("class")?.split(" ")
                classes?.forEach(c => {
                    if (!this.classListMap.get(id).includes(c) && this.allowedMeiClasses.includes(c)) {
                        this.classListMap.get(id).push(c.slice())
                    }
                })
                el.removeAttribute("class")
            }
        })
        return this
    }

    /**
     * Reload all the classes which where distributed before
     * @returns this (for chaining convenience)
     */
    loadClasses(element = null) {
        if (this.classListMap == undefined) {
            return this
        }

        if (element) {
            var value = this.classListMap.get(element.id)
            if (value == undefined) return this
            value.forEach(v => {
                if(v === "hideUI") return
                if (v !== "") {
                    element.classList.add(v)
                }
            })
        } else {
            for (const [key, value] of this.classListMap.entries()) {
                var el = this.container.querySelector("#" + key)
                if (el !== null) {
                    //el.removeAttribute("class")
                    value.forEach(v => {
                        if(v === "hideUI") return
                        if (v !== "") {
                            el.classList.add(v)
                        }
                    })
                }
            }
        }
        return this
    }

    loadScales(element = null) {
        if (this.scaleListMap == undefined) {
            return this
        }

        if (element !== null) {
            var value = this.scaleListMap.get(element.id);
            if (value == undefined) return this;
            (element as HTMLElement).style.transform = value
            element.setAttribute("transform", value)
        } else {
            for (const [key, value] of this.scaleListMap.entries()) {
                var el = this.container.querySelector("#" + key)
                if (el !== null) {
                    (el as HTMLElement).style.transform = value
                    el.setAttribute("transform", value)
                }
            }
        }
        return this
    }

    repositionSVG(svg: HTMLElement) {
        var transformList = svg.getAttribute("transform")?.split(") ") || new Array()
        console.log(svg.getAttribute("transform"), transformList)
        var hasTranslate = false
        transformList.forEach((t, i) => {
            if (t.includes("translate")) {
                transformList[i] = "translate(" + this.x + " " + this.y + ")"
                hasTranslate = true
            }
            if (t.slice(-1) !== ")") {
                transformList[i] = transformList[i] + ")"
            }
        })
        if (!hasTranslate) {
            transformList.push("translate(" + this.x + " " + this.y + ")")
        }

        var trattr = transformList.join(" ")
        console.log(trattr)
        svg.setAttribute("transform", trattr)

        return this
    }

    /**
     * Merge all tspans in a harm object in the top tspan to avoid columns for (especially in Firefox browsers)
     * @returns 
     */
    clearTspan() {
        var gelements = this.container.querySelectorAll("g .harm")
        gelements.forEach(g => {
            var textEl = g.querySelector("text")
            var textTspan = g.querySelectorAll("tspan")
            var text = ""
            if (textTspan.length <= 2) {
                return
            }
            text = textTspan[0].textContent
            text = text.replace(/ /g, '')
            text = text.replace(/\n/g, '')
            textEl.querySelector("tspan").firstElementChild.textContent = text
            textEl.querySelector("tspan").firstElementChild.setAttribute("font-family", "VerovioText")
            textTspan.forEach((tp, idx) => {
                if (idx >= 2) {
                    tp.remove()
                }
            })
        })
        return this
    }

    drawLinesUnderSystems() {
        this.container.querySelectorAll(".systemLine").forEach(sl => sl.remove())
        this.container.querySelectorAll(".system").forEach(sys => {
            var line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
            line.classList.add("systemLine")
            var systemCoords = coords.getDOMMatrixCoordinates(sys.getBoundingClientRect(), sys.closest("svg"))
            var y = systemCoords.bottom
            line.setAttribute("x1", systemCoords.left.toString())
            line.setAttribute("y1", y.toString())
            line.setAttribute("x2", systemCoords.right.toString())
            line.setAttribute("y2", y.toString())
            var defScale = sys.closest(".definition-scale")
            defScale.prepend(line)
        })
    }

    /**
     * Modify the harm elements so that they have proper sub- and superscript numbers based on their used symbols (^ or _)
     */
    modifyHarm() {
        // 0, 1 applies for sup; 2, 3 applies for sub
        // create as <sup> element from ^{} or just ^
        // create as <sub> element from _{} or just _
        var indexingRegex = [/\^\{(.*?)\}/g, /\^\s*([^(]*)/g, /\_\{(.*?)\}/g, /\_\s*([^(]*)/g]

        var sameParent: Element // cache for parent to not replace elements multiple times
        this.container.querySelectorAll("[id].harm tspan").forEach(el => {
            //mustn't be in figured base, and no need for trim indicates that text content node is leaf of tree
            if (el.closest(".fb") !== null || el.textContent != el.textContent.trim()) return

            var elSiblings = el.querySelectorAll(":scope ~ tspan")
            if (sameParent === el.parentElement) {
                el.remove()
                return
            }
            if (elSiblings !== null) sameParent = el.parentElement
            var inputString = elSiblings === null ? el.textContent : el.parentElement.textContent.replace(/[\n\s]/g, "")
            el.textContent = ""
            indexingRegex.forEach((reg, i) => {
                var shift: string
                if (i < 2) {
                    shift = "super"
                } else if (i >= 2 && i < 4) {
                    shift = "sub"
                }
                var findStrings = inputString.match(reg)
                if (findStrings !== null) {
                    findStrings.forEach(fs => {
                        var modPart = fs;
                        ["^", "_", "{", "}"].forEach(s => modPart = modPart.replace(s, ""))
                        if (modPart === "") return
                        modPart = "<tspan class=\"indexBase\" baseline-shift=\"" + shift + "\">" + modPart + "</tspan>"
                        inputString = inputString.replace(fs, modPart)
                    })
                }
            })
            el.innerHTML = inputString
            // shift all tspans a little to the left so that they are all aligned vertically
            el.querySelectorAll("tspan").forEach((t, i) => {
                t.style.fontSize = "0.7em"
                if (i > 0) {
                    t.setAttribute("dx", (-(0.5) * i).toString() + "em")
                }
            })
        })

    }

    /**
 * Mark the current Measure as overfilled by writing "+!" over the barline
 * @param currentMEI 
 */
    markOverfilledMeasures(currentMEI: Document) {
        currentMEI.querySelectorAll("measure").forEach(m => {
            m.querySelectorAll("layer").forEach(l => {
                var layerRatio = meiOperation.getAbsoluteRatio(l)
                var targetRatio = meiOperation.getMeterRatioLocal(currentMEI, l)
                if (layerRatio > targetRatio) {
                    var measureSVG = document.querySelector("#vrvSVG #" + m.id)
                    if (measureSVG === null) return
                    var barLine = measureSVG.querySelector(".barLine")
                    var coordinates = coords.getDOMMatrixCoordinates(barLine, barLine.closest("g"))

                    var textGroup = document.createElementNS(c._SVGNS_, "g")
                    textGroup.setAttribute("id", uuidv4())
                    textGroup.setAttribute("targetId", barLine.id)

                    var text = document.createElementNS(c._SVGNS_, "svg")

                    var textForeignObject = document.createElementNS(c._SVGNS_, "foreignObject")
                    textForeignObject.classList.add("overfillMark")

                    var textDiv = document.createElement("div")
                    textDiv.setAttribute("contenteditable", "false")
                    textDiv.textContent = "+!"
                    text.append(textForeignObject)

                    textForeignObject.setAttribute("x", (coordinates.x * 0.95).toString())
                    textForeignObject.setAttribute("y", (-coordinates.y * 0.55).toString())
                    textForeignObject.setAttribute("height", (coordinates.height * 2).toString())
                    textForeignObject.setAttribute("width", (300).toString())
                    textForeignObject.append(textDiv)
                    textGroup.appendChild(text)
                    barLine.insertAdjacentElement("afterend", textGroup)
                }
            })
        })
    }

    countBarlines() {
        this.container.querySelectorAll(".barLine").forEach(bl => {
            bl.querySelectorAll("path").forEach((p, idx) => {
                p.setAttribute("n", (idx + 1).toString())
            })
        })
    }


    /**
     * Hide Rests of same duration in parallel layers. Also hide rests, when layer (n >= 2) is just rests.
     * @param currentMEI MEI to parse and compute relationships. Provides IDs for elements in SVG.
     * @returns this
     */
    hideRedundantRests(currentMEI: Document) {
        currentMEI.querySelectorAll("staff").forEach(s => {
            var prevLayerElements: Array<Element>
            const vrv = cq.getVrvSVG(this.containerId)
            s.querySelectorAll("layer").forEach(l => {
                if(parseInt(l.getAttribute("n")) === 1){
                    prevLayerElements = Array.from(l.children)
                    return
                }
                if (parseInt(l.getAttribute("n")) >= 2) {
                    if(!prevLayerElements){
                        prevLayerElements = Array.from(l.children)
                        return
                    }
                    const notes = l.querySelectorAll("note")
                    if (notes.length === 0) {
                        Array.from(l.children).forEach(c => vrv.querySelectorAll(`#${c.id} use`).forEach(u => u.setAttribute("visibility", "hidden")))
                    } else {
                        Array.from(l.children).forEach(c => {
                            prevLayerElements.forEach(ple => {
                                const isRest = ple.tagName.toLowerCase().includes("rest") && c.tagName.toLowerCase().includes("rest")
                                const sameDur = ple.getAttribute("dur") === c.getAttribute("dur");
                                const sameTstamp = meiOperation.getTimestamp(ple) === meiOperation.getTimestamp(c)
                                if(isRest && sameDur && sameTstamp){
                                    vrv.querySelector(`#${c.id} use`)?.setAttribute("visibility", "hidden")
                                }
                            })
                        })
                    }
                    prevLayerElements = Array.from(l.children)
                }
            })
        })
        return this
    }

    distributeIds(element: Element, propagation = false) {
        if (propagation) {
            var id = element.id !== "" ? element.id : element.getAttribute("refId")
            Array.from(element.children).forEach(c => {
                var selfId = c.id !== "" ? c.id : c.getAttribute("refId")
                if (selfId === null && id !== null) {
                    c.setAttribute("refId", id)
                }
                this.distributeIds(c, true)
            })
        } else {
            Array.from(element.querySelectorAll("*")).forEach(el => {
                if (el.id === "") {
                    el.setAttribute("id", uuidv4())
                }
            })
        }
        return this
    }

    setActiveLayer() {
        var container = cq.getContainer(this.containerId)
        if (!container.querySelector(".layer.activeLayer")) {
            container.querySelectorAll(".layer[n='1']").forEach(l => l.classList.add("activeLayer"))
        }
        container.querySelectorAll(".activeLayer").forEach(al => {
            var staffN = al.closest(".staff").getAttribute("n")
            var layerN = al.getAttribute("n")
            container.querySelectorAll(`.staff[n='${staffN}'] > .layer[n='${layerN}']`).forEach(layer => {
                layer.classList.add("activeLayer")
            })

        })
        return this
    }

    setContainerId(containerId: string) {
        this.containerId = containerId
        this.container = document.getElementById(containerId)
        return this
    }

    setXY(x: number, y: number) {
        this.x = x || 0
        this.y = y || 0

        //console.log("müssen die koordinaten noch umgerechnet werden???", x, y)
    }
}

export default SVGEditor
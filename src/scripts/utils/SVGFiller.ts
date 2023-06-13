/**
 * Class to fill SVG of Score in HTML with information from underlying mei
 */

import { uuidv4 } from "./random"

class SVGFiller {

    private classListMap: Map<string, Array<string>>
    private scaleListMap: Map<string, string>
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
        //var svg = document.querySelector("#"+this.containerId + " #rootSVG")
        var svg = document.querySelector("#" + this.containerId)
        if (svg === null) {
            return this
        }

        this.classListMap = new Map();
        svg.querySelectorAll("*").forEach(el => {
            //if(el.tagName.toLowerCase() === "g" && el.getAttribute("id") !== null){
            if (el.getAttribute("id") !== null) {
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
    loadClasses() {
        if (this.classListMap == undefined) {
            return this
        }

        for (const [key, value] of this.classListMap.entries()) {
            var el = this.container.querySelector("#" + key)
            if (el !== null) {
                //el.removeAttribute("class")
                value.forEach(v => {
                    if (v !== "") {
                        el.classList.add(v)
                    }
                })
            }
        }
        return this
    }

    loadScales() {
        if (this.scaleListMap == undefined) {
            return this
        }

        for (const [key, value] of this.scaleListMap.entries()) {
            var el = this.container.querySelector("#" + key)
            if (el !== null) {
                el.setAttribute("transform", value)
                var style = el.getAttribute("style")
                if(style === null){
                    el.setAttribute("style", "transform: " + value)
                }else{
                    el.setAttribute("style", style + "; transform: " + value)
                }
            }
        }
        return this
    }

    repositionSVG(svg: HTMLElement){
        var transformList = svg.getAttribute("transform")?.split(") ") || new Array()
        console.log(svg.getAttribute("transform"), transformList)
        var hasTranslate = false
        transformList.forEach((t, i) => {
            if(t.includes("translate")){
                transformList[i] = "translate(" + this.x + " " + this.y + ")"
                hasTranslate = true
            }
            if(t.slice(-1) !== ")"){
                transformList[i] = transformList[i] + ")"
            }
        })
        if(!hasTranslate){
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

    countBarlines() {
        this.container.querySelectorAll(".barLine").forEach(bl => {
            bl.querySelectorAll("path").forEach((p, idx) => {
                p.setAttribute("n", (idx + 1).toString())
            })
        })
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

export default SVGFiller
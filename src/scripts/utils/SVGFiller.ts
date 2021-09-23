/**
 * Class to fill SVG of Score in HTML with information from underlying mei
 */
class SVGFiller{

    private classListMap: Map<string, DOMTokenList>

    constructor(){}

    /**
     * Fill SVG in Dom with relevant mei Information
     * @param mei Document from MEI
     */
    fillSVG(mei: Document){
        this.fillSystemCounts(mei)
        return this
    }

    /**
     * Fill measure, staff and layer with attributes from MEI
     * @param mei Document from MEI 
     */
    fillSystemCounts(mei: Document){
        var elements = Array.from(mei.querySelectorAll("measure, staff, layer"))
        elements.forEach(e => {
            var svgElement = document.getElementById(e.id)
            if(svgElement === null || e.getAttribute("n") === null ){
                return
            }
            svgElement.setAttribute("n", e.getAttribute("n"))
        })
        return this
    }

    cacheClasses(){
        var svg = document.getElementById("rootSVG")
        if(svg === null){
            return this
        }

        this.classListMap = new Map();
        svg.querySelectorAll("*").forEach(el => {
            if(el.tagName.toLowerCase() === "g" && el.getAttribute("id") !== null){
                this.classListMap.set(el.getAttribute("id"), el.classList)
            }
        })
        return this
    }

    /**
     * Reload all the classes which where distributed before
     * @returns this (for chaining convenience)
     */
    loadClasses(){
        if(typeof this.classListMap === "undefined"){
            return this
        }

        for(const [key, value] of this.classListMap.entries()){
            var el = document.getElementById(key)
            if(el !== null){
                el.removeAttribute("class")
                value.forEach(v => {
                    if(!el.hasAttribute("class")){
                        el.setAttribute("class", v)
                    }else{
                        el.classList.add(v)
                    }
                })
            }
        }
        return this
    }

    /**
     * Merge all tspans in a harm object in the top tspan to avoid columns for (especially in Firefox browsers)
     * @returns 
     */
    clearTspan(){
        var gelements = document.querySelectorAll("g .harm")
        gelements.forEach(g => {
            var textEl = g.querySelector("text")
            var textTspan = g.querySelectorAll("tspan")
            var text = ""
            if(textTspan.length <= 2){
                return
            }
            text = textTspan[0].textContent
            text = text.replace(/ /g,'')
            text = text.replace(/\n/g,'')
            textEl.querySelector("tspan").firstElementChild.textContent = text
            textEl.querySelector("tspan").firstElementChild.setAttribute("font-family", "VerovioText")
            textTspan.forEach((tp, idx) => {
                if(idx >= 2){
                    tp.remove()
                }
            })
        })
        return this
    }
}

export default SVGFiller
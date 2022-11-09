import Handler from "./Handler";
import * as cq from "../utils/convenienceQueries"
import { createPopper } from '@popperjs/core';
import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript";

export default class TooltipHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;

    containerId: string
    interactionOverlay: Element
    rootSVG: Element
    container: Element

    private timeOuts: Array<any>
    private ttQuerySelector = "#btnToolbar button, #customToolbar button, #sidebarContainer a, #manipulatorCanvas svg"

    constructor(){
        this.timeOuts = new Array()
        this.removeListeners()
    }

    setContainerId(containerId: string) {
        this.containerId = containerId
        this.interactionOverlay = cq.getInteractOverlay(containerId)
        this.rootSVG = cq.getRootSVG(containerId)
        this.container = document.getElementById(containerId)
        return this
    }

    setListeners() {
        this.setTTListeners()
        this.resetTTListeners()
        return this
    }

    /**
     * Create a tooltip for every button in queryselectot.
     * Set Listeners to display TT for every element 
     */
    setTTListeners(){
        var that = this
        this.container?.querySelectorAll(this.ttQuerySelector).forEach(btn => {
            btn.addEventListener("mouseenter", that.enterHoverListener)
            btn.addEventListener("mouseleave", that.leaveHoverListener)
        })
    }

    /**
     * Resetting TT listeners might be wanted when Elements are collapsable since position of the elements will change
     */
    resetTTListeners(){
        var that = this
        this.container?.querySelectorAll(".accordion-collapse").forEach(ac => {
            ac.addEventListener("hidden.bs.collapse", function(e){
                that.removeListeners()
                that.setTTListeners()
            })

            ac.addEventListener("shown.bs.collapse", function(e){
                that.removeListeners()
                that.setTTListeners()
            })
        })

        this.container?.querySelectorAll(".manipulator").forEach(m => {
            m.addEventListener("click", function(e){
                that.removeListeners()
                that.setTTListeners()
            })
        })
    }

    /**
     * Create a list of opened timeouts 
     */
    enterHoverListener = (function enterHoverListener(e: MouseEvent){
        this.createTooltip(e.target as Element)
        setTimeout(() => {
            var t = e.target as Element
            var tt = this.container?.querySelector("#" + t.getAttribute("aria-describedby"))
            tt?.classList.remove("hide")
            tt?.classList.add("show")
        }, 1000)
    }).bind(this)
    
    /**
     * create actual tooltip as element
     */
    createTooltip(el: Element){
        var ttid = "tt-" + el.id + "-" + this.containerId
        el.setAttribute("aria-describedby", ttid)
        var tt = document.createElement("div")
        tt.setAttribute("role", "tooltip")
        tt.setAttribute("id", ttid)
        tt.textContent = el.id
        tt.classList.add("tooltip")
        tt.classList.add("hide")

        var arrow = document.createElement("div")
        arrow.setAttribute("data-popper-arrow", "")
        tt.append(arrow)

        this.container.prepend(tt)
        createPopper(el, tt, {
            placement: 'bottom-start',
            modifiers: [
                {
                    name: 'offset',
                    options: {
                        offset: [0, 8],
                    },
                },
                // {
                //     name: 'arrow',
                //     options: {
                //         element: arrow,
                //         padding: 2,
                //     },
                // },
            ],
        })
    }

    removeListeners() {
        var that = this
        this.container?.querySelectorAll(this.ttQuerySelector).forEach(btn => {
            btn.removeEventListener("mouseenter", that.enterHoverListener)
            btn.removeEventListener("mouseleave", that.leaveHoverListener)
        })
        this.timeOuts?.forEach(to => {
            clearTimeout(to)
            that.timeOuts.pop()
        })
        this.container?.querySelectorAll(".tooltip").forEach(tt => {
            tt.remove()
        })
        return this
    }

    /**
     * Destroy tooltip on leaving element. 
     */
    leaveHoverListener = (function leaveHoverListener(e: MouseEvent){
        var t = e.target as Element
        var tt = this.container?.querySelector("#" + t.getAttribute("aria-describedby"))
        tt?.remove()
    }).bind(this)

}
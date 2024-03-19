import { constants as c } from './constants';
import * as customType from './utils/Types';
import Core from './Core';
import InsertHandler from './handlers/InsertModeHandler';
import { Mouse2SVG } from './utils/Mouse2SVG';
import * as dc from './utils/DOMCreator'
import Tabbar from './gui/Tabbar'

/**
 * Main Class for the Verovio Interface for Browser based Editing
 */
class VIBE {
    public coreInstance: Core;
    public startId: string;
    public endId: string;
    public Mouse2SVG: Mouse2SVG;
    public currentMEI: string;
    public insertHandler: InsertHandler;

    private options: customType.InstanceOptions;
    private container: HTMLElement
    private meiChangedCallback: (mei: string) => void;

    private isFullContainer = false
    private tabbar: Tabbar


    /**
     * 
     * @param container Container in which the editor will be displayed
     * @param options options from Class implementing H5P functionality
     */
    constructor(container: HTMLElement = null, options: customType.InstanceOptions, meiCallback?: (mei: string) => void) {
        if (container?.id === null) {
            throw new Error("The editor's container must have an id")
        }
        if (container === null) {
            container = document.body
            container.id = "editorInBody"
        }
        if (container?.classList.contains("vibe-container")) {
            this.isFullContainer = true
            Array.from(container.children).forEach(c => {
                if (c.id != "svgContainer") c.remove()
            })
        } else {
            container?.classList?.add("vibe-container")
        }
        this.container = container
        this.options = options
        this.tabbar = new Tabbar(this.options, this.container.id)//new Toolbar(this.options, this.container.id)
        this.meiChangedCallback = meiCallback
        this.loadScripts()
        this.setMutationObserver()
    }

    /**
     * Load verovio script from the internet.
     * Makes sure that only one script instance is in the DOM.
     */
    loadScripts() {
        var src = "https://www.verovio.org/javascript/" + c._VEROVIO_VERSION_ + "/verovio-toolkit.js"
        var scriptId = "verovioScript"
        var script = document.querySelector("#" + scriptId) as HTMLScriptElement || document.createElement('script');
        script.src = src
        if (script.id === "") {
            script.id = scriptId
        }
        if (script.getAttribute("loaded") === null) {
            script.setAttribute("loaded", "false")
        }

        if (script.getAttribute("loaded") === "true") {

            this.initGUI().then(() => {
                // if(this.meiChangedCallback != undefined){ 
                //     this.setMEIChangedCallback(this.meiChangedCallback)
                // }
            })

        }

        if (document.getElementById(scriptId) === null) {
            var prior = document.getElementsByTagName('script')[0];
            script.async = false;
            prior.parentNode.insertBefore(script, prior);
            script.onload = function () {
                script.setAttribute("loaded", "true")
            };
        }
    }

    /**
     * Observes if the script is already loaded. Fires initGUI() when Attribute "loaded" changes to "true"
     */
    setMutationObserver() {
        var that = this
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === "attributes") {
                    var t = mutation.target as HTMLElement
                    if (mutation.attributeName === "loaded" && t.getAttribute(mutation.attributeName) === "true") {

                        that.initGUI().then(() => {
                            // if(that.meiChangedCallback != undefined){ 
                            //     that.setMEIChangedCallback(that.meiChangedCallback)
                            // }
                        })

                    }
                }
            });
        });
        observer.observe(document.getElementById("verovioScript"), {
            attributes: true
        })
    }

    /**
     * Init gui on load.
     * Toolbars are predefined.
     */
    initGUI(): Promise<void> {
        return new Promise((resolve): void => {
            var btnGrpClass = "btn-group-md me-2"
            // MAIN/ Permanent TOOLBAR
            // parentElement for dropdown
            this.container.append(dc.makeNewDiv("handlerGroup", btnGrpClass, { role: "group" })) //"me-2 h-100"))

            //parentElement for Notebuttons
            this.container.append(dc.makeNewDiv("noteGroup", btnGrpClass, { role: "group" }))

            //parentElement for Dotbuttons
            this.container.append(dc.makeNewDiv("dotGroup", btnGrpClass, { role: "group" }))

            //parentElement for local modifier Buttons
            this.container.append(dc.makeNewDiv("modGroup", btnGrpClass, { role: "group" }))

            //parentElement for local accidental Buttons
            this.container.append(dc.makeNewDiv("accidGroup", btnGrpClass, { role: "group" }))
            
            //parentElement for local articulation Buttons
            this.container.append(dc.makeNewDiv("articGroup", btnGrpClass, { role: "group" }))

            //sidebarList
            this.container.append(dc.makeNewDiv("sidebarContainer", "sidebar closedSidebar"))

            //parentElement for sidebar open/close
            this.container.append(dc.makeNewDiv("sideBarGroup", btnGrpClass, { role: "group" }))

            //parentElement for playback
            this.container.append(dc.makeNewDiv("soundGroup", btnGrpClass, { role: "group" }))

            //parentElement for zoom
            this.container.append(dc.makeNewDiv("zoomGroup", btnGrpClass, { role: "group" }))

            //parentElement for colorPicker
            this.container.append(dc.makeNewDiv("colorGroup", btnGrpClass, { role: "group" }))

            //parentElement for midi device selection
            this.container.append(dc.makeNewDiv("midiSelectGroup", btnGrpClass, { role: "group" }))

            //parentElement for fileselect group
            this.container.append(dc.makeNewDiv("fileSelectGroup", btnGrpClass, { role: "group" }))

            // parentElement for toolbarTop
            this.container.append(dc.makeNewDiv("btnToolbar", "btn-toolbar d-inline-flex align-items-stretch", { role: "toolbar" }))

            ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // CUSTOM TOOLBAR

            // parentElement for customToolbar
            this.container.append(dc.makeNewDiv("customToolbar", "btn-toolbar align-items-stretch", { role: "toolbar" }))

            // and now the tabs
            this.container.append(dc.makeNewDiv("notationTabGroup", btnGrpClass, { role: "group" }))
            this.container.append(dc.makeNewDiv("articulationTabGroup", btnGrpClass, { role: "group" }))
            this.container.append(dc.makeNewDiv("annotationTabGroup", btnGrpClass, { role: "group" }))
            //this.container.append(dc.makeNewDiv("melismaTabGroup", btnGrpClass, {role: "group"}))

            this.tabbar.createToolbars()
            resolve(this.createCoreInstance())
        })

    }

    createCoreInstance(): Promise<void> {

        return new Promise(resolve => {
            //attach mei first time
            this.coreInstance = new Core(this.container.id);
            if(!this.isFullContainer){
                this.container.append(dc.makeNewDiv(c._TARGETDIVID_, ""))
            }else{
                const sc = this.container.querySelector("#svgContainer")
                sc.parentElement.append(sc)
            }
            var initEvent = new Event("vibeInit")
            var data: any
            var isUrl: boolean = false
            if (this.options?.meiURL != undefined) {
                data = this.options.meiURL
                isUrl = true
            } else if (this.options?.data != undefined) {
                data = this.options.data
            } else if (this.options === null) {
                data = null
            }
            this.coreInstance.setMEIChangedCallback(this.meiChangedCallback)
            if (!this.isFullContainer) {
                this.coreInstance.loadData(data, isUrl).then(() => {
                    this.container.dispatchEvent(initEvent)
                    resolve()
                });
            } else {
                this.coreInstance.loadWithExistingSVG(this.container, data, isUrl).then(() => {
                    this.container.dispatchEvent(initEvent)
                    resolve()
                })
            }

            this.tabbar
                .setLoadDataCallback(this.coreInstance.loadDataHandler)
                .setAlignCallback(this.coreInstance.alignFunctionHandler)
                .setGetMEICallback(this.coreInstance.getMEI.bind(this.coreInstance))
            //block everthing when firefox is not at least version 114.0
            if (navigator.userAgent.toLowerCase().includes("firefox")) {
                const userAgent = navigator.userAgent;
                const firefoxVersion = parseFloat(userAgent.split("Firefox/")[1])
                const isAtLeast114 = firefoxVersion >= 114.0;
                if (!isAtLeast114) {
                    var div = document.createElement("div")
                    div.id = "ff_warning"
                    this.container.insertAdjacentElement("beforebegin", div)
                    div.append(this.container)
                    div.textContent = "This application can't be used with your current Firefox version (" + navigator.userAgent.match(/Firefox\/(\d+(\.\d+)?)/)[1] + ").\n Please update at least to version 114.0.2 or use another browser."
                }
            }
        })
    }

    /**
     * 
     * @param meiChangedCallback Function in which the mei will be used by the calling instance
     */
    private setMEIChangedCallback(meiChangedCallback: (mei: string) => void): void {
        this.meiChangedCallback = meiChangedCallback
        this.coreInstance.setMEIChangedCallback(this.meiChangedCallback)
    }

    /**
     * Get Core Instance to manipulate svg output
     * @returns 
     */
    getCore() {
        return this.coreInstance
    }

}

export default VIBE;
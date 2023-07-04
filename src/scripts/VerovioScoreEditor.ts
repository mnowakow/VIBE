import { constants as c} from './constants';
import * as customType from './utils/Types';
import Core from './Core';
import InsertHandler from './handlers/InsertModeHandler';
import { Mouse2SVG } from './utils/Mouse2SVG';
import * as dc from './utils/DOMCreator'
import Toolbar from './gui/Toolbar'
import Tabbar from './gui/Tabbar'


/**
 * Main Class for the VerovioScoreEditor
 */
class VerovioScoreEditor{
    public coreInstance: Core;
    public startId: string;
    public endId: string;
    public Mouse2SVG: Mouse2SVG;
    public currentMEI: string;
    public insertHandler: InsertHandler;
    
    private options: customType.InstanceOptions;
    private container: HTMLElement
    private meiChangedCallback: (mei: string) => void;

    
    /**
     * 
     * @param container Container in which the editor will be displayed
     * @param options options from Class implementing H5P functionality
     */
    constructor(container: HTMLElement = null, options: customType.InstanceOptions, meiCallback?: (mei: string) => void){
        if(container?.id === null){
            throw new Error("The editor's container must have an id")
        }
        if(container === null){
            container = document.body
            container.id = "editorInBody"
        }
        container?.classList?.add("vse-container")
        this.container = container
        this.options = options
        this.meiChangedCallback = meiCallback
        this.loadScripts()
        this.setMutationObserver()
    }

    /**
     * Load verovio script. 
     * Makes sure that only one script instance is in the DOM.
     * 
     */
    loadScripts(){
        var src = "https://www.verovio.org/javascript/" + c._VEROVIO_VERSION_ + "/verovio-toolkit.js"
        var scriptId = "verovioScript"
        var script = document.querySelector("#" + scriptId) as HTMLScriptElement || document.createElement('script');
        script.src = src
        if(script.id === ""){
            script.id = scriptId
        }
        if(script.getAttribute("loaded") === null){
            script.setAttribute("loaded", "false")
        }

        if(script.getAttribute("loaded") === "true"){
            this.initGUI().then(() => {
                if(this.meiChangedCallback != undefined){ 
                    this.setMEIChangedCallback(this.meiChangedCallback)
                }
            })
        }
        
        if(document.getElementById(scriptId) === null){
            var prior = document.getElementsByTagName('script')[0];
            script.async = false;
            prior.parentNode.insertBefore(script, prior);
            script.onload = function() {
                script.setAttribute("loaded", "true")
            };
        }
    }

    /**
     * Observes if the script is already loaded. Fires initGUI() when Attribute "loaded" changes to "true"
     */
    setMutationObserver(){
        var that = this
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === "attributes") {
                    var t = mutation.target as HTMLElement
                    if(mutation.attributeName === "loaded" && t.getAttribute(mutation.attributeName) === "true"){
                        that.initGUI().then(() => {
                            if(that.meiChangedCallback != undefined){ 
                                that.setMEIChangedCallback(that.meiChangedCallback)
                            }
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
     * Init everything on load
     * @param container container provided by H5P
     */
    initGUI(): Promise<void>{
        return new Promise((resolve): void => {
            var btnGrpClass = "btn-group-sm me-2"
            // MAIN/ Permanent TOOLBAR
            // parentElement for dropdown
            this.container.append(dc.makeNewDiv("handlerGroup", btnGrpClass, {role: "group"})) //"me-2 h-100"))
        
            //parentElement for Notebuttons
            this.container.append(dc.makeNewDiv("noteGroup", btnGrpClass, {role: "group"}))

            //parentElement for Dotbuttons
            this.container.append(dc.makeNewDiv("dotGroup", btnGrpClass, {role: "group"}))

            //parentElement for local modifier Buttons
            this.container.append(dc.makeNewDiv("modGroup", btnGrpClass, {role: "group"}))

            //sidebarList
            this.container.append(dc.makeNewDiv("sidebarContainer", "sidebar closedSidebar"))

            //parentElement for sidebar open/close
            this.container.append(dc.makeNewDiv("sideBarGroup", btnGrpClass, {role: "group"}))

            //parentElement for playback
            this.container.append(dc.makeNewDiv("soundGroup", btnGrpClass, {role: "group"}))

            //parentElement for zoom
            this.container.append(dc.makeNewDiv("zoomGroup", btnGrpClass, {role: "group"}))

            //parentElement for fileselect group
            this.container.append(dc.makeNewDiv("fileSelectGroup", btnGrpClass, {role: "group"}))

            // parentElement for toolbarTop
            this.container.append(dc.makeNewDiv("btnToolbar", "btn-toolbar d-inline-flex align-items-stretch", {role: "toolbar"}))

            ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // CUSTOM TOOLBAR
        
            // parentElement for customToolbar
            this.container.append(dc.makeNewDiv("customToolbar", "btn-toolbar align-items-stretch", {role: "toolbar"}))

            // and now the tabs
            this.container.append(dc.makeNewDiv("notationTabGroup", btnGrpClass, {role: "group"}))
            this.container.append(dc.makeNewDiv("annotationTabGroup", btnGrpClass, {role: "group"}))
            this.container.append(dc.makeNewDiv("articulationTabGroup", btnGrpClass, {role: "group"}))
            this.container.append(dc.makeNewDiv("melismaTabGroup", btnGrpClass, {role: "group"}))


            var tb = new Tabbar(this.options, this.container.id)//new Toolbar(this.options, this.container.id)
            tb.createToolbars()
            //attach mei first time
            this.coreInstance = new Core(this.container.id);
            this.container.append(dc.makeNewDiv(c._TARGETDIVID_, ""))
            var initEvent = new Event("vseInit")
            var data: any
            var isUrl: boolean = false
            if(this.options?.meiURL != undefined){
                data = this.options.meiURL
                isUrl = true
            }else if(this.options?.data != undefined){
                data = this.options.data
            }else if(this.options === null){
                data = null
            }
            this.coreInstance.loadData(data, isUrl).then(() => {
                this.container.dispatchEvent(initEvent)
                resolve()
            });

            tb.setImportCallback(this.coreInstance.loadDataFunction)
            tb.setGetMEICallback(this.coreInstance.getMEI.bind(this.coreInstance))
            //block everthing when firefox (use at least version 114.0.2)
            if(navigator.userAgent.toLowerCase().includes("firefox")){
                if(!navigator.userAgent.match("Firefox.*")[0].includes("114.0")){
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
    private setMEIChangedCallback(meiChangedCallback: (mei: string) => void): void{
        this.meiChangedCallback = meiChangedCallback
        this.coreInstance.setMEIChangedCallback(this.meiChangedCallback)
    }

    /**
     * Get Core Instance to manipulate svg output
     * @returns 
     */
    getCore(){
        return this.coreInstance
    }

}

export default VerovioScoreEditor;
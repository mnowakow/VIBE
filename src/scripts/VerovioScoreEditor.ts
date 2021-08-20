import { constants as c} from './constants';
import * as customType from './utils/Types';
import Core from './Core';
import InsertHandler from './handlers/InsertModeHandler';
import { Mouse2MEI } from './utils/Mouse2MEI';
import * as dc from './utils/DOMCreator'
import Toolbar from './gui/Toolbar'

/**
 * Main Class for the VerovioScoreEditor
 */
class VerovioScoreEditor{
    public coreInstance: Core;
    public startId: string;
    public endId: string;
    public mouse2mei: Mouse2MEI;
    public currentMEI: string;
    public insertHandler: InsertHandler;
    
    private options: customType.InstanceOptions;
    
    /**
     * 
     * @param container Container in which the editor will be displayed
     * @param options options from Class implementing H5P functionality
     */
    constructor(container: HTMLElement = null, options: customType.InstanceOptions){
        if(container === null){
            container = document.body
        }
        container.classList.add("vse-container")
        var script = document.createElement('script');
        var prior = document.getElementsByTagName('script')[0];
        script.async = false;
    
        var that = this
        //@ts-ignore
        script.onload = function() {

            that.options = options;
            that._attach(container);
        };
    
        script.src = "https://www.verovio.org/javascript/" + c._VEROVIO_VERSION_ + "/verovio-toolkit.js";
        prior.parentNode.insertBefore(script, prior);
    }
    /**
     * 
     * @param container Container in which application will be shown
     */
    _attach(container: HTMLElement): void{

        this.init(container);
        // document.addEventListener("click", function(e){
        //     console.log("Ich habe geklickt", e)
        // })

        // document.addEventListener("keydown", function(e){
        //     console.log("Ich habe eine taste gedrückt", e)
        // })
    }

    /**
     * Init everything on load
     * @param container container provided by H5P
     */
    init(container: HTMLElement){
    
        // MAIN/ Permanent TOOLBAR
        // parentElement for dropdown
        container.append(dc.makeNewDiv("handlerGroup", "dropdown me-2", ))
    
        //parentElement for Notebuttons
        container.append(dc.makeNewDiv("noteGroup", "btn-group me-2", {role: "group"}))

        //parentElement for Dotbuttons
        container.append(dc.makeNewDiv("dotGroup", "btn-group me-2", {role: "group"}))

         //parentElement for Modification Buttons
         container.append(dc.makeNewDiv("modGroup", "btn-group me-2", {role: "group"}))

         //sidebarList
         container.append(dc.makeNewDiv("sidebarContainer", "sidebar closedSidebar"))

         //parentElement for sidebar open/close
         container.append(dc.makeNewDiv("sideBarGroup", "btn-group me-2", {role: "group"}))

        // parentElement for toolbarTop
        container.append(dc.makeNewDiv("btnToolbar", "btn-toolbar d-inline-flex align-items-stretch", {role: "toolbar"}))

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // CUSTOM TOOLBAR
    

        // parentElement for customToolbar
        container.append(dc.makeNewDiv("customToolbar", "btn-toolbar align-items-stretch", {role: "toolbar"}))

        //Statusbar
        //container.parentElement.insertBefore(dc.makeNewDiv("statusBar", ""), container.nextElementSibling)
        var statusBar = dc.makeNewDiv("statusBar", "")
        statusBar.textContent = "Status: "
        container.append(statusBar)


        var tb = new Toolbar(this.options)
        tb.createToolbars()


        //attach mei first time
        this.coreInstance = new Core();
        container.append(dc.makeNewDiv(c._TARGETDIVID_, ""))
        if(this.options.meiURL != undefined){
            this.coreInstance.loadData('', this.options.meiURL, true, c._TARGETDIVID_).then((mei) => {
                this.currentMEI = mei;
            });
        }else if(this.options.data != undefined){
            this.coreInstance.loadData('', this.options.data, false, c._TARGETDIVID_).then((mei) => {
                this.currentMEI = mei;
            });
        }
    }

}

export default VerovioScoreEditor;
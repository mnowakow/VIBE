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
    private container: HTMLElement
    private meiChangedCallback: (mei: string) => void;

    
    /**
     * 
     * @param container Container in which the editor will be displayed
     * @param options options from Class implementing H5P functionality
     */
    constructor(container: HTMLElement = null, options: customType.InstanceOptions, meiCallback?: (mei: string) => void){
        if(container === null){
            container = document.body
        }
        container?.classList?.add("vse-container")
        this.container = container
        this.options = options
        this.meiChangedCallback = meiCallback
    }

    init(): Promise<void>{
        return new Promise((resolve): void =>{
            var script = document.createElement('script');
            var prior = document.getElementsByTagName('script')[0];
            script.async = false;
        
            var that = this
            //@ts-ignore
            script.onload = function() {

                that.initGUI().then(() => {
                    if(that.meiChangedCallback != undefined){
                        that.setMEIChangedCallback(that.meiChangedCallback)
                    }
                    resolve()
                })
            };
        
            script.src = "https://www.verovio.org/javascript/" + c._VEROVIO_VERSION_ + "/verovio-toolkit.js";
            prior.parentNode.insertBefore(script, prior);
        })
    }

    /**
     * Init everything on load
     * @param container container provided by H5P
     */
    initGUI(): Promise<void>{
        return new Promise((resolve): void => {
            var btnGrpClass = "btn-group me-2"
            // MAIN/ Permanent TOOLBAR
            // parentElement for dropdown
            this.container.append(dc.makeNewDiv("handlerGroup", btnGrpClass, {role: "group"})) //"me-2 h-100"))
        
            //parentElement for Notebuttons
            this.container.append(dc.makeNewDiv("noteGroup", btnGrpClass, {role: "group"}))

            //parentElement for Dotbuttons
            this.container.append(dc.makeNewDiv("dotGroup", btnGrpClass, {role: "group"}))

            //parentElement for Modification Buttons
            this.container.append(dc.makeNewDiv("modGroup", btnGrpClass, {role: "group"}))

            //sidebarList
            this.container.append(dc.makeNewDiv("sidebarContainer", "sidebar closedSidebar"))

            //parentElement for sidebar open/close
            this.container.append(dc.makeNewDiv("sideBarGroup", btnGrpClass, {role: "group"}))

            // parentElement for toolbarTop
            this.container.append(dc.makeNewDiv("btnToolbar", "btn-toolbar d-inline-flex align-items-stretch", {role: "toolbar"}))

            ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // CUSTOM TOOLBAR
        
            // parentElement for customToolbar
            this.container.append(dc.makeNewDiv("customToolbar", "btn-toolbar align-items-stretch", {role: "toolbar"}))

            //Statusbar
            //c ontainer.parentElement.insertBefore(dc.makeNewDiv("statusBar", ""), container.nextElementSibling)
            // var statusBar = dc.makeNewDiv("statusBar", "")
            // statusBar.textContent = "Status: "
            // this.container.append(statusBar)
            // test

            var tb = new Toolbar(this.options)
            tb.createToolbars()


            //attach mei first time
            this.coreInstance = new Core();
            this.container.append(dc.makeNewDiv(c._TARGETDIVID_, ""))
            if(this.options?.meiURL != undefined){
                this.coreInstance.loadData('', this.options.meiURL, true, c._TARGETDIVID_).then((mei) => {
                    this.currentMEI = mei;
                    resolve()
                });
            }else if(this.options?.data != undefined){
                this.coreInstance.loadData('', this.options.data, false, c._TARGETDIVID_).then((mei) => {
                    this.currentMEI = mei;
                    resolve()
                });
            }else if(this.options === null){
                this.coreInstance.loadData('', null, false, c._TARGETDIVID_).then((mei) => {
                    this.currentMEI = mei;
                    resolve()
                });
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

    getCore(){
        return this.coreInstance
    }

}

export default VerovioScoreEditor;
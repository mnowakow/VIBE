import VerovioWrapper from './utils/VerovioWrapper';
import { NewNote, VerovioMessage, VerovioResponse, EditorAction, Attributes, LoadOptions, timemapObject } from './utils/Types';
import { uuidv4 } from './utils/random';
import { constants as c } from './constants';
import InsertModeHandler from './handlers/InsertModeHandler';
import DeleteHandler from './handlers/DeleteHandler';
import NoteDragHandler from './handlers/NoteDragHandler';
import { Mouse2SVG } from './utils/Mouse2SVG';
import GlobalKeyboardHandler from './handlers/GlobalKeyboardHandler';
import MusicProcessor from './MusicProcessor';
import * as meiConverter from "./utils/MEIConverter"
import * as meiOperation from "./utils/MEIOperations"
import MeiTemplate from './assets/mei_template';
import SVGEditor from "./utils/SVGEditor"
import ScoreGraph from './datastructures/ScoreGraph';
import WindowHandler from "./handlers/WindowHandler"
import SidebarHandler from './handlers/SidebarHandler';
import LabelHandler from './handlers/LabelHandler';
import CustomToolbarHandler from './handlers/CustomToolbarHandler';
import * as cq from "./utils/convenienceQueries"
import * as coordinates from "./utils/coordinates"
import TooltipHandler from './handlers/TooltipHandler';
import { right } from '@popperjs/core';


/**
 * The core component the Editor. Manages the rendering with
 * the verovio toolkit, sets bounding boxes and initializes all the interaction handlers.
 * After each new load of the score, all handlers are reset and changed parametes (such as annotations or Mouse2SVG-Instance) are dispatched.
 */
class Core {
  private verovioWrapper: VerovioWrapper;
  private m2s: Mouse2SVG;

  private undoMEIStacks: Array<string>;
  private redoMEIStacks: Array<string>;
  private undoAnnotationStacks: Array<Array<Element>>;
  private redoAnnotationStacks: Array<Array<Element>>;

  //private $: any;
  private insertModeHandler: InsertModeHandler;
  private deleteHandler: DeleteHandler;
  private noteDragHandler: NoteDragHandler;
  private sidebarHandler: SidebarHandler
  private windowHandler: WindowHandler;
  private labelHandler: LabelHandler;
  private tooltipHandler: TooltipHandler
  private modHandler: CustomToolbarHandler;
  private currentMEI: string;
  private currentMEIDoc: Document
  private svg: string
  private currentMidi: string;
  private globalKeyboardHandler: GlobalKeyboardHandler;
  private musicProcessor: MusicProcessor;
  private scoreGraph: ScoreGraph;
  private svgEditor: SVGEditor;
  private lastInsertedNoteId: string
  private containerId: string
  private container: Element
  private interactionOverlay: Element
  private meiChangedCallback: (mei: string) => void;
  private doHideUI: boolean
  private hideOptions: {}
  private styleOptions: {}
  private attributeOptions: {}

  private firstStart = true
  private noteInputToggle = "on"

  constructor(containerId: string) {
    this.doHideUI = false
    this.hideOptions = {}
    this.styleOptions = {}
    this.attributeOptions = {}

    this.containerId = containerId
    this.container = document.getElementById(containerId)
    this.undoMEIStacks = Array<string>();
    this.redoMEIStacks = new Array<string>();
    this.undoAnnotationStacks = new Array<Array<Element>>();
    //this.undoAnnotationStacks.push(new Array<Element>())
    this.redoAnnotationStacks = new Array<Array<Element>>();
    //this.redoAnnotationStacks.push(new Array<Element>())
    this.windowHandler = new WindowHandler()
    this.svgEditor = new SVGEditor()
  }

  /**
   * Load data into the verovio toolkit and update the cache.
  */
  loadData(data: string | Document | HTMLElement, isUrl: boolean, options: LoadOptions = null): Promise<string> {

    this.verovioWrapper = this.verovioWrapper || new VerovioWrapper();
    var waitingFlag = "waiting"
    if (cq.getVrvSVG(this.containerId) !== null) {
      document.body.classList.add(waitingFlag)
    }

    document.getElementById(this.containerId).dispatchEvent(new Event("loadingStart"))

    var that = this
    this.svgEditor.setContainerId(this.containerId)
    this.svgEditor.cacheClasses().cacheScales().cacheStyles()

    //this function renders the pages via the veroviowrapper
    async function render(pageNo: number = 1, options: LoadOptions = null): Promise<void> {
      return new Promise((resolve, reject): void => {

        var message: VerovioMessage = {
          id: uuidv4(),
          action: 'renderToSVG',
          pageNo: pageNo
        };

        var response: VerovioResponse
        var svg: string
        response = that.verovioWrapper.setMessage(message);
        svg = response.svg;
        var svgDoc = new DOMParser().parseFromString(svg, "image/svg+xml")
        var pageElement = svgDoc.querySelector("svg")
        var pageId = "vrvPage" + pageNo.toString()
        pageElement.setAttribute("id", "vrvPage" + pageNo.toString())
        pageElement.classList.add("page")

        try {
          // delete old svg
          if (cq.getVrvSVG(that.containerId).querySelector("#" + pageId) !== null) {
            //that.svgEditor.cacheClasses().cacheScales()
            cq.getVrvSVG(that.containerId).querySelector("#" + pageId).innerHTML = "" //.remove()
          }
          //insert new complete svg
          //document.querySelector("#" + that.containerId + " #vrvSVG").append(pageElement)
          cq.getVrvSVG(that.containerId).querySelector("#" + pageId).replaceWith(pageElement)
        } catch (error) {
          document.querySelector("#" + that.containerId + " #vrvSVG")?.append(pageElement)

        }
        that.svgEditor.distributeIds(pageElement.querySelector(".definition-scale"))

        pageElement.setAttribute("preserveAspectRatio", "xMinYMin meet")
        var systemHeigth = pageElement.querySelector(".system").getBoundingClientRect().height
        systemHeigth += systemHeigth * 0.2
        //that.verovioWrapper.setHeightValue(systemHeigth)

        // if(!options){
        //   options = {}
        // }
        // options.widthFactor = (that.container as HTMLElement).clientWidth / screen.availWidth

        // if (options?.widthFactor) {
        //   console.log("pageW before", that.verovioWrapper.getOptions().pageWidth)
        //   that.verovioWrapper.setWidthValue(
        //     parseFloat(that.verovioWrapper.getOptions().pageWidth) * options.widthFactor
        //   )
        //   console.log("pageW after", that.verovioWrapper.getOptions().pageWidth)
        // }

        resolve()
      })
    }

    //END ASYNC FUNCTION RENDER

    return new Promise((resolve, reject) => {

      this.sendDataToVerovio(data, isUrl)
      var pageGroup = document.createElement("g")
      pageGroup.setAttribute("id", "vrvSVG")

      if (cq.getVrvSVG(that.containerId) !== null) {
        that.svgEditor.cacheClasses().cacheScales()
      }

      if (!cq.getVrvSVG(that.containerId)) document.querySelector("#" + that.containerId + "> #svgContainer").append(pageGroup)
      var pageCount: number = this.verovioWrapper.getToolkit().getPageCount()
      var renderPromises = new Array()
      var staffId = this.m2s?.getLastMouseEnter()?.staff?.getAttribute("refId")

      var optionPage: number
      if (options?.changeOnPageNo != undefined) {
        if (options.changeOnPageNo === "last") {
          optionPage = pageCount
        } else {
          optionPage = parseInt(options.changeOnPageNo)
        }
      }

      //remove all pages, that do not exist anymore
      cq.getVrvSVG(this.containerId).querySelectorAll(":scope > svg").forEach(svg => {
        if (parseInt(svg.id.match(/\d+/)[0]) > pageCount) {
          svg.remove()
        }
      })

      var changeOnPage = optionPage || parseInt(cq.getVrvSVG(this.containerId).querySelector("#" + staffId)?.closest(".page")?.id.split("").reverse()[0])
      Array.from({ length: pageCount }, (_, index) => index + 1).forEach(pageNo => {

        if (!isNaN(changeOnPage)) {
          if (pageNo < changeOnPage) return
        }
        renderPromises.push(setTimeout(function () { render(pageNo, options) }, 1))

      })

      //Each page will be redered seperatly
      Promise.all(renderPromises).then(() => {
        document.body.classList.remove(waitingFlag)
        resolve(that.initAfterRender())
      })
    })
  }

  sendDataToVerovio(data: any, isUrl: boolean) {
    var d: string;
    var u: boolean;
    var type: string = data?.constructor.name;
    switch (type) {
      case 'String':
        data = meiConverter.reformatMEI(data as string)
        d = data
        u = isUrl
        break;
      case 'XMLDocument':
        data = meiOperation.disableFeatures(["grace", "arpeg"], (data as Document)) // for Debugging
        this.svgEditor.copyClassesFromMei(data)
        d = new XMLSerializer().serializeToString(data as Document);
        u = false;
        break;
      case 'HTMLUnknownElement':
        d = new XMLSerializer().serializeToString(data as HTMLElement);
        u = false;
        break;
      case null:
      case undefined:
        d = new MeiTemplate().emptyMEI()
        u = false
        break;
      default:
        console.log("Wrong Datatype: " + type)
        break;
    }

    //just render the data once to make pagecount accessible
    var message: VerovioMessage = {
      id: uuidv4(),
      action: 'renderData',
      mei: d,
      isUrl: u
    };
    this.verovioWrapper.setMessage(message);
  }

  /**
   * Init attributes for the svg, creat svg overlay and distribute/ init handlers.
   * @returns 
   */
  initAfterRender(): Promise<string> {
    var that = this
    return new Promise((resolve, reject) => {
      setTimeout(function () { // timeout after the vrv rendering completed to render the DOM first
        that.svgEditor.drawLinesUnderSystems()
        that.svgEditor.modifyHarm()
        that.createSVGOverlay(true)
        that.svgEditor.setXY(that.windowHandler?.getX(), that.windowHandler?.getY())

        that.getMEI("").then(mei => {
          that.currentMEI = mei
          that.currentMEIDoc = that.getCurrentMEI(true) as Document
          that.currentMEIDoc.querySelectorAll("[dur='breve']").forEach(d => d.setAttribute("dur", "0.5"))

          if (that.currentMEIDoc.querySelector("parsererror")) {
            try {
              throw new Error("ParsingError")
            } catch (error) {
              console.error("There is a parsingerror in the meiDoc: ", error, that.currentMEIDoc, that.currentMEI)
            }
          }

          that.svgEditor.markOverfilledMeasures(that.currentMEIDoc)
          that.svgEditor
            .setContainerId(that.containerId)
            .loadClasses()
            .loadStyles()
            .fillSVG(that.currentMEIDoc)
            .setActiveLayer()
            .hideRedundantRests(that.currentMEIDoc)

          that.undoMEIStacks.push(mei)

          var lastAddedClass = "lastAdded"
          // that.container.querySelectorAll("." + lastAddedClass).forEach(m => {
          //   m.classList.replace("lastAdded", "marked") //remove(lastAddedClass)
          // })

          if (that.lastInsertedNoteId && ["textmode", "clickmode"].some(mode => that.container.classList.contains(mode))) {
            //that.container.querySelector("#" + that.lastInsertedNoteId)?.classList.add(lastAddedClass)
            that.container.querySelector("#" + that.lastInsertedNoteId)?.classList.add("marked")
          }
          if (that.meiChangedCallback) {
            that.meiChangedCallback(that.currentMEI)
          }
        })

        //Initialize music processor
        that.getTimemap().then(timemap => {
          that.musicProcessor = that.musicProcessor || new MusicProcessor(that.containerId)
          that.musicProcessor
            .setMEI(that.currentMEIDoc)
            .setMidi(that.verovioWrapper.renderToMidi())
            .setTimemap(timemap)
            .addCanvas()
            .update()
          that.scoreGraph = new ScoreGraph(that.currentMEIDoc, that.containerId, null)
          //the first condition should only occur at first starting the score editor
          if (!that.container.querySelector(".lastAdded, .marked")) { //that.scoreGraph.getCurrentNode() == undefined) {
            that.scoreGraph.setCurrentNodeById(that.container.querySelector("#vrvSVG .staff > .layer.activeLayer :is(.note, .rest, .mRest").id)
          } else { //second condition always sets lastAdded Note
            that.scoreGraph.setCurrentNodeById(that.container.querySelector("#vrvSVG :is(.lastAdded, .marked)")?.id)
          }
          that.initializeHandlers()
          that.musicProcessor.setScoreGraph(that.scoreGraph)
          document.getElementById(that.containerId).dispatchEvent(new Event("loadingEnd"))
          that.svg = new XMLSerializer().serializeToString(that.container.querySelector("#svgContainer"))
          that.svgEditor.loadClasses()
          console.log(that.currentMEIDoc, that.m2s.getMeasureMatrix())
          resolve(that.currentMEI)
          //})
        })
      }, 1)
    })

  }

  /**
   * Load everything if there is already a svg present. Displaying the visuals is not necessary here.
   * But the MEI has to be loaded with verovio anyway to ensure that options and subsequent loads will have access to the underlying MEI.
   * Only supposed to be used from Main class for first initialisation.
   * @param container container with already rendered svg (usually a container with "vibe-container" class)
   * @param data MEI to be loaded in verovio
   * @returns 
   */
  loadWithExistingSVG(container: Element, data: any, isUrl: boolean): Promise<string> {
    return new Promise(resolve => {
      this.container = container
      this.containerId = container.id
      this.verovioWrapper = this.verovioWrapper || new VerovioWrapper();
      var waitingFlag = "waiting"
      // svg has to be loaded into verovio anyway 
      this.sendDataToVerovio(data, isUrl)
      this.interactionOverlay = cq.getInteractOverlay(this.containerId)
      // get most right standing canvas in interactionOverlay
      let rightMostElement: Element = this.interactionOverlay
      let rightCoord = 0
      this.container.querySelectorAll("#interactionOverlay > *, #vrvSVG > svg > *").forEach(c => {
        let bbox = c.getBoundingClientRect()
        if(bbox.x + bbox.width > rightCoord){
          rightCoord = bbox.x + bbox.width
          rightMostElement = c
        }
      })
      var sizeRatio = ((this.container.getBoundingClientRect().width / this.interactionOverlay.getBoundingClientRect().width) + 2) * 100 //rightMostElement.getBoundingClientRect().width * 60 
      if(!sizeRatio || sizeRatio <= 0){
        sizeRatio = 100
      }
      (this.container.querySelector("#svgContainer") as HTMLElement).style.width = sizeRatio.toString() + "%"
      document.getElementById(this.containerId).dispatchEvent(new Event("loadingStart"))
      this.svgEditor.setContainerId(this.containerId)
      this.svgEditor.cacheClasses().cacheScales().cacheStyles()
      this.initializeHandlers(true, false)
      resolve(this.initAfterRender())
    })
  }



  reloadDataHandler = (function reloadDataHandler(): Promise<boolean> {
    return this.reloadData()
  }).bind(this)

  reloadData() {
    return this.loadData(this.currentMEI, false)
  }

  loadDataHandler = (function loadDataHandler(pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, options: LoadOptions = null): Promise<string> {
    return this.loadData(data, isUrl, { ...{ changeOnPageNo: pageURI }, ...options })
  }).bind(this)

  /**
   * Provides AligFunction for Tabbar. alignFunction will be first set, when musicprocessor will instantiated
   */
  alignFunctionHandler = (function alignFunctionHandler(file: any): void {
    this.musicProcessor?.resetListeners()
    this.musicProcessor?.align(file)
  }).bind(this)

  /**
   * Initialize Handlers
   */
  initializeHandlers(initNew: boolean = false, dispatch: boolean = true) {
    //m2s must be first since all coordinates and interacions are based on positions computed in Mouse2SVG
    this.m2s = initNew ? new Mouse2SVG() : this.m2s || new Mouse2SVG()
    if(!initNew && dispatch){
      this.m2s
        .setContainerId(this.containerId)
        .setUpdateOverlayCallback(this.createSVGOverlay)
        .setCurrentMEI(this.currentMEIDoc)
        .update()
    }

    this.insertModeHandler = initNew ? new InsertModeHandler(this.containerId) : this.insertModeHandler || new InsertModeHandler(this.containerId)
    this.deleteHandler = initNew ? new DeleteHandler(this.containerId) : this.deleteHandler || new DeleteHandler(this.containerId)
    this.noteDragHandler = new NoteDragHandler(this.containerId)
    this.globalKeyboardHandler = initNew ? new GlobalKeyboardHandler(this.containerId) : this.globalKeyboardHandler || new GlobalKeyboardHandler(this.containerId)
    this.sidebarHandler = initNew ? new SidebarHandler : this.sidebarHandler || new SidebarHandler()
    this.labelHandler = initNew ? new LabelHandler(this.containerId) : this.labelHandler || new LabelHandler(this.containerId)
    this.modHandler = initNew ? new CustomToolbarHandler(this.containerId) : this.modHandler || new CustomToolbarHandler(this.containerId)
    this.tooltipHandler = initNew ? new TooltipHandler() : this.tooltipHandler || new TooltipHandler()
    this.musicProcessor = initNew ? new MusicProcessor(this.containerId) : this.musicProcessor || new MusicProcessor(this.containerId)

    if(dispatch){
      this.dispatchFunctions()
    }
  }

  /**
   * distribute Callback functions for each element which uses some information from of the Core (Handlers, musicProcessor, Callbacks, etc)
   */
  dispatchFunctions() {

    this.labelHandler
      .setContainerId(this.containerId)
      .setCurrentMEI(this.currentMEIDoc)
      .setm2s(this.m2s)
      .reset()

    this.insertModeHandler
      .setContainerId(this.containerId)
      .setScoreGraph(this.scoreGraph)
      .setm2s(this.m2s)
      .setMusicProcessor(this.musicProcessor)
      .setDeleteHandler(this.deleteHandler)
      .setLabelHandler(this.labelHandler)
      //.activateHarmonyMode()
      //.activateSelectionMode()
      .setInsertCallback(this.insert)
      .setDeleteCallback(this.delete)
      .setLoadDataCallback(this.loadDataHandler)
      .setUndoAnnotationStacks(this.undoAnnotationStacks)
      .resetModes()
      .resetCanvas()

    this.noteInputSwitch(this.noteInputToggle)

    this.deleteHandler
      .setContainerId(this.containerId)
      .setDeleteCallback(this.delete)
      .update()

    this.noteDragHandler
      .setContainerId(this.containerId)
      .setCurrentMEI(this.currentMEIDoc)
      .setInsertCallback(this.insert)
      .setMusicProcessor(this.musicProcessor)
      .setm2s(this.m2s)
      .resetListeners()

    this.globalKeyboardHandler
      .setContainerId(this.containerId)
      .setUndoCallback(this.undo)
      .setRedoCallback(this.redo)
      .setCurrentMei(this.currentMEIDoc)
      .setMusicProcessor(this.musicProcessor)
      .setHarmonyHandlerCallback(this.labelHandler.setHarmonyLabelHandlerKey)
      .setLoadDataCallback(this.loadDataHandler)
      .setScoreGraph(this.scoreGraph)
      .resetLastInsertedNoteCallback(this.resetLastInsertedNoteId)
      .resetListeners()

    this.sidebarHandler
      .setContainerId(this.containerId)
      .setCurrentMei(this.currentMEIDoc)
      .setm2s(this.m2s)
      .setLoadDataCallback(this.loadDataHandler)
      .loadMeter()
      .makeScoreElementsClickable()
      .resetListeners()

    this.modHandler
      .setContainerId(this.containerId)
      .resetListeners()
      .setCurrentMEI(this.currentMEIDoc)
      .setLoadDataCallback(this.loadDataHandler)

    this.windowHandler
      .setContainerId(this.containerId)
      .setm2s(this.m2s)
      .setCurrentMEI(this.currentMEIDoc)
      .setLoadDataCallback(this.loadDataHandler)
      .setSVGReloadCallback(this.reloadDataHandler)
      .setAnnotations(this.insertModeHandler.getAnnotations())
      .setInsertModeHandler(this.insertModeHandler)
      .resetListeners()

    this.tooltipHandler
      .setContainerId(this.containerId)
      .removeListeners()
      .setListeners()

    // always start from click mode
    if (this.firstStart) {
      (this.container.querySelector("#notationTabBtn") as HTMLElement).click();
      this.container.querySelector(".voiceBtn").classList.add("selected")
      this.container.querySelector(".layer").classList.add("activeLayer")
      this.firstStart = false
    }

    if (this.doHideUI) {
      this.hideUI(this.hideOptions)
    } else {
      this.viewUI(this.hideOptions)
    }

    if (Object.entries(this.styleOptions).length > 0) {
      this.setStyles(this.styleOptions)
    }

    if (Object.entries(this.attributeOptions).length > 0) {
      this.setAttributes(this.attributeOptions)
    }

    // experimental react implementation of color picker
    //this.container.append(ReactWrapper.createColorPicker("reactContainer"))


  }

  /**
   * Delete array of notes from score
   */
  delete = (function d(notes: Array<Element>): Promise<boolean> {
    return new Promise((resolve): void => {
      this.getMEI("").then(mei => {
        meiOperation.removeFromMEI(notes, this.currentMEIDoc).then(updatedMEI => {
          if (updatedMEI != undefined) {
            this.loadData(updatedMEI, false).then(() => {
              resolve(true);
            })
          } else {
            resolve(true)
          }
        })
      })
    });
  }).bind(this)

  /**
   * 
   */
  insert = (function insert(newNote: NewNote, replace: Boolean = false): Promise<boolean> {
    this.lastInsertedNoteId = newNote.id
    this.container.querySelectorAll(".marked").forEach(m => m.classList.remove("marked"))

    return new Promise((resolve, reject): void => {
      this.getMEI("").then(mei => {
        var updatedMEI = meiOperation.addToMEI(newNote, this.currentMEIDoc, replace, this.scoreGraph)
        if (updatedMEI?.documentElement.innerHTML.indexOf(newNote.id) === -1) {
          reject()
        }
        if (updatedMEI != undefined) {
          this.loadData(updatedMEI, false).then(() => {
            resolve(true)
          })
        } else {
          reject()
        }
      })
    });
  }).bind(this)

  /**
   * Undo the last action performed on a specific page.
   * @param pageURI - The URI of the selected page.
   * @returns If the action was undone.
   */
  undo = (function undo(pageURI: string = ""): Promise<boolean> {
    return new Promise((resolve): void => {
      if (this.container.classList.contains("annotMode")) {
        this.undoAnnotationStacks.pop()
        const annotstate = this.undoAnnotationStacks.pop()
        if (annotstate != undefined) {
          var annotCanvas = this.container.querySelector("#annotationCanvas")
          var annotList = this.container.querySelector("#annotList")
          this.redoAnnotationStacks.push([annotCanvas, annotList])
          this.undoAnnotationStacks.push([annotCanvas, annotList])
          annotCanvas.replaceWith(annotstate[0])
          annotList.replaceWith(annotstate[1])
          this.globalKeyboardHandler.resetListeners()
          this.container.dispatchEvent(new Event("annotationCanvasChanged"))
        }
        resolve(true)
        return
      }
      this.undoMEIStacks.pop() // get rid of currentMEI, since last in line (=initial) MEI is not accessible through verovio
      const meistate = this.undoMEIStacks.pop()
      if (meistate != undefined) {
        this.redoMEIStacks.push(this.currentMEI)
        this.loadData(meistate, false).then(() => resolve(true))
      } else {
        resolve(false)
      }
    });
  }).bind(this)

  /**
   * Redo the last action performed on a page.
   * @param pageURI - The page URI.
   * @returns If the action was redone.
   */
  redo = (function redo(pageURI: string = ""): Promise<boolean> {
    return new Promise((resolve): void => {
      if (this.container.classList.contains("annotMode")) {
        const annotstate = this.redoAnnotationStacks.pop()
        if (annotstate != undefined) {
          var annotCanvas = this.container.querySelector("#annotationCanvas")
          var annotList = this.container.querySelector("#annotList")
          this.undoAnnotationStacks.push([annotCanvas, annotList])
          annotCanvas.replaceWith(annotstate[0])
          annotList.replaceWith(annotstate[1])
          this.globalKeyboardHandler.resetListeners()
        }
        resolve(true)
        return
      }
      const meistate = this.redoMEIStacks.pop()
      if (meistate !== undefined) {
        this.undoMEIStacks.push(this.currentMEI);
        this.loadData(meistate, false).then(() => resolve(true))
      } else {
        resolve(false)
      }
    });
  }).bind(this)

  ////// VEROVIO REQUESTS /////////////////


  /**
   * Get the MEI for a specific page.
   * @param pageURI - The URI of the selected page.
   */
  getMEI(pageURI: string): Promise<string> {
    return new Promise((resolve, reject): void => {

      const message: VerovioMessage = {
        action: "getMEI",
        id: uuidv4()
      }

      var response: VerovioResponse
      response = this.verovioWrapper.setMessage(message)


      if (response.mei) {
        this.currentMEI = response.mei;
      } else {
        //console.log(meiConverter.meiToDoc(response.mei))
      }
      resolve(response.mei)
    });
  }

  getMidi(): Promise<string> {
    return new Promise((resolve, reject): void => {
      const message: VerovioMessage = {
        action: "renderToMidi",
        id: uuidv4()
      }
      var response: VerovioResponse = this.verovioWrapper.setMessage(message);
      if (response.midi) {
        this.currentMidi = response.midi;
        resolve(response.midi)
      } else {
        reject("fail!")
      }
    });
  }

  getTimemap(): Promise<Array<timemapObject>> {
    return new Promise((resolve, reject): void => {
      const timemap = this.verovioWrapper.getTimemap()
      if (timemap) {
        resolve(timemap)
      } else {
        reject("fail!")
      }
    });
  }

  /**
   * Create an overlay of all interative elements over the the score svg.
   */
  createSVGOverlay(loadBBoxes: boolean = true): Promise<boolean> {
    return new Promise((resolve): void => {
      document.getElementById(this.containerId).focus()
      var refSVG = document.getElementById(this.containerId).querySelector("#vrvSVG") as unknown as SVGSVGElement
      this.interactionOverlay = document.getElementById(this.containerId).querySelector("#interactionOverlay")
      if (!this.interactionOverlay) {
        var overlay = document.createElementNS(c._SVGNS_, "svg")
        overlay.setAttribute("id", "interactionOverlay")
        this.interactionOverlay = overlay
      }

      var svgContainer = document.getElementById(this.containerId).querySelector("#svgContainer")
      var vrvContainer = cq.getVrvSVG(this.containerId)

      var root = svgContainer.getBoundingClientRect().height > vrvContainer.getBoundingClientRect().height ? svgContainer : vrvContainer
      var rootBBox = root.getBoundingClientRect()
      var rootWidth = rootBBox.width
      var rootHeigth = rootBBox.height

      if (!this.interactionOverlay.getAttribute("viewBox")) {
        this.interactionOverlay.setAttribute("viewBox", ["0", "0", rootWidth.toString(), rootHeigth.toString()].join(" "))
      }

      document.getElementById(this.containerId).querySelector("#interactionOverlay #scoreRects")?.remove()
      var scoreRects = document.createElementNS(c._SVGNS_, "svg")
      scoreRects.setAttribute("id", "scoreRects")

      Array.from(refSVG.attributes).forEach(a => {
        if (!["id", "width", "height"].includes(a.name)) {
          this.interactionOverlay.setAttribute(a.name, a.value)
        }
      })
      this.interactionOverlay.appendChild(scoreRects)
      refSVG.insertAdjacentElement("beforebegin", this.interactionOverlay)

      if (loadBBoxes) {
        var svgBoxes = Array.from(document.getElementById(this.containerId)
          .querySelectorAll(".definition-scale :is(g,path)"))
          .filter(el => {
            var condition = !["system", "measure", "layer", "ledgerLines", "flag"].some(cn => el.classList.contains(cn))
            return condition
          })
        var reorderedBoxes = new Array<Element>() // reorder so that dependent elements are already in array
        var classOrder = ["harm", "slur", "tie", "tupleNum", "tupletBracket", "clef", "meterSig", "keySig", "notehead", "stem", "rest", "barLine", "staff"]

        let filteredElements: Array<Element>
        classOrder.forEach(c => {
          filteredElements = svgBoxes.filter(e => e.classList.contains(c))
          reorderedBoxes.push(...filteredElements)
        })
        filteredElements = svgBoxes.filter(e => e.classList.length === 0 || !classOrder.some(c => e.classList.contains(c)))
        // {  
        // if(e.classList.length === 0){
        //     return e
        //   }
        //   if(!classOrder.some(c => e.classList.contains(c))){
        //     return e
        //   }
        // })
        reorderedBoxes.push(...filteredElements)
        // staff always has to be on top of sibling elements, so that one can interact with score elements
        reorderedBoxes = reorderedBoxes.reverse()

        async function computeCoords(box: Element, interactionOverlay: Element) { // since order is not important, this block can be asynchronous
          return new Promise((resolve): void => {
            var g = document.createElementNS(c._SVGNS_, "g")
            var refId: string = box.id !== "" ? box.id : box.getAttribute("refId")
            if (refId !== "" && refId !== null) {
              g.setAttribute("refId", refId)
            }
            box.classList.forEach(c => g.classList.add(c))
            var bbox = box.getBoundingClientRect()
            var cc = coordinates.getDOMMatrixCoordinates(bbox, interactionOverlay)
            var rect = document.createElementNS(c._SVGNS_, "rect")
            rect.setAttribute("x", cc.left.toString())
            rect.setAttribute("y", cc.top.toString())
            var w: number
            if (cc.width === 0) w = 2
            rect.setAttribute("width", w?.toString() || cc.width.toString())
            var h: number
            if (cc.height === 0) h = 2
            rect.setAttribute("height", h?.toString() || cc.height.toString())
            g.appendChild(rect)
            scoreRects.append(g)
            resolve(true)
          })
        }
        var coordPromises = new Array<Promise<any>>()
        reorderedBoxes.forEach(sr => {
          if (!["g", "path"].includes(sr.tagName.toLowerCase())) {
            return
          } else if (Array.from(sr.classList).some(srcl => srcl.includes("page") || srcl.includes("system"))) {
            return
          } else {
            coordPromises.push(computeCoords(sr, this.interactionOverlay))

          }
        })

        setTimeout(function () { Promise.all(coordPromises) }, 1)
      }
      resolve(true)
    })
  }

  private replaceWithRect(el: Element) {
    if (!["g", "path", "svg"].includes(el.tagName.toLowerCase())) {
      el.remove()
      return
    }

    if (el.childElementCount > 0) {
      Array.from(el.children).forEach(ec => {
        this.replaceWithRect(ec)
      })
    }

    if ("svg" !== el.tagName.toLowerCase()) {
      var childCopy = new Array<Element>()
      Array.from(el.children).forEach(ec => childCopy.push(ec.cloneNode(true) as Element))
      var bbox = el.getBoundingClientRect()
      var rect = document.createElementNS(c._SVGNS_, "rect")
      rect.setAttribute("refId", el.id)
      el.classList.forEach(c => rect.classList.add(c))
      var cc = coordinates.getDOMMatrixCoordinates(bbox, this.interactionOverlay)
      rect.setAttribute("x", cc.left.toString())
      rect.setAttribute("y", cc.top.toString())
      var w: number
      if (cc.width === 0) w = 2
      rect.setAttribute("width", w?.toString() || cc.width.toString())
      var h: number
      if (cc.height === 0) h = 2
      rect.setAttribute("height", h?.toString() || cc.height.toString())
      childCopy.forEach(cc => rect.appendChild(childCopy.shift()))
      el.insertAdjacentElement("beforebegin", rect)
      el.remove()
    }
  }

  getElementAttr = (function getElementAttr(id: string): Attributes {
    const message: VerovioMessage = {
      action: "getElementAttr",
      elementId: id
    }
    return this.verovioWrapper.setMessage(message).attributes;
  }).bind(this)


  /**
   * hide ui elements, so that no interaction is possible
   * should be best called after promise of loadData
   * @param options 
   */
  hideUI(options = {}) {
    if (Object.entries(options).length === 0) {
      options = { annotationCanvas: true, labelCanvas: true, canvasMusicPlayer: true, scoreRects: true, manipulatorCanvas: true, sidebarContainer: true, btnToolbar: true, customToolbar: true, groups: true }
    }

    for (const [key, value] of Object.entries(options)) {
      if (value) {
        if (key === "groups") {
          (document.getElementById(this.containerId)?.querySelectorAll("[role=\"group\"]")).forEach(g => (g as HTMLElement).classList.add("hideUI")) // style.setProperty("display", "none", "important"))
        } else {
          (document.getElementById(this.containerId)?.querySelector("#" + key) as HTMLElement)?.classList.add("hideUI")//style.setProperty("display", "none", "important")
        }

      }
    }
  }
  /**
   * View Ui elements if they where hidden earlier
   * @param options 
   */
  viewUI(options = {}) {
    if (Object.entries(options).length === 0) {
      options = { annotationCanvas: true, labelCanvas: true, canvasMusicPlayer: true, scoreRects: true, manipulatorCanvas: true, sidebarContainer: true, btnToolbar: true, customToolbar: true, groups: true }
    }

    for (const [key, value] of Object.entries(options)) {
      if (value) {
        if (key === "groups") {
          (document.getElementById(this.containerId)?.querySelectorAll("[role=\"group\"]")).forEach(g => (g as HTMLElement).classList.remove("hideUI")) // style.setProperty("display", "none", "important"))
        } else {
          (document.getElementById(this.containerId)?.querySelector("#" + key) as HTMLElement)?.classList.remove("hideUI")//style.setProperty("display", "none", "important")
        }

      }
    }
  }

  /**
   * Note Input will be disabled. All other interactions stay active.
   */
  noteInputSwitch(toggle: string) {
    this.noteInputToggle = toggle
    if (toggle === "off") {
      this.insertModeHandler?.disableNoteInput()
      this.noteDragHandler?.removeListeners()
    } else if (toggle === "on") {
      this.insertModeHandler?.enableNoteInput()
      this.noteDragHandler?.setListeners()
    } else {
      console.log(arguments.callee.name, toggle + " has no effect!")
    }
  }

  ////////// GETTER/ SETTER
  /**
   * 
   * @returns current Mouse2SVG Instance
   */
  getMouse2SVG(): Mouse2SVG {
    return this.m2s;
  }

  getDeleteHandler(): DeleteHandler {
    return this.deleteHandler;
  }

  getInsertModeHandler(): InsertModeHandler {
    return this.insertModeHandler
  }

  getCurrentMEI(asDocument: boolean = true): string | Document {
    if (asDocument) {
      var meiDoc = meiConverter.meiToDoc(this.currentMEI)
      meiDoc = meiConverter.standardizeAccid(meiDoc)
      return meiDoc
    }
    return this.currentMEI;
  }

  /**
   * Get SVG of the current container.
   * @param {boolean} [plain=true] - delete classes which would result in coloration of the score
   * @returns {string} - serialized svg
   */
  getSVG(plain = true): string {
    var svgDom = this.container //.querySelector("#svgContainer")
    if (plain) {
      svgDom.querySelectorAll(".lastAdded, .marked").forEach(sd => {
        sd.classList.remove("lastAdded")
        sd.classList.remove("marked")
      })
    }
    return new XMLSerializer().serializeToString(svgDom)
  }

  getNoteDragHandler() {
    return this.noteDragHandler
  }

  getGlobalKeyboardHandler() {
    return this.globalKeyboardHandler
  }

  getSidebarHandler() {
    return this.sidebarHandler
  }

  getLabelHandler() {
    return this.labelHandler
  }

  getModifierHandler() {
    return this.modHandler
  }

  getWindowHandler() {
    return this.windowHandler
  }

  getCurrentMidi() {
    return this.currentMidi;
  }

  getMusicProcessor(): MusicProcessor {
    return this.musicProcessor;
  }

  getScoreGraph() {
    return this.scoreGraph
  }


  getContainer() {
    return this.container
  }

  /**
   * Access Verovio from outside of score editor.
   * Use getToolkit method to access any method which is not wrapped
   * @returns VerovioWrapper instance
   */
  getVerovioWrapper() {
    return this.verovioWrapper
  }

  setMEIChangedCallback(meiChangedCallback: (mei: string) => void) {
    this.meiChangedCallback = meiChangedCallback
  }

  setHideUI(hide: boolean) {
    this.doHideUI = hide
  }

  setHideOptions(options: {}) {
    this.hideOptions = options
  }

  resetLastInsertedNoteId = function () {
    this.lastInsertedNoteId = undefined
  }.bind(this)

  /**
   * Set Attibutes for any element in the result svg as {selector: {attributeName: [values as string]}}.
   * By default will be concatenated with spaces as value string for this attribute
   * @param options 
   * @param separator optional separator, default: " "
   */
  setAttributes(options: {}, separator = " ") {
    var svg = cq.getVrvSVG(this.containerId)
    for (const [elKey, elValue] of Object.entries(options)) {
      var element = svg.querySelector(elKey)
      if (element !== null) {
        for (const [attrKey, attrValue] of Object.entries(elValue)) {
          element.setAttribute(attrKey, (attrValue as Array<String>).join(separator))
        }
      }
    }
  }

  setAttributeOptions(options: {}) {
    this.attributeOptions = options
    return this
  }

  /**
   * Set Styles for any element in the result svg as {selector: {attributeName: [values as string]}}.
   * By default will be concatenated with spaces as value string for this attribute
   * @param options 
   * @param separator optional separator, default: " "
   */
  setStyles(options: {}, separator = " ") {
    var svg = cq.getVrvSVG(this.containerId)
    for (const [elKey, elValue] of Object.entries(options)) {
      var element = svg.querySelector(elKey) as HTMLElement
      if (element !== null) {
        for (const [styleKey, styleValue] of Object.entries(elValue)) {
          var importantIdx = (styleValue as Array<string>).indexOf("important")
          if (importantIdx === -1) {
            element.style.setProperty(styleKey, styleValue.join(separator))
          } else {
            var important = (styleValue as Array<string>).splice(importantIdx, 1)[0]
            element.style.setProperty(styleKey, styleValue.join(separator), important)
          }
        }
      }
    }
  }

  setStyleOptions(options: {}) {
    this.styleOptions = options
    return this
  }

}

export { Core as default };


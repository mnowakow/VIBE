import VerovioWrapper from './utils/VerovioWrapper';
import { NewNote, VerovioMessage, VerovioResponse, EditorAction, Attributes, LoadOptions } from './utils/Types';
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


/**
 * The core component the Editor. This manages the database,
 * the verovio toolkit, the cache, and undo/redo stacks.
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
  private musicplayer: MusicProcessor;
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
        var pageElement  = svgDoc.querySelector("svg")
        var pageId = "vrvPage" + pageNo.toString()
        pageElement.setAttribute("id", "vrvPage" + pageNo.toString())
        pageElement.classList.add("page")

        try {
          // delete old svg
          if (cq.getVrvSVG(that.containerId).querySelector("#" + pageId) !== null) {
            that.svgEditor.cacheClasses().cacheScales()
            cq.getVrvSVG(that.containerId).querySelector("#" + pageId).innerHTML = "" //.remove()
          }
          //insert new complete svg
          //document.querySelector("#" + that.containerId + " #vrvSVG").append(pageElement)
          cq.getVrvSVG(that.containerId).querySelector("#" + pageId).replaceWith(pageElement)
        } catch (error) {
          document.querySelector("#" + that.containerId + " #vrvSVG").append(pageElement)
          
        }
        that.svgEditor.distributeIds(pageElement.querySelector(".definition-scale"))
        
        pageElement.setAttribute("preserveAspectRatio", "xMinYMin meet")
        var systemHeigth = pageElement.querySelector(".system").getBoundingClientRect().height
        systemHeigth += systemHeigth * 0.2
        that.verovioWrapper.setHeightValue(systemHeigth)
        
        resolve()
      })
    }

    //END ASYNC FUNCTION RENDER

    return new Promise((resolve, reject) => {

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
          that.svgEditor.copyClassesFromMei(data)
          d = new XMLSerializer().serializeToString(data as Document);
          u = false;
          break;
        case 'HTMLUnknownElement':
          d = new XMLSerializer().serializeToString(data as HTMLElement);
          u = false;
          break;
        case undefined:
          d = new MeiTemplate().emptyMEI()
          u = false
          break;
        default:
          reject("Wrong Datatype: " + type)
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

      var pageGroup = document.createElement("g")
      pageGroup.setAttribute("id", "vrvSVG")

      if (cq.getVrvSVG(that.containerId) !== null) {
        that.svgEditor.cacheClasses().cacheScales()
        //cq.getVrvSVG(that.containerId).remove()
      }

      if(!cq.getVrvSVG(that.containerId)) document.querySelector("#" + that.containerId + "> #svgContainer").append(pageGroup)
      var pageCount: number = this.verovioWrapper.getToolkit().getPageCount()
      var renderPromises = new Array()
      var staffId = this.m2s?.getLastMouseEnter()?.staff?.getAttribute("refId")
      
      var optionPage: number
      if(options?.changeOnPageNo != undefined){
        if(options.changeOnPageNo === "last"){
          optionPage = pageCount
        }else{
          optionPage = parseInt(options.changeOnPageNo)
        }     
      }
      
      //remove all pages, that do not exist anymore
      cq.getVrvSVG(this.containerId).querySelectorAll(":scope > svg").forEach(svg => {
        if(parseInt(svg.id.match(/\d+/)[0]) > pageCount){
          svg.remove()
        }
      })

      var changeOnPage = optionPage || parseInt(cq.getVrvSVG(this.containerId).querySelector("#" + staffId)?.closest(".page")?.id.split("").reverse()[0])
      Array.from({length: pageCount}, (_, index) => index + 1 ).forEach(pageNo => {
        
        if(!isNaN(changeOnPage)){
          if(pageNo < changeOnPage) return
        }
        renderPromises.push(setTimeout(function(){render(pageNo, options)}, 1))

      })

      Promise.all(renderPromises).then(() => {
        document.body.classList.remove(waitingFlag)
        var that = this
        setTimeout(function(){ // timeout after the vrv rendering completed to render the DOM first
          
          that.svgEditor.drawLinesUnderSystems()
          that.svgEditor.modifyHarm()
          that.createSVGOverlay(true)
          that.svgEditor.setXY(that.windowHandler?.getX(), that.windowHandler?.getY())

          that.getMEI("").then(mei => {
            that.currentMEI = mei  
            that.currentMEIDoc = that.getCurrentMEI(true) as Document
            
            //console.log(that.currentMEIDoc)
            that.svgEditor
              .setContainerId(that.containerId)
              .loadClasses()
              .fillSVG(that.currentMEIDoc)
            that.undoMEIStacks.push(mei)

            var lastAddedClass = "lastAdded"
            document.querySelectorAll("." + lastAddedClass).forEach(m => {
              m.classList.remove(lastAddedClass)
            })

            if (that.lastInsertedNoteId != undefined && ["textmode", "clickmode"].some(mode => that.container.classList.contains(mode))) {
              that.container.querySelector("#" + that.lastInsertedNoteId)?.classList.add(lastAddedClass)
            }
            if (that.meiChangedCallback != undefined) {
              that.meiChangedCallback(that.currentMEI)
            }
          })

          //MusicPlayer stuff
          that.getMidi().then(midi => {
            that.musicplayer = that.musicplayer || new MusicProcessor(that.containerId)
            that.musicplayer
              .setMEI(that.currentMEIDoc)
              .setMidi(midi)
              .addCanvas()
            that.getMidiTimesForSymbols().then(md => {
              that.musicplayer.setMidiTimes(md)
              that.musicplayer.update()
              that.scoreGraph = new ScoreGraph(that.currentMEIDoc, that.containerId, md)
              //the first condition should only occur at first starting the score editor
              if (that.container.querySelector(".lastAdded") === null && that.scoreGraph.getCurrentNode() == undefined) {
                that.scoreGraph.setCurrentNodeById(that.container.querySelector(".staff > .layer :is(.note, .rest, .mRest").id)
              } else { //second condition always sets lastAdded Note
                that.scoreGraph.setCurrentNodeById(that.container.querySelector(".lastAdded")?.id)
              }
              that.initializeHandlers()
              that.musicplayer.setScoreGraph(that.scoreGraph)
              document.getElementById(that.containerId).dispatchEvent(new Event("loadingEnd"))
              that.svg = new XMLSerializer().serializeToString(that.container.querySelector("#svgContainer"))
              console.log(that.currentMEIDoc, that.m2s.getMeasureMatrix())
              resolve(that.currentMEI)
            })
          })
        }, 1)
      })
    })
  }



  reloadDataFunction = (function reloadData(): Promise<boolean> {
    return this.loadData(this.currentMEI, false)
  }).bind(this)

  loadDataFunction = (function loadDataFunction(pageURI: string, data: string | Document | HTMLElement, isUrl: boolean): Promise<string> {
    return this.loadData(data, isUrl, {changeOnPageNo: pageURI})
  }).bind(this)


  /**
   * Initialize Handlers
   */
  initializeHandlers() {
    //must be first!!!
    if (this.m2s == undefined) {
      this.m2s = new Mouse2SVG()
    } else {
      //this.m2s.update()
    }
    this.m2s
      .setContainerId(this.containerId)
      .setUpdateOverlayCallback(this.createSVGOverlay)
      .setCurrentMEI(this.currentMEIDoc)
      .update()
    //.setMouseEnterElementListeners()
    this.insertModeHandler = this.insertModeHandler || new InsertModeHandler(this.containerId)
    this.deleteHandler = this.deleteHandler || new DeleteHandler(this.containerId)
    this.noteDragHandler = new NoteDragHandler(this.containerId)
    this.globalKeyboardHandler = this.globalKeyboardHandler || new GlobalKeyboardHandler(this.containerId)
    this.sidebarHandler = this.sidebarHandler || new SidebarHandler()
    this.labelHandler = this.labelHandler || new LabelHandler(this.containerId)
    this.modHandler = this.modHandler || new CustomToolbarHandler(this.containerId)
    this.tooltipHandler = this.tooltipHandler || new TooltipHandler()

    this.dispatchFunctions()
  }

  /**
   * distribute Callback functions for each element which uses some information from of the Core (Handlers, Musicplayer, Callbacks, etc)
   */
  dispatchFunctions() {

    this.labelHandler
      .setContainerId(this.containerId)
      .setCurrentMEI(this.currentMEIDoc)
      .reset()

    this.insertModeHandler
      .setContainerId(this.containerId)
      .setm2s(this.m2s)
      .setMusicPlayer(this.musicplayer)
      .setDeleteHandler(this.deleteHandler)
      .setLabelHandler(this.labelHandler)
      .activateHarmonyMode()
      .activateSelectionMode()
      .setInsertCallback(this.insert)
      .setDeleteCallback(this.delete)
      .setLoadDataCallback(this.loadDataFunction)
      .setScoreGraph(this.scoreGraph)
      .setUndoAnnotationStacks(this.undoAnnotationStacks)
      .resetModes()
      .resetCanvas()

    this.deleteHandler
      .setContainerId(this.containerId)
      .setDeleteCallback(this.delete)
      .update()

    this.noteDragHandler
      .setContainerId(this.containerId)
      .setCurrentMEI(this.currentMEIDoc)
      .setInsertCallback(this.insert)
      .setMusicPlayer(this.musicplayer)
      .setm2s(this.m2s)
      .resetListeners()

    this.globalKeyboardHandler
      .setContainerId(this.containerId)
      .setUndoCallback(this.undo)
      .setRedoCallback(this.redo)
      .setCurrentMei(this.currentMEIDoc)
      .setMusicPlayer(this.musicplayer)
      .setHarmonyHandlerCallback(this.labelHandler.setHarmonyLabelHandlerKey)
      .setLoadDataCallback(this.loadDataFunction)
      .setScoreGraph(this.scoreGraph)
      .resetLastInsertedNoteCallback(this.resetLastInsertedNoteId)
      .resetListeners()

    this.sidebarHandler
      .setContainerId(this.containerId)
      .setCurrentMei(this.currentMEIDoc)
      .setm2s(this.m2s)
      .setLoadDataCallback(this.loadDataFunction)
      .loadMeter()
      .makeScoreElementsClickable()
      .resetListeners()

    this.modHandler
      .setContainerId(this.containerId)
      .resetListeners()
      .setCurrentMEI(this.currentMEIDoc)
      .setLoadDataCallback(this.loadDataFunction)

    this.windowHandler
      .setContainerId(this.containerId)
      .setm2s(this.m2s)
      .setCurrentMEI(this.currentMEIDoc)
      .setLoadDataCallback(this.loadDataFunction)
      .setSVGReloadCallback(this.reloadDataFunction)
      .setAnnotations(this.insertModeHandler.getAnnotations())
      .setInsertModeHandler(this.insertModeHandler)
      .resetListeners()

    this.tooltipHandler
      .setContainerId(this.containerId)
      .removeListeners()
      .setListeners()

    // always start from click mode
    if (this.firstStart) {
      document.getElementById("notationTabBtn").click()
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
          this.keyboardHandler.resetListeners()
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
          this.keyboardHandler.resetListeners()
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
        this.currentMidi = response.mei;
        resolve(response.midi)
      } else {
        reject("fail!")
      }
    });
  }

  /**
   * Get all times for each event visible in the score (notes, rests, etc.)
   * @returns 
   */
  getMidiTimesForSymbols(): Promise<Map<number, Array<Element>>> {
    return new Promise((resolve): void => {
      var noteTimes = new Map<number, Array<Element>>();
      var that = this
      var container = cq.getVrvSVG(this.containerId)
      var midi = that.verovioWrapper.getMidiJSON()
      var tracks = midi.tracks
      tracks.forEach((t, tIdx) => {
        var svgNotes = container.querySelectorAll(".staff[n=\"" + (tIdx + 1).toString() + "\"] .note")
        var prevNote: { midi: any, svg: Element }
        t.notes.forEach((n, nIdx) => {
          if (!noteTimes.has(n.ticks)) {
            noteTimes.set(n.ticks, new Array())
          }
          var arr = noteTimes.get(n.ticks)
          var currNote = svgNotes[nIdx]
          //indicaton, that some rests are in between
          //trailing rests are intentionally left out, since there is nothing to play anyway
          if (prevNote?.midi.ticks + prevNote?.midi.durationTicks != n.ticks) {
            var elements = container.querySelectorAll(".staff[n=\"" + (tIdx + 1).toString() + "\"] .note, .staff[n=\"" + (tIdx + 1).toString() + "\"] .rest")
            var elementIds = Array.from(elements).map(e => e.id)
            var sliceLeft = prevNote == undefined && n.ticks > 0 ? 0 : undefined
            sliceLeft = prevNote != undefined ? elementIds.findIndex(eid => eid === prevNote.svg.id) + 1 : 0
            var sliceRight = elementIds.findIndex(eid => eid === currNote.id) - 1
            var slicedElementIds = elementIds.slice(sliceLeft, sliceRight)
            var currentTickPos = prevNote?.midi.ticks + prevNote?.midi.durationTicks || 0
            slicedElementIds.forEach(id => {
              var ratio = meiOperation.getAbsoluteRatio(this.currentMEIDoc.getElementById(id))
              var tickDur = 4 * ratio * midi.header.ppq
              if (!noteTimes.has(currentTickPos)) {
                noteTimes.set(currentTickPos, new Array())
              }
              var restArr = noteTimes.get(currentTickPos)
              restArr.push(container.querySelector("#" + id))
              currentTickPos += tickDur
            })
          }
          arr.push(currNote)
          prevNote = {
            midi: n,
            svg: svgNotes[nIdx]
          }
        })
      })
      resolve(noteTimes)
    })
  }


  /**
   * Create an overlay of all interative elements over the the score svg.
   */
  createSVGOverlay(loadBBoxes: boolean = true): Promise<boolean> {
    return new Promise((resolve): void => {
      document.getElementById(this.containerId).focus()
      var refSVG = document.getElementById(this.containerId).querySelector("#vrvSVG") as unknown as SVGSVGElement
      this.interactionOverlay = document.getElementById(this.containerId).querySelector("#interactionOverlay")
      if (this.interactionOverlay === null) {
        var overlay = document.createElementNS(c._SVGNS_, "svg")
        overlay.setAttribute("id", "interactionOverlay")
        this.interactionOverlay = overlay
      }

      var root = cq.getVrvSVG(this.containerId)
      var rootBBox = root.getBoundingClientRect()
      var rootWidth = (rootBBox.width).toString()
      var rootHeigth = (rootBBox.height).toString()

      //if (this.interactionOverlay.getAttribute("viewBox") === null) {
        this.interactionOverlay.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
      //}

      document.getElementById(this.containerId).querySelector("#interactionOverlay #scoreRects")?.remove()
      var scoreRects = document.createElementNS(c._SVGNS_, "svg")
      scoreRects.setAttribute("id", "scoreRects")
      scoreRects.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))

      Array.from(refSVG.attributes).forEach(a => {
        if (!["id", "width", "height"].includes(a.name)) {
          this.interactionOverlay.setAttribute(a.name, a.value)
        }
      })
      this.interactionOverlay.appendChild(scoreRects)
      refSVG.insertAdjacentElement("beforebegin", this.interactionOverlay)

      if (loadBBoxes) {
        var svgBoxes = Array.from(document.getElementById(this.containerId)
          .querySelectorAll(".definition-scale :is(g,path)"))//".definition-scale path, .definition-scale .bounding-box"))
          .filter(el => {
            var condition = !["system", "measure", "layer", "ledgerLines", "flag"].some(cn => el.classList.contains(cn))
            return condition
          })
        var reorderedBoxes = new Array<Element>() // reorder so that dependent elements are already in array
        svgBoxes.forEach(sb => {
          if (sb.querySelector(":scope > use, :scope > rect, :scope > path") === null) {
            reorderedBoxes.push(sb)
          } else {
            reorderedBoxes.unshift(sb)
          }
        })

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

        setTimeout(function(){Promise.all(coordPromises)}, 1)
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
   * should be best called afteer promise of loadData
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
    var svgDom = this.container.querySelector("#svgContainer")
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

  getMusicPlayer(): MusicProcessor {
    return this.musicplayer;
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
import VerovioWrapper from './utils/VerovioWrapper';
import { NewNote, VerovioMessage, VerovioResponse, EditorAction, Attributes, LoadOptions } from './utils/Types';
import { uuidv4 } from './utils/random';
import { constants as c } from './constants';
import InsertModeHandler from './handlers/InsertModeHandler';
import DeleteHandler from './handlers/DeleteHandler';
import NoteDragHandler from './handlers/NoteDragHandler';
import { Mouse2MEI } from './utils/Mouse2MEI';
import GlobalKeyboardHandler from './handlers/GlobalKeyboardHandler';
import MusicPlayer from './MusicPlayer';
import * as meiConverter from "./utils/MEIConverter"
import * as meiOperation from "./utils/MEIOperations"
import MeiTemplate from './assets/mei_template';
import SVGFiller from "./utils/SVGFiller"
import ScoreGraph from './datastructures/ScoreGraph';
import WindowHandler from "./handlers/WindowHandler"
import SidebarHandler from './handlers/SidebarHandler';
import LabelHandler from './handlers/LabelHandler';
import ModHandler from './handlers/ModHandler';
import * as cq from "./utils/convenienceQueries"
import * as coordinates from "./utils/coordinates"
import * as ffbb from "./utils/firefoxBBoxes"
import TooltipHandler from './handlers/TooltipHandler';
import { textChangeRangeIsUnchanged } from 'typescript';


/**
 * The core component the Editor. This manages the database,
 * the verovio toolkit, the cache, and undo/redo stacks.
 */
class Core {
  private verovioWrapper: VerovioWrapper;
  private m2m: Mouse2MEI;

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
  private modHandler: ModHandler;
  private currentMEI: string;
  private currentMEIDoc: Document
  private svg: string
  private currentMidi: string;
  private keyboardHandler: GlobalKeyboardHandler;
  private musicplayer: MusicPlayer;
  private scoreGraph: ScoreGraph;
  private svgFiller: SVGFiller;
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
    this.svgFiller = new SVGFiller()
  }

  /**
   * Load data into the verovio toolkit and update the cache.
  */
  loadData(pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, options: LoadOptions = null): Promise<string> {

    // if(options !== null){
    //   if(options.deleteLastNoteInserted){
    //     this.lastInsertedNoteId = undefined
    //   }
    // }

    this.verovioWrapper = this.verovioWrapper || new VerovioWrapper();
    if (cq.getRootSVG(this.containerId) !== null) {
      this.svgFiller.cacheClasses().cacheScales()
      cq.getRootSVG(this.containerId).remove()
    }
    var waitingFlag = "waiting"
    if (cq.getRootSVG(this.containerId) !== null) {
      document.body.classList.add(waitingFlag)
    }

    document.getElementById(this.containerId).dispatchEvent(new Event("loadingStart"))

    return new Promise((resolve, reject): void => {
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
          this.svgFiller.copyClassesFromMei(data)
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

      const message: VerovioMessage = {
        id: uuidv4(),
        action: 'renderData',
        mei: d,
        isUrl: u
      };

      var response: VerovioResponse
      var svg: string

      response = this.verovioWrapper.setMessage(message);


      svg = response.mei;
      svg = svg.replace("<svg", "<svg id=\"" + c._ROOTSVGID_ + "\"");
      try {
        document.querySelector("#" + this.containerId + "> #svg_output").innerHTML = svg
      } catch (ignore) {
        console.log("Error inserting SVG")
      }
      this.svgFiller.distributeIds(this.container.querySelector("#rootSVG .definition-scale"))
      this.container.querySelector("#rootSVG").setAttribute("preserveAspectRatio", "xMidYMid meet")

      /**
       * some partial load things
       */

      this.currentMEIDoc

      var rootBBox = this.container.querySelector("#rootSVG").getBoundingClientRect()
      var rootWidth = rootBBox.width.toString()
      var rootHeigth = rootBBox.height.toString()

      this.container.querySelector("#rootSVG").setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
      this.container.querySelector("#rootSVG").removeAttribute("height")
      this.container.querySelector("#rootSVG").removeAttribute("width")

      document.body.classList.remove(waitingFlag)
      this.createSVGOverlay(true)
      this.svgFiller.setXY(this.windowHandler?.getX(), this.windowHandler?.getY())

      this.getMEI("").then(mei => {
        this.currentMEI = mei
        this.currentMEIDoc = this.getCurrentMEI(true) as Document
        console.log(this.currentMEIDoc)
        this.svgFiller
          .setContainerId(this.containerId)
          .loadClasses()
          .loadScales()
          .fillSVG(this.currentMEIDoc)
        this.musicplayer = this.musicplayer || new MusicPlayer(this.containerId)
        this.musicplayer
          .setMEI(this.currentMEIDoc)
        this.undoMEIStacks.push(mei)

        //mark if note was inserted (enables direct manipulation)
        // document.querySelectorAll(".marked").forEach(m => {
        //   m.classList.remove("marked")
        // })
        //if(document.querySelectorAll(".marked").length === 0){
          var lastAddedClass = "lastAdded"
          document.querySelectorAll("." + lastAddedClass).forEach(m => {
            m.classList.remove(lastAddedClass)
          })

          if (this.lastInsertedNoteId != undefined && ["textmode", "clickmode"].some(mode => this.container.classList.contains(mode))) {
            this.container.querySelector("#" + this.lastInsertedNoteId)?.classList.add(lastAddedClass)
          }
        //}

        // MusicPlayer stuff
        this.getMidi().then(midi => {
          this.musicplayer.setMidi(midi)
          this.musicplayer.addCanvas()
          this.resolveMidiTimes().then(md => {
            this.musicplayer.setMidiTimes(md)
            this.musicplayer.update()
            this.scoreGraph = new ScoreGraph(this.currentMEIDoc, this.containerId, md)
            //the first condition should only occur at first starting the score editor
            if(this.container.querySelector(".lastAdded") === null && this.scoreGraph.getCurrentNode() == undefined){
              this.scoreGraph.setCurrentNodeById(this.container.querySelector(".staff > .layer").firstElementChild.id)
            }else{ //second condition always sets lastAdded Note
              this.scoreGraph.setCurrentNodeById(this.container.querySelector(".lastAdded")?.id)
            }
            this.musicplayer.setScoreGraph(this.scoreGraph)
            this.initializeHandlers()
            document.getElementById(this.containerId).dispatchEvent(new Event("loadingEnd"))
            this.svg = new XMLSerializer().serializeToString(this.container.querySelector("#svg_output"))
            if (this.meiChangedCallback != undefined) {
              this.meiChangedCallback(this.currentMEI)
            }
            resolve(svg);
          })
        })
      })
    });
  }



  reloadDataFunction = (function reloadData(): Promise<boolean> {
    return this.loadData("", this.currentMEI, false)
  }).bind(this)

  loadDataFunction = (function loadDataFunction(pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) {
    return this.loadData(pageURI, data, isUrl)
  }).bind(this)

  /**
   * Initialize Handlers
   */
  initializeHandlers() {
    //must be first!!!
    if (this.m2m == undefined) {
      this.m2m = new Mouse2MEI()
    } else {
      //   this.m2m.update()
    }
    this.m2m
      .setContainerId(this.containerId)
      .setUpdateOverlayCallback(this.createSVGOverlay)
      .setCurrentMEI(this.currentMEIDoc)
      .update()
    //.setMouseEnterElementListeners()
    this.insertModeHandler = this.insertModeHandler || new InsertModeHandler(this.containerId)
    this.deleteHandler = this.deleteHandler || new DeleteHandler(this.containerId)
    this.noteDragHandler = new NoteDragHandler(this.containerId)
    this.keyboardHandler = this.keyboardHandler || new GlobalKeyboardHandler(this.containerId)
    this.sidebarHandler = this.sidebarHandler || new SidebarHandler()
    this.labelHandler = this.labelHandler || new LabelHandler(this.containerId)
    this.modHandler = this.modHandler || new ModHandler(this.containerId)
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
      .setM2M(this.m2m)
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
      .setM2M(this.m2m)
      .resetListeners()

    this.keyboardHandler
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
      .setM2M(this.m2m)
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
      .setM2M(this.m2m)
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
      document.getElementById("clickInsert").click()
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
            this.loadData("", updatedMEI, false).then(() => {
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
          this.loadData("", updatedMEI, false).then(() => {
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
        this.loadData(pageURI, meistate, false).then(() => resolve(true))
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
        this.loadData(pageURI, meistate, false).then(() => resolve(true))
      } else {
        resolve(false)
      }
    });
  }).bind(this)

  ////// VEROVIO REQUESTS /////////////////

  /**
   * Edits pitch position of given note via verovio toolkit
   * @param action 
   * @returns 
   */
  edit = (function edit(action: EditorAction): Promise<boolean> {
    return new Promise((resolve): void => {
      action.param = action.param as { elementId, x, y }
      if (action.param.x != undefined && action.param.y != undefined) {
        var message: VerovioMessage = {
          action: "edit",
          editorAction: action
        }

        var response: VerovioResponse
        response = this.verovioWrapper.setMessage(message)
        // MEI ist already updated after edit (setMessage)
        this.getMEI("").then(mei => {
          this.loadData("", mei, false).then(() => {

            message = {
              action: "getElementAttr",
              //@ts-ignore
              elementId: action.param.elementId
            }
            response = this.verovioWrapper.setMessage(message);
            resolve(response.result);
          })
        })
      } else {
        var nn = this.m2m.getNewNote()
        var editNote = this.currentMEIDoc.getElementById(nn.nearestNoteId)
        editNote.setAttribute("oct", nn.oct)
        editNote.setAttribute("pname", nn.pname)
        this.loadData("", meiConverter.restoreXmlIdTags(this.currentMEIDoc), false).then(() => {
          resolve(true);

        })
      }
    })
  }).bind(this)

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
   * Get all times for each note 
   * @returns 
   */
  resolveMidiTimes(): Promise<Map<number, Array<Element>>> {
    return new Promise((resolve): void => {
      var noteTimes = new Map<number, Array<Element>>();

      var result = Array.from(cq.getRootSVG(this.containerId).querySelectorAll(".note, .rest"))
      result.forEach(node => {
        try {
          var message: VerovioMessage = {
            action: "getTimeForElement",
            id: uuidv4(),
            elementId: node.id
          }

          var response: VerovioResponse = this.verovioWrapper.setMessage(message)
          if (!noteTimes.has(response.time)) {
            noteTimes.set(response.time, new Array())
          }
          var arr = noteTimes.get(response.time)
          //arr.push(node.id)
          arr.push(cq.getRootSVG(this.containerId).querySelector("#" + node.id))
        } catch {
          console.log("Catched Midi Event", node)
        }
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
      var refSVG = document.getElementById(this.containerId).querySelector("#rootSVG") as unknown as SVGSVGElement
      this.interactionOverlay = document.getElementById(this.containerId).querySelector("#interactionOverlay")
      if (this.interactionOverlay === null) {
        var overlay = document.createElementNS(c._SVGNS_, "svg")
        overlay.setAttribute("id", "interactionOverlay")
        this.interactionOverlay = overlay
      }

      var root = cq.getRootSVG(this.containerId)
      var rootBBox = root.getBoundingClientRect()
      var rootWidth = (rootBBox.width).toString()
      var rootHeigth = (rootBBox.height).toString()
      
      if (this.interactionOverlay.getAttribute("viewBox") === null) {
        this.interactionOverlay.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
      }

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

        reorderedBoxes.forEach(sr => {
          if (!["g", "path"].includes(sr.tagName.toLowerCase())) {
            //sr.remove()
            return
          } else if (Array.from(sr.classList).some(srcl => srcl.includes("page") || srcl.includes("system"))) {
            //sr.remove()
            return
          } else {
            var that = this
            async function computeCoords() { // since order is not important, this block can be asynchronous
              return new Promise((resolve): void => {
                var parentsr = sr
                var g = document.createElementNS(c._SVGNS_, "g")
                var refId: string = parentsr.id !== "" ? parentsr.id : parentsr.getAttribute("refId")
                if (refId !== "" && refId !== null) {
                  g.setAttribute("refId", refId)
                }
                parentsr.classList.forEach(c => g.classList.add(c))
                var bbox = sr.getBoundingClientRect()
                var cc = coordinates.getDOMMatrixCoordinates(bbox, that.interactionOverlay)
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
                if (navigator.userAgent.toLowerCase().includes("firefox")) {
                  ffbb.adjustBBox(g)
                }
                resolve(true)
              })
            }
            computeCoords()
          }
        })
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
        if(key === "groups"){
          (document.getElementById(this.containerId)?.querySelectorAll("[role=\"group\"]")).forEach(g => (g as HTMLElement).classList.add("hideUI")) // style.setProperty("display", "none", "important"))
        }else{
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
        if(key === "groups"){
          (document.getElementById(this.containerId)?.querySelectorAll("[role=\"group\"]")).forEach(g => (g as HTMLElement).classList.remove("hideUI")) // style.setProperty("display", "none", "important"))
        }else{
          (document.getElementById(this.containerId)?.querySelector("#" + key) as HTMLElement)?.classList.remove("hideUI")//style.setProperty("display", "none", "important")
        }

      }
    }
  }

  ////////// GETTER/ SETTER
  /**
   * 
   * @returns current Mouse2MEI Instance
   */
  getMouse2MEI(): Mouse2MEI {
    return this.m2m;
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

  getSVG(): string{
    return this.svg
  }

  getNoteDragHandler() {
    return this.noteDragHandler
  }

  getGlobalKeyboardHandler() {
    return this.keyboardHandler
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

  getMusicPlayer(): MusicPlayer {
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
    var svg = cq.getRootSVG(this.containerId)
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
    var svg = cq.getRootSVG(this.containerId)
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
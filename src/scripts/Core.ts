import VerovioWrapper from  './utils/VerovioWrapper';
import { NewNote, VerovioMessage, VerovioResponse, EditorAction, Attributes, NoteTime } from './utils/Types';
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
import SidebarHandler from './handlers/SideBarHandler';
import LabelHandler from './handlers/LabelHandler';
import ModHandler from './handlers/ModHandler';
import * as cq from "./utils/convenienceQueries"
import * as coordinates from "./utils/coordinates"
import * as ffbb from "./utils/firefoxBBoxes"
import { threadId } from 'worker_threads';


/**
 * A cache is used to keep track of what has happened
 * across multiple pages in a manuscript without having
 * to make many calls to the PouchhDb database.
 */
interface CacheEntry {
  dirty: boolean;
  mei: string;
  svg: SVGSVGElement;
}

//@ts-ignore
//const $ = H5P.jQuery;

/**
 * The core component the Editor. This manages the database,
 * the verovio toolkit, the cache, and undo/redo stacks.
 */
class Core {
  private verovioWrapper: VerovioWrapper;
  private verivioMeasureWrappers: Map<string, VerovioWrapper> // measure.id, verovioWrapper
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
  private modHandler: ModHandler;
  private currentMEI: string;
  private currentMEIDoc: Document
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

  /**
   * Constructor for NeonCore
   */
  constructor (containerId: string) {

    this.containerId = containerId
    this.container = document.getElementById(containerId)
    this.verovioWrapper = new VerovioWrapper();
    this.undoMEIStacks = Array<string>();
    this.redoMEIStacks = new Array<string>();
    this.undoAnnotationStacks = new Array<Array<Element>>();
    //this.undoAnnotationStacks.push(new Array<Element>())
    this.redoAnnotationStacks = new Array<Array<Element>>();
    //this.redoAnnotationStacks.push(new Array<Element>())
    this.verivioMeasureWrappers = new Map();
    this.windowHandler = new WindowHandler()
    this.svgFiller = new SVGFiller()

    window.addEventListener("error", (function(e){
        console.error("Emergency Undo", e)
        this.undo()
      }).bind(this)
    )// emergency reload if some error occurs
  }

  /**
   * Load data into the verovio toolkit and update the cache.
   * @param pageURI - The URI of the selected page.
   * @param data - The MEI of the page as a string.
   * @param dirty - If the cache entry should be marked as dirty.
   */
  loadData (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string): Promise<string> {
  
    if(cq.getRootSVG(this.containerId) !== null){
      this.svgFiller.cacheClasses()
      cq.getRootSVG(this.containerId).remove()
     }
    var waitingFlag = "waiting"
      if(cq.getRootSVG(this.containerId) !== null){
       document.body.classList.add(waitingFlag)
      }
    return new Promise((resolve, reject): void => {
      var d: string;
      var u: boolean;
      var type: string = data?.constructor.name;
      switch(type){
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

      var response
      var svg

      response = this.verovioWrapper.setMessage(message);

      svg = response.mei;
      svg = svg.replace("<svg", "<svg id=\"" + c._ROOTSVGID_ + "\"");
      try{
        //cq.getBySelector(this.containerId, "#", targetDivID, "#", ">").innerHTML = svg
        document.querySelector("#" + this.containerId + "> #svg_output").innerHTML = svg
      }catch(ignore){
        console.log("Fehler bei einfügen von SVG")
      }
      this.svgFiller.distributeIds(this.container.querySelector("#rootSVG .definition-scale"))
      this.container.querySelector("#rootSVG").setAttribute("preserveAspectRatio", "xMidYMid meet")

      var rootBBox = this.container.querySelector("#rootSVG").getBoundingClientRect()
      var rootWidth = rootBBox.width.toString()
      var rootHeigth = rootBBox.height.toString()

      this.container.querySelector("#rootSVG").setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
      this.container. querySelector("#rootSVG").removeAttribute("height")
      this.container. querySelector("#rootSVG").removeAttribute("width")
     
      this.createSVGOverlay(true)
      
      document.body.classList.remove(waitingFlag)
    
      this.getMEI("").then(mei => {
        this.currentMEI = mei
        this.currentMEIDoc = this.getCurrentMEI(true) as Document
        console.log(this.currentMEIDoc)
        this.svgFiller
          .setContainerId(this.containerId)
          .loadClasses()
          .fillSVG(this.currentMEIDoc)
        this.musicplayer = this.musicplayer || new MusicPlayer(this.containerId)
        this.musicplayer
          .setMEI(this.currentMEIDoc)
        this.undoMEIStacks.push(mei)

        //mark if note was inserted (enables direct manipulation)
        // document.querySelectorAll(".marked").forEach(m => {
        //   m.classList.remove("marked")
        // })

        if(this.lastInsertedNoteId != undefined && this.container.querySelector("#" + targetDivID).classList.contains("clickmode")){
          this.container.querySelector("#" + this.lastInsertedNoteId)?.classList.add("marked")
        }

        if(this.meiChangedCallback != undefined){
          console.log(this, this.currentMEI)
          this.meiChangedCallback(this.currentMEI)
        }

        // MusicPlayer stuff
        this.getMidi().then(midi => {
          this.musicplayer.setMidi(midi)
          this.musicplayer.addCanvas()
          this.resolveMidiTimes().then(md => {
            this.musicplayer.setMidiTimes(md)
            this.musicplayer.update()
            this.scoreGraph = new ScoreGraph(this.currentMEIDoc, this.containerId, md)
            this.musicplayer.setScoreGraph(this.scoreGraph)
            this.initializeHandlers()
            resolve(svg);
          })
        })
      })
    });
  }

  reloadDataFunction = (function reloadData(): Promise<boolean>{
      return this.loadData("", this.currentMEIDoc, false, c._TARGETDIVID_)
  }).bind(this)

  loadDataFunction = (function loadDataFunction(pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string){
    return this.loadData (pageURI, data, isUrl, targetDivID)
  }).bind(this)

  /**
   * Initialize Handlers
   */
  initializeHandlers(){
    //must be first!!!
    if(this.m2m == undefined){
      this.m2m = new Mouse2MEI()
    }else{
    //   this.m2m.update()
    }
    this.m2m
      .setContainerId(this.containerId)
      .setUpdateOverlayCallback(this.createSVGOverlay)
      .setCurrentMEI(this.currentMEIDoc)
      .update()
      //.setMouseEnterElementListeners()
    this.insertModeHandler = this.insertModeHandler || new InsertModeHandler(this.containerId)
    this.deleteHandler = this.deleteHandler|| new DeleteHandler(this.containerId)
    this.noteDragHandler = new NoteDragHandler(this.containerId)
    this.keyboardHandler = this.keyboardHandler || new GlobalKeyboardHandler(this.containerId)
    this.sidebarHandler = this.sidebarHandler || new SidebarHandler()
    this.labelHandler = this.labelHandler || new LabelHandler(this.containerId)
    this.modHandler = this.modHandler || new ModHandler(this.containerId)

    this.dispatchFunctions()
  }

  /**
   * distribute Callback functions for each element which uses some information from of the Core (Handlers, Musicplayer, Callbacks, etc)
   */
  dispatchFunctions(){
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
      .setDeleteHandler(this.deleteHandler)
      .setEditCallback(this.edit)
      .setElementAttrCallback(this.getElementAttr)
      .setMusicPlayer(this.musicplayer)
      .setM2M(this.m2m)

    this.keyboardHandler
      .setContainerId(this.containerId)
      .setUndoCallback(this.undo)
      .setRedoCallback(this.redo)
      .setCurrentMei(this.currentMEIDoc)
      .setMusicPlayer(this.musicplayer)
      .setHarmonyHandlerCallback(this.labelHandler.setHarmonyLabelHandlerKey)
      .setLoadDataCallback(this.loadDataFunction)
      .setScoreGraph(this.scoreGraph)
      .resetListeners()
    
    this.windowHandler
      .setContainerId(this.containerId)
      .setM2M(this.m2m)
      .setCurrentMEI(this.currentMEIDoc)
      .setLoadDataCallback(this.loadDataFunction)
      .setSVGReloadCallback(this.reloadDataFunction)
      .setAnnotations(this.insertModeHandler.getAnnotations())
      .setInsertModeHandler(this.insertModeHandler)
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
  }

  /**
   * Delete array of notes from score
   */
  delete = (function d (notes: Array<Element>): Promise<boolean> {
    return new Promise((resolve): void => {
      this.getMEI("").then(mei => {
        meiOperation.removeFromMEI(notes, this.currentMEIDoc).then(updatedMEI => {
          if(updatedMEI != undefined){
            this.loadData("", updatedMEI, false, c._TARGETDIVID_).then(() => {
              resolve(true);
            })
          }else{
            resolve(true)
          }
        })
      })
    });
  }).bind(this)

  /**
   * 
   */
  insert = (function insert (newNote: NewNote, replace: Boolean = false): Promise<boolean> {    
    console.log(newNote)
    this.lastInsertedNoteId = newNote.id

    return new Promise((resolve, reject): void => {
      this.getMEI("").then(mei => {
        var updatedMEI = meiOperation.addToMEI(newNote, this.currentMEIDoc, replace, this.scoreGraph)
        if(updatedMEI?.documentElement.innerHTML.indexOf(newNote.id) === -1){
          reject()
        }
        if(updatedMEI != undefined){
          this.loadData("", updatedMEI, false, c._TARGETDIVID_).then(() => {
              resolve(true)       
          })
        }else{
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
   undo = (function undo (pageURI: string  = ""): Promise<boolean> {
    return new Promise((resolve): void => {
        if(this.container.classList.contains("annotMode")){
          this.undoAnnotationStacks.pop()
          const annotstate = this.undoAnnotationStacks.pop()
          if(annotstate != undefined){
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
            this.loadData(pageURI, meistate, false, c._TARGETDIVID_).then(() => resolve(true))
        }else{
          resolve(false)
        }
    });
  }).bind(this)

  /**
   * Redo the last action performed on a page.
   * @param pageURI - The page URI.
   * @returns If the action was redone.
   */
  redo = (function redo (pageURI: string = ""): Promise<boolean> {
    return new Promise((resolve): void => {
      if(this.container.classList.contains("annotMode")){
        const annotstate = this.redoAnnotationStacks.pop()
        if(annotstate != undefined){
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
          this.loadData(pageURI, meistate, false, c._TARGETDIVID_).then(() => resolve(true))
      }else{
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
      action.param = action.param as {elementId, x, y}
      if(action.param.x != undefined && action.param.y != undefined){
        var message: VerovioMessage = {
          action: "edit",
          editorAction: action
        }
        
        var response: VerovioResponse
        response = this.verovioWrapper.setMessage(message)
        // MEI ist already updated after edit (setMessage)
        this.getMEI("").then(mei =>{
          this.loadData("", mei, false, c._TARGETDIVID_).then(() => {
            
            message = {
              action: "getElementAttr",
              //@ts-ignore
              elementId: action.param.elementId
            }
            response = this.verovioWrapper.setMessage(message);          
            resolve(response.result);
          })
        })
      }else{
        var nn = this.m2m.getNewNote()
        var editNote = this.currentMEIDoc.getElementById(nn.nearestNoteId)
        editNote.setAttribute("oct", nn.oct)
        editNote.setAttribute("pname", nn.pname)
        this.loadData("", meiConverter.restoreXmlIdTags(this.currentMEIDoc), false, c._TARGETDIVID_).then(() => {     
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

      
      if(response.mei){
        this.currentMEI = response.mei;
      }else{
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
      if(response.midi){
        this.currentMidi = response.mei;
        resolve(response.midi)
      }else{
        reject("fail!")
      }
    });
  }

  /**
   * Get all times for each note 
   * @returns 
   */
  resolveMidiTimes(): Promise<Map<number, Array<Element>>>{
    	return new Promise((resolve): void =>{
        var noteTimes = new Map<number, Array<Element>>();
        
        var result = Array.from(cq.getRootSVG(this.containerId).querySelectorAll(".note, .rest"))
        result.forEach(node => {
          try{
            var message: VerovioMessage = {
              action: "getTimeForElement",
              id: uuidv4(),
              elementId: node.id
            }

            var response: VerovioResponse = this.verovioWrapper.setMessage(message)
            if(!noteTimes.has(response.time)){
              noteTimes.set(response.time, new Array())
            }
            var arr = noteTimes.get(response.time)
            //arr.push(node.id)
            arr.push( cq.getRootSVG(this.containerId).querySelector("#"+node.id))
          }catch{
            console.log("CATCH ", node)
          }
        })
        resolve(noteTimes)
      })
  }

  /**
   * Create an overlay of all interative elements over the the score svg.
   */
  createSVGOverlay(loadBBoxes: boolean = true): Promise<boolean>{
    return new Promise((resolve): void => {
      document.getElementById(this.containerId).focus()
      var refSVG =  document.getElementById(this.containerId).querySelector("#rootSVG") as unknown as SVGSVGElement
      this.interactionOverlay = document.getElementById(this.containerId).querySelector("#interactionOverlay")
      if(this.interactionOverlay === null){
        var overlay = document.createElementNS(c._SVGNS_, "svg")
        overlay.setAttribute("id", "interactionOverlay")
        this.interactionOverlay = overlay
      }

      var root = cq.getRootSVG(this.containerId)
      var rootBBox = root.getBoundingClientRect()
      var rootWidth = rootBBox.width.toString()
      var rootHeigth = rootBBox.height.toString()

      if(this.interactionOverlay.getAttribute("viewBox") === null){
        this.interactionOverlay.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
      }

      document.getElementById(this.containerId).querySelector("#interactionOverlay #scoreRects")?.remove()
      var scoreRects = document.createElementNS(c._SVGNS_, "svg") 
      scoreRects.setAttribute("id", "scoreRects")
      scoreRects.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))

      Array.from(refSVG.attributes).forEach(a => {
        if(!["id", "width", "height"].includes(a.name)){
          this.interactionOverlay.setAttribute(a.name, a.value)
        }
      })
      this.interactionOverlay.appendChild(scoreRects)
      refSVG.insertAdjacentElement("beforebegin", this.interactionOverlay)

      if(loadBBoxes){
        var svgBoxes = Array.from(document.getElementById(this.containerId)
        .querySelectorAll(".definition-scale :is(g,path)"))
        .filter(el => {
          var condition = !["system", "measure", "staffLine", "layer", "ledgerLines", "flag"].some(cn => el.classList.contains(cn))
          return condition
        })

        var reorderedBoxes = new Array<Element>() // reorder so that dependent elements are already in array
        svgBoxes.forEach(sb => {
          if(sb.querySelector(":scope > use, :scope > rect, :scope > path") === null){
            reorderedBoxes.push(sb)
          }else{
            reorderedBoxes.unshift(sb)
          }
        })

        reorderedBoxes.forEach(sr => {
          if(!["g", "path"].includes(sr.tagName.toLowerCase())){
            //sr.remove()
            return
          }else if(Array.from(sr.classList).some(srcl => srcl.includes("page") || srcl.includes("system"))){
            //sr.remove()
            return
          }else{
            var that = this
            async function computeCoords(){ // since order is not important, this block can be asynchronous
              return new Promise((resolve): void => {
                var rect = document.createElementNS(c._SVGNS_, "rect")
                var g = document.createElementNS(c._SVGNS_, "g")
                var refId: string = sr.id !== "" ? sr.id : sr.getAttribute("refId")
                if(refId !== "" && refId !== null){
                  g.setAttribute("refId", refId)
                }
                sr.classList.forEach(c => g.classList.add(c))
                var bbox = sr.getBoundingClientRect()
                var cc = coordinates.getDOMMatrixCoordinates(bbox, that.interactionOverlay)
                rect.setAttribute("x", cc.left.toString())
                rect.setAttribute("y", cc.top.toString())
                var w: number
                if(cc.width === 0) w = 2
                rect.setAttribute("width", w?.toString() || cc.width.toString())
                var h: number
                if(cc.height === 0) h = 2
                rect.setAttribute("height", h?.toString() || cc.height.toString())
                g.appendChild(rect)
                scoreRects.append(g)
                if(navigator.userAgent.toLowerCase().includes("firefox")){
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

  private replaceWithRect(el: Element){
    if(!["g", "path", "svg"].includes(el.tagName.toLowerCase())){
      el.remove()
      return
    }

    if(el.childElementCount > 0){
      Array.from(el.children).forEach(ec => {
        this.replaceWithRect(ec)
      })
    }

    if("svg" !== el.tagName.toLowerCase()){
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
      if(cc.width === 0) w = 2
      rect.setAttribute("width", w?.toString() || cc.width.toString())
      var h: number
      if(cc.height === 0) h = 2
      rect.setAttribute("height", h?.toString() || cc.height.toString())
      childCopy.forEach(cc => rect.appendChild(childCopy.shift()))
      el.insertAdjacentElement("beforebegin", rect)
      el.remove()
    }
  }

  getElementAttr = (function getElementAttr(id: string): Attributes{
    const message: VerovioMessage = {
      action: "getElementAttr",
      elementId: id
    }
    return this.verovioWrapper.setMessage(message).attributes;
  }).bind(this)

  ////////// GETTER/ SETTER
  /**
   * 
   * @returns current Mouse2MEI Instance
   */
  getMouse2MEI(): Mouse2MEI{
    return this.m2m;
  }

  getDeleteHandler(): DeleteHandler{
    return this.deleteHandler;
  }

  getInsertHandler(): InsertModeHandler{
    return this.insertModeHandler
  }

  getCurrentMEI(asDocument: boolean = false): string | Document {
    if(asDocument){
      var meiDoc = meiConverter.meiToDoc(this.currentMEI)
      meiDoc = meiConverter.standardizeAccid(meiDoc)
      return meiDoc
    }
    return this.currentMEI;
  }

  getCurrentMidi(){
    return this.currentMidi;
  }

  getMusicPlayer(): MusicPlayer{
    return this.musicplayer;
  }

  setMEIChangedCallback(meiChangedCallback: (mei: string) => void) {
    this.meiChangedCallback = meiChangedCallback
  }
}

export { Core as default };
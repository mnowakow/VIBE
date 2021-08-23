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

  private undoStacks: Array<string>;
  private redoStacks: Array<string>;

  //private $: any;
  private insertModeHandler: InsertModeHandler;
  private deleteHandler: DeleteHandler;
  private noteDragHandler: NoteDragHandler;
  private sidebarHandler: SidebarHandler
  private windowHandler: WindowHandler;
  private currentMEI: string;
  private currentMEIDoc: Document
  private currentMidi: string;
  private keyboardHandler: GlobalKeyboardHandler;
  private musicplayer: MusicPlayer;
  private scoreGraph: ScoreGraph;
  private svgFiller: SVGFiller;

  /**
   * Constructor for NeonCore
   */
  constructor () {
    this.verovioWrapper = new VerovioWrapper();
    this.undoStacks = Array<string>();
    this.redoStacks = new Array<string>();
    this.musicplayer = new MusicPlayer()
    this.verivioMeasureWrappers = new Map();

    this.windowHandler = new WindowHandler()
    this.svgFiller = new SVGFiller()
  }

  /**
   * Load data into the verovio toolkit and update the cache.
   * @param pageURI - The URI of the selected page.
   * @param data - The MEI of the page as a string.
   * @param dirty - If the cache entry should be marked as dirty.
   */
  loadData (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string): Promise<string> {
  
    if(document.getElementById(c._ROOTSVGID_) !== null){
      this.svgFiller.cacheClasses()
      document.getElementById(c._ROOTSVGID_).remove()
     }
    var waitingFlag = "waiting"
      if(document.getElementById(c._ROOTSVGID_) !== null){
       document.body.classList.add(waitingFlag)
      }
    return new Promise((resolve, reject): void => {
      var d: string;
      var u: boolean;
      var type: string = data.constructor.name;
      switch(type){
        case 'String':
          d = data as string;
          u = isUrl
          break;
        case 'XMLDocument':
          data = meiOperation.disableFeatures(["grace", "arpeg", "slur"], (data as Document)) // for Debugging
          d = new XMLSerializer().serializeToString(data as Document);
          u = false;
          break;
        case 'HTMLUnknownElement':
          d = new XMLSerializer().serializeToString(data as HTMLElement);
          u = false;
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
        document.getElementById(targetDivID).innerHTML = svg;
      }catch(ignore){
        console.log("Fehler bei einfügen von SVG")
      }

      document.body.classList.remove(waitingFlag)
    
      this.getMEI("").then(mei => {
        this.currentMEI = mei
        this.currentMEIDoc = this.getCurrentMEI(true) as Document
        console.log(this.currentMEIDoc)
        this.svgFiller
          .loadClasses()
          .fillSVG(this.currentMEIDoc)
        this.musicplayer.setMEI(this.currentMEIDoc)
        this.undoStacks.push(mei)

        // MusicPlayer stuff
        this.getMidi().then(midi => {
          this.musicplayer.setMidi(midi)
          this.musicplayer.addCanvas()
          this.getNoteTimes().then(md => {
            this.musicplayer.setNoteTimes(md)
            this.musicplayer.update()
            this.scoreGraph = new ScoreGraph(this.currentMEIDoc, md)
            this.musicplayer.setScoreGraph(this.scoreGraph)
            this.initializeHandlers()
            resolve(svg);
          })
        })
      })
    });
  }

  loadDataFunction = (function loadDataFunction(pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string){
    return this.loadData (pageURI, data, isUrl, targetDivID)
  }).bind(this)

  /**
   * Initialize Handlers
   */
  initializeHandlers(){
    //must be first!!!
    if(typeof this.m2m === "undefined"){
      this.m2m = new Mouse2MEI()
    }else{
      this.m2m.update()
    }
    this.m2m.setCurrentMEI(this.currentMEIDoc)
    this.insertModeHandler = typeof this.insertModeHandler === "undefined" ? new InsertModeHandler() : this.insertModeHandler
    this.deleteHandler = typeof this.deleteHandler === "undefined" ? new DeleteHandler() : this.deleteHandler
    this.noteDragHandler = new NoteDragHandler()
    this.keyboardHandler = typeof this.keyboardHandler === "undefined" ? new GlobalKeyboardHandler() : this.keyboardHandler
    this.sidebarHandler = typeof this.sidebarHandler === "undefined" ? new SidebarHandler() : this.sidebarHandler

    this.dispatchFunctions()
  }

  /**
   * distribute Callback functions for each element which uses some information from of the Core (Handlers, Musicplayer, etc)
   */
  dispatchFunctions(){
    this.insertModeHandler
      .setM2M(this.m2m)
      .setMusicPlayer(this.musicplayer)
      .setDeleteHandler(this.deleteHandler)
      .setInsertCallback(this.insert)
      .setDeleteCallback(this.delete)
      .setLoadDataCallback(this.loadDataFunction)
      .setScoreGraph(this.scoreGraph)
      .resetCanvas()
      .resetModes()

    this.deleteHandler
      .setDeleteCallback(this.delete)
      .update()

    this.noteDragHandler
      .setCurrentMEI(this.currentMEIDoc)
      .setDeleteHandler(this.deleteHandler)
      .setEditCallback(this.edit)
      .setElementAttrCallback(this.getElementAttr)
      .setMusicPlayer(this.musicplayer)

    this.keyboardHandler
      .setUndoCallback(this.undo)
      .setRedoCallback(this.redo)
      .setCurrentMei(this.currentMEIDoc)
      .setMusicPlayer(this.musicplayer)
      .setLoadDataCallback(this.loadDataFunction)
      .setScoreGraph(this.scoreGraph)
      .resetListeners()
    
    this.windowHandler
      .setM2M(this.m2m)
      .resetListeners()

    this.sidebarHandler
      .setCurrentMei(this.currentMEIDoc)
      .setM2M(this.m2m)
      .setLoadDataCallback(this.loadDataFunction)
      .loadMeter()
      .makeScoreElementsClickable()
  }

  /**
   * Delete array of notes from score
   */
  delete = (function d (notes: Array<Element>): Promise<boolean> {
    return new Promise((resolve): void => {
      this.getMEI("").then(mei => {
        meiOperation.removeFromMEI(notes, this.currentMEIDoc).then(updatedMEI => {
          this.loadData("", updatedMEI, false, c._TARGETDIVID_).then(() => {
            resolve(true);
          })
        })
      })
    });
  }).bind(this)

  /**
   * Perform an editor action on a specific page.
   * @param action - The editor toolkit action object.
   * @param pageURI - The URI of the selected page.
   */
  insert  = (function insert (newNote: NewNote): Promise<boolean> {    
    return new Promise((resolve): void => {
      this.getMEI("").then(mei => {
      var updatedMEI = meiOperation.addToMEI(newNote, this.currentMEIDoc)
        this.loadData("", updatedMEI, false, c._TARGETDIVID_).then(() => {
            resolve(true)       
        })
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
        this.undoStacks.pop() // get rid of currentMEI, since last (initial) MEI is not accessible through verovio
        const state = this.undoStacks.pop()
        if (state !== undefined) {
            this.redoStacks.push(this.currentMEI)
            this.loadData(pageURI, state, false, c._TARGETDIVID_).then(() => resolve(true))
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
        const state = this.redoStacks.pop()
        if (state !== undefined) {
            this.undoStacks.push(this.currentMEI);
            this.loadData(pageURI, state, false, c._TARGETDIVID_).then(() => resolve(true))
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
    });
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
  getNoteTimes(): Promise<Map<number, Array<Element>>>{
    	return new Promise((resolve): void =>{
        var noteTimes = new Map<number, Array<Element>>();
        
        var xpathResult = document.evaluate(
          "//*[@class='note' or starts-with(@class, 'note ') "
          + "or @class='rest' or starts-with(@class, 'rest ')]", 
          document.getElementById(c._ROOTSVGID_),
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
          null
        )
        var node = null
        while(node = xpathResult.iterateNext()){
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
            arr.push(document.getElementById(node.id))
          }catch{
            console.log("CATCH ", node)
          }
        }
        resolve(noteTimes)
      })
  }

  getElementAttr = (function getElementAttr(id: string): Attributes{
    const message: VerovioMessage = {
      action: "getElementAttr",
      elementId: id
    }
    return this.verovioWrapper.setMessage(message).attributes;
  }).bind(this)

  ////////// GETTER/ SETTER OF PRIVATE INSTANCES
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
      return meiConverter.meiToDoc(this.currentMEI)
    }
    return this.currentMEI;
  }

  getCurrentMidi(){
    return this.currentMidi;
  }

  getMusicPlayer(): MusicPlayer{
    return this.musicplayer;
  }
  
}

export { Core as default };
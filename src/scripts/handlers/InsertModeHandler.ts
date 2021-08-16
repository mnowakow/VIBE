import { constants as c } from '../constants';
import { Mouse2MEI } from '../utils/Mouse2MEI';
import Cursor from '../gui/Cursor';
import MusicPlayer from '../MusicPlayer';
import PhantomElement from '../gui/PhantomElement';
import SelectionHandler from './SelectionHandler';
import Handler from './Handler';
import Annotations from '../gui/Annotations';
import HarmonyHandler from './HarmonyHandler';
import DeleteHandler from './DeleteHandler';
import ScoreGraph from '../datastructures/ScoreGraph';
import KeyModeHandler from './KeyModeHandler';
import ClickModeHandler from './ClickModeHandler';
import { NewNote } from '../utils/Types';
import PhantomElementHandler from './PhantomElementHandler';
import { restorepXmlIdTags } from '../utils/MEIConverter';

//@ts-ignore
//const $ = H5P.jQuery;

/**
 * Class that handles insert mode, events, and actions.
 */
class InsertModeHandler implements Handler{
  type: string;
  selector: string;
  m2m: Mouse2MEI;
  musicPlayer: MusicPlayer;
  cursor: Cursor;
  clickInsertMode: boolean;
  keyInsertMode: boolean;
  annotationMode: boolean;
  harmonyMode: boolean;
  phantom: PhantomElement;
  currentMEI: string;
  navBarLoaded: boolean
  selectionHandler: SelectionHandler
  harmonyHandler: HarmonyHandler
  deleteHandler: DeleteHandler;
  scoreGraph: ScoreGraph;
  keyModeHandler: KeyModeHandler;
  clickModeHandler: ClickModeHandler;
  phantomNoteHandler: PhantomElementHandler;
  private annotations: Annotations;

  private currentElementToHighlight: Element

  private insertCallback: (newNote: NewNote) => Promise<any> 
  private deleteCallback: (notes: Array<Element>) => Promise<any>;
  private loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>;
  

  constructor () {
    this.annotations = new Annotations()
  }

  activateClickMode(){
    if(this.keyInsertMode || this.annotationMode || this.harmonyMode){
      this.insertDeactivate()
    }
    document.body.classList.add("clickmode")
    this.keyInsertMode = false;
    this.clickInsertMode = true;
    this.annotationMode = false;
    this.harmonyMode = false;

    this.phantom = new PhantomElement("note")
    this.phantomNoteHandler = new PhantomElementHandler
    this.phantomNoteHandler
      .setListeners()
      .setM2M(this.m2m)

    this.clickModeHandler = typeof this.clickModeHandler === "undefined" ? new ClickModeHandler() : this.clickModeHandler
    this.clickModeHandler
      .setInsertCallback(this.insertCallback)
      .setDeleteCallback(this.deleteCallback)
      .setAnnotations(this.annotations)
      .setM2M(this.m2m)
      .setMusicPlayer(this.musicPlayer)
      .resetListeners()
    // if(typeof this.selectionHandler !== "undefined"){
    //   this.selectionHandler.removeListeners()
    // }
    this.deleteHandler.setListeners()
  }

  activateKeyMode(){
    if(this.clickInsertMode || this.annotationMode || this.harmonyMode){
      this.insertDeactivate()
    }
    document.body.classList.add("textmode")
    this.keyInsertMode = true;
    this.clickInsertMode = false;
    this.annotationMode = false;
    this.harmonyMode = false;

    var cursor = null
    if(typeof this.keyModeHandler !== "undefined"){
      cursor = this.keyModeHandler.cursor
    }
    this.keyModeHandler = typeof this.keyModeHandler === "undefined" ? new KeyModeHandler() : this.keyModeHandler
    this.keyModeHandler
      .setInsertCallback(this.insertCallback)
      .setDeleteCallback(this.deleteCallback)
      .setScoreGraph(this.scoreGraph)
      .setM2M(this.m2m)
      .setMusicPlayer(this.musicPlayer)
      .resetListeners()
    // if(typeof this.selectionHandler !== "undefined"){
    //   this.selectionHandler.removeListeners()
    // }
    this.deleteHandler.setListeners()
  }

  activateSelectionMode(){
    this.insertDeactivate()
    this.selectionHandler = new SelectionHandler()
    this.selectionHandler.setM2M(this.m2m)
    this.deleteHandler.setListeners()
  }

  activateAnnotationMode(){
    this.insertDeactivate()
    if(typeof this.annotations === "undefined"){
      this.annotations = new Annotations()
    }else{
      this.annotations.update()
    }
    this.annotations
      .setM2M(this.m2m)
      .setMusicPlayer(this.musicPlayer)
      .setToFront()
      .setMenuClickHandler()

      this.keyInsertMode = false;
      this.clickInsertMode = false;
      this.annotationMode = true;
      this.harmonyMode = false;
  }

  activateHarmonyMode(){
    this.insertDeactivate()
    if(typeof this.harmonyHandler === "undefined"){
      this.harmonyHandler = new HarmonyHandler()
    }
    document.body.classList.add("harmonyMode")
    this.harmonyHandler
      .setListeners()
      .setM2M(this.m2m)
      .setMusicPlayer(this.musicPlayer)
      .setCurrentMEI(this.m2m.getCurrentMei())
      .setLoadDataCallback(this.loadDataCallback)

    this.keyInsertMode = false;
    this.clickInsertMode = false;
    this.annotationMode = false;
    this.harmonyMode = true
  }

  insertDeactivate(){
    document.body.classList.remove("textmode")
    document.body.classList.remove("clickmode")
    document.body.classList.remove("annotMode")
    document.body.classList.remove("harmonyMode")

    this.keyInsertMode = false;
    this.clickInsertMode = false;
    this.harmonyMode = false;
    this.annotationMode = false;

    if(typeof this.clickModeHandler !== "undefined"){
      this.clickModeHandler.removeListeners();
      this.phantomNoteHandler
        .removeListeners()
        .removeLines()
    }

    if(typeof this.keyModeHandler !== "undefined"){
      this.keyModeHandler.removeListeners();
    }

    // if(typeof this.selectionHandler !== "undefined"){
    //   this.selectionHandler.removeListeners()
    // }
    // this.selectionHandler = undefined

    if(typeof this.annotations !== "undefined"){
      this.annotations.removeListeners()
      this.annotations.setToBack()
      this.annotationMode = false
    }

    if(typeof this.harmonyHandler !== "undefined"){
      this.harmonyHandler.removeListeners()
    }

    if(typeof this.deleteHandler !== "undefined"){
      this.deleteHandler.removeListeners()
    }

  }

  setListeners(){
    var that = this
    Array.from(document.querySelectorAll(".dropdown-item")).forEach(n => {
      n.addEventListener("click", function(e){
          e.preventDefault()
          switch(this.id){
              case "clickInsert":
                  that.activateClickMode();
                  break;
              case "keyInsert":
                 that.activateKeyMode();
                  break;
              case "activateSelect":
                that.activateSelectionMode();
                break;
              case "activateAnnot":
                that.activateAnnotationMode();
                break;
              case "activateHarm":
                that.activateHarmonyMode();
                break;
              default:
                that.insertDeactivate()
                break;
          }
      })
    })

    Array.from(document.querySelectorAll("#noteGroup > *")).forEach(b => {
      b.addEventListener("click", function(e){
        let dur = 0
        switch(this.id){
          case "fullNote":
            dur = 1
            break;
          case "halfNote":
            dur = 2
            break;
          case "quarterNote":
            dur = 4
            break;
          case "eigthNote":
            dur = 8
            break;
          case "sixteenthNote":
            dur = 16
            break;
          case "thirtysecondNote":
            dur = 32
            break;
        }
        that.m2m.setDurationNewNote(dur)
        if(that.m2m.setMarkedNoteDurations(dur)){
          var mei = restorepXmlIdTags(that.m2m.getCurrentMei())
          that.loadDataCallback("", mei, false, c._TARGETDIVID_)
        }
      })
    })

    Array.from(document.querySelectorAll("#dotGroup > *")).forEach(b => {
      b.addEventListener("click", function(e){
        let dots = 0
        if(this.classList.contains("selected")){
          switch(this.id){
            case "oneDot":
              dots = 1
              break;
            case "twoDot":
              dots = 2
          }
        }
        that.m2m.setDotsNewNote(dots)
      })
    })

    this.navBarLoaded = true
    return this
  }

  removeListeners(){
    // No Changes in Navbar = no remove
  }

  resetModes(){
     //reset  
     if(!this.navBarLoaded) this.setListeners();
     if(this.keyInsertMode) this.activateKeyMode();
     if(this.clickInsertMode) this.activateClickMode();
     if(this.annotationMode) this.activateAnnotationMode();
     if(this.harmonyMode) this.activateHarmonyMode();
     return this
  }

  /////////////// GETTER/ SETTER /////////////////

  setM2M(m2m: Mouse2MEI){
    this.m2m = m2m
    this.selectionHandler = new SelectionHandler()
    this.selectionHandler.setM2M(this.m2m)
    return this
  }

  setMusicPlayer(musicPlayer: MusicPlayer){
    this.musicPlayer = musicPlayer
    return this
  }

  setScoreGraph(scoreGraph: ScoreGraph) {
    this.scoreGraph = scoreGraph
    return this
  }

  setDeleteHandler(deleteHandler: DeleteHandler){
    this.deleteHandler = deleteHandler
    return this
  }

  setInsertCallback(insertCallback: (newNote: NewNote) => Promise<any>){
    this.insertCallback = insertCallback
    return this
  }

  setDeleteCallback(deleteCallback: (notes: Array<Element>) => Promise<any>){
    this.deleteCallback = deleteCallback
    return this
  }

  setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>){
    this.loadDataCallback = loadDataCallback
    return this
  }

  resetCanvas(){
    if(typeof this.annotations !== "undefined"){
      document.getElementById(c._ROOTSVGID_).append(this.annotations.getCanvasGroup())
      this.annotations.addCanvas()
    }
    return this
  }

  getAnnotations(): Annotations{
    return this.annotations
  }

}

export { InsertModeHandler as default };

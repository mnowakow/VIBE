import { constants as c } from '../constants';
import { Mouse2MEI } from '../utils/Mouse2MEI';
import Cursor from '../gui/Cursor';
import MusicPlayer from '../MusicPlayer';
import PhantomElement from '../gui/PhantomElement';
import SelectionHandler from './SelectionHandler';
import Handler from './Handler';
import Annotations from '../gui/Annotations';
import LabelHandler from './LabelHandler';
import DeleteHandler from './DeleteHandler';
import ScoreGraph from '../datastructures/ScoreGraph';
import KeyModeHandler from './KeyModeHandler';
import ClickModeHandler from './ClickModeHandler';
import { NewNote } from '../utils/Types';
import PhantomElementHandler from './PhantomElementHandler';
import { restoreXmlIdTags } from '../utils/MEIConverter';
import ScoreManipulatorHandler from './ScoreManipulatorHandler';
import { cleanUp } from '../utils/MEIOperations';
import * as cq from "../utils/convenienceQueries"
import MeasureMatrix from '../datastructures/MeasureMatrix';
import { MidSideMerge } from 'tone';
import { TickSignal } from 'tone/build/esm/core/clock/TickSignal';

/**
 * Handle logic and interaction with Tabbar and Custom Toolbar.
 * Activates and deactivates interface behavior according to selected tabbar or or custom group button.
 * E.g. Selection is deactivated during harmonylabels are active, or Notations with keyboard and mouse are deactivated when annotations are active.
 */
class InsertModeHandler implements Handler {
  containerId: string;
  type: string;
  selector: string;
  m2m: Mouse2MEI;
  musicPlayer: MusicPlayer;
  cursor: Cursor;
  clickInsertMode: boolean;
  keyMode: boolean;
  annotationMode: boolean;
  harmonyMode: boolean;
  isGlobal: boolean;
  phantom: PhantomElement;
  currentMEI: string;
  navBarLoaded: boolean
  selectionHandler: SelectionHandler
  labelHandler: LabelHandler
  deleteHandler: DeleteHandler;
  scoreGraph: ScoreGraph;
  keyModeHandler: KeyModeHandler;
  clickModeHandler: ClickModeHandler
  phantomNoteHandler: PhantomElementHandler;
  private annotations: Annotations;
  smHandler: ScoreManipulatorHandler
  rootSVG: Element
  interactionOverlay: Element
  container: Element

  private currentElementToHighlight: Element

  private insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>
  private deleteCallback: (notes: Array<Element>) => Promise<any>;
  private loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>;


  constructor(containerId) {
    this.isGlobal = true
    this.annotations = new Annotations(containerId)
  }

  activateInsertMode(clicked: Boolean = false) {
    if (this.annotationMode || this.harmonyMode) {
      this.insertDeactivate()
    }
    // if (clicked) {
    //   if (this.unselectMenuItem("clickInsert")) { return }
    // }
    this.container.classList.add("clickmode")
    this.container.classList.add("textmode")
    this.keyMode = true;
    this.clickInsertMode = true;
    this.annotationMode = false;
    this.harmonyMode = false;

    this.phantomNoteHandler = new PhantomElementHandler(this.containerId)
    this.setPhantomNote()

    this.clickModeHandler = this.clickModeHandler == undefined ? new ClickModeHandler() : this.clickModeHandler
    this.clickModeHandler
      .setContainerId(this.containerId)
      .setInsertCallback(this.insertCallback)
      .setDeleteCallback(this.deleteCallback)
      .setAnnotations(this.annotations)
      .setM2M(this.m2m)
      .setMusicPlayer(this.musicPlayer)
      .setPhantomCursor(this.phantomNoteHandler)
      .resetListeners()


    this.keyModeHandler = this.keyModeHandler || new KeyModeHandler(this.containerId)
    this.keyModeHandler
      .setContainerId(this.containerId)
      .setInsertCallback(this.insertCallback)
      .setDeleteCallback(this.deleteCallback)
      .setScoreGraph(this.scoreGraph)
      .setM2M(this.m2m)
      .setMusicPlayer(this.musicPlayer)
      .resetListeners()

    this.deleteHandler.setListeners()

    this.annotations?.setM2M(this.m2m)
    this.annotations?.updateCanvas()
    //this.annotations?.resetTextListeners() // annotations should also be interactable when in notation mode
    this.activateSelectionMode()
  }

  activateSelectionMode() {
    //this.insertDeactivate()

    this.selectionHandler = new SelectionHandler(this.containerId)
    this.selectionHandler
      .setM2M(this.m2m)
      .setScoreGraph(this.scoreGraph)
      .resetListeners()
    return this
  }

  activateAnnotationMode() {
    this.insertDeactivate()
    var that = this

    this.keyMode = false;
    this.clickInsertMode = false;

    var selectedButton = this.container.querySelector("#annotGroupKM button.selected")?.id
    switch (selectedButton) {
      case "harmonyAnnotButton":
        this.activateHarmonyMode()
        this.harmonyMode = true
        this.annotationMode = false
        break;
      case "staticTextButton":
      case "linkedAnnotButton":
        this.annotationMode = true
        this.harmonyMode = false
        if (this.annotations == undefined) {
          this.annotations = new Annotations(this.containerId)
        } else {
          this.annotations.updateCanvas()
        }
        this.annotations
          .setContainerId(this.containerId)
          .setM2M(this.m2m)
          .setMusicPlayer(this.musicPlayer)
          .setToFront()
          .setMenuClickHandler()
        break;
    }

  }

  activateHarmonyMode() {
    if (this.labelHandler == undefined) {
      this.labelHandler = new LabelHandler(this.containerId)
    }
    //Activate/ Deactivate Global functions according to selected harmonymode
    if (this.container.querySelector("#activateHarm.selected, #harmonyAnnotButton.selected") !== null) {
      this.insertDeactivate()
      this.container.classList.add("harmonyMode")
      this.isGlobal = false
    } else {
      this.isGlobal = true
    }

    this.labelHandler
      .setContainerId(this.containerId)
      .setGlobal(this.isGlobal)
      .setListeners()
      .setM2M(this.m2m)
      .setMusicPlayer(this.musicPlayer)
      .setCurrentMEI(this.m2m.getCurrentMei())
      .setLoadDataCallback(this.loadDataCallback)

    //this.keyMode = false;
    //this.clickInsertMode = false;
    //this.annotationMode = false;
    this.harmonyMode = true

    return this
  }

  //For Callbacks
  activateHarmonyModeFunction = (function activateHarmonyModeFunction(clicked = false) {
    this.activateHarmonyMode(clicked)
  }).bind(this)

  insertDeactivate() {
    this.container.classList.remove("textmode")
    this.container.classList.remove("clickmode")
    this.container.classList.remove("annotMode")
    this.container.classList.remove("harmonyMode")

    this.keyMode = false;
    this.clickInsertMode = false;
    this.harmonyMode = false;
    this.annotationMode = false;

    if (this.clickModeHandler != undefined) {
      this.clickModeHandler.removeListeners();
      this.phantomNoteHandler
        .removeListeners()
        .removeLines()
    }

    if (this.keyModeHandler != undefined) {
      this.keyModeHandler.removeListeners();
    }

    // if(typeof this.selectionHandler !== "undefined"){
    //   this.selectionHandler.removeListeners()
    // }
    // this.selectionHandler = undefined

    if (this.annotations != undefined) {
      this.annotations.removeListeners()
      this.annotations.setToBack()
      this.annotationMode = false
    }

    if (this.labelHandler != undefined) {
      //this.labelHandler.removeListeners()
      this.isGlobal = true
      this.labelHandler.reset()
    }

    if (this.deleteHandler != undefined) {
      this.deleteHandler.removeListeners()
    }

  }

  setSMHandler() {
    if (this.smHandler == undefined) {
      this.smHandler = new ScoreManipulatorHandler()
    }
    this.smHandler
      .setContainerId(this.containerId)
      .setMEI(this.m2m.getCurrentMei())
      .setMusicPlayer(this.musicPlayer)
      .setLoadDataCallback(this.loadDataCallback)
      .drawElements()
    return this
  }

  setListeners() {
    var that = this
    Array.from(this.container.querySelectorAll(".dropdown-item, .tabBtn")).forEach(n => {
      n.addEventListener("click", function (e) {
        e.preventDefault()
        switch (this.id) {
          case "notationTabBtn":
          case "clickInsert":
            that.activateInsertMode(true)
            break;
          case "keyMode":
            that.activateInsertMode(true)
            break;
          case "annotationTabBtn":
          case "activateAnnot":
            that.activateAnnotationMode();
            break;
          default:
            that.insertDeactivate()
            break;
        }
      })
    })
    
    //events will come from Annotations Class. 
    this.container.addEventListener("annotationButtonClicked", function (e: MouseEvent) {
      var t = e.target as HTMLElement
      t.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("selected"))
      t.classList.add("selected")
      that.activateAnnotationMode()
    }, true)

    Array.from(this.container.querySelectorAll("#noteGroup > *")).forEach(b => {
      b.addEventListener("click", function (e) {
        let dur = 0
        switch (this.id) {
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
        if (that.m2m.setMarkedNoteDurations(dur)) {
          cleanUp(that.m2m.getCurrentMei())
          var mei = restoreXmlIdTags(that.m2m.getCurrentMei())
          that.loadDataCallback("", mei, false)
        }
      })
    })

    Array.from(this.container.querySelectorAll("#dotGroup > *")).forEach(b => {
      b.addEventListener("click", function (e) {
        let dots = 0
        if (this.classList.contains("selected")) {
          switch (this.id) {
            case "oneDot":
              dots = 1
              break;
            case "twoDot":
              dots = 2
          }
        }
        that.m2m.setDotsNewNote(dots)
        if (that.m2m.setMarkedNoteDots(dots)) {
          cleanUp(that.m2m.getCurrentMei())
          var mei = restoreXmlIdTags(that.m2m.getCurrentMei())
          that.loadDataCallback("", mei, false)
        }
      })
    })

    this.navBarLoaded = true
    return this
  }

  removeListeners() {
    // No Changes in Navbar = no remove
  }

  resetModes() {
    //reset  
    if (!this.navBarLoaded) this.setListeners();
    //if(this.keyMode) this.activateKeyMode();
    if (this.clickInsertMode || this.keyMode) this.activateInsertMode(); //this.activateClickMode();
    if (this.annotationMode) this.activateAnnotationMode();
    if (this.harmonyMode) this.activateHarmonyMode();
    this.setSMHandler()
    return this
  }

  /////////////// GETTER/ SETTER /////////////////

  setM2M(m2m: Mouse2MEI) {
    this.m2m = m2m
    //this.selectionHandler = new SelectionHandler()
    //this.selectionHandler?.setM2M(this.m2m)
    return this
  }

  setMusicPlayer(musicPlayer: MusicPlayer) {
    this.musicPlayer = musicPlayer
    return this
  }

  setScoreGraph(scoreGraph: ScoreGraph) {
    this.scoreGraph = scoreGraph
    return this
  }

  setDeleteHandler(deleteHandler: DeleteHandler) {
    this.deleteHandler = deleteHandler
    return this
  }

  setLabelHandler(labelHandler: LabelHandler) {
    this.labelHandler = labelHandler
    return this
  }

  setPhantomNote() {
    if (this.phantomNoteHandler != undefined) {
      this.phantomNoteHandler
        .setPhantomNote()
        .setListeners()
        .setM2M(this.m2m)
    }
    return this
  }

  setInsertCallback(insertCallback: (newNote: NewNote, replace: Boolean) => Promise<any>) {
    this.insertCallback = insertCallback
    return this
  }

  setDeleteCallback(deleteCallback: (notes: Array<Element>) => Promise<any>) {
    this.deleteCallback = deleteCallback
    return this
  }

  setLoadDataCallback(loadDataCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean) => Promise<string>) {
    this.loadDataCallback = loadDataCallback
    return this
  }

  setUndoAnnotationStacks(arr: Array<Array<Element>>) {
    this.annotations.setUndoStacks(arr)
    return this
  }

  setContainerId(containerId: string) {
    this.containerId = containerId
    this.interactionOverlay = cq.getInteractOverlay(containerId)
    this.rootSVG = cq.getRootSVG(containerId)
    this.container = document.getElementById(containerId)
    return this
  }

  resetCanvas() {
    if (this.annotations != undefined) {
      this.annotations.addCanvas()
    }
    return this
  }

  getAnnotations(): Annotations {
    return this.annotations
  }

  getSMHandler() {
    return this.smHandler
  }

  getPhantomNoteHandler() {
    return this.phantomNoteHandler
  }

}

export { InsertModeHandler as default };

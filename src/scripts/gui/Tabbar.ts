import * as dc from '../utils/DOMCreator'
import * as customType from "../utils/Types"
import { Dropdown, Collapse} from 'bootstrap'
//import Toggle from  "bootstrap5-toggle"
import interact from 'interactjs'
import { constants as c } from '../constants'
import * as meioperations from "../utils/MEIOperations"
import * as cq from "../utils/convenienceQueries"
import { isJSDocThisTag } from 'typescript'


const buttonStyleDarkOutline = "btn btn-outline-dark btn-sm"
const buttonStyleDark = "btn btn-dark btn-md"
const smuflFont = "smufl"
const alterBtn = "alterBtn"
const selectedFlag = "selected"
const tabFlag = "tabBtn"

class Tabbar {

    private handlerGroup: HTMLElement
    private noteButtonGroup: HTMLElement
    private dotButtonGroup: HTMLElement
    private modButtonGroup: HTMLElement
    private sidebar: HTMLElement
    private sideBarGroup: HTMLElement;
    private soundGroup: HTMLElement;
    private zoomGroup: HTMLElement;
    private fileSelectGroup: HTMLElement;

    private notationTab: HTMLElement
    private annotationTab: HTMLElement
    private articulationTab: HTMLElement
    private melismaTab: HTMLElement

    private customToolbar: HTMLElement
    private chordGroupKM: HTMLElement
    private octaveGroupKM: HTMLElement
    private annotGroupKM: HTMLElement
    private insertSelectGroup: HTMLElement
    private options: customType.InstanceOptions

    private containerId: string
    private container: Element
    private interactionOverlay: Element
    private rootSVG: Element
    importCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>
    getMEICallback: (pageURI: string) => Promise<string>

    //private task: Evaluation

    constructor(options: customType.InstanceOptions = null, containerId) {
        this.containerId = containerId
        if (options !== null) {
            this.options = options
        }
    }

    createToolbars() {
        this.sideBarGroup = cq.getContainer(this.containerId).querySelector("#sideBarGroup")
        var toggleBtn = dc.makeNewButton("", "toggleSidebar", buttonStyleDarkOutline + " closedSidebar")
        this.sideBarGroup.append(toggleBtn)
        this.createSideBar()
        this.createMainToolbar()
        this.createCustomToolbar()

        this.addElementsToBootstrap();
        this.setListeners();
    }

    private createSideBar() {
        this.createModList()
        cq.getContainer(this.containerId).querySelectorAll("#sidebarList a, #timeDiv, #tempoDiv").forEach(sa => {
            sa.setAttribute("draggable", "true")
        })
        this.createAnnotList()
        this.optionalButtons()
    }

    private createModList() {
        this.sidebar = cq.getContainer(this.containerId).querySelector("#sidebarContainer")

        var accordeon = dc.makeNewDiv("sidebarList", "accordion")
        this.sidebar.appendChild(accordeon)

        //Keysignatures
        accordeon.appendChild(this.createKeySigAccItem())

        //Music Key
        accordeon.appendChild(this.createClefAccItem())

        //Time Signature
        accordeon.appendChild(this.createTimeSigAccItem())

        //Tempo
        //accordeon.appendChild(this.createTempoAccItem())
    }

    createKeySigAccItem(): Element {
        var keySelectItem = dc.makeNewAccordionItem("sidebarList", "selectKey", "selectKeyHeader", "selectKeyBtn", "Key", buttonStyleDark, "selectKeyDiv")

        var keyListCMajRow = dc.makeNewDiv("keyListCDIV", "row")
        var keyListCMaj = dc.makeNewDiv("keyListC", "list-group flex-fill col")
        keySelectItem.querySelector("#selectKeyDiv").appendChild(keyListCMajRow)
        keyListCMajRow.appendChild(keyListCMaj)
        keyListCMaj.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE014;=&#xE014;=&#xE014;=&#xE014;=&#xE014;=&#xE014;", "KeyCMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))

        var keyListSignedRow = dc.makeNewDiv("keyListCrossDIV", "col row g-0")
        var keyListCross = dc.makeNewDiv("keyListCross", "list-group flex-fill col")
        keySelectItem.querySelector("#selectKeyDiv").appendChild(keyListSignedRow)
        keyListSignedRow.appendChild(keyListCross)
        keyListCross.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE014;&#xEB93;&#xE262;=&#xE014;=&#xE014;=&#xE014;=&#xE014;=&#xE014;", "KeyGMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))
        keyListCross.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE014;&#xEB93;&#xE262;=&#xE014;&#xEB90;&#xE262;=&#xE014;=&#xE014;=&#xE014;=&#xE014;", "KeyDMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))
        keyListCross.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE014;&#xEB93;&#xE262;=&#xE014;&#xEB90;&#xE262;=&#xE014;&#xEB94;&#xE262;=&#xE014;=&#xE014;=&#xE014;", "KeyAMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))
        keyListCross.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE014;&#xEB93;&#xE262;=&#xE014;&#xEB90;&#xE262;=&#xE014;&#xEB94;&#xE262;=&#xE014;&#xEB91;&#xE262;=&#xE014;=&#xE014;", "KeyEMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))
        keyListCross.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE014;&#xEB93;&#xE262;=&#xE014;&#xEB90;&#xE262;=&#xE014;&#xEB94;&#xE262;=&#xE014;&#xEB91;&#xE262;=&#xE014;&#xEB98;&#xE262;=&#xE014;", "KeyBMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))
        keyListCross.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE014;&#xEB93;&#xE262;=&#xE014;&#xEB90;&#xE262;=&#xE014;&#xEB94;&#xE262;=&#xE014;&#xEB91;&#xE262;=&#xE014;&#xEB98;&#xE262;=&#xE014;&#xEB92;&#xE262;", "KeyF#Maj", "list-group-item list-group-item-action " + smuflFont, "#", true))

        var keyListB = dc.makeNewDiv("keyListB", "list-group flex-fill col")
        keyListSignedRow.appendChild(keyListB)
        keyListB.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE01A;&#xE260;=&#xE014;=&#xE014;=&#xE014;=&#xE014;=&#xE014;", "KeyFMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))
        keyListB.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE01A;&#xE260;=&#xE014;&#xEB92;&#xE260;=&#xE014;=&#xE014;=&#xE014;=&#xE014;", "KeyBbMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))
        keyListB.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE01A;&#xE260;=&#xE014;&#xEB92;&#xE260;=&#xE014;&#xEB98;&#xE260;=&#xE014;=&#xE014;=&#xE014;", "KeyEbMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))
        keyListB.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE01A;&#xE260;=&#xE014;&#xEB92;&#xE260;=&#xE014;&#xEB98;&#xE260;=&#xE014;&#xEB91;&#xE260;=&#xE014;=&#xE014;", "KeyAbMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))
        keyListB.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE01A;&#xE260;=&#xE014;&#xEB92;&#xE260;=&#xE014;&#xEB98;&#xE260;=&#xE014;&#xEB91;&#xE260;=&#xE014;&#xEB99;&#xE260;=&#xE014;", "KeyDbMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))
        keyListB.appendChild(dc.makeNewAElement("=&#xE01A;&#xE050;&#xE01A;&#xE260;=&#xE014;&#xEB92;&#xE260;=&#xE014;&#xEB98;&#xE260;=&#xE014;&#xEB91;&#xE260;=&#xE014;&#xEB99;&#xE260;=&#xE014;&#xEB90;&#xE260;", "KeyGbMaj", "list-group-item list-group-item-action " + smuflFont, "#", true))

        return keySelectItem
    }

    createClefAccItem(): Element {
        //Music Key
        var clefSelectItem = dc.makeNewAccordionItem("sidebarList", "selectClef", "selectClefHeader", "selectClefBtn", "Clef", buttonStyleDark, "selectClefDiv")
        var clefList = dc.makeNewDiv("clefList", "list-group flex-fill")
        clefSelectItem.querySelector("#selectClefDiv").appendChild(clefList)
        clefList.appendChild(dc.makeNewAElement("&#xE050", "GClef", "list-group-item list-group-item-action " + smuflFont, "#", true))
        clefList.appendChild(dc.makeNewAElement("&#xE05C", "CClef", "list-group-item list-group-item-action " + smuflFont, "#", true))
        clefList.appendChild(dc.makeNewAElement("&#xE062", "FClef", "list-group-item list-group-item-action " + smuflFont, "#", true))
        return clefSelectItem
    }

    createTimeSigAccItem(): Element {
        //Time Signature
        var timeSelectItem = dc.makeNewAccordionItem("sidebarList", "selectTime", "selectTimeHeader", "selectTimeBtn", "Time", buttonStyleDark, "selectTimeDiv")
        var timeDiv = dc.makeNewDiv("timeDiv", "row align-items-start")
        var countDiv = dc.makeNewDiv("countDiv", "col")
        var tcdatalistname = "timeCountDatalist"
        var timeCount = dc.makeNewInput("timeCount", "text", "", null, tcdatalistname)

        //create list for time code select
        var tcOptionValues = new Array<string>();
        for (var i = 0; i < 16; i++) {
            tcOptionValues.push((i + 1).toString())
        }
        var tcDatalist = dc.makeNewSelect("timeCount", tcOptionValues)

        //countDiv.appendChild(timeCount)
        countDiv.appendChild(tcDatalist)
        var slashDiv = dc.makeNewDiv("slash", "col")
        slashDiv.textContent = "/"
        var unitDiv = dc.makeNewDiv("unitDiv", "col")
        var tudatalistname = "timeUnitDatalist"
        var timeUnit = dc.makeNewInput("timeUnit", "text", "", null, tudatalistname)

        //create list for time units select
        var tuOptionValues = new Array<string>();
        for (var i = 0; i <= 16; i++) {
            if (Number.isInteger(Math.log2(i))) {
                tuOptionValues.push(i.toString())
            }
        }
        var tuDataList = dc.makeNewSelect("timeUnit", tuOptionValues)


        unitDiv.appendChild(tuDataList)
        timeSelectItem.querySelector("#selectTimeDiv").appendChild(timeDiv)
        timeDiv.appendChild(countDiv)
        timeDiv.appendChild(slashDiv)
        timeDiv.appendChild(unitDiv)

        return timeSelectItem
    }

    createTempoAccItem(): Element {
        var tempoItem = dc.makeNewAccordionItem("sidebarList", "selectTempo", "selectTempoHeader", "selectTempoBtn", "Tempo", buttonStyleDark, "selectTempoDiv")

        var tempoDiv = dc.makeNewDiv("tempoDiv", "row align-items-start")
        var tempoRefDurDiv = dc.makeNewDiv("tempoRefDurDif", "col")
        var tcdatalistname = "timeCountDatalist"
        var timeCount = dc.makeNewInput("timeCount", "text", "", null, tcdatalistname)

        //create list for time code select
        var tcOptionValues = new Array<string>();
        for (var i = 0; i <= 16; i++) {
            if (Number.isInteger(Math.log2(i))) {
                tcOptionValues.push(i.toString())
                tcOptionValues.push(i.toString() + ".")
            }
        }
        var tcDatalist = dc.makeNewSelect("timeCount", tcOptionValues)

        tempoRefDurDiv.appendChild(tcDatalist)

        var equal = dc.makeNewDiv("equal", "col")
        equal.textContent = "="

        var unitDiv = dc.makeNewDiv("unitDiv", "col")
        var timeUnit = dc.makeNewInput("timeUnit", "text", "", null)
        unitDiv.appendChild(timeUnit)

        tempoItem.querySelector("#selectTempoDiv").appendChild(tempoDiv)
        tempoDiv.appendChild(tempoRefDurDiv)
        tempoDiv.appendChild(equal)
        tempoDiv.appendChild(unitDiv)

        return tempoItem
    }

    private optionalButtons() {
        if (typeof this.sidebar === "undefined") {
            return
        }
    }

    private createAnnotList() {
        cq.getContainer(this.containerId).querySelector("#annotList")?.remove()
        var annotList = document.createElement("div")
        annotList.setAttribute("id", "annotList")
        annotList.classList.add("list-group")
        var that = this
        cq.getContainer(this.containerId).querySelectorAll("#annotationCanvas > g")?.forEach(c => {
            var text = c.querySelector(".annotDiv").textContent || c.querySelector(".annotDiv").getAttribute("data-text")
            var a = dc.makeNewAElement(text, "", "list-group-item list-group-item-action list-group-item-primary", "#")
            a.setAttribute("refId", c.id)
            a.setAttribute("contenteditable", "true")
            a.addEventListener("click", function () {
                Array.from(cq.getContainer(that.containerId).querySelectorAll(".selected")).forEach(s => s.classList.remove(selectedFlag));
                (<HTMLElement>cq.getContainer(that.containerId).querySelector("#" + c.id)).focus()
                cq.getContainer(that.containerId).querySelector("#" + c.id).querySelector(".annotLinkedText, .annotStaticText")?.classList.add(selectedFlag)
            })
            a.addEventListener("blur", function (e: KeyboardEvent) {
                var t = e.target as HTMLElement
                cq.getContainer(that.containerId).querySelector("#" + t.getAttribute("refid")).querySelector(".annotDiv").textContent = t.textContent
            })
            a.addEventListener("keydown", function (e: KeyboardEvent) {
                var t = e.target as HTMLElement
                if (e.code === "Enter") {
                    t.blur()
                } else if (e.code === "Space") {
                    e.preventDefault()
                    document.execCommand("insertText", false, ' ')
                }
            })
            annotList.appendChild(a)
        })
        this.sidebar.appendChild(annotList)
    }

    createAnnotListFunction = (function (e) {
        var t = e.target as Element
        if (t.closest(".vse-container").id !== this.containerId) return
        this.createAnnotList(e)
    }
    ).bind(this)

    private createButtons() {
        var that = this
        // Buttons können in eigenes package ausgelagert werden (Editor)


        // and now the tabs
        this.notationTab = cq.getContainer(this.containerId).querySelector("#notationTabGroup")
        this.notationTab.append(dc.makeNewButton("Notation", "notationTabBtn", buttonStyleDarkOutline + " " + tabFlag))

        this.annotationTab = cq.getContainer(this.containerId).querySelector("#annotationTabGroup")
        this.annotationTab.append(dc.makeNewButton("Annotation", "annotationTabBtn", buttonStyleDarkOutline + " " + tabFlag))

        this.articulationTab = cq.getContainer(this.containerId).querySelector("#articulationTabGroup")
        this.articulationTab.append(dc.makeNewButton("Articulation", "articulationTabBtn", buttonStyleDarkOutline + " " + tabFlag))

        this.melismaTab = cq.getContainer(this.containerId).querySelector("#melismaTabGroup")
        //this.melismaTab.append(dc.makeNewButton("Melisma", "melismaTabBtn", buttonStyleDarkOutline + " " + tabFlag))

        // var handlerDropdown = dc.makeNewDiv("insertDropdown", "dropdown-menu")
        // handlerDropdown.append(dc.makeNewAElement("Mouse Input", "clickInsert", "dropdown-item", "#"))
        // handlerDropdown.append(dc.makeNewAElement("Keyboard Input", "keyMode", "dropdown-item", "#"))
        // handlerDropdown.append(dc.makeNewAElement("Annotations", "activateAnnot", "dropdown-item", "#"))
    
        // this.handlerGroup = cq.getContainer(this.containerId).querySelector("#handlerGroup")
        // this.handlerGroup.append(dc.makeNewButton("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", "insertMode", buttonStyleDarkOutline + " empty", "dropdown"))
        // this.handlerGroup.append(handlerDropdown)

        this.noteButtonGroup = cq.getContainer(this.containerId).querySelector("#noteGroup")
        this.noteButtonGroup.append(dc.makeNewButton("&#x1D15D", "fullNote", buttonStyleDarkOutline + " " + smuflFont, "", true))
        this.noteButtonGroup.append(dc.makeNewButton("&#x1D15E", "halfNote", buttonStyleDarkOutline + " " + smuflFont, "", true))
        this.noteButtonGroup.append(dc.makeNewButton("&#x1D15F", "quarterNote", buttonStyleDarkOutline + " " + smuflFont + " selected", "", true))
        this.noteButtonGroup.append(dc.makeNewButton("&#x1D160", "eigthNote", buttonStyleDarkOutline + " " + smuflFont, "", true))
        this.noteButtonGroup.append(dc.makeNewButton("&#x1D161", "sixteenthNote", buttonStyleDarkOutline + " " + smuflFont, "", true))
        this.noteButtonGroup.append(dc.makeNewButton("&#x1D162", "thirtysecondNote", buttonStyleDarkOutline + " " + smuflFont, "", true))

        this.dotButtonGroup = cq.getContainer(this.containerId).querySelector("#dotGroup")
        this.dotButtonGroup.append(dc.makeNewButton(".", "oneDot", buttonStyleDarkOutline + " " + smuflFont, "", true))
        this.dotButtonGroup.append(dc.makeNewButton(". .", "twoDot", buttonStyleDarkOutline + " " + smuflFont, "", true))

        this.modButtonGroup = cq.getContainer(this.containerId).querySelector("#modGroup")
        this.modButtonGroup.appendChild(dc.makeNewButton("&#x1D13D;&#x1D13E;", "pauseNote", buttonStyleDarkOutline + " " + smuflFont, "", true))
        this.modButtonGroup.appendChild(dc.makeNewButton("&#8256", "tieNotes", buttonStyleDarkOutline + " " + smuflFont, "", true))
        this.modButtonGroup.appendChild(dc.makeNewButton("&#9835;", "organizeBeams", buttonStyleDarkOutline + " " + smuflFont, "", true))
        this.modButtonGroup.appendChild(dc.makeNewButton("&#x266D;", "alterDown", buttonStyleDarkOutline + " " + smuflFont + " " + alterBtn, "", true))
        this.modButtonGroup.appendChild(dc.makeNewButton("&#x266F;", "alterUp", buttonStyleDarkOutline + " " + smuflFont + " " + alterBtn, "", true))
        this.modButtonGroup.appendChild(dc.makeNewButton("&#x266E;", "alterNeutral", buttonStyleDarkOutline + " " + smuflFont + " " + alterBtn, "", true))
        this.modButtonGroup.appendChild(dc.makeNewButton("&#x1D12B", "alterDDown", buttonStyleDarkOutline + " " + smuflFont + " " + alterBtn, "", true))
        this.modButtonGroup.appendChild(dc.makeNewButton("&#x1D12A", "alterDUp", buttonStyleDarkOutline + " " + smuflFont + " " + alterBtn, "", true))
        this.modButtonGroup.addEventListener("click", this.exclusiveSelectHandler)

        this.soundGroup = cq.getContainer(this.containerId).querySelector("#soundGroup")
        this.soundGroup.appendChild(dc.makeNewButton("", "playBtn", buttonStyleDarkOutline))
        //this.soundGroup.appendChild(dc.makeNewButton("", "pauseBtn", buttonStyleDarkOutline))
        this.soundGroup.appendChild(dc.makeNewButton("", "rewindBtn", buttonStyleDarkOutline))

        this.zoomGroup = cq.getContainer(this.containerId).querySelector("#zoomGroup")
        this.zoomGroup.append(dc.makeNewButton("", "zoomOutBtn", buttonStyleDarkOutline))
        this.zoomGroup.append(dc.makeNewButton("", "zoomInBtn", buttonStyleDarkOutline))
        
        
        this.fileSelectGroup = cq.getContainer(this.containerId).querySelector("#fileSelectGroup")
        this.fileSelectGroup.append(dc.makeNewInput("importFile", "file", ""))
        this.fileSelectGroup.append(dc.makeNewButton("Import File", "importFileBtn", buttonStyleDarkOutline))
        this.fileSelectGroup.append(dc.makeNewButton("Export MEI", "exportFileBtn", buttonStyleDarkOutline))
        var showBBToggle = dc.makeNewToggle("showBB", buttonStyleDark, "BBoxes", "showBBDiv")
        this.setToggleLogic(
            showBBToggle,
            function(){cq.getContainer(that.containerId).classList.add("debug")},
            function(){cq.getContainer(that.containerId).classList.remove("debug")}
        )
        this.fileSelectGroup.append(showBBToggle)

    }

    /**
     * 
     * @param el element to set logic for
     * @param callBackChecked additional code to execute when toggle is checked
     * @param callBackUnchecked additional code to execute when toggle is unchecked
     * @param switchPair pair of words to change between when toggled
     */
    setToggleLogic(el: Element, callbackChecked: () => void = null, callbackUnchecked: () => void = null, switchPair: Array<string> = new Array()){
        if(switchPair.length > 2 || switchPair.length === 1){
            throw new Error ("switchPair Array must have exaclty 2 strings")
        }
        el.addEventListener("click", function (e: MouseEvent) {
            e.preventDefault()
            var target = e.target as Element
            if (target.tagName.toLowerCase() !== "label") return
            var label = e.target as Element
            var input = <HTMLInputElement>label.previousElementSibling
            if (input.checked === true) {
                if(switchPair.length > 0) label.textContent = switchPair[0]
                input.checked = false
                callbackUnchecked()
            } else {
                if(switchPair.length > 0) label.textContent = switchPair[1]
                input.checked = true
                callbackChecked()
            }
        })
    }

    createInsertSelect() {
        //InsertSelect DropdownMenu
        this.insertSelectGroup = dc.makeNewDiv("insertGroup", "customGroup btn-group-sm me-2 h-100", { role: "group" }) as HTMLElement
        var toggle = dc.makeNewToggle("insertToggle", buttonStyleDarkOutline, "Replace", "insertToggleDiv")
        toggle.addEventListener("click", function (e: MouseEvent) {
            e.preventDefault()
            var target = e.target as Element
            if (target.tagName.toLowerCase() !== "label") return
            var label = e.target as Element
            var input = <HTMLInputElement>label.previousElementSibling
            if (label.textContent === "Replace") {
                label.textContent = "Insert"
                input.checked = false
            } else {
                label.textContent = "Replace"
                input.checked = true
            }
        })
        this.insertSelectGroup.append(toggle)
    }

    createButtonsAnnotationMode() {
        this.annotGroupKM = dc.makeNewDiv("annotGroupKM", "customGroup btn-group-sm me-2 h-100", { role: "group" }) as HTMLElement
        this.annotGroupKM.append(dc.makeNewButton("Text", "staticTextButton", buttonStyleDarkOutline))
        this.annotGroupKM.append(dc.makeNewButton("Linked Text", "linkedAnnotButton", buttonStyleDarkOutline + " selected"))
        this.annotGroupKM.append(dc.makeNewButton("Harmony", "harmonyAnnotButton", buttonStyleDarkOutline))
        this.annotGroupKM.addEventListener("click", this.exclusiveSelectHandler)
    }

    createMainToolbar() {
        this.createButtons();

        var btnToolbar = cq.getContainer(this.containerId).querySelector("#btnToolbar")
        btnToolbar.appendChild(this.sideBarGroup)
        btnToolbar.parentElement.insertBefore(this.sidebar, btnToolbar.parentElement.firstChild) // important for ~ selector
        //btnToolbar.appendChild(this.handlerGroup) // invisible
        
        //tabs
        btnToolbar.appendChild(this.notationTab)
        btnToolbar.appendChild(this.annotationTab)
        btnToolbar.appendChild(this.articulationTab)
        //btnToolbar.appendChild(this.melismaTab)
        
        //further utils
        btnToolbar.appendChild(this.soundGroup)
        btnToolbar.appendChild(this.zoomGroup)
        btnToolbar.appendChild(this.fileSelectGroup)
        
    }

    createCustomToolbar() {
        this.customToolbar = cq.getContainer(this.containerId).querySelector("#customToolbar")
        this.createInsertSelect()
        this.createButtonsAnnotationMode()
    }

    removeAllCustomGroups() {
        Array.from(this.customToolbar.children).forEach(c => {
            c.remove()
        })
    }

    addElementsToBootstrap() {
        //attach bootstrap functionality to Elements

        Array.from(cq.getContainer(this.containerId).querySelectorAll(".dropdown-toggle")).forEach(dd => {
            new Dropdown(dd)
        })

        Array.from(cq.getContainer(this.containerId).querySelectorAll(".collapsed")).forEach(c => {
            new Collapse(c)
        })
    }

    setListeners() {

        cq.getContainer(this.containerId).querySelectorAll("#handlerGroup *").forEach(el => {
            el.addEventListener("click", this.closeHandlerMouse)
        })

        // achtung: nie preventDefault in einem Document anwenden
        document.addEventListener("keydown", this.closeHandlerKey)

        //document.getElementsByClassName("vse-container")[0]?.addEventListener("click", this.closeHandlerMouse)

        cq.getContainer(this.containerId).querySelectorAll("#dotGroup button, #noteGroup button, #modGroup button").forEach(el => {
            el.addEventListener("click", this.exclusiveSelectHandler)
        })

        cq.getContainer(this.containerId).querySelector("#toggleSidebar").addEventListener("click", this.sidebarHandler)

        cq.getContainer(this.containerId).querySelectorAll(["#insertDropdown a", "." + tabFlag].join(",")).forEach(a => {
            a.addEventListener("click", this.customToolbarHandler)
        })



        // Why do I have to control this manually???
        cq.getContainer(this.containerId).querySelectorAll(".accordion-button").forEach(ac => {
            ac.addEventListener("hidden.bs.collapse", () => {
                ac.classList.add("show")
            })

            ac.addEventListener("hide.bs.collapse", () => {
                ac.classList.add("show")
            })

        })

        cq.getContainer(this.containerId).addEventListener("annotChanged", this.createAnnotListFunction, true)


        //FileSelection
        cq.getContainer(this.containerId).querySelector("#importFileBtn").addEventListener("click", function () {
            var impF = this.parentElement.querySelector("#importFile")
            impF.setAttribute("accept", [".musicxml", ".mei"].join(", "))
            impF.click()
        })

        var that = this
        cq.getContainer(this.containerId).querySelector("#importFile").addEventListener("change", function (e) {
            var fr = new FileReader()
            fr.onload = function () {
                that.importCallback("", fr.result as string, false, c._TARGETDIVID_)
            }
            fr.readAsText(this.files[0])

        }, false)

        cq.getContainer(this.containerId).querySelector("#exportFileBtn").addEventListener("click", function () {
            that.getMEICallback("").then(mei => {
                var d = new Date()
                var fileName = d.getUTCFullYear()
                    + ("0" + d.getDate()).slice(-2)
                    + ("0" + d.getMonth()).slice(-2)
                    + "_"
                    + ("0" + d.getHours()).slice(-2)
                    + ("0" + d.getMinutes()).slice(-2)
                    + ("0" + d.getSeconds()).slice(-2)
                    + "_"
                    + "vseScore_" + that.containerId + ".mei"
                that.download(fileName, mei)
            })
        })
    }

    download(file: string, text: string) {
        //creating an invisible element
        var element = document.createElement('a');
        element.setAttribute('href',
            'data:text/plain;charset=utf-8, '
            + encodeURIComponent(text));
        element.setAttribute('download', file);
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    removeListeners() {
        cq.getContainer(this.containerId).querySelectorAll("#handlerGroup *").forEach(el => {
            el.removeEventListener("click", this.closeHandlerMouse)
        })

        document.removeEventListener("keydown", this.closeHandlerKey)

        cq.getContainer(this.containerId).querySelectorAll(".btn-group-sm button").forEach(el => {
            el.removeEventListener("click", this.exclusiveSelectHandler)
        })

        cq.getContainer(this.containerId).querySelector("#toggleSidebar").removeEventListener("click", this.sidebarHandler)

        cq.getContainer(this.containerId).querySelectorAll(["#insertDropdown a", "." + tabFlag].join(",")).forEach(a => {
            a.removeEventListener("click", this.customToolbarHandler)
        })

        cq.getContainer(this.containerId).removeEventListener("annotChanged", this.createAnnotListFunction)
        interact("#annotList").unset()
    }

    closeHandlerMouse = (function closeHandlerMouse(e: MouseEvent): void {
        e.preventDefault()
        Array.from(cq.getContainer(this.containerId).querySelectorAll(".dropdown-toggle")).forEach(dd => {
            //this.closeDropdown(dd)
        })
    }).bind(this)

    // Macht momentan nix
    closeHandlerKey = (function closeHandlerMouse(e: KeyboardEvent): void {
        if (!cq.hasActiveElement(this.containerId)) return
        if (e.key === "Escape") {
            //e.preventDefault()
            Array.from(cq.getContainer(this.containerId).querySelectorAll(".dropdown-toggle")).forEach(dd => {
                //this.closeDropdown(dd)
            })
        }
    }).bind(this)


    private closeDropdown(ddButton: Element) {
        if (ddButton.classList.contains("show")) {
            ddButton.classList.remove("show")
            ddButton.removeAttribute("data-popper-placement")
            ddButton.setAttribute("aria-expanded", "false")
            ddButton.nextElementSibling.classList.remove("show")
            ddButton.nextElementSibling.removeAttribute("data-popper-placement")
        }
    }

    private resizeListListener(event) {
        event.stopImmediatePropagation()
        var target = event.target as HTMLElement
        var y = (parseFloat(target.getAttribute('data-y')) || 0)
        target.style.height = event.rect.height + 'px'
        y += event.deltaRect.top
        target.style.transform = 'translate(0px,' + y + 'px)'
        target.setAttribute('data-y', y.toString())

        var sibling = target.previousElementSibling as HTMLElement
        var sbb = sibling.getBoundingClientRect()
        sbb.height = sbb.height + y
    }


    /**
     * MAke Buttons in Toolbar selectable exclusively
     */
    exclusiveSelectHandler = (function exclusiveSelectHandler(e: MouseEvent): void {
        this.exclusiveSelect(e)
    }).bind(this)

    exclusiveSelect(e: MouseEvent) {
        var select
        var target = e.target as Element
        var tagname = "button"
        if (target.tagName.toLowerCase() === tagname) {
            Array.from(target.parentElement.children).forEach(btn => {
                if (btn.tagName.toLowerCase() === tagname && btn !== target) {
                    btn.classList.remove(selectedFlag)
                }
            })
            if (!target.classList.contains(selectedFlag)) {
                target.classList.add(selectedFlag)
            }else if(["modGroup", "dotGroup", "chordGroupKM"].some(id => id === target.parentElement.id) && target.classList.contains(selectedFlag)){
                target.classList.remove(selectedFlag)
            }

        }
    }

    private styleCache = new Map<string, string>()
    sidebarHandler = (function sidebarHandler(e: MouseEvent): void {
        //toggle
        var that = this
        var elParent: Element
        if (this.sidebar.classList.contains("closedSidebar")) {
            Array.from(cq.getContainer(this.containerId).querySelectorAll(".closedSidebar")).forEach(el => {
                elParent = el.parentElement
                el.classList.remove("closedSidebar")
                el.classList.add("openSidebar")
            })
            if(that.styleCache.size > 0){
                for(const [key, value] of that.styleCache.entries()){
                  document.getElementById(that.containerId)?.querySelector("#" + key)?.setAttribute("style", value)  
                }
            }
            that.styleCache = new Map<string, string>()

        } else {
            //document.getElementById("sidebarContainer").style.width = "0"
            Array.from(cq.getContainer(this.containerId).querySelectorAll(".openSidebar")).forEach(el => {
                elParent = el.parentElement
                elParent.querySelectorAll(":scope > div").forEach(d => {
                    that.styleCache.set(d.id, d.getAttribute("style"))
                    d.removeAttribute("style")
                })
                el.classList.add("closedSidebar")
                el.classList.remove("openSidebar")
            })
        }
    }).bind(this)

    /**
     * Creates second toolbar depending on selected option
     */
    customToolbarHandler = (function customToolbarHandler(e: MouseEvent) {
        var target = e.target as Element
        var tID = target.id
        this.removeAllCustomGroups()
        switch (tID) {
            case "notationTabBtn":
            case "clickInsert":
                this.clickInsertHandler()
                break;
            case "keyMode":
                this.keyModeHandler()
                break;
            case "annotationTabBtn":
            case "activateAnnot":
                this.annotHandler()
                break;
            case "activateHarm":
                this.harmHandler()
                break;
        }
        // if (target.textContent === cq.getContainer(this.containerId).querySelector("#insertMode").textContent) {
        //     this.removeAllCustomGroups()
        // }
    }).bind(this)

    clickInsertHandler() {
        this.customToolbar.appendChild(this.insertSelectGroup)
        this.customToolbar.appendChild(this.noteButtonGroup)
        this.customToolbar.appendChild(this.dotButtonGroup)
        this.customToolbar.appendChild(this.modButtonGroup)
    }

    keyModeHandler() {
        this.customToolbar.appendChild(this.insertSelectGroup)
        this.customToolbar.appendChild(this.chordGroupKM)
        this.customToolbar.appendChild(this.octaveGroupKM)
    }

    harmHandler() {
        this.removeAllCustomGroups()
    }

    annotHandler() {
        //this.removeAllCustomGroups()
        this.customToolbar.append(this.annotGroupKM)
    }

    /**
     * Callback from Core, so that imported mei or musicxml can be loaded in the editor
     * @param importCallback 
     */
    setImportCallback(importCallback: (pageURI: string, data: string | Document | HTMLElement, isUrl: boolean, targetDivID: string) => Promise<string>) {
        this.importCallback = importCallback
    }

    setGetMEICallback(getMEICallback: (pageURI: string) => Promise<string>) {
        this.getMEICallback = getMEICallback
    }
}

export default Tabbar
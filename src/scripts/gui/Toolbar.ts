import * as dc from '../utils/DOMCreator'
import * as customType from "../utils/Types"
import { Button, Dropdown, Collapse } from 'bootstrap'
import { thresholdFreedmanDiaconis } from 'd3-array'
import SidebarHandler from '../handlers/SideBarHandler'
import { keyIdToSig } from '../utils/mappings'
import { interpolateZoom } from 'd3'

const buttonStyleDarkOutline = "btn btn-outline-dark btn-md"
const buttonStyleDark = "btn btn-dark btn-md"

class Toolbar{

    private handlerGroup: HTMLElement
    private noteButtonGroup: HTMLElement
    private dotButtonGroup: HTMLElement
    private modButtonGroup: HTMLElement
    private sidebar: HTMLElement
    private sideBarGroup: HTMLElement;

    private customToolbar: HTMLElement
    private chordGroupKM: HTMLElement
    private octaveGroupKM: HTMLElement
    private insertSelectGroup: HTMLElement
    private options: customType.InstanceOptions

    //private task: Evaluation

    constructor(options: customType.InstanceOptions = null){
        if(options !== null){
            this.options = options
        }
    }

    createToolbars(){
        this.sideBarGroup = document.getElementById("sideBarGroup")
        var toggleBtn = dc.makeNewButton("", "toggleSidebar", buttonStyleDarkOutline + " closedSidebar")
        this.sideBarGroup.append(toggleBtn)
        this.createSideBar()
        this.createMainToolbar()
        this.createCustomToolbar()
    
        this.addElementsToBootstrap();
        this.setListeners();
    }

    private createSideBar(){
        this.sidebar = document.getElementById("sidebarContainer")

        var accordeon = dc.makeNewDiv("sidebarList", "accordion")
        this.sidebar.appendChild(accordeon)
        
        //Keysignatures
        var keySelectItem = dc.makeNewAccordionItem("sidebarList", "selectKey", "selectKeyHeader", "selectKeyBtn", "Key",  buttonStyleDark, "selectKeyDiv")
        accordeon.appendChild(keySelectItem)

        var keyListCMajRow = dc.makeNewDiv("keyListCDIV", "row")
        var keyListCMaj = dc.makeNewDiv("keyListC", "list-group flex-fill col")
        accordeon.querySelector("#selectKeyDiv").appendChild(keyListCMajRow)
        keyListCMajRow.appendChild(keyListCMaj)
        keyListCMaj.appendChild(dc.makeNewAElement("CMaj", "KeyCMaj", "list-group-item list-group-item-action", "#"))
        
        var keyListSignedRow = dc.makeNewDiv("keyListCrossDIV", "col row g-0")
        var keyListCross = dc.makeNewDiv("keyListCross", "list-group flex-fill col")
        accordeon.querySelector("#selectKeyDiv").appendChild(keyListSignedRow)
        keyListSignedRow.appendChild(keyListCross)
        keyListCross.appendChild(dc.makeNewAElement("GMaj", "KeyGMaj", "list-group-item list-group-item-action", "#"))
        keyListCross.appendChild(dc.makeNewAElement("DMaj", "KeyDMaj", "list-group-item list-group-item-action", "#"))
        keyListCross.appendChild(dc.makeNewAElement("AMaj", "KeyAMaj", "list-group-item list-group-item-action", "#"))
        keyListCross.appendChild(dc.makeNewAElement("EMaj", "KeyEMaj", "list-group-item list-group-item-action", "#"))
        keyListCross.appendChild(dc.makeNewAElement("BMaj", "KeyBMaj", "list-group-item list-group-item-action", "#"))
        keyListCross.appendChild(dc.makeNewAElement("F#Maj", "KeyF#Maj", "list-group-item list-group-item-action", "#"))

        var keyListB = dc.makeNewDiv("keyListB", "list-group flex-fill col")
        keyListSignedRow.appendChild(keyListB)
        keyListB.appendChild(dc.makeNewAElement("FMaj", "KeyFMaj", "list-group-item list-group-item-action", "#"))
        keyListB.appendChild(dc.makeNewAElement("BbMaj", "KeyBbMaj", "list-group-item list-group-item-action", "#"))
        keyListB.appendChild(dc.makeNewAElement("EbMaj", "KeyEbMaj", "list-group-item list-group-item-action", "#"))
        keyListB.appendChild(dc.makeNewAElement("AbMaj", "KeyAbMaj", "list-group-item list-group-item-action", "#"))
        keyListB.appendChild(dc.makeNewAElement("DbMaj", "KeyDbMaj", "list-group-item list-group-item-action", "#"))
        keyListB.appendChild(dc.makeNewAElement("GbMaj", "KeyGbMaj", "list-group-item list-group-item-action", "#"))


        //Music Key
        var clefSelectItem = dc.makeNewAccordionItem("sidebarList", "selectClef", "selectClefHeader", "selectClefBtn", "Clef",  buttonStyleDark, "selectClefDiv")
        accordeon.appendChild(clefSelectItem)
        var clefList = dc.makeNewDiv("clefList", "list-group flex-fill")
        accordeon.querySelector("#selectClefDiv").appendChild(clefList)
        clefList.appendChild(dc.makeNewAElement("sopran", "GClef", "list-group-item list-group-item-action", "#"))
        clefList.appendChild(dc.makeNewAElement("alt", "CClef", "list-group-item list-group-item-action", "#"))
        clefList.appendChild(dc.makeNewAElement("bass", "FClef", "list-group-item list-group-item-action", "#"))

        //Time Signature
        var timeSelectItem = dc.makeNewAccordionItem("sidebarList", "selectTime", "selectTimeHeader", "selectTimeBtn", "Time",  buttonStyleDark, "selectTimeDiv")
        accordeon.appendChild(timeSelectItem)
        var timeDiv = dc.makeNewDiv("timeDiv", "row align-items-start")
        var countDiv = dc.makeNewDiv("countDiv", "col")
        var tcdatalistname = "timeCountDatalist"
        var timeCount = dc.makeNewInput("timeCount", "text", "", null, tcdatalistname)

        //create list for time code
        var tcOptionValues = new Array<string>();
        for(var i = 0; i < 16; i++){
            tcOptionValues.push((i+1).toString())
        }
        var tcDatalist = dc.makeNewSelect("timeCount", tcOptionValues)

        //countDiv.appendChild(timeCount)
        countDiv.appendChild(tcDatalist)
        var slashDiv = dc.makeNewDiv("slash", "col")
        slashDiv.textContent = "/"
        var unitDiv = dc.makeNewDiv("unitDiv", "col")
        var tudatalistname = "timeUnitDatalist"
        var timeUnit = dc.makeNewInput("timeUnit", "text", "", null, tudatalistname)

        //create list for time units
        var tuOptionValues = new Array<string>();
        for(var i = 0; i <= 16; i++){
            if(Number.isInteger(Math.log2(i))){
                tuOptionValues.push(i.toString())
            }   
        }
        var tuDataList = dc.makeNewSelect("timeUnit", tuOptionValues)

        //unitDiv.appendChild(timeUnit)
        unitDiv.appendChild(tuDataList)
        accordeon.querySelector("#selectTimeDiv").appendChild(timeDiv)
        timeDiv.appendChild(countDiv)
        timeDiv.appendChild(slashDiv)
        timeDiv.appendChild(unitDiv)

        this.optionalButtons()
    }

    private optionalButtons(){
        if(typeof this.sidebar === "undefined"){
            return
        }

        // if(typeof this.options.taskType !== "undefined"){
        //     var submitButton = dc.makeNewButton("Submit", "submitScore", buttonStyle)
        //     this.sidebar.appendChild(submitButton)
        //     switch(this.options.taskType){
        //         case "simpleSubmit":
        //             this.task = new SimpleSubmit()
        //             break;
        //     }
        // }
    }

    private createButtonsMainToolbar(){
        // Buttons können in eigenes package ausgelagert werden (Editor)

        var handlerDropdown =  dc.makeNewDiv("insertDropdown", "dropdown-menu")
        handlerDropdown.append(dc.makeNewAElement("Click Mode", "clickInsert", "dropdown-item", "#"))
        handlerDropdown.append(dc.makeNewAElement("Key Mode", "keyMode", "dropdown-item", "#"))
        //handlerDropdown.append(dc.makeNewAElement("Select Mode", "activateSelect", "dropdown-item", "#"))
        handlerDropdown.append(dc.makeNewAElement("Annotation Mode", "activateAnnot", "dropdown-item", "#"))
        handlerDropdown.append(dc.makeNewAElement("Harmony Mode", "activateHarm", "dropdown-item", "#"))

        this.handlerGroup = document.getElementById("handlerGroup")
        this.handlerGroup.append(dc.makeNewButton("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", "insertMode", buttonStyleDarkOutline + " empty", "dropdown"))
        this.handlerGroup.append(handlerDropdown)

        this.noteButtonGroup = document.getElementById("noteGroup")
        this.noteButtonGroup.append(dc.makeNewButton("", "fullNote", buttonStyleDarkOutline))
        this.noteButtonGroup.append(dc.makeNewButton("", "halfNote", buttonStyleDarkOutline))
        this.noteButtonGroup.append(dc.makeNewButton("", "quarterNote", buttonStyleDarkOutline))
        this.noteButtonGroup.append(dc.makeNewButton("", "eigthNote", buttonStyleDarkOutline))
        this.noteButtonGroup.append(dc.makeNewButton("", "sixteenthNote", buttonStyleDarkOutline))
        this.noteButtonGroup.append(dc.makeNewButton("", "thirtysecondNote", buttonStyleDarkOutline))

        this.dotButtonGroup = document.getElementById("dotGroup")
        this.dotButtonGroup.append(dc.makeNewButton("", "oneDot", buttonStyleDarkOutline))
        this.dotButtonGroup.append(dc.makeNewButton("", "twoDot", buttonStyleDarkOutline))

        this.modButtonGroup = document.getElementById("modGroup")
        this.modButtonGroup.appendChild(dc.makeNewButton("", "pauseNote", buttonStyleDarkOutline))

    }


    createInsertSelect(){
        //InsertSelect DropdownMenu
        this.insertSelectGroup = dc.makeNewDiv("insertGroup", "btn-group me-2 h-100", {role: "group"}) as HTMLElement
        var toggle = dc.makeNewToggle("insertToggle", buttonStyleDarkOutline, "Replace", "insertToggleDiv")
        toggle.addEventListener("click", function(e){
            var label = e.target as Element
            var input = <HTMLInputElement> label.previousElementSibling
            if(label.textContent === "Replace"){
                label.textContent = "Insert"
                input.checked = false
            }else{
                label.textContent = "Replace"
                input.checked = true
            }
        })

        this.insertSelectGroup.append(toggle)
    }

    createButtonsKeyMode(){

        //ChordGroup
        this.chordGroupKM = dc.makeNewDiv("chordGroupKM", "btn-group me-2 h-100", {role: "group"}) as HTMLElement
        this.chordGroupKM.append(dc.makeNewButton("CHORD", "chordButton", buttonStyleDarkOutline))
        this.chordGroupKM.addEventListener("click", this.exclusiveSelectHandler)

        //OctaveGroup
        this.octaveGroupKM = dc.makeNewDiv("octaveGroupKM", "btn-group me-2 h-100", {role: "group"}) as HTMLElement
        let oct = dc.makeNewButton("", "subkontraOct", buttonStyleDarkOutline)
        oct.innerHTML = "C" + "0".sub()
        this.octaveGroupKM.appendChild(oct)

        oct = dc.makeNewButton("", "kontraOct", buttonStyleDarkOutline)
        oct.innerHTML = "C" + "1".sub()
        this.octaveGroupKM.appendChild(oct)

        oct = dc.makeNewButton("", "greatOct", buttonStyleDarkOutline)
        oct.innerHTML = "C" + "2".sub()
        this.octaveGroupKM.appendChild(oct)

        oct = dc.makeNewButton("", "smallOct", buttonStyleDarkOutline)
        oct.innerHTML = "C" + "3".sub()
        this.octaveGroupKM.appendChild(oct)

        oct = dc.makeNewButton("", "1LineOct", buttonStyleDarkOutline)
        oct.innerHTML = "C" + "4".sub()
        this.octaveGroupKM.appendChild(oct)

        oct = dc.makeNewButton("", "2LineOct", buttonStyleDarkOutline)
        oct.innerHTML = "C" + "5".sub()
        this.octaveGroupKM.appendChild(oct)

        oct = dc.makeNewButton("", "3LineOct", buttonStyleDarkOutline)
        oct.innerHTML = "C" + "6".sub()
        this.octaveGroupKM.appendChild(oct)

        oct = dc.makeNewButton("", "4LineOct", buttonStyleDarkOutline)
        oct.innerHTML = "C" + "7".sub()
        this.octaveGroupKM.appendChild(oct)

        oct = dc.makeNewButton("", "5LineOct", buttonStyleDarkOutline)
        oct.innerHTML = "C" + "8".sub()
        this.octaveGroupKM.appendChild(oct)
       
        Array.from(this.octaveGroupKM.children).forEach(btn => {
            btn.addEventListener("click", this.exclusiveSelectHandler)
        })

    }

    createMainToolbar(){
        this.createButtonsMainToolbar();

        var btnToolbar = document.getElementById("btnToolbar")
        btnToolbar.appendChild(this.sideBarGroup)
        btnToolbar.parentElement.insertBefore(this.sidebar, btnToolbar.parentElement.firstChild) // important for ~ selector
        btnToolbar.appendChild(this.handlerGroup)
        btnToolbar.appendChild(this.noteButtonGroup)
        btnToolbar.appendChild(this.dotButtonGroup)
        btnToolbar.appendChild(this.modButtonGroup)
    }

    createCustomToolbar(){
        this.createButtonsKeyMode()
        this.createInsertSelect()
        this.customToolbar = document.getElementById("customToolbar")
    }

    removeAllCustomGroups(){
        Array.from(this.customToolbar.children).forEach(c => {
            c.remove()
        })
    }

    addElementsToBootstrap(){
        //attach bootstrap functionality to Elements
        // Array.from(document.querySelectorAll(".btn")).forEach(b => {
        //     new Button(b)
        // })

        Array.from(document.querySelectorAll(".dropdown-toggle")).forEach(dd => {
            new Dropdown(dd)
        })

        Array.from(document.querySelectorAll(".collapsed")).forEach(c => {
            new Collapse(c)
        })
    }

    setListeners(){
        
        document.querySelectorAll("#handlerGroup *").forEach(el => {
            el.addEventListener("click", this.closeHandlerMouse)
        })

        // achtung: nie preventDefault in einem Document anwenden
        document.addEventListener("keydown", this.closeHandlerKey)

        document.getElementsByClassName("vse-container")[0]?.addEventListener("click", this.closeHandlerMouse)
        
        document.querySelectorAll(".btn-group button").forEach(el => {
            el.addEventListener("click", this.exclusiveSelectHandler)
        })

        document.getElementById("toggleSidebar").addEventListener("click", this.sidebarHandler)

        document.querySelectorAll("#insertDropdown a").forEach(a => {
            a.addEventListener("click", this.customToolbarHandler)
        })

        // document.querySelectorAll("#sidebarContainer * a").forEach(el => {
        //     el.addEventListener("click", this.sidebarHandler)
        // })

        // Why do I have to control this manually???
        document.querySelectorAll(".accordion-button").forEach(ac => {
            ac.addEventListener("hidden.bs.collapse", () => {
                ac.classList.add("show")
            })

            ac.addEventListener("hide.bs.collapse", () => {
                ac.classList.add("show")
            })

        }) 
    }

    removeListeners(){
        document.querySelectorAll("#handlerGroup *").forEach(el => {
            el.removeEventListener("click", this.closeHandlerMouse)
        })

        document.removeEventListener("keydown", this.closeHandlerKey)

        document.getElementsByClassName("vse-container")[0].removeEventListener("click", this.closeHandlerMouse)

        document.querySelectorAll(".btn-group button").forEach(el => {
            el.removeEventListener("click", this.exclusiveSelectHandler)
        })

        document.getElementById("toggleSidebar").removeEventListener("click", this.sidebarHandler)

        document.querySelectorAll("#insertDropdown a").forEach(a => {
            a.removeEventListener("click", this.customToolbarHandler)
        })

        // document.querySelectorAll("#sidebarContainer * a").forEach(el => {
        //     el.removeEventListener("click", this.sidebarHandler)
        // })
    }

    closeHandlerMouse = (function closeHandlerMouse(evt: MouseEvent): void {
        evt.preventDefault()
        Array.from(document.querySelectorAll(".dropdown-toggle")).forEach(dd => {
            //this.closeDropdown(dd)
        })
    }).bind(this)

    // Macht momentan nix
    closeHandlerKey = (function closeHandlerMouse(evt: KeyboardEvent): void {
        if(evt.key === "Escape"){
            //evt.preventDefault()
            Array.from(document.querySelectorAll(".dropdown-toggle")).forEach(dd => {
                //this.closeDropdown(dd)
            })
        }
    }).bind(this)


    private closeDropdown(ddButton: Element){
        if(ddButton.classList.contains("show")){
            ddButton.classList.remove("show")
            ddButton.removeAttribute("data-popper-placement")
            ddButton.setAttribute("aria-expanded", "false")
            ddButton.nextElementSibling.classList.remove("show")
            ddButton.nextElementSibling.removeAttribute("data-popper-placement")
        }
    }

    /**
     * Make Notes and Dots selectable exclusively
     */
    exclusiveSelectHandler = (function exclusiveSelectHandler(evt: MouseEvent): void{
        var target = evt.target as Element
        var tagname = "BUTTON"
        var allowedParentGroupIDs = ["dotGroup", "chordGroupKM", "octaveGroupKM", "modGroup"]
        if(target.tagName === tagname && target.id !== "toggleSidebar"){ // this should have no effect on the sidebar
            Array.from(target.parentElement.children).forEach(btn => {
                if(btn.tagName === tagname && btn !== target){
                    btn.classList.remove("selected")
                }
            })
            if(target.classList.contains("selected") && allowedParentGroupIDs.includes(target.parentElement.id)){ //enable deselect for dotGroup and modgroup
                target.classList.remove("selected")
            }else{
                target.classList.add("selected")
            }
        }
    }).bind(this)

    sidebarHandler = (function sidebarHandler (evt: MouseEvent): void{
        //toggle
        var sidebarWidthRatio = "30%"
        var btnToolbar = document.getElementById("btnToolbar")
        if(this.sidebar.classList.contains("closedSidebar")){
            //document.getElementById("sidebarContainer").style.width = sidebarWidthRatio
            Array.from(document.querySelectorAll(".closedSidebar")).forEach(el => {
                el.classList.remove("closedSidebar")
                el.classList.add("openSidebar")
            })
            //btnToolbar.style.marginLeft = sidebarWidthRatio

        }else{
            //document.getElementById("sidebarContainer").style.width = "0"
            Array.from(document.querySelectorAll(".openSidebar")).forEach(el => {
                el.classList.add("closedSidebar")
                el.classList.remove("openSidebar")
            })
            //btnToolbar.style.marginLeft = "0"
        }
    }).bind(this)

    /**
     * Creates second toolbar depending on selected option
     */
    customToolbarHandler = (function customToolbarHandler (e: MouseEvent){
        var target = e.target as Element
        var tID = target.id
        this.removeAllCustomGroups()
        switch(tID){
            case "clickInsert":
                this.clickInsertHandler()
                break;
            case "keyMode":
                this.keyModeHandler()
                break;
            case "activateAnnot":
                this.annotHandler()
                break;
            case "activateHarm":
                this.harmHandler()
                break;
        }
        if(target.textContent === document.getElementById("insertMode").textContent){
            this.removeAllCustomGroups()
        }
    }).bind(this)

    clickInsertHandler(){
        this.customToolbar.appendChild(this.insertSelectGroup)
    }

    keyModeHandler(){
        this.customToolbar.appendChild(this.insertSelectGroup)
        this.customToolbar.appendChild(this.chordGroupKM)
        this.customToolbar.appendChild(this.octaveGroupKM)

    }

    harmHandler(){
        this.removeAllCustomGroups()
    }

    annotHandler(){
        this.removeAllCustomGroups()
    }
}

export default Toolbar
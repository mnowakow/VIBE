import * as dc from '../utils/DOMCreator'
import * as customType from "../utils/Types"
import {Dropdown, Collapse } from 'bootstrap'
import interact from 'interactjs'
import { constants as c } from '../constants'
import * as meioperations from "../utils/MEIOperations"
import * as cq from "../utils/convenienceQueries"


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
    private annotGroupKM: HTMLElement
    private insertSelectGroup: HTMLElement
    private options: customType.InstanceOptions

    private containerId: string
    private container: Element
    private interactionOverlay: Element
    private rootSVG: Element

    //private task: Evaluation

    constructor(options: customType.InstanceOptions = null, containerId){
        this.containerId = containerId
        if(options !== null){
            this.options = options
        }
    }

    createToolbars(){
        this.sideBarGroup = cq.getContainer(this.containerId).querySelector("#sideBarGroup")
        var toggleBtn = dc.makeNewButton("", "toggleSidebar", buttonStyleDarkOutline + " closedSidebar")
        this.sideBarGroup.append(toggleBtn)
        this.createSideBar()
        this.createMainToolbar()
        this.createCustomToolbar()
    
        this.addElementsToBootstrap();
        this.setListeners();
    }

    private createSideBar(){
        this.createModList()
        cq.getContainer(this.containerId).querySelectorAll("#sidebarList a, #timeDiv, #tempoDiv").forEach(sa => {
            sa.setAttribute("draggable", "true")
        })
        this.createAnnotList()
        this.optionalButtons()
    }

    private createModList(){
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

    createKeySigAccItem(): Element{
        var keySelectItem = dc.makeNewAccordionItem("sidebarList", "selectKey", "selectKeyHeader", "selectKeyBtn", "Key",  buttonStyleDark, "selectKeyDiv")

        var keyListCMajRow = dc.makeNewDiv("keyListCDIV", "row")
        var keyListCMaj = dc.makeNewDiv("keyListC", "list-group flex-fill col")
        keySelectItem.querySelector("#selectKeyDiv").appendChild(keyListCMajRow)
        keyListCMajRow.appendChild(keyListCMaj)
        keyListCMaj.appendChild(dc.makeNewAElement("CMaj", "KeyCMaj", "list-group-item list-group-item-action", "#"))
        
        var keyListSignedRow = dc.makeNewDiv("keyListCrossDIV", "col row g-0")
        var keyListCross = dc.makeNewDiv("keyListCross", "list-group flex-fill col")
        keySelectItem.querySelector("#selectKeyDiv").appendChild(keyListSignedRow)
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

        return keySelectItem
    }

    createClefAccItem(): Element{
        //Music Key
        var clefSelectItem = dc.makeNewAccordionItem("sidebarList", "selectClef", "selectClefHeader", "selectClefBtn", "Clef",  buttonStyleDark, "selectClefDiv")
        var clefList = dc.makeNewDiv("clefList", "list-group flex-fill")
        clefSelectItem.querySelector("#selectClefDiv").appendChild(clefList)
        clefList.appendChild(dc.makeNewAElement("treble", "GClef", "list-group-item list-group-item-action", "#"))
        clefList.appendChild(dc.makeNewAElement("alt", "CClef", "list-group-item list-group-item-action", "#"))
        clefList.appendChild(dc.makeNewAElement("bass", "FClef", "list-group-item list-group-item-action", "#"))
        return clefSelectItem
    }

    createTimeSigAccItem(): Element{
         //Time Signature
         var timeSelectItem = dc.makeNewAccordionItem("sidebarList", "selectTime", "selectTimeHeader", "selectTimeBtn", "Time",  buttonStyleDark, "selectTimeDiv")
         var timeDiv = dc.makeNewDiv("timeDiv", "row align-items-start")
         var countDiv = dc.makeNewDiv("countDiv", "col")
         var tcdatalistname = "timeCountDatalist"
         var timeCount = dc.makeNewInput("timeCount", "text", "", null, tcdatalistname)
 
         //create list for time code select
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
 
         //create list for time units select
         var tuOptionValues = new Array<string>();
         for(var i = 0; i <= 16; i++){
             if(Number.isInteger(Math.log2(i))){
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

    createTempoAccItem(): Element{
        var tempoItem = dc.makeNewAccordionItem("sidebarList", "selectTempo", "selectTempoHeader", "selectTempoBtn", "Tempo",  buttonStyleDark, "selectTempoDiv")

        var tempoDiv = dc.makeNewDiv("tempoDiv", "row align-items-start")
        var tempoRefDurDiv = dc.makeNewDiv("tempoRefDurDif", "col")
        var tcdatalistname = "timeCountDatalist"
        var timeCount = dc.makeNewInput("timeCount", "text", "", null, tcdatalistname)

        //create list for time code select
        var tcOptionValues = new Array<string>();
        for(var i = 0; i <= 16; i++){
            if(Number.isInteger(Math.log2(i))){
                tcOptionValues.push(i.toString())
                tcOptionValues.push(i.toString()+".")
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

    private createAnnotList(){
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
            a.addEventListener("click", function(){
                Array.from(cq.getContainer(that.containerId).querySelectorAll(".selected")).forEach(s => s.classList.remove("selected"));
                (<HTMLElement> cq.getContainer(that.containerId).querySelector("#" + c.id)).focus()
                cq.getContainer(that.containerId).querySelector("#" + c.id).querySelector(".annotLinkedText, .annotStaticText")?.classList.add("selected")
            })
            a.addEventListener("blur", function(e: KeyboardEvent){
                var t = e.target as HTMLElement
                cq.getContainer(that.containerId).querySelector("#" + t.getAttribute("refid")).querySelector(".annotDiv").textContent = t.textContent
            })
            a.addEventListener("keydown", function(e: KeyboardEvent){
                var t = e.target as HTMLElement
                if(e.code === "Enter"){
                    t.blur()
                }else if(e.code === "Space"){
                    e.preventDefault()
                    document.execCommand("insertText", false, ' ')
                }
            })
            annotList.appendChild(a)
        })

        this.sidebar.appendChild(annotList)
    }

    createAnnotListFunction = (function(e){
        var t = e.target as Element
        if(t.closest(".vse-container").id !== this.containerId) return
        this.createAnnotList(e)}
    ).bind(this)

    private createButtonsMainToolbar(){
        // Buttons können in eigenes package ausgelagert werden (Editor)

        var handlerDropdown =  dc.makeNewDiv("insertDropdown", "dropdown-menu")
        handlerDropdown.append(dc.makeNewAElement("Mouse Input", "clickInsert", "dropdown-item", "#"))
        handlerDropdown.append(dc.makeNewAElement("Keyboard Input", "keyMode", "dropdown-item", "#"))
        //handlerDropdown.append(dc.makeNewAElement("Select Mode", "activateSelect", "dropdown-item", "#"))
        handlerDropdown.append(dc.makeNewAElement("Annotations", "activateAnnot", "dropdown-item", "#"))
        //handlerDropdown.append(dc.makeNewAElement("Harmony Mode", "activateHarm", "dropdown-item", "#"))

        this.handlerGroup = cq.getContainer(this.containerId).querySelector("#handlerGroup")
        this.handlerGroup.append(dc.makeNewButton("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", "insertMode", buttonStyleDarkOutline + " empty", "dropdown"))
        this.handlerGroup.append(handlerDropdown)

        this.noteButtonGroup = cq.getContainer(this.containerId).querySelector("#noteGroup")
        this.noteButtonGroup.append(dc.makeNewButton("", "fullNote", buttonStyleDarkOutline))
        this.noteButtonGroup.append(dc.makeNewButton("", "halfNote", buttonStyleDarkOutline))
        this.noteButtonGroup.append(dc.makeNewButton("", "quarterNote", buttonStyleDarkOutline))
        this.noteButtonGroup.append(dc.makeNewButton("", "eigthNote", buttonStyleDarkOutline))
        this.noteButtonGroup.append(dc.makeNewButton("", "sixteenthNote", buttonStyleDarkOutline))
        this.noteButtonGroup.append(dc.makeNewButton("", "thirtysecondNote", buttonStyleDarkOutline))

        this.dotButtonGroup = cq.getContainer(this.containerId).querySelector("#dotGroup")
        this.dotButtonGroup.append(dc.makeNewButton("", "oneDot", buttonStyleDarkOutline))
        this.dotButtonGroup.append(dc.makeNewButton("", "twoDot", buttonStyleDarkOutline))

        this.modButtonGroup = cq.getContainer(this.containerId).querySelector("#modGroup")
        this.modButtonGroup.appendChild(dc.makeNewButton("", "pauseNote", buttonStyleDarkOutline))
        this.modButtonGroup.appendChild(dc.makeNewButton("", "tieNotes", buttonStyleDarkOutline))
        this.modButtonGroup.appendChild(dc.makeNewButton("", "organizeBeams", buttonStyleDarkOutline))
        this.modButtonGroup.appendChild(dc.makeNewButton("", "alterDown", buttonStyleDarkOutline))
        this.modButtonGroup.appendChild(dc.makeNewButton("", "alterUp", buttonStyleDarkOutline))
        this.modButtonGroup.appendChild(dc.makeNewButton("", "alterNeutral", buttonStyleDarkOutline))
        this.modButtonGroup.appendChild(dc.makeNewButton("", "alterDDown", buttonStyleDarkOutline))
        this.modButtonGroup.appendChild(dc.makeNewButton("", "alterDUp", buttonStyleDarkOutline))
    }


    createInsertSelect(){
        //InsertSelect DropdownMenu
        this.insertSelectGroup = dc.makeNewDiv("insertGroup", "customGroup btn-group me-2 h-100", {role: "group"}) as HTMLElement
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
        this.chordGroupKM = dc.makeNewDiv("chordGroupKM", "customGroup btn-group me-2 h-100", {role: "group"}) as HTMLElement
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

    createButtonsAnnotationMode(){
        this.annotGroupKM = dc.makeNewDiv("annotGroupKM", "customGroup btn-group me-2 h-100", {role: "group"}) as HTMLElement
        this.annotGroupKM.append(dc.makeNewButton("TEXT", "staticTextButton", buttonStyleDarkOutline))
        this.annotGroupKM.append(dc.makeNewButton("LINKED ANNOTATION", "linkedAnnotButton", buttonStyleDarkOutline + " selected"))
        this.annotGroupKM.append(dc.makeNewButton("HARMONY", "harmonyAnnotButton", buttonStyleDarkOutline))
        this.annotGroupKM.addEventListener("click", this.exclusiveSelectHandler)
    }

    createMainToolbar(){
        this.createButtonsMainToolbar();

        var btnToolbar = cq.getContainer(this.containerId).querySelector("#btnToolbar")
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
        this.createButtonsAnnotationMode()
        this.customToolbar = cq.getContainer(this.containerId).querySelector("#customToolbar")
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

        Array.from(cq.getContainer(this.containerId).querySelectorAll(".dropdown-toggle")).forEach(dd => {
            new Dropdown(dd)
        })

        Array.from(cq.getContainer(this.containerId).querySelectorAll(".collapsed")).forEach(c => {
            new Collapse(c)
        })
    }

    setListeners(){
        
        cq.getContainer(this.containerId).querySelectorAll("#handlerGroup *").forEach(el => {
            el.addEventListener("click", this.closeHandlerMouse)
        })

        // achtung: nie preventDefault in einem Document anwenden
        document.addEventListener("keydown", this.closeHandlerKey)

        //document.getElementsByClassName("vse-container")[0]?.addEventListener("click", this.closeHandlerMouse)
        
        cq.getContainer(this.containerId).querySelectorAll(".btn-group button").forEach(el => {
            el.addEventListener("click", this.exclusiveSelectHandler)
        })

        cq.getContainer(this.containerId).querySelector("#toggleSidebar").addEventListener("click", this.sidebarHandler)

        cq.getContainer(this.containerId).querySelectorAll("#insertDropdown a").forEach(a => {
            a.addEventListener("click", this.customToolbarHandler)
        })

        // document.querySelectorAll("#sidebarContainer * a").forEach(el => {
        //     el.addEventListener("click", this.sidebarHandler)
        // })

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

        interact("#" + this.containerId + " #annotList")
            .resizable({
                // resize from all edges and corners
                edges: { left: false, right: false, bottom: false, top: true },
    
                listeners: { move: this.resizeListListener.bind(this) },
            })

    }

    removeListeners(){
        cq.getContainer(this.containerId).querySelectorAll("#handlerGroup *").forEach(el => {
            el.removeEventListener("click", this.closeHandlerMouse)
        })

        document.removeEventListener("keydown", this.closeHandlerKey)

        //document.getElementsByClassName("vse-container")[0].removeEventListener("click", this.closeHandlerMouse)

        cq.getContainer(this.containerId).querySelectorAll(".btn-group button").forEach(el => {
            el.removeEventListener("click", this.exclusiveSelectHandler)
        })

        cq.getContainer(this.containerId).querySelector("#toggleSidebar").removeEventListener("click", this.sidebarHandler)

        cq.getContainer(this.containerId).querySelectorAll("#insertDropdown a").forEach(a => {
            a.removeEventListener("click", this.customToolbarHandler)
        })

        // document.querySelectorAll("#sidebarContainer * a").forEach(el => {
        //     el.removeEventListener("click", this.sidebarHandler)
        // })

        cq.getContainer(this.containerId).removeEventListener("annotChanged", this.createAnnotListFunction)
        interact("#annotList").unset()
    }

    closeHandlerMouse = (function closeHandlerMouse(evt: MouseEvent): void {
        evt.preventDefault()
        Array.from(cq.getContainer(this.containerId).querySelectorAll(".dropdown-toggle")).forEach(dd => {
            //this.closeDropdown(dd)
        })
    }).bind(this)

    // Macht momentan nix
    closeHandlerKey = (function closeHandlerMouse(evt: KeyboardEvent): void {
        if(!cq.hasActiveElement(this.containerId)) return
        if(evt.key === "Escape"){
            //evt.preventDefault()
            Array.from(cq.getContainer(this.containerId).querySelectorAll(".dropdown-toggle")).forEach(dd => {
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

    private resizeListListener(event){
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
     * Make Notes and Dots selectable exclusively
     */
    exclusiveSelectHandler = (function exclusiveSelectHandler(evt: MouseEvent): void{
        var target = evt.target as Element
        var tagname = "BUTTON"
        var allowedParentClass = "customGroup" //["dotGroup", "chordGroupKM", "octaveGroupKM", "annotGroupKM", "modGroup"]
        if(target.tagName === tagname && target.id !== "toggleSidebar"){ // this should have no effect on the sidebar
            Array.from(target.parentElement.children).forEach(btn => {
                if(btn.tagName === tagname && btn !== target){
                    btn.classList.remove("selected")
                }
            })
            if(target.classList.contains("selected") && !target.parentElement.classList.contains(allowedParentClass)){ //allowedParentClass.includes(target.parentElement.id)){ //enable deselect for dotGroup and modgroup
                target.classList.remove("selected")
            }else{
                target.classList.add("selected")
            }
        }
    }).bind(this)

    sidebarHandler = (function sidebarHandler (evt: MouseEvent): void{
        //toggle
        var sidebarWidthRatio = "30%"
        var btnToolbar = cq.getContainer(this.containerId).querySelector("#btnToolbar")
        if(this.sidebar.classList.contains("closedSidebar")){
            //document.getElementById("sidebarContainer").style.width = sidebarWidthRatio
            Array.from(cq.getContainer(this.containerId).querySelectorAll(".closedSidebar")).forEach(el => {
                el.classList.remove("closedSidebar")
                el.classList.add("openSidebar")
            })
            //btnToolbar.style.marginLeft = sidebarWidthRatio

        }else{
            //document.getElementById("sidebarContainer").style.width = "0"
            Array.from(cq.getContainer(this.containerId).querySelectorAll(".openSidebar")).forEach(el => {
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
        if(target.textContent === cq.getContainer(this.containerId).querySelector("#insertMode").textContent){
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
        //this.removeAllCustomGroups()
        this.customToolbar.append(this.annotGroupKM)
    }
}

export default Toolbar
import { idxNoteMapFClef } from "./mappings"

class Toolbar{

}

export function makeNewButtonH5P(text: string, id: string, className: string): string{
    return "<button type=\"button\" id=\"" + id + "\" class=\"" + className +"\">" + text + "</button>"
}

export function makeNewButton(text: string, id: string, className: string, toggle: string = ""): Element{
    var b = document.createElement("button")
    b.setAttribute("id", id)
    //b.setAttribute("type", "button")
    var classList = className.split(" ")
    classList.forEach(c =>  b.classList.add(c))
    if(toggle === "dropdown"){
        b.setAttribute("data-bs-toggle", toggle)
        b.classList.add("dropdown-toggle")
        //b.classList.add("dd")
        //b.setAttribute("aria-haspopup", "true")
        //b.setAttribute("aria-expanded", "false")
    }
    if(toggle === "button"){
        b.setAttribute("data-toggle", toggle)
        b.setAttribute("autocomplete", "off")
    }
    b.textContent = text
    return b
}

export function makeNewAElement(text: string, id: string, className: string, href: string): Element{
    var a = document.createElement("a")
    var classList = className.split(" ")
    classList.forEach(c =>  a.classList.add(c))
    a.setAttribute("href", href)
    a.setAttribute("id", id)
    a.textContent = text
    return a

}

export function makeNewDivH5P(id: string, className: string, role: string = ""): string{
    if(role !== ""){
        role = "role=\""+ role + "\""
    }
    return "<div id=\"" + id + "\" class=\"" + className +"\"" + role +"></div>"
}

export function makeNewDiv(id: string, className: string, attributes: object = null): Element{
    var div = document.createElement("div")
    div.setAttribute("id", id)
    if(["", " "].indexOf(className) === -1){
        var classList = className.split(" ")
        classList.forEach(c =>  div.classList.add(c))
    }
    if(div.classList.contains("dropdown-menu")){
        div.setAttribute("aria-labelledby", "insertMode")
    }
    if(attributes !== null){
        for(const [key, value] of Object.entries(attributes)){
            div.setAttribute(key, value)
        }
    }
    return div
}

export function makeNewAccordionItem(parentId: string, itemId: string, headerId: string, btnId: string, btnText: string, btnStyle: string = null, targetDivId: string): Element{
    var item  = makeNewDiv(itemId, "accordion-item")
    
    var header = document.createElement("div")
    header.classList.add("accordion-header")
    header.setAttribute("id", headerId)
    
    var btn = makeNewButton(btnText, btnId, "container-fluid accordion-button collapsed " + btnStyle)
    btn.setAttribute("data-bs-toggle", "collapse")
    btn.setAttribute("data-bs-target", "#" + targetDivId)
    btn.setAttribute("aria-expanded", "false")
    btn.setAttribute("aria-controls", targetDivId)
    header.appendChild(btn)

    var div = makeNewDiv(targetDivId, "accordion-collapse collapse")
    div.setAttribute("aria-labelledby", headerId)
    div.setAttribute("data-bs-parent", "#" + parentId)

    item.appendChild(header)
    item.appendChild(div)
    
    return item

}

export function makeNewInput(id: string, type: string, className: string, value: string = null, listname:string = null, readonly: boolean = false): Element{
    var input = document.createElement("input")
    input.setAttribute("id", id)
    input.setAttribute("type", type)
    if(value !== null){
        input.setAttribute("value", value)
    }
    if(className.length > 0){
        var classList = className.split(" ")
        classList.forEach(c =>  input.classList.add(c))
    }
    if(listname !== null){
        input.setAttribute("list", listname)
    }
    input.readOnly = readonly

    return input
}

export function makeNewDatalist(id: string, optionValues: Array<string>): Element{

    var dataList = document.createElement("datalist")
    dataList.setAttribute("id", id)
    optionValues.forEach(value => {
        var option = document.createElement("option")
        option.setAttribute("value", value)
        dataList.append(option)
    })

    return dataList
}

export function makeNewSelect(id: string, optionValues: Array<string>): Element{

    var dataList = document.createElement("select")
    dataList.setAttribute("id", id)
    optionValues.forEach(value => {
        var option = document.createElement("option")
        option.setAttribute("value", value)
        option.textContent = value
        dataList.append(option)
    })

    return dataList
}
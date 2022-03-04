export function getRootSVG(containerId: string): HTMLElement{
    return document.querySelector("#" + containerId + " #rootSVG")
}

export function getInteractOverlay(containerId: string): HTMLElement{
    return document.querySelector("#" + containerId + " #interactionOverlay")
}

export function getContainer(id: string): HTMLElement{
    return document.getElementById(id)
}

/**
 * Get any element by defining parent, target an selector. Booleans will define if the strings are handeled as ids
 */
export function getBySelector(parent: string, parentModulator: string, target: string, targetModulator: string, selector: string, all = false):any{
    if(parentModulator !== null){
        parent = parentModulator + parent
    }
    if(targetModulator){
        target = targetModulator + target
    }
    if(all){
        return Array.from(document.querySelectorAll(parent + " " + selector + " " + target))
    }else{
        return document.querySelector(parent + " " + selector + " " + target)
    }
}

export function hasActiveElement(containerId: string): boolean{
    return  document.getElementById(containerId).classList.contains("activeContainer")
}
  
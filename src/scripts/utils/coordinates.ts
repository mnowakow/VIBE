
/**
 * Get DOMMatrix coordnates of element according to parent canvas class. Returns null if no canvas is found. If element is DOMRect, canvas must be provided
 * @param element 
 * @param canvas provide canvas for element, otherwise closest canvas class will be retrieved
 * @returns 
 */
export function getDOMMatrixCoordinates(element: Element | DOMRect, canvas: Element = null): {left: number, top: number, right: number, bottom: number, width: number, height: number, x: number, y: number, matrix: DOMMatrix}{
    if(canvas === null){
        canvas = element instanceof Element ? element.closest(".canvas") : null
        if(element instanceof DOMRect){throw new Error("Canvas must be provided, if input is instance of DOMRect. Actual instance: " + element.constructor.name) }
        if(canvas === null) return 
    }
    if(canvas.id === "vrvSVG") canvas = canvas.previousElementSibling
    var canvasMatrix = (canvas as unknown as SVGGraphicsElement).getScreenCTM().inverse()
    //var elementBBox = !(element instanceof Element) ? element : element.getBoundingClientRect()
    var elementBBox
    try{
        elementBBox = (element as any).getBoundingClientRect()
    }catch(error){
        elementBBox = element
    }
    var ptLT = new DOMPoint(elementBBox.left, elementBBox.top)
    ptLT = ptLT.matrixTransform(canvasMatrix)
    var ptRB = new DOMPoint(elementBBox.right, elementBBox.bottom)
    ptRB = ptRB.matrixTransform(canvasMatrix)
    var width = ptRB.x - ptLT.x
    var height = ptRB.y - ptLT.y
    
    return {left: ptLT.x, top: ptLT.y, right:ptRB.x, bottom: ptRB.y, width: width, height: height, x: ptLT.x, y: ptLT.y, matrix: canvasMatrix}
}

export function getCanvasCordinates(coords: {left: number, top: number, right: number, bottom: number, width: number, height: number, x: number, y: number, matrix?: DOMMatrix}, canvas: Element = null): DOMRect {
    if(!coords.matrix){
        throw new Error("DOMMatrix is missing.")
    }
    if (canvas === null) {
        canvas = canvas instanceof Element ? canvas.closest(".canvas") : null
        if(canvas instanceof DOMRect){throw new Error("Canvas must be provided, if input is instance of DOMRect. Actual instance: " + canvas.constructor.name) }
        if(canvas === null) return 
    }

    // Reverse the transformation
    var canvasMatrix = coords.matrix.inverse();
    var ptLT = new DOMPoint(coords.left, coords.top);
    ptLT = ptLT.matrixTransform(canvasMatrix);
    var ptRB = new DOMPoint(coords.right, coords.bottom);
    ptRB = ptRB.matrixTransform(canvasMatrix);

    var width = ptRB.x - ptLT.x
    var height = ptRB.y - ptLT.y

    // Create and return the DOMRect
    return new DOMRect(ptLT.x, ptLT.y, width, height);
}

/**
 * Transforms the given coordinates for a given canvas
 * @param x 
 * @param y 
 * @param canvas 
 * @returns 
 */
export function transformToDOMMatrixCoordinates(x: number, y: number, canvas: Element): {x: number, y: number}{
    if(canvas.id === "vrvSVG") canvas = canvas.previousElementSibling
    var canvasMatrix = (canvas as unknown as SVGGraphicsElement).getScreenCTM().inverse()
    var pt = new DOMPoint(x, y)
    pt = pt.matrixTransform(canvasMatrix)

    return {x: pt.x, y: pt.y}
}
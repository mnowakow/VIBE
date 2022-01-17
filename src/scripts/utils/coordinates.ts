
/**
 * Get DOMMatrix coordnates of element according to parent canvas class. Returns null if no canvas is found. If element is DOMRect, canvas must be provided
 * @param element 
 * @param canvas provide canvas for element, otherwise closest canvas class will be retrieved
 * @returns 
 */
export function getDOMMatrixCoordinates(element: Element | DOMRect, canvas: Element = null): {left: number, top: number, right: number, bottom: number, width: number, height: number}{
    if(canvas === null){
        canvas = element instanceof Element ? element.closest(".canvas") : null
        if(element instanceof DOMRect){throw new Error("Canvas must be provided, when input is of instance DOMRect") }
        if(canvas === null) return 
    }

    var canvasMatrix = (canvas as unknown as SVGGraphicsElement).getScreenCTM().inverse()
    var elementBBox = element instanceof DOMRect ? element : element.getBoundingClientRect()
    var ptLT = new DOMPoint(elementBBox.left, elementBBox.top)
    ptLT = ptLT.matrixTransform(canvasMatrix)
    var ptRB = new DOMPoint(elementBBox.right, elementBBox.bottom)
    ptRB = ptRB.matrixTransform(canvasMatrix)
    var width = ptRB.x - ptLT.x
    var height = ptRB.y - ptLT.y
    
    return {left: ptLT.x, top: ptLT.y, right:ptRB.x, bottom: ptRB.y, width: width, height: height}
}
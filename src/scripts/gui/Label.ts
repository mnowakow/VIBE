
interface Label{

    inputString: string
    startid: string
    currentMEI: Document
    element: Element

    checkFormat(input: any)
    createElement(input: any)
    modifyLabel(input: any)
    getInput(): any
    getElement(): any

}

export default Label
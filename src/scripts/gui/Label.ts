/**
 * Interface for all changeable Labels in the Score.
 * E.g. Tempo, Harmony, Instrumentnames...
 */
interface Label{

    inputString: string
    startid: string
    currentMEI: Document
    element: Element

    checkFormat(input: any)
    createElement(input: any)
    modifyLabel(input: any)
    getInput(): string
    getElement(): Element

}

export default Label
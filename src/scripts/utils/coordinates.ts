import { constants as c } from "../constants"

/**
 * Adjust coordinates to pageposition (e.g. when mooved)
 * @param coord input coordinates of container
 * @param axis axis of coordinate to adjust
 * @returns adjusted coordinate
 */
export function adjustToPage(coord: number, axis: string){
    var rootBBox = document.getElementById(c._ROOTSVGID_).getBoundingClientRect()
    var rootAxisCoord: number
    var windowAxisCoord: number
    switch(axis.toLowerCase()){
        case "x":
            rootAxisCoord = rootBBox.x
            windowAxisCoord = window.pageXOffset
            break;
        case "y":
            rootAxisCoord = rootBBox.y
            windowAxisCoord = window.pageYOffset
            break;
        default:
            console.log("Entered Axis:", axis, ". Please insert 'x' or 'y' as axis parameter")
    }

    return coord - rootAxisCoord - windowAxisCoord
}
import MusicPlayer from "../MusicPlayer"
import { Mouse2MEI } from "../utils/Mouse2MEI"
import Handler from "./Handler"


/**
 * Listenes for relevant information to be displayed in the statusbar
 */
class StatusHandler implements Handler{
    m2m?: Mouse2MEI
    musicPlayer?: MusicPlayer
    currentMEI?: string | Document
    

    setListeners(): void {
        throw new Error("Method not implemented.")
    }
    removeListeners(): void {
        throw new Error("Method not implemented.")
    }

}
export default StatusHandler
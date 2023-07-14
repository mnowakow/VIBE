import MusicProcessor from "../MusicProcessor";
import { Mouse2SVG } from "../utils/Mouse2SVG";

interface Handler{

    m2s?: Mouse2SVG
    musicPlayer?: MusicProcessor
    currentMEI?: Document | string

    setListeners(): void
    removeListeners(): void
    setListeners(): void
    setContainerId(containerId): void
}

export default Handler;



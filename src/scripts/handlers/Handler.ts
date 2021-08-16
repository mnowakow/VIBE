import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";

interface Handler{

    m2m?: Mouse2MEI
    musicPlayer?: MusicPlayer
    currentMEI?: Document | string

    setListeners(): void
    removeListeners(): void
    setListeners(): void
}

export default Handler;



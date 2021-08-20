import MusicPlayer from "../MusicPlayer";
import { Mouse2MEI } from "../utils/Mouse2MEI";
import Handler from "./Handler";
import ScoreManipulatorHandler from "./ScoreManipulatorHandler";


class WindowHandler implements Handler{
    m2m?: Mouse2MEI;
    musicPlayer?: MusicPlayer;
    currentMEI?: string | Document;
    //smHandler: ScoreManipulatorHandler

    setListeners(){
        window.addEventListener("scroll", this.update)
        window.addEventListener("resize", this.update)
        window.addEventListener("deviceorientation", this.update)
        document.getElementById("sidebarContainer").addEventListener("transitionend", this.update)

        return this
    }

    removeListeners() {
        window.removeEventListener("scroll", this.update)
        window.removeEventListener("resize", this.update)
        window.removeEventListener("deviceorientation", this.update)
        document.getElementById("sidebarContainer").removeEventListener("transitionend", this.update)

        return this
    }

    update = (function update(){
        var that = this
        window.clearTimeout(isScrolling)

        var isScrolling = setTimeout(function(){
            that.m2m.update()
        }, 100)  
    }).bind(this)

    resetListeners(){
        this
            .removeListeners()
            .setListeners()

        return this
    }

    setM2M(m2m: Mouse2MEI){
        this.m2m = m2m
        return this
    }

    // setSMHandler(smHandler: ScoreManipulatorHandler){
    //     this.smHandler = smHandler
    //     return this
    // }
    
}

export default WindowHandler
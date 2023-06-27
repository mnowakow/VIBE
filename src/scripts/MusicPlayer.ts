import * as Tone from 'tone';
import { NewNote, NoteTime } from './utils/Types';
import {noteToCross, noteToB} from './utils/mappings'
import MidiPlayer from 'midi-player-js';
import * as Soundfont from 'soundfont-player'
import { constants as c } from './constants'
import ScoreGraph from './datastructures/ScoreGraph';
import * as coordinates from "./utils/coordinates"
import * as cq from "./utils/convenienceQueries"
import { isThrowStatement } from 'typescript';

const currentlyPlayingFlag = "currentlyPlaying"
const followerRectID = "followerRect"

const ac = window.AudioContext
const synth = new Tone.Synth().toDestination()

class MusicPlayer{
    private player: MidiPlayer.Player;
    private context: AudioContext;
    private midi: string;
    private midiTimes: Map<number, Array<any>>
    private pulse: number;
    private mei: Document;
    private tempo: number

    private timeouts: Array<any>
    private currentNote: Element
    private noteEvent: Event
    private canvasMP: SVGSVGElement;
    private rootBBox: any;
    private containerId: string
    private interactionOverlay: Element
    private vrvSVG: Element
    private container: Element

    private restartTime: number
    private markedNote: Element

    private instruments: Array<Soundfont.Player>
    private durationMap: Map<string, {note: Element, duration: number, tick: number}> // key: tracknumber,byteindex;
    private durationMapByNote: Map<Element, {duration: number, tick: number}>

    private scoreGraph: ScoreGraph
    private isFirefox: boolean
    private playStartEvent: Event;
    private playEndEvent: Event;

    constructor(containerId: string){
        this.setContainerId(containerId)
        this.noteEvent = new Event("currentNote")
        this.playStartEvent = new Event("playStart")
        this.playEndEvent = new Event("playEnd")
        this.restartTime = 0

        this.setPlayListener()
        if(navigator.userAgent.toLocaleLowerCase().indexOf("firefox") > 0){
            this.isFirefox = true
        }else{
            this.isFirefox = false
        }
    }

    /**
     * Add Canvas in which all MusicPlayer SVGs are contained
     */
    addCanvas(){
        //this.root = this.interactionOverlay //document.getElementById(c._vrvSVGID_)
        this.rootBBox = this.interactionOverlay.getBoundingClientRect()
        var rootWidth = this.rootBBox.width.toString()
        var rootHeigth = this.rootBBox.height.toString()

        if(this.canvasMP == undefined){
            this.canvasMP = document.createElementNS(c._SVGNS_, "svg")
            this.canvasMP.setAttribute("id", "canvasMusicPlayer")
            this.canvasMP.classList.add("canvas")
            this.canvasMP.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
        }      

        this.interactionOverlay = cq.getInteractOverlay(this.containerId)
        this.interactionOverlay.insertBefore(this.canvasMP, this.interactionOverlay.firstChild)
    }

    /**
     * Initialize Player
     */
    initPlayer(){
        var that = this

        //@ts-ignore
        this.player = new MidiPlayer.Player(function(event) {
            if(event.name === "Set Tempo"){
                that.tempo = event.data
                //that.pulse = (60000/ (event.data / 2 * 24))/10 //(60000/ (event.data * 24))/10000 //duration is in seconds
                that.pulse = ((60/event.data)*1000)/120
            }
            if (event.name === 'Note on' && event.velocity !== 0) {
                var track = event.track
                var time = event.tick
                var key = track.toString() + "," + event.byteIndex.toString()
                if(!that.durationMap.has(key)){
                    return
                }
                var duration = that.durationMap.get(key).duration
                that.restartTime = event.tick
                that.highlight(time, duration * 1000)
                if(!that.isFirefox){
                    that.drawFollowerRect()
                }

                if(that.instruments != undefined){
                    var instr = that.instruments[track - 2]
                    instr.play(event.noteName, that.context.currentTime, {gain:event.velocity/100, duration: duration}); 
                }                  
            } 
        })

        this.player.loadArrayBuffer(Buffer.from(this.midi, "base64"))
        this.mapDurations()

        if(this.instruments == undefined){ // instruments only have to be updated, when new instrument (= track) is added
            this.context = new ac()
            this.instruments = new Array(this.player.getEvents().length - 1)
            this.initInstruments()
        }
    } 
    //some change

    /**
     * Stop playing
     */
    stopInstruments(){
        document.dispatchEvent(this.playEndEvent)
        this.player.stop()
        this.instruments?.forEach(instr => instr.stop(this.context.currentTime))
        this.player = undefined
        this.stopTimeouts()
        if(this.restartTime === 0){
            if(document.getElementById(followerRectID) !== null){
                document.getElementById(followerRectID).remove()
            }
            Array.from(document.getElementsByClassName(currentlyPlayingFlag)).forEach(element => {
                element.classList.remove(currentlyPlayingFlag) 
            });
        }
        this.initPlayer()
    }

    rewind(){
        if(this.player != undefined){
            this.restartTime = 0
            this.stopInstruments()
        }
    }

    /**
     * Initialize Instrument for 
     */
    initInstruments(){
        this.setSoundfontsRecursive()
    }

    setSoundfontsRecursive(counter = 0){
        var i = counter
        var that = this
        if(i < this.instruments.length){
            Soundfont.instrument(this.context, "acoustic_grand_piano").then((instrument) => {
                that.instruments[i] = instrument
                i += 1
                that.setSoundfontsRecursive(i)
            })
        }
    }

    playMidi(){
        if(!cq.hasActiveElement(this.containerId)) return
        if(this.player.isPlaying()){
            this.stopInstruments()
            
        }else{
            this.player.on("endOfFile", () => {
                this.rewind()
            })
            this.player.division = 120
            //this.player.tempo = this.tempo
            this.player.tick = this.restartTime
            this.player.skipToTick(this.restartTime)
            this.player.play() 
            document.dispatchEvent(this.playStartEvent)
        }
    }

    ///// LISTENERS ////
    setListeners(){
        if(this.midiTimes == undefined){
            return 
        }

        var it = this.midiTimes.values()
        var result = it.next()
        while(!result.done){
            var arr: Array<any> = result.value
            arr.forEach(note => {
                note.addEventListener("currentNote", this.setCurrentNoteHandler)
                note.addEventListener("click", this.startPointHandler)
            })
            result = it.next()
        }

        var that = this
        this.container.querySelector("#playBtn").addEventListener("click", this.playBtn)

        this.container.querySelector("#rewindBtn").addEventListener("click", this.rewindBtn)
    }

    playBtn = (function playBtn(e: MouseEvent){
        e.preventDefault()
        this.context.resume().then(() => this.playMidi())
    }).bind(this)

    rewindBtn = (function rewindBtn(e: MouseEvent){
        e.preventDefault()
        this.rewind()
    }).bind(this)

    removeListeners(){
        if(this.midiTimes == undefined){
            return 
        }
        var it = this.midiTimes.values()
        var result = it.next()
        while(!result.done){
            var arr: Array<any> = result.value
            arr.forEach(note => {
                note.removeEventListener("currentNote", this.setCurrentNoteHandler)
                note.removeEventListener("click", this.startPointHandler)
            })
            result = it.next()
        }
    }

    resetListeners(){
        this.removeListeners()
        this.setListeners()
    }

    /**
     * Separate Listeners to set player options externally
     */
    setPlayListener(){
        document.addEventListener("keydown",this.playHandler)
    }

    removePlayListener(){
        document.removeEventListener("keydown",this.playHandler)
    }

    playHandler = (function playHandler(e: KeyboardEvent){
        if(!this.hasContainerFocus()) return
        this.playFunction(e)
        
    }).bind(this)

    playFunction(e: KeyboardEvent){
        if(!this.hasContainerFocus()) return
        if(e.code === "Space"){
            e.preventDefault()
            if(e.shiftKey || document.getElementById("followerRect") !== null){
                this.context.resume().then(() => this.playMidi())
            }else if(typeof this.player != undefined ){
                this.stopInstruments()
            }
        }
    
    }

    setCurrentNoteHandler = (function setCurrentNoteHandler(e: Event){
        this.currentNote = e.target
    }).bind(this)

    /**
     *  Set last clicked element to restartpoint
     */
    startPointHandler = (function startPointHandler(e: MouseEvent){
        if(!this.hasContainerFocus()) return
        var playingNote = e.target as Element
        playingNote = playingNote.closest(".note") || playingNote.closest(".rest") || playingNote.closest(".mRest")
        if(playingNote !== null){
            var it = this.durationMap.values()
            var res = it.next()
            while(!res.done){
                if(playingNote.id === res.value.note.id){
                    this.restartTime = res.value.tick
                    break;
                }
                res = it.next()
            }
        }
    }).bind(this)

    /**
     * Map all durations and notes to make them available asynchronically
     */
    mapDurations(){
        var durationMap = new Map<string, {note: Element, duration: number, tick: number}>() // key: tracknumber,byteindex
        var mapByNote = new Map<Element, {duration: number, tick: number}>()
        var eventTracks = this.player.getEvents()
        eventTracks.forEach(eventArray => {
            //@ts-ignore
            Array.from(eventArray).forEach((event, eventIdx) => { 
                var e: any = event
                if(e.name === "Set Tempo"){
                    this.tempo = e.data
                    this.pulse = ((60/e.data)*1000)/120
                }
                else if(e.name === "Note on"){
                    var time = e.tick //* this.pulse //* 1000 * 2
                    var notes = this.getClosestEntry(time)
                    if(notes == undefined){
                        return
                    }
                    //iterate because notes can be in a chord
                    notes.forEach(note => {
                        var meiNote = this.mei.getElementById(note.id)
                        var staffNumber = parseInt(meiNote.closest("staff").getAttribute("n")) + 1
                        if(!meiNote.hasAttribute("grace")){
                            var key = e.track.toString() + "," + e.byteIndex.toString()
                            if(!durationMap.has(key) && e.track === staffNumber){
                                if(!meiNote.hasAttribute("dur")){
                                    meiNote = meiNote.closest("chord")
                                }
                                var baseDur = this.getDur(parseInt(meiNote.getAttribute("dur")), parseInt(meiNote.getAttribute("dots")) || 0 , 4)

                                //find any prolongated Notes
                                var tie = this.mei.querySelector("tie[startid='#" + note.id +"']") 
                                if(tie !== null){
                                    var endid = tie.getAttribute("endid") //endid alway includes # at beginnig
                                    var prolongNote = this.mei.querySelector(endid)
                                    if(prolongNote !== null){
                                        var pnDur = prolongNote.getAttribute("dur")
                                        var pnDot = prolongNote.getAttribute("dots")
                                        baseDur += this.getDur(parseInt(pnDur), parseInt(pnDot) || 0, 4)
                                    }
                                }

                                //concat duration
                                var dur =  baseDur * 60/this.tempo
                                var valueFound = false
                                var it = durationMap.values()  
                                var res = it.next()
                                
                                if(!valueFound ){ // why do I check here?
                                    durationMap.set(key, {note: note, duration: dur, tick: e.tick as number})
                                    mapByNote.set(note, {duration: dur, tick: e.tick as number})
                                }else{
                                    //console.log(key, note, dur, e.tick)
                                    //console.log(durationMap.get(key))
                                }
                            }
                        }
                    })
                    
                }
            }) 
        })
        this.durationMap = durationMap
        this.durationMapByNote = mapByNote
        //console.log(this.durationMap, this.durationMapByNote)
    }

    /**
     * Computation of time and midi times have some divergence (by floating number)
     * Finding closest entry is sufficient, but has to be made for all entries, since the miditimes-iterator is not ordered.
     * @param time 
     * @returns 
     */
    getClosestEntry(time: number){
        var targetEntry
        var temp = Infinity
        for(const [key, value] of this.midiTimes.entries()){
            var diff = Math.abs(time - key)
            if(diff < temp ){
                targetEntry = value
                temp = diff
            }
        }
        return targetEntry
    }

    getDur(dur: number, dots: number, base: number): number{
        var baseDur = base/ dur
        var add = baseDur
        if(dots > 0){
            for(var i = 0; i < dots ; i++){
                add = add/2
                baseDur += add
            }
        }
        return baseDur
    }


    setAudioContext(): Promise<void>{
        var that = this
        return new Promise<void>((resolve, reject):void => {
            window.onload = function(){
                resolve() 
            }
        })
    }

    setMidi(midi: string){
        this.midi = midi;
        return this
    }

    /**
     * Highlight playing Elements
     * @param time Time at which Element is played (in ms)
     * @param duration Duration of Element (in ms)
     */
    highlight(time: number, duration: number){
        var notes = this.getClosestEntry(time)
        this.timeouts = new Array()
        notes.forEach(n => {
            this.addClass(n, currentlyPlayingFlag).then(() => {
                var to = setTimeout(() => {n.classList.remove(currentlyPlayingFlag)}, duration)
                this.timeouts.push(to)
            })
        })
    }


    /**
     * Adds Class to be highlighted. 
     * Dispatches event for every Note which was started most currently
     */
    addClass = (function addClass(n: Element, className: string){
        return new Promise(resolve => {
            n.classList.add(className)
            n.dispatchEvent(this.noteEvent)
            resolve(true)
        })
    }).bind(this)

    

    /**
     * Draw follower rectangle over all staves for last sounding element
     */
    drawFollowerRect(){

        // var canvas =  document.getElementById(this.containerId).querySelector("#canvasMusicPlayer") //document.getElementById("canvasMusicPlayer")
        // var canvasBBox = canvas.getBoundingClientRect();

        var followerRect: Element
        if(document.getElementById(followerRectID) !== null){
            followerRect = document.getElementById(followerRectID)
        }else{
            followerRect = document.createElementNS(c._SVGNS_, "rect")
            this.canvasMP.appendChild(followerRect)
        }
        var margin = 5
        var ptCurrentNote = coordinates.getDOMMatrixCoordinates(this.currentNote, this.canvasMP)

        var parentMeasureRect = this.currentNote.closest(".measure").getBoundingClientRect()
        var ptParentMeasure = coordinates.getDOMMatrixCoordinates(parentMeasureRect, this.canvasMP)

        var upperBound = (ptParentMeasure.top - margin) 
        var lowerBound = (ptParentMeasure.bottom + margin) 
        var leftBound = (ptCurrentNote.left - margin)
        var rightBound = (ptCurrentNote.right + margin)

        followerRect.setAttribute("id", followerRectID)
        followerRect.setAttribute("y", upperBound.toString())
        followerRect.setAttribute("x", leftBound.toString())
        followerRect.setAttribute("width", (rightBound - leftBound).toString())
        followerRect.setAttribute("height", (lowerBound - upperBound).toString())
    }

    hasContainerFocus(){
        return document.getElementById(this.containerId).classList.contains("activeContainer")
    }


    ///SYNTH////

    generateTone(newNote: NewNote): void{
        if(newNote.rest){
            return
        }
        
        let note = newNote.pname
        let dur = newNote.dur + "n"
        if(typeof newNote.keysig !== "undefined" && newNote.keysig !== "0"){
            let signMap
           if(newNote.keysig.charAt(1) === "s"){
                signMap = noteToCross
            }else if(newNote.keysig.charAt(1) === "f"){
                signMap  = noteToB
            }

            let signCount = parseInt(newNote.keysig.charAt(0))
            let submap = new Map<string, string>()
            let i = 0;
            for(const [key, value] of signMap.entries()){
                if(i < signCount){
                    submap.set(key, value)
                }
                i += 1
            }
            if(submap.has(note)){
                note = submap.get(note)
                note = note.charAt(0).toUpperCase() + note.charAt(1).toUpperCase() + newNote.oct
            }else{
                note = note.toUpperCase() + newNote.oct;
            }
        }else{
            note = note.toUpperCase() + newNote.oct;
        }

        if(!note.includes("undefined") && !dur.includes("undefined")){
            dur = "16n"
            synth.triggerAttackRelease(note, dur);
            Tone.start();
        }
    }


    // UTILS

    setMEI(mei: Document){
        this.mei = mei
        return this
    }

    setMidiTimes(midiTimes: Map<number, Array<any>>){
        this.midiTimes = midiTimes
        return this
    }

    setScoreGraph(scoreGraph: ScoreGraph){
        this.scoreGraph = scoreGraph
        return this
    }

    stopTimeouts(){
        if(typeof this.timeouts !== "undefined"){
            this.timeouts.forEach(to => {
                clearTimeout(to)
            })
        }
    }

    setContainerId(containerId: string){
        this.containerId = containerId
        this.interactionOverlay = cq.getInteractOverlay(containerId)
        this.vrvSVG = cq.getVrvSVG(containerId)
        this.container = document.getElementById(containerId)
        return this
    }

    resetInstruments(){
        this.instruments = undefined
    }

    getRestartTime(){
        return this.restartTime
    }

    setRestartTimeBySeconds(time: number){
        return this.restartTime = time
    }

    setRestartTimeByElement(el: Element){
        throw Error("Not yet implemented")
    }

    getIsPlaying(){
        return this.player?.isPlaying()
    }

    update(){
        this.resetInstruments()
        this.resetListeners()
        this.initPlayer()
        return this
    }
}

export default MusicPlayer;

import * as Tone from 'tone';
import { NewNote, NoteTime } from './utils/Types';
import { noteToCross, noteToB , enharmonicToCross, enharmonicToB} from './utils/mappings'
import MidiPlayer from 'midi-player-js';
import * as Soundfont from 'soundfont-player'
import { constants as c } from './constants'
import ScoreGraph from './datastructures/ScoreGraph';
import * as coordinates from "./utils/coordinates"
import * as cq from "./utils/convenienceQueries"
import * as meiConverter from "./utils/MEIConverter"
import { Buffer } from 'buffer';
import axios from "axios"
import { timemapObject } from './utils/Types';

const currentlyPlayingFlag = "currentlyPlaying"
const followerRectID = "followerRect"

const ac = window.AudioContext
const synth = new Tone.Synth().toDestination()

class MusicProcessor {
    private midiPlayer: MidiPlayer.Player;
    private context: AudioContext;
    private midi: string;
    private midiTimes: Map<number, Array<any>>
    private pulse: number;
    private currentMEI: Document;
    private tempo: number
    private timemap: Array<timemapObject>

    private timeouts: Array<any>
    private currentHighlight: Element
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
    private audioTimes: Map<number, Array<string>>
    private spaceCount: number = 0

    private scoreGraph: ScoreGraph
    private isFirefox: boolean
    private playStartEvent: Event;
    private playEndEvent: Event;

    constructor(containerId: string) {
        this.setContainerId(containerId)
        this.noteEvent = new Event("currentNote")
        this.playStartEvent = new Event("playStart")
        this.playEndEvent = new Event("playEnd")
        this.restartTime = 0

        this.setPlayListener()
        if (navigator.userAgent.toLocaleLowerCase().indexOf("firefox") > 0) {
            this.isFirefox = true
        } else {
            this.isFirefox = false
        }

        this.getMidiInput()
    }

    /**
     * Add Canvas in which all MusicPlayer SVGs are contained
     */
    addCanvas() {
        //this.root = this.interactionOverlay //document.getElementById(c._vrvSVGID_)
        this.rootBBox = this.interactionOverlay.getBoundingClientRect()
        var rootWidth = this.rootBBox.width.toString()
        var rootHeigth = this.rootBBox.height.toString()
        this.interactionOverlay = cq.getInteractOverlay(this.containerId)

        this.canvasMP = this.interactionOverlay.querySelector("#canvasMusicPlayer")
        if (!this.canvasMP) {
            this.canvasMP = document.createElementNS(c._SVGNS_, "svg")
            this.canvasMP.setAttribute("id", "canvasMusicPlayer")
            this.canvasMP.classList.add("canvas")
            //this.canvasMP.setAttribute("viewBox", ["0", "0", rootWidth, rootHeigth].join(" "))
        }
        this.canvasMP.innerHTML = "" // will delete followerRect if present (usually when score is loaded)

        
        this.interactionOverlay.insertBefore(this.canvasMP, this.interactionOverlay.firstChild)

        return this
    }

    /**
     * Initialize Player
     */
    initMidiPlayer() {
        var that = this
        //@ts-ignore
        this.midiPlayer = new MidiPlayer.Player(function (event) {
            if (event.name === "Set Tempo") {
                that.tempo = event.data
                //that.pulse = (60000/ (event.data / 2 * 24))/10 //(60000/ (event.data * 24))/10000 //duration is in seconds
                that.pulse = 120 //Math.floor((60 / event.data) * 1000 / 120)
            }
            if (event.name === 'Note on' && event.velocity !== 0) {
                var track = event.track
                var time = event.tick
                that.restartTime = event.tick
                var duration = that.highlight(time, event.noteName, "midi") / 1000 // duratioin must be in seconds 
                if (!that.isFirefox) {
                    //that.drawFollowerRect()
                }

                if (that.instruments != undefined) {
                    var instr = that.instruments[track - 2]
                    instr.play(event.noteName, that.context.currentTime, { gain: event.velocity / 100, duration: duration });
                }
            }
        })

        this.midiPlayer.loadArrayBuffer(Buffer.from(this.midi, "base64"))
        //this.mapDurations()

        if (this.instruments == undefined) { // instruments only have to be updated, when new instrument (= track) is added
            this.context = new ac()
            this.instruments = new Array(this.midiPlayer.getEvents().length - 1)
            this.initMidiInstruments()
        }
    }
    
    /**
     * Find Durations from timemap based on id of note.
     * @param id id of note
     * @returns duration or default 1 when no duration could be computed.
     */
    findDuration(id: string){
        var dur: number
        var start: number
        var end: number
        
        for(let i = 0; i < this.timemap.length; i++){
            var tm = this.timemap[i]
            if(tm.on?.includes(id)){
                start = tm.tstamp
            }
            if(tm.off?.includes(id)){
                end = tm.tstamp
                dur = end - start
                break;
            }
        }
        
        return dur || 1
    }

    /**
     * Stop playing
     *
     **/
    stopMidiInstruments() {
        document.dispatchEvent(this.playEndEvent)
        this.midiPlayer.stop()
        this.instruments?.forEach(instr => instr.stop(this.context.currentTime))
        this.midiPlayer = undefined
        this.stopTimeouts()
        if (this.restartTime === 0) {
            if (document.getElementById(followerRectID) !== null) {
                document.getElementById(followerRectID).remove()
            }
            Array.from(document.getElementsByClassName(currentlyPlayingFlag)).forEach(element => {
                element.classList.remove(currentlyPlayingFlag)
            });
        }
        this.initMidiPlayer()
    }

    rewindMidi() {
        if (this.midiPlayer != undefined) {
            this.restartTime = 0
            this.stopMidiInstruments()
        }
    }

    /**
     * Initialize Instrument for 
     */
    initMidiInstruments() {
        this.setSoundfontsRecursive()
    }

    setSoundfontsRecursive(counter = 0) {
        var i = counter
        var that = this
        if (i < this.instruments.length) {
            Soundfont.instrument(this.context, "acoustic_grand_piano").then((instrument) => {
                that.instruments[i] = instrument
                i += 1
                that.setSoundfontsRecursive(i)
            })
        }
    }

    playMidi() {
        if (!cq.hasActiveElement(this.containerId)) return
        if (this.midiPlayer.isPlaying()) {
            this.stopMidiInstruments()

        } else {
            this.midiPlayer.on("endOfFile", () => {
                this.rewindMidi()
            })
            this.midiPlayer.division = 120
            //this.player.tempo = this.tempo
            this.midiPlayer.tick = this.restartTime || 0
            console.log("tick", this.midiPlayer.tick)
            this.midiPlayer.skipToTick(this.restartTime)
            this.midiPlayer.play()
            document.dispatchEvent(this.playStartEvent)
        }
    }

    ///// LISTENERS ////
    setListeners() {
        var that = this
        if (!this.midiTimes) {
            return
        }

        var it = this.midiTimes.values()
        var result = it.next()
        while (!result.done) {
            var arr: Array<any> = result.value
            arr.forEach(noteId => {
                const note = cq.getVrvSVG(this.containerId).querySelector(`#${noteId}`)
                if (!note) return
                note.addEventListener("currentNote", this.setCurrentHighlightHandler)
                var id = note.querySelector(".notehead")?.id || note.id
                var interactRect = cq.getInteractOverlay(that.containerId).querySelector("#scoreRects g[refId=\"" + id + "\"]")
                interactRect?.addEventListener("click", this.startPointHandler)
            })
            result = it.next()
        }

        this.container.querySelector("#playBtn").addEventListener("click", this.playBtn)
        this.container.querySelector("#rewindBtn").addEventListener("click", this.rewindBtn)
        this.container.addEventListener("timeupdate", this.fetchAudioSeconds, true)
        //this.container.querySelector("#recordAlignment")?.addEventListener("click", this.resetSpacebarCount)
        this.container.querySelector("#audioSlider")?.addEventListener("keydown", this.preventAudioPause)
        this.container.querySelector("#audioSlider")?.addEventListener("play", this.handleCountdown);
        this.container.querySelector("#exportAlignment")?.addEventListener("click", this.downloadAlignmentHandler)
        //["ended", "pause"].forEach(ev => this.container.querySelector("#audioSlider")?.addEventListener(ev, function () { that.resetListeners() }))
        document.addEventListener("keydown", this.recAlignmentManually)
    }

    removeListeners() {
        var that = this
        if (this.midiTimes == undefined) {
            return
        }
        var it = this.midiTimes.values()
        var result = it.next()
        while (!result.done) {
            var arr: Array<any> = result.value
            arr.forEach(noteId => {
                const note = cq.getVrvSVG(this.containerId).querySelector(`#${noteId}`)
                if (!note) return
                note.removeEventListener("currentNote", this.setCurrentHighlightHandler)
                var id = note.querySelector(".notehead")?.id || note.id
                var interactRect = cq.getInteractOverlay(that.containerId).querySelector("#scoreRects g[refId=\"" + id + "\"]")
                interactRect?.removeEventListener("click", this.startPointHandler)
            })
            result = it.next()
        }
        this.container.removeEventListener("timeupdate", this.fetchAudioSeconds, true)
        this.container.querySelector("#audioSlider")?.removeEventListener("keydown", this.preventAudioPause)
        this.container.querySelector("#audioSlider")?.removeEventListener("play", this.handleCountdown);
        this.container.querySelector("#exportAlignment")?.addEventListener("click", this.downloadAlignmentHandler)
        //["ended", "pause"].forEach(ev => this.container.querySelector("#audioSlider")?.removeEventListener(ev, function () { that.resetListeners() }))
        document.removeEventListener("keydown", this.recAlignmentManually)
    }

    resetListeners() {
        this.removeListeners()
        this.setListeners()
    }


    playBtn = (function playBtn(e: MouseEvent) {
        e.preventDefault()
        this.context.resume().then(() => this.playMidi())
    }).bind(this)

    rewindBtn = (function rewindBtn(e: MouseEvent) {
        e.preventDefault()
        this.rewindMidi()
    }).bind(this)

    fetchAudioSeconds = (function fetchAudioSeconds(e: Event) {
        //if ((this.container.querySelector("#recordAlignment") as HTMLInputElement)?.checked || this.audioTimes?.size === 0) return
        if(this.audioTimes?.size === 0) return
        var sec = (e.target as HTMLAudioElement).currentTime
        this.highlight(sec, "", "audio")
        this.drawFollowerRect()
    }).bind(this)

    resetSpacebarCount = (function resetAudioTimes(e: MouseEvent) {
        var input = e.target as HTMLInputElement
        if (input.checked) {
            this.spaceCount = 0
        }
    }).bind(this)

    preventAudioPause = (function preventAudioPause(e: KeyboardEvent) {
        if (e.code === "Space" && (cq.getContainer(this.containerId).querySelector("#recordAlignment") as HTMLInputElement).checked) {
            (e.target as HTMLElement).blur()
            e.preventDefault()
        }
    }).bind(this)


    recAlignmentManually = (function recAligmentManually(e: KeyboardEvent) {
        this.recordAlignment(e)
    }).bind(this)

    /**
     * Record an alignment by pressing the space button.
     * For each press the id of the next measure will be saved.
     * @param e 
     * @returns 
     */
    recordAlignment(e: KeyboardEvent) {
        var audioSlider = this.container.querySelector("#audioSlider") as HTMLAudioElement
        var recToggle = this.container.querySelector("#recordAlignment") as HTMLInputElement
        if (audioSlider?.paused) return;
        if (!recToggle?.checked ) return;
        if (e.code === "Space") {
            if(this.currentHighlight){
                this.spaceCount = parseInt(this.currentHighlight.getAttribute("n"))
                this.audioTimes?.forEach((v, k) => {
                    if(k > audioSlider.currentTime){
                        this.audioTimes.delete(k)
                    }
                })
            }
            e.preventDefault()
            if (!this.audioTimes || this.spaceCount === 0) { this.audioTimes = new Map() }
            this.spaceCount += 1
            const measure = this.container.querySelector(`#vrvSVG .measure[n='${this.spaceCount}']`)
            this.currentHighlight = measure
            this.drawFollowerRect()
            this.audioTimes.set(audioSlider.currentTime, [measure.id])
            console.log(this.audioTimes)
        }
    }

    downloadAlignmentHandler = (function downloadAlignmentHandler(e: MouseEvent){
        this.downloadAlignment(e)
    }).bind(this)

    downloadAlignment(e: MouseEvent){
        const d = new Date()
        const fileName = d.getUTCFullYear()
            + ("0" + d.getDate()).slice(-2)
            + ("0" + d.getMonth()).slice(-2)
            + "_"
            + ("0" + d.getHours()).slice(-2)
            + ("0" + d.getMinutes()).slice(-2)
            + ("0" + d.getSeconds()).slice(-2)
            + "_"
            + "alignment_" + this.containerId + ".json"
        const audioTimesJson = JSON.stringify(Object.fromEntries(this.audioTimes))
        console.log("Audio JSON", audioTimesJson)
        this.download(fileName, audioTimesJson)
    }

    download(file: string, text: string) {
        //creating an invisible element
        var element = document.createElement('a');
        element.setAttribute('href',
            'data:text/plain;charset=utf-8, '
            + encodeURIComponent(text));
        element.setAttribute('download', file);
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    handleCountdown = (function handleCountdown(e: Event) {
        var recToggle = this.container.querySelector("#recordAlignment") as HTMLInputElement
        if (!recToggle?.checked) return
        var slider = e.target as HTMLAudioElement
        this.countdown(slider)
    }).bind(this)

    /**
     * Set countdown for given audioElement
     * @param audioElement 
     */
    countdown(audioElement: HTMLAudioElement, seconds: number = 5) {
        audioElement.pause()
        var that = this

        that.container.querySelector("#recordDiv label").textContent = seconds.toString()
        seconds--;

        Tone.start()
        const synth = new Tone.Synth().toDestination();

        function cdSound() {
            synth.triggerAttackRelease("C5", "128n", undefined, 0.25);
        }

        cdSound()

        var timer = setInterval(function () {

            if (seconds === 1) {
                synth.triggerAttackRelease("C6", "4n", undefined, 0.25)
            } else if (seconds > 0) {
                cdSound()
            }
            that.container.querySelector("#recordDiv label").textContent = seconds.toString()
            seconds--;

            if (seconds < 0) {
                clearInterval(timer);
                that.container.querySelector("#audioSlider")?.removeEventListener("play", that.handleCountdown)
                audioElement.play()
                that.container.querySelector("#recordDiv label").textContent = "rec"
            }
        }, 1000);
    }


    /**
     * Separate Listeners to set player options externally
     */
    setPlayListener() {
        document.addEventListener("keydown", this.midiPlayHandler)
    }

    removePlayListener() {
        document.removeEventListener("keydown", this.midiPlayHandler)
    }

    midiPlayHandler = (function midiPlayHandler(e: KeyboardEvent) {
        if (!this.hasContainerFocus()) return
        this.midiPlayFunction(e)

    }).bind(this)

    midiPlayFunction(e: KeyboardEvent) {
        if (!this.hasContainerFocus()) return
        if (e.code === "Space") {
            e.preventDefault()
            if (e.shiftKey) {
                this.context.resume().then(() => this.playMidi())
            } else if (typeof this.midiPlayer != undefined) {
                this.stopMidiInstruments()
            }
        }

    }

    setCurrentHighlightHandler = (function setCurrentNoteHandler(e: Event) {
        this.currentNote = e.target
    }).bind(this)

    /**
     *  Set last clicked element to restartpoint
     */
    startPointHandler = (function startPointHandler(e: MouseEvent) {
        if (!this.hasContainerFocus()) return
        var playingNote = e.target as Element
        playingNote = cq.getVrvSVG(this.containerId).querySelector("#" + playingNote.closest("[refId]").getAttribute("refId"))
        playingNote = playingNote.closest(".note") || playingNote.closest(".rest") || playingNote.closest(".mRest")
        if (playingNote !== null) {
            this.timemap.forEach(tm => {
                if(tm.on?.includes(playingNote.id)){
                    this.restartTime = (tm.tstamp * this.pulse * this.tempo) / 60000
                }
            })
        }
    }).bind(this)

    /**
     * Call score tube alignment service and map the cursor to notes.
     * @param file Bufferarray of imported file (Blob)
     */
    align(file: any) {
         // this listener is not in setListener function since we can get into an infinite loop easily
        ["ended", "pause"].forEach(ev => this.container.querySelector("#audioSlider").addEventListener(ev, function () { that.resetListeners() }))

        var that = this
        var fd = new FormData();
        fd.append('mei', new Blob([meiConverter.docToMei(this.currentMEI)]));
        fd.append('audio', file);
        var devUrl = 'http://localhost:8001/align'
        axios.post(devUrl, fd, { // for production use different url, when service is up
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }).then((response) => {
            var data = response.data
            that.audioTimes = new Map()
            for (const [key, value] of Object.entries(data)) {
                var val = value as number
                if (!that.audioTimes.has(val)) {
                    that.audioTimes.set(val, new Array())
                }
                //that.audioTimes.get(val).push(that.container.querySelector("#" + key))
                that.audioTimes.get(val).push(key)
            }
        }).catch((error) => {
            alert(["Aligning Service is not Available:", error, ".", "\nToggle the record button at the audio slider to activate manual measure alignment."].join(" "))
            console.log(["An error occured while aligning the soundfile:", error].join(" "))
        })
    }

    /**
     * Time maps and actual values of audio elements or midi events might have some divergence (by floating number)
     * Finding closest entry is sufficient, but has to be made for all entries, since the miditimes-iterator is not ordered.
     * @param time 
     * @returns 
     */
    getClosestEntry(time: number, source: "audio" | "midi") {
        var targetEntry
        var temp = Infinity
        var entries: IterableIterator<any>
        var map: Map<number, string[]>
        if (source === "midi") {
            map = this.midiTimes
        } else if (source === "audio") {
            map = this.audioTimes
            // const audioMap = new Map<number, string[]>() 
            // map.forEach((v, k) => {
            //     audioMap.set(k, v.map(v => v.id)) // map ids, since highlight function only works with ids, not elements
            // })
            // map = audioMap
        }
        entries = map.entries()

        targetEntry = map.get(time)
        if (targetEntry) return targetEntry

        for (const [key, value] of entries) {
            var diff = Math.abs(time - key)
            // check if diff is in range of next time to be sufficiently percieved as beeing on time
            var diffCondition = diff < temp
            diffCondition &&= source === "audio" ? diff <= 0.2 : true
            if (diffCondition) {
                targetEntry = value
                temp = diff
            }
        }
        return targetEntry
    }

    getDur(dur: number, dots: number, base: number): number {
        var baseDur = base / dur
        var add = baseDur
        if (dots > 0) {
            for (var i = 0; i < dots; i++) {
                add = add / 2
                baseDur += add
            }
        }
        return baseDur
    }

    setAudioContext(): Promise<void> {
        var that = this
        return new Promise<void>((resolve, reject): void => {
            window.onload = function () {
                resolve()
            }
        })
    }

    setMidi(midi: string) {
        this.midi = midi;
        return this
    }

    setTimemap(tm: Array<timemapObject>) {
        this.timemap = tm;
        this.midiTimes = new Map()
        this.timemap.forEach(tm => {
            if(tm.on) this.midiTimes.set(tm.tstamp, tm.on)
        })
        return this
    }

    /**
     * Highlight playing Elements
     * @param time Time at which Element is played (in ticks or ms)
     * @param noteName noteName is important to find the correct element for the current time
     */
    highlight(time: number, noteName: string, source: "audio" | "midi"): number {
        noteName = noteName.replace("#", "s").replace("b", "f") // make sure the notname is compatible with the mei accid names
        noteName = noteName.toLowerCase()
        const timeMS = source === "audio" ? time : (time / (this.pulse)) * (60000 / this.tempo)
        var soundDur: number
        var highlightElements = this.getClosestEntry(timeMS, source)
        if (!highlightElements) return

        highlightElements.forEach((id: string) => {
            if (this.container.querySelector(`#${id}`)){ //.classList.contains("measure")) {
                this.currentHighlight = this.container.querySelector(`#${id}`) //highlightElements[0]
                const meiElement = this.currentMEI.querySelector(`#${id}`)

                const pname = meiElement.getAttribute("pname")
                var accid = meiElement.getAttribute("accid") || meiElement.getAttribute("accid.ges")
                accid = accid === "n" || !accid ? "" : accid
                const oct = meiElement.getAttribute("oct")
                const meiNoteName = pname + accid + oct
                const enhUpNoteName = (enharmonicToCross.get(pname + accid) || "") + oct
                const enhDownNoteName = (enharmonicToB.get(pname + accid) || "") + oct
                const noteNameVersions = [meiNoteName, enhUpNoteName, enhDownNoteName]

                if(noteNameVersions.includes(noteName)){
                    soundDur = this.findDuration(id)
                }
            }
        })
        this.timeouts = new Array()
        highlightElements.forEach((id: string) => {
            const el = this.container.querySelector(`#${id}`)
            this.addClass(el, currentlyPlayingFlag).then(() => {
                if (source === "audio") { //we have no proper duration display yet, so no red coloring for notes, just the followerRect for the whole measure
                    el.classList.remove(currentlyPlayingFlag)
                    return
                }
                var to = setTimeout(() => { el.classList.remove(currentlyPlayingFlag) }, this.findDuration(id))
                this.timeouts.push(to)
            })
        })
        return soundDur || 500
    }


    /**
     * Adds Class to be highlighted. 
     * Dispatches event for every Note which was started most currently
     */
    addClass = (function addClass(el: Element, className: string) {
        return new Promise(resolve => {
            el.classList.add(className)
            el.dispatchEvent(this.noteEvent)
            resolve(true)
        })
    }).bind(this)



    /**
     * Draw follower rectangle over all staves for last sounding element
     */
    drawFollowerRect() {

        // var canvas =  document.getElementById(this.containerId).querySelector("#canvasMusicPlayer") //document.getElementById("canvasMusicPlayer")
        // var canvasBBox = canvas.getBoundingClientRect();

        var followerRect: Element
        if (document.getElementById(followerRectID) !== null) {
            followerRect = document.getElementById(followerRectID)
        } else {
            followerRect = document.createElementNS(c._SVGNS_, "rect")
            this.canvasMP.appendChild(followerRect)
        }
        var margin = 5
        var ptCurrentHighlightElement = coordinates.getDOMMatrixCoordinates(this.currentHighlight, this.canvasMP)

        var parentMeasureRect = this.currentHighlight.closest(".measure").getBoundingClientRect()
        var ptParentMeasure = coordinates.getDOMMatrixCoordinates(parentMeasureRect, this.canvasMP)

        var upperBound = (ptParentMeasure.top - margin)
        var lowerBound = (ptParentMeasure.bottom + margin)
        var leftBound = (ptCurrentHighlightElement.left - margin)
        var rightBound = (ptCurrentHighlightElement.right + margin)

        followerRect.setAttribute("id", followerRectID)
        followerRect.setAttribute("y", upperBound.toString())
        followerRect.setAttribute("x", leftBound.toString())
        followerRect.setAttribute("width", (rightBound - leftBound).toString())
        followerRect.setAttribute("height", (lowerBound - upperBound).toString())
    }

    hasContainerFocus() {
        if(!document.getElementById(this.containerId)) return false
        return document.getElementById(this.containerId).classList.contains("activeContainer")
    }


    ///SYNTH////

    generateTone(newNote: NewNote): void {
        if (newNote.rest) {
            return
        }

        let note = newNote.pname
        let dur = newNote.dur + "n"
        var accid = typeof newNote.accid === "string" ? newNote.accid.replace("f", "b").replace("s", "#").replace("n", "") : ""
        if (typeof newNote.keysig !== "undefined" && newNote.keysig !== "0") {
            let signMap
            if (newNote.keysig.charAt(1) === "s") {
                signMap = noteToCross
            } else if (newNote.keysig.charAt(1) === "f") {
                signMap = noteToB
            }

            let signCount = parseInt(newNote.keysig.charAt(0))
            let submap = new Map<string, string>()
            let i = 0;
            for (const [key, value] of signMap.entries()) {
                if (i < signCount) {
                    submap.set(key, value)
                }
                i += 1
            }
            if (submap.has(note)) {
                note = submap.get(note)
                note = note.charAt(0).toUpperCase() + note.charAt(1).toUpperCase() + newNote.oct
            } else {
                note = note.toUpperCase() + accid + newNote.oct;
            }
        } else {
            note = note.toUpperCase() + accid + newNote.oct;
        }

        if (!note.includes("undefined") && !dur.includes("undefined")) {
            dur = "16n"
            synth.triggerAttackRelease(note, dur, undefined, 0.3);
            Tone.start();
        }
    }


    // UTILS

    setMEI(mei: Document) {
        this.currentMEI = mei
        return this
    }

    setMidiTimes(midiTimes: Map<number, Array<any>>) {
        this.midiTimes = midiTimes
        return this
    }

    setScoreGraph(scoreGraph: ScoreGraph) {
        this.scoreGraph = scoreGraph
        return this
    }

    stopTimeouts() {
        if (typeof this.timeouts !== "undefined") {
            this.timeouts.forEach(to => {
                clearTimeout(to)
            })
        }
    }

    setContainerId(containerId: string) {
        this.containerId = containerId
        this.interactionOverlay = cq.getInteractOverlay(containerId)
        this.vrvSVG = cq.getVrvSVG(containerId)
        this.container = document.getElementById(containerId)
        return this
    }

    resetMidiInstruments() {
        this.instruments = undefined
    }

    getRestartTime() {
        return this.restartTime
    }

    setRestartTimeBySeconds(time: number) {
        return this.restartTime = time
    }

    setRestartTimeByElement(el: Element) {
        throw Error("Not yet implemented")
    }

    /**
     * Set audioTimes map for alignment.
     * IDs are set new afterwards to account for different MEI. 
     * Assumes that Score and Map have the same number of measures.
     * @param audioTimes 
     * @returns 
     */
    setAudioTimes(audioTimes: Map<number, string[]>){
        this.audioTimes = audioTimes
        this.container.querySelectorAll(`#vrvSVG .measure`).forEach((m, i) => {
            const key = Array.from(this.audioTimes.keys())[i]
            this.audioTimes.set(key, [m.id])
        })
        return this
    }

    getIsPlaying() {
        return this.midiPlayer?.isPlaying()
    }

    update() {
        this.resetMidiInstruments()
        this.resetListeners()
        this.initMidiPlayer()
        return this
    }



    //// Experimantal

    getMidiInput() {
        var that = this
        var navigator = require('web-midi-api');
        // consider using var navigator = require('jzz');

        var midi;
        var inputs;
        var outputs;

        function onMIDIFailure(msg) {
            console.log('Failed to get MIDI access - ' + msg);
            //process?.exit(1);
        }

        function onMIDISuccess(midiAccess) {
            midi = midiAccess;
            inputs = midi.inputs;
            outputs = midi.outputs;
            console.log("general midi info:", midi)
            setTimeout(testOutputs, 100);
        }

        function testOutputs() {
            console.log('Testing MIDI-Out ports...');
            outputs.forEach(function (port) {
                console.log('id:', port.id, 'manufacturer:', port.manufacturer, 'name:', port.name, 'version:', port.version);
                port.open();
                port.send([0x90, 60, 0x7f])
            });
            setTimeout(stopOutputs, 1000);
        }

        function stopOutputs() {
            outputs.forEach(function (port) {
                port.send([0x80, 60, 0]);
            });
            testInputs();
        }

        function onMidiIn(ev) {
            document.dispatchEvent(new CustomEvent("midiin", { detail: ev.data })) // goes to KeyModeHandler since there already most of the logic is implemented
        }

        function testInputs() {
            console.log('Testing MIDI-In ports...');
            inputs.forEach(function (port) {
                console.log('id:', port.id, 'manufacturer:', port.manufacturer, 'name:', port.name, 'version:', port.version);
                port.onmidimessage = onMidiIn;
            });
            //setTimeout(stopInputs, 5000);
        }

        function fillDeviceList(e) {
            var deviceList = cq.getContainer(that.containerId)?.querySelector("#midiDeviceSelect")
            if (deviceList === null) return
            var value = e.port.name
            if (e.port.type === "input" && !e.port.name.includes("EDITOR")) {
                var optionEntry = deviceList.querySelector("option[value='" + value + "']")
                if (optionEntry !== null) {
                    optionEntry.remove()
                    console.log("Removed MIDI Device", e.port)
                } else {
                    var option = document.createElement("option")
                    option.setAttribute("value", value)
                    option.textContent = e.port.manufacturer + " " + e.port.name
                    deviceList.append(option)
                    console.log("Added MIDI Device", e.port)
                }
                deviceList.removeEventListener("change", chooseInput)
                deviceList.addEventListener("change", chooseInput)
            }
        }

        function chooseInput(e: Event) {
            var target = e.target as Element
            console.log(e, (target as any).value)
            inputs.forEach(port => {
                if ((target as any).value === port.name) {
                    port.onmidimessage = onMidiIn;
                    console.log("Chosen MIDI Device", port)
                } else {
                    port.close()
                }
            })
        }

        navigator.requestMIDIAccess().then(access => {
            console.log(access)
            access.onstatechange = (e) => {
                fillDeviceList(e)
            }
            onMIDISuccess(access);
            onMIDIFailure(access);
        });
    }
}

export default MusicProcessor;

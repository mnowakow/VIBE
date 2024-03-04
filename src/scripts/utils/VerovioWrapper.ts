import { VerovioMessage, VerovioResponse } from './Types';
import { Midi } from "@tonejs/midi";
import { Buffer } from "buffer";


//@ts-ignore
//const $ = H5P.jQuery;

/**
 * A wrapper around the verovio web worker to permit mocking in tests.
 */
export default class VerovioWrapper {
  public vrvToolkit: any;
  public data: VerovioMessage;
  private r: number
  private widthValue: number
  private heightValue: number
  private options: { [key: string]: any }

  constructor() {
    //@ts-ignore
    this.vrvToolkit = new verovio.toolkit() || null;
    this.r = 1
    if (this.isRetina()) {
      this.r = 2
    }
    this.widthValue = 1500
    var pageWidth = (this.widthValue / (window.devicePixelRatio / this.r)) / (screen.availHeight / window.innerWidth)

    this.options = {
      footer: 'none',
      header: 'none',
      pageMarginLeft: 50,
      pageMarginTop: 50,
      adjustPageHeight: true,
      font: 'Bravura',
      //pageWidth: pageWidth, // adjust size with window size
      //pageHeight: pageWidth / 4,
      //justifyVertically: true,
      svgViewBox: true,
    }
    this.vrvToolkit.setOptions(this.options)
  }

  /**
   * Detect, if retina display is used.
   * This will be important to adjust the pagewith with the given zoom level
   * @returns 
   */
  isRetina() {
    if (window.matchMedia) {
      var mq = window.matchMedia("only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)");
      return (mq && mq.matches);
    }
  }

  setMessage(data: VerovioMessage): VerovioResponse {
    this.r = 1
    if (this.isRetina()) {
      this.r = 2
    }

    this.vrvToolkit.setOptions({
      //pageWidth: (this.vrvToolkit.getOptions().pageWidth / (window.devicePixelRatio / this.r)) / (screen.availHeight / window.innerWidth)
      pageWidth: (this.widthValue / (window.devicePixelRatio / this.r)) / (screen.availHeight / window.innerWidth)
    })

    this.data = data || null;

    var result: VerovioResponse = {
      id: data.id
    };

    switch (data.action) {
      case 'renderData':
        result.svg = this.renderData();
        break;
      case 'getElementAttr':
        result.attributes = this.getElementAttr();
        break;
      case 'getTimeForElement':
        result.time = this.getTimeForElement();
        break;
      case "getTimesForElement":
        result.times = this.getTimesForElement();
      case 'edit':
        result.result = this.edit();
        break;
      case 'getMEI':
        result.mei = this.getMEI();
        break;
      case 'editInfo':
        result.info = this.editInfo();
        break;
      case 'renderToSVG':
        result.svg = this.renderToSVG(data.pageNo);
        break;
      case 'renderToMidi':
        result.midi = this.renderToMidi();
      default:
        break;
    }

    return result;
  }

  getID() {
    return this.data.id;
  }

  renderData(): string {
    var meiString
    if (this.data.isUrl) {
      const req = new XMLHttpRequest();
      req.open('GET', this.data.mei, false);
      //req.onload = () => req.status === 200 ? resolve(req.response) : reject(Error(req.statusText));
      //req.onerror = (e) => reject(Error(`Network Error: ` + e));
      req.send();
      if (req.status === 200) {
        meiString = req.response
      }
    }
    else {
      meiString = this.data.mei
    }

    var render = this.vrvToolkit.renderData(meiString, {})
    // when page count reaches 2 then each one should be rendered seperately
    return render
  }

  getElementAttr() {
    return this.vrvToolkit.getElementAttr(this.data.elementId)
  }

  getTimeForElement() {
    return this.vrvToolkit.getTimeForElement(this.data.elementId)
  }

  getTimesForElement() {
    return this.vrvToolkit.getTimesForElement(this.data.elementId)
  }

  edit() {
    return this.vrvToolkit.edit(this.data.editorAction);
  }

  getMEI() {
    return this.vrvToolkit.getMEI({
      pageNo: 0,
      scoreBased: true
    })
  }

  editInfo() {
    return this.vrvToolkit.editInfo();
  }

  renderToSVG(pageNo:number) {
    return this.vrvToolkit.renderToSVG(pageNo);
  }

  renderToMidi() {
    return this.vrvToolkit.renderToMIDI();
  }

  getMidiJSON(){
    var midiString = this.renderToMidi()
    var buffer = Buffer.from(midiString, "base64")
    return new Midi(buffer)
  }

  getTimemap(){
    return this.vrvToolkit.renderToTimemap()
  }

  /**
   * Get Toolkit instance to use any method of verovio outside of score editor.
   * FOr all available methods go to: https://book.verovio.org/toolkit-reference/toolkit-methods.html
   * @returns toolkit instance
   */
  getToolkit() {
    return this.vrvToolkit
  }

  getOptions() {
    return this.options
  }

  setWidthValue(wv: number | string) {
    if(typeof wv === "string") wv = parseFloat(wv as string)
    this.options.pageWidth = wv
    this.vrvToolkit.setOptions(this.options)
  }

  setHeightValue(hv: number | string) {
    if(typeof hv === "string") hv = parseFloat(hv as string)
    this.options.pageHeight = hv + 250
    this.vrvToolkit.setOptions(this.options)
  }

}
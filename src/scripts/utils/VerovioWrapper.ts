import { VerovioMessage, VerovioResponse } from './Types';

//@ts-ignore
//const $ = H5P.jQuery;

/**
 * A wrapper around the verovio web worker to permit mocking in tests.
 */
export default class VerovioWrapper {
    public vrvToolkit: any;
    public data: VerovioMessage;
    
    constructor() {
      //@ts-ignore
      this.vrvToolkit = new verovio.toolkit() || null;
      var r = 1
      if(this.isRetina()){
        r = 2
      }
      this.vrvToolkit.setOptions({
          // from: 'mei',
          footer: 'none',
          header: 'none',
          pageMarginLeft: 50,
          pageMarginTop: 100,
          pageMarginBottom: 10,
          font: 'Bravura',
          //adjustPageWidth: 0,
          //adjustPageHeight: 0,
          noJustification: 1,
          pageWidth: (2500 / (window.devicePixelRatio / r)) / (screen.availHeight / window.innerWidth), // adjust size with window size
          svgRemoveXlink: true,
          svgViewBox: true, 
          //svgBoundingBoxes: true
          //pageHeight: 60000
      })
    }

    /**
     * Detect, if retina display is used.
     * This will be important to adjust the pagewith with the given zoom level
     * @returns 
     */
    isRetina(){
      if (window.matchMedia) {
        var mq = window.matchMedia("only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)");
        return (mq && mq.matches); 
      }
    }

    setMessage(data: VerovioMessage): VerovioResponse{
        this.data = data || null;

        var result: VerovioResponse = {
            id: data.id
          };

        switch (data.action) {
            case 'renderData':
                result.mei = this.renderData();  
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
              result.svg = this.renderToSVG();
              break;
            case 'renderToMidi':
              result.midi = this.renderToMidi();
            default:
              break;
          }

          return result;
    }

    getID(){
        return this.data.id;
    }

    renderData(): string{
      var meiString
      if(this.data.isUrl){
      //   $.ajax({
      //       url: this.data.mei,
      //       dataType: "text",
      //       async: false
      //   })
      //   .done((res: string) =>{
      //     console.log(Object.prototype.toString.call(res))
      //     meiString = res
      //     return this.vrvToolkit.renderData(meiString, {})
      //   })

        const req = new XMLHttpRequest();
        req.open('GET', this.data.mei, false);
        //req.onload = () => req.status === 200 ? resolve(req.response) : reject(Error(req.statusText));
        //req.onerror = (e) => reject(Error(`Network Error: ` + e));
        req.send();
        if(req.status === 200){
          meiString = req.response
        }
      }
      else{
        meiString = this.data.mei
      }

      return this.vrvToolkit.renderData(meiString, {})
    }

    getElementAttr(){
        return this.vrvToolkit.getElementAttr(this.data.elementId)
    }

    getTimeForElement(){
      return this.vrvToolkit.getTimeForElement(this.data.elementId)
    }

    getTimesForElement(){
      return this.vrvToolkit.getTimesForElement(this.data.elementId)
    }

    edit(){
      return this.vrvToolkit.edit(this.data.editorAction);
    }

    getMEI(){
      return this.vrvToolkit.getMEI({
          pageNo: 0,
          scoreBased: true
      })
    }

    editInfo(){
      return this.vrvToolkit.editInfo();
    }

    renderToSVG(){
      return this.vrvToolkit.renderToSVG(1);
    }

    renderToMidi(){
      return this.vrvToolkit.renderToMIDI();
    }

    /**
     * Get Toolkit instance to use any method of verovio outside of score editor.
     * FOr all available methods go to: https://book.verovio.org/toolkit-reference/toolkit-methods.html
     * @returns toolkit instance
     */
    getToolkit(){
      return this.vrvToolkit
    }
    
}
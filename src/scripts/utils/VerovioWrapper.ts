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
      
      this.vrvToolkit.setOptions({
          // from: 'mei',
          footer: 'none',
          header: 'none',
          pageMarginLeft: 50,
          pageMarginTop: 100,
          pageMarginBottom: 10,
          font: 'Bravura',
          adjustPageWidth: 0,
          adjustPageHeight: 0,
          pageWidth: 1800
      })
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

    
}
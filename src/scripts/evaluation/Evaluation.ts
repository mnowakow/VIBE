/**
 * Abstract Class for all evaluation / submission classes. Handles communication via xAPI.
 */
//@ts-ignore
abstract class Evaluation extends H5P.EventDispatcher {

    constructor(){
        super()
        this.setXAPIListeners()
    }
    
    /**
     * 
     */
    setXAPIListeners(){
        //@ts-ignore
        H5P.externalDispatcher.on('xAPI', function(event){
                console.log(event);
            }
        );
    }

    /**
     * 
     */
    abstract setListeners(): void

    /**
     * 
     * @param e 
     */
    abstract submit(e: Event): void

    /**
     * Has to be called when submit is done
     * @param verb keyword for xAPI Message
     * @param extra Object to be sent 
     */
    sendXAPI(verb: string, extra: Object){
        //@ts-ignore
        this.triggerXAPI(verb, extra)
    }

    evaluate(): void{
        //TODO
    }

}

export default Evaluation
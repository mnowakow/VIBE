import ScoreGraph from "./ScoreGraph"

class ScoreNode{

    private up: ScoreNode
    private right: ScoreNode
    private down: ScoreNode
    private left: ScoreNode
    private id: string
    private timeCode: number
    private docElement: Element

    constructor(id: string){
        this.id = id
        this.setDocElement()
    }

    hasNodeAnywhere(sn: ScoreNode){
        if([this.up, this.down, this.left, this.right].indexOf(sn) > -1){
            return true
        }

        return false
    }

    printElements(){
        var u, d, r, l
        u = d = r = l = null
        var c = document.getElementById(this.id)
        if(this.up !== null){
            u = document.getElementById(this.up.id)
        }

        if(this.down !== null){
            d = document.getElementById(this.down.id)
        }

        if(this.left !== null){
            l = document.getElementById(this.left.id)
        }

        if(this.right !== null){
            r = document.getElementById(this.right.id)
        }

        console.log("CURRENT", c, "UP", u, "DOWN", d, "LEFT", l, "RIGHT", r)
    }

    isBOL(): Boolean{
        return this.id.indexOf("BOL") > -1
    }

    isLayer(): Boolean{
        return document.getElementById(this.id).classList.contains("layer")
    }

    getId(){
        return this.id
    }

    getUp(){
        return this.up
    }

    getDown(){
        return this.down
    }

    getLeft(){
        return this.left
    }

    getRight(){
        return this.right
    }

    getTimeCode(){
        return this.timeCode
    }

    getDocElement(){
        return this.docElement || document.getElementById(this.id) || null
    }

    setUp(sn: ScoreNode){
        this.up = sn
    }

    setDown(sn: ScoreNode){
        this.down = sn
    }

    setLeft(sn: ScoreNode){
        this.left = sn
    }

    setRight(sn: ScoreNode){
        this.right = sn
    }

    setTimeCode(tc: number){
        this.timeCode = tc
    }

    setDocElement(){
        this.docElement = document.getElementById(this.id)
    }

    


}

export default ScoreNode
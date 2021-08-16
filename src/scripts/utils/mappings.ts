const idxNoteMapGClef: Map<number, string> = new Map();
idxNoteMapGClef.set(0, "f5")
idxNoteMapGClef.set(1, "e5")
idxNoteMapGClef.set(2, "d5")
idxNoteMapGClef.set(3, "c5")
idxNoteMapGClef.set(4, "b4")
idxNoteMapGClef.set(5, "a4")
idxNoteMapGClef.set(6, "g4")
idxNoteMapGClef.set(7, "f4")
idxNoteMapGClef.set(8, "e4")

const idxNoteMapFClef: Map<number, string> = new Map();
idxNoteMapFClef.set(0, "a3")
idxNoteMapFClef.set(1, "g3")
idxNoteMapFClef.set(2, "f3")
idxNoteMapFClef.set(3, "e3")
idxNoteMapFClef.set(4, "d3")
idxNoteMapFClef.set(5, "c3")
idxNoteMapFClef.set(6, "b2")
idxNoteMapFClef.set(7, "a2")
idxNoteMapFClef.set(8, "g2")

const idxNoteMapCClef: Map<number, string> = new Map();
idxNoteMapCClef.set(0, "g4")
idxNoteMapCClef.set(1, "f4")
idxNoteMapCClef.set(2, "e4")
idxNoteMapCClef.set(3, "d4")
idxNoteMapCClef.set(4, "c4")
idxNoteMapCClef.set(5, "b3")
idxNoteMapCClef.set(6, "a3")
idxNoteMapCClef.set(7, "g3")
idxNoteMapCClef.set(8, "f3")

const idxNotePhantomMapAboveG: Map<number, string> = new Map();
idxNotePhantomMapAboveG.set(0, "g5")
idxNotePhantomMapAboveG.set(1, "a5")
idxNotePhantomMapAboveG.set(2, "b5")
idxNotePhantomMapAboveG.set(3, "c6")
idxNotePhantomMapAboveG.set(4, "d6")
idxNotePhantomMapAboveG.set(5, "e6")
idxNotePhantomMapAboveG.set(6, "f6")
idxNotePhantomMapAboveG.set(7, "g6")
idxNotePhantomMapAboveG.set(8, "a6")
idxNotePhantomMapAboveG.set(9, "b6")
idxNotePhantomMapAboveG.set(10, "c7")
idxNotePhantomMapAboveG.set(11, "d7")
idxNotePhantomMapAboveG.set(12, "e7")
idxNotePhantomMapAboveG.set(13, "f7")
idxNotePhantomMapAboveG.set(14, "g7")
idxNotePhantomMapAboveG.set(15, "a7")
idxNotePhantomMapAboveG.set(16, "b7")
idxNotePhantomMapAboveG.set(17, "c8")

const idxNotePhantomMapBelowG: Map<number, string> = new Map();
idxNotePhantomMapBelowG.set(0, "d4")
idxNotePhantomMapBelowG.set(1, "c4")
idxNotePhantomMapBelowG.set(2, "b3")
idxNotePhantomMapBelowG.set(3, "a3")
idxNotePhantomMapBelowG.set(4, "g3")
idxNotePhantomMapBelowG.set(5, "f3")
idxNotePhantomMapBelowG.set(6, "e3")
idxNotePhantomMapBelowG.set(7, "d3")
idxNotePhantomMapBelowG.set(8, "c3")
idxNotePhantomMapBelowG.set(9, "b2")
idxNotePhantomMapBelowG.set(10, "a2")
idxNotePhantomMapBelowG.set(11, "g2")
idxNotePhantomMapBelowG.set(12, "f2")
idxNotePhantomMapBelowG.set(13, "e2")
idxNotePhantomMapBelowG.set(14, "d2")
idxNotePhantomMapBelowG.set(15, "c2")
idxNotePhantomMapBelowG.set(16, "b1")
idxNotePhantomMapBelowG.set(17, "a1")
idxNotePhantomMapBelowG.set(18, "g1")
idxNotePhantomMapBelowG.set(19, "f1")
idxNotePhantomMapBelowG.set(20, "e1")
idxNotePhantomMapBelowG.set(21, "d1")
idxNotePhantomMapBelowG.set(22, "c2")
idxNotePhantomMapBelowG.set(23, "b0")
idxNotePhantomMapBelowG.set(24, "a0")

const idxNotePhantomMapAboveF: Map<number, string> = new Map();
idxNotePhantomMapAboveF.set(0, "b3")
idxNotePhantomMapAboveF.set(1, "c4")
idxNotePhantomMapAboveF.set(2, "d4")
idxNotePhantomMapAboveF.set(3, "e4")
idxNotePhantomMapAboveF.set(4, "f4")
idxNotePhantomMapAboveF.set(5, "g4")
idxNotePhantomMapAboveF.set(6, "a4")
idxNotePhantomMapAboveF.set(7, "b4")
idxNotePhantomMapAboveF.set(8, "c5")
idxNotePhantomMapAboveF.set(9, "d5")
idxNotePhantomMapAboveF.set(10, "e5")
idxNotePhantomMapAboveF.set(11, "f5")
idxNotePhantomMapAboveF.set(12, "g5")
idxNotePhantomMapAboveF.set(13, "a5")
idxNotePhantomMapAboveF.set(14, "b5")
idxNotePhantomMapAboveF.set(15, "c6")
idxNotePhantomMapAboveF.set(16, "d6")
idxNotePhantomMapAboveF.set(17, "e6")

const idxNotePhantomMapBelowF: Map<number, string> = new Map();
idxNotePhantomMapBelowF.set(0, "f2")
idxNotePhantomMapBelowF.set(1, "e2")
idxNotePhantomMapBelowF.set(2, "d2")
idxNotePhantomMapBelowF.set(3, "c2")
idxNotePhantomMapBelowF.set(4, "b1")
idxNotePhantomMapBelowF.set(5, "a1")
idxNotePhantomMapBelowF.set(6, "g1")
idxNotePhantomMapBelowF.set(7, "f1")
idxNotePhantomMapBelowF.set(8, "e1")
idxNotePhantomMapBelowF.set(9, "d1")
idxNotePhantomMapBelowF.set(10, "c1")
idxNotePhantomMapBelowF.set(11, "b0")
idxNotePhantomMapBelowF.set(12, "a0")
idxNotePhantomMapBelowF.set(13, "g0")
idxNotePhantomMapBelowF.set(14, "f0")
idxNotePhantomMapBelowF.set(15, "e0")
idxNotePhantomMapBelowF.set(16, "d0")
idxNotePhantomMapBelowF.set(17, "c0")


const idxNotePhantomMapAboveC: Map<number, string> = new Map();
idxNotePhantomMapAboveC.set(0, "a4")
idxNotePhantomMapAboveC.set(1, "b4")
idxNotePhantomMapAboveC.set(2, "c5")
idxNotePhantomMapAboveC.set(3, "d5")
idxNotePhantomMapAboveC.set(4, "e5")
idxNotePhantomMapAboveC.set(5, "f5")
idxNotePhantomMapAboveC.set(6, "g5")
idxNotePhantomMapAboveC.set(7, "a5")
idxNotePhantomMapAboveC.set(8, "b5")
idxNotePhantomMapAboveC.set(9, "c6")
idxNotePhantomMapAboveC.set(10, "d6")
idxNotePhantomMapAboveC.set(11, "e6")
idxNotePhantomMapAboveC.set(12, "f6")
idxNotePhantomMapAboveC.set(13, "g6")
idxNotePhantomMapAboveC.set(14, "a6")
idxNotePhantomMapAboveC.set(15, "b6")
idxNotePhantomMapAboveC.set(16, "c7")
idxNotePhantomMapAboveC.set(17, "d7")

const idxNotePhantomMapBelowC: Map<number, string> = new Map();
idxNotePhantomMapBelowC.set(0, "e3")
idxNotePhantomMapBelowC.set(1, "d3")
idxNotePhantomMapBelowC.set(2, "c3")
idxNotePhantomMapBelowC.set(3, "b2")
idxNotePhantomMapBelowC.set(4, "a2")
idxNotePhantomMapBelowC.set(5, "g2")
idxNotePhantomMapBelowC.set(6, "f2")
idxNotePhantomMapBelowC.set(7, "e2")
idxNotePhantomMapBelowC.set(8, "d2")
idxNotePhantomMapBelowC.set(9, "c2")
idxNotePhantomMapBelowC.set(10, "b1")
idxNotePhantomMapBelowC.set(11, "a1")
idxNotePhantomMapBelowC.set(12, "g1")
idxNotePhantomMapBelowC.set(13, "f1")
idxNotePhantomMapBelowC.set(14, "e1")
idxNotePhantomMapBelowC.set(15, "d1")
idxNotePhantomMapBelowC.set(16, "c1")
idxNotePhantomMapBelowC.set(17, "b0")
idxNotePhantomMapBelowC.set(18, "a0")
idxNotePhantomMapBelowC.set(19, "g0")
idxNotePhantomMapBelowC.set(20, "f0")
idxNotePhantomMapBelowC.set(21, "e0")
idxNotePhantomMapBelowC.set(22, "d0")
idxNotePhantomMapBelowC.set(23, "c0")



const keyCodeNoteMap: Map<string, string> = new Map;
keyCodeNoteMap.set("KeyC", "c");
keyCodeNoteMap.set("KeyD", "d");
keyCodeNoteMap.set("KeyE", "e");
keyCodeNoteMap.set("KeyF", "f");
keyCodeNoteMap.set("KeyG", "g");
keyCodeNoteMap.set("KeyA", "a");
keyCodeNoteMap.set("KeyB", "b");
keyCodeNoteMap.set("KeyH", "b"); //alternative when keydown h


const idToClef: Map<string, string> = new Map;
idToClef.set("#E050", "G");
idToClef.set("#E062", "F");
idToClef.set("#E05C", "C");

const noteToCross: Map<string, string> = new Map;
noteToCross.set("f", "f#")
noteToCross.set("c", "c#")
noteToCross.set("g", "g#")
noteToCross.set("d", "d#")
noteToCross.set("a", "a#")
noteToCross.set("e", "e#")
noteToCross.set("b", "b#")

const noteToB: Map<string, string> = new Map;
noteToB.set("b", "bb")
noteToB.set("e", "eb")
noteToB.set("a", "ab")
noteToB.set("d", "db")
noteToB.set("g", "gb")
noteToB.set("c", "cb")
noteToB.set("f", "fb")

const nextStepDown: Map<string, string> = new Map;
nextStepDown.set("b", "bf")
nextStepDown.set("bf", "a")
nextStepDown.set("as", "a")
nextStepDown.set("a", "af")
nextStepDown.set("gs", "g")
nextStepDown.set("af", "g")
nextStepDown.set("g", "gf")
nextStepDown.set("fs", "f")
nextStepDown.set("gf", "f")
nextStepDown.set("es", "e")
nextStepDown.set("f", "e")
nextStepDown.set("e", "ef")
nextStepDown.set("ds", "d")
nextStepDown.set("ef", "d")
nextStepDown.set("d", "df")
nextStepDown.set("cs", "c")
nextStepDown.set("df", "c")
nextStepDown.set("bs", "b")
nextStepDown.set("c", "b")

const nextStepUp: Map<string, string> = new Map;
nextStepUp.set("c", "cs")
nextStepUp.set("cs", "d")
nextStepUp.set("df", "d")
nextStepUp.set("d", "ds")
nextStepUp.set("ds", "e")
nextStepUp.set("ef", "e")
nextStepUp.set("ff", "f")
nextStepUp.set("e", "f")
nextStepUp.set("f", "fs")
nextStepUp.set("gf", "g")
nextStepUp.set("fs", "g")
nextStepUp.set("g", "gs")
nextStepUp.set("af", "a")
nextStepUp.set("gs", "a")
nextStepUp.set("a", "as")
nextStepUp.set("bf", "b")
nextStepUp.set("as", "b")
nextStepUp.set("cf", "c")
nextStepUp.set("b", "c")


const keysigToNotes: Map<string, Array<string>> = new Map;
keysigToNotes.set("0", [])
keysigToNotes.set("1s", ["f"])
keysigToNotes.set("2s", ["f", "c"])
keysigToNotes.set("3s", ["f", "c", "g"])
keysigToNotes.set("4s", ["f", "c", "g", "d"])
keysigToNotes.set("5s", ["f", "c", "g", "d", "a"])
keysigToNotes.set("6s", ["f", "c", "g", "d", "a", "e"])
keysigToNotes.set("1f", ["b"])
keysigToNotes.set("2f", ["b", "e"])
keysigToNotes.set("3f", ["b", "e", "a"])
keysigToNotes.set("4f", ["b", "e", "a", "d"])
keysigToNotes.set("5f", ["b", "e", "a", "d", "g"])
keysigToNotes.set("6f", ["b", "e", "a", "d", "g", "c"])

const keyIdToSig: Map<string, string> = new Map;
keyIdToSig.set("KeyGMaj", "1s")
keyIdToSig.set("KeyDMaj", "2s")
keyIdToSig.set("KeyAMaj", "3s")
keyIdToSig.set("KeyEMaj", "4s")
keyIdToSig.set("KeyBMaj", "5s")
keyIdToSig.set("KeyF#Maj", "6s")
keyIdToSig.set("KeyFMaj", "1f")
keyIdToSig.set("KeyBbMaj", "2f")
keyIdToSig.set("KeyEbMaj", "3f")
keyIdToSig.set("KeyAbMaj", "4f")
keyIdToSig.set("KeyDbMaj", "5f")
keyIdToSig.set("KeyGbMaj", "6f")
keyIdToSig.set("KeyCMaj", "0")

export {
    idxNoteMapGClef, 
    idxNoteMapFClef, 
    idxNoteMapCClef,
    idxNotePhantomMapAboveG,
    idxNotePhantomMapBelowG,
    idxNotePhantomMapAboveF,
    idxNotePhantomMapBelowF,
    idxNotePhantomMapAboveC,
    idxNotePhantomMapBelowC,
    keyCodeNoteMap, 
    idToClef, 
    noteToCross, 
    noteToB, 
    keysigToNotes, 
    keyIdToSig, 
    nextStepUp, 
    nextStepDown
};
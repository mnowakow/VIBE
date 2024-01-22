/**
 * Pitch to Clef Mapping
 */
export const idxNoteMapGClef: Map<number, string> = new Map();
idxNoteMapGClef.set(0, "f5")
idxNoteMapGClef.set(1, "e5")
idxNoteMapGClef.set(2, "d5")
idxNoteMapGClef.set(3, "c5")
idxNoteMapGClef.set(4, "b4")
idxNoteMapGClef.set(5, "a4")
idxNoteMapGClef.set(6, "g4")
idxNoteMapGClef.set(7, "f4")
idxNoteMapGClef.set(8, "e4")

export const idxNoteMapGClefOctUp: Map<number, string> = new Map();
idxNoteMapGClef.forEach((v, k) => idxNoteMapGClefOctUp.set(k, v[0] + (parseInt(v[1]) + 1).toString()))

export const idxNoteMapGClefOctDown: Map<number, string> = new Map();
idxNoteMapGClef.forEach((v, k) => idxNoteMapGClefOctDown.set(k, v[0] + (parseInt(v[1]) - 1).toString()))

export const idxNoteMapFClef: Map<number, string> = new Map();
idxNoteMapFClef.set(0, "a3")
idxNoteMapFClef.set(1, "g3")
idxNoteMapFClef.set(2, "f3")
idxNoteMapFClef.set(3, "e3")
idxNoteMapFClef.set(4, "d3")
idxNoteMapFClef.set(5, "c3")
idxNoteMapFClef.set(6, "b2")
idxNoteMapFClef.set(7, "a2")
idxNoteMapFClef.set(8, "g2")

export const idxNoteMapFClefOctUp: Map<number, string> = new Map();
idxNoteMapFClef.forEach((v, k) => idxNoteMapFClefOctUp.set(k, v[0] + (parseInt(v[1]) + 1).toString()))

export const idxNoteMapFClefOctDown: Map<number, string> = new Map();
idxNoteMapFClef.forEach((v, k) => idxNoteMapFClefOctDown.set(k, v[0] + (parseInt(v[1]) - 1).toString()))

export const idxNotePhantomMapAboveG: Map<number, string> = new Map();
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

export const idxNotePhantomMapAboveGOctUp: Map<number, string> = new Map();
idxNotePhantomMapAboveG.forEach((v, k) => idxNotePhantomMapAboveGOctUp.set(k, v[0] + (parseInt(v[1]) + 1).toString()))

export const idxNotePhantomMapAboveGOctDown: Map<number, string> = new Map();
idxNotePhantomMapAboveG.forEach((v, k) => idxNotePhantomMapAboveGOctDown.set(k, v[0] + (parseInt(v[1]) - 1).toString()))

export const idxNotePhantomMapBelowG: Map<number, string> = new Map();
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

export const idxNotePhantomMapBelowGOctUp: Map<number, string> = new Map();
idxNotePhantomMapBelowG.forEach((v, k) => idxNotePhantomMapBelowGOctUp.set(k, v[0] + (parseInt(v[1]) + 1).toString()))

export const idxNotePhantomMapBelowGOctDown: Map<number, string> = new Map();
idxNotePhantomMapBelowG.forEach((v, k) => idxNotePhantomMapBelowGOctUp.set(k, v[0] + (parseInt(v[1]) - 1).toString()))

export const idxNotePhantomMapAboveF: Map<number, string> = new Map();
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

export const idxNotePhantomMapAboveFOctUp: Map<number, string> = new Map();
idxNotePhantomMapAboveF.forEach((v, k) => idxNotePhantomMapAboveFOctUp.set(k, v[0] + (parseInt(v[1]) + 1).toString()))

export const idxNotePhantomMapAboveFOctDown: Map<number, string> = new Map();
idxNotePhantomMapAboveF.forEach((v, k) => idxNotePhantomMapAboveFOctDown.set(k, v[0] + (parseInt(v[1]) - 1).toString()))

export const idxNotePhantomMapBelowF: Map<number, string> = new Map();
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

export const idxNotePhantomMapBelowFOctUp: Map<number, string> = new Map();
idxNotePhantomMapBelowF.forEach((v, k) => idxNotePhantomMapBelowFOctUp.set(k, v[0] + (parseInt(v[1]) + 1).toString()))

export const idxNotePhantomMapBelowFOctDown: Map<number, string> = new Map();
idxNotePhantomMapBelowF.forEach((v, k) => idxNotePhantomMapBelowFOctDown.set(k, v[0] + (parseInt(v[1]) - 1).toString()))


export const idxNoteMapCClefAlto: Map<number, string> = new Map();
idxNoteMapCClefAlto.set(0, "g4")
idxNoteMapCClefAlto.set(1, "f4")
idxNoteMapCClefAlto.set(2, "e4")
idxNoteMapCClefAlto.set(3, "d4")
idxNoteMapCClefAlto.set(4, "c4")
idxNoteMapCClefAlto.set(5, "b3")
idxNoteMapCClefAlto.set(6, "a3")
idxNoteMapCClefAlto.set(7, "g3")
idxNoteMapCClefAlto.set(8, "f3")

export const idxNotePhantomMapAboveCAlto: Map<number, string> = new Map();
idxNotePhantomMapAboveCAlto.set(0, "a4")
idxNotePhantomMapAboveCAlto.set(1, "b4")
idxNotePhantomMapAboveCAlto.set(2, "c5")
idxNotePhantomMapAboveCAlto.set(3, "d5")
idxNotePhantomMapAboveCAlto.set(4, "e5")
idxNotePhantomMapAboveCAlto.set(5, "f5")
idxNotePhantomMapAboveCAlto.set(6, "g5")
idxNotePhantomMapAboveCAlto.set(7, "a5")
idxNotePhantomMapAboveCAlto.set(8, "b5")
idxNotePhantomMapAboveCAlto.set(9, "c6")
idxNotePhantomMapAboveCAlto.set(10, "d6")
idxNotePhantomMapAboveCAlto.set(11, "e6")
idxNotePhantomMapAboveCAlto.set(12, "f6")
idxNotePhantomMapAboveCAlto.set(13, "g6")
idxNotePhantomMapAboveCAlto.set(14, "a6")
idxNotePhantomMapAboveCAlto.set(15, "b6")
idxNotePhantomMapAboveCAlto.set(16, "c7")
idxNotePhantomMapAboveCAlto.set(17, "d7")

export const idxNotePhantomMapBelowCAlto: Map<number, string> = new Map();
idxNotePhantomMapBelowCAlto.set(0, "e3")
idxNotePhantomMapBelowCAlto.set(1, "d3")
idxNotePhantomMapBelowCAlto.set(2, "c3")
idxNotePhantomMapBelowCAlto.set(3, "b2")
idxNotePhantomMapBelowCAlto.set(4, "a2")
idxNotePhantomMapBelowCAlto.set(5, "g2")
idxNotePhantomMapBelowCAlto.set(6, "f2")
idxNotePhantomMapBelowCAlto.set(7, "e2")
idxNotePhantomMapBelowCAlto.set(8, "d2")
idxNotePhantomMapBelowCAlto.set(9, "c2")
idxNotePhantomMapBelowCAlto.set(10, "b1")
idxNotePhantomMapBelowCAlto.set(11, "a1")
idxNotePhantomMapBelowCAlto.set(12, "g1")
idxNotePhantomMapBelowCAlto.set(13, "f1")
idxNotePhantomMapBelowCAlto.set(14, "e1")
idxNotePhantomMapBelowCAlto.set(15, "d1")
idxNotePhantomMapBelowCAlto.set(16, "c1")
idxNotePhantomMapBelowCAlto.set(17, "b0")
idxNotePhantomMapBelowCAlto.set(18, "a0")
idxNotePhantomMapBelowCAlto.set(19, "g0")
idxNotePhantomMapBelowCAlto.set(20, "f0")
idxNotePhantomMapBelowCAlto.set(21, "e0")
idxNotePhantomMapBelowCAlto.set(22, "d0")
idxNotePhantomMapBelowCAlto.set(23, "c0")


export const idxNoteMapCClefSoprano: Map<number, string> = new Map();
idxNoteMapCClefSoprano.set(0, "d5")
idxNoteMapCClefSoprano.set(1, "c5")
idxNoteMapCClefSoprano.set(2, "b4")
idxNoteMapCClefSoprano.set(3, "a4")
idxNoteMapCClefSoprano.set(4, "g4")
idxNoteMapCClefSoprano.set(5, "f4")
idxNoteMapCClefSoprano.set(6, "e4")
idxNoteMapCClefSoprano.set(7, "d4")
idxNoteMapCClefSoprano.set(8, "c4")

export const idxNotePhantomMapAboveCSoprano: Map<number, string> = new Map();
idxNotePhantomMapAboveCSoprano.set(0, "e5");
idxNotePhantomMapAboveCSoprano.set(1, "f5");
idxNotePhantomMapAboveCSoprano.set(2, "g5");
idxNotePhantomMapAboveCSoprano.set(3, "a5");
idxNotePhantomMapAboveCSoprano.set(4, "b5");
idxNotePhantomMapAboveCSoprano.set(5, "c6");
idxNotePhantomMapAboveCSoprano.set(6, "d6");
idxNotePhantomMapAboveCSoprano.set(7, "e6");
idxNotePhantomMapAboveCSoprano.set(8, "f6");
idxNotePhantomMapAboveCSoprano.set(9, "g6");
idxNotePhantomMapAboveCSoprano.set(10, "a6");
idxNotePhantomMapAboveCSoprano.set(11, "b6");
idxNotePhantomMapAboveCSoprano.set(12, "c7");
idxNotePhantomMapAboveCSoprano.set(13, "d7");
idxNotePhantomMapAboveCSoprano.set(14, "e7");
idxNotePhantomMapAboveCSoprano.set(15, "f7");
idxNotePhantomMapAboveCSoprano.set(16, "g7");


export const idxNotePhantomMapBelowCSoprano: Map<number, string> = new Map();
idxNotePhantomMapBelowCSoprano.set(0, "b3");
idxNotePhantomMapBelowCSoprano.set(1, "a3");
idxNotePhantomMapBelowCSoprano.set(2, "g3");
idxNotePhantomMapBelowCSoprano.set(3, "f3");
idxNotePhantomMapBelowCSoprano.set(4, "e3");
idxNotePhantomMapBelowCSoprano.set(5, "d3");
idxNotePhantomMapBelowCSoprano.set(6, "c3");
idxNotePhantomMapBelowCSoprano.set(7, "b2");
idxNotePhantomMapBelowCSoprano.set(8, "a2");
idxNotePhantomMapBelowCSoprano.set(9, "g2");
idxNotePhantomMapBelowCSoprano.set(10, "f2");
idxNotePhantomMapBelowCSoprano.set(11, "e2");
idxNotePhantomMapBelowCSoprano.set(12, "d2");
idxNotePhantomMapBelowCSoprano.set(13, "c2");
idxNotePhantomMapBelowCSoprano.set(14, "b1");
idxNotePhantomMapBelowCSoprano.set(15, "a1");
idxNotePhantomMapBelowCSoprano.set(16, "g1");
idxNotePhantomMapBelowCSoprano.set(17, "f1");
idxNotePhantomMapBelowCSoprano.set(18, "e1");
idxNotePhantomMapBelowCSoprano.set(19, "d1");
idxNotePhantomMapBelowCSoprano.set(20, "c1");
idxNotePhantomMapBelowCSoprano.set(21, "b0");
idxNotePhantomMapBelowCSoprano.set(22, "a0");
idxNotePhantomMapBelowCSoprano.set(23, "g0");

export const idxNoteMapCClefMezzo: Map<number, string> = new Map();
idxNoteMapCClefMezzo.set(0, "b4");
idxNoteMapCClefMezzo.set(1, "a4");
idxNoteMapCClefMezzo.set(2, "g4");
idxNoteMapCClefMezzo.set(3, "f4");
idxNoteMapCClefMezzo.set(4, "e4");
idxNoteMapCClefMezzo.set(5, "d4");
idxNoteMapCClefMezzo.set(6, "c4");
idxNoteMapCClefMezzo.set(7, "b3");
idxNoteMapCClefMezzo.set(8, "a3");

export const idxNotePhantomMapAboveCMezzo: Map<number, string> = new Map();
idxNotePhantomMapAboveCMezzo.set(0, "c5");
idxNotePhantomMapAboveCMezzo.set(1, "d5");
idxNotePhantomMapAboveCMezzo.set(2, "e5");
idxNotePhantomMapAboveCMezzo.set(3, "f5");
idxNotePhantomMapAboveCMezzo.set(4, "g5");
idxNotePhantomMapAboveCMezzo.set(5, "a5");
idxNotePhantomMapAboveCMezzo.set(6, "b5");
idxNotePhantomMapAboveCMezzo.set(7, "c6");
idxNotePhantomMapAboveCMezzo.set(8, "d6");
idxNotePhantomMapAboveCMezzo.set(9, "e6");
idxNotePhantomMapAboveCMezzo.set(10, "f6");
idxNotePhantomMapAboveCMezzo.set(11, "g6");
idxNotePhantomMapAboveCMezzo.set(12, "a6");
idxNotePhantomMapAboveCMezzo.set(13, "b6");
idxNotePhantomMapAboveCMezzo.set(14, "c7");
idxNotePhantomMapAboveCMezzo.set(15, "d7");
idxNotePhantomMapAboveCMezzo.set(16, "e7");

export const idxNotePhantomMapBelowCMezzo: Map<number, string> = new Map();
idxNotePhantomMapBelowCMezzo.set(0, "g3");
idxNotePhantomMapBelowCMezzo.set(1, "f3");
idxNotePhantomMapBelowCMezzo.set(2, "e3");
idxNotePhantomMapBelowCMezzo.set(3, "d3");
idxNotePhantomMapBelowCMezzo.set(4, "c3");
idxNotePhantomMapBelowCMezzo.set(5, "b2");
idxNotePhantomMapBelowCMezzo.set(6, "a2");
idxNotePhantomMapBelowCMezzo.set(7, "g2");
idxNotePhantomMapBelowCMezzo.set(8, "f2");
idxNotePhantomMapBelowCMezzo.set(9, "e2");
idxNotePhantomMapBelowCMezzo.set(10, "d2");
idxNotePhantomMapBelowCMezzo.set(11, "c2");
idxNotePhantomMapBelowCMezzo.set(12, "b1");
idxNotePhantomMapBelowCMezzo.set(13, "a1");
idxNotePhantomMapBelowCMezzo.set(14, "g1");
idxNotePhantomMapBelowCMezzo.set(15, "f1");
idxNotePhantomMapBelowCMezzo.set(16, "e1");
idxNotePhantomMapBelowCMezzo.set(17, "d1");
idxNotePhantomMapBelowCMezzo.set(18, "c1");
idxNotePhantomMapBelowCMezzo.set(19, "b0");
idxNotePhantomMapBelowCMezzo.set(20, "a0");
idxNotePhantomMapBelowCMezzo.set(21, "g0");
idxNotePhantomMapBelowCMezzo.set(22, "f0");
idxNotePhantomMapBelowCMezzo.set(23, "e0");

export const idxNoteMapCClefTenor: Map<number, string> = new Map();
idxNoteMapCClefTenor.set(0, "e4");
idxNoteMapCClefTenor.set(1, "d4");
idxNoteMapCClefTenor.set(2, "c4");
idxNoteMapCClefTenor.set(3, "b3");
idxNoteMapCClefTenor.set(4, "a3");
idxNoteMapCClefTenor.set(5, "g3");
idxNoteMapCClefTenor.set(6, "f3");
idxNoteMapCClefTenor.set(7, "e3");
idxNoteMapCClefTenor.set(8, "d3");

export const idxNotePhantomMapAboveCTenor: Map<number, string> = new Map();
idxNotePhantomMapAboveCTenor.set(0, "f4");
idxNotePhantomMapAboveCTenor.set(1, "g4");
idxNotePhantomMapAboveCTenor.set(2, "a4");
idxNotePhantomMapAboveCTenor.set(3, "b4");
idxNotePhantomMapAboveCTenor.set(4, "c5");
idxNotePhantomMapAboveCTenor.set(5, "d5");
idxNotePhantomMapAboveCTenor.set(6, "e5");
idxNotePhantomMapAboveCTenor.set(7, "f5");
idxNotePhantomMapAboveCTenor.set(8, "g5");
idxNotePhantomMapAboveCTenor.set(9, "a5");
idxNotePhantomMapAboveCTenor.set(10, "b5");
idxNotePhantomMapAboveCTenor.set(11, "c6");
idxNotePhantomMapAboveCTenor.set(12, "d6");
idxNotePhantomMapAboveCTenor.set(13, "e6");
idxNotePhantomMapAboveCTenor.set(14, "f6");
idxNotePhantomMapAboveCTenor.set(15, "g6");
idxNotePhantomMapAboveCTenor.set(16, "a6");


export const idxNotePhantomMapBelowCTenor: Map<number, string> = new Map();
idxNotePhantomMapBelowCTenor.set(0, "c3");
idxNotePhantomMapBelowCTenor.set(1, "b2");
idxNotePhantomMapBelowCTenor.set(2, "a2");
idxNotePhantomMapBelowCTenor.set(3, "g2");
idxNotePhantomMapBelowCTenor.set(4, "f2");
idxNotePhantomMapBelowCTenor.set(5, "e2");
idxNotePhantomMapBelowCTenor.set(6, "d2");
idxNotePhantomMapBelowCTenor.set(7, "c2");
idxNotePhantomMapBelowCTenor.set(8, "b1");
idxNotePhantomMapBelowCTenor.set(9, "a1");
idxNotePhantomMapBelowCTenor.set(10, "g1");
idxNotePhantomMapBelowCTenor.set(11, "f1");
idxNotePhantomMapBelowCTenor.set(12, "e1");
idxNotePhantomMapBelowCTenor.set(13, "d1");
idxNotePhantomMapBelowCTenor.set(14, "c1");
idxNotePhantomMapBelowCTenor.set(15, "b0");
idxNotePhantomMapBelowCTenor.set(16, "a0");
idxNotePhantomMapBelowCTenor.set(17, "g0");
idxNotePhantomMapBelowCTenor.set(18, "f0");
idxNotePhantomMapBelowCTenor.set(19, "e0");
idxNotePhantomMapBelowCTenor.set(20, "d0");
idxNotePhantomMapBelowCTenor.set(21, "c0");

export const idxNoteMapCClefBariton: Map<number, string> = new Map();
idxNoteMapCClefBariton.set(0, "c4");
idxNoteMapCClefBariton.set(1, "b3");
idxNoteMapCClefBariton.set(2, "a3");
idxNoteMapCClefBariton.set(3, "g3");
idxNoteMapCClefBariton.set(4, "f3");
idxNoteMapCClefBariton.set(5, "e3");
idxNoteMapCClefBariton.set(6, "d3");
idxNoteMapCClefBariton.set(7, "c3");
idxNoteMapCClefBariton.set(7, "b2");

export const idxNotePhantomMapAboveCBariton: Map<number, string> = new Map();
idxNotePhantomMapAboveCBariton.set(0, "d4");
idxNotePhantomMapAboveCBariton.set(1, "e4");
idxNotePhantomMapAboveCBariton.set(2, "f4");
idxNotePhantomMapAboveCBariton.set(3, "g4");
idxNotePhantomMapAboveCBariton.set(4, "a4");
idxNotePhantomMapAboveCBariton.set(5, "b4");
idxNotePhantomMapAboveCBariton.set(6, "c5");
idxNotePhantomMapAboveCBariton.set(7, "d5");
idxNotePhantomMapAboveCBariton.set(8, "e5");
idxNotePhantomMapAboveCBariton.set(9, "f5");
idxNotePhantomMapAboveCBariton.set(10, "g5");
idxNotePhantomMapAboveCBariton.set(11, "a5");
idxNotePhantomMapAboveCBariton.set(12, "b5");
idxNotePhantomMapAboveCBariton.set(13, "c6");
idxNotePhantomMapAboveCBariton.set(14, "d6");
idxNotePhantomMapAboveCBariton.set(15, "e6");
idxNotePhantomMapAboveCBariton.set(16, "f6");

export const idxNotePhantomMapBelowCBariton: Map<number, string> = new Map();
idxNotePhantomMapBelowCBariton.set(0, "a2");
idxNotePhantomMapBelowCBariton.set(1, "g2");
idxNotePhantomMapBelowCBariton.set(2, "f2");
idxNotePhantomMapBelowCBariton.set(3, "e2");
idxNotePhantomMapBelowCBariton.set(4, "d2");
idxNotePhantomMapBelowCBariton.set(5, "c2");
idxNotePhantomMapBelowCBariton.set(6, "b1");
idxNotePhantomMapBelowCBariton.set(7, "a1");
idxNotePhantomMapBelowCBariton.set(8, "g1");
idxNotePhantomMapBelowCBariton.set(9, "f1");
idxNotePhantomMapBelowCBariton.set(10, "e1");
idxNotePhantomMapBelowCBariton.set(11, "d1");
idxNotePhantomMapBelowCBariton.set(12, "c1");
idxNotePhantomMapBelowCBariton.set(13, "b0");
idxNotePhantomMapBelowCBariton.set(14, "a0");
idxNotePhantomMapBelowCBariton.set(15, "g0");
idxNotePhantomMapBelowCBariton.set(16, "f0");
idxNotePhantomMapBelowCBariton.set(17, "e0");
idxNotePhantomMapBelowCBariton.set(18, "d0");
idxNotePhantomMapBelowCBariton.set(19, "c0");

////////

export const keyCodeNoteMap: Map<string, string> = new Map;
keyCodeNoteMap.set("KeyC", "c");
keyCodeNoteMap.set("KeyD", "d");
keyCodeNoteMap.set("KeyE", "e");
keyCodeNoteMap.set("KeyF", "f");
keyCodeNoteMap.set("KeyG", "g");
keyCodeNoteMap.set("KeyA", "a");
keyCodeNoteMap.set("KeyB", "b");
keyCodeNoteMap.set("KeyH", "b"); //alternative when keydown h


export const idToClef: Map<string, string> = new Map;
idToClef.set("#E050", "G");
idToClef.set("#E062", "F");
idToClef.set("#E05C", "C");

export const noteToCross: Map<string, string> = new Map;
noteToCross.set("f", "f#")
noteToCross.set("c", "c#")
noteToCross.set("g", "g#")
noteToCross.set("d", "d#")
noteToCross.set("a", "a#")
noteToCross.set("e", "e#")
noteToCross.set("b", "b#")

export const noteToB: Map<string, string> = new Map;
noteToB.set("b", "bb")
noteToB.set("e", "eb")
noteToB.set("a", "ab")
noteToB.set("d", "db")
noteToB.set("g", "gb")
noteToB.set("c", "cb")
noteToB.set("f", "fb")

export const nextStepDown: Map<string, string> = new Map;
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
nextStepDown.set("ff", "ef")
nextStepDown.set("e", "ef")
nextStepDown.set("ds", "d")
nextStepDown.set("ef", "d")
nextStepDown.set("d", "df")
nextStepDown.set("cs", "c")
nextStepDown.set("df", "c")
nextStepDown.set("bs", "b")
nextStepDown.set("c", "b")
nextStepDown.set("cf", "bf")

export const nextStepUp: Map<string, string> = new Map;
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
nextStepUp.set("bs", "cs")


export const keysigToNotes: Map<string, Array<string>> = new Map;
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

export const keyIdToSig: Map<string, string> = new Map;
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

export const numToNoteButtonId: Map<string, string> = new Map;
numToNoteButtonId.set("0.5","breveNote")
numToNoteButtonId.set("1","fullNote")
numToNoteButtonId.set("2","halfNote")
numToNoteButtonId.set("4","quarterNote")
numToNoteButtonId.set("8","eigthNote")
numToNoteButtonId.set("16","sixteenthNote")
numToNoteButtonId.set("32","thirtysecondNote")

export const NoteButtonIdToNum: Map<string, number> = new Map;
NoteButtonIdToNum.set("breveNote", 0.5)
NoteButtonIdToNum.set("fullNote", 1)
NoteButtonIdToNum.set("halfNote", 2)
NoteButtonIdToNum.set("quarterNote", 4)
NoteButtonIdToNum.set("eigthNote", 8)
NoteButtonIdToNum.set("sixteenthNote", 16)
NoteButtonIdToNum.set("thirtysecondNote", 32)

export const numToDotButtonId: Map<string, string> = new Map;
numToDotButtonId.set("1", "oneDot")
numToDotButtonId.set("2", "twoDot")

export const attrToAccidButtonId: Map<string, string> = new Map;
attrToAccidButtonId.set("s", "alterUp")
attrToAccidButtonId.set("f", "alterDown")
attrToAccidButtonId.set("n", "alterNeutral")
attrToAccidButtonId.set("ff", "alterDDown")
attrToAccidButtonId.set("ss", "alterDUp")

export const accidButtonToAttr: Map<string, string> = new Map;
attrToAccidButtonId.forEach((v, k) => accidButtonToAttr.set(v, k))

export const attrToArticButtonId: Map<string, string> = new Map;
attrToArticButtonId.set("acc", "accentBtn")
attrToArticButtonId.set("ten", "tenutoBtn")
attrToArticButtonId.set("marc", "marcatoBtn")
attrToArticButtonId.set("stacc", "staccatoBtn")

export const articButtonToAttr: Map<string, string> = new Map;
attrToArticButtonId.forEach((v, k) => articButtonToAttr.set(v, k))

export const octToNum: Map<string, string> = new Map;
octToNum.set("subkontraOct", "0")
octToNum.set("kontraOct", "1")
octToNum.set("greatOct", "2")
octToNum.set("smallOct", "3")
octToNum.set("LineOct1", "4")
octToNum.set("LineOct2", "5")
octToNum.set("LineOct3", "6")
octToNum.set("LineOct4", "7")
octToNum.set("LineOct5", "8")

export const clefToLine: Map<string, string> = new Map;
clefToLine.set("G", "2")
clefToLine.set("C", "3") // assume Alto as default C Clef
clefToLine.set("F", "4")
clefToLine.set("Soprano", "1")
clefToLine.set("Mezzo", "2")
clefToLine.set("Alto", "3")
clefToLine.set("Tenor", "4")
clefToLine.set("Bariton", "5")

export const unicodeToTimesig: Map<string, string> = new Map;
unicodeToTimesig.set("E080", "0")
unicodeToTimesig.set("E081", "1")
unicodeToTimesig.set("E082", "2")
unicodeToTimesig.set("E083", "3")
unicodeToTimesig.set("E084", "4")
unicodeToTimesig.set("E085", "5")
unicodeToTimesig.set("E086", "6")
unicodeToTimesig.set("E087", "7")
unicodeToTimesig.set("E088", "8")
unicodeToTimesig.set("E089", "9")

export const unicodeToKey: Map<string, string> = new Map;
unicodeToKey.set("&#x266D;", "b")
unicodeToKey.set("&#x266E;", "n")
unicodeToKey.set("&#x266F;", "#")
unicodeToKey.set("&#xE870;", "°")
unicodeToKey.set("&#xE871;", "/°")
unicodeToKey.set("&#xE873;", "\\^")

export const keyToUnicode: Map<string, string> = new Map;
unicodeToKey.forEach((v, k) => keyToUnicode.set(v, k))

export const midiToNote: Map<number, string> = new Map;
var j = 12
for(let i=0; i <= 9; i++){
    ["c", "cs", "d", "ds", "e", "f", "fs", "g", "gs", "a", "as", "b"].forEach(x => {
        if(j >= 21 && j <= 127) midiToNote.set(j, x + i.toString())
        j++
    })
}


export const enharmonicToB: Map<string, string> = new Map;
enharmonicToB.set("c", "dff");
enharmonicToB.set("cs", "df");
enharmonicToB.set("css", "d");
enharmonicToB.set("d", "eff");
enharmonicToB.set("ds", "ef");
enharmonicToB.set("dss", "e");
enharmonicToB.set("e", "ff");
enharmonicToB.set("es", "f");
enharmonicToB.set("ess", "fs");
enharmonicToB.set("f", "gff");
enharmonicToB.set("fs", "gf");
enharmonicToB.set("fss", "g");
enharmonicToB.set("g", "aff");
enharmonicToB.set("gs", "af");
enharmonicToB.set("gss", "a");
enharmonicToB.set("a", "bff");
enharmonicToB.set("as", "bf");
enharmonicToB.set("ass", "b");
enharmonicToB.set("b", "cf");
enharmonicToB.set("bs", "c");
enharmonicToB.set("bss", "cs");

export const enharmonicToCross: Map<string, string> = new Map;
enharmonicToB.forEach((v, k) => enharmonicToCross.set(v, k))

export type Attributes = { pname?: string; oct?: number; shape?: string; dur?: string };

/** An editing action sent to verovio as described [here](https://github.com/DDMAL/Neon/wiki/Toolkit-Actions). */
export type EditorAction = {
  action: string;
  param: {elementId: string, x?: number, y?: number} | EditorAction[];
};

/** A message sent to the verovio web worker. */
export type VerovioMessage = {
  action: string;
  id?: string;
  mei?: string;
  elementId?: string;
  editorAction?: EditorAction;
  isUrl?: boolean;
  pageNo?: number;
};

export type VerovioResponse = {
  id: string;
  svg?: string;
  attributes?: Attributes;
  result?: boolean;
  mei?: string;
  info?: object;
  midi?: string;
  time?: number;
  times?: {}
};

/** Modeled after the [W3 Web Annotation Data Model.](https://www.w3.org/TR/annotation-model/) */
export type WebAnnotation = {
  id: string;
  type: string;
  body: string;
  target: string;
};

/** Required fields in the JSON-LD Neon manifest. */
export type NeonManifest = {
  '@context': Array<string | object> | string;
  '@id': string;
  title: string;
  timestamp: string;
  image: string;
  mei_annotations: WebAnnotation[];
};

/* send options between main js and entry ts*/
export type InstanceOptions = {
  id: string,
  data: string,
  meiURL: string,
  taskType: string
}

export type NoteBBox = {
  id: string,
  parentStaff: Element,
  parentLayer: Element,
  parentMeasure: Element,
  x: number,
  y: number
}

export type StaffLineBBox = {
  id: string,
  y: number,
  staffIdx: number
  classList: DOMTokenList
}

export type NewNote = {
  pname: string,
  id?: string,
  dur?: string,
  dots?: string,
  oct?: string,
  keysig?: string,
  accid?: string,
  artic?: string,
  relPosX?: string, //left right; relative to nearestNoteId
  nearestNoteId?: string //nearest element for referece
  staffId?: string,
  layerId?: string,
  chordElement?: Element, // to what chord will it be attached? must be from svg (not mei)
  rest: boolean //will it be a rest?
}

export type NewChord = {
  id?: string,
  dur?: string,
  dots?: string,
  relPosX?: string, //left right; relative to nearestNoteId
  nearestNoteId?: string
  staffId?: string,
  noteElements: Array<NewNote>
}

export type NewClef = {}

export type Staff = {
  clef?: string,
  clefline?: string,
  clefdisplacement?: string,
  keysig?: string, 
  meterSig?: {count: string, unit: string}
}

export type Annotation = {
  sourceID: string,
  targetID: string | Array<string> 
  targetType?: any
  originalHeight?: string, 
  originalWidth?: string
}

export type Coord = {
  obj: Element,
  x: number,
  y: number
}

export type NoteTime = {
  noteId: string,
  onset: number
}

export type LoadOptions = {
  deleteLastNoteInserted?: Boolean
  changeOnPageNo?: string
  widthFactor?: number
}

export type timemapObject = {
  on?: string[];
  off?: string[];
  length: number;
  qstamp: number;
  tempo: number;
  tstamp: number;
};
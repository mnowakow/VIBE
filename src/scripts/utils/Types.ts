export type Attributes = { pname?: string; oct?: number; shape?: string; dur?: string };

/** An editing action sent to verovio as described [here](https://github.com/DDMAL/Neon/wiki/Toolkit-Actions). */
export type EditorAction = {
  action: string;
  param: object | EditorAction[];
};

/** A message sent to the verovio web worker. */
export type VerovioMessage = {
  action: string;
  id?: string;
  mei?: string;
  elementId?: string;
  editorAction?: EditorAction;
  isUrl?: boolean
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
  relPosX?: string, //left right
  nearestNoteId?: string
  staffId?: string,
  chordElement?: Element,
  rest: boolean
}

export type NewChord = {
  id?: string,
  dur?: string,
  dots?: string,
  relPosX?: string, //left right
  nearestNoteId?: string
  staffId?: string,
  noteElements: Array<NewNote>
}

export type NewClef = {}

export type Staff = {
  clef?: string,
  keysig?: string, 
  meterSig?: {count: string, unit: string}
}

export type Annotation = {
  sourceID: string,
  targetID: string | Array<string> 
  targetType?: any
  relativePos?: any
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

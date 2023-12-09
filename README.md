# VIBE = Verovio Interface for Browser-based Editing

Current version in npm repo: ![npm](https://img.shields.io/npm/v/vibe-editor)

Current version on github: ![GitHub package.json version](https://img.shields.io/github/package-json/v/mnowakow/VIBE)

A score editor using verovio as rendering engine

## Initializing
To initailize the score editor only need two different things are needed 
1. The `container` the score editor will be displayed in. The container must contain an ID, since many editors can be displayed on one page.
2. If known beforehand, the data

The data can be present in different forms. So to indicate which kind of processing will be used, the data will be passed as objects with specific keywords

### xmlData
The `xmlData` can be passed either as String of the corresponding MusicXML or MEI, or as Document.

```
var vibe = new VIBE(container, {data: xmlData})
```

### urls
The `url` must include a source for MEI data.

```
var vibe = new VIBE(container, {meiURL: url})
```

### empty score
Initialization with an empty measure
```
var vibe = new VIBE(container, null)
```

### callbacks
A callback can be passed to return the changed data as MEI. The MEI is returned as String

```
var vibe = new VIBE(container, {data: xmlData}, callback)
```
or
```
var vibe = new VIBE(container, {meiURL: url}, callback)
```
or
```
var vibe = new VIBE(container, null, callback)
```


## Sources

Parts of the Code are based on the [Neon Editor](https://github.com/DDMAL/Neon) by DDMAL.
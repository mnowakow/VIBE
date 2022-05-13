# VerovioScoreEditor

Current version in npm repo: ![npm](https://img.shields.io/npm/v/verovioscoreeditor)

Current version on github: ![GitHub package.json version](https://img.shields.io/github/package-json/v/mnowakow/VerovioScoreEditor)

A score editor using verovio as rendering engine

## Initializing
To initailize the score editor only need two different things are needed 
1. The `container` the score editor will be displayed in. The container must contain an ID, since many editors can be displayed on one page.
2. If known beforehand, the data

The data can be present in different forms. So to indicate which kind of processing will be used, the data will be passed as objects with specific keywords

### xmlData
The `xmlData` can be passed either as String of the corresponding MusicXML or MEI, or as Document.

```
var vse = new VerovioScoreEditor(container, {data: xmlData})
```

### urls
The `url` must include a source for MEI data.

```
var vse = new VerovioScoreEditor(container, {meiURL: url})
```

### empty score
Initialization with an empty measure
```
var vse = new VerovioScoreEditor(container, null)
```

### callbacks
A callback can be passed to return the changed data as MEI. The MEI is returned as String

```
var vse = new VerovioScoreEditor(container, {data: xmlData}, callback)
```
or
```
var vse = new VerovioScoreEditor(container, {meiURL: url}, callback)
```
or
```
var vse = new VerovioScoreEditor(container, null, callback)
```



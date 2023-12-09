import * as React from 'react';
import { CompactPicker, TwitterPicker } from 'react-color';
import { createRoot } from 'react-dom/client';

const buttonStyleDarkOutline = "btn btn-outline-dark btn-md"

export function createColorPicker(id: string, onColorChange: (color: string) => void) {
  const domNode = document.createElement("div");
  domNode.setAttribute("id", id)
  const root = createRoot(domNode);
  root.render(<ColorPickerWrapper onColorChange={onColorChange} />);
  return domNode
}

interface ColorPickerProps {
  onColorChange: (color: string) => void;
}

function ColorPickerWrapper(props: ColorPickerProps) {
  const [color, setColor] = React.useState("")
  const [displayColorPicker, setDispalyColorPicker] = React.useState(false)

  function handleColor(e: { hex: React.SetStateAction<string>; }) {
    setColor(e.hex.toString())
    console.log(e)
    props.onColorChange(color)
  }

  const handleClick = () => {
    setDispalyColorPicker(!displayColorPicker)
  };

  const handleClose = () => {
    setDispalyColorPicker(false)
  };


  const popover: React.CSSProperties = {
    position: 'absolute',
    zIndex: '2',
  }
  const cover: React.CSSProperties = {
    position: 'fixed',
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
  }

  return (
    <div>
      <button id="colorPickerBtn" className={buttonStyleDarkOutline} onClick={handleClick}>Color</button>
      {displayColorPicker ? <div style={popover}>
        <div style={cover} onClick={handleClose} />
        <CompactPicker onChange={handleColor} />
      </div> : null}
    </div>
  )
}
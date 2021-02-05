console.log('ContentScript installed');

// Trigger: mouse click releasing
document.onmouseup = function() {
    let _text = window.getSelection();

    console.log(_text);
}
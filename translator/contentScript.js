console.log('ContentScript installed');

// MouseUp event
document.onmouseup = function(e) {
    // readSelection();
    throttle(readSelection, 50);
}

/**
 * Read the selected text
 */
let readSelection = function() {
    let _text = window.getSelection();

    console.log(_text.toString());
}

/**
 * Throttle: execute given function only once in the given delay duration
 * @param {function} f          function to be throttled
 * @param {number} delay        delay duration
 */
let throttle = function(f, delay) {
    let _prev = 0;

    console.log(_prev);

    // Closure
    return function() {
        let _now = new Date();

        console.log(_now - _prev);

        if(_now - _prev > delay) {
            f();
            _prev = _now;
        }
    }();
}
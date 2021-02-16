const THROTTLE_INTERVAL = 2000;

/**
 * Tokeniser for text tokenisation
 */
class Tokeniser {
    #str = '';

    constructor(str) {
        this.#str = str;
    }

    get tokens() {
        // TODO Tokenisation
        return this.#str.split(' ');
    }

    get lang() {
        // TODO Language recog.
        return 'en_US';
    }
}

/**
 * Main process
 */
var translateSelection = function() {
    // 1. Retrive webpage selection info.
    let _sel = window.getSelection()
    
    if(_sel.type !== 'Range') return;
    //  TODO Detect selection position

    // 2. Create webpage popup

    // 3. Invoke service worker to translate texts
    translateText(_sel);
}

/**
 * Send the selected text to service worker & retrive translation info
 * @param {object} selection    current webpage selection
 */
var translateText = function(selection) {
    // 1. Tokenise selected texts
    let _tokeniser = new Tokeniser(selection.toString());
    console.log('Input', _tokeniser);

    // 2. Send message
    chrome.runtime.sendMessage({
        tokens: _tokeniser.tokens,
        lang: _tokeniser.lang
    }, (response) => {
        console.log('Output', response);
        
        // TODO Inject response into popup
    });
}

/**
 * Throttle: execute given function only once in the given duration
 * @param {function} func       function to be throttled
 * @param {number} interval     delay duration
 */
var throttle = function(func, interval) {
    let _prev = 0;

    // Closure
    return function(...args) {
        let _now = new Date();

        if(_now - _prev >= interval) {
            func(...args);
            _prev = _now;
        }
    };
}

/**
 * Page event registration
 */
console.log('ContentScript installed');

// Mouseup
document.onmouseup = throttle(translateSelection, THROTTLE_INTERVAL);
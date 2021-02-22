const THROTTLE_INTERVAL = 2000;

// Default translation language
var defaultLang = 'en_US';

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
}

/**
 * Translation main process
 */
var translateSelection = function() {
    // 1. Retrive webpage selection info.
    let _sel = window.getSelection()
    
    if(_sel.type !== 'Range') return;

    // 2. Create webpage popup
    let newDiv = createPopMenu(_sel);

    // 3. Invoke service worker to translate texts
    translateText(_sel);
}

/**
 * Create a pop menu (additional div) at the selection position
 * @param {object} selection    current webpage selection
 */
var createPopMenu = function(selection) {
    // 1. Get range DOMrect coordinates
    let _rangeRect = selection.getRangeAt(0).getBoundingClientRect();
    console.log(_rangeRect);

    return true;
}

/**
 * Send the selected text to service worker & retrive translation info.
 * @param {object} selection    current webpage selection
 */
var translateText = function(selection) {
    // 1. Tokenise selected texts
    let _tokeniser = new Tokeniser(selection.toString());
    console.log('Translation input', _tokeniser);

    // 2. Send message
    chrome.runtime.sendMessage({
        tokens: _tokeniser.tokens,
        lang: defaultLang
    }, (response) => {
        console.log('Translation output', response);
        
        // TODO Inject response into popup
    });
}

/**
 * Retrieve default translation language from browser storage
 */
var retrieveLanguage = function() {
    chrome.storage.local.get(['lang'], (result) => {
        if(!result || !result.lang) {
            // If no default language, set default language as English
            chrome.storage.local.set({ lang: defaultLang });
        } else {
            defaultLang = result.lang;
        }

        console.log(`Current language: ${defaultLang}`);
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
 * Script main process
 */
console.log('ContentScript loaded');

// 1. Retrieve translation language
retrieveLanguage();

/**
 * Event registration
 */
document.onmouseup = throttle(translateSelection, THROTTLE_INTERVAL);

/**
 * Message event handler
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message.lang) {
        defaultLang = message.lang;
        console.log(`New language: ${message.lang}`);
    }

    return true;
});
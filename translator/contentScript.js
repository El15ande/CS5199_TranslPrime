const THROTTLE_INTERVAL = 2000;

// Default source-lang & target-lang
var defaultSrcLang = 'auto';
var defaultTarLang = 'en';

/**
 * Tokeniser for text tokenisation
 */
class Tokeniser {
    #str = '';
    #lang = '';

    constructor(str) {
        this.#str = str;
    }

    get tokens() {
        // TODO Tokenisation
        return this.#str.split(' ');
    }

    get tokenLang() {
        return this.#lang;
    }

    set tokenLang(lang) {
        this.#lang = lang;
    }
}

/**
 * Translation main process
 */
var translateSelection = function() {
    // If menu already created, remove it & return
    let _existMenu = document.getElementById('translationOverallMenu')
    if(_existMenu) {
        _existMenu.remove();
        return;
    }

    // 1. Retrive webpage selection info.
    let _sel = window.getSelection()
    
    if(_sel.type !== 'Range') return;

    // 2. Create webpage popup
    let _newDiv = createPopMenu(_sel);
    document.body.appendChild(_newDiv);

    // 3. Invoke service worker to translate texts
    translateText(_sel, _newDiv);
}

/**
 * Create a pop menu (additional div) at the selection position
 * @param {object} selection    current webpage selection
 */
var createPopMenu = function(selection) {
    // 1. Get range DOMrect coordinates
    let _rangeRect = selection.getRangeAt(0).getBoundingClientRect();

    // 2. Create overall menu
    let overallDiv = document.createElement('div');
    overallDiv.id = 'translationOverallMenu';
    // 2.1 Allocate overall menu position
    overallDiv.style.position = 'absolute';
    overallDiv.style.zIndex = Number.MAX_SAFE_INTEGER;
    overallDiv.style.left = `${Math.ceil(_rangeRect.left)}px`;
    overallDiv.style.top = `${Math.ceil(_rangeRect.top + window.pageYOffset)}px`;
    overallDiv.style.minWidth = '150px';
    overallDiv.style.minHeight = '100px';
    overallDiv.style.backgroundColor = '#ABC7BF';
    // TODO Style adjustment

    return overallDiv;
}

/**
 * 
 */
var createPopMenuItem = function(text) {
    // TODO Style adjustment
    let itemDiv = document.createElement('div');

    if(text) {
        // 1. Add word title
        let itemTitle = document.createElement('h4');
        itemTitle.textContent = text.word;
        itemDiv.appendChild(itemTitle);

        text.meanings.forEach((meaning) => {
            meaning.definitions.map((def) => {
                let itemDef = document.createElement('p');
                itemDef.textContent = def.definition;
                itemDiv.appendChild(itemDef);
            });
        });
    } else {
        let noDef = document.createElement('p');
        noDef.textContent = 'No definition found.';
        itemDiv.appendChild(noDef);
    }

    return itemDiv;
}

/**
 * 
 */
var createPopMenuNote = function() {
    return document.createElement('input');
}

/**
 * Send the selected text to service worker & retrive translation info.
 * @param {object} selection        current webpage selection
 * @param {HTMLDivElement} menu     menu div element 
 */
var translateText = function(selection, menu) {
    // 1. Tokenise selected texts
    let _tokeniser = new Tokeniser(selection.toString());
    chrome.i18n.detectLanguage(selection.toString(), (res) => {
        if(res && res.languages && Array.isArray(res.languages)) {
            // TODO Process res.language for multiple languages
            console.log(res);
            _tokeniser.tokenLang = res.languages[0].language;
        }

        console.log('Translation input', _tokeniser);
    });

    // 2. Send message
    chrome.runtime.sendMessage({
        tokens: _tokeniser.tokens,
        lang: defaultTarLang
    }, (response) => {
        console.log('Translation output', response);
        
        if(response && Array.isArray(response)) {
            response.forEach((res) => {
                let _itemDiv = createPopMenuItem(res[0]);
                menu.appendChild(_itemDiv);
            });
        }

        let _noteDiv = createPopMenuNote();
        menu.appendChild(_noteDiv);
    });
}

/**
 * Retrieve source-lang & target-lang from browser storage
 */
var retrieveLanguage = function() {
    chrome.storage.local.get(['srclang'], (result) => {
        (!result || !result.srclang)
            ? chrome.storage.local.set({ srclang: defaultSrcLang })
            : defaultSrcLang = result.srclang;

        console.log(`Current source language: ${defaultSrcLang}`);
    });

    chrome.storage.local.get(['tarlang'], (result) => {
        (!result || !result.tarlang)
            ? chrome.storage.local.set({ tarlang: defaultTarLang })
            : defaultTarLang = result.tarlang;

        console.log(`Current target language: ${defaultTarLang}`);
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
    if(message.srclang) {
        defaultSrcLang = message.srclang;
        console.log(`New source language: ${message.srclang}`);
    } else if(message.tarlang) {
        defaultTarLang = message.tarlang;
        console.log(`New target language: ${message.tarlang}`);
    }

    return true;
});
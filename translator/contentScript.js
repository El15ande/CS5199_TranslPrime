const THROTTLE_INTERVAL = 2000;

// Default source-lang & target-lang
var defaultSrcLang = 'auto';
var defaultTarLang = 'en';

/**
 * Tokeniser for text tokenisation
 *  - {string} #str          selected string that will be tokenised
 *  - {string} #lang         source language
 *  + {array}  tokens        tokenised selected string
 *  + {string} tokenLang     public #lang
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
    let _existMenu = document.getElementById('translationOverallMenu');
    if(_existMenu) {
        _existMenu.remove();
        return;
    }

    // 1. Retrive webpage selection info.
    let _selection = window.getSelection();
    
    if(_selection.type !== 'Range') return;

    // 2. Create webpage pop-menu
    let _newDiv = createPopMenu(_selection);
    document.body.appendChild(_newDiv);

    // 3. Invoke service worker to translate texts through APIs
    // 4. Display translation result by appending pop-menu
    translateText(_selection, _newDiv);
}

/**
 * Create the div for overall pop-menu
 * @param {object} selection    current webpage selection
 * @returns {HTMLDivElement}    pop-menu div element
 */
var createPopMenu = function(selection) {
    // 1. Get selection range (DOMrect) coordinates
    let _DOMRect = selection.getRangeAt(0).getBoundingClientRect();

    // 2.1 Create div element
    let overallDiv = document.createElement('div');
    overallDiv.id = 'translationOverallMenu';

    // 2.2 Allocate position
    overallDiv.style.position = 'absolute';
    overallDiv.style.zIndex = Number.MAX_SAFE_INTEGER;
    overallDiv.style.left = `${Math.ceil(_DOMRect.left)}px`;
    overallDiv.style.top = `${Math.ceil(_DOMRect.top + window.pageYOffset)}px`;
    
    overallDiv.style.minWidth = '100px';
    overallDiv.style.minHeight = '75px';
    overallDiv.style.borderRadius = '10px';
    overallDiv.style.boxShadow = '5px 10px 10px #AAAAAA';
    overallDiv.style.backgroundColor = '#C3E5DE';

    return overallDiv;
}

/**
 * Create the div element for each word translation
 * @param {object} result       translation result
 * @param {string} word         original word
 * @returns {array}             array of pop-menu item div elements
 */
var createPopMenuItem = function(result, word) {
    let _createItemDiv = function() {
        let _item = document.createElement('div');
        _item.class = "meaning";
        _item.style.margin = '5px 5px 5px 5px';
        _item.style.color = '#000000';

        return _item;
    }

    let _createTitle = function(t) {
        let _title = document.createElement('span');
        _title.textContent = t;
        _title.style.fontWeight = 'bold';
        _title.style.fontSize = '16px';

        return _title;
    }

    let _createPOS = function(pos) {
        let _pos = document.createElement('span');
        _pos.textContent = pos;
        _pos.style.marginLeft = '5px';
        _pos.style.fontWeight = 'normal';
        _pos.style.fontStyle = 'italic';
        _pos.style.fontSize = '12px';

        return _pos;
    }

    let _createDefinition = function(defs, n) {
        let _defs = [];
        let _count = 1;

        for(let i = 0; i < n; i++) {
            if(!defs[i]) continue;

            let _def = document.createElement('p');
            _def.textContent = `${_count++}. ${defs[i].definition}`;
            _def.style.fontSize = '14px';
            _defs.push(_def);
        }

        return _defs;
    }

    let _createEmptyWord = function() {
        let _meaningDiv = _createItemDiv();
        let _wordDiv = _createTitle(word);

        let _emptydef = document.createElement('p');
        _emptydef.textContent = `No definition found.`;
        _emptydef.style.fontSize = '14px';

        _meaningDiv.appendChild(_wordDiv);
        _meaningDiv.appendChild(_emptydef);

        meaningDivArray.push(_meaningDiv);
    }

    let meaningDivArray = [];

    if(result && result.meanings && Array.isArray(result.meanings)) {
        if(result.meanings.length === 0) _createEmptyWord();

        result.meanings.forEach((meaning) => {
            //  1. Create div element
            let _meaningDiv = _createItemDiv();
            
            //  2. Append word title & current POS
            let _wordDiv = _createTitle((result && result.word) ? result.word : word);
            let _POSDiv = _createPOS(meaning.partOfSpeech ? meaning.partOfSpeech : '');
            _wordDiv.appendChild(_POSDiv);
            _meaningDiv.appendChild(_wordDiv);
            
            //  3. Append first 3 definitions
            if(meaning.definitions && Array.isArray(meaning.definitions)) {
                let _definitionDivs = _createDefinition(meaning.definitions, 3);
                _definitionDivs.map((d) => _meaningDiv.appendChild(d));
            }

            meaningDivArray.push(_meaningDiv);
        });
    } else {
        _createEmptyWord();
    }

    return meaningDivArray;
}

/**
 * Create the div element for note section
 */
var createPopMenuNote = function() {
    // TODO Note section
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
            _tokeniser.tokenLang = res.languages[0].language;
            
            console.log('Translation input', _tokeniser);
        }
    });

    // 2. Send message
    chrome.runtime.sendMessage({
        tokens: _tokeniser.tokens,
        lang: defaultTarLang
    }, (response) => {
        console.log('Translation output', response);
        
        if(response && Array.isArray(response)) {
            response.forEach((res, i) => {
                // 3. Append pop-menu with translation results
                let _items = createPopMenuItem(res[0], _tokeniser.tokens[i]);
                _items.map((i) => menu.appendChild(i));
            });
        }
        
        //  4. Append pop-menu with note section
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

// Retrieve translation language
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
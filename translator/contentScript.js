/**
 * Translation menu HTMLElement node
 * @private {number} #tier                    Level as a HTMLElement tree node (mandatory)
 * @private {TranslMenuElement[]} #children   Child-nodes
 * 
 * @private {string} #type      HTMLElement subclass type (mandatory)
 * @private {string} #id        HTMLElement.id (mandatory)
 * @private {string[]} #class   HTMLElement.class
 * @private {object} #style     HTMLElement.style
 * 
 * @private {object} #attrs      Other HTMLElement attributes
 * 
 * @public {HTMLElement} HTMLElement
 * @public addChild
 */
class TranslMenuElement {
    // Tree attributes
    #tier = 0;
    #children = [];
    // HTMLElement attributes
    #type = '';
    #id = '';
    #class = [];
    #style = {};
    #attrs = {};

    constructor(info) {
        this.#tier = info.tier;
        this.#children = [];

        this.#type = info.type;
        this.#id = info.id;
        this.#class = info.class || [];
        this.#style = info.style || {};
        this.#attrs = info.attrs || {};
    }

    /**
     * @returns {HTMLElement}   Recursively-embedded HTMLElement
     */
    get HTMLElement() {
        let element = document.createElement(this.#type);

        // 1. Add HTMLElement attributes
        element.id = this.#id;

        element.classList.add(...this.#class);
        
        for(let s in this.#style) {
            element.style[s] = this.#style[s];
        }

        for(let attr in this.#attrs) {
            element[attr] = this.#attrs[attr];
        }

        // 2. Append children
        this.#children.forEach((child) => element.appendChild(child.HTMLElement));
        
        return element;
    }

    /**
     * Add a child node
     * @param {TranslMenuElement || TranslMenuElement[]} tme   Child element(s) 
     */
    addChild(tme) {
        if(Array.isArray(tme)) {
            this.#children.push(...tme);
        } else {
            this.#children.push(tme);
        }
    }
}



// Global browser
var Browser = chrome || browser; // TODO Check other browser adaptivity

// Previous translation menu position
var prevPosition = { x: 0, y: 0 }



/**
 * Get selection area info. from window
 *  1. x (number): translation menu absolute x-position
 *  2. y (number): translation menu absolute y-position
 * 
 * @returns {object}        Selection info.
 */
var getWindowSelection = function() {
    let selection = {
        x: prevPosition.x,
        y: prevPosition.y,
    };

    // Locate selection position
    let _sel = window.getSelection();

    if(_sel.type === 'Range') {
        let _DOMRect = _sel.getRangeAt(0).getBoundingClientRect();

        let _x = _DOMRect.left;
        let _y = _DOMRect.top + window.pageYOffset + _DOMRect.height;

        selection.x = _x;
        selection.y = _y;

        // Update prevPosition
        prevPosition.x = _x;
        prevPosition.y = _y;
    }

    return selection;
}

var createMenuEntry = function(index, translation) {
    let _entryID = `translentry${index+1}`;

    let _createEntryTitle = function(target, source='') {
        let _source = (source && target.toLocaleLowerCase() !== source.toLocaleLowerCase()) ? ` [${source}]` : '';

        return new TranslMenuElement({
            tier: 2,
            type: 'span',
            id: `${_entryID}-title`,
            style: { fontSize: '18px', fontWeight: 'bold' },
            attrs: { textContent: target + _source }
        });
    }

    let _createEntryParaphrase = function(paraphrase, pindex) {
        let _paraphraseID = `paraphrase${pindex+1}`;

        let pDiv = new TranslMenuElement({
            tier: 2,
            type: 'div',
            id: `${_entryID}-${_paraphraseID}`,
            style: { display: 'block' }
        });

        pDiv.addChild(new TranslMenuElement({
            tier: 3,
            type: 'span',
            id: `${_paraphraseID}-pos`,
            style: { fontSize: '12px', fontWeight: 'bold' },
            attrs: { textContent: paraphrase.pos }
        }));

        pDiv.addChild(paraphrase.definitions.map((def, di) => new TranslMenuElement({
            tier: 3,
            type: 'p',
            id: `${_paraphraseID}-definition${di+1}`,
            style: { margin: '0px', fontSize: '12px' },
            attrs: { textContent: `- ${def}` }
        })));

        return pDiv;
    }

    // 1. Create entry HTMLDivElement
    let entry = new TranslMenuElement({
        tier: 1,
        type: 'div',
        id: `translprime-${_entryID}`,
        style: { margin: '10px 5px 20px 5px' }
    });

    // 2.1 Add entry title
    entry.addChild(_createEntryTitle(translation.target, translation.source));
    // 2.2 Add entry paraphrases
    entry.addChild(translation.paraphrases.map((p, pi) => _createEntryParaphrase(p, pi)));

    return entry;
}


// ContentScript global process
console.log('ContentScript loaded');

/**
 * Event registration
 */
// On received message from ServiceWorker
 Browser.runtime.onMessage.addListener((message) => {
    console.log('Translation', message._translations);

    // 0. Remove existing menu
    let _existMenu = document.getElementById('translprime-translmenu');
    if(_existMenu) _existMenu.remove();

    // 1. Get selection info.
    let _winSel = getWindowSelection();

    // 2. Create overall translation menu
    let _overallMenu = new TranslMenuElement({
        tier: 0,
        type: 'div',
        id: 'translprime-translmenu',
        style: {
            // Menu position
            position: 'absolute',
            zIndex: Number.MAX_SAFE_INTEGER,
            left: `${_winSel.x}px`,
            top: `${_winSel.y}px`,
            // Menu size
            minWidth: '100px',
            minHeight: '100px',
            // Menu style
            borderRadius: '10px',
            boxShadow: '5px 10px 10px #AAAAAA',
            backgroundColor: '#3178C6',
            // Font
            color: '#FFFFFF',
            fontFamily: `'Segoe UI Web (West European)', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif`
        }
    });

    // 3. Create translation entries
    message._translations.forEach((_transl, index) => {
        let _translEntry = createMenuEntry(index, _transl);

        _overallMenu.addChild(_translEntry);
    });

    _overallMenu.addChild(new TranslMenuElement({ 
        tier: 1, 
        type: 'hr',
        id: 'translprime-hr',
        style: { margin: '0 5px 20px 5px' } 
    }));

    // Render
    document.body.appendChild(_overallMenu.HTMLElement);

    return true;
});
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
var prevPosition = { x: 0, y: 0 };



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

/**
 * Display notes in translation menu
 * @param {string[]} keys       Translation word(s) 
 * @param {Note | Note[]} note  Notes 
 */
var displayNote = function(keys, note) {
    console.log(keys, note);

    let _getDate = function(id) {
        let _date = new Date(id);

        let _year = _date.getFullYear();
        let _month = _date.getMonth();
        let _day = _date.getDate();

        return [
            _year,
            (_month>9 ? '' : '0') + _month,
            (_day>9 ? '' : '0') + _day
        ].join('-');
    }

    let _createDisplayNull = function() {
        return new TranslMenuElement({
            tier: 2,
            type: 'span',
            id: 'notedisplay-null',
            style: { fontSize: '15px', fontWeight: 'bold' },
            attrs: { textContent: 'Note: no note for this translation yet!' }
        });
    }

    let _createDisplayEntry = function(note, index) {
        let entryDiv = getDivTemplate(3, `groupnote-${index}`);

        entryDiv.addChild(new TranslMenuElement({
            tier: 4,
            type: 'span',
            id: index === 0 ? `directnote-head` : `groupnote${index}-head`,
            style: { fontSize: '15px', fontWeight: 'bold' },
            attrs: { textContent: `Note @ ${_getDate(note.id)}` }
        }));

        let noteLines = note.note.split('\n');
        noteLines.forEach((nl, nlindex) => {
            entryDiv.addChild(getDivTemplate(4, 
                (index === 0 ? `directnote-noteline${nlindex+1}`: `groupnote${index}-noteline${nlindex+1}`), 
                { fontSize: '12px' }, 
                { textContent: nl }
            ));
        });

        return entryDiv;
    }

    let noteElement = _createDisplayNull();

    if(Array.isArray(note)) {
        // Search note from notes
        if(note.length > 0) {
            let _matchedNotes = note.filter((n) => keys.some((r) => n.keys.includes(r)));

            if(_matchedNotes.length > 0) {
                noteElement = getDivTemplate(2, 'notedisplay-groupnote');

                _matchedNotes.forEach((mnote, index) => {
                    noteElement.addChild(_createDisplayEntry(mnote, index+1));
                });
            }
        }
    } else {
        // Direct render
        if(document.getElementById('notedisplay-null')) {
            document.getElementById('notedisplay-null').remove();
        }
        
        noteElement = getDivTemplate(2, 'notedisplay-directnote');
        noteElement.addChild(_createDisplayEntry(note, 0));
    }

    document.getElementById('translprime-notedisplay').appendChild(noteElement.HTMLElement);
}



/**
 * Get TranslMenuElement template for a <div>
 * @param {number} tier             Div tier
 * @param {string} id               Div ID
 * @param {object} style            Div style
 * @param {object} attrs            Div attrs
 * @returns {TranslMenuElement}     Div TranslMenuElement template
 */
var getDivTemplate = function(tier, id, style={}, attrs={}) {
    return new TranslMenuElement({
        tier,
        id,
        type: 'div',
        style,
        attrs
    });
}

/**
 * Get TranslMenuElement tempalte for a <hr>
 * @param {number} tier             Hr tier
 * @param {string} id               Hr ID
 * @returns {TranslMenuElement}     Hr TranslMenuElement template
 */
var getHrTemplate = function(tier, id) {
    return new TranslMenuElement({ 
        tier,
        id,
        type: 'hr',
        style: { 
            margin: '0 5px 10px 5px',
            border: '1px solid #FFFFFF' 
        } 
    });
}

/**
 * Get TranslMenuElement template for a button
 * @param {number} tier             Button tier
 * @param {string} id               Button ID
 * @param {string} textContent      Button text
 * @param {function} onclick        Button onclick function
 * @returns {TranslMenuElement}     Button TranslMenuElement template
 */
var getButtonTemplate = function(tier, id, textContent, onclick) {
    return new TranslMenuElement({
        tier, 
        id,
        type: 'button',
        style: {
            margin: '0 10px 10px',
            border: '0px',
            padding: '3px 6px',
            maxWidth: '100px',
            backgroundColor: '#FFFFFF',
            fontSize: '15px',
            fontWeight: 'normal',
            color: '#808080'
        },
        attrs: { 
            textContent, 
            onclick,
            type: 'button'
        }
    });
}

/**
 * Get TranslMenuElement template for a select menu
 * @param {number} tier             Select tier
 * @param {string} id               Select ID 
 * @param {string[]} options        Select options
 * @returns {TranslMenuElement}     Select TranslMenuElement template
 */
var getSelectTemplate = function(tier, id, options) {
    let selection = new TranslMenuElement({
        tier,
        id,
        type: 'select',
        style: {
            margin: '0 10px 10px 10px',
            padding: '0',
            border: '0',
            maxWidth: '480px'
        }
    });

    options.forEach((value) => {
        selection.addChild(new TranslMenuElement({
            tier: tier+1,
            type: 'option',
            id: `inputcat-${value}`,
            attrs: { 
                value,
                textContent: value
            }
        }));
    });

    return selection;
}

/**
 * Get TranslMenuElement template for a <textarea>
 * @param {number} tier             Textarea tier
 * @param {string} id               Textarea ID
 * @returns {TranslMenuElement}     Textarea TranslMenuElement template
 */
var getTextAreaTemplate = function(tier, id) {
    return new TranslMenuElement({
        tier,
        id,
        type: 'textarea',
        style: {
            margin: '0 10px 10px 10px',
            padding: '0',
            border: '0',
            maxWidth: '480px'
        },
        attrs: { cols: 30 }
    });
}



/**
 * Create a single translation entry
 * @param {number} index                Entry index 
 * @param {Translation} translation     Translation result from ServiceWorker (see Readme for detail)
 * @returns {TranslMenuElement}         TranslMenuElement storing the translation result 
 */
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

        let pDiv = getDivTemplate(2, `${_entryID}-${_paraphraseID}`, { display: 'block' });

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
    let entry = getDivTemplate(1, `translprime-${_entryID}`, { margin: '10px 5px' });

    // 2.1 Add entry title
    entry.addChild(_createEntryTitle(translation.target, translation.source));
    // 2.2 Add entry paraphrases
    entry.addChild(translation.paraphrases.map((p, pi) => _createEntryParaphrase(p, pi)));

    return entry;
}

/**
 * Create the button set
 * @returns {TranslMenuElement}     TranslMenuElement for the button set in tool area
 */
var createMenuButtons = function() {
    let buttonSet = getDivTemplate(1, 'translprime-buttons', {
        margin: '0 5px',
        display: 'flex',
        'justify-content': 'space-around'
    });

    // Note button
    buttonSet.addChild(getButtonTemplate(2, 'translbutton-notebtn', 'Add Note', (e) => {
        let _this = document.getElementById('translbutton-notebtn');

        if(_this.textContent === 'Add Note') {
            document.getElementById('translprime-noteinput').style.display = 'grid';
            _this.textContent = 'Close Note';
        } else if(_this.textContent === 'Close Note') {
            document.getElementById('translprime-noteinput').style.display = 'none';
            _this.textContent = 'Add Note';
        }
    }));

    // Close button
    buttonSet.addChild(getButtonTemplate(2, 'translbutton-closebtn', 'Close Menu', 
        (e) => document.getElementById('translprime-translmenu').remove()
    ));

    return buttonSet;
}

/**
 * Create the note input set
 * @param {object} result               Data retrieved from browser storage
 * @param {Translation[]} translations  Translation result
 * @returns {TranslMenuElement}         TranslMenuElement for the note input set in tool area
 */
var createMenuNoteInput = function(result, translations) {
    let noteInputSet = getDivTemplate(1, 'translprime-noteinput', { 
        display: 'none',
        position: 'center'
    });

    // 1. Add <select> categories
    noteInputSet.addChild(new TranslMenuElement({
        tier: 2,
        id: 'noteinput-taglabel',
        type: 'label',
        style: { marginLeft: '10px', fontSize: '15px' },
        attrs: {
            for: 'translnoteinput-category',
            textContent: 'Note Tag'
        }
    }));
    noteInputSet.addChild(getSelectTemplate(2, 'translnoteinput-category', result.notecats));

    // 2. Add <textarea> body
    noteInputSet.addChild(new TranslMenuElement({
        tier: 2,
        id: 'noteinput-textlabel',
        type: 'label',
        style: { marginLeft: '10px', fontSize: '15px' },
        attrs: {
            for: 'translnoteinput-body',
            textContent: 'Note'
        }
    }));
    noteInputSet.addChild(getTextAreaTemplate(2, 'translnoteinput-body'));

    // 3. Add explanation
    noteInputSet.addChild(new TranslMenuElement({
        tier: 2,
        type: 'span',
        id: 'translnoteinput-hint',
        style: { marginLeft: '10px', marginBottom: '10px', fontSize: '12px' },
        attrs: { textContent: `Click 'Save' to save note.` }
    }));

    // 4. Add save button
    noteInputSet.addChild(getButtonTemplate(2, 'translnoteinput-savebtn', 'Save', (e) => {
        document.getElementById('translnoteinput-hint').textContent = 'Note saved!';

        let _npair = {
            id: (new Date).getTime(),
            cat: document.getElementById('translnoteinput-category').value,
            note: document.getElementById('translnoteinput-body').value,
            lang: result.tarlang,
            keys: translations.map((transl) => transl.target)
        };
        console.log('Note', _npair);

        // Display note
        displayNote(_npair.keys, _npair);

        // Store notes
        // TODO Better way to store _npair into storage
        let _notes = result.notes;
        _notes.push(_npair);
        Browser.storage.local.set({ notes: _notes });
    }));

    return noteInputSet;
}


// ContentScript global process
console.log('ContentScript loaded');

/**
 * Event registration
 */
// On received message from ServiceWorker
Browser.runtime.onMessage.addListener((message) => {
    console.log('Translation', message._translations);

    let _translKeys = message._translations.map((transl) => transl.target);

    Browser.storage.local.get(['srclang', 'tarlang', 'notes', 'notecats'], (result) => {
        // 0. Remove existing menu
        let _existMenu = document.getElementById('translprime-translmenu');
        if(_existMenu) _existMenu.remove();

        // 1.1 Get selection info.
        let _winSel = getWindowSelection();
        // 1.2 Create overall translation menu
        let _overallMenu = getDivTemplate(0, 'translprime-translmenu', {
            // Menu position
            position: 'absolute',
            zIndex: Number.MAX_SAFE_INTEGER,
            left: `${_winSel.x}px`,
            top: `${_winSel.y}px`,
            // Menu size
            minWidth: '100px',
            minHeight: '100px',
            maxWidth: '500px',
            // Menu style
            borderRadius: '10px',
            boxShadow: '5px 10px 10px #AAAAAA',
            backgroundColor: '#3178C6',
            // Font
            color: '#FFFFFF',
            fontFamily: `'Segoe UI Web (West European)', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif`
        });

        // 2. Create translation entries
        message._translations.forEach((_transl, index) => _overallMenu.addChild(createMenuEntry(index, _transl)));
        
        _overallMenu.addChild(getHrTemplate(1, 'translprime-hr1'));

        // 3. Create note display section
        _overallMenu.addChild(getDivTemplate(1, 'translprime-notedisplay', { margin: '10px 5px' }));
        
        _overallMenu.addChild(getHrTemplate(1, 'translprime-hr2'));

        // 4.1 Create button set
        _overallMenu.addChild(createMenuButtons());
        // 4.2 Create 'invisible' note input set
        _overallMenu.addChild(createMenuNoteInput(result, message._translations));

        // Render
        document.body.appendChild(_overallMenu.HTMLElement);

        // Display possible note(s)
        displayNote(_translKeys, result.notes);
    });

    return true;
});
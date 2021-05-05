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

// Editing note cache
var editedNote;



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
    let _getDate = function(id) {
        let _date = new Date(id);

        let _year = _date.getFullYear();
        let _month = _date.getMonth() + 1;
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
            attrs: { textContent: 'No note for this translation yet.' }
        });
    }

    let _createDisplayEntry = function(note, index) {
        let entryDiv = getDivTemplate(3, `notedisplay-group${index}`);

        entryDiv.addChild(new TranslMenuElement({
            tier: 4,
            type: 'span',
            id: `note${index}-head`,
            style: { fontSize: '15px', fontWeight: 'bold' },
            attrs: { textContent: `Note @ ${_getDate(note.id)}` }
        }));

        entryDiv.addChild(getButtonTemplate(4, `note${index}-editbtn`, 'Edit', (e) => {
            let _this = document.getElementById(`note${index}-editbtn`);

            if(_this.textContent === 'Edit') {
                _this.textContent = 'Editing';

                Browser.storage.local.get(['notes'], (result) => {
                    let _note = result.notes.filter((n) => n.id === note.id)[0];
    
                    editedNote = { index, note: _note };
                    
                    document.getElementById('translprime-noteinput').style.display = 'grid';
                    document.getElementById('translbutton-notebtn').textContent = 'Close Note';
                    
                    document.getElementById('translnoteinput-category').value = editedNote.note.cat;
                    document.getElementById('translnoteinput-body').value = editedNote.note.note;
                });
            } else if(_this.textContent === 'Editing') {
                _this.textContent = 'Edit';

                editedNote = null;
                document.getElementById('translnoteinput-category').value = 'Default';
                document.getElementById('translnoteinput-body').value = '';
            }

            
        }));

        entryDiv.addChild(getButtonTemplate(4, `note${index}-delbtn`, 'Delete', (e) => {
            Browser.storage.local.get(['notes'], (result) => {
                let _otherNotes = result.notes.filter((n) => n.id !== note.id);
                
                Browser.storage.local.set(
                    { notes: _otherNotes }, 
                    () => document.getElementById(`notedisplay-group${index}`).remove()
                );
            });
        }));

        let noteLines = note.note.split('\n');
        noteLines.forEach((nl, nlindex) => {
            entryDiv.addChild(getDivTemplate(4, 
                `note${index}-line${nlindex+1}`, 
                { fontSize: '12px' }, 
                { textContent: nl }
            ));
        });

        return entryDiv;
    }

    let noteElements = [];

    if(Array.isArray(note) && note.length > 0) {
        let _matchedNotes = note.filter((n) => keys.some((r) => n.keys.includes(r)));

        _matchedNotes.forEach((mnote, index) => noteElements.push(_createDisplayEntry(mnote, index+1)));
    } else if (!(note instanceof Array)) {
        let _len = document.getElementById('translprime-notedisplay').childNodes.length + 1;
        if(document.getElementById('notedisplay-null')) _len--;

        noteElements.push(_createDisplayEntry(note, _len));
    }

    if(noteElements.length > 0) {
        if(document.getElementById('notedisplay-null')) document.getElementById('notedisplay-null').remove();
        noteElements.forEach((ne) => document.getElementById('translprime-notedisplay').appendChild(ne.HTMLElement));
    } else {
        document.getElementById('translprime-notedisplay').appendChild(_createDisplayNull().HTMLElement);
    }
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
 * Get TranslMenuElement template for a <span> or a <p>
 * @param {boolean} isSpan          Whether the elemnt is <span> or <p> (TRUE: span) (FALSE: p)
 * @param {number} tier             Span/p tier
 * @param {string} id               Span/p ID
 * @param {string} textContent      Span/p inner text
 * @param {object} style            Span/p style
 * @returns {TranslMenuElement}     Span/p TranslMenuElement template
 */
var getTextTemplate = function(isSpan, tier, id, textContent, style={}) {
    return new TranslMenuElement({
        tier,
        id,
        type: isSpan ? 'span' : 'p',
        style,
        attrs: { textContent }
    });
}

/**
 * Get TranslMenuElement tempalte for a <hr>
 * @param {string} id               Hr ID
 * @returns {TranslMenuElement}     Hr TranslMenuElement template
 */
var getHrTemplate = function(id) {
    return new TranslMenuElement({ 
        tier: 1,
        id,
        type: 'hr',
        style: { 
            height: '0',
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
 * Get TranslMenuElement template for a label of any input
 * @param {number} tier             Label tier
 * @param {string} id               Label ID
 * @param {string} textContent      Label text
 * @param {string} forid            Label for attribute
 * @param {object} style            Label style
 * @returns {TranslMenuElement}     Label TranslMenuElement template
 */
var getLabelTemplate = function(tier, id, textContent, forid, style={}) {
    return new TranslMenuElement({
        tier,
        id,
        type: 'label',
        style,
        attrs: {
            for: forid,
            textContent
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
            maxWidth: '480px',
            fontSize: '15px'
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
 * @param {boolean} isInput         Whether the elemnt is <input> or <textarea> (TRUE: input) (FALSE: textarea)
 * @param {number} tier             Input/textarea tier
 * @param {string} id               Input/textarea ID
 * @param {string} text             Input/textarea pre-input text(s)
 * @returns {TranslMenuElement}     Input/textarea TranslMenuElement template
 */
var getInputTemplate = function(isInput, tier, id, text='') {
    return new TranslMenuElement({
        tier,
        id,
        type: isInput ? 'input' : 'textarea',
        style: {
            margin: '0 10px 10px 10px',
            padding: '0',
            border: '0',
            maxWidth: '480px'
        },
        attrs: { 
            value: text,
            cols: 30 
        }
    });
}



/**
 * Create the translate entry | paraphrase entries
 * @param {object} message          Translation result from ServiceWorker (see Readme for detail)
 * @returns {TranslMenuElement}     TranslMenuElement storing the translation result 
 */
 var createEntries = function(message) {
    let result = null;

    if(message.isTranslate) {
        result = getDivTemplate(1, `translprime-translentry1`, { margin: '10px 5px' });

        result.addChild(getTextTemplate(
            true,
            2, 
            `translentry1-transltitle`,
            `${message.result.translate.target} [${message.result.translate.source}]`,
            { fontSize: '18px', fontWeight: 'bold' }
        ));
    } else {
        result = message.result.paraphrase.map((paraph, i) => {
            let _pentryID = `translentry${i+1}`;
            let pEntry = getDivTemplate(1, `translprime-${_pentryID}`, { margin: '10px 5px' });

            pEntry.addChild(getTextTemplate(
                true,
                2,
                `${_pentryID}-paraphtitle`,
                paraph.origin,
                { fontSize: '18px', fontWeight: 'bold' }
            ));

            paraph.targets.forEach((target, j) => {
                let targetDiv = getDivTemplate(2, `${_pentryID}-paraphtar${j+1}`);

                targetDiv.addChild(getTextTemplate(
                    false,
                    3,
                    `paraphtar${j+1}-title`,
                    `${j+1}. ${target.word}`,
                    { fontSize: '15px', fontWeight: 'bold' }
                ));

                target.meanings.forEach((meaning, k) => {
                    targetDiv.addChild(getTextTemplate(
                        false,
                        3,
                        `paraphtar${j+1}-${k+1}pos`,
                        `${meaning.pos}`,
                        { fontSize: '12px', fontWeight: 'bold' }
                    ));

                    meaning.definitions.forEach((definition, l) => {
                        targetDiv.addChild(getTextTemplate(
                            false,
                            3,
                            `paraphtar${j+1}-${k+1}def${l+1}`,
                            `- ${definition}`,
                            { fontSize: '12px' }
                        ));
                    });
                });

                pEntry.addChild(targetDiv);
            });

            return pEntry;
        });
    }

    return result;
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
            editedNote = null;
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
 * @param {object} result                           Data retrieved from browser storage
 * @param {Translate | Paraphrase[]} translation    Translation result
 * @returns {TranslMenuElement}                     TranslMenuElement for the note input set in tool area
 */
var createMenuNoteInput = function(result, translation) {
    let _getTranslationKeys = function() {
        if(translation.translate) {
            return translation.translate.target.replace(' ', ',');
        } else if(translation.paraphrase) {
            return translation.paraphrase.map((p) => p.origin).join(',');
        }
    }

    let noteInputSet = getDivTemplate(1, 'translprime-noteinput', { 
        display: 'none',
        position: 'center',
        fontFamily: `'Segoe UI Web (West European)', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif`,
        fontSize: '15px'
    });

    // 1. Add <select> categories
    noteInputSet.addChild(getLabelTemplate(2, 'noteinput-taglabel', 'Note Tag', 'translnoteinput-category', { marginLeft: '10px' }));
    noteInputSet.addChild(getSelectTemplate(2, 'translnoteinput-category', result.notecats));

    // 2. Add <input> note keys
    noteInputSet.addChild(getLabelTemplate(2, 'noteinput-keylabel', 'Note Keyword(s)', 'translnoteinput-keys', { marginLeft: '10px' }));
    noteInputSet.addChild(getInputTemplate(true, 2, 'translnoteinput-keys', _getTranslationKeys()));

    // 3. Add <textarea> body
    noteInputSet.addChild(getLabelTemplate(2, 'noteinput-textlabel', 'Note', 'translnoteinput-body', { marginLeft: '10px', fontSize: '15px' }));
    noteInputSet.addChild(getInputTemplate(false, 2, 'translnoteinput-body'));

    // 4. Add explanation
    noteInputSet.addChild(getTextTemplate(true, 2, 'translnoteinput-hint', `Click 'Save' to save note.`, { marginLeft: '10px', marginBottom: '10px', fontSize: '12px' }));

    // 5. Add save button
    noteInputSet.addChild(getButtonTemplate(2, 'translnoteinput-savebtn', 'Save', (e) => {
        let _npair;
        let _notes = result.notes;

        document.getElementById('translnoteinput-hint').textContent = 'Note saved!';

        if(editedNote) {
            let _enote = editedNote.note;
            let _eid = _enote.id;

            _npair = Object.assign(_enote, {
                id: (new Date).getTime(),
                cat: document.getElementById('translnoteinput-category').value,
                keys: document.getElementById('translnoteinput-keys').value.split(','),
                note: document.getElementById('translnoteinput-body').value,
            });
            _notes = _notes.filter((n) => n.id !== _eid);
            
            document.getElementById(`notedisplay-group${editedNote.index}`).remove();
            editedNote = null;
        } else {
            _npair = {
                id: (new Date).getTime(),
                cat: document.getElementById('translnoteinput-category').value,
                keys: document.getElementById('translnoteinput-keys').value.split(','),
                note: document.getElementById('translnoteinput-body').value,
                lang: result.tarlang,
            };
        }
        console.log('Note', _npair);

        // Display note
        displayNote(_npair.keys, _npair);

        // Store notes
        _notes.push(_npair);
        Browser.storage.local.set({ notes: _notes }, () => document.getElementById('translnoteinput-body').value='');
    }));

    return noteInputSet;
}



// Global process
console.log('TranslPrime ContentScript loaded');

/**
 * Event registration
 */
// On received message from ServiceWorker
Browser.runtime.onMessage.addListener((message) => {
    console.log('Translation', message);

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
            fontFamily: `'Segoe UI Web (West European)', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif`,
            lineHeight: 1
        });

        // 2. Create translate/paraphrase entries
        _overallMenu.addChild(createEntries(message));
        
        _overallMenu.addChild(getHrTemplate(1, 'translprime-hr1'));

        // 3. Create note display section
        _overallMenu.addChild(getDivTemplate(1, 'translprime-notedisplay', { margin: '10px 5px' }));
        
        _overallMenu.addChild(getHrTemplate(1, 'translprime-hr2'));

        // 4.1 Create button set
        _overallMenu.addChild(createMenuButtons());
        // 4.2 Create 'invisible' note input set
        _overallMenu.addChild(createMenuNoteInput(result, message.result));

        // Render
        document.body.appendChild(_overallMenu.HTMLElement);

        // Display possible note(s)
        // displayNote(_translKeys, result.notes);
    });

    return true;
});
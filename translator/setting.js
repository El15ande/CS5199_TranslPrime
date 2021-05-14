// Translation module guidance text
const TRANSLATION_GUIDANCE = [
    { 
        q: 'What is the translation module?',
        a: ['Translation module is a set of functions that helps you to read foreign language texts fluently. It provides 2 translation-related webpage services: Translation and Lexical Explanation.']
    },
    {
        q: 'What is Translation service? How to use it?',
        a: [
            'The Translation service is a light-weight machine translation function that turning a piece of text from one language into another (For example, a German word will be translated into its English equivalent). The translated text will be displayed on the translation popup menu with the original text in the square bracket.',
            '1. Right-select the text (word(s) or sentence(s)) you want to translate, right-click to open the browser context menu.',
            '2. Select "Translate Selected Text" under "TranslPrime"'
        ]
    },
    {
        q: 'What is Lexical Explanation service? How to use it?',
        a: [
            'The Lexical Explanation service is another light-weight machine translation function that provides the restatement of the meaning for a piece of text in another language (For example, a German word will be paraphrased in English with its meaning explained in English). The paraphrases on the translation menu includes part-of-speeches and up to 3 explanations',
            '1. Right-select the text (word(s) and sentence(s)) you want to translate, right-click to open the browser context menu.',
            '2. Select "Get Lexical Explanation" under "TranslPrime"'
        ]
    },
    {
        q: 'What language(s) are supported for these services?',
        a: [
            'The languages supported by the services includes: English, German, French, Spanish and Chinese. These languages are supported for both Source Language (the language of the original text) and Target Language (the language of the translated text on the context menu)',
            'Source Language and Target Language can be changed either in this page (Global Setting) or in the extension popup-page (Toolbar)'
        ]
    },
    {
        q: 'Can I change the API source of translation and paraphrase?',
        a: [
            'Yes, the default API for Translation service is provided by BAIDU Translate, and the default API for Lexical Explanation service is provided by Free Dictionary. The Microsoft Translator V3.0 API is currently disabled.',
            'You can also import your own translate/paraphrase API. The further detail can be found in Readme'
        ]
    }
];

// Note module guidance text
const NOTE_GUIDANCE = [
    {
        q: 'What is the note module?',
        a: ['Note module is a set of functions that helps you to take notes and thus learn the foreign language through reading. It allows you to take notes with (or without) a piece of text inside a webpage.']
    },
    {
        q: 'How to take note?',
        a: [
            '1. With keyword: right-select the text (word(s) or sentence(s)), right-click to open the browser context menu and select "Take Note" under "TranslPrime", the keyword(s) will be displayed in the keyword input bar.',
            '2. Without keyword: right-click on an arbitrary place of the webpage, right-click to open the browser context menu and select "Take Note" under "TranslPrime", the keyword input bar will be empty in this case.'
        ]
    },
    {
        q: 'What can I do with notes?',
        a: [
            '1. Once you have taken a piece of note on some word(s), this note will be displayed on the translation menu if this keyword is searched again.',
            '2. A note composes of 4 elements: the unique note ID, the category, the keyword(s) and the note content. These elements can be freely edited on both translation menu and this global setting page.',
            '3. You can search, visualise and edit your notes in this page. You can also add or remove additional note categories in this page.'
        ]
    }
];



// Global browser
var Browser = chrome || browser; // TODO Check other browser adaptivity

// Local snapshots for notes & note categories
var Notes, NoteCats, TranslAPIs, ParaphAPIs, editedNote;



/**
 * Append options to all <select>
 */
var appendSelects = function() {
    let _createOption = function(cat, text=cat, isDefault=false) {
        let opt = document.createElement('option');
        opt.value = isDefault ? '' : cat;
        opt.text = text;

        return opt;
    }

    // 1. Get all <select>
    let _tapiSel = document.getElementById('tapi-sel');
    let _papiSel = document.getElementById('papi-sel');
    let _searchCatSel = document.getElementById('notesearch-catsel');
    let _editSel = document.getElementById('noteedit-sel');
    let _editCatSel = document.getElementById('noteedit-catsel');
    let _catDelSel = document.getElementById('notecat-delsel');

    // 2. Clear <option>
    _tapiSel.options.length = 0;
    _papiSel.options.length = 0;
    _searchCatSel.options.length = 0;
    _editSel.options.length = 0;
    _editCatSel.options.length = 0;
    _catDelSel.options.length = 0;

    // 3. Append <option> to <select>
    TranslAPIs.forEach((tapi) => _tapiSel.appendChild(_createOption(tapi)));
    ParaphAPIs.forEach((papi) => _papiSel.appendChild(_createOption(papi)));

    _editSel.appendChild(_createOption('', '-', true));
    Notes.forEach((note) => _editSel.appendChild(_createOption(note.id, `${note.note.substring(0,10)}${note.note.length>10 ? '...' : ''} [${note.id}]`)));

    NoteCats.forEach((cat) => {
        let _searchOpt = _createOption(cat);
        let _editOpt = _createOption(cat);
        let _catDelOpt = _createOption(cat);

        _searchCatSel.appendChild(_searchOpt);
        _editCatSel.appendChild(_editOpt);
        _catDelSel.appendChild(_catDelOpt);
    });
}

/**
 * Append notes to #notevis-list
 * @param {Note[]} notes    Notes 
 */
var appendNotes = function(notes) {
    let _getNoteTitle = function(date, keys) {
        // Date
        let _date = new Date(date);
        let _year = _date.getFullYear();
        let _month = _date.getMonth() + 1;
        let _day = _date.getDate();

        let _dateTitle = [
            _year,
            (_month>9 ? '' : '0') + _month,
            (_day>9 ? '' : '0') + _day
        ].join('-');

        let _noteTitle = keys.join(',');

        return `[${_dateTitle}] [${_noteTitle}]`;
    }

    let _notelist = document.getElementById('notevis-list');
    while(_notelist.firstChild) _notelist.firstChild.remove();

    notes.forEach((note) => {
        // 1. Overall div
        let _noteItem = document.createElement('div');
        _noteItem.classList.add('list-group-item');
        
        // 2. Add card title
        let _niTitle = document.createElement('h5');
        _niTitle.textContent = _getNoteTitle(note.id, note.keys);
        _niTitle.classList.add('mb-1');
        _noteItem.appendChild(_niTitle);

        // 3. Add card note
        let _noteLines = note.note.split('\n');
        let _niNote = document.createElement('div');
        _niNote.classList.add('mb-1');
        _noteLines.forEach((nl) => {
            let _line = document.createElement('p');
            _line.style.margin = '0px';
            _line.textContent = nl;
            _niNote.appendChild(_line);
        });
        _noteItem.appendChild(_niNote);

        _notelist.appendChild(_noteItem);
    });
}

/**
 * Append guidance text to #userhelp-modal
 * @param {boolean} isTranslate     Whether the modal is for translation guidance or note guidance
 */
var appendGuidance = function(isTranslate) {
    let _appendQA = function(qaArr) {
        let _modalBody = document.getElementById('userhelp-modalbody');
        while(_modalBody.firstChild) { 
            _modalBody.firstChild.remove(); 
        }

        qaArr.forEach((qa, i) => {
            let qaDiv = document.createElement('div');
            qaDiv.id = `userhelp-qa${i+1}`;


            let _qaQ = document.createElement('h5');
            _qaQ.id = `userhelp-q${i+1}`;
            _qaQ.textContent = qa.q;
            qaDiv.appendChild(_qaQ);

            qa.a.forEach((aline,j) => {
                let _qaA = document.createElement('p');
                _qaA.id = `userhelp-a${i+1}${j+1}`;
                _qaA.textContent = aline;
                qaDiv.appendChild(_qaA);
            });

            _modalBody.appendChild(qaDiv);
            _modalBody.appendChild(document.createElement('hr'));
        });
    }

    // 1. Display modal
    document.getElementById('userhelp-modal').style.display = 'block';

    // 2. Append texts
    document.getElementById('userhelp-modaltitle').textContent = isTranslate ? 'Translation Guidance' : 'Note Guidance'
    _appendQA(isTranslate ? TRANSLATION_GUIDANCE : NOTE_GUIDANCE);
}



// Global process
console.log('TranslPrime GlobalSetting Script loaded');

Browser.storage.local.get(['notes', 'notecats', 'translAPIs', 'paraphAPIs'], (result) => {
    // Global snapshots
    Notes = new Set(result.notes);
    NoteCats = new Set(result.notecats);
    TranslAPIs = new Set(result.translAPIs);
    ParaphAPIs = new Set(result.paraphAPIs);

    appendSelects();
});

/**
 * Event registration: buttons
 */
// On adding new note catgories
document.getElementById('notecat-addbtn').onclick = function(e) {
    let _newCat = document.getElementById('notecat-addinput').value;

    if(NoteCats.has(_newCat)) {
        alert(`${_newCat} already exists.`);
    } else if(!_newCat) {
        alert('Category name cannot be empty.');
    } else {
        NoteCats.add(_newCat);
        Browser.storage.local.set({ notecats: [...NoteCats] }, () => {
            appendSelects();
            document.getElementById('notecat-addinput').value = '';

            alert(`${_newCat} has been added.`);
        });
    }
}

// On removing existing note categories
document.getElementById('notecat-delbtn').onclick = function(e) {
    let _cat = document.getElementById('notecat-delsel').value;

    if(_cat === 'Default') {
        alert(`'Default' category cannot be removed.`);
    } else if(NoteCats.has(_cat)) {
        NoteCats.delete(_cat);
        Browser.storage.local.set({ notecats: [...NoteCats] }, () => appendSelects());

        alert(`${_cat} has been removed. All notes under this category are moved to 'Default' category`);
    }
}

// On searching notes by category
document.getElementById('notesearch-catbtn').onclick = function(e) {
    let _cat = document.getElementById('notesearch-catsel').value;

    document.getElementById('notevis-title').textContent = `Note (category: ${_cat})`;
    appendNotes([...Notes].filter((n) => n.cat === _cat));
}

// On searching notes by keywords
document.getElementById('notesearch-keybtn').onclick = function(e) {
    let _hint = (id, hint) => document.getElementById(id).textContent = hint;

    let _keywords = document.getElementById('notesearch-keyinput').value.toLowerCase().split(',');
    let _matchedNotes = [];

    if(_keywords.length === 1 && _keywords[0] === '') {
        _hint('notevis-list', 'Keyword is empty.');
        return;
    }

    Notes.forEach((note) => {
        let _lowerKeys = note.keys.map((key) => key.toLowerCase());

        // Partial-string search
        if(_keywords.some((key) => 
            _lowerKeys.some((lkey) => lkey.includes(key)) || 
            note.note.toLowerCase().includes(key))
        ) _matchedNotes.push(note);
    });

    if(_matchedNotes.length === 0) {
        _hint('notevis-list', `Note not found.`);
        return;
    }

    _hint('notevis-title', `Note (keyword(s): ${_keywords})`);
    appendNotes(_matchedNotes);
}

// On saving edited notes
document.getElementById('noteedit-save').onclick = function(e) {
    if(editedNote) {
        let _npair = {
            id: editedNote.id,
            cat: document.getElementById('noteedit-catsel').value,
            keys: document.getElementById('noteedit-keyinput').value.split(','),
            note: document.getElementById('noteedit-noteinput').value,
            lang: editedNote.lang
        }
        let _notes = Array.from(Notes).filter((n) => n.id !== editedNote.id);
        _notes.push(_npair);
        editedNote = null;

        Browser.storage.local.set({ notes: _notes }, () => {
            Notes = new Set(_notes);
            document.getElementById('noteedit-sel').value = '';
            document.getElementById('noteedit-catsel').value = 'Default';
            document.getElementById('noteedit-keyinput').value = '';
            document.getElementById('noteedit-noteinput').value = '';

            alert('Note has been changed.');
        });
    } else {
        alert('No note has been selected.');
    }
}

// On clicking translation assistance
document.getElementById('userhelp-translbtn').onclick = function(e) {
    appendGuidance(true);
}

// On clicking note assistance
document.getElementById('userhelp-notebtn').onclick = function(e) {
    appendGuidance(false);
}


// On closing modal
document.getElementById('modal-close').onclick = function(e) {
    document.getElementById('userhelp-modal').style.display = 'none';
}

/**
 * Event registration: select
 */
// On changing T-API (S-Lang/translate/translation)
document.getElementById('tapi-sel').onchange = function(e) {    
    Browser.runtime.sendMessage({
        isTranslate: true,
        name: document.getElementById('tapi-sel').value
    });
}

// On changing P-API (T-Lang/paraphrase/lexical explanation)
document.getElementById('papi-sel').onchange = function(e) {
    Browser.runtime.sendMessage({
        isTranslate: false,
        name: document.getElementById('papi-sel').value
    });
}

// On choosing note which will be edited
document.getElementById('noteedit-sel').onchange = function(e) {
    let _note = Array.from(Notes).find((n) => n.id == document.getElementById('noteedit-sel').value);

    document.getElementById('noteedit-catsel').value = _note ? _note.cat : 'Default';
    document.getElementById('noteedit-keyinput').value = _note ? _note.keys.join(',') : '';
    document.getElementById('noteedit-noteinput').value = _note ? _note.note: '';

    editedNote = _note;
}
// Global browser
var Browser = chrome || browser; // TODO Check other browser adaptivity

// Local snapshots for notes & note categories
var Notes, NoteCats;



/**
 * Append note categories to #notecatdisplay-sel
 */
var appendNoteCats = function() {
    let _createOption = function(cat) {
        let opt = document.createElement('option');
        opt.value = cat;
        opt.text = cat;

        return opt;
    }

    let _catDisplaySel = document.getElementById('notecatdisplay-sel');
    let _manageSel = document.getElementById('notemanage-sel');

    _catDisplaySel.options.length = 0;
    _manageSel.options.length = 0;

    NoteCats.forEach((cat) => {
        let _catOpt = _createOption(cat);
        let _manOpt = _createOption(cat);

        _catDisplaySel.appendChild(_catOpt);
        _manageSel.appendChild(_manOpt);
    });
}

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

        // TODO Add note-editing & note-deleting

        _notelist.appendChild(_noteItem);
    });
}



// Global process
console.log('TranslPrime GlobalSetting Script loaded');

// Card: customising note categories
Browser.storage.local.get(['notes', 'notecats'], (result) => {
    Notes = new Set(result.notes);
    NoteCats = new Set(result.notecats);

    appendNoteCats();
});

/**
 * Event registration
 */
// On adding new note catgories
document.getElementById('notecatadd-btn').onclick = function(e) {
    let _newCat = document.getElementById('notecatadd-input').value;

    if(NoteCats.has(_newCat)) {
        alert(`${_newCat} already exists.`);
    } else if(!_newCat) {
        alert('Category name cannot be empty.');
    } else {
        NoteCats.add(_newCat);
        Browser.storage.local.set({ notecats: [...NoteCats] }, () => appendNoteCats());
        
        alert(`${_newCat} has been added.`);
        document.getElementById('notecatadd-input').value = '';
    }
}

// On removing existing note categories
document.getElementById('notecatdisplay-btn').onclick = function(e) {
    let _cat = document.getElementById('notecatdisplay-sel').value;

    if(_cat === 'Default') {
        alert(`'Default' category cannot be removed.`);
    } else if(NoteCats.has(_cat)) {
        NoteCats.delete(_cat);
        Browser.storage.local.set({ notecats: [...NoteCats] }, () => appendNoteCats());

        alert(`${_cat} has been removed.`);
    }
}

// On accessing notes
document.getElementById('notemanage-btn').onclick = function(e) {
    let _cat = document.getElementById('notemanage-sel').value;

    Browser.storage.local.get(['notes'], (result) => {
        document.getElementById('notevis-title').textContent = `Note (category: ${_cat})`;

        appendNotes(result.notes.filter((n) => n.cat === _cat));
    })
}

// On searching notes
document.getElementById('notesearch-btn').onclick = function(e) {
    let _keyword = document.getElementById('notesearch-input').value.toLowerCase();
    let _matchedNotes = [];

    Browser.storage.local.get(['notes'], (result) => {
        document.getElementById('notevis-title').textContent = `Note (keyword: ${_keyword})`;

        result.notes.forEach((note) => {
            let _lowerKeys = note.keys.map((key) => key.toLowerCase());
            if(_lowerKeys.includes(_keyword) || note.note.toLowerCase().includes(_keyword)) _matchedNotes.push(note);
        });

        appendNotes(_matchedNotes);
    });
}
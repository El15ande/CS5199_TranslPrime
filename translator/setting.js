// Global browser
var Browser = chrome || browser; // TODO Check other browser adaptivity

// Local snapshots for notes & note categories
var Notes, NoteCats;



/**
 * Append note categories to #notecatdisplay-sel
 */
var appendNoteCats = function() {
    let _sel = document.getElementById('notecatdisplay-sel');

    _sel.options.length = 0;

    NoteCats.forEach((cat) => {
        let _catOpt = document.createElement('option');
        _catOpt.value = cat;
        _catOpt.text = cat;

        _sel.appendChild(_catOpt);
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
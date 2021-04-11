// Language codes/key & their corresponding names/value
const LANGUAGE_CODES = {
    'en': 'English',
    'fr': 'French',
    'de': 'German'
};



// Global browser
var Browser = chrome || browser; // TODO Check other browser adaptivity



/**
 * Event registration
 */
// On window loaded
window.onload = function(e) {
    // Create <option> element
    let _createOption = function(lang) {
        let _opt = document.createElement('option');
        _opt.value = lang;
        _opt.innerHTML = LANGUAGE_CODES[lang];

        return _opt;
    }

    let _srcSel = document.getElementById('src-sel');
    let _tarSel = document.getElementById('tar-sel');

    // 1. Append S-Lang menu w/ auto-recognition option
    let _autoOpt = document.createElement('option');
    _autoOpt.value = 'auto';
    _autoOpt.innerHTML = 'Auto Recognition'
    _srcSel.appendChild(_autoOpt);

    // 2. Append S-Lang & T-Lang menu w/ language options
    for(let lang in LANGUAGE_CODES) {
        let _srcOpt = _createOption(lang);
        let _tarOpt = _createOption(lang);

        _srcSel.appendChild(_srcOpt);
        _tarSel.appendChild(_tarOpt);
    }

    // 3. Retrieve S-Lang & T-Lang from Browser.storage.local
    Browser.storage.local.get(['srclang', 'tarlang'], (result) => {
        if(result.srclang) {
            _srcSel.value = result.srclang;
            console.log(`Current S-Lang: ${result.srclang}`);
        }

        if(result.tarlang) {
            _tarSel.value = result.tarlang;
            console.log(`Current T-Lang: ${result.tarlang}`);
        }
    });
}

// On S-Lang menu changed
document.getElementById('src-sel').onchange = function(e) {
    let _newLang = { srclang: document.getElementById('src-sel').value };

    Browser.storage.local.set(_newLang, () => {
        console.log(`New S-Lang: ${_newLang.srclang}`);
    });
}

// On T-Lang menu changed
document.getElementById('tar-sel').onchange = function(e) {
    let _newLang = { tarlang: document.getElementById('tar-sel').value };

    Browser.storage.local.set(_newLang, () => {
        console.log(`New T-Lang: ${_newLang.tarlang}`);
    });
}
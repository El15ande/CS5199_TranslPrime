const SUPPORTED_LANG = {
    'en': 'English',
    'fr': 'French',
    'de': 'German',
    'es': 'Spanish'
};

const QUERY_INFO = {
    active: true,
    currentWindow: true
};



// Global browser object
// TODO Check browser adaptivity
var Browser = chrome || browser;



/**
 * Event registration
 */
window.onload = function(e) {
    console.log('Popup loaded');

    // Create an <option> element
    let _createOption = function(lang) {
        let _opt = document.createElement('option');
        _opt.value = lang;
        _opt.innerHTML = SUPPORTED_LANG[lang];

        return _opt;
    }

    let _srcSel = document.getElementById('src-sel');
    let _tarSel = document.getElementById('tar-sel');

    // 1.1 Append source-lang menu with auto-detection option
    let _autoOpt = document.createElement('option');
    _autoOpt.value = 'auto';
    _autoOpt.innerHTML = 'Auto Detection'
    _srcSel.appendChild(_autoOpt);

    // 1.2 Append source-lang & target-lang menu
    for(let lang in SUPPORTED_LANG) {
        let _srcOpt = _createOption(lang);
        let _tarOpt = _createOption(lang);

        _srcSel.appendChild(_srcOpt);
        _tarSel.appendChild(_tarOpt);
    }

    // 2. Retrieve source-lang & tar-lang from browser storage, otherwise use auto-detection (source) & English (target)
    Browser.storage.local.get(['srclang'], (result) => {
        let _defaultSrc = (result && result.srclang) ? result.srclang : 'auto';
        _srcSel.value = _defaultSrc;

        console.log(`Current source language: ${_defaultSrc}`);
    });

    Browser.storage.local.get(['tarlang'], (result) => {
        let _defaultTar = (result && result.tarlang) ? result.tarlang : 'en';
        _tarSel.value = _defaultTar;
        
        console.log(`Current target language: ${_defaultTar}`);
    });
}

document.getElementById('src-sel').onchange = function(e) {
    let _newLang = { srclang: document.getElementById('srclangsel').value };

    Browser.storage.local.set(_newLang, () => {
        console.log(`New source language: ${_newLang.srclang}`);
    });

    Browser.tabs.query(QUERY_INFO, (tabs) => {
        if(Array.isArray(tabs) && tabs.length > 0) Browser.tabs.sendMessage(tabs[0].id, _newLang);
    });
}

document.getElementById('tar-sel').onchange = function(e) {
    let _newLang = { tarlang: document.getElementById('tarlangsel').value };

    Browser.storage.local.set(_newLang, () => {
        console.log(`New target language: ${_newLang.tarlang}`);
    });

    Browser.tabs.query(QUERY_INFO, (tabs) => {
        if(Array.isArray(tabs) && tabs.length > 0) Browser.tabs.sendMessage(tabs[0].id, _newLang);
    });
}
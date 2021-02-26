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

/**
 * Event registration
 */
window.onload = function(e) {
    console.log('Popup loaded');

    let _srclangsel = document.getElementById('srclangsel');
    let _tarlangsel = document.getElementById('tarlangsel');

    let _createOption = function(lang) {
        let _opt = document.createElement('option');
        _opt.value = lang;
        _opt.innerHTML = SUPPORTED_LANG[lang];

        return _opt;
    }

    // 1.1 Append source-lang menu with auto-detection option
    let _adOpt = document.createElement('option');
    _adOpt.value = 'auto';
    _adOpt.innerHTML = 'Auto detection'
    _srclangsel.appendChild(_adOpt);

    // 1.2 Append source-lang & target-lang menu
    for(let lang in SUPPORTED_LANG) {
        let _srcOpt = _createOption(lang);
        let _tarOpt = _createOption(lang);

        _srclangsel.appendChild(_srcOpt);
        _tarlangsel.appendChild(_tarOpt);
    }

    // 2. Retrieve source-lang & tar-lang from chrome storage, otherwise use auto-detection (source) & English (target)
    chrome.storage.local.get(['srclang'], (result) => {
        let _defaultSrc = (result && result.srclang) ? result.srclang : 'auto';
        _srclangsel.value = _defaultSrc;

        console.log(`Current source language: ${_defaultSrc}`);
    });

    chrome.storage.local.get(['tarlang'], (result) => {
        let _defaultTar = (result && result.tarlang) ? result.tarlang : 'en';
        _tarlangsel.value = _defaultTar;
        
        console.log(`Current target language: ${_defaultTar}`);
    });
}

document.getElementById('srclangsel').onchange = function(e) {
    let _newLang = { srclang: document.getElementById('srclangsel').value };

    chrome.storage.local.set(_newLang, () => {
        console.log(`New source language: ${_newLang.srclang}`);
    });

    chrome.tabs.query(QUERY_INFO, (tabs) => {
        if(Array.isArray(tabs) && tabs.length > 0) chrome.tabs.sendMessage(tabs[0].id, _newLang);
    });
}

document.getElementById('tarlangsel').onchange = function(e) {
    let _newLang = { tarlang: document.getElementById('tarlangsel').value };

    chrome.storage.local.set(_newLang, () => {
        console.log(`New target language: ${_newLang.tarlang}`);
    });

    chrome.tabs.query(QUERY_INFO, (tabs) => {
        if(Array.isArray(tabs) && tabs.length > 0) chrome.tabs.sendMessage(tabs[0].id, _newLang);
    });
}
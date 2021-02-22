const SUPPORTED_LANG = {
    'en_US': 'English',
    'fr': 'French'
}

const QUERY_INFO = {
    active: true,
    currentWindow: true
}

/**
 * Event registration
 */
window.onload = function(e) {
    console.log('Popup loaded');

    let _tarlangsel = document.getElementById('tarlangsel');

    // 1. Append target language select menu
    for(let lang in SUPPORTED_LANG) {
        let _opt = document.createElement('option');
        _opt.value = lang;
        _opt.innerHTML = SUPPORTED_LANG[lang];
        _tarlangsel.appendChild(_opt);
    }

    // 2. Retrieve translation language in chrome storage, otherwise use English
    chrome.storage.local.get(['lang'], (result) => {
        let _defaultLang = (result && result.lang) ? result.lang : 'en_US';
        _tarlangsel.value = _defaultLang;
        
        console.log(`Current language: ${_defaultLang}`);
    });
}

document.getElementById('tarlangsel').onchange = function(e) {
    let _newLang = { lang: document.getElementById('tarlangsel').value };

    chrome.storage.local.set(_newLang, () => {
        console.log(`New language: ${_newLang.lang}`);
    });

    chrome.tabs.query(QUERY_INFO, (tabs) => {
        if(Array.isArray(tabs) && tabs.length > 0) chrome.tabs.sendMessage(tabs[0].id, _newLang);
    });
}
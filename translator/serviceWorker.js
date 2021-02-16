const API_DICTIONARYAPI = 'https://api.dictionaryapi.dev/api/v2/entries/'; // Default API

/**
 * Asynchronous API fetcher
 */
class AsyncFetcher {
    #urls = [];

    constructor(urls) {
        this.#urls = urls;
    }

    async fetchAll(sendResponse) {
        let _fetch = async function(url) {
            let _res = await fetch(url);

            return await _res.json();
        }

        // TODO Check responses
        await Promise.all(this.#urls.map(url => _fetch(url)))
                    .then(responses => sendResponse(responses));
    }
}

/**
 * Service worker event registration
 */
var currentAPI;

// Installation
chrome.runtime.onInstalled.addListener(details => {
    console.log('ServiceWorker installed', details);
    
    currentAPI = API_DICTIONARYAPI;
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(Array.isArray(message.tokens) && message.tokens.length > 0) {
        let _urls = message.tokens.map(token => `${currentAPI}${message.lang}/${token}`);
        let _asyncFetcher = new AsyncFetcher(_urls);

        _asyncFetcher.fetchAll(sendResponse);
    }

    return true;
});
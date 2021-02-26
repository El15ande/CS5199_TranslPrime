const API_DICTIONARYAPI = 'https://api.dictionaryapi.dev/api/v2/entries/';

// Default translation API
var defaultAPI = API_DICTIONARYAPI; 

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
 * Event registration
 */
chrome.runtime.onInstalled.addListener((details) => {
    console.log('ServiceWorker loaded', details);
});

/**
 * Message event handler
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(Array.isArray(message.tokens) && message.tokens.length > 0 && message.lang) {
        let _urls = message.tokens.map(token => `${defaultAPI}${message.lang}/${token}`);
        let _asyncFetcher = new AsyncFetcher(_urls);
        console.log(_urls);

        _asyncFetcher.fetchAll(sendResponse);
    }

    return true;
});
// Default T-API info.
const BAIDU_DOMAIN = 'http://fanyi-api.baidu.com/api/trans/vip/translate';
const BAIDU_APPID = '20210225000706883';
const BAIDU_KEY = 'qQZh8SEkTNffxbK3vevy';
// Default P-API info.
const FREEDICT_DOMAIN = 'https://api.dictionaryapi.dev/api/v2/entries';
// Microsoft API info.
const MS_TRANSLATOR_DOMAIN = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';
const MS_TRANSLATOR_KEY = 'd566277440eb464c9b5e6f9445823858';
const MS_TRANSLATOR_REGION = 'westeurope';

// Number of paraphrase strings contained
const PARAPHRASE_AMOUNT = 3;

// Tokenisation Regex
const TOKEN_REGEX = /[^ A-zÀ-Ÿ-\u4e00-\u9fa5]/g;



// Global browser
var Browser = chrome || browser; // TODO Check other browser adaptivity



/**
 * Text tokeniser
 * @private {string} #text          Original text
 * @private {string} #srclang       Language code snapshot of the source text
 * @private {string} #tarlang       Language code snapshot of the target translation
 * @private {string[]} #tokens      Separated tokens
 * 
 * @getter {object} APIFormat
 */
 class Tokeniser {
    #text = '';
    #srclang = ''; 
    #tarlang = '';
    #tokens = [];

    constructor(text, srclang, tarlang) {
        // Selected text backup
        this.#text = text.includes('\n') ? text.replace(/\n/g, ' ') : text;
        // S-Lang & T-Lang snapshots
        this.#srclang = srclang;
        this.#tarlang = tarlang;

        // Tokenisation
        // Space-separated languages will be tokenised by splitting
        let _tokens = this.#text.replace(TOKEN_REGEX, '').split(' ').map((_t) => _t.toLowerCase());
        // Remove duplicated tokens
        this.#tokens = Array.from(new Set(_tokens));
    }

    // See Readme for returned object detail
    get APIFormat() {
        return {
            from: this.#srclang,
            to: this.#tarlang,
            tokens: this.#tokens,
            text: this.#text
        };
    }
}

/**
 * Translation API 'plug'
 * @public {boolean} type           Type of translation API (TRUE: Translate API) (FALSE: Paraphrase API)
 * @public {string} name            API name displayed on the setting page
 * @public {string} domain          API HTTP(S) domain
 * @private {object} #keys          API keys for different service requirements
 * @private {function} #converter   API converter that takes Tokeniser & generates necessary data for fetch()
 * @private {function} #handler     API callback handler that takes the API result & generates necessary data sending to ContentScript
 * 
 * @public {function} getKey
 * @public {function} toFetchFormat
 * @public {function} toCSFormat
 */
 class TranslationAPI {
    type = false;
    name = '';
    domain = '';
    #keys = {};
    #converter = null;
    #handler = null;

    constructor(type, name, domain, keys, converter, handler) {
        this.type = type;
        this.name = name;
        this.domain = domain;

        this.#keys = Object.assign(keys);
        this.#converter = converter;
        this.#handler = handler;
    }

    /**
     * Get a key from #keys
     * @param {string} name     Key name 
     * @returns {string}        Key value
     */
    getKey(name) {
        return this.#keys.hasOwnProperty(name)
            ? this.#keys[name]
            : '';
    }

    /**
     * Generate necessary data for fetch()
     * @param {Tokeniser}           Tokeniser w/ token info.
     * @returns {FetchFormat[]}     API info. object for fetch() (see Readme for returned object detail)
     */
    toFetchFormat(tokeniser) {
        return this.#converter(this, tokeniser);
    }

    /**
     * Generate necessary data sending to ContentScript
     * @param {object} result           Data retrieved from API
     * @param {Tokeniser} tokeniser     Original tokeniser
     * @returns {Translation[]}         Translation info. object for ContentScript display (see Readme for returned object detail)
     */
    toCSFormat(result, tokeniser) {
        return this.#handler(result, tokeniser);
    }
}



// BAIDU translate API
var BAIDUTranslateAPI = new TranslationAPI(
    true, 
    'Baidu Translate', 
    BAIDU_DOMAIN, 
    { appid: BAIDU_APPID, key: BAIDU_KEY }, 
    (api, tokeniser) => {
        // https://api.fanyi.baidu.com/doc/21
        // console.log(api, tokeniser);

        let _query = {
            q: tokeniser.APIFormat.text,
            from: tokeniser.APIFormat.from,
            to: tokeniser.APIFormat.to,
            salt: (new Date).getTime()
        };

        let _sign = MD5(api.getKey('appid') + _query.q + _query.salt + api.getKey('key'));

        if(_query.from === 'fr') _query.from = 'fra';
        if(_query.to === 'fr') _query.to = 'fra';

        return [{
            isGet: true,
            url: encodeURI(`${api.domain}?q=${_query.q}&from=${_query.from}&to=${_query.to}&appid=${api.getKey('appid')}&salt=${_query.salt}&sign=${_sign}`)
        }];
    },
    (result, tokeniser) => {
        // https://api.fanyi.baidu.com/doc/21
        console.log('Baidu Translate', result, tokeniser);

        if(!Array.isArray(result)) result = [result];

        return {
            langs: [result[0].from, result[0].to],
            translate: {
                source: result[0].trans_result[0].src,
                target: result[0].trans_result[0].dst
            }
        };
    }
);

// Microsoft Translator translate API
var MSTranslatorAPI = new TranslationAPI(
    true,
    'Microsoft Translator V3.0',
    MS_TRANSLATOR_DOMAIN,
    {},
    (api, tokeniser) => {
        // https://docs.microsoft.com/en-us/azure/cognitive-services/translator/reference/v3-0-translate
        // console.log(api, tokeniser);

        let body = JSON.stringify([{ 'Text': tokeniser.APIFormat.text }]);
        let headers = {
            'Ocp-Apim-Subscription-Key': MS_TRANSLATOR_KEY,
            'Ocp-Apim-Subscription-Region': MS_TRANSLATOR_REGION,
            'Content-Type': 'application/json; charset=UTF-8'
        }

        return [{
            isGet: false,
            url: `${api.domain}&to=${tokeniser.APIFormat.to}`,
            headers,
            body
        }];
    },
    (result, tokeniser) => {
        // https://docs.microsoft.com/en-us/azure/cognitive-services/translator/reference/v3-0-translate
        console.log('Microsoft Translator V3.0', result, tokeniser);

        let _result = Array.isArray(result[0])
            ? result[0][0]
            : result[0];

        return {
            langs: [_result.detectedLanguage.language, _result.translations[0].to],
            translate: {
                source: tokeniser.APIFormat.text,
                target: _result.translations[0].text
            }
        };
    }
);

// Free Dictionary paraphrase API
var FreeDictionaryAPI = new TranslationAPI(
    false, 
    'Free Dictionary', 
    FREEDICT_DOMAIN, 
    {},
    (api, tokeniser) => {
        // https://dictionaryapi.dev/
        // console.log(api, tokeniser);

        let _tTokenisers = tokeniser.APIFormat.tokens.map((token) => new Tokeniser(token, tokeniser.APIFormat.from, tokeniser.APIFormat.to));
        let _tFetchFormats = _tTokenisers.map((t) => translateAPI.toFetchFormat(t)[0]);

        return new Promise((res) => {
            fetchAll(_tFetchFormats, (result) => {
                let _tCSFormats = result.map((r) => { return translateAPI.toCSFormat(r, tokeniser); });
                
                res(_tCSFormats.map((tcsFormat) => {
                    return {
                        isGet: true,
                        url: `${api.domain}/${tcsFormat.langs[1]}/${tcsFormat.translate.target}`
                    };
                }));
            }, (translateAPI.domain === BAIDU_DOMAIN && _tFetchFormats.length > 1) ? 1000 : 0);
        });
    },
    (result, tokeniser) => {
        // https://dictionaryapi.dev/
        console.log(result, tokeniser);

        return {
            langs: [tokeniser.APIFormat.to],
            paraphrase: result.map((r1, i) => {
                return {
                    origin: tokeniser.APIFormat.tokens[i],
                    targets: Array.isArray(r1)
                        ? r1.map((r2) => {
                            return {
                                word: r2.word,
                                meanings: Array.isArray(r2.meanings)
                                    ? r2.meanings.map((r3) => {
                                        return {
                                            pos: r3.partOfSpeech,
                                            definitions: Array.isArray(r3.definitions)
                                                ? r3.definitions.map((definition) => definition.definition).slice(0, PARAPHRASE_AMOUNT)
                                                : []
                                        }
                                    })
                                    : []
                            }
                        })
                        : []
                }
            })
        }
    }
);

// T-API 'socket'
var translateAPI = BAIDUTranslateAPI;

// P-API 'socket'
var paraphraseAPI = FreeDictionaryAPI;



/**
 * Print errors to console.error
 * 
 * Error codes:
 *  0   Unsuccessful extension installation
 *  1   Invalid selected text in translate/paraphrase
 *  2   Invalid API call
 * 
 * @param {number} err      Error code
 * @param {object} errObj   Additional error info.
 */
var printErrors = function(err, errObj) {
    let errText = '';
    
    switch (err) {
        case 0: errText = 'Unsuccessful installation'; break;
        // Translate/paraphrase errors
        case 1: errText = 'Invalid selected text'; break;
        case 2: errText = 'Invalid HTTPRequest or API invocation'; break;
        // Browser message exchange errors
        case 3: errText = 'Active tab not found'; break;
        default: break;
    }

    console.error(errText, errObj);
}

/**
 * Code adapted from https://api.fanyi.baidu.com/doc/21
 * 
 * Use MD5 encryption to hash given text
 * @param {string} text     text to be encrypted
 * @returns {string}        MD5-encrypted text
 */
var MD5 = function(text) {
    // Utf8Encode
    let _UTF8encode = function(str) {
        let utfstr = '';
    
        str = str.replace(/\r\n/g, '\n');
        for(let n = 0; n < str.length; n++) {
            let _c = str.charCodeAt(n);
    
            if(_c < 128) {
                utfstr += String.fromCharCode(_c);
            } else if(_c > 127 && _c < 2048) {
                utfstr += String.fromCharCode((_c >> 6) | 192);
                utfstr += String.fromCharCode((_c & 63) | 128);
            } else {
                utfstr += String.fromCharCode((_c >> 12) | 224);
                utfstr += String.fromCharCode((_c >> 6 & 63) | 128);
                utfstr += String.fromCharCode((_c & 63) | 128);
            }
        }
    
        return utfstr;
    }

    // ConvertToWordArray
    let _toWordArr = function(str) {
        let _byteCount = 0; // lByteCount
        let _bytePos = 0; // lBytePosition
        let _wordCount; // lWordCount

        let _strLength = str.length; // lMessageLength
        let _temp1 = _strLength + 8;
        let _temp2 = (_temp1 - (_temp1 % 64)) / 64;
        let _numOfWord = (_temp2 + 1) * 16; // lNumberOfWords

        let wordArr = Array(_numOfWord - 1); // lWordArray

        while(_byteCount < _strLength) {
            _wordCount = (_byteCount - (_byteCount % 4)) / 4;
            _bytePos = (_byteCount % 4) * 8;
            wordArr[_wordCount] = (wordArr[_wordCount] | str.charCodeAt(_byteCount) << _bytePos);
            _byteCount++;
        }

        _wordCount = (_byteCount - (_byteCount % 4)) / 4;
        _bytePos = (_byteCount % 4) * 8;
        wordArr[_wordCount] = wordArr[_wordCount] | (0x80 << _bytePos);
        wordArr[_numOfWord - 2] = _strLength << 3;
        wordArr[_numOfWord - 1] = _strLength >>> 29;

        return wordArr;
    }

    // AddUnsigned
    let _addUnsigned = function(x, y) {
        let _x4 = (x & 0x40000000);
        let _y4 = (y & 0x40000000);
        let _x8 = (x & 0x80000000);
        let _y8 = (y & 0x80000000);
        let _res = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);

        if(_x4 & _y4) return (_res ^ 0x80000000 ^ _x8 ^ _y8);

        if(_x4 | _y4) { 
            return (_res & 0x40000000)
                ? (_res ^ 0xC0000000 ^ _x8 ^ _y8)
                : (_res ^ 0x40000000 ^ _x8 ^ _y8);
        } else return (_res ^ _x8 ^ _y8);
    }

    // RotateLeft
    let _rotateLeft = function(val, bits) {
        return (val << bits) | (val >>> (32 - bits));
    }

    // WordToHex
    let _toHex = function(val) {
        let result = ''; // WordToHexValue
        let _temp = ''; // WordToHexValue_temp
        let _byte; // lByte
        let _count; // lCount

        for(_count = 0; _count <= 3; _count++) {
            _byte = (val >>> (_count * 8)) & 255;
            _temp = '0' + _byte.toString(16);
            result = result + _temp.substr(_temp.length - 2, 2);
        }
        
        return result;
    }

    let F = function(x, y, z) {
        return (x & y) | ((~x) & z);
    }
    
    let G = function(x, y, z) {
        return (x & z) | (y & (~z));
    }
    
    let H = function(x, y, z) {
        return (x ^ y ^ z);
    } 

    let I = function(x, y, z) {
        return (y ^ (x | (~z)));
    }

    // FF, GG, HH, II
    let XX = function(func, a, b, c, d, x, s, ac) {
        a = _addUnsigned(a, _addUnsigned(_addUnsigned(func(b, c, d), x), ac));
        return _addUnsigned(_rotateLeft(a, s), b);
    }

    // Get s in FF/GG/HH/II
    let _getS = function(f, x) {
        let _matrix = {
            f: [7, 12, 17, 22],
            g: [5, 9, 14, 20],
            h: [4, 11, 16, 23],
            i: [6, 10, 15, 21]
        }

        return _matrix[f][x];
    }

    // Get ac in FF/GG/HH/II
    let _getAC = function(f, x) {
        let _ac = {
            f: [
                0xD76AA478, 0xE8C7B756, 0x242070DB, 0xC1BDCEEE, 
                0xF57C0FAF, 0x4787C62A, 0xA8304613, 0xFD469501, 
                0x698098D8, 0x8B44F7AF, 0xFFFF5BB1, 0x895CD7BE,
                0x6B901122, 0xFD987193, 0xA679438E, 0x49B40821
            ],

            g: [
                0xF61E2562, 0xC040B340, 0x265E5A51, 0xE9B6C7AA,
                0xD62F105D, 0x2441453, 0xD8A1E681, 0xE7D3FBC8,
                0x21E1CDE6, 0xC33707D6, 0xF4D50D87, 0x455A14ED,
                0xA9E3E905, 0xFCEFA3F8, 0x676F02D9, 0x8D2A4C8A
            ],

            h: [
                0xFFFA3942, 0x8771F681, 0x6D9D6122, 0xFDE5380C,
                0xA4BEEA44, 0x4BDECFA9, 0xF6BB4B60, 0xBEBFBC70,
                0x289B7EC6, 0xEAA127FA, 0xD4EF3085, 0x4881D05,
                0xD9D4D039, 0xE6DB99E5, 0x1FA27CF8, 0xC4AC5665
            ],

            i: [
                0xF4292244, 0x432AFF97, 0xAB9423A7, 0xFC93A039,
                0x655B59C3, 0x8F0CCC92, 0xFFEFF47D, 0x85845DD1,
                0x6FA87E4F, 0xFE2CE6E0, 0xA3014314, 0x4E0811A1,
                0xF7537E82, 0xBD3AF235, 0x2AD7D2BB, 0xEB86D391
            ]
        };

        return _ac[f][x];
    }

    // Get array index sequence in FF/GG/HH/II
    let _getArrIdx = function(f, x) {
        let _arrIdx = {
            f: [
                0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
            ],
            g: [
                1, 6, 11, 0, 5, 10, 15, 4, 9, 14, 3, 8, 13, 2, 7, 12
            ],
            h: [
                5, 8, 11, 14, 1, 4, 7, 10, 13, 0, 3, 6, 9, 12, 15, 2
            ],
            i: [
                0, 7, 14, 5, 12, 3, 10, 1, 8, 15, 6, 13, 4, 11, 2, 9
            ]
        }

        return _arrIdx[f][x];
    }

    // Iterate FF/GG/HH/II
    let _loopXX = function(f, fname, k) {
        let _ai, _bi, _ci, _di;

        for(let i = 0; i < 4; i++) {
            _ai = i * 4;
            _di = i * 4 + 1;
            _ci = i * 4 + 2;
            _bi = i * 4 + 3;

            _a = XX(f, _a, _b, _c, _d, _arr[k+_getArrIdx(fname, _ai)], _getS(fname, _ai % 4), _getAC(fname, _ai));
            _d = XX(f, _d, _a, _b, _c, _arr[k+_getArrIdx(fname, _di)], _getS(fname, _di % 4), _getAC(fname, _di));
            _c = XX(f, _c, _d, _a, _b, _arr[k+_getArrIdx(fname, _ci)], _getS(fname, _ci % 4), _getAC(fname, _ci));
            _b = XX(f, _b, _c, _d, _a, _arr[k+_getArrIdx(fname, _bi)], _getS(fname, _bi % 4), _getAC(fname, _bi));
        }
    }

    let _arr = Array(); // x
    let _a = 0x67452301; // a
    let _b = 0xEFCDAB89; // b
    let _c = 0x98BADCFE; // c
    let _d = 0x10325476; // d
    let _k, _AA, _BB, _CC, _DD;

    // 1. Use UTF-8 to encode input text
    text = _UTF8encode(text);
    
    // 2. Transform string text into string array
    _arr = _toWordArr(text);
    
    // 3. Encode
    for(_k = 0; _k < _arr.length; _k += 16) {
        _AA = _a;
        _BB = _b;
        _CC = _c;
        _DD = _d;

        _loopXX(F, 'f', _k);
        _loopXX(G, 'g', _k);
        _loopXX(H, 'h', _k);
        _loopXX(I, 'i', _k);

        _a = _addUnsigned(_a, _AA);
        _b = _addUnsigned(_b, _BB);
        _c = _addUnsigned(_c, _CC);
        _d = _addUnsigned(_d, _DD);
    }

    // 4. Combine results
    let result = _toHex(_a) + _toHex(_b) + _toHex(_c) + _toHex(_d);

    return result.toLowerCase();
}

/**
 * @async Asynchronously fetch a group of URLs and response through callback
*  @param {FetchFormat[]} fetchFormats      Array of objects for fetch()
 * @param {function} callback               Promise callback function
 * @param {number} delay                    Delay (ms) between API calls
 */
var fetchAll = async function(fetchFormats, callback, delay=0) {
    // Overridden vanilla fetch() w/ async/await
    let _fetch = async function(ff) {
        let res = await fetch(
            ff.url, 
            ff.isGet 
                ? {}
                : { method: 'POST', headers: ff.headers, body: ff.body }
        );

        return await res.json();
    }

    if(delay > 0) {
        let results = [];
        
        // Predefined delay
        let _delay = function() {
            return new Promise((res) => setTimeout(res, delay));
        }

        // Serial delay and fetch
        for(let fetchFormat of fetchFormats) {
            results.push(await _delay().then(() => _fetch(fetchFormat)));
        }

        callback(results);
    } else {
        // Parallel delay
        await Promise
            .all(fetchFormats.map((ff) => _fetch(ff)))
            .then((responses) => callback(responses));
    }
}



/**
 * Event registration
 */
// On extension installed
 Browser.runtime.onInstalled.addListener((details) => { 
    if(Browser.contextMenus && Browser.storage.local) {
        console.log('TranslPrime ServiceWorker loaded', details);

        // 1. Register context menu items
        Browser.contextMenus.create({
            id: 'TranslPrime1',
            title: '[TranslPrime] Translate Selected Text',
            contexts: ['selection']
        });

        Browser.contextMenus.create({
            id: 'TranslPrime2',
            title: '[TranslPrime] Get Lexical Explanation',
            contexts: ['selection']
        });

        Browser.contextMenus.create({
            id: 'TranslPrime3',
            title: '[TranslPrime] Take Note',
            contexts: ['selection', 'page']
        });

        // 2. Set/reset Browser.storage.local data
        Browser.storage.local.set({ 
            srclang: 'auto', 
            tarlang: 'en', 
            notes: [], 
            notecats: ['Default'],
            translAPIs: [BAIDUTranslateAPI.name, MSTranslatorAPI.name],
            paraphAPIs: [FreeDictionaryAPI.name]
        });

        Browser.runtime.openOptionsPage();
    } else {
        printErrors(0);
    }
 });

 // On message received (from global setting)
 Browser.runtime.onMessage.addListener((info) => {
    console.log(`New ${info.isTranslate ? 'T' : 'P'}-API: ${info.name}`);

    // Default API enumeration
    if(info.isTranslate) {
        translateAPI = info.name === 'Baidu Translate' ? BAIDUTranslateAPI : MSTranslatorAPI;
    }
 });

// On registered item(s) clicked
Browser.contextMenus.onClicked.addListener((info) => {
    // Translation (isTranslate = TRUE: translate) (isTranslate = FALSE: paraphrase) function
    let _translation = function(isTranslate, text) {
        // Main process fetchAll
        let _mainFetchAll = function(fetchFormats, api, tokeniser) {
            // 1. Fetch result
            fetchAll(fetchFormats, (result) => {
                Browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    // 2. Construct ContentScript format
                    let CSFormat = api.toCSFormat(result, tokeniser);

                    // 3. Send to the current active tab
                    if(Array.isArray(tabs) && tabs.length > 0) {
                        Browser.tabs.sendMessage(tabs[0].id, { isTranslate, result: CSFormat });
                    } else {
                        printErrors(3, CSFormat);
                    }
                });
            });
        }

        // 1. Decide which API will be used
        let _API = isTranslate ? translateAPI : paraphraseAPI;

        if(text) {
            Browser.storage.local.get(['srclang', 'tarlang'], (result) => {
                // 2. Construct tokeniser
                let _tokeniser = new Tokeniser(text, result.srclang, result.tarlang);

                // 3. Construct fetch parameters & deliver API result to ContentScript
                if(_API.domain === FREEDICT_DOMAIN) {
                    _API.toFetchFormat(_tokeniser).then((fdResult) => _mainFetchAll(fdResult, _API, _tokeniser));
                } else {
                    _mainFetchAll(_API.toFetchFormat(_tokeniser), _API, _tokeniser);
                }
            });
        } else {
            printErrors(1);
        }
    }

    // Note-taking function
    let _takeNote = function(keyword='') {
        Browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if(Array.isArray(tabs) && tabs.length > 0) {
                Browser.tabs.sendMessage(tabs[0].id, { isSelection: keyword !== '', keyword });
            } else {
                printErrors(3, keyword);
            }
        });
    }

    switch (info.menuItemId) {
        case 'TranslPrime1': _translation(true, info.selectionText); break;
        case 'TranslPrime2': _translation(false, info.selectionText); break;
        case 'TranslPrime3': _takeNote(info.selectionText); break;
        default: break;
    }
});
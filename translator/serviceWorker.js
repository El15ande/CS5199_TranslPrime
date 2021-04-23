// Default B-API
const BAIDU_DOMAIN = 'http://fanyi-api.baidu.com/api/trans/vip/translate';
const BAIDU_APPID = '20210225000706883';
const BAIDU_KEY = 'qQZh8SEkTNffxbK3vevy';
// Default P-API
const GDICT_DOMAIN = 'https://api.dictionaryapi.dev/api/v2/entries';
// Number of paraphrase strings contained
const PARAPHRASE_AMOUNT = 3;
// Tokenisation Regex
const TOKEN_REGEX = /[^ A-zÀ-Ÿ-\u4e00-\u9fa5]/g;



/**
 * Translation API 'plug'
 * @private {boolean} #type     Type of translation API (TRUE: Bilingual API) (FALSE: Paraphrase API)
 * @private {string} #domain    API HTTP(S) domain
 * @private {object} #keys      API keys for different service requirements
 * 
 * @public {string} domain
 * @public {function} getKey
 */
 class TranslationAPI {
    #type = false;
    #domain = '';
    #keys = {};

    constructor(type, domain, keys) {
        this.#type = type;
        this.#domain = domain;
        this.#keys = Object.assign(keys);
    }

    get domain() {
        return this.#domain;
    }

    /**
     * Get key value from specified name
     * @param {string} kname    Key name
     * @returns {string}        Specified key value
     */
    getKey(kname) {
        return this.#keys.hasOwnProperty(kname)
            ? this.#keys[kname]
            : null;
    }
}

/**
 * Text tokeniser
 * @private {string} #text          Original text
 * @private {string} #srclang       Language code snapshot of the source text
 * @private {string} #tarlang       Language code snapshot of the target translation
 * @private {boolean} #isBilingual  Flag of bilingual translation (TRUE: bilingual) (FALSE: paraphrase)
 * @private {string[]} #tokens      Separated tokens
 * 
 * @public {boolean} isBilingual
 * @public {string[]} tokens
 * @public {object} APIFormat
 * @public {function} getToken
 */
 class Tokeniser {
    #text = '';
    #srclang = '';
    #tarlang = '';
    #isBilingual = false;
    #tokens = [];

    constructor(text, srclang, tarlang) {
        this.#text = text;
        // Snapshots
        this.#srclang = srclang;
        this.#tarlang = tarlang;

        // isBilingual flag
        this.#isBilingual = this.#srclang === 'auto' || this.#srclang !== this.#tarlang;

        // Tokenisation
        // Space-separated languages will be tokenised by splitting
        let _text = text.includes('\n') ? text.replace(/\n/g, ' ') : text;
        let _tokens = _text.replace(TOKEN_REGEX, '').split(' ');
        // Remove duplicated tokens
        this.#tokens = Array.from(new Set(_tokens));            
    }

    get isBilingual() {
        return this.#isBilingual;
    }

    get tokens() {
        return this.#tokens;
    }

    /**
     * @returns {object}    Token object (see Readme for detail)
     */
    get APIFormat() {
        let tokenObj = {
            // S-Lang is auto || S-Lang not equal to T-Lang
            isBilingual: this.#isBilingual,
            tokens: [...this.#tokens]
        };

        if(tokenObj.isBilingual) {
            tokenObj.from = this.#srclang;
            tokenObj.to = this.#tarlang;
        } else {
            tokenObj.lang = this.#tarlang;
        }

        return tokenObj;
    }

    /**
     * Get token from specified position
     * @param {number} index    Token position 
     * @returns {string}        Token string
     */
    getToken(index) {
        return (index > -1 && index < this.#tokens.length)
            ? this.#tokens[index]
            : '';
    }
}



// Global browser
var Browser = chrome || browser; // TODO Check other browser adaptivity

// Browser.tabs.query info.
var tabQueryInfo = { active: true, currentWindow: true };

// B-API 'socket'
var bilingualAPI = new TranslationAPI(true, BAIDU_DOMAIN, { appid: BAIDU_APPID, key: BAIDU_KEY });

// P-API 'socket'
var paraphraseAPI = new TranslationAPI(false, GDICT_DOMAIN, {});



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
 * @param {string[]} urls       Array of string URLs
 * @param {function} callback   Promise callback function
 */
var fetchAll = async function(urls, callback) {
    // Overridden vanilla fetch() w/ async/await
    let _fetch = async function(url) {
        let res = await fetch(url);

        return await res.json();
    }

    await Promise
        .all(urls.map((u) => _fetch(u)))
        .then((responses) => callback(responses));
}



/**
 * NOTE: If a new bilingual translation API is 'plugged-in', this function needs to be overriden/modified
 * 
 * Generate URLs for bilingual translation
 * @param {Tokeniser} tokeniser     Tokeniser instance
 * @return {string[]}               URLs for bilingual translation API               
 */
var makeBilingualURLs = function(tokeniser) {
    console.log(`Bilingual Request`, tokeniser);

    let urls = [];
    let _tokenObj = tokeniser.APIFormat;

    if(bilingualAPI.domain === BAIDU_DOMAIN) {
        // Default bilingual translation API: BAIDU
        let _query = {
            q: _tokenObj.tokens.join('\n'),
            from: _tokenObj.from,
            to: _tokenObj.to,
            salt: (new Date).getTime()
        }

        if(_query.from === 'fr') _query.from = 'fra';
        if(_query.to === 'fr') _query.to = 'fra';

        // https://api.fanyi.baidu.com/doc/21
        let _sign = MD5(bilingualAPI.getKey('appid') + _query.q + _query.salt + bilingualAPI.getKey('key'));
        let _url = encodeURI(
            `${bilingualAPI.domain}?q=${_query.q}&from=${_query.from}&to=${_query.to}&appid=${BAIDU_APPID}&salt=${_query.salt}&sign=${_sign}`
        );

        urls.push(_url);
    } else {
        // Modifications for new bilingual translation API
        // urls = ...
    }

    return urls;
}

/**
 * NOTE: If a new bilingual translation API is 'plugged-in', this function needs to be overriden/modified
 * 
 * Callback function for bilingual translation API
 * @param {Tokeniser} tokeniser     Oringinal tokeniser instance
 * @param {string[]} responses      Bilingual API response
 */
var bilingualCallback = function(tokeniser, responses) {
    console.log(`Bilingual Response`, responses);

    if(bilingualAPI.domain === BAIDU_DOMAIN) {
        let _res = responses[0];

        if(_res.hasOwnProperty('trans_result')) { 
            // Language recognition from BAIDU
            let _bFrom = _res.from;
            let _bTo = _res.to;

            if(_bFrom === 'fra') _bFrom = 'fr';
            if(_bTo === 'fra') _bTo = 'fr';

            // 1. Make paraphrase URLs for each translated token
            let _bRes = _res.trans_result;
            let _newToken = (_bFrom === _bTo) ? _bRes[0].dst : _bRes.map((res) => res.dst).join(' ');
            let _resTokeniser = new Tokeniser(_newToken, _bTo, _bTo);
            let _bResURLs = makeParaphraseURLs(_resTokeniser);

            // 2. Fetch & process w/ paraphrase callback
            fetchAll(_bResURLs, (newResponse) => paraphraseCallback(_resTokeniser, newResponse, tokeniser.tokens));
        } else if(_res.hasOwnProperty('error_code')) {
            console.error('Default bilingual API error');
        }

    } else {
        // Modifications for new bilingual translation API
    }
}

/**
 * NOTE: If a new paraphrase translation API is 'plugged-in', this function needs to be overriden/modified
 * 
 * Generate URLs for paraphrase translation
 * @param {Tokeniser} tokeniser     Tokeniser instance
 * @return {string[]}               URLs for paraphrase translation API
 */
var makeParaphraseURLs = function(tokeniser) {
    console.log(`Paraphrase Request`, tokeniser);

    let urls = [];
    let _tokenObj = tokeniser.APIFormat;

    if(paraphraseAPI.domain === GDICT_DOMAIN) {
        urls = _tokenObj.tokens.map((token) => `${paraphraseAPI.domain}/${_tokenObj.lang}/${token}`);
    } else {
        // Modifications for new paraphrase translation API
        // urls = ...
    }

    return urls;
}

/**
 * NOTE: If a new paraphrase translation API is 'plugged-in', this function needs to be overriden/modified
 * 
 * Callback function for bilingual translation API
 * @param {Tokeniser} tokeniser     Oringinal tokeniser instance
 * @param {string[]} responses      Bilingual API response
 * @param {string[]} sources        Source tokens from bilingual callback (optional)
 */
var paraphraseCallback = function(tokeniser, responses, sources=[]) {
    console.log(`Paraphrase Response`, responses);

    if(paraphraseAPI.domain === GDICT_DOMAIN) {
        let _translations = [];

        if(Array.isArray(responses)) {
            responses.forEach((response, index) => {
                // 1. Form translation object
                let _translation = {
                    target: '',
                    paraphrases: []
                }

                // 2. Add paraphrases
                if(Array.isArray(response)) {
                    _translation.target = response[0].word;
                    _translation.source = sources[index] || sources[0];

                    response.forEach((res) => {
                        if(res.meanings.length > 0) {
                            res.meanings.forEach((r) => {
                                _translation.paraphrases.push({
                                    prototype: res.word,
                                    pos: r.partOfSpeech,
                                    definitions: r.definitions.map((def) => def.definition).slice(0, PARAPHRASE_AMOUNT)
                                });
                            });
                        }
                        
                    });
                } else {
                    _translation.target = tokeniser.getToken(index);
                }
                
                _translations.push(_translation);
            });

            // 3. Send translation result to ContentScript
            Browser.tabs.query(tabQueryInfo, (tabs) => {
                if(Array.isArray(tabs) && tabs.length > 0) {
                    Browser.tabs.sendMessage(tabs[0].id, { _translations });
                } else {
                    console.error('Tabs not found', _translations);
                }
            });
        } else {
            console.error('Default paraphrase API error');
        }
    } else {
        // Modifications for new paraphrase translation API
    }
}



/**
 * Global process
 * Event registration
 */
// On extension installed
 Browser.runtime.onInstalled.addListener((details) => {
    console.log('TranslPrime ServiceWorker loaded', details);

    // 1. Register context menu item(s)
    if(Browser.contextMenus) {
        Browser.contextMenus.create({
            id: 'TranslPrime',
            title: '[TranslPrime] Translate selected text',
            contexts: ['selection']
        });
    }
    
    // 3. Set/reset S-Lang & T-Lang to 'auto' (source) and 'en' (target) in Browser.storage.local
    Browser.storage.local.set({ 
        srclang: 'auto', 
        tarlang: 'en', 
        notes: [], 
        notecats: ['Default'] 
    });
 });

// On registered item clicked
Browser.contextMenus.onClicked.addListener((info) => {
    let _selText = info.selectionText;

    if(_selText) {
        Browser.storage.local.get(['srclang', 'tarlang'], (result) => {
            // 1. Register selected text in tokeniser
            let _tokeniser = new Tokeniser(_selText, result.srclang, result.tarlang);
        
            // 2. Construct URLs from tokeniser;
            let _urls = _tokeniser.isBilingual
                ? makeBilingualURLs(_tokeniser)
                : makeParaphraseURLs(_tokeniser);
            
            // 3. Fetch all URLs and pass result to ContentScript
            fetchAll(_urls, (res) => _tokeniser.isBilingual ? bilingualCallback(_tokeniser, res) : paraphraseCallback(_tokeniser, res));
        });
    }
});
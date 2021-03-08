// Bilingual translation API
const SAPI_BAIDU = 'http://fanyi-api.baidu.com/api/trans/vip/translate';
const SAPI_BAIDU_APPID = '20210225000706883';
const SAPI_BAIDU_KEY = 'qQZh8SEkTNffxbK3vevy';
// Paraphrase translation API
const TAPI_GDICTIONARY = 'https://api.dictionaryapi.dev/api/v2/entries';

// Default paraphrase translation API
var defaultAPI = TAPI_GDICTIONARY;

// Global browser object
// TODO Check borwser adaptivity
var _browser = chrome || browser;

/**
 * Asynchronous API fetcher
 * @private {array} #urls   urls that will be fetched
 * @public {function} fetchAll
 */
class AsyncFetcher {
    #urls = [];

    constructor(urls) {
        this.#urls = urls;
    }

    /**
     * Fetch all results from #urls
     * @param {function} res    response function
     */
    async fetchAll(res) {
        let _fetch = async function(url) {
            let _res = await fetch(url);

            return await _res.json();
        }

        // TODO Check responses
        await Promise
            .all(this.#urls.map(url => _fetch(url)))
            .then(responses => res(responses));
    }
}

/**
 * Use MD5 encryption to hash given text
 * Code adapted from https://api.fanyi.baidu.com/doc/21
 * @param {string} text     text to be encrypted
 * @return {string}     MD5-encrypted text
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
 * Event registration
 */
 _browser.runtime.onInstalled.addListener((details) => console.log('ServiceWorker loaded', details));

/**
 * Message event handler
 */
 _browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    let _urls, _asyncFetcher;

    console.log(message);

    if(Array.isArray(message.tokens) && message.tokens.length > 0) {
        if(message.isBilingual) {
            // Bilingual translation
            let _query = {
                q: message.tokens.join('\n'),
                from: message.from,
                to: message.to,
                salt: (new Date).getTime()
            };

            // https://api.fanyi.baidu.com/doc/21
            let _sign = MD5(SAPI_BAIDU_APPID + _query.q + _query.salt + SAPI_BAIDU_KEY);
            let _url = encodeURI(
                `${SAPI_BAIDU}?q=${_query.q}&from=${_query.from}&to=${_query.to}&appid=${SAPI_BAIDU_APPID}&salt=${_query.salt}&sign=${_sign}`
            );

            _asyncFetcher = new AsyncFetcher([_url]);
        } else {
            // Paraphrase translation
            _urls = message.tokens.map((token) => `${defaultAPI}/${message.lang}/${token}`);

            _asyncFetcher = new AsyncFetcher(_urls);
        }

        _asyncFetcher.fetchAll(sendResponse);
        setTimeout(() => {}, 1000);
    }

    return true;
});
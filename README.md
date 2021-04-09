# TranslPrime

2020/0 MSci Project (CS5199): An Aid To Learning & Assessing To Read Foreign Language.

## Technology Stack

- HTML/CSS
  - Bootstrap
- Vanilla JavaScript

### `Browser.storage.local` configurations

- `srclang: string`: language of source text (S-Lang)
- `tarlang: string`: language of target translation (T-Lang)

### API object configurations

If user changes bilingual/paraphrase API to customised translation API which may have other encryption requirements on tokens, the code can be directly appended in `ServiceWorker.makeBilingualURLs()` or `ServiceWorker.makeParaphraseURLs()`. Both functions are required to return only an array of string URLs.

#### `ServiceWorker.Tokeniser.toAPIFormat()`

- General attributes
  - `isBilingual: boolean`: whether the tokens will be translated into another language
  - `tokens: string[]`: tokens that will be translated
- Bilingual (first level) translation object `isBilingual: true`
  - `from: str`: language code corresponding to `tokens` (a.k.a. source language/S-Lang)
  - `to: str`: language code that `tokens` will be translated into (a.k.a. target language/T-Lang)
- Paraphrase (second level) translation object `isBilingual: false`
  - `lang: str`: language code corresponding to `tokens` & will be translated into

#### `ServiceWorker.bilingualCallback()` & `ServiceWorker.paraphraseCallback()` return format

- Default API configuration
  - `isDefault: boolean`: whether the default API is used
- Translations
  - `_translations: Translation[]`: array of translations
    - `Translation.target: string`: translated token (mandatory)
    - `Translation.source: string`: original token (optional)
    - `Translation.paraphrase: Paraphrase[]`: array of paraphrases (optional)
      - `Paraphrase.prototype: string`: word prototype
      - `Paraphrase.pos: string`: word PoS
      - `Paraphrase.definitions: string[]`: word definitions

### Translation menu DOM structure

```HTML
  <div id="translprime-translmenu" tier="0">
    <div id="translprime-translentry1" tier="1">
      <span id="translentry1-title" tier="2">Hello</span>
      
      <div id="translentry1-paraphrase1" tier="2">
        <span id="paraphrase1-pos" tier="3">Noun</span>
        <span id="paraphrase1-definition1" tier="3">A greeting.</span>
        <!-- For n paraphrase results, id goes from paraphrasex-definition1 to paraphrase-definitionn -->
      </div>
    
    </div>

    <!-- For n translation results, id goes from translentry1 to translentryn -->
  </div>
```

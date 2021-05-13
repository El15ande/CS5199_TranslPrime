# TranslPrime

2020/0 MSci Project (CS5199): An Aid To Learning & Assessing To Read Foreign Language.

## Setup

- Google Chrome: install extensions in `chrome://extensions` -> 'Load unpacked'

### Supported target languages

- English
- German
- French

## Technology Stack

- HTML
- CSS
  - Bootstrap
- Vanilla JavaScript

### `Browser.storage.local`

#### Storage variables

- `srclang: string`: language of source text (default: auto detection, can be set by user manually) (a.k.a. S-Lang)
- `tarlang: string`: language of target translation (default: English, can be set by user manually) (a.k.a. T-Lang)
- `notes: Note[]`: notes taken
  - `Note.id: Date`: time of note taken
  - `Note.cat: string`: note category
  - `Note.keys: string[]`: corresponding word/sentence translation
  - `Note.note: string`: note text
  - `Note.lang: string`: T-Lang when note is taken
- `notecats: string[]`: array of note categories
- `translAPIs: string[]`: list of translation APIs
- `paraphAPIs: strings[]`: list of paraphrase APIs

### `ServiceWorker`

#### `ServiceWorker.Tokeniser.APIFormat` returned object attributes

- `from: string`: language code corresponding to `tokens` (a.k.a. source language/S-Lang)
- `to: string`: language code that `tokens` will be translated into (a.k.a. target language/T-Lang)
- `tokens: string[]`: tokens (for word(s) translation)
- `text: string`: original text (for sentence translation)

#### `ServiceWorker.TranslationAPI.toFetchFormat()` parameters & returned object attributes

- Parameter: this `TranslationAPI`, `Tokeniser`
- Returned object: `FetchFormat[]`
  - `FetchFormat.isGet: boolean`: whether the request is GET or POST (TRUE: GET HTTPRequest) (FALSE: POST HTTPRequest)
  - `FetchFormat.url: URL`: final concatenated URL string
  - `FetchFormat.headers: object`: (optional) headers for additional POST info. in fetch()
  - `FetchFormat.body: object`: (optional) body for additional POST info. in fetch()

#### `ServiceWorker.TranslationAPI.toCSFormat()` parameters & returned object attributes

- Parameter: callback result from API, original `Tokeniser`
- Returned object:
  - `langs: string[]`: translation languages
    - `langs.length = 1`: `[T-Lang]`
    - `langs.length = 2`: `[S-Lang, T-Lang]`
  - Either `translate: Translate`: translate content (S-Lang to T-Lang)
    - `Translate.source: string`: source text
    - `Translate.target: string`: target text
  - Or `paraphrase: Paraphrase[]`: paraphrase content (T-Lang)
    - `Paraphrase.origin: string`: original word
    - `Paraphrase.targets: Target[]`: (optional) translated & paraphrased word(s) w/ meaning(s)
      - `Target.word: string`: translated `origin`
      - `Target.meanings: Meaning[]`: translated `origin` meanings
        - `Meaning.pos: string`: part-of-speech
        - `Meaning.definitions: string[]`: definitions

#### `Setting` message attributes

- `isTranslate: boolean`: whether the API is a T-API or P-API (TRUE: T-API) (FALSE: P-API)
- `name: string`: name of the API

### `ContentScript`

#### `ServiceWorker` message attributes

- Translation
  - `isTranslate: boolean`: whether the message is a translate message or a paraphrase message (TRUE: translate) (FALSE: paraphrase)
  - `result: Translate | Paraphrase[]`: translate/paraphrase result
- Note
  - `isSelection: boolean`: whether the note-taking is triggered with a keyword or not (TRUE: keyword = selection text) (FALSE: keyword === '')
  - `keyword: string`: selected keyword

#### Translation menu DOM structure

(Translation context: Hallo, German to English)

```HTML
  <div id="translprime-translmenu" tier="0">
    <!-- Translation section -->
    <!-- message.isTranslate = TRUE -->
    <div id="translprime-translentry1" tier="1">
      <span id="translentry1-transltitle" tier="2">Hello [Hallo]</span>
    </div>
    <!-- message.isTranslate = FALSE -->
    <div id="translprime-translentry1" tier="1">
      <span id="translentry1-paraphtitle" tier="2">Hello</span>
      <div id="translentry1-paraphtar1" tier="2">
        <p id="paraphtar1-title" tier="3">Hello</span>
        <p id="paraphtar1-1pos" tier="3">Noun</span>
        <p id="paraphtar1-1def1" tier="3">Greeting</span>
        <!-- For z target.meaning.definitions, id goes from paraphtarx-ydef1 to paraphtarx-ydefz (maximum: ServiceWorker.PARAPHRASE_AMOUNT) -->
      </div>
      <!-- For y paraphrase.target results, id goes from translentryx-paraphtar1 to translentryx-paraphtary -->
    </div>
    <!-- For x message.paraphrases results, id goes from translentry1 to translentryx -->

    <hr>

    <!-- Note section -->
    <div id="translprime-notedisplay" tier="1">
      <!-- If there is at least one note -->
      <div id="notedisplay-groups" tier="2">
        <div id="notedisplay-group1" tier="3">
          <span id="note1-head" tier="4">Note @ sometime</span>
          <button id="note1-editbtn" tier="4">Edit</button>
          <button id="note1-delbtn" tier="4">Delete</button>
          <div id="note1-keys" tier="4">Keywords: Hallo</div>
          <div id="note1-line1" tier="4">Note line 1</div>
          <div id="note1-line2" tier="4">Note line 2</div>
          <!-- For m lines in the note, id goes from noten-line1 to noten-linem -->
        </div>
        <!-- For n notes, id goes from notedisplay-group1 to notedisplay-groupn -->
      </div>
      <!-- If no note is found -->
      <div id="notedisplay-null">No note for this translation yet</div>
    </div>
    
    <hr>

    <!-- Tools section -->
    <div id="translprime-buttons" tier="1">
      <button type="button" id="translbutton-notebtn" tier="2">Add Note</button>
      <button type="button" id="translbutton-closebtn" tier="2">Close</button>
    </div>

    <div id="translprime-noteinput" tier="1">
      <!-- Category selection -->
      <label id="noteinput-taglabel" tier="2">Note Tag</label>
      <select id="translnoteinput-category" tier="2">
        <option value="Default">Default</option>
        <!-- Other customised category options -->
      </select>
      <!-- Note keys input -->
      <label id="noteinput-keylabel" tier="2">Note Keyword(s)</label>
      <input id="translnoteinput-keys" tier="2">
      <!-- Note input -->
      <label id="noteinput-textlabel" tier="2">Note</label>
      <textarea id="translnoteinput-body" tier="2">
      <span id="translnoteinput-hint" tier="2">...</span>
      <!-- Save button -->
      <button type="button" id="translnoteinput-savebtn" tier="2">Save</button>
    </div>

  </div>
```

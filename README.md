# TBD

2020/0 MSci Project (CS5199): An Aid To Learning & Assessing To Read Foreign Language.

## Technology Stack

### Menu structure

```HTML
    <div id="translationOverallMenu">
        <button type="button">
        <div class="meaning"></div>
        <div class="meaning"></div>
    </div>
```

### Message exchange

#### Message exchange function

- [`chrome.runtime.sendMessage`](https://developer.chrome.com/docs/extensions/reference/runtime/#method-sendMessage)
- [`chrome.tabs.sendMessage`](https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage)

#### Outbound object format

- General attributes
  - `isBilingual: boolean`: flag for whether the tokens will be translated into another language
  - `tokens: array`: tokens that will be translated
- Bilingual (first level) translation object `isBilingual: true`
  - `from: str`: language code corresponding to `tokens`
  - `to: str`: language code that `tokens` will be translated into
- Paraphrase (second level) translation object `isBilingual: false`
  - `lang: str`: language code corresponding to `tokens`

#### Inbound object format

- `word: str`: word that is translated
- `meanings: array`: all translation meanings
  - `meaning.partOfSpeech: str`: POS of current meaning
  - `meaning.definitions: array`: definitions of current meaning
    - `definition.definition: str`: definition string

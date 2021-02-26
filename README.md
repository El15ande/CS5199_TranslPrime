# TBD

2020/0 MSci Project (CS5199): An Aid To Learning & Assessing To Read Foreign Language.

## Technology Stack

### Menu structure

```HTML
    <div id="translationOverallMenu">
        <div class="meaning"></div>
    </div>
```

### Message exchange

#### Message exchange function

- [`chrome.runtime.sendMessage`](https://developer.chrome.com/docs/extensions/reference/runtime/#method-sendMessage)
- [`chrome.tabs.sendMessage`](https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage)

#### Outbound object format

- `tokens: array`: tokens that will be translated
- `lang: str`: language code corresponding to tokens

#### Inbound object format

- `word: str`: word that is translated
- `meanings: array`: all translation meanings
  - `meaning.partOfSpeech: str`: POS of current meaning
  - `meaning.definitions: array`: definitions of current meaning
    - `definition.definition: str`: definition string

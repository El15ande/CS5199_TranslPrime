# TBD

2020/0 MSci Project (CS5199): An Aid To Learning & Assessing To Read Foreign Language.

## Technology Stack

### Menu structure

```HTML
    <div id="translationOverallMenu">
        
    </div>
```

### Message exchange

#### Message exchange function

- [`chrome.runtime.sendMessage`](https://developer.chrome.com/docs/extensions/reference/runtime/#method-sendMessage)
- [`chrome.tabs.sendMessage`](https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage)

#### Message format

- `tokens: array`: tokens that will be translated
- `lang: str`: corresponding language code of tokens
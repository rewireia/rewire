# corpus

Sentences the checks of the guide's words are measured against. Each one says what the check
should do with it; a sentence with a `limit` is one the rules are known to get wrong, kept here in
view with the reason. The tests report the share each check gets right.

```text
employment-claims.json   forecasts of job loss to block and sentences to let through, in English
                         and Spanish, with the sentences of past reviews: `block` or `pass`
prose-figures.json       figures in prose and idioms that only look like them: `figure` or `none`
```

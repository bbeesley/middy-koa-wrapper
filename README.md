# middy-koa-wrapper

## Description

A wrapper to convert middy middleware for use with koa.

## Usage

### Vanilla JS

```javascript
const eventNormaliser = require('@perform/sls-middleware-http-event-normalizer'); // the middy middleware
const { default: wrap } = require('middy-koa-wrapper');

app.use(wrap(eventNormaliser()));
```

### ES6

```javascript
import cors from '@middy/http-cors'; // the middy middleware
import wrap from 'middy-koa-wrapper';

app.use(wrap(eventNormaliser()));
```

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

-   [wrap](#wrap)
    -   [Parameters](#parameters)

### wrap

[src/index.ts:139-172](https://github.com/bbeesley/middy-koa-wrapper/blob/91109a0e373a8f558e4a005e544eef48140bdab1/src/index.ts#L139-L172 "Source code on GitHub")

Main wrapper fn to convert middy middleware to koa middleware

#### Parameters

-   `middyware` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** The middy middleware
    -   `middyware.before` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?** The middy before hook
    -   `middyware.after` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?** The middy after hook
    -   `middyware.onError` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?** The middy onError hook
-   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**  (optional, default `'middyware'`)

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** async koa middleware object

# middy-koa-wrapper

## Description
A wrapper to convert middy middleware for use with koa.

## Usage
```javascript
const eventNormaliser = require('@perform/sls-middleware-http-event-normalizer'); // the middy middleware
const wrap = require('middy-koa-wrapper');

app.use(wrap(eventNormaliser()));
```

## API

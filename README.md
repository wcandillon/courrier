# Courrier

Postman/Newman runner that runs requests in parallel.

[![Circle CI](https://circleci.com/gh/wcandillon/courrier/tree/master.svg?style=svg)](https://circleci.com/gh/wcandillon/courrier/tree/master)

## Usage

```js
const courrier = require('courrier');

const options = {
    envJson: {
        id:'7a04c166-1f65-509b-0d3d-7463182e17c9',
        name:'CellStore',
        values: [{
            key: 'endpoint',
            value: Config['28'].projectEndpoint,
            type:'text',
            enabled: true
        }],
        timestamp: new Date().getTime()
    },
    iterationCount: 1,
    delay: 1,
    responseHandler: 'TestResponseHandler',
    requestTimeout: 300000
};
courrier.execute(JSON.parse(fs.readFileSync('/path/to/postman/collection.json', 'utf-8')), options)
    .then(() => {
        console.log('All tests passed');
    })
    .catch(() => {
        console.log('Some tests failed');
    });
```

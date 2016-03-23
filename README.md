# mailman
Postman/Newman runner that can run requests in parallel

## Usage

```js
let options = {
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
NewmanExecute(JSON.parse(fs.readFileSync('/path/to/postman/collection.json', 'utf-8')), options, function(failed) {
    if(failed) {
        console.log('Some tests failed');
    }
});
```

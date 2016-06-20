'use strict';

var PostmanAPI = require('../lib/postman-api').PostmanAPI;

describe("Postman API", function () {

    let api, key = process.env['POSTMAN_API_KEY'];

    beforeEach(() => api = new PostmanAPI());

    it("tests getCollections()", done => api.getCollections({ apikey: key }).then(resp => {
        expect(resp.body.collections.length).toBeGreaterThan(0);
        done();
    }));
});
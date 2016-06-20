'use strict';

var PostmanAPI = require('../lib/postman-api').PostmanAPI;

describe("Postman API", function () {

    let api, key = process.env['POSTMAN_API_KEY'];

    beforeEach(() => api = new PostmanAPI());

    it("Use API", done => api.getCollections({ xApiKey: key }).then(resp => {
        expect(resp.body.length).toBeGreaterThan(0);
        done();
    }));
});
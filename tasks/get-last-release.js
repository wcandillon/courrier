'use strict';

var request = require('request');

module.exports = function (pluginConfig, config, callback) {
    request({
        url: 'https://api.github.com/repos/wcandillon/courrier/releases?access_token=' + config.env.GH_TOKEN,
        method: 'GET',
        headers: {
            'User-Agent': 'request'
        }
    }, function(err, resp, body){
        var releases = JSON.parse(body);
        /*jshint camelcase: false */
        var tag = !err ? releases[0].tag_name : undefined;
        callback(err, {
            version: tag,
            gitHead: tag,
            releases: releases
        });
    });
};
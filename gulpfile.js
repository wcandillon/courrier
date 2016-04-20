'use strict';

const fs = require('fs');
const path = require('path');

const _ = require('lodash');
const mkdirp = require('mkdirp');
const Q = require('q');

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const map = require('map-stream');
const stylish = require('jshint-stylish');
const courrier = require('./index');

const testReports = process.env.CIRCLE_TEST_REPORTS !== undefined ? process.env.CIRCLE_TEST_REPORTS : 'test-reports';

gulp.task('lint:jslint', () => {
    return gulp.src('index.js')
        .pipe($.jshint())
        .pipe($.jshint.reporter())
        .pipe($.jshint.reporter(stylish))
        .pipe($.jshint.reporter('fail'));
});

gulp.task('lint:jsonlint', () => {
    return gulp.src('package.json')
        .pipe($.jsonlint())
        .pipe($.jsonlint.reporter())
        .pipe(map(function(file, cb) {
            if (!file.jsonlint.success) {
                process.exit(1);
            }
            cb(null, file);
        }));
});

gulp.task('tests', () => {
    mkdirp.sync(testReports);
    const options = {
        envJson: {
            id:'7a04c166-1f65-509b-0d3d-7463182e17c9',
            name:'CellStore',
            values: [{
                key: 'endpoint',
                value: 'http://secxbrl.28.io/v1',
                type:'text',
                enabled: true
            }, {
                key: 'token',
                value: 'c3049752-4d35-43da-82a2-f89f1b06f7a4',
                type: 'text',
                enabled: true
            }],
            timestamp: new Date().getTime()
        },
        iterationCount: 1,
        delay: 1,
        responseHandler: 'TestResponseHandler',
        requestTimeout: 300000
    };
    const collections = ['collections/documentation-examples.json'];
    let promises = [];
    collections.forEach(collection => {
        options.testReportFile = `${testReports}/${path.basename(collection)}.xml`;
        promises.push(courrier.execute(JSON.parse(fs.readFileSync(collection)), options));
    });
    return Q.allSettled(promises).then(promises => {
        if(_.find(promises, promise => promise.state === 'rejected')) {
            throw new Error('Test Failed');
        }
    });
});

gulp.task('default', ['lint:jslint', 'lint:jsonlint', 'tests']);
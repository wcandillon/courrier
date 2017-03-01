'use strict';

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

const fs = require('fs');
const path = require('path');

const _ = require('lodash');
const mkdirp = require('mkdirp');
const Q = require('q');

const courrier = require('../index');

const testReports = process.env.CIRCLE_TEST_REPORTS !== undefined ? process.env.CIRCLE_TEST_REPORTS : 'test-reports';

gulp.task('unit:tests', () => {
    return gulp.src('tests/*.js')
        .pipe($.jasmine());
});

gulp.task('rest:tests', () => {
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
    const collections = ['collections/documentation-examples.json', 'collections/sequential.json'];
    let promises = [];
    collections.forEach(collection => {
        options.testReportFile = `${testReports}/${path.basename(collection)}.xml`;
        promises.push(courrier.execute(JSON.parse(fs.readFileSync(collection)), options));
    });
    return Q.allSettled(promises).then(promises => {
        if(_.find(promises, promise => promise.state === 'rejected')) {
            throw new Error('Test suite Failed');
        }
    });
});

gulp.task('tests', []); //'rest:tests' , 'unit:tests'

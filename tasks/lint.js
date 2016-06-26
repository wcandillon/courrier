'use strict';

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

const fs = require('fs');

const map = require('map-stream');
const stylish = require('jshint-stylish');
const validator = require('is-my-json-valid');

gulp.task('lint:swagger', () => {
    var validate = validator(fs.readFileSync('swagger/swagger.jsonschema', 'utf-8'));
    return gulp.src('swagger/postman_api.json').pipe(map((file, cb) => {
        var api = JSON.parse(file.contents.toString());
        validate(api);
        if(validate.errors && validate.errors.length > 0) {
            var errors = JSON.stringify({ collection: file.path, errors: validate.errors }, null, 2);
            $.util.log($.util.colors.red(errors));
            cb(new Error('Invalid swagger file: ' + file.path), file);
        } else {
            cb(null, file);
        }
    }));
});

gulp.task('lint:jslint', () => {
    return gulp.src(['index.js', 'gulpfile.js', './tasks/*.js'])
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

gulp.task('lint:collections', () => {
    var validator = require('is-my-json-valid');
    var validate = validator(fs.readFileSync('collections/collection.jsonschema', 'utf-8'));
    return gulp.src('tests/rest/**/*.json').pipe(map((file, cb) => {
        validate(JSON.parse(file.contents.toString()));
        if(validate.errors && validate.errors.length > 0) {
            var errors = JSON.stringify({ collection: file.path, errors: validate.errors }, null, 2);
            $.util.log($.util.colors.red(errors));
            cb(new Error('Invalid postman collection: ' + file.path), file);
        } else {
            cb(null, file);
        }
    }));
});

gulp.task('lint', ['lint:swagger', 'lint:jslint', 'lint:jsonlint', 'lint:collections']);
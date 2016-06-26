'use strict';

const gulp = require('gulp');

const runSequence = require('run-sequence');

require('./tasks/swagger');
require('./tasks/lint');
require('./tasks/test');

gulp.task('default', ['swagger', 'lint'], done => {
    runSequence('tests', done);
});

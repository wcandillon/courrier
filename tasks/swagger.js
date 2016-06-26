'use strict';

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

const fs = require('fs');

const CodeGen = require('swagger-js-codegen').CodeGen;

gulp.task('swagger', () => {
    var apis = [{
        swagger: 'swagger/postman_api.json',
        moduleName: 'postman-api',
        className: 'PostmanAPI'
    }];
    //JavaScript Bindings
    var dest = 'lib';
    apis.forEach(function(api){
        var swagger = JSON.parse(fs.readFileSync(api.swagger, 'utf-8'));
        var source = CodeGen.getNodeCode({ moduleName: api.moduleName, className: api.className, swagger: swagger });
        $.util.log('Generated ' + api.moduleName + '.js from ' + api.swagger);
        fs.writeFileSync(dest + '/' + api.moduleName + '.js', source, 'UTF-8');
    });
});
'use strict';

var fs = require('fs');
var _ = require('lodash');
var Q = require('q');
var request = require('request');

const vm = require('vm');
var XMLWriter = require('xml-writer');
var colors = require('colors/safe');

var printStatusCode = status => {
    if(status >= 200 && status <= 300) {
        return colors.green(status);
    } else {
        return colors.red(status);
    }
};

var runTests = (response, tests) => {
    let sandbox = {
            tests: {},
            postman: {
                getResponseHeader: header => response.headers[header.toLowerCase()]
            },
            responseCode: {
                code: response.statusCode
            }
    };
    let context = new vm.createContext(sandbox);
    let script = new vm.Script(tests);
    script.runInContext(context);
    return sandbox.tests;
};

exports.execute = (collection, options) => {
    let xw = new XMLWriter(true);
    xw.startDocument();
    xw.startElement('testsuites');
    let promises = collection.requests.map(req => {
        return new Promise((resolve, reject) => {
            let url = req.url;
            options.envJson.values.forEach(value => {
                url = url.replace(new RegExp(`{{${value.key}}}`, 'g'), value.value);
            });
            let r = {
                uri: url,
                method: req.method,
                headers: req.headers
            };
            request(r, (error, response, body) => {
                if(error) {
                    console.log(colors.red(error));
                    reject(error);
                } else {
                    console.log(`${printStatusCode(response.statusCode)} ${req.name} ${colors.cyan(`[${req.method}]`)} ${url}`);
                    let results = runTests(response, req.tests);
                    let tests = 0;
                    let failures = 0;
                    let cases = [];
                    _.forEach(results, (value, key) => {
                        tests++;
                        cases.push({ name: key, failures: [] });
                        if(value) {
                            console.log(colors.green(`✓ ${key}`));
                        } else {
                            console.log(colors.red(`✗ ${key}`));
                            failures++;
                            cases[cases.length - 1].failures.push({ name: key });
                        }
                    });

                    xw.startElement('testsuite');
                    xw.writeAttribute('name', req.name);
                    xw.writeAttribute('id', req.id);
                    xw.writeAttribute('timestamp', (new Date()).toString());
                    xw.writeAttribute('tests', tests);
                    xw.writeAttribute('failures', failures);
                    cases.forEach(c => {
                        xw.startElement('testcase');
                        xw.writeAttribute('name', c.name);
                        c.failures.forEach(failure => {
                            xw.startElement('failure');
                            xw.writeAttribute('name', failure.name);
                            xw.startCData();
                            xw.text('Request:\n');
                            xw.text(JSON.stringify(r, null, 2));
                            xw.text('\n\n======\nResponse headers\n\n');
                            xw.text(JSON.stringify(response.headers, null, 2));
                            xw.text('\n\n======\nResponse body\n\n');
                            xw.text(_.isString(body) ? body : JSON.stringify(body, null, 2));
                            xw.text('\n\n======\n\n');
                            xw.text('Test cases:');
                            xw.text(req.tests);
                            xw.endCData();
                            xw.endElement();
                        });
                        xw.endElement();
                    });
                    xw.endElement();
                    if(failures > 0) {
                        reject(new Error('Test failed'));
                    } else {
                        resolve({
                            response: response,
                            body: body
                        });
                    }
                }
            });
        });
    });

    return Q.allSettled(promises).finally(() => {
            xw.endDocument();
            fs.writeFileSync(options.testReportFile, xw.toString(), 'utf-8');
            console.log(colors.yellow(`Wrote ${options.testReportFile}`));
    });
};

'use strict';

const fs = require('fs');
const _ = require('lodash');
const Q = require('q');
const request = require('request');

const vm = require('vm');
const XMLWriter = require('xml-writer');
const colors = require('colors/safe');

const printStatusCode = status => {
    if(status >= 200 && status <= 300) {
        return colors.green(status);
    } else {
        return colors.red(status);
    }
};

var runTests = (response, tests, globalVars, env) => {
    let sandbox = {
            tests: {},
            _ : _,
            postman: {
                getResponseHeader: header => response.headers[header.toLowerCase()],
                setGlobalVariable: (key, value) => globalVars[key] = value,
                getGlobalVariable: key => globalVars[key],
                getEnvironmentVariable: key => env[key],
                setEnvironmentVariable: (key, value) => env[key] = value,
            },
            responseCode: {
                code: response.statusCode
            },
            responseBody: response.body
    };
    let context = new vm.createContext(sandbox);
    tests.forEach(test => {
        let script = new vm.Script(test.script.exec);
        try {
            script.runInContext(context);
        } catch(e) {
            tests['Script execute without throwing an exception'] = false;   
        }
    });
    return sandbox.tests;
};

exports.execute = (collection, options) => {
    let globalVars = {};
    let env = {};
    options.envJson.values.forEach(value => {
        env[value.key] = value.value;
    });
    let xw = new XMLWriter(true);
    xw.startDocument();
    xw.startElement('testsuites');
    let promises = collection.item.map(item =>
        () => {
            let req = item.request;
            let defered = Q.defer();
            let url = req.url;
            _.forEach(env, (value, key) => {
                url = url.replace(new RegExp(`{{${key}}}`, 'g'), value);
            });
            let headers = {};
            req.header.forEach(header => {
                headers[header.key] = header.value;
            });
            let r = {
                uri: url,
                method: req.method,
                headers: headers,
                body: (req.body && req.body.raw && req.body.raw !== '') ? req.body.raw : undefined
            };
            request(r, (error, response, body) => {
                if (error) {
                    console.log(colors.red(error));
                    defered.reject(error);
                } else {
                    console.log(`${printStatusCode(response.statusCode)} ${item.name} ${colors.cyan(`[${req.method}]`)} ${url}`);
        let results = runTests(response, item.event.filter(event => event.listen === 'test' && event.script.type === 'text/javascript'), globalVars, env);
                    let tests = 0;
                    let failures = 0;
                    let cases = [];
                    _.forEach(results, (value, key) => {
                        tests++;
                        cases.push({name: key, failures: []});
                        if (value) {
                            console.log(colors.green(`✓ ${key}`));
                        } else {
                            console.log(colors.red(`✗ ${key}`));
                            failures++;
                            cases[cases.length - 1].failures.push({name: key});
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
                            xw.text(item.event[0].script.exec);
                            xw.endCData();
                            xw.endElement();
                        });
                        xw.endElement();
                    });
                    xw.endElement();
                    if (failures > 0) {
                        defered.reject(new Error('Test failed'));
                    } else {
                        defered.resolve({
                            response: response,
                            body: body
                        });
                    }
                }
            });
            return defered.promise;
    });
    let sequential = collection.item.reduce((result, item) => { return result === true || item.request.method.toUpperCase() !== 'GET'; } , false);
    return (
        sequential ?
            promises.reduce((p, n) => p.then(() => n()), Q.resolve()) :
            Q.allSettled(promises.map(p => p()))
    )
    .catch(() => {
        //Failure in the sequential mode
        xw.endDocument();
        fs.writeFileSync(options.testReportFile, xw.toString(), 'utf-8');
        console.log(`Wrote ${options.testReportFile}`);
        throw new Error('Test Failed');
    })
    .then(promises => {
        //Failure in the parallel mode
        xw.endDocument();
        fs.writeFileSync(options.testReportFile, xw.toString(), 'utf-8');
        console.log(`Wrote ${options.testReportFile}`);
        if(promises && _.find(promises, promise => promise.state === 'rejected')) {
            throw new Error('Test Failed');
        }
    });
};

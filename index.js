'use strict';

const fs = require('fs');
const _ = require('lodash');
const request = require('sync-request');
const t = require('exectimer');
const Tick = t.Tick;

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

var runTest = (method, url, options, testRequest, item, globalVars, env, xw) => {
  console.log(`Start request ${colors.cyan(`[${method}]`)} ${url}`);
  var tick = new Tick('testRequest');
  try
  {
    tick.start();
    var response = request(method, url, options);
    tick.stop();
    console.log(`Got response, status: ${printStatusCode(response.statusCode)}, elapsed time ${Math.round(tick.getDiff()/1000/1000)}ms`);
    console.log('Running tests:');
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
    if (failures > 0)
    {
      console.log(colors.red(`${failures}/${tests} tests failed`));
      console.log('\n\n======\nResponse headers\n\n');
      console.log(JSON.stringify(response.headers, null, 2));
      console.log('\n\n======\nResponse body\n\n');
      console.log(_.isString(response.body) ? response.body : response.body.toString());
    }
    else
    {
      console.log(colors.green(`${tests}/${tests} tests passed`));
    }

    xw.startElement('testsuite');
    xw.writeAttribute('name', testRequest.name);
    xw.writeAttribute('id', testRequest.id);
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
            xw.text(method + '' + url);
            xw.text(JSON.stringify(options, null, 2));
            xw.text('\n\n======\nResponse headers\n\n');
            xw.text(JSON.stringify(response.headers, null, 2));
            xw.text('\n\n======\nResponse body\n\n');
            xw.text(_.isString(response.body) ? response.body : response.body.toString());
            xw.text('\n\n======\n\n');
            xw.text('Test cases:');
            xw.text(item.event[0].script.exec);
            xw.endCData();
            xw.endElement();
        });
        xw.endElement();
    });
    xw.endElement();

    return 0;
  }
  catch (httpError)
  {
    tick.stop();
    console.log(colors.red(httpError));

    xw.startElement('testsuite');
    xw.writeAttribute('name', testRequest.name);
    xw.writeAttribute('id', testRequest.id);
    xw.writeAttribute('timestamp', (new Date()).toString());
    xw.writeAttribute('tests', 1);
    xw.writeAttribute('failures', 1);
      xw.startElement('testcase');
      xw.writeAttribute('name', 'response');
        xw.startElement('failure');
        xw.writeAttribute('name', 'HTTPError');
        xw.startCData();
        xw.text('Request:\n');
        xw.text(method + '' + url);
        xw.text(JSON.stringify(options, null, 2));
        xw.text('\n\n======\n\n');
        xw.text('Error:');
        xw.text(httpError.toString());
        xw.endCData();
        xw.endElement();
     xw.endElement();
    xw.endElement();

    return 1;
  }
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
  let failures = 0;
  collection.item.forEach(item => {
    console.log('[START] ' + item.name);
    let testRequest = item.request;
    let url = testRequest.url;
    _.forEach(env, (value, key) => {
        url = url.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    let headers = {};
    testRequest.header.forEach(header => {
        headers[header.key] = header.value;
    });
    let options = {
        headers: headers,
        body: (testRequest.body && testRequest.body.raw && testRequest.body.raw !== '') ? testRequest.body.raw : undefined,
        timeout: 90000,
        socketTimeout: 90000
    };
    let method = testRequest.method;
    failures += runTest(method, url, options, testRequest, item, globalVars, env, xw);

    console.log('[ END ] ' + item.name + '\n');
  });
  xw.endElement();
  xw.endDocument();
  fs.writeFileSync(options.testReportFile, xw.toString(), 'utf-8');
  console.log(`Wrote ${options.testReportFile}`);

  var results = t.timers.testRequest;
  console.log('Total duration of all requests: ' + results.parse(results.duration()));
  console.log('Shortest request: ' + results.parse(results.min()));
  console.log('Longest request: ' + results.parse(results.max()));
  console.log('Average request: ' + results.parse(results.mean()));
  console.log('Median request: ' + results.parse(results.median()));

  if (failures > 0)
  {
    console.log(colors.red(`${failures}/${collection.item.length} testsuites failed`));
    throw new Error(`${failures}/${collection.item.length} testsuites failed`);
  }
  else
  {
    console.log(colors.green(`${failures}/${collection.item.length} testsuites passed`));
  }
};

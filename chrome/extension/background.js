var HEADERS_TO_STRIP_LOWERCASE = [
  'content-security-policy',
  'x-frame-options',
];

chrome.webRequest.onHeadersReceived.addListener(function(details) {
  return {
    responseHeaders: details.responseHeaders.filter(function(header) {
      return HEADERS_TO_STRIP_LOWERCASE.indexOf(header.name.toLowerCase()) < 0;
    })
  };
}, {
  urls: ["<all_urls>"]
}, ["blocking", "responseHeaders"]);

const bluebird = require('bluebird');

global.Promise = bluebird;

function promisifier(method) {
  // return a function
  return function promisified(...args) {
    // which returns a promise
    return new Promise((resolve) => {
      args.push(resolve);
      method.apply(this, args);
    });
  };
}

function promisifyAll(obj, list) {
  list.forEach(api => bluebird.promisifyAll(obj[api], {
    promisifier
  }));
}

// let chrome extension api support Promise
promisifyAll(chrome, [
  'tabs',
  'windows',
  'browserAction',
  'contextMenus'
]);
promisifyAll(chrome.storage, [
  'local',
]);

require('./background/contextMenus');
require('./background/inject');
require('./background/badge');

console.log("background page is working");

chrome.tabs.create({'url': chrome.extension.getURL('test1.html'), 'highlighted': 'true'});
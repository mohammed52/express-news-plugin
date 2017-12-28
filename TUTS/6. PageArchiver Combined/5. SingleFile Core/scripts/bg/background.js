/*
 * Copyright 2011 Gildas Lormeau
 * contact : gildas.lormeau <at> gmail.com
 * 
 * This file is part of SingleFile Core.
 *
 *   SingleFile Core is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   SingleFile Core is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with SingleFile Core.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() {

  // when the background.js starts, DEFAULT_CONFIG and tabs, processingPagesCount and pageId is created
  var DEFAULT_CONFIG = {
    removeFrames: false,
    removeScripts: true,
    removeObjects: true,
    removeHidden: false,
    removeUnusedCSSRules: false,
    displayProcessedPage: false,
    processInBackground: true,
    maxFrameSize: 2,
    getContent: true,
    getRawDoc: false
  };

  var tabs = singlefile.tabs = [],
    processingPagesCount = 0,
    pageId = 0;
  /**
   * executeScripts - call back used in PageData->wininfo init->initRequest->initResponse->process->executeScripts
   * used to executeScripts on the page, executes 5 times for the 5 scripts in the array
   * is a recursive method, calls itself until all scripts have been executed
   * @param  {[integer]}   tabId    
   * @param  {array}   scripts  mix of code and files to execute
   * @param  {Function} callback undefined
   * @param  {array}   index    index of the scripts array
   * scripts array :
   *    code: "var singlefile = {};"
        file: "scripts/common/util.js"
        file: "scripts/common/docprocessor.js"
        code: configScript
        file: "scripts/content/content.js"
   */
  function executeScripts(tabId, scripts, callback, index) {
    console.log("executeScripts(tabId, scripts, callback, index)");
    console.log("tabId:", tabId, "scripts:", scripts, "callback:", callback, "index:", index);
    // console.log(tabId, scripts, callback, index);
    if (!index)
      index = 0;
    if (index < scripts.length)
      chrome.tabs.executeScript(tabId, {
        file: scripts[index].file,
        code: scripts[index].code,
        allFrames: true
      }, function() {
        console.log('}, function() {');
        executeScripts(tabId, scripts, callback, index + 1);
      });
    else if (callback)
      callback();
  }

  function processInit(tabId, port, message) {
    console.log("processInit(tabId, port, message)");

    // tabs = Singlefile.tabs, contains as many tabs as many times you execute the save tab process
    var pageData = tabs[tabId][message.pageId];
    pageData.portsId.push(port.portId_);
    // pageData.getDocData is a bgCore method, returns undefined
    if (!pageData.getDocData(message.winId))
      // pageData.processDoc is a bgCore method
      pageData.processDoc(port, message.topWindow, message.winId, message.index, message.content, message.title, message.url, message.baseURI,
        message.characterSet, message.canvasData, message.contextmenuTime, {
          init: docInit,
          progress: docProgress,
          end: docEnd
        });
  }

  function setContentResponse(tabId, pageId, docData, content) {
    console.log("setContentResponse(tabId, pageId, docData, content)");
    var pageData = tabs[tabId][pageId];
    processingPagesCount--;
    chrome.extension.sendMessage(pageData.senderId, {
      processEnd: true,
      tabId: tabId,
      pageId: pageId,
      blockingProcess: !pageData.config.processInBackground || pageData.config.displayProcessedPage,
      processingPagesCount: processingPagesCount,
      content: pageData.config.getContent ? content : null,
      url: pageData.url,
      title: pageData.title
    });
    if (!pageData.config.processInBackground || pageData.config.displayProcessedPage) {
      pageData.processing = false;
      tabs[tabId].processing = false;
    }
    if (pageData.pendingDelete)
      deletePageData(pageData);
  }

  function docInit(pageData, docData, maxIndex) {
    console.log("docInit(pageData, docData, maxIndex)");
    function pageInit() {
      console.log("pageInit()");
      delete pageData.timeoutPageInit;
      pageData.processableDocs = pageData.initializedDocs;
      pageData.initProcess();
      processingPagesCount++;
      console.log("chrome.extension.sendMessage(pageData.senderId, {");
      chrome.extension.sendMessage(pageData.senderId, {
        processStart: true,
        tabId: pageData.tabId,
        pageId: pageData.pageId,
        blockingProcess: !pageData.config.processInBackground || pageData.config.displayProcessedPage,
        processingPagesCount: processingPagesCount
      });
      if (pageData.config.processInBackground && !pageData.config.displayProcessedPage) {
        tabs[pageData.tabId].processing = false;
        pageData.processing = false;
      }
    }

    if (!docData.initialized) {
      docData.initialized = true;
      if (pageData.initializedDocs != pageData.processableDocs) {
        docData.progressMax = maxIndex;
        pageData.initializedDocs++;
        if (pageData.timeoutPageInit)
          clearTimeout(pageData.timeoutPageInit);
        pageData.timeoutPageInit = setTimeout(pageInit, 5000);
        if (pageData.initializedDocs == pageData.processableDocs || pageData.processSelection || pageData.config.removeFrames
          || pageData.config.getRawDoc) {
          clearTimeout(pageData.timeoutPageInit);
          pageInit();
        }
      }
    }
  }

  function docProgress(pageData, docData, index) {
    console.log("docProgress(pageData, docData, index)");
    var progressIndex = 0,
      progressMax = 0;
    docData.progressIndex = index;
    tabs.forEach(function(tabData) {
      if (tabData) {
        tabData.progressIndex = 0;
        tabData.progressMax = 0;
        tabData.forEach(function(pageData) {
          if (pageData) {
            pageData.computeProgress();
            tabData.progressIndex += pageData.progressIndex;
            tabData.progressMax += pageData.progressMax;
          }
        });
        progressIndex += tabData.progressIndex;
        progressMax += tabData.progressMax;
      }
    });
    console.log("chrome.extension.sendMessage(pageData.senderId, {");
    chrome.extension.sendMessage(pageData.senderId, {
      processProgress: true,
      tabId: pageData.tabId,
      pageId: pageData.pageId,
      pageIndex: pageData.progressIndex,
      pageMaxIndex: pageData.progressMax,
      tabIndex: tabs[pageData.tabId].progressIndex,
      tabMaxIndex: tabs[pageData.tabId].progressMax,
      index: progressIndex,
      maxIndex: progressMax
    });
  }

  function docEnd(pageData, docData, content) {
    console.log("docEnd(pageData, docData, content)");
    pageData.setDocContent(docData, content, setContentResponse);
  }

  /**
   * process() - every process() call creates a new instance of PageData and calls executeScripts with tabIds and scripts, 
   * creates a new PageData and configScrip objects
   * callback and index is left undefined
   * call flow process->pageData->wininfo init->sends a message to the tab
   * @param  {integer} tabId            
   * @param  {object} senderId         id of the sender extension that sent request i.e. PageArchiver
   * @param  {object} config           settings for frames, scripts etc
   * @param  {boolean} processSelection // false when called for the first time
   * @param  {boolean} processFrame     // false when called for the first time
   */
  function process(tabId, senderId, config, processSelection, processFrame) {
    console.log("process(tabId, senderId, config, processSelection, processFrame)");
    var pageData,
      configScript;

    // if processFrame is true, update values config.processInBackground and config.removeFrames
    if (processFrame) {
      config.processInBackground = true;
      config.removeFrames = false;
    }

    // iniialise configScript obj, sets it to a string, singleFile is the name of the extension
    configScript = "singlefile.config = " + JSON.stringify(config) + "; singlefile.pageId = " + pageId + ";"
    + (processSelection ? "singlefile.processSelection = " + processSelection : "");

    // if the processing flag is set for the particular tabId, return ???
    if (tabs[tabId] && tabs[tabId].processing)
      return;
    tabs[tabId] = tabs[tabId] || [];
    tabs[tabId].processing = true;

    // the last method (i.e. exeuteScripts) is a call back, executesScripts on that particular page
    // every process call executes a new pageData method and registers a callback in it
    // what is singlefile ???? singlefile object is created in SingleFile Core\scripts\bg\index.js
    // singleFile.PageData is a method, initialised in SingleFile Core\scripts\bg\bgcore.js
    // all the bg scripts are defined and executed in the 
    // manifest file bg.js, nio.js, wininfo.js, index.js, util.js, background.js etc at extension startup
    // every 
    pageData = new singlefile.PageData(tabId, pageId, senderId, config, processSelection, processFrame, function() {
      console.log('pageData = new singlefile.PageData(tabId, pageId, senderId, config, processSelection, processFrame, function() {');
      executeScripts(tabId, [{
        code: "var singlefile = {};"
      }, {
        file: "scripts/common/util.js"
      }, {
        file: "scripts/common/docprocessor.js"
      }, {
        code: configScript
      }, {
        file: "scripts/content/content.js"
      }]);
    });

    // pageId is created in the SingleFile Core\scripts\bg\background.js
    tabs[tabId][pageId] = pageData;
    pageId++;
  }

  function deletePageData(pageData) {
    console.log("deletePageData(pageData)");
    delete tabs[pageData.tabId][pageData.pageId];
    tabs[pageData.tabId] = tabs[pageData.tabId].filter(function(pageData) {
      return pageData;
    });
    if (!tabs[pageData.tabId].length)
      delete tabs[pageData.tabId];
  }

  /**
   * onConnect - adds onMessage and onDisconnect listeners
   * @param  {object} port contains name(singleFile), onDisconnect, onMessage, sender(extension id ma, tab url etx)
   */
  function onConnect(port) {
    console.log("onConnect(port)");
    var tabId = port.sender.tab.id,
      portPageId = [];

    function onDisconnect() {
      console.log("onDisconnect()");
      var pageData = tabs[tabId][portPageId[port.portId_]];
      if (!pageData)
        return;
      pageData.portsId = pageData.portsId.filter(function(id) {
        return id != port.portId_;
      });
      if (!pageData.portsId.length)
        if (pageData.processing)
          pageData.pendingDelete = true;
        else
          deletePageData(pageData);
    }

    // called when message received from door-quote page script, onMessage calls process Init
    function onMessage(message) {
      console.log("onMessage(message)");
      var pageData,
        docData;
      // if (!message.getResourceContentRequest && !message.docProgress)
      if (message.winId) {
        portPageId[port.portId_] = message.pageId;
        if (message.processInit)
          processInit(tabId, port, message);
        else {
          pageData = tabs[tabId][message.pageId];
          docData = pageData.getDocData(message.winId);
          if (message.processDocFragment)
            pageData.processDocFragment(docData, message.mutationEventId, message.content);
          if (message.getResourceContentRequest)
            pageData
              .getResourceContentRequest(message.url, message.requestId, message.winId, message.characterSet, message.mediaTypeParam, docData);
          if (message.docInit)
            docInit(pageData, docData, message.maxIndex);
          if (message.docProgress)
            docProgress(pageData, docData, message.index);
          if (message.docEnd)
            docEnd(pageData, docData, message.content);
          if (message.setFrameContentResponse)
            docData.children[message.index].setFrameContentCallback();
          if (message.getContentResponse) {
            docData.content = message.content;
            docData.getContentCallback();
          }
          if (message.setContentResponse)
            setContentResponse(tabId, message.pageId, docData, message.content);
        }
      }
    }
    if (port.name == "singlefile") {
      port.onMessage.addListener(onMessage);
      port.onDisconnect.addListener(onDisconnect);
    }
  }
  /**
   * onMessageExternal -- calls the process() method with the tabID, request.id, sender.id
   * @param  {array} request      array of tabIds
   * @param  {object} sender       id and url of the chrome plugin where the request came from
   * @param  {function} sendResponse callBack, call back may do nothing, check from the message sender
   */
  function onMessageExternal(request, sender, sendResponse) {
    console.log("onMessageExternal(request, sender, sendResponse)");
    var property,
      config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    if (request.config)
      for (property in request.config)
        config[property] = request.config[property];
    if (request.processSelection)
      process(request.id, sender.id, config, true, false);
    else if (request.processFrame)
      process(request.id, sender.id, config, false, true);
    else if (request.tabIds)
      request.tabIds.forEach(function(tabId) {
        process(tabId, sender.id, config, false, false);
      });
    else
      process(request.id, sender.id, config, false, false);
    sendResponse({});
  }
  // at the start of background.js, following two listeners are added:
  // chrome.extension.onConnect no longer valid
  // chrome.runtime.onConnect : fired when a connection is made from either an extension process or a content script
  // by runtime.connect: attempts to connect listeners within an extension/app (such as the background page) or other extension/apps,
  // this is useful for content scripts connecting to their extension processes, inter-app/extension communication
  // and web messaging

  chrome.extension.onConnect.addListener(onConnect);

  // 
  chrome.extension.onMessageExternal.addListener(onMessageExternal);

})();

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

var wininfo = {};

(function() {

  var EXT_ID = "wininfo";

  var contentRequestCallbacks,
    executeSetFramesWinIdString = executeSetFramesWinId.toString(),
    processLength,
    processIndex,
    timeoutProcess,
    timeoutInit;

  function addListener(onMessage) {
    console.log("addListener(onMessage)");
    /**
     * fires onMessage->onWindowMessage with the params
     * @param  {object} event event.data has the value: wininfo::{"initResponse":true,"frames":[],"winId":"0","index":0}
     */
    function windowMessageListener(event) {
      console.log("windowMessageListener(event)");
      var data = event.data;
      if (typeof data === "string" && data.indexOf(EXT_ID + "::") == 0)
        onMessage(JSON.parse(data.substr(EXT_ID.length + 2)));
    }
    this.addEventListener("message", windowMessageListener, false);
  }
  /**
   * WHAT DOES THIS DO ???
   * @param  {string} extensionId name of the file that has generated this method, value is 'wininfo'
   * @param  {integer} index       some index, starts with zero
   * @param  {integer} winId       starts from 0
   */
  function executeSetFramesWinId(extensionId, index, winId) {
    console.log("executeSetFramesWinId(extensionId, index, winId)");

    /**
     * execute - WHAT DOES THIS DO ???  iterative, calls itself, 
     * @param  {string} extensionId starting value is wininfo
     * @param  {array} elements    its a NodeList, starting is empty
     * @param  {integer} index       some index ???
     * @param  {integer} winId       also starts from 0
     * @param  {object} win         window object, many objects and methods, the window object is passed to the method execute()
     * @return {[type]}             [description]
     */
    function execute(extensionId, elements, index, winId, win) {
      debugger;
      console.log("execute(extensionId, elements, index, winId, win)");
      var i,
        framesInfo = [],
        stringify = JSON.stringify || JSON.encode,
        parse = JSON.parse || JSON.decode;

      function getDoctype(doc) {
        console.log("getDoctype(doc)");
        var docType = doc.doctype,
          docTypeStr;
        if (docType) {
          docTypeStr = "<!DOCTYPE " + docType.nodeName;
          if (docType.publicId) {
            docTypeStr += " PUBLIC \"" + docType.publicId + "\"";
            if (docType.systemId)
              docTypeStr += " \"" + docType.systemId + "\"";
          } else if (docType.systemId)
            docTypeStr += " SYSTEM \"" + docType.systemId + "\"";
          if (docType.internalSubset)
            docTypeStr += " [" + docType.internalSubset + "]";
          return docTypeStr + ">\n";
        }
        return "";
      }

      function addListener(onMessage) {
        console.log("addListener(onMessage)");

        // this is called when window.postMessage(event) is fired from the execute()
        // event contains:
        // 1. data - 1st argument in the postMessage(arg1)
        // 2. origin - url of the originating window: door-quote-automator.herokuapp.com
        // 3. source - Window object of the source
        // 4. target - Window object for the target
        function windowMessageListener(event) {
          console.log("windowMessageListener(event)");
          var data = event.data;
          if (typeof data === "string" && data.indexOf(extensionId + "::") == 0)
            onMessage(parse(data.substr(extensionId.length + 2)));
        }
        top.addEventListener("message", windowMessageListener, false);
      }

      for (i = 0; i < elements.length; i++) {
        framesInfo.push({
          sameDomain: elements[i].contentDocument != null,
          src: elements[i].src,
          winId: winId + "." + i,
          index: i
        });
      }

      // top is defined in bgcore->pageData, its set top=docData in bgcore->ProcessData
      // win is window object passed to this method at execution
      if (win != top)
        console.log("win.postMessage(extensionId + \"::\" + stringify({");


      // window.postMessage() method safely enables cross-origin communication 
      // between scripts on different pages, causes a MessageEvent to be dispatched
      // at the target window when any pending script that must be executed completes
      // 
      // The MessageEvent has the type message, a data property which is set to the
      //  value of the first argument provided to window.postMessage(), an origin property
      //   corresponding to the origin of the main document in the window calling 
      //   window.postMessage at the time window.postMessage() was called, and a
      //    source property which is the window from which window.postMessage()
      //     is called. (Other standard properties of events are present with 
      //     their expected values.)
      //     
      // sends a message to the target window i.e. ->SingleFile->scriptsbg->wininfo listener
      win.postMessage(extensionId + "::" + stringify({
          initResponse: true,
          winId: winId,
          index: index
        }), "*");

      console.log("top.postMessage(extensionId + \"::\" + stringify({");

      // sends a message to the target window i.e. ->SingleFile->scriptsbg->wininfo listener
      top.postMessage(extensionId + "::" + stringify({
          initResponse: true,
          frames: framesInfo,
          winId: winId,
          index: index
        }), "*");
      for (i = 0; i < elements.length; i++)
        (function(index) {
          console.log("(function(index)");
          var frameElement = elements[i],
            frameWinId = winId + "." + index,
            frameDoc = frameElement.contentDocument;

          function onMessage(message) {
            console.log("onMessage(message)");
            if (message.getContentRequest) {
              var customEvent,
                doctype;
              if (message.winId == frameWinId) {
                doctype = getDoctype(frameDoc);
                console.log("top.postMessage(extensionId + \"::\" + stringify({");
                top.postMessage(extensionId + "::" + stringify({
                    getContentResponse: true,
                    contentRequestId: message.contentRequestId,
                    winId: frameWinId,
                    content: doctype + frameDoc.documentElement.outerHTML,
                    title: frameDoc.title,
                    baseURI: frameDoc.baseURI,
                    url: frameDoc.location.href,
                    characterSet: "UTF-8"
                  }), "*");
              }
            }
          }

          if (frameDoc && top.addEventListener) {
            execute(extensionId, frameDoc.querySelectorAll("iframe, frame"), index, frameWinId, frameElement.contentWindow);
            addListener(onMessage);
          } else {
            console.log("frameElement.contentWindow.postMessage(extensionId + \"::\" + stringify({");
            frameElement.contentWindow.postMessage(extensionId + "::" + stringify({
                initRequest: true,
                winId: frameWinId,
                index: index
              }), "*");
          }
        })(i);
    }
    execute(extensionId, document.querySelectorAll("iframe, frame"), index, winId, window);
  }

  function getContent(frame, callback) {
    console.log("getContent(frame, callback)");
    if (frame.sameDomain) {
      contentRequestCallbacks.push(callback);
      console.log("top.postMessage(EXT_ID + \"::\" + JSON.stringify({");
      top.postMessage(EXT_ID + "::" + JSON.stringify({
          getContentRequest: true,
          winId: frame.winId,
          contentRequestId: contentRequestCallbacks.length - 1
        }), "*");
    } else
      callback({});
  }

  function getContentResponse(message) {
    console.log("getContentResponse(message)");
    var id = message.contentRequestId;
    delete message.contentRequestId;
    delete message.getContentResponse;
    contentRequestCallbacks[id](message);
  }

  /**
   * calls initResponse after 3 seconds 
   * @param  {object} message contains index, initRequest and winId objects, initRequest is true
   */
  function initRequest(message) {
    console.log("initRequest(message)");
    wininfo.winId = message.winId;
    wininfo.index = message.index;
    // why is initResponse being called with a 3 seconds delay ? why not call it immediately ???
    // 
    timeoutInit = setTimeout(function() {
      initResponse({
        initResponse: true,
        frames: [],
        winId: message.winId, // = "0"
        index: message.index
      });
    }, 3000);
    // location is actually window.location, contains objects url, protocol, domain name etc...
    // manually updating the location object ??? sets to a js method executeSetFrameWinIdString
    // location.href = url // set the href to point to another web site... 
    // point to an anchor within a page, point to an email address
    // executeSetFramesWinIdString contains the whole method in a string format with params extensionId, index and winId as params
    // executeSetFramesWinIdString is it returning a method
    // location.href used in the content.js and execute()->onMessage()
    location.href = "javascript:(" + executeSetFramesWinIdString + ")('" + EXT_ID + "'," + wininfo.index + ",'" + wininfo.winId + "'); void 0;";
  }

  /**
   * fired from onWindowMessage->initRequest
   * @param  {object} message contains index, frames, winId, initResponse
   */
  function initResponse(message) {
    console.log("initResponse(message)");

    /**
     * sends a message to SinglePage, with confirmation for initResponse and processableDocs = 1
     * 
     */
    function process() {
      console.log("process()");
      wininfo.frames = wininfo.frames.filter(function(frame) {
        return frame.winId;
      });
      console.log("chrome.extension.sendMessage({");
      // wininfo.frames.length == 0
      // sends a message to the SingleFile chrome background page
      chrome.extension.sendMessage({
        initResponse: true,
        processableDocs: wininfo.frames.length + 1
      });
    }
    // init response removes the timeout before finishing this method
    if (timeoutInit) {
      clearTimeout(timeoutInit);
      timeoutInit = null;
    }
    if (window == top) {
      if (message.frames) {
        message.frames = message.frames instanceof Array ? message.frames : JSON.parse(message.frames);
        wininfo.frames = wininfo.frames.concat(message.frames);
        processLength += message.frames.length;
        if (message.winId != "0")
          processIndex++;
        if (timeoutProcess)
          clearTimeout(timeoutProcess);
        if (processIndex == processLength)
          process();
        else
          timeoutProcess = setTimeout(function() {
            process();
          }, 200);
      }
    } else {
      wininfo.winId = message.winId;
      wininfo.index = message.index;
    }
  }
  /**
   * onExtensionMessage, calls initRequest on the door-quote page, 
   * @param  {object} message contains objects: index, initRequest and winId
   * message.winId is "0"
   */
  function onExtensionMessage(message) {
    console.log("onExtensionMessage(message)");
    if (message.initRequest && document.documentElement instanceof HTMLHtmlElement) {
      contentRequestCallbacks = [];
      processLength = 0;
      processIndex = 0;
      timeoutProcess = null;
      wininfo.frames = [];
      initRequest(message);
    }
  }

  /**
   * fired from windowMessageListener
   * @param  {object} message contains frames, index, initResponse and winId objects
   */
  function onWindowMessage(message) {
    console.log("onWindowMessage(message)");
    if (message.initRequest)
      initRequest(message);
    if (message.initResponse)
      initResponse(message);
    if (message.getContentResponse)
      getContentResponse(message);
  }

  if (window == top) {
    wininfo.getContent = getContent;
    chrome.extension.onMessage.addListener(onExtensionMessage);
  }
  addEventListener("contextmenu", function() {
    console.log("addEventListener(\"contextmenu\", function()");
    window.contextmenuTime = (new Date()).getTime();
  }, false);
  addListener(onWindowMessage);

})();

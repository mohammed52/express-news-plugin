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

  var bgPort,
    docs = {},
    pageId = singlefile.pageId,
    doc = document,
    docElement,
    canvasData = [],
    config = singlefile.config;

  function RequestManager(pageId, winId) {
    console.log("RequestManager(pageId, winId)");
    var requestId = 0,
      callbacks = [];

    this.send = function(url, responseHandler, characterSet, mediaTypeParam) {
      console.log("this.send = function(url, responseHandler, characterSet, mediaTypeParam)");
      callbacks[requestId] = responseHandler;
      console.log("bgPort.postMessage({");
      bgPort.postMessage({
        getResourceContentRequest: true,
        pageId: pageId,
        winId: winId,
        requestId: requestId,
        url: url,
        characterSet: characterSet,
        mediaTypeParam: mediaTypeParam
      });
      requestId++;
    };

    this.onResponse = function(id, content) {
      console.log("this.onResponse = function(id, content)");
      callbacks[id](content);
      callbacks[id] = null;
    };
  }

  function removeUnusedCSSRules() {
    console.log("removeUnusedCSSRules()");
    Array.prototype.forEach.call(document.querySelectorAll("style"), function(style) {
      console.log('Array.prototype.forEach.call(document.querySelectorAll("style"), function(style) {');
      var cssRules = [];

      function process(rules) {
        console.log("process(rules)");
        Array.prototype.forEach.call(rules, function(rule) {
          console.log('Array.prototype.forEach.call(rules, function(rule) {');
          var selector;
          if (rule.media) {
            cssRules.push("@media " + Array.prototype.join.call(rule.media, ",") + " {");
            process(rule.cssRules);
            cssRules.push("}");
          } else if (rule.selectorText) {
            selector = rule.selectorText.replace(/::after|::before|::first-line|::first-letter|:focus|:hover/gi, '').trim();
            if (selector)
              try {
                if (document.querySelector(selector))
                  cssRules.push(rule.cssText);
              } catch ( e ) {
                cssRules.push(rule.cssText);
            }
          }
        });
      }
      if (style.sheet) {
        process(style.sheet.rules);
        style.innerText = cssRules.join("");
      }
    });
  }

  function removeHiddenElements() {
    console.log("removeHiddenElements()");
    Array.prototype.forEach.call(doc.querySelectorAll("html > body *:not(style):not(script):not(link):not(area)"), function(element) {
      console.log('Array.prototype.forEach.call(doc.querySelectorAll("html > body *:not(style):not(script):not(link):not(area)"), function(element) {');
      var style = getComputedStyle(element),
        tagName = element.tagName.toLowerCase();
      if (tagName != "iframe" && !element.querySelector("iframe") && ((style.visibility == "hidden" || style.display == "none" || style.opacity == 0)))
        element.parentElement.removeChild(element);
    });
  }
  // what does this do ???
  /**
   * getSelectedContent() - 
   * returns a node, copies the node and all the childs, applies the styles
   */
  function getSelectedContent() {
    console.log("getSelectedContent()");

    // creates a new node object
    var node,
      wrapper,
      clonedNode,

      // MDN API method, Returns a Selection object representing the range of 
      // text selected by the user or the current position of the caret
      selection = getSelection(),

      // The Selection.rangeCount read-only property returns the number of ranges in the selection
      // Range interface represents a fragment of a documment that can contain nodes and 
      // parts of text nodes
      // A range can be created using the createRange() method of the Document object
      // getRangeAt() = retrieve range objects
      range = selection.rangeCount ? selection.getRangeAt(0) : null;

    /**
     * addStyle - adds style to the node
     */
    function addStyle(node) {
      console.log("addStyle(node)");
      var rules,
        cssText;
      Array.prototype.forEach.call(node.children, function(child) {
        console.log('Array.prototype.forEach.call(node.children, function(child) {');
        addStyle(child);
      });
      // window.getMatchedCSSRules - get all applied css rules of an element and its child elements
      rules = getMatchedCSSRules(node, '', false);
      if (rules) {
        cssText = "";
        Array.prototype.forEach.call(rules, function(rule) {
          console.log('Array.prototype.forEach.call(rules, function(rule) {');
          // rule.style.cssText - returns the actual text of a CSSStyleSheet style-rule
          // converts css classes and all props into string
          cssText += rule.style.cssText;
        });
        node.setAttribute("style", cssText);
      }
    }
    // range.startOffset - returns a number representing where in the startContainer the Range start
    // range.endOffset - returns a number representing where in the endContainer the Range ends
    // div is a pure container, doesn't inherently represent anything
    if (range && range.startOffset != range.endOffset) {
      // commonAncestorContainer - returns the deepest Node that contains the startContainer 
      // and endContainer nodes
      node = range.commonAncestorContainer;
      if (node.nodeType != node.ELEMENT_NODE)
        node = node.parentElement;

      // cloneNode([deep]); - returns a duplicate of the node on which thid method was called
      // deep - true or false, whether to clone the children
      clonedNode = node.cloneNode(true);
      addStyle(node);

      // 
      node.parentElement.replaceChild(clonedNode, node);
    }
    return node;
  }
  /**
   * converts all canvas nodes to dataUrls
   * @param  {object} doc htmlDoc
   * @return {array}     contains all canvas nodes converted into daraUrls
   */
  function getCanvasData(doc) {
    console.log("getCanvasData(doc)");
    var canvasData = [];
    Array.prototype.forEach.call(doc.querySelectorAll("canvas"), function(node) {
      console.log('Array.prototype.forEach.call(doc.querySelectorAll("canvas"), function(node) {');
      var data = null;
      try {
        // HTMLCanvasElement.toDataURL() - returns a data uri , containing a representation of the image
        // in the format specified by the type parameter, 
        // the returned image in in a resolution of 06 dpi
        data = node.toDataURL("image/png", "");
      } catch ( e ) {}
      canvasData.push(data);
    });
    return canvasData;
  }

  function initProcess(doc, docElement, winId, topWindow, canvasData) {
    console.log("initProcess(doc, docElement, winId, topWindow, canvasData)");
    var requestManager = new RequestManager(pageId, winId);
    docs[winId] = {
      doc: doc,
      docElement: docElement,
      frames: docElement.querySelectorAll("iframe, frame"),
      requestManager: requestManager,
      processDoc: singlefile.initProcess(doc, docElement, topWindow, doc.baseURI, doc.characterSet, config, canvasData, requestManager, function(
        maxIndex) {
        console.log('processDoc: singlefile.initProcess(doc, docElement, topWindow, doc.baseURI, doc.characterSet, config, canvasData, requestManager, function(');
        console.log("bgPort.postMessage({");
        bgPort.postMessage({
          docInit: true,
          pageId: pageId,
          winId: winId,
          maxIndex: maxIndex
        });
      }, function(index) {
        console.log('}, function(index) {');
        console.log("bgPort.postMessage({");
        bgPort.postMessage({
          docProgress: true,
          pageId: pageId,
          winId: winId,
          index: index
        });
      }, function() {
        console.log('}, function() {');
        console.log("bgPort.postMessage({");
        bgPort.postMessage({
          docEnd: true,
          pageId: pageId,
          winId: winId,
          content: topWindow ? null : singlefile.util.getDocContent(doc, docElement)
        });
      })
    };
  }

  function sendFgProcessInit(title, url, baseURI, winId, winIndex) {
    console.log("sendFgProcessInit(title, url, baseURI, winId, winIndex)");
    var contextmenuTime = window.contextmenuTime;
    window.contextmenuTime = null;
    console.log("bgPort.postMessage({");
    bgPort.postMessage({
      processInit: true,
      pageId: pageId,
      topWindow: winId ? false : window == top,
      url: url || location.href,
      title: title || doc.title,
      baseURI: baseURI || doc.baseURI,
      winId: winId || wininfo.winId,
      contextmenuTime: contextmenuTime,
      index: winIndex || wininfo.index
    });
  }
  /**
   * content object contains the full page as an object as a string, sends a message to door-quote via bgPort
   * @param  {string} content       full page in string format
   
   rest all params are undefined at the first run

   * @return {[type]}              [description]
   */
  function sendBgProcessInit(content, title, url, baseURI, characterSet, winId, winIndex) {
    console.log("sendBgProcessInit(content, title, url, baseURI, characterSet, winId, winIndex)");

    // contextMenuTime undefined
    var contextmenuTime = window.contextmenuTime;
    if (!this.wininfo)
      return;
    window.contextmenuTime = null;
    console.log("bgPort.postMessage({");
    bgPort.postMessage({
      processInit: true,
      pageId: pageId, // integer 20
      topWindow: winId ? false : window == top, // some string message and string stack combined in an object
      url: url || location.href, // undefined
      title: title || doc.title, // undefined
      content: content, // html page in string
      baseURI: baseURI || doc.baseURI, // undefined
      characterSet: characterSet || doc.characterSet, // undefined
      canvasData: canvasData, // empty array
      winId: winId || wininfo.winId, // undefined
      contextmenuTime: contextmenuTime, // undefined
      index: winIndex || wininfo.index // string message and string stack in one object
    });
  }

  // ----------------------------------------------------------------------------------------------
  /**
   * init() - method called when content.js is run as content_script, adds bgPort.onMessage.addListener
   *  bgprocessinit() and fgpocessinit()
   */
  function init() {
    console.log("init()");
    // getSelectedContent() - copies the top node and all the styles ??
    // create a copy of the node and all child nodes
    var selectedContent = getSelectedContent(),
      // window.top - returns a reference to the top most window in the window hierarchy
      // topWindow - true/false
      topWindow = window == top;

    function doFgProcessInit() {
      console.log("doFgProcessInit()");
      sendFgProcessInit();
      if (docElement && (!singlefile.processSelection || selectedContent)) {
        initProcess(doc, docElement, wininfo.winId, topWindow, canvasData);
        if (topWindow && !config.removeFrames && !config.getRawDoc)
          wininfo.frames.forEach(function(frame) {
            if (frame.sameDomain)
              wininfo.getContent(frame, function(message) {
                console.log('wininfo.getContent(frame, function(message) {');
                var frameDoc = document.implementation.createHTMLDocument();
                frameDoc.open();
                frameDoc.write(message.content);
                frameDoc.close();
                sendFgProcessInit(message.title, message.url, message.baseURI, frame.winId, frame.index);
                initProcess(frameDoc, frameDoc.documentElement, frame.winId, false, getCanvasData(frameDoc));
              });
          });
      }
    }

    /**
     * starts a bgProcess ??? calls sendBgProcessInit() in the first run
     * @return {[type]} [description]
     */
    function bgProcessInit() {
      console.log("bgProcessInit()");
      debugger;
      // what is xhr request? xml request ?
      // xhr = xhm
      var xhr;
      // singleFile initialised in SingleFile->scripts->bg->index.js
      // singleFile has util, initProcess, config, pageId objects and methods
      if (singlefile.processSelection) {
        // top window = true, selectedContent = undefined
        if (selectedContent || !topWindow)
          sendBgProcessInit(topWindow ? singlefile.util.getDocContent(doc, selectedContent) : null);
      } else {
        // config vars, loaded from DEFAULT_CONFIG in background.js
        // top window = true, config.getRawDoc = false
        if (config.getRawDoc && topWindow) {
          xhr = new XMLHttpRequest();
          xhr.onreadystatechange = function() {
            console.log("xhr.onreadystatechange = function()");
            if (xhr.readyState == 4)
              sendBgProcessInit(xhr.responseText);
          };
          xhr.open("GET", doc.location.href, true);
          xhr.overrideMimeType('text/plain; charset=' + doc.characterSet);
          xhr.send(null);
        } else {
          // singlefile.util.getDocContent(doc) - adds a html doc comment to the outerHTML node and calls sendBgProcessInit
          sendBgProcessInit(singlefile.util.getDocContent(doc));
          if (topWindow && !config.removeFrames)
            wininfo.frames.forEach(function(frame) {
              if (frame.sameDomain)
                wininfo.getContent(frame, function(message) {
                  console.log('wininfo.getContent(frame, function(message) {');
                  sendBgProcessInit(message.content, message.title, message.url, message.baseURI, message.characterSet, frame.winId,
                    frame.index);
                });
            });
        }
      }
    }

    function fgProcessInit() {
      console.log("fgProcessInit()");
      var xhr,
        tmpDoc;
      if (singlefile.processSelection) {
        if (selectedContent || topWindow) {
          docElement = selectedContent;
          doFgProcessInit();
        }
      } else if (config.getRawDoc && topWindow) {
        xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          console.log("xhr.onreadystatechange = function()");
          if (xhr.readyState == 4) {
            tmpDoc = document.implementation.createHTMLDocument();
            tmpDoc.open();
            tmpDoc.write(xhr.responseText);
            tmpDoc.close();
            docElement = doc.importNode(tmpDoc.documentElement, true);
            doFgProcessInit();
          }
        };
        xhr.open("GET", doc.location.href, true);
        xhr.overrideMimeType('text/plain; charset=' + doc.characterSet);
        xhr.send(null);
      } else {
        docElement = doc.documentElement.cloneNode(true);
        doFgProcessInit();
      }
    }

    if (!selectedContent) {
      Array.prototype.forEach.call(doc.querySelectorAll("noscript"), function(node) {
        console.log('Array.prototype.forEach.call(doc.querySelectorAll("noscript"), function(node) {');
        node.textContent = "";
      });
      // getCanvasData - array of all canvas nodes converted into data uris
      canvasData = getCanvasData(doc);
      if (config.removeHidden)
        removeHiddenElements();
      if (topWindow)
        document.documentElement.insertBefore(document.createComment("\n Archive processed by SingleFile \n url: " + location.href + " \n saved date: "
          + new Date() + " \n"), document.documentElement.firstChild);
    }
    // if topWindow = true, or removeFrames && getRawDoc
    if ((!config.removeFrames && !config.getRawDoc) || topWindow)
      if (config.processInBackground)
        bgProcessInit();
      else
        fgProcessInit();
  }

  function setContentRequest(message) {
    console.log("setContentRequest(message)");
    var mutationEventId = 0,
      winId = wininfo.winId,
      timeoutSetContent;

    function resetWindowProperties(winPropertiesStr) {
      console.log("resetWindowProperties(winPropertiesStr)");
      var property,
        winProp,
        customEvent,
        parse = JSON.parse || JSON.decode;
      try {
        winProp = parse(winPropertiesStr);
        for (property in window)
          if (!winProp[property])
            window[property] = null;
      } catch ( e ) {}
      customEvent = document.createEvent("CustomEvent");
      customEvent.initCustomEvent("WindowPropertiesCleaned", true, true);
      document.dispatchEvent(customEvent);
    }

    function onDOMSubtreeModified(event) {
      console.log("onDOMSubtreeModified(event)");
      var id = mutationEventId,
        element = event.target,
        processDocFn;

      function onSetDocFragment(message) {
        console.log("onSetDocFragment(message)");
        if (message.setDocFragment && message.mutationEventId == id) {
          doc.removeEventListener("DOMSubtreeModified", onDOMSubtreeModified, true);
          element.innerHTML = message.content;
          doc.addEventListener("DOMSubtreeModified", onDOMSubtreeModified, true);
          bgPort.onMessage.removeListener(onSetDocFragment);
        }
      }

      if (element.innerHTML) {
        if (config.processInBackground) {
          console.log("bgPort.postMessage({");
          bgPort.postMessage({
            processDocFragment: true,
            pageId: pageId,
            winId: winId,
            content: element.innerHTML,
            mutationEventId: id
          });
          bgPort.onMessage.addListener(onSetDocFragment);
          mutationEventId++;
        } else
          processDocFn = singlefile.initProcess(doc, element, false, doc.baseURI, doc.characterSet, config, canvasData, docs[winId].requestManager, function(maxIndex) {
            console.log('processDocFn = singlefile.initProcess(doc, element, false, doc.baseURI, doc.characterSet, config, canvasData, docs[winId].requestManager, function(maxIndex) {');
            doc.removeEventListener("DOMSubtreeModified", onDOMSubtreeModified, true);
            processDocFn();
            doc.addEventListener("DOMSubtreeModified", onDOMSubtreeModified, true);
          });
      }
      event.preventDefault();
    }

    function onWindowPropertiesCleaned() {
      console.log("onWindowPropertiesCleaned()");
      var tmpDoc;

      function replaceDoc() {
        console.log("replaceDoc()");
        doc.replaceChild(docElement, doc.documentElement);
        doc.addEventListener("DOMSubtreeModified", onDOMSubtreeModified, true);
      }

      if (timeoutSetContent) {
        clearTimeout(timeoutSetContent);
        timeoutSetContent = null;
      }
      doc.removeEventListener('WindowPropertiesCleaned', onWindowPropertiesCleaned, true);
      if (config.processInBackground || singlefile.processSelection || (!config.processInBackground && !config.removeScripts))
        if (location.pathname.indexOf(".txt") + 4 == location.pathname.length) {
          tmpDoc = document.implementation.createHTMLDocument();
          tmpDoc.open();
          tmpDoc.write(message.content);
          tmpDoc.close();
          docElement = doc.importNode(tmpDoc.documentElement, true);
          replaceDoc();
        } else {
          doc.open();
          doc.write(message.content || singlefile.util.getDocContent(doc, docElement));
          doc.addEventListener("DOMSubtreeModified", onDOMSubtreeModified, true);
          doc.close();
      }
      else
        replaceDoc();
      if (config.removeUnusedCSSRules)
        removeUnusedCSSRules();
      setContentResponse();
    }

    function sendSetContentResponse(content) {
      console.log("sendSetContentResponse(content)");
      bgPort.postMessage({
        setContentResponse: true,
        winId: "0",
        pageId: pageId,
        content: config.getContent ? content : null
      });
    }

    function setContentResponse() {
      console.log("setContentResponse()");
      if (singlefile.processSelection)
        sendSetContentResponse(message.content);
      else {
        if (config.processInBackground)
          sendSetContentResponse(singlefile.util.getDocContent(doc, doc.documentElement));
        else
          sendSetContentResponse(config.removeUnusedCSSRules ? singlefile.util.getDocContent(doc, doc.documentElement) : singlefile.util
            .getDocContent(doc, docElement));
      }
    }

    if (config.displayProcessedPage) {
      window.location.href = "javascript:(" + resetWindowProperties.toString() + ")('" + JSON.stringify(message.winProperties) + "'); void 0;";
      timeoutSetContent = setTimeout(onWindowPropertiesCleaned, 3000);
      doc.addEventListener('WindowPropertiesCleaned', onWindowPropertiesCleaned, true);
    } else
      setContentResponse();
  }

  function getResourceContentResponse(message) {
    console.log("getResourceContentResponse(message)");
    docs[message.winId].requestManager.onResponse(message.requestId, message.content);
  }

  function setFrameContentRequest(message) {
    console.log("setFrameContentRequest(message)");
    docs[message.winId].frames[message.index].setAttribute("src", "data:text/html;charset=utf-8," + encodeURI(message.content));
    console.log("bgPort.postMessage({");
    bgPort.postMessage({
      setFrameContentResponse: true,
      pageId: pageId,
      winId: message.winId,
      index: message.index
    });
  }

  function getContentRequest(message) {
    console.log("getContentRequest(message)");
    if (docs[message.winId].doc) {
      console.log("bgPort.postMessage({");
      bgPort.postMessage({
        getContentResponse: true,
        winId: message.winId,
        pageId: pageId,
        content: singlefile.util.getDocContent(docs[message.winId].doc, docs[message.winId].docElement)
      });
    } else {
      console.log("bgPort.postMessage({");
      bgPort.postMessage({
        getContentResponse: true,
        pageId: pageId,
        winId: message.winId,
        content: singlefile.util.getDocContent(doc, docElement)
      });
    }
  }

  function processDoc(message) {
    console.log("processDoc(message)");
    if (docs[message.winId])
      docs[message.winId].processDoc();
  }

  // the content script only starts executing from this point, 
  // before this code , only method declarations
  console.log("bgPort = chrome.extension.connect({");
  bgPort = chrome.extension.connect({
    name: "singlefile"
  });
  bgPort.onMessage.addListener(function(message) {
    console.log("bgPort.onMessage.addListener(function(message)");
    // if (!message.getResourceContentResponse)
    if (message.getResourceContentResponse)
      getResourceContentResponse(message);
    if (message.setFrameContentRequest)
      setFrameContentRequest(message);
    if (message.getContentRequest)
      getContentRequest(message);
    if (message.setContentRequest)
      setContentRequest(message);
    if (message.processDoc)
      processDoc(message);
  });
  if (doc.documentElement instanceof HTMLHtmlElement)
    init();

})();

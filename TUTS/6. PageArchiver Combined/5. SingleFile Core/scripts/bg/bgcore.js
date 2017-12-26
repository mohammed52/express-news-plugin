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

  singlefile.PageData = PageData;
  singlefile.DocData = DocData;
  /**
   * PageData - initialises a lot of this... objects,  
   * @param {integer}   tabId            
   * @param {integer}   pageId          var initialized to 0 in background.js, value is 1 in the first call
   * @param {string}   senderId         request sender extension ID i.e. PageArchiver
   * @param {object}   config           settings object, initialized from default settings in background.js
   * @param {bool}   processSelection DONT KNOW ???
   * @param {bool}   processFrame     DONT KNOW ???
   * @param {Function} callback         [calls the execute scripts method on each page]
   */
  function PageData(tabId, pageId, senderId, config, processSelection, processFrame, callback) {
    console.log("PageData(tabId, pageId, senderId, config, processSelection, processFrame, callback)");
    var timeoutError,
      // that is used to get a reference to this e.g. in the in event Handlers
      // used to set processableDocs in the wininfo.init call back ??? processable docs is a count, normally set to 1
      that = this;
    this.pageId = pageId;
    this.docs = [];
    this.processedDocs = 0;
    this.initializedDocs = 0;
    this.processableDocs = 0;
    this.senderId = senderId;
    this.config = config;
    this.processSelection = processSelection;
    this.processFrame = processFrame;
    this.processing = true;
    this.tabId = tabId;
    // creates an instance of nio.RequestManager
    this.requestManager = new singlefile.nio.RequestManager();
    this.progressIndex = 0;
    this.progressMax = 0;
    this.title = null;
    this.url = null;
    this.top = null;
    this.timeoutPageInit = null;
    this.portsId = [];
    this.contextmenuTime = null;
    this.frameDocData = null;
    timeoutError = setTimeout(function() {
      that.processing = false;
      console.log("chrome.extension.sendMessage(that.senderId, {");
      chrome.extension.sendMessage(that.senderId, {
        processError: true,
        tabId: tabId
      });
    }, 15000);

    // sends an message initRequest to the tab door-quote page->wininfo script
    // second param is a call back, it calls the method executeScripts(... )
    // wininfo.js is a global object defined in SingleFile Core\scripts\bg\wininfo.js, contains the init method declaration
    // gets processableDocs from the particular tab/window and sets that.processabe.docs, its a number usually 1
    wininfo.init(tabId, function(processableDocs) {
      clearTimeout(timeoutError);
      that.processableDocs = processableDocs;
      // the callback() calls executeScripts(... ) in the process() method
      callback();
    });
  }

  PageData.prototype = {
    initProcess: function() {
      console.log("initProcess");
      var that = this;
      this.docs.forEach(function(docData) {
        if (that.config.processInBackground) {
          if (docData.processDocCallback)
            docData.processDocCallback();
        } else
          docData.process();
      });
    },
    processDoc: function(port, topWindow, winId, index, content, title, url, baseURI, characterSet, canvasData, contextmenuTime, callbacks) {
      console.log("processDoc: function(port, topWindow, winId, index, content, title, url, baseURI, characterSet, canvasData, contextmenuTime, callbacks)");
      var that = this,
        docData;
      // returns a set of DocData properties, bgCore method
      docData = new DocData(port, winId, index, content, baseURI, characterSet, canvasData);
      if (topWindow) {
        this.top = docData;
        this.title = title || "";
        this.url = url;
      }

      // docData is pushed onto docs
      this.docs.push(docData);
      if (this.processFrame && contextmenuTime && (!this.contextmenuTime || contextmenuTime > this.contextmenuTime)) {
        this.contextmenuTime = contextmenuTime;
        this.frameDocData = docData;
      }
      if (this.config.processInBackground && docData.content) {
        docData.parseContent();
        docData.processDocCallback = singlefile.initProcess(docData.doc, docData.doc.documentElement, topWindow, baseURI, characterSet, this.config,
          canvasData, this.requestManager, function(maxIndex) {
            callbacks.init(that, docData, maxIndex);
          }, function(index, maxIndex) {
            callbacks.progress(that, docData, index);
          }, function() {
            callbacks.end(that, docData);
          });
      }
    },
    processDocFragment: function(docData, mutationEventId, content) {
      console.log("processDocFragment: function(docData, mutationEventId, content)");
      var doc = document.implementation.createHTMLDocument();
      doc.body.innerHTML = content;
      docData.processDocCallback = singlefile.initProcess(doc, doc.documentElement, this.top == docData, docData.baseURI, docData.characterSet,
        this.config, null, this.requestManager, function() {
          docData.processDocCallback();
        }, null, function() {
          docData.setDocFragment(doc.body.innerHTML, mutationEventId);
        });
    },
    setDocContent: function(docData, content, callback) {
      console.log("setDocContent: function(docData, content, callback)");
      var selectedDocData,
        that = this;

      function buildPage(docData, setFrameContent, getContent, callback) {
        console.log("buildPage(docData, setFrameContent, getContent, callback)");
        function setContent(docData) {
          console.log("setContent(docData)");
          var parent = docData.parent;
          if (parent)
            setFrameContent(docData, function() {
              parent.processedChildren++;
              if (parent.processedChildren == parent.childrenLength)
                getContent(parent, function() {
                  setContent(parent);
                });
            });
          else if (callback)
            callback(docData);
        }

        if (docData.childrenLength)
          docData.children.forEach(function(data) {
            buildPage(data, setFrameContent, getContent, callback);
          });
        else
          setContent(docData);
      }

      function bgPageEnd(pageData, docData, callback) {
        console.log("bgPageEnd(pageData, docData, callback)");
        var content = singlefile.util.getDocContent(docData.doc);
        if (pageData.config.displayProcessedPage)
          pageData.top.setContent(content);
        else
          callback(pageData.tabId, pageData.pageId, pageData.top, content);
      }

      if (content)
        docData.content = content;
      this.processedDocs++;
      if (this.processSelection)
        if (this.config.processInBackground)
          bgPageEnd(this, docData, callback);
        else
          docData.getContent(function() {
            that.top.setContent(docData.content);
          });
      else if (this.processedDocs == this.docs.length) {
        this.docs.forEach(function(docData) {
          var parentWinId = docData.winId.match(/((?:\d*\.?)*)\.\d*/);
          parentWinId = parentWinId ? parentWinId[1] : null;
          if (parentWinId)
            that.docs.forEach(function(data) {
              if (data.winId && data.winId == parentWinId)
                docData.parent = data;
            });
          if (docData.parent)
            docData.parent.setChild(docData);
        });
        if (this.frameDocData) {
          selectedDocData = this.frameDocData;
          selectedDocData.parent = null;
        } else
          selectedDocData = this.top;
        if (this.config.processInBackground)
          buildPage(selectedDocData, function(docData, callback) {
            var content = encodeURI(singlefile.util.getDocContent(docData.doc)),
              maxFrameSize = that.config.maxFrameSize;
            if (maxFrameSize > 0 && content.length > maxFrameSize * 1024 * 1024)
              content = "";
            docData.parent.docFrames[docData.index].setAttribute("src", "data:text/html;charset=utf-8," + content);
            delete docData.doc;
            callback();
          }, function(docData, callback) {
            callback();
          }, function(docData) {
            bgPageEnd(that, docData, callback);
          });
        else
          buildPage(this.top, function(docData, callback) {
            docData.parent.setFrameContent(docData, callback);
          }, function(docData, callback) {
            docData.getContent(callback);
          }, function(docData) {
            docData.setContent();
          });
      }
    },
    computeProgress: function() {
      console.log("computeProgress: function()");
      var that = this;
      this.progressIndex = 0;
      this.progressMax = 0;
      this.docs.forEach(function(docData) {
        that.progressIndex += docData.progressIndex || 0;
        that.progressMax += docData.progressMax || 0;
      });
    },
    getResourceContentRequest: function(url, requestId, winId, characterSet, mediaTypeParam, docData) {
      console.log("getResourceContentRequest: function(url, requestId, winId, characterSet, mediaTypeParam, docData)");
      this.requestManager.send(url, function(content) {
        docData.getResourceContentResponse(content, requestId);
      }, characterSet, mediaTypeParam);
    },

    //  returns undefined
    getDocData: function(winId) {
      console.log("getDocData: function(winId)");
      var found;
      // docs length is 0
      this.docs.forEach(function(docData) {
        if (docData.winId == winId)
          found = docData;
      });
      // returns undefined
      return found;
    }
  };

  function DocData(port, winId, index, content, baseURI, characterSet, canvasData) {
    console.log("DocData(port, winId, index, content, baseURI, characterSet, canvasData)");
    this.port = port;
    this.content = content;
    this.baseURI = baseURI;
    this.characterSet = characterSet;
    this.canvasData = canvasData;
    this.winId = winId;
    this.index = index;
    this.children = [];
    this.doc = null;
    this.docFrames = null;
    this.processDocCallback = null;
    this.getContentCallback = null;
    this.setFrameContentCallback = null;
    this.processedChildren = 0;
    this.childrenLength = 0;
  }

  DocData.prototype = {
    parseContent: function() {
      console.log("parseContent");
      var doc = document.implementation.createHTMLDocument();
      doc.open();
      doc.write(this.content);
      doc.close();
      this.doc = doc;
      this.docFrames = doc.querySelectorAll("iframe, frame");
      delete this.content;
    },
    setChild: function(childDoc) {
      console.log("setChild: function(childDoc)");
      this.children[childDoc.index] = childDoc;
      this.childrenLength++;
    },
    process: function() {
      console.log("process: function()");
      console.log("this.port.postMessage({");
      this.port.postMessage({
        processDoc: true,
        winId: this.winId
      });
    },
    setDocFragment: function(content, mutationEventId) {
      console.log("setDocFragment: function(content, mutationEventId)");
      console.log("this.port.postMessage({");
      this.port.postMessage({
        setDocFragment: true,
        content: content,
        mutationEventId: mutationEventId
      });
    },
    getResourceContentResponse: function(content, requestId) {
      console.log("getResourceContentResponse: function(content, requestId)");
      console.log("this.port.postMessage({");
      this.port.postMessage({
        getResourceContentResponse: true,
        requestId: requestId,
        winId: this.winId,
        content: content
      });
    },
    setContent: function(content) {
      console.log("setContent: function(content)");
      console.log("this.port.postMessage({");
      this.port.postMessage({
        setContentRequest: true,
        content: content,
        winProperties: singlefile.winProperties
      });
    },
    getContent: function(callback) {
      console.log("getContent: function(callback)");
      this.getContentCallback = callback;
      console.log("this.port.postMessage({");
      this.port.postMessage({
        getContentRequest: true,
        winId: this.winId
      });
    },
    setFrameContent: function(docData, callback) {
      console.log("setFrameContent: function(docData, callback)");
      docData.setFrameContentCallback = callback;
      console.log("this.port.postMessage({");
      this.port.postMessage({
        setFrameContentRequest: true,
        winId: this.winId,
        index: docData.index,
        content: docData.content
      });
    }
  };

  (function() {
    var property,
      winProperties = {};
    for (property in window)
      winProperties[property] = true;
    singlefile.winProperties = winProperties;
  })();

})();

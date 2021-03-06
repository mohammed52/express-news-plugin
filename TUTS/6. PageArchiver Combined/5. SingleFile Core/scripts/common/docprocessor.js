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

  var IMPORT_URL_VALUE_EXP = /(url\s*\(\s*(?:'|")?\s*([^('"\))]*)\s*(?:'|")?\s*\))|(@import\s*\(?\s*(?:'|")?\s*([^('"\))]*)\s*(?:'|")?\s*(?:\)|;))/i;
  var URL_VALUE_EXP = /url\s*\(\s*(?:'|")?\s*([^('"\))]*)\s*(?:'|")?\s*\)/i;
  var IMPORT_VALUE_ALT_EXP = /@import\s*\(?\s*(?:'|")?\s*([^('"\))]*)\s*(?:'|")?\s*(?:\)|;)/i;
  var URL_EXP = /url\s*\(([^\)]*)\)/gi;
  var IMPORT_EXP = /(@import\s*url\s*\([^\)]*\)\s*;?)|(@import\s*('|")?\s*[^\(;'"]*\s*('|")?\s*;)/gi;
  var IMPORT_ALT_EXP = /@import\s*('|")?\s*[^\(;'"]*\s*('|")?\s*;/gi;
  var EMPTY_PIXEL_DATA = "data:image/gif;base64,R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

  function decodeDataURI(dataURI) {
    console.log("decodeDataURI(dataURI)");
    var content = dataURI.indexOf(","),
      meta = dataURI.substr(5, content).toLowerCase(),
      data = decodeURIComponent(dataURI.substr(content + 1));

    if (/;\s*base64\s*[;,]/.test(meta)) {
      data = atob(data);
    }
    if (/;\s*charset=[uU][tT][fF]-?8\s*[;,]/.test(meta)) {
      data = decodeURIComponent(escape(data));
    }

    return data;
  }
  // link: link of the href / resource / font link on the googleapis server
  // host: door-quote-url
  function formatURL(link, host) {
    console.log("formatURL(link, host)");
    var i,
      newlinkparts,
      hparts, // host parts
      lparts; //link parts
    if (!link)
      return "";

    lparts = link.split('/');
    host = host.split("#")[0].split("?")[0];
    //is the link name hosted on a different url, return link.trim() e.g. google hosted font
    if (/http:|https:|ftp:|data:|javascript:/i.test(lparts[0]))
      return link.trim();

    // if the resource if on the same server e.g. css file, the code reaches here
    // the relative of the resource(css file) is converted into a global 
    // address together with with door-quote-url 
    hparts = host.split('/');
    newlinkparts = [];
    if (hparts.length > 3)
      hparts.pop();
    if (lparts[0] == '') {
      if (lparts[1] == '')
        host = hparts[0] + '//' + lparts[2];
      else
        host = hparts[0] + '//' + hparts[2];
      hparts = host.split('/');
      delete lparts[0];
      if (lparts[1] == '') {
        delete lparts[1];
        delete lparts[2];
      }
    }
    for (i = 0; i < lparts.length; i++) {
      if (lparts[i] == '..') {
        if (lparts[i - 1])
          delete lparts[i - 1];
        else if (hparts.length > 3)
          hparts.pop();
        delete lparts[i];
      }
      if (lparts[i] == '.')
        delete lparts[i];
    }
    for (i = 0; i < lparts.length; i++)
      if (lparts[i])
        newlinkparts[newlinkparts.length] = lparts[i];
    return (hparts.join('/') + '/' + newlinkparts.join('/')).trim();
  }
  // called from createStyleNode
  function resolveURLs(content, host) {
    console.log("resolveURLs(content, host)");
    var ret = content.replace(URL_EXP, function(value) {
      console.log('var ret = content.replace(URL_EXP, function(value) {');
      var result = value.match(URL_VALUE_EXP);
      if (result)
        if (result[1].indexOf("data:") != 0)
          return value.replace(result[1], formatURL(result[1], host));
      return value;
    });
    return ret.replace(IMPORT_ALT_EXP, function(value) {
      console.log('return ret.replace(IMPORT_ALT_EXP, function(value) {');
      var result = value.match(IMPORT_VALUE_ALT_EXP);
      if (result)
        if (result[1].indexOf("data:") != 0)
          return "@import \"" + formatURL(result[1], host) + "\";";
      return value;
    });
  }

  function getDataURI(data, defaultURL, woURL) {
    console.log("getDataURI(data, defaultURL, woURL)");
    if (data.content)
      return (woURL ? "" : "url(") + "data:" + data.mediaType + ";" + data.mediaTypeParam + "," + data.content + (woURL ? "" : ")");
    else
      return woURL ? defaultURL : "url(" + defaultURL + ")";
  }

  function removeComments(content) {
    console.log("removeComments(content)");
    var start,
      end;
    do {
      start = content.indexOf("/*");
      end = content.indexOf("*/", start);
      if (start != -1 && end != -1)
        content = content.substring(0, start) + content.substr(end + 2);
    } while (start != -1 && end != -1);
    return content;
  }

  function replaceURLs(content, host, requestManager, callback) {
    console.log("replaceURLs(content, host, requestManager, callback)");
    var i,
      url,
      result,
      values = removeComments(content).match(URL_EXP),
      requestMax = 0,
      requestIndex = 0;

    function sendRequest(origUrl) {
      console.log("sendRequest(origUrl)");
      requestMax++;
      requestManager.send(url, function(data) {
        console.log('requestManager.send(url, function(data) {');
        requestIndex++;
        if (content.indexOf(origUrl) != -1) {
          data.mediaType = data.mediaType ? data.mediaType.split(";")[0] : null;
          content = content.replace(new RegExp(origUrl.replace(/([{}\(\)\^$&.\*\?\/\+\|\[\\\\]|\]|\-)/g, "\\$1"), "gi"), getDataURI(data,
            EMPTY_PIXEL_DATA, true));
        }
        if (requestIndex == requestMax)
          callback(content);
      }, null, "base64");
    }

    if (values)
      for (i = 0; i < values.length; i++) {
        result = values[i].match(URL_VALUE_EXP);
        if (result && result[1]) {
          url = formatURL(result[1], host);
          if (url.indexOf("data:") != 0)
            sendRequest(result[1]);
        }
    }
  }

  // ----------------------------------------------------------------------------------------------
  // doc: document, docElement: html, baseURI: door-quote-uri, reqeuestManager contains send, doSend and requestCount
  // calls formatsUrl and sends the resouces in the requests array to be downloaded in requestManager.doSend
  //  
  function processStylesheets(doc, docElement, baseURI, requestManager) {
    console.log("processStylesheets(doc, docElement, baseURI, requestManager)");
    // document.querySelectorAll returns a list of the elements within the document that matches the specified 
    // group of selectors
    // basically get all the links in the doc
    Array.prototype.forEach.call(docElement.querySelectorAll('link[href][rel*="stylesheet"]'), function(node) {
      console.log(', function(node) {');
      // get a href attribute/ link address of the node
      var href = node.getAttribute("href"),
        // format the url, url can be a google font link or a css file for the website
        url = formatURL(href, baseURI);

      // when the xhr onLoad call back is called, createStyleNode may be executed
      // create a new styleNode, with the style tag in the html document being saved
      function createStyleNode(content) {
        console.log("createStyleNode(content)");
        var i,
          newNode,
          commentNode;
        newNode = doc.createElement("style");
        for (i = 0; i < node.attributes.length; i++)
          if (node.attributes[i].value)
            newNode.setAttribute(node.attributes[i].name, node.attributes[i].value);
        newNode.dataset.href = url;
        newNode.removeAttribute("href");
        // resolveURLs ???
        newNode.textContent = resolveURLs(content, url);
        if (node.disabled) {
          commentNode = doc.createComment();
          commentNode.textContent = newNode.outerHTML.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/--/g, "&minus;&minus;");
          node.parentElement.replaceChild(commentNode, node);
        } else
          node.parentElement.replaceChild(newNode, node);
      }
      // when you reach here, the url of the resource has been cleaned, 
      // style sheets are being processed
      if (href.indexOf("data:") != 0)
        // use the requestManager to fetch the resource
        // call back is called on the data responce
        requestManager.send(url, function(data) {
          console.log('requestManager.send(url, function(data) {');
          if (data.status >= 400)
            node.parentElement.removeChild(node);
          else
            // if request responce is valid, createStyleNode from the text received as responce
            // called when the css file is downloaded from the responcee
            createStyleNode(data.content || "");
        });
      else
        createStyleNode(decodeDataURI(href));
    });
  }

  function processImports(docElement, baseURI, characterSet, requestManager) {
    console.log("processImports(docElement, baseURI, characterSet, requestManager)");
    var ret = true;
    Array.prototype.forEach.call(docElement.querySelectorAll("style"), function(styleSheet) {
      console.log('Array.prototype.forEach.call(docElement.querySelectorAll("style"), function(styleSheet) {');
      var imports = removeComments(styleSheet.textContent).match(IMPORT_EXP);
      if (imports)
        imports.forEach(function(imp) {
          var url,
            href,
            result = imp.match(IMPORT_URL_VALUE_EXP);

          function insertStylesheet(content) {
            console.log("insertStylesheet(content)");
            styleSheet.textContent = styleSheet.textContent.replace(imp, resolveURLs(content, url));
          }

          if (result && (result[2] || result[4])) {
            href = result[2] || result[4];
            url = formatURL(href, styleSheet.dataset.href || baseURI);
            if (href.indexOf("data:") != 0) {
              requestManager.send(url, function(data) {
                console.log('requestManager.send(url, function(data) {');
                insertStylesheet(data.status < 400 && data.content ? data.content : "");
              }, null, characterSet);
            } else
              insertStylesheet(decodeDataURI(href));
            ret = false;
          }
        });
    });
    return ret;
  }

  function processStyleAttributes(docElement, baseURI, requestManager) {
    console.log("processStyleAttributes(docElement, baseURI, requestManager)");
    Array.prototype.forEach.call(docElement.querySelectorAll("*[style]"), function(node) {
      console.log('Array.prototype.forEach.call(docElement.querySelectorAll("*[style]"), function(node) {');
      replaceURLs(node.getAttribute("style"), baseURI, requestManager, function(style) {
        console.log('replaceURLs(node.getAttribute("style"), baseURI, requestManager, function(style) {');
        node.setAttribute("style", style);
      });
    });
  }

  function processBgAttributes(docElement, baseURI, requestManager) {
    console.log("processBgAttributes(docElement, baseURI, requestManager)");
    var backgrounds = docElement.querySelectorAll("*[background]");
    Array.prototype.forEach.call(backgrounds, function(node) {
      console.log('Array.prototype.forEach.call(backgrounds, function(node) {');
      var url,
        value = node.getAttribute("background");
      if (value.indexOf(".") != -1) {
        url = formatURL(value, baseURI);
        if (url.indexOf("data:") != 0)
          requestManager.send(url, function(data) {
            console.log('requestManager.send(url, function(data) {');
            node.setAttribute("background", getDataURI(data, EMPTY_PIXEL_DATA, true));
          }, null, "base64");
      }
    });
  }

  function insertDefaultFavico(doc, docElement, baseURI) {
    console.log("insertDefaultFavico(doc, docElement, baseURI)");
    var node,
      docHead = docElement.querySelector("html > head"),
      favIcon = docElement
        .querySelector('link[href][rel="shortcut icon"], link[href][rel="apple-touch-icon"], link[href][rel="icon"]');
    if (!favIcon && docHead) {
      node = doc.createElement("link");
      node.setAttribute("type", "image/x-icon");
      node.setAttribute("rel", "shortcut icon");
      node.setAttribute("href", formatURL("/favicon.ico", baseURI));
      docHead.appendChild(node);
    }
  }

  function processImages(docElement, baseURI, requestManager) {
    console.log("processImages(docElement, baseURI, requestManager)");
    var images;

    function process(attributeName) {
      console.log("process(attributeName)");
      Array.prototype.forEach.call(images, function(node) {
        console.log('Array.prototype.forEach.call(images, function(node) {');
        var url = formatURL(node.getAttribute(attributeName), baseURI);
        if (url.indexOf("data:") != 0)
          requestManager.send(url, function(data) {
            console.log('requestManager.send(url, function(data) {');
            node.setAttribute(attributeName, getDataURI(data, EMPTY_PIXEL_DATA, true));
          }, null, "base64");
      });
    }

    images = docElement.querySelectorAll('link[href][rel="shortcut icon"], link[href][rel="apple-touch-icon"], link[href][rel="icon"]');
    process("href");
    images = docElement.querySelectorAll('img[src], input[src][type="image"]');
    process("src");
    images = docElement.querySelectorAll('video[poster]');
    process("poster");

  }

  function processSVGs(docElement, baseURI, requestManager) {
    console.log("processSVGs(docElement, baseURI, requestManager)");
    var images = docElement.querySelectorAll('object[type="image/svg+xml"], object[type="image/svg-xml"], embed[src*=".svg"]');
    Array.prototype.forEach.call(images, function(node) {
      console.log('Array.prototype.forEach.call(images, function(node) {');
      var data = node.getAttribute("data"),
        src = node.getAttribute("src"),
        url = formatURL(data || src, baseURI);
      if (url.indexOf("data:") != 0)
        requestManager.send(url, function(data) {
          console.log('requestManager.send(url, function(data) {');
          node.setAttribute(data ? "data" : "src", getDataURI(data, "data:text/xml,<svg></svg>", true));
        }, null, null);
    });
  }

  function processStyles(docElement, baseURI, requestManager) {
    console.log("processStyles(docElement, baseURI, requestManager)");
    Array.prototype.forEach.call(docElement.querySelectorAll("style"), function(styleSheet) {
      console.log('Array.prototype.forEach.call(docElement.querySelectorAll("style"), function(styleSheet) {');
      replaceURLs(styleSheet.textContent, styleSheet.dataset.href || baseURI, requestManager, function(textContent) {
        console.log('replaceURLs(styleSheet.textContent, styleSheet.dataset.href || baseURI, requestManager, function(textContent) {');
        styleSheet.textContent = textContent;
      });
    });
  }

  function processScripts(docElement, baseURI, characterSet, requestManager) {
    console.log("processScripts(docElement, baseURI, characterSet, requestManager)");
    Array.prototype.forEach.call(docElement.querySelectorAll("script[src]"), function(node) {
      console.log('Array.prototype.forEach.call(docElement.querySelectorAll("script[src]"), function(node) {');
      var src = node.getAttribute("src");
      if (src.indexOf("data:") != 0)
        requestManager.send(formatURL(src, baseURI), function(data) {
          console.log('requestManager.send(formatURL(src, baseURI), function(data) {');
          if (data.status < 400) {
            data.content = data.content.replace(/"([^"]*)<\/\s*script\s*>([^"]*)"/gi, '"$1<"+"/script>$2"');
            data.content = data.content.replace(/'([^']*)<\/\s*script\s*>([^']*)'/gi, "'$1<'+'/script>$2'");
            node.textContent = "\n" + data.content + "\n";
          }
          node.removeAttribute("src");
        }, characterSet);
    });
  }

  function processCanvas(doc, docElement, canvasData) {
    console.log("processCanvas(doc, docElement, canvasData)");
    var index = 0;
    Array.prototype.forEach.call(docElement.querySelectorAll("canvas"), function(node) {
      console.log('Array.prototype.forEach.call(docElement.querySelectorAll("canvas"), function(node) {');
      var i,
        data = canvasData[index],
        newNode = doc.createElement("img");
      if (data) {
        newNode.setAttribute("src", data);
        for (i = 0; i < node.attributes.length; i++)
          if (node.attributes[i].value)
            newNode.setAttribute(node.attributes[i].name, node.attributes[i].value);
        if (!newNode.width)
          newNode.style.pixelWidth = node.clientWidth;
        if (!newNode.height)
          newNode.style.pixelHeight = node.clientHeight;
        node.parentElement.replaceChild(newNode, node);
      }
      index++;
    });
  }

  function removeScripts(docElement) {
    console.log("removeScripts(docElement)");
    Array.prototype.forEach.call(docElement.querySelectorAll("script"), function(node) {
      console.log('Array.prototype.forEach.call(docElement.querySelectorAll("script"), function(node) {');
      node.parentElement.removeChild(node);
    });
    Array.prototype.forEach.call(docElement.querySelectorAll("*[onload]"), function(node) {
      console.log('Array.prototype.forEach.call(docElement.querySelectorAll("*[onload]"), function(node) {');
      node.removeAttribute("onload");
    });
  }

  function removeObjects(docElement) {
    console.log("removeObjects(docElement)");
    var objects = docElement.querySelectorAll('applet, object:not([type="image/svg+xml"]):not([type="image/svg-xml"]), embed:not([src*=".svg"])');
    Array.prototype.forEach.call(objects, function(node) {
      console.log('Array.prototype.forEach.call(objects, function(node) {');
      node.parentElement.removeChild(node);
    });
    objects = docElement.querySelectorAll('audio[src], video[src]');
    Array.prototype.forEach.call(objects, function(node) {
      console.log('Array.prototype.forEach.call(objects, function(node) {');
      node.removeAttribute("src");
    });
  }

  function removeBlockquotesCite(docElement) {
    console.log("removeBlockquotesCite(docElement)");
    Array.prototype.forEach.call(docElement.querySelectorAll("blockquote[cite]"), function(node) {
      console.log('Array.prototype.forEach.call(docElement.querySelectorAll("blockquote[cite]"), function(node) {');
      node.removeAttribute("cite");
    });
  }

  function removeFrames(docElement) {
    console.log("removeFrames(docElement)");
    Array.prototype.forEach.call(docElement.querySelectorAll("iframe, frame"), function(node) {
      console.log('Array.prototype.forEach.call(docElement.querySelectorAll("iframe, frame"), function(node) {');
      node.parentElement.removeChild(node);
    });
  }

  function removeMetaRefresh(docElement) {
    console.log("removeMetaRefresh(docElement)");
    Array.prototype.forEach.call(docElement.querySelectorAll("meta[http-equiv=refresh]"), function(node) {
      console.log('Array.prototype.forEach.call(docElement.querySelectorAll("meta[http-equiv=refresh]"), function(node) {');
      node.parentElement.removeChild(node);
    });
  }

  function resetFrames(docElement, baseURI) {
    console.log("resetFrames(docElement, baseURI)");
    Array.prototype.forEach.call(docElement.querySelectorAll("iframe, frame"), function(node) {
      console.log('Array.prototype.forEach.call(docElement.querySelectorAll("iframe, frame"), function(node) {');
      var src = formatURL(node.getAttribute("src"), baseURI);
      if (src.indexOf("data:") != 0)
        node.setAttribute("src", "about:blank");
    });
  }

  function setAbsoluteLinks(docElement, baseURI) {
    console.log("setAbsoluteLinks(docElement, baseURI)");
    Array.prototype.forEach.call(docElement.querySelectorAll("a:not([href^='#'])"), function(link) {
      console.log(', function(link) {');
      var fullHref = formatURL(link.getAttribute("href"), baseURI);
      if (fullHref && (!(fullHref.indexOf(baseURI.split("#")[0]) == 0) || fullHref.indexOf("#") == -1))
        link.setAttribute("href", fullHref);
    });
  }

  // ----------------------------------------------------------------------------------------------
  // has the new html document that was created by copying the string content of the door-quote page
  // calls processStyleSheets and push all css/font resource requests in the requests array, call requestManager.doSend
  singlefile.initProcess = function(doc, docElement, addDefaultFavico, baseURI, characterSet, config, canvasData, requestManager, onInit, onProgress, onEnd) {
    console.log("singlefile.initProcess = function(doc, docElement, addDefaultFavico, baseURI, characterSet, config, canvasData, requestManager, onInit, onProgress, onEnd)");
    // calls RequestManager() twice, once on initManager and next on manager and passes onProgress
    var initManager = new RequestManager(),
      manager = new RequestManager(onProgress);
    // has a this.send and this.doSend methods, declares a few correntCount and requests array
    // onProgress callback is called in this.doSend method below
    function RequestManager(onProgress) {
      console.log("RequestManager(onProgress)");
      var that = this,
        currentCount = 0,
        requests = [];
      this.requestCount = 0;
      // this.send pushes all the urls in the requests array and increments the requestsCount
      this.send = function(url, responseHandler, characterSet, mediaTypeParam) {
        console.log("this.send = function(url, responseHandler, characterSet, mediaTypeParam)");
        this.requestCount++;
        requests.push({
          url: url,
          responseHandler: responseHandler,
          characterSet: characterSet, // undefined
          mediaTypeParam: mediaTypeParam // undefined
        });
      };
      this.doSend = function() {
        console.log("this.doSend = function()");
        // requests is an array
        // requests array has 02 objects
        requests.forEach(function(request) {
          // send is in nio.js, creates and AJAX request for the resources in the requests array
          requestManager.send(request.url, function(response) {
            console.log('requestManager.send(request.url, function(response) {');
            request.responseHandler(response);
            currentCount++;
            if (onProgress)
              onProgress(currentCount, that.requestCount);
            if (currentCount == that.requestCount) {
              that.requestCount = 0;
              currentCount = 0;
              if (that.onEnd)
                that.onEnd();
            }
          }, request.characterSet, request.mediaTypeParam);
        });
        requests = [];
      };
    }

    function cbImports() {
      console.log("cbImports()");
      if (config.removeScripts)
        removeScripts(docElement);
      if (config.removeObjects)
        removeObjects(docElement);
      if (config.removeFrames || config.getRawDoc)
        removeFrames(docElement);
      resetFrames(docElement, baseURI);
      removeBlockquotesCite(docElement);
      removeMetaRefresh(docElement);
      setAbsoluteLinks(docElement, baseURI);
      if (addDefaultFavico)
        insertDefaultFavico(doc, docElement, baseURI);
      processStyleAttributes(docElement, baseURI, manager);
      processBgAttributes(docElement, baseURI, manager);
      processImages(docElement, baseURI, manager);
      processSVGs(docElement, baseURI, manager);
      processStyles(docElement, baseURI, manager);
      processScripts(docElement, baseURI, characterSet, manager);
      processCanvas(doc, docElement, canvasData);
      if (onInit)
        setTimeout(function() {
          onInit(manager.requestCount);
        }, 1);
    }

    function cbStylesheets() {
      console.log("cbStylesheets()");
      // initManager is a RequestManager
      initManager.onEnd = function(noRequests) {
        console.log("initManager.onEnd = function(noRequests)");
        if (noRequests)
          cbImports();
        else
          cbStylesheets();
      };
      processImports(docElement, baseURI, characterSet, initManager);
      // initManager is a RequestManager
      initManager.doSend();
      if (initManager.requestCount == 0)
        cbImports();
    }

    // manager is the RequestManager() initialised above with the this.send and this.doSend methods
    manager.onEnd = onEnd;
    // doc is the html document, docElement is also an html document ? , 
    // requestManager object has send, doSend and requestCount
    processStylesheets(doc, docElement, baseURI, initManager);
    // initManager is a RequestManager
    initManager.onEnd = cbStylesheets;
    // once all the urls of all the resources (fonts and css files) are formatted and loaded into the request array
    // doSend() is called

    initManager.doSend();
    if (initManager.requestCount == 0)
      initManager.onEnd();
    return function() {
      manager.doSend();
      if (manager.onEnd && manager.requestCount == 0)
        manager.onEnd();
    };
  };

})();

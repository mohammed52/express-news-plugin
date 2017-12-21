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

var wininfo = {

  /**
   * init() - sends an message initRequest to door-quote page->wininfo script
   * @param  {integer}   tabId    id of tab to send the message to
   * @param  {Function} callback declared in bgcore->PageData-> clears timeout 
   * calls the callback in parent
   * processableDocs received in the listener, that.processableDocs set from the message.processableDocs received
   */
  init: function(tabId, callback) {
    console.log("init: function(tabId, callback)");

    // this is being called 3 times followed by the executeScripts() call ???
    // even though chrome .extension.sendMessage({...}) is only called once in the logs ???
    // if you add break points and debug slowly addListener is called 11 times ???
    // message={initResponse: true, processableDocs: 1} is all cycles
    // sometimes this is called just twice or thrice, somethimes multiple times
    // every time I save the page, this is called 2 x total number of times the page saved
    // when I restarted chrome, was only printed once
    // on the second save, 02 logs printed
    // 3 on 3
    // 
    chrome.extension.onMessage.addListener(function(message) {
      console.log("chrome.extension.onMessage.addListener(function(message)");
      if (message.initResponse)
        callback(message.processableDocs);
    });
    console.log("chrome.tabs.sendMessage(tabId, {");
    // send a message to a particular tabId, with params: winId, initRequest, index ...
    chrome.tabs.sendMessage(tabId, {
      initRequest: true,
      winId: "0",
      index: 0
    });
  }
};

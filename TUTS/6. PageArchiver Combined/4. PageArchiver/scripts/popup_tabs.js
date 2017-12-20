/*
 * Copyright 2011 Gildas Lormeau
 * contact : gildas.lormeau <at> gmail.com
 * 
 * This file is part of PageArchiver.
 *
 *   PageArchiver is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   PageArchiver is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with PageArchiver.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() {

  var bgPage = chrome.extension.getBackgroundPage(),
    state = bgPage.popupState,
    allSelected = false,
    selectAllButton,
    saveButton,
    ulElement,
    searchInput;

  function selectAllButtonOnclick() {
    console.log("selectAllButtonOnclick()");
    Array.prototype.forEach.call(document.querySelectorAll("#tab-tabs li input[type=checkbox]"), function(inputElement) {
      inputElement.checked = selectAllButton.checked;
    });
  }

  function refreshSelectAllButton() {
    console.log("refreshSelectAllButton()");

    var uncheckedCount = 0;
    Array.prototype.forEach.call(document.querySelectorAll("#tab-tabs li input[type=checkbox]"), function(inputElement) {
      if (!inputElement.checked)
        uncheckedCount++;
    });
    selectAllButton.checked = !uncheckedCount;
  }

  function saveButtonOnclick() {
    console.log("saveButtonOnclick()");
    var selectedIds = [];
    Array.prototype.forEach.call(document.querySelectorAll("#tab-tabs li input[type=checkbox]"), function(inputElement) {
      if (inputElement.checked)
        selectedIds.push(Number(inputElement.parentElement.id.split("tab.")[1]));
    });
    if (selectedIds.length)
      bgPage.saveTabs(selectedIds);
  }

  function display(tabs) {
    console.log("display(tabs)");
    var tempElement = document.createElement("ul");

    tabs.forEach(function(tab) {
      var liElement,
        cbElement,
        aElement,
        favicoElement;
      if (tab.url.indexOf("https://chrome.google.com") == 0 || !(tab.url.indexOf("http://") == 0 || tab.url.indexOf("https://") == 0))
        return;
      aElement = document.createElement("a");
      favicoElement = document.createElement("img");
      liElement = document.createElement("li");
      cbElement = document.createElement("input");
      liElement.appendChild(cbElement);
      liElement.appendChild(favicoElement);
      liElement.appendChild(aElement);
      tempElement.appendChild(liElement);
      aElement.className = "tabs-tab-title";
      aElement.href = "#";
      aElement.title = "view the tab\n\n" + tab.title;
      aElement.onclick = function() {
        console.log("aElement.onclick = function()");
        bgPage.selectTab(tab.id);
      };
      favicoElement.src = tab.favIconUrl ? tab.favIconUrl : "../resources/default_favico.gif";
      favicoElement.className = "row-favico";
      liElement.id = "tab." + tab.id;
      cbElement.type = "checkbox";
      cbElement.title = "select a tab to archive";
      cbElement.onclick = refreshSelectAllButton;
      aElement.textContent = tab.title;
    });
    tempElement.id = ulElement.id;
    tempElement.className = ulElement.className;
    ulElement.parentElement.replaceChild(tempElement, ulElement);
    ulElement = tempElement;
    allSelected = false;
    for (tabId in bgPage.tabs) {
      tab = bgPage.tabs[tabId];
      notifyTabProgress(tabId, tab.state, tab.index, tab.max);
    }
  }

  function search(callback) {
    console.log("search(callback)");
    state.searchedTabs = searchInput.value ? searchInput.value.split(/\s+/) : null;
    bgPage.getTabsInfo(function(tabs) {
      display(tabs);
      refreshSelectAllButton();
      if (callback)
        callback();
    });
  }

  function showTabs() {
    console.log("showTabs()");
    search();
    return false;
  }

  function getElements() {
    console.log("getElements()");
    selectAllButton = document.getElementById("tabs-select-button");
    saveButton = document.getElementById("tabs-save-button");
    ulElement = document.getElementById("tabs-list");
    searchInput = document.getElementById("tabs-search-input");
  }

  this.initTabsTab = function() {
    console.log("this.initTabsTab = function()");
    var tabId,
      tab;
    getElements();
    selectAllButton.onclick = selectAllButtonOnclick;
    saveButton.onclick = saveButtonOnclick;
    searchInput.onchange = showTabs;
    document.getElementById("tabs-form").onsubmit = showTabs;
    searchInput.value = state.searchedTabs ? bgPage.popupState.searchedTabs.join(" ") : "";
    if (location.search.indexOf("newtab") != -1)
      searchInput.setAttribute("x-webkit-speech");
  };

  // updates the UI elements
  this.notifyTabProgress = function(tabId, state, index, max) {
    console.log("this.notifyTabProgress = function(tabId, state, index, max)");
    var progressElement,
      checkboxElement,
      titleElement,
      tabElement = document.getElementById("tab." + tabId);
    if (tabElement) {
      progressElement = tabElement.querySelector("progress");
      checkboxElement = tabElement.querySelector("input[type=checkbox]");
      titleElement = tabElement.querySelector(".tabs-tab-title");
      checkboxElement.checked = false;
      allSelected = false;
      if (!progressElement) {
        progressElement = document.createElement("progress");
        progressElement.className = "tabs-tab-progress";
        tabElement.appendChild(progressElement);
      }
      if (state != 2) {
        checkboxElement.disabled = true;
        titleElement.className = "tabs-tab-title saving";
        progressElement.value = index;
        progressElement.max = max;
        progressElement.title = "progress: " + Math.floor((index * 100) / max) + "%";
      } else {
        checkboxElement.disabled = false;
        titleElement.className = "tabs-tab-title";
        progressElement.parentElement.removeChild(progressElement);
      }
    }
  };

  this.showTabsTab = function(callback) {
    console.log("this.showTabsTab = function(callback)");
    search(function() {
      bgPage.getSelectedTab(function(tab) {
        var tabElement = document.getElementById("tab." + tab.id);
        if (tabElement)
          tabElement.querySelector("input[type=checkbox]").checked = true;
        if (callback)
          callback();
      });
    });
  };

})();

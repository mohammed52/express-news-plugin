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

	var bgPage = chrome.extension.getBackgroundPage(), state = bgPage.popupState, ulElement, selectAllButton, deleteButton, filterButton, searchInput, allSelected;

	function getSelectedTagIds() {
		var selectedIds = [];
		Array.prototype.forEach.call(document.querySelectorAll("#tab-tags li input[type=checkbox]"), function(inputElement) {
			if (inputElement.checked)
				selectedIds.push(inputElement.parentElement.id.split("tag.")[1]);
		});
		return selectedIds;
	}

	function getSelectedTags() {
		var selectedTags = [];
		Array.prototype.forEach.call(document.querySelectorAll("#tab-tags li input[type=checkbox]"), function(inputElement) {
			if (inputElement.checked)
				selectedTags.push(inputElement.parentElement.querySelector(".title-input").textContent);
		});
		return selectedTags;
	}

	function selectAllButtonOnclick() {
		Array.prototype.forEach.call(document.querySelectorAll(".tags-row-used input[type=checkbox], .tags-row-unused input[type=checkbox]"), function(
				inputElement) {
			inputElement.checked = selectAllButton.checked;
		});
	}

	function refreshSelectAllButton() {
		var uncheckedCount = 0;
		Array.prototype.forEach.call(document.querySelectorAll(".tags-row-used input[type=checkbox], .tags-row-unused input[type=checkbox]"), function(
				inputElement) {
			if (!inputElement.checked)
				uncheckedCount++;
		});
		selectAllButton.checked = !uncheckedCount;
	}

	function deleteButtonOnclick() {
		var selectedIds = getSelectedTagIds();
		if (selectedIds.length) {
			if (bgPage.options.askConfirmation != "yes" || confirm("Do you really want to delete selected tags ?"))
				bgPage.storage.deleteTags(selectedIds, function() {
					showTagsTab();
				});
		}
	}

	function filterButtonOnclick() {
		var selectedTags = getSelectedTags();
		if (selectedTags.length)
			filterTags(getSelectedTags().join(","));
	}

	function filterTags(value) {
		document.getElementById("pages-search-expand-button").value = "expanded";
		document.getElementById("pages-tags-expand-button").value = "expanded";
		document.getElementById("pages-saveddate-expand-button").value = "";
		document.getElementById("pages-readdate-expand-button").value = "";
		document.getElementById("pages-url-expand-button").value = "";
		document.getElementById("pages-misc-expand-button").value = "";
		document.getElementById("pages-search-input").value = "";
		document.getElementById("pages-tags-filter").value = value;
		showTab("pages");
	}

	function display(usedTags, unusedTags) {
		var i, tag, tempElement = document.createElement("ul"), liElement, usedTagsLength = Object.keys(usedTags).length, unusedTagsLength = Object
				.keys(unusedTags).length;

		function setRow(tag, tagData, rowClass) {
			var liElement, cbElement, tagElement, moreElement, moreDivElement, tagPages, i, pageLinkElement;

			function setTagPage(tagPage) {
				pageLinkElement = document.createElement("a");
				pageLinkElement.className = "tags-row-link";
				pageLinkElement.href = "#";
				pageLinkElement.textContent = pageLinkElement.title = tagPage.title;
				pageLinkElement.onclick = function() {
					bgPage.open(tagPage.id, bgPage.options.openInBackground != "yes");
				};
				moreDivElement.appendChild(pageLinkElement);
			}

			liElement = document.createElement("li");
			cbElement = document.createElement("input");
			moreElement = document.createElement("div");
			moreDivElement = document.createElement("div");
			tagElement = document.createElement("a");
			if (tagData.pages)
				for (i = 0; i < tagData.pages.length; i++)
					setTagPage(tagData.pages[i]);
			liElement.appendChild(cbElement);
			liElement.appendChild(moreElement);
			liElement.appendChild(tagElement);
			liElement.appendChild(moreDivElement);
			tempElement.appendChild(liElement);
			liElement.id = "tag." + tagData.id;
			liElement.className = rowClass;
			moreElement.className = "clickable";
			new CollapserButton(moreElement, moreDivElement, tagData.id in usedTags && state.expandedTags[tagData.id], "show only tag",
					"show all related archives");
			cbElement.type = "checkbox";
			cbElement.title = "select a tag to delete";
			cbElement.onclick = refreshSelectAllButton;
			new TitleInput(tagElement, tag, "edit tag value \"" + tag + "\"", "delete \"" + tag + "\"");
			if (tagData.pages) {
				tagElement.href = "#";
				tagElement.title = "filter this tag in archives view";
				tagElement.onclick = function() {
					filterTags(tag);
				};
			}
			moreElement.onenter = function(value) {
				state.expandedTags[tagData.id] = value;
			};
			tagElement.onenter = function(value) {
				bgPage.storage.updateTagValue(tag, value);
				tag = value;
			};
			tagElement.ondelete = function() {
				if (confirm("Do you really want to delete this tag ?"))
					bgPage.storage.deleteTags([ tagData.id ], function() {
						showTagsTab();
					});
			};
		}

		if (usedTagsLength) {
			if (unusedTagsLength) {
				liElement = document.createElement("li");
				liElement.textContent = "used tags:";
				tempElement.appendChild(liElement);
			}
			for (tag in usedTags)
				setRow(tag, usedTags[tag], "tags-row-used");
		}
		if (unusedTagsLength) {
			if (usedTagsLength) {
				liElement = document.createElement("li");
				liElement.innerHTML = "<br>";
				tempElement.appendChild(liElement);
			}
			liElement = document.createElement("li");
			liElement.textContent = "unused tags:";
			tempElement.appendChild(liElement);
			for (tag in unusedTags) {
				state.expandedTags[tag.id] = false;
				setRow(tag, unusedTags[tag], "tags-row-unused");
			}
		}
		tempElement.id = ulElement.id;
		tempElement.className = ulElement.className;
		ulElement.parentElement.replaceChild(tempElement, ulElement);
		ulElement = tempElement;
		allSelected = false;
	}

	function search(callback) {
		state.searchedTags = searchInput.value ? searchInput.value.split(/\s+/) : null;
		bgPage.storage.getTags(state.searchedTags, function(usedTags, unusedTags) {
			display(usedTags, unusedTags);
			refreshSelectAllButton();
			if (callback)
				callback();
		});
	}

	function showTags() {
		search();
		return false;
	}

	function getElements() {
		selectAllButton = document.getElementById("tags-select-button");
		deleteButton = document.getElementById("tags-delete-button");
		filterButton = document.getElementById("tags-filter-button");
		searchInput = document.getElementById("tags-search-input");
		ulElement = document.getElementById("tags-list");
	}

	this.initTagsTab = function() {
		getElements();
		selectAllButton.onclick = selectAllButtonOnclick;
		deleteButton.onclick = deleteButtonOnclick;
		filterButton.onclick = filterButtonOnclick;
		searchInput.onchange = showTags;
		document.getElementById("tags-form").onsubmit = showTags;
		searchInput.value = state.searchedTags ? bgPage.popupState.searchedTags.join(" ") : "";
		if (location.search.indexOf("newtab") != -1)
			searchInput.setAttribute("x-webkit-speech");
	};

	this.showTagsTab = function(callback) {
		search(callback);
	};

})();

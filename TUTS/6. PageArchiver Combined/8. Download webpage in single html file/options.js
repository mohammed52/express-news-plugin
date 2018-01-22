/************************************************************************/
/*                                                                      */
/*      Save Page WE - Generic WebExtension - Options Page              */
/*                                                                      */
/*      Javascript for Options Page                                     */
/*                                                                      */
/*      Last Edit - 21 Nov 2017                                         */
/*                                                                      */
/*      Copyright (C) 2016-2017 DW-dev                                  */
/*                                                                      */
/*      Distributed under the GNU General Public License version 2      */
/*      See LICENCE.txt file and http://www.gnu.org/licenses/           */
/*                                                                      */
/************************************************************************/

/************************************************************************/
/*                                                                      */
/*  Refer to Google Chrome developer documentation:                     */
/*                                                                      */
/*  https://developer.chrome.com/extensions/optionsV2                   */
/*                                                                      */
/*  https://developer.chrome.com/extensions/storage                     */
/*                                                                      */
/************************************************************************/

"use strict";

/************************************************************************/

/* Global variables */

/************************************************************************/

/* Listener for options page load */

document.addEventListener("DOMContentLoaded",onLoadPage,false);

/************************************************************************/

/* Initialize on page load */

function onLoadPage(event)
{
    /* Load options from local storage */
    
    chrome.storage.local.get(null,
    function(object)
    {
        /* General options */
        
        document.getElementById("options-buttonaction").elements["action"].value = object["options-buttonaction"];
        
        document.getElementById("options-showsubmenu").checked = object["options-showsubmenu"];
        document.getElementById("options-showwarning").checked = object["options-showwarning"];
        document.getElementById("options-showurllist").checked = object["options-showurllist"];
        document.getElementById("options-promptcomments").checked = object["options-promptcomments"];
        
        document.getElementById("options-usepageloader").checked = object["options-usepageloader"];
        document.getElementById("options-removeunsavedurls").checked = object["options-removeunsavedurls"];
        document.getElementById("options-includeinfobar").checked = object["options-includeinfobar"];
        document.getElementById("options-includesummary").checked = object["options-includesummary"];
        
        document.getElementById("options-prefixfilename").checked = object["options-prefixfilename"];
        document.getElementById("options-prefixtext").value = object["options-prefixtext"];
        document.getElementById("options-suffixfilename").checked = object["options-suffixfilename"];
        document.getElementById("options-suffixtext").value = object["options-suffixtext"];
        
        document.getElementById("options-prefixtext").disabled = !document.getElementById("options-prefixfilename").checked;
        document.getElementById("options-suffixtext").disabled = !document.getElementById("options-suffixfilename").checked;
        
        /* Saved Items options */
        
        document.getElementById("options-savehtmlaudiovideo").checked = object["options-savehtmlaudiovideo"];
        document.getElementById("options-savehtmlobjectembed").checked = object["options-savehtmlobjectembed"];
        document.getElementById("options-savehtmlimagesall").checked = object["options-savehtmlimagesall"];
        document.getElementById("options-savecssimagesall").checked = object["options-savecssimagesall"];
        document.getElementById("options-savecssfontswoff").checked = object["options-savecssfontswoff"];
        document.getElementById("options-savescripts").checked = object["options-savescripts"];
        
        document.getElementById("options-maxframedepth").value = object["options-maxframedepth"];
        
        document.getElementById("options-maxresourcesize").value = object["options-maxresourcesize"];
    });
    
    /* Add listeners for click on tab buttons */
    
    document.getElementById("options-tabbar-general").addEventListener("click",showGeneralTab,false);
    document.getElementById("options-tabbar-saveditems").addEventListener("click",showSavedItemsTab,false);
    
    /* Add listeners for click on prefix or suffix filename checkboxes */
    
    document.getElementById("options-prefixfilename").addEventListener("click",onClickPrefixFilename,false);
    document.getElementById("options-suffixfilename").addEventListener("click",onClickSuffixFilename,false);
    
    /* Add listener for click on save button */
    
    document.getElementById("options-save-button").addEventListener("click",onClickSave,false);
    
    /* Wait for page layout to complete */
    
    document.getElementById("options").style.setProperty("opacity","0","");
    
    window.setTimeout(
    function()
    {
        var width1,width2,height1,height2;
        
        /* Equalize widths of tabs */
        
        width1 = window.getComputedStyle(document.getElementById("options-tab-general"),null).getPropertyValue("width");
        width2 = window.getComputedStyle(document.getElementById("options-tab-saveditems"),null).getPropertyValue("width");
        
        width1 = width1.substr(0,width1.length-2);
        width2 = width2.substr(0,width2.length-2);
        
        width1 = Math.max(width1,width2);
        
        document.getElementById("options-tab-general").style.setProperty("width",width1 + "px","");
        document.getElementById("options-tab-saveditems").style.setProperty("width",width1 + "px","");
        
        /* Equalize heights of tabs */
        
        height1 = window.getComputedStyle(document.getElementById("options-tab-general"),null).getPropertyValue("height");
        height2 = window.getComputedStyle(document.getElementById("options-tab-saveditems"),null).getPropertyValue("height");
        
        height1 = height1.substr(0,height1.length-2);
        height2 = height2.substr(0,height2.length-2);
        
        height1 = Math.max(height1,height2);
        
        document.getElementById("options-tab-general").style.setProperty("height",height1 + "px","");
        document.getElementById("options-tab-saveditems").style.setProperty("height",height1 + "px","");
        
        /* Show general tab */
        
        showGeneralTab();
        
        document.getElementById("options").style.setProperty("opacity","1","");
    },50);
}

/************************************************************************/

/* Select tab */

function showGeneralTab(event)
{
    document.getElementById("options-tabbar-general").setAttribute("selected","");
    document.getElementById("options-tabbar-saveditems").removeAttribute("selected");
    
    document.getElementById("options-tab-general").style.setProperty("display","block","");
    document.getElementById("options-tab-saveditems").style.setProperty("display","none","");
}

function showSavedItemsTab(event)
{
    document.getElementById("options-tabbar-general").removeAttribute("selected");
    document.getElementById("options-tabbar-saveditems").setAttribute("selected","");
    
    document.getElementById("options-tab-general").style.setProperty("display","none","");
    document.getElementById("options-tab-saveditems").style.setProperty("display","block","");
}

/************************************************************************/

/* Enable or Disable options */

function onClickPrefixFilename(event)
{
    document.getElementById("options-prefixtext").disabled = !document.getElementById("options-prefixfilename").checked;
}

function onClickSuffixFilename(event)
{
    document.getElementById("options-suffixtext").disabled = !document.getElementById("options-suffixfilename").checked;
}

/************************************************************************/

/* Save options */

function onClickSave(event)
{
    /* Save options to local storage */
    
    chrome.storage.local.set(
    {
        /* General options */
        
        "options-buttonaction": +document.getElementById("options-buttonaction").elements["action"].value,
        
        "options-showsubmenu": document.getElementById("options-showsubmenu").checked,
        "options-showwarning": document.getElementById("options-showwarning").checked,
        "options-showurllist": document.getElementById("options-showurllist").checked,
        "options-promptcomments": document.getElementById("options-promptcomments").checked,
        
        "options-usepageloader": document.getElementById("options-usepageloader").checked,
        "options-removeunsavedurls": document.getElementById("options-removeunsavedurls").checked,
        "options-includeinfobar": document.getElementById("options-includeinfobar").checked,
        "options-includesummary": document.getElementById("options-includesummary").checked,
        
        "options-prefixfilename": document.getElementById("options-prefixfilename").checked,
        "options-prefixtext": document.getElementById("options-prefixtext").value,
        "options-suffixfilename": document.getElementById("options-suffixfilename").checked,
        "options-suffixtext": document.getElementById("options-suffixtext").value,
        
        /* Saved Items options */
        
        "options-savehtmlaudiovideo": document.getElementById("options-savehtmlaudiovideo").checked,
        "options-savehtmlobjectembed": document.getElementById("options-savehtmlobjectembed").checked,
        "options-savehtmlimagesall": document.getElementById("options-savehtmlimagesall").checked,
        "options-savecssimagesall": document.getElementById("options-savecssimagesall").checked,
        "options-savecssfontswoff": document.getElementById("options-savecssfontswoff").checked,
        "options-savescripts": document.getElementById("options-savescripts").checked,
        
        "options-maxframedepth": +document.getElementById("options-maxframedepth").value,
        
        "options-maxresourcesize": +document.getElementById("options-maxresourcesize").value
    });
    
    /* Display saved status for short period */
    
    document.getElementById("options-save-status").style.setProperty("display","block","");
    
    setTimeout(function()
    {
        document.getElementById("options-save-status").style.setProperty("display","none","");
    }
    ,1000);
}

/************************************************************************/

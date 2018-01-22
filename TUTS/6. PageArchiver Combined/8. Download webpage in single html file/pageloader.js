/************************************************************************/
/*                                                                      */
/*      Save Page WE - Generic WebExtension - Page Loader               */
/*                                                                      */
/*      Javascript for Page Loader                                      */
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
/*  Notes on Page Loader                                                */
/*                                                                      */
/*  1. Page Loader is run when saved page is loaded.                    */
/*                                                                      */
/*  2. Replaces references to binary resource with blob urls.           */
/*                                                                      */
/*  3. Replaces data uri's in <frame> and <iframe> 'src' attributes     */
/*     with blob url's to avoid cross-domain issues when replacing      */
/*     references to binary resources with blob url's.                  */
/*                                                                      */
/*  4. Create pageloader_compressed.js as follows:                      */
/*                                                                      */
/*     -  remove final '}' from this file.                              */
/*     -  compress this file using dean.edwards.name/packer/            */
/*        with shrink variables enabled.                                */
/*     -  append final '}' to compressed file.                          */
/*                                                                      */
/************************************************************************/

"use strict";

function savepage_PageLoader(maxframedepth)
{
    var resourceMimeType = new Array();
    var resourceBase64Data = new Array();
    var resourceBlobUrl = new Array();

    window.addEventListener("DOMContentLoaded",
    function(event)
    {
        createBlobURLs();
        replaceReferences(0,document.documentElement);
    },false);

    function createBlobURLs()
    {
        var i,j,binaryString,blobData;
        var binaryData = new Array();
        
        for (i = 0; i < resourceMimeType.length; i++)
        {
            if (typeof resourceMimeType[i] != "undefined")
            {
                binaryString = atob(resourceBase64Data[i]);
                
                resourceBase64Data[i] = "";
                
                binaryData.length = 0;
                for (j = 0; j < binaryString.length; j++)
                {
                    binaryData[j] = binaryString.charCodeAt(j);
                }
                
                blobData = new Blob([new Uint8Array(binaryData)],{ type: resourceMimeType[i] });
                
                resourceMimeType[i] = "";
                
                resourceBlobUrl[i] = window.URL.createObjectURL(blobData);
            }
        }
    }

    function replaceReferences(depth,element)
    {
        var i,regex1,regex2,csstext;
        
        regex1 = /url\(\s*(?:'|")?data:[^;]*;resource=(\d+);base64,(?:'|")?\s*\)/gi;
        regex2 = /data:[^;]*;resource=(\d+);base64,/i;
        
        if (element.hasAttribute("style"))
        {
            csstext = element.style.cssText;
            element.style.cssText = csstext.replace(regex1,replaceCSSRef);
        }
        
        if (element.localName == "style")
        {
            csstext = element.textContent;
            element.textContent = csstext.replace(regex1,replaceCSSRef);
        }
        else if (element.localName == "link" && (element.rel.toLowerCase() == "icon" || element.rel.toLowerCase() == "shortcut icon"))
        {
            if (element.href != "") element.href = element.href.replace(regex2,replaceRef);
        }
        else if (element.localName == "body")
        {
            if (element.background != "") element.background = element.background.replace(regex2,replaceRef);
        }
        else if (element.localName == "img")
        {
            if (element.src != "") element.src = element.src.replace(regex2,replaceRef);
        }
        else if (element.localName == "input" && element.type.toLowerCase() == "image")
        {
            if (element.src != "") element.src = element.src.replace(regex2,replaceRef);
        }
        else if (element.localName == "audio")
        {
            if (element.src != "")
            {
                element.src = element.src.replace(regex2,replaceRef);
                element.load();
            }
        }
        else if (element.localName == "video")
        {
            if (element.src != "")
            {
                element.src = element.src.replace(regex2,replaceRef);
                element.load();
            }
            if (element.poster != "") element.poster = element.poster.replace(regex2,replaceRef);
        }
        else if (element.localName == "source")
        {
            if (element.src != "")
            {
                element.src = element.src.replace(regex2,replaceRef);
                element.parentElement.load();
            }
        }
        else if (element.localName == "track")
        {
            if (element.src != "") element.src = element.src.replace(regex2,replaceRef);
        }
        else if (element.localName == "object")
        {
            if (element.data != "") element.data = element.data.replace(regex2,replaceRef);
        }
        else if (element.localName == "embed")
        {
            if (element.src != "") element.src = element.src.replace(regex2,replaceRef);
        }
        
        if (element.localName == "iframe" || element.localName == "frame")
        {
            element.onload =
            function()
            {
                try
                {
                    if (element.contentDocument.documentElement != null)
                    {
                        if (depth < maxframedepth)
                        {
                            replaceReferences(depth+1,element.contentDocument.documentElement);
                        }
                    }
                }
                catch (e) {}
            };
            
            blobData = new Blob([ decodeURIComponent(element.src.substr(29)) ],{ type: "text/html;charset=utf-8" });
            
            element.src = window.URL.createObjectURL(blobData);
        }
        else
        {
            for (i = 0; i < element.children.length; i++)
                if (element.children[i] != null)
                    replaceReferences(depth,element.children[i]);
        }
    }

    function replaceCSSRef(match,p1,offset,string)
    {
        return "url(" + resourceBlobUrl[+p1] + ")";
    }

    function replaceRef(match,p1,offset,string)
    {
        return resourceBlobUrl[+p1];
    }
    
    /********************************************************/
    /*                                                      */
    /*  Save Page WE will insert resource assignments here  */
    /*                                                      */
    /*  e.g.  resourceMimeType[0] = "image/png";            */
    /*        resourceBase64Data[0] = "...base64data...";   */
    /*                                                      */
    /********************************************************/
    
}

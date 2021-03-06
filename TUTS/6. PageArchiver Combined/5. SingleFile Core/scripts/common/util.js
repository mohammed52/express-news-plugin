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

  singlefile.util = {};
  // returns the comment string <!DOCTYPE html
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
  /**
   * calls getDoctype + docElement.outerHTML ???
   */
  singlefile.util.getDocContent = function(doc, docElement) {
    console.log("singlefile.util.getDocContent = function(doc, docElement)");
    docElement = docElement || doc.documentElement;
    // getDoctype = string <!DOCTYPE html
    // element.outerHTML gets the serialized HTML fragment describing the element including its descendants
    // basically adds a comment to the start of the outerHTML and returns it
    return getDoctype(doc) + docElement.outerHTML;
  };

})();

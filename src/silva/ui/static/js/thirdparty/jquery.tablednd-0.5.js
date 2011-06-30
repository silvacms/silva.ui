/**
 * TableDnD plug-in for JQuery, allows you to drag and drop table rows
 * You can set up various options to control how the system will work
 * Copyright (c) Denis Howlett <denish@isocra.com>
 * Licensed like jQuery, see http://docs.jquery.com/License.
 *
 * Configuration options:
 *
 * onDragStyle
 *     This is the style that is assigned to the row during drag. There are limitations to the styles that can be
 *     associated with a row (such as you can't assign a border--well you can, but it won't be
 *     displayed). (So instead consider using onDragClass.) The CSS style to apply is specified as
 *     a map (as used in the jQuery css(...) function).
 * onDropStyle
 *     This is the style that is assigned to the row when it is dropped. As for onDragStyle, there are limitations
 *     to what you can do. Also this replaces the original style, so again consider using onDragClass which
 *     is simply added and then removed on drop.
 * onDragClass
 *     This class is added for the duration of the drag and then removed when the row is dropped. It is more
 *     flexible than using onDragStyle since it can be inherited by the row cells and other content. The default
 *     is class is tDnD_whileDrag. So to use the default, simply customise this CSS class in your
 *     stylesheet.
 * onDrop
 *     Pass a function that will be called when the row is dropped. The function takes 2 parameters: the table
 *     and the row that was dropped. You can work out the new order of the rows by using
 *     table.rows.
 * onDragStart
 *     Pass a function that will be called when the user starts dragging. The function takes 2 parameters: the
 *     table and the row which the user has started to drag.
 * onAllowDrop
 *     Pass a function that will be called as a row is over another row. If the function returns true, allow
 *     dropping on that row, otherwise not. The function takes 2 parameters: the dragged row and the row under
 *     the cursor. It returns a boolean: true allows the drop, false doesn't allow it.
 * scrollAmount
 *     This is the number of pixels to scroll if the user moves the mouse cursor to the top or bottom of the
 *     window. The page should automatically scroll up or down as appropriate (tested in IE6, IE7, Safari, FF2,
 *     FF3 beta
 * dragHandle
 *     This is the name of a class that you assign to one or more cells in each row that is draggable. If you
 *     specify this class, then you are responsible for setting cursor: move in the CSS and only these cells
 *     will have the drag behaviour. If you do not specify a dragHandle, then you get the old behaviour where
 *     the whole row is draggable.
 *
 * Other ways to control behaviour:
 *
 * Add class="nodrop" to any rows for which you don't want to allow dropping, and class="nodrag" to any rows
 * that you don't want to be draggable.
 *
 * Inside the onDrop method you can also call $.tableDnD.serialize() this returns a string of the form
 * <tableID>[]=<rowID1>&<tableID>[]=<rowID2> so that you can send this back to the server. The table must have
 * an ID as must all the rows.
 *
 * Other methods:
 *
 * $("...").tableDnDUpdate()
 * Will update all the matching tables, that is it will reapply the mousedown method to the rows (or handle cells).
 * This is useful if you have updated the table rows using Ajax and you want to make the table draggable again.
 * The table maintains the original configuration (so you don't have to specify it again).
 *
 * $("...").tableDnDSerialize()
 * Will serialize and return the serialized string as above, but for each of the matching tables--so it can be
 * called from anywhere and isn't dependent on the currentTable being set up correctly before calling
 *
 * Known problems:
 * - Auto-scoll has some problems with IE7  (it scrolls even when it shouldn't), work-around: set scrollAmount to 0
 *
 * Version 0.2: 2008-02-20 First public version
 * Version 0.3: 2008-02-07 Added onDragStart option
 *                         Made the scroll amount configurable (default is 5 as before)
 * Version 0.4: 2008-03-15 Changed the noDrag/noDrop attributes to nodrag/nodrop classes
 *                         Added onAllowDrop to control dropping
 *                         Fixed a bug which meant that you couldn't set the scroll amount in both directions
 *                         Added serialize method
 * Version 0.5: 2008-05-16 Changed so that if you specify a dragHandle class it doesn't make the whole row
 *                         draggable
 *                         Improved the serialize method to use a default (and settable) regular expression.
 *                         Added tableDnDupate() and tableDnDSerialize() to be called when you are outside the table
 */

(function(jQuery) {


    var module  = {
        /** Keep hold of the current table being dragged */
        currentTable : null,
        /** Keep hold of the current drag object if any */
        dragObject: null,
        /** The current mouse offset */
        mouseOffset: null,
        /** Remember the old value of Y so that we don't do too much processing */
        oldY: 0,

        /** Actually build the structure */
        build: function(options) {
            // Set up configuration and event handler
            this.each(function() {
                var tbody = this;
                var config = jQuery.extend({
                    onDragStyle: null,
                    onDropStyle: null,
                    onDragClass: "tDnD_whileDrag",
                    onDrop: null,
                    onDragStart: null,
                    scrollAmount: 5,
                    dragHandle: null
                }, options || {});

                jQuery(tbody).delegate("td." + config.dragHandle, "mousedown", function(event) {
                    var cell = event.target;
                    var drag = true;

                    if (config.onDragStart) {
                        // onDragStart can be used to disable drag and drop by returning false
                        drag = config.onDragStart(cell);
                    };
                    if (drag !== false) {
                        module.dragObject = cell.parentNode;
                        module.currentTable = tbody;
                        module.mouseOffset = module.getMouseOffset(cell, event);
                        event.stopPropagation();
                        event.preventDefault();
                        return false;
                    };
                });

                tbody.tableDnDConfig = config;
            });

            // Now we need to capture the mouse up and mouse move event
            // We can use bind so that we don't interfere with other event handlers
            jQuery(document)
                .bind('mousemove', module.mousemove)
                .bind('mouseup', module.mouseup);

            // Don't break the chain
            return this;
        },

        /** Get the mouse coordinates from the event (allowing for browser differences) */
        mousePosition: function(ev){
            if(ev.pageY){
                return ev.pageY;
            }
            return ev.clientY + document.body.scrollTop  - document.body.clientTop;
        },

        /** Given a target element and a mouse event, get the mouse offset from that element.
            To do this we need the element's position and the mouse position */
        getMouseOffset: function(target, ev) {
            ev = ev || window.event;

            return this.mousePosition(ev) - this.documentPosition(target);
        },

        /** Get the position of an element by going up the DOM tree and adding up all the offsets */
        documentPosition: function(e){
            var top  = 0;

            /**
             * Safari fix
             * http://jacob.peargrove.com/blog/2006/technical/table-row-offsettop-bug-in-safari/
             */
            if (e.offsetHeight == 0) {
                e = e.firstChild;
            };

            while (e.offsetParent){
                top += e.offsetTop;
                e = e.offsetParent;
            };
            top  += e.offsetTop;
            return top;
        },

        mousemove: function(ev) {
            if (module.dragObject == null) {
                return;
            }

            var dragObj = jQuery(module.dragObject);
            var config = module.currentTable.tableDnDConfig;
            var mousePos = module.mousePosition(ev);
            var y = mousePos - module.mouseOffset;
            //auto scroll the window
            var yOffset = window.pageYOffset;
            if (document.all) {
                // Windows version
                //yOffset=document.body.scrollTop;
                if (typeof document.compatMode != 'undefined' &&
                    document.compatMode != 'BackCompat') {
                    yOffset = document.documentElement.scrollTop;
                }
                else if (typeof document.body != 'undefined') {
                    yOffset=document.body.scrollTop;
                }

            }

            if (mousePos-yOffset < config.scrollAmount) {
                window.scrollBy(0, -config.scrollAmount);
            } else {
                var windowHeight = window.innerHeight ? window.innerHeight
                    : document.documentElement.clientHeight ? document.documentElement.clientHeight : document.body.clientHeight;
                if (windowHeight-(mousePos-yOffset) < config.scrollAmount) {
                    window.scrollBy(0, config.scrollAmount);
                }
            }

            if (y != module.oldY) {
                // work out if we're going up or down...
                var movingDown = y > module.oldY;
                // update the old value
                module.oldY = y;
                // update the style to show we're dragging
                if (config.onDragClass) {
                    dragObj.addClass(config.onDragClass);
                } else {
                    dragObj.css(config.onDragStyle);
                }
                // If we're over a row then move the dragged row to there so that the user sees the
                // effect dynamically
                var currentRow = module.findDropTargetRow(dragObj, y);
                if (currentRow) {
                    // TODO worry about what happens when there are multiple TBODIES
                    if (movingDown && module.dragObject != currentRow) {
                        module.dragObject.parentNode.insertBefore(module.dragObject, currentRow.nextSibling);
                    } else if (! movingDown && module.dragObject != currentRow) {
                        module.dragObject.parentNode.insertBefore(module.dragObject, currentRow);
                    }
                }
            }

            return false;
        },

        /** We're only worried about the y position really, because we can only move rows up and down */
        findDropTargetRow: function(draggedRow, y) {
            var rows = $(module.currentTable).children('tr');
            for (var i=0, len=rows.length; i<len; i++) {
                var row = rows[i];
                var rowY = this.documentPosition(row);
                var rowHeight = parseInt(row.offsetHeight)/2;
                if (row.offsetHeight == 0) {
                    rowY = this.documentPosition(row.firstChild);
                    rowHeight = parseInt(row.firstChild.offsetHeight)/2;
                }
                // Because we always have to insert before, we need to offset the height a bit
                if ((y > rowY - rowHeight) && (y < (rowY + rowHeight))) {
                    // that's the row we're over
                    // If it's the same as the current row, ignore it
                    if (row == draggedRow) {return null;}
                    var config = module.currentTable.tableDnDConfig;
                    if (config.onAllowDrop) {
                        if (config.onAllowDrop(draggedRow, row)) {
                            return row;
                        }
                        return null;
                    } else {
                        return row;
                    }
                    return row;
                }
            }
            return null;
        },

        mouseup: function(event) {
            if (module.currentTable && module.dragObject) {
                var droppedRow = module.dragObject;
                var config = module.currentTable.tableDnDConfig;
                // If we have a dragObject, then we need to release it,
                // The row will already have been moved to the right place so we just reset stuff
                if (config.onDragClass) {
                    jQuery(droppedRow).removeClass(config.onDragClass);
                } else {
                    jQuery(droppedRow).css(config.onDropStyle);
                }
                module.dragObject = null;
                if (config.onDrop) {
                    // Call the onDrop method if there is one
                    config.onDrop(droppedRow);
                }
                module.currentTable = null; // let go of the table too
                event.stopPropagation();
                event.preventDefault();
                return false;
            }
        }
    };

    jQuery.fn.extend({
        tableDnD : module.build
    });
})(jQuery);

/**
 * This file is part of CalendarView.
 *
 * @license CalendarView is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * CalendarView is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with CalendarView.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * Copyright 2014 Daniel Deady <daniel@clockworkgeek.com>
 */
(function(){
    'use strict';

    /*
     * A rather optimistic base type for all field-based widgets.
     * 
     * Constructor accepts multiple mixins which work the same as
     * extending via Class.create().
     * 
     * Requires at least one `field` (as ID or element) in the constructor.
     * `field` may also be an array of elements.
     * 
     * Requires one or more `control` classes too.
     */
    self.Widget = Class.create({ /** @memberOf Widget */

        // individual elements may have their own formatting
        formatAttr: 'data-format',

        // default formatting for localised datetime fields
        format: '%x',

        containerClass: 'calendar',

        extend: function(object) {
            Object.keys(object).each(function(key) {
                var value = object[key];
                // based on Class#addMethods if you hadn't guessed
                if (Object.isFunction(value) && value.argumentNames()[0] == '$super') {
                    value = this[key].wrap(value);
                }
                this[key] = value;
            }, this);
        },

        initialize: function() {
            var t = this;
            // copy all mixins/options to this object
            $A(arguments).flatten().each(t.extend.bind(t));

            // allow descendents to override locale, or specify language
            t.locale = t.locale || new Locale(t.language);
            // allow descendents to override formatting, default to using dates
            t.formatFunc = t.formatFunc || t.locale.formatDate.bind(t.locale);
            t.parseFunc = t.parseFunc || t.locale.parseDate.bind(t.locale);

            // delay further initialization unless it's already been delayed
            if (document.loaded) t.initializeElements();
            else document.observe('dom:loaded', t.initializeElements.bind(t));
        },

        initializeElements: function() {
            var fields = this.field;
            this.field = (Object.isArray(fields) ? fields : [fields]).map($).pluck(0).filter(Prototype.K);
            this.element = this.getContent();
        },

        getContent: function() {
            return new Element('div', {'class': this.containerClass, unselectable: 'on'});
        },

        getFormat: function(field) {
            return field.readAttribute(this.formatAttr) || this.format;
        },

        getValue: function() {
            // return first truthy field
            // might be null or undefined if something went wrong
            var result = null;
            this.field.each(function(field) {
                try {
                    var value = $F(field).trim();
                }
                catch (e) {
                    value = field.innerHTML.trim();
                }
                if (result = this.parseFunc(value, this.getFormat(field))) {
                    throw $break;
                }
            }, this);
            return result;
        },

        setValue: function(value) {
            this.field.each(function(field) {
                value = this.formatFunc(value, this.getFormat(field));
                try {
                    field.setValue(value);
                }
                catch (e) {
                    field.innerHTML = value;
                }
            }, this);
        },

        update: function(value) {
            // a soft equivalent to setValue(), does not directly update field
        }

    });

    /*
     * Embeds itself in a parent container and does not close.
     * `parent` must be passed to constructor.
     * Sets field value immediately on every update.
     */
    Widget.Embedded = { /** @memberOf Widget.Embedded */
        getContent: function($super) {
            return $(this.parent).appendChild($super());
        },

        update: function($super, value) {
            $super(value);
            this.setValue(value);
        }
    };


    /*
     * Event handler for popup and dropdown types.
     * 
     * Reposition parent only, which is an invisible wrapper.
     * Position is relative to triggering element.
     * 
     * Parent can not reliably be a child of trigger as not all elements
     * can be parents (<img>, <input>) and calendar doesn't want to deal
     * with inherited styles (fonts, alignment, etc).
     * 
     * So repositioning is dealt with explicitly by observing resizes.
     * 
     * @this Widget.Popup|Widget.Dropdown
     */
    function reposition() {
        if (this.relativeTo) {
            var position = this.relativeTo.cumulativeOffset();
            this.parent.setStyle({left: position.left+'px', top: position.top+'px'});
        }
    }

    /*
     * Remains hidden until `trigger` element is clicked.
     */
    Widget.Popup = { /** @memberOf Widget.Popup */
        initializeElements: function($super) {
            $super();
            var trigger = this.trigger;
            trigger = (Object.isArray(trigger) ? trigger : [trigger]).map($).pluck(0).filter(Prototype.K);
            trigger.invoke('observe', 'click', this.toggle.bind(this));
            this.trigger = trigger;
            Event.observe(window, 'resize', reposition.bind(this));
        },

        getContent: function($super) {
            var element = $super().addClassName('popup');
            element.insert(new Element('a', {'class': 'closeButton'})
                .update('×')
                .observe('click', this.toggle.bind(this)));
            document.body.insert(
                this.parent = element.wrap('div').absolutize().hide()
            );
            if (self.Draggable) {
                new Draggable(element);
            }
            return element;
        },

        /*
         * Show or hide. Equivalent to Element.toggle()
         */
        toggle: function(event) {
            this.parent.toggle();
            if (event instanceof UIEvent) this.relativeTo = event.findElement();
            reposition.call(this);
            // place main element somewhere convenient
            var element = this.element,
                elementSize = element.getDimensions(),
                triggerSize = this.relativeTo.getDimensions(),
                left = (triggerSize.width - elementSize.width)/2,
                top = triggerSize.height,
                maxBottom = document.viewport.getScrollOffsets().top + document.viewport.getHeight();
            if (this.parent.measure('top') + top + elementSize.height > maxBottom) {
                top = -elementSize.height;
            }
            element.setStyle({left: left+'px', top: top+'px'});
        }
    };

    function autoScroll(element) {
        var minScroll = element.cumulativeOffset().top + element.getHeight() - document.viewport.getHeight();
        if (window.scrollY < minScroll) {
            window.scrollTo(window.scrollX, minScroll);
        }
    }

    /*
     * Shows as if attached to the primary field.
     * The field is the trigger.
     */
    Widget.Dropdown = {
        initializeElements: function($super) {
            $super();
            this.trigger = this.field.invoke('observe', 'click', this.toggle.bind(this));
            Event.observe(window, 'resize', reposition.bind(this));
        },

        getContent: function($super) {
            var element = $super().addClassName('dropdown');
            document.body.insert(
                this.parent = element.wrap('div').absolutize().hide()
            );
            return element;
        },

        toggle: function(event) {
            var parent = this.parent.toggle(),
                element = this.element,
                field = this.relativeTo = event instanceof UIEvent ? event.findElement() : this.field[0];
            reposition.call(this);
            if (parent.visible()) {
                // Surround `field` and elevate it
                field.setStyle({position: 'relative', zIndex: 6});
                // reset for calculations
                element.setStyle({marginTop: '', marginLeft: '', paddingTop: '', minWidth: ''});
                var elementWidth = element.measure('width'),
                    topGap = element.measure('border-top') + element.measure('padding-top'),
                    leftGap = element.measure('border-left') + element.measure('padding-left');
                element.setStyle({
                    marginTop: -topGap + 'px',
                    marginLeft: (field.getWidth() - elementWidth) / 2 - leftGap + 'px',
                    paddingTop: topGap + field.getHeight() + 'px',
                    minWidth: elementWidth,
                    zIndex: 5
                });
                autoScroll(element);
            }
            else {
                field.setStyle({position: '', zIndex: ''});
            }
        },

        update: function($super, value) {
            $super(value);
            autoScroll.defer(this.element);
        }
    };

    /*
     * Hide when a hard value is selected (eg. clicking on a date)
     * or when clicking outside widget.
     */
    Widget.AutoHide = { /** @memberOf Widget.AutoHide */
        toggle: function($super, event) {
            $super(event);
            var parent = this.parent,
                triggers = this.trigger;
            // hide() needs to be internal func so it is named and individual
            function hide(event) {
                if (!event.findElement().descendantOf(parent) && !triggers.include(event.findElement())) {
                    parent.hide();
                    document.stopObserving('mousedown', hide);
                }
            }
            if (this.parent.visible()) {
                document.observe('mousedown', hide);
            }
        },

        setValue: function($super, value) {
            $super(value);
            this.parent.hide();
        }
    };

})();

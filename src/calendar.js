/**
 * This file is part of CalendarView.
 *
 * CalendarView is free software: you can redistribute it and/or modify
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
 * 
 * Based on previous work by, with thanks to, but without copying of:
 * - Yuri Leikind
 * - Justin Mecham <justin@aspect.net>
 * - Mihai Bazon (author of original www.dynarch.com/projects/calendar)
 */

(function(){
    'use strict';

    self.Calendar = Class.create(Widget, { /** @memberOf Calendar */
        selectClass: 'selected',
        nowClass: 'today',

        initializeElements: function($super) {
            $super();
            this.update(this.date || this.getValue());
        },

        getValue: function($super) {
            return $super() || new Date;
        },

        /*
         * Controls should call when updating appropriate element.
         * Other mixins should override to make modifications.
         * 
         * @param Date date Value that calendar is being updated to.
         * @param ObjectRange range The month/day/hour/etc represented by this element.
         * @param HTMLElement element A single cell/span/etc being updated.
         */
        updatePeriod: function(date, range, element) {
            var value = range.include(this.date = date);
            element
                .toggleClassName(this.nowClass, range.include(new Date))
                .toggleClassName(this.selectClass, value)
                .selected = value;
        }

    });

})();

(function() {

    Element.addMethods({
        addTag: function(element, tagName, attributes) {
            return element.appendChild(new Element(tagName, attributes));
        }
    });

    /*
     * Widget control mixin.
     * 
     * Single month displayed as a table.
     */
    Calendar.Dates = { /** @memberOf Calendar.Dates */
        getContent: function($super) {
            var content = $super();
            var table = this.datesTable = content.addTag('table'),
                thead = table.addTag('thead'),
                tbody = table.addTag('tbody'),
                locale = this.locale,
                days = locale.get('day_abbrs');
            for (var i = 0; i < locale.get('firstDayOfWeek'); i++) {
                days.push(days.shift());
            }

            thead.insert('<tr><td class=title colspan=7/></tr>');
            thead.insert('<tr><td class="cvbutton otherDay">«</td><td class="cvbutton otherDay">‹</td><td class="cvbutton today" colspan=3>'+
                    locale.get('today') + '</td><td class="cvbutton otherDay">›</td><td class="cvbutton otherDay">»</td></tr>');
            thead.insert('<tr>'+'<th/>'.times(7)+'</tr>');
            thead.select('th').each(function(th, i) {
                th.update(days[i]).toggleClassName('weekend', locale.isWeekend(i));
            });
            thead.on('click', '.cvbutton', onSelect.bind(this));

            tbody.insert('<tr class=days><td/><td/><td/><td/><td/><td/><td/></tr>'.times(6));
            tbody.on('click', 'td', onSelect.bind(this));

            return content;
        },

        update: function($super, date) {
            $super(date);

            var table = this.datesTable,
                locale = this.locale;
            table.select('.title')[0].update(this.locale.formatDate(date, '%B %Y'));

            var buttons = table.select('.cvbutton'),
                Y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
            // equivalent to getParts()
            buttons[0].parts = [Y-1, m];
            buttons[1].parts = [Y, m-1];
            buttons[2].parts = new Date().getParts(3); // Date.now()
            buttons[3].parts = [Y, m+1];
            buttons[4].parts = [Y+1, m];

            var dd = new Date(date.getFullYear(), date.getMonth(), 1);
            dd.setDate(1 + locale.get('firstDayOfWeek') - dd.getDay());
            table.select('.days td').each(function(day) {
                day.update(dd.getDate())
                    .toggleClassName('otherDay', dd.getMonth() != date.getMonth())
                    .toggleClassName('weekend', locale.isWeekend(dd))
                    .parts = dd.getParts(3);
                this.updatePeriod(date, $R(new Date(dd), new Date(dd.setDate(dd.getDate()+1)), true), day);
            }, this);

            table.select('.days').each(function(week) {
                var empty = week.select('td.otherDay').length == 7;
                week.toggle(!empty);
            });
        }
    };

    // private Calendar.Dates method
    function onSelect(event, td) {
        if (td.parts) {
            // cache classname because it's about to change
            var otherDay = td.hasClassName('otherDay');
            // set only date parts not time
            this.update(new Date(this.date).setParts(td.parts));
            if (!otherDay) {
                this.setValue(this.date);
            }
        }
    }

    /*
     * Set date values in order from year to millisecond.
     */
    Date.prototype.setParts = function(parts) {
        var setters = $w('setYearOnly setMonthOnly setDate setHours setMinutes setSeconds setMilliseconds');
        for (var i = 0; i < parts.length; i++) {
            if (isFinite(parts[i])) {
                this[setters[i]](parts[i]);
            }
        }
        return this;
    };

    Date.prototype.getParts = function(num) {
        var getters = $w('getFullYear getMonth getDate getHours getMinutes getSeconds getMilliseconds');
        var parts = [];
        for (var i = 0; i < num; i++) {
            parts.push(this[getters[i]]());
        }
        return parts;
    };

})();

(function(){
    'use strict';

    Calendar.Time = { /** @memberOf Calendar.Time */
        // add standard time fields to default format
        format: '%c',

        getContent: function($super) {
            var content = $super();
            var fieldset = this.datesTable && this.datesTable.addTag('tfoot').addTag('td', {colspan: 7}) || content.addTag('fieldset'),
                hours = enumToSelect($R(0, 23)),
                minutes = enumToSelect([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
            fieldset.insert(hours);
            fieldset.insert('<span> : </span>');
            fieldset.insert(minutes);
            fieldset.on('change', 'select', onChange.bind(this));

            this.timeControls = [].concat(
                hours.descendants().each(function(hour) {
                    hour.parts = [,,, hour.value];
                    hour.nextParts = [,,, (hour.value|0)+1];
                }),
                minutes.descendants().each(function(min) {
                    min.parts = [,,,, min.value];
                    min.nextParts = [,,,, (min.value|0)+5];
                })
            );

            return content;
        },

        update: function($super, date) {
            var d = new Date(0).setParts(date.getParts(4));
            this.timeControls.each(function(option) {
                var range = $R(
                        new Date(d).setParts(option.parts),
                        new Date(d).setParts(option.nextParts),
                        true
                );
                this.updatePeriod(date, range, option);
                if (range.include(date)) date.setParts(option.parts);
            }, this);
            $super(date);
        }
    };

    // private Calendar.Time method
    function onChange(event, select) {
        var option = select.selectedOptions[0];
        if (option.parts) {
            this.update(new Date(this.date).setParts(option.parts));
        }
    }

    function enumToSelect(enumer) {
        var select = new Element('select');
        enumer.each(function(value) {
            select.addTag('option').update(value);
        });
        return select;
    }

})();

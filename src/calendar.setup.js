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
 */
(function(){
    'use strict';

    /*
     * Shim for legacy DHTML calendar.
     * See http://www.dynarch.com/jscal/
     */
    Calendar.setup = function(args) {
        var mixins = [Widget.Popup];
        if (args.singleClick) mixins.push(Widget.AutoHide);
        mixins.push(Calendar.Dates);
        if (args.showsTime) mixins.push(Calendar.Time);
        var lastDate = new Date(0);
        return new Calendar(mixins, {
            field: [args.inputField, args.displayArea],
            format: args.dateFormat || args.ifFormat || args.daFormat || '%Y/%m/%d',
            trigger: args.trigger || args.button || [args.displayArea, args.inputField],
            update: function($super, date) {
                $super(date);
                if (args.onChange && (date.getFullYear() != lastDate.getFullYear() || date.getMonth() != lastDate.getMonth())) {
                    args.onChange(this, date);
                }
                if (args.onTimeChange && (date.getHours() != lastDate.getHours() || date.getMinutes() != lastDate.getMinutes())) {
                    args.onTimeChange(this, this.locale.formatDate(date, '%H%M'));
                }
                lastDate = date;
            },
            setValue: function($super, date) {
                $super(date);
                if (args.onSelect) args.onSelect(this, date);
            }
        });
    };

})();

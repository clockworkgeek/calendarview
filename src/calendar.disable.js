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

    function disable(element) {
        element.addClassName('disabled').disabled = true;
    }

    function undisable(container) {
        container.select('.disabled').each(function(element) {
            element.removeClassName('disabled').disabled = false;
        });
    }

    Calendar.DisablePast = {
        update: function($super, date) {
            if (date < Date.now()) {
                date.setTime(Date.now());
            }
            undisable(this.element);
            $super(date);
        },

        updatePeriod: function($super, date, range, element) {
            $super(date, range, element);
            if (Date.now() > range.end) {
                disable(element);
            }
        }
    };

    Calendar.DisableFuture = {
        update: function($super, date) {
            if (date > Date.now()) {
                date.setTime(Date.now());
            }
            undisable(this.element);
            $super(date);
        },

        updatePeriod: function($super, date, range, element) {
            $super(date, range, element);
            if (Date.now() < range.start) {
                disable(element);
            }
        }
    };

    Calendar.DisableDays = {
        disabledDays: [],

        isBadDay: function(date) {
            return this.disabledDays.include(date.getDay());
        },

        update: function($super, date) {
            var month = date.getMonth();
            while (this.isBadDay(date)) {
                date.setDate(date.getDate() + 1);
                if (date.getMonth() != month) date.setDate(-6);
            }
            // no need to un-disable here
            $super(date);
        },

        updatePeriod: function($super, date, range, element) {
            $super(date, range, element);
            if (this.isBadDay(range.start)) {
                disable(element);
            }
        }
    };

    Calendar.DisableWeekends = {
        isBadDay: function(date) {
            return this.locale.isWeekend(date);
        },
        update: Calendar.DisableDays.update,
        updatePeriod: Calendar.DisableDays.updatePeriod
    };

    Calendar.DisableWeekdays = {
        isBadDay: function(date) {
            return !this.locale.isWeekend(date);
        },
        update: Calendar.DisableDays.update,
        updatePeriod: Calendar.DisableDays.updatePeriod
    };

})();

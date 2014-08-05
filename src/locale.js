/**
 *  This file is part of CalendarView.
 *
 *  CalendarView is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Lesser General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  CalendarView is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public License
 *  along with CalendarView.  If not, see <http://www.gnu.org/licenses/>.
 *  
 *  @copyright 2014 Daniel Deady <daniel@clockworkgeek.com>
 */
(function(){
    'use strict';

    // Initial set of message strings. More can be added with Locale.add(lang, messages)
    // Note it is not necessary to specify every key, there is some inheritance at work.
    var strings = {
            en: {
                days: $w('Sunday Monday Tuesday Wednesday Thursday Friday Saturday'),
                day_abbrs: $w('S M T W T F S'),
                months: $w('January February March April May June July August September October November December'),
                month_abbrs: $w('Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'),
                today: 'Today',
                date_format: '%Y-%m-%d',
                time_format: '%H:%M',
                datetime_format: '%Y-%m-%d %H:%M',
                meridian: $w('AM PM')
            }
    };

    /**
     * Ways to instantiate:
     * english = new Locale
     * french = new Locale('fr')
     * american = new Locale('en-US')
     *
     * @class
     */
    self.Locale = Class.create(Hash, { /** @memberOf Locale */
        initialize: function($super, lang) {
            $super(strings.en); // default to international English
            if (lang && Object.isString(lang)) {
                // if a language is unknown no change happens
                this.update(strings[lang.slice(0, 2)]);
                this.update(strings[lang]);
            }
        },

        get: function($super, key) {
            var result = $super(key);
            // check for extra dimensions of keys
            var args = $A(arguments).slice(2);
            while (Object.isArray(result) && args.length) {
                result = result[args.shift()];
            }
            return result;
        },

        /**
         * Mimics C's strftime() function.
         * <p>
         * ISO 8601 week calculations are not supported.
         * They would increase project scope too much.
         *
         * @param {Date} date
         * @param {String} format
         * @returns {String}
         */
        formatDate: function(date, format) {
            var get = this.get.bind(this);
            return substitute(format, this).gsub(/%(.)/, function(tag) {
                switch (tag[1]) {
                case 'a': return get('day_abbrs', date.getDay());
                case 'A': return get('days', date.getDay());
                case 'b':
                case 'h': return get('month_abbrs', date.getMonth());
                case 'B': return get('months', date.getMonth());
                case 'C': return date.getFullYear() / 100 |0;
                case 'd': return date.getDate().toPaddedString(2);
                case 'e': return (date.getDate() < 10 ? ' ' : '') + date.getDate();
                case 'H': return date.getHours().toPaddedString(2);
                case 'I': return ((date.getHours() + 11) % 12 + 1).toPaddedString(2);
                case 'j': return date.getDayOfYear().toPaddedString(3);
                case 'k': return date.getHours();
                case 'l': return (date.getHours() + 11) % 12 + 1;
                case 'm': return (date.getMonth() + 1).toPaddedString(2);
                case 'M': return date.getMinutes().toPaddedString(2);
                case 'n': return '\n';
                case 'p': return get('meridian', date.getHours() / 12 |0 % 2);
                case 'P': return get('meridian', date.getHours() / 12 |0 % 2).toLowerCase();
                case 's': return date.getTime();
                case 'S': return date.getSeconds().toPaddedString(2);
                case 't': return '\t';
                case 'u': return date.getDay() + 1;
                case 'U': return date.getWeek(0).toPaddedString(2);
                case 'w': return date.getDay();
                case 'W': return date.getWeek(1).toPaddedString(2);
                case 'y': return (date.getYear() % 100).toPaddedString(2);
                case 'Y': return date.getFullYear();
                case 'z':
                    var offset = date.getTimezoneOffset();
                    return (offset < 0 ? '-' : '+')
                    + (offset / 60 |0).abs().toPaddedString(2)
                    + (offset % 60).toPaddedString(2);
                    // %Z becomes 'Z' which is abbr of 'Zulu' which means local time
                default: return tag[1];
                }
            });
        },

        /**
         * Attempt to parse `input` by the given `format`.
         * Potentially returns a null if input does not match format.
         * <p>
         * Parsing dates is necessarily convoluted.
         * For example "2/3/00" in America is the 3rd of February whereas in
         * Europe it is the 2nd of March.
         * This method allows you to be more specific in the order of values.
         * For a generic method consider the native Date.parse().
         * Week-based dates are currently unsupported.
         * <p>
         * Examples:
         * <code>
         * new Locale('en-US').parseDate('2/3/00 12:34', '%c')
         * new Locale('fr').parseDate('8 avril 2013', '%e %B %Y')
         * // omitted dates default to the Epoch
         * new Locale().parseDate('10pm', '%H%P') => 1970-01-01 22:00
         * </code>
         *
         * @param {String} input
         * @param {String} format
         * @returns {Date} Date or null if invalid
         */
        parseDate: function(input, format) {
            var t = this;
            input = input.toLowerCase();
            ['days', 'day_abbrs', 'months', 'month_abbrs', 'meridian'].each(
                    function(key) {
                        t.get(key).each(function(str, i) {
                            input = input.replace(str.toLowerCase(), i.toPaddedString(2));
                        });
                    });
            // convert format to be more specific
            format = substitute(RegExp.escape(format), this);
            var replace = String.prototype.replace;
            // each tuple is passed to apply, which expects an array
            // effectively this happens: replace.apply(format, tuple)
            // which is the same as: format.replace(tuple[0], tuple[1])
            format = [['%a','%w'],['%A','%w'],['%b','%m'],
                      ['%B','%m'],['%h','%m'],['%P','%p']]
            .inject(format, replace.apply.bind(replace));

            // convert format to regexp pattern
            var pattern = format.gsub(/%(.)/, function(tag) {
                switch (tag[1]) {
                // 2-digit values
                case 'C': // century
                case 'd': // day of month
                case 'H': // 24 hours
                case 'I': // 12 hours
                case 'k': // 24 hours
                case 'l': // 12 hours
                case 'm': // month
                case 'M': // minutes
                case 'p': // meridian as digits
                case 'S': // seconds
                case 'U': // sunday week
                case 'W': // monday week
                case 'y': // year
                    return '(\\d\\d?)';
                case 'e': // day of month
                    return '([1-3\\s]\\d)';
                // 4-digit years
                case 'Y': return '(\\d{4})';
                // 3-digit day
                case 'j': return '([0-3]\\d\\d)';
                // unix time
                case 's': return '([-+]?\\d+)';
                // 1-digit day of week
                case 'u':
                case 'w': return '(\\d)';
                // timezones
                case 'z': return '([-+]\\d{4})';
                case 'Z': return '([A-Z]{1,3})';
                // literal char
                default: return '(\\'+tag[1]+')';
                }
            });

            // Case insensitive match
            var found = input.match(new RegExp('^'+pattern+'$', 'i'));
            if (!found) return null;

            format = [['%k','%H'],['%l','%I'],['%e','%d']]
            .inject(format, replace.apply.bind(replace));
            // values is a hash
            // did you know pluck works on string indexes too?
            var values = format.match(/%./g).pluck(1).combine(found.slice(1));

            // values are all strings so far
            // when not typecast "" == false and "0" == true
            if (values.s) return new Date(parseInt(values.s));
            var date = new Date(0);
            if (values.y) {
                if (!values.C) values.C = (values.y < 50 ? 20 : 19)
                values.Y = (values.y|0) + values.C * 100;
            }
            if (values.Y && values.m && values.d) {
                date = new Date(values.Y, values.m - 1, values.d);
            }
            else if (values.Y && values.j) {
                date = new Date(values.Y, 0, values.j);
            }
            if (values.I) {
                // only use meridian when working with 12-hour times
                values.H = (values.I|0) + (values.p|0 ? 11 : -1);
            }
            if (values.z) {
                values.H += values.z / 100 |0;
                values.M += values.z % 100;
            }
            if (values.H) date.setHours(values.H);
            if (values.M) date.setMinutes(values.M);
            if (values.S) date.setSeconds(values.S);

            return date;
        }
    });

    // private func used by both formatDate and parseDate
    // it avoids duplication
    // replace composite tags with individual ones
    function substitute(format, locale) {
        return format.gsub(/%(.)/, function(tag) {
            switch (tag[1]) {
            case 'c': return locale.get('datetime_format');
            case 'D': return '%m/%d/%y';
            case 'F': return '%Y-%m-%d';
            case 'r': return '%I:%M:%S %p';
            case 'R': return '%H:%M';
            case 'T': return '%H:%M:%S';
            case 'x': return locale.get('date_format');
            case 'X': return locale.get('time_format');
            default: return tag[0];
            }
        });
    }

    Locale.add = function(lang, messages) {
        var collection = strings[lang] || {};
        strings[lang] = Object.extend(collection, messages);
    };

    /**
     * Using this array as keys, create an object filled with specified values.
     *
     * @see PHP's array_combine()
     */
    Array.prototype.combine = function(values) {
        var o = {}, i = 0, l = Math.min(this.length, values.length);
        while (i < l) {
            o[this[i]] = values[i++];
        }
        return o;
    }

    Object.extend(Date.prototype, { /** @memberOf Date */
        // difference is positive when `date` is greater than `this`
        getDaysDifference: function(date) {
            // compare from midday in case of daylight savings
            var a = Date.UTC(this.getFullYear(), this.getMonth(), this.getDate(), 12);
            var b = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 13);
            var diff = b - a;
            // divide by milliseconds per day and round down
            return diff/864e5|0;
        },

        getDayOfYear: function() {
            return new Date(this.getFullYear(), 0, 0).getDaysDifference(this);
        },

        // returns 0..53, weeks 0 & 53 are probably shorter than 7 days
        getWeek: function(firstday) {
            firstday = firstday|0;
            var newyears = new Date(this.getFullYear(), 0, 1);
            newyears.setDate(1 + firstday - newyears.getDay());
            return newyears.getDaysDifference(this) / 7 |0;
        },

        setYearOnly: function(year) {
            var month = this.getMonth();
            this.setFullYear(year);
            if (this.getMonth() != month) {
                this.setDate(0);
            }
            return this;
        },

        setMonthOnly: function(month) {
            this.setMonth(month);
            // if overflow to next month set to previous day too
            if (this.getMonth() > month) {
                this.setDate(0);
            }
            return this;
        }
    });

})();

Locale.add('en-US', {
    date_format: '%m/%d/%y'
});

Locale.add('de', {
    days: $w('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag'),
    day_abbrs: $w('So Mo Di Mi Do Fr Sa'),
    months: $w('Januar Februar März April Mai Juni Juli August September Oktober November Dezemer'),
    month_abbrs: $w('Jan Feb Mär Apr Mai Jun Jul Aug Sep Okt Nov Dez'),
    today: 'Heute'
});

Locale.add('fr', {
    days: $w('Dimanche Lundi Mardi Mercredi Jeudi Vendredi Samedi'),
    day_abbrs: $w('Di Lu Ma Me Je Ve Sa Di'),
    months: $w('janvier février mars avril mai juin juillet août septembre octobre novembre décembre'),
    month_abbrs: $w('jan fév mar avr mai jun jul aoû sep oct nov dec'),
    today: 'aujourd\'hui'
});

Locale.add('nl', {
    days: $w('zondag maandag dinsdag woensdag donderdag vrijdag zaterdag'),
    day_abbrs: $w('Zo Ma Di Wo Do Vr Za'),
    months: $w('januari februari maart april mei juni juli augustus september oktober november december'),
    month_abbrs: $w('jan feb mrt apr mei jun jul aug sep okt nov dec'),
    today: 'vandaag'
});

Locale.add('pt', {
    days: $w('Domingo Segunda-feira Terça-feira Quarta-feira Quinta-feira Sexta-feira Sabado'),
    day_abbrs: $w('Dom Seg Ter Qua Qui Sex Sab'),
    months: $w('Janeiro Fevereiro Março Abril Maio Junho Julho Agosto Setembro Outubro Novembro Dezembro'),
    month_abbrs: $w('Jan Fev Mar Abr Mai Jun Jul Ago Set Out Nov Dez'),
    today: 'hoje'
});

Locale.add('ru', {
    days: $w('Воскресенье Понедельник Вторник Среда Четверг Пятница Суббота'),
    day_abbrs: $w('Вс Пн Вт Ср Чт Пт Сб'),
    months: $w('январь февраль март апрель май июнь июль август сентябрь октябрь ноябрь декабрь'),
    month_abbrs: $w('янв февр март апр май июнь июль авг сен окт нояб дек'),
    today: 'сегодня'
});

Locale.add('sk', {
    days: $w('Nedeľa Pondelok Utorok Streda Štvrtok Piatok Sobota'),
    day_abbrs: $w('Ne Po Ut St Št Pi So'),
    months: $w('Január Február Marec Apríl Máj Jún Júl August September Október November December'),
    month_abbrs: $w('Jan Feb Mar Apr Máj Jún Júl Aug Sep Okt Nov Dec'),
    today: 'Dnes'
});

Locale.add('cz', {
    days: $w('Neděle Pondělí Uterý Středa Čtvrtek Pátek Sobota'),
    day_abbrs: $w('Ne Po Ut St Čt Pá So'),
    months: $w('Leden Únor Březen Duben Květen Červen Červenec Srpen Září Říjen Listopad Prosinec'),
    month_abbrs: $w('Led Úno Bře Dub Kvě Čen Čec Srp Zář Říj Lis Pro'),
    today: 'Dnes'
});

Locale.add('by', {
    days: $w('нядзеля панядзелак аўторак серада чацьвер пятніца субота'),
    day_abbrs: $w('ндз пн аў ср чц пт сб'),
    months: $w('студзень люты сакавiк красавiк травень чэрвень лiпень жнiвень верасень кастрычнiк лiстапад cьнежань'),
    // god knows how it should really be :(
    month_abbrs: $w('ст лют сак кр тр чэр лiп жн вер кас лiс cьн'),
    today: 'сёньня'
});

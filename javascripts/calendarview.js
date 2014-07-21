//
// CalendarView (for Prototype)
// calendarview.org
//
// Maintained by Justin Mecham <justin@aspect.net>
//
// Portions Copyright 2002-2005 Mihai Bazon
//
// This calendar is based very loosely on the Dynarch Calendar in that it was
// used as a base, but completely gutted and more or less rewritten in place
// to use the Prototype JavaScript library.
//
// As such, CalendarView is licensed under the terms of the GNU Lesser General
// Public License (LGPL). More information on the Dynarch Calendar can be
// found at:
//
//   www.dynarch.com/projects/calendar
//


/* This fork by Yuri Leikind ( git://github.com/leikind/calendarview.git ) adds a number of features.

The differences from the original are

* Support for time in the form of two dropdowns for hours and minutes. Can be turned off/on.
* Draggable popup calendars (which introduces new dependancies: script.aculo.us effects.js and dragdrop.js)
* Close button
* Ability to unset the date by clicking on the active date
* Simple I18n support
* Removed all ambiguity in the API
* Two strategies in positioning of popup calendars: relative to the popup trigger element (original behavior),
  and is relative to the mouse pointer (can be configured)
* Popup calendars  are not created every time they pop up, on the contrary, they are created once just like
  embedded calendars, and then shown or hidden.
* Possible to have many popup calendars on page. The behavior of the original calendarview when a popup
  calendar is hidden when the user clicks elsewhere on the page is an option now.
* Refactoring and changes to the OO design like getting rid of Calendar.prototype in favor of class based
  OO provided by OO, and getting rid of Calendar.setup({}) in favor of a simple object constructor new Calendar({}).

*/

(function(){
'use strict';

// Remember the calendar last opened
var activeCalendar = null;

self.Calendar = Class.create({

  container: null,

  minYear: 1900,
  maxYear: 2100,

  currentDateElement: null,

  shouldClose: false,
  isPopup: true,

  defaults: {
	dateFormat              : null,
	disableDateCallback     : function(date, calendar){return false;},
	hideOnClickElsewhere    : false,
	hideOnClickOnDay        : false,
	language                : 'en',
	minuteStep              : 5,
	onDateChangedCallback   : function(date, calendar){},
	onHideCallback          : function(date, calendar){},
	outputFields            : [],
	popupPositioningStrategy: 'trigger',
	withTime                : null,
	x                       : 0,
	y                       : 0.6,
  },

  initialize: function(params){

    Object.extend(this, this.defaults);
    $H(this.defaults).keys().each(function(key) {
    	if (params.hasOwnProperty(key)) {
    		this[key] = params[key];
    	}
    }, this);

    this.locale = new Locale(this.language);

    this.outputFields = $A(this.outputFields).collect(function(f){
      return $(f);
    });

    if (params.embedAt){
      this.embedAt = $(params.embedAt);
      this.embedAt._calendar = this;
    }else{
      this.embedAt = null;
    }

    if (!this.dateFormat){
      if(this.withTime){
        this.dateFormat = this.locale.get('datetime_format');
      }else{
        this.dateFormat = this.locale.get('date_format');
      }
    }

    this.dateFormatForHiddenField = params.dateFormatForHiddenField || this.dateFormat;


    if (params.initialDate) {
      this.date = this.parseDate(params.initialDate) || new Date;
    }

    this.build();

    if (this.isPopup) { //Popup Calendars
      var popupTriggerElement = $(params.popupTriggerElement);
      popupTriggerElement._calendar = this;

      popupTriggerElement.observe('click', function(event){
        this.showAtElement(event, popupTriggerElement);
      }.bind(this) );

    } else{ // In-Page Calendar
      this.show();
    }

    if (params.updateOuterFieldsOnInit){
      this.updateOuterFieldWithoutCallback(); // Just for the sake of localization and DatePicker
    }
  },

  build: function(){
    if (this.embedAt) {
      var parentForCalendarTable = this.embedAt;
      this.isPopup = false;
    } else {
      var parentForCalendarTable = document.getElementsByTagName('body')[0];
      this.isPopup = true;
    }


    var table = new Element('table');

    var thead = new Element('thead');
    table.appendChild(thead);

    var firstRow  = new Element('tr');

    if (this.isPopup){
      var cell = new Element('td');
      cell.addClassName('draggableHandler');
      firstRow.appendChild(cell);

      cell = new Element('td', { colSpan: 5 });
      cell.addClassName('title' );
      cell.addClassName('draggableHandler');
      firstRow.appendChild(cell);

      cell = new Element('td');
      cell.addClassName('closeButton');
      firstRow.appendChild(cell);
      cell.update('x');

      cell.observe('mousedown', function(){
        this.hide();
      }.bind(this));


    }else{
      var cell = new Element('td', { colSpan: 7 } );
      firstRow.appendChild(cell);
    }

    cell.addClassName('title');

    thead.appendChild(firstRow);

    var row = new Element('tr')
    this._drawButtonCell(row, '&#x00ab;', 1, Calendar.NAV_PREVIOUS_YEAR);
    this._drawButtonCell(row, '&#x2039;', 1, Calendar.NAV_PREVIOUS_MONTH);
    this._drawButtonCell(row, this.locale.get('today'), 3, Calendar.NAV_TODAY);
    this._drawButtonCell(row, '&#x203a;', 1, Calendar.NAV_NEXT_MONTH);
    this._drawButtonCell(row, '&#x00bb;', 1, Calendar.NAV_NEXT_YEAR);
    thead.appendChild(row)

    // Day Names
    row = new Element('tr');
    for (var i = 0; i < 7; ++i) {
      var day = (i+Calendar.firstDayOfWeek)%7;
      cell = new Element('th').update(this.locale.get('day_abbrs', day));
      if (this.isWeekend(day)) {
        cell.addClassName('weekend');
      }
      row.appendChild(cell);
    }
    thead.appendChild(row);

    // Calendar Days
    var tbody = table.appendChild(new Element('tbody'));
    for (i = 6; i > 0; --i) {
      row = tbody.appendChild(new Element('tr'));
      row.addClassName('days');
      for (var j = 7; j > 0; --j) {
        cell = row.appendChild(new Element('td'));
        cell.calendar = this;
      }
    }

    // Time Placeholder
    if (this.withTime){
      var tfoot = table.appendChild(new Element('tfoot'));
      row = tfoot.appendChild(new Element('tr'));
      cell = row.appendChild(new Element('td', { colSpan: 7 }));
      cell.addClassName('time');
      var hourSelect = cell.appendChild(new Element('select', { name : 'hourSelect'}));
      for (var i = 0; i < 24; i++) {
        hourSelect.appendChild(new Element('option', {value : i}).update(i));
      }
      this.hourSelect = hourSelect;

      cell.appendChild(new Element('span')).update(' : ');

      var minuteSelect = cell.appendChild(new Element('select', { name : 'minuteSelect'}));
      for (var i = 0; i < 60; i += this.minuteStep) {
        minuteSelect.appendChild(new Element('option', {value : i}).update(i));
      }
      this.minuteSelect = minuteSelect;

      hourSelect.observe('change', function(event){
        if (! this.date) return;
        var elem = event.element();
        var selectedIndex = elem.selectedIndex;
        if ((typeof selectedIndex != 'undefined') && selectedIndex != null){
          this.date.setHours(elem.options[selectedIndex].value);
          this.updateOuterField();
        }
      }.bind(this));

      minuteSelect.observe('change', function(event){
        if (! this.date) return;
        var elem = event.element();
        var selectedIndex = elem.selectedIndex;
        if ((typeof selectedIndex != 'undefined') && selectedIndex != null){
          this.date.setMinutes(elem.options[selectedIndex].value);
          this.updateOuterField();
        }
      }.bind(this))
    }

    // Calendar Container (div)
    this.container = new Element('div');
    this.container.addClassName('calendar');
    if (this.isPopup) {
      this.container.setStyle({ position: 'absolute', display: 'none' });
      this.container.addClassName('popup');
    }
    this.container.appendChild(table);

    this.update(this.date);

    Event.observe(this.container, 'mousedown', Calendar.handleMouseDownEvent);

    parentForCalendarTable.appendChild(this.container);

    if (this.isPopup){
      new Draggable(table, {handle : firstRow });
    }
  },

  updateOuterFieldReal: function(element){
    if (element.tagName == 'DIV' || element.tagName == 'SPAN') {
      var formatted = this.date ? this.locale.formatDate(this.date, this.dateFormat) : '';
      element.update(formatted);
    } else if (element.tagName == 'INPUT') {
      var formatted = this.date ? this.locale.formatDate(this.date, this.dateFormatForHiddenField) : '';
      element.value = formatted;
    }
  },

  updateOuterFieldWithoutCallback: function(){
    this.outputFields.each(function(field){
      this.updateOuterFieldReal(field);
    }.bind(this));
  },

  updateOuterField: function(){
    this.updateOuterFieldWithoutCallback();
    this.onDateChangedCallback(this.date, this);
  },

  viewOutputFields: function(){
    return this.outputFields.findAll(function(element){
      if (element.tagName == 'DIV' || element.tagName == 'SPAN'){
        return true;
      }else{
        return false;
      }
    });
  },


  //----------------------------------------------------------------------------
  // Update  Calendar
  //----------------------------------------------------------------------------

  update: function(date) {

    var today      = new Date();
    var thisYear   = today.getFullYear();
    var thisMonth  = today.getMonth();
    var thisDay    = today.getDate();
    var month      = date.getMonth();
    var dayOfMonth = date.getDate();
    var hour       = date.getHours();
    var minute     = date.getMinutes();

    // Ensure date is within the defined range
    if (date.getFullYear() < this.minYear)
      date.setYearOnly(this.minYear);
    else if (date.getFullYear() > this.maxYear)
      date.setYearOnly(this.maxYear);

    if (this.isBackedUp()){
      this.dateBackedUp = new Date(date);
    }else{
      this.date = new Date(date);
    }

    // Calculate the first day to display (including the previous month)
    date.setDate(1);
    date.setDate(-(date.getDay()) - 6 + Calendar.firstDayOfWeek);

    // Fill in the days of the month
    Element.getElementsBySelector(this.container, 'tbody tr').each(
      function(row, i) {
        var rowHasDays = false;
        row.immediateDescendants().each(
          function(cell, j) {
            var day            = date.getDate();
            var dayOfWeek      = date.getDay();
            var isCurrentMonth = (date.getMonth() == month);

            // Reset classes on the cell
            cell.className = '';
            cell.date = new Date(date);
            cell.update(day);

            // Account for days of the month other than the current month
            if (!isCurrentMonth)
              cell.addClassName('otherDay');
            else
              rowHasDays = true;

            // Ensure the current day is selected
            if ((! this.isBackedUp()) && isCurrentMonth && day == dayOfMonth) {
              cell.addClassName('selected');
              this.currentDateElement = cell;
            }

            // Today
            if (date.getFullYear() == thisYear && date.getMonth() == thisMonth && day == thisDay)
              cell.addClassName('today');

            // Weekend
            if (this.isWeekend(dayOfWeek))
              cell.addClassName('weekend');

            if (isCurrentMonth && this.disableDateCallback(date, this)) {
              cell.addClassName('disabled');
              cell.navAction = 'disabled';
            }

            // Set the date to tommorrow
            date.setDate(day + 1);
          }.bind(this)
        )
        // Hide the extra row if it contains only days from another month
        !rowHasDays ? row.hide() : row.show();
      }.bind(this)
    )

    Element.getElementsBySelector(this.container, 'tfoot tr td select').each(
      function(sel){
        if(sel.name == 'hourSelect'){
          sel.selectedIndex = hour;
        }else if(sel.name == 'minuteSelect'){
          if (this.minuteStep == 1){
            sel.selectedIndex = minute;
          }else{
            sel.selectedIndex = this.findClosestMinute(minute);
          }
        }
      }.bind(this)
    )

    this.container.getElementsBySelector('td.title')[0].update(
      this.locale.get('months', month) + ' ' + this.dateOrDateBackedUp().getFullYear()
    )

  },


  findClosestMinute:  function(val){
    if (val == 0){
      return 0;
    }
    var lowest = ((val / this.minuteStep).floor() * this.minuteStep);
    var distance = val % this.minuteStep;
    var minuteValueToShow;

    if (distance <= (this.minuteStep / 2)){
      minuteValueToShow = lowest;
    }else{
      minuteValueToShow = lowest + this.minuteStep;
    }

    if (minuteValueToShow == 0){
      return minuteValueToShow;
    }else if(minuteValueToShow >= 60){
      return (minuteValueToShow / this.minuteStep).floor() - 1;
    }else{
      return minuteValueToShow / this.minuteStep;
    }
  },

  _drawButtonCell: function(parentForCell, text, colSpan, navAction) {
    var cell          = new Element('td');
    if (colSpan > 1) cell.colSpan = colSpan;
    cell.className    = 'cvbutton';
    cell.calendar     = this;
    cell.navAction    = navAction;
    cell.innerHTML    = text;
    cell.unselectable = 'on'; // IE
    parentForCell.appendChild(cell);
    return cell;
  },


  //------------------------------------------------------------------------------
  // Calendar Display Functions
  //------------------------------------------------------------------------------

  show: function(){
    this.container.show();
    if (this.isPopup) {
      if (this.hideOnClickElsewhere){
        activeCalendar = this;
        document.observe('mousedown', Calendar._checkCalendar);
      }
    }
  },

  showAt: function (x, y) {
    this.container.setStyle({ left: x + 'px', top: y + 'px' });
    this.show();
  },


  showAtElement: function(event, element) {
    this.container.show();
    var x, y;
    if (this.popupPositioningStrategy == 'pointer'){ // follow the mouse pointer
      var pos = Event.pointer(event);
      var containerWidth = this.container.getWidth();
      x = containerWidth * this.x + pos.x;
      y = containerWidth * this.y + pos.y;
    }else{ // 'container' - container of the trigger elements
      var pos = Position.cumulativeOffset(element);
      x = pos[0];
      y = this.container.offsetHeight * 0.75 + pos[1];
    }
    this.showAt(x, y);
  },

  hide: function() {
    if (this.isPopup){
      Event.stopObserving(document, 'mousedown', Calendar._checkCalendar);
    }
    this.container.hide();
    this.onHideCallback(this.date, this);
  },


  // Tries to identify the date represented in a string.  If successful it also
  // calls this.updateIfDateDifferent which moves the calendar to the given date.
  parseDate: function(str, format){
    if (!format){
      format = this.dateFormat;
    }
    str = str.trim();
    format = format.trim();
    var res = this.locale.parseDate(str, format);
    return res;
  },


  dateOrDateBackedUp: function(){
    return this.date || this.dateBackedUp;
  },

  updateIfDateDifferent: function(date) {
    if (Math.abs(date - this.dateOrDateBackedUp()) >= 60){
      this.update(date);
    }
  },

  backupDateAndCurrentElement: function(){
    if (this.minuteSelect){
      this.minuteSelect.disable();
    }
    if (this.hourSelect){
      this.hourSelect.disable();
    }

    this.currentDateElementBackedUp = this.currentDateElement;
    this.currentDateElement = null;

    this.dateBackedUp = this.date;
    this.date = null;
  },

  restoreDateAndCurrentElement: function(){
    if (this.minuteSelect){
      this.minuteSelect.enable();
    }
    if (this.hourSelect){
      this.hourSelect.enable();
    }

    this.currentDateElement = this.currentDateElementBackedUp;
    this.currentDateElementBackedUp = null;

    this.date = this.dateBackedUp;
    this.dateBackedUp = null;
  },

  isBackedUp: function(){
    return ((this.date == null) && this.dateBackedUp);
  },

  dumpDates: function(){
    console.log('date: ' + this.date);
    console.log('dateBackedUp: ' + this.dateBackedUp);
  },

  isWeekend: function(day){
    return Calendar.weekendDays.indexOf(day) != -1;
  },

  setRange: function(minYear, maxYear) {
    this.minYear = minYear;
    this.maxYear = maxYear;
  }
});

Calendar.VERSION = '1.4';

Calendar.firstDayOfWeek = 0;
Calendar.weekendDays = [0,6];

Calendar.NAV_PREVIOUS_YEAR  = -2;
Calendar.NAV_PREVIOUS_MONTH = -1;
Calendar.NAV_TODAY          =  0;
Calendar.NAV_NEXT_MONTH     =  1;
Calendar.NAV_NEXT_YEAR      =  2;

//------------------------------------------------------------------------------
// Static Methods
//------------------------------------------------------------------------------

// This gets called when the user presses a mouse button anywhere in the
// document, if the calendar is shown. If the click was outside the open
// calendar this function closes it.
Calendar._checkCalendar = function(event) {
  if (!activeCalendar){
    return false;
  }
  if (Element.descendantOf(Event.element(event), activeCalendar.container)){
    return;
  }
  Calendar.closeHandler(activeCalendar);
  return Event.stop(event);
};

//------------------------------------------------------------------------------
// Event Handlers
//------------------------------------------------------------------------------

Calendar.handleMouseDownEvent = function(event){
  if (event.element().type == 'select-one'){ // ignore select elements - not escaping this in Safari leaves select boxes non-functional
    return true;
  }
  Event.observe(document, 'mouseup', Calendar.handleMouseUpEvent);
  Event.stop(event)
};

Calendar.handleMouseUpEvent = function(event){
  var el        = Event.element(event);
  var calendar  = el.calendar;
  var isNewDate = false;


  // If the element that was clicked on does not have an associated Calendar
  // object, return as we have nothing to do.
  if (!calendar) return false;

  // Clicked on a day
  if (typeof el.navAction == 'undefined') {

    var dateWasDefined = true;
    if (calendar.date == null){
      dateWasDefined = false;
      calendar.restoreDateAndCurrentElement();
    }


    if (calendar.currentDateElement) {
      Element.removeClassName(calendar.currentDateElement, 'selected');

      if (dateWasDefined && el == calendar.currentDateElement){
        calendar.backupDateAndCurrentElement();

        calendar.updateOuterField();

        Event.stopObserving(document, 'mouseup', Calendar.handleMouseUpEvent);
        return Event.stop(event);
      }

      Element.addClassName(el, 'selected');

      calendar.shouldClose = (calendar.currentDateElement == el);

      if (!calendar.shouldClose) {

        calendar.currentDateElement = el;
      }
    }
    calendar.date.setDatesOnly(el.date);
    isNewDate = true;

    calendar.shouldClose = !el.hasClassName('otherDay');


    var isOtherMonth     = !calendar.shouldClose;
    if (isOtherMonth) {
      calendar.update(calendar.date);
    }

    if (! calendar.hideOnClickOnDay){ // override closing if calendar.hideOnClickOnDay is false
      calendar.shouldClose = false;
    }

  } else { // Clicked on an action button

    var date = new Date(calendar.dateOrDateBackedUp());

    if (el.navAction == Calendar.NAV_TODAY){
      date.setDatesOnly(new Date());
    }

    var year = date.getFullYear();
    var mon = date.getMonth();

    switch (el.navAction) {

      // Previous Year
      case Calendar.NAV_PREVIOUS_YEAR:
        if (year > calendar.minYear)
          date.setYearOnly(year - 1);
        break;

      // Previous Month
      case Calendar.NAV_PREVIOUS_MONTH:
        date.setMonthOnly(mon - 1);
        break;

      // Today
      case Calendar.NAV_TODAY:
        break;

      // Next Month
      case Calendar.NAV_NEXT_MONTH:
        date.setMonthOnly(mon + 1);
        break;

      // Next Year
      case Calendar.NAV_NEXT_YEAR:
        if (year < calendar.maxYear){
          date.setYearOnly(year + 1);
        }
        break;
    }

    if (Math.abs(date - calendar.dateOrDateBackedUp()) >= 60) {
      calendar.updateIfDateDifferent(date);
      isNewDate = true;
    } // else if (el.navAction == 0) {
    //   isNewDate = (calendar.shouldClose = true);
    // } // Hm, what did I mean with this code?
  }

  if (isNewDate && event) {
    Calendar.selectHandler(calendar);
  }

  if (calendar.shouldClose && event) {
    Calendar.closeHandler(calendar);
  }

  Event.stopObserving(document, 'mouseup', Calendar.handleMouseUpEvent);
  return Event.stop(event);
};

Calendar.selectHandler = function(calendar){

  // Update dateField value
  calendar.updateOuterField();


  // Call the close handler, if necessary
  if (calendar.shouldClose) {
    Calendar.closeHandler(calendar);
  }
};

Calendar.closeHandler = function(calendar){
  calendar.hide();
  calendar.shouldClose = false;
};


})();

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
        },
        'en-US': {
            date_format: '%m/%d/%y'
        },
        de: {
            days: $w('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag'),
            day_abbrs: $w('So Mo Di Mi Do Fr Sa'),
            months: $w('Januar Februar März April Mai Juni Juli August September Oktober November Dezemer'),
            month_abbrs: $w('Jan Feb Mär Apr Mai Jun Jul Aug Sep Okt Nov Dez'),
            today: 'Heute'
        },
        fr: {
            days: $w('Dimanche Lundi Mardi Mercredi Jeudi Vendredi Samedi'),
            day_abbrs: $w('Di Lu Ma Me Je Ve Sa Di'),
            months: $w('janvier février mars avril mai juin juillet août septembre octobre novembre décembre'),
            month_abbrs: $w('jan fév mar avr mai jun jul aoû sep oct nov dec'),
            today: 'aujourd\'hui'
        },
        nl: {
            days: $w('zondag maandag dinsdag woensdag donderdag vrijdag zaterdag'),
            day_abbrs: $w('Zo Ma Di Wo Do Vr Za'),
            months: $w('januari februari maart april mei juni juli augustus september oktober november december'),
            month_abbrs: $w('jan feb mrt apr mei jun jul aug sep okt nov dec'),
            today: 'vandaag'
        }
    };

    /**
     * Ways to instantiate:
     *   english  = new Locale
     *   french   = new Locale('fr')
     *   american = new Locale('en-US')
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
                case 'C':
                case 'd':
                case 'H':
                case 'I':
                case 'k':
                case 'l':
                case 'm':
                case 'M':
                case 'p':
                case 'S':
                case 'U':
                case 'W':
                case 'y': return '(\\d\\d?)';
                case 'e': return '([1-3\\s]\\d)';
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
                date = new Date(values.Y, values.m, values.d);
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
        },

        setMonthOnly: function(month) {
            this.setMonth(month);
            // if overflow to next month set to previous day too
            if (this.getMonth() != month) {
                this.setDate(0);
            }
        },

        setDatesOnly: function(date) {
            this.setDate(date.getDate());
            this.setMonth(date.getMonth());
            this.setFullYear(date.getFullYear());
        }
    });

})();

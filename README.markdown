About
-----------

This is a fork of CalendarView by Justin Mecham who had guts to create a calendar 
written in modern and readable javascript using Prototype.

* CalendarView  on GitHub: http://wiki.github.com/jsmecham/calendarview/tree
* CalendarView site: calendarview.org.

Look at the original README in file README.original.markdown

The differences from the original are

* Support for time in the form of two dropdowns for hours and minutes. Can be turned off/on.
* Draggable popup calendars (which introduces new dependancies: script.aculo.us effects.js and dragdrop.js)
* Close button
* Popup calendars  are not created every time they pop up, on the contrary, they are created once just like
  embedded calendars, and then shown or hidden.
* Possible to have many popup calendars on page. The behavior of the original calendarview when a popup 
  calendar is hidden when the user clicks elsewhere on the page is an option now.
* Very simple localization. Currently has support for Dutch and French in addition to English. The message bundles
  are so small that they are embedded right in the JS file, if you care about these bytes, feel free
  to delete what you don't need. Look for Calendar.messagebundle.
* Refactoring and changes to the OO design like getting rid of Calendar.prototype in favor of class based 
  OO provided by OO, and getting rid of Calendar.setup({}) in favor of a simple object constructor new Calendar({}).


Usage
-----------

To create a calendar create an instance of class Calendar:


      new Calendar({
         dateField: 'embeddedDateField',
         parentElement: 'embeddedCalendar',
         withTime: true
      });
  
Acceptable options are:

* parentElement - DOM id of the element where the calendar will appear. This calendar will always be visible on page. If this option
  is missing, the calendar is a popup caledar.
* triggerElement - DOM id of the element clicking on which will show the popup calendar.
* dateField - DOM id of the element with date and optionally time. This element can be both an INPUT element or just a DIV or a SPAN. 
  When initializing the calendar tries to parse the contents of the element (or value of the INPUT field) and if it's successful, 
  the calendar will show the date/time. The element is updated when the user changes date/time of the calendar.
* withTime - can be true or false, when true, the calendar shows two dropdown boxes for hours and minutes.
* dateFormat - format of the date or date and time. By default for a calendar without time `%Y-%m-%d` is used, for a calendar with time
  `%Y-%m-%d %H:%M` is used. If you provide this option make sure whether it has or doesn't have the time format according to option withTime.
* language - An IETF language code like "en" or "en-US". For more language choices see I18n.js
* hideOnClickOnDay - can be true or false. If true, the popup calendar will hide once the user clicks of a day. The default is false.
* hideOnClickElsewhere - can be true or false. If true, the popup calendar will hide once the user clicks elsewhere in the page. 
  The default is false.
* minuteStep - step between values in the minute dropdown, for example, if the step is 5, the dropdown contain values 0, 5, 10, and so on.
  The default is 5.
* onHideCallback - a callback function which get called when a popup calendar is hidden. The first parameter is the the object, the second is
  the calendar instance.
* onDateChangedCallback - a callback function which get called when the date or time is changed. The first parameter is the the object, 
  the second is the calendar instance.
  


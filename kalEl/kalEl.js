(function () {
    /***
     *
     * @type {KalEl}
     * @constructor
     */
    window.KalEl = KalEl = function (element, params, target) {
        //Default parameter hash
        var defaultParams = {
            //Define first week day
            weekStartsOnSun: false,

            //Maintains the selected date
            value: null,

            //Maintains the currently displayed date
            displayValue: Date.parse(element.value),

            //Defines if to use seconds or not
            seconds: false,

            dates: false,
            times: true,

            /**
             * Operation mode: ['calendar', 'picker']
             */
            mode: 'calendar',

            /**
             * The visibility behavior used in picker mode: ['auto', 'manual', 'visible'].
             * - auto: KalEl is hidden and opens on element focus, and when the focus is lost
             * - visible: KalEl is always shown
             * - manual: Intended for external control with toggle(), show() and hide(). Use hideOnLostFocus to use
             *   built in focus loss detection
             */
            visibility: 'auto',

            /**
             * Intended to use built in focus loss detection together with manual visibility. If true, KalEl gets hidden in
             * manual visibility mode.
             */
            hideOnLostFocus: false,

            wrap: null,

            //String repositories
            labels: ['Hour', 'Select Minute', 'Select Second'],
            labelsShort: ['H', 'M', 'S'],
            dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            dayNamesShort: ["Sun", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
            monthNames: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],
            monthNamesShort: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],

            //Additional classname to add to the instance
            className: null,

            //Array or function that returns an array of year numbers
            years: function () {
                var now = new Date(),
                    year = now.getFullYear(),
                    arr = [];
                for (var idx = year - 10, max = year + 10; idx <= max; idx++) {
                    arr.push(idx);
                }
                return arr;
            },

            //Called when the date is going to be changed. Return false to prevent the selection of the date.
            onDateChanging: function (kalEl, oldDate, newDate) {
                return true;
            },

            //Called when the date has changed
            onDateChanged: function (kalEl, date) {
                if (this.tagName.toUpperCase() === 'INPUT' && this.type.toUpperCase() === 'TEXT') {
                    this.value = kalEl.params.formatDateTime(date);
                }
            },

            parseDateString: function (dateString) {
                return new Date(Date.parse(dateString));
            },

            formatDate: function (date) {
                return date ? date.toLocaleDateString() : '';
            },

            formatTime: function (date) {
                return date ? date.toLocaleTimeString() : '';
            },

            formatDateTime: function (date) {
                return date ? date.toLocaleString() : '';
            },

            /**
             * Array of event objects or function that returns an array of event objects
             * Event object:
             * {
             *  id: 0
             *  start: new Date(),
             *  end: new Date(),
             *  title: 'Event title'
             * }
             */
            events: function(kalEl, start, end, addEvent) {
                //return array or call addEvent async
            },

            /**
             * Tru or false to enable or disable the default browser tooltip.
             * Or provide a function to implement custom tooltips.
             * @example
             * function(kalEl, date, events) {
             *      //show custom tooltip
             * }
             * @param kalEl
             * @param date
             * @param events
             */
            tooltip: true
        };

        defaultParams.value = element.value ? defaultParams.parseDateString(element.value) : null

        params = this.params = extend(defaultParams, params);

        var isPicker = params.mode === 'picker';
        var isCalendar = params.mode === 'calendar';

        //Calendar supports no visibility
        if(isCalendar) {
            params.visibility = 'visible';
        }

        //Set up some element references
        var self = this, // walks like a duck ...
            kal = element, //dom element of editor
            kalElWrap,//wrapping dom element, set from within renderSkeleton
            kalEl, //dom element of cal itself, set from within renderSkeleton
            cbTarget = target || kal; //The callback target

        var initialized = false;

        //Render the base skeleton
        renderSkeleton();

        //Set up references to various, non generic, dom elements that will not change anymore
        var monthSelectEl = kalEl.getElementsByClassName('cal-body-months')[0], //dom element of month selection
            yearSelectEl = kalEl.getElementsByClassName('cal-body-years')[0], //dom element of year selection

            second = isPicker && params.seconds ? kalEl.getElementsByClassName('cal-body-time-second')[0] : null, //dom element of second selector body
            secondItems = second ? second.getElementsByTagName('button') : null, //dom element collection of second buttons

            minute = isPicker ? kalEl.getElementsByClassName('cal-body-time-minute')[0] : null, //dom element of minute selector body
            minuteItems = minute ? minute.getElementsByTagName('button') : null, //dom element collection of minute selector buttons

            hour = isPicker ? kalEl.getElementsByClassName('cal-body-time-hour')[0] : null, //dom element of hour selector body
            hourItems = hour ? hour.getElementsByTagName('button') : null, //dom element collection of hour selector buttons

            monthHeaderEl = kalEl.getElementsByClassName('cal-head-left')[0], //dom element of month header
            monthItems = monthSelectEl.getElementsByTagName('button'), //dom element collection of month selector buttons

            yearHeaderEl = kalEl.getElementsByClassName('cal-head-right')[0], //dom element of year selector header
            yearItems = yearSelectEl.getElementsByTagName('button'), //dom element collection of year selector buttons

            timeDisplayEl = kalEl.getElementsByClassName('cal-body-time')[0], //overlay over time selectors

            pagerPrevEl = kalEl.getElementsByClassName('cal-head-pager-prev')[0],
            pagerNowEl = kalEl.getElementsByClassName('cal-head-pager-now')[0],
            pagerNextEl = kalEl.getElementsByClassName('cal-head-pager-next')[0];

        var hourHeadEl = isPicker ? hour.getElementsByClassName('cal-list-head')[0] : null,
            minuteHeadEl = isPicker ? minute.getElementsByClassName('cal-list-head')[0] : null,
            secondHeadEl = isPicker && params.seconds ? second.getElementsByClassName('cal-list-head')[0] : null;

        var cancelTimeSelElements = kalEl.getElementsByClassName('cal-list-head-cancel');

        //Initialize all events
        initEvents();

        //Set initial date selection
        if (params.value && params.value.getDate) {
            select(params.value);
        }
        else if (params.displayValue && params.displayValue.getDate) {
            display(params.displayValue);
        }
        else {
            display(new Date());
        }

        if(isPicker){
            setTimeListHeader('none');
        }

        initialized = true;

        /**
         * Sets or manipulates the selected value and triggers a display update. It will also trigger the
         * onDateChanging and onDateChanged callbacks.
         * @param {Date|Number} [yearOrDate]
         * @param {Number} [month]
         * @param {Number} [date]
         * @param {Number} [hour]
         * @param {Number} [minute]
         * @param {Number} [second]
         */
        function select(yearOrDate, month, date, hour, minute, second) {
            var newDate, setNullValue = true;

            for (var idx = 0, max = arguments.length; idx < max; idx++) {
                if (!!arguments[idx]) {
                    setNullValue = false;
                    break;
                }
            }

            //Based on yearOrDate we create the base date
            if (yearOrDate) {
                //yearOrDate is a date
                if (yearOrDate.getHours) {
                    newDate = yearOrDate;
                }
                //yearOrDate must be a number
                else {
                    //Use selected value if possible and use the provided year
                    if (params.value) {
                        newDate = new Date(params.value.getTime());
                        newDate.setFullYear(yearOrDate);
                    } else {
                        newDate = new Date(yearOrDate, 0, 1, 0, 0, 0);
                    }

                }
            }
            else if (setNullValue) {
                newDate = null;
            }
            //No yearOrDate has been provided, we user the currently displayed or now
            else {
                if (params.displayValue) {
                    newDate = new Date(params.displayValue.getTime());
                } else {
                    newDate = new Date();
                    newDate.setHours(0);
                    newDate.setMinutes(0);
                    newDate.setSeconds(0);
                }
            }

            if (newDate) {
                //If we've got a new month
                if (month) newDate.setMonth(month);

                //If we've got a new date
                if (date) newDate.setDate(date);

                //If we've got a new hour
                if (hour) newDate.setHours(hour);

                //If we've got a new minute
                if (minute) newDate.setMinutes(minute);

                //If we've got a new second
                if (second) newDate.setSeconds(second);
            }

            if (initialized && (params.value === newDate || (params.value && newDate && params.value.getTime() === newDate.getTime())))
                return;

            if (params.onDateChanging) {
                if (!params.onDateChanging.call(cbTarget, self, params.value, newDate)) return;
            }

            params.value = newDate;

            //renderMonth(newDate);
            //renderTime(newDate);
            display(newDate);

            if (params.onDateChanged) {
                params.onDateChanged.call(cbTarget, self, params.value);
            }
            //todo: call callback
        }

        /**
         * Sets or manipulates the current display value and triggers a re-rendering of the current month or year.
         * Used i.e. to display another month or year than the selected.
         * @param {Date|Number} [yearOrDate]
         * @param {Number} [month]
         * @param {Number} [date]
         * @param {Number} [hour]
         * @param {Number} [minute]
         * @param {Number} [second]
         */
        function display(yearOrDate, month, date, hour, minute, second) {
            var newDate, setNullValue = true;

            for (var idx = 0, max = arguments.length; idx < max; idx++) {
                if (!!arguments[idx]) {
                    setNullValue = false;
                    break;
                }
            }

            function prepare() {
                var _base = params.displayValue && params.displayValue.getTime ? new Date(params.displayValue.getTime()) : new Date();
                var action, anythingProcessed;

                if (resolveAction(yearOrDate)) {
                    if (action === 'add') {
                        _base.setFullYear(_base.getFullYear() + 1);
                        anythingProcessed = true;
                    }

                    if (action === 'rem') {
                        _base.setFullYear(_base.getFullYear() - 1);
                        anythingProcessed = true;
                    }
                }

                if (resolveAction(month)) {
                    if (action === 'add') {
                        _base.setMonth(_base.getMonth() + 1);
                        anythingProcessed = true;
                    }
                    if (action === 'rem') {
                        _base.setMonth(_base.getMonth() - 1);
                        anythingProcessed = true;
                    }
                }

                if (anythingProcessed) {
                    yearOrDate = _base;
                    month = null;
                    date = null;
                    hour = null;
                    minute = null;
                    second = null;
                }

                function resolveAction(expression) {
                    if (typeof expression !== 'string') {
                        action = null;
                        return false;
                    }

                    switch (expression[0]) {
                        case '+':
                            action = 'add';
                            break;
                        case '-':
                            action = 'rem';
                            break;
                        default:
                            action = null;
                    }

                    return action ? true : false;
                }
            }

            prepare();

            //Based on yearOrDate we create the base date
            if (yearOrDate) {
                //yearOrDate is a date
                if (yearOrDate.getHours) {
                    newDate = new Date(yearOrDate.getTime());
                }
                //yearOrDate must be a number
                else {
                    //Use selected value if possible and use the provided year
                    if (params.displayValue) {
                        newDate = new Date(params.displayValue.getTime());
                        newDate.setFullYear(yearOrDate);
                    } else {
                        newDate = new Date(yearOrDate, 0, 1, 0, 0, 0);
                    }

                }
            }
            //
            else if (setNullValue) {
                newDate = null;
            }
            //No yearOrDate has been provided, we user the currently selected or now
            else {
                if (params.displayValue) {
                    newDate = new Date(params.displayValue.getTime());
                } else {
                    newDate = new Date();
                    newDate.setHours(0);
                    newDate.setMinutes(0);
                    newDate.setSeconds(0);
                }
            }


            if (newDate) {
                //If we've got a new month
                if (month) newDate.setMonth(month);

                //If we've got a new date
                if (date) newDate.setDate(date);

                //If we've got a new hour
                if (hour) newDate.setHours(hour);

                //If we've got a new minute
                if (minute) newDate.setMinutes(minute);

                //If we've got a new second
                if (params.seconds && second) newDate.setSeconds(second);

                //If we do not use seconds
                if (!params.seconds) newDate.setSeconds(0);
            }

            params.displayValue = newDate;

            newDate = newDate || new Date();

            var dateEl = kalEl.getElementsByClassName('cal-head-left')[0],
                yearEl = kalEl.getElementsByClassName('cal-head-right')[0];

            if(dateEl) dateEl.innerText = params.monthNames[newDate.getMonth()];
            if(yearEl) yearEl.innerText = newDate.getFullYear();

            var item;
            for (var idx = 0, max = yearItems.length; idx < max; idx++) {
                item = yearItems[idx];
                if (item.getAttribute('data-year').toString() === newDate.getFullYear().toString()) {
                    //item.focus();
                    yearItems[yearItems.length - 2].focus()
                }
            }

            renderMonth(newDate);
            renderTime(newDate);
        }

        function displayPrevMonth() {
            resetView();
            display(null, '-1');
        }

        function displayNextMonth() {
            resetView();
            display(null, '+1');
        }

        /**
         * Selects the current date and time. Just a shortcut.
         */
        function selectNow() {
            resetView();
            select(new Date());
        }

        /**
         * Switches the displayed date to the current date. Just a shortcut.
         */
        function displayNow() {
            resetView();
            var d = new Date();
            //Switch display to current day but keep time
            if (params.value) {
                d.setHours(params.value.getHours());
                d.setMinutes(params.value.getMinutes());
                d.setSeconds(params.value.getSeconds());
            }
            display(d);
        }

        /**
         * Renders a given month
         * @param {Date|Number} yearOrDate
         * @param {Number} month
         */
        function renderMonth(yearOrDate, month, events) {
            if(!params.dates) return;


            var year = yearOrDate,
                day;
            if (yearOrDate && yearOrDate.getDate) {
                year = yearOrDate.getFullYear();
                month = yearOrDate.getMonth();
            }

            var _base = params.displayValue || params.value;
            var base = _base || new Date();
            if (!year) year = base.getFullYear();
            if (!month) month = base.getMonth();
            if (!day) _base ? _base.getDate() : 1;

            var data = calculateMonthDisplayData(year, month);

            var str = '', css, current, selected = self.params.value, now = new Date();

            var eventLoadStart = data.dates[0],
                eventLoadEnd = getEndOfDay(data.dates[data.dates.length-1]);

            //If there were events provided within the call, use them.
            var events = events || loadEvents(eventLoadStart, eventLoadEnd),
                eventsForDate, eventIdsForDate = [], eventIdsForDateStr = '', titleStr = '';

            for (var idx = 0, max = data.dates.length; idx < max; idx++) {
                current = data.dates[idx];
                eventsForDate = filterEvents(events, current, getEndOfDay(current));
                eventIdsForDate = [];
                eventIdsForDateStr = '';
                titleStr = '';

                //Create event specific strings
                if(eventsForDate.length > 0) {
                    titleStr = params.formatDate(current);
                    for(var eIdx = 0, eMax = eventsForDate.length; eIdx < eMax; eIdx++) {
                        if(eventsForDate[eIdx].id){
                            eventIdsForDate.push(eventsForDate[eIdx].id);
                        }
                        if(eventsForDate[eIdx].title){
                            titleStr += '\r\n' + eventsForDate[eIdx].title + ' @' + params.formatDateTime(eventsForDate[eIdx].start);
                        }
                    }
                    eventIdsForDateStr = ' data-event-ids="' + eventIdsForDate.join() + '"';
                }

                if(typeof params.tooltip === 'function' || params.tooltip === false) {
                    titleStr = '';
                } else if(titleStr.length > 0) {
                    titleStr = ' title="' + titleStr + '"';
                }

                //Css Classes
                if (idx < data.daysOffset - 1) {
                    css = 'pre';
                }
                else if (idx >= data.daysInMonth + data.daysOffset - 1) {
                    css = 'post';
                }
                else {
                    css = '';
                }

                if (selected && current.toDateString() === selected.toDateString()) css += ' active';
                if (current.toDateString() === now.toDateString()) css += ' today';

                //Create string
                str += '' +
                    '<button' + titleStr + eventIdsForDateStr + ' data-year="' + current.getFullYear() + '" data-month="' + current.getMonth() + '" data-date="' + current.getDate() + '" class="' + css + '" tabIndex="-1">' +
                    (eventsForDate.length > 0 ? '<i>' + eventsForDate.length + '</i>' : '') +
                    current.getDate() +
                    '</button>';
            }

            //Remove existing events
            var date = kalEl.getElementsByClassName('cal-body-date-day')[0],
                dateItems = date.getElementsByTagName('button');
            removeEventListeners(dateItems, 'click', onDateItemsClick);
            removeEventListeners(dateItems, 'mouseover', onDateItemsHover);

            //Set displayed range in params data
            params.displayStart = new Date(eventLoadStart.getTime());
            params.displayEnd = new Date(eventLoadEnd.getTime());

            //Replace HTML
            var daysEl = kalEl.getElementsByClassName('cal-body-date-day')[0];
            daysEl.innerHTML = str;

            //Attach to events
            date = kalEl.getElementsByClassName('cal-body-date-day')[0];
            dateItems = date.getElementsByTagName('button');

            addEventListeners(dateItems, 'click', onDateItemsClick);
            addEventListeners(dateItems, 'mouseover', onDateItemsHover);
        }

        function renderTime(hourOrDate, minute, second) {
            if(!isPicker) {
                return;
            }

            var hour = hourOrDate,
                date;
            if (hourOrDate.getDate) {
                hour = hourOrDate.getHours();
                minute = hourOrDate.getMinutes();
                second = hourOrDate.getSeconds();
                date = hourOrDate;
            }
            else {
                date = new Date(hourOrDate, minute, second);
            }

            if (hour != null && hour != undefined) checkActive(hourItems, 4, hour);
            if (minute != null && minute != undefined) checkActive(minuteItems, 10, minute);
            if (params.seconds && second != null && second != undefined) checkActive(secondItems, 10, second);

            //timeDisplayEl.innerHTML = date.toLocaleTimeString();
            //timeDisplayEl.innerHTML = padLeft(hour, 2) + ':' + padLeft(minute, 2) + ':' + padLeft(second, 2);

            function checkActive(domElementCollection, columnCount, value) {
                var el, col;
                for (var idx = 0, max = domElementCollection.length; idx < max; idx++) {
                    el = domElementCollection[idx];
                    removeClass(el, 'active');
                    if (parseInt(el.innerText) === value) {
                        col = idx % columnCount;
                        addClass(el, 'active');
                    }
                }
                if (domElementCollection.length > 0) {
                    for (var xidx = 0, xmax = 20; xidx < xmax; xidx++) {
                        removeClass(domElementCollection[0].parentNode, 'cal-offset-' + xidx);
                    }
                    addClass(domElementCollection[0].parentNode, 'cal-column cal-offset-' + col);
                }
                ;
            }
        }

        function renderSkeleton() {
            if (params.wrap) kalElWrap = params.wrap;
            if (!params.wrap) {
                if (params.wrap === false) {
                    kalElWrap = kal.parentElement;
                }
                else {
                    kalElWrap = document.createElement('span');
                    wrap(kalElWrap, kal);
                }
            }

            //kalElWrap = params.wrap || document.createElement('span');
            addClass(kalElWrap, 'cal-wrap');
            //kalElWrap.setAttribute('class', 'cal-wrap');
            //wrap(kalElWrap, kal);

            kalEl = document.createElement('div');
            //kalEl.setAttribute('class', 'cal' + (params.seconds ? ' seconds' : ''));
            addClass(kalEl, 'cal ' + (params.seconds === false ? 'cal-seconds-off' : ''));
            addClass(kalEl, 'cal-display-mode-' + params.mode);
            if(params.dates && params.times) {
                addClass(kalEl, 'cal-mode-datetime');
            } else if (params.dates) {
                addClass(kalEl, 'cal-mode-date');
            } else if (params.times) {
                addClass(kalEl, 'cal-mode-time');
            }
            if(params.className) addClass(kalEl, params.className);
            /*if(['auto', 'manual'].indexOf(params.visibility) > -1)
             kalEl.setAttribute('style', 'display:none;');*/

            var statics = getStaticHtmlValues();

            var html = '';

            if(params.dates) {
                html +=
                    '<div class="cal-head">' +
                    '   <div class="cal-head-left"></div>' +
                    '   <div class="cal-head-pager"><span class="cal-head-pager-prev">◄</span><span class="cal-head-pager-now">●</span><span class="cal-head-pager-next">►</span></div>' +
                    '   <div class="cal-head-right"></div>' +
                    '</div>';
            }

            html += '<div class="cal-body">';

            if(params.dates) {
                html += '<div class="cal-body-date">' +
                    '       <div class="cal-list-head">' + statics.dayListShort + '</div>' +
                    '       <div class="cal-list cal-body-date-day"></div>' +
                    '   </div>';
            }

            html += (params.mode === 'picker' ?
                '   <div class="cal-list cal-body-time-hour">' +
                '       <div class="cal-list-head"></div>' +
                '       <div class="cal-list-head-cancel">☓</div>' +
                '       <div class="cal-column">' +
                statics.hours +
                '       </div>' +
                '   </div>' +
                '   <div class="cal-list cal-body-time-minute">' +
                '       <div class="cal-list-head"></div>' +
                '       <div class="cal-list-head-cancel">☓</div>' +
                '       <div class="cal-column">' +
                statics.minutes +
                '       </div>' +
                '   </div>' +
                (params.seconds ?
                '   <div class="cal-list cal-body-time-second">' +
                '       <div class="cal-list-head"></div>' +
                '       <div class="cal-list-head-cancel">☓</div>' +
                '       <div class="cal-column">' +
                statics.seconds +
                '       </div>' +
                '   </div>' : '' ) : '') +

                '   <div class="cal-list cal-body-months">' + statics.monthsShort + '</div>';
            html += (params.mode === 'picker' && params.dates ?
                    '   <div class="cal-list cal-body-time"></div>' : '') +
                '   <div class="cal-list cal-body-years">' + statics.years + '</div>' +
                '</div>';

            kalEl.innerHTML = html;

            kalElWrap.appendChild(kalEl);

            if (['auto', 'manual'].indexOf(params.visibility) === -1)
                addClass(kalEl, 'cal-visible');
        }



        function filterEvents(eventObjArr, start, end) {
            var current, arr = [];
            for(var idx = 0, max = eventObjArr.length; idx < max; idx++) {
                current = eventObjArr[idx];
                if  (
                    //Within start & end
                (current.start >= start && current.end <= end) ||
                //Starts earlier, ends within
                (current.start <= start && current.end <= end && current.end >= start) ||
                //Starts within, ends later
                (current.start >= start && current.start <= end && current.end >= end) ||
                //Starts earlier, ends later
                (current.start <= start && current.end >= end)
                )
                {
                    arr.push(current);
                    continue;
                }

            }

            return arr;
        }

        /**
         * Adds events to the currently display date range.
         * @param {Object|[Object]} eventObj Event object or array of event objects to add to the current view.
         */
        function addEvents(events) {
            if(!events) {
                return;
            }

            //Always work with an array copy
            if(Object.prototype.toString.call(events) !== '[object Array]') {
                events = [events];
            }
            else
            {
                events = events.slice();
            }

            //filter only relevant events
            events = filterEvents(events, params.displayStart, params.displayEnd);
            if(events.length === 0) {
                return;
            }

            //now re render the current month with the given events
            renderMonth(null, null, events);
        }

        function loadEvents(start, end) {
            if(params.events) {
                var events = params.events;

                //A function was provided, so use this
                if(typeof events === 'function') {
                    var funRes = params.events.call(cbTarget, self, new Date(start.getTime()), new Date(end.getTime()), addEvents);
                    //If the function returns nothing, we assume this is an async call and the function
                    if(funRes !== undefined) {
                        events = funRes;
                    }
                }

                if(Object.prototype.toString.call(events) === '[object Array]')
                {
                    events.sort(function(a,b){
                        return a - b;
                    });
                    return events;
                }
            }

            return [];
        }


        function onYearItemsClick() {
            display(this.getAttribute('data-year'));
            self.hideYears();
        };
        function onMonthItemsClick() {
            display(null, this.getAttribute('data-month'));
            self.hideMonths();
        };
        function onHourItemsClick() {
            self.select(null, null, null, this.innerText);
            showMinuteSelector();
        };
        function onMinuteItemsClick() {
            self.select(null, null, null, null, this.innerText);
            if (params.seconds) {
                showSecondSelector();
            } else {
                disableTimeSelector();
            }

        };
        function onSecondItemsClick() {
            self.select(null, null, null, null, null, this.innerText);
            disableTimeSelector();
        };
        function onDateItemsClick() {
            self.select(this.getAttribute('data-year'), this.getAttribute('data-month'), this.getAttribute('data-date'));
        };
        function onDateItemsHover(ea) {
            if(params.tooltip && (typeof params.tooltip === 'function')) {

                var date = new Date(ea.target.getAttribute('data-year'), ea.target.getAttribute('data-month'), ea.target.getAttribute('data-date')),
                    eventIds = [];

                //Allow custom tooltips
                params.tooltip.call(cbTarget, self, date, eventIds, ea);
            }
        };
        function onFocusIn(ea) {
            var current = KalEl.current;
            if (current && current !== self) {
                //Remove z-index from the current cal
                KalEl.current._hide();
            }
            if (current && current !== self && (current.params.visibility === 'auto' || (current.params.visibility === 'manual' && current.params.hideOnLostFocus))) {
                KalEl.current.hide();
            }
            if (self.params.visibility !== 'manual') {
                self.show();
            }
            ea.stopPropagation();
        };
        function onWindowFocusIn(ea) {
            if(ea.relatedTarget === self.kal) {
                return;
            }
            if (self.params.visibility === 'auto' || (self.params.visibility === 'manual' && self.params.hideOnLostFocus)) {
                self.hide();
            }
        };

        function initEvents() {
            //Hide the element if anything within the window has got the focus
            window.addEventListener('focusin', onWindowFocusIn);
            window.addEventListener('mouseup', onWindowFocusIn);

            //Show if focus is inside BUT stop propagation to window to prevent hide
            kalElWrap.addEventListener('focusin', onFocusIn);
            kalElWrap.addEventListener('mouseup', onFocusIn);

            addEventListeners(cancelTimeSelElements, 'click', disableTimeSelector);
            addEventListeners(yearItems, 'click', onYearItemsClick);
            addEventListeners(monthItems, 'click', onMonthItemsClick);
            if(isPicker) {
                addEventListeners(hourItems, 'click', onHourItemsClick);
                addEventListeners(minuteItems, 'click', onMinuteItemsClick);
            }

            if(timeDisplayEl) timeDisplayEl.addEventListener('click', enableTimeSelector);
            if(yearHeaderEl) yearHeaderEl.addEventListener('click', toggleYears);
            if(monthHeaderEl) monthHeaderEl.addEventListener('click', toggleMonths);

            if(hourHeadEl) hourHeadEl.addEventListener('click', showHourSelector);
            if(minuteHeadEl) minuteHeadEl.addEventListener('click', showMinuteSelector);

            if(pagerPrevEl) pagerPrevEl.addEventListener('click', displayPrevMonth);
            if(pagerNextEl) pagerNextEl.addEventListener('click', displayNextMonth);
            if(pagerNowEl) pagerNowEl.addEventListener('click', displayNow);

            if (kal.tagName.toUpperCase() === 'INPUT' && kal.type.toUpperCase() === 'TEXT') {
                kal.addEventListener('change', function () {
                    var date = params.parseDateString(kal.value);
                    if (isNaN(date.getTime())) {
                        self.params.onDateChanged.call(cbTarget, self, self.params.value);
                    } else {
                        select(date);
                    }
                });
            }

            if (secondItems) {
                addEventListeners(secondItems, 'click', onSecondItemsClick);
                secondHeadEl.addEventListener('click', showSecondSelector);
            }
        }

        function destroy() {
            window.removeEventListener('focusin', onFocusIn);
            window.removeEventListener('mouseup', onFocusIn);
            kalElWrap.removeEventListener('focusin', onWindowFocusIn);
            kalElWrap.removeEventListener('mouseup', onWindowFocusIn);

            var date = kalEl.getElementsByClassName('cal-body-date-day')[0],
                dateItems = date.getElementsByTagName('button');
            removeEventListeners(dateItems, 'click', onDateItemsClick);
            removeEventListeners(dateItems, 'mouseover', onDateItemsHover);
            removeEventListeners(yearItems, 'click', onYearItemsClick);
            removeEventListeners(monthItems, 'click', onMonthItemsClick);
            if(isPicker){
                removeEventListeners(cancelTimeSelElements, 'click', disableTimeSelector);
                removeEventListeners(hourItems, 'click', onHourItemsClick);
                removeEventListeners(minuteItems, 'click', onMinuteItemsClick);
            }

            timeDisplayEl.removeEventListener('click', enableTimeSelector);
            yearHeaderEl.removeEventListener('click', toggleYears);
            monthHeaderEl.removeEventListener('click', toggleMonths);

            if(isPicker){
                hourHeadEl.removeEventListener('click', showHourSelector);
                minuteHeadEl.removeEventListener('click', showMinuteSelector);
            }

            pagerPrevEl.removeEventListener('click', displayPrevMonth);
            pagerNextEl.removeEventListener('click', displayNextMonth);
            pagerNowEl.removeEventListener('click', displayNow);

            if (secondItems) {
                removeEventListeners(secondItems, 'click', onSecondItemsClick);
                secondHeadEl.removeEventListener('click', showSecondSelector);
            }

            kalEl.remove();
            //unwrap(kalElWrap);
        }

        function setTimeListHeader(which) {
            switch (which) {
                case 'hour':
                    hourHeadEl.innerHTML = params.labels[0];
                    minuteHeadEl.innerHTML = params.labelsShort[1];
                    if (params.seconds)
                        secondHeadEl.innerHTML = params.labelsShort[2];
                    break;
                case 'minute':
                    hourHeadEl.innerHTML = params.labels[0];
                    minuteHeadEl.innerHTML = params.labels[1];
                    if (params.seconds)
                        secondHeadEl.innerHTML = params.labelsShort[2];
                    break;
                case 'second':
                    hourHeadEl.innerHTML = params.labels[0];
                    minuteHeadEl.innerHTML = params.labels[1];
                    if (params.seconds)
                        secondHeadEl.innerHTML = params.labels[2];
                    break;
                default:
                    hourHeadEl.innerHTML = params.labelsShort[0];
                    minuteHeadEl.innerHTML = params.labelsShort[1];
                    if (params.seconds)
                        secondHeadEl.innerHTML = params.labelsShort[2];
                    break;
            }
        }

        function showMinuteSelector() {
            setTimeListHeader('minute');

            addClass(hour, 'out');
            removeClass(hour, 'in');
            addClass(minute, 'in');
            removeClass(minute, 'out');
            if (params.seconds) {
                addClass(second, 'out');
                removeClass(second, 'in');
            }
        }

        function showSecondSelector() {
            setTimeListHeader('second');

            addClass(hour, 'out');
            removeClass(hour, 'in');
            addClass(minute, 'out');
            removeClass(minute, 'in');
            if (params.seconds) {
                addClass(second, 'in');
                removeClass(second, 'out');
            }
        }

        function showHourSelector() {
            setTimeListHeader('hour');

            addClass(hour, 'in');
            removeClass(hour, 'out');
            removeClass(minute, 'out in');
            if (params.seconds) {
                removeClass(second, 'out in');
            }
        }

        function enableTimeSelector() {
            hideMonths();
            hideYears();
            showHourSelector();
            if(timeDisplayEl) timeDisplayEl.style.display = 'none';
        }

        function disableTimeSelector() {
            if(timeDisplayEl) timeDisplayEl.style.display = 'block';

            removeClass(hour, 'in out');
            removeClass(minute, 'in out');
            if (params.seconds) removeClass(second, 'in out');

            setTimeListHeader('none');
        }

        function toggle() {
            if (hasClass(self.kalEl, 'cal-visible')) {
                hide();
            }
            else {
                show();
            }
        }

        /**
         * Opens KalEl if the visibility allows it
         */
        function show() {
            KalEl.current = self;
            addClass(self.kalEl, 'cal-visible');
            self.kalEl.style.zIndex = getZIndex();
        }

        /**
         * Hides KalEl if the visibility allows it
         */
        function hide() {
            if(isPicker) {
                disableTimeSelector();
            }
            hideMonths();
            hideYears();
            removeClass(self.kalEl, 'cal-visible');
            _hide();
        }

        function resetView() {
            if(isPicker){
                disableTimeSelector();
            }
            hideMonths();
            hideYears();
        }

        function toggleYears() {
            if (hasClass(self.yearSelectEl, 'cal-visible')) {
                hideYears();
            }
            else {
                showYears();
            }
        }

        function showYears() {
            if(isPicker) {
                disableTimeSelector();
            }
            addClass(self.yearSelectEl, 'cal-visible');
        }

        function hideYears() {
            removeClass(self.yearSelectEl, 'cal-visible');
        }

        function toggleMonths() {
            if (hasClass(self.monthSelectEl, 'cal-visible')) {
                hideMonths();
            }
            else {
                showMonths();
            }
        }

        function showMonths() {
            if(isPicker){
                disableTimeSelector();
            }
            addClass(self.monthSelectEl, 'cal-visible');
        }

        function hideMonths() {
            removeClass(self.monthSelectEl, 'cal-visible');
        }

        // PRIVATE HELPERS

        /**
         * For internal use. Removes the z-index of the calendar
         * @private
         */
        function _hide() {
            self.kalEl.style.zIndex = '';
        }

        function getStaticHtmlValues() {
            var statics = {
                years: '',
                hours: '', minutes: '', seconds: '',
                days: '', daysShort: '',
                dayList: '', dayListShort: '',
                months: '', monthsShort: '',
                monthList: '', monthListShort: ''
            };

            var years = typeof params.years === 'function' ? (params.years.call(cbTarget) || []) : params.years;

            for (var idx = 0, max = 24; idx < max; idx++) statics.hours += '<button data-hour="' + idx + '" tabIndex="-1">' + idx + '</button>';
            for (var idx = 0, max = 60; idx < max; idx++) statics.minutes += '<button data-minute="' + idx + '" tabIndex="-1">' + idx + '</button>';
            for (var idx = 0, max = 60; idx < max; idx++) statics.seconds += '<button data-second="' + idx + '" tabIndex="-1">' + idx + '</button>';

            for (var idx = 0, corrIdx = 0, max = params.dayNames.length; idx < max; idx++) {
                corrIdx = (idx + (params.weekStartsOnSun ? 0 : 1)) % 7;
                statics.days += '<button data-day="' + corrIdx + '" tabIndex="-1">' + params.dayNames[corrIdx] + '</button>';
                statics.daysShort += '<button data-day="' + corrIdx + '" tabIndex="-1">' + params.dayNamesShort[corrIdx] + '</button>';
                statics.dayList += '<li>' + params.dayNames[idx] + '</li>';
                statics.dayListShort += '<li>' + params.dayNamesShort[corrIdx] + '</li>'
            }
            statics.dayList = '<ul>' + statics.dayList + '</ul>';
            statics.dayListShort = '<ul>' + statics.dayListShort + '</ul>';

            for (var idx = 0, max = params.monthNames.length; idx < max; idx++) {
                statics.months += '<button data-month="' + idx + '" tabIndex="-1">' + params.monthNames[idx] + '</button>';
                statics.monthsShort += '<button data-month="' + idx + '" tabIndex="-1">' + params.monthNamesShort[idx] + '</button>';
                statics.monthList += '<li>' + params.monthNames[idx] + '</li>';
                statics.monthListShort += '<li>' + params.monthNamesShort[idx] + '</li>';
            }
            statics.monthList = '<ul>' + statics.monthList + '</ul>';
            statics.monthListShort = '<ul>' + statics.monthListShort + '</ul>';

            for (var idx = 0, max = years.length; idx < max; idx++) statics.years += '<button data-year="' + years[idx] + '" tabIndex="-1">' + years[idx] + '</button>';

            return statics;
        }

        function getPosition(element) {
            var xPosition = 0;
            var yPosition = 0;

            while (element) {
                xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
                yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
                element = element.offsetParent;
            }
            return { x: xPosition, y: yPosition };
        }

        function padLeft(val, length, padChar) {
            padChar = (padChar || '0').toString();
            val = (val || '').toString();
            while (val.length < length) {
                val = padChar + val;
            }
            return val;
        }

        function padRight(val, length, padChar) {
            padChar = (padChar || '0').toString();
            val = (val || '').toString();
            while (val.length < length) {
                val = val + padChar;
            }
            return val;
        }

        function addEventListeners(items, type, listener) {
            if(!items) {
                return;
            }
            for (var idx = 0, max = items.length; idx < max; idx++) {
                items[idx].addEventListener(type, listener);
            }
        }

        function removeEventListeners(items, type, listener) {
            if(!items) {
                return;
            }
            for (var idx = 0, max = items.length; idx < max; idx++) {
                items[idx].removeEventListener(type, listener);
            }
        }

        function hasClass(el, className) {
            var classNames = el.className.trim();

            var hasOnlyMe = (classNames.indexOf(className) === 0 && className.length === classNames.length);
            var startsWith = classNames.indexOf(className + ' ') === 0;
            var endsWith = classNames.indexOf(' ' + className) === (classNames.length - className.length - 1);
            var contain = classNames.indexOf(' ' + className + ' ') > -1;

            return hasOnlyMe ? 'only' : (startsWith ? 'start' : (endsWith ? 'end' : (contain ? 'contain' : false)));
        }

        function addClass(el, className) {
            var classNameArr = className.trim().split(' '),
                cn;

            for (var idx = 0, max = classNameArr.length; idx < max; idx++) {
                cn = classNameArr[idx].trim();
                if (!hasClass(el, cn)) {
                    el.className = (el.className + ' ' + cn).trim();
                }
            }

            return el;
        }

        function removeClass(el, className) {
            var classNameArr = className.trim().split(' '),
                cn, regExp;

            for (var idx = 0, max = classNameArr.length; idx < max; idx++) {
                cn = classNameArr[idx].trim();

                while (hasClass(el, cn)) {
                    while (hasClass(el, cn) === 'only') {
                        el.className = '';
                    }

                    while (hasClass(el, cn) === 'start') {
                        regExp = new RegExp(cn + ' ');
                        el.className = el.className.replace(regExp, '');
                    }

                    while (hasClass(el, cn) === 'end') {
                        regExp = new RegExp(' ' + cn);
                        el.className = el.className.replace(regExp, '');
                    }

                    while (hasClass(el, cn) === 'contain') {
                        regExp = new RegExp(' ' + cn + ' ', 'g')
                        el.className = el.className.replace(regExp, ' ');
                    }
                }
            }

            return el;

            /*var cn = ' ' + className,
             regExp = new RegExp(cn, 'g');

             if(hasClass(el, className)) el.className = el.className.replace(regExp, '');
             return el;*/
        }

        // Wrap an HTMLElement around each element in an HTMLElement array.
        function wrap(htmlElement, elms) {
            // Convert `elms` to an array, if necessary.
            if (!elms.length) elms = [elms];

            // Loops backwards to prevent having to clone the wrapper on the
            // first element (see `child` below).
            for (var i = elms.length - 1; i >= 0; i--) {
                var child = (i > 0) ? htmlElement.cloneNode(true) : htmlElement;
                var el = elms[i];

                // Cache the current parent and sibling.
                var parent = el.parentNode;
                var sibling = el.nextSibling;

                // Wrap the element (is automatically removed from its current
                // parent).
                child.appendChild(el);

                // If the element had a sibling, insert the wrapper before
                // the sibling to maintain the HTML structure; otherwise, just
                // append it to the parent.
                if (sibling) {
                    parent.insertBefore(child, sibling);
                } else {
                    parent.appendChild(child);
                }
            }
        };

        function unwrap(htmlElement) {
            htmlElement.outerHTML = htmlElement.innerHTML;
        }

        // Wrap an HTMLElement around another HTMLElement or an array of them.
        function wrapAll(htmlElement, elms) {
            var el = elms.length ? elms[0] : elms;

            // Cache the current parent and sibling of the first element.
            var parent = el.parentNode;
            var sibling = el.nextSibling;

            // Wrap the first element (is automatically removed from its
            // current parent).
            htmlElement.appendChild(el);

            // Wrap all other elements (if applicable). Each element is
            // automatically removed from its current parent and from the elms
            // array.
            while (elms.length) {
                htmlElement.appendChild(elms[0]);
            }

            // If the first element had a sibling, insert the wrapper before the
            // sibling to maintain the HTML structure; otherwise, just append it
            // to the parent.
            if (sibling) {
                parent.insertBefore(htmlElement, sibling);
            } else {
                parent.appendChild(htmlElement);
            }
        };

        function calculateMonthDisplayData(year, month) {
            var now = new Date(year, month, 1, 0, 0, 0),
                offset = now.getDay(),
                daysInMonth = (new Date(year, month + 1, 0, 0, 0, 0)).getDate();

            if (self.params.weekStartsOnSun) {
                //Prevent week start on first cell
                //if(offset === 0) offset = 0;
                offset += 1;
            } else {
                //Prevent week start on first cell
                if (offset === 0) offset = 7;
                if (offset === 1) offset = 7 + 1;
                //if(offset === 1) offset = 7+1;
            }

            now.setDate(now.getDate() - offset);

            var arr = [];

            for (var idx = 0, max = 42; idx < max; idx++) {
                now.setDate(now.getDate() + 1);
                arr.push(new Date(now.getTime()));
            }

            return {
                dates: arr,
                daysInMonth: daysInMonth,
                daysOffset: offset
            }
        }

        function extend(destination, source) {
            for (var property in source) {
                if (source.hasOwnProperty(property)) {
                    destination[property] = source[property];
                }
            }
            return destination;
        }

        function getZIndex() {
            var elems = document.getElementsByTagName('*');
            var highest = 0;
            for (var i = 0; i < elems.length; i++) {
                var zindex = document.defaultView.getComputedStyle(elems[i], null).getPropertyValue("z-index");
                if (elems[i].style.zIndex === 15) {
                    zindex = elems[i].style.zIndex;
                }
                if ((zindex > highest) && (zindex != 'auto')) {
                    highest = zindex;
                }
            }
            return 1 + highest;
        }

        function getEndOfDay(date) {
            var _date = new Date(date.getTime());
            _date.setHours(23);
            _date.setMinutes(59);
            _date.setSeconds(59);
            return _date;
        }

        //Expose dom elements
        this.kal = kal;
        this.kalEl = kalEl;
        this.kalElWrap = kalElWrap;
        this.monthSelectEl = monthSelectEl;
        this.yearSelectEl = yearSelectEl;

        //Expose methods
        this.select = select;
        this.display = display;
        this.selectNow = selectNow;
        this.displayNow = displayNow;

        this.show = show;
        this.hide = hide;
        this._hide = _hide;
        this.toggle = toggle;
        this.toggleMonths = toggleMonths;
        this.showMonths = showMonths;
        this.hideMonths = hideMonths;
        this.toggleYears = toggleYears;
        this.showYears = showYears;
        this.hideYears = hideYears;

        this.destroy = destroy;

        return this;
    };
})();
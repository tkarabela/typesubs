(function(Reflux, TodoActions, SubsActions, global) {
    'use strict';

    global.subsStore = Reflux.createStore({
        // this will set up listeners to all publishers in TodoActions, using onKeyname (or keyname) as callbacks
        listenables: [SubsActions],
        // i == "last" means last subtitle
        triggerUpdate: function() {
            this.trigger(this.files);
        },
        onSelectSubtitle: function(id, i) {
            var subs = this.files[id];
            var n = subs.events.length;

            i = Math.min(n-1, Math.max(0, i));

            subs.selected = i;
            this.triggerUpdate();
        },
        onEditSubtitle: function(id, i, event) {
            var subs = this.files[id];
            var n = subs.events.length;

            if (i < 0 || i >= n) {
                console.log("Cannot edit subtitle " + i + ", n=" + n);
                return;
            }

            subs.events[i] = event;
            this.triggerUpdate();
        },
        onSwapSubtitles: function(id, i, j) {
            var subs = this.files[id];
            var n = subs.events.length;
            if (i < 0 || j < 0 || i >= n || j >= n) {
                console.log("Cannot swap subtitles " + i + " and " + j + ", n=" + n);
                return;
            }

            var tmp = subs.events[i];
            subs.events[i] = subs.events[j];
            subs.events[j] = tmp;
            this.triggerUpdate();
        },
        onRemoveSubtitle: function(id, i) {
            var subs = this.files[id];
            var n = subs.events.length;

            if (i < 0 || i >= n || n == 1) {
                console.log("Cannot remove subtitle " + i + ", n=" + n);
                return;
            }

            subs.events.splice(i, 1);
            subs.events = subs.events.splice(0); // XXX
            subs.selected = Math.min(subs.selected, n-1);
            this.triggerUpdate();
        },
        onCreateFile: function() {
            var id = 0; //this.idCounter++;
            this.files[id] = {events:[], info: [], styles: {}, selected: 0};
            this.triggerUpdate();
        },
        onLoadFile: function(data, filename) {
            console.log("load file");
            var id = 0; //this.idCounter++;
            var subs = global.parseFile(data);
            subs.selected = 0;
            subs.filename = filename || "subs.ass";
            this.files[id] = subs;
            this.triggerUpdate();
        },
        onRemoveFile: function(id) {
            delete this.files[id];
            this.triggerUpdate();
        },
        // this will be called by all listening components as they register their listeners
        init: function() {
            this.files = {};
            //this.idCounter = 1;
        },
        getInitialState: function() {
            return this.files;
        },
    });

})(window.Reflux, window.TodoActions, window.SubsActions, window);

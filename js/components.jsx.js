/** @jsx React.DOM */

(function(React, ReactRouter, Reflux, TodoActions, todoListStore, SubsActions, subsStore, global) {
    'use strict';

    function zfill(x, size) {
        var str = String(x);
        while (str.length < size) str = "0"+str;
        return str;
    }

    function timesToMs(timestamp) {
        var groups = /(\d):(\d\d):(\d\d).(\d\d)/.exec(timestamp);
        var h = Number.parseInt(groups[1]);
        var m = Number.parseInt(groups[2]);
        var s = Number.parseInt(groups[3]);
        var cs = Number.parseInt(groups[4]);

        return (((h*60+m)*60+s)*1000)+(cs*10);
    }

    function msToTimes(totalMs) {
        var ms = totalMs % 1000;
        var cs = Math.floor(totalMs / 10) % 100;
        var s = Math.floor(totalMs / 1000) % 60;
        var m = Math.floor(totalMs / (60 * 1000)) % 60;
        var h = Math.floor(totalMs / (60 * 60 * 1000));

        return "" + h + ":" + zfill(m, 2) + ":" + zfill(s, 2) + "." + zfill(cs, 2);
    }

    var DEFAULT_COLUMNS = ["number", "layer", "start", "end", "style", "text"];
    var COLUMN_NAMES = {"number": "#", "layer": "L", "start": "Start", "end": "End", "style": "Style", "text": "Text", "cps": "CPS"};
    var TIME_PATTERN = "[0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9]";
    var FIELD_PATTERN = "[^,]*";

    var EventEditor = React.createClass({
        mixins: [React.addons.LinkedStateMixin], // exposes this.linkState used in render
        // this will cause setState({list:updatedlist}) whenever the store does trigger(updatedlist)
        componentWillMount: function() {
            this.loadStateFromProps(this.props);
        },

        componentDidMount: function() {
            React.findDOMNode(this.refs.editorTextbox).focus();
        },

        componentWillReceiveProps: function(nextProps) {
            this.loadStateFromProps(nextProps);
        },

        loadStateFromProps: function(props) {
            this.setState(props.event);
            this.setState({
                startText: msToTimes(this.props.event.start),
                endText: msToTimes(this.props.event.end),
            });
        },

        applyChanges: function() {
            this.setState({
                start: timesToMs(this.state.startText),
                end: timesToMs(this.state.endText),
            }, function() {
                SubsActions.editSubtitle(this.props.fileId, this.props.index, this.state);
            });
        },

        handleKeypress: function(e) {
            if ((e.keyCode == 10 || e.keyCode == 13) && e.ctrlKey) {
                this.applyChanges();
            } else if (e.keyCode == 27) {
                this.setState(this.props.event); // reset state
            } else if (e.keyCode == 40) {
                if (e.ctrlKey && e.shiftKey)
                    SubsActions.swapSubtitles(this.props.fileId, this.props.index, this.props.index + 1);
                SubsActions.selectSubtitle(this.props.fileId, this.props.index + 1);
            } else if (e.keyCode == 38) {
                if (e.ctrlKey && e.shiftKey) 
                    SubsActions.swapSubtitles(this.props.fileId, this.props.index, this.props.index - 1);
                SubsActions.selectSubtitle(this.props.fileId, this.props.index - 1);
            } else if (e.keyCode == 34) {
                SubsActions.selectSubtitle(this.props.fileId, this.props.index + 20);
            } else if (e.keyCode == 33) {
                SubsActions.selectSubtitle(this.props.fileId, this.props.index - 20);
            } else if (e.keyCode == 36 && e.ctrlKey) {
                SubsActions.selectSubtitle(this.props.fileId, 0);
            } else if (e.keyCode == 35 && e.ctrlKey) {
                SubsActions.selectSubtitle(this.props.fileId, 1e6);
            } else if (e.keyCode == 46 && e.ctrlKey) {
                SubsActions.removeSubtitle(this.props.fileId, this.props.index);
            }
        },

        render: function() {
            var that = this;
            return (
                <div className="event-editor">
                    <form className="form-inline">
                        <div className="form-group checkbox">
                            <label><input type="checkbox" checkedLink={this.linkState('comment')}/> Comment </label>
                        </div>
                        &nbsp;
                        <div className="form-group">
                            <input title="Style" valueLink={this.linkState('style')} pattern={FIELD_PATTERN}/>&nbsp;
                            <input title="Actor Name" placeholder="Name" valueLink={this.linkState('name')} pattern={FIELD_PATTERN}/>&nbsp;
                            <input title="Effect" placeholder="Effect" valueLink={this.linkState('effect')} pattern={FIELD_PATTERN}/>
                        </div>
                    </form>
                    <form className="form-inline">
                        <input title="Layer" valueLink={this.linkState('layer')} type="number" min="0" step="1"/>&nbsp;
                        <input title="Start Time" valueLink={this.linkState('startText')} pattern={TIME_PATTERN}/>&nbsp;
                        <input title="End Time" valueLink={this.linkState('endText')} pattern={TIME_PATTERN}/>&nbsp;
                        <input title="Duration" value={msToTimes(this.state.end - this.state.start)} disabled={true}/>&nbsp;
                        <button onClick={this.applyChanges}><i className="fa fa-check"></i> Apply Changes (Ctrl-Enter)</button>
                    </form>
                    <form className="form-inline">
                        <textarea title="Subtitle Text" valueLink={this.linkState('text')} onKeyDown={this.handleKeypress} id="editor-textbox" ref="editorTextbox"/>
                    </form>
                </div>
            );
        }
    });

    var Event = React.createClass({
        mixins: [React.addons.PureRenderMixin],

        getDefaultProps: function() {
            return {
                columns: DEFAULT_COLUMNS
            };
        },
        
        // this will cause setState({list:updatedlist}) whenever the store does trigger(updatedlist)
        selectLine: function() {
            SubsActions.selectSubtitle(this.props.fileId, this.props.index);
            document.getElementById("editor-textbox").focus(); //FIXME
        },

            getColumnData: function(column) {
            var data = null;

            switch (column) {
                case "number": data = this.props.index + 1; break;
                case "start": data = msToTimes(this.props.fields.start); break;
                case "end": data = msToTimes(this.props.fields.end); break;
                case "text": data = this.props.fields.text.replace(/\{[^}]*\}/g, "✴"); break;
                case "cps": data = Math.round(this.props.fields.text.length / ((this.props.fields.end - this.props.fields.start) / 1000)); break; //FIXME
                default: data = this.props.fields[column]; break;
            }
            return (data !== null) ? <td className={"column-"+column}>{data}</td> : "unknown column";
        },

        render: function() {
            var rowClass = React.addons.classSet({selected: this.props.selected, comment: this.props.fields.comment});

            var cells = this.props.columns.map(this.getColumnData);

            return (
                <tr onClick={this.selectLine} className={rowClass}>
                    {this.props.columns.map(this.getColumnData)}
                </tr>
            );
        }
    });

    var TypesubsEditor = React.createClass({
        mixins: [Reflux.connectFilter(subsStore, "subs", function(files){return files[this.props.id];})],

        getDefaultProps: function() {
            return {
                columns: DEFAULT_COLUMNS
            };
        },

        // FIXME
        componentDidUpdate: function() {
            var table = React.findDOMNode(this.refs.subtitleTable);
            var line = React.findDOMNode(this.refs["event-"+this.state.subs.selected]);
            var delta = line.offsetTop - table.scrollTop;

            if (delta < 0) { // scroll up
                table.scrollTop = line.offsetTop;
            } else if (delta > table.offsetHeight - line.offsetHeight) { // scroll down
                table.scrollTop = Math.max(0, line.offsetTop + line.offsetHeight - table.offsetHeight);
            }
        },

        componentDidMount: function() {
            var id = this.props.id;
            this.setState({fileId: id});
          },

        closeFile: function() {
            SubsActions.removeFile(this.props.fileId);
        },

        saveFile: function(evt) {
            var a = React.findDOMNode(this.refs.saveLink);
            var text = global.writeFile(this.state.subs);
            var file = new Blob([text], {type: "text/ass"});
            a.href = URL.createObjectURL(file);
            a.download = this.state.subs.filename;
        },
        openFile: function(e) {
            var file = e.target.files[0];
            if (!file) {
                return;
            }
            var reader = new FileReader();
            reader.onload = function(e) {
                var contents = e.target.result;
                SubsActions.loadFile(contents, file.name);
            };
            reader.readAsText(file);
        },

        render: function() {
            var subs = this.state.subs;
            var fileId = this.props.id;
            var columns = this.props.columns;
            return (
                <div className="panel panel-default">
                    <div className="panel-heading">
                        <i className="fa fa-file-o"></i>&nbsp; {subs.filename}
                    </div>
                        
                        {/*<ul className="nav navbar-nav">
                            <div className="btn-group" role="group">
                                <OpenFileButton value="Open" openFile={this.openFile}/>
                                <a ref="saveLink" className="btn btn-default" href="#" onClick={this.saveFile}><i className="fa fa-save"></i>&nbsp; Save</a>
                            </div>
                            &nbsp;
                            <div className="btn-group" role="group">
                                <a className="btn btn-default disabled" href="#"><i className="fa fa-clock-o"></i>&nbsp; Shift Times</a>
                            </div>
                        </ul>
                        */}

                    <div className="panel-body container-fluid">
                        <div className="row">
                            <div className="col-md-6">
                                <EventEditor fileId={fileId} index={subs.selected} event={subs.events[subs.selected]} styles={subs.styles}/>
                            </div>
                            <div className="col-md-4"></div>
                            <div className="col-md-2">
                                <ul className="nav nav-pills nav-stacked">
                                    <li role="presentation"><OpenFileButton value="Open" openFile={this.openFile}/></li>
                                    <li role="presentation"><a className="btn btn-default" ref="saveLink" href="#" onClick={this.saveFile}><i className="fa fa-save"></i>&nbsp; Save</a></li>
                                    <li role="presentation"><a className="btn btn-default disabled" href="#"><i className="fa fa-clock-o"></i>&nbsp; Shift Times</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <table ref="subtitleTable" className="subtitle-table">
                        <tr>
                            {columns.map(function(c){return <th className={"column-"+c}>{COLUMN_NAMES[c]}</th>;})}
                        </tr>
                        {subs.events.map(function(e, i){return <Event key={i} columns={columns} fileId={fileId} fields={e} index={i} ref={"event-" + i} selected={i == subs.selected} />;})}
                    </table>
                </div>
            );
        }
    });

    var OpenFileButton = React.createClass({
        _openFile: function() {
            React.findDOMNode(this.refs.openFile).click();
        },
        render: function() {
            var style = {display: "none"};
            return (
                <a className="btn btn-default" href="#" onClick={this._openFile}>
                    <i className="fa fa-folder-open"></i>&nbsp; {this.props.value}
                    <input ref="openFile" type="file" style={style} onChange={this.props.openFile}/>
                </a>
            );
        }
    });
// <OpenFileButton value="Open..." openFile={this.openFile}/>
    var TypesubsApp = React.createClass({
        // this will cause setState({list:updatedlist}) whenever the store does trigger(updatedlist)
        mixins: [Reflux.connect(subsStore, "files")],
        componentWillMount: function() {
            this.createFile();
        },
        createFile: function() {
            //SubsActions.createFile();
            SubsActions.loadFile(document.getElementById("mock-subs").value);
        },
        openFile: function(e) {
            var file = e.target.files[0];
            if (!file) {
                return;
            }
            var reader = new FileReader();
            reader.onload = function(e) {
                var contents = e.target.result;
                SubsActions.loadFile(contents);
            };
            reader.readAsText(file);
        },
        x: function() {
            React.findDOMNode(this.refs.openFile).click();
        },
        render: function() {
            var subs = this.state.files[0];

            if (subs) {
                return <TypesubsEditor id={0} subs={subs} />;
            } else {
                var style = {textAlign: "center"}
                return <p style={style}><i className="fa fa-cog fa-spin"></i> Loading...</p>;
            }
        },
    });

    /*
    var routes = (
        <ReactRouter.Route name="/" handler={TypesubsApp}>
            <ReactRouter.Route name="/:id" handler={TypesubsEditor} />
        </ReactRouter.Route>
    );
    
    */
    var routes = (
        <ReactRouter.Route handler={TypesubsApp}/>
    );
    

    ReactRouter.run(routes, function(Handler) {
        React.render(<Handler/>, document.getElementById('typesubsapp'));
    });

})(window.React, window.ReactRouter, window.Reflux, window.TodoActions, window.todoListStore, window.SubsActions, window.subsStore, window);

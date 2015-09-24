(function(exports) {

var TIMESTAMP_PATTERN = /(\d{1,2}):(\d{2}):(\d{2})[.,](\d{2,3})/;
var SECTION_HEADER = /^ *\[ *([^\]]+) *\]/;
var COLON_PAIR = /^ *(\w+) *: *(.+)/;
var ASS_COLOR = /&H([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/;
function zfill(x, size) {
    var str = String(x);
    while (str.length < size)
        str = "0" + str;
    return str;
}
function timesToMs(timestamp) {
    var groups = TIMESTAMP_PATTERN.exec(timestamp);
    var h = parseInt(groups[1]);
    var m = parseInt(groups[2]);
    var s = parseInt(groups[3]);
    var fracs = parseInt(groups[4]);
    var ms;
    if (groups[4].length == 2) {
        ms = fracs * 10;
    }
    else {
        ms = fracs;
    }
    return (((h * 60 + m) * 60 + s) * 1000) + ms;
}
function msToTimes(totalMs) {
    var ms = totalMs % 1000;
    var cs = Math.floor(totalMs / 10) % 100;
    var s = Math.floor(totalMs / 1000) % 60;
    var m = Math.floor(totalMs / (60 * 1000)) % 60;
    var h = Math.floor(totalMs / (60 * 60 * 1000));
    return "" + h + ":" + zfill(m, 2) + ":" + zfill(s, 2) + "." + zfill(cs, 2);
}
function readColor(assColorString) {
    var _a = ASS_COLOR.exec(assColorString), _ = _a[0], a = _a[1], b = _a[2], r = _a[3], g = _a[4];
    return {
        r: parseInt(r, 16),
        g: parseInt(g, 16),
        b: parseInt(b, 16),
        a: parseInt(a, 16)
    };
}
function colorToAss(color) {
    var r = color.r, g = color.g, b = color.b, a = color.a;
    return "&H" + [r, g, b, a].map(function (x) { return zfill(x.toString(16), 2); }).join("");
}
function colorToHtml(color) {
    var r = color.r, g = color.g, b = color.b;
    return "#" + [r, g, b].map(function (x) { return zfill(x.toString(16), 2); }).join("");
}
function parseFile(input) {
    var lines = input.replace("\r", "").split("\n");
    var events = [];
    var styles = {};
    var info = {};
    var section = null;
    var readBool = function (x) { return x != "0"; };
    for (var _i = 0; _i < lines.length; _i++) {
        var line = lines[_i];
        if (SECTION_HEADER.test(line)) {
            section = SECTION_HEADER.exec(line)[1];
        }
        else {
            var _a = COLON_PAIR.exec(line) || [], _ = _a[0], first = _a[1], rest = _a[2];
            if (!first)
                continue;
            if (section == "Script Info") {
                info[first] = rest;
            }
            else if (section == "V4+ Styles") {
                if (first != "Style")
                    continue;
                // Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
                var _b = rest.split(","), name_1 = _b[0], fn = _b[1], fs = _b[2], pc = _b[3], sc = _b[4], oc = _b[5], bc = _b[6], bold = _b[7], italic = _b[8], underline = _b[9], strike = _b[10], sx = _b[11], sy = _b[12], spacing = _b[13], angle = _b[14], bstyle = _b[15], outline = _b[16], shadow = _b[17], alignment = _b[18], ml = _b[19], mr = _b[20], mv = _b[21], encoding = _b[22];
                styles[name_1] = {
                    fontName: fn,
                    fontSize: parseFloat(fs),
                    primaryColor: readColor(pc),
                    secondaryColor: readColor(sc),
                    outlineColor: readColor(oc),
                    backColor: readColor(bc),
                    bold: readBool(bold),
                    italic: readBool(italic),
                    underline: readBool(underline),
                    strikeOut: readBool(strike),
                    scaleX: parseFloat(sx),
                    scaleY: parseFloat(sy),
                    spacing: parseFloat(spacing),
                    angle: parseFloat(angle),
                    borderStyle: parseInt(bstyle),
                    outline: parseFloat(outline),
                    shadow: parseFloat(shadow),
                    alignment: parseInt(alignment),
                    marginL: parseFloat(ml),
                    marginR: parseFloat(mr),
                    marginV: parseFloat(mv),
                    encoding: parseInt(encoding)
                };
            }
            else if (section == "Events") {
                if (first != "Dialogue" && first != "Comment")
                    continue;
                var _c = rest.split(","), layer = _c[0], start = _c[1], end = _c[2], style = _c[3], name_2 = _c[4], ml = _c[5], mr = _c[6], mv = _c[7], effect = _c[8], textFragments = _c.slice(9);
                events.push({
                    layer: parseInt(layer),
                    start: timesToMs(start),
                    end: timesToMs(end),
                    style: style,
                    name: name_2,
                    marginL: parseInt(ml),
                    marginR: parseInt(mr),
                    marginV: parseInt(mv),
                    effect: effect,
                    text: textFragments.join(","),
                    comment: (first == "Comment")
                });
            }
        }
    }
    return { events: events, styles: styles, info: info };
}
exports.parseFile = parseFile;
function writeFile(subs) {
    var lines = [];
    var writeBool = function (x) { return x ? -1 : 0; };
    lines.push("[Script Info]");
    lines.push("; Script generated by TypeSubs");
    lines.push("; https://github.com/tkarabela");
    for (var key in subs.info) {
        lines.push(key + ": " + subs.info[key]);
    }
    lines.push("\n[V4+ Styles]");
    lines.push("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding");
    for (var name_3 in subs.styles) {
        var style = subs.styles[name_3];
        var fields = [
            style.fontName,
            style.fontSize,
            colorToAss(style.primaryColor),
            colorToAss(style.secondaryColor),
            colorToAss(style.outlineColor),
            colorToAss(style.backColor),
            writeBool(style.bold),
            writeBool(style.italic),
            writeBool(style.underline),
            writeBool(style.strikeOut),
            style.scaleX,
            style.scaleY,
            style.spacing,
            style.angle,
            style.borderStyle,
            style.outline,
            style.shadow,
            style.alignment,
            style.marginL,
            style.marginR,
            style.marginV,
            style.encoding,
        ];
        lines.push("Style: " + name_3 + "," + fields.join(","));
    }
    lines.push("\n[Events]");
    lines.push("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text");
    for (var _i = 0, _a = subs.events; _i < _a.length; _i++) {
        var event_1 = _a[_i];
        var fields = [
            event_1.layer,
            msToTimes(event_1.start),
            msToTimes(event_1.end),
            event_1.style,
            event_1.name,
            event_1.marginL,
            event_1.marginR,
            event_1.marginV,
            event_1.effect,
            event_1.text
        ];
        lines.push((event_1.comment ? "Comment" : "Dialogue") + ": " + fields.join(","));
    }
    return lines.join("\n");
}
exports.writeFile = writeFile;

})(window);

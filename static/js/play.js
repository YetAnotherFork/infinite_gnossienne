var start = function () {
    document.getElementById('start').outerHTML = '';
    if (playMeasure) {
        playMeasure(starts);
    }
};
var playMeasure;

var x_pos = 0;
var measure_width = 150;
var clefs = ['treble', 'bass', 'bass'];
var flats = ['A', 'B', 'D', 'E'];
var current_dynamic;
var dynamic_age = 0;
var annotation_age;
var tempo_modifier = 1.1;

window.onload = function () {
    // ------------ let us annotate ------------- \\
    var grammar = tracery.createGrammar({
        'start': ['#intro# #verb# #noun#', 'with #noun#', 'in #noun#',
            '#intro# Be #adverb# #adjective#', '#verb# #noun#', '#verb# #noun#',
        ],
        'intro': ['so as to', 'don\'t', '', '', '', '',],
        'adverb': ['very', 'lightly', 'healthily', 'rigorously', 'diligently',
            '', '', '', '', '', '', '', '', '', ''],
        'verb': [
            'have', 'ask', 'wonder about', 'consider', 'ponder', 'mediate',
            'desecrate', 'memditiate on', 'reject', 'bury', 'conceal', 'request',
            'defer to', 'listen to', 'ignore', 'repudiate', 'light', 'open',
            'widen', 'experiment with', 'console', 'secrete', 'deliver',
            'obtain', 'collect', 'spread out', 'expand', 'join',
            'interrogate', 'answer',
        ],
        'noun': [
            'humility', 'joy', 'despondence', 'loneliness',
            'sadness', 'conviction', 'clarity', 'walls', 'air', 'water', 'darkness',
            'benevolence', 'ill intent', 'questions', 'trepidation', 'fear',
            'tranquility', 'clairvoyance', 'wit', 'a hole', 'the sound',
            'your head', 'your body', 'your hands', 'yourself', 'superiority',
            'ingenuity',
        ],
        'adjective': ['calm', 'gaunt', 'moderate', 'slow', 'alone', 'placid',
            'turgid', 'transformed', 'translucent', 'ingenious',
            'pensive', 'forgetful', 'resourceful', 'illuminated', 'lost',
            'lonely', 'transparent', 'liquid', 'kind', 'polite', 'pensive',
            'magisterial', 'bureaucratic', 'timid', 'benevolent', 'proud',
            'wise', 'lusterous', 'nostaglic', 'indulgent', 'reticent', 'secretive',
        ],
    });
    // ------------ let us engrave ------------- \\
    var length = innerWidth * 0.95;
    var VF = Vex.Flow;
    var div = document.getElementById('notation');

    var staves;
    var context;

    function render_staves() {
        var renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
        renderer.resize(length, 300);

        context = renderer.getContext();
        staves = [
            new VF.Stave(40, 30, length, { right_bar: false }),
            new VF.Stave(40, 140, length, { right_bar: false }),
            // the secret second bass clef where the whole notes live
            new VF.Stave(40, 140, length, { right_bar: false }),
        ];

        x_pos = 115;
        for (var i = 0; i < staves.length; i++) {
            staves[i].addClef(clefs[i]);
            staves[i].addKeySignature('Ab');
            staves[i].setContext(context).draw();
            staves[i].setNoteStartX(x_pos);
        }
        var connector = new VF.StaveConnector(staves[0], staves[1]);
        var line = new VF.StaveConnector(staves[0], staves[1]);
        connector.setType(VF.StaveConnector.type.BRACE);
        connector.setContext(context);
        connector.setContext(context);
        connector.draw();
        line.setType(VF.StaveConnector.type.SINGLE);
        line.setContext(context);
        line.draw();
    }

    render_staves();

    // ------------ let us SIIIIING ---------------- \\
    var track_options = [
        {gain: 1, sustain: 1, gain_center: 1},
        {gain: 0.3, sustain: 1, gain_center: 0.3},
    ];


    Soundfont.instrument(new AudioContext(), 'acoustic_grand_piano').then(function (piano) {

        var playNote = function(notes, index, track_id) {
            // smooth tempo changes
            if (tempo_modifier > 1.1) {
                tempo_modifier -= 0.01;
            } else {
                tempo_modifier += 0.001;
            }
            // smooth dynamic changes
            var options = track_options[track_id];
            if (options.gain > options.gain_center) {
                track_options[track_id].gain -= options.gain / 100;
            } else if (options.gain < options.gain_center) {
                track_options[track_id].gain += options.gain / 100;
            }

            var note = notes[index].split('/');
            var velocity = note[1];
            var delay = note[2] * tempo_modifier;

            var play = [];
            if (velocity > 0) {
                play.push(note[0]);
                // handle chords
                while (true) {
                    var proposed = notes[index + 1] ? notes[index + 1].split('/') : undefined;
                    if (!proposed || proposed[2] > 0 || proposed[1] === 0) {
                        break;
                    }
                    index += 1;
                    play.push(proposed[0]);
                }

                for (var i = 0; i < play.length; i++) {
                    piano.play(play[i], 0, options);
                }
            }

            if (notes[index + 1]) {
                var next = notes[index + 1].split('/');
                window.setTimeout(playNote.bind(null, notes, index + 1, track_id), next[2] * tempo_modifier);
            }
        };

        playMeasure = function(tokens) {
            // wiggle the tempo around
            tempo_modifier += (0.5 - Math.random()) / 8;

            // adjust dynamic
            var new_dynamic;
            if (!current_dynamic || dynamic_age > 5) {
                dynamic_age = 0;
                current_dynamic = current_dynamic == 'p' ? 'f' : 'p';
                new_dynamic = current_dynamic;
                track_options[0].gain = current_dynamic == 'p' ? 0.5 : 1.5;
                track_options[1].gain = current_dynamic == 'p' ? 0.2 : 0.4;
            } else {
                dynamic_age += 1;
            }

            // annotations
            var annotation;
            if (annotation_age === undefined || annotation_age > 17) {
                annotation = get_annotation();
                annotation_age = 0;
            }
            annotation_age += 1;

            var track_notes = [];
            for (var i = 0; i < tokens.length; i++) {
                track_notes.push(tokens[i].split('|'));
            }

            for (i = 0; i < tokens.length; i++) {
                var notes = track_notes[i];
                var start = notes[0].split('/');
                window.setTimeout(playNote.bind(null, notes, 0, i),
                    start[2] * tempo_modifier);
            }

            // draw this measure
            drawNotes(track_notes, new_dynamic, annotation);
            x_pos += measure_width;

            // pick the next measure
            var next_tokens = [];
            for (i = 0; i < tokens.length; i++) {
                var options = dists[i][tokens[i]];
                next_tokens.push(weighted_random(options));
            }

            if (x_pos > length - measure_width) {
                render_staves();
            }

            window.setTimeout(playMeasure.bind(null, next_tokens), 1920 * tempo_modifier);
        };

        // done loading
        var start = document.getElementById('start').removeAttribute('disabled');
    });

    // ------------ let us DRAAAAW ------------- \\
    function drawNotes(note_sets, dynamic, annotation) {
        var voices = [];
        for (var i = 0; i < note_sets.length; i++) {
            var notes = note_sets[i];
            voices = voices.concat(get_voice(notes, clefs[i]));
        }

        // I don't know why joining the voices in the loop breaks this but it doooooessss
        var formatter = new VF.Formatter();
        formatter.joinVoices([voices[0]]);
        formatter.joinVoices([voices[1], voices[2]]);
        formatter.format(voices, measure_width);

        var beam_function = function(beam) {
            return beam.setContext(context).draw();
        };
        for (i = 0; i < voices.length; i++) {
            staves[i].setNoteStartX(x_pos);
            var beams = VF.Beam.generateBeams(voices[i].getTickables(), {
                flat_beams: true,
                stem_direction: i >= 1 ? -1 : 1,
            });
            voices[i].draw(context, staves[i]);
            beams.forEach(beam_function);

        }

        if (dynamic) {
            dynamic = new VF.TextDynamics({text: dynamic, duration: 'w'});
            var dvoice = new VF.Voice({num_beats: 4, beat_value: 4})
                .addTickable(dynamic);
            formatter.format([dvoice], measure_width);
            dvoice.draw(context, staves[1]);
        }

        if (annotation) {
            text_note = new VF.TextNote({text: annotation, duration: 'w'})
                .setLine(-1)
                .setJustification(VF.TextNote.Justification.LEFT)
                .setStave(staves[0]);
            text_note.font = {
                family: 'Times',
                size: 14,
            };

            var avoice = new VF.Voice({num_beats: 4, beat_value: 4})
                .addTickable(text_note);
            formatter.format([avoice], measure_width);
            avoice.draw(context, staves[0]);
        }
    }

    function get_voice(notes, clef) {
        notes = notes.filter(function(n) {
            if (n[3] > 0) {
                return n;
            }
        });
        var vf_notes = [];
        var vf_notes_w = [];

        var grace_note;
        var first_note = true;
        for (var i = 0; i < notes.length; i++) {
            // ------------ check for rests
            var rest_note = clef == 'bass' ? 'b/3' : 'e/5';
            if (notes[i] == '70/1/0/1920') {
                // special case: whole note rest
                vf_notes.push(
                    new VF.StaveNote({clef: clef, keys: [rest_note], duration: 'wr'})
                );
                break;
            }
            note = notes[i].split('/');
            if (first_note && note[2] > 25 && note[3] > 60) {
                // we have ourselves a rest
                var rest = get_duration(note[2] - 50) + 'r';
                vf_notes.push(
                    new VF.StaveNote({clef: clef, keys: [rest_note], duration: rest })
                );
            }

            // ------------- note info
            var note_name = midi_to_note(note[0]);
            var duration = parseInt(note[3]);
            var type = get_duration(duration);

            // ------------- grace notes
            // stash the grace note away to add it as a modifier to the next note
            if (duration < 100) {
                var gn = new Vex.Flow.GraceNote({keys: [note_name], duration: '8', slash: true });
                grace_note = new Vex.Flow.GraceNoteGroup([gn], true);
                if (flats.indexOf(note_name.split('/')[0]) > -1) {
                    gn.addAccidental(0, new VF.Accidental('n'));
                }
                continue;
            }

            // ------------ chords
            var names = [note_name];
            while (true) {
                var proposed = notes[i + 1] ? notes[i + 1].split('/') : undefined;
                if (!proposed || proposed[2] > 0 || proposed[1] === 0) {
                    break;
                }
                i += 1;
                var proposed_name = midi_to_note(proposed[0]);
                names.push(proposed_name);
            }

            // ------------ create and render vexflow notes
            var params = {clef: clef, keys: names, duration: type };
            params.stem_direction = clef == 'bass' == 1 ? -1 : 1;
            var vf_note = new VF.StaveNote(params);

            // modifiers
            if (grace_note) {
                vf_note.addModifier(0, grace_note.beamNotes());
                grace_note = undefined;
            }

            if (type == 'hd') {
                vf_note.addDotToAll();
            }

            // this works because this piece only has naturals and never on chords
            if (names.length == 1 && flats.indexOf(names[0].split('/')[0]) > -1) {
                vf_note.addAccidental(0, new VF.Accidental('n'));
            }
            // vf_notes_w handles satie doubling up the bass stave
            if (type == 'w') {
                vf_notes_w.push(vf_note);
            } else {
                vf_notes.push(vf_note);
                first_note = false;
            }
        }

        var voice = new VF.Voice({num_beats: 4,  beat_value: 4});
        voice.addTickables(vf_notes);

        var voices = [voice];

        if (vf_notes_w.length > 0) {
            voice = new VF.Voice({num_beats: 4,  beat_value: 4});
            voice.addTickables(vf_notes_w);
            voices.push(voice);
        }
        return voices;
    }

    function get_annotation() {
        var text = grammar.flatten('#start#');
        text = text.charAt(0).toUpperCase() + text.slice(1);
        return text;
    }
};

function get_duration(duration) {
    var type = 'w';
    if (duration <= 240) {
        type = '8';
    } else if (duration <= 480) {
        type = 'q';
    } else if (duration <= 960) {
        type = 'h';
    } else if (duration < 1773) {
        type = 'hd';
    }
    return type;
}

function midi_to_note(midi) {
    var octave = Math.floor(midi / 12) - 1;
    var note = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][(midi % 12)];
    return note + '/' + octave;
}

function weighted_random(options) {
    // {identifier:  1, identifier: 6, ...}
    var listed = [];
    var keys = Object.keys(options);
    for (var i = 0; i < keys.length; i++) {
        var option = keys[i];
        var weight = options[option];
        for (j = 0; j < weight; j++) {
            listed.push(option);
        }
    }

    return listed[Math.floor(Math.random() * listed.length)];
}

''' infinite music from a midi file, mostly if that midi is gnossiennes no 1 '''
from mido import MidiFile, MidiTrack, Message

from collections import defaultdict
import json
import random
import sys

class NotationDistribution(object):
    ''' probabilistic music notation generation data '''

    def __init__(self, filename):
        # keep track of the first note in the original piece
        self.starts = [None, None]

        # markov chain probability tables for each track
        self.track_dists = []
        # relationship between simulatanous notes between tracks
        self.joint_dist = defaultdict(lambda: defaultdict(lambda: 0))

        # populates the distributions
        self.parse_midi(filename)


    def parse_midi(self, filename):
        ''' create probability distributions from a midi file
         distributions look like
         {note: {option: probability, option: probability}, note: {..}, ...} '''

        mid = MidiFile(filename)
        tracks = mid.tracks
        # probability that one note follows another in a track
        for (idx, track) in enumerate(tracks):
            dist = defaultdict(lambda: defaultdict(lambda: 0))
            tokens = tokenize_track(track)
            for i in range(len(tokens) - 1):
                one = tokens[i]['identifier']
                two = tokens[i + 1]['identifier']
                if self.starts[idx] is None:
                    self.starts[idx] = one
                dist[one][two] += 1

            # remove dead ends (or just make them very improbable)
            dead = []
            for (idx, entry) in dist.items():
                if not len(entry.keys()):
                    dead.append(idx)
            for (idx, entry) in dist.items():
                dist[idx] = {k: v if not k in dead else 0 \
                        for (k, v) in entry.items()}
            self.track_dists.append(dist)

        # probability of a note in a track given the behavior of the other track

    def generate_music(self, time=(0.5 * 60 * 1000)):
        ''' produce new midi data from the distributions
        this should probably be re-written browser-side '''
        self.starts.reverse()
        mid = MidiFile()
        json_data = []
        for dist in self.track_dists:
            # create a new track for the generated music
            track = MidiTrack()
            mid.tracks.append(track)

            # create a text version
            json_track = []

            # select the same first note as the original piece
            start = self.starts.pop()
            token = start
            count = 0
            while count < time:
                for note in token.split('|'):
                    note = Message.from_str(note)
                    count += note.time
                    track.append(note)
                    json_track.append({
                        'note': note.note,
                        'velocity': note.velocity,
                        'time': note.time,
                    })
                options = dist[token]
                try:
                    token = weighted_choice(options)
                except IndexError:
                    print('no followup found for token: %s' % token)
                    token = start
            json_data.append(json_track)
        mid.save('new.mid')
        json.dump(json_data, open('new.json', 'w'))


def tokenize_track(track):
    ''' group 4/4 measures together (1920 ms) -- sorry satie '''
    # controls and settings get added back later
    notes = [n for n in track if n.type == 'note_on']

    tokens = []
    group = []
    running_time = 0
    for note in notes:
        running_time += note.time
        # we're done, process the note group into a token
        if running_time >= 1920 and note.velocity > 0:
            identifier = []
            for n in group:
                duration = n[2] - n[1]
                if n[0].velocity > 0:
                    print(n[0].note, n[1], n[2], duration)
                else:
                    duration = 0
                identifier.append('%d/%d/%d/%d' % \
                        (n[0].note, n[0].velocity, n[0].time, duration))
            identifier = '|'.join(identifier)
            token = {
                'notes': group,
                'identifier': identifier
            }
            tokens.append(token)
            group = []
            running_time = 0

        # and let's get on with the next group
        note.velocity = 100 if note.velocity else 0

        note = [note, running_time, 0] # note, start time, end time
        if note[0].velocity == 0:
            # we have to search backwards in the group to find the start
            for (idx, n) in enumerate(group[::-1]):
                if n[0].note == note[0].note:
                    group[len(group) - 1 - idx][2] = running_time
                    break
        group.append(note)

    return tokens


def weighted_choice(options):
    ''' prefer likelier followups '''
    if len(options) == 1:
        return options.keys()[0]

    weighted = []
    for (option, weight) in options.items():
        weighted += [option] * weight
    return random.choice(weighted)


if __name__ == '__main__':
    try:
        f = sys.argv[1]
    except IndexError:
        f = 'gnossiennes_1.mid'

    notation = NotationDistribution(f)
    import pdb;pdb.set_trace()
    #notation.generate_music()

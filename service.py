import vlc
import time
import threading
import pymongo
import sys
import random
import json
from pymongo import MongoClient
from bson.objectid import ObjectId
from models import Song
from player import Player

# Pymongo
client = MongoClient()
db = client.concert

# determines whether or not we emitted the stop signal
has_stopped = False

class MusicService:
    def __init__(self, socketio):
        self._player = Player()
        self.socketio = socketio

    def play_next(self):
        global has_stopped
        cur_queue = self.get_queue()
        if len(cur_queue) > 0:
            next_song = cur_queue.pop(0)
            self._player.current_track = next_song
            self._remove_song(next_song['_id'])
            self._player.play(next_song)
            self.socketio.emit('played', self.player_state(), include_self=True)
            has_stopped = False
        else:
            # We need to emit a signal to stop clients, but this should only occur once while
            # there is no media in the player
            if (not has_stopped):
                self._player.stop()
                self.socketio.emit('stopped', self.player_state(), include_self=True)
                has_stopped = True

    def pause(self):
        return self._player.pause()

    def stop(self):
        self._player.stop()
        return self.player_state()

    def set_volume(self, value):
        return self._player.set_volume(value)

    def set_time(self, percent):
        if not self._player.is_playing():
            return "Invalid"
        return self._player.set_time(percent)

    def get_queue(self):
        queue = []
        cur_queue = db.Queue.find().sort('date', pymongo.ASCENDING)
        for item in cur_queue:
            queue.append(item)
        return queue

    def get_json_queue(self):
        client = MongoClient()
        db = client.concert
        queue = []
        cur_queue = db.Queue.find().sort('date', pymongo.ASCENDING)
        for item in cur_queue:
            song = Song(item['mrl'], item['title'], item['duration'], 
                item['thumbnail'], item['playedby'])
            queue.append(song.dictify())
        return json.dumps(queue)

    # Combine the player's state with the current queue
    def player_state(self):
        player_state = json.loads(self._player.cur_state())
        player_state['queue'] = self.get_json_queue()
        return json.dumps(player_state)

    def _remove_song(self, _id):
        db.Queue.delete_one({"_id": ObjectId(_id)})

    def player_thread(self):
        while True:
            if not self._player.is_playing():
                self.play_next()
            time.sleep(1)

    def heartbeat(self):
        while True:
            self.socketio.emit('heartbeat', self.player_state(), include_self=True)
            time.sleep(30)

    def start(self):
        thread = threading.Thread(target=self.player_thread)
        thread.daemon = True
        thread.start()

        heartbeat_thread = threading.Thread(target=self.heartbeat)
        heartbeat_thread.daemon = True
        heartbeat_thread.start()

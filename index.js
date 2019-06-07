const dotenv = require('dotenv').config();
const express = require('express');
const Twitter = require('twitter');
const ws = require('ws');
const server = express();

const PORT = process.env.PORT || 8080;
server.use(express.static('public'));

const socketServer = ws.Server({port: PORT});

const twitter = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

const receiveData = function(event, socket) {
  if (event && event.text) {
    socket.send(JSON.stringify({
      tweetText: event.text // TODO: Replace with sentiment analysis
    }));
  }
};

socketServer.on('connection', socket => {
  socket.on('message', message => {
    const data = JSON.parse(message);
    const tweetStream = twitter.stream('statuses/filter', {track: data.query});
    tweetStream.on('data', tweets => receiveData(tweets, socket));
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
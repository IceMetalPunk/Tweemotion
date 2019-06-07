const dotenv = require('dotenv').config();
const express = require('express');
const Twitter = require('twitter');
const ws = require('ws');
const Sentimental = require('Sentimental');
const server = express();

const PORT = process.env.PORT || '8080';
const WS_PORT = String(Number(PORT) + 1);
server.use(express.static('public'));

const socketServer = new ws.Server({port: WS_PORT});

const twitter = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

const receiveData = function(event, socket) {
  if (event && event.text) {
    let content = event.text.replace(/[@#][A-Za-z0-9_-]+/g, '');
    socket.send(JSON.stringify({
      text: event.text,
      score: Sentimental.analyze(content).score,
      from: event.user.screen_name
    }));
  }
};

socketServer.on('connection', socket => {
  socket.streams = [];
  socket.on('message', message => {
    const data = JSON.parse(message);
    const tweetStream = twitter.stream('statuses/filter', {track: data.query});
    tweetStream.on('data', tweets => receiveData(tweets, socket));
    socket.streams.push(tweetStream);
  });

  socket.on('close', () => {
    socket.streams.forEach(stream => stream.destroy());
    socket.streams = [];
  })
});

server.get('/api/port_info', (req, res) => {
  const data = { PORT, WS_PORT };
  res.send(JSON.stringify(data));
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
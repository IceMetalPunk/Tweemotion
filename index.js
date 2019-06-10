const dotenv = require('dotenv').config();
const express = require('express');
const Twitter = require('twitter');
const ws = require('ws');
const shortid = require('shortid');
const { NlpManager, Language } = require('node-nlp');
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

const sentimentAnalyzer = new NlpManager();
const languageAnalyzer = new Language();
let alive = [];

const receiveData = async function(event, socket) {
  if (event && event.text) {
    let content = event.text.replace(/[@#][A-Za-z0-9_-]+/g, '');
    let percent = null, language;
    try {
      const languageAnalysis = await languageAnalyzer.guess(content);
      language = languageAnalysis[0].alpha2;
      const analysis = await sentimentAnalyzer.process(language, content); 
      if (analysis.sentiment && analysis.sentiment.comparative) {
        percent = (100 * analysis.sentiment.comparative)/0.15;
      }
    } catch {
      language = 'en';
    };
    if (alive.indexOf(socket.id) < 0) {
      console.log(`${socket.id} is dead: `, alive);
      return;
    }
    socket.send(JSON.stringify({
      type: 'tweet',
      text: event.text,
      percent,
      from: event.user.screen_name,
      language
    }));
  }
};

const killSocket = function(socket) {
  socket.streams.forEach(stream => stream.destroy());
  socket.streams = [];
  alive = alive.filter(id => id !== socket.id);
  clearInterval(socket.heartbeat);
  socket.terminate();
};

const heartbeat = function(socket) {
  if (!socket.alive) {
    console.log('DEAD');
    killSocket(socket);
  }
  else {
    socket.send(JSON.stringify({
      type: 'ping'
    }));
  }
  socket.alive = false;
}

socketServer.on('connection', socket => {
  socket.id = shortid.generate();
  socket.alive = true;
  alive.push(socket.id);
  socket.streams = [];
  socket.on('message', message => {
    const data = JSON.parse(message);
    if (data.type === 'pong') {
      console.log('Pong');
      socket.alive = true;
    }
    else if (data.type === 'search') {
      const tweetStream = twitter.stream('statuses/filter', {track: data.query});
      tweetStream.on('data', async tweets => await receiveData(tweets, socket));
      socket.streams.push(tweetStream);
    }
    else if (data.type === 'kill') {
      console.log('Kill request...');
      killSocket(socket);
    }
  });

  socket.on('close', () => {
    killSocket(socket);
  });

  socket.heartbeat = setInterval(() => heartbeat(socket), 1000);
});

server.get('/api/port_info', (req, res) => {
  const data = { PORT, WS_PORT };
  res.send(JSON.stringify(data));
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
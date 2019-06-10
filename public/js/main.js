const setup = async function() {
    const response = await fetch('api/port_info');
    const PORTS = await response.json();
    const submitButton = document.getElementById('set-query-btn');
    const searchField = document.getElementById('query-field');
    const displayTweet = document.getElementById('display-tweet');
    const displayScore = document.getElementById('display-score');

    const scores = [];
    const tweets = [];
    let lastTweet = {};

    const linkTweeter = function(tweet) {
        const name = tweet.from;
        if (name) {
            return `<a href="https://twitter.com/${name}" target="_blank">@${name}</a>`;
        }
        return '@Anonymous';
    };

    const refreshDisplay = function() {
        const sum = scores.reduce((total, value) => total + value, 0);
        const average = sum/scores.length;
        displayScore.textContent = `${average.toFixed(1)}%`;
        displayTweet.classList.remove('status');
        displayTweet.innerHTML = `Recent tweet:<br>"${lastTweet.text}" - ${linkTweeter(lastTweet)}`;
    };
    
    let tweetRotator = null;
    const updateLastTweet = function() {
        if (tweets.length > 0) {
            lastTweet = tweets.shift();
            refreshDisplay();
        }
        else if (tweetRotator !== null) {
            window.clearInterval(tweetRotator);
            tweetRotator = null;
        }
    };

    const sock = new WebSocket(`ws://${window.location.hostname}:${PORTS.WS_PORT}`);
    sock.addEventListener('error', err => console.error(err));
    sock.addEventListener('open', res => console.log('Connected!'));
    sock.addEventListener('message', mess => {
        const json = JSON.parse(mess.data);
        if (json.type === 'ping') {
            console.log('Heartbeat');
            sock.send(JSON.stringify({
                type: 'pong'
            }));
        }
        else if (json.type === 'tweet') {
            console.log(json.percent);
            if (!json.from) {
                json.from = '';
            }
            tweets.push(json);
            if (tweets.length === 1 && tweetRotator === null) {
                updateLastTweet();
                tweetRotator = window.setInterval(updateLastTweet, 2000);
            }
            if (json.percent !== null) {
                scores.push(json.percent);
            }
            refreshDisplay();
        }
    });

    submitButton.addEventListener('click', () => {
        const query = searchField.value.trim();
        scores.length = 0;
        tweets.length = 0;
        lastTweet = {};
        window.clearInterval(tweetRotator);
        tweetRotator = null;
        displayScore.textContent = `--%`;
        displayTweet.classList.add('status');
        displayTweet.textContent = `Waiting for tweets about ${query}...`;
        sock.send(JSON.stringify({type: 'search', query}));
    });
    
    window.addEventListener('beforeunload', () => {
        console.log('Closing...');
        sock.send(JSON.stringify({
            type: 'kill'
        }));
        sock.close();
        console.log('Unloading');
    });

};
document.addEventListener('DOMContentLoaded', setup);
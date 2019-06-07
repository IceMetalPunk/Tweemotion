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

    const refreshDisplay = function() {
        const sum = scores.reduce((total, value) => total + value, 0);
        const average = sum/scores.length;
        const percent = 100 * (average + 4) / 8;
        displayScore.textContent = `${percent.toFixed(1)}%`;
        displayTweet.textContent = `"${lastTweet.text}" - @${lastTweet.from}`;
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
        if (!json.from) {
            json.from = 'Anonymous';
        }
        tweets.push(json);
        if (tweets.length === 1 && tweetRotator === null) {
            updateLastTweet();
            tweetRotator = window.setInterval(updateLastTweet, 2000);
        }
        scores.push(json.score);
        refreshDisplay();
    });

    submitButton.addEventListener('click', () => {
        sock.send(JSON.stringify({query: searchField.value}));
    });

};
document.addEventListener('DOMContentLoaded', setup);
const url = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post&wantedCollections=app.bsky.feed.like";

// Store messages for each digit
const digitMessages = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: []
};

function getNumberFromWord(text) {
    const numberWords = [
        'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
        'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 
        'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four'
    ];
    
    const words = text.toLowerCase().match(/\b\w+(-\w+)?\b/g) || [];
    for (const word of words) {
        const index = numberWords.indexOf(word);
        if (index !== -1) {
            return { found: true, number: index, word };
        }
    }
    return { found: false };
}

function highlightNumber(text, number, word = null) {
    if (word) {
        return text.replace(new RegExp(`\\b${word}\\b`, 'i'), `<span class="number">${word}</span>`);
    }
    return text.replace(new RegExp(`\\b${number}\\b`), `<span class="number">${number}</span>`);
}

function updateClockDisplay() {
    const now = new Date();
    const timeStr = now.toTimeString().split(':').join('');
    const digits = timeStr.substring(0, 6).split('');
    
    const slots = ['hours1', 'hours2', 'minutes1', 'minutes2', 'seconds1', 'seconds2'];
    
    digits.forEach((digit, index) => {
        const messages = digitMessages[parseInt(digit)];
        const element = document.getElementById(slots[index]);
        
        if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            element.innerHTML = latestMessage;
            element.classList.remove('empty');
        } else {
            element.innerHTML = `Waiting for message containing ${digit}...`;
            element.classList.add('empty');
        }
    });
}

const ws = new WebSocket(url);
ws.onopen = () => {
    console.log("Connected to Bluesky WebSocket");
};

ws.onmessage = (event) => {
    const json = JSON.parse(event.data);
    
    if (json.commit?.collection === 'app.bsky.feed.post' && json.commit?.record?.text) {
        const text = json.commit.record.text;
        
        // Check for numeric numbers 0-9
        const numericMatch = text.match(/\b([0-9])\b/);
        if (numericMatch) {
            const number = parseInt(numericMatch[0]);
            const highlightedText = highlightNumber(text, number);
            digitMessages[number].push(highlightedText);
        }
        
        // Check for written numbers 0-9
        const wordMatch = getNumberFromWord(text);
        if (wordMatch.found && wordMatch.number <= 9) {
            const highlightedText = highlightNumber(text, wordMatch.number, wordMatch.word);
            digitMessages[wordMatch.number].push(highlightedText);
        }
    }
};

ws.onerror = (error) => {
    console.error("WebSocket error:", error);
};

ws.onclose = () => {
    console.log("WebSocket connection closed");
};

// Update clock display every second
setInterval(updateClockDisplay, 1000);
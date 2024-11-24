const url = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post&wantedCollections=app.bsky.feed.like";

const digitMessages = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: []
};

function highlightNumber(text, number) {
    return `<div class="number">${number}</div>${text}`;
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
            element.innerHTML = `
                <div class="hologram">
                    ${latestMessage}
                    <div class="lines"></div>
                </div>
            `;
            element.classList.remove('empty');
        } else {
            element.innerHTML = `
                <div class="hologram">
                    <div class="message-text">Awaiting transmission...</div>
                    <div class="lines"></div>
                </div>
            `;
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
        
        const numericMatch = text.match(/\b([0-9])\b/);
        if (numericMatch) {
            const number = parseInt(numericMatch[0]);
            const highlightedText = highlightNumber(text, number);
            digitMessages[number].push(highlightedText);
        }
    }
};

ws.onerror = (error) => {
    console.error("WebSocket error:", error);
};

ws.onclose = () => {
    console.log("WebSocket connection closed");
};

setInterval(updateClockDisplay, 1000);
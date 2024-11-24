const url = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post&wantedCollections=app.bsky.feed.like";

const digitMessages = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: []
};

// Keep track of all messages that have ever been displayed
const usedMessages = new Set();

function highlightNumber(text, number) {
    // Create both inline highlight and overlay number
    const highlightedText = text.replace(
        new RegExp(`\\b${number}\\b`),
        `<span class="number-inline">${number}</span>`
    );
    return `<div class="number-overlay">${number}</div>${highlightedText}`;
}

function getUnusedMessage(messages, digit) {
    // If we have no messages, return null
    if (messages.length === 0) return null;
    
    // Try to find a message that has never been used before
    for (let i = messages.length - 1; i >= 0; i--) {
        const messageId = `${digit}-${i}`;
        if (!usedMessages.has(messageId)) {
            usedMessages.add(messageId);
            return { message: messages[i], index: i };
        }
    }
    
    // If all messages have been used, return null
    return null;
}

function updateClockDisplay() {
    const now = new Date();
    const timeStr = now.toTimeString().split(':').join('');
    const digits = timeStr.substring(0, 6).split('');
    
    const slots = ['hours1', 'hours2', 'minutes1', 'minutes2', 'seconds1', 'seconds2'];
    
    digits.forEach((digit, index) => {
        const messages = digitMessages[parseInt(digit)];
        const element = document.getElementById(slots[index]);
        
        const messageData = getUnusedMessage(messages, digit);
        
        if (messageData) {
            element.innerHTML = `
                <div class="hologram">
                    <div class="message-text">${messageData.message}</div>
                    <div class="lines"></div>
                </div>
            `;
            element.classList.remove('empty');
        } else {
            element.innerHTML = `
                <div class="hologram">
                    <div class="message-text">Awaiting new transmission...</div>
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
            // Only add the message if we don't have too many stored
            if (digitMessages[number].length < 1000) { // Prevent unlimited growth
                digitMessages[number].push(highlightedText);
            }
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
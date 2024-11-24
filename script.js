const url = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post&wantedCollections=app.bsky.feed.like";

const digitMessages = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: []
};

// Keep track of all messages that have ever been displayed
const usedMessages = new Set();

// Add this to track previous digits
let previousDigits = ['', '', '', '', '', ''];

function highlightNumber(text, number, animate = false) {
    // Create both inline highlight and overlay number
    const highlightedText = text.replace(
        new RegExp(`\\b${number}\\b`),
        `<span class="number-inline">${number}</span>`
    );
    const animateClass = animate ? ' animate' : '';
    return `<div class="number-overlay${animateClass}">${number}</div>${highlightedText}`;
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
        const element = document.getElementById(slots[index]);
        const isCurrentlyEmpty = element.classList.contains('empty');
        const digitChanged = digit !== previousDigits[index];
        
        // Update if the digit changed OR if the slot is empty
        if (digitChanged || isCurrentlyEmpty) {
            const messages = digitMessages[parseInt(digit)];
            const messageData = getUnusedMessage(messages, digit);
            
            if (messageData) {
                // Only animate if the digit actually changed
                const message = messageData.message.message.replace(
                    /<div class="number-overlay[^>]*>/,
                    `<div class="number-overlay${digitChanged ? ' animate' : ''}">`
                );
                
                element.innerHTML = `
                    <a href="${messageData.message.url}" target="_blank" class="hologram${digitChanged ? ' scan' : ''}">
                        <div class="message-text">${message}</div>
                        <div class="lines"></div>
                    </a>
                `;
                
                // Remove the scan class after animation completes
                if (digitChanged) {
                    const hologram = element.querySelector('.hologram');
                    hologram.addEventListener('animationend', () => {
                        hologram.classList.remove('scan');
                    }, { once: true });
                }
                
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
            
            // Update the previous digit only when it actually changes
            if (digitChanged) {
                previousDigits[index] = digit;
            }
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
            const highlightedText = highlightNumber(text, number, true);
            const postUrl = `https://bsky.app/profile/${json.did}/post/${json.commit.rkey}`;
            
            // Store both the message and the URL
            if (digitMessages[number].length < 1000) {
                digitMessages[number].push({
                    message: highlightedText,
                    url: postUrl
                });
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
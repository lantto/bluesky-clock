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
        
        if (digitChanged || isCurrentlyEmpty) {
            const messages = digitMessages[parseInt(digit)];
            const messageData = getUnusedMessage(messages, digit);
            
            if (messageData) {
                // Has associated post - use clickable link version
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
            } else {
                // No associated post - use non-clickable version with number overlay
                element.innerHTML = `
                    <div class="hologram no-post">
                        <div class="number-overlay${digitChanged ? ' animate' : ''}">${digit}</div>
                        <div class="message-text">No transmission found...</div>
                        <div class="lines"></div>
                    </div>
                `;
            }
            
            // Remove the scan class after animation completes
            if (digitChanged) {
                const hologram = element.querySelector('.hologram');
                hologram.addEventListener('animationend', () => {
                    hologram.classList.remove('scan');
                }, { once: true });
            }
            
            element.classList.remove('empty');
            
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

// Add a function to find empty slots that need this digit
function findEmptySlotsForDigit(digit) {
    const now = new Date();
    const timeStr = now.toTimeString().split(':').join('');
    const currentDigits = timeStr.substring(0, 6).split('');
    const slots = ['hours1', 'hours2', 'minutes1', 'minutes2', 'seconds1', 'seconds2'];
    
    return slots.reduce((emptySlots, slotId, index) => {
        const element = document.getElementById(slotId);
        if (currentDigits[index] === digit && element.querySelector('.hologram.no-post')) {
            emptySlots.push(slotId);
        }
        return emptySlots;
    }, []);
}

// Modify the WebSocket message handler
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
                const messageData = {
                    message: highlightedText,
                    url: postUrl
                };
                digitMessages[number].push(messageData);
                
                // Check if any current empty slots need this digit
                const emptySlots = findEmptySlotsForDigit(number.toString());
                if (emptySlots.length > 0) {
                    // Get an unused message
                    const unusedMessage = getUnusedMessage(digitMessages[number], number.toString());
                    
                    if (unusedMessage) {
                        emptySlots.forEach(slotId => {
                            const element = document.getElementById(slotId);
                            element.innerHTML = `
                                <a href="${unusedMessage.message.url}" target="_blank" class="hologram scan">
                                    <div class="message-text">${unusedMessage.message.message}</div>
                                    <div class="lines"></div>
                                </a>
                            `;
                            
                            const hologram = element.querySelector('.hologram');
                            hologram.addEventListener('animationend', () => {
                                hologram.classList.remove('scan');
                            }, { once: true });
                        });
                    }
                }
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
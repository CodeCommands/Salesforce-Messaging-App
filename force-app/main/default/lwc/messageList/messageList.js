import { LightningElement, api, wire, track } from 'lwc';
import getMessages from '@salesforce/apex/MessageService.getMessages';
import { refreshApex } from '@salesforce/apex';
import USER_ID from '@salesforce/user/Id';

export default class MessageList extends LightningElement {
    @api correspondenceId;
    @track messages;
    error;
    wiredMessagesResult;
    intervalId;

    @wire(getMessages, { correspondenceId: '$correspondenceId' })
    wiredMessages(result) {
        this.wiredMessagesResult = result;
        if (result.data) {
            let lastSenderId = null;
            this.messages = result.data.map((message) => {
                const isCurrentUser = message.SenderId === USER_ID;
                const isDifferentSender = lastSenderId !== null && lastSenderId !== message.SenderId;
                lastSenderId = message.SenderId;

                return {
                    ...message,
                    isCurrentUser,
                    isDifferentSender,
                    messageItemClass: this.getMessageItemClass(isCurrentUser),
                    messageBubbleClass: this.getMessageBubbleClass(isCurrentUser),
                    CreatedDate: this.formatDateTime(message.CreatedDate),
                };
            });
            this.error = undefined;
            this.renderMessages();
        } else if (result.error) {
            this.error = result.error;
            this.messages = undefined;
        }
        // Scroll to the bottom after messages are rendered
        this.scrollToBottom();
    }

    connectedCallback() {
        this.refreshMessages();
        // Set up interval to refresh messages every 5 seconds
        this.intervalId = setInterval(() => {
            this.refreshMessages();
        }, 1000);
    }

    disconnectedCallback() {
        // Clean up the interval when the component is removed from the DOM
        clearInterval(this.intervalId);
    }

    @api
    refreshMessages() {
        refreshApex(this.wiredMessagesResult);
    }

    renderedCallback() {
        this.renderMessages();
        // Scroll to the bottom after messages are rendered
        this.scrollToBottom();
    }

    renderMessages() {
        if (this.messages) {
            this.messages.forEach(message => {
                const messageElement = this.template.querySelector(`div[data-id="${message.Id}"]`);
                if (messageElement) {
                    messageElement.innerHTML = message.Content;
                }
            });
        }
    }

    scrollToBottom() {
        const container = this.template.querySelector('.message-list-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    getMessageItemClass(isCurrentUser) {
        let classes = 'message-item';
        if (isCurrentUser) classes += ' current-user';
        console.log(`Message item class for current user (${isCurrentUser}): ${classes}`);
        return classes;
    }

    getMessageBubbleClass(isCurrentUser) {
        const classes = 'message-bubble ' + (isCurrentUser ? 'current-user-bubble' : 'other-user-bubble');
        console.log(`Message bubble class for current user (${isCurrentUser}): ${classes}`);
        return classes;
    }

    formatDateTime(datetime) {
        const options = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        };
        return new Intl.DateTimeFormat('en-US', options).format(new Date(datetime));
    }
}
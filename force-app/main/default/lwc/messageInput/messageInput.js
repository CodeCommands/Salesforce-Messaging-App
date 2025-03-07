import { LightningElement, api } from 'lwc';
import sendMessage from '@salesforce/apex/MessageService.sendMessage';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import USER_ID from '@salesforce/user/Id';

export default class MessageInput extends LightningElement {
    @api correspondenceId;
    messageContent = '';

    handleInputChange(event) {
        this.messageContent = event.target.value;
    }

    handleSendMessage() {
        if (!this.messageContent) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Message content cannot be empty',
                    variant: 'error'
                })
            );
            return;
        }

        sendMessage({
            correspondenceId: this.correspondenceId,
            senderId: USER_ID,
            content: this.messageContent
        })
        .then(result => {
            this.messageContent = '';
            const inputField = this.template.querySelector('lightning-input-rich-text');
            if (inputField) {
                inputField.value = '';
            }
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Message sent',
                    variant: 'success'
                })
            );

            // Dispatch a custom event
            this.dispatchEvent(new CustomEvent('messagesent'));
        })
        .catch(error => {
            console.error('Error sending message:', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Failed to send message: ' + error.body.message,
                    variant: 'error'
                })
            );
        });
    }
}
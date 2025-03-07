import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import createCorrespondence from '@salesforce/apex/MessageService.createCorrespondence';
import getCorrespondences from '@salesforce/apex/MessageService.getCorrespondences';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class MessagingApp extends LightningElement {
    @api recordId;
    @api objectApiName;
    @track selectedCorrespondenceId;
    @track showCorrespondenceList = false;
    @track hasExistingCorrespondences = false;
    @track isModalOpen = false;
    @track newCorrespondenceSubject = '';

    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    objectInfo;

    get objectType() {
        return this.objectInfo.data ? this.objectInfo.data.apiName : null;
    }

    connectedCallback() {
        this.checkExistingCorrespondences();
    }

    handleCorrespondenceSelected(event) {
        this.selectedCorrespondenceId = event.detail;
        this.showCorrespondenceList = false;
    }

    handleStartNewConversationClick() {
        this.isModalOpen = true;
    }

    handleCloseModal() {
        this.isModalOpen = false;
        this.newCorrespondenceSubject = '';
    }

    handleSubjectChange(event) {
        this.newCorrespondenceSubject = event.target.value;
    }

    startNewConversation() {
        const correspondenceName = this.newCorrespondenceSubject || `Message-${this.recordId}-${new Date().toLocaleString()}`;

        createCorrespondence({
            parentId: this.recordId,
            parentObjectType: this.objectType,
            correspondenceName: correspondenceName
        })
        .then(correspondenceId => {
            this.selectedCorrespondenceId = correspondenceId;
            this.showCorrespondenceList = false;
            this.isModalOpen = false;
            this.newCorrespondenceSubject = '';
        })
        .catch(error => {
            console.error('Error creating correspondence:', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Failed to create correspondence',
                    variant: 'error'
                })
            );
        });
    }

    viewPreviousConversations() {
        this.showCorrespondenceList = true;
    }

    checkExistingCorrespondences() {
        getCorrespondences({ parentId: this.recordId })
        .then(data => {
            this.hasExistingCorrespondences = data.length > 0;
        })
        .catch(error => {
            console.error('Error fetching correspondences:', error);
        });
    }

    handleMessageSent() {
        this.template.querySelector('c-message-list').refreshMessages();
    }
}
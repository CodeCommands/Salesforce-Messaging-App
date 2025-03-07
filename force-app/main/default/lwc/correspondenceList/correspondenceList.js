import { LightningElement, api, wire } from 'lwc';
import getCorrespondences from '@salesforce/apex/MessageService.getCorrespondences';
import { CurrentPageReference } from 'lightning/navigation';

export default class CorrespondenceList extends LightningElement {
    @api parentId;
    correspondences;
    error;

    @wire(CurrentPageReference) pageRef;

    @wire(getCorrespondences, { parentId: '$parentId' })
    wiredCorrespondences({ error, data }) {
        if (data) {
            this.correspondences = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.correspondences = undefined;
        }
    }

    handleCorrespondenceClick(event) {
        const correspondenceId = event.currentTarget.dataset.id;
        const selectEvent = new CustomEvent('correspondenceselected', { detail: correspondenceId });
        this.dispatchEvent(selectEvent);
    }
}
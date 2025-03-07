public with sharing class MessageService {

    @AuraEnabled(cacheable=true)
    public static List<Correspondence__c> getCorrespondences(String parentId) {
        return [SELECT Id, Name, LastMessageTimestamp__c, ParentObjectId__c, ParentObjectType__c, Parent_Record__c 
                FROM Correspondence__c
                WHERE ParentObjectId__c = :parentId
                ORDER BY LastMessageTimestamp__c DESC];
    }

    @AuraEnabled
    public static Id createCorrespondence(String parentId, String parentObjectType, String correspondenceName) {
        String parentRecordUrl = '/' + parentId;

        Correspondence__c correspondence = new Correspondence__c(
            ParentObjectId__c = parentId,
            ParentObjectType__c = parentObjectType,
            Parent_Record__c = parentRecordUrl,
            Name = correspondenceName,
            LastMessageTimestamp__c = DateTime.now()
        );
        insert correspondence;
        return correspondence.Id;
    }

    @AuraEnabled(cacheable=true)
    public static List<MessageWrapper> getMessages(Id correspondenceId) {
        List<Message__c> messages = [SELECT Id, Content__c, Sender__c, Correspondence__r.ParentObjectId__c, Correspondence__r.ParentObjectType__c, Correspondence__r.Parent_Record__c, CreatedDate 
                                     FROM Message__c
                                     WHERE Correspondence__c = :correspondenceId
                                     ORDER BY CreatedDate ASC];

        Set<Id> senderIds = new Set<Id>();
        for (Message__c msg : messages) {
            senderIds.add(msg.Sender__c);
        }

        Map<Id, User> userMap = new Map<Id, User>([SELECT Id, Name FROM User WHERE Id IN :senderIds]);

        List<MessageWrapper> messageWrappers = new List<MessageWrapper>();
        for (Message__c msg : messages) {
            User sender = userMap.get(msg.Sender__c);
            messageWrappers.add(new MessageWrapper(
                msg.Id,
                msg.Content__c,
                msg.Sender__c,
                sender != null ? sender.Name : null,
                msg.Correspondence__r.ParentObjectId__c,
                msg.Correspondence__r.ParentObjectType__c,
                msg.Correspondence__r.Parent_Record__c,
                msg.CreatedDate
            ));
        }

        return messageWrappers;
    }

    @AuraEnabled
    public static MessageWrapper sendMessage(Id correspondenceId, Id senderId, String content) {
        if (correspondenceId == null) {
            throw new AuraHandledException('Correspondence ID cannot be null');
        }
        if (senderId == null) {
            throw new AuraHandledException('Sender ID cannot be null');
        }
        if (String.isBlank(content)) {
            throw new AuraHandledException('Message content cannot be empty');
        }

        try {
            Message__c message = new Message__c(
                Correspondence__c = correspondenceId,
                Sender__c = senderId,
                Content__c = content
            );
            insert message;

            Correspondence__c correspondence = [SELECT Id, ParentObjectId__c, ParentObjectType__c, Parent_Record__c FROM Correspondence__c WHERE Id = :correspondenceId];
            correspondence.LastMessageTimestamp__c = DateTime.now();
            update correspondence;

            User sender = [SELECT Id, Name FROM User WHERE Id = :senderId LIMIT 1];

            return new MessageWrapper(
                message.Id,
                message.Content__c,
                message.Sender__c,
                sender != null ? sender.Name : null,
                correspondence.ParentObjectId__c,
                correspondence.ParentObjectType__c,
                correspondence.Parent_Record__c,
                message.CreatedDate
            );
        } catch (Exception e) {
            throw new AuraHandledException('Failed to send message: ' + e.getMessage());
        }
    }

    public class MessageWrapper {
        @AuraEnabled public Id Id { get; set; }
        @AuraEnabled public String Content { get; set; }
        @AuraEnabled public Id SenderId { get; set; }
        @AuraEnabled public String SenderName { get; set; }
        @AuraEnabled public Id ParentObjectId { get; set; }
        @AuraEnabled public String ParentObjectType { get; set; }
        @AuraEnabled public String ParentRecordUrl { get; set; }
        @AuraEnabled public DateTime CreatedDate { get; set; }

        public MessageWrapper(Id id, String content, Id senderId, String senderName, Id parentObjectId, String parentObjectType, String parentRecordUrl, DateTime createdDate) {
            this.Id = id;
            this.Content = content;
            this.SenderId = senderId;
            this.SenderName = senderName;
            this.ParentObjectId = parentObjectId;
            this.ParentObjectType = parentObjectType;
            this.ParentRecordUrl = parentRecordUrl;
            this.CreatedDate = createdDate;
        }
    }
}
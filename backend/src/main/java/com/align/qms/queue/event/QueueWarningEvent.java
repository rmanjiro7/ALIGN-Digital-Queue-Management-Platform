package com.align.qms.queue.event;

import org.springframework.context.ApplicationEvent;

public class QueueWarningEvent extends ApplicationEvent {

    private final QueueWarningPayload payload;

    public QueueWarningEvent(Object source, QueueWarningPayload payload) {
        super(source);
        this.payload = payload;
    }

    public QueueWarningPayload getPayload() {
        return payload;
    }
}

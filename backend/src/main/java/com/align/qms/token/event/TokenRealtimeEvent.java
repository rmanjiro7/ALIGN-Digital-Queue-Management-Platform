package com.align.qms.token.event;

import org.springframework.context.ApplicationEvent;

public class TokenRealtimeEvent extends ApplicationEvent {

    private final TokenRealtimePayload payload;

    public TokenRealtimeEvent(Object source, TokenRealtimePayload payload) {
        super(source);
        this.payload = payload;
    }

    public TokenRealtimePayload getPayload() {
        return payload;
    }
}

package com.align.qms.token;

public enum TokenState {
    WAITING,
    AWAY,
    CALLED,
    IN_SERVICE,
    COMPLETED,
    NO_SHOW,
    CANCELLED,
    EXPIRED;

    public boolean canTransitionTo(TokenState targetState) {
        if (targetState == null) return false;
        if (this == targetState) return false;

        return switch (this) {
            case WAITING -> targetState == CALLED || targetState == AWAY || targetState == CANCELLED;
            case AWAY -> targetState == WAITING || targetState == CANCELLED || targetState == EXPIRED;
            case CALLED -> targetState == IN_SERVICE || targetState == NO_SHOW;
            case IN_SERVICE -> targetState == COMPLETED;
            case COMPLETED, NO_SHOW, CANCELLED, EXPIRED -> false; // Terminal states
        };
    }
}

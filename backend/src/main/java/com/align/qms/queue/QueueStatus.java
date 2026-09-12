package com.align.qms.queue;

/**
 * Operational status of a Queue (BR-012).
 * <ul>
 *   <li>ACTIVE  — accepting new tokens, call-next enabled</li>
 *   <li>PAUSED  — no new joins, existing tokens continue to be served</li>
 *   <li>CLOSED  — no new joins, call-next disabled</li>
 * </ul>
 */
public enum QueueStatus {
    ACTIVE,
    PAUSED,
    CLOSED
}
